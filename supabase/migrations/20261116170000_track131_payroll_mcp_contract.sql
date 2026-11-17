-- TRACK131: expose and normalize the canonical payroll_records MCP contract.
-- Preview remains Director-only, approval-bound and non-writing.

alter function private.portal_mcp_entity_meta(text) rename to portal_mcp_entity_meta_base;

create or replace function private.portal_mcp_entity_meta(p_entity text)
returns jsonb language sql immutable set search_path=public,private,pg_temp as $$
 select case p_entity
  when 'payroll_records' then jsonb_build_object(
    'table','payroll_records','id','payroll_record_id',
    'stable',jsonb_build_array('source_record_identifier','sheet_payroll_row_id'),
    'stable_mode','ANY',
    'writable',jsonb_build_array(
      'employee_id','employee_code','employment_id','payroll_month',
      'source_employee_identifier','source_record_identifier','sheet_payroll_row_id',
      'gross_pay','gross','actual_gross','actual_net','net','deductions',
      'employer_contributions','employer_cost','total_employer_cost',
      'regular_hours','overtime_hours','hours_125','hours_150','vacation_hours',
      'sick_hours','other_absence_hours','actual_hours','work_days',
      'unpaid_absence_hours','travel_reimbursement','bonus_amount','adjustment_amount',
      'previous_month_adjustments','payroll_components','calculated_components',
      'source_payload','notes','actual_status','actual_notes','monthly_overrides','monthly_inputs',
      'allocation_unit_id','daycare_id','role_id'),
    'required',jsonb_build_array('payroll_month','employer_cost'),
    'relationship',jsonb_build_object('canonical_employee_id','employee_id','matching_only','employee_code'))
  else private.portal_mcp_entity_meta_base(p_entity)
 end;
$$;

create or replace function private.portal_mcp_match_operational_row_v2(p_row jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare e text:=p_row->>'entity'; v jsonb:=p_row->'values'; employee jsonb; employment uuid; code text; employee_id uuid;
begin
 if e <> 'payroll_records' or nullif(p_row->>'record_id','') is not null then
  return case when e='payroll_records' then private.portal_mcp_match_operational_row(p_row) else p_row end;
 end if;
 code:=nullif(v->>'employee_code','');
 employee_id:=nullif(v->>'employee_id','')::uuid;
 if employee_id is null and code is not null then
  select to_jsonb(x) into employee from public.employees x where x.employee_code=code;
  if employee is null then return p_row||jsonb_build_object('_match_conflict','EMPLOYEE_CODE_NOT_FOUND'); end if;
  employee_id:=(employee->>'employee_id')::uuid;
 end if;
 if employee_id is not null then
  select e.employment_id into employment
  from public.employments e
  where e.employee_id=employee_id and coalesce(e.employment_status,'ACTIVE')='ACTIVE'
  order by e.employment_start_date desc limit 1;
  if employment is null and nullif(v->>'employment_id','') is null then
   return p_row||jsonb_build_object('_match_conflict','ACTIVE_EMPLOYMENT_NOT_FOUND');
  end if;
 end if;
 v:=v||jsonb_build_object('employee_id',employee_id);
 if nullif(v->>'employment_id','') is null and employment is not null then v:=v||jsonb_build_object('employment_id',employment); end if;
 v:=v||jsonb_build_object(
   'gross_pay',coalesce(v->'gross_pay',v->'gross'),
   'actual_net',coalesce(v->'actual_net',v->'net'),
   'employer_cost',coalesce(v->'employer_cost',v->'total_employer_cost'),
   'calculated_components',coalesce(v->'calculated_components',jsonb_build_object()) ||
     case when v?'payroll_components' or v?'employer_contributions' then
       jsonb_build_object('payroll_components',coalesce(v->'payroll_components','{}'::jsonb), 'employer_contributions',coalesce(v->'employer_contributions','{}'::jsonb)) else '{}'::jsonb end,
   'monthly_inputs',coalesce(v->'monthly_inputs',jsonb_build_object()) ||
     case when v?'deductions' or v?'previous_month_adjustments' then
       jsonb_build_object('deductions',coalesce(v->'deductions','{}'::jsonb), 'previous_month_adjustments',coalesce(v->'previous_month_adjustments','{}'::jsonb)) else '{}'::jsonb end,
   'source_payload',coalesce(v->'source_payload','{}'::jsonb) || jsonb_build_object('employee_id',employee_id,'employee_code',code));
 return private.portal_mcp_match_operational_row(p_row||jsonb_build_object('values',v));
end $$;

revoke all on function private.portal_mcp_entity_meta(text),private.portal_mcp_entity_meta_base(text),private.portal_mcp_match_operational_row_v2(jsonb) from public,anon,authenticated;
