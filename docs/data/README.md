# Data Architecture Knowledge Base

Status: Database Blueprint v1.0 — implementation-ready documentation package. No database, Sync service, Google Sheets workspace, or replacement portal has been implemented yet.

Last updated: 2026-07-13

## Purpose

`docs/data/` is the permanent database architecture knowledge base for the Chamah Manager Portal. It must allow a future developer or AI model to continue implementation without relying on prior conversations.

The Handbook under `docs/handbook/` is the only source of business truth. This folder records the approved architecture, operational Google Sheets model, migration strategy, implementation decisions, and Codex handoff instructions.

## Mandatory Reading Order

1. `docs/handbook/`
2. `docs/data/database-constitution.md`
3. `docs/data/README.md`
4. `docs/data/final-architecture-closure.md`
5. `docs/data/decision-log.md`
6. `docs/data/open-questions.md`
7. `docs/data/executive-summary.md`
8. `docs/data/domain-model.md`
9. `docs/data/data-dictionary.md`
10. `docs/data/relationship-matrix.md`
11. `docs/data/diagrams/erd.md`
12. `docs/data/source-map.md`
13. `docs/data/google-sheets-workspace.md`
14. `docs/data/google-sheets-mapping.md`
15. `docs/data/migration-strategy.md`
16. `docs/data/database-roadmap.md`
17. `docs/data/codex-implementation-package.md`
18. Relevant domain/table documents under `docs/data/tables/`

Where earlier documents are ambiguous, `final-architecture-closure.md` controls unless the Handbook states otherwise.

## Approved Target Architecture

```text
Google Sheets operational workspace
        ↓
Validation and controlled Publish/Sync
        ↓
PostgreSQL / Supabase database
        ↓
Database-backed APIs
        ↓
Parallel new portal / dashboard
```

The current portal remains available during implementation as a behavioral reference, reconciliation baseline, and rollback option.

## Core Decisions

- Google Sheets is the operational editing interface.
- Users do not edit the database directly.
- The database becomes the accepted-data Source of Truth after validation and synchronization.
- The replacement portal reads only from the new database-backed APIs.
- Stable identity is separated from period-based operational data.
- Master Data uses stable internal UUID, stable Business Code, and Display Name.
- Used records are not physically deleted.
- Historical data is not silently overwritten.
- Imported source data, manual operational work, configuration, and calculated results remain separate.
- One Daycare represents one license.
- Classroom structure belongs to a School Year and may change through effective dates.
- Monthly enrollment by classroom and Age Group is the budget child source.
- Employee identity is separate from employment and assignments.
- Payroll and bank source records are separate from user allocations.
- Allocation Units provide a lightweight destination model for Daycares, Office, Management, Development, and other approved units.
- Current budget values are dynamically calculated; approved/locked months are stored as immutable snapshots.
- No enterprise hierarchy, workflow engine, one-tab-per-table model, or speculative abstraction is part of v1.

## Final Google Sheets Surface

The initial operational workbook has five visible tabs:

1. `הגדרות`
2. `ילדים`
3. `עובדים`
4. `שכר`
5. `בנקים`

There is no visible `תקציב` tab in v1. Budget rules and approved manual configuration are maintained inside structured blocks in `הגדרות`; calculated outputs appear in the portal and reports.

Technical lookup, ID, row-version, import, validation, audit, and error-support areas may exist as protected or hidden ranges/tabs. They must not fragment daily work.

## Initial Migration Scope

The schema supports all historical years. The first migration wave includes:

- Current School Year
- Previous School Year
- Current Calendar Year
- Previous Calendar Year

Older reliable history may be migrated later without redesigning the schema.

## Implementation Readiness

The Blueprint has no unresolved owner-dependent core-schema blocker.

Codex must execute the approved architecture and must not:

- invent business rules
- create speculative tables
- convert editable Master Data into hard-coded application-only values
- expose database normalization as additional daily Sheet tabs
- overwrite locked historical snapshots
- bypass the controlled validation and synchronization flow

Remaining questions in `open-questions.md` concern environment, hosting, exact sync trigger, reporting-label snapshots, and cutover timing. They must be surfaced at the relevant implementation phase.

## Recommended Sequence

1. Select and create the PostgreSQL/Supabase environment.
2. Implement schema and migrations in small reviewable phases.
3. Seed only approved reference/configuration values.
4. Build the five-tab Google Sheets workspace.
5. Build validation and controlled Publish/Sync.
6. Migrate and reconcile the approved historical scope.
7. Build database-backed APIs.
8. Build the replacement portal in parallel.
9. Run old and new systems in parallel.
10. Cut over only after verified parity and owner approval.

## Maintenance Rule

Every future database architecture change must update the relevant documents in `docs/data/`.

Do not rely on chat history. Do not describe proposals as implemented facts. Do not change the Handbook through database documentation. Do not create production code from an unresolved business assumption.