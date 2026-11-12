create or replace function public.portal_mcp_commit_operational_changes(p_batch_id uuid,p_approval_id uuid)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.mcp_ingestion_batches; r jsonb; item jsonb; results jsonb:='[]'::jsonb; before_row jsonb; entity_id uuid;
begin
 if not private.portal_is_authorized(auth.uid(),'OPERATIONS.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into b from public.mcp_ingestion_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.status='COMMITTED' then return b.commit_result||jsonb_build_object('idempotent_replay',true); end if;
 if b.batch_id is null or b.status<>'READY' or b.preview_digest<>encode(extensions.digest(b.rows::text,'sha256'),'hex') then raise exception 'Batch missing, changed, or not ready' using errcode='40001'; end if;
 perform private.portal_consume_approval(p_approval_id,'OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,jsonb_build_object('batch_id',b.batch_id,'row_version',b.row_version,'preview_digest',b.preview_digest));
 for r in select value from jsonb_array_elements(b.rows) loop
  if (r->'_matched_record') @> (r->'values') then
   results:=results||jsonb_build_array(jsonb_build_object('entity',r->>'entity','operation','SKIP','record',r->'_matched_record'));
   continue;
  end if;
  item:=private.portal_mcp_apply_operational_row(r); results:=results||jsonb_build_array(jsonb_build_object('entity',r->>'entity','record',item));
  entity_id:=nullif(coalesce(item->>coalesce(private.portal_mcp_entity_meta(r->>'entity')->>'id','id'),r->>'record_id'),'')::uuid;
  insert into public.audit_events(entity_type,entity_id,operation,previous_values,new_values,source_type,actor_user_id,import_batch_id)
  values(r->>'entity',entity_id,case when nullif(r->>'record_id','') is null then 'MCP_CREATE' else 'MCP_UPDATE' end,null,item||jsonb_build_object('_mcp_batch_id',b.batch_id),'MCP',auth.uid(),null);
 end loop;
 update public.mcp_ingestion_batches set status='COMMITTED',approval_id=p_approval_id,committed_at=now(),commit_result=jsonb_build_object('batch_id',b.batch_id,'status','COMMITTED','records',results,'verified',true,'atomic',true) where batch_id=b.batch_id returning commit_result into item;
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id,detail) values(auth.uid(),'MCP','OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,'SUCCESS',p_approval_id,jsonb_build_object('records',jsonb_array_length(results)));
 return item;
end $$;
