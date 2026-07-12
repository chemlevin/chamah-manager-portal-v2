# Data Architecture Knowledge Base

Status: Active Database Blueprint knowledge base. The database is not implemented.

Last updated: 2026-07-12

## Purpose

`docs/data/` is the permanent, self-contained database architecture knowledge base for the Chamah Manager Portal. It records approved database decisions, draft table designs, source-of-truth rules, Google Sheets operating requirements, migration strategy, unresolved questions, and implementation handoff requirements.

The folder must allow a future developer or AI model to continue the work without access to prior conversations.

This folder is documentation only. It does not create migrations, SQL, ORM models, APIs, calculations, Google Sheets integrations, tests, UI, Supabase projects, or production infrastructure.

## Mandatory Reading Order

1. `docs/handbook/`
2. `docs/data/README.md`
3. `database-blueprint-principles.md`
4. `decision-log.md`
5. `open-questions.md`
6. `architecture-overview.md`
7. `source-of-truth-model.md`
8. `google-sheets-sync-model.md`
9. `naming-and-identity-standards.md`
10. `entity-inventory.md`
11. `relationship-matrix.md`
12. `source-map.md`
13. `migration-strategy.md`
14. `google-sheets-mapping.md`
15. `tables/README.md`
16. Individual table documents under `tables/`
17. `diagrams/erd.md`

## Current Phase

Current phase: Production-grade Database Blueprint and Google Sheets workspace specification.

The new database is being designed in parallel with the existing system. The current website, APIs, calculations, UI, tests, deployment, and current Google Sheets are not modified during this phase.

No database account or Supabase project is required until the blueprint, table specifications, sync model, and final Google Sheets structure are implementation-ready.

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

## Current Table Status

### Approved Concepts

- `school_years`
- `calendar_years`
- lightweight `legal_entities`
- `daycares`
- School-Year/effective-period classroom configuration
- monthly enrollment by classroom and Age Group

### Draft Or Pending Full Specification

- reporting/accounting month dimension
- legal entity types and legal entities field-level specification
- daycare legal-entity history if ownership changes
- detailed classroom table split
- all remaining domain tables

Table-level approval requires a completed document under `tables/` and consistency checks against the Handbook and related decisions.

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

## Open Questions

See `open-questions.md`.

Non-blocking questions are collected and presented together near the end of blueprint work. Only structurally blocking uncertainty should interrupt domain design.

## Next Recommended Action

Complete the Foundation and Organization domain specifications, beginning with period/month handling and the clean separation among Daycare identity, annual/effective classroom configuration, and monthly budget enrollment.

## Maintenance Rule

Every future database architecture decision must update the relevant files in `docs/data/`.

Do not rely on conversation history. Do not describe an unapproved proposal as implemented or final. Do not create database code until the blueprint explicitly reaches implementation-ready status.