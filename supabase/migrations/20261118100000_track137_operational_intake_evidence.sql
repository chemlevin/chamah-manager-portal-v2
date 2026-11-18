-- TRACK137: additive operational intake evidence and read-back.
-- Preserve the 1.0.0 MCP contract while making the exact staged values,
-- stable source keys, current values, changed fields and match evidence readable.

create or replace function private.portal_mcp_intake_evidence(p_row jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare
  meta jsonb:=private.portal_mcp_entity_meta(p_row->>'entity');
  values_json jsonb:=coalesce(p_row->'values','{}'::jsonb);
  current_json jsonb:=coalesce(p_row->'_matched_record','null'::jsonb);
  stable_keys jsonb:=coalesce(meta->'stable','[]'::jsonb);
  source_keys jsonb:='{}'::jsonb;
  changed_fields jsonb:='[]'::jsonb;
  key_name text;
  field_name text;
begin
  for key_name in select jsonb_array_elements_text(stable_keys) loop
    if values_json ? key_name and nullif(values_json->>key_name,'') is not null then
      source_keys:=source_keys||jsonb_build_object(key_name,values_json->key_name);
    end if;
  end loop;
  if jsonb_typeof(current_json)='object' then
    for field_name in select jsonb_object_keys(values_json) loop
      if current_json->field_name is distinct from values_json->field_name then
        changed_fields:=changed_fields||jsonb_build_array(field_name);
      end if;
    end loop;
  end if;
  return jsonb_build_object(
    'source_values',values_json,
    'source_keys',source_keys,
    'current_values',case when jsonb_typeof(current_json)='object' then ¶»§q«^