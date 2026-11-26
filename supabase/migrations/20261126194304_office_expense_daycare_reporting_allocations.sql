
alter table public.internal_budget_transfers rename to office_expense_daycare_allocations;
alter table public.office_expense_daycare_allocations
  rename column internal_budget_transfer_id to office_expense_daycare_allocation_id;
alter table public.office_expense_daycare_allocations
  rename column transfer_policy_rule_id to allocation_rule_id;
alter table public.office_expense_daycare_allocations
  rename column source_daycare_expense to allocated_amount;
alter table public.office_expense_daycare_allocations
  rename column transfer_kind to allocation_kind;
alter table public.office_expense_daycare_allocations
  drop constraint if exists internal_budget_transfers_balanced_check;
alter table public.office_expense_daycare_allocations
  drop constraint if exists internal_budget_transfers_transfer_kind_check;
alter table public.office_expense_daycare_allocations
  drop column office_budget_income;
alter table public.office_expense_daycare_allocations
  alter column source_calculation_result_id drop not null,
  add column source_bank_allocation_id uuid references public.bank_allocations(bank_allocation_id) on delete restrict,
  add column report_group text not null default 'OFFICE_EXPENSES',
  add constraint office_expense_daycare_allocations_kind_check
    check (allocation_kind in ('BUDGET_PLAN','ACTUAL_EXPENSE')),
  add constraint office_expense_daycare_allocations_source_check
    check (((source_calculation_result_id is not null)::int + (source_bank_allocation_id is not null)::int) = 1);

alter table public.office_expense_daycare_allocations
  drop constraint if exists office_expense_daycare_allocations_source_calculation_result_id_key;
create unique index if not exists office_expense_daycare_allocations_plan_once_idx
  on public.office_expense_daycare_allocations(source_calculation_result_id)
  where source_calculation_result_id is not null;
create unique index if not exists office_expense_daycare_allocations_actual_once_idx
  on public.office_expense_daycare_allocations(source_bank_allocation_id,source_daycare_id)
  where source_bank_allocation_id is not null;

comment on table public.office_expense_daycare_allocations is
  'Analytical allocations of office-owned budget plans or actual office expenses into daycare reports. These are not bank transactions, transfers, or daycare manager budgets.';

create table if not exists public.budget_category_reporting_ownership (
  budget_category_id uuid primary key references public.budget_categories(budget_category_id) on delete restrict,
  economic_owner_allocation_unit_id uuid not null references public.allocation_units(allocation_unit_id) on delete restrict,
  daycare_report_group text not null default 'OFFICE_EXPENSES',
  daycare_report_line text not null default 'הוצאות משרד',
  allocation_basis text not null default 'SOURCE_RULE_RESULT',
  lifecycle_status text not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','INACTIVE')),
  source_evidence jsonb not null check (jsonb_typeof(source_evidence)='object' and source_evidence<>'{}'::jsonb),
  created_at timestamptz not null default now(),
  row_version integer not null default 1 check (row_version>0)
);
alter table public.budget_category_reporting_ownership enable row level security;
revoke all on table public.budget_category_reporting_ownership from anon,authenticated,public;
comment on table public.budget_category_reporting_ownership is
  'Configures economic ownership and daycare-report treatment separately from a budget category. New office categories join the same reporting mechanism by one configuration row, without new code.';

insert into public.budget_category_reporting_ownership (
  budget_category_id,economic_owner_allocation_unit_id,daycare_report_group,daycare_report_line,allocation_basis,source_evidence
)
select b.budget_category_id,a.allocation_unit_id,'OFFICE_EXPENSES','הוצאות משרד','SOURCE_RULE_RESULT',
  jsonb_build_object('source','DIRECTOR_CONFIRMED_CHAT','decision','Office-owned shared expenses are reported in each daycare under Office Expenses, with category-level detail retained.','recorded_at','2026-11-26','verification','DIRECTOR_CONFIRMED')
from public.budget_categories b
join public.allocation_units a on a.allocation_unit_code='UNIT-OFFICE' and a.lifecycle_status='ACTIVE'
where b.budget_category_code in ('CAT-ACCOUNTING','CAT-RECRUITMENT','CAT-TRAINING','CAT-ANNUAL-TRIP','CAT-HOLIDAY-GIFT-CARD','CAT-TEAM-BONDING')
  and b.lifecycle_status='ACTIVE'
on conflict (budget_category_id) do update
set economic_owner_allocation_unit_id=excluded.economic_owner_allocation_unit_id,
    daycare_report_group=excluded.daycare_report_group,
    daycare_report_line=excluded.daycare_report_line,
    allocation_basis=excluded.allocation_basis,
    lifecycle_status='ACTIVE',
    source_evidence=excluded.source_evidence,
    row_version=public.budget_category_reporting_ownership.row_version+1;

drop trigger if exists portal_record_internal_office_budget_transfer on public.calculation_rule_results;
drop function if exists private.portal_record_internal_office_budget_transfer();

create or replace function private.portal_record_office_expense_daycare_allocation()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public,private
as $$
declare
  v_rule public.calculation_rules%rowtype;
  v_owner public.budget_category_reporting_ownership%rowtype;
  v_daycare_id uuid;
  v_category_id uuid;
  v_month date;
  v_output_field text;
  v_amount numeric(14,2);
begin
  if new.result_mode <> 'HISTORICAL_LOCKED' then return new; end if;

  select * into v_rule from public.calculation_rules
   where calculation_rule_id=new.calculation_rule_id
     and lifecycle_status='APPROVED'
     and implementation_status='IMPLEMENTED'
     and enforcement_status='ENFORCED'
     and definition->>'reporting_action'='OFFICE_EXPENSE_DAYCARE_ALLOCATION';

  if v_rule.calculation_rule_id is null then return new; end if;

  v_daycare_id:=nullif(new.runtime_context->>'daycare_id','')::uuid;
  v_category_id:=nullif(new.runtime_context->>'budget_category_id','')::uuid;
  v_month:=nullif(new.runtime_context->>'budget_month','')::date;
  v_output_field:=nullif(v_rule.definition->>'output_field','');

  if v_daycare_id is null or v_category_id is null or v_month is null or v_output_field is null then
    raise exception 'office-expense allocation settlement requires daycare_id, budget_category_id, budget_month, and output_field' using errcode='P0001';
  end if;

  select * into v_owner from public.budget_category_reporting_ownership
   where budget_category_id=v_category_id and lifecycle_status='ACTIVE';

  if v_owner.budget_category_id is null then
    raise exception 'budget category is not configured as an office expense for daycare reporting' using errcode='P0001';
  end if;

  if not (new.output ? v_output_field) or (new.output->>v_output_field) !~ '^[0-9]+(\.[0-9]+)?$' then
    raise exception 'office-expense allocation has no valid positive numeric output for %',v_output_field using errcode='P0001';
  end if;
  v_amount:=(new.output->>v_output_field)::numeric(14,2);
  if v_amount<=0 then raise exception 'office-expense allocation amount must be positive' using errcode='P0001'; end if;

  insert into public.office_expense_daycare_allocations(
    source_calculation_result_id,allocation_rule_id,source_rule_key,source_rule_version,
    source_daycare_id,destination_allocation_unit_id,budget_category_id,budget_month,
    allocated_amount,allocation_kind,report_group,source_evidence,created_by_user_id
  ) values (
    new.calculation_result_id,v_rule.calculation_rule_id,new.rule_key,new.rule_version,
    v_daycare_id,v_owner.economic_owner_allocation_unit_id,v_category_id,date_trunc('month',v_month)::date,
    v_amount,'BUDGET_PLAN',v_owner.daycare_report_group,
    jsonb_build_object(
      'allocation_type','OFFICE_EXPENSE_DAYCARE_REPORTING',
      'settlement_calculation_result_id',new.calculation_result_id,
      'settlement_rule_key',new.rule_key,
      'settlement_rule_version',new.rule_version,
      'result_mode',new.result_mode,
      'runtime_context',new.runtime_context,
      'input_source_evidence',new.input_source_evidence
    ),new.created_by_user_id
  ) on conflict (source_calculation_result_id) where source_calculation_result_id is not null do nothing;
  return new;
end $$;
revoke all on function private.portal_record_office_expense_daycare_allocation() from public;

create trigger portal_record_office_expense_daycare_allocation
after insert on public.calculation_rule_results
for each row execute function private.portal_record_office_expense_daycare_allocation();
