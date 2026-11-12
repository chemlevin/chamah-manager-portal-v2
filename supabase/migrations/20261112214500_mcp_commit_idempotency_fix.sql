create or replace function public.portal_mcp_commit_operational_changes(p_batch_id uuid,p_approval_id uuid)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.mcp_ingestion_batches; r jsonb; current_row jsonb; item jsonb; results jsonb:='[]'::jsonb; approval jsonb; entity_id uuid; record_version int;
begin
 select * into b from public.mcp_ingestion_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.status='COMMITTED' then
  return coalesce(b.commit_result,jsonb_build_object('batch_id',b.batch_id,'status','COMMITTED','verified',true))||jsonb_build_object('idempotent_replay',true);
 end if;
 if b.batch_id is null or b.domain<>'OPERATIONS' or b.status<>'READY' or b.approval_id is distinct from p_approval_id then raise exception 'Batch approval mismatch' using errcode='22023'; end if;
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
  values(upper(r->>'entity'),entity_id,case when nullif(r->>'record_id','') is null then 'MCP_CREATE' else 'MCP_UPDATE' end,auth.uid(),r->'_matched_record',(item-'created_by_user_id'-'updated_by_user_id')||jsonb_build_object('_mcp_batch_id',b.batch_id,'row_version',record_version),'MCP',now());
 end loop;
 update public.mcp_ingestion_batches set status='COMMITTED',committed_at=now(),commit_result=jsonb_build_object('atomic',true,'verified',true,'records',results,'approval',approval),row_version=row_version+1 where batch_id=b.batch_id;
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id,detail) values(auth.uid(),'MCP','OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,'SUCCESS',p_approval_id,jsonb_build_object('records',jsonb_array_length(results)));
 return jsonb_build_object('batch_id',b.batch_id,'status','COMMITTED','atomic',true,'verified',true,'records',results,'approval',approval);
end $$;

revoke all on function public.portal_mcp_commit_operational_changes(uuid,uuid) from public,anon;
grant execute on function public.portal_mcp_commit_operational_changes(uuid,uuid) to authenticated;
