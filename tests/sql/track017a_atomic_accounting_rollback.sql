begin;

do $$
declare
  test_account_id uuid;
  test_actor_id uuid;
  batches_before bigint;
  transactions_before bigint;
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

  if test_account_id is null or test_actor_id is null then
    raise exception 'TRACK017A_IMPORT_TEST_FIXTURE_MISSING';
  end if;

  select count(*) into batches_before from public.import_batches;
  select count(*) into transactions_before from public.bank_transactions;

  begin
    perform public.portal_confirm_bank_import(
      test_account_id,
      jsonb_build_array(
        jsonb_build_object(
          'source_row_number', 900001,
          'transaction_date', '2026-07-24',
          'description', 'TRACK017A import rollback row 1',
          'reference_number', 'TRACK017A-IMPORT-1',
          'amount', -10,
          'source_fingerprint', repeat('a', 64)
        ),
        jsonb_build_object(
          'source_row_number', 900002,
          'transaction_date', '2026-07-24',
          'description', 'TRACK017A import rollback row 2',
          'reference_number', 'TRACK017A-IMPORT-2',
          'amount', 999999999999999,
          'source_fingerprint', repeat('b', 64)
        )
      ),
      test_actor_id,
      'track017a-rollback.csv',
      gen_random_uuid(),
      '000000',
      2,
      0,
      0
    );
    raise exception 'TRACK017A_IMPORT_FAILURE_NOT_TRIGGERED';
  exception
    when numeric_value_out_of_range then null;
  end;

  if (select count(*) from public.import_batches) <> batches_before
     or (select count(*) from public.bank_transactions) <> transactions_before then
    raise exception 'TRACK017A_IMPORT_ROLLBACK_FAILED';
  end if;
end;
$$;

create or replace function pg_temp.track017a_force_delete_failure()
returns trigger language plpgsql as $$
begin
  raise exception 'TRACK017A_EXPECTED_DELETE_FAILURE';
end;
$$;

do $$
declare
  test_account_id uuid;
  test_actor_id uuid;
  test_batch_id uuid;
  test_transaction_id uuid;
  test_unit_id uuid;
  test_status_id uuid;
  allocations_before bigint;
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
    raise exception 'TRACK017A_DELETE_TEST_FIXTURE_MISSING';
  end if;

  insert into public.import_batches (
    source_type, source_name, triggered_by_user_id, status,
    total_rows, accepted_rows, completed_at, metadata
  ) values (
    'BANK_FILE', 'MANUAL', test_actor_id, 'COMPLETED',
    1, 1, timezone('utc', now()), '{"track":"TRACK017A"}'::jsonb
  ) returning import_batch_id into test_batch_id;

  insert into public.bank_transactions (
    bank_account_id, transaction_date, description, reference_number,
    amount, debit_amount, credit_amount, source_fingerprint, source_payload,
    import_batch_id, created_by_user_id
  ) values (
    test_account_id, date '2026-07-24', 'TRACK017A delete rollback',
    'TRACK017A-DELETE', -10, 10, 0, repeat('c', 64),
    '{"track":"TRACK017A"}'::jsonb, test_batch_id, test_actor_id
  ) returning bank_transaction_id into test_transaction_id;

  insert into public.bank_allocations (
    bank_transaction_id, movement_type, allocation_unit_id, budget_month,
    accounting_status_id, allocation_amount, created_by_user_id, updated_by_user_id
  ) values (
    test_transaction_id, 'EXCLUDE', test_unit_id, date '2026-07-01',
    test_status_id, -10, test_actor_id, test_actor_id
  );

  select count(*) into allocations_before
  from public.bank_allocations
  where bank_transaction_id = test_transaction_id;

  execute format(
    'create trigger track017a_force_delete_failure before delete on public.bank_transactions
     for each row when (old.bank_transaction_id = %L::uuid)
     execute function pg_temp.track017a_force_delete_failure()',
    test_transaction_id
  );

  begin
    perform public.portal_delete_bank_transactions(array[test_transaction_id]);
    raise exception 'TRACK017A_DELETE_FAILURE_NOT_TRIGGERED';
  exception
    when others then
      if sqlerrm <> 'TRACK017A_EXPECTED_DELETE_FAILURE' then
        raise;
      end if;
  end;

  if not exists (
       select 1 from public.bank_transactions
       where bank_transaction_id = test_transaction_id
     )
     or (
       select count(*) from public.bank_allocations
       where bank_transaction_id = test_transaction_id
     ) <> allocations_before then
    raise exception 'TRACK017A_DELETE_ROLLBACK_FAILED';
  end if;

  drop trigger track017a_force_delete_failure on public.bank_transactions;
end;
$$;

rollback;
