# Data Architecture Knowledge Base

Status: Schema Freeze v1 knowledge base.

Last updated: 2026-07-13

## Purpose

`docs/data/` is the permanent, self-contained database architecture knowledge base for the Chamah Manager Portal. It records approved database decisions, frozen schema structure, source-of-truth rules, Google Sheets operating requirements, migration strategy, unresolved questions, and implementation handoff requirements.

The folder must allow a future developer or AI model to continue the work without access to prior conversations.

This folder documents the database structure and architecture. It does not change APIs, calculations, Google Sheets integrations, tests, UI, or the Handbook.

## Mandatory Reading Order

1. `docs/handbook/`
2. `docs/data/README.md`
3. `database-blueprint-principles.md`
4. `decision-log.md`
5. `open-questions.md`
6. `final-design-review.md`
7. `final-architecture-closure.md`
8. `data-dictionary.md`
9. `architecture-overview.md`
10. `source-of-truth-model.md`
11. `google-sheets-sync-model.md`
12. `naming-and-identity-standards.md`
13. `entity-inventory.md`
14. `relationship-matrix.md`
15. `source-map.md`
16. `migration-strategy.md`
17. `google-sheets-mapping.md`
18. `tables/README.md`
19. Individual table documents under `tables/`
20. `diagrams/erd.md`

## Current Phase

Current phase: Database Structure Freeze v1.

The existing 33-table database schema is kept and corrected by Migration 011. The current website, APIs, calculations, UI, tests, deployment, and current Google Sheets are not modified during this phase.

## Sources Of Truth

- `docs/handbook/` is the only source of business truth.
- `docs/data/` is the source of approved database architecture decisions.
- Existing code and current Google Sheets describe the present implementation and migration source; they do not override the Handbook.
- The future database is the final system Source of Truth after successful validation and sync.
- Google Sheets is the operational editing interface for the owner and office staff.

Target flow:

`Google Sheets -> Validation -> Import/Sync -> Database -> APIs -> Website`

## Approved Core Decisions

- Users do not edit the database directly.
- Only marked Google Sheets cells are editable.
- Controlled fields use dropdowns wherever possible.
- Free text is limited to fields explicitly designed for it.
- IDs, used business codes, calculated values, audit fields, and sync metadata are protected.
- Adding a new valid Master Data row creates a new business entity.
- Display-name changes preserve identity.
- Material meaning changes require a new business code and new row.
- Historical data is never silently overwritten.
- Configuration, operational data, imported source data, and manual workflow data are separated.
- School Year and Calendar Year are separate concepts.
- Multiple years may remain selectable; one year is shown at a time per dashboard.
- Multiple Calendar Years may remain OPEN during accounting completion work.
- One Daycare represents one daycare license.
- Classroom structure and Age Group composition may change by School Year and within-year effective dates.
- Budget child quantity is monthly enrollment by classroom and Age Group.
- A child counted for a month is treated as producing tuition income for that month.
- Legal Entity support remains lightweight and exists mainly for ownership, bank accounts, tuition dimensions, and reporting separation.

See `decision-log.md` for permanent decision IDs and full impact.

## Schema Freeze v1 Decisions

- Keep the current 33 public tables.
- Preserve recovered migrations 001-010.
- Apply Migration 011 as the single corrective schema-freeze migration.
- `allocation_units` is the flat v1 allocation target model.
- An `organization_units` hierarchy is not required for v1.
- Dynamic budget results are calculated at runtime until explicit lock.
- `budget_snapshots` stores immutable locked snapshots only.
- Google Sheets v1 has no visible Budget tab.
- RLS remains enabled; API/auth policies are deferred.

## Domain Work Plan

1. Foundation and periods.
2. Organization, Daycares, and classroom configuration.
3. Children and monthly enrollment.
4. Employees, employment, assignments, certificates, and compensation eligibility.
5. Payroll source records and allocations.
6. Banking, bank allocations, and accounting workflow.
7. Budget configuration, calculation, locks, and administration allocations.
8. Imports, audit, and Data Quality.
9. Reporting and final Google Sheets workspace mapping.
10. Codex implementation handoff.

## Frozen Tables

Schema Freeze v1 keeps the existing 33 public tables. See `data-dictionary.md` and `diagrams/erd.md`.

## Google Sheets Final Deliverable

The final implementation package must define a new Google Drive / Google Sheets workspace that serves as the operational work surface.

Each operational Sheet specification must define:

- spreadsheet and tab name
- row identity
- editable columns
- protected columns
- dropdown sources
- free-text fields
- blocking validations
- warnings
- sync status columns
- error feedback columns
- publish/sync behavior
- database mapping
- audit behavior

The final Google Sheets workspace is designed from the approved database model; the database model is not copied from the limitations of the existing Sheets.

No visible Budget tab is added to Google Sheets v1.

## Open Questions

See `open-questions.md`.

Current open questions are deferred implementation details, not blockers for the v1 structure freeze.

## Next Recommended Action

Prepare the clean pull request for Schema Freeze v1, then freeze database structure v1 after review.

## Maintenance Rule

Every future database architecture decision must update the relevant files in `docs/data/`.

Do not rely on conversation history. Do not describe an unapproved proposal as implemented or final. Do not create additional database code unless the blueprint explicitly reaches the next implementation-ready status.
