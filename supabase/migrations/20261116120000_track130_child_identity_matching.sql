-- TRACK130 follow-up: child identity matching must not treat source_system alone
-- as a stable identity. National ID is the business identity; source_system plus
-- source_record_id identify the source row and make re-imports idempotent.

create or replace function private.portal_mcp_match_operational_row_v2(p_row jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare
 e text:=p_row->>'entity'; v jsonb:=p_row->'values'; m jsonb:=private.portal_mcp_entity_meta(e);
 rid uuid:=nullif(p_row->>'record_id','')::uuid; found jsonb; matches int;
 v_source_system text:=nullif(v->>'source_system',''); v_source_record_id text:=nullif(v->>'source_record_id','');
 v_national_id text:=public.portal_normalize_national_id(v->>'national_id');
begin
 if m is null then return p_row||jsonb_build_object('_match_conflict','UNSUPPORTED_ENTITY'); end if;
 if rid is not null then
  found:=private.portal_mcp_get_record_json(e,rid);
  if found is null then return p_row||jsonb_build_object('_match_conflict','RECORD_NOT_FOUND'); end if;
  if nullif(p_row->>'expected_row_version','') is null then return p_row||jsonb_build_object('_matched_record',found,'_match_conflict','EXPECTED_ROW_VERSION_REQUIRED'); end if;
  if (p_row->>'expected_row_version')::int<>coalesce((found->>'row_version')::int,1) then return p_row||jsonb_build_object('_matched_record',found,'_match_conflict','STALE_ROW_VERSION'); end if;
  return p_row||jsonb_build_object('_matched_record',found);
 end if;
 if e='children' then
  if v_national_id is not null then
   select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found
   from public.children t where public.portal_normalize_national_id(t.national_id)=v_national_id;
   if matches>1 then return p_row||jsonb_build_object('_match_conflict','AMBIGUOUS_NATIONAL_ID'); end if;
   if matches=1 then
    if v_source_system is not null and v_source_record_id is not null
       and ((found->>'source_system') is distinct from v_source_system
       or (found->>'source_record_id') is distinct from v_source_record_id) then
     return p_row||jsonb_build_object('_matched_record',found,'_match_conflict','NATIONAL_ID_SOURCE_CONFLICT');
    end if;
    return p_row||jsonb_build_object('record_id',found->>'child_id','expected_row_version',coalesce(found->'row_version','1'::jsonb),'_matched_record',found);
   end if;
  end if;
  if v_source_system is not null and v_source_record_id is not null then
   select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found
   from public.children t where t.source_system=v_source_system and t.source_record_id=v_source_record_id;
   if matches>1 then return p_row||jsonb_build_object('_match_conflict','AMBIGUOUS_SOURCE_ROW'); end if;
   if matches=1 then
    if v_national_id is not null and public.portal_normalize_national_id(found->>'national_id') is distinct from v_national_id then
     return p_row||jsonb_build_object('_matched_record',found,'_match_conflict','SOURCE_ROW_NATIONAL_ID_CONFLICT');
    end if;
    return p_row||jsonb_build_object('record_id',found->>'child_id','expected_row_version',coalesce(found->'row_version','1'::jsonb),'_matched_record',found);
   end if;
  end if;
  return p_row;
 end if;
 if coalesce((m->>'generic')::boolean,false) then
  if m->>'stable_mode'='ANY' then
   return private.portal_mcp_match_operational_row(p_row);
  end if;
 end if;
 return private.portal_mcp_match_operational_row(p_row);
end $$;

create or replace function private.portal_mcp_stable_tokens(p_row jsonb)
returns text[] language plpgsql immutable set search_path=public,private,pg_temp as $$
declare m jsonb:=private.portal_mcp_entity_meta(p_row->>'entity'); v jsonb:=p_row->'values'; k text; tokens text[]:='{}'; composite text:='';
begin
 if m is null then return tokens; end if;
 if p_row->>'entity'='children' then
  if nullif(v->>'national_id','') is not null then tokens:=tokens||format('children|national_id=%s',public.portal_normalize_national_id(v->>'national_id')); end if;
  if nullif(v->>'source_system','') is not null and nullif(v->>'source_record_id','') is not null then
   tokens:=tokens||format('children|source_system=%s|source_record_id=%s',lower(trim(v->>'source_system')),lower(trim(v->>'source_record_id')));
  end if;
  return tokens;
 end if;
 if m->>'stable_mode'='ANY' then
  for k in select jsonb_array_elements_text(m->'stable') loop if nullif(v->>k,'') is not null then tokens:=tokens||format('%s|%s=%s',p_row->>'entity',k,lower(trim(v->>k))); end if; end loop;
 else
  for k in select jsonb_array_elements_text(m->'stable') loop if nullif(v->>k,'') is null then return tokens; end if; composite:=composite||'|'||k||'='||lower(trim(v->>k)); end loop;
  if composite<>'' then tokens:=tokens||((p_row->>'entity')||composite); end if;
 end if;
 return tokens;
end $$;
