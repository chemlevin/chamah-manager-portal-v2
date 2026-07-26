alter table public.staffing_budget_parameters
  add column if not exists hourly_budget_cost numeric(14,2),
  add column if not exists budget_formula text;

alter table public.staffing_budget_parameters
  drop constraint if exists staffing_budget_parameters_hourly_cost_check,
  add constraint staffing_budget_parameters_hourly_cost_check
    check (hourly_budget_cost is null or hourly_budget_cost > 0);

comment on column public.staffing_budget_parameters.hourly_budget_cost is
  'Imported from Google Sheets v2 STAFFING_BUDGET_PARAMETERS.hourly_budget_cost. Runtime source for caregiver payroll budget.';
comment on column public.staffing_budget_parameters.budget_formula is
  'Imported approved formula identifier from Google Sheets v2 STAFFING_BUDGET_PARAMETERS.budget_formula.';

alter table public.budget_rules
  add column if not exists standard_type varchar(30),
  add column if not exists minimum_staff numeric(10,2),
  add column if not exists rounding_method varchar(50);

comment on column public.budget_rules.standard_type is
  'Imported Google Sheets v2 TUITION_RULES or STAFFING_RULES standard_type.';
comment on column public.budget_rules.minimum_staff is
  'Imported Google Sheets v2 STAFFING_RULES minimum_staff.';
comment on column public.budget_rules.rounding_method is
  'Imported Google Sheets v2 STAFFING_RULES rounding_method; calculation still follows approved BR-0015.';

update public.staffing_budget_parameters
set hourly_budget_cost = 60,
    budget_formula = 'MONTHLY_REQUIRED_STAFF_HOURS × HOURLY_BUDGET_COST',
    updated_at = timezone('utc', now()),
    row_version = row_version + 1
where sheet_staffing_budget_parameter_id = 'SBP-2026-2027'
  and (
    hourly_budget_cost is distinct from 60
    or budget_formula is distinct from 'MONTHLY_REQUIRED_STAFF_HOURS × HOURLY_BUDGET_COST'
  );

update public.budget_rules
set standard_type = case
      when sheet_rule_id like 'SR-%-BASIC-%' then 'BASIC'
      when sheet_rule_id like 'SR-%-EXT-%' then 'EXTENDED'
      else standard_type
    end,
    rounding_method = case when sheet_rule_id like 'SR-%' then 'CEIL_PER_AGE_GROUP' else rounding_method end,
    updated_at = timezone('utc', now()),
    row_version = row_version + 1
where sheet_rule_id like 'SR-%'
  and (standard_type is null or rounding_method is null);

update public.budget_rules
set standard_type = 'EXTENDED',
    updated_at = timezone('utc', now()),
    row_version = row_version + 1
where sheet_rule_id in ('TR-2026-INFANT', 'TR-2026-TODDLER', 'TR-2026-GRADUATE')
  and standard_type is null;
