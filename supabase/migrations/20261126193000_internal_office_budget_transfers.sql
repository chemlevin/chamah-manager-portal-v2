
create table if not exists public.internal_budget_transfers (
  internal_budget_transfer_id uuid primary key default gen_random_uuid(),
  source_calculation_result_id uuid not null unique references public.calculation_rule_results(calculation_result_id) on delete restrict,
  transfer_policy_rule_id uuid not null references public.calculation_rules(calculation_rule_id) on delete restrict,
  source_rule_key uuid not null,
  source_rule_version integer not null check (source_rule_version > 0),
  source_daycare_id uuid not null references public.daycares(daycare_id) on delete restrict,
  destination_allocation_unit_id uuid not null references public.allocation_units(allocation_unit_id) on delete restrict,
  budget_category_id uuid not null references public.budget_categories(budget_category_id) on delete restrict,
  budget_month date not null check (budget_month = date_trunc('month', budget_month)::date),
  source_daycare_expense numeric(14,2) not null check (source_daycare_expense > 0),
  office_budget_income numeric(14,2) not null check (office_budget_income > 0),
  transfer_kind text not null check (transfer_kind = 'INTERNAL_BUDGET_ALLOCATION'),
  lifecycle_status text not null default 'GENERATED' check (lifecycle_status in ('GENERATED','REVERSED')),
  source_evidence jsonb not null check (jsonb_typeof(source_evidence) = 'object' and source_evidence <> '{}'::jsonb),
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete restrict,
  row_version integer not null default 1 check (row_version > 0),
  constraint internal_budget_transfers_balanced_check
    check (source_daycare_expense = office_budget_income)
);

comment on table public.internal_budget_transfers is
  'Traceable non-bank internal budget transfers: equal daycare expense and office-budget income, generated only from an approved office-owned budget-rule result.';
comment on column public.internal_budget_transfers.source_calculation_result_id is
  'Idempotency anchor: exactly one internal transfer per eligible source calculation result.';

create index if not exists internal_budget_transfers_source_daycare_month_idx
  on public.internal_budget_transfers (source_daycare_id, budget_month, budget_category_id);
create index if not exists internal_budget_transfers_destination_month_idx
  on public.internal_budget_transfers (destination_allocation_unit_id, budget_month, budget_category_id);

alter table public.internal_budget_transfers enable row level security;
revoke all on table public.internal_budget_transfers from anon, authenticated;
revoke all on table public.internal_budget_transfers from public;

create or replace function private.portal_record_internal_office_budget_transfer()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_policy public.calculation_rules%rowtype;
  v_source_rule public.calculation_rules%rowtype;
  v_source_daycare_id uuid;
  v_destination_allocation_unit_id uuid;
  v_budget_category_id uuid;
  v_budget_month date;
  v_output_field text;
  v_amount numeric(14,2);
  v_policy_count integer;
begin
  select r.*
    into v_source_rule
    from public.calculation_rules r
   where r.calculation_rule_id = new.calculation_rule_id;

  if coalesce(v_source_rule.definition->>'budget_owner_allocation_unit_code','') <> 'UNIT-OFFICE' then
    return new;
  end if;

  select count(*)
    into v_policy_count
    from public.calculation_rules p
   where p.lifecycle_status = 'APPROVED'
     and p.implementation_status = 'IMPLEMENTED'
     and p.enforcement_status = 'ENFORCED'
     and p.definition->>'transfer_kind' = 'INTERNAL_BUDGET_ALLOCATION'
     and p.effective_from <= new.calculation_timestamp::date
     and (p.effective_to is null or p.effective_to >= new.calculation_timestamp::date)
     and coalesce(p.definition->'office_budget_category_codes','[]'::jsonb)
           ? coalesce(v_source_rule.definition->>'budget_category_code','');

  if v_policy_count = 0 then
    return new;
  elsif v_policy_count <> 1 then
    raise exception 'internal office-budget transfer policy is ambiguous for category %',
      v_source_rule.definition->>'budget_category_code'
      using errcode = 'P0001';
  end if;

  select p.*
    into v_policy
    from public.calculation_rules p
   where p.lifecycle_status = 'APPROVED'
     and p.implementation_status = 'IMPLEMENTED'
     and p.enforcement_status = 'ENFORCED'
     and p.definition->>'transfer_kind' = 'INTERNAL_BUDGET_ALLOCATION'
     and p.effective_from <= new.calculation_timestamp::date
     and (p.effective_to is null or p.effective_to >= new.calculation_timestamp::date)
     and coalesce(p.definition->'office_budget_category_codes','[]'::jsonb)
           ? coalesce(v_source_rule.definition->>'budget_category_code');

  v_source_daycare_id := nullif(new.runtime_context->>'daycare_id','')::uuid;
  v_budget_month := nullif(new.runtime_context->>'budget_month','')::date;
  v_output_field := nullif(v_source_rule.definition->>'output_field','');

  if v_source_daycare_id is null or v_budget_month is null or v_output_field is null then
    raise exception 'office budget result requires daycare_id, budget_month, and an output_field before its internal transfer can be recorded'
      using errcode = 'P0001';
  end if;

  select b.budget_category_id
    into v_budget_category_id
    from public.budget_categories b
   where b.budget_category_code = v_source_rule.definition->>'budget_category_code'
     and b.lifecycle_status = 'ACTIVE';

  select a.allocation_unit_id
    into v_destination_allocation_unit_id
    from public.allocation_units a
   where a.allocation_unit_code = v_policy.definition->>'destination_allocation_unit_code'
     and a.lifecycle_status = 'ACTIVE';

  if v_budget_category_id is null or v_destination_allocation_unit_id is null then
    raise exception 'internal office-budget transfer cannot resolve its active budget category or destination allocation unit'
      using errcode = 'P0001';
  end if;

  if not (new.output ? v_output_field)
     or (new.output->>v_output_field) !~ '^[0-9]+(\.[0-9]+)?$' then
    raise exception 'office budget result has no valid positive numeric output for %', v_output_field
      using errcode = 'P0001';
  end if;

  v_amount := (new.output->>v_output_field)::numeric(14,2);
  if v_amount <= 0 then
    raise exception 'office budget result must be positive before an internal transfer can be recorded'
      using errcode = 'P0001';
  end if;

  insert into public.internal_budget_transfers (
    source_calculation_result_id, transfer_policy_rule_id,
    source_rule_key, source_rule_version,
    source_daycare_id, destination_allocation_unit_id, budget_category_id, budget_month,
    source_daycare_expense, office_budget_income, transfer_kind,
    source_evidence, created_by_user_id
  ) values (
    new.calculation_result_id, v_policy.calculation_rule_id,
    new.rule_key, new.rule_version,
    v_source_daycare_id, v_destination_allocation_unit_id, v_budget_category_id,
    date_trunc('month',v_budget_month)::date,
    v_amount, v_amount, 'INTERNAL_BUDGET_ALLOCATION',
    jsonb_build_object(
      'source_calculation_result_id', new.calculation_result_id,
      'source_rule_key', new.rule_key,
      'source_rule_version', new.rule_version,
      'transfer_policy_rule_key', v_policy.rule_key,
      'transfer_policy_rule_version', v_policy.version,
      'source_output_field', v_output_field,
      'runtime_context', new.runtime_context,
      'input_source_evidence', new.input_source_evidence
    ),
    new.created_by_user_id
  )
  on conflict (source_calculation_result_id) do nothing;

  return new;
end;
$$;

revoke all on function private.portal_record_internal_office_budget_transfer() from public;

drop trigger if exists portal_record_internal_office_budget_transfer on public.calculation_rule_results;
create trigger portal_record_internal_office_budget_transfer
after insert on public.calculation_rule_results
for each row execute function private.portal_record_internal_office_budget_transfer();
