create table if not exists public.operational_import_runs (
  import_run_id uuid primary key default gen_random_uuid(),
  import_code text not null unique,
  domain text not null,
  source_name text not null,
  source_file text not null,
  reporting_months date[] not null,
  expected_source_rows integer not null check (expected_source_rows >= 0),
  persisted_component_rows integer not null check (persisted_component_rows >= 0),
  created_child_records integer not null default 0 check (created_child_records >= 0),
  execution_batches jsonb not null,
  reconciliation jsonb not null,
  status text not null check (status in ('VERIFIED','SUPERSEDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id),
  updated_by_user_id uuid references auth.users(id),
  row_version integer not null default 1 check (row_version > 0)
);
alter table public.operational_import_runs enable row level security;
revoke all on public.operational_import_runs from public,anon,authenticated;

do $$ begin
 if to_regprocedure('private.portal_mcp_entity_meta_import_runs_v1(text)') is null then
   alter function private.portal_mcp_entity_meta(text) rename to portal_mcp_entity_meta_import_runs_v1;
 end if;
end $$;
create or replace function private.portal_mcp_entity_meta(p_entity text)
returns jsonb language sql immutable set search_path=public,private,pg_temp as $$
 select case when p_entity='operational_import_runs' then
  '{"table":"operational_import_runs","id":"import_run_id","stable":["import_code"],"generic":true,"required":["import_code","domain","source_name","source_file","reporting_months","expected_source_rows","persisted_component_rows","created_child_records","execution_batches","reconciliation","status"],"writable":["import_code","domain","source_name","source_file","reporting_months","expected_source_rows","persisted_component_rows","created_child_records","execution_batches","reconciliation","status"]}'::jsonb
 else private.portal_mcp_entity_meta_import_runs_v1(p_entity) end $$;

do $$ begin
 if to_regprocedure('public.portal_mcp_operational_catalog_import_runs_v1()') is null then
   alter function public.portal_mcp_operational_catalog() rename to portal_mcp_operational_catalog_import_runs_v1;
 end if;
end $$;
create or replace function public.portal_mcp_operational_catalog()
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
 select jsonb_set(public.portal_mcp_operational_catalog_import_runs_v1(),'{entities}',
 (public.portal_mcp_operational_catalog_import_runs_v1()->'entities') || jsonb_build_array(jsonb_build_object(
 'entity','operational_import_runs','id','import_run_id','stable_keys',jsonb_build_array('import_code'),
 'writable',private.portal_mcp_entity_meta('operational_import_runs')->'writable',
 'required_on_create',private.portal_mcp_entity_meta('operational_import_runs')->'required','approval_required',true))) $$;

do $$ begin
 if to_regprocedure('public.portal_mcp_operational_report_import_runs_v1()') is null then
  alter function public.portal_mcp_operational_report() rename to portal_mcp_operational_report_import_runs_v1;
 end if;
end $$;
create or replace function public.portal_mcp_operational_report()
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
 select jsonb_set(public.portal_mcp_operational_report_import_runs_v1(),'{counts}',
 (public.portal_mcp_operational_report_import_runs_v1()->'counts') || jsonb_build_object('operational_import_runs',(select count(*) from public.operational_import_runs))) $$;
revoke all on function private.portal_mcp_entity_meta(text) from public,anon,authenticated;
revoke all on function public.portal_mcp_operational_catalog() from public,anon;
revoke all on function public.portal_mcp_operational_report() from public,anon;
grant execute on function public.portal_mcp_operational_catalog(),public.portal_mcp_operational_report() to authenticated;