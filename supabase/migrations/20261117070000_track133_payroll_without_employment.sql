-- TRACK133: allow historical payroll to link to canonical employees
-- without requiring an employment record when employment dates are unavailable.
-- Payroll remains Director-only, approval-bound, idempotent and auditable.

create or replace function private.portal_mcp_match_operational_row_v2(p_row jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private,pg_temp
as $$
declare
  e text := p_row->>'entity';
  v jsonb := p_row->'values';
  employee jsonb;
  code text;
  employee_id uuid;
begin
  if e <> 'payroll_records' or nullif(p_row->>'record_id','') is not null then
    return case
      when e = 'payroll_records' then private.portal_mcp_match_operational_row(p_row)
      else p_row
    end;
  end if;

  code := nullif(v->>'employee_code','');
  employee_id := nullif(v->>'employee_id','')::uuid;

  if employee_id is null and code is not null then
    select to_jsonb(x)
      into employee
      from public.employees x
     where x.employee_code = code;

    if employee is null then
      return p_row || jsonb_build_object('_match_conflict','EMPLOYEE_CODE_NOT_FOUND');
    end if;

    employee_id := (employee->>'employee_id')::uuid;
  end if;

  if employee_id is null then
    return p_row || jsonb_build_object('_match_conflict','EMPLOYEE_ID_REQUIRED');
  end if;

  v := v
    || jsonb_build_object('employee_id', employee_id)
    || jsonb_build_object(
         'gross_pay', coalesce(v->'gross_pay', v->'gross'),
         'actual_net', coalesce(v->'actual_net', v->'net'),
         'employer_cost', coalesce(v->'employer_cost', v->'total_employer_cost'),
         'calculated_components',
           coalesce(v->'calculated_components', '{}'::jsonb)
           || jsonb_build_object(
                'payroll_components', coalesce(v->'payroll_components', '{}'::jsonb),
                'employer_contributions', coalesce(v->'employer_contributions', '{}'::jsonb)),
         'monthly_inputs',
           coalesce(v->'monthly_inputs', '{}'::jsonb)
           || jsonb_build_object(
                'deductions', coalesce(v->'deductions', '{}'::jsonb),
                'previous_month_adjustments',
                  coalesce(v->'previous_month_adjustments', '{}'::jsonb)),
         'source_payload',
           coalesce(v->'source_payload', '{}'::jsonb)
           || jsonb_build_object(
                'employee_id', employee_id,
                'employee_code', code,
                'employment_link_status', 'NOT_AVAILABLE'));

  return private.portal_mcp_match_operational_row(
    p_row || jsonb_build_object('values', v));
end;
$$;

revoke all on function private.portal_mcp_match_operational_row_v2(jsonb)
from public, anon, authenticated;
