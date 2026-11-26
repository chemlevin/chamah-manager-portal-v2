-- A component is identified by the pair source_system + source_record_id.
create or replace function private.portal_mcp_entity_meta(p_entity text)
returns jsonb language sql immutable set search_path=public,private,pg_temp as $$
 select case when p_entity='child_charge_components' then
 '{"table":"child_charge_components","id":"child_charge_component_id","stable":["source_system","source_record_id"],"generic":true,"required":["child_id","daycare_id","billing_month","component_type","description","amount_charged","amount_matched","amount_remaining","source_system","source_file","source_row_number","source_record_id"],"writable":["child_id","daycare_id","daycare_billing_record_id","billing_month","component_type","description","funding_program","amount_charged","amount_matched","amount_remaining","source_system","source_file","source_row_number","source_record_id","source_payload"]}'::jsonb
 else private.portal_mcp_entity_meta_charge_components_v1(p_entity) end $$;