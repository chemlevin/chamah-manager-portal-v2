-- Additive calendar storage. Existing monthly_work_calendars and its consumers
-- remain unchanged until a governed commit explicitly activates new data.
create table public.holiday_calendars (
  holiday_calendar_id uuid primary key default gen_random_uuid(),
  calendar_code text not null,
  calendar_type text not null,
  school_year_id uuid not null references public.school_years(school_year_id),
  version integer not null check (version > 0),
  effective_from date not null,
  effective_to date not null check (effective_to >= effective_from),
  source_batch_id uuid not null references public.canonical_source_batches(source_batch_id),
  lifecycle_status text not null default 'DRAFT' check (lifecycle_status in ('DRAFT','ACTIVE','RETIRED')),
  row_version integer not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  unique (calendar_code, version)
);

create table public.holiday_calendar_days (
  holiday_calendar_day_id uuid primary key default gen_random_uuid(),
  holiday_calendar_id uuid not null references public.holiday_calendars(holiday_calendar_id),
  calendar_date date not null,
  day_status text not null check (day_status in ('OPEN','CLOSED','PARTIAL')),
  reason text,
  source_row_id uuid not null references public.canonical_source_rows(source_row_id),
  source_page integer not null check (source_page > 0),
  source_text text not null,
  source_fingerprint text not null,
  row_version integer not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  unique (holiday_calendar_id, calendar_date)
);

create table public.daycare_calendar_assignments (
  daycare_calendar_assignment_id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null references public.daycares(daycare_id),
  holiday_calendar_id uuid not null references public.holiday_calendars(holiday_calendar_id),
  school_year_id uuid not null references public.school_years(school_year_id),
  effective_from date not null,
  effective_to date not null check (effective_to >= effective_from),
  version integer not null check (version > 0),
  source_lineage jsonb not null,
  approval_evidence jsonb,
  lifecycle_status text not null default 'DRAFT' check (lifecycle_status in ('DRAFT','ACTIVE','RETIRED')),
  row_version integer not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  unique (daycare_id, school_year_id, effective_from, version)
);

create table public.daycare_operating_hours (
  operating_hours_id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null references public.daycares(daycare_id),
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time not null,
  closes_at time not null check (closes_at > opens_at),
  is_short_day boolean not null default false,
  effective_from date not null,
  effective_to date not null check (effective_to >= effective_from),
  version integer not null check (version > 0),
  source_lineage jsonb not null,
  lifecycle_status text not null default 'DRAFT' check (lifecycle_status in ('DRAFT','ACTIVE','RETIRED')),
  row_version integer not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  unique (daycare_id, weekday, effective_from, version)
);

create table public.daycare_calendar_exceptions (
  calendar_exception_id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null references public.daycares(daycare_id),
  exception_date date not null,
  day_status text not null check (day_status in ('OPEN','CLOSED','PARTIAL')),
  operating_minutes integer check (operating_minutes > 0),
  reason text not null,
  source_lineage jsonb not null,
  approval_evidence jsonb,
  version integer not null check (version > 0),
  lifecycle_status text not null default 'DRAFT' check (lifecycle_status in ('DRAFT','ACTIVE','RETIRED')),
  row_version integer not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  unique (daycare_id, exception_date, version),
  check (day_status <> 'PARTIAL' or operating_minutes is not null)
);

create table public.daycare_monthly_operating_results (
  monthly_operating_result_id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null references public.daycares(daycare_id),
  school_year_month_id uuid not null references public.school_year_months(school_year_month_id),
  holiday_calendar_id uuid not null references public.holiday_calendars(holiday_calendar_id),
  calendar_version integer not null check (calendar_version > 0),
  operating_days integer not null check (operating_days >= 0),
  regular_minutes integer not null check (regular_minutes >= 0),
  short_day_minutes integer not null check (short_day_minutes >= 0),
  calculation_rule_key text not null,
  calculation_rule_version text not null,
  source_lineage jsonb not null,
  calculation_status text not null check (calculation_status in ('CALCULATED','UNRESOLVED','CONFLICT')),
  row_version integer not null default 1 check (row_version > 0),
  created_at timestamptz not null default now()
);

create index holiday_calendars_school_year_idx on public.holiday_calendars(school_year_id);
create index holiday_calendars_source_batch_idx on public.holiday_calendars(source_batch_id);
create index holiday_calendar_days_source_row_idx on public.holiday_calendar_days(source_row_id);
create index daycare_calendar_assignments_calendar_idx on public.daycare_calendar_assignments(holiday_calendar_id);
create index daycare_monthly_results_daycare_month_idx on public.daycare_monthly_operating_results(daycare_id, school_year_month_id);

alter table public.holiday_calendars enable row level security;
alter table public.holiday_calendar_days enable row level security;
alter table public.daycare_calendar_assignments enable row level security;
alter table public.daycare_operating_hours enable row level security;
alter table public.daycare_calendar_exceptions enable row level security;
alter table public.daycare_monthly_operating_results enable row level security;
revoke all on public.holiday_calendars, public.holiday_calendar_days, public.daycare_calendar_assignments from public, anon, authenticated;
revoke all on public.daycare_operating_hours, public.daycare_calendar_exceptions, public.daycare_monthly_operating_results from public, anon, authenticated;

-- Extend the established generic ingestion contract. The existing base metadata,
-- matcher, approval, commit and audit workflow remain the authoritative path.
do $$
begin
 if to_regprocedure('private.portal_mcp_entity_meta_base(text)') is null then
   alter function private.portal_mcp_entity_meta(text) rename to portal_mcp_entity_meta_base;
 end if;
end $$;

create or replace function private.portal_mcp_entity_meta(p_entity text)
returns jsonb language sql immutable set search_path=public,private,pg_temp as $$
select case p_entity
when 'holiday_calendars' then jsonb_build_object('table','holiday_calendars','id','holiday_calendar_id','stable',jsonb_build_array('calendar_code','version'),'required',jsonb_build_array('calendar_code','calendar_type','school_year_id','version','effective_from','effective_to','source_batch_id'),'writable',jsonb_build_array('calendar_code','calendar_type','school_year_id','version','effective_from','effective_to','source_batch_id','lifecycle_status'),'generic',true)
when 'holiday_calendar_days' then jsonb_build_object('table','holiday_calendar_days','id','holiday_calendar_day_id','stable',jsonb_build_array('holiday_calendar_id','calendar_date'),'required',jsonb_build_array('holiday_calendar_id','calendar_date','day_status','source_row_id','source_page','source_text','source_fingerprint'),'writable',jsonb_build_array('holiday_calendar_id','calendar_date','day_status','reason','source_row_id','source_page','source_text','source_fingerprint'),'generic',true)
when 'daycare_calendar_assignments' then jsonb_build_object('table','daycare_calendar_assignments','id','daycare_calendar_assignment_id','stable',jsonb_build_array('daycare_id','school_year_id','effective_from','version'),'required',jsonb_build_array('daycare_id','holiday_calendar_id','school_year_id','effective_from','effective_to','version','source_lineage'),'writable',jsonb_build_array('daycare_id','holiday_calendar_id','school_year_id','effective_from','effective_to','version','source_lineage','approval_evidence','lifecycle_status'),'generic',true)
when 'daycare_operating_hours' then jsonb_build_object('table','daycare_operating_hours','id','operating_hours_id','stable',jsonb_build_array('daycare_id','weekday','effective_from','version'),'required',jsonb_build_array('daycare_id','weekday','opens_at','closes_at','effective_from','effective_to','version','source_lineage'),'writable',jsonb_build_array('daycare_id','weekday','opens_at','closes_at','is_short_day','effective_from','effective_to','version','source_lineage','lifecycle_status'),'generic',true)
when 'daycare_calendar_exceptions' then jsonb_build_object('table','daycare_calendar_exceptions','id','calendar_exception_id','stable',jsonb_build_array('daycare_id','exception_date','version'),'required',jsonb_build_array('daycare_id','exception_date','day_status','reason','source_lineage','version'),'writable',jsonb_build_array('daycare_id','exception_date','day_status','operating_minutes','reason','source_lineage','approval_evidence','version','lifecycle_status'),'generic',true)
when 'daycare_monthly_operating_results' then jsonb_build_object('table','daycare_monthly_operating_results','id','monthly_operating_result_id','stable',jsonb_build_array('daycare_id','school_year_month_id','holiday_calendar_id','calendar_version'),'required',jsonb_build_array('daycare_id','school_year_month_id','holiday_calendar_id','calendar_version','operating_days','regular_minutes','short_day_minutes','calculation_rule_key','calculation_rule_version','source_lineage','calculation_status'),'writable',jsonb_build_array('daycare_id','school_year_month_id','holiday_calendar_id','calendar_version','operating_days','regular_minutes','short_day_minutes','calculation_rule_key','calculation_rule_version','source_lineage','calculation_status'),'generic',true)
else private.portal_mcp_entity_meta_base(p_entity) end
$$;

create or replace function private.portal_mcp_match_operational_row_v2(p_row jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare e text:=p_row->>'entity'; v jsonb:=p_row->'values'; found jsonb; matches integer:=0;
begin
 if e='operational_period_relationship_facts' then return p_row; end if;
 if e not in ('holiday_calendars','holiday_calendar_days','daycare_calendar_assignments','daycare_operating_hours','daycare_calendar_exceptions','daycare_monthly_operating_results') then
   return private.portal_mcp_match_operational_row(p_row);
 end if;
 if nullif(p_row->>'record_id','') is not null then return p_row; end if;
 if e='holiday_calendars' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.holiday_calendars t where t.calendar_code=v->>'calendar_code' and t.version=(v->>'version')::int;
 elsif e='holiday_calendar_days' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.holiday_calendar_days t where t.holiday_calendar_id=(v->>'holiday_calendar_id')::uuid and t.calendar_date=(v->>'calendar_date')::date;
 elsif e='daycare_calendar_assignments' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.daycare_calendar_assignments t where t.daycare_id=(v->>'daycare_id')::uuid and t.school_year_id=(v->>'school_year_id')::uuid and t.effective_from=(v->>'effective_from')::date and t.version=(v->>'version')::int;
 elsif e='daycare_operating_hours' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.daycare_operating_hours t where t.daycare_id=(v->>'daycare_id')::uuid and t.weekday=(v->>'weekday')::smallint and t.effective_from=(v->>'effective_from')::date and t.version=(v->>'version')::int;
 elsif e='daycare_calendar_exceptions' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.daycare_calendar_exceptions t where t.daycare_id=(v->>'daycare_id')::uuid and t.exception_date=(v->>'exception_date')::date and t.version=(v->>'version')::int;
 else select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.daycare_monthly_operating_results t where t.daycare_id=(v->>'daycare_id')::uuid and t.school_year_month_id=(v->>'school_year_month_id')::uuid and t.holiday_calendar_id=(v->>'holiday_calendar_id')::uuid and t.calendar_version=(v->>'calendar_version')::int;
 end if;
 if matches>1 then return p_row||jsonb_build_object('_match_conflict','AMBIGUOUS_STABLE_IDENTIFIERS'); end if;
 if matches=1 then return p_row||jsonb_build_object('record_id',found->>(private.portal_mcp_entity_meta(e)->>'id'),'expected_row_version',found->'row_version','_matched_record',found); end if;
 return p_row;
end $$;

create or replace function public.portal_mcp_operational_catalog()
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare e text; m jsonb; entities jsonb='[]'::jsonb;
begin
 if not private.portal_is_authorized(auth.uid(),'OPERATIONS.READ') then return null; end if;
 for e in select unnest(array['employees','employments','employee_assignments','employee_certificates','employee_pay_terms','employee_compensation_eligibility','employee_leave_periods','payroll_records','payroll_allocations','bank_allocations','suppliers','payment_requests','allocation_units','roles','compensation_factors','budget_categories','budget_rules','classrooms','monthly_enrollment','bank_accounts','bank_transactions','accounting_statuses','children','child_enrollments','daycare_billing_records','collection_receipts','holiday_calendars','holiday_calendar_days','daycare_calendar_assignments','daycare_operating_hours','daycare_calendar_exceptions','daycare_monthly_operating_results']) loop
  m:=private.portal_mcp_entity_meta(e); entities:=entities||jsonb_build_array(jsonb_build_object('entity',e,'id',m->>'id','stable_keys',coalesce(m->'stable','[]'::jsonb),'writable',coalesce(m->'writable',to_jsonb('specialized'::text)),'required_on_create',coalesce(m->'required','[]'::jsonb),'approval_required',true));
 end loop;
 return jsonb_build_object('entities',entities,'row_contract',jsonb_build_object('entity','catalog entity','record_id','UUID for corrections','expected_row_version','required for corrections','values','canonical field/value object'),'limits',jsonb_build_object('rows_per_batch',1000,'approval_minutes',10),'read_only_capabilities',jsonb_build_array('child_reconciliation','production_inventory_scan'),'unsupported',jsonb_build_array());
end $$;

revoke all on function private.portal_mcp_entity_meta(text), private.portal_mcp_match_operational_row_v2(jsonb) from public,anon,authenticated;
revoke all on function public.portal_mcp_operational_catalog() from public,anon;
grant execute on function public.portal_mcp_operational_catalog() to authenticated;
