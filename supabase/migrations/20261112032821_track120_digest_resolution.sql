alter function public.portal_mcp_preview_operational_changes(jsonb,text,text)
  set search_path=public,private,extensions,pg_temp;
alter function public.portal_mcp_commit_operational_changes(uuid,uuid)
  set search_path=public,private,extensions,pg_temp;
alter table public.mcp_ingestion_batches drop constraint if exists mcp_ingestion_batches_domain_check;
alter table public.mcp_ingestion_batches add constraint mcp_ingestion_batches_domain_check
  check(domain in ('DAYCARES','OPERATIONS'));
