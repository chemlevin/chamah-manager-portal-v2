alter table public.mcp_ingestion_batches drop constraint if exists mcp_ingestion_batches_domain_check;
alter table public.mcp_ingestion_batches add constraint mcp_ingestion_batches_domain_check
  check(domain in ('DAYCARES','OPERATIONS'));
