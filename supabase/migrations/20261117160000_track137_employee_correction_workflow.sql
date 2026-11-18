-- TRACK137: approval-bound employee corrections remain on the operational MCP path.
-- Identity changes are explicit, conflict-checked, reversible lifecycle changes;
-- payroll rows are intentionally not touched.

create or replace function private.portal_mcp_apply_employee_correction(p_row jsonb)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v jsonb:=p_row->'values'; rid uuid:=nullif(p_row->>'record_id','')::uuid; expected int:=nullif(p_row->>'expected_row_version','')::int; result jsonb; existing public.employees;
begin
 if rid is null then raise exception 'Employee corrections require an existing employee record' using errcode='22023'; end if;
 select * into existing from public.employees where employee_id=rid for update;
 if existing.employee_id is null or existing.row_version<>expected then raise exception 'Concurrent employee correction rejected' using errcode='40001'; end if;
 if v ? 'employee_code' and exists(select 1 from public.employees where employee_code=v->>'employee_code' and employee_id<>rid) then raise exception 'Employee code conflict' using errcode='23505'; end if;
 if v ? 'national_id' and exists(select 1 from public.employees where national_id=nullif(v->>'national_id','') and employee_id<>rid) then raise exception 'National ID conflict' using errcode='23505'; end if;
 update public.employees set employee_code=case when v?'employee_code' then v->>'employee_code' else employee_code end,
  national_id=case when v?'national_id' then nullif(v->>'national_id','') else national_id end,
  first_name=case when v?'first_name' then v->>'first_name' else first_name end,
  last_name=case when v?'last_name' then v->>'last_name' else last_name end,
  phone=case when v?'phone' then nullif(v->>'phone','') else phone end,
  email=case when v?'email' then nullif(v->>'email','') else email end,
  birth_date=case when v?'birth_date' then nullif(v->>'birth_date','')::date else birth_date end,
  lifecycle_status=case when v?'lifecycle_status' then v->>'lifecycle_status' else lifecycle_status end,
  notes=case when v?'notes' then nullif(v->>'notes','') else notes end,
  manager_employee_id=case when v?'manager_employee_id' then nullif(v->>'manager_employee_id','')::uuid else manager_employee_id end,
  updated_by_user_id=auth.uid()
  where employee_id=rid and row_version=expected returning to_jsonb(employees.*) into result;
 if result is null then raise exception 'Employee correction was not applied' using errcode='40001'; end if;
 return result;
end $$;
revoke all on function private.portal_mcp_apply_employee_correction(jsonb) from public,anon,authenticated;

create or replace function private.portal_mcp_apply_operational_row_v2(p_row jsonb)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
begin
 if p_row->>'entity'='employees' then return private.portal_mcp_apply_employee_correction(p_row); end if;
 if coalesce((private.portal_mcp_entity_meta(p_row->>'entity')->>'generic')::boolean,false) then return private.portal_mcp_apply_generic_row(p_row); end if;
 return private.portal_mcp_apply_operational_row(p_row);
end $$;
revoke all on function private.portal_mcp_apply_operational_row_v2(jsonb) from public,anon,authenticated;

comment on function private.portal_mcp_apply_employee_correction(jsonb) is 'TRACK137 approved, atomic, reversible employee correction; never changes payroll history';
