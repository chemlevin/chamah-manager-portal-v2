# Database Phase 1 Audit

Status: planning document only. No database schema, migration, API change, or runtime behavior is implemented by this document.

## Scope

- Repository audit for future database migration planning.
- Sources inspected:
  - `docs/handbook/*.md`
  - `docs/specifications/implementation-knowledge-extract.md`
  - `api/budget.js`
  - `api/budget-engine.js`
  - `api/payroll.js`
  - `api/payroll-engine.js`
  - `api/allocations.js`
  - `api/allocations-engine.js`
  - `api/employees.js`
  - `api/management-engine.js`
  - `dashboard/script.js`
  - `accounting/script.js`
  - `employees/script.js`
  - `config/business-rules.js`
  - `config/organizational-units.js`
  - `.env.example`
  - `vercel.json`

## Current Architecture

- Google Sheets is the operational source of truth.
- Vercel serverless API handlers read Google Sheets with a service account.
- Engine modules parse and calculate models from sheet rows.
- Frontend modules fetch API JSON and render operational screens.
- Current system does not include an application database or migrations.

## Current Runtime Flow

1. Google Sheets stores operational rows.
2. API handler authenticates with Google service account.
3. API handler reads a configured sheet tab/range.
4. Engine normalizes rows and calculates grouped output.
5. Frontend screen fetches `/api/...`.
6. Frontend renders cards, tables, filters, charts, exports, and summaries.

## API Endpoints

| Endpoint | Handler | Current Source | Frontend Consumers |
|---|---|---|---|
| `/api/budget` | `api/budget.js` | Google Sheet tab `BUDGET` | Dashboard |
| `/api/payroll` | `api/payroll.js` | Google Sheet tab `PAYROLL` | Dashboard |
| `/api/allocations` | `api/allocations.js` | Google Sheet tab `BANKS` by default | Dashboard, Accounting |
| `/api/employees` | `api/employees.js` | Google Sheet tab `עובדים` | Dashboard, Employees |
| `/api/budget-test` | `api/budget-test.js` | test route only | not a core data source |

## Sheet Sources

### BUDGET

- Handler: `api/budget.js`
- Default spreadsheet ID: `18jel-vx6yR2LvcqxO6cTCAwKiAV8WUz2dQSDEzNB4G0`
- Env override:
  - `GOOGLE_BUDGET_SHEET_ID`
  - `GOOGLE_SHEET_ID`
- Tab:
  - `GOOGLE_BUDGET_SHEET_NAME || "BUDGET"`
- Range:
  - `BUDGET!A:Z`
- Required table sections:
  - `OCCUPANCY`
  - `STAFFING`
  - `MONTH_HOURS`
  - `FIXED_STAFF`
  - `COST_RULES`
- Optional actual tables:
  - `ACTUAL_EXPENSES`
  - `BANK_TRANSACTIONS`
  - `BANKS`
  - `BANK`
  - `TRANSACTIONS`

### PAYROLL

- Handler: `api/payroll.js`
- Default spreadsheet ID: same current default ID.
- Env override:
  - `GOOGLE_PAYROLL_SHEET_ID`
  - `GOOGLE_SHEET_ID`
- Tab:
  - `GOOGLE_PAYROLL_SHEET_NAME || "PAYROLL"`
- Range:
  - `PAYROLL`
- Model grain:
  - daycare + month.

### BANKS / Allocations

- Handler: `api/allocations.js`
- Default spreadsheet ID: same current default ID.
- Env override:
  - `GOOGLE_ALLOCATIONS_SHEET_ID`
  - `GOOGLE_BANKS_SHEET_ID`
  - `GOOGLE_SHEET_ID`
- Tab:
  - `GOOGLE_ALLOCATIONS_SHEET_NAME || GOOGLE_BANKS_SHEET_NAME || "BANKS"`
- Range:
  - tab name only.
- Engine model grain:
  - organizational unit + business month.
- Accounting page grouping:
  - raw `חשבון`.

### Employees

- Handler: `api/employees.js`
- Spreadsheet ID:
  - hardcoded current default ID.
- Tab:
  - `עובדים`
- Range:
  - `עובדים!A:AF`
- Frontend:
  - `employees/script.js` uses hardcoded Hebrew field names.

## Relevant Handbook Rules

- Calendar:
  - BR-0001, BR-0029
- Children:
  - BR-0002 to BR-0007
- Tuition:
  - BR-0008 to BR-0013
- Staffing/Classrooms:
  - BR-0014 to BR-0025
- Roles/Payroll:
  - BR-0030 to BR-0040
- Budget:
  - BR-0041 to BR-0046
  - BR-0050 to BR-0064
- Organization:
  - BR-0047 to BR-0049
  - RD-0001

## Current Implementation Facts Affecting Database Planning

- Budget engine is table-section driven and alias-based.
- Budget required tables are not currently normalized relational tables.
- Budget current aggregate grain is strongest at daycare + month, with classroom staffing detail.
- Payroll current aggregate grain is daycare + month.
- Allocations current aggregate grain is unit + business month.
- Accounting page uses `חשבון` for grouping, not allocations engine `עבור מחלקה`.
- Employees are currently sheet rows with hardcoded Hebrew field mappings.
- Dashboard fetches existing APIs directly; it does not read a database.

## Conflicts / Gaps Relevant To Database

- Daycare entity is referenced by names in Sheets; no stable daycare ID exists in current runtime data.
- LE is now documented in organization rules, but current Sheets/API flow does not enforce daycare-to-LE ownership.
- Budget Category is now a documented fixed system entity, but current engine uses COST_RULES categories from Sheets.
- Budget locking, snapshots, calculation library, and calculation transparency are documented rules but not implemented.
- BANKS rows are treated as allocation rows in the engine; Accounting treats raw `חשבון` as local grouping.
- Children table is requested for Phase 1, but current implementation does not expose a live children API/source in inspected code.
- Classrooms exist in budget/occupancy logic but are not stable database entities today.

## Phase 1 Audit Conclusion

- Phase 1 should introduce a relational planning schema without changing existing runtime flows.
- Sheets should remain source of truth until an import/sync phase is implemented and validated.
- The first schema should prioritize stable IDs, source traceability, and compatibility with current API payloads.
- No screen should switch to database reads until read-only parity checks prove equivalence with current Sheets output.

