create table public.payroll_calculation_input_rules (
  payroll_calculation_input_rule_id uuid primary key default gen_random_uuid(),
  input_code varchar(80) not null unique,
  source_field varchar(80) not null,
  display_name varchar(160) not null,
  input_value_kind varchar(20) not null check (input_value_kind in ('HOURS', 'MONEY')),
  operation varchar(20) not null check (operation in ('ADD', 'SUBTRACT')),
  multiplier numeric(12,4) not null default 1,
  uses_base_hourly_rate boolean not null default false,
  counts_for_effective_hours boolean not null default false,
  display_order integer not null default 0,
  lifecycle_status varchar(20) not null default 'ACTIVE'
    check (lifecycle_status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

comment on table public.payroll_calculation_input_rules is
  'Supabase-owned configuration for monthly payroll input contributions; the Workbench and Edge Function must not duplicate these coefficients.';

alter table public.payroll_calculation_input_rules enable row level security;
revoke all on table public.payroll_calculation_input_rules from anon, authenticated;
grant select, insert, update, delete on table public.payroll_calculation_input_rules to service_role;

insert into public.payroll_calculation_input_rules
  (input_code, source_field, display_name, input_value_kind, operation, multiplier, uses_base_hourly_rate, counts_for_effective_hours, display_order)
values
  ('REGULAR_HOURS', 'regular_hours', 'שעות 100%', 'HOURS', 'ADD', 1, true, true, 10),
  ('HOURS_125', 'hours_125', 'שעות 125%', 'HOURS', 'ADD', 1.25, true, true, 20),
  ('HOURS_150', 'hours_150', 'שעות 150%', 'HOURS', 'ADD', 1.5, true, true, 30),
  ('VACATION_PAY', 'vacation_pay', 'תשלום חופשה', 'MONEY', 'ADD', 1, false, false, 40),
  ('SICK_PAY', 'sick_pay', 'תשלום מחלה', 'MONEY', 'ADD', 1, false, false, 50),
  ('VACATION_DEDUCT', 'vacation_deduct', 'ניכוי חופשה', 'MONEY', 'SUBTRACT', 1, false, false, 60),
  ('SICK_DEDUCT', 'sick_deduct', 'ניכוי מחלה', 'MONEY', 'SUBTRACT', 1, false, false, 70)
on conflict (input_code) do update set
  source_field = excluded.source_field,
  display_name = excluded.display_name,
  input_value_kind = excluded.input_value_kind,
  operation = excluded.operation,
  multiplier = excluded.multiplier,
  uses_base_hourly_rate = excluded.uses_base_hourly_rate,
  counts_for_effective_hours = excluded.counts_for_effective_hours,
  display_order = excluded.display_order,
  lifecycle_status = 'ACTIVE',
  updated_at = now(),
  version = public.payroll_calculation_input_rules.version + 1;
