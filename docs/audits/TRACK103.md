# TRACK103 — Chamah Portal Audit for AI-Driven Automation

Status: read-only audit completed 2026-11-10  
Repository branch: `audit/track103-ai-automation`  
Supabase project inspected: `chamah-manager` (`vyyfuaqmbxvfqgbfqooc`, ACTIVE_HEALTHY)  
Scope: repository source, migrations, project documentation, live Supabase schema/row counts, and deployed Edge Function inventory. No business data, schema, function, or deployment was modified.

## 1. Executive summary

### Verified findings

The active portal is no longer primarily a Google Sheets application. The deployable single-page portal under `chamah-manager-portal/new/` uses Supabase tables directly for read models and authenticated Supabase Edge Functions for controlled writes. The database already contains the main foundations needed for automation: canonical master data, immutable source records, separate allocation rows, effective-dated workforce data, import batches, audit events, data-quality structures, permissions, and atomic write RPCs.

The strongest operational workflows are:

- Bank file upload, preview, deterministic duplicate detection, atomic confirmation, upload history, manual transaction creation, and balanced one-level allocation splits.
- Employee Excel upload with column mapping, preview, validation, and controlled upsert behavior.
- Monthly payroll opening, row preparation/import, employee matching, effective pay-term projection, allocation splits, close validation, close/reopen lifecycle, and reporting.
- Permission-scoped read-only AI access through MCP for policies, daycares, and limited staff-directory data.

The principal automation gap is orchestration, not storage. Each importer currently has its own parsing, preview, validation, duplicate, commit, and summary behavior. `import_batches` is used, but `import_rows` and `data_quality_issues` are empty in the live project, so there is no shared row-level ingestion ledger or durable review queue. Bank duplicate protection is strong; employee and payroll idempotency is narrower and depends on domain-specific keys and save behavior.

Google Sheets remains a runtime dependency only for the legacy `/api/budget`, `/api/budget-test`, and `/api/allocations` compatibility routes. Active Employees and Payroll screens no longer read Sheets. Historical `sheet_*` columns remain useful for reconciliation and should not be removed merely because the active portal is Supabase-backed.

### Recommended direction

Create one permission-scoped ingestion service over the existing Supabase model. Both browser uploads and AI integrations should submit a common ingestion envelope, receive the same preview and validation result, and invoke the same atomic domain commit functions. Preserve current canonical tables, business rules, atomic RPCs, allocations, audit trail, and human approvals. Add orchestration and provenance around them rather than building a parallel AI database or allowing AI tools to write tables directly.

## 2. Evidence and confidence

### Verified evidence sources

- Active portal and routes: `chamah-manager-portal/new/index.html`, `chamah-manager-portal/new/app.js`, `chamah-manager-portal/new/admin-framework.js`.
- Bank UI and API: `chamah-manager-portal/new/bank-workbench.js`, `supabase/functions/portal-bank-workbench/index.ts`.
- Workforce and payroll UI/API: `chamah-manager-portal/new/employee-import.js`, `chamah-manager-portal/new/workforce-workbench.js`, `chamah-manager-portal/new/employees-workbench.js`, `chamah-manager-portal/new/payroll-workbench.js`, `chamah-manager-portal/new/payroll-module.js`, `supabase/functions/portal-workforce-workbench/index.ts`.
- Configuration and permissions: `chamah-manager-portal/new/settings-center.js`, `supabase/functions/portal-settings/index.ts`, `supabase/functions/portal-users/index.ts`.
- AI/MCP surfaces: `api/mcp.js`, `supabase/functions/portal-mcp-readonly/index.ts`, `supabase/functions/portal-mcp-server/index.ts`.
- Legacy APIs: `api/budget.js`, `api/budget-engine.js`, `api/allocations.js`, `api/allocations-engine.js`, `vercel.json`.
- Database definition: `supabase/migrations/` and the live `public` schema inspected through read-only SQL.
- Prior decisions and operational rules: `PROJECT_LOG.md`, `docs/architecture/track019-configuration-legacy-api-audit.md`, `docs/architecture/track021-workforce-legacy-retirement.md`, `docs/handbook/`, and `docs/data/`.

### Interpretation rule

Items labeled **Verified** are directly evidenced by current code or the live database on 2026-11-10. Items labeled **Recommendation** are proposed future changes and are not represented as implemented.

## 3. Current system map

### 3.1 Active portal screens

**Verified**

The database-backed `portal_sections` catalog and the SPA expose these operational areas:

| Area | Active surfaces | Primary source |
|---|---|---|
| Home and dashboards | Home; organization/unit dashboards; Finance; Accounting; Staffing; Licensing; Occupancy | Supabase read model loaded by `app.js` |
| Accounting | Accounting home; Bank File workbench; Bank Transfers; Accounting Summary | `bank_transactions`, `bank_allocations`, `bank_transfers`, lookup tables; authenticated Edge Functions |
| Workforce | Employees workbench and employee import | Workforce tables through `portal-workforce-workbench` |
| Payroll | Open Month; Working Months; Closed Months; Reports | Payroll/workforce tables through `portal-workforce-workbench` |
| Calculators | Salary; Occupancy/Staffing/Profitability | Supabase-managed rules and local deterministic calculation modules |
| Administration | Users/permissions; rules; settings; audit log | Portal catalog, permission tables, 22 settings tables, `audit_events` |
| Knowledge/operations | Documents and policies; tasks; maintenance; user knowledge center | Mixed implemented/scaffolded surfaces; policy documents are database-backed |

Inactive catalog entries remain for older payroll calculation and table/variable routes. They should not be described as active functionality merely because catalog rows exist.

The old `/dashboard/` and `/employees/` compatibility pages redirect into the SPA. The old `/accounting/` surface and `/api/allocations` remain a compatibility workflow outside the canonical bank workbench.

### 3.2 Live database inventory

**Verified**

The live `public` schema contains 53 tables. The important domains are:

- Periods and organization: `school_years`, `school_year_months`, `calendar_years`, `legal_entity_types`, `legal_entities`, `allocation_units`, `daycares`, `daycare_school_years`.
- Classrooms and operating rules: `classrooms`, `age_groups`, `classroom_age_groups`, `classroom_capacity_breakdowns`, `classroom_licensing_rules`, `staffing_rules`, `staffing_budget_parameters`, `monthly_enrollment`, `monthly_work_calendars`.
- Finance and budget: `budget_categories`, `budget_rules`, `budget_snapshots`, `calculation_runs`.
- Banking and accounting: `bank_accounts`, `bank_transactions`, `bank_allocations`, `accounting_statuses`, `bank_transfers`.
- Workforce: `employees`, `employments`, `employee_assignments`, `employee_pay_terms`, `employee_certificates`, `employee_compensation_eligibility`, `employee_leave_periods`, `roles`, `certificate_types`, `compensation_factors`, `compensation_rules`, `travel_rates`.
- Payroll: `payroll_months`, `payroll_records`, `payroll_allocations`, `payroll_calculation_input_rules`.
- Ingestion, quality, and audit: `import_batches`, `import_rows`, `data_quality_issues`, `audit_events`.
- Portal security and administration: `portal_sections`, `portal_user_profiles`, `portal_user_permissions`, `portal_user_allocation_units`, `portal_user_daycares`, `portal_user_import_mappings`.
- Policies/OAuth: `portal_policy_documents`, `portal_policy_versions`, `portal_oauth_callback_relays`.

All tables returned by the Supabase schema inventory have RLS enabled. This is a foundation, not proof that every policy is least-privilege; existing security work recorded in `PROJECT_LOG.md` notes a broad Employees read policy that still requires separate review.

### 3.3 Live data footprint

**Verified on 2026-11-10**

Counts are included to distinguish implemented schema from populated operational use, without reproducing personal or transaction content.

| Table | Rows |
|---|---:|
| `bank_transactions` | 2,451 |
| `bank_allocations` | 14 |
| `bank_transfers` | 8 |
| `import_batches` | 20 |
| `import_rows` | 0 |
| `data_quality_issues` | 0 |
| `audit_events` | 92 |
| `employees` | 1 |
| `employments` | 1 |
| `employee_assignments` | 1 |
| `employee_pay_terms` | 1 |
| `employee_certificates` | 0 |
| `employee_compensation_eligibility` | 0 |
| `employee_leave_periods` | 0 |
| `payroll_months` | 1 |
| `payroll_records` | 4 |
| `payroll_allocations` | 0 |
| `portal_user_import_mappings` | 0 |

Import batches currently comprise seven completed and one running `BANK_FILE` batch, two completed `GOOGLE_SHEETS` batches, and ten completed `PAYROLL_FILE` batches. Batch counters are historical summaries and do not equal current table counts after later cleanup/deletion. One `BANK_FILE` batch remains `RUNNING`; the audit did not determine whether it represents an interrupted import, test residue, or an intentionally open batch.

### 3.4 APIs and service boundaries

**Verified**

| Service | Responsibility | Write behavior |
|---|---|---|
| `portal-bank-workbench` Edge Function | Bank reads, filtering, upload preview/confirm, manual transactions, allocation save, transaction deletion | Authenticated, permission checked; delegates critical writes to atomic RPCs |
| `portal-workforce-workbench` Edge Function | Employees, employment history, pay terms, eligibility, certificates, leave, payroll lifecycle, imports and allocations | Authenticated, permission checked; mixture of direct REST writes and atomic RPCs |
| `portal-bank-transfer-workbench` Edge Function | Transfer preparation, split/child rows, status and approval workflow | Authenticated and permission-scoped |
| `portal-settings` Edge Function | Allow-listed administration of canonical settings | Authenticated, `management.settings` EDIT, audit writes |
| `portal-users` Edge Function | User profiles, permissions and scopes | Authenticated administration |
| `portal-runtime-config` Edge Function | Runtime configuration | Read-oriented portal support |
| `api/mcp.js` | OAuth-protected, permission-scoped read-only MCP endpoint | No writes; caller JWT is forwarded to constrained RPCs |
| `portal-mcp-readonly` / `portal-mcp-server` | Supabase-hosted read-only MCP variants | No writes; caller JWT and constrained RPCs |
| `/api/budget`, `/api/budget-test` | Legacy BUDGET Sheet parsing/calculation | Google Sheets read-only |
| `/api/allocations` | Legacy BANKS Sheet allocation ledger | Google Sheets read-only |

Live deployed Edge Functions include `portal-users` v7, `portal-settings` v3, `portal-bank-workbench` v19, `portal-workforce-workbench` v24, `portal-bank-transfer-workbench` v5, `portal-runtime-config` v2, `portal-mcp-readonly` v1, `portal-mcp-server` v1, and `portal-oauth-callback-relay` v2.

## 4. Component audit

### 4.1 Import framework and provenance

#### What already exists — Verified

- `import_batches` stores source type/name/file/sheet, actor, timestamps, status, row counters, error summary, and JSON metadata.
- `import_rows` is designed for source row key/number, raw and parsed payloads, validation status/errors, and accepted entity linkage.
- `data_quality_issues` supports entity/import-row association, severity, status, explanation, resolution, approved-ignore metadata, and issue history.
- `audit_events` records entity, operation, before/after JSON, source type, actor, batch, and timestamp.
- Bank, employee, and payroll browser flows all support preview before commit.
- Bank import confirmation and allocations are atomic database functions.
- Employee users can save reusable column mappings in `portal_user_import_mappings`; the live table currently has no rows.
- The database has stable `sheet_*` identifiers and import-batch links for historical reconciliation.

#### Missing or incomplete — Verified

- Live `import_rows` and `data_quality_issues` contain zero rows despite active imports. Row-level provenance and durable validation outcomes are therefore schema capability, not current operational behavior.
- Import source-type values evolved beyond the original migration documentation (`BANK_FILE`, `PAYROLL_FILE` now exist), so older planning docs are stale.
- Each domain implements its own preview token, validation format, and summary contract.
- Preview tokens are identifiers returned to the client, but the inspected implementations do not persist a signed/expiring preview artifact. The confirm path re-validates critical bank invariants, but there is no general preview-to-commit state machine.
- No shared retry, cancellation, resumability, quarantine, or scheduled-ingestion worker was found.
- Import batches do not consistently expose parser version, connector identity, content digest, schema version, correlation ID, or idempotency key.

#### What can be automated — Recommendation

- Common ingestion state transitions: received, parsed, validated, needs review, approved, committing, completed, partially accepted, failed, cancelled.
- Row-level error persistence and downloadable correction files.
- Automatic matching to master data with confidence and explicit review for ambiguous matches.
- Retry of transient connector/parser failures without repeating accepted writes.
- Notifications for stuck `RUNNING` batches and unresolved quality issues.
- Scheduled intake from approved AI/connectors using the same preview/approval path as portal uploads.

#### What should be preserved — Recommendation

- Separate immutable source facts from manual allocation/workflow fields.
- `import_batches`, `import_rows`, `data_quality_issues`, and `audit_events` as the common control plane.
- Existing domain tables and atomic RPCs as final write targets.
- Human preview and authorization for ambiguous, financial, identity, or compensation changes.
- Historical `sheet_*` and source payload fields while legacy reconciliation remains possible.

#### What needs modification — Recommendation

- Turn the dormant row-level structures into the shared ingestion ledger.
- Define one versioned ingestion envelope and one versioned preview/result schema.
- Persist a content hash and idempotency key at batch and row levels.
- Add connector/source identity, parser version, requested operation, actor type (`USER`, `AI`, `SYSTEM`), and approval metadata.
- Ensure every accepted row links to its canonical entity and every rejected row retains a reason.

### 4.2 Bank transactions and duplicate detection

#### What already exists — Verified

- Browser parsers accept XLSX, legacy XLS, CSV, and HTML-table bank exports in `bank-workbench.js`.
- The account is matched to active `bank_accounts` master data.
- Duplicate fingerprint input is exactly bank account ID + transaction date + normalized reference + amount rounded to two decimals.
- The fingerprint is SHA-256 and protected by a unique database index on `(bank_account_id, source_fingerprint)`.
- Preview classifies importable, duplicate, and invalid rows; confirmation calls `portal_confirm_bank_import`.
- The RPC rejects malformed input, duplicate fingerprints within a submitted file, and duplicates already stored in the database, then creates the batch and transactions atomically.
- Source transactions preserve signed amount, debit/credit values, raw source payload, batch, and source fingerprint.
- Upload history uses `import_batches`, accounts, transaction ranges, and batch metadata.
- Manual bank transactions use a dedicated RPC and a unique generated fingerprint so they are not accidentally collapsed into imported rows.

#### Missing or incomplete — Verified

- Fingerprinting follows the Handbook's account/date/reference/amount key but does not use description. Two legitimate same-day transactions with the same account, blank/same reference, and same amount will collide and require manual handling outside the normal confirm path.
- No fuzzy duplicate or near-duplicate review model was found.
- `import_rows` is not populated, so rejected and duplicate source rows are summarized but not durably queryable row by row.
- One historical bank batch remains `RUNNING` without an automated stale-batch resolution mechanism.
- The parser is browser-side, which makes browser behavior part of the trusted ingestion path and prevents direct reuse by server-side AI connectors.

#### What can be automated — Recommendation

- Server-side parser adapters for each known bank export, with browser parsing retained only as a UX optimization.
- Exact duplicate rejection plus a separate possible-duplicate score using description, date proximity, reference normalization, and account-specific rules.
- Automatic reconciliation suggestions based on prior approved allocations, never automatic posting without a confidence threshold and policy.
- Stale batch detection and operator alerts.

#### What should be preserved — Recommendation

- Immutable source transactions.
- Account/date/reference/amount as the baseline exact match key.
- Database unique constraint and atomic confirmation as the final race-condition guard.
- Source/manual field separation and existing upload history.

#### What needs modification — Recommendation

- Add durable row results and a possible-duplicate review queue instead of overloading exact duplicate logic.
- Move canonical parsing/normalization to a reusable server ingestion adapter.
- Record parser/source versions so fingerprint changes are explainable and reproducible.

### 4.3 Bank allocations, manual splits, and accounting rules

#### What already exists — Verified

- `bank_transactions` holds source movements; `bank_allocations` holds manual classification and accounting fields.
- Users can assign movement type, allocation unit, daycare, budget category, budget month, accounting status, notes, and allocation amount.
- A transaction can have multiple allocation rows. The original transaction remains unchanged.
- The UI exposes add/delete split rows and identifies balanced/unbalanced splits.
- `portal-bank-workbench` requires every saved allocation amount to be non-zero, movement type/unit/month/accounting status to be present, daycare only for daycare units, and category for all non-`EXCLUDE` rows.
- Income and expense movement types are checked against category type.
- The total allocation amount must equal the original transaction amount within ₪0.01.
- `portal_save_bank_allocations` replaces the allocation set atomically and records audit history.
- Actual budget calculations in `actuals-calculations.js` exclude incomplete, contradictory, internal/excluded, and payroll-category bank rows according to existing rules.

#### Missing or incomplete — Verified

- No reusable allocation-rule table or learned suggestion store was found. Allocation is manual even when recurring descriptions/references could support suggestions.
- No explicit confidence, suggested-by, accepted-suggestion, or rule-version fields exist on `bank_allocations`.
- Accounting history is represented through shared `audit_events`; there is no dedicated status-history view optimized for accounting users.
- Only 14 allocations exist for 2,451 transactions, indicating that most bank transactions are unallocated or historical data was imported without portal allocations. The audit did not infer whether this is expected.
- The compatibility `/api/allocations` flow still models Google Sheets BANKS rows as an allocation ledger and uses different semantics from the canonical source-transaction/allocation split.

#### What can be automated — Recommendation

- Suggest allocations from approved historical patterns keyed by bank account, normalized counterparty/description, reference pattern, sign, amount band, and period.
- Detect incomplete or inconsistent rows immediately and create durable quality issues.
- Propose split templates for recurring compound payments.
- Generate accounting-document follow-up tasks based on status and attachment requirements.

#### What should be preserved — Recommendation

- One-level split rule and exact balance requirement.
- Manual approval for every financial allocation until a separately approved auto-post policy exists.
- Original transaction immutability and auditability.
- Separation between accounting status and budget allocation completeness.
- Payroll costs sourced from payroll, not bank payments.

#### What needs modification — Recommendation

- Introduce versioned suggestion/rule records separate from approved allocations.
- Capture suggestion provenance and human disposition.
- Reconcile and eventually retire the legacy BANKS allocation-ledger semantics only through an explicit migration track; do not silently map Sheet rows into canonical source transactions.

### 4.4 Employees, employment, compensation, and certificates

#### What already exists — Verified

- Canonical identity is separated into `employees`, employment periods into `employments`, and organizational/role history into `employee_assignments`.
- Employee code, national ID, and legacy sheet ID each have unique indexes where populated.
- Pay terms are effective-dated in `employee_pay_terms`; one term per employee/start date is enforced, and portal RPCs version/close terms rather than overwriting history.
- Compensation configuration is separate from employee eligibility: `compensation_factors`, `compensation_rules`, and `employee_compensation_eligibility`.
- Certificates are normalized through `certificate_types` and `employee_certificates`, with issue/expiry/status fields and expiry indexes.
- Leave periods are effective-dated in `employee_leave_periods`.
- The workbench supports employee, employment, assignment, pay-term, eligibility, certificate, and leave maintenance with audit events.
- Employee Excel import supports XLS/XLSX, user mapping, required identity/name validation, duplicate/update classification, preview, valid-row commit, and invalid-row export.
- Import messaging explicitly preserves pay terms, payroll, and history; the employee import is scoped to employee identity fields.

#### Missing or incomplete — Verified

- Live workforce data is minimal: one employee/employment/assignment/pay term and no certificate, eligibility, or leave records. Schema completeness is therefore not the same as operational adoption.
- The employee importer does not populate `import_rows` or `data_quality_issues`.
- Duplicate resolution is primarily employee code/national ID driven. No durable ambiguous-match queue or merge workflow was found.
- Certificate document storage is not implemented; the schema stores certificate facts but no approved attachment contract.
- Employee import mappings can be stored, but the live mapping table is empty.
- Automatic certificate expiry notifications and scheduled compliance checks were not found.
- Compensation eligibility is intentionally manual per Handbook rules; the system should not silently infer eligibility from employee facts.

#### What can be automated — Recommendation

- Identity matching suggestions using normalized employee code and national ID, with ambiguity requiring review.
- Certificate expiry reminders and missing-document tasks.
- Draft employment/assignment changes from approved HR files.
- Consistency checks across lifecycle status, employment periods, assignments, pay terms, and payroll participation.
- AI-assisted extraction of certificate metadata into a draft, followed by human validation.

#### What should be preserved — Recommendation

- Stable employee identity separate from employment and assignment history.
- Effective-dated pay terms and compensation rules.
- Manual compensation eligibility approval.
- National ID as the cross-system payroll identity key; never use name as the primary match key.
- Import isolation: an employee identity upload must not rewrite pay terms, payroll, certificates, or history unless explicitly included in an approved import type.

#### What needs modification — Recommendation

- Add a controlled employee-match review queue and explicit merge policy.
- Connect employee imports to the shared row-level ingestion ledger.
- Define a private document-storage contract before automating certificate documents.
- Add scheduled compliance evaluation that creates tasks/issues rather than changing eligibility automatically.

### 4.5 Payroll and payroll allocations

#### What already exists — Verified

- `payroll_months` controls open/current/closed lifecycle and scope.
- `payroll_records` preserves imported/manual source identity, employee matching, source payload, imported official values, monthly inputs/overrides, calculated components, actual assignment, and parent/child workflow fields.
- `payroll_allocations` separates operational allocations from source payroll records and carries unit, daycare, role, category, hours, standard hours, net, gross, and employer-cost allocations.
- Payroll months can be opened from prior month, active employees, empty state, or import; closed months are guarded against edits and may be reopened with permission and reason.
- Preview matches an employee code to an active employment and flags missing employees.
- The workbench projects effective pay terms, compensation rules/eligibility, travel rates, and database-owned calculation input rules.
- Close validation requires identity, assignments, role, actual values, and balanced split totals across employer cost, hours, standard hours, net, and gross.
- Atomic RPCs exist for open, save rows, save allocations, close, and reopen.
- Official employer cost remains sourced from payroll and is kept separate from bank payments.

#### Missing or incomplete — Verified

- The older payroll import path in `workforce-workbench.js` confirms rows sequentially through `save_record`, creating or reusing batches one record at a time. The newer monthly path supports `preview_import`/`commit_import` and batch row save, so two import styles coexist.
- No exact content-level payroll duplicate fingerprint comparable to banking was found. Uniqueness exists for sheet row ID and `(import_batch_id, source_record_identifier)`, while save behavior may find an existing row by month + employee identifier.
- `import_rows` and durable quality issues are not used.
- Live payroll usage is small: one month, four records, and no allocation rows.
- Attendance is described in Handbook rules but no separate attendance import/table workflow was found in the active implementation.

#### What can be automated — Recommendation

- Standard payroll file adapters and schema detection.
- Idempotency based on source system, payroll month, source record ID, and file/content digest.
- Employee-match review, missing-employee draft creation, and controlled reprocessing.
- Allocation suggestions from effective assignments, with human confirmation for splits or exceptions.
- Month-close readiness checks, exception tasks, and reconciliation summaries.
- Attendance ingestion as a distinct source stream linked to payroll records, without making it the source of official employer cost.

#### What should be preserved — Recommendation

- Payroll as the exclusive source of official payroll cost.
- Original source records and manual allocation separation.
- Effective-dated workforce/pay-term lookup.
- Month lifecycle, closed-month immutability, reopen permission/reason, and atomic close validation.
- Warning/review behavior for missing employees rather than silently matching by name.

#### What needs modification — Recommendation

- Consolidate the two payroll import paths behind the same batch preview/commit contract.
- Add durable row lineage and domain idempotency.
- Define attendance tables and contracts in a separate approved track before implementing attendance automation.

### 4.6 Budget, actuals, and calculations

#### What already exists — Verified

- Supabase holds budget categories/rules/snapshots, calendar and school-year configuration, enrollment, staffing/licensing, compensation, and travel rules.
- The active portal calculates Finance actuals from canonical bank allocations and payroll employer cost.
- The legacy deterministic Budget Engine remains isolated in `api/budget-engine.js` and reads structured BUDGET Sheet tables through `/api/budget`.
- Budget and Payroll actuals remain separated; bank payroll-category rows do not duplicate payroll actual cost.

#### Missing or incomplete — Verified

- The active database model does not fully replace the legacy BUDGET Sheet calculation inputs and engine contract.
- `/api/budget` and `/api/budget-test` remain deployed and require Google service-account access.
- `budget_snapshots` and `calculation_runs` are present but unpopulated in the live inventory returned during this audit.
- No unified ingestion adapter for BUDGET Sheet sections exists.

#### What can be automated — Recommendation

- Controlled ingestion of budget inputs into canonical effective-dated rules/facts.
- Reconciliation runs comparing Sheet-engine output to database-engine output before cutover.
- Explicit versioned calculation runs and locked snapshots.

#### What should be preserved — Recommendation

- Deterministic Budget Engine behavior and current calculations until parity is proven and explicitly approved.
- Separation of configuration, actual source data, calculation runs, and locked snapshots.

#### What needs modification — Recommendation

- Treat Budget migration as its own parity program, not as a side effect of the generic ingestion work.
- Reuse the shared ingestion control plane, but retain budget-specific validation and engine contracts.

### 4.7 AI integrations and automation access

#### What already exists — Verified

- `api/mcp.js` is an OAuth-protected Streamable HTTP MCP endpoint.
- It validates the caller's Supabase access token, active portal profile, and permission-scoped RPCs.
- Exposed tools are read-only: list/read published policies, list authorized daycares, and list limited staff data for an authorized daycare.
- The implementation forwards the caller JWT and does not expose unrestricted SQL or a service-role key.
- Supabase-hosted read-only MCP variants provide similar daycare/staff capabilities.
- OAuth callback relay infrastructure is deployed for secure client authorization completion.

#### Missing or incomplete — Verified

- AI tools cannot submit files, create ingestion previews, inspect import batches, resolve review items, or request an approved commit.
- The multiple MCP implementations have overlapping but non-identical tool names and capabilities.
- No AI-specific service identity, connector registry, consent scope for ingestion, or approval-token model was found.
- No prompt/model/provider metadata is recorded in import or audit records.
- Existing project history records unresolved direct-table Employees read-policy risk; AI expansion must not rely on broad table reads.

#### What can be automated — Recommendation

- Read-only batch/status tools first: list batches, read row validation summaries, list review items, and retrieve permitted master-data identifiers.
- Draft-only ingestion tools next: submit source metadata/content, generate a preview, and propose mappings/allocations.
- Human-approved commit tools only after explicit permission, batch approval, idempotency, and audit controls are implemented.

#### What should be preserved — Recommendation

- Caller-JWT delegation and permission-scoped RPCs.
- Read-only default and least-privilege tool design.
- No generic SQL, table-write, service-role, or arbitrary Edge Function access.
- Published-vs-draft policy separation.

#### What needs modification — Recommendation

- Select one canonical MCP endpoint and deprecate overlapping variants after compatibility review.
- Add purpose-built ingestion RPCs/tools, not direct table access.
- Record AI connector, model/provider, request correlation, proposed changes, human approver, and final result in the audit trail without storing unnecessary prompt secrets or personal data.

### 4.8 Remaining Google Sheets dependencies

#### What already exists — Verified

- `api/budget.js` reads the BUDGET tab with a service account and readonly Sheets scope; sheet ID and tab can be overridden by environment variables, but a shared spreadsheet ID remains as fallback.
- `api/allocations.js` reads the BANKS tab with the same service-account pattern and fallback ID.
- `googleapis` remains a runtime package dependency.
- `vercel.json` still builds/routes `/api/budget`, `/api/budget-test`, and `/api/allocations`.
- Historical `sheet_*` columns exist across canonical tables for reconciliation.
- Active Employees and Payroll portal workflows do not read Google Sheets.

#### Missing or incomplete — Verified

- The root SPA does not need the legacy APIs for canonical workforce/bank operation, but compatibility Accounting still calls `/api/allocations`.
- The Budget Engine has not been replaced with proven database parity.
- Old documentation still describes Sheets as the operational editing source for areas now owned by Supabase.

#### What can be automated — Recommendation

- Read-only Sheet connectors can become ingestion adapters feeding the same preview/commit framework.
- Scheduled reconciliation can compare Sheet source digests to accepted database state without automatically overwriting manual portal data.

#### What should be preserved — Recommendation

- `sheet_*` identifiers and provenance until all reconciliation/cutover obligations are complete.
- Read-only access for legacy sources during migration.
- Budget behavior until explicit parity approval.

#### What needs modification — Recommendation

- Remove hardcoded fallback spreadsheet IDs before broadening automation; require explicit environment configuration.
- Retire `/api/allocations` only after the compatibility Accounting route is replaced or redirected and semantic differences are resolved.
- Retire `/api/budget` only after side-by-side parity, operational acceptance, and explicit rule-change approval.
- Update source-of-truth documentation as each dependency is retired.

## 5. Unified ingestion architecture

### 5.1 Design goals — Recommendation

One ingestion architecture should support browser uploads, approved Google Sheets connectors, payroll/bank exports, and AI integrations without creating separate business logic. It should reuse the existing database and domain RPCs.

Core guarantees:

1. Same input contract and validation regardless of caller.
2. Caller identity, permission, organizational scope, and source provenance on every batch.
3. Idempotent retry without duplicate business records.
4. Immutable source payload and separable manual/enriched data.
5. Preview before financial, payroll, identity, or rule changes.
6. Atomic domain commit using current RPCs.
7. Row-level result, quality issue, and audit linkage.
8. AI proposes; approved domain services validate and commit.

### 5.2 Proposed flow — Recommendation

```text
Portal upload / Sheet connector / AI tool
                  |
                  v
        Auth + permission + scope check
                  |
                  v
       Create idempotent import_batches row
                  |
                  v
       Source adapter + versioned parser
                  |
                  v
       import_rows raw/parsed payloads
                  |
                  v
   Normalize -> exact match -> possible match
                  |
                  v
 Validate business rules + data-quality issues
                  |
          +-------+--------+
          |                |
     clean rows       review required
          |                |
          +-------+--------+
                  |
           explicit approval
                  |
                  v
    Existing atomic domain RPC commit layer
                  |
                  v
 Canonical tables + accepted entity links + audit
```

### 5.3 Common ingestion envelope — Recommendation

Every caller should provide or receive a server-generated equivalent of:

- `ingestion_type`: `BANK_TRANSACTIONS`, `EMPLOYEES`, `PAYROLL`, future `ATTENDANCE`, `BUDGET_INPUTS`.
- `source_kind`: `PORTAL_UPLOAD`, `GOOGLE_SHEETS`, `AI_CONNECTOR`, `SYSTEM_CONNECTOR`, `MANUAL`.
- `source_system`, `source_file_name`, `source_sheet_name`, source account/unit when applicable.
- `content_digest`, `idempotency_key`, `parser_id`, `parser_version`, `schema_version`.
- `actor_user_id` or approved connector/service identity plus delegated user when applicable.
- organizational scope and required permission.
- batch correlation ID and parent batch for retries/reprocessing.
- declared operation: preview, append, update-source-fields, or reconcile.

Do not accept a generic table name or arbitrary mutation payload from external callers.

### 5.4 Reuse map — Recommendation

| Capability | Reuse | Extension needed |
|---|---|---|
| Batch lifecycle | `import_batches` | Standard states, digest/idempotency, connector/parser metadata, approval fields |
| Row lineage | `import_rows` | Operational population by all importers; row fingerprint and match decision |
| Review/quality | `data_quality_issues` | Rule code, current evaluation, review assignment/task linkage |
| Audit | `audit_events` | Correlation/batch linkage and actor type/AI provenance |
| Bank commit | `portal_confirm_bank_import`, `portal_save_bank_allocations` | Adapter and review wrapper only |
| Employee commit | `portal_import_employees`, pay-term/history RPCs | Row lineage, match review, standardized result |
| Payroll commit | `portal_save_payroll_rows_v2`, allocation/month RPCs | Unified import path and idempotency |
| Access control | Portal permissions, user unit/daycare scopes | Connector scopes and purpose-built ingestion permissions |
| AI transport | OAuth MCP and caller-JWT RPC model | Batch/preview/review tools; no direct writes |

### 5.5 Approval model — Recommendation

- Auto-accept only exact, non-destructive, policy-approved source inserts with no ambiguity.
- Require review for possible duplicates, unknown master data, identity conflicts, financial allocations, pay-term changes, certificate interpretation, compensation eligibility, and business-rule changes.
- Require a second explicit commit call tied to an unexpired preview version. Recompute or reject if source, master data, or rules changed since preview.
- Keep AI-generated classifications as suggestions with confidence and evidence; store the approved canonical value separately.

### 5.6 Security and privacy requirements — Recommendation

- Continue forwarding caller JWTs to narrowly scoped RPCs.
- Do not expose service-role credentials, unrestricted PostgREST, generic SQL, or generic table mutation through MCP.
- Minimize employee PII returned to AI tools; National ID should be used server-side for matching and should not be exposed unless a separately approved need exists.
- Store hashes/digests and structured decision metadata; avoid retaining full AI prompts when they contain personal or banking data.
- Re-audit RLS and direct table grants before enabling any write-capable AI integration.
- Separate connector credentials from portal browser configuration and rotate/revoke them independently.

## 6. Gap prioritization

### Priority 0 — protect before expanding AI

1. Review and close known broad direct-table read policies, especially Employees, with restricted-user tests.
2. Define the canonical AI/MCP endpoint and permission model.
3. Prohibit generic AI writes; expose only purpose-built preview and commit operations.

### Priority 1 — shared ingestion control plane

1. Standardize batch states, envelope, idempotency, parser versioning, and result schema.
2. Populate `import_rows` for bank, employee, and payroll flows.
3. Populate/re-evaluate `data_quality_issues` for durable review.
4. Add stale-batch detection and resolution.
5. Wrap existing atomic RPCs; do not replace them.

### Priority 2 — domain consistency

1. Consolidate payroll's parallel import paths.
2. Add possible-duplicate review for banks and durable match review for employees/payroll.
3. Add suggestion provenance for bank/payroll allocations.
4. Define certificate-document and attendance contracts before automating them.

### Priority 3 — AI-assisted operations

1. Read-only batch/status/review tools.
2. Draft mapping, classification, and allocation suggestions.
3. Human-approved commit tools with preview version checks.
4. Notifications and scheduled connector runs.

### Priority 4 — Sheets retirement

1. Redirect/retire legacy Accounting after BANKS semantics are reconciled.
2. Migrate Budget through a dedicated parity track.
3. Remove `googleapis`, service-account configuration, and fallback sheet IDs only after all callers are retired.

## 7. Preservation constraints for future work

Future automation must preserve:

- Existing business rules, Budget Engine behavior, calculations, and API contracts unless a track explicitly authorizes changes.
- Supabase as the canonical backend for active portal workflows.
- Immutable bank/payroll source records and separate manual allocation records.
- Exact balance rules for bank and payroll splits.
- Effective-dated employee, pay-term, eligibility, and configuration history.
- Official payroll cost from payroll, never inferred from bank transactions.
- Permission scopes, audit records, and human approval for sensitive actions.
- RTL/Hebrew portal behavior and existing operational workbenches.
- Historical import/sheet identifiers until reconciliation is formally complete.

## 8. Recommended next TRACKs

1. **Ingestion contract and threat model (documentation first).** Define states, permissions, idempotency, preview expiry, approval, PII handling, and exact domain adapters.
2. **Row-level lineage pilot for Bank imports.** Populate `import_rows` and quality issues without changing canonical bank behavior; backfill is not required initially.
3. **Payroll importer consolidation.** Route all payroll uploads through one batch preview/commit path and add source idempotency.
4. **Employee matching and compliance automation.** Add review queues and expiry tasks while preserving manual eligibility decisions.
5. **Permission-scoped MCP ingestion preview.** Add read/status and draft-preview tools only after RLS review; defer commit tools to a later approved track.
6. **Legacy Accounting retirement audit.** Resolve BANKS compatibility semantics and caller removal.
7. **Budget database parity program.** Run the existing Sheet engine and proposed database source side by side before any cutover.

## 9. Residual uncertainties

- This audit inspected schema, aggregate counts, code, migrations, and deployed function inventory, but did not inspect or reproduce personal or transaction row content.
- It did not execute authenticated UI flows, import sample files, or mutate test data because the task is read-only.
- It did not determine the business reason for the single `RUNNING` bank batch or the low allocation/workforce/payroll population; these require operator context.
- It did not certify every RLS policy or Edge Function source as secure. It identifies the existing security foundation and the known direct-read concern; a dedicated security audit remains necessary before write-capable AI automation.
- Older `docs/data/` files describe Google Sheets as the general operational editor. Current active code proves that Supabase now owns canonical Bank, Workforce, Payroll, Settings, permissions, and policy workflows. Budget and legacy Accounting remain the verified Sheets exceptions.
