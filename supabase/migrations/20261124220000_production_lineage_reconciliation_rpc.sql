-- Governed, lineage-only Production maintenance operation.
create table if not exists public.metadata_lineage_reconciliation_operations (
 operation_id uuid primary key default gen_random_uuid(), task_id text not null, operation_type text not null check(operation_type='METADATA_ONLY_LINEAGE_RECONCILIATION'),
 idempotency_key text not null unique, source_batch_ids uuid[] not null, status text not null check(status in('PROPOSED','PREVIEWED','RECONCILED','DIRECTOR_APPROVED','COMMITTED','VERIFIED','REJECTED')),
 payload jsonb not null, result_digest text, approval_id uuid references public.portal_action_approvals(approval_id), created_by uuid references auth.users(id), created_at timestamptz not null default now(), committed_at timestamptz, verified_at timestamptz
);
alter table public.metadata_lineage_reconciliation_operations enable row level security;
revoke all on public.metadata_lineage_reconciliation_operations from public,anon,authenticated;

create or replace function public.portal_mcp_preview_lineage_reconciliation(p_task_id text,p_batch_ids uuid[],p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare actor uuid:=auth.uid(); op public.metadata_lineage_reconciliation_operations; payload jsonb; ids uuid[]; digest text;
begin
 if not private.portal_is_authorized(actor,'OPERATIONS.WRITE') then raise exception 'Director authorization required' using errcode='42501'; end if;
 if p_task_id is null or cardinality(p_batch_ids)<>2 or nullif(trim(p_idempotency_key),'') is null then raise exception 'Explicit task, two batch IDs, and idempotency key required' using errcode='22023'; end if;
 if exists(select 1 from unnest(p_batch_ids) x group by x having count(*)>1) then raise exception 'Duplicate batch ID' using errcode='22023'; end if;
 if exists(select 1 from public.mcp_ingestion_batches b where b.batch_id=any(p_batch_ids) and (b.status<>'COMMITTED' or b.source_provenance is null or b.source_provenance='{}'::jsonb or coalesce(b.source_name,'') ilike any(array['%synthetic%','%acceptance%','%test%','%diagnostic%']))) then raise exception 'Batch is not an eligible committed real batch' using errcode='22023'; end if;
 if exists(select 1 from unnest(p_batch_ids) x where not exists(select 1 from public.mcp_ingestion_batches b where b.batch_id=x)) then raise exception 'Unknown batch ID' using errcode='22023'; end if;
 select jsonb_agg(jsonb_build_object('batch_id',b.batch_id,'status','EXISTING','source_name',b.source_name,'domain',b.domain,'source_provenance',b.source_provenance,'preview_digest',b.preview_digest,'created_at',b.created_at,'committed_at',b.committed_at,'row_count',jsonb_array_length(coalesce(b.rows,'[]'::jsonb))) order by b.batch_id) into payload from public.mcp_ingestion_batches b where b.batch_id=any(p_batch_ids);
 digest:=encode(extensions.digest(payload::text,'sha256'),'hex');
 insert into public.metadata_lineage_reconciliation_operations(task_id,operation_type,idempotency_key,source_batch_ids,status,payload,created_by,result_digest) values(p_task_id,'METADATA_ONLY_LINEAGE_RECONCILIATION',p_idempotency_key,p_batch_ids,'PREVIEWED',payload,actor,digest) on conflict(idempotency_key) do update set payload=excluded.payload,result_digest=excluded.result_digest,status='PREVIEWED' returning * into op;
 insert into public.operational_batch_lifecycle_history(batch_id,previous_status,new_status,correction_reason,evidence_payload,actor_user_id) values(p_batch_ids[1],'PROPOSED','PREVIEWED','METADATA_ONLY_LINEAGE_RECONCILIATION',jsonb_build_object('operation_id',op.operation_id,'task_id',p_task_id,'batch_ids',p_batch_ids),actor),(p_batch_ids[2],'PROPOSED','PREVIEWED','METADATA_ONLY_LINEAGE_RECONCILIATION',jsonb_build_object('operation_id',op.operation_id,'task_id',p_task_id,'batch_ids',p_batch_ids),actor);
 insert into public.audit_events(entity_type,entity_id,operation,new_values,source_type,actor_user_id) values('METADATA_ONLY_LINEAGE_RECONCILIATION',op.operation_id,'PREVIEW',jsonb_build_object('task_id',p_task_id,'batch_ids',p_batch_ids,'result_digest',digest,'business_writes',false),'MCP',actor);
 return jsonb_build_object('task_id',p_task_id,'operation_id',op.operation_id,'operation_type',op.operation_type,'status',op.status,'batch_ids',p_batch_ids,'metadata_digest',digest,'business_writes',false);
end $$;

create or replace function public.portal_mcp_request_lineage_reconciliation_approval(p_operation_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare op public.metadata_lineage_reconciliation_operations; a jsonb;
begin
 select * into op from public.metadata_lineage_reconciliation_operations where operation_id=p_operation_id for update;
 if not found or op.status<>'PREVIEWED' then raise exception 'Preview required'; end if;
 a:=public.portal_request_approval('OPERATIONS.WRITE','METADATA_ONLY_LINEAGE_RECONCILIATION',p_operation_id,op.payload,p_reason);
 update public.metadata_lineage_reconciliation_operations set status='DIRECTOR_APPROVED',approval_id=(a->>'approval_id')::uuid where operation_id=p_operation_id;
 return a||jsonb_build_object('operation_id',p_operation_id,'task_id',op.task_id);
end $$;

create or replace function public.portal_mcp_commit_lineage_reconciliation(p_operation_id uuid,p_approval_id uuid)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare actor uuid:=auth.uid(); op public.metadata_lineage_reconciliation_operations; b record; created int:=0; existing int:=0; result jsonb:='[]';
begin
 select * into op from public.metadata_lineage_reconciliation_operations where operation_id=p_operation_id for update;
 if not found or op.status<>'DIRECTOR_APPROVED' or op.approval_id<>p_approval_id then raise exception 'Approved Preview required'; end if;
 perform private.portal_consume_approval(p_approval_id,'OPERATIONS.WRITE','METADATA_ONLY_LINEAGE_RECONCILIATION',p_operation_id,op.payload);
 for b in select x.*, (select count(*) from public.canonical_source_batches c where c.source_batch_id=x.batch_id) as already from public.mcp_ingestion_batches x where x.batch_id=any(op.source_batch_ids) and x.status='COMMITTED' loop
  if b.already=0 then insert into public.canonical_source_batches(source_batch_id,source_domain,source_file,source_file_fingerprint,status,row_count,metadata,created_by,created_at) values(b.batch_id,b.domain,b.source_name,coalesce(b.source_provenance->>'source_fingerprint',encode(extensions.digest(convert_to(b.batch_id::text||'|'||b.source_name,'UTF8'),'sha256'),'hex')),'RECONCILED',jsonb_array_length(coalesce(b.rows,'[]'::jsonb)),jsonb_build_object('original_batch_id',b.batch_id,'source_provenance',b.source_provenance,'original_created_at',b.created_at,'original_committed_at',b.committed_at,'original_preview_digest',b.preview_digest,'operation_id',p_operation_id,'task_id',op.task_id),actor,b.created_at); created:=created+1; else existing:=existing+1; end if;
  result:=result||jsonb_build_array(jsonb_build_object('batch_id',b.batch_id,'state',case when b.already=0 then 'CREATED' else 'EXISTING' end));
 end loop;
 update public.metadata_lineage_reconciliation_operations set status='COMMITTED',committed_at=now(),result_digest=encode(extensions.digest(result::text,'sha256'),'hex') where operation_id=p_operation_id;
 insert into public.audit_events(entity_type,entity_id,operation,new_values,source_type,actor_user_id) values('METADATA_ONLY_LINEAGE_RECONCILIATION',p_operation_id,'COMMIT',jsonb_build_object('task_id',op.task_id,'created',created,'existing',existing,'business_writes',false,'result',result),'MCP',actor);
 return jsonb_build_object('task_id',op.task_id,'operation_id',p_operation_id,'status','COMMITTED','created_count',created,'existing_count',existing,'batches',result,'business_writes',false);
end $$;

revoke all on function public.portal_mcp_preview_lineage_reconciliation(text,uuid[],text),public.portal_mcp_request_lineage_reconciliation_approval(uuid,text),public.portal_mcp_commit_lineage_reconciliation(uuid,uuid) from public,anon;
grant execute on function public.portal_mcp_preview_lineage_reconciliation(text,uuid[],text),public.portal_mcp_request_lineage_reconciliation_approval(uuid,text),public.portal_mcp_commit_lineage_reconciliation(uuid,uuid) to authenticated;
