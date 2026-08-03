-- TRACK026H: canonical Payroll module navigation and lifecycle permissions.

insert into public.portal_sections (
  screen_code, parent_screen_code, route, display_name, icon, description,
  display_order, is_active, is_navigation_item, is_scope_required
) values
  ('payroll', null, 'payroll', 'שכר', '₪',
   'מרכז העבודה לפתיחת חודשי שכר, עבודה שוטפת, חודשים סגורים ודוחות.',
   40, true, true, false),
  ('payroll.open', 'payroll', 'payroll/open', 'פתיחת חודש חדש', '+',
   'פתיחת חודש שכר לפי היקף ארגוני וטעינת עובדים.',
   41, true, false, true),
  ('payroll.working', 'payroll', 'payroll/working', 'חודשים בעבודה', '◷',
   'חודשי שכר פתוחים והכניסה לסביבת העבודה החודשית.',
   42, true, false, true),
  ('payroll.closed', 'payroll', 'payroll/closed', 'חודשים סגורים', '✓',
   'צפייה בחודשי שכר נעולים ופתיחה מחדש בהרשאה.',
   43, true, false, true),
  ('payroll.reports', 'payroll', 'payroll/reports', 'דוחות שכר', '▦',
   'דוחות וסיכומי שכר לפי חודש והיקף.',
   44, true, false, true)
on conflict (screen_code) do update set
  parent_screen_code = excluded.parent_screen_code,
  route = excluded.route,
  display_name = excluded.display_name,
  icon = excluded.icon,
  description = excluded.description,
  display_order = excluded.display_order,
  is_active = true,
  is_navigation_item = excluded.is_navigation_item,
  is_scope_required = excluded.is_scope_required,
  updated_at = timezone('utc', now());

update public.portal_sections
set is_active = false, updated_at = timezone('utc', now())
where screen_code in (
  'payroll.calculations',
  'payroll.calculations.new',
  'payroll.calculations.existing',
  'payroll.calculations.history',
  'dashboards.staffing.actual-payroll.reopen'
);

create or replace function public.portal_close_payroll_month_v2(
  target_month_id uuid,
  actor_id uuid,
  closing_notes text
) returns public.payroll_months
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_month public.payroll_months;
  previous_month public.payroll_months;
begin
  select * into target_month from public.payroll_months
  where payroll_month_id = target_month_id for update;
  if target_month.payroll_month_id is null then raise exception 'PAYROLL_MONTH_NOT_FOUND'; end if;
  if target_month.month_status <> 'CURRENT' then raise exception 'PAYROLL_MONTH_NOT_CURRENT'; end if;
  previous_month := target_month;

  if exists (
    select 1 from public.payroll_records r
    where r.payroll_month_id = target_month_id and r.row_kind = 'PARENT'
      and (
        r.row_status in ('MISSING','ERROR')
        or r.employee_match_status in ('MISSING','UNRESOLVED')
        or r.actual_hours is null or r.actual_gross is null or r.employer_cost is null
        or exists (
          select 1 from public.payroll_records s
          where s.parent_payroll_record_id = r.payroll_record_id
          group by s.parent_payroll_record_id
          having abs(coalesce(sum(s.actual_hours),0) - coalesce(r.actual_hours,0)) > .01
              or abs(coalesce(sum(s.employer_cost),0) - coalesce(r.employer_cost,0)) > .01
        )
      )
  ) then raise exception 'PAYROLL_MONTH_VALIDATION_FAILED'; end if;

  update public.payroll_months set month_status='CLOSED',
    locked_at=timezone('utc',now()), locked_by_user_id=actor_id,
    closed_at=timezone('utc',now()), closed_by_user_id=actor_id,
    close_notes=nullif(trim(closing_notes),''),
    updated_at=timezone('utc',now()), row_version=row_version+1
  where payroll_month_id=target_month_id returning * into target_month;

  insert into public.audit_events (
    entity_type, entity_id, operation, previous_values, new_values,
    source_type, actor_user_id
  ) values (
    'payroll_months', target_month_id, 'STATUS_CHANGE',
    to_jsonb(previous_month), to_jsonb(target_month), 'PORTAL_ADMIN', actor_id
  );
  return target_month;
end;
$$;

create or replace function public.portal_reopen_payroll_month_v2(
  target_month_id uuid,
  actor_id uuid,
  reopening_reason text
) returns public.payroll_months
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_month public.payroll_months;
  previous_month public.payroll_months;
begin
  if nullif(trim(reopening_reason),'') is null then raise exception 'REOPEN_REASON_REQUIRED'; end if;
  select * into target_month from public.payroll_months
  where payroll_month_id=target_month_id for update;
  if target_month.payroll_month_id is null then raise exception 'PAYROLL_MONTH_NOT_FOUND'; end if;
  if target_month.month_status <> 'CLOSED' then raise exception 'PAYROLL_MONTH_NOT_CLOSED'; end if;
  previous_month := target_month;

  update public.payroll_months set month_status='CURRENT',
    locked_at=null, locked_by_user_id=null,
    closed_at=null, closed_by_user_id=null,
    reopened_at=timezone('utc',now()), reopened_by_user_id=actor_id,
    reopened_reason=trim(reopening_reason), updated_at=timezone('utc',now()),
    row_version=row_version+1
  where payroll_month_id=target_month_id returning * into target_month;

  insert into public.audit_events (
    entity_type, entity_id, operation, previous_values, new_values,
    source_type, actor_user_id
  ) values (
    'payroll_months', target_month_id, 'STATUS_CHANGE',
    to_jsonb(previous_month), to_jsonb(target_month), 'PORTAL_ADMIN', actor_id
  );
  return target_month;
end;
$$;

revoke all on function public.portal_close_payroll_month_v2(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.portal_reopen_payroll_month_v2(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.portal_close_payroll_month_v2(uuid,uuid,text) to service_role;
grant execute on function public.portal_reopen_payroll_month_v2(uuid,uuid,text) to service_role;
