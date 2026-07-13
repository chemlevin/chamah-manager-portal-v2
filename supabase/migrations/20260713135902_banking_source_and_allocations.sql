create table public.bank_accounts (
  bank_account_id uuid primary key default gen_random_uuid(),
  bank_account_code varchar(50) not null unique,
  display_name varchar(150) not null,
  legal_entity_id uuid not null references public.legal_entities(legal_entity_id),
  account_identifier_masked varchar(100),
  lifecycle_status varchar(20) not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','INACTIVE','ARCHIVED')),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0)
);

create table public.bank_transactions (
  bank_transaction_id uuid primary key default gen_random_uuid(),
  bank_account_id uuid not null references public.bank_accounts(bank_account_id),
  transaction_date date not null,
  description text not null,
  reference_number varchar(100),
  amount numeric(14,2) not null,
  source_fingerprint varchar(128) not null,
  source_payload jsonb not null default '{}'::jsonb,
  import_batch_id uuid not null references public.import_batches(import_batch_id),
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0),
  unique (bank_account_id, source_fingerprint)
);

create table public.bank_allocations (
  bank_allocation_id uuid primary key default gen_random_uuid(),
  bank_transaction_id uuid not null references public.bank_transactions(bank_transaction_id),
  allocation_unit_id uuid references public.allocation_units(allocation_unit_id),
  daycare_id uuid references public.daycares(daycare_id),
  budget_category_id uuid,
  budget_month date not null check (budget_month = date_trunc('month', budget_month)::date),
  allocation_amount numeric(14,2) not null,
  accounting_status varchar(30) not null default 'UNCLASSIFIED' check (accounting_status in ('UNCLASSIFIED','CLASSIFIED','READY_FOR_ACCOUNTING','SENT_TO_ACCOUNTING','ACCOUNTED','EXCLUDED')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0),
  check (allocation_unit_id is not null or daycare_id is not null)
);

create index idx_bank_accounts_legal_entity on public.bank_accounts(legal_entity_id);
create index idx_bank_transactions_account_date on public.bank_transactions(bank_account_id, transaction_date);
create index idx_bank_transactions_import_batch on public.bank_transactions(import_batch_id);
create index idx_bank_allocations_transaction on public.bank_allocations(bank_transaction_id);
create index idx_bank_allocations_budget_month on public.bank_allocations(budget_month);
create index idx_bank_allocations_unit on public.bank_allocations(allocation_unit_id);

create trigger trg_bank_accounts_updated_at before update on public.bank_accounts for each row execute function public.set_updated_at();
create trigger trg_bank_transactions_updated_at before update on public.bank_transactions for each row execute function public.set_updated_at();
create trigger trg_bank_allocations_updated_at before update on public.bank_allocations for each row execute function public.set_updated_at();

alter table public.bank_accounts enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.bank_allocations enable row level security;

comment on table public.bank_accounts is 'Stable bank account master data with masked identifiers only.';
comment on table public.bank_transactions is 'Immutable imported source transactions from bank files.';
comment on table public.bank_allocations is 'Manual accounting and budget allocations that remain separate from source transactions.';