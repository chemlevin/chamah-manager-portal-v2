-- Generic source-evidence registry and idempotent registration contract.
-- Metadata/provenance only; this migration does not alter business facts.

create table if not exists public.canonical_source_evidence_operations (
  operation_id uuid primary key,
  task_id text not null,
  idempotency_key text not null unique,
  source_batch_ids uuid[] not null default '{}'::uuid[],
  status text not null default 'REGISTERED'
    check (status = any (array['REGISTERED'::text,'REPLAYED'::text,'CONFLICT'::text])),
  row_count integer not null default 0 check (row_count >= 0),
  digest text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.canonical_source_rows
  add column if not exists source_system text,
  add column if not exists source_file text,
  add column if not exists reporting_month date;

create index if not exists canonical_source_rows_record_lookup_idx
  on public.canonical_source_rows(source_record_id);
create index if not exists canonical_source_rows_batch_row_idx
  on public.canonical_source_rows(source_batch_id, source_row_number);
create unique index if not exists canonical_source_rows_batch_row_unique
  on public.canonical_source_rows(source_batch_id, source_row_number);

alter table public.canonical_source_evidence_operations enable row level security;
revoke all on public.canonical_source_evidence_operations from public, anon, authenticated;
revoke all on public.canonical_source_rows from public, anon, authenticated;

create or replace function public.portal_mcp_register_source_evidence(
  p_task_id text,
  p_operation_id uuid,
  p_idempotency_key text,
  p_source_batches jsonb,
  p_source_rows jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_existing public.canonical_source_evidence_operations;
  v_batch jsonb;
  v_row jsonb;
  v_batch_ids uuid[] := '{}'::uuid[];
  v_row_count integer := 0;
  v_digest text;
  v_conflict boolean := false;
begin
  if not private.portal_is_authorized(auth.uid(),'OPERATIONS.WRITE') then
    raise exception using errcode='42501', message='Director authorization required';
  end if;
  if nullif(trim(p_task_id),'') is null or p_operation_id is null
     or nullif(trim(p_idempotency_key),'') is null
     or jsonb_typeof(p_source_batches) <> 'array'
     or jsonb_typeof(p_source_rows) <> 'array'
     or jsonb_array_length(p_source_batches) < 1
     or jsonb_array_length(p_source_rows) < 1 then
    raise exception using errcode='22023', message='Invalid source evidence registration payload';
  end if;

  select * into v_existing
  from public.canonical_source_evidence_operations
  where idempotency_key=trim(p_idempotency_key)
  for update;
  if found then
    return jsonb_build_object(
      'operation_id',v_existing.operation_id,
      'task_id',v_existing.task_id,
      'status','REPLAYED',
      'digest',v_existing.digest,
      'row_count',v_existing.row_count,
      'source_batch_ids',to_jsonb(v_existing.source_batch_ids),
      'data_written',false
    );
  end if;

  for v_batch in select * from jsonb_array_elements(p_source_batches) loop
    if nullif(v_batch->>'source_batch_id','') is null
       or nullif(v_batch->>'source_domain','') is null
       or nullif(v_batch->>'source_file','') is null
       or nullif(v_batch->>'source_file_fingerprint','') is null
       or (v_batch->>'row_count') !~ '^[0-9]+$' then
      raise exception using errcode='22023', message='Invalid source batch identity';
    end if;
    if (v_batch->>'source_batch_id')::uuid = any(v_batch_ids) then
      v_conflict := true;
    else
      v_batch_ids := array_append(v_batch_ids,(v_batch->>'source_batch_id')::uuid);
    end if;
    insert into public.canonical_source_batches(
      source_batch_id,source_domain,source_file,source_file_fingerprint,status,row_count,metadata,created_by
    ) values (
      (v_batch->>'source_batch_id')::uuid,
      v_batch->>'source_domain',
      v_batch->>'source_file',
      v_batch->>'source_file_fingerprint',
      coalesce(nullif(v_batch->>'status',''),'REGISTERED'),
      (v_batch->>'row_count')::integer,
      coalesce(v_batch->'metadata','{}'::jsonb),
      auth.uid()
    )
    on conflict (source_batch_id) do update set
      source_domain=excluded.source_domain,
      source_file=excluded.source_file,
      source_file_fingerprint=excluded.source_file_fingerprint,
      row_count=excluded.row_count,
      metadata=excluded.metadata;
  end loop;

  for v_row in select * from jsonb_array_elements(p_source_rows) loop
    if nullif(v_row->>'source_batch_id','') is null
       or (v_row->>'source_row_number') !~ '^[0-9]+$'
       or (v_row->>'source_row_number')::integer < 1
       or nullif(v_row->>'row_fingerprint','') is null
       or v_row->'original_payload' is null then
      raise exception using errcode='22023', message='Invalid source row identity';
    end if;
    insert into public.canonical_source_rows(
      source_batch_id,source_sheet,source_row_number,source_record_id,
      original_payload,row_fingerprint,resolution_status,source_system,source_file,reporting_month
    ) values (
      (v_row->>'source_batch_id')::uuid,
      nullif(v_row->>'source_sheet',''),
      (v_row->>'source_row_number')::integer,
      nullif(v_row->>'source_record_id',''),
      v_row->'original_payload',
      v_row->>'row_fingerprint',
      coalesce(nullif(v_row->>'resolution_status',''),'UNRESOLVED'),
      nullif(v_row->>'source_system',''),
      nullif(v_row->>'source_file',''),
      nullif(v_row->>'reporting_month','')::date
    )
    on conflict (source_batch_id,source_row_number) do update set
      source_sheet=excluded.source_sheet,
      source_record_id=excluded.source_record_id,
      original_payload=excluded.original_payload,
      row_fingerprint=excluded.row_fingerprint,
      source_system=excluded.source_system,
      source_file=excluded.source_file,
      reporting_month=excluded.reporting_month,
      resolution_status=excluded.resolution_status;
    v_row_count := v_row_count + 1;
  end loop;

  v_digest := encode(digest(jsonb_build_object('task_id',p_task_id,'source_batches',p_source_batches,'source_rows',p_source_rows)::text,'sha256'),'hex');
  insert into public.canonical_source_evidence_operations(
    operation_id,task_id,idempotency_key,source_batch_ids,row_count,digest,payload,created_by
  ) values (
    p_operation_id,p_task_id,trim(p_idempotency_key),v_batch_ids,v_row_count,v_digest,
    jsonb_build_object('source_batches',p_source_batches,'source_rows',p_source_rows),auth.uid()
  );

  return jsonb_build_object(
    'operation_id',p_operation_id,
    'task_id',p_task_id,
    'status',case when v_conflict then 'CONFLICT' else 'REGISTERED' end,
    'digest',v_digest,
    'row_count',v_row_count,
    'source_batch_ids',to_jsonb(v_batch_ids),
    'data_written',false,
    'metadata_written',true
  );
end;
$$;

revoke all on function public.portal_mcp_register_source_evidence(text,uuid,text,jsonb,jsonb) from public,anon;
grant execute on function public.portal_mcp_register_source_evidence(text,uuid,text,jsonb,jsonb) to authenticated;
