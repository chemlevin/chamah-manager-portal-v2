-- Isolated Supabase execution test. Every synthetic row is rolled back.
begin;

select set_config('request.jwt.claim.sub',(
  select p.user_id::text from public.portal_user_profiles p
  where p.is_active and private.portal_is_authorized(p.user_id,'RULES.WRITE') limit 1
),true);
select set_config('request.jwt.claim.role','authenticated',true);

create or replace function pg_temp.test_commit_rule(p_payload jsonb,p_key text)
returns jsonb language plpgsql as $$
declare p jsonb;a jsonb;
begin
 p:=public.portal_mcp_preview_calculation_rule(p_payload,p_key);
 if p#>>'{validation,valid}'<>'true' then raise exception 'invalid rule preview %',p;end if;
 a:=public.portal_mcp_request_calculation_rule_approval((p->>'batch_id')::uuid,'synthetic isolated rule approval');
 return public.portal_mcp_commit_rule_instruction((p->>'batch_id')::uuid,(a->>'approval_id')::uuid,2);
end $$;

create or replace function pg_temp.test_commit_app(p_rule_id uuid,p_rule_version int,p_conditions jsonb,p_key text,p_priority int default 100)
returns jsonb language plpgsql as $$
declare p jsonb;a jsonb;payload jsonb;
begin
 payload:=jsonb_build_object('calculation_rule_id',p_rule_id,'expected_rule_version',p_rule_version,
  'effective_from','2099-01-01','effective_to','2099-12-31','rule_priority',p_priority,
  'conditions',p_conditions,'source_evidence',jsonb_build_object('fixture','rollback-only'));
 p:=public.portal_mcp_preview_rule_applicability(payload,p_key);
 a:=public.portal_mcp_request_rule_applicability_approval((p->>'batch_id')::uuid,'synthetic isolated applicability');
 return public.portal_mcp_commit_rule_applicability((p->>'batch_id')::uuid,(a->>'approval_id')::uuid,2);
end $$;

do $$
declare
 broad jsonb;specific jsonb;replacement jsonb;conflicting jsonb;budget jsonb;budget_specific jsonb;stored_only jsonb;app jsonb;calc jsonb;replacement_calc jsonb;budget_calc jsonb;budget_specific_calc jsonb;
 override_preview jsonb;override_approval jsonb;override_commit jsonb;readback jsonb;
 broad_id uuid;specific_id uuid;replacement_id uuid;conflicting_id uuid;budget_id uuid;budget_specific_id uuid;stored_id uuid;daycare uuid;age_group uuid:=gen_random_uuid();budget_category uuid:=gen_random_uuid();random_user uuid:=gen_random_uuid();
begin
 select daycare_id into daycare from public.daycares order by daycare_id limit 1;
 if daycare is null then raise exception 'isolated environment needs one synthetic daycare fixture';end if;
 insert into public.age_groups(age_group_id,age_group_code,display_name,display_order,lifecycle_status)
 values(age_group,'SYNTHETIC_RULE_TEST','Synthetic rule test age group',999,'ACTIVE');
 insert into public.budget_categories(budget_category_id,budget_category_code,display_name,category_type,lifecycle_status,display_order,requires_budget,notes)
 values(budget_category,'SYNTHETIC_RULE_TEST','Synthetic rule test budget category','EXPENSE','ACTIVE',999,true,'Rollback-only canonical fixture');

 broad:=pg_temp.test_commit_rule(jsonb_build_object('operation','CREATE','rule',jsonb_build_object(
  'rule_type','STAFFING_RATIO','display_name','synthetic broad staffing','instruction','Synthetic broad staffing instruction',
  'definition',jsonb_build_object('children_per_staff',6,'rounding_method','CEIL_HALF','minimum_staff',1),
  'effective_from','2099-01-01','handler_code','STAFFING_RATIO_V1','source_evidence',jsonb_build_object('fixture','rollback-only')),
  'applicability','[]'::jsonb),'isolated-rule-broad-0001');
 broad_id:=(broad#>>'{rule,calculation_rule_id}')::uuid;
 if broad#>>'{rule,lifecycle_status}'<>'APPROVED' or jsonb_array_length(broad->'applicability')<>0 then raise exception 'instruction was not independently approved %',broad;end if;
 app:=pg_temp.test_commit_app(broad_id,1,'[]'::jsonb,'isolated-app-broad-0001',100);
 if app#>>'{applicability_set,lifecycle_status}'<>'ACTIVE' or app->>'broad'<>'true' then null;end if;

 specific:=pg_temp.test_commit_rule(jsonb_build_object('operation','CREATE','rule',jsonb_build_object(
  'rule_type','STAFFING_RATIO','display_name','synthetic daycare exception','instruction','Synthetic daycare-specific staffing exception',
  'definition',jsonb_build_object('children_per_staff',5,'rounding_method','CEIL_HALF','minimum_staff',1),
  'effective_from','2099-01-01','handler_code','STAFFING_RATIO_V1','source_evidence',jsonb_build_object('fixture','rollback-only')),
  'applicability','[]'::jsonb),'isolated-rule-specific-0001');
 specific_id:=(specific#>>'{rule,calculation_rule_id}')::uuid;
 perform pg_temp.test_commit_app(specific_id,1,jsonb_build_array(jsonb_build_object('applicability_group',1,'context_kind','DAYCARE','context_id',daycare)),'isolated-app-specific-0001',100);

 conflicting:=pg_temp.test_commit_rule(jsonb_build_object('operation','CREATE','rule',jsonb_build_object(
  'rule_type','STAFFING_RATIO','display_name','synthetic conflicting exception','instruction','Synthetic conflicting staffing exception',
  'definition',jsonb_build_object('children_per_staff',4,'rounding_method','CEIL_HALF','minimum_staff',1),
  'effective_from','2099-01-01','handler_code','STAFFING_RATIO_V1','source_evidence',jsonb_build_object('fixture','rollback-only')),
  'applicability','[]'::jsonb),'isolated-rule-conflict-0001');
 conflicting_id:=(conflicting#>>'{rule,calculation_rule_id}')::uuid;
 begin
  perform pg_temp.test_commit_app(conflicting_id,1,jsonb_build_array(jsonb_build_object('applicability_group',1,'context_kind','DAYCARE','context_id',daycare)),'isolated-app-conflict-0001',100);
  raise exception 'expected overlapping applicability rejection';
 exception when sqlstate '23P01' then null;end;

 calc:=public.portal_mcp_execute_calculation_rule('STAFFING_RATIO','2099-02-01',jsonb_build_object('daycare_id',daycare),
  '{"children_count":12}'::jsonb,'{"fixture":"rollback-only","source_version":1}'::jsonb,'CURRENT_RECALCULATION');
 if calc->>'status'<>'CALCULATED' or (calc#>>'{final_output,required_staff}')::numeric<>2.5 or calc->>'calculation_rule_id'<>specific_id::text then raise exception 'specific selection failed %',calc;end if;

 replacement:=pg_temp.test_commit_rule(jsonb_build_object('operation','REPLACE','expected_version',1,'rule',jsonb_build_object(
  'rule_key',specific#>>'{rule,rule_key}','rule_type','STAFFING_RATIO','display_name','synthetic daycare exception v2','instruction','Synthetic replacement staffing instruction',
  'definition',jsonb_build_object('children_per_staff',4,'rounding_method','CEIL_HALF','minimum_staff',1),
  'effective_from','2099-03-01','handler_code','STAFFING_RATIO_V1','source_evidence',jsonb_build_object('fixture','rollback-only','revision',2)),
  'applicability','[]'::jsonb),'isolated-rule-specific-replace-0001');
 replacement_id:=(replacement#>>'{rule,calculation_rule_id}')::uuid;
 if (replacement#>>'{rule,version}')::int<>2 or replacement#>>'{rule,previous_version_id}'<>specific_id::text then raise exception 'replacement history missing %',replacement;end if;
 if (select lifecycle_status from public.calculation_rules where calculation_rule_id=specific_id)<>'REPLACED' then raise exception 'old version was not preserved as replaced';end if;
 perform pg_temp.test_commit_app(replacement_id,2,jsonb_build_array(jsonb_build_object('applicability_group',1,'context_kind','DAYCARE','context_id',daycare)),'isolated-app-specific-replace-0001',100);
 replacement_calc:=public.portal_mcp_execute_calculation_rule('STAFFING_RATIO','2099-03-01',jsonb_build_object('daycare_id',daycare),
  '{"children_count":12}'::jsonb,'{"fixture":"rollback-only","source_version":2}'::jsonb,'CURRENT_RECALCULATION');
 if (replacement_calc#>>'{final_output,required_staff}')::numeric<>3 or replacement_calc->>'calculation_rule_id'<>replacement_id::text then raise exception 'replacement selection failed %',replacement_calc;end if;
 readback:=public.portal_mcp_read_calculation_result((calc->>'calculation_result_id')::uuid);
 if readback->>'calculation_rule_id'<>specific_id::text or (readback#>>'{original_output,required_staff}')::numeric<>2.5 then raise exception 'historical calculation was not reproducible %',readback;end if;

 budget:=pg_temp.test_commit_rule(jsonb_build_object('operation','CREATE','rule',jsonb_build_object(
  'rule_type','BUDGET_PARAMETER','display_name','synthetic budget parameter','instruction','Synthetic per-unit budget parameter',
  'definition',jsonb_build_object('amount',12.5,'calculation_method','PER_UNIT'),'effective_from','2099-01-01',
  'handler_code','BUDGET_PARAMETER_V1','source_evidence',jsonb_build_object('fixture','rollback-only')),'applicability','[]'::jsonb),'isolated-rule-budget-0001');
 budget_id:=(budget#>>'{rule,calculation_rule_id}')::uuid;
 perform pg_temp.test_commit_app(budget_id,1,'[]'::jsonb,'isolated-app-budget-0001',100);
 budget_calc:=public.portal_mcp_execute_calculation_rule('BUDGET_PARAMETER','2099-02-01','{}'::jsonb,'{"quantity":4}'::jsonb,'{"fixture":"rollback-only"}'::jsonb,'HISTORICAL_LOCKED');
 if (budget_calc#>>'{final_output,budget_amount}')::numeric<>50 then raise exception 'budget handler failed %',budget_calc;end if;
 budget_specific:=pg_temp.test_commit_rule(jsonb_build_object('operation','CREATE','rule',jsonb_build_object(
  'rule_type','BUDGET_PARAMETER','display_name','synthetic age/category budget exception','instruction','Synthetic age and category specific budget parameter',
  'definition',jsonb_build_object('amount',20,'calculation_method','PER_UNIT'),'effective_from','2099-01-01',
  'handler_code','BUDGET_PARAMETER_V1','source_evidence',jsonb_build_object('fixture','rollback-only')),'applicability','[]'::jsonb),'isolated-rule-budget-specific-0001');
 budget_specific_id:=(budget_specific#>>'{rule,calculation_rule_id}')::uuid;
 perform pg_temp.test_commit_app(budget_specific_id,1,jsonb_build_array(
  jsonb_build_object('applicability_group',1,'context_kind','AGE_GROUP','context_id',age_group),
  jsonb_build_object('applicability_group',1,'context_kind','BUDGET_CATEGORY','context_id',budget_category)
 ),'isolated-app-budget-specific-0001',100);
 budget_specific_calc:=public.portal_mcp_execute_calculation_rule('BUDGET_PARAMETER','2099-02-01',jsonb_build_object('age_group_id',age_group,'budget_category_id',budget_category),'{"quantity":4}'::jsonb,'{"fixture":"rollback-only"}'::jsonb,'CURRENT_RECALCULATION');
 if (budget_specific_calc#>>'{final_output,budget_amount}')::numeric<>80 or budget_specific_calc->>'calculation_rule_id'<>budget_specific_id::text then raise exception 'age/category specific precedence failed %',budget_specific_calc;end if;
 budget_calc:=public.portal_mcp_execute_calculation_rule('BUDGET_PARAMETER','2099-02-01',jsonb_build_object('age_group_id',age_group),'{"quantity":4}'::jsonb,'{"fixture":"rollback-only"}'::jsonb,'CURRENT_RECALCULATION');
 if (budget_calc#>>'{final_output,budget_amount}')::numeric<>50 or budget_calc->>'calculation_rule_id'<>budget_id::text then raise exception 'broad fallback after partial context failed %',budget_calc;end if;

 stored_only:=pg_temp.test_commit_rule(jsonb_build_object('operation','CREATE','rule',jsonb_build_object(
  'rule_type','OPERATIONAL_PROCEDURE','display_name','synthetic stored instruction','instruction','Synthetic instruction without implementation',
  'definition','{}'::jsonb,'effective_from','2099-01-01','source_evidence',jsonb_build_object('fixture','rollback-only')),'applicability','[]'::jsonb),'isolated-rule-stored-0001');
 stored_id:=(stored_only#>>'{rule,calculation_rule_id}')::uuid;
 perform pg_temp.test_commit_app(stored_id,1,'[]'::jsonb,'isolated-app-stored-0001',100);
 if public.portal_mcp_resolve_calculation_rule('OPERATIONAL_PROCEDURE','2099-02-01','{}'::jsonb)->>'status'<>'UNSUPPORTED_HANDLER' then raise exception 'stored-only truth failed';end if;
 if public.portal_mcp_resolve_calculation_rule('CLASSIFICATION','2099-02-01','{}'::jsonb)->>'status'<>'MISSING_RULE' then raise exception 'missing rule did not fail closed';end if;

 override_preview:=public.portal_mcp_preview_rule_override(jsonb_build_object(
  'calculation_result_id',calc->>'calculation_result_id','expected_result_version',1,
  'adjusted_output',jsonb_build_object('required_staff',3),'justification','Synthetic justified one-result adjustment',
  'scope',calc->'runtime_context','effective_from','2099-02-01','effective_to','2099-02-01',
  'source_evidence',jsonb_build_object('fixture','rollback-only')),'isolated-override-0001');
 override_approval:=public.portal_mcp_request_rule_override_approval((override_preview->>'batch_id')::uuid,'synthetic justified override');
 override_commit:=public.portal_mcp_commit_rule_override((override_preview->>'batch_id')::uuid,(override_approval->>'approval_id')::uuid,2);
 readback:=public.portal_mcp_read_calculation_result((calc->>'calculation_result_id')::uuid);
 if (readback#>>'{original_output,required_staff}')::numeric<>2.5 or (readback#>>'{adjusted_output,required_staff}')::numeric<>3 or (readback#>>'{final_output,required_staff}')::numeric<>3 then raise exception 'override readback failed %',readback;end if;

 begin
  perform public.portal_mcp_preview_rule_override(jsonb_build_object('calculation_result_id',calc->>'calculation_result_id','expected_result_version',1,'adjusted_output','{"required_staff":4}'::jsonb,'justification','Synthetic wrong scope rejection','scope','{}'::jsonb,'effective_from','2099-02-01','effective_to','2099-02-01','source_evidence','{"fixture":"rollback-only"}'::jsonb),'isolated-override-bad-0001');
  raise exception 'expected out-of-scope override rejection';
 exception when sqlstate '22023' then null;end;

 perform set_config('request.jwt.claim.sub',random_user::text,true);
 begin perform public.portal_mcp_list_calculation_rules(null,null);raise exception 'expected unauthorized read rejection';exception when sqlstate '42501' then null;end;
end $$;

rollback;
