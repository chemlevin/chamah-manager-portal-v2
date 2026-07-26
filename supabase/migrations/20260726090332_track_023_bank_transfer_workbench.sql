-- TRACK023: Preview-only bank-transfer Workbench.
-- Browser roles are intentionally denied direct table access. The authenticated
-- Edge Function enforces portal permission and uses the service role.

insert into public.portal_sections (
  screen_code, parent_screen_code, route, display_name, icon, description,
  display_order, is_active, is_navigation_item, is_scope_required
) values (
  'dashboards.accounting.bank-transfers',
  'dashboards.accounting',
  'dashboards/unit/organization/accounting/bank-transfers',
  'העברות בנקאיות',
  '↔',
  'סביבת עבודה להכנה, פיצול ומעקב אחר העברות בנקאיות.',
  25,
  true,
  false,
  true
)
on conflict (screen_code) do update set
  parent_screen_code = excluded.parent_screen_code,
  route = excluded.route,
  display_name = excluded.display_name,
  icon = excluded.icon,
  description = excluded.description,
  display_order = excluded.display_order,
  is_active = excluded.is_active,
  is_navigation_item = excluded.is_navigation_item,
  is_scope_required = excluded.is_scope_required,
  updated_at = timezone('utc', now());

create table if not exists public.bank_transfers (
  bank_transfer_id uuid primary key default gen_random_uuid(),
  row_number bigint generated always as identity unique,
  transfer_number bigint generated always as identity unique,
  parent_transfer_id uuid references public.bank_transfers(bank_transfer_id) on delete restrict,
  name text not null default '',
  amount numeric(14,2) not null default 0,
  bank text,
  branch text,
  account_number text,
  account_holder text,
  budget_category_id uuid references public.budget_categories(budget_category_id) on delete restrict,
  notes text,
  allocation_unit_id uuid references public.allocation_units(allocation_unit_id) on delete restrict,
  daycare_id uuid references public.daycares(daycare_id) on delete restrict,
  status text not null default 'PENDING',
  execution_date date,
  attachment_path text,
  attachment_name text,
  attachment_content_type text,
  attachment_size_bytes bigint,
  lifecycle_status text not null default 'ACTIVE',
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1,
  constraint bank_transfers_amount_chk check (amount >= 0),
  constraint bank_transfers_status_chk check (status in ('PENDING', 'COMPLETED', 'PROBLEM')),
  constraint bank_transfers_execution_chk check (status <> 'COMPLETED' or execution_date is not null),
  constraint bank_transfers_lifecycle_chk check (lifecycle_status in ('ACTIVE', 'ARCHIVED')),
  constraint bank_transfers_attachment_size_chk check (attachment_size_bytes is null or attachment_size_bytes between 1 and 10485760),
  constraint bank_transfers_daycare_unit_chk check (
    daycare_id is null or allocation_unit_id is not null
  )
);

create index if not exists bank_transfers_parent_idx
  on public.bank_transfers(parent_transfer_id)
  where lifecycle_status = 'ACTIVE';
create index if not exists bank_transfers_status_idx
  on public.bank_transfers(status)
  where lifecycle_status = 'ACTIVE';
create index if not exists bank_transfers_unit_idx
  on public.bank_transfers(allocation_unit_id)
  where lifecycle_status = 'ACTIVE';
create index if not exists bank_transfers_daycare_idx
  on public.bank_transfers(daycare_id)
  where lifecycle_status = 'ACTIVE';
create index if not exists bank_transfers_budget_category_idx
  on public.bank_transfers(budget_category_id)
  where lifecycle_status = 'ACTIVE';

create or replace function public.validate_bank_transfer()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  parent_row public.bank_transfers;
  selected_daycare public.daycares;
begin
  if new.daycare_id is not null then
    select * into selected_daycare
    from public.daycares
    where daycare_id = new.daycare_id and lifecycle_status = 'ACTIVE';
    if selected_daycare.daycare_id is null
       or selected_daycare.allocation_unit_id <> new.allocation_unit_id then
      raise exception 'Daycare must belong to the selected department';
    end if;
  end if;

  if new.parent_transfer_id is not null then
    select * into parent_row
    from public.bank_transfers
    where bank_transfer_id = new.parent_transfer_id
      and lifecycle_status = 'ACTIVE';
    if parent_row.bank_transfer_id is null then
      raise exception 'Active split parent not found';
    end if;
    if parent_row.parent_transfer_id is not null then
      raise exception 'Bank transfer splits are limited to one level';
    end if;
    if new.bank_transfer_id = new.parent_transfer_id then
      raise exception 'A transfer cannot be its own split parent';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bank_transfers_validate on public.bank_transfers;
create trigger bank_transfers_validate
before insert or update on public.bank_transfers
for each row execute function public.validate_bank_transfer();

drop trigger if exists bank_transfers_updated_at_version on public.bank_transfers;
create trigger bank_transfers_updated_at_version
before update on public.bank_transfers
for each row execute function public.set_updated_at_and_version();

alter table public.bank_transfers enable row level security;
revoke all on public.bank_transfers from public, anon, authenticated;
grant all on public.bank_transfers to service_role;
revoke all on function public.validate_bank_transfer() from public, anon, authenticated;
grant execute on function public.validate_bank_transfer() to service_role;

insert into storage.buckets (id, name, public, file_size_limit)
values ('bank-transfer-attachments', 'bank-transfer-attachments', false, 10485760)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760;

comment on table public.bank_transfers is
  'TRACK023 bank-transfer preparation ledger. Parent rows preserve original amounts; child rows are one-level paid parts.';
comment on column public.bank_transfers.execution_date is
  'Manual execution date. Database rejects COMPLETED without a value and never fills it automatically.';
comment on column public.bank_transfers.allocation_unit_id is
  'Department lookup from Supabase allocation_units; free text is not accepted.';
comment on column public.bank_transfers.daycare_id is
  'Daycare lookup from Supabase daycares; must belong to allocation_unit_id.';
