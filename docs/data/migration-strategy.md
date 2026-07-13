# Migration Strategy

Status: Draft implementation roadmap. No migration has been executed.

Last updated: 2026-07-12

## Purpose

Define a controlled path from the current Google-Sheets-backed portal to a database-backed platform while preserving current operation, historical data, and management continuity.

## Target State

```text
Google Sheets operational workbook
  -> validation and publish/sync service
  -> PostgreSQL database (recommended deployment: Supabase)
  -> database-backed APIs
  -> existing website and dashboards
```

The owner and office staff continue working in Google Sheets. The database becomes the final accepted Source of Truth. The website no longer reads Sheets directly after cutover.

## Migration Principles

- Do not modify the current production flow during blueprint and initial database build.
- Do not perform a big-bang cutover.
- Preserve raw imported source values and their origin.
- Preserve all completed manual classification and allocation work.
- Never treat a display name as a stable integration key.
- Reconcile financial totals before switching any dashboard.
- Every phase has an explicit acceptance gate and rollback path.
- Existing Sheets remain available as evidence until retention policy is approved.

## Phased Roadmap

### Phase 0 — Blueprint Approval

Deliverables:

- Approved schema and table inventory.
- ERD and relationship matrix.
- Source map and data dictionary.
- Compact Google Sheets workbook blueprint.
- Sync, validation, audit, and error rules.
- Open-question register with non-blocking items separated from build blockers.

Gate:

- Blueprint marked `Ready for Implementation`.
- Owner approves visible Google Sheets workflow.

### Phase 1 — Infrastructure Setup

Actions:

- Create one PostgreSQL/Supabase project for the portal.
- Configure development and production environment secrets.
- Create migration tooling and schema versioning.
- Create service account access for the new Google workbook.
- Do not connect the production website yet.

Gate:

- Secure connection test succeeds.
- Backup/restore test succeeds before importing business data.

### Phase 2 — Core Schema Build

Build only approved V1 structures:

- Periods and configuration.
- Legal entity/daycare/classroom setup.
- Monthly enrollment.
- Employees and employment structures.
- Payroll source and allocations.
- Bank transactions and allocations.
- Budget configuration/results needed by existing dashboards.
- Import batches, audit, and persistent data-quality issues.

Avoid speculative future tables.

Gate:

- Constraints and sample inserts validated.
- Schema review confirms no required Handbook rule is lost.

### Phase 3 — New Google Sheets Workbook

Create the compact operational workbook:

- `הגדרות`
- `ילדים`
- `עובדים`
- `שכר`
- `בנקים`
- optional `תקציב` only for approved manual inputs

Add protected ranges, dropdowns, dependent lists, status columns, and publish/sync controls.

Gate:

- Owner and secretary can complete representative workflows without database knowledge.
- Copy/paste and invalid-value tests behave correctly.

### Phase 4 — Sync Service

Implement:

- Sheet-row identity and row-version checks.
- Insert/update classification.
- Blocking errors and warnings.
- Import batch summaries.
- Audit trail.
- Source/manual-data separation.
- Database-to-Sheet return of IDs, versions, status, and errors.

Gate:

- Re-running the same batch is idempotent.
- A failed batch does not partially corrupt accepted data.
- Concurrent edit produces conflict rather than silent overwrite.

### Phase 5 — Historical and Current Data Load

Recommended order:

1. Years and controlled reference lists.
2. Legal entity, daycares, classrooms, bank accounts, categories.
3. Employees and employment-related data.
4. Monthly child counts.
5. Payroll records and allocations.
6. Bank transactions, allocations, and accounting statuses.
7. Budget rules/manual inputs.

For each area:

- Extract current rows.
- Normalize known names to stable codes.
- Load to staging/import batch.
- Validate.
- Correct issues in the new workbook or approved mapping table.
- Commit accepted rows.
- Reconcile totals and counts.

Gate:

- Reconciliation report approved per domain.

### Phase 6 — Parallel Run

Run old and new flows simultaneously for an agreed period, preferably at least one full monthly cycle.

Compare:

- Child count and expected income by daycare/month/age group.
- Employer salary cost by daycare/month.
- Bank income/expense and unmapped amounts.
- Budget versus actual values.
- Accounting workflow counts.
- Employee/compliance KPIs.

Differences must be classified as:

- expected model correction,
- source-data difference,
- missing business rule,
- implementation defect.

Gate:

- No unexplained material difference.
- Owner signs off on operational totals and dashboard output.

### Phase 7 — API Read Cutover

Change APIs one domain at a time:

1. Employees.
2. Monthly enrollment/budget configuration.
3. Payroll.
4. Banking/accounting.
5. Management dashboard.

Do not change calculation meaning during a source cutover unless the Handbook explicitly corrects current behavior. Separate source migration from business-logic changes.

Gate:

- Endpoint contract and visible UI output approved.
- Rollback to prior endpoint/source remains available during stabilization.

### Phase 8 — Production Operating Model

After full cutover:

- New Google workbook is the operational editing interface.
- Database is the accepted Source of Truth.
- Direct production API reads from old Sheets are disabled.
- Old Sheets become read-only archive/reference according to retention decision.
- Sync health and unresolved validation issues are monitored.

## Reconciliation Checklist

| Domain | Required reconciliation |
|---|---|
| Daycares/Classrooms | Active identities and yearly class setup match approved configuration |
| Children | Monthly counts by daycare, classroom, age group and total |
| Employees | Employee count, active status, assignments, seniority, certificate dates |
| Payroll | Source row count, employer cost total, hours total, allocation totals |
| Banking | Account/date/reference/amount totals and allocation sums |
| Budget | Expected income, salary actuals, bank actuals, category totals |
| Accounting | Status counts, sent/open amounts, status-history continuity |

## Rollback Strategy

- Blueprint/database build has no production effect.
- During parallel run, production continues using current Sheets-backed APIs.
- API cutover uses feature flags or separately deployable endpoints.
- If reconciliation fails, revert the relevant API to the old source without deleting imported database data.
- Never roll back by overwriting source history; correct through a new import/audit event.

## Data Retention During Migration

Retain:

- Original source workbook/file identifiers.
- Sheet tab and source row references where practical.
- Raw source payload for imported financial batches.
- Import date, actor, parser/schema version, and result.
- Old database values for accepted updates through audit.

## Implementation Ownership

- Architecture documents define what must be built.
- Codex implements migrations, sync service, workbook automation, tests, and API cutover only after implementation approval.
- Business-rule ambiguity is resolved through the Handbook/owner, not silently in code.

## Current Phase

Blueprint only. No SQL, database project, workbook replacement, API change, or production migration is authorized by this document alone.
