-- Run against an isolated/staging database. The transaction always rolls back.
begin;

do $$
declare
  actor uuid;
  blocked boolean := false;
begin
  select user_id into actor
  from public.portal_user_profiles
  where is_active
  limit 1;
  if actor is null then raise exception 'No active portal actor available'; end if;

  perform public.portal_open_payroll_month('2099-12-01', 'EMPTY', actor);
  perform public.portal_close_payroll_month('2099-12-01', actor, 'TRACK020A rollback probe');

  begin
    insert into public.payroll_records (
      payroll_month, source_employee_identifier, source_record_identifier,
      source_payload, employee_match_status, record_origin
    ) values (
      '2099-12-01', 'LOCK-PROBE', gen_random_uuid()::text,
      '{}', 'MISSING', 'MANUAL'
    );
  exception when others then
    blocked := position('read-only' in sqlerrm) > 0;
  end;
  if not blocked then raise exception 'Closed payroll month accepted a write'; end if;

  perform public.portal_reopen_payroll_month(
    '2099-12-01', actor, 'Authorized TRACK020A rollback probe'
  );
end
$$;

rollback;
