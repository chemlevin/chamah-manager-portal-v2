-- TRACK123c: server-side real-data promotion gate for operational MCP batches.
alter table public.mcp_ingestion_batches
  add column if not exists source_provenance jsonb,
  add column if not exists verification_status text,
  add column if not exists verified_by_user_id uuid,
  add column if not exists verified_at timestamptz;

alter table public.mcp_ingestion_batches
  drop constraint if exists mcp_ingestion_batches_verification_status_check;
alter table public.mcp_ingestion_batches
  add constraint mcp_ingestion_batches_verification_status_check
  check (verification_status is null or verification_status in ('REAL_VERIFIED','PENDING_VERIFICATION','SYNTHETIC'));

create or replace function private.portal_mcp_reject_synthetic(p_source_name text,p_source_provenance jsonb,p_rows jsonb)
returns void language plpgsql immutable set search_path=public,private,pg_temp as $$
declare haystack text:=lower(coalesce(p_source_name,'')||' '||coalesce(p_source_provenance::text,'')||' '||coalesce(p_rows::text,''));
begin
 if haystack ~ '(track|internal[_ -]?acceptance|synthetic|test[_ -]?data|example\.invalid)' then
  raise exception 'Synthetic or test data is not promotable to Production' using errcode='22023';
 end if;
end $$;
revoke all on function private.portal_mcp_reject_synthetic(text,jsonb,jsonb) from public,anon,authenticated;

drop function if exists public.portal_mcp_preview_operational_changes(jsonb,text,text);
create or replace function public.portal_mcp_preview_operational_changes(p_rows jsonb,p_source_name text,p_source_provenance jsonb,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare actor uuid:=auth.uid(); b public.mcp_ingestion_batches; preview jsonb:='[]'::jsonb; digest_value text; staged_rows jsonb; r jsonb; conflicts jsonb; n int:=0; operation text;
begin
 if not private.portal_is_authorized(actor,'OPERATIONS.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 1000 then raise exception 'Rows must contain 1..1000 records' using errcode='22023'; end if;
 if jsonb_typeof(p_source_provenance)<>'object' or p_source_provenance='{}'::jsonb then raise exception 'Source provenance is required' using errcode='22023'; end if;
 if length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'Invalid idempotency key' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r0 where jsonb_typeof(r0)<>'object' or private.portal_mcp_entity_meta(r0->>'entity') is null or jsonb_typeof(r0->'values')<>'object') then raise exception 'Unsupported entity or invalid row' using errcode='22023'; end if;
 select jsonb_agg(private.portal_mcp_match_operational_row_v2(r0) order by ord) into staged_rows from jsonb_array_elements(p_rows) with ordinality x(r0,ord);
 for r in select value from jsonb_array_elements(staged_rows) loop
  n:=n+1; conflicts:=private.portal_mcp_row_conflicts(r,staged_rows);
  operation:=case when jsonb_array_length(conflicts)>0 then 'CONFLICT' when nullif(r->>'record_id','') is null then 'CREATE' when (r->'_matched_record') @> (r->'values') then 'SKIP' else 'UPDATE' end;
  preview:=preview||jsonb_build_array(jsonb_build_object('source_row',n,'entity',r->>'entity','record_id',r->>'record_id','expected_row_version',r->'expected_row_version','operation',operation,'status',case when jsonb_array_length(conflicts)>0 then 'CONFLICT' else 'READY' end,'conflicts',conflicts));
 end loop;
 digest_value:=encode(digest(staged_rows::text,'sha256'),'hex');
 insert into public.mcp_ingestion_batches(actor_user_id,domain,idempotency_key,source_name,source_provenance,verification_status,rows,preview,status,preview_digest)
 values(actor,'OPERATIONS',trim(p_idempotency_key),left(coalesce(nullif(trim(p_source_name),''),'ChatGPT'),120),p_source_provenance,'PENDING_VERIFICATION',staged_rows,preview,case when exists(select 1 from jsonb_array_elements(preview) x where x->>'status'='CONFLICT') then 'CONFLICTS' else 'READY' end,digest_value)
 on conflict(actor_user_id,domain,idempotency_key) do update set source_name=excluded.source_name,source_provenance=excluded.source_provenance where public.mcp_ingestion_batches.rows=excluded.rows returning * into b;
 if b.batch_id is null then raise exception 'Idempotency key already used with different rows' using errcode='23505'; end if;
 return jsonb_build_object('batch_id',b.batch_id,'status',b.status,'row_version',b.row_version,'preview_digest',b.preview_digest,'preview',b.preview,'verification_status',b.verification_status,'canonical_writes',false);
end $$;

create or replace function public.portal_mcp_request_operational_approval(p_batch_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.mcp_ingestion_batches; a jsonb;
begin
 if not private.portal_is_authorized(auth.uid(),'OPERATIONS.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into b from public.mcp_ingestion_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.batch_id is null or b.domain<>'OPERATIONS' or b.status<>'READY' then raise exception 'batch is not ready for approval'; end if;
 if jsonb_typeof(b.source_provenance)<>'object' or b.source_provenance='{}'::jsonb then raise exception 'Source provenance is required'; end if;
 perform private.portal_mcp_reject_synthetic(b.source_name,b.source_provenance,b.rows);
 a:=public.portal_request_approval('OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,jsonb_build_object('batch_id',b.batch_id,'row_version',b.row_version,'preview_digest',b.preview_digest,'source_provenance',b.source_provenance),p_reason);
 update public.mcp_ingestion_batches set approval_id=(a->>'approval_id')::uuid,verification_status='REAL_VERIFIED',verified_by_user_id=auth.uid(),verified_at=now() where batch_id=b.batch_id;
 return a||jsonb_build_object('verification_status','REAL_VERIFIED','verified_by_user_id',auth.uid(),'verified_at',now());
end $$;

create or replace function public.portal_mcp_commit_operational_changes(p_batch_id uuid,p_approval_id uuid)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.mcp_ingestion_batches; r jsonb; current_row jsonb; item jsonb; results jsonb:='[]'::jsonb; approval jsonb; entity_id uuid; record_version int;
begin
 select * into b from public.mcp_ingestion_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.status='COMMITTED' then return coalesce(b.commit_result,jsonb_build_object('batch_id',b.batch_id,'status','COMMITTED','verified',true))||jsonb_build_object('idempotent_replay',true); end if;
 if b.batch_id is null or b.domain<>'OPERATIONS' or b.status<>'READY' or b.approval_id is distinct from p_approval_id then raise exception 'Batch approval mismatch' using errcode='22023'; end if;
 if b.verification_status<>'REAL_VERIFIED' or b.verified_by_user_id is null or b.verified_at is null or jsonb_typeof(b.source_provenance)<>'object' or b.source_provenance='{}'::jsonb then raise exception 'Verified source provenance is required' using errcode='22023'; end if;
 perform private.portal_mcp_reject_synthetic(b.source_name,b.source_provenance,b.rows);
 if b.preview_digest<>encode(extensions.digest(b.rows::text,'sha256'),'hex') then raise exception 'Batch missing, changed, or not ready' using errcode='40001'; end if;
 perform private.portal_consume_approval(p_approval_id,'OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,jsonb_build_object('batch_id',b.batch_id,'row_version',b.row_version,'preview_digest',b.preview_digest));
 approval:=jsonb_build_object('approval_id',p_approval_id,'action_code','OPERATIONS.WRITE','resource_type','OPERATIONAL_CHANGESET','resource_id',b.batch_id,'consumed_at',now());
 for r in select value from jsonb_array_elements(b.rows) loop
  if nullif(r->>'record_id','') is not null then
   current_row:=private.portal_mcp_get_record_json(r->>'entity',(r->>'record_id')::uuid);
   if current_row is null or (current_row->>'row_version')::int<>(r->>'expected_row_version')::int then raise exception 'Concurrent update rejected for %',r->>'entity' using errcode='40001'; end if;
  end if;
  item:=private.portal_mcp_apply_operational_row_v2(r); results:=results||jsonb_build_array(jsonb_build_object('entity',r->>'entity','record',item));
  entity_id:=nullif(coalesce(item->>coalesce(private.portal_mcp_entity_meta(r->>'entity')->>'id','id'),r->>'record_id'),'')::uuid;
  record_version:=coalesce((item->>'row_version')::int,1);
  insert into public.audit_events(entity_type,entity_id,operation,actor_user_id,previous_values,new_values,source_type,occurred_at)
  values(upper(r->>'entity'),entity_id,case when nullif(r->>'record_id','') is null then 'MCP_CREATE' else 'MCP_UPDATE' end,auth.uid(),r->'_matched_record',(item-'created_by_user_id'-'updated_by_user_id')||jsonb_build_object('_mcp_batch_id',b.batch_id,'row_version',record_version,'verification_status',b.verification_status,'verified_by_user_id',b.verified_by_user_id,'verified_at',b.verified_at),'MCP',now());
 end loop;
 update public.mcp_ingestion_batches set status='COMMITTED',committed_at=now(),commit_result=jsonb_build_object('atomic',true,'verified',true,'verification_status',b.verification_status,'verified_by_user_id',b.verified_by_user_id,'verified_at',b.verified_at,'source_provenance',b.source_provenance,'records',results,'approval',approval),row_version=row_version+1 where batch_id=b.batch_id;
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id,detail) values(auth.uid(),'MCP','OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,'SUCCESS',p_approval_id,jsonb_build_object('records',jsonb_array_length(results),'verification_status',b.verification_status));
 return jsonb_build_object('batch_id',b.batch_id,'status','COMMITTED','atomic',true,'verified',true,'verification_status',b.verification_status,'verified_by_user_id',b.verified_by_user_id,'verified_at',b.verified_at,'records',results,'approval',approval);
end $$;

revoke all on function public.portal_mcp_preview_operational_changes(jsonb,text,jsonb,text),public.portal_mcp_request_operational_approval(uuid,text),public.portal_mcp_commit_operational_changes(uuid,uuid) from public,anon;
grant execute on function public.portal_mcp_preview_operational_changes(jsonb,text,jsonb,text),public.portal_mcp_request_operational_approval(uuid,text),public.portal_mcp_commit_operational_changes(uuid,uuid) to authenticated;
