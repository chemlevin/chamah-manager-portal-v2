insert into public.calculation_rule_handlers(handler_code,rule_type,contract_version,implementation_status,enforcement_status,operation_code,input_contract,output_contract)
values ('SAFE_EXPRESSION_STAFFING_RATIO_V1','STAFFING_RATIO',1,'IMPLEMENTED','ENFORCED','SAFE_EXPRESSION',jsonb_build_object('ast_version',1,'max_depth',16),jsonb_build_object('dynamic_output_field',true))
on conflict(handler_code) do update set
 contract_version=excluded.contract_version,implementation_status=excluded.implementation_status,
 enforcement_status=excluded.enforcement_status,operation_code=excluded.operation_code,
 input_contract=excluded.input_contract,output_contract=excluded.output_contract;
