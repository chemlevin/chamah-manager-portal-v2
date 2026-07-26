create table if not exists public.classroom_licensing_rules (
  classroom_licensing_rule_id uuid primary key default gen_random_uuid(),
  sheet_licensing_rule_id varchar(100) not null unique,
  age_group varchar(30) not null,
  sqm_per_child numeric(6,2) not null,
  max_children integer not null,
  allowed_mixed_with varchar(30)[] not null default '{}',
  valid_from date not null,
  valid_to date null,
  rounding_method varchar(40) not null default 'FLOOR_AFTER_TOTAL',
  lifecycle_status varchar(20) not null default 'ACTIVE',
  notes text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  row_version integer not null default 1,
  constraint classroom_licensing_rules_age_group_chk check (age_group in ('INFANT','TODDLER','GRADUATE')),
  constraint classroom_licensing_rules_sqm_chk check (sqm_per_child > 0),
  constraint classroom_licensing_rules_max_children_chk check (max_children > 0),
  constraint classroom_licensing_rules_dates_chk check (valid_to is null or valid_to >= valid_from),
  constraint classroom_licensing_rules_rounding_chk check (rounding_method = 'FLOOR_AFTER_TOTAL'),
  constraint classroom_licensing_rules_status_chk check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  constraint classroom_licensing_rules_row_version_chk check (row_version > 0)
);

alter table public.classroom_licensing_rules enable row level security;

drop policy if exists portal_authorized_read on public.classroom_licensing_rules;
create policy portal_authorized_read
on public.classroom_licensing_rules
for select
to authenticated
using ((select private.can_read_portal()));

insert into public.classroom_licensing_rules (
  sheet_licensing_rule_id, age_group, sqm_per_child, max_children,
  allowed_mixed_with, valid_from, valid_to, rounding_method,
  lifecycle_status, notes
)
values
  ('CLR-2026-INFANT','INFANT',2.8,22,array['TODDLER']::varchar[],'2026-09-01',null,'FLOOR_AFTER_TOTAL','ACTIVE','מותרת כיתה יחידה או מעורבת תינוק-פעוט בלבד'),
  ('CLR-2026-TODDLER','TODDLER',2.6,27,array['INFANT','GRADUATE']::varchar[],'2026-09-01',null,'FLOOR_AFTER_TOTAL','ACTIVE','מותרת כיתה יחידה או מעורבת תינוק-פעוט / פעוט-בוגר'),
  ('CLR-2026-GRADUATE','GRADUATE',2.2,33,array['TODDLER']::varchar[],'2026-09-01',null,'FLOOR_AFTER_TOTAL','ACTIVE','מותרת כיתה יחידה או מעורבת פעוט-בוגר בלבד')
on conflict (sheet_licensing_rule_id) do update set
  age_group = excluded.age_group,
  sqm_per_child = excluded.sqm_per_child,
  max_children = excluded.max_children,
  allowed_mixed_with = excluded.allowed_mixed_with,
  valid_from = excluded.valid_from,
  valid_to = excluded.valid_to,
  rounding_method = excluded.rounding_method,
  lifecycle_status = excluded.lifecycle_status,
  notes = excluded.notes,
  updated_at = timezone('utc', now()),
  row_version = public.classroom_licensing_rules.row_version + 1;
