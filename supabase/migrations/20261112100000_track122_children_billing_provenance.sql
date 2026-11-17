-- TRACK122: minimum person-level child lifecycle and monthly billing/collection
-- entities. All writes continue through the existing OPERATIONS preview,
-- approval, commit, concurrency, and audit pipeline.

create table if not exists public.children (
  child_id uuid primary key default gen_random_uuid(),
  child_code text,
  first_name text not null,
  last_name text not null,
  birth_date date,
  lifecycle_status text not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  source_system text,
  source_record_id text,
  source_version text,
  source_mapping_version text,
  source_payload jsonb not null default '{}'::jsonb,
  unmapped_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id),
  updated_by_user_id uuid references auth.users(id),
  row_version integer not null default 1 check (row_version > 0),
  unique (source_system, source_record_id)
);

create table if not exists public.child_enrollments (
  child_enrollment_id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(child_id) on delete restrict,
  daycare_id uuid not null references public.daycares(daycare_id) on delete restrict,
  classroom_id uuid references public.classrooms(classroom_id) on delete restrict,
  effective_from date not null,
  effective_to date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','ENDED')),
  source_system text,
  source_record_id text,
  source_version text,
  source_mapping_version text,
  source_payload jsonb not null default '{}'::jsonb,
  unmapped_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id),
  updated_by_user_id uuid references auth.users(id),
  row_version integer not null default 1 check (row_version > 0)
);

create table if not exists public.daycare_billing_records (
  daycare_billing_record_id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(child_id) on delete restrict,
  child_enrollment_id uuid references public.child_enrollments(child_enrollment_id) on delete restrict,
  daycare_id uuid not null references public.daycares(daycare_id) on delete restrict,
  billing_month date not null check (billing_month = date_trunc('month', billing_month)::date),
  amount_due numeric(12,2) not null check (amount_due >= 0),
  amount_collected numeric(12,2) not null default 0 check (amount_collected >= 0),
  status text not null default 'OPEN' check (status in ('OPEN','PARTIAL','PAID','VOID')),
  source_system text,
  source_record_id text,
  source_version text,
  source_mapping_version text,
  source_payload jsonb not null default '{}'::jsonb,
  unmapped_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id),
  updated_by_user_id uuid references auth.users(id),
  row_version integer not null default 1 check (row_version > 0),
  unique (child_id, billing_month)
);

create table if not exists public.collection_receipts (
  collection_receipt_id uuid primary key default gen_random_uuid(),
  daycare_billing_record_id uuid not null references public.daycare_billing_records(daycare_billing_record_id) on delete restrict,
  receipt_date date not null,
  amount numeric(12,2) not null check (amount > 0),
  reference text,
  source_system text,
  source_record_id text,
  source_version text,
  source_mapping_version text,
  source_payload jsonb not null default '{}'::jsonb,
  unmapped_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id),
  updated_by_user_id uuid references auth.users(id),
  row_version integer not null default 1 check (row_version > 0)
);

create index if not exists idx_child_enrollments_child_effective on public.child_enrollments(child_id,effective_from);
create index if not exists idx_child_enrollments_daycare_effective on public.child_enrollments(daycare_id,effective_from);
create index if not exists idx_daycare_billing_month on public.daycare_billing_records(daycare_id,billing_month);
create index if not exists idx_collection_receipts_billing on public.collection_receipts(daycare_billing_record_id,receipt_date);

create table if not exists public.mcp_source_mapping_versions (
  mapping_version_id uuid primary key default gen_random_uuid(),
  domain text not null,
  source_name text not null,
  version text not null,
  mapping jsonb not null default '{}'::jsonb,
  unmapped_fields jsonb not null default '[]'::jsonb,
  conflicts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id),
  unique(domain, source_name, version)
);

alter table public.children enable row level security;
alter table public.child_enrollments enable row level security;
alter table public.daycare_billing_records enable row level security;
alter table public.collection_receipts enable row level security;
alter table public.mcp_source_mapping_versions enable row level security;
revoke all on public.children,public.child_enrollments,public.daycare_billing_records,public.collection_receipts from public,anon,authenticated;
revoke all on public.mcp_source_mapping_versions from public,anon,authenticated;

create or replace function private.portal_mcp_entity_meta(p_entity text)
returns jsonb language sql immutable set search_path=public,private,pg_temp as $$
 select case p_entity
  when 'employees' then '{"table":"employees","id":"employee_id","stable":["employee_code","national_id"],"stable_mode":"ANY"}'::jsonb
  when 'employments' then '{"table":"employments","id":"employment_id","stable":["employee_id","employment_start_date"]}'::jsonb
  when 'employee_assignments' then '{"table":"employee_assignments","id":"assignment_id","stable":["employment_id","effective_from","daycare_id","role_id"]}'::jsonb
  when 'employee_certificates' then '{"table":"employee_certificates","id":"employee_certificate_id","stable":["employee_id","certificate_type_id","issued_on"]}'::jsonb
  when 'employee_pay_terms' then '{"table":"employee_pay_terms","id":"employee_pay_term_id","stable":["employee_id","valid_from"]}'::jsonb
  when 'employee_compensation_eligibility' then '{"table":"employee_compensation_eligibility","id":"employee_compensation_eligibility_id","stable":["employment_id","compensation_factor_id","effective_from"]}'::jsonb
  when 'employee_leave_periods' then '{"table":"employee_leave_periods","id":"employee_leave_period_id","stable":["employment_id","leave_type","starts_on"]}'::jsonb
  when 'payroll_records' then '{"table":"payroll_records","id":"payroll_record_id","stable":["source_record_identifier","sheet_payroll_row_id"],"stable_mode":"ANY"}'::jsonb
  when 'payroll_allocations' then '{"table":"payroll_allocations","id":"payroll_allocation_id","stable":["payroll_record_id","allocation_unit_id","role_id"]}'::jsonb
  when 'bank_allocations' then '{"table":"bank_allocations","id":"bank_allocation_id","stable":["bank_transaction_id","allocation_unit_id","budget_month"]}'::jsonb
  when 'suppliers' then '{"table":"suppliers","id":"supplier_id","stable":["supplier_code","registration_number"],"stable_mode":"ANY"}'::jsonb
  when 'payment_requests' then '{"table":"payment_requests","id":"payment_request_id","stable":["idempotency_key","invoice_number"],"stable_mode":"ANY"}'::jsonb
  when 'allocation_units' then '{"table":"allocation_units","id":"allocation_unit_id","stable":["allocation_unit_code"],"generic":true,"required":["allocation_unit_code","display_name","allocation_unit_type"],"writable":["allocation_unit_code","display_name","allocation_unit_type","legal_entity_id","lifecycle_status","display_order","notes"]}'::jsonb
  when 'roles' then '{"table":"roles","id":"role_id","stable":["role_code"],"generic":true,"required":["role_code","display_name","role_group"],"writable":["role_code","display_name","role_group","daycare_relevant","lifecycle_status","display_order","notes"]}'::jsonb
  when 'compensation_factors' then '{"table":"compensation_factors","id":"compensation_factor_id","stable":["compensation_factor_code"],"generic":true,"required":["compensation_factor_code","display_name","value_type"],"writable":["compensation_factor_code","display_name","value_type","lifecycle_status","display_order"]}'::jsonb
  when 'budget_categories' then '{"table":"budget_categories","id":"budget_category_id","stable":["budget_category_code"],"generic":true,"required":["budget_category_code","display_name","category_type"],"writable":["budget_category_code","display_name","category_type","lifecycle_status","display_order","requires_budget","budget_source","parent_budget_category_id","notes"]}'::jsonb
  when 'budget_rules' then '{"table":"budget_rules","id":"budget_rule_id","stable":["budget_category_id","effective_from","rule_type","daycare_id","allocation_unit_id"],"generic":true,"required":["budget_category_id","effective_from","rule_type"],"writable":["budget_category_id","school_year_id","calendar_year_id","daycare_id","allocation_unit_id","age_group_id","effective_from","effective_to","rule_type","numeric_value","text_value","lifecycle_status","calculation_source","actual_performance_source","contract_notes","calculation_method","parameter_1","parameter_2","show_budget","display_scope","effective_from_month_id","effective_to_month_id","standard_type","minimum_staff","rounding_method"]}'::jsonb
  when 'classrooms' then '{"table":"classrooms","id":"classroom_id","stable":["daycare_id","classroom_code","effective_from"],"generic":true,"required":["daycare_id","classroom_code","display_name","effective_from"],"writable":["daycare_id","classroom_code","display_name","is_mixed","effective_from","effective_to","lifecycle_status","display_order","licensed_capacity","notes"]}'::jsonb
  when 'monthly_enrollment' then '{"table":"monthly_enrollment","id":"monthly_enrollment_id","stable":["classroom_id","reporting_month","age_group_id"],"generic":true,"required":["classroom_id","reporting_month","age_group_id","children_count"],"writable":["classroom_id","reporting_month","age_group_id","children_count","notes"]}'::jsonb
  when 'bank_accounts' then '{"table":"bank_accounts","id":"bank_account_id","stable":["bank_account_code"],"generic":true,"required":["bank_account_code","display_name","legal_entity_id"],"writable":["bank_account_code","display_name","legal_entity_id","account_identifier_masked","lifecycle_status","display_order","source_account_number","notes"]}'::jsonb
  when 'bank_transactions' then '{"table":"bank_transactions","id":"bank_transaction_id","stable":["source_fingerprint"],"generic":true,"required":["bank_account_id","transaction_date","description","amount","source_fingerprint","import_batch_id"],"writable":["bank_account_id","transaction_date","description","reference_number","amount","source_fingerprint","source_payload","import_batch_id","debit_amount","credit_amount","sheet_transaction_id","movement_type"]}'::jsonb
  when 'accounting_statuses' then '{"table":"accounting_statuses","id":"accounting_status_id","stable":["accounting_status_code"],"generic":true,"required":["accounting_status_code","display_name"],"writable":["accounting_status_code","display_name","display_order","is_final","lifecycle_status"]}'::jsonb
  when 'children' then '{"table":"children","id":"child_id","stable":["source_system","source_record_id"],"stable_mode":"ANY","generic":true,"required":["first_name","last_name"],"writable":["child_code","first_name","last_name","birth_date","lifecycle_status","source_system","source_record_id","source_version","source_mapping_version","source_payload","unmapped_fields"]}'::jsonb
  when 'child_enrollments' then '{"table":"child_enrollments","id":"child_enrollment_id","stable":["child_id","daycare_id","effective_from"],"generic":true,"required":["child_id","daycare_id","effective_from","status"],"writable":["child_id","daycare_id","classroom_id","effective_from","effective_to","status","source_system","source_record_id","source_version","source_mapping_version","source_payload","unmapped_fields"]}'::jsonb
  when 'daycare_billing_records' then '{"table":"daycare_billing_records","id":"daycare_billing_record_id","stable":["child_id","billing_month"],"generic":true,"required":["child_id","daycare_id","billing_month","amount_due","status"],"writable":["child_id","child_enrollment_id","daycare_id","billing_month","amount_due","amount_collected","status","source_system","source_record_id","source_version","source_mapping_version","source_payload","unmapped_fields"]}'::jsonb
  when 'collection_receipts' then '{"table":"collection_receipts","id":"collection_receipt_id","stable":["source_system","source_record_id"],"stable_mode":"ANY","generic":true,"required":["daycare_billing_record_id","receipt_date","amount"],"writable":["daycare_billing_record_id","receipt_date","amount","reference","source_system","source_record_id","source_version","source_mapping_version","source_payload","unmapped_fields"]}'::jsonb
  else null
 end;
$$;

create or replace function public.portal_mcp_operational_report()
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare e text; m jsonb; n bigint; counts jsonb='{}'::jsonb;
begin
 if not private.portal_is_authorized(auth.uid(),'OPERATIONS.READ') then raise exception 'Not authorized' using errcode='42501'; end if;
 for e in select unnest(array['employees','employments','employee_assignments','employee_certificates','employee_pay_terms','employee_compensation_eligibility','employee_leave_periods','payroll_records','payroll_allocations','bank_accounts','bank_transactions','bank_allocations','suppliers','payment_requests','allocation_units','roles','compensation_factors','budget_categories','budget_rules','classrooms','monthly_enrollment','accounting_statuses','children','child_enrollments','daycare_billing_records','collection_receipts']) loop
  m:=private.portal_mcp_entity_meta(e); execute format('select count(*) from public.%I',m->>'table') into n; counts:=counts||jsonb_build_object(e,n);
 end loop;
 return jsonb_build_object('counts',counts,'generated_at',now(),'unsupported',jsonb_build_array());
end $$;

create or replace function public.portal_mcp_operational_catalog()
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare e text; m jsonb; entities jsonb='[]'::jsonb;
begin
 if not private.portal_is_authorized(auth.uid(),'OPERATIONS.READ') then return null; end if;
 for e in select unnest(array['employees','employments','employee_assignments','employee_certificates','employee_pay_terms','employee_compensation_eligibility','employee_leave_periods','payroll_records','payroll_allocations','bank_allocations','suppliers','payment_requests','allocation_units','roles','compensation_factors','budget_categories','budget_rules','classrooms','monthly_enrollment','bank_accounts','bank_transactions','accounting_statuses','children','child_enrollments','daycare_billing_records','collection_receipts']) loop
  m:=private.portal_mcp_entity_meta(e); entities:=entities||jsonb_build_array(jsonb_build_object('entity',e,'id',m->>'id','stable_keys',coalesce(m->'stable','[]'::jsonb),'writable',coalesce(m->'writable',to_jsonb('specialized'::text)),'required_on_create',coalesce(m->'required','[]'::jsonb),'approval_required',true));
 end loop;
 return jsonb_build_object('entities',entities,'row_contract',jsonb_build_object('entity','catalog entity','record_id','UUID for corrections','expected_row_version','required for corrections','values','canonical field/value object'),'limits',jsonb_build_object('rows_per_batch',100,'approval_minutes',10),'unsupported',jsonb_build_array());
end $$;

revoke all on function public.portal_mcp_operational_report(),public.portal_mcp_operational_catalog() from public,anon;
grant execute on function public.portal_mcp_operational_report(),public.portal_mcp_operational_catalog() to authenticated;

