
create table if not exists public.internal_budget_transfers (
  internal_budget_transfer_id uuid primary key default gen_random_uuid(),
  source_calculation_result_id uuid not null unique references public.calculation_rule_results(calculation_result_id) on delete restrict,
  transfer_policy_rule_id uuid not null references public.calculation_rules(calculation_rule_id) on delete restrict,
  source_rule_key uuid not null,
  source_rule_version integer not null check (source_rule_version > 0),
  source_daycare_id uuid not null references public.daycares(daycare_id) on delete restrict,
  destination_allocation_unit_id uuid not null references public.allocation_units(allocation_unit_id) on delete restrict,
  budget_category_id uuid not null references public.budget_categories(budget_category_id) on delete restrict,
  budget_month date not null check (budget_month = date_trunc('month', budget_month)::date),
  source_daycare_expense numeric(14,2) not null check (source_daycare_expense > 0),
  office_budget_income numeric(14,2) not null check (office_budget_income > 0),
  transfer_kind text not null check (transfer_kind = 'INTERNAL_BUDGET_ALLOCATION'),
  lifecycle_status text not null default 'GENERATED' check (lifecycle_status in ('GENERATED','REVERSED')),
  source_evidence jsonb not null check (jsonb_typeof(source_evidence) = 'object' and source_evidence <> '{}'::jsonb),
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete restrict,
  row_version integer not null default 1 check (row_version > 0),
  constraint internal_budget_transfers_balanced_check check (source_daycare_expense = office_budget_income)
);
alter table public.internal_budget_transfers enable row level security;
revoke all on table public.internal_budget_transfers from anon, authenticated, public;
create index if not exists internal_budget_transfers_source_daycare_month_idx on public.internal_budget_transfers (source_daycare_id,budget_month,budget_category_id);
create index if not exists internal_budget_transfers_destination_month_idx on public.internal_budget_transfers (destination_allocation_unit_id,budget_month,budget_category_id);
create or replace function private.portal_record_internal_office_budget_transfer()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$ begin return new; end; $$;
revoke all on function private.portal_record_internal_office_budget_transfer() from public;
drop trigger if exists portal_record_internal_office_budget_transfer on public.calculation_rule_results;
create trigger portal_record_internal_office_budget_transfer after insert on public.calculation_rule_results
for each row execute function private.portal_record_internal_office_budget_transfer();
