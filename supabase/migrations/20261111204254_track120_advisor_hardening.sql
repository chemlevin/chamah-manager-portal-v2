alter function private.portal_mcp_entity_meta(text) set search_path=public,private,pg_temp;

create or replace function private.portal_mcp_match_operational_row(p_row jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare e text:=p_row->>'entity'; v jsonb:=p_row->'values'; found jsonb; matches integer:=0;
begin
 if nullif(p_row->>'record_id','') is not null then
  return p_row;
 end if;
 if e='employees' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.employees t where (nullif(v->>'employee_code','') is not null and t.employee_code=v->>'employee_code') or (nullif(v->>'national_id','') is not null and t.national_id=v->>'national_id');
 elsif e='employments' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.employments t where t.employee_id=(v->>'employee_id')::uuid and t.employment_start_date=(v->>'employment_start_date')::date;
 elsif e='employee_assignments' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.employee_assignments t where t.employment_id=(v->>'employment_id')::uuid and t.effective_from=(v->>'effective_from')::date and t.daycare_id is not distinct from nullif(v->>'daycare_id','')::uuid and t.role_id=(v->>'role_id')::uuid;
 elsif e='employee_certificates' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.employee_certificates t where t.employee_id=(v->>'employee_id')::uuid and t.certificate_type_id=(v->>'certificate_type_id')::uuid and t.issued_on is not distinct from nullif(v->>'issued_on','')::date;
 elsif e='employee_pay_terms' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.employee_pay_terms t where t.employee_id=(v->>'employee_id')::uuid and t.valid_from=(v->>'valid_from')::date;
 elsif e='employee_compensation_eligibility' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.employee_compensation_eligibility t where t.employment_id=(v->>'employment_id')::uuid and t.compensation_factor_id=(v->>'compensation_factor_id')::uuid and t.effective_from=(v->>'effective_from')::date;
 elsif e='employee_leave_periods' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.employee_leave_periods t where t.employment_id=(v->>'employment_id')::uuid and t.leave_type=v->>'leave_type' and t.starts_on=(v->>'starts_on')::date;
 elsif e='payroll_records' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.payroll_records t where (nullif(v->>'source_record_identifier','') is not null and t.source_record_identifier=v->>'source_record_identifier') or (nullif(v->>'sheet_payroll_row_id','') is not null and t.sheet_payroll_row_id=v->>'sheet_payroll_row_id');
 elsif e='payroll_allocations' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.payroll_allocations t where t.payroll_record_id=(v->>'payroll_record_id')::uuid and t.allocation_unit_id=(v->>'allocation_unit_id')::uuid and t.role_id is not distinct from nullif(v->>'role_id','')::uuid;
 elsif e='bank_allocations' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.bank_allocations t where t.bank_transaction_id=(v->>'bank_transaction_id')::uuid and t.allocation_unit_id=(v->>'allocation_unit_id')::uuid and t.budget_month=(v->>'budget_month')::date;
 elsif e='suppliers' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.suppliers t where (nullif(v->>'supplier_code','') is not null and t.supplier_code=v->>'supplier_code') or (nullif(v->>'registration_number','') is not null and t.registration_number=v->>'registration_number');
 elsif e='payment_requests' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.payment_requests t where (nullif(v->>'idempotency_key','') is not null and t.idempotency_key=v->>'idempotency_key') or (nullif(v->>'invoice_number','') is not null and t.invoice_number=v->>'invoice_number' and t.supplier_id=(v->>'supplier_id')::uuid);
 end if;
 if matches>1 then return p_row||jsonb_build_object('_match_conflict','AMBIGUOUS_STABLE_IDENTIFIERS'); end if;
 if matches=1 then return p_row||jsonb_build_object('record_id',found->>(private.portal_mcp_entity_meta(e)->>'id'),'expected_row_version',found->'row_version','_matched_record',found); end if;
 return p_row;
end $$;
revoke all on function private.portal_mcp_match_operational_row(jsonb) from public,anon,authenticated;

drop aggregate if exists private.max(jsonb);
drop function if exists private.portal_jsonb_first(jsonb,jsonb);
