create table if not exists public.school_years (
  school_year_id uuid primary key default gen_random_uuid(),
  school_year_code varchar(30) not null unique,
  display_name varchar(100) not null,
  start_date date not null,
  end_date date not null,
  status varchar(20) not null default 'DRAFT',
  is_selectable boolean not null default false,
  website_visibility varchar(20) not null default 'HIDDEN',
  configuration_review_status varchar(20) not null default 'NOT_REVIEWED',
  copied_from_school_year_id uuid null references public.school_years(school_year_id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid null,
  row_version integer not null default 1,
  constraint school_years_dates_chk check (end_date >= start_date),
  constraint school_years_status_chk check (status in ('DRAFT','ACTIVE','LOCKED')),
  constraint school_years_visibility_chk check (website_visibility in ('DISPLAYED','HIDDEN')),
  constraint school_years_review_chk check (configuration_review_status in ('NOT_REVIEWED','REVIEWED')),
  constraint school_years_row_version_chk check (row_version > 0),
  constraint school_years_not_self_copy_chk check (copied_from_school_year_id is null or copied_from_school_year_id <> school_year_id)
);

create index if not exists school_years_status_idx on public.school_years(status);
create index if not exists school_years_selectable_idx on public.school_years(is_selectable) where is_selectable = true;
create index if not exists school_years_dates_idx on public.school_years(start_date, end_date);

create trigger school_years_set_updated_at
before update on public.school_years
for each row execute function public.set_updated_at();

alter table public.school_years enable row level security;

comment on table public.school_years is 'Stable educational-year periods. Multiple years may remain selectable while one is displayed at a time.';
comment on column public.school_years.school_year_code is 'Immutable stable business code, e.g. SY-2026-2027.';

create table if not exists public.calendar_years (
  calendar_year_id uuid primary key default gen_random_uuid(),
  calendar_year_code varchar(20) not null unique,
  year_number smallint not null unique,
  display_name varchar(50) not null,
  start_date date not null,
  end_date date not null,
  status varchar(20) not null default 'FUTURE',
  is_selectable boolean not null default false,
  display_order integer not null default 0,
  opened_at timestamptz null,
  opened_by_user_id uuid null,
  closed_at timestamptz null,
  closed_by_user_id uuid null,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid null,
  row_version integer not null default 1,
  constraint calendar_years_year_range_chk check (year_number between 2000 and 2200),
  constraint calendar_years_dates_chk check (end_date >= start_date),
  constraint calendar_years_status_chk check (status in ('FUTURE','OPEN','CLOSED')),
  constraint calendar_years_display_order_chk check (display_order >= 0),
  constraint calendar_years_row_version_chk check (row_version > 0),
  constraint calendar_years_dates_match_year_chk check (
    extract(year from start_date)::int = year_number
    and extract(year from end_date)::int = year_number
  )
);

create index if not exists calendar_years_status_idx on public.calendar_years(status);
create index if not exists calendar_years_selectable_idx on public.calendar_years(is_selectable) where is_selectable = true;
create index if not exists calendar_years_display_order_idx on public.calendar_years(display_order);

create trigger calendar_years_set_updated_at
before update on public.calendar_years
for each row execute function public.set_updated_at();

alter table public.calendar_years enable row level security;

comment on table public.calendar_years is 'Calendar-year periods for accounting and financial reporting. Multiple years may be OPEN simultaneously.';
comment on column public.calendar_years.calendar_year_code is 'Immutable stable business code, e.g. CY-2026.';