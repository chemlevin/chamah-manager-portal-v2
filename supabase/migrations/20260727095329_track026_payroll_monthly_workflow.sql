-- TRACK026: Supabase-backed monthly Payroll Workbench.
-- Forward-only extension. Payroll and Budget calculation engines are intentionally unchanged.

alter table public.payroll_months
  add column if not exists scope_type text not null default 'ORGANIZATION',
  add column if not exists allocation_unit_id uuid references public.allocation_units(allocation_unit_id),
  add column if not exists daycare_id uuid references public.daycares(daycare_id),
  add column if not exists opening_options jsonb not null default '{}'::jsonb,
  add column if not exists reopened_reason text,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by_user_id uuid references auth.users(id);

alter table public.payroll_months
  drop constraint if exists payroll_months_scope_type_check;
alter table public.payroll_months
  add constraint payroll_months_scope_type_check
  check (
    (scope_type = 'ORGANIZATION' and allocation_unit_id is null and daycare_id is null)
    or (scope_type = 'ALLOCATION_UNIT' and allocation_unit_id is not null and daycare_id is null)
    or (scope_type = 'DAYCARE' and allocation_unit_id is not null and daycare_id is not null)
  );

alter table public.payroll_months
  drop constraint if exists payroll_months_payroll_month_key;
create unique index if not exists payroll_months_month_scope_uq
  on public.payroll_months (
    payroll_month,
    scope_type,
    coalesce(allocation_unit_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(daycare_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

alter table public.payroll_records
  add column if not exists payroll_month_id uuid references public.payroll_months(payroll_month_id),
  add column if not exists parent_payroll_record_id uuid references public.payroll_records(payroll_record_id),
  add column if not exists row_kind text not null default 'PARENT',
  add column if not exists row_status text not null default 'MISSING',
  add column if not exists row_health_reason text,
  add column if not exists standard_hours numeric,
  add column if not exists actual_hours numeric,
  add column if not exists actual_gross numeric,
  add column if not exists actual_allocation_unit_id uuid references public.allocation_units(allocation_unit_id),
  add column if not exists actual_daycare_id uuid references public.daycares(daycare_id),
  add column if not exists actual_status text,
  add column if not exists actual_notes text,
  add column if not exists vacation_deduct numeric,
  add column if not exists vacation_pay numeric,
  add column if not exists sick_deduct numeric,
  add column if not exists sick_pay numeric,
  add column if not exists no_absence_override boolean,
  add column if not exists persistence_override boolean,
  add column if not exists transportation_override boolean,
  add column if not exists excellence_override boolean,
  add column if not exists class_manager_override boolean,
  add column if not exists degree_override boolean,
  add column if not exists certificate_override text,
  add column if not exists calculated_gross numeric,
  add column if not exists calculated_components jsonb not null default '{}'::jsonb,
  add column if not exists monthly_overrides jsonb not null default '{}'::jsonb;

alter table public.payroll_records
  drop constraint if exists payroll_records_row_kind_check;
alter table public.payroll_records
  add constraint payroll_records_row_kind_check check (row_kind in ('PARENT', 'SPLIT')),
  add constraint payroll_records_split_depth_check check (
    (row_kind = 'PARENT' and parent_payroll_record_id is null)
    or (row_kind = 'SPLIT' and parent_payroll_record_id is not null)
  ),
  add constraint payroll_records_row_status_check
    check (row_status in ('VALID', 'MISSING', 'ERROR', 'SPLIT'));

create index if not exists payroll_records_payroll_month_id_idx
  on public.payroll_records(payroll_month_id);
create index if not exists payroll_records_parent_idx
  on public.payroll_records(parent_payroll_record_id)
  where parent_payroll_record_id is not null;

update public.payroll_records r
set payroll_month_id = m.payroll_month_id
from public.payroll_months m
where r.payroll_month_id is null
  and r.payroll_month = m.payroll_month
  and m.scope_type = 'ORGANIZATION';

create or replace function public.portal_open_payroll_month_v2(
  target_month date,
  target_scope_type text,
  target_allocation_unit_id uuid,
  target_daycare_id uuid,
  copy_previous_employees boolean,
  load_active_employees boolean,
  actor_id uuid
) returns public.payroll_months
language plpgsql
security invoker
set search_path = public
as $$
declare
  opened public.payroll_months;
  previous_month_id uuid;
begin
  if target_month is null or target_month <> date_trunc('month', target_month)::date then
    raise exception 'PAYROLL_MONTH_INVALID';
  end if;
  if target_scope_type not in ('ORGANIZATION', 'ALLOCATION_UNIT', 'DAYCARE') then
    raise exception 'PAYROLL_SCOPE_INVALID';
  end if;
  if target_scope_type = 'DAYCARE' and not exists (
    select 1 from public.daycares d
    where d.daycare_id = target_daycare_id
      and d.allocation_unit_id = target_allocation_unit_id
  ) then
    raise exception 'PAYROLL_DAYCARE_SCOPE_INVALID';
  end if;

  insert into public.payroll_months (
    payroll_month, month_status, opening_method, scope_type,
    allocation_unit_id, daycare_id, opening_options, opened_by_user_id
  ) values (
    target_month, 'CURRENT',
    case when copy_previous_employees then 'PREVIOUS_MONTH'
         when load_active_employees then 'ACTIVE_EMPLOYEES' else 'EMPTY' end,
    target_scope_type, target_allocation_unit_id, target_daycare_id,
    jsonb_build_object(
      'copy_previous_employees', copy_previous_employees,
      'load_active_employees', load_active_employees
    ),
    actor_id
  )
  returning * into opened;

  if copy_previous_employees then
    select payroll_month_id into previous_month_id
    from public.payroll_months
    where payroll_month < target_month
      and scope_type = target_scope_type
      and allocation_unit_id is not distinct from target_allocation_unit_id
      and daycare_id is not distinct from target_daycare_id
    order by payroll_month desc limit 1;

    insert into public.payroll_records (
      payroll_month_id, employment_id, payroll_month, source_employee_identifier,
      source_record_identifier, employee_match_status, record_origin, source_payload,
      allocation_unit_id, daycare_id, role_id, employee_pay_term_id,
      row_status, created_by_user_id, updated_by_user_id
    )
    select opened.payroll_month_id, r.employment_id, target_month, r.source_employee_identifier,
      gen_random_uuid()::text, r.employee_match_status, 'MANUAL', '{}'::jsonb,
      r.allocation_unit_id, r.daycare_id, r.role_id, r.employee_pay_term_id,
      'MISSING', actor_id, actor_id
    from public.payroll_records r
    where r.payroll_month_id = previous_month_id and r.row_kind = 'PARENT'
    on conflict do nothing;
  end if;

  if load_active_employees then
    insert into public.payroll_records (
      payroll_month_id, employment_id, payroll_month, source_employee_identifier,
      source_record_identifier, employee_match_status, record_origin, source_payload,
      allocation_unit_id, daycare_id, role_id, employee_pay_term_id,
      row_status, created_by_user_id, updated_by_user_id
    )
    select opened.payroll_month_id, e.employment_id, target_month, p.employee_code,
      gen_random_uuid()::text, 'LINKED', 'MANUAL', '{}'::jsonb,
      a.allocation_unit_id, a.daycare_id, a.role_id, t.employee_pay_term_id,
      'MISSING', actor_id, actor_id
    from public.employments e
    join public.employees p on p.employee_id = e.employee_id
    left join lateral (
      select x.* from public.employee_assignments x
      where x.employment_id = e.employment_id
        and x.effective_from <= target_month
        and (x.effective_to is null or x.effective_to >= target_month)
      order by x.is_primary desc, x.effective_from desc limit 1
    ) a on true
    left join lateral (
      select x.* from public.employee_pay_terms x
      where x.employee_id = p.employee_id
        and x.valid_from <= target_month
        and (x.valid_to is null or x.valid_to >= target_month)
      order by x.valid_from desc limit 1
    ) t on true
    where e.employment_status = 'ACTIVE'
      and e.employment_start_date <= (target_month + interval '1 month - 1 day')::date
      and (e.employment_end_date is null or e.employment_end_date >= target_month)
      and (
        target_scope_type = 'ORGANIZATION'
        or (target_scope_type = 'ALLOCATION_UNIT' and a.allocation_unit_id = target_allocation_unit_id)
        or (target_scope_type = 'DAYCARE' and a.daycare_id = target_daycare_id)
      )
      and not exists (
        select 1 from public.payroll_records r
        where r.payroll_month_id = opened.payroll_month_id
          and r.employment_id = e.employment_id
          and r.row_kind = 'PARENT'
      );
  end if;

  return opened;
exception when unique_violation then
  raise exception 'PAYROLL_MONTH_SCOPE_DUPLICATE';
end;
$$;

create or replace function public.portal_save_payroll_rows_v2(
  target_month_id uuid,
  target_rows jsonb,
  actor_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_month public.payroll_months;
  item jsonb;
  saved_ids uuid[] := '{}';
  saved_id uuid;
begin
  select * into target_month from public.payroll_months
  where payroll_month_id = target_month_id for update;
  if target_month.payroll_month_id is null then raise exception 'PAYROLL_MONTH_NOT_FOUND'; end if;
  if target_month.month_status <> 'CURRENT' or target_month.locked_at is not null then
    raise exception 'PAYROLL_MONTH_LOCKED';
  end if;
  if jsonb_typeof(target_rows) <> 'array' then raise exception 'PAYROLL_ROWS_INVALID'; end if;

  for item in select value from jsonb_array_elements(target_rows)
  loop
    saved_id := nullif(item->>'payroll_record_id', '')::uuid;
    if saved_id is null then
      insert into public.payroll_records (
        payroll_month_id, payroll_month, employment_id, source_employee_identifier,
        source_record_identifier, employee_match_status, record_origin, source_payload,
        allocation_unit_id, daycare_id, role_id, employee_pay_term_id,
        work_days, regular_hours, hours_125, hours_150, vacation_deduct, vacation_pay,
        sick_deduct, sick_pay, no_absence_override, persistence_override,
        transportation_override, excellence_override, class_manager_override,
        degree_override, certificate_override, standard_hours, actual_hours,
        gross_pay, actual_gross, employer_cost, actual_allocation_unit_id,
        actual_daycare_id, actual_status, notes, actual_notes, monthly_overrides,
        row_status, row_health_reason, created_by_user_id, updated_by_user_id
      ) values (
        target_month_id, target_month.payroll_month,
        nullif(item->>'employment_id','')::uuid, nullif(item->>'source_employee_identifier',''),
        coalesce(nullif(item->>'source_record_identifier',''), gen_random_uuid()::text),
        coalesce(nullif(item->>'employee_match_status',''),'MISSING'),
        coalesce(nullif(item->>'record_origin',''),'MANUAL'), coalesce(item->'source_payload','{}'::jsonb),
        nullif(item->>'allocation_unit_id','')::uuid, nullif(item->>'daycare_id','')::uuid,
        nullif(item->>'role_id','')::uuid, nullif(item->>'employee_pay_term_id','')::uuid,
        nullif(item->>'work_days','')::numeric, nullif(item->>'regular_hours','')::numeric,
        nullif(item->>'hours_125','')::numeric, nullif(item->>'hours_150','')::numeric,
        nullif(item->>'vacation_deduct','')::numeric, nullif(item->>'vacation_pay','')::numeric,
        nullif(item->>'sick_deduct','')::numeric, nullif(item->>'sick_pay','')::numeric,
        nullif(item->>'no_absence_override','')::boolean, nullif(item->>'persistence_override','')::boolean,
        nullif(item->>'transportation_override','')::boolean, nullif(item->>'excellence_override','')::boolean,
        nullif(item->>'class_manager_override','')::boolean, nullif(item->>'degree_override','')::boolean,
        nullif(item->>'certificate_override',''), nullif(item->>'standard_hours','')::numeric,
        nullif(item->>'actual_hours','')::numeric, nullif(item->>'gross_pay','')::numeric,
        nullif(item->>'actual_gross','')::numeric, nullif(item->>'employer_cost','')::numeric,
        nullif(item->>'actual_allocation_unit_id','')::uuid, nullif(item->>'actual_daycare_id','')::uuid,
        nullif(item->>'actual_status',''), nullif(item->>'notes',''), nullif(item->>'actual_notes',''),
        coalesce(item->'monthly_overrides','{}'::jsonb),
        coalesce(nullif(item->>'row_status',''),'MISSING'), nullif(item->>'row_health_reason',''),
        actor_id, actor_id
      ) returning payroll_record_id into saved_id;
    else
      update public.payroll_records set
        work_days = nullif(item->>'work_days','')::numeric,
        regular_hours = nullif(item->>'regular_hours','')::numeric,
        hours_125 = nullif(item->>'hours_125','')::numeric,
        hours_150 = nullif(item->>'hours_150','')::numeric,
        vacation_deduct = nullif(item->>'vacation_deduct','')::numeric,
        vacation_pay = nullif(item->>'vacation_pay','')::numeric,
        sick_deduct = nullif(item->>'sick_deduct','')::numeric,
        sick_pay = nullif(item->>'sick_pay','')::numeric,
        standard_hours = nullif(item->>'standard_hours','')::numeric,
        actual_hours = nullif(item->>'actual_hours','')::numeric,
        actual_gross = nullif(item->>'actual_gross','')::numeric,
        employer_cost = nullif(item->>'employer_cost','')::numeric,
        actual_allocation_unit_id = nullif(item->>'actual_allocation_unit_id','')::uuid,
        actual_daycare_id = nullif(item->>'actual_daycare_id','')::uuid,
        actual_status = nullif(item->>'actual_status',''),
        notes = nullif(item->>'notes',''), actual_notes = nullif(item->>'actual_notes',''),
        monthly_overrides = coalesce(item->'monthly_overrides', monthly_overrides),
        row_status = coalesce(nullif(item->>'row_status',''), row_status),
        row_health_reason = nullif(item->>'row_health_reason',''),
        updated_by_user_id = actor_id, updated_at = timezone('utc', now()),
        row_version = row_version + 1
      where payroll_record_id = saved_id
        and payroll_month_id = target_month_id and row_kind = 'PARENT';
      if not found then raise exception 'PAYROLL_ROW_NOT_FOUND'; end if;
    end if;
    saved_ids := array_append(saved_ids, saved_id);
  end loop;
  return jsonb_build_object('saved_ids', to_jsonb(saved_ids), 'saved_count', cardinality(saved_ids));
end;
$$;

create or replace function public.portal_close_payroll_month_v2(
  target_month_id uuid,
  actor_id uuid,
  closing_notes text
) returns public.payroll_months
language plpgsql
security invoker
set search_path = public
as $$
declare target_month public.payroll_months;
begin
  select * into target_month from public.payroll_months
  where payroll_month_id = target_month_id for update;
  if target_month.month_status <> 'CURRENT' then raise exception 'PAYROLL_MONTH_NOT_CURRENT'; end if;
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
declare target_month public.payroll_months;
begin
  if nullif(trim(reopening_reason),'') is null then raise exception 'REOPEN_REASON_REQUIRED'; end if;
  select * into target_month from public.payroll_months
  where payroll_month_id=target_month_id for update;
  if target_month.month_status <> 'CLOSED' then raise exception 'PAYROLL_MONTH_NOT_CLOSED'; end if;
  update public.payroll_months set month_status='CURRENT', locked_at=null, locked_by_user_id=null,
    reopened_at=timezone('utc',now()), reopened_by_user_id=actor_id,
    reopened_reason=trim(reopening_reason), updated_at=timezone('utc',now()),
    row_version=row_version+1
  where payroll_month_id=target_month_id returning * into target_month;
  return target_month;
end;
$$;

revoke all on function public.portal_open_payroll_month_v2(date,text,uuid,uuid,boolean,boolean,uuid) from public, anon;
revoke all on function public.portal_save_payroll_rows_v2(uuid,jsonb,uuid) from public, anon;
revoke all on function public.portal_close_payroll_month_v2(uuid,uuid,text) from public, anon;
revoke all on function public.portal_reopen_payroll_month_v2(uuid,uuid,text) from public, anon;
grant execute on function public.portal_open_payroll_month_v2(date,text,uuid,uuid,boolean,boolean,uuid) to service_role;
grant execute on function public.portal_save_payroll_rows_v2(uuid,jsonb,uuid) to service_role;
grant execute on function public.portal_close_payroll_month_v2(uuid,uuid,text) to service_role;
grant execute on function public.portal_reopen_payroll_month_v2(uuid,uuid,text) to service_role;
