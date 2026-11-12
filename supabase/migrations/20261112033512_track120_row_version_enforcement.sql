create or replace function private.portal_bump_row_version()
returns trigger language plpgsql set search_path=public,private,pg_temp as $$
begin
  new.row_version:=old.row_version+1;
  return new;
end $$;
revoke all on function private.portal_bump_row_version() from public,anon,authenticated;

do $$
declare target_table text;
begin
  foreach target_table in array array[
    'employees','employments','employee_assignments','employee_certificates',
    'employee_compensation_eligibility','employee_leave_periods',
    'payroll_records','payroll_allocations','bank_allocations','suppliers','payment_requests'
  ] loop
    execute format('drop trigger if exists %I on public.%I','track120_bump_row_version',target_table);
    execute format('create trigger %I before update on public.%I for each row execute function private.portal_bump_row_version()','track120_bump_row_version',target_table);
  end loop;
end $$;
