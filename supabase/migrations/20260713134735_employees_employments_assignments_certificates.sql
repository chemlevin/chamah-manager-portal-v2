create table if not exists public.roles (
  role_id uuid primary key default gen_random_uuid(),
  role_code varchar(50) not null unique,
  display_name varchar(150) not null,
  role_group varchar(50),
  daycare_relevant boolean not null default true,
  lifecycle_status varchar(20) not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0)
);

create table if not exists public.certificate_types (
  certificate_type_id uuid primary key default gen_random_uuid(),
  certificate_type_code varchar(50) not null unique,
  display_name varchar(150) not null,
  requires_expiry boolean not null default false,
  lifecycle_status varchar(20) not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0)
);

create table if not exists public.employees (
  employee_id uuid primary key default gen_random_uuid(),
  employee_code varchar(50) not null unique,
  national_id varchar(30) unique,
  first_name varchar(100) not null,
  last_name varchar(100) not null,
  phone varchar(30),
  email varchar(254),
  birth_date date,
  lifecycle_status varchar(20) not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0)
);

create table if not exists public.employments (
  employment_id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(employee_id),
  legal_entity_id uuid not null references public.legal_entities(legal_entity_id),
  employment_start_date date not null,
  employment_end_date date,
  recognized_prior_seniority_months integer not null default 0 check (recognized_prior_seniority_months >= 0),
  employment_status varchar(20) not null default 'ACTIVE' check (employment_status in ('ACTIVE','ENDED','SUSPENDED')),
  employment_type_code varchar(30),
  default_monthly_hours numeric(8,2) check (default_monthly_hours is null or default_monthly_hours >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0),
  check (employment_end_date is null or employment_end_date >= employment_start_date)
);

create index if not exists idx_employments_employee on public.employments(employee_id);
create index if not exists idx_employments_legal_entity on public.employments(legal_entity_id);
create index if not exists idx_employments_status on public.employments(employment_status);

create table if not exists public.employee_assignments (
  assignment_id uuid primary key default gen_random_uuid(),
  employment_id uuid not null references public.employments(employment_id),
  allocation_unit_id uuid not null references public.allocation_units(allocation_unit_id),
  daycare_id uuid references public.daycares(daycare_id),
  classroom_id uuid references public.classrooms(classroom_id),
  role_id uuid not null references public.roles(role_id),
  effective_from date not null,
  effective_to date,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0),
  check (effective_to is null or effective_to >= effective_from)
);

create index if not exists idx_employee_assignments_employment on public.employee_assignments(employment_id);
create index if not exists idx_employee_assignments_allocation_unit on public.employee_assignments(allocation_unit_id);
create index if not exists idx_employee_assignments_daycare on public.employee_assignments(daycare_id);
create index if not exists idx_employee_assignments_role on public.employee_assignments(role_id);
create index if not exists idx_employee_assignments_effective on public.employee_assignments(effective_from, effective_to);

create unique index if not exists ux_employee_primary_assignment_open
  on public.employee_assignments(employment_id)
  where is_primary = true and effective_to is null;

create table if not exists public.employee_certificates (
  employee_certificate_id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(employee_id),
  certificate_type_id uuid not null references public.certificate_types(certificate_type_id),
  issued_on date,
  expires_on date,
  status varchar(20) not null default 'REVIEW' check (status in ('VALID','EXPIRED','MISSING','REVIEW')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0),
  check (expires_on is null or issued_on is null or expires_on >= issued_on)
);

create index if not exists idx_employee_certificates_employee on public.employee_certificates(employee_id);
create index if not exists idx_employee_certificates_type on public.employee_certificates(certificate_type_id);
create index if not exists idx_employee_certificates_expiry on public.employee_certificates(expires_on);

create trigger roles_set_updated_at before update on public.roles for each row execute function public.set_updated_at();
create trigger certificate_types_set_updated_at before update on public.certificate_types for each row execute function public.set_updated_at();
create trigger employees_set_updated_at before update on public.employees for each row execute function public.set_updated_at();
create trigger employments_set_updated_at before update on public.employments for each row execute function public.set_updated_at();
create trigger employee_assignments_set_updated_at before update on public.employee_assignments for each row execute function public.set_updated_at();
create trigger employee_certificates_set_updated_at before update on public.employee_certificates for each row execute function public.set_updated_at();

alter table public.roles enable row level security;
alter table public.certificate_types enable row level security;
alter table public.employees enable row level security;
alter table public.employments enable row level security;
alter table public.employee_assignments enable row level security;
alter table public.employee_certificates enable row level security;

comment on table public.roles is 'Editable master list of employee roles.';
comment on table public.certificate_types is 'Editable master list of employee certificate and training types.';
comment on table public.employees is 'Stable employee identity independent of employment periods.';
comment on table public.employments is 'Employment relationship periods with explicit recognized prior seniority.';
comment on table public.employee_assignments is 'Effective-dated role and organizational assignment history.';
comment on table public.employee_certificates is 'Employee certificates and training records with expiry tracking.';