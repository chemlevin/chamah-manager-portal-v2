alter table public.payroll_calculation_input_rules
  drop constraint payroll_calculation_input_rules_input_value_kind_check,
  add constraint payroll_calculation_input_rules_input_value_kind_check
    check (input_value_kind in ('HOURS', 'MONEY', 'NUMBER', 'BOOLEAN', 'TEXT'));

alter table public.payroll_records
  add column if not exists monthly_inputs jsonb not null default '{}'::jsonb;

insert into public.payroll_calculation_input_rules
  (input_code, source_field, display_name, input_value_kind, operation, multiplier, uses_base_hourly_rate, counts_for_effective_hours, display_order)
values
  ('WORK_DAYS', 'work_days', 'ימי עבודה', 'NUMBER', 'ADD', 0, false, false, 5),
  ('NO_ABSENCE', 'no_absence', 'ללא היעדרות', 'BOOLEAN', 'ADD', 0, false, false, 75)
on conflict (input_code) do update set
  source_field = excluded.source_field, display_name = excluded.display_name,
  input_value_kind = excluded.input_value_kind, display_order = excluded.display_order,
  lifecycle_status = 'ACTIVE', updated_at = now();

update public.compensation_rules
set eligibility_condition = 'AUTOMATIC_BY_SENIORITY AND NO_ABSENCE=TRUE', updated_at = now()
where lifecycle_status = 'ACTIVE'
  and eligibility_condition = 'AUTOMATIC_BY_SENIORITY AND NO_ABSENCE_OVERRIDE=TRUE';
