# Database Constitution

Status: Mandatory architecture policy.

Last updated: 2026-07-13

## Purpose

This document defines the non-negotiable rules for the Chamah Manager Portal data platform. Every future developer, AI model, migration, API, Google Sheets integration, and database change must follow these rules.

## Constitution

1. The Handbook under `docs/handbook/` is the only source of business truth.
2. Existing code is evidence of the current implementation and does not override the Handbook.
3. Missing business rules are never invented.
4. Google Sheets is the operational editing interface for the owner and office staff.
5. The database is the final system Source of Truth after validation and synchronization.
6. The website and future consumers read accepted data from the database, not directly from editable Sheets.
7. The current website, APIs, calculations, and Sheets remain unchanged until an explicit implementation and migration phase.
8. Every Master Data entity has a stable internal ID, stable business code, and display name.
9. A display-name change does not change identity.
10. A material business-meaning change creates a new record and new business code.
11. Used business records are never physically deleted.
12. Historical data is never overwritten merely to simplify the current view.
13. Configuration data and operational data remain separate.
14. Imported source data and manual user work remain separate.
15. Source imports never silently erase manual classifications, allocations, notes, or approvals.
16. Every accepted change is traceable to source, actor, timestamp, and import/sync batch where applicable.
17. Domain time models remain appropriate to the business: educational year, calendar year, month, or effective dates.
18. Multiple years may remain selectable; one period is displayed at a time in a dashboard.
19. Multiple Calendar Years may remain open simultaneously for accounting completion.
20. One Daycare represents one license.
21. Classroom structure is period-bound and may change by School Year or effective date.
22. Monthly child quantity for budget is the count entered for that month and age group.
23. Person identity is separate from employment, assignment, payroll, and certificates.
24. Bank and payroll source records are separate from their manual allocations.
25. Database design must optimize for operational simplicity, not speculative enterprise complexity.
26. No table, workflow, status model, hierarchy, or abstraction is added without a real business, historical, synchronization, or realistic migration need.
27. Google Sheets must remain compact and understandable; internal database normalization is not exposed as many user-facing tabs.
28. Only marked cells are editable; controlled values use dropdowns wherever possible.
29. Sheet validation is a convenience layer and never replaces import/database validation.
30. Invalid rows remain visible with clear correction guidance and are not silently accepted.
31. Locked periods or results are not recalculated or modified without an explicit reopen action.
32. Every future implementation must preserve rollback and parallel-run capability until parity is approved.
33. Documentation under `docs/data/` must be updated whenever an architecture decision changes.
34. Superseded decisions remain traceable; they are marked, not erased.
35. No implementation may claim the database is complete unless the Blueprint, open questions, migration checks, and reconciliation criteria have been satisfied.

## Required Reading Order

Before changing the data platform, read:

1. `docs/handbook/`
2. `docs/data/database-constitution.md`
3. `docs/data/README.md`
4. `docs/data/decision-log.md`
5. `docs/data/open-questions.md`
6. `docs/data/domain-model.md`
7. `docs/data/data-dictionary.md`
8. Relevant table and mapping documents

## Enforcement

If a proposed change conflicts with this Constitution, the change must stop until the conflict is explicitly resolved and documented in the decision log.