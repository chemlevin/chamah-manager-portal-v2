-- Google Sheets v2 delta only. This migration is additive and does not import data.

alter table public.school_years
  add column if not exists sheet_school_year_id varchar(50) unique,
  add column if not exists is_default boolean not null default false;

create unique index if not exists school_years_one_default_uq
  on public.school_years (is_default) where is_default;

create table if not exists public.school_year_months (
  school_year_month_id uuid primary key default gen_random_uuid(),
  sheet_month_id varchar(50) not null unique,
  school_year_id uuid not null references public.school_years(school_year_id) on delete restrict,
  month_label varchar(7) not null,
  start_date date not null,
  end_date date not null,
  school_year_sequence smallint not null check (school_year_sequence between 1 and 12),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  row_version integer not null default 1 check (row_version > 0),
  constraint school_year_months_dates_chk check (end_date >= start_date),
  constraint school_year_months_year_sequence_uq unique (school_year_id, school_year_sequence),
  constraint school_year_months_year_label_uq unique (school_year_id, month_label)
);

create index if not exists school_year_months_dates_idx on public.school_year_months(start_date, end_date);
create trigger school_year_months_set_updated_at_and_version before update on public.school_year_months
  for each row execute function public.set_updated_at_and_version();
alter table public.school_year_months enable row level security;

create table if not exists public.monthly_work_calendars (
  monthly_work_calendar_id uuid primary key default gen_random_uuid(),
  sheet_work_calendar_id varchar(80) not null unique,
  school_year_month_id uuid not null unique references public.school_year_months(school_year_month_id) on delete restrict,
  sun_thu_hours_per_day numeric(6,2) not null check (sun_thu_hours_per_day >= 0),
  friday_hours_per_day numeric(6,2) not null check (friday_hours_per_day >= 0),
  sun_thu_workdays smallint not null check (sun_thu_workdays >= 0),
  friday_workdays smallint not null check (friday_workdays >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  row_version integer not null default 1 check (row_version > 0)
);

create trigger monthly_work_calendars_set_updated_at_and_version before update on public.monthly_work_calendars
  for each row execute function public.set_updated_at_and_version();
alter table public.monthly_work_calendars enable row level security;

alter table public.allocation_units
  add column if not exists sheet_unit_id varchar(50) unique,
  add column if not exists notes text;

alter table public.daycares
  add column if not exists sheet_daycare_id varchar(50) unique,
  add column if not exists framework_type varchar(30),
  add column if not exists official_name varchar(200),
  add column if not exists institution_code varchar(100),
  add column if not exists city varchar(100),
  add column if not exists notes text;

alter table public.classrooms
  add column if not exists sheet_classroom_id varchar(160) unique,
  add column if not exists licensed_capacity integer check (licensed_capacity is null or licensed_capacity >= 0),
  add column if not exists notes text;

create table if not exists public.classroom_capacity_breakdowns (
  classroom_capacity_breakdown_id uuid primary key default gen_random_uuid(),
  sheet_capacity_breakdown_id varchar(220) not null unique,
  classroom_id uuid not null references public.classrooms(classroom_id) on delete restrict,
  age_group_id uuid not null references public.age_groups(age_group_id) on delete restrict,
  licensed_capacity integer not null check (licensed_capacity >= 0),
  effective_from_month_id uuid not null references public.school_year_months(school_year_month_id) on delete restrict,
  effective_to_month_id uuid references public.school_year_months(school_year_month_id) on delete restrict,
  lifecycle_status varchar(20) not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','INACTIVE')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  row_version integer not null default 1 check (row_version > 0),
  constraint classroom_capacity_breakdowns_scope_uq unique (classroom_id, age_group_id, effective_from_month_id)
);

create index if not exists classroom_capacity_breakdowns_classroom_idx on public.classroom_capacity_breakdowns(classroom_id);
create trigger classroom_capacity_breakdowns_set_updated_at_and_version before update on public.classroom_capacity_breakdowns
  for each row execute function public.set_updated_at_and_version();
alter table public.classroom_capacity_breakdowns enable row level security;

alter table public.bank_accounts
  add column if not exists sheet_bank_account_id varchar(50) unique,
  add column if not exists source_account_number varchar(100),
  add column if not exists notes text;

alter table public.budget_categories
  add column if not exists sheet_budget_category_id varchar(80) unique,
  add column if not exists requires_budget boolean not null default false,
  add column if not exists budget_source varchar(50),
  add column if not exists parent_budget_category_id uuid references public.budget_categories(budget_category_id) on delete restrict,
  add column if not exists notes text;

alter table public.budget_rules
  add column if not exists sheet_rule_id varchar(180) unique,
  add column if not exists calculation_method varchar(80),
  add column if not exists parameter_1 text,
  add column if not exists parameter_2 text,
  add column if not exists show_budget boolean not null default true,
  add column if not exists display_scope varchar(50),
  add column if not exists effective_from_month_id uuid references public.school_year_months(school_year_month_id) on delete restrict,
  add column if not exists effective_to_month_id uuid references public.school_year_months(school_year_month_id) on delete restrict;

alter table public.daycare_school_years
  add column if not exists sheet_daycare_year_setting_id varchar(80) unique,
  add column if not exists tuition_calculation_mode varchar(30),
  add column if not exists tuition_standard_type varchar(30),
  add column if not exists staffing_calculation_mode varchar(30),
  add column if not exists staffing_standard_type varchar(30);

create table if not exists public.staffing_budget_parameters (
  staffing_budget_parameter_id uuid primary key default gen_random_uuid(),
  sheet_staffing_budget_parameter_id varchar(80) not null unique,
  school_year_id uuid not null references public.school_years(school_year_id) on delete restrict,
  monthly_hours_per_fte numeric(8,2) not null check (monthly_hours_per_fte > 0),
  effective_from_month_id uuid not null references public.school_year_months(school_year_month_id) on delete restrict,
  effective_to_month_id uuid references public.school_year_months(school_year_month_id) on delete restrict,
  lifecycle_status varchar(20) not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','INACTIVE')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  row_version integer not null default 1 check (row_version > 0)
);

create index if not exists staffing_budget_parameters_year_idx on public.staffing_budget_parameters(school_year_id);
create trigger staffing_budget_parameters_set_updated_at_and_version before update on public.staffing_budget_parameters
  for each row execute function public.set_updated_at_and_version();
alter table public.staffing_budget_parameters enable row level security;

alter table public.roles
  add column if not exists sheet_role_id varchar(80) unique,
  add column if not exists notes text;

alter table public.employees
  add column if not exists sheet_employee_id varchar(100) unique,
  add column if not exists hebrew_birth_date varchar(50),
  add column if not exists manager_employee_id uuid references public.employees(employee_id) on delete set null;

create index if not exists employees_manager_idx on public.employees(manager_employee_id);

create table if not exists public.employee_pay_terms (
  employee_pay_term_id uuid primary key default gen_random_uuid(),
  sheet_pay_term_id varchar(120) not null unique,
  employee_id uuid not null references public.employees(employee_id) on delete restrict,
  valid_from date not null,
  valid_to date,
  pay_type varchar(30) not null,
  base_pay numeric(12,2) not null check (base_pay >= 0),
  estimated_employment_percentage numeric(6,2) check (estimated_employment_percentage is null or estimated_employment_percentage between 0 and 100),
  caregiver_certificate_status varchar(30),
  studies_end_date date,
  has_degree boolean,
  is_class_manager boolean,
  excellence_eligible boolean,
  first_aid_valid_until date,
  safe_conduct_valid_until date,
  weekly_schedule jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  row_version integer not null default 1 check (row_version > 0),
  constraint employee_pay_terms_dates_chk check (valid_to is null or valid_to >= valid_from),
  constraint employee_pay_terms_employee_from_uq unique (employee_id, valid_from)
);

create index if not exists employee_pay_terms_employee_dates_idx on public.employee_pay_terms(employee_id, valid_from, valid_to);
create trigger employee_pay_terms_set_updated_at_and_version before update on public.employee_pay_terms
  for each row execute function public.set_updated_at_and_version();
alter table public.employee_pay_terms enable row level security;

alter table public.compensation_rules
  add column if not exists sheet_pay_addition_rule_id varchar(100) unique,
  add column if not exists eligibility_condition text,
  add column if not exists proration_method varchar(40),
  add column if not exists notes text;

alter table public.payroll_records
  add column if not exists hours_125 numeric(10,2) check (hours_125 is null or hours_125 >= 0),
  add column if not exists hours_150 numeric(10,2) check (hours_150 is null or hours_150 >= 0),
  add column if not exists vacation_hours numeric(10,2) check (vacation_hours is null or vacation_hours >= 0),
  add column if not exists sick_hours numeric(10,2) check (sick_hours is null or sick_hours >= 0),
  add column if not exists other_absence_hours numeric(10,2) check (other_absence_hours is null or other_absence_hours >= 0),
  add column if not exists notes text;

create table if not exists public.accounting_statuses (
  accounting_status_id uuid primary key default gen_random_uuid(),
  sheet_accounting_status_id varchar(80) not null unique,
  display_name varchar(150) not null,
  display_order integer not null default 0 check (display_order >= 0),
  is_final boolean not null default false,
  lifecycle_status varchar(20) not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','INACTIVE')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  row_version integer not null default 1 check (row_version > 0)
);

create trigger accounting_statuses_set_updated_at_and_version before update on public.accounting_statuses
  for each row execute function public.set_updated_at_and_version();
alter table public.accounting_statuses enable row level security;

alter table public.bank_transactions
  add column if not exists sheet_transaction_id varchar(100) unique,
  add column if not exists movement_type varchar(50);

alter table public.bank_allocations
  add column if not exists sheet_allocation_id varchar(140) unique,
  add column if not exists accounting_status_id uuid references public.accounting_statuses(accounting_status_id) on delete restrict,
  add column if not exists document_url text;

create index if not exists bank_allocations_accounting_status_id_idx on public.bank_allocations(accounting_status_id);

comment on table public.school_year_months is 'STORED mapping for Google Sheets v2 MONTHS.';
comment on table public.monthly_work_calendars is 'Stores editable workday inputs; monthly totals are DERIVED.';
comment on table public.employee_pay_terms is 'Effective-dated pay terms from Google Sheets v2 EMPLOYEE_PAY_TERMS.';
comment on column public.bank_transactions.sheet_transaction_id is 'SYNC_METADATA from BANK_TRANSACTIONS.transaction_id.';
comment on column public.bank_allocations.sheet_allocation_id is 'SYNC_METADATA for a Sheets allocation row; parent transaction remains the database relationship.';
