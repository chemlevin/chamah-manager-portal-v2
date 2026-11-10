-- TRACK112: Director-only operational data management readiness.
-- Existing domain tables remain canonical. Missing domains are reported, never simulated.

insert into public.portal_actions(action_code,display_name,resource_type,action_kind,requires_approval)
values
 ('DATA.READ','קריאת נתונים תפעוליים','OPERATIONAL_DATA','READ',false),
 ('DATA.ANALYZE','ניתוח נתונים תפעוליים','OPERATIONAL_DATA','READ',false),
 ('EMPLOYEE.CREATE','יצירת עובדת','EMPLOYEE','CREATE',false),
 ('EMPLOYEE.UPDATE','עדכון עובדת','EMPLOYEE','UPDATE',false),
 ('EMPLOYEE.IMPORT','ייבוא עובדות','EMPLOYEE_IMPORT','BULK',false)
on conflict(action_code) do update set
 display_name=excluded.display_name,resource_type=excluded.resource_type,
 action_kind=excluded.action_kind,requires_approval=excluded.requires_approval,is_active=true;

insert into public.portal_role_actions(role_code,action_code)
select 'DIRECTOR',v.action_code from (values
 ('DATA.READ'),('DATA.ANALYZE'),('EMPLOYEE.CREATE'),('EMPLOYEE.UPDATE'),('EMPLOYEE.IMPORT')
) v(action_code) on conflict do nothing;

create or replace function private.portal_require_action(p_action_code text)
returns void language plpgsql security definer
set search_path=private,public,pg_temp as $$
begin
 if auth.uid() is null or not private.portal_is_authorized(auth.uid(),p_action_code) then
  raise exception 'permission denied' using errcode='42501';
 end if;
end$$;
revoke all on function private.portal_require_action(text) from public,anon,authenticated;
grant execute on function private.portal_require_action(text) to authenticated;

create or replace function public.portal_mcp_data_capabilities()
returns jsonb language plpgsql security definer
set search_path=public,private,pg_temp as $$
declare result jsonb;
begin
 perform private.portal_require_action('DATA.READ');
 select jsonb_build_object(
  'authorization','DIRECTOR_ONLY',
  'domains',jsonb_build_array(
   jsonb_build_object('domain','employees','status','READ_WRITE_IMPORT','records',(select count(*) from employees),'relationships',jsonb_build_array('employments','employee_assignments','employee_pay_terms','employee_certificates')),
   jsonb_build_object('domain','banking','status','READ_ANALYZE','records',(select count(*) from bank_transactions),'relationships',jsonb_build_array('bank_accounts','bank_allocations','import_batches')),
   jsonb_build_object('domain','payments','status','PARTIAL_READ_ANALYZE','records',(select count(*) from bank_transfers),'note','bank_transfers is a legacy transfer workflow, not a canonical payments aggregate'),
   jsonb_build_object('domain','payroll','status','READ_ANALYZE','records',(select count(*) from payroll_records)),
   jsonb_build_object('domain','children','status','MISSING','records',0,'note','monthly_enrollment stores aggregate quantities only'),
   jsonb_build_object('domain','parents','status','MISSING','records',0),
   jsonb_build_object('domain','suppliers','status','MISSING','records',0),
   jsonb_build_object('domain','collections','status','MISSING','records',0)
  ),
  'bulk_import',jsonb_build_object('employees','SYNCHRONOUS_MAX_100','large_imports','DURABLE_QUEUE_REQUIRED'),
  'verified_at',timezone('utc',now())
 ) into result;
 return result;
end$$;

create or replace function public.portal_mcp_search_operational_data(
 p_domain text,p_search text default null,p_limit integer default 25,p_offset integer default 0
) returns jsonb language plpgsql security definer
set search_path=public,private,pg_temp as $$
declare rows jsonb; total_count bigint; q text:=nullif(btrim(p_search),'');
begin
 perform private.portal_require_action('DATA.READ');
 if p_domain not in ('employees','banking','payments','payroll') then raise exception 'unsupported domain'; end if;
 if p_limit not between 1 and 100 or p_offset not between 0 and 10000 then raise exception 'invalid pagination'; end if;
 if p_domain='employees' then
  select count(*),coalesce(jsonb_agg(to_jsonb(x) order by x.last_name,x.first_name),'[]'::jsonb) into total_count,rows from (
   select e.employee_id,e.employee_code,e.first_name,e.last_name,e.phone,e.email,e.lifecycle_status,e.row_version,e.updated_at
   from employees e where q is null or concat_ws(' ',e.employee_code,e.first_name,e.last_name,e.phone,e.email) ilike '%'||q||'%'
   order by e.last_name,e.first_name limit p_limit offset p_offset
  ) x;
  select count(*) into total_count from employees e where q is null or concat_ws(' ',e.employee_code,e.first_name,e.last_name,e.phone,e.email) ilike '%'||q||'%';
 elsif p_domain='banking' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.transaction_date desc,x.bank_transaction_id),'[]'::jsonb) into rows from (
   select t.bank_transaction_id,t.transaction_date,t.description,t.reference_number,t.amount,a.display_name bank_account,t.row_version
   from bank_transactions t join bank_accounts a using(bank_account_id)
   where q is null or concat_ws(' ',t.description,t.reference_number,a.display_name) ilike '%'||q||'%'
   order by t.transaction_date desc,t.bank_transaction_id limit p_limit offset p_offset
  ) x;
  select count(*) into total_count from bank_transactions t join bank_accounts a using(bank_account_id) where q is null or concat_ws(' ',t.description,t.reference_number,a.display_name) ilike '%'||q||'%';
 elsif p_domain='payments' then
  select coalesce(jsonb_agg(to_jsonb(x) order by x.transfer_number desc),'[]'::jsonb) into rows from (
   select bank_transfer_id,transfer_number,name,amount,status,execution_date,lifecycle_status,row_version from bank_transfers
   where q is null or concat_ws(' ',name,bank,account_holder,status) ilike '%'||q||'%'
   order by transfer_number desc limit p_limit offset p_offset
  ) x;
  select count(*) into total_count from bank_transfers where q is null or concat_ws(' ',name,bank,account_holder,status) ilike '%'||q||'%';
 else
  select coalesce(jsonb_agg(to_jsonb(x) order by x.payroll_month desc,x.payroll_record_id),'[]'::jsonb) into rows from (
   select p.payroll_record_id,p.payroll_month,p.employee_name_raw,p.employer_cost,p.employee_match_status,p.row_status,p.row_version
   from payroll_records p where q is null or concat_ws(' ',p.employee_name_raw,p.employee_number_raw,p.employee_match_status,p.row_status) ilike '%'||q||'%'
   order by p.payroll_month desc,p.payroll_record_id limit p_limit offset p_offset
  ) x;
  select count(*) into total_count from payroll_records p where q is null or concat_ws(' ',p.employee_name_raw,p.employee_number_raw,p.employee_match_status,p.row_status) ilike '%'||q||'%';
 end if;
 return jsonb_build_object('domain',p_domain,'total',total_count,'limit',p_limit,'offset',p_offset,'rows',coalesce(rows,'[]'::jsonb),'verified_at',timezone('utc',now()));
end$$;

create or replace function public.portal_mcp_find_employee_duplicates(p_employee jsonb)
returns jsonb language plpgsql security definer
set search_path=public,private,pg_temp as $$
declare code text:=nullif(btrim(p_employee->>'employee_code'),''); nid text:=nullif(btrim(p_employee->>'national_id'),''); email_value text:=lower(nullif(btrim(p_employee->>'email'),'')); phone_value text:=regexp_replace(coalesce(p_employee->>'phone',''),'\D','','g'); matches jsonb;
begin
 perform private.portal_require_action('DATA.READ');
 select coalesce(jsonb_agg(jsonb_build_object('employee_id',employee_id,'employee_code',employee_code,'name',first_name||' '||last_name,'match_fields',array_remove(array[
  case when code is not null and employee_code=code then 'employee_code' end,
  case when nid is not null and national_id=nid then 'national_id' end,
  case when email_value is not null and lower(email)=email_value then 'email' end,
  case when phone_value<>'' and regexp_replace(coalesce(phone,''),'\D','','g')=phone_value then 'phone' end
 ],null))),'[]'::jsonb) into matches
 from employees where (code is not null and employee_code=code) or (nid is not null and national_id=nid) or (email_value is not null and lower(email)=email_value) or (phone_value<>'' and regexp_replace(coalesce(phone,''),'\D','','g')=phone_value);
 return jsonb_build_object('duplicate_count',jsonb_array_length(matches),'matches',matches,'verified_at',timezone('utc',now()));
end$$;

create or replace function public.portal_mcp_create_employee(p_employee jsonb)
returns jsonb language plpgsql security definer
set search_path=public,private,pg_temp as $$
declare saved employees%rowtype; code text:=nullif(btrim(p_employee->>'employee_code'),''); first_value text:=nullif(btrim(p_employee->>'first_name'),''); last_value text:=nullif(btrim(p_employee->>'last_name'),''); email_value text:=nullif(btrim(p_employee->>'email'),'');
begin
 perform private.portal_require_action('EMPLOYEE.CREATE');
 if code is null or first_value is null or last_value is null then raise exception 'employee_code, first_name and last_name are required'; end if;
 if length(code)>50 or length(first_value)>100 or length(last_value)>100 then raise exception 'employee field exceeds limit'; end if;
 if email_value is not null and email_value !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
 if exists(select 1 from employees where employee_code=code or (nullif(btrim(p_employee->>'national_id'),'') is not null and national_id=nullif(btrim(p_employee->>'national_id'),''))) then raise exception 'duplicate employee identity'; end if;
 insert into employees(employee_code,national_id,first_name,last_name,phone,email,birth_date,notes,created_by_user_id,updated_by_user_id)
 values(code,nullif(btrim(p_employee->>'national_id'),''),first_value,last_value,nullif(btrim(p_employee->>'phone'),''),email_value,nullif(p_employee->>'birth_date','')::date,nullif(btrim(p_employee->>'notes'),''),auth.uid(),auth.uid()) returning * into saved;
 insert into audit_events(entity_type,entity_id,operation,new_values,source_type,actor_user_id) values('employees',saved.employee_id,'MCP_CREATE',to_jsonb(saved),'MCP',auth.uid());
 insert into portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision) values(auth.uid(),'MCP','EMPLOYEE.CREATE','EMPLOYEE',saved.employee_id,'SUCCESS');
 return jsonb_build_object('status','CREATED','employee_id',saved.employee_id,'row_version',saved.row_version,'updated_at',saved.updated_at,'verified',exists(select 1 from employees where employee_id=saved.employee_id));
end$$;

create or replace function public.portal_mcp_update_employee(p_employee_id uuid,p_patch jsonb,p_expected_row_version integer)
returns jsonb language plpgsql security definer
set search_path=public,private,pg_temp as $$
declare before_row employees%rowtype; saved employees%rowtype;
begin
 perform private.portal_require_action('EMPLOYEE.UPDATE');
 if p_patch - array['first_name','last_name','phone','email','birth_date','notes','lifecycle_status'] <> '{}'::jsonb then raise exception 'unsupported employee field'; end if;
 select * into before_row from employees where employee_id=p_employee_id for update;
 if not found then raise exception 'employee not found'; end if;
 if before_row.row_version<>p_expected_row_version then raise exception 'employee changed; refresh required'; end if;
 if p_patch ? 'email' and nullif(btrim(p_patch->>'email'),'') is not null and (p_patch->>'email') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email'; end if;
 if p_patch ? 'lifecycle_status' and p_patch->>'lifecycle_status' not in ('ACTIVE','INACTIVE','ARCHIVED') then raise exception 'invalid lifecycle status'; end if;
 update employees set
  first_name=case when p_patch?'first_name' then nullif(btrim(p_patch->>'first_name'),'') else first_name end,
  last_name=case when p_patch?'last_name' then nullif(btrim(p_patch->>'last_name'),'') else last_name end,
  phone=case when p_patch?'phone' then nullif(btrim(p_patch->>'phone'),'') else phone end,
  email=case when p_patch?'email' then nullif(btrim(p_patch->>'email'),'') else email end,
  birth_date=case when p_patch?'birth_date' then nullif(p_patch->>'birth_date','')::date else birth_date end,
  notes=case when p_patch?'notes' then nullif(btrim(p_patch->>'notes'),'') else notes end,
  lifecycle_status=coalesce(p_patch->>'lifecycle_status',lifecycle_status),updated_by_user_id=auth.uid(),row_version=row_version+1
 where employee_id=p_employee_id returning * into saved;
 insert into audit_events(entity_type,entity_id,operation,previous_values,new_values,source_type,actor_user_id) values('employees',saved.employee_id,'MCP_UPDATE',to_jsonb(before_row),to_jsonb(saved),'MCP',auth.uid());
 insert into portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision) values(auth.uid(),'MCP','EMPLOYEE.UPDATE','EMPLOYEE',saved.employee_id,'SUCCESS');
 return jsonb_build_object('status','UPDATED','employee_id',saved.employee_id,'row_version',saved.row_version,'updated_at',saved.updated_at,'verified',exists(select 1 from employees where employee_id=saved.employee_id and row_version=saved.row_version));
end$$;

create or replace function public.portal_mcp_import_employees(p_rows jsonb,p_source_name text default 'MCP')
returns jsonb language plpgsql security definer
set search_path=public,private,pg_temp as $$
declare item jsonb; result jsonb; results jsonb:='[]'::jsonb; created_count int:=0; failed_count int:=0;
begin
 perform private.portal_require_action('EMPLOYEE.IMPORT');
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 100 then raise exception 'employee import requires 1-100 rows'; end if;
 for item in select value from jsonb_array_elements(p_rows) loop
  begin result:=public.portal_mcp_create_employee(item); created_count:=created_count+1; results:=results||jsonb_build_array(result);
  exception when others then failed_count:=failed_count+1; results:=results||jsonb_build_array(jsonb_build_object('status','FAILED','employee_code',item->>'employee_code','error',sqlerrm)); end;
 end loop;
 insert into portal_authorization_audit(actor_user_id,channel,action_code,resource_type,decision,detail) values(auth.uid(),'MCP','EMPLOYEE.IMPORT','EMPLOYEE_IMPORT','SUCCESS',jsonb_build_object('source_name',left(coalesce(p_source_name,'MCP'),120),'created',created_count,'failed',failed_count));
 return jsonb_build_object('status',case when failed_count=0 then 'COMPLETED' else 'COMPLETED_WITH_ERRORS' end,'created',created_count,'failed',failed_count,'rows',results,'verified_count',(select count(*) from employees where employee_id in (select (value->>'employee_id')::uuid from jsonb_array_elements(results) where value->>'status'='CREATED')));
end$$;

create or replace function public.portal_mcp_analyze_operational_data(p_domain text)
returns jsonb language plpgsql security definer
set search_path=public,private,pg_temp as $$
declare result jsonb;
begin
 perform private.portal_require_action('DATA.ANALYZE');
 if p_domain='employees' then select jsonb_build_object('total',count(*),'active',count(*) filter(where lifecycle_status='ACTIVE'),'missing_email',count(*) filter(where email is null),'missing_phone',count(*) filter(where phone is null)) into result from employees;
 elsif p_domain='banking' then select jsonb_build_object('transactions',count(*),'amount_total',coalesce(sum(amount),0),'unallocated',count(*) filter(where not exists(select 1 from bank_allocations a where a.bank_transaction_id=t.bank_transaction_id))) into result from bank_transactions t;
 elsif p_domain='payments' then select jsonb_build_object('transfers',count(*),'amount_total',coalesce(sum(amount),0),'pending',count(*) filter(where status='PENDING'),'problems',count(*) filter(where status='PROBLEM')) into result from bank_transfers;
 elsif p_domain='payroll' then select jsonb_build_object('records',count(*),'employer_cost_total',coalesce(sum(employer_cost),0),'unresolved',count(*) filter(where employee_match_status in ('MISSING','UNRESOLVED'))) into result from payroll_records;
 else raise exception 'unsupported domain'; end if;
 return result||jsonb_build_object('domain',p_domain,'verified_at',timezone('utc',now()));
end$$;

revoke all on function public.portal_mcp_data_capabilities(),public.portal_mcp_search_operational_data(text,text,integer,integer),public.portal_mcp_find_employee_duplicates(jsonb),public.portal_mcp_create_employee(jsonb),public.portal_mcp_update_employee(uuid,jsonb,integer),public.portal_mcp_import_employees(jsonb,text),public.portal_mcp_analyze_operational_data(text) from public,anon;
grant execute on function public.portal_mcp_data_capabilities(),public.portal_mcp_search_operational_data(text,text,integer,integer),public.portal_mcp_find_employee_duplicates(jsonb),public.portal_mcp_create_employee(jsonb),public.portal_mcp_update_employee(uuid,jsonb,integer),public.portal_mcp_import_employees(jsonb,text),public.portal_mcp_analyze_operational_data(text) to authenticated;
