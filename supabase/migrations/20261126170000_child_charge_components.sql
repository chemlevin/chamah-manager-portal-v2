-- Preserve every source billing component separately from a parent's payment receipt.
-- Child financial closure may use only TUITION and GOVERNMENT_FUNDING components.

create table if not exists public.child_charge_components (
  child_charge_component_id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(child_id) on delete restrict,
  daycare_id uuid not null references public.daycares(daycare_id) on delete restrict,
  daycare_billing_record_id uuid references public.daycare_billing_records(daycare_billing_record_id) on delete restrict,
  billing_month date not null check (billing_month = date_trunc('month', billing_month)::date),
  component_type text not null check (component_type in ('TUITION','GOVERNMENT_FUNDING','REGISTRATION','ACTIVITY','LATE_FEE','RETURNED_PAYMENT_FEE','OTHER')),
  description text not null, funding_program text,
  amount_charged numeric(12,2) not null check (amount_charged >= 0),
  amount_matched numeric(12,2) not null default 0 check (amount_matched >= 0 and amount_matched <= amount_charged),
  amount_remaining numeric(12,2) not null default 0 check (amount_remaining >= 0 and amount_remaining <= amount_charged),
  source_system text not null, source_file text not null, source_row_number integer not null check (source_row_number > 0), source_record_id text not null,
  source_payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id), updated_by_user_id uuid references auth.users(id),
  row_version integer not null default 1 check (row_version > 0), unique (source_system, source_record_id)
);
create index if not exists idx_child_charge_components_child_month on public.child_charge_components(child_id,billing_month,component_type);
create index if not exists idx_child_charge_components_daycare_month on public.child_charge_components(daycare_id,billing_month,component_type);
alter table public.child_charge_components enable row level security;
revoke all on public.child_charge_components from public,anon,authenticated;
do $$ begin if to_regprocedure('private.portal_mcp_entity_meta_charge_components_v1(text)') is null then alter function private.portal_mcp_entity_meta(text) rename to portal_mcp_entity_meta_charge_components_v1; end if; end $$;
create or replace function private.portal_mcp_entity_meta(p_entity text) returns jsonb language sql immutable set search_path=public,private,pg_temp as $$
 select case when p_entity='child_charge_components' then '{"table":"child_charge_components","id":"child_charge_component_id","stable":["source_system","source_record_id"],"stable_mode":"ANY","generic":true,"required":["child_id","daycare_id","billing_month","component_type","description","amount_charged","amount_matched","amount_remaining","source_system","source_file","source_row_number","source_record_id"],"writable":["child_id","daycare_id","daycare_billing_record_id","billing_month","component_type","description","funding_program","amount_charged","amount_matched","amount_remaining","source_system","source_file","source_row_number","source_record_id","source_payload"]}'::jsonb else private.portal_mcp_entity_meta_charge_components_v1(p_entity) end $$;
do $$ begin if to_regprocedure('public.portal_mcp_operational_catalog_charge_components_v1()') is null then alter function public.portal_mcp_operational_catalog() rename to portal_mcp_operational_catalog_charge_components_v1; end if; end $$;
create or replace function public.portal_mcp_operational_catalog() returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
 select jsonb_set(public.portal_mcp_operational_catalog_charge_components_v1(),'{entities}',(public.portal_mcp_operational_catalog_charge_components_v1()->'entities') || jsonb_build_array(jsonb_build_object('entity','child_charge_components','id','child_charge_component_id','stable_keys',jsonb_build_array('source_system','source_record_id'),'writable',private.portal_mcp_entity_meta('child_charge_components')->'writable','required_on_create',private.portal_mcp_entity_meta('child_charge_components')->'required','approval_required',true))) $$;
do $$ begin if to_regprocedure('public.portal_mcp_operational_report_charge_components_v1()') is null then alter function public.portal_mcp_operational_report() rename to portal_mcp_operational_report_charge_components_v1; end if; end $$;
create or replace function public.portal_mcp_operational_report() returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$ select jsonb_set(public.portal_mcp_operational_report_charge_components_v1(),'{counts}',(public.portal_mcp_operational_report_charge_components_v1()->'counts') || jsonb_build_object('child_charge_components',(select count(*) from public.child_charge_components))) $$;
revoke all on function private.portal_mcp_entity_meta(text) from public,anon,authenticated;
revoke all on function public.portal_mcp_operational_catalog() from public,anon;
revoke all on function public.portal_mcp_operational_report() from public,anon;
grant execute on function public.portal_mcp_operational_catalog(),public.portal_mcp_operational_report() to authenticated;