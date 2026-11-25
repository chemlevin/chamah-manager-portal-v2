-- Run only against an isolated database after all repository migrations.
-- The transaction is rolled back and uses synthetic framework-only contexts.
begin;

do $$
declare
  v_rule_id uuid;
  v_second_rule_id uuid;
begin
  insert into public.calculation_rules (
    rule_type, display_name, definition, effective_from,
    source_evidence, approval_evidence
  ) values (
    'STAFFING_RATIO', 'isolated foundation test', '{"ratio": 1}'::jsonb,
    date '2099-01-01', '{"test": true}'::jsonb, '{"unverified": true}'::jsonb
  ) returning calculation_rule_id into v_rule_id;

  insert into public.calculation_rule_contexts (
    calculation_rule_id, context_kind, context_code
  ) values (v_rule_id, 'FRAMEWORK_TYPE', 'BASIC');

  update public.calculation_rules
  set lifecycle_status = 'ACTIVE'
  where calculation_rule_id = v_rule_id;

  begin
    update public.calculation_rules
    set definition = '{"ratio": 2}'::jsonb
    where calculation_rule_id = v_rule_id;
    raise exception 'expected active rule mutation to fail';
  exception when others then
    if sqlerrm = 'expected active rule mutation to fail' then raise; end if;
  end;

  begin
    delete from public.calculation_rule_contexts
    where calculation_rule_id = v_rule_id;
    raise exception 'expected active context mutation to fail';
  exception when others then
    if sqlerrm = 'expected active context mutation to fail' then raise; end if;
  end;

  -- This succeeds intentionally and demonstrates the current gap: non-empty
  -- approval JSON is stored but is not bound to a verified approval record.
  insert into public.calculation_rules (
    rule_type, display_name, definition, effective_from,
    source_evidence, approval_evidence
  ) values (
    'STAFFING_RATIO', 'overlap test', '{"ratio": 3}'::jsonb,
    date '2099-01-01', '{"test": true}'::jsonb, '{"anything": true}'::jsonb
  ) returning calculation_rule_id into v_second_rule_id;

  insert into public.calculation_rule_contexts (
    calculation_rule_id, context_kind, context_code
  ) values (v_second_rule_id, 'FRAMEWORK_TYPE', 'BASIC');

  update public.calculation_rules
  set lifecycle_status = 'ACTIVE'
  where calculation_rule_id = v_second_rule_id;

  if has_table_privilege('authenticated', 'public.calculation_rules', 'select')
     or has_table_privilege('authenticated', 'public.calculation_rule_contexts', 'select')
     or has_table_privilege('authenticated', 'public.calculation_rule_context_readable', 'select') then
    raise exception 'deployed-parity test expects the documented missing authenticated SELECT grants';
  end if;
end;
$$;

rollback;
