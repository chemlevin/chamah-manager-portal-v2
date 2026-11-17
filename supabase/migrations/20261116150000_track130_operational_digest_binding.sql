-- TRACK130: bind operational approval directly to the immutable preview digest.
-- Preview hashes the canonical staged rows; approval and commit must consume that
-- exact digest rather than hashing a transformed request envelope.

alter table public.mcp_ingestion_batches
  add column if not exists approval_row_version integer;

create or replace function private.portal_consume_approval_digest(
  p_approval_id uuid,
  p_action_code text,
  p_resource_type text,
  p_resource_id uuid,
  p_payload_digest text
) returns void language plpgsql security definer
set search_path=public,private,pg_temp as $$
declare matched uuid;
begin
 update public.portal_action_approvals
    set consumed_at=now()
  where approval_id=p_approval_id
    and actor_user_id=auth.uid()
    and action_code=p_action_code
    and resource_type=p_resource_type
    and resource_id is not distinct from p_resource_id
    and consumed_at is null
    and expires_at>now()
    and payload_digest=p_payload_digest
  returning approval_id into matched;
 if matched is null then
   raise exception 'Approval missing, expired, consumed or payload changed' using errcode='42501';
 end if;
end $$;
revoke all on function private.portal_consume_approval_digest(uuid,text,text,uuid,text) from public,anon,authenticated;

create or replace function public.portal_mcp_request_operational_approval(p_batch_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.mcp_ingestion_batches; a jsonb; aid uuid; expiry timestamptz:=now()+interval '10 minutes';
begin
 if not private.portal_is_authorized(auth.uid(),'OPERATIONS.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
 if length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'Approval reason required' using errcode='22023'; end if;
 select * into b from public.mcp_ingestion_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.batch_id is null or b.domain<>'OPERATIONS' or b.status<>'READY' then raise exception 'batch is not ready for approval'; end if;
 if jsonb_typeof(b.source_provenance)<>'object' or b.source_provenance='{}'::jsonb then raise exception 'Source provenance is required'; end if;
 if b.preview_digest is null or b.preview_digest<>encode(extensions.digest(b.rows::text,'sha256'),'hex') then raise exception 'Batch missing, changed, or not ready' using errcode='40001'; end if;
 if not exists(select 1 from public.portal_actions where action_code='OPERATIONS.WRITE' and requires_approval) then raise exception 'Approval not applicable' using errcode='22023'; end if;
 insert into public.portal_action_approvals(actor_user_id,action_code,resource_type,resource_id,payload_digest,reason,expires_at)
 values(auth.uid(),'OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,b.preview_digest,trim(p_reason),expiry)
 returning approval_id into aid;
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id)
 values(auth.uid(),'MCP','OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,'APPROVAL_CREATED',aid);
 a:=jsonb_build_object('approval_id',aid,'expires_at',expiry,'payload_digest',b.preview_digest);
 update public.mcp_ingestion_batches
    set approval_id=aid, approval_row_version=b.row_version,
        verification_status='REAL_VERIFIED',verified_by_user_id=auth.uid(),verified_at=now()
  where batch_id=b.batch_id;
 return a||jsonb_build_object('verification_status','REAL_VERIFIED','verified_by_user_id',auth.uid(),'verified_at',now());
end $$;
revoke all on function public.portal_mcp_request_operational_approval(uuid,text) from public,anon;
grant execute on function public.portal_mcp_request_operational_approval(uuid,text) to authenticated;

create or replace function public.portal_mcp_commit_operational_changes(p_batch_id uuid,p_approval_id uuid)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare b public.mcp_ingestion_batches; r jsonb; current_row jsonb; item jsonb; results jsonb:='[]'::jsonb; approval jsonb; entity_id uuid; record_version int;
begin
 select * into b from public.mcp_ingestion_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.status='COMMITTED' then return coalesce(b.commit_result,jsonb_build_object('batch_id',b.batch_id,'status','COMMITTED','verified',true))||jsonb_build_object('idempotent_replay',true); end if;
 if b.batch_id is null or b.domain<>'OPERATIONS' or b.status<>'READY' or b.approval_id is distinct from p_approval_id or b.approval_row_version is distinct from b.row_version then raise exception 'Batch approval mismatch' using errcode='22023'; end if;
 if b.verification_status<>'REAL_VERIFIED' or b.verified_by_user_id is null or b.verified_at is null or jsonb_typeof(b.source_provenance)<>'object' or b.source_provenance='{}'::jsonb then raise exception 'Verified source provenance is required' using errcode='22023'; end if;
 perform private.portal_mcp_reject_synthetic(b.source_name,b.source_provenance,b.rows);
 if b.preview_digest<>encode(extensions.digest(b.rows::text,'sha256'),'hex') then raise exception 'Batch missing, changed, or not ready' using errcode='40001'; end if;
 perform private.portal_consume_approval_digest(p_approval_id,'OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,b.preview_digest);
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
 update public.mcp_ingestion_batches set status='COMMITTED',committed_at=now(),commit_result=jsonb_build_object('atomic',true,'verified',true,'verification_status',b.verification_status,'verified_by_user_id',b.verified_by_user_id,'verified_at',b.verified_at,'source_provenance',b.source_provenance,'records',results,'approval',approval),row_version=row_version+1,approval_row_version=null where batch_id=b.batch_id;
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id,detail) values(auth.uid(),'MCP','OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,'SUCCESS',p_approval_id,jsonb_build_object('records',jsonb_array_length(results),'verification_status',b.verification_status,'preview_digest',b.preview_digest));
 return jsonb_build_object('batch_id',b.batch_id,'status','COMMITTED','atomic',true,'verified',true,'verification_status',b.verification_status,'verified_by_user_id',b.verified_by_user_id,'verified_at',b.verified_at,'records',results,'approval',approval);
end $$;
revoke all on function public.portal_mcp_commit_operational_changes(uuid,uuid) from public,anon;
grant execute on function public.portal_mcp_commit_operational_changes(uuid,uuid) to authenticated;
