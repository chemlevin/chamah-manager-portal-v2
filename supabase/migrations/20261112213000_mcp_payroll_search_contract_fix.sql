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
   select p.payroll_record_id,p.payroll_month,p.source_employee_identifier,p.employer_cost,p.employee_match_status,p.row_status,p.row_version
   from payroll_records p where q is null or concat_ws(' ',p.source_employee_identifier,p.employee_match_status,p.row_status) ilike '%'||q||'%'
   order by p.payroll_month desc,p.payroll_record_id limit p_limit offset p_offset
  ) x;
  select count(*) into total_count from payroll_records p where q is null or concat_ws(' ',p.source_employee_identifier,p.employee_match_status,p.row_status) ilike '%'||q||'%';
 end if;
 return jsonb_build_object('domain',p_domain,'total',total_count,'limit',p_limit,'offset',p_offset,'rows',coalesce(rows,'[]'::jsonb),'verified_at',timezone('utc',now()));
end$$;

revoke all on function public.portal_mcp_search_operational_data(text,text,integer,integer) from public,anon;
grant execute on function public.portal_mcp_search_operational_data(text,text,integer,integer) to authenticated;
