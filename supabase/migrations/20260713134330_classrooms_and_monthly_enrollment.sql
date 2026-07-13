create table if not exists public.classrooms (
  classroom_id uuid primary key default gen_random_uuid(),
  daycare_school_year_id uuid not null references public.daycare_school_years(daycare_school_year_id) on delete restrict,
  classroom_code varchar(50) not null,
  display_name varchar(100) not null,
  is_mixed boolean not null default false,
  effective_from date not null,
  effective_to date null,
  lifecycle_status varchar(20) not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','INACTIVE')),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid null,
  row_version integer not null default 1 check (row_version > 0),
  constraint classrooms_effective_dates_check check (effective_to is null or effective_to >= effective_from),
  constraint classrooms_code_per_daycare_year_unique unique (daycare_school_year_id, classroom_code)
);

create index if not exists idx_classrooms_daycare_school_year on public.classrooms(daycare_school_year_id);
create index if not exists idx_classrooms_effective_range on public.classrooms(effective_from, effective_to);
create index if not exists idx_classrooms_status on public.classrooms(lifecycle_status);

comment on table public.classrooms is 'School-year-bound classroom configuration. A classroom may open or close during the year.';
comment on column public.classrooms.classroom_code is 'Stable code within the daycare-school-year scope.';

create table if not exists public.classroom_age_groups (
  classroom_age_group_id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(classroom_id) on delete restrict,
  age_group_id uuid not null references public.age_groups(age_group_id) on delete restrict,
  effective_from date not null,
  effective_to date null,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid null,
  row_version integer not null default 1 check (row_version > 0),
  constraint classroom_age_groups_effective_dates_check check (effective_to is null or effective_to >= effective_from),
  constraint classroom_age_groups_unique unique (classroom_id, age_group_id, effective_from)
);

create index if not exists idx_classroom_age_groups_classroom on public.classroom_age_groups(classroom_id);
create index if not exists idx_classroom_age_groups_age_group on public.classroom_age_groups(age_group_id);

comment on table public.classroom_age_groups is 'Allowed age-group composition for a classroom over effective periods.';

create table if not exists public.monthly_enrollment (
  monthly_enrollment_id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(classroom_id) on delete restrict,
  reporting_month date not null,
  age_group_id uuid not null references public.age_groups(age_group_id) on delete restrict,
  children_count integer not null check (children_count >= 0),
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid null,
  row_version integer not null default 1 check (row_version > 0),
  constraint monthly_enrollment_month_start_check check (reporting_month = date_trunc('month', reporting_month)::date),
  constraint monthly_enrollment_unique unique (classroom_id, reporting_month, age_group_id)
);

create index if not exists idx_monthly_enrollment_month on public.monthly_enrollment(reporting_month);
create index if not exists idx_monthly_enrollment_classroom_month on public.monthly_enrollment(classroom_id, reporting_month);
create index if not exists idx_monthly_enrollment_age_group on public.monthly_enrollment(age_group_id);

comment on table public.monthly_enrollment is 'Authoritative monthly child quantity for budget and staffing by classroom and age group.';
comment on column public.monthly_enrollment.reporting_month is 'First day of month.';

create trigger trg_classrooms_set_updated_at
before update on public.classrooms
for each row execute function public.set_updated_at();

create trigger trg_classroom_age_groups_set_updated_at
before update on public.classroom_age_groups
for each row execute function public.set_updated_at();

create trigger trg_monthly_enrollment_set_updated_at
before update on public.monthly_enrollment
for each row execute function public.set_updated_at();

alter table public.classrooms enable row level security;
alter table public.classroom_age_groups enable row level security;
alter table public.monthly_enrollment enable row level security;