-- TRACK020 - Supabase-only Employees and Actual Payroll workbenches.
-- Forward-only: preserve imported history and existing calculation contracts.

alter table public.employee_pay_terms
  alter column sheet_pay_term_id drop not null;

alter table public.payroll_records
  alter column employment_id drop not null;

alter table public.payroll_records
  add column if not exists employee_match_status varchar(24) not null default 'LINKED'
    check (employee_match_status in ('LINKED','MISSING','APPROVED_TEMPORARY','UNRESOLVED')),
  add column if not exists temporary_approved_by_user_id uuid references auth.users(id),
  add column if not exists temporary_approved_at timestamptz,
  add column if not exists temporary_approval_notes text,
  add column if not exists record_origin varchar(20) not null default 'IMPORT'
    check (record_origin in ('IMPORT','MANUAL'));

alter table public.payroll_records
  add constraint payroll_records_match_consistency_chk check (
    (employee_match_status = 'LINKED' and employment_id is not null
      and temporary_approved_by_user_id is null and temporary_approved_at is null)
    or
    (employee_match_status = 'APPROVED_TEMPORARY' and employment_id is null
      and temporary_approved_by_user_id is not null and temporary_approved_at is not null)
    or
    (employee_match_status in ('MISSING','UNRESOLVED') and employment_id is null
      and temporary_approved_by_user_id is null and temporary_approved_at is null)
  );

alter table public.payroll_allocations
  add column if not exists daycare_id uuid references public.daycares(daycare_id) on delete restrict;

create index if not exists payroll_records_employee_match_status_idx
  on public.payroll_records(employee_match_status, payroll_month);
create index if not exists payroll_records_source_employee_identifier_idx
  on public.payroll_records(source_employee_identifier);
create index if not exists payroll_allocations_daycare_idx
  on public.payroll_allocations(daycare_id);

create table if not exists public.employee_leave_periods (
  employee_leave_period_id uuid primary key default gen_random_uuid(),
  employment_id uuid not null references public.employments(employment_id) on delete restrict,
  leave_type varchar(30) not null
    check (leave_type in ('MATERNITY','SICK_OR_ACCIDENT','UNPAID','OTHER')),
  starts_on date not null,
  ends_on date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references auth.users(id),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid references auth.users(id),
  row_version integer not null default 1 check (row_version > 0),
  check (ends_on is null or ends_on >= starts_on)
);

create index if not exists employee_leave_periods_employment_idx
  on public.employee_leave_periods(employment_id, starts_on desc);

drop trigger if exists employee_leave_periods_set_updated_at on public.employee_leave_periods;
create trigger employee_leave_periods_set_updated_at
before update on public.employee_leave_periods
for each row execute function public.set_updated_at();

alter table public.employee_leave_periods enable row level security;
revoke all on public.employee_leave_periods from anon, authenticated;
grant all on public.employee_leave_periods to service_role;

insert into public.portal_sections (
  screen_code, parent_screen_code, route, display_name, icon, description,
  display_order, is_active, is_navigation_item, is_scope_required
) values
  ('dashboards.staffing.employees', 'dashboards.staffing',
   'dashboards/unit/organization/staffing/employees', 'עובדים', '👥',
   'סביבת עבודה לניהול עובדים, תנאי שכר, זכאויות ורישוי.', 25, true, false, true),
  ('dashboards.staffing.actual-payroll', 'dashboards.staffing',
   'dashboards/unit/organization/staffing/actual-payroll', 'ביצוע שכר', '₪',
   'סביבת עבודה לקליטה, התאמה והקצאה של ביצוע השכר בפועל.', 26, true, false, true)
on conflict (screen_code) do update set
  parent_screen_code = excluded.parent_screen_code,
  route = excluded.route,
  display_name = excluded.display_name,
  icon = excluded.icon,
  description = excluded.description,
  display_order = excluded.display_order,
  is_active = excluded.is_active,
  is_scope_required = excluded.is_scope_required,
  updated_at = timezone('utc', now());

create or replace function public.portal_save_payroll_allocations(
  target_payroll_record_id uuid,
  allocation_rows jsonb,
  actor_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  source_record public.payroll_records;
  saved_rows jsonb;
begin
  if actor_id is null or jsonb_typeof(allocation_rows) <> 'array' then
    raise exception 'Payroll allocation request is invalid';
  end if;

  select * into source_record
  from public.payroll_records
  where payroll_record_id = target_payroll_record_id
  for update;
  if not found then raise exception 'Payroll record not found'; end if;

  if exists (
    select 1 from jsonb_array_elements(allocation_rows) row_value
    where nullif(row_value->>'allocation_unit_id', '') is null
       or nullif(row_value->>'role_id', '') is null
       or nullif(row_value->>'allocation_amount', '') is null
       or (row_value->>'allocation_amount')::numeric < 0
       or (nullif(row_value->>'allocated_hours', '') is not null
           and (row_value->>'allocated_hours')::numeric < 0)
  ) then
    raise exception 'Payroll allocation rows failed validation';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(allocation_rows) row_value
    join public.daycares d on d.daycare_id = nullif(row_value->>'daycare_id', '')::uuid
    where nullif(row_value->>'daycare_id', '') is not null
      and d.allocation_unit_id <> (row_value->>'allocation_unit_id')::uuid
  ) then
    raise exception 'Daycare does not belong to the selected department';
  end if;

  delete from public.payroll_allocations
  where payroll_record_id = target_payroll_record_id;

  with inserted as (
    insert into public.payroll_allocations (
      payroll_record_id, allocation_unit_id, daycare_id, role_id,
      allocation_amount, allocation_percent, allocated_hours,
      effective_note, allocation_status, created_by_user_id, updated_by_user_id
    )
    select target_payroll_record_id,
      (row_value->>'allocation_unit_id')::uuid,
      nullif(row_value->>'daycare_id', '')::uuid,
      (row_value->>'role_id')::uuid,
      (row_value->>'allocation_amount')::numeric,
      case when source_record.employer_cost = 0 then null
        else round((row_value->>'allocation_amount')::numeric
          / source_record.employer_cost * 100, 4) end,
      nullif(row_value->>'allocated_hours', '')::numeric,
      nullif(btrim(row_value->>'effective_note'), ''),
      coalesce(nullif(row_value->>'allocation_status', ''), 'DRAFT'),
      actor_id, actor_id
    from jsonb_array_elements(allocation_rows) row_value
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(inserted)), '[]'::jsonb)
  into saved_rows from inserted;

  insert into public.audit_events (
    entity_type, entity_id, operation, new_values, source_type, actor_user_id
  ) values (
    'payroll_records', target_payroll_record_id, 'MANUAL_CORRECTION',
    jsonb_build_object('allocations', saved_rows), 'PORTAL_ADMIN', actor_id
  );

  return jsonb_build_object('allocations', saved_rows);
end;
$$;

revoke all on function public.portal_save_payroll_allocations(uuid, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.portal_save_payroll_allocations(uuid, jsonb, uuid)
  to service_role;

comment on table public.employee_leave_periods is
  'TRACK020 effective employee leave history. Documents remain a UI placeholder until a storage contract is approved.';
comment on function public.portal_save_payroll_allocations(uuid, jsonb, uuid) is
  'TRACK020 atomically replaces payroll cost and hours allocations without changing payroll calculations.';
