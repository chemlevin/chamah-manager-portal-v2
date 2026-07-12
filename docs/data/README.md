# Data Architecture Knowledge Base

Status: Draft architecture knowledge base. The database is not implemented.

Last updated: 2026-07-12

## Purpose

`docs/data/` is the permanent, self-contained database architecture knowledge base for the Chamah Manager Portal. It records database blueprint decisions, source-of-truth rules, table concepts, Google Sheets editing expectations, migration strategy, and open questions.

This folder is documentation only. It does not create migrations, SQL, ORM models, APIs, calculations, Google Sheets integrations, tests, or UI.

## Mandatory Reading Order

1. `README.md`
2. `database-blueprint-principles.md`
3. `decision-log.md`
4. `open-questions.md`
5. `architecture-overview.md`
6. `source-of-truth-model.md`
7. `google-sheets-sync-model.md`
8. `naming-and-identity-standards.md`
9. `entity-inventory.md`
10. `relationship-matrix.md`
11. `source-map.md`
12. `migration-strategy.md`
13. `tables/README.md`
14. Individual table documents under `tables/`
15. `diagrams/erd.md`

## Current Phase

Current phase: Database Blueprint.

The new database is being designed in parallel with the existing system. The current website, APIs, Google Sheets integration, calculations, and UI are not changed during this phase.

## Source Of Business Truth

The Handbook under `docs/handbook/` is the only source of business truth.

Existing code describes the current implementation. It does not override the Handbook.

## Approved Tables

- `school_years`: approved concept.
- `calendar_years`: approved concept.

## Tables Under Review

- `legal_entity_types`: draft, not yet finally approved.

## Open Questions

See `open-questions.md`.

Key current open questions:
- Whether legal entity type values are final.
- Which table should be designed next after year tables and legal entity types.
- Exact Google Sheets tab layout for each table.

## Next Recommended Action

Review and approve `legal_entity_types`, then continue table design with legal entities, organization units, and daycares.

## Maintenance Rule

All future database architecture updates must update the relevant documents in `docs/data/`. Do not rely on prior conversation context.

