-- TRACK015: bank import and secretary accounting workbench.

alter table public.bank_accounts
  add column if not exists source_account_number varchar(100);

update public.bank_accounts
set source_account_number = regexp_replace(coalesce(source_account_number, ''), '[^0-9]', '', 'g')
where source_account_number is not null;

alter table public.bank_accounts
  drop constraint if exists bank_accounts_source_account_number_digits_check;
alter table public.bank_accounts
  add constraint bank_accounts_source_account_number_digits_check
  check (source_account_number is null or source_account_number ~ '^[0-9]+$');

create unique index if not exists bank_accounts_source_account_number_uq
  on public.bank_accounts (source_account_number)
  where source_account_number is not null;

comment on column public.bank_accounts.source_account_number is
  'Normalized digits-only account number used exclusively for automatic bank import matching.';

alter table public.bank_transactions
  add column if not exists attachment_count integer not null default 0
  check (attachment_count >= 0);

comment on column public.bank_transactions.attachment_count is
  'Parent-only attachment placeholder counter. TRACK015A will implement storage.';

alter table public.bank_allocations
  add column if not exists movement_type varchar(20);

alter table public.bank_allocations
  drop constraint if exists bank_allocations_movement_type_check;
alter table public.bank_allocations
  add constraint bank_allocations_movement_type_check
  check (
    movement_type is null
    or movement_type in ('INCOME', 'EXPENSE', 'INTERNAL', 'EXCLUDE')
  );

alter table public.bank_allocations
  alter column budget_month drop not null,
  alter column allocation_unit_id drop not null;

alter table public.bank_allocations
  drop constraint if exists bank_allocations_authoritative_target_check;
alter table public.bank_allocations
  add constraint bank_allocations_target_check
  check (allocation_unit_id is not null or daycare_id is not null);

comment on column public.bank_allocations.movement_type is
  'Temporary workflow-provider code for Income, Expense, Internal, or Exclude.';
comment on column public.bank_allocations.daycare_id is
  'Optional secretary workflow daycare target; allocation_unit_id remains the department target.';

create index if not exists bank_allocations_daycare_idx
  on public.bank_allocations (daycare_id);

insert into public.portal_sections
  (screen_code,parent_screen_code,route,display_name,icon,description,display_order,is_active,is_navigation_item,is_scope_required)
values
  ('dashboards.accounting.banks','dashboards.accounting','dashboards/unit/organization/accounting/banks','קובץ בנקים','▤','ייבוא בנקים וסביבת העבודה היומית של המזכירות.',24,true,false,true)
on conflict (screen_code) do update
set display_name=excluded.display_name,
    description=excluded.description,
    route=excluded.route,
    is_active=true,
    updated_at=timezone('utc',now());
