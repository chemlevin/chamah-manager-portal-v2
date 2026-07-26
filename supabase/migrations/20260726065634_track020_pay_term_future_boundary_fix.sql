create or replace function public.portal_version_employee_pay_term(
  target_employee_id uuid,
  effective_from date,
  term_values jsonb,
  actor_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  previous_term public.employee_pay_terms;
  next_term public.employee_pay_terms;
  saved_term public.employee_pay_terms;
begin
  if target_employee_id is null or effective_from is null or actor_id is null
     or jsonb_typeof(term_values) <> 'object' then
    raise exception 'Employee, effective date and pay terms are required';
  end if;
  perform 1 from public.employees where employee_id = target_employee_id for update;
  if not found then raise exception 'Employee not found'; end if;

  select * into previous_term
  from public.employee_pay_terms
  where employee_id = target_employee_id and valid_from <= effective_from
    and (valid_to is null or valid_to >= effective_from)
  order by valid_from desc limit 1 for update;
  if previous_term.employee_pay_term_id is not null and previous_term.valid_from = effective_from then
    raise exception 'A pay-term version already starts on this date';
  end if;
  if previous_term.employee_pay_term_id is not null then
    update public.employee_pay_terms
    set valid_to = effective_from - 1, updated_by_user_id = actor_id
    where employee_pay_term_id = previous_term.employee_pay_term_id;
  end if;

  select * into next_term
  from public.employee_pay_terms
  where employee_id = target_employee_id and valid_from > effective_from
  order by valid_from limit 1 for update;
  if nullif(term_values->>'valid_to', '')::date is not null
     and next_term.employee_pay_term_id is not null
     and nullif(term_values->>'valid_to', '')::date >= next_term.valid_from then
    raise exception 'Pay-term version overlaps the next future version';
  end if;

  insert into public.employee_pay_terms (
    employee_id, valid_from, valid_to, pay_type, base_pay,
    estimated_employment_percentage, notes, created_by_user_id, updated_by_user_id
  ) values (
    target_employee_id, effective_from,
    coalesce(nullif(term_values->>'valid_to', '')::date, next_term.valid_from - 1),
    nullif(term_values->>'pay_type', ''), nullif(term_values->>'base_pay', '')::numeric,
    nullif(term_values->>'estimated_employment_percentage', '')::numeric,
    nullif(term_values->>'notes', ''), actor_id, actor_id
  ) returning * into saved_term;

  insert into public.audit_events (
    entity_type, entity_id, operation, previous_values, new_values, source_type, actor_user_id
  ) values (
    'employee_pay_terms', saved_term.employee_pay_term_id, 'VERSION',
    case when previous_term.employee_pay_term_id is null then null else to_jsonb(previous_term) end,
    to_jsonb(saved_term), 'PORTAL_ADMIN', actor_id
  );
  return to_jsonb(saved_term);
end;
$$;

revoke all on function public.portal_version_employee_pay_term(uuid, date, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.portal_version_employee_pay_term(uuid, date, jsonb, uuid) to service_role;
