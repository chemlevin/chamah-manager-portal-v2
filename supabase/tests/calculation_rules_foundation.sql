-- Run only after all repository migrations in an isolated Supabase project.
-- It requires an existing synthetic Director identity and rolls back every row.
begin;

do $$
declare
  v_director uuid;
  v_preview jsonb;
  v_approval jsonb;
  v_commit jsonb;
  v_result jsonb;
  v_batch uuid;
  v_approval_id uuid;
begin
  select p.user_id into v_director
  from public.portal_user_profiles p
  where p.is_active and private.portal_is_authorized(p.user_id,'RULES.WRITE')
  order by p.created_at
  limit 1;
  if v_director is null then
    raise exception 'isolated test requires a synthetic active Director user';
  end if;

  perform set_config('request.jwt.claims', jsonb_build_object('sub',v_director,'role','authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_director::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  v_preview := public.portal_mcp_preview_calculation_rule(
    jsonb_build_object(
      'operation','CREATE',
      'rule',jsonb_build_object(
        'rule_type','STAFFING_RATIO','display_name','isolated governed workflow test',
        'instruction','Synthetic test instruction only',
        'definition',jsonb_build_object('children_per_staff',5,'rounding_method','CEIL_HALF','minimum_staff',1),
        'effective_from','2099-01-01','rule_priority',100,'handler_code','STAFFING_RATIO_V1',
        'source_evidence',jsonb_build_object('fixture','isolated-rollback-test')
      ),
      'applicability',jsonb_build_array(jsonb_build_object(
        'applicability_group',1,'context_kind','FRAMEWORK_TYPE','context_code','BASIC'
      ))
    ),
    'isolated-foundation-test-0001'
  );
  if v_preview->>'status' <> 'PREVIEWED' or not (v_preview#>>'{validation,valid}')::boolean then
    raise exception 'preview failed: %', v_preview;
  end if;
  v_batch := (v_preview->>'batch_id')::uuid;

  begin
    perform public.portal_mcp_commit_calculation_rule(v_batch,gen_random_uuid(),1);
    raise exception 'expected commit without approval to fail';
  exception when sqlstate '40001' then null;
  end;

  v_approval := public.portal_mcp_request_calculation_rule_approval(v_batch,'isolated rollback test');
  v_approval_id := (v_approval->>'approval_id')::uuid;

  begin
    perform public.portal_mcp_commit_calculation_rule(v_batch,v_approval_id,1);
    raise exception 'expected stale batch version to fail';
  exception when sqlstate '40001' then null;
  end;

  v_commit := public.portal_mcp_commit_calculation_rule(v_batch,v_approval_id,2);
  if v_commit->>'status' <> 'COMMITTED'
     or v_commit#>>'{rule,implementation_status}' <> 'IMPLEMENTED'
     or v_commit#>>'{rule,enforcement_status}' <> 'ENFORCED' then
    raise exception 'commit/read-back failed: %', v_commit;
  end if;

  if public.portal_mcp_commit_calculation_rule(v_batch,v_approval_id,2)#>>'{rule,calculation_rule_id}'
     <> v_commit#>>'{rule,calculation_rule_id}' then
    raise exception 'idempotent commit retry created a different rule';
  end if;

  v_result := public.portal_mcp_execute_calculation_rule(
    'STAFFING_RATIO',date '2099-02-01','{"framework_type":"BASIC"}'::jsonb,
    '{"children_count":12}'::jsonb,
    '{"fixture":"isolated-rollback-test","source_version":1}'::jsonb,
    'CURRENT_RECALCULATION'
  );
  if v_result->>'status' <> 'CALCULATED'
     or (v_result#>>'{output,required_staff}')::numeric <> 2.5
     or v_result->>'calculation_rule_id' <> v_commit#>>'{rule,calculation_rule_id}' then
    raise exception 'traceable staffing execution failed: %', v_result;
  end if;

  if not has_table_privilege('authenticated','public.calculation_rules','select')
     or has_table_privilege('authenticated','public.calculation_rules','insert') then
    raise exception 'least-privilege grants are incorrect';
  end if;
end;
$$;

rollback;
