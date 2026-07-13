# Codex Implementation Package

Status: Draft execution instructions. Use only after Blueprint approval.

Last updated: 2026-07-13

## Role

Act as the implementation engineer for the Chamah Manager Portal data platform.

Do not redesign approved architecture. Do not invent business rules. Do not alter current production behavior until the relevant migration phase is explicitly approved.

## Mandatory Reading

Read completely, in this order:

1. `AGENTS.md`
2. Every document under `docs/handbook/`
3. `docs/data/database-constitution.md`
4. `docs/data/README.md`
5. `docs/data/decision-log.md`
6. `docs/data/open-questions.md`
7. `docs/data/domain-model.md`
8. `docs/data/data-dictionary.md`
9. `docs/data/relationship-matrix.md`
10. `docs/data/diagrams/erd.md`
11. `docs/data/google-sheets-workspace.md`
12. `docs/data/google-sheets-mapping.md`
13. `docs/data/source-map.md`
14. `docs/data/migration-strategy.md`
15. `docs/data/database-roadmap.md`
16. Every relevant document under `docs/data/tables/`

## Non-Negotiable Rules

- The Handbook is the sole business-rule authority.
- The current application remains unchanged during schema-only phases.
- Google Sheets is the operational editing surface.
- The database is the accepted system Source of Truth.
- The target flow is Google Sheets -> Validation -> Import/Sync -> Database -> APIs -> Website.
- Do not expose internal database normalization as many user-facing Sheet tabs.
- Preserve all history and source traceability.
- Do not physically delete used business data.
- Do not merge imported source fields with manual allocations or notes.
- Do not create speculative enterprise features.
- Do not commit credentials or service-role keys.

## Required Implementation Sequence

### Task Group 1 — Repository Audit

Before coding:

- Inspect current runtime architecture and database-related packages.
- Confirm existing deployment environment.
- Identify duplicate application directories and shared code paths.
- Produce an implementation impact report.
- Do not change runtime code yet.

### Task Group 2 — Database Technology Decision

Default target: PostgreSQL, preferably Supabase unless explicitly changed by the owner.

Document:

- Selected provider
- Connection strategy
- Migration tooling
- Environment separation
- Backup/recovery plan
- Access-control approach

Stop for approval if provider selection materially changes the Blueprint.

### Task Group 3 — Migration Framework

Create a deterministic migration structure.

Requirements:

- Clean database rebuild from zero
- Ordered migrations
- Reversible development migrations where practical
- Seed data separated from schema
- Automated validation of constraints and indexes
- No production deployment yet

### Task Group 4 — Core Schema

Implement only tables and fields approved in the Data Dictionary and detailed table documents.

For each table:

- Primary key
- Stable business code where applicable
- Foreign keys
- Required/nullable rules
- Unique constraints
- Check constraints
- Effective-date rules
- Audit fields
- Row version where Sheet concurrency requires it
- Required indexes

Do not replace approved relational fields with JSON for convenience. JSONB is allowed only for raw imported source payloads or explicitly documented flexible technical data.

### Task Group 5 — Schema Tests

Add tests for:

- Unique business codes
- Invalid foreign keys
- Date-range validation
- Duplicate monthly enrollment scope
- Multiple Calendar Years OPEN simultaneously
- Used-record no-delete behavior where implemented
- Source/import traceability
- Allocation reconciliation rules defined by the Handbook

### Task Group 6 — Google Sheets Workspace Specification

Before creating live Sheets, produce a precise build specification for the compact workbook.

Default visible tabs:

- `הגדרות`
- `ילדים`
- `עובדים`
- `שכר`
- `בנקים`
- `תקציב` only if approved manual input exists

For every visible section define:

- Column order
- Hebrew display labels
- Database target fields
- Editable/protected status
- Dropdown source
- Requiredness
- Free-text policy
- Blocking validations
- Warnings
- Sync result columns
- Hidden technical columns

Do not create one Sheet tab per database table.

### Task Group 7 — Import/Sync Design

Implement an explicit publish/sync workflow first.

Requirements:

- Import batch for each run
- Per-row raw and parsed payload
- Stable Sheet row identity
- Database ID and row version
- Idempotent retries
- Duplicate detection
- Conflict detection
- Independent acceptance of valid rows
- Clear errors returned to the Sheet
- Warnings do not block unless the Handbook says otherwise
- Manual work is never erased by source refresh

### Task Group 8 — Historical Migration Tools

Build dry-run import tools before actual migration.

Dry run must report:

- Rows read
- Rows accepted
- Rows rejected
- Duplicate candidates
- Missing references
- Unmapped source values
- Total reconciliations by month/daycare/domain

No destructive cleanup of existing Sheets.

### Task Group 9 — Parallel Read Layer

Build database-backed read APIs alongside current Sheets-backed APIs.

Requirements:

- Preserve current API response contracts where feasible
- Add explicit adapters where contracts differ
- Compare outputs automatically
- Keep feature flag or configuration rollback
- Do not cut over without approved parity

### Task Group 10 — Cutover

Cut over one domain at a time according to `database-roadmap.md`.

No all-at-once cutover.

## Required Deliverables Per Task Group

After each task group report:

- Files created or changed
- Architecture decisions applied
- Deviations from Blueprint, if any
- Tests run and results
- Remaining risks
- Open questions
- Suggested commit message
- Exact next task

## Stop Conditions

Stop and ask before proceeding if:

- A Handbook rule is missing and affects schema meaning
- Existing implementation contradicts the Handbook
- A required field cannot be mapped from current data
- A proposed simplification would lose history
- A user-facing Sheet design requires significantly more tabs than the compact model
- A database/provider limitation would change approved architecture

## Prohibited Actions

- Do not modify production APIs during schema creation.
- Do not delete or rewrite current Google Sheets.
- Do not silently change calculations.
- Do not infer legal, payroll, tuition, staffing, or compensation values.
- Do not add multi-tenant, microservice, event-bus, workflow-engine, or multi-country architecture without explicit approval.
- Do not create an admin UI unless separately approved.
- Do not mark the migration complete without reconciliation evidence.

## First Codex Prompt

Use the following as the first implementation request after owner approval:

```text
Read AGENTS.md, docs/handbook/, and docs/data/ completely.

This task is repository and implementation planning only.

Do not modify application code, APIs, calculations, UI, Google Sheets, deployment configuration, or production behavior.

1. Audit the repository for current runtime architecture, duplicate application trees, existing data access, deployment assumptions, environment handling, and testing setup.
2. Validate the proposed PostgreSQL/Supabase implementation approach against the approved Database Blueprint.
3. Produce an implementation plan divided into small reversible task groups matching docs/data/database-roadmap.md.
4. Identify any Blueprint inconsistency or missing structurally blocking decision.
5. Do not create migrations yet.

Report:
- repository findings
- recommended database tooling
- exact files that would be added later
- risks
- blocking questions only
- proposed first implementation commit
```

## Completion Definition

The implementation is complete only when:

- Schema migrations are reproducible
- Controlled Sheets workflow operates correctly
- Sync is traceable and idempotent
- Historical data is reconciled
- Database-backed APIs pass parity review
- Cutover and rollback are documented and tested
- The owner approves the operational workflow
