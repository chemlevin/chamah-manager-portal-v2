# TRACK019 Configuration and Legacy API Audit

Status: implemented and audited 2026-07-25.

## Production source-of-truth finding

The deployable root is built from `chamah-manager-portal/new`. Its active dashboards,
Settings, staff view, calculators, and bank workbench read Supabase directly or through
the authenticated Supabase Edge Functions. None of those root portal screens call the
four Google Sheets APIs.

The older static pages remain deployable under `/dashboard/`, `/employees/`, and
`/accounting/`. They are compatibility routes, not the root portal navigation.

## Configuration inventory

Settings continues to manage the existing 22 authoritative tables:

- Periods: `school_years`, `calendar_years`, `school_year_months`.
- Organization: `legal_entity_types`, `legal_entities`, `allocation_units`, `daycares`.
- Classroom operation: `daycare_school_years`, `classrooms`, `age_groups`.
- Finance: `budget_categories`, `bank_accounts`, `accounting_statuses`.
- Workforce/rules: `roles`, `certificate_types`, `classroom_licensing_rules`,
  `staffing_rules`, `staffing_budget_parameters`, `compensation_factors`,
  `compensation_rules`, `budget_rules`, `travel_rates`.

All 22 tables have RLS enabled in the connected project. Settings mutations still run
through `portal-settings`, require `management.settings` EDIT, use the strict allow-list,
and write `audit_events`.

TRACK019 completes:

- Portal-native `accounting_status_code`; the old sheet code is compatibility-only.
- Nullable sheet identifiers on Settings-managed tables that previously required them.
- Initial certificate-type configuration for caregiver, graduation, first aid, and safe
  conduct, using portal-native codes.
- Order fields for ordered master-data tables.
- Role group and daycare relevance editing.
- Certificate expiry-policy editing.
- Create/edit/order/archive-or-deactivate/validation behavior without destructive delete.
- The database-approved classroom licensing rounding identifier.

## Legacy API usage map

| API | Root Production portal | Compatibility caller | Data | Supabase replacement | Dependency type | Safe to remove from Production validation? |
|---|---|---|---|---|---|---|
| `/api/employees` | No | `/employees/script.js`; `/dashboard/script.js` | Sheet employee rows and KPI source fields | `employees`, `employments`, `employee_assignments`, `employee_pay_terms`, `roles`, certificate tables | Operational legacy/fallback | Defer removal to Employees track; the compatibility employee page still calls it. |
| `/api/budget` | No | `/dashboard/script.js` | Parsed BUDGET tables and deterministic budget model | `budget_rules`, `budget_categories`, `budget_snapshots`, enrollment, calendar, staffing/licensing configuration | Operational legacy/fallback | Yes for root portal validation; retain route until the compatibility dashboard is retired. |
| `/api/payroll` | No | `/dashboard/script.js` | Payroll rows grouped by daycare/month/class | `payroll_records`, `payroll_allocations`, roles and employee relations | Operational legacy/fallback | Defer route removal and validation changes to Payroll track. |
| `/api/allocations` | No | `/accounting/script.js`; `/dashboard/script.js` | BANKS allocation-ledger rows | `bank_transactions`, `bank_allocations`, `bank_accounts`, `accounting_statuses`, bank workbench Edge Function | Operational legacy/fallback | Yes for root portal validation; retain route until both compatibility pages are retired. |

## Remaining Google Sheets dependencies

- The four Vercel API handlers and their `googleapis` service-account environment
  variables remain for compatibility routes.
- `api/employees.js` still hardcodes the shared spreadsheet ID and Employees tab.
- `api/budget.js`, `api/payroll.js`, and `api/allocations.js` still contain the shared
  spreadsheet ID as a fallback plus environment-overridable tab names.
- Legacy parsing/calculation engines and their tests remain intentionally unchanged.
- Several database `sheet_*` columns remain for import reconciliation and historical
  compatibility. They are not the identity required for new portal configuration.
- Imported operational tables and provenance values may retain source-sheet metadata.

## Hardcoded-value disposition

Removed from active dependency:

- Accounting workflow logic no longer requires `sheet_accounting_status_id`; it uses
  `accounting_status_code` and reads the legacy value only as a historical fallback.
- The incorrect Settings-only `FLOOR` choice was replaced by the enforced database value
  `FLOOR_AFTER_TOTAL`.

Retained intentionally:

- Database-constrained enum choices in Settings (lifecycle, period state, rule type,
  source type, unit type, and calculation method) are validation contracts, not business
  entities or live operational data.
- Calculation constants and approved formula identifiers were not changed.
- Employees/payroll status interpretation and calculation arrays are deferred to their
  dedicated tracks.

## Deferred

- Employees UI redesign, employee status normalization, certificate assignment UX, and
  migration away from `/api/employees`.
- Payroll UI redesign, role-to-budget-category workflow, and removal of `/api/payroll`.
- Consolidation of duplicated staffing/travel rule models.
- Replacing legacy compatibility routes or deleting their APIs.
- Converting age-code text columns in licensing/staffing rules to foreign keys; that is a
  business-contract migration and was not required to remove active hardcoding.
