-- Complete the set-based Preview path introduced by
-- 20261125111600_generic_set_based_preview_base.sql. The base function already
-- computes stable-token counts once; use that map for every entity instead of
-- rescanning the full JSON input once per row/token.
create or replace function private.portal_mcp_row_conflicts_fast(
  p_row jsonb,
  p_all_rows jsonb,
  p_duplicate_tokens jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private,pg_temp
as $$
declare
  m jsonb:=private.portal_mcp_entity_meta(p_row->>'entity');
  v jsonb:=p_row->'values';
  conflicts jsonb:='[]'::jsonb;
  k text;
  token text;
begin
  if p_row?'_match_conflict' then
    conflicts:=conflicts||jsonb_build_array(p_row->>'_match_conflict');
  end if;

  if nullif(p_row->>'record_id','') is null and m?'required' then
    for k in select jsonb_array_elements_text(m->'required') loop
      if not(v?k)
         or v->k='null'::jsonb
         or (jsonb_typeof(v->k)='string' and trim(v->>k)='') then
        conflicts:=conflicts||jsonb_build_array('REQUIRED_FIELD:'||k);
      end if;
    end loop;
  end if;

  for token in select unnest(private.portal_mcp_stable_tokens(p_row)) loop
    if coalesce((p_duplicate_tokens->>token)::integer,0)>1 then
      conflicts:=conflicts||jsonb_build_array('DUPLICATE_IN_BATCH:'||token);
    end if;
  end loop;

  return (
    select coalesce(jsonb_agg(distinct value),'[]'::jsonb)
    from jsonb_array_elements(conflicts)
  );
end
$$;

revoke all on function private.portal_mcp_row_conflicts_fast(jsonb,jsonb,jsonb)
from public,anon;
