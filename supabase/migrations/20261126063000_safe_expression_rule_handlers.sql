-- A bounded data-driven expression evaluator. It accepts only the documented
-- JSON AST operations below; it never evaluates SQL or user-provided code.
create or replace function private.evaluate_safe_numeric_expression(
  p_expression jsonb,
  p_inputs jsonb,
  p_depth integer default 0
) returns numeric
language plpgsql immutable
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  op text := p_expression->>'op';
  args jsonb := coalesce(p_expression->'args', '[]'::jsonb);
  item jsonb;
  result numeric := 0;
  left_value numeric;
  right_value numeric;
  step_value numeric;
  comparison boolean;
begin
  if p_depth > 16 or jsonb_typeof(p_expression) <> 'object' then
    raise exception 'Invalid or over-depth safe expression' using errcode = '22023';
  end if;
  case op
    when 'const' then return (p_expression->>'value')::numeric;
    when 'input' then
      if coalesce(p_expression->>'name','') !~ '^[a-z][a-z0-9_]{0,63}$'
         or not (p_inputs ? (p_expression->>'name')) then
        raise exception 'Missing or invalid expression input' using errcode = '22023';
      end if;
      return (p_inputs->>(p_expression->>'name'))::numeric;
    when 'add' then
      for item in select value from jsonb_array_elements(args) loop
        result := result + private.evaluate_safe_numeric_expression(item, p_inputs, p_depth + 1);
      end loop;
      return result;
    when 'multiply' then
      result := 1;
      for item in select value from jsonb_array_elements(args) loop
        result := result * private.evaluate_safe_numeric_expression(item, p_inputs, p_depth + 1);
      end loop;
      return result;
    when 'divide' then
      left_value := private.evaluate_safe_numeric_expression(args->0, p_inputs, p_depth + 1);
      right_value := private.evaluate_safe_numeric_expression(args->1, p_inputs, p_depth + 1);
      if right_value = 0 then raise exception 'Division by zero' using errcode = '22012'; end if;
      return left_value / right_value;
    when 'ceil_step' then
      left_value := private.evaluate_safe_numeric_expression(p_expression->'value', p_inputs, p_depth + 1);
      step_value := private.evaluate_safe_numeric_expression(p_expression->'step', p_inputs, p_depth + 1);
      if step_value <= 0 then raise exception 'Invalid rounding step' using errcode = '22023'; end if;
      return ceil(left_value / step_value) * step_value;
    when 'if' then
      left_value := private.evaluate_safe_numeric_expression(p_expression->'condition'->'left', p_inputs, p_depth + 1);
      right_value := private.evaluate_safe_numeric_expression(p_expression->'condition'->'right', p_inputs, p_depth + 1);
      comparison := case p_expression->'condition'->>'compare'
        when 'eq' then left_value = right_value when 'ne' then left_value <> right_value
        when 'gt' then left_value > right_value when 'gte' then left_value >= right_value
        when 'lt' then left_value < right_value when 'lte' then left_value <= right_value
        else null end;
      if comparison is null then raise exception 'Invalid comparison' using errcode = '22023'; end if;
      return private.evaluate_safe_numeric_expression(case when comparison then p_expression->'then' else p_expression->'else' end, p_inputs, p_depth + 1);
    else raise exception 'Unsupported safe expression operation: %', op using errcode = '22023';
  end case;
end $$;

revoke all on function private.evaluate_safe_numeric_expression(jsonb,jsonb,integer) from public, anon, authenticated;

insert into public.calculation_rule_handlers(handler_code,rule_type,contract_version,implementation_status,enforcement_status,operation_code,input_contract,output_contract)
values
 ('SAFE_EXPRESSION_STAFFING_RATIO_V1','STAFFING_RATIO',1,'IMPLEMENTED','ENFORCED','SAFE_EXPRESSION',jsonb_build_object('ast_version',1,'max_depth',16),jsonb_build_object('dynamic_output_field',true)),
 ('SAFE_EXPRESSION_STAFFING_V1','STAFFING_ROUNDING',1,'IMPLEMENTED','ENFORCED','SAFE_EXPRESSION',jsonb_build_object('ast_version',1,'max_depth',16),jsonb_build_object('dynamic_output_field',true)),
 ('SAFE_EXPRESSION_BUDGET_V1','BUDGET_FORMULA',1,'IMPLEMENTED','ENFORCED','SAFE_EXPRESSION',jsonb_build_object('ast_version',1,'max_depth',16),jsonb_build_object('dynamic_output_field',true))
on conflict(handler_code) do update set
 contract_version=excluded.contract_version,implementation_status=excluded.implementation_status,
 enforcement_status=excluded.enforcement_status,operation_code=excluded.operation_code,
 input_contract=excluded.input_contract,output_contract=excluded.output_contract;

create or replace function public.portal_mcp_execute_calculation_rule(p_rule_type text,p_effective_date date,p_runtime_context jsonb,p_inputs jsonb,p_input_source_evidence jsonb,p_result_mode text default 'CURRENT_RECALCULATION')
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare x jsonb;out jsonb;rid uuid;h public.calculation_rule_handlers;n numeric;ratio numeric;minimum_value numeric;field_name text;begin
 x:=public.portal_mcp_resolve_calculation_rule(p_rule_type,p_effective_date,p_runtime_context);if x->>'status'<>'READY' then return x;end if;
 if jsonb_typeof(p_input_source_evidence)<>'object' or p_input_source_evidence='{}'::jsonb then raise exception 'Input source evidence required' using errcode='22023';end if;
 select * into h from public.calculation_rule_handlers where handler_code=x->>'handler_code' and implementation_status='IMPLEMENTED' and enforcement_status='ENFORCED';
 if h.handler_code='STAFFING_RATIO_V1' then n:=(p_inputs->>'children_count')::numeric;ratio:=(x->'definition'->>'children_per_staff')::numeric;minimum_value:=coalesce((x->'definition'->>'minimum_staff')::numeric,0);out:=jsonb_build_object('required_staff',greatest(minimum_value,case x->'definition'->>'rounding_method' when 'CEIL_HALF' then ceil((n/ratio)*2)/2 else ceil(n/ratio) end));
 elsif h.handler_code='BUDGET_PARAMETER_V1' then n:=coalesce((p_inputs->>'quantity')::numeric,0);out:=jsonb_build_object('budget_amount',case x->'definition'->>'calculation_method' when 'FIXED' then (x->'definition'->>'amount')::numeric else n*(x->'definition'->>'amount')::numeric end);
 elsif h.operation_code='SAFE_EXPRESSION' then
   field_name:=x->'definition'->>'output_field';
   if field_name !~ '^[a-z][a-z0-9_]{0,63}$' or jsonb_typeof(x->'definition'->'expression')<>'object' then raise exception 'Invalid safe expression definition' using errcode='22023';end if;
   out:=jsonb_build_object(field_name,private.evaluate_safe_numeric_expression(x->'definition'->'expression',p_inputs,0));
 else return x||jsonb_build_object('status','UNSUPPORTED_HANDLER','implemented',false,'enforced',false);end if;
 insert into public.calculation_rule_results(calculation_rule_id,rule_key,rule_version,applicability_set_id,applicability_group,handler_code,runtime_context,inputs,input_source_evidence,output,method_version,result_mode,created_by_user_id)
 values((x->>'calculation_rule_id')::uuid,(x->>'rule_key')::uuid,(x->>'version')::int,(x->>'applicability_set_id')::uuid,(x->>'applicability_group')::int,h.handler_code,p_runtime_context,p_inputs,p_input_source_evidence,out,h.contract_version,p_result_mode,auth.uid()) returning calculation_result_id into rid;
 return x||jsonb_build_object('status','CALCULATED','calculation_result_id',rid,'runtime_context',p_runtime_context,'inputs',p_inputs,'input_source_evidence',p_input_source_evidence,'original_output',out,'adjusted_output',null,'final_output',out,'calculated_at',now(),'result_mode',p_result_mode);
end $$;

comment on function private.evaluate_safe_numeric_expression(jsonb,jsonb,integer) is
'Bounded numeric JSON AST evaluator. Supported operations: const, input, add, multiply, divide, ceil_step and numeric if/comparison. No SQL, identifiers, functions or arbitrary code are evaluated.';
