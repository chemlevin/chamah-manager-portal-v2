create function public.portal_open_payroll_month(
  target_month date, opening_method text, actor_id uuid
)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  inserted_rows integer := 0;
  previous_month date := (target_month - interval '1 month')::date;
  target_month_id uuid;
begin
  if actor_id is null or target_month is null
     or target_month <> date_trunc('month', target_month)::date then
    raise exception 'Valid actor and payroll month are required.';
  end if;
  if opening_method not in ('PREVIOUS_MONTH', 'ACTIVE_EMPLOYEES', 'EMPTY') then
    raise exception 'Unsupported payroll month opening method.';
  end if;
  if exists (select 1 from public.payroll_months where payroll_month = target_month)
     or exists (select 1 from public.payroll_records where payroll_month = target_month) then
    raise exception 'Payroll month already exists.';
  end if;

  insert into public.payroll_months (
    payroll_month, month_status, opening_method, opened_by_user_id
  ) values (target_month, 'CURRENT', opening_method, actor_id)
  returning payroll_month_id into target_month_id;

  if opening_method = 'PREVIOUS_MONTH' then
    insert into public.payroll_records (
      employment_id, payroll_month, source_employee_identifier,
      source_record_identifier, employer_cost, source_payload, import_batch_id,
      employee_match_status, record_origin, allocation_unit_id, daycare_id,
      role_id, employee_pay_term_id, created_by_user_id, updated_by_user_id
    )
    select
      prior.employment_id, target_month, prior.source_employee_identifier,
      gen_random_uuid()::text, null, '{}'::jsonb, null,
      prior.employee_match_status, 'MONTH_OPEN', prior.allocation_unit_id,
      prior.daycare_id, prior.role_id,
      (
        select term.employee_pay_term_id
        from public.employee_pay_terms term
        join public.employments employment on employment.employee_id = term.employee_id
        where employment.employment_id = prior.employment_id
          and term.valid_from <= target_month
          and (term.valid_to is null or term.valid_to >= target_month)
        order by term.valid_from desc limit 1
      ),
      actor_id, actor_id
    from public.payroll_records prior
    where prior.payroll_month = previous_month;
    get diagnostics inserted_rows = row_count;
  elsif opening_method = 'ACTIVE_EMPLOYEES' then
    insert into public.payroll_records (
      employment_id, payroll_month, source_employee_identifier,
      source_record_identifier, employer_cost, source_payload, import_batch_id,
      employee_match_status, record_origin, allocation_unit_id, daycare_id,
      role_id, employee_pay_term_id, created_by_user_id, updated_by_user_id
    )
    select
      employment.employment_id, target_month, employee.employee_code,
      gen_random_uuid()::text, null, '{}'::jsonb, null,
      'LINKED', 'MONTH_OPEN', assignment.allocation_unit_id,
      assignment.daycare_id, assignment.role_id, pay_term.employee_pay_term_id,
      actor_id, actor_id
    from public.employees employee
    join public.employments employment
      on employment.employee_id = employee.employee_id
     and employment.employment_status = 'ACTIVE'
     and employment.employment_start_date <= (target_month + interval '1 month - 1 day')::date
     and (employment.employment_end_date is null or employment.employment_end_date >= target_month)
    left join lateral (
      select candidate.allocation_unit_id, candidate.daycare_id, candidate.role_id
      from public.employee_assignments candidate
      where candidate.employment_id = employment.employment_id
        and candidate.effective_from <= (target_month + interval '1 month - 1 day')::date
        and (candidate.effective_to is null or candidate.effective_to >= target_month)
      order by candidate.is_primary desc, candidate.effective_from desc limit 1
    ) assignment on true
    left join lateral (
      select candidate.employee_pay_term_id
      from public.employee_pay_terms candidate
      where candidate.employee_id = employee.employee_id
        and candidate.valid_from <= target_month
        and (candidate.valid_to is null or candidate.valid_to >= target_month)
      order by candidate.valid_from desc limit 1
    ) pay_term on true
    where employee.lifecycle_status = 'ACTIVE';
    get diagnostics inserted_rows = row_count;
  end if;

  insert into public.audit_events (
    entity_type, entity_id, operation, previous_values, new_values,
    source_type, actor_user_id
  ) values (
    'payroll_months', target_month_id, 'INSERT', null,
    jsonb_build_object('payroll_month', target_month, 'opening_method', opening_method,
      'inserted_rows', inserted_rows),
    'PORTAL_ADMIN', actor_id
  );
  return jsonb_build_object('payroll_month', target_month, 'month_status', 'CURRENT',
    'opening_method', opening_method, 'inserted_rows', inserted_rows);
end
$$;

revoke all on function public.portal_open_payroll_month(date, text, uuid)
  from public, anon, authenticated;
grant execute on function public.portal_open_payroll_month(date, text, uuid)
  to service_role;
comment on function public.portal_open_payroll_month(date, text, uuid) is
  'Atomically opens a payroll month without copying monthly payroll values.';
