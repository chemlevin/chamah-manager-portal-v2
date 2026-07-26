create table if not exists public.staffing_rules (
  staffing_rule_id uuid primary key default gen_random_uuid(),
  sheet_staffing_rule_id varchar not null unique,
  school_year_id uuid not null references public.school_years(school_year_id),
  standard_type varchar not null check (standard_type in ('BASIC','EXTENDED')),
  age_group varchar not null check (age_group in ('INFANT','TODDLER','GRADUATE')),
  children_per_staff numeric not null check (children_per_staff > 0),
  minimum_staff numeric null check (minimum_staff is null or minimum_staff >= 0),
  rounding_method varchar not null default 'CEIL_PER_AGE_GROUP' check (rounding_method = 'CEIL_PER_AGE_GROUP'),
  lifecycle_status varchar not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  row_version integer not null default 1 check (row_version > 0),
  unique (school_year_id, standard_type, age_group)
);

alter table public.staffing_rules enable row level security;

drop policy if exists portal_authorized_read on public.staffing_rules;
create policy portal_authorized_read
on public.staffing_rules
for select
to authenticated
using ((select private.can_read_portal()));

insert into public.staffing_rules (
  sheet_staffing_rule_id, school_year_id, standard_type, age_group,
  children_per_staff, minimum_staff, rounding_method, lifecycle_status, notes
)
select v.sheet_id, sy.school_year_id, v.standard_type, v.age_group,
       v.children_per_staff, null, 'CEIL_PER_AGE_GROUP', 'ACTIVE', null
from public.school_years sy
cross join (values
  ('SR-2026-BASIC-INFANT','BASIC','INFANT',6::numeric),
  ('SR-2026-BASIC-TODDLER','BASIC','TODDLER',9::numeric),
  ('SR-2026-BASIC-GRADUATE','BASIC','GRADUATE',11::numeric),
  ('SR-2026-EXT-INFANT','EXTENDED','INFANT',5::numeric),
  ('SR-2026-EXT-TODDLER','EXTENDED','TODDLER',8::numeric),
  ('SR-2026-EXT-GRADUATE','EXTENDED','GRADUATE',10::numeric)
) as v(sheet_id, standard_type, age_group, children_per_staff)
where sy.school_year_code = 'SY-2026-2027'
on conflict (sheet_staffing_rule_id) do update set
  school_year_id = excluded.school_year_id,
  standard_type = excluded.standard_type,
  age_group = excluded.age_group,
  children_per_staff = excluded.children_per_staff,
  rounding_method = excluded.rounding_method,
  lifecycle_status = excluded.lifecycle_status,
  updated_at = timezone('utc', now()),
  row_version = public.staffing_rules.row_version + 1;
