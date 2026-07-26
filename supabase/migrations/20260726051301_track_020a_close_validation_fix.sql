create or replace function public.portal_close_payroll_month(
  target_month date, actor_id uuid, closing_notes text default null
)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  invalid_count integer;
  unresolved_count integer;
  target_month_id uuid;
begin
  select count(*) into invalid_count
  from public.payroll_records
  where payroll_month = target_month
    and (
      nullif(btrim(source_employee_identifier), '') is null
      or employer_cost is null or employer_cost < 0
      or allocation_unit_id is null or role_id is null
      or exists (
        select 1 from public.allocation_units unit
        where unit.allocation_unit_id = payroll_records.allocation_unit_id
          and unit.allocation_unit_type = 'DAYCARE'
          and payroll_records.daycare_id is null
      )
    );
  select count(*) into unresolved_count
  from public.payroll_records
  where payroll_month = target_month
    and employee_match_status in ('MISSING', 'UNRESOLVED');
  if invalid_count > 0 or unresolved_count > 0 then
    raise exception 'Month has % invalid rows and % unresolved employees.',
      invalid_count, unresolved_count;
  end if;
  update public.payroll_allocations allocation
  set allocation_status = 'FINALIZED', updated_by_user_id = actor_id
  from public.payroll_records record
  where record.payroll_record_id = allocation.payroll_record_id
    and record.payroll_month = target_month;
  update public.payroll_months
  set month_status = 'CLOSED', closed_by_user_id = actor_id,
      closed_at = timezone('utc', now()), close_notes = nullif(btrim(closing_notes), ''),
      reopened_by_user_id = null, reopened_at = null
  where payroll_month = target_month and month_status = 'CURRENT'
  returning payroll_month_id into target_month_id;
  if target_month_id is null then raise exception 'Current payroll month was not found.'; end if;
  insert into public.audit_events (
    entity_type, entity_id, operation, previous_values, new_values,
    source_type, actor_user_id
  ) values (
    'payroll_months', target_month_id, 'STATUS_CHANGE',
    jsonb_build_object('month_status', 'CURRENT'),
    jsonb_build_object('month_status', 'CLOSED'), 'PORTAL_ADMIN', actor_id
  );
  return jsonb_build_object('payroll_month', target_month, 'month_status', 'CLOSED');
end
$$;

revoke all on function public.portal_close_payroll_month(date, uuid, text)
  from public, anon, authenticated;
grant execute on function public.portal_close_payroll_month(date, uuid, text)
  to service_role;
