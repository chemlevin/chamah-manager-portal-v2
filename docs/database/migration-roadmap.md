# Database Migration Roadmap

Status: planning document only. This roadmap does not implement schema, migrations, sync, API changes, or UI changes.

## Phase 1: Schema Planning

- Goal:
  - Finalize database concepts and stable IDs without changing runtime behavior.
- Deliverables:
  - Source-to-DB map.
  - Phase 1 schema proposal.
  - Open question list.
  - Owner decisions for daycare IDs, LE, budget category list, BANKS semantics, and child source.
- No runtime impact:
  - Existing Sheets APIs remain unchanged.
  - Existing dashboard/accounting/employees screens continue using current APIs.
- Exit criteria:
  - Table list approved.
  - Primary keys/FKs approved.
  - Source traceability fields approved.
  - Critical conflicts resolved or explicitly deferred.

## Phase 2: Import / Sync Foundation

- Goal:
  - Build a read-only import process from current Sheets into database tables.
- Work items:
  - Create DB schema/migrations.
  - Create import batches.
  - Import organization units, daycares, classrooms, budget categories/settings, BANKS rows, payroll rows.
  - Preserve raw row JSON and row index.
  - Track unresolved mappings.
- Constraints:
  - Do not change existing API responses.
  - Do not change screens.
  - Do not let DB become source of truth yet.
- Validation:
  - Row counts by source tab.
  - Group totals match current engines.
  - Unmapped rows are visible and explainable.
- Exit criteria:
  - Repeated imports are deterministic.
  - Source traceability works for every imported row.
  - No data loss for dynamic fields.

## Phase 3: Read-Only API Parity

- Goal:
  - Add database-backed read-only API paths that can be compared with current Sheets-backed APIs.
- Work items:
  - Implement DB read models behind separate internal routes or feature flags.
  - Compare:
    - `/api/budget` Sheets result vs DB-derived budget result.
    - `/api/payroll` Sheets result vs DB-derived payroll result.
    - `/api/allocations` Sheets result vs DB-derived allocation result.
  - Keep employees on Sheets unless employee schema is added.
- Constraints:
  - No default screen switch.
  - No data writes from UI.
- Validation:
  - API contract parity.
  - Totals parity.
  - Grouping parity.
  - Edge case parity for unmapped rows and dynamic fields.
- Exit criteria:
  - Known differences are documented and approved.
  - DB-backed read outputs can reproduce current reporting needs.

## Phase 4: Screen Switch

- Goal:
  - Switch selected screens from Sheets-backed APIs to DB-backed APIs after parity approval.
- Candidate order:
  1. Dashboard read-only financial/operational summaries.
  2. Accounting read-only BANKS/allocation view.
  3. Payroll read-only summaries.
  4. Budget read-only model views.
- Controls:
  - Feature flag or environment switch.
  - Rollback path to Sheets-backed API.
  - Monitoring for mismatched totals and missing mappings.
- Constraints:
  - No calculation behavior changes unless explicitly approved.
  - No UI write workflows until ownership and locking are designed.
- Exit criteria:
  - Screen behavior matches current production expectations.
  - Rollback tested.
  - Business owner signs off on differences.

## Phase 5: Module Expansion

- Goal:
  - Move beyond read-only migration into database-owned modules.
- Candidate expansions:
  - Budget locks and snapshots.
  - Calculation Library management.
  - Budget Category configuration UI.
  - Bank transaction splitting workflow.
  - Administration overhead allocation workflow.
  - Employee/compliance schema.
  - Children roster and tuition schema.
  - Audit trail and permissions.
- Required decisions before expansion:
  - Authentication and authorization.
  - Admin/owner permissions for locking/unlocking.
  - Accounting write boundaries.
  - Whether Google Sheets remains a sync source or becomes export-only.

## Critical Risks

- Name-based mapping:
  - Current Sheets use display names for DCs, classrooms, units, employees, and categories.
  - DB needs stable IDs and a mapping/review process.
- BANKS ambiguity:
  - Allocations engine treats rows as allocation ledger rows.
  - Accounting page groups by `חשבון`.
  - Future schema must distinguish transactions from allocations.
- Budget category maturity:
  - New handbook rules define stable Budget Categories and calculation settings.
  - Current engine uses dynamic COST_RULES rows.
- Children source gap:
  - Phase 1 requested `children`, but no current inspected child roster source/API exists.
- Locking not implemented:
  - BR-0060 to BR-0062 require explicit locking behavior later.
  - Phase 1 should not pretend locking exists.
- API parity:
  - Existing screens depend on current JSON shape and frontend normalization.
  - DB migration must preserve API contracts until screens are intentionally switched.

