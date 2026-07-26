begin;

do $$
declare
  actor_id uuid;
  test_employee_id uuid := gen_random_uuid();
  first_term jsonb;
  second_term jsonb;
begin
  select id into actor_id from auth.users order by created_at limit 1;
  if actor_id is null then raise exception 'A portal auth user is required for the test'; end if;

  insert into public.employees (
    employee_id, employee_code, first_name, last_name, lifecycle_status,
    created_by_user_id, updated_by_user_id
  ) values (
    test_employee_id, 'TRACK020-ROLLBACK-' || left(test_employee_id::text, 8),
    'בדיקת', 'גרסאות', 'ACTIVE', actor_id, actor_id
  );

  first_term := public.portal_version_employee_pay_term(
    test_employee_id, current_date, '{"pay_type":"HOURLY","base_pay":"40"}'::jsonb, actor_id
  );
  second_term := public.portal_version_employee_pay_term(
    test_employee_id, current_date + 30, '{"pay_type":"HOURLY","base_pay":"45"}'::jsonb, actor_id
  );

  if (first_term->>'employee_pay_term_id') is null or (second_term->>'employee_pay_term_id') is null then
    raise exception 'Version RPC did not return persisted terms';
  end if;
  if not exists (
    select 1 from public.employee_pay_terms
    where employee_id = test_employee_id
      and valid_from = current_date
      and valid_to = current_date + 29
      and base_pay = 40
  ) then raise exception 'Previous version was not preserved and closed correctly'; end if;
  if (select count(*) from public.employee_pay_terms where employee_id = test_employee_id) <> 2 then
    raise exception 'Expected exactly two versioned pay terms';
  end if;
end;
$$;

rollback;
