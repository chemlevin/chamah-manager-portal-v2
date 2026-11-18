-- TRACK138 commit fix: normalize the already-staged flattened collection
-- receipt row shape to the generic writer's {entity, values} contract.
-- Stored rows, preview digest, approval binding, and unresolved exclusions are
-- unchanged; this only affects commit-time field extraction.
create or replace function private.portal_mcp_apply_operational_row_v2(p_row jsonb)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare normalized jsonb:=p_row;
begin
  if p_row->>'entity'='collection_receipts'
     and jsonb_typeof(p_row->'values') is distinct from 'object' then
    normalized:=p_row||jsonb_build_object(
      'values',p_row-'entity'-'record_id'-'expected_row_version'-'_matched_record'-'_match_conflict');
  end if;
  if coalesce((private.portal_mcp_entity_meta(normalized->>'entity')->>'generic')::boolean,false)
     then return private.portal_mcp_apply_generic_row(normalized); end if;
  return private.portal_mcp_apply_operational_row(normalized);
end $$;

revoke all on function private.portal_mcp_apply_operational_row_v2(jsonb) from public,anon,authenticated;
