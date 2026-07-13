create table public.compensation_factors (
  compensation_factor_id uuid primary key default gen_random_uuid(),
  compensation_factor_code varchar(50) not null unique,
  display_name varchar(150) not null,
  value_type varchar(30) not null check (value_type in ('HOURLY','GLOBAL_MONTHLY','ONE_TIME')),
  lifecycle_status varchar(20) not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0)
);

create table public.compensation_rules (
  compensation_rule_id uuid primary key default gen_random_uuid(),
  compensation_factor_id uuid not null references public.compensation_factors(compensation_factor_id),
  school_year_id uuid references public.school_years(school_year_id),
  effective_from date not null,
  effective_to date,
  minimum_seniority_months integer not null default 0 check (minimum_seniority_months >= 0),
  maximum_seniority_months integer check (maximum_seniority_months is null or maximum_seniority_months >= minimum_seniority_months),
  amount numeric(14,4) not null check (amount >= 0),
  applies_to_paid_leave_hours boolean not null default false,
  lifecycle_status varchar(20) not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0),
  check (effective_to is null or effective_to >= effective_from)
);

create table public.employee_compensation_eligibility (
  employee_compensation_eligibility_id uuid primary key default gen_random_uuid(),
  employment_id uuid not null references public.employments(employment_id),
  compensation_factor_id uuid not null references public.compensation_factors(compensation_factor_id),
  effective_from date not null,
  effective_to date,
  eligibility_status varchar(20) not null default 'ELIGIBLE' check (eligibility_status in ('ELIGIBLE','NOT_ELIGIBLE','SUSPENDED')),
  manual_override boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0),
  check (effective_to is null or effective_to >= effective_from)
);

create index idx_compensation_rules_factor_dates on public.compensation_rules(compensation_factor_id, effective_from, effective_to);
create index idx_employee_compensation_employment on public.employee_compensation_eligibility(employment_id);

create trigger trg_compensation_factors_updated_at before update on public.compensation_factors for each row execute function public.set_updated_at();
create trigger trg_compensation_rules_updated_at before update on public.compensation_rules for each row execute function public.set_updated_at();
create trigger trg_employee_compensation_updated_at before update on public.employee_compensation_eligibility for each row execute function public.set_updated_at();

alter table public.compensation_factors enable row level security;
alter table public.compensation_rules enable row level security;
alter table public.employee_compensation_eligibility enable row level security;

comment on table public.compensation_rules is 'Effective compensation rules for management review and calculators; official employer cost remains sourced from payroll.';