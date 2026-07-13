create table if not exists public.import_batches (
  import_batch_id uuid primary key default gen_random_uuid(),
  source_type varchar(40) not null,
  source_name varchar(200),
  source_file_name varchar(255),
  source_sheet_name varchar(200),
  triggered_by_user_id uuid,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  status varchar(20) not null default 'PENDING' check (status in ('PENDING','RUNNING','COMPLETED','COMPLETED_WITH_ERRORS','FAILED','CANCELLED')),
  total_rows integer not null default 0 check (total_rows >= 0),
  accepted_rows integer not null default 0 check (accepted_rows >= 0),
  warning_rows integer not null default 0 check (warning_rows >= 0),
  rejected_rows integer not null default 0 check (rejected_rows >= 0),
  error_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  row_version integer not null default 1 check (row_version > 0),
  check (completed_at is null or completed_at >= started_at),
  check (accepted_rows + warning_rows + rejected_rows <= total_rows)
);

comment on table public.import_batches is 'Traceable import/synchronization batch shared by payroll, banking, and future controlled imports.';

create index if not exists import_batches_source_type_started_at_idx
  on public.import_batches (source_type, started_at desc);
create index if not exists import_batches_status_idx
  on public.import_batches (status);

create table if not exists public.payroll_records (
  payroll_record_id uuid primary key default gen_random_uuid(),
  employment_id uuid not null references public.employments(employment_id) on delete restrict,
  payroll_month date not null,
  source_employee_identifier varchar(100),
  source_record_identifier varchar(150),
  gross_pay numeric(14,2),
  employer_cost numeric(14,2) not null,
  regular_hours numeric(10,2),
  overtime_hours numeric(10,2),
  source_payload jsonb not null default '{}'::jsonb,
  import_batch_id uuid not null references public.import_batches(import_batch_id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0),
  check (payroll_month = date_trunc('month', payroll_month)::date),
  check (regular_hours is null or regular_hours >= 0),
  check (overtime_hours is null or overtime_hours >= 0)
);

comment on table public.payroll_records is 'Immutable monthly payroll source records. Employer cost is the authoritative payroll cost for budget reporting.';

create unique index if not exists payroll_records_source_identity_uq
  on public.payroll_records (import_batch_id, source_record_identifier)
  where source_record_identifier is not null;
create index if not exists payroll_records_employment_month_idx
  on public.payroll_records (employment_id, payroll_month);
create index if not exists payroll_records_month_idx
  on public.payroll_records (payroll_month);
create index if not exists payroll_records_import_batch_idx
  on public.payroll_records (import_batch_id);

create table if not exists public.payroll_allocations (
  payroll_allocation_id uuid primary key default gen_random_uuid(),
  payroll_record_id uuid not null references public.payroll_records(payroll_record_id) on delete restrict,
  allocation_unit_id uuid not null references public.allocation_units(allocation_unit_id) on delete restrict,
  role_id uuid references public.roles(role_id) on delete restrict,
  budget_category_id uuid,
  allocation_amount numeric(14,2) not null,
  allocation_percent numeric(7,4),
  allocated_hours numeric(10,2),
  effective_note text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0),
  check (allocation_percent is null or (allocation_percent >= 0 and allocation_percent <= 100)),
  check (allocated_hours is null or allocated_hours >= 0)
);

comment on table public.payroll_allocations is 'Manual management allocations separated from immutable payroll source records.';

create index if not exists payroll_allocations_record_idx
  on public.payroll_allocations (payroll_record_id);
create index if not exists payroll_allocations_unit_idx
  on public.payroll_allocations (allocation_unit_id);
create index if not exists payroll_allocations_role_idx
  on public.payroll_allocations (role_id);

create trigger import_batches_set_updated_at
before update on public.import_batches
for each row execute function public.set_updated_at();

create trigger payroll_records_set_updated_at
before update on public.payroll_records
for each row execute function public.set_updated_at();

create trigger payroll_allocations_set_updated_at
before update on public.payroll_allocations
for each row execute function public.set_updated_at();

alter table public.import_batches enable row level security;
alter table public.payroll_records enable row level security;
alter table public.payroll_allocations enable row level security;