create or replace function public.set_updated_at_and_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  new.row_version = old.row_version + 1;
  return new;
end;
$$;

comment on function public.set_updated_at_and_version() is 'Shared trigger function for optimistic concurrency and updated_at maintenance.';

drop trigger if exists school_years_set_updated_at on public.school_years;
create trigger school_years_set_updated_at_and_version
before update on public.school_years
for each row execute function public.set_updated_at_and_version();

drop trigger if exists calendar_years_set_updated_at on public.calendar_years;
create trigger calendar_years_set_updated_at_and_version
before update on public.calendar_years
for each row execute function public.set_updated_at_and_version();

create table public.legal_entity_types (
  legal_entity_type_id uuid primary key default gen_random_uuid(),
  legal_entity_type_code varchar(30) not null unique,
  display_name varchar(100) not null,
  lifecycle_status varchar(20) not null default 'ACTIVE',
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid null,
  row_version integer not null default 1,
  constraint legal_entity_types_code_chk check (legal_entity_type_code ~ '^[A-Z0-9_\-]+$'),
  constraint legal_entity_types_status_chk check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  constraint legal_entity_types_display_order_chk check (display_order >= 0),
  constraint legal_entity_types_row_version_chk check (row_version > 0)
);

create table public.legal_entities (
  legal_entity_id uuid primary key default gen_random_uuid(),
  legal_entity_code varchar(50) not null unique,
  display_name varchar(150) not null,
  legal_name varchar(250) not null,
  legal_entity_type_id uuid not null references public.legal_entity_types(legal_entity_type_id) on delete restrict,
  registration_number varchar(50) not null unique,
  lifecycle_status varchar(20) not null default 'ACTIVE',
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid null,
  row_version integer not null default 1,
  constraint legal_entities_code_chk check (legal_entity_code ~ '^[A-Z0-9_\-]+$'),
  constraint legal_entities_status_chk check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  constraint legal_entities_display_order_chk check (display_order >= 0),
  constraint legal_entities_row_version_chk check (row_version > 0)
);

create table public.allocation_units (
  allocation_unit_id uuid primary key default gen_random_uuid(),
  allocation_unit_code varchar(50) not null unique,
  display_name varchar(150) not null,
  allocation_unit_type varchar(30) not null,
  legal_entity_id uuid null references public.legal_entities(legal_entity_id) on delete restrict,
  lifecycle_status varchar(20) not null default 'ACTIVE',
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid null,
  row_version integer not null default 1,
  constraint allocation_units_code_chk check (allocation_unit_code ~ '^[A-Z0-9_\-]+$'),
  constraint allocation_units_type_chk check (allocation_unit_type in ('DAYCARE','OFFICE','MANAGEMENT','DEVELOPMENT','OTHER')),
  constraint allocation_units_status_chk check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  constraint allocation_units_display_order_chk check (display_order >= 0),
  constraint allocation_units_row_version_chk check (row_version > 0)
);

create table public.daycares (
  daycare_id uuid primary key default gen_random_uuid(),
  daycare_code varchar(50) not null unique,
  display_name varchar(150) not null,
  license_number varchar(100) null unique,
  legal_entity_id uuid not null references public.legal_entities(legal_entity_id) on delete restrict,
  allocation_unit_id uuid not null unique references public.allocation_units(allocation_unit_id) on delete restrict,
  address_text varchar(500) null,
  opened_on date null,
  closed_on date null,
  lifecycle_status varchar(20) not null default 'ACTIVE',
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid null,
  row_version integer not null default 1,
  constraint daycares_code_chk check (daycare_code ~ '^[A-Z0-9_\-]+$'),
  constraint daycares_dates_chk check (closed_on is null or opened_on is null or closed_on >= opened_on),
  constraint daycares_status_chk check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  constraint daycares_display_order_chk check (display_order >= 0),
  constraint daycares_row_version_chk check (row_version > 0)
);

create table public.daycare_school_years (
  daycare_school_year_id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null references public.daycares(daycare_id) on delete restrict,
  school_year_id uuid not null references public.school_years(school_year_id) on delete restrict,
  is_operating boolean not null default true,
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid null,
  row_version integer not null default 1,
  constraint daycare_school_years_unique unique (daycare_id, school_year_id),
  constraint daycare_school_years_row_version_chk check (row_version > 0)
);

create table public.age_groups (
  age_group_id uuid primary key default gen_random_uuid(),
  age_group_code varchar(30) not null unique,
  display_name varchar(100) not null,
  display_order integer not null default 0,
  lifecycle_status varchar(20) not null default 'ACTIVE',
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid null,
  row_version integer not null default 1,
  constraint age_groups_code_chk check (age_group_code ~ '^[A-Z0-9_\-]+$'),
  constraint age_groups_status_chk check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  constraint age_groups_display_order_chk check (display_order >= 0),
  constraint age_groups_row_version_chk check (row_version > 0)
);

create index legal_entities_type_idx on public.legal_entities(legal_entity_type_id);
create index legal_entities_status_idx on public.legal_entities(lifecycle_status);
create index allocation_units_type_idx on public.allocation_units(allocation_unit_type);
create index allocation_units_legal_entity_idx on public.allocation_units(legal_entity_id);
create index allocation_units_status_idx on public.allocation_units(lifecycle_status);
create index daycares_legal_entity_idx on public.daycares(legal_entity_id);
create index daycares_status_idx on public.daycares(lifecycle_status);
create index daycare_school_years_school_year_idx on public.daycare_school_years(school_year_id);
create index daycare_school_years_operating_idx on public.daycare_school_years(is_operating) where is_operating = true;
create index age_groups_status_idx on public.age_groups(lifecycle_status);

create trigger legal_entity_types_set_updated_at_and_version before update on public.legal_entity_types for each row execute function public.set_updated_at_and_version();
create trigger legal_entities_set_updated_at_and_version before update on public.legal_entities for each row execute function public.set_updated_at_and_version();
create trigger allocation_units_set_updated_at_and_version before update on public.allocation_units for each row execute function public.set_updated_at_and_version();
create trigger daycares_set_updated_at_and_version before update on public.daycares for each row execute function public.set_updated_at_and_version();
create trigger daycare_school_years_set_updated_at_and_version before update on public.daycare_school_years for each row execute function public.set_updated_at_and_version();
create trigger age_groups_set_updated_at_and_version before update on public.age_groups for each row execute function public.set_updated_at_and_version();

alter table public.legal_entity_types enable row level security;
alter table public.legal_entities enable row level security;
alter table public.allocation_units enable row level security;
alter table public.daycares enable row level security;
alter table public.daycare_school_years enable row level security;
alter table public.age_groups enable row level security;

comment on table public.allocation_units is 'Simple reporting/allocation units for daycare, office, management, development, and approved future units.';
comment on table public.daycares is 'Stable daycare identity. One daycare equals one license.';
comment on table public.daycare_school_years is 'Daycare operation status and notes for a specific school year.';