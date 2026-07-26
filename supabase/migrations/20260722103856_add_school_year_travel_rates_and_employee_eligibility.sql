alter table public.employee_pay_terms
  add column if not exists travel_eligible boolean;

comment on column public.employee_pay_terms.travel_eligible is
  'Whether the employee is eligible for travel reimbursement under the travel rate configured for the applicable school year.';

create table if not exists public.travel_rates (
  travel_rate_id uuid primary key default gen_random_uuid(),
  sheet_travel_rate_id character varying not null unique,
  school_year_id uuid not null references public.school_years(school_year_id),
  daily_travel_amount numeric not null check (daily_travel_amount >= 0),
  maximum_monthly_travel_amount numeric not null check (maximum_monthly_travel_amount >= 0),
  lifecycle_status character varying not null default 'ACTIVE'
    check (lifecycle_status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  row_version integer not null default 1 check (row_version > 0),
  constraint travel_rates_one_row_per_school_year unique (school_year_id)
);

comment on table public.travel_rates is
  'Travel reimbursement rates by school year. Payment equals the lower of actual workdays multiplied by the daily rate and the maximum monthly amount. Mid-school-year rate changes are intentionally not supported.';
comment on column public.travel_rates.daily_travel_amount is
  'Travel reimbursement amount per actual workday.';
comment on column public.travel_rates.maximum_monthly_travel_amount is
  'Maximum travel reimbursement payable for the month after the daily calculation.';

alter table public.travel_rates enable row level security;

drop policy if exists portal_authorized_read on public.travel_rates;
create policy portal_authorized_read
  on public.travel_rates
  for select
  to authenticated
  using ((select private.can_read_portal()));

grant all on table public.travel_rates to anon, authenticated, service_role;

alter table public.compensation_factors
  drop constraint if exists compensation_factors_value_type_check;

alter table public.compensation_factors
  add constraint compensation_factors_value_type_check
  check (value_type in ('HOURLY', 'GLOBAL_MONTHLY', 'ONE_TIME', 'DAILY_CAPPED_MONTHLY'));

update public.compensation_factors
set compensation_factor_code = 'TRAVEL-DAILY-CAPPED-MONTHLY',
    display_name = 'נסיעות – יומי עד סכום חודשי מרבי',
    value_type = 'DAILY_CAPPED_MONTHLY',
    updated_at = timezone('utc', now()),
    row_version = row_version + 1
where compensation_factor_code = 'TRAVEL-GLOBAL_MONTHLY';

update public.compensation_rules
set amount = 0,
    eligibility_condition = 'TRAVEL_ELIGIBLE=TRUE',
    proration_method = 'ACTUAL_WORKDAYS',
    notes = 'הזכאות נקבעת בתנאי העובדת; התעריפים נמשכים מ-TRAVEL_RATES. החישוב הוא הנמוך מבין ימי עבודה בפועל כפול תעריף יומי לבין הסכום החודשי המרבי.',
    updated_at = timezone('utc', now()),
    row_version = row_version + 1
where sheet_pay_addition_rule_id = 'PAR-TRAVEL';

insert into public.travel_rates (
  sheet_travel_rate_id,
  school_year_id,
  daily_travel_amount,
  maximum_monthly_travel_amount,
  lifecycle_status,
  notes
)
select
  'TRAVEL-2026-2027',
  sy.school_year_id,
  16,
  69.5,
  'ACTIVE',
  'משלמים את הנמוך מבין ימי העבודה בפועל כפול התעריף היומי לבין הסכום החודשי המרבי.'
from public.school_years sy
where sy.sheet_school_year_id = 'SY-2026-2027'
on conflict (school_year_id) do update
set sheet_travel_rate_id = excluded.sheet_travel_rate_id,
    daily_travel_amount = excluded.daily_travel_amount,
    maximum_monthly_travel_amount = excluded.maximum_monthly_travel_amount,
    lifecycle_status = excluded.lifecycle_status,
    notes = excluded.notes,
    updated_at = timezone('utc', now()),
    row_version = public.travel_rates.row_version + 1;
