# Data Architecture Knowledge Base

Status: Database Blueprint v1.0 — implementation-ready documentation package. No database, Sync service, Google Sheets workspace, or replacement portal has been implemented yet.

Last updated: 2026-07-13

## Purpose

`docs/data/` is the permanent, self-contained database architecture knowledge base for the Chamah Manager Portal. It allows a future developer or AI model to understand the approved architecture and continue implementation without access to prior conversations.

The Handbook under `docs/handbook/` remains the only source of business truth. This folder records the approved database architecture, Google Sheets operating model, migration strategy, open implementation questions, and Codex handoff instructions.

## Mandatory Reading Order

1. `docs/handbook/`
2. `docs/data/database-constitution.md`
3. `docs/data/README.md`
4. `docs/data/database-blueprint-principles.md`
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
18. Individual domain/table documents under `docs/data/tables/`

## Current Phase

Blueprint design is complete. The repository contains an implementation-ready architecture package, subject only to the explicitly listed non-structural questions in `open-questions.md` and owner approval of the final visible Google Sheets layout.

No application code, database migrations, APIs, Google Sheets integration, tests, deployment, Supabase project, or replacement portal has been created in this phase.

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

The current production portal remains available during implementation as a behavior reference, reconciliation baseline, and rollback option.

## Core Approved Decisions

- The Handbook is the business Source of Truth.
- Google Sheets is the operational editing interface.
- Users do not edit the database directly.
- The database becomes the final system Source of Truth after validation and synchronization.
- The new database and portal are built in parallel to the current system.
- The replacement portal reads only from the new database, not from the legacy Sheets structure.
- Stable identity is separated from period-based operational data.
- Master Data uses stable internal ID, stable Business Code, and Display Name.
- Used records are not physically deleted.
- Historical data is not silently overwritten.
- Configuration, imported source data, manual operational work, and calculated results are separated.
- One Daycare represents one license.
- Classroom structure belongs to a School Year and may have effective dates inside the year.
- Budget child quantity is monthly enrollment by classroom and Age Group.
- A child counted for a month is treated as generating tuition income for that month.
- Legal Entity support remains lightweight.
- The database is normalized internally, but the Google Sheets workspace remains compact.
- A separate table is created only when it protects history, represents a repeating relationship, prevents duplication, supports an independent lifecycle, or is required for reliable sync/validation.

See `decision-log.md` for permanent decision IDs and complete impact.

## Final User-Facing Google Sheets Target

Default target: one primary operational spreadsheet with a compact visible surface.

Expected visible work areas:

1. `הגדרות`
2. `ילדים`
3. `עובדים`
4. `שכר`
5. `בנקים`
6. `תקציב` only when manual budget input is genuinely required

Technical reference lists, IDs, versions, import logs, validation data, and system metadata may exist in protected or hidden support areas. They must not create a fragmented day-to-day workflow.

## Main Blueprint Deliverables

- Database Constitution
- Architecture principles and decision log
- Domain Model
- Data Dictionary
- ERD
- Relationship Matrix
- Source Map
- Google Sheets workspace specification
- Google Sheets-to-database mapping
- Import, validation, audit, and Data Quality model
- Migration Strategy
- Implementation Roadmap
- Codex Implementation Package
- Domain/table blueprints
- Open Questions log
- Final Design Review

## Implementation Readiness

The package is ready to be handed to Codex for staged implementation after:

1. The owner approves the final visible Google Sheets workflow.
2. The implementation team selects and creates the PostgreSQL/Supabase environment.
3. Non-structural implementation choices in `open-questions.md` are resolved at the relevant phase.

Codex must execute the approved architecture. It must not redesign business rules or introduce speculative complexity.

## Recommended Implementation Sequence

1. Create the new database environment.
2. Implement the core schema from migrations.
3. Seed only approved reference/configuration data.
4. Build the compact Google Sheets workspace.
5. Build controlled validation and Publish/Sync.
6. Migrate and reconcile historical data.
7. Build database-backed read APIs.
8. Build the replacement portal in a parallel environment.
9. Run old and new systems in parallel.
10. Cut over only after verified parity and owner approval.

See `database-roadmap.md` and `codex-implementation-package.md` for the exact implementation phases and acceptance criteria.

## Maintenance Rule

Every future database architecture change must update the relevant documents in `docs/data/`.

Do not rely on chat history. Do not describe proposals as implemented facts. Do not change the Handbook through database documentation. Do not create production code from an unresolved business assumption.