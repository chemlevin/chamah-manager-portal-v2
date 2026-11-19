-- TRACK136 performance follow-up: avoid quadratic duplicate-token scans for
-- government funding Preview rows. The existing generic path is unchanged.

create or replace function private.portal_mcp_entity_meta(p_entity text)
returns jsonb language sql immutable set search_path=public,private,pg_temp as $$
  select case when p_entity='government_funding_records' then jsonb_build_object(
    'table','government_funding_records','id','government_funding_record_id',
    'stable',jsonb_build_array('source_system','source_record_id'),
    'stable_mode','ANY','generic',true,
    'required',jsonb_build_array('funding_month','amount','source_system','source_record_id'),
    'writable',jsonb_build_array(
      'government_funding_report_id','daycare_id','funding_month','child_id',
      'amount','child_count','source_payload','source_system','source_record_id',
      'source_version','source_mapping_version')
  ) else private.portal_mcp_entity_meta_base(p_entity) end;
$$;

create or replace function private.portal_mcp_row_conflicts_fast(
  p_row jsonb, p_all_rows jsonb, p_duplicate_tokens jsonb)
returns jsonb language plpgsql stable security definer
set search_path=public,private,pg_temp as $$
declare
 m jsonb:=private.portal_mcp_entity_meta(p_row->>'entity');
 v jsonb:=p_row->'values'; conflicts jsonb:='[]'::jsonb; k text; token text;
begin
 if p_row?'_match_conflict' then
  conflicts:=conflicts||jsonb_build_array(p_row->>'_match_conflict');
 end if;
 if nullif(p_row->>'record_id','') is null and m?'required' then
  for k in select jsonb_array_elements_text(m->'required') loop
   if not(v?k) or v->k='null'::jsonb or
      (jsonb_typeof(v->k)='string' and trim(v->>k)='') then
    conflicts:=conflicts||jsonb_build_array('REQUIRED_FIELD:'||k);
   end if;
  end loop;
 end if;
 if p_row->>'entity'='government_funding_records' then
  for token in select unnest(private.portal_mcp_stable_tokens(p_row)) loop
   if coalesce((p_duplicate_tokens->>token)::integer,0)>1 then
    conflicts:=conflicts||jsonb_build_array('DUPLICATE_IN_BATCH:'||token);
   end if;
  end loop;
  return (select coalesce(jsonb_agg(distinct value),'[]'::jsonb)
          from jsonb_array_elements(conflicts));
 end if;
 return private.portal_mcp_row_conflicts(p_row,p_all_rows);
end $$;

revoke all on function private.portal_mcp_row_conflicts_fast(jsonb,jsonb,jsonb)
  from public,anon,authenticated;

-- Preserve the existing 4-argument Preview contract and safeguards, changing
-- only duplicate-token preparation and lookup for the TAMA entity.
create or replace function public.portal_mcp_preview_operational_changes(
  p_rows jsonb, p_source_name text, p_source_provenance jsonb,
  p_idempotency_key text)
returns jsonb language plpgsql security definer
set search_path=public,private,extensions,pg_temp as $$
declare
 actor uuid:=auth.uid(); b public.mcp_ingestion_batches;
 preview jsonb:='[]'::jsonb; digest_value text; staged_rows jsonb;
 duplicate_tokens jsonb:='{}'::jsonb; r jsonb; conflicts jsonb;
 n integer:=0; operation text;
begin
 if not private.portal_is_authorized(actor,'OPERATIONS.WRITE') then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 1000 then
  raise exception 'Rows must contain 1..1000 records' using errcode='22023';
 end if;
 if jsonb_typeof(p_source_provenance)<>'object' or p_source_provenance='{}'::jsonb then
  raise exception 'Source provenance is required' using errcode='22023';
 end if;
 if length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then
  raise exception 'Invalid idempotency key' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r0 where
   jsonb_typeof(r0)<>'object' or private.portal_mcp_entity_meta(r0->>'entity') is null
   or jsonb_typeof(r0->'values')<>'object') then
  raise exception 'Unsupported entity or invalid row' using errcode='22023';
 end if;
 select jsonb_agg(private.portal_mcp_match_operational_row_v2(r0) order by ord)
   into staged_rows
   from jsonb_array_elements(p_rows) with ordinality x(r0,ord);
 select coalesce(jsonb_object_agg(token,token_count),'{}'::jsonb)
   into duplicate_tokens
   from (
     select token,count(*)::integer token_count
     from jsonb_array_elements(staged_rows) x(row)
     cross join lateral unnest(private.portal_mcp_stable_tokens(x.row)) token
     group by token
   ) counts;
 for r in select value from jsonb_array_elements(staged_rows) loop
  n:=n+1;
  conflicts:=private.portal_mcp_row_conflicts_fast(r,staged_rows,duplicate_tokens);
  operation:=case when jsonb_array_length(conflicts)>0 then 'CONFLICT'
    when nullif(r->>'record_id','') is null then 'CREATE'
    when (r->'_matched_record') @> (r->'values') then 'SKIP' else 'UPDATE' end;
  preview:=preview||jsonb_build_array(jsonb_build_object(
    'source_row',n,'entity',r->>'entity','record_id',r->>'record_id',
    'expected_row_version',r->'expected_row_version','operation',operation,
    'status',case when jsonb_array_length(conflicts)>0 then 'CONFLICT' else 'READY' end,
    'conflicts',conflicts));
 end loop;
 digest_value:=encode(digest(staged_rows::text,'sha256'),'hex');
 insert into public.mcp_ingestion_batches(
   actor_user_id,domain,idempotency_key,source_name,source_provenance,
   verification_status,rows,preview,status,preview_digest)
 values(actor,'OPERATIONS',trim(p_idempotency_key),
   left(coalesce(nullif(trim(p_source_name),''),'ChatGPT'),120),p_source_provenance,
   'PENDING_VERIFICATION',staged_rows,preview,
   case when exists(select 1 from jsonb_array_elements(preview) x
     where x->>'status'='CONFLICT') then 'CONFLICTS' else 'READY' end,digest_value)
 on conflict(actor_user_id,domain,idempotency_key) do update
   set source_name=excluded.source_name,source_provenance=excluded.source_provenance
   where public.mcp_ingestion_batches.rows=excluded.rows
 returning * into b;
 if b.batch_id is null then
  raise exception 'Idempotency key already used with different rows' using errcode='23505';
 end if;
 return jsonb_build_object('batch_id',b.batch_id,'status',b.status,
   'row_version',b.row_version,'preview_digest',b.preview_digest,'preview',b.preview,
   'verification_status',b.verification_status,'canonical_writes',false);
end $$;

revoke all on function public.portal_mcp_preview_operational_changes(jsonb,text,jsonb,text)
  from public,anon;
grant execute on function public.portal_mcp_preview_operational_changes(jsonb,text,jsonb,text)
  to authenticated;
