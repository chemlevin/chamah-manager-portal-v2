-- TRACK020A: payroll month lifecycle and preparation fields.

create table public.payroll_months (
  payroll_month_id uuid primary key default gen_random_uuid(),
  payroll_month date not null unique,
  month_status varchar(12) not null default 'CURRENT'
    check (month_status in ('CURRENT', 'CLOSED')),
  opening_method varchar(24) not null
    check (opening_method in ('PREVIOUS_MONTH', 'ACTIVE_EMPLOYEES', 'EMPTY', 'IMPORT')),
  opened_by_user_id uuid references auth.users(id),
  opened_at timestamptz not null default timezone('utc', now()),
  closed_by_user_id uuid references auth.users(id),
  closed_at timestamptz,
  reopened_by_user_id uuid references auth.users(id),
  reopened_at timestamptz,
  close_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  row_version integer not null default 1 check (row_version > 0),
  check (payroll_month = date_trunc('month', payroll_month)::date),
  check (
    (month_status = 'CURRENT' and closed_by_user_id is null and closed_at is null)
    or
    (month_status = 'CLOSED' and closed_by_user_id is not null and closed_at is not null)
  )
);

create trigger payroll_months_set_updated_at before update on public.payroll_months
for each row execute function public.set_updated_at();
alter table public.payroll_months enable row level security;
revoke all on table public.payroll_months from public, anon, authenticated;
grant select, insert, update, delete on table public.payroll_months to service_role;

alter table public.payroll_records
  alter column employer_cost drop not null,
  alter column import_batch_id drop not null,
  add column allocation_unit_id uuid references public.allocation_units(allocation_unit_id),
  add column daycare_id uuid references public.daycares(daycare_id),
  add column role_id uuid references public.roles(role_id),
  add column employee_pay_term_id uuid references public.employee_pay_terms(employee_pay_term_id),
  add column work_days numeric(8,2) check (work_days is null or work_days >= 0),
  add column unpaid_absence_hours numeric(10,2) check (unpaid_absence_hours is null or unpaid_absence_hours >= 0),
  add column travel_reimbursement numeric(14,2),
  add column bonus_amount numeric(14,2),
  add column adjustment_amount numeric(14,2);

create index payroll_records_employee_month_lookup_idx
  on public.payroll_records(payroll_month, source_employee_identifier)
  where source_employee_identifier is not null;
create index payroll_records_base_assignment_idx
  on public.payroll_records(allocation_unit_id, daycare_id, role_id);
create index payroll_records_pay_term_idx on public.payroll_records(employee_pay_term_id);

insert into public.payroll_months (payroll_month, month_status, opening_method, opened_at)
select distinct payroll_month, 'CURRENT', 'IMPORT',
  min(created_at) over (partition by payroll_month)
from public.payroll_records
on conflict (payroll_month) do nothing;

update public.payroll_records record
set allocation_unit_id = assignment.allocation_unit_id,
    daycare_id = assignment.daycare_id,
    role_id = assignment.role_id,
    employee_pay_term_id = pay_term.employee_pay_term_id
from public.employments employment
left join lateral (
  select candidate.allocation_unit_id, candidate.daycare_id, candidate.role_id
  from public.employee_assignments candidate
  where candidate.employment_id = employment.employment_id
  order by candidate.is_primary desc, candidate.effective_from desc
  limit 1
) assignment on true
left join lateral (
  select candidate.employee_pay_term_id
  from public.employee_pay_terms candidate
  where candidate.employee_id = employment.employee_id
  order by candidate.valid_from desc
  limit 1
) pay_term on true
where record.employment_id = employment.employment_id
  and record.allocation_unit_id is null;

insert into public.portal_sections (
  screen_code, parent_screen_code, route, display_name, icon,
  display_order, is_active, is_navigation_item, is_scope_required
) values (
  'dashboards.staffing.actual-payroll.reopen',
  'dashboards.staffing.actual-payroll',
  'dashboards/unit/organization/staffing/actual-payroll/reopen',
  'פתיחת חודש שכר סגור', '↻', 30, true, false, false
)
on conflict (screen_code) do update set
  parent_screen_code = excluded.parent_screen_code,
  route = excluded.route,
  display_name = excluded.display_name,
  display_order = excluded.display_order,
  is_active = true;

comment on table public.payroll_months is
  'TRACK020A payroll preparation month lifecycle; payroll records remain one row per employee and month.';
