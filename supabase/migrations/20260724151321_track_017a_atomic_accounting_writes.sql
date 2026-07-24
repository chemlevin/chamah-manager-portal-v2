create or replace function public.portal_confirm_bank_import(
  target_bank_account_id uuid, import_rows jsonb, actor_id uuid,
  source_file_name text, preview_token uuid, source_account_number text,
  total_rows integer, duplicate_rows integer, invalid_rows integer
)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  new_batch_id uuid;
  inserted_transactions jsonb;
  accepted_count integer;
begin
  if actor_id is null or preview_token is null then
    raise exception 'Import actor and preview token are required';
  end if;
  if jsonb_typeof(import_rows) <> 'array' or jsonb_array_length(import_rows) = 0 then
    raise exception 'At least one import row is required';
  end if;
  if total_rows < jsonb_array_length(import_rows) or duplicate_rows < 0 or invalid_rows < 0 then
    raise exception 'Import summary is invalid';
  end if;
  if not exists (
    select 1 from public.bank_accounts
    where bank_account_id = target_bank_account_id and lifecycle_status = 'ACTIVE'
  ) then
    raise exception 'Active bank account not found';
  end if;
  if exists (
    select 1 from jsonb_array_elements(import_rows) row_value
    where coalesce(row_value->>'transaction_date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       or nullif(btrim(row_value->>'description'), '') is null
       or nullif(row_value->>'amount', '') is null
       or (row_value->>'amount')::numeric = 0
       or coalesce(row_value->>'source_fingerprint', '') !~ '^[0-9a-f]{64}$'
       or nullif(row_value->>'source_row_number', '') is null
  ) then
    raise exception 'Import rows failed validation';
  end if;
  if exists (
    select 1 from jsonb_array_elements(import_rows) row_value
    group by row_value->>'source_fingerprint' having count(*) > 1
  ) then
    raise exception 'Import contains duplicate rows';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(import_rows) row_value
    join public.bank_transactions existing
      on existing.bank_account_id = target_bank_account_id
     and existing.source_fingerprint = row_value->>'source_fingerprint'
  ) then
    raise exception 'Import contains transactions that already exist';
  end if;

  insert into public.import_batches (
    source_type, source_name, source_file_name, triggered_by_user_id,
    status, total_rows, warning_rows, rejected_rows, accepted_rows,
    started_at, completed_at, metadata
  ) values (
    'BANK_FILE', 'PORTAL', nullif(btrim(source_file_name), ''), actor_id,
    'COMPLETED', total_rows, duplicate_rows, invalid_rows, jsonb_array_length(import_rows),
    timezone('utc', now()), timezone('utc', now()),
    jsonb_build_object(
      'preview_token', preview_token,
      'source_account_number', regexp_replace(coalesce(source_account_number, ''), '\D', '', 'g')
    )
  ) returning import_batch_id into new_batch_id;

  with inserted as (
    insert into public.bank_transactions (
      bank_account_id, transaction_date, description, reference_number,
      amount, debit_amount, credit_amount, source_fingerprint, source_payload,
      import_batch_id, created_by_user_id
    )
    select target_bank_account_id, (row_value->>'transaction_date')::date,
      btrim(row_value->>'description'), nullif(btrim(row_value->>'reference_number'), ''),
      (row_value->>'amount')::numeric,
      case when (row_value->>'amount')::numeric < 0 then abs((row_value->>'amount')::numeric) else 0 end,
      case when (row_value->>'amount')::numeric > 0 then (row_value->>'amount')::numeric else 0 end,
      row_value->>'source_fingerprint',
      jsonb_build_object(
        'source', 'BANK',
        'source_row_number', (row_value->>'source_row_number')::integer,
        'signed_amount', (row_value->>'amount')::numeric
      ),
      new_batch_id, actor_id
    from jsonb_array_elements(import_rows) row_value
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(inserted)), '[]'::jsonb), count(*)
  into inserted_transactions, accepted_count from inserted;

  if accepted_count <> jsonb_array_length(import_rows) then
    raise exception 'Not all import rows were persisted';
  end if;
  return jsonb_build_object(
    'batch_id', new_batch_id, 'imported', accepted_count,
    'transactions', inserted_transactions
  );
end;
$$;

create or replace function public.portal_create_manual_bank_transaction(
  target_bank_account_id uuid, target_transaction_date date, target_description text,
  target_reference_number text, target_amount numeric, target_source_fingerprint text, actor_id uuid
)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  new_batch_id uuid;
  new_transaction public.bank_transactions;
begin
  if actor_id is null or target_transaction_date is null
     or nullif(btrim(target_description), '') is null
     or target_amount is null or target_amount = 0
     or coalesce(target_source_fingerprint, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Manual transaction failed validation';
  end if;
  if not exists (
    select 1 from public.bank_accounts
    where bank_account_id = target_bank_account_id and lifecycle_status = 'ACTIVE'
  ) then
    raise exception 'Active bank account not found';
  end if;

  insert into public.import_batches (
    source_type, source_name, source_file_name, triggered_by_user_id,
    status, total_rows, accepted_rows, started_at, completed_at, metadata
  ) values (
    'BANK_FILE', 'MANUAL', null, actor_id, 'COMPLETED', 1, 1,
    timezone('utc', now()), timezone('utc', now()), jsonb_build_object('source', 'MANUAL')
  ) returning import_batch_id into new_batch_id;

  insert into public.bank_transactions (
    bank_account_id, transaction_date, description, reference_number,
    amount, debit_amount, credit_amount, source_fingerprint, source_payload,
    import_batch_id, created_by_user_id
  ) values (
    target_bank_account_id, target_transaction_date, btrim(target_description),
    nullif(btrim(target_reference_number), ''), target_amount,
    case when target_amount < 0 then abs(target_amount) else 0 end,
    case when target_amount > 0 then target_amount else 0 end,
    target_source_fingerprint,
    jsonb_build_object('source', 'MANUAL', 'signed_amount', target_amount),
    new_batch_id, actor_id
  ) returning * into new_transaction;

  return jsonb_build_object('batch_id', new_batch_id, 'transaction', to_jsonb(new_transaction));
end;
$$;

create or replace function public.portal_delete_bank_transactions(
  target_bank_transaction_ids uuid[]
)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  requested_count integer;
  locked_count integer;
  deleted_count integer;
begin
  requested_count := coalesce(array_length(target_bank_transaction_ids, 1), 0);
  if requested_count = 0 or array_position(target_bank_transaction_ids, null) is not null then
    raise exception 'At least one valid bank transaction is required';
  end if;
  if (select count(distinct transaction_id) from unnest(target_bank_transaction_ids) transaction_id) <> requested_count then
    raise exception 'Duplicate bank transaction IDs are not allowed';
  end if;

  with locked as (
    select bank_transaction_id
    from public.bank_transactions
    where bank_transaction_id = any(target_bank_transaction_ids)
    for update
  )
  select count(*) into locked_count from locked;
  if locked_count <> requested_count then
    raise exception 'One or more bank transactions were not found';
  end if;

  delete from public.bank_allocations where bank_transaction_id = any(target_bank_transaction_ids);
  delete from public.bank_transactions where bank_transaction_id = any(target_bank_transaction_ids);
  get diagnostics deleted_count = row_count;
  if deleted_count <> requested_count then
    raise exception 'Not all bank transactions were deleted';
  end if;

  return jsonb_build_object(
    'deleted', deleted_count, 'bank_transaction_ids', to_jsonb(target_bank_transaction_ids)
  );
end;
$$;

revoke all on function public.portal_confirm_bank_import(uuid, jsonb, uuid, text, uuid, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.portal_confirm_bank_import(uuid, jsonb, uuid, text, uuid, text, integer, integer, integer) to service_role;
revoke all on function public.portal_create_manual_bank_transaction(uuid, date, text, text, numeric, text, uuid) from public, anon, authenticated;
grant execute on function public.portal_create_manual_bank_transaction(uuid, date, text, text, numeric, text, uuid) to service_role;
revoke all on function public.portal_delete_bank_transactions(uuid[]) from public, anon, authenticated;
grant execute on function public.portal_delete_bank_transactions(uuid[]) to service_role;

comment on function public.portal_confirm_bank_import(uuid, jsonb, uuid, text, uuid, text, integer, integer, integer) is
  'TRACK017A validates and commits an import batch and all bank transactions atomically.';
comment on function public.portal_create_manual_bank_transaction(uuid, date, text, text, numeric, text, uuid) is
  'TRACK017A validates and commits a manual batch and bank transaction atomically.';
comment on function public.portal_delete_bank_transactions(uuid[]) is
  'TRACK017A locks, validates, and deletes bank allocations and parent transactions atomically.';
