create table public.budget_categories (
  budget_category_id uuid primary key default gen_random_uuid(),
  budget_category_code varchar(50) not null unique,
  display_name varchar(150) not null,
  category_type varchar(30) not null check (category_type in ('INCOME','PAYROLL','EXPENSE','OTHER')),
  lifecycle_status varchar(20) not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0)
);

create table public.budget_rules (
  budget_rule_id uuid primary key default gen_random_uuid(),
  budget_category_id uuid not null references public.budget_categories(budget_category_id),
  school_year_id uuid references public.school_years(school_year_id),
  calendar_year_id uuid references public.calendar_years(calendar_year_id),
  daycare_id uuid references public.daycares(daycare_id),
  allocation_unit_id uuid references public.allocation_units(allocation_unit_id),
  age_group_id uuid references public.age_groups(age_group_id),
  effective_from date not null,
  effective_to date,
  rule_type varchar(50) not null check (rule_type in ('TUITION_PER_CHILD','STAFFING_RATIO','WORKING_DAYS','FIXED_MONTHLY_AMOUNT','PER_CHILD_AMOUNT','PERCENTAGE_OVERHEAD','MANUAL_EXCEPTION')),
  numeric_value numeric(14,4),
  text_value text,
  lifecycle_status varchar(20) not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0),
  check (effective_to is null or effective_to >= effective_from),
  check (numeric_value is not null or text_value is not null)
);

create table public.calculation_runs (
  calculation_run_id uuid primary key default gen_random_uuid(),
  run_type varchar(50) not null check (run_type in ('BUDGET_PREVIEW','BUDGET_LOCK')),
  reporting_month date not null check (reporting_month = date_trunc('month', reporting_month)::date),
  status varchar(20) not null default 'STARTED' check (status in ('STARTED','SUCCEEDED','FAILED')),
  rule_version varchar(100),
  input_snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  initiated_by_user_id uuid,
  error_summary text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.budget_snapshots (
  budget_snapshot_id uuid primary key default gen_random_uuid(),
  calculation_run_id uuid not null references public.calculation_runs(calculation_run_id),
  daycare_id uuid references public.daycares(daycare_id),
  allocation_unit_id uuid references public.allocation_units(allocation_unit_id),
  reporting_month date not null check (reporting_month = date_trunc('month', reporting_month)::date),
  budget_category_id uuid not null references public.budget_categories(budget_category_id),
  planned_amount numeric(14,2) not null,
  actual_amount numeric(14,2) not null,
  snapshot_status varchar(20) not null default 'LOCKED' check (snapshot_status in ('LOCKED','SUPERSEDED')),
  locked_at timestamptz not null default timezone('utc', now()),
  locked_by_user_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  check (daycare_id is not null or allocation_unit_id is not null),
  unique (calculation_run_id, reporting_month, budget_category_id, daycare_id, allocation_unit_id)
);

alter table public.bank_allocations add constraint bank_allocations_budget_category_fkey foreign key (budget_category_id) references public.budget_categories(budget_category_id);
alter table public.payroll_allocations add constraint payroll_allocations_budget_category_fkey foreign key (budget_category_id) references public.budget_categories(budget_category_id);

create index idx_budget_rules_category on public.budget_rules(budget_category_id);
create index idx_budget_rules_scope_dates on public.budget_rules(effective_from, effective_to);
create index idx_budget_rules_daycare on public.budget_rules(daycare_id);
create index idx_budget_snapshots_month on public.budget_snapshots(reporting_month);
create index idx_budget_snapshots_category on public.budget_snapshots(budget_category_id);

create trigger trg_budget_categories_updated_at before update on public.budget_categories for each row execute function public.set_updated_at();
create trigger trg_budget_rules_updated_at before update on public.budget_rules for each row execute function public.set_updated_at();

alter table public.budget_categories enable row level security;
alter table public.budget_rules enable row level security;
alter table public.calculation_runs enable row level security;
alter table public.budget_snapshots enable row level security;

comment on table public.budget_rules is 'Effective-dated configurable rules. Rule type contracts are fixed by the approved blueprint and must not be invented.';
comment on table public.budget_snapshots is 'Immutable locked monthly budget snapshots. Current working calculations remain dynamic and are not stored here.';