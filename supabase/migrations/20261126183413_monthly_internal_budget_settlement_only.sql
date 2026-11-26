
create or replace function private.portal_record_internal_office_budget_transfer()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_policy public.calculation_rules%rowtype;
  v_source_daycare_id uuid;
  v_destination_allocation_unit_id uuid;
  v_budget_category_id uuid;
  v_budget_month date;
  v_output_field text;
  v_amount numeric(14,2);
begin
  -- This trigger is the final monthly settlement only. Intermediate and annual
  -- budget calculations do not create internal transfers.
  if new.result_mode <> 'HISTORICAL_LOCKED' then
    return new;
  end if;

  select p.*
    into v_policy
    from public.calculation_rules p
   where p.calculation_rule_id = new.calculation_rule_id
     and p.lifecycle_status = 'APPROVED'
     and p.implementation_status = 'IMPLEMENTED'
     and p.enforcement_status = 'ENFORCED'
     and p.definition->>'transfer_kind' = 'INTERNAL_BUDGET_ALLOCATION';

  if v_policy.calculation_rule_id is null then
    return new;
  end if;

  v_source_daycare_id := nullif(new.runtime_context->>'daycare_id','')::uuid;
  v_budget_category_id := nullif(new.runtime_context->>'budget_category_id','')::uuid;
  v_budget_month := nullif(new.runtime_context->>'budget_month','')::date;
  v_output_field := nullif(v_policy.definition->>'output_field','');

  if v_source_daycare_id is null or v_budget_category_id is null or v_budget_month is null or v_output_field is null then
    raise exception 'monthly internal transfer settlement requires daycare_id, budget_category_id, budget_month, and an output field'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.budget_categories b
    where b.budget_category_id = v_budget_category_id
      and b.lifecycle_status = 'ACTIVE'
      and coalesce(v_policy.definition->'office_budget_category_codes','[]'::jsonb)
          ? b.budget_category_code
  ) then
    raise exception 'monthly internal transfer settlement is not authorized for this budget category'
      using errcode = 'P0001';
  end if;

  select a.allocation_unit_id
    into v_destination_allocation_unit_id
    from public.allocation_units a
   where a.allocation_unit_code = v_policy.definition->>'destination_allocation_unit_code'
     and a.lifecycle_status = 'ACTIVE';

  if v_destination_allocation_unit_id is null then
    raise exception 'monthly internal transfer settlement cannot resolve its active office allocation unit'
      using errcode = 'P0001';
  end if;

  if not (new.output ? v_output_field)
     or (new.output->>v_output_field) !~ '^[0-9]+(\.[0-9]+)?$' then
    raise exception 'monthly internal transfer settlement has no valid positive numeric output for %', v_output_field
      using errcode = 'P0001';
  end if;

  v_amount := (new.output->>v_output_field)::numeric(14,2);
  if v_amount <= 0 then
    raise exception 'monthly internal transfer settlement amount must be positive'
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
      'settlement_calculation_result_id', new.calculation_result_id,
      'settlement_rule_key', new.rule_key,
      'settlement_rule_version', new.rule_version,
      'settlement_result_mode', new.result_mode,
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
comment on function private.portal_record_internal_office_budget_transfer() is
  'Creates one balanced non-bank transfer only from a HISTORICAL_LOCKED execution of the approved monthly internal-budget-transfer rule.';
