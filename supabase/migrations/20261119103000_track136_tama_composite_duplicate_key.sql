-- TRACK136: source identity is a composite business key. A source system
-- alone is shared by every TAMA row and must never create batch duplicates.

create or replace function private.portal_mcp_entity_meta(p_entity text)
returns jsonb language sql immutable set search_path=public,private,pg_temp as $$
  select case when p_entity='government_funding_records' then jsonb_build_object(
    'table','government_funding_records','id','government_funding_record_id',
    'stable',jsonb_build_array('source_system','source_record_id'),
    'stable_mode','COMPOSITE','generic',true,
    'required',jsonb_build_array('funding_month','amount','source_system','source_record_id'),
    'writable',jsonb_build_array(
      'government_funding_report_id','daycare_id','funding_month','child_id',
      'amount','child_count','source_payload','source_system','source_record_id',
      'source_version','source_mapping_version')
  ) else private.portal_mcp_entity_meta_base(p_entity) end;
$$;

revoke all on function private.portal_mcp_entity_meta(text)
  from public,anon,authenticated;
