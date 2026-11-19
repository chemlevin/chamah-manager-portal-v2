-- TRACK136 follow-up: make TAMA child matching bounded and index-backed.
-- The prior registration preserved semantics but performed a full aggregate
-- lookup once per staged row. Limit each lookup to two matches (enough to
-- distinguish zero/one/ambiguous) and provide a non-partial functional index.

create index if not exists children_national_id_normalized_mcp_idx
  on public.children (public.portal_normalize_national_id(national_id));

create or replace function private.portal_mcp_match_operational_row_v2(p_row jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare
 e text:=p_row->>'entity'; v jsonb:=p_row->'values';
 normalized_id text:=public.portal_normalize_national_id(v->>'national_id');
 matches integer; found jsonb;
begin
 if e<>'government_funding_records' or nullif(p_row->>'record_id','') is not null then
  return private.portal_mcp_match_operational_row_v2_base(p_row);
 end if;
 if normalized_id is null then
  return p_row||jsonb_build_object('_match_conflict','MISSING_NATIONAL_ID');
 end if;
 select count(*),(jsonb_agg(to_jsonb(c))->0) into matches,found
 from (select c.* from public.children c
       where public.portal_normalize_national_id(c.national_id)=normalized_id
       limit 2) c;
 if matches>1 then return p_row||jsonb_build_object('_match_conflict','AMBIGUOUS_NATIONAL_ID'); end if;
 if matches=0 then return p_row||jsonb_build_object('_match_conflict','NATIONAL_ID_NOT_FOUND'); end if;
 return p_row||jsonb_build_object(
  'values',v||jsonb_build_object('child_id',found->>'child_id'),
  'matched_child_id',found->>'child_id');
end $$;

revoke all on function private.portal_mcp_match_operational_row_v2(jsonb)
  from public,anon,authenticated;
