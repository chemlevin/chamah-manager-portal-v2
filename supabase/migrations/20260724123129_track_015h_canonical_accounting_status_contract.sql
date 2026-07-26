-- accounting_status_id is the sole writable accounting-status contract.
-- The legacy accounting_status column remains readable only while historical
-- integrations are being retired.
update public.bank_allocations allocation
set accounting_status_id = status.accounting_status_id
from public.accounting_statuses status
where allocation.accounting_status_id is null
  and allocation.accounting_status is not null
  and status.sheet_accounting_status_id = case allocation.accounting_status
    when 'MISSING_DOCUMENTS' then 'ACC-MISSING-DOCS'
    when 'PENDING_SUBMISSION' then 'ACC-WAITING'
    when 'SENT_TO_ACCOUNTING' then 'ACC-SENT'
    when 'NO_SUPPORTING_DOCUMENT_REQUIRED' then 'ACC-NO-SEND'
    else null
  end;

do $$
begin
  if exists (
    select 1
    from public.bank_allocations
    where accounting_status is not null
      and accounting_status_id is null
  ) then
    raise exception 'Cannot complete accounting status migration: unmapped legacy allocation statuses remain';
  end if;
end;
$$;

create or replace function public.enforce_legacy_accounting_status_read_only()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.accounting_status is not null then
    raise exception 'bank_allocations.accounting_status is read-only; write accounting_status_id';
  end if;

  if tg_op = 'UPDATE' and new.accounting_status is distinct from old.accounting_status then
    raise exception 'bank_allocations.accounting_status is read-only; write accounting_status_id';
  end if;

  return new;
end;
$$;

drop trigger if exists bank_allocations_legacy_accounting_status_read_only
on public.bank_allocations;

create trigger bank_allocations_legacy_accounting_status_read_only
before insert or update of accounting_status on public.bank_allocations
for each row
execute function public.enforce_legacy_accounting_status_read_only();

comment on column public.bank_allocations.accounting_status is
  'Deprecated read-only compatibility field for historical rows. New persistence uses accounting_status_id.';

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
    budget_category_id, budget_month, accounting_status_id,
    notes, allocation_amount, created_by_user_id, updated_by_user_id
  )
  select
    target_bank_transaction_id,
    nullif(row_value->>'movement_type', ''),
    nullif(row_value->>'allocation_unit_id', '')::uuid,
    nullif(row_value->>'daycare_id', '')::uuid,
    nullif(row_value->>'budget_category_id', '')::uuid,
    nullif(row_value->>'budget_month', '')::date,
    nullif(row_value->>'accounting_status_id', '')::uuid,
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
  'TRACK015H atomic allocation replacement using the Settings accounting status foreign key.';
