-- TRACK132: one versioned contract for every operational import domain.
-- The existing authorization, approval, provenance, digest, idempotency,
-- concurrency, audit, atomicity, and synthetic-data guards remain delegated to
-- the already verified workflow RPCs.

create or replace function private.portal_operational_contract_version()
returns text language sql immutable as $$ select '1.0.0'::text $$;

alter table public.mcp_ingestion_batches
  add column if not exists contract_version text;
update public.mcp_ingestion_batches
   set contract_version=private.portal_operational_contract_version()
 where contract_version is null;
alter table public.mcp_ingestion_batches
  alter column contract_version set default private.portal_operational_contract_version(),
  alter column contract_version set not null;
alter table public.mcp_ingestion_batches
  drop constraint if exists mcp_ingestion_batches_contract_version_check;
alter table public.mcp_ingestion_batches
  add constraint mcp_ingestion_batches_contract_version_check
  check (contract_version=private.portal_operational_contract_version());

create or replace function public.portal_mcp_operational_contract_catalog()
returns jsonb language sql security definer set search_path=public,private,pg_temp as $$
  select public.portal_mcp_operational_catalog()
    || jsonb_build_object('contract_version',private.portal_operational_contract_version(),
      'workflow',jsonb_build_array('Preview','Reconciliation','Approval','Commit','Read-back'),
      'limits',jsonb_build_object('rows_per_batch',1000,'approval_minutes',10))
$$;

create or replace function public.portal_mcp_preview_operational_changes(
  p_contract_version text, p_rows jsonb, p_source_name text,
  p_source_provenance jsonb, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare result jsonb; bid uuid;
begin
  if p_contract_version is distinct from private.portal_operational_contract_version() then
    raise exception 'VERSION_MISMATCH' using errcode='22023';
  end if;
  result:=public.portal_mcp_preview_operational_changes(p_rows,p_source_name,p_source_provenance,p_idempotency_key);
  bid:=(result->>'batch_id')::uuid;
  update public.mcp_ingestion_batches set contract_version=p_contract_version where batch_id=bid;
  return result||jsonb_build_object('contract_version',p_contract_version,'workflow','Preview');
end $$;

create or replace function public.portal_mcp_request_operational_approval(
  p_contract_version text, p_batch_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare result jsonb; stored text;
begin
  select contract_version into stored from public.mcp_ingestion_batches
   where batch_id=p_batch_id and actor_user_id=auth.uid();
  if p_contract_version is distinct from private.portal_operational_contract_version()
     or stored is distinct from p_contract_version then
    raise exception 'VERSION_MISMATCH' using errcode='22023';
  end if;
  result:=public.portal_mcp_request_operational_approval(p_batch_id,p_reason);
  return result||jsonb_build_object('contract_version',p_contract_version,'workflow','Approval');
end $$;

create or replace function public.portal_mcp_commit_operational_changes(
  p_contract_version text, p_batch_id uuid, p_approval_id uuid)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare result jsonb; stored text;
begin
  select contract_version into stored from public.mcp_ingestion_batches
   where batch_id=p_batch_id and actor_user_id=auth.uid();
  if p_contract_version is distinct from private.portal_operational_contract_version()
     or stored is distinct from p_contract_version then
    raise exception 'VERSION_MISMATCH' using errcode='22023';
  end if;
  result:=public.portal_mcp_commit_operational_changes(p_batch_id,p_approval_id);
  return result||jsonb_build_object('contract_version',p_contract_version,'workflow','Commit');
end $$;

revoke all on function public.portal_mcp_preview_operational_changes(text,jsonb,text,jsonb,text),
  public.portal_mcp_request_operational_approval(text,uuid,text),
  public.portal_mcp_commit_operational_changes(text,uuid,uuid) from public,anon;
grant execute on function public.portal_mcp_preview_operational_changes(text,jsonb,text,jsonb,text),
  public.portal_mcp_request_operational_approval(text,uuid,text),
  public.portal_mcp_commit_operational_changes(text,uuid,uuid) to authenticated;
revoke all on function public.portal_mcp_operational_contract_catalog() from public,anon;
grant execute on function public.portal_mcp_operational_contract_catalog() to authenticated;
