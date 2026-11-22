-- Preview-only routing fix: avoid PostgREST overload ambiguity for the
-- staging-only Operational Workspace connector.
create or replace function public.portal_mcp_preview_operational_changes_v1(
  p_rows jsonb,
  p_source_name text,
  p_source_provenance jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,extensions,pg_temp
as $$
begin
  return public.portal_mcp_preview_operational_changes(
    p_rows,
    p_source_name,
    p_source_provenance,
    p_idempotency_key
  );
end
$$;

revoke all on function public.portal_mcp_preview_operational_changes_v1(jsonb,text,jsonb,text) from public, anon;
grant execute on function public.portal_mcp_preview_operational_changes_v1(jsonb,text,jsonb,text) to authenticated;

notify pgrst, 'reload schema';
