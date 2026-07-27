-- TRACK026D — Persist the four accounting return values used by an inline
-- payroll allocation.  This extends the existing allocation contract only;
-- it does not alter payroll calculation inputs, rates, or formulas.

alter table public.payroll_records
  add column if not exists actual_net numeric(14,2);

alter table public.payroll_allocations
  add column if not exists allocated_standard_hours numeric(10,2),
  add column if not exists allocated_net numeric(14,2),
  add column if not exists allocated_gross numeric(14,2);

alter table public.payroll_allocations
  drop constraint if exists payroll_allocations_accounting_values_nonnegative_check,
  add constraint payroll_allocations_accounting_values_nonnegative_check check (
    (allocated_standard_hours is null or allocated_standard_hours >= 0)
    and (allocated_net is null or allocated_net >= 0)
    and (allocated_gross is null or allocated_gross >= 0)
  );

create or replace function public.portal_save_payroll_allocations(
  target_payroll_record_id uuid,
  allocation_rows jsonb,
  actor_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  source_record public.payroll_records;
  saved_rows jsonb;
begin
  if actor_id is null or jsonb_typeof(allocation_rows) <> 'array' then
    raise exception 'Payroll allocation request is invalid';
  end if;

  select * into source_record
  from public.payroll_records
  where payroll_record_id = target_payroll_record_id
  for update;
  if not found then raise exception 'Payroll record not found'; end if;

  if exists (
    select 1 from jsonb_array_elements(allocation_rows) row_value
    where nullif(row_value->>'allocation_unit_id', '') is null
       or nullif(row_value->>'role_id', '') is null
       or nullif(row_value->>'allocation_amount', '') is null
       or nullif(row_value->>'allocated_hours', '') is null
       or nullif(row_value->>'allocated_standard_hours', '') is null
       or nullif(row_value->>'allocated_net', '') is null
       or nullif(row_value->>'allocated_gross', '') is null
       or (row_value->>'allocation_amount')::numeric < 0
       or (row_value->>'allocated_hours')::numeric < 0
       or (row_value->>'allocated_standard_hours')::numeric < 0
       or (row_value->>'allocated_net')::numeric < 0
       or (row_value->>'allocated_gross')::numeric < 0
  ) then
    raise exception 'Payroll allocation rows failed validation';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(allocation_rows) row_value
    join public.daycares d on d.daycare_id = nullif(row_value->>'daycare_id', '')::uuid
    where nullif(row_value->>'daycare_id', '') is not null
      and d.allocation_unit_id <> (row_value->>'allocation_unit_id')::uuid
  ) then
    raise exception 'Daycare does not belong to the selected department';
  end if;

  if coalesce((select sum((row_value->>'allocated_standard_hours')::numeric) from jsonb_array_elements(allocation_rows) row_value), 0) <> coalesce(source_record.standard_hours, 0)
     or coalesce((select sum((row_value->>'allocated_net')::numeric) from jsonb_array_elements(allocation_rows) row_value), 0) <> coalesce(source_record.actual_net, 0)
     or coalesce((select sum((row_value->>'allocated_gross')::numeric) from jsonb_array_elements(allocation_rows) row_value), 0) <> coalesce(source_record.actual_gross, 0)
     or coalesce((select sum((row_value->>'allocation_amount')::numeric) from jsonb_array_elements(allocation_rows) row_value), 0) <> coalesce(source_record.employer_cost, 0)
     or coalesce((select sum((row_value->>'allocated_hours')::numeric) from jsonb_array_elements(allocation_rows) row_value), 0) <> coalesce(source_record.actual_hours, 0) then
    raise exception 'Payroll allocation totals are unbalanced';
  end if;

  delete from public.payroll_allocations where payroll_record_id = target_payroll_record_id;

  with inserted as (
    insert into public.payroll_allocations (
      payroll_record_id, allocation_unit_id, daycare_id, role_id,
      allocation_amount, allocation_percent, allocated_hours,
      allocated_standard_hours, allocated_net, allocated_gross,
      effective_note, allocation_status, created_by_user_id, updated_by_user_id
    )
    select target_payroll_record_id,
      (row_value->>'allocation_unit_id')::uuid,
      nullif(row_value->>'daycare_id', '')::uuid,
      (row_value->>'role_id')::uuid,
      (row_value->>'allocation_amount')::numeric,
      case when source_record.employer_cost = 0 then null
        else round((row_value->>'allocation_amount')::numeric / source_record.employer_cost * 100, 4) end,
      (row_value->>'allocated_hours')::numeric,
      (row_value->>'allocated_standard_hours')::numeric,
      (row_value->>'allocated_net')::numeric,
      (row_value->>'allocated_gross')::numeric,
      nullif(btrim(row_value->>'effective_note'), ''),
      coalesce(nullif(row_value->>'allocation_status', ''), 'DRAFT'), actor_id, actor_id
    from jsonb_array_elements(allocation_rows) row_value
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(inserted)), '[]'::jsonb) into saved_rows from inserted;

  insert into public.audit_events (entity_type, entity_id, operation, new_values, source_type, actor_user_id)
  values ('payroll_records', target_payroll_record_id, 'MANUAL_CORRECTION',
    jsonb_build_object('allocations', saved_rows), 'PORTAL_ADMIN', actor_id);

  return jsonb_build_object('allocations', saved_rows);
end;
$$;

revoke all on function public.portal_save_payroll_allocations(uuid, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.portal_save_payroll_allocations(uuid, jsonb, uuid)
  to service_role;
