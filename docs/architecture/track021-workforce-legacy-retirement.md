# TRACK021 Workforce Legacy Retirement

Status: completed 2026-07-26.

## Caller map

| Surface | Before TRACK021 | After TRACK021 |
|---|---|---|
| Root Employees Workbench | Authenticated `portal-workforce-workbench` Edge Function over TRACK020 tables | Unchanged; canonical active Employees UI |
| Root Actual Payroll Workbench | Authenticated `portal-workforce-workbench` Edge Function over TRACK020 tables | Unchanged; canonical active Actual Payroll UI |
| Root Staff/Licensing Dashboard | Direct Supabase reads from employees, employments, assignments, pay terms, roles, daycares, classrooms and allocation units | Unchanged source; dashboard mode corrected so Workforce KPI drill-down uses the loaded Supabase model |
| Root Finance Dashboard payroll KPIs | Direct Supabase reads from `payroll_records` and `payroll_allocations` | Unchanged; confirmed canonical payroll KPI source |
| `/employees/` compatibility route | Legacy browser script called `/api/employees` | Lightweight redirect to `/#dashboards/unit/organization/staffing/employees` |
| `/dashboard/` compatibility route | Legacy browser script called `/api/employees`, `/api/payroll`, `/api/budget` and `/api/allocations` | Lightweight redirect to `/#dashboards`; no legacy browser script remains |

No active browser code calls `/api/employees` or `/api/payroll`.

## Retired and retained APIs

Retired after the final callers were removed:

- `/api/employees` and `api/employees.js`.
- `/api/payroll` and `api/payroll.js`.
- Their Vercel builds and routes.

Retained because compatibility pages outside TRACK021 still require them:

- `/api/budget` and `/api/budget-test`.
- `/api/allocations`.

The deterministic `api/payroll-engine.js` is retained as calculation history and
regression coverage. TRACK021 does not change payroll calculations.

## Canonical TRACK020 contracts

- Employees: `employees`, `employments`, `employee_assignments`.
- Pay Terms and related history: `employee_pay_terms`,
  `employee_compensation_eligibility`, `employee_certificates`,
  `employee_leave_periods`.
- Actual Payroll: `payroll_records`, `payroll_allocations`,
  `portal_save_payroll_allocations`.
- Lookups: `allocation_units`, `daycares`, `roles`, `certificate_types`,
  `compensation_factors`, and legal entities.
- Transport and authorization: authenticated `portal-workforce-workbench`,
  portal permission resolution and audit events.

## Remaining Google Sheets dependencies

- Budget compatibility: `api/budget.js` and `api/budget-test.js`.
- Accounting compatibility: `api/allocations.js`.
- `googleapis` and the service-account variables remain required for those retained
  compatibility handlers.
- Historical `sheet_*` identifiers and provenance fields remain for reconciliation;
  they are not active Workforce identity or dropdown sources.
- No Employees or Actual Payroll Google Sheets read remains in the active build.

