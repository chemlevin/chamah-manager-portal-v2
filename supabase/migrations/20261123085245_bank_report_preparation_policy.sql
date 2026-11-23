-- Bank report preparation policy.
-- Preparation-only: no canonical bank data is created or modified.
do $$
declare v_id uuid; v_actor uuid;
begin
  select id into v_id
  from public.portal_policy_documents
  where title = 'Bank Report Preparation Policy'
  order by created_at desc
  limit 1;

  if v_id is null then
    select p.user_id into v_actor
    from public.portal_user_profiles p
    where p.is_active and p.is_super_admin
    order by p.display_name, p.user_id
    limit 1;

    if v_actor is null then
      raise exception 'No active super administrator available for policy seed';
    end if;

    insert into public.portal_policy_documents(
      title, category, draft_body, published_body, published_version, status,
      created_by, updated_by, published_by, published_at, published_title
    ) values (
      'Bank Report Preparation Policy',
      'BANK_REPORT_PREPARATION',
      $policy$BANK REPORT PREPARATION POLICY
policy_namespace: bank_report_preparation
policy_version: 1
mode: PREPARATION_ONLY
effective_from: 2026-11-23

PURPOSE
Prepare bank reports for secretary review. This policy does not upload, approve, commit, reconcile, or write canonical bank data.

SOURCE OF TRUTH
This published database policy is authoritative for preparation behavior. Google Sheets and uploaded files are source evidence only.

PRESERVE EVERY SOURCE ROW
- Keep exactly one preparation row for every source bank movement.
- Preserve fees, refunds, reversals, transfers, and rows that appear duplicated.
- Never merge or delete rows based only on date, description, amount, or reference.
- Preserve original debit and credit separately. Blank remains blank; do not replace blank with zero.
- Preserve original values and raw source payload.

PROVENANCE REQUIRED
For every preparation row preserve:
- source file name and stable file identifier when available;
- source sheet/tab;
- source account code;
- source row number;
- reporting period when present;
- original source values;
- source document or attachment reference;
- preparation status and missing/conflict reasons.

DETERMINISTIC PREPARATION ID
Use preparation_source_fingerprint derived deterministically from:
source file identity + source sheet/tab + source row number + normalized original row content.
It must be stable on repeated processing, distinguish repeated reference numbers, and must not be confused with a future canonical bank_transaction_id or upload batch ID.

NO GUESSING
Do not infer or invent:
- bank name;
- verified account number;
- legal entity/account owner;
- daycare assignment;
- effective dates;
- transaction classification;
- accounting category.
If evidence is missing or contradictory, preserve the row and mark NEEDS_REVIEW with the exact missing/conflicting fields.

NO CANONICAL WRITES
Preparation must not create or update:
- public.bank_accounts;
- public.bank_transactions;
- public.bank_allocations;
- import_batches;
- approval or commit records.
Do not require bank_account_id or import_batch_id in preparation mode.

SEPARATION FROM FUTURE UPLOAD
Upload, reconciliation, approval, commit, canonical identifiers, and import batch rules are separate workflows. Do not apply them while preparing a secretary report.

IDEMPOTENCY
Processing the same source file and unchanged source row more than once must not create duplicate preparation rows. Changed source content must produce a new fingerprint and remain traceable to the original source.

OUTPUT
Return a secretary-ready preparation result with:
- preserved rows;
- provenance;
- deterministic preparation identifiers;
- missing-data flags;
- conflict flags;
- NEEDS_REVIEW rows;
- totals based only on source values, without inferred accounting classifications.$policy$,
      $policy$BANK REPORT PREPARATION POLICY
policy_namespace: bank_report_preparation
policy_version: 1
mode: PREPARATION_ONLY
effective_from: 2026-11-23

PURPOSE
Prepare bank reports for secretary review. This policy does not upload, approve, commit, reconcile, or write canonical bank data.

SOURCE OF TRUTH
This published database policy is authoritative for preparation behavior. Google Sheets and uploaded files are source evidence only.

PRESERVE EVERY SOURCE ROW
- Keep exactly one preparation row for every source bank movement.
- Preserve fees, refunds, reversals, transfers, and rows that appear duplicated.
- Never merge or delete rows based only on date, description, amount, or reference.
- Preserve original debit and credit separately. Blank remains blank; do not replace blank with zero.
- Preserve original values and raw source payload.

PROVENANCE REQUIRED
For every preparation row preserve:
- source file name and stable file identifier when available;
- source sheet/tab;
- source account code;
- source row number;
- reporting period when present;
- original source values;
- source document or attachment reference;
- preparation status and missing/conflict reasons.

DETERMINISTIC PREPARATION ID
Use preparation_source_fingerprint derived deterministically from:
source file identity + source sheet/tab + source row number + normalized original row content.
It must be stable on repeated processing, distinguish repeated reference numbers, and must not be confused with a future canonical bank_transaction_id or upload batch ID.

NO GUESSING
Do not infer or invent:
- bank name;
- verified account number;
- legal entity/account owner;
- daycare assignment;
- effective dates;
- transaction classification;
- accounting category.
If evidence is missing or contradictory, preserve the row and mark NEEDS_REVIEW with the exact missing/conflicting fields.

NO CANONICAL WRITES
Preparation must not create or update:
- public.bank_accounts;
- public.bank_transactions;
- public.bank_allocations;
- import_batches;
- approval or commit records.
Do not require bank_account_id or import_batch_id in preparation mode.

SEPARATION FROM FUTURE UPLOAD
Upload, reconciliation, approval, commit, canonical identifiers, and import batch rules are separate workflows. Do not apply them while preparing a secretary report.

IDEMPOTENCY
Processing the same source file and unchanged source row more than once must not create duplicate preparation rows. Changed source content must produce a new fingerprint and remain traceable to the original source.

OUTPUT
Return a secretary-ready preparation result with:
- preserved rows;
- provenance;
- deterministic preparation identifiers;
- missing-data flags;
- conflict flags;
- NEEDS_REVIEW rows;
- totals based only on source values, without inferred accounting classifications.$policy$,
      1, 'PUBLISHED', v_actor, v_actor, v_actor, now(),
      'Bank Report Preparation Policy'
    ) returning id into v_id;

    insert into public.portal_policy_versions(
      document_id, version, title, body, published_by
    ) values (
      v_id, 1, 'Bank Report Preparation Policy',
      $policy$BANK REPORT PREPARATION POLICY
policy_namespace: bank_report_preparation
policy_version: 1
mode: PREPARATION_ONLY
effective_from: 2026-11-23

PURPOSE
Prepare bank reports for secretary review. This policy does not upload, approve, commit, reconcile, or write canonical bank data.

SOURCE OF TRUTH
This published database policy is authoritative for preparation behavior. Google Sheets and uploaded files are source evidence only.

PRESERVE EVERY SOURCE ROW
- Keep exactly one preparation row for every source bank movement.
- Preserve fees, refunds, reversals, transfers, and rows that appear duplicated.
- Never merge or delete rows based only on date, description, amount, or reference.
- Preserve original debit and credit separately. Blank remains blank; do not replace blank with zero.
- Preserve original values and raw source payload.

PROVENANCE REQUIRED
For every preparation row preserve:
- source file name and stable file identifier when available;
- source sheet/tab;
- source account code;
- source row number;
- reporting period when present;
- original source values;
- source document or attachment reference;
- preparation status and missing/conflict reasons.

DETERMINISTIC PREPARATION ID
Use preparation_source_fingerprint derived deterministically from:
source file identity + source sheet/tab + source row number + normalized original row content.
It must be stable on repeated processing, distinguish repeated reference numbers, and must not be confused with a future canonical bank_transaction_id or upload batch ID.

NO GUESSING
Do not infer or invent:
- bank name;
- verified account number;
- legal entity/account owner;
- daycare assignment;
- effective dates;
- transaction classification;
- accounting category.
If evidence is missing or contradictory, preserve the row and mark NEEDS_REVIEW with the exact missing/conflicting fields.

NO CANONICAL WRITES
Preparation must not create or update:
- public.bank_accounts;
- public.bank_transactions;
- public.bank_allocations;
- import_batches;
- approval or commit records.
Do not require bank_account_id or import_batch_id in preparation mode.

SEPARATION FROM FUTURE UPLOAD
Upload, reconciliation, approval, commit, canonical identifiers, and import batch rules are separate workflows. Do not apply them while preparing a secretary report.

IDEMPOTENCY
Processing the same source file and unchanged source row more than once must not create duplicate preparation rows. Changed source content must produce a new fingerprint and remain traceable to the original source.

OUTPUT
Return a secretary-ready preparation result with:
- preserved rows;
- provenance;
- deterministic preparation identifiers;
- missing-data flags;
- conflict flags;
- NEEDS_REVIEW rows;
- totals based only on source values, without inferred accounting classifications.$policy$,
      v_actor
    );
  end if;
end $$;