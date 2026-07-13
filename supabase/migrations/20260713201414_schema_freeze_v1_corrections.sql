-- Chamah Manager Portal - Schema Freeze v1 corrective migration.
--
-- Scope:
-- - Keep the existing 33-table schema.
-- - Correct constrained business values and integrity contracts.
-- - Do not drop tables, delete data, add API behavior, or change Google Sheets.

-- ---------------------------------------------------------------------------
-- Bank accounting statuses: stable codes for the exact Handbook values.
-- ---------------------------------------------------------------------------

alter table public.bank_allocations
  alter column accounting_status drop default,
  alter column accounting_status drop not null;

alter table public.bank_allocations
  drop constraint if exists bank_allocations_accounting_status_check;

alter table public.bank_allocations
  add constraint bank_allocations_accounting_status_check
  check (
    accounting_status is null
    or accounting_status in (
      'PENDING_SUBMISSION',
      'SENT_TO_ACCOUNTING',
      'MISSING_DOCUMENTS',
      'NO_SUPPORTING_DOCUMENT_REQUIRED'
    )
  );

comment on column public.bank_allocations.accounting_status is
  'Stable code for Handbook BR-0134 values: Pending Submission, Sent to Accounting, Missing Documents, No Supporting Document Required. NULL represents No Accounting Status.';

-- ---------------------------------------------------------------------------
-- Budget category types: Handbook BR-0050 category concepts only.
-- ---------------------------------------------------------------------------

alter table public.budget_categories
  drop constraint if exists budget_categories_category_type_check;

alter table public.budget_categories
  add constraint budget_categories_category_type_check
  check (category_type in ('INCOME', 'EXPENSE', 'INTERNAL_OFFSET', 'MANUAL_UNDEFINED'));

comment on column public.budget_categories.category_type is
  'Handbook BR-0050 category type code: Income, Expense, Internal Offset, Manual / Undefined. PAYROLL is not a category type.';

-- ---------------------------------------------------------------------------
-- Budget rule contracts: compact model with approved calculation method classes.
-- ---------------------------------------------------------------------------

alter table public.budget_rules
  add column calculation_source varchar(20),
  add column actual_performance_source varchar(20),
  add column contract_notes jsonb not null default '{}'::jsonb;

alter table public.budget_rules
  drop constraint if exists budget_rules_rule_type_check,
  drop constraint if exists budget_rules_check1;

alter table public.budget_rules
  add constraint budget_rules_rule_type_check
  check (rule_type in ('FORMULA_BASED', 'FIXED_AMOUNT', 'MANUAL', 'EXTERNAL_SOURCE'));

alter table public.budget_rules
  add constraint budget_rules_sources_check
  check (
    (calculation_source is null or calculation_source in ('BANKS', 'PAYROLL', 'CHILDREN', 'SYSTEM', 'MANUAL'))
    and
    (actual_performance_source is null or actual_performance_source in ('BANKS', 'PAYROLL', 'CHILDREN', 'SYSTEM', 'MANUAL'))
  );

alter table public.budget_rules
  add constraint budget_rules_scope_check
  check (school_year_id is not null or calendar_year_id is not null);

alter table public.budget_rules
  add constraint budget_rules_value_contract_check
  check (
    (rule_type = 'FIXED_AMOUNT' and numeric_value is not null and text_value is null)
    or
    (rule_type = 'FORMULA_BASED' and text_value is not null)
    or
    (rule_type = 'EXTERNAL_SOURCE' and text_value is not null and calculation_source is not null)
    or
    (rule_type = 'MANUAL' and (numeric_value is not null or text_value is not null))
  );

comment on table public.budget_rules is
  'Compact effective-dated budget rule table. Approved rule_type values are FORMULA_BASED, FIXED_AMOUNT, MANUAL, and EXTERNAL_SOURCE; text_value stores an approved method/source code, not an ad-hoc formula.';
comment on column public.budget_rules.calculation_source is
  'Optional Handbook BR-0052/BR-0063 calculation source code: BANKS, PAYROLL, CHILDREN, SYSTEM, or MANUAL.';
comment on column public.budget_rules.actual_performance_source is
  'Optional Handbook BR-0053 actual performance source code: BANKS, PAYROLL, CHILDREN, SYSTEM, or MANUAL.';
comment on column public.budget_rules.contract_notes is
  'Documentation payload for rule meaning, required dimensions, nullable dimensions, value field, prohibited combinations, time model, source, and validation.';

comment on table public.budget_snapshots is
  'Immutable locked monthly budget snapshots created only by explicit lock action. Dynamic unlocked budget results are calculated at runtime and are not stored here.';

-- ---------------------------------------------------------------------------
-- Data Quality / Approved Ignore metadata.
-- ---------------------------------------------------------------------------

alter table public.data_quality_issues
  add column approved_ignore_approved_by_user_id uuid,
  add column approved_ignore_approved_at timestamptz,
  add column approved_ignore_reason text,
  add column approved_ignore_expires_at timestamptz,
  add column original_issue_history jsonb not null default '[]'::jsonb;

alter table public.data_quality_issues
  drop constraint if exists data_quality_issues_severity_check,
  drop constraint if exists data_quality_issues_status_check;

alter table public.data_quality_issues
  add constraint data_quality_issues_severity_check
  check (severity in ('CRITICAL', 'WARNING', 'INFORMATION', 'OK'));

alter table public.data_quality_issues
  add constraint data_quality_issues_status_check
  check (status in ('OPEN', 'RESOLVED', 'APPROVED_IGNORE'));

alter table public.data_quality_issues
  add constraint data_quality_issues_approved_ignore_metadata_check
  check (
    status <> 'APPROVED_IGNORE'
    or (
      approved_ignore_approved_by_user_id is not null
      and approved_ignore_approved_at is not null
      and nullif(btrim(approved_ignore_reason), '') is not null
      and (
        approved_ignore_expires_at is null
        or approved_ignore_expires_at > approved_ignore_approved_at
      )
    )
  );

comment on column public.data_quality_issues.severity is
  'Handbook data-quality severity code: CRITICAL, WARNING, INFORMATION, or OK.';
comment on column public.data_quality_issues.status is
  'Handbook data-quality status code: OPEN, RESOLVED, or APPROVED_IGNORE.';
comment on column public.data_quality_issues.original_issue_history is
  'Immutable-style JSON history for original issue details and status transitions retained for audit.';

-- ---------------------------------------------------------------------------
-- Bank source traceability and immutable source behavior.
-- ---------------------------------------------------------------------------

alter table public.bank_transactions
  add column debit_amount numeric(14,2) not null default 0,
  add column credit_amount numeric(14,2) not null default 0;

alter table public.bank_transactions
  add constraint bank_transactions_debit_credit_nonnegative_check
  check (debit_amount >= 0 and credit_amount >= 0);

alter table public.bank_transactions
  add constraint bank_transactions_debit_credit_exclusive_check
  check (
    (debit_amount = 0 and credit_amount = 0 and amount = 0)
    or
    (debit_amount > 0 and credit_amount = 0 and amount = -debit_amount)
    or
    (credit_amount > 0 and debit_amount = 0 and amount = credit_amount)
  );

comment on column public.bank_transactions.debit_amount is
  'First-class read-only imported Debit value from bank source data.';
comment on column public.bank_transactions.credit_amount is
  'First-class read-only imported Credit value from bank source data.';
comment on column public.bank_transactions.amount is
  'Signed bank amount derived from source Debit/Credit: credit positive, debit negative.';
comment on column public.bank_transactions.source_payload is
  'Original imported bank source payload retained for traceability.';

create or replace function public.prevent_bank_transaction_source_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.bank_account_id is distinct from new.bank_account_id
    or old.transaction_date is distinct from new.transaction_date
    or old.description is distinct from new.description
    or old.reference_number is distinct from new.reference_number
    or old.debit_amount is distinct from new.debit_amount
    or old.credit_amount is distinct from new.credit_amount
    or old.amount is distinct from new.amount
    or old.source_fingerprint is distinct from new.source_fingerprint
    or old.source_payload is distinct from new.source_payload
    or old.import_batch_id is distinct from new.import_batch_id
  then
    raise exception 'Bank transaction source data is immutable after import';
  end if;
  return new;
end;
$$;

drop trigger if exists bank_transactions_prevent_source_update on public.bank_transactions;
create trigger bank_transactions_prevent_source_update
before update on public.bank_transactions
for each row execute function public.prevent_bank_transaction_source_update();

-- ---------------------------------------------------------------------------
-- Allocation target integrity: allocation_unit_id is authoritative.
-- ---------------------------------------------------------------------------

alter table public.bank_allocations
  alter column allocation_unit_id set not null;

alter table public.bank_allocations
  drop constraint if exists bank_allocations_check;

alter table public.bank_allocations
  add constraint bank_allocations_authoritative_target_check
  check (allocation_unit_id is not null and daycare_id is null);

comment on column public.bank_allocations.allocation_unit_id is
  'Authoritative flat allocation target for daycare, office, management, or development units.';
comment on column public.bank_allocations.daycare_id is
  'Deprecated compatibility pointer. Must remain NULL in Schema Freeze v1; daycare targeting is represented by allocation_unit_id.';
comment on column public.payroll_allocations.allocation_unit_id is
  'Authoritative flat payroll allocation target for daycare, office, management, or development units.';

-- ---------------------------------------------------------------------------
-- Payroll reconciliation: drafts are allowed, finalized rows must reconcile.
-- ---------------------------------------------------------------------------

alter table public.payroll_allocations
  add column allocation_status varchar(20) not null default 'DRAFT';

alter table public.payroll_allocations
  add constraint payroll_allocations_status_check
  check (allocation_status in ('DRAFT', 'FINALIZED'));

alter table public.payroll_allocations
  add constraint payroll_allocations_amount_nonnegative_check
  check (allocation_amount >= 0);

comment on column public.payroll_allocations.allocation_status is
  'DRAFT allocations may be incomplete. FINALIZED allocations for a payroll record must reconcile to employer_cost, source hours, and 100 percent.';

create or replace function public.validate_finalized_payroll_allocations(p_payroll_record_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  record_cost numeric(14,2);
  source_hours numeric(10,2);
  finalized_count integer;
  draft_count integer;
  missing_percent_count integer;
  missing_hours_count integer;
  amount_total numeric(14,2);
  percent_total numeric(10,4);
  hours_total numeric(10,2);
  inconsistent_amount_count integer;
begin
  if p_payroll_record_id is null then
    return;
  end if;

  select employer_cost, coalesce(regular_hours, 0) + coalesce(overtime_hours, 0)
  into record_cost, source_hours
  from public.payroll_records
  where payroll_record_id = p_payroll_record_id;

  if not found then
    return;
  end if;

  select
    count(*) filter (where allocation_status = 'FINALIZED'),
    count(*) filter (where allocation_status = 'DRAFT'),
    count(*) filter (where allocation_status = 'FINALIZED' and allocation_percent is null),
    count(*) filter (where allocation_status = 'FINALIZED' and allocated_hours is null),
    coalesce(sum(allocation_amount) filter (where allocation_status = 'FINALIZED'), 0),
    coalesce(sum(allocation_percent) filter (where allocation_status = 'FINALIZED'), 0),
    coalesce(sum(allocated_hours) filter (where allocation_status = 'FINALIZED'), 0),
    count(*) filter (
      where allocation_status = 'FINALIZED'
        and allocation_percent is not null
        and abs(allocation_amount - round((record_cost * allocation_percent / 100.0), 2)) > 0.01
    )
  into
    finalized_count,
    draft_count,
    missing_percent_count,
    missing_hours_count,
    amount_total,
    percent_total,
    hours_total,
    inconsistent_amount_count
  from public.payroll_allocations
  where payroll_record_id = p_payroll_record_id;

  if finalized_count = 0 then
    return;
  end if;

  if draft_count > 0 then
    raise exception 'A payroll record cannot mix DRAFT and FINALIZED allocations';
  end if;

  if missing_percent_count > 0 then
    raise exception 'FINALIZED payroll allocations require allocation_percent';
  end if;

  if abs(amount_total - record_cost) > 0.01 then
    raise exception 'FINALIZED payroll allocations must sum to employer_cost';
  end if;

  if abs(percent_total - 100.0) > 0.0001 then
    raise exception 'FINALIZED payroll allocations must sum to 100 percent';
  end if;

  if inconsistent_amount_count > 0 then
    raise exception 'FINALIZED payroll allocation amount must match employer_cost and allocation_percent';
  end if;

  if source_hours > 0 then
    if missing_hours_count > 0 then
      raise exception 'FINALIZED payroll allocations require allocated_hours when source hours exist';
    end if;

    if abs(hours_total - source_hours) > 0.01 then
      raise exception 'FINALIZED payroll allocations must sum to source payroll hours';
    end if;
  end if;
end;
$$;

create or replace function public.enforce_finalized_payroll_allocations()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.validate_finalized_payroll_allocations(new.payroll_record_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    perform public.validate_finalized_payroll_allocations(old.payroll_record_id);
  end if;

  return null;
end;
$$;

drop trigger if exists payroll_allocations_reconcile_finalized on public.payroll_allocations;
create constraint trigger payroll_allocations_reconcile_finalized
after insert or update or delete on public.payroll_allocations
deferrable initially deferred
for each row execute function public.enforce_finalized_payroll_allocations();

drop trigger if exists payroll_records_reconcile_finalized on public.payroll_records;
create constraint trigger payroll_records_reconcile_finalized
after update of employer_cost, regular_hours, overtime_hours on public.payroll_records
deferrable initially deferred
for each row execute function public.enforce_finalized_payroll_allocations();

-- ---------------------------------------------------------------------------
-- RLS freeze note.
-- ---------------------------------------------------------------------------

comment on schema public is
  'Schema Freeze v1 keeps RLS enabled and adds no permissive public policies. API/auth-specific policies are deferred to a later phase.';
