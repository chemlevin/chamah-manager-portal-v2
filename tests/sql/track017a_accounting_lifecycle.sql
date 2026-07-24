begin;

do $$
declare
  test_account_id uuid;
  test_actor_id uuid;
  test_unit_id uuid;
  test_status_id uuid;
  imported_transaction_id uuid;
  manual_transaction_id uuid;
  import_result jsonb;
  manual_result jsonb;
  persisted_total numeric;
  export_source_count integer;
begin
  select bank_account_id into test_account_id
  from public.bank_accounts
  where lifecycle_status = 'ACTIVE'
  order by bank_account_id
  limit 1;

  select id into test_actor_id
  from auth.users
  where deleted_at is null
  order by created_at
  limit 1;

  select allocation_unit_id into test_unit_id
  from public.allocation_units
  where lifecycle_status = 'ACTIVE'
  order by allocation_unit_id
  limit 1;

  select accounting_status_id into test_status_id
  from public.accounting_statuses
  where lifecycle_status = 'ACTIVE'
  order by display_order, accounting_status_id
  limit 1;

  if test_account_id is null or test_actor_id is null
     or test_unit_id is null or test_status_id is null then
    raise exception 'TRACK017A_LIFECYCLE_FIXTURE_MISSING';
  end if;

  import_result := public.portal_confirm_bank_import(
    test_account_id,
    jsonb_build_array(jsonb_build_object(
      'source_row_number', 910001,
      'transaction_date', '2026-07-24',
      'description', 'TRACK017A lifecycle import',
      'reference_number', 'TRACK017A-LIFECYCLE-IMPORT',
      'amount', -5,
      'source_fingerprint', md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text)
    )),
    test_actor_id,
    'track017a-lifecycle.csv',
    gen_random_uuid(),
    '000000',
    1,
    0,
    0
  );
  imported_transaction_id := (import_result->'transactions'->0->>'bank_transaction_id')::uuid;

  manual_result := public.portal_create_manual_bank_transaction(
    test_account_id,
    date '2026-07-24',
    'TRACK017A lifecycle manual',
    'TRACK017A-LIFECYCLE-MANUAL',
    -25,
    md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text),
    test_actor_id
  );
  manual_transaction_id := (manual_result->'transaction'->>'bank_transaction_id')::uuid;

  perform public.portal_save_bank_allocations(
    manual_transaction_id,
    jsonb_build_array(jsonb_build_object(
      'movement_type', 'EXCLUDE',
      'allocation_unit_id', test_unit_id,
      'budget_month', '2026-07-01',
      'accounting_status_id', test_status_id,
      'notes', 'TRACK017A save',
      'allocation_amount', -25
    )),
    test_actor_id
  );

  perform public.portal_save_bank_allocations(
    manual_transaction_id,
    jsonb_build_array(jsonb_build_object(
      'movement_type', 'EXCLUDE',
      'allocation_unit_id', test_unit_id,
      'budget_month', '2026-07-01',
      'accounting_status_id', test_status_id,
      'notes', 'TRACK017A edit',
      'allocation_amount', -25
    )),
    test_actor_id
  );

  if not exists (
    select 1 from public.bank_allocations
    where bank_transaction_id = manual_transaction_id
      and notes = 'TRACK017A edit'
  ) then
    raise exception 'TRACK017A_LIFECYCLE_RELOAD_FAILED';
  end if;

  perform public.portal_save_bank_allocations(
    manual_transaction_id,
    jsonb_build_array(
      jsonb_build_object(
        'movement_type', 'EXCLUDE',
        'allocation_unit_id', test_unit_id,
        'budget_month', '2026-07-01',
        'accounting_status_id', test_status_id,
        'notes', 'TRACK017A split 1',
        'allocation_amount', -10
      ),
      jsonb_build_object(
        'movement_type', 'EXCLUDE',
        'allocation_unit_id', test_unit_id,
        'budget_month', '2026-07-01',
        'accounting_status_id', test_status_id,
        'notes', 'TRACK017A split 2',
        'allocation_amount', -15
      )
    ),
    test_actor_id
  );

  select sum(allocation_amount), count(*)
  into persisted_total, export_source_count
  from public.bank_allocations
  where bank_transaction_id = manual_transaction_id;

  if persisted_total <> -25 or export_source_count <> 2 then
    raise exception 'TRACK017A_LIFECYCLE_SPLIT_OR_EXPORT_SOURCE_FAILED';
  end if;

  if (
    select sum(allocation_amount)
    from public.bank_allocations
    where bank_transaction_id = manual_transaction_id
      and budget_month = date '2026-07-01'
  ) <> -25 then
    raise exception 'TRACK017A_LIFECYCLE_DASHBOARD_SOURCE_FAILED';
  end if;

  perform public.portal_delete_bank_transactions(
    array[imported_transaction_id, manual_transaction_id]
  );

  if exists (
    select 1 from public.bank_transactions
    where bank_transaction_id in (imported_transaction_id, manual_transaction_id)
  ) or exists (
    select 1 from public.bank_allocations
    where bank_transaction_id in (imported_transaction_id, manual_transaction_id)
  ) then
    raise exception 'TRACK017A_LIFECYCLE_DELETE_FAILED';
  end if;
end;
$$;

rollback;
