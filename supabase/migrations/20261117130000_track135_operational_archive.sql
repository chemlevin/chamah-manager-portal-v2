-- TRACK135: Director-only, approval-bound operational archive.
create or replace function public.portal_mcp_archive_operational_record(
  p_entity text, p_record_id uuid, p_expected_row_version integer,
  p_reason text, p_approval_id uuid
) returns jsonb language plpgsql security definer
set search_path=public,private,pg_temp as $$
declare m jsonb; old_row jsonb; new_row jsonb; table_name text; id_col text;
begin
  if not exists(select 1 from public.portal_my_authorization() where active and 'DIRECTOR'=any(roles)) then
    raise exception 'Director authorization required' using errcode='42501';
  end if;
  if p_entity is null or not p_entity ~ '^[a-z_]{1,80}$' or p_record_id is null
     or p_expected_row_version is null or p_expected_row_version < 1
     or length(trim(coalesce(p_reason,''))) < 3 or p_approval_id is null then
    raise exception 'Exact entity, record, row version, reason and approval are required' using errcode='22023';
  end if;
  m:=private.portal_mcp_entity_meta(p_entity);
  if m is null or not coalesce((m->>'generic')::boolean,false)
     or not exists(select 1 from jsonb_array_elements_text(m->'writable') x where x='lifecycle_status') then
    raise exception 'Entity is not archiveable' using errcode='0A000';
  end if;
  table_name:=m->>'table'; id_col:=m->>'id';
  execute format('select to_jsonb(t) from public.%I t where t.%I=$1 for update',table_name,id_col) into old_row using p_record_id;
  if old_row is null then raise exception 'Record not found' using errcode='P0002'; end if;
  if (old_row->>'row_version')::integer is distinct from p_expected_row_version then
    raise exception 'Stale row version' using errcode='40001';
  end if;
  perform private.portal_consume_approval_digest(
    p_approval_id,'OPERATIONS.ARCHIVE',upper(p_entity),p_record_id,
    encode(extensions.digest(jsonb_build_object('entity',p_entity,'record_id',p_record_id,
      'expected_row_version',p_expected_row_version,'reason',trim(p_reason))::text,'sha256'),'hex'));
  execute format('update public.%I set lifecycle_status=''ARCHIVED'', updated_by_user_id=auth.uid() where %I=$1 and row_version=$2 returning to_jsonb(%I.*)',
    table_name,id_col,table_name) into new_row using p_record_id,p_expected_row_version;
  if new_row is null then raise exception 'Concurrent update rejected' using errcode='40001'; end if;
  insert into public.audit_events(entity_type,entity_id,operation,actor_user_id,previous_values,new_values,source_type,occurred_at)
  values(upper(p_entity),p_record_id,'MCP_ARCHIVE',auth.uid(),old_row,new_row,'MCP',now());
  insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id,detail)
  values(auth.uid(),'MCP','OPERATIONS.ARCHIVE',upper(p_entity),p_record_id,'SUCCESS',p_approval_id,
    jsonb_build_object('reason',trim(p_reason),'expected_row_version',p_expected_row_version));
  return jsonb_build_object('entity',p_entity,'record_id',p_record_id,'status','ARCHIVED',
    'row_version',(new_row->>'row_version')::integer,'audit',true);
end $$;
revoke all on function public.portal_mcp_archive_operational_record(text,uuid,integer,text,uuid) from public,anon;
grant execute on function public.portal_mcp_archive_operational_record(text,uuid,integer,text,uuid) to authenticated;
