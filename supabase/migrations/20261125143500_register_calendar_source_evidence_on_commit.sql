-- Register immutable calendar source evidence inside the governed Commit transaction
-- before applying calendar records that reference it.

create or replace function private.portal_mcp_register_calendar_source_evidence(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  b public.mcp_ingestion_batches;
  v_source_batch_id uuid;
  v_source_count integer;
  v_day_count integer;
  v_source_fingerprint text;
  v_invalid_count integer;
begin
  select * into b
  from public.mcp_ingestion_batches
  where batch_id = p_batch_id
  for update;

  if b.batch_id is null or not exists (
    select 1
    from jsonb_array_elements(b.rows) r
    where r->>'entity' = 'holiday_calendars'
  ) then
    return;
  end if;

  select
    count(distinct nullif(r->'values'->>'source_batch_id','')),
    min(nullif(r->'values'->>'source_batch_id','')::uuid)
  into v_source_count, v_source_batch_id
  from jsonb_array_elements(b.rows) r
  where r->>'entity' = 'holiday_calendars';

  if v_source_count <> 1 or v_source_batch_id is null then
    raise exception 'Calendar source batch identity is missing or ambiguous'
      using errcode = '22023';
  end if;

  select count(*) into v_day_count
  from jsonb_array_elements(b.rows) r
  where r->>'entity' = 'holiday_calendar_days';

  if v_day_count = 0 then
    raise exception 'Calendar batch contains no calendar-day source evidence'
      using errcode = '22023';
  end if;

  v_source_fingerprint := encode(
    extensions.digest(convert_to(coalesce(b.source_provenance,'{}'::jsonb)::text,'UTF8'),'sha256'),
    'hex'
  );

  insert into public.canonical_source_batches(
    source_batch_id, source_domain, source_file, source_file_fingerprint,
    status, row_count, metadata, created_by
  )
  values (
    v_source_batch_id,
    'CALENDAR_PDF',
    b.source_name,
    v_source_fingerprint,
    'REGISTERED',
    v_day_count,
    jsonb_build_object(
      'mcp_batch_id', b.batch_id,
      'task_id', b.source_provenance->>'task_id',
      'source_files', coalesce(b.source_provenance->'source_files','[]'::jsonb),
      'registered_from', 'governed_calendar_commit'
    ),
    auth.uid()
  )
  on conflict (source_batch_id) do nothing;

  if not exists (
    select 1
    from public.canonical_source_batches s
    where s.source_batch_id = v_source_batch_id
      and s.source_domain = 'CALENDAR_PDF'
      and s.source_file_fingerprint = v_source_fingerprint
      and s.row_count = v_day_count
  ) then
    raise exception 'Registered calendar source batch does not match staged provenance'
      using errcode = '22023';
  end if;

  with calendar_defs as (
    select
      r->'values'->>'holiday_calendar_id' as holiday_calendar_id,
      r->'values'->>'calendar_code' as calendar_code
    from jsonb_array_elements(b.rows) r
    where r->>'entity' = 'holiday_calendars'
  ),
  day_rows as (
    select r->'values' as values, ordinality::integer as source_row_number
    from jsonb_array_elements(b.rows) with ordinality r
    where r->>'entity' = 'holiday_calendar_days'
  )
  insert into public.canonical_source_rows(
    source_row_id, source_batch_id, source_sheet, source_row_number,
    source_record_id, original_payload, row_fingerprint, resolution_status,
    source_system, source_file, reporting_month
  )
  select
    (d.values->>'source_row_id')::uuid,
    v_source_batch_id,
    c.calendar_code,
    d.source_row_number,
    d.values->>'source_row_id',
    jsonb_build_object(
      'calendar_code', c.calendar_code,
      'calendar_date', d.values->>'calendar_date',
      'day_status', d.values->>'day_status',
      'reason', d.values->>'reason',
      'source_page', d.values->>'source_page',
      'source_text', d.values->>'source_text',
      'source_fingerprint', d.values->>'source_fingerprint'
    ),
    d.values->>'source_fingerprint',
    'RESOLVED',
    b.source_provenance->>'source_system',
    case
      when c.calendar_code ilike 'HAREDI%' then coalesce(
        (select f->>'filename' from jsonb_array_elements(coalesce(b.source_provenance->'source_files','[]'::jsonb)) f where lower(f->>'filename') like '%haredi%' limit 1),
        b.source_name
      )
      else coalesce(
        (select f->>'filename' from jsonb_array_elements(coalesce(b.source_provenance->'source_files','[]'::jsonb)) f where lower(f->>'filename') like '%jewish%' limit 1),
        b.source_name
      )
    end,
    null
  from day_rows d
  join calendar_defs c
    on c.holiday_calendar_id = d.values->>'holiday_calendar_id'
  on conflict (source_row_id) do nothing;

  with day_rows as (
    select r->'values' as values
    from jsonb_array_elements(b.rows) r
    where r->>'entity' = 'holiday_calendar_days'
  )
  select count(*) into v_invalid_count
  from day_rows d
  left join public.canonical_source_rows s
    on s.source_row_id = (d.values->>'source_row_id')::uuid
   and s.source_batch_id = v_source_batch_id
   and s.row_fingerprint = d.values->>'source_fingerprint'
  where s.source_row_id is null;

  if v_invalid_count <> 0 then
    raise exception 'Calendar source-row registration failed for % rows', v_invalid_count
      using errcode = '22023';
  end if;
end;
$$;

revoke all on function private.portal_mcp_register_calendar_source_evidence(uuid) from public;

create or replace function public.portal_mcp_commit_operational_changes_v1(
  p_batch_id uuid,
  p_approval_id uuid,
  p_contract_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  result jsonb;
  stored text;
begin
  select contract_version into stored
  from public.mcp_ingestion_batches
  where batch_id = p_batch_id and actor_user_id = auth.uid();

  if p_contract_version is distinct from private.portal_operational_contract_version()
     or stored is distinct from p_contract_version then
    raise exception 'VERSION_MISMATCH' using errcode = '22023';
  end if;

  perform private.portal_mcp_register_calendar_source_evidence(p_batch_id);

  result := public.portal_mcp_commit_operational_changes(p_batch_id,p_approval_id);
  return result || jsonb_build_object('contract_version',p_contract_version,'workflow','Commit');
end;
$$;