# Final Architecture Closure

Status: Approved and implementation-binding for Database Blueprint v1.0.

Last updated: 2026-07-13

## Purpose

This document closes the final owner decisions and resolves the implementation-readiness gaps found during the final PR audit. Where an earlier Blueprint document is ambiguous, this document controls unless the Handbook states otherwise.

## Approved Owner Decisions

### 1. Allocation Units

The database will include a lightweight `allocation_units` Master Data table for every operational destination used in payroll, banking, budgeting, and management reporting.

Initial business meanings include:

- Daycare units
- Office
- Management
- Development
- Other approved future units

This is not a generic enterprise hierarchy.

Each allocation unit must have:

- `allocation_unit_id` — UUID primary key
- `allocation_unit_code` — stable unique uppercase ASCII Business Code
- `display_name` — user-facing name
- `unit_type_code` — controlled type such as `DAYCARE`, `OFFICE`, `MANAGEMENT`, `DEVELOPMENT`, `OTHER`
- `daycare_id` — nullable FK; required when `unit_type_code = DAYCARE`
- `legal_entity_id` — required FK
- `lifecycle_status` — `ACTIVE`, `INACTIVE`, or `ARCHIVED`
- `display_order`
- standard audit fields and `row_version`

Constraints:

- A DAYCARE allocation unit must reference exactly one Daycare.
- A non-DAYCARE allocation unit must not require a Daycare.
- Used units are never physically deleted.
- Payroll and bank allocations must reference `allocation_unit_id`; nullable `daycare_id` alone is not an adequate destination model.

### 2. Google Sheets Visible Tabs

The initial operational workbook will not include a separate visible `תקציב` tab.

Visible tabs:

1. `הגדרות`
2. `ילדים`
3. `עובדים`
4. `שכר`
5. `בנקים`

Budget rules and approved manual configuration are maintained inside structured blocks in `הגדרות`. Calculated budget outputs are shown in the database-backed portal and reports.

A separate `תקציב` tab may be added later only after a demonstrated recurring manual-entry requirement.

### 3. Budget Current Calculation And Locked Snapshot

Budget has two distinct states:

- Current working result: calculated dynamically from accepted source data and current effective rules.
- Approved locked result: persisted as an immutable snapshot when a reporting month is approved/locked.

Implementation rule:

- Current calculations may be served by database views/read models or an on-demand calculation service.
- `calculation_runs` records each reproducible run that produces persisted results.
- `budget_results` stores only persisted calculation output tied to a `calculation_run_id`.
- A locked snapshot must never be silently recalculated or overwritten.
- A correction after locking creates a new calculation run/version; it does not mutate the old snapshot.
- Editable source data must never duplicate calculated budget results.

### 4. Initial Historical Migration Scope

The database schema supports all historical years.

The first migration wave will include:

- Current School Year
- Previous School Year
- Current Calendar Year
- Previous Calendar Year

Older reliable history may be migrated in a later wave. Low-quality historical data must not delay the first production-ready release; it remains archived and traceable until mapped.

## Business Master Data Requirements

The following editable business lists must not be implemented as unrestricted text or hard-coded application-only enums:

- Roles
- Certificate Types
- Legal Entity Types
- Allocation Units and Allocation Unit Types where operationally editable
- Budget Categories
- Bank Accounts
- Age Groups
- Any additional list maintained by the owner in `הגדרות`

Each editable Master Data list must use:

- Stable internal UUID
- Stable Business Code
- Display Name
- Lifecycle status
- Display order where relevant
- Audit fields and row version

Small purely technical statuses may use database constraints/enums when they are not owner-maintained business information.

## Budget Rule Contract

`budget_rules` remains a compact configurable table, but every `rule_type` must have an explicit implementation contract before code is written.

For every rule type, Codex must document and test:

- Business meaning and Handbook trace
- Required scope fields
- Forbidden scope fields
- Value type (`numeric_value`, `text_value`, or structured payload when explicitly approved)
- Unit of measure
- Effective-date behavior
- Overlap rule
- Precedence between organization-wide, unit-specific, daycare-specific, and age-group-specific rules
- Validation messages
- Calculation consumer

No new `rule_type` may be invented from application convenience alone.

Initial rule families are derived from the Handbook and existing implementation evidence, including tuition, staffing, workdays, per-child costs, fixed costs, percentages/overhead, and approved compensation rules. Exact codes and payloads must be documented before migration creation.

## Shared Technical Table Minimum Specification

### `import_batches`

Required fields:

- `import_batch_id` UUID PK
- `source_type`
- `source_file_name` / spreadsheet and tab identifiers where applicable
- `trigger_type`
- `triggered_by`
- `started_at`, `completed_at`
- `status`
- row counters: total, accepted, warning, rejected, conflict
- `error_summary`
- source checksum/version where available

Indexes: status/time, source identity/time.

### `import_rows`

Required fields:

- `import_row_id` UUID PK
- `import_batch_id` FK
- source row identity
- raw payload JSONB
- parsed payload JSONB
- target entity type
- accepted entity ID when accepted
- validation status
- errors/warnings JSONB
- row version received
- processed timestamp

Unique constraint: source row identity within batch. Indexes on batch/status and accepted entity reference.

### `audit_events`

Required fields:

- `audit_event_id` UUID PK
- entity type and entity ID
- operation
- previous values JSONB
- new values JSONB
- source channel
- actor
- occurred_at
- import batch ID when applicable

Indexes: entity reference/time and occurred_at.

### `data_quality_issues`

Required fields:

- `data_quality_issue_id` UUID PK
- entity/source reference
- issue code
- severity
- status
- explanation
- detected_at
- resolved_at / resolved_by
- approved-ignore reason where applicable

Indexes: status/severity and entity/source reference.

### `calculation_runs`

Required fields:

- `calculation_run_id` UUID PK
- reporting scope and month
- rules/version fingerprint
- input snapshot/fingerprint references
- status
- started_at, completed_at
- initiated_by
- supersedes_calculation_run_id when applicable
- lock/approval metadata when the run becomes an approved snapshot

Indexes: reporting month/scope/status.

## Implementation Gate

Before Codex creates migrations, it must:

1. Apply `allocation_units` to employee assignments where needed, payroll allocations, bank allocations, budget results, and reporting scopes.
2. Replace ambiguous editable business-code text fields with FKs to approved Master Data tables.
3. document every initial Budget Rule contract.
4. implement complete constraints and indexes for shared technical tables.
5. preserve the five-tab visible Google Sheets target.
6. use the approved first migration scope.

These decisions close the final owner-dependent architecture questions. Remaining hosting, credentials, and exact sync-trigger choices are environment/implementation choices and must be surfaced at the relevant phase.