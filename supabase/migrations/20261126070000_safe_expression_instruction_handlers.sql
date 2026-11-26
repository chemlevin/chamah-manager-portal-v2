insert into public.calculation_rule_handlers(handler_code,rule_type,contract_version,implementation_status,enforcement_status,operation_code,input_contract,output_contract)
values
 ('SAFE_EXPRESSION_DEPENDENCY_V1','DEPENDENCY',1,'IMPLEMENTED','ENFORCED','SAFE_EXPRESSION','{"ast_version":1,"max_depth":16}'::jsonb,'{"dynamic_output_field":true}'::jsonb),
 ('SAFE_EXPRESSION_VALIDATION_V1','VALIDATION',1,'IMPLEMENTED','ENFORCED','SAFE_EXPRESSION','{"ast_version":1,"max_depth":16}'::jsonb,'{"dynamic_output_field":true}'::jsonb),
 ('SAFE_EXPRESSION_CLASSIFICATION_V1','CLASSIFICATION',1,'IMPLEMENTED','ENFORCED','SAFE_EXPRESSION','{"ast_version":1,"max_depth":16}'::jsonb,'{"dynamic_output_field":true}'::jsonb),
 ('SAFE_EXPRESSION_PROCEDURE_V1','OPERATIONAL_PROCEDURE',1,'IMPLEMENTED','ENFORCED','SAFE_EXPRESSION','{"ast_version":1,"max_depth":16}'::jsonb,'{"dynamic_output_field":true}'::jsonb)
on conflict(handler_code) do update set
 contract_version=excluded.contract_version,implementation_status=excluded.implementation_status,
 enforcement_status=excluded.enforcement_status,operation_code=excluded.operation_code,
 input_contract=excluded.input_contract,output_contract=excluded.output_contract;
