-- TRACK119b: classify stable-identifier matches safely and use the existing
-- audit vocabulary so a valid commit cannot be rolled back by audit logging.
create or replace function public.portal_mcp_preview_daycare_import(p_rows jsonb,p_source_name text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.mcp_ingestion_batches; report jsonb; conflicts int;
begin
 perform private.portal_require_action('DAYCARE.IMPORT');
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 100 then raise exception 'daycare import requires 1-100 rows'; end if;
 if length(btrim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'invalid idempotency key'; end if;
 select * into b from public.mcp_ingestion_batches where actor_user_id=auth.uid() and domain='DAYCARES' and idempotency_key=p_idempotency_key;
 if found then return jsonb_build_object('status','IDEMPOTENT_REPLAY','batch_id',b.batch_id,'preview',b.preview); end if;
 with items as (
  select value r,ord from jsonb_array_elements(p_rows) with ordinality a(value,ord)
 ), codes as (
  select upper(btrim(r->>'daycare_code')) code,count(*) n from items group by 1
 ), analyzed as (
  select i.ord,i.r,by_code.daycare_id,by_code.row_version existing_version,
   case when by_code.daycare_id is not null then 'DAYCARE_CODE' when by_license.daycare_id is not null then 'LICENSE_NUMBER' end matching_basis,
   (by_code.daycare_id is not null
    and by_code.display_name=btrim(i.r->>'display_name')
    and (not(i.r?'license_number') or by_code.license_number is not distinct from nullif(btrim(i.r->>'license_number'),''))
    and (not(i.r?'address_text') or by_code.address_text is not distinct from nullif(btrim(i.r->>'address_text'),''))
    and (not(i.r?'opened_on') or by_code.opened_on is not distinct from nullif(i.r->>'opened_on','')::date)
    and (not(i.r?'closed_on') or by_code.closed_on is not distinct from nullif(i.r->>'closed_on','')::date)
    and (not(i.r?'lifecycle_status') or by_code.lifecycle_status=coalesce(nullif(i.r->>'lifecycle_status',''),by_code.lifecycle_status))
    and (not(i.r?'display_order') or by_code.display_order=coalesce((i.r->>'display_order')::int,by_code.display_order))) exact_match,
   array_remove(array[
    case when upper(btrim(i.r->>'daycare_code')) !~ '^[A-Z0-9_-]+$' then 'INVALID_DAYCARE_CODE' end,
    case when nullif(btrim(i.r->>'display_name'),'') is null then 'DISPLAY_NAME_REQUIRED' end,
    case when c.n>1 then 'DUPLICATE_IN_FILE' end,
    case when by_code.daycare_id is null and by_license.daycare_id is not null then 'STABLE_IDENTIFIER_CONFLICT' end,
    case when by_code.daycare_id is not null and by_license.daycare_id is not null and by_code.daycare_id<>by_license.daycare_id then 'AMBIGUOUS_STABLE_IDENTIFIERS' end,
    case when by_code.daycare_id is not null and not (
      by_code.display_name=btrim(i.r->>'display_name')
      and (not(i.r?'license_number') or by_code.license_number is not distinct from nullif(btrim(i.r->>'license_number'),''))
      and (not(i.r?'address_text') or by_code.address_text is not distinct from nullif(btrim(i.r->>'address_text'),''))
      and (not(i.r?'opened_on') or by_code.opened_on is not distinct from nullif(i.r->>'opened_on','')::date)
      and (not(i.r?'closed_on') or by_code.closed_on is not distinct from nullif(i.r->>'closed_on','')::date)
      and (not(i.r?'lifecycle_status') or by_code.lifecycle_status=coalesce(nullif(i.r->>'lifecycle_status',''),by_code.lifecycle_status))
      and (not(i.r?'display_order') or by_code.display_order=coalesce((i.r->>'display_order')::int,by_code.display_order))
     ) and nullif(i.r->>'expected_row_version','') is null then 'EXPECTED_ROW_VERSION_REQUIRED' end,
    case when by_code.daycare_id is not null and nullif(i.r->>'expected_row_version','') is not null and (i.r->>'expected_row_version')::int<>by_code.row_version then 'STALE_ROW_VERSION' end
   ],null) issues
  from items i
  join codes c on c.code=upper(btrim(i.r->>'daycare_code'))
  left join public.daycares by_code on by_code.daycare_code=upper(btrim(i.r->>'daycare_code'))
  left join public.daycares by_license on nullif(btrim(i.r->>'license_number'),'') is not null and by_license.license_number=btrim(i.r->>'license_number')
 ), records as (
  select ord,upper(btrim(r->>'daycare_code')) daycare_code,daycare_id matched_daycare_id,matching_basis,existing_version,
   case when cardinality(issues)>0 then 'CONFLICT' when exact_match then 'SKIP' when daycare_id is null then 'CREATE' else 'UPDATE' end action,
   issues
  from analyzed order by ord
 )
 select jsonb_build_object(
   'records',coalesce(jsonb_agg(to_jsonb(records)),'[]'::jsonb),
   'create_count',count(*) filter(where action='CREATE'),
   'update_count',count(*) filter(where action='UPDATE'),
   'skip_count',count(*) filter(where action='SKIP'),
   'conflict_count',count(*) filter(where action='CONFLICT')),
  count(*) filter(where action='CONFLICT') into report,conflicts from records;
 insert into public.mcp_ingestion_batches(actor_user_id,domain,idempotency_key,source_name,rows,preview,status)
 values(auth.uid(),'DAYCARES',p_idempotency_key,left(coalesce(nullif(btrim(p_source_name),''),'ChatGPT'),120),p_rows,report,case when conflicts=0 then 'READY' else 'CONFLICTS' end) returning * into b;
 return jsonb_build_object('status',b.status,'batch_id',b.batch_id,'preview',report,'requires_director_approval',conflicts=0);
end$$;

create or replace function public.portal_mcp_commit_daycare_import(p_batch_id uuid,p_approval_id uuid)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.mcp_ingestion_batches; item jsonb; rec jsonb; entity_id uuid; unit_id uuid; d public.daycares; created int:=0; updated int:=0; skipped int:=0; payload jsonb; audit_operation text;
begin
 perform private.portal_require_action('DAYCARE.IMPORT');
 select * into b from public.mcp_ingestion_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if not found or b.status<>'READY' or b.approval_id is distinct from p_approval_id then raise exception 'approved ready batch required'; end if;
 payload:=jsonb_build_object('batch_id',b.batch_id,'rows',b.rows);
 perform private.portal_consume_approval(p_approval_id,'DAYCARE.IMPORT','DAYCARE_IMPORT',b.batch_id,payload);
 select legal_entity_id into entity_id from public.legal_entities where legal_entity_code='TRACK119_ORG' and lifecycle_status='ACTIVE';
 if entity_id is null then raise exception 'TRACK119 synthetic legal entity missing'; end if;
 for item in select value from jsonb_array_elements(b.rows) loop
  select value into rec from jsonb_array_elements(b.preview->'records') where value->>'daycare_code'=upper(btrim(item->>'daycare_code')) limit 1;
  if rec is null or rec->>'action'='CONFLICT' then raise exception 'batch preview is not committable'; end if;
  select * into d from public.daycares where daycare_code=upper(btrim(item->>'daycare_code')) for update;
  if rec->>'action'='SKIP' then
   if d.daycare_id is null or d.row_version<>(rec->>'existing_version')::int then raise exception 'daycare changed; refresh required'; end if;
   skipped:=skipped+1;
   continue;
  elsif rec->>'action'='CREATE' then
   if d.daycare_id is not null or (nullif(btrim(item->>'license_number'),'') is not null and exists(select 1 from public.daycares where license_number=btrim(item->>'license_number'))) then raise exception 'stable identifier changed; refresh required'; end if;
   insert into public.allocation_units(allocation_unit_code,display_name,allocation_unit_type,legal_entity_id,created_by_user_id,updated_by_user_id)
   values('DAYCARE_'||upper(btrim(item->>'daycare_code')),btrim(item->>'display_name'),'DAYCARE',entity_id,auth.uid(),auth.uid()) returning allocation_unit_id into unit_id;
   insert into public.daycares(daycare_code,display_name,license_number,legal_entity_id,allocation_unit_id,address_text,opened_on,closed_on,lifecycle_status,display_order,created_by_user_id,updated_by_user_id)
   values(upper(btrim(item->>'daycare_code')),btrim(item->>'display_name'),nullif(btrim(item->>'license_number'),''),entity_id,unit_id,nullif(btrim(item->>'address_text'),''),nullif(item->>'opened_on','')::date,nullif(item->>'closed_on','')::date,coalesce(nullif(item->>'lifecycle_status',''),'ACTIVE'),coalesce((item->>'display_order')::int,0),auth.uid(),auth.uid()) returning * into d;
   created:=created+1; audit_operation:='MCP_CREATE';
  else
   if nullif(btrim(item->>'license_number'),'') is not null and exists(select 1 from public.daycares where license_number=btrim(item->>'license_number') and daycare_id<>d.daycare_id) then raise exception 'stable identifier changed; refresh required'; end if;
   update public.daycares set display_name=btrim(item->>'display_name'),license_number=case when item?'license_number' then nullif(btrim(item->>'license_number'),'') else license_number end,address_text=case when item?'address_text' then nullif(btrim(item->>'address_text'),'') else address_text end,opened_on=case when item?'opened_on' then nullif(item->>'opened_on','')::date else opened_on end,closed_on=case when item?'closed_on' then nullif(item->>'closed_on','')::date else closed_on end,lifecycle_status=coalesce(nullif(item->>'lifecycle_status',''),lifecycle_status),display_order=coalesce((item->>'display_order')::int,display_order),updated_by_user_id=auth.uid()
   where daycare_id=d.daycare_id and row_version=(item->>'expected_row_version')::int returning * into d;
   if not found then raise exception 'daycare changed; refresh required'; end if;
   updated:=updated+1; audit_operation:='MCP_UPDATE';
  end if;
  insert into public.audit_events(entity_type,entity_id,operation,new_values,source_type,actor_user_id) values('daycares',d.daycare_id,audit_operation,to_jsonb(d),'MCP',auth.uid());
 end loop;
 update public.mcp_ingestion_batches set status='COMMITTED',committed_at=now() where batch_id=b.batch_id;
 return jsonb_build_object('status','COMMITTED','batch_id',b.batch_id,'created_count',created,'updated_count',updated,'skipped_count',skipped,'verified_count',(select count(*) from public.daycares where daycare_code in(select upper(btrim(value->>'daycare_code')) from jsonb_array_elements(b.rows))));
end$$;

grant execute on function public.portal_mcp_preview_daycare_import(jsonb,text,text),public.portal_mcp_commit_daycare_import(uuid,uuid) to authenticated;
