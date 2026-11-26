begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.portal_user_profiles p where p.is_active and private.portal_is_authorized(p.user_id,'RULES.WRITE') limit 1),true);
select set_config('request.jwt.claim.role','authenticated',true);

create or replace function pg_temp.commit_rule(payload jsonb,key text) returns jsonb language plpgsql as $$
declare p jsonb;a jsonb;begin
 p:=public.portal_mcp_preview_calculation_rule(payload,key);
 if p#>>'{validation,valid}'<>'true' then raise exception 'invalid preview %',p;end if;
 a:=public.portal_mcp_request_calculation_rule_approval((p->>'batch_id')::uuid,'rollback-only safe expression approval');
 return public.portal_mcp_commit_rule_instruction((p->>'batch_id')::uuid,(a->>'approval_id')::uuid,2);
end $$;
create or replace function pg_temp.commit_app(rule_id uuid,key text) returns void language plpgsql as $$
declare p jsonb;a jsonb;begin
 p:=public.portal_mcp_preview_rule_applicability(jsonb_build_object('calculation_rule_id',rule_id,'expected_rule_version',1,'effective_from','2099-01-01','effective_to','2099-12-31','rule_priority',100,'conditions','[]'::jsonb,'source_evidence',jsonb_build_object('fixture','rollback-only')),key);
 a:=public.portal_mcp_request_rule_applicability_approval((p->>'batch_id')::uuid,'rollback-only safe expression applicability');
 perform public.portal_mcp_commit_rule_applicability((p->>'batch_id')::uuid,(a->>'approval_id')::uuid,2);
end $$;

do $$
declare staffing jsonb;budget jsonb;staffing_result jsonb;budget_result jsonb;staffing_id uuid;budget_id uuid;
begin
 staffing:=pg_temp.commit_rule(jsonb_build_object('operation','CREATE','rule',jsonb_build_object(
  'rule_type','STAFFING_ROUNDING','display_name','synthetic generic staffing','instruction','Rollback-only staffing arithmetic proof',
  'definition',jsonb_build_object('output_field','required_staff','expression',jsonb_build_object('op','ceil_step','value',jsonb_build_object('op','divide','args',jsonb_build_array(jsonb_build_object('op','input','name','children'),jsonb_build_object('op','input','name','ratio'))),'step',jsonb_build_object('op','const','value',0.5))),
  'effective_from','2099-01-01','handler_code','SAFE_EXPRESSION_STAFFING_V1','source_evidence',jsonb_build_object('fixture','rollback-only')),'applicability','[]'::jsonb),'safe-expression-staffing-1');
 staffing_id:=(staffing#>>'{rule,calculation_rule_id}')::uuid;perform pg_temp.commit_app(staffing_id,'safe-expression-staffing-app-1');
 staffing_result:=public.portal_mcp_execute_calculation_rule('STAFFING_ROUNDING','2099-02-01','{}'::jsonb,'{"children":12,"ratio":5}'::jsonb,'{"fixture":"rollback-only","source":"synthetic staffing"}'::jsonb);
 if staffing_result#>>'{final_output,required_staff}'<>'2.5' then raise exception 'staffing result mismatch %',staffing_result;end if;

 budget:=pg_temp.commit_rule(jsonb_build_object('operation','CREATE','rule',jsonb_build_object(
  'rule_type','BUDGET_FORMULA','display_name','synthetic generic budget','instruction','Rollback-only budget arithmetic proof',
  'definition',jsonb_build_object('output_field','budget_amount','expression',jsonb_build_object('op','multiply','args',jsonb_build_array(jsonb_build_object('op','input','name','quantity'),jsonb_build_object('op','input','name','unit_cost')))),
  'effective_from','2099-01-01','handler_code','SAFE_EXPRESSION_BUDGET_V1','source_evidence',jsonb_build_object('fixture','rollback-only')),'applicability','[]'::jsonb),'safe-expression-budget-1');
 budget_id:=(budget#>>'{rule,calculation_rule_id}')::uuid;perform pg_temp.commit_app(budget_id,'safe-expression-budget-app-1');
 budget_result:=public.portal_mcp_execute_calculation_rule('BUDGET_FORMULA','2099-02-01','{}'::jsonb,'{"quantity":4,"unit_cost":12.5}'::jsonb,'{"fixture":"rollback-only","source":"synthetic budget"}'::jsonb);
 if budget_result#>>'{final_output,budget_amount}'<>'50.0' then raise exception 'budget result mismatch %',budget_result;end if;
 if staffing_result->>'handler_code'<>'SAFE_EXPRESSION_STAFFING_V1' or budget_result->>'handler_code'<>'SAFE_EXPRESSION_BUDGET_V1' then raise exception 'shared handler routing mismatch';end if;
end $$;
rollback;
