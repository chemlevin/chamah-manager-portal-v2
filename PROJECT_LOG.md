# Project Log

This file is the permanent engineering journal for the repository.

Rules for future entries:

- Append chronologically.
- Never overwrite or delete previous entries.
- Keep implementation history separate from permanent rules.
- Record tests run and tests not run.
- Mark uncertain historical details as inference.

## 2026-07-02 - Centralized Business Rules Foundation

Objective: Create a shared runtime source for engine business rules.

Files changed:

- `config/business-rules.js`
- Budget engine imports
- Payroll engine imports
- Related tests
- Existing documentation under `docs/`

Technical decisions:

- Centralized `DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS = 160`.
- Centralized `daycareMonthKey(daycare, month)`.
- Kept rules documentation separate from runtime engine rules.

Business decisions:

- Budget calculations are grouped by daycare + month.
- Payroll calculations are grouped by daycare + month.
- Required employee headcount uses the average monthly hours default.

Tests:

- Existing docs say tests were added to prove stable outputs.

Remaining issues:

- Future work may generate rules UI data from `config/business-rules.js`.

Recommended next step:

- Move additional shared rules into `config/business-rules.js` only when multiple modules need them.

Evidence:

- `docs/decision-log.md`
- `docs/business-rules.md`
- `config/business-rules.js`

## 2026-07-02 - Organizational Units and Allocations Foundation

Objective: Add an allocation model for BANKS rows.

Files changed:

- `config/organizational-units.js`
- `config/business-rules.js`
- `api/allocations-engine.js`
- `api/allocations.js`
- Allocation tests
- Existing documentation under `docs/`

Technical decisions:

- Added organizational unit metadata.
- Added `unitMonthKey(unit, month)`.
- Added `/api/allocations`.
- Treated BANKS rows as allocation ledger rows.

Business decisions:

- BANKS allocation rows are not deduplicated by reference.
- Allocation reporting grain is organizational unit + business month.
- Final profit/loss is not calculated in the allocation layer.

Tests:

- Allocation tests cover grouping, duplicate references, month/date separation, category/notes handling, unmapped rows, and number parsing.

Remaining issues:

- Existing docs describe `עבור מחלקה` as the allocation unit. Current Accounting page uses `חשבון` for its own Accounting workflow.

Recommended next step:

- Clarify long-term relationship between allocation units and Accounting account grouping.

Evidence:

- `docs/decision-log.md`
- `docs/organizational-units.md`
- `api/allocations-engine.js`
- `tests/allocations-engine.spec.mjs`

## Inference, Confidence High - Dashboard and Management Intelligence Expansion

Date: Unknown.

Objective: Build a management dashboard combining budget, payroll, allocations, and employees data.

Files changed:

- `api/management-engine.js`
- `dashboard/index.html`
- `dashboard/script.js`
- Dashboard CSS
- Management tests

Technical decisions:

- Management intelligence is built from existing API payload shapes.
- Payroll operational cost is kept separate from allocation actuals.
- Data quality and possible reports are explicit outputs.

Business decisions:

- Do not invent capacity when budget data does not expose it.
- Exclude special accounting category rows from management financial totals.
- Do not use free-text notes as accounting category logic.

Tests:

- `tests/management-engine.spec.mjs`.
- Responsive visual layout tests include dashboard.

Remaining issues:

- Exact original implementation date is not documented in existing markdown.

Recommended next step:

- Add dated entries for future dashboard changes as they occur.

Evidence:

- `api/management-engine.js`
- `dashboard/script.js`
- `tests/management-engine.spec.mjs`

## Inference, Confidence High - Employees Management Module

Date: Unknown.

Objective: Provide employee filtering, compliance KPIs, detail views, and exports.

Files changed:

- `api/employees.js`
- `employees/index.html`
- `employees/script.js`
- Employee CSS
- Employee tests

Technical decisions:

- Employees data is fetched from `/api/employees`.
- KPI cards act as filters.
- Israeli sheet dates are parsed without relying on browser date parsing.

Business decisions:

- Employee statuses include active, left, maternity leave, sick/accident, unpaid leave, and temporary/other.
- Compliance attention includes caregiver certificate, first aid, safe conduct, and graduation/training dates.

Tests:

- `tests/employees-kpis.spec.mjs`.
- `tests/israeli-dates.spec.mjs`.
- Responsive visual layout tests include employees.

Remaining issues:

- Exact original implementation date is not documented in existing markdown.

Recommended next step:

- Keep employee KPI behavior covered whenever filters or status rules change.

Evidence:

- `employees/script.js`
- `tests/employees-kpis.spec.mjs`
- `tests/israeli-dates.spec.mjs`

## Inference, Confidence High - Occupancy Calculator

Date: Unknown.

Objective: Support daycare classroom occupancy, staffing, area, and scenario planning.

Files changed:

- `occupancy/index.html`
- `occupancy/script.js`
- Occupancy CSS
- Occupancy tests

Technical decisions:

- Calculator supports quick and full modes.
- Scenario alternatives are generated client-side.
- Missing area disables area-based alternatives.

Business decisions:

- Mixed classrooms must use adjacent age groups.
- Recommendations prioritize valid compositions and monthly balance.

Tests:

- `tests/occupancy.spec.mjs`.

Remaining issues:

- Exact original implementation date is not documented in existing markdown.

Recommended next step:

- Preserve tests around invalid non-adjacent mixed classrooms when changing recommendation logic.

Evidence:

- `occupancy/script.js`
- `tests/occupancy.spec.mjs`

## Inference, Confidence Medium - Salary Calculator

Date: Unknown.

Objective: Estimate salary components and net range.

Files changed:

- `salary/index.html`
- `salary/script.js`
- Salary CSS
- Salary tests

Technical decisions:

- Calculator is client-side.
- Net range is estimated as 84%-89% of gross.

Business decisions:

- Salary estimate includes base hourly wage, seniority, monthly hours, management eligibility, certificate, and degree inputs.

Tests:

- `tests/salary.spec.mjs`.

Remaining issues:

- Exact original implementation date is not documented in existing markdown.

Recommended next step:

- Document payroll/legal assumptions if salary calculator becomes contractual.

Evidence:

- `salary/script.js`
- `tests/salary.spec.mjs`

## 2026-07-06 - Accounting Page Source-of-Truth Correction

Objective: Make the dedicated Accounting page use BANKS `חשבון` directly as the account/daycare grouping field.

Files changed:

- `accounting/index.html`
- `accounting/script.js`
- `chamah-manager-portal/accounting/index.html`
- `chamah-manager-portal/accounting/script.js`

Technical decisions:

- Accounting reads raw `חשבון` directly.
- Accounting does not use numeric bank account mappings.
- Accounting does not use `מעון` for page grouping/filtering.
- Empty `חשבון` displays as `לא שויך`.
- Source table and CSV export include `חשבון`, `תאריך`, `תיאור תנועה`, `אסמכתא`, `סכום`, `הגדרה`, `עבור מחלקה`, `עבור חודש`, `הנה"ח`, and `הערות`.

Business decisions:

- For the Accounting page, `חשבון` is the business source of truth.
- Accounting changes are scoped away from Budget Engine and API behavior.

Tests:

- Accounting script syntax parse.
- `npm run build`.
- `node --check api\budget-engine.js`.
- `npx playwright test` passed with 216 tests.

Remaining issues:

- Existing older docs describe allocation grouping through `עבור מחלקה`; this differs from Accounting page grouping through `חשבון`.

Recommended next step:

- If the business wants Budget or allocation APIs to use the updated `חשבון` schema too, request that as a separate explicit API/Budget task.

## 2026-07-06 - Project Engineering Handbook and Log

Objective: Create permanent AI/developer project memory and implementation history.

Files changed:

- `AGENTS.md`
- `tests/salary.spec.mjs`
- `PROJECT_LOG.md`

Technical decisions:

- Keep permanent rules in `AGENTS.md`.
- Keep chronological milestones in `PROJECT_LOG.md`.
- Preserve existing `docs/` files and document conflicts rather than replacing them.

Business decisions:

- Implementation remains the source of truth when documentation differs from code.

Tests:

- Documentation-only change. No application tests required.

Remaining issues:

- Existing docs should be reconciled later if the business finalizes one unified BANKS schema across Accounting and allocations.

Recommended next step:

- Future implementation sessions should append to this log after completing work.

## 2026-07-06 - Documentation Quality Audit for Permanent Handbook

Objective: Review and improve `AGENTS.md` and `PROJECT_LOG.md` before treating them as permanent project memory.

Documentation improvements:

- Added a dedicated Engineering Workflow section with the required pre-implementation process.
- Added a dedicated AI Session Workflow section for future AI agents.
- Clarified generated-output boundaries for `dist/` and test report folders.
- Clarified API no-store caching behavior across inspected API handlers.
- Added a Data Ownership section separating Sheets, API handlers, engines, browser modules, and documentation responsibilities.
- Tightened the open question around the rules center to reflect docs/CSS evidence without claiming an implemented route.
- Added guidance that documentation-only changes usually do not require app builds or Playwright tests, but must be scoped to Markdown.

Reason for the changes:

- The original handbook captured project knowledge but did not make the requested engineering and AI workflows explicit enough for permanent use.
- The audit found a few durable implementation conventions worth documenting for future maintainability.

Files updated:

- `AGENTS.md`
- `PROJECT_LOG.md`

Tests:

- Documentation-only change. No application tests required.

Remaining issues:

- The relationship between Accounting `חשבון` grouping and allocation-engine `עבור מחלקה` grouping remains an intentional documented conflict/open question.
- Existing `README.md` remains stale relative to current modules.

## 2026-07-07 - Salary Certificate Help Tooltip

Objective: Add inline guidance for the Salary Calculator certificate/commitment hourly supplement without changing salary calculations.

Files changed:

- `salary/index.html`
- `chamah-manager-portal/salary/index.html`
- `assets/styles.css`
- `chamah-manager-portal/assets/styles.css`

Technical decisions:

- Added a small reusable CSS-only info tooltip using hover and focus states.
- Kept Salary Calculator JavaScript and payroll calculations unchanged.

Business decisions:

- The UI now clarifies that the certificate/commitment supplement is calculated automatically and base hourly wage should be entered before that supplement.

Tests:

- `npm run build` passed.
- `npx playwright test salary.spec.mjs` passed with 8 tests.
- `node --check dashboard\script.js` passed.

Remaining issues:

- None known.

## 2026-07-07 - Salary Tooltip and Print Layout Refinement

Objective: Improve the Salary Calculator certificate tooltip display and make printed salary estimates include input details before calculation results.

Files changed:

- `assets/styles.css`
- `chamah-manager-portal/assets/styles.css`
- `tests/salary.spec.mjs`
- `PROJECT_LOG.md`

Technical decisions:

- Kept the existing tooltip markup and refined the shared CSS so the tooltip opens compactly inside the certificate field instead of overlaying nearby controls.
- Added salary-specific print CSS after the salary styles so input details print before results while interactive controls remain hidden.
- Added focused Salary Calculator QA coverage for tooltip geometry and print ordering.
- Left Salary Calculator JavaScript, calculations, APIs, and business logic unchanged.

Business decisions:

- None. This is a presentation-only refinement.

Tests:

- `npm run build` passed.
- `npx playwright test salary.spec.mjs` passed with 16 tests.

Remaining issues:

- None known.
