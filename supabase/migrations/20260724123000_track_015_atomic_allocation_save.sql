create or replace function public.portal_save_bank_allocations(
  target_bank_transaction_id uuid,
  allocation_rows jsonb,
  actor_id uuid
)
returns setof public.bank_allocations
language plpgsql
security invoker
set search_path = public
as $$
declare
  transaction_amount numeric(14,2);
  allocation_total numeric(14,2);
begin
  select amount into transaction_amount
  from public.bank_transactions
  where bank_transaction_id = target_bank_transaction_id
  for update;

  if not found then
    raise exception 'Bank transaction not found';
  end if;

  select coalesce(sum((row_value->>'allocation_amount')::numeric), 0)
  into allocation_total
  from jsonb_array_elements(coalesce(allocation_rows, '[]'::jsonb)) row_value;

  if abs(allocation_total - transaction_amount) > 0.01 then
    raise exception 'Bank allocations must reconcile to the parent amount';
  end if;

  delete from public.bank_allocations
  where bank_transaction_id = target_bank_transaction_id;

  return query
  insert into public.bank_allocations (
    bank_transaction_id, movement_type, allocation_unit_id, daycare_id,
    budget_category_id, budget_month, accounting_status, notes,
    allocation_amount, created_by_user_id, updated_by_user_id
  )
  select
    target_bank_transaction_id,
    nullif(row_value->>'movement_type', ''),
    nullif(row_value->>'allocation_unit_id', '')::uuid,
    nullif(row_value->>'daycare_id', '')::uuid,
    nullif(row_value->>'budget_category_id', '')::uuid,
    nullif(row_value->>'budget_month', '')::date,
    nullif(row_value->>'accounting_status', ''),
    nullif(btrim(row_value->>'notes'), ''),
    (row_value->>'allocation_amount')::numeric,
    actor_id,
    actor_id
  from jsonb_array_elements(coalesce(allocation_rows, '[]'::jsonb)) row_value
  returning *;
end;
$$;

revoke all on function public.portal_save_bank_allocations(uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.portal_save_bank_allocations(uuid, jsonb, uuid) to service_role;

comment on function public.portal_save_bank_allocations(uuid, jsonb, uuid) is
  'TRACK015 atomic parent allocation replacement. Service role only; validates reconciliation inside one transaction.';
