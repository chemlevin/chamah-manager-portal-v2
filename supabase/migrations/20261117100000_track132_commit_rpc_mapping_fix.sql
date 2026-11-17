-- TRACK132 corrective migration: avoid PostgREST ambiguity caused by the
-- overloaded portal_mcp_commit_operational_changes RPC name.
-- All authorization, approval-digest, provenance, row-version, idempotency,
-- audit, and atomicity checks remain in the existing two-UUID commit RPC.

create or replace function public.portal_mcp_commit_operational_changes_v1(
  p_batch_id uuid,
  p_approval_id uuid,
  p_contract_version text
)
returns jsonb language plpgsql security definer
set search_path=public,private,extensions,pg_temp as $$
declare result jsonb; stored text;
begin
  select contract_version into stored
    from public.mcp_ingestion_batches
   where batch_id=p_batch_id and actor_user_id=auth.uid();
  if p_contract_version is distinct from private.portal_operational_contract_version()
     or stored is distinct from p_contract_version then
    raise exception 'VERSION_MISMATCH' using errcode='22023';
  end if;
  result:=public.portal_mcp_commit_operational_changes(p_batch_id,p_approval_id);
  return result||jsonb_build_object('contract_version',p_contract_version,'workflow','Commit');
end $$;

revoke all on function public.portal_mcp_commit_operational_changes_v1(uuid,uuid,text) from public,anon;
grant execute on function public.portal_mcp_commit_operational_changes_v1(uuid,uuid,text) to authenticated;
