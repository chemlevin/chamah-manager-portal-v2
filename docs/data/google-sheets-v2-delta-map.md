# Google Sheets v2 Delta Map

This is the implementation map for spreadsheet `16Jj7x1oBdlZsR1FITrjJzXHeCN3OfGto-kMIjDQ2LMM`. It records only the delta from the existing database. No production data is imported by the migration.

## Field disposition

| Sheets area | STORED | DERIVED / VALIDATION_ONLY / UI_ONLY | Database target |
| --- | --- | --- | --- |
| SCHOOL_YEARS | ids, name, dates, status, default | selectable/visibility remain database controls | `school_years` |
| MONTHS | id, school year, label, dates, sequence | — | `school_year_months` |
| MONTHLY_WORK_CALENDAR | daily hours, workday counts, notes | total days and monthly hours are DERIVED | `monthly_work_calendars` |
| ORGANIZATION_UNITS | id, name, type, active, notes | dropdowns are VALIDATION_ONLY | `allocation_units` |
| DAYCARES | all business fields | active is mapped to lifecycle status | `daycares` |
| CLASSROOMS | code, scope, name, capacity, dates, status | composite classroom id is SYNC_METADATA; age selection also maps to `classroom_age_groups` | `classrooms`, `classroom_age_groups` |
| CLASSROOM_CAPACITY_BREAKDOWN | age capacity and effective month range | validation_status is VALIDATION_ONLY | `classroom_capacity_breakdowns` |
| BANK_ACCOUNTS | id, account number, active, notes | — | `bank_accounts` |
| BUDGET_CATEGORIES | category fields, parent, display order | dropdown helpers are VALIDATION_ONLY | `budget_categories` |
| Budget rule tables | effective rule inputs and scopes | category name is DERIVED | `budget_rules` and `contract_notes` for additional typed parameters |
| PAY_ADDITION_RULES | effective rule and eligibility inputs | — | `compensation_rules` / `compensation_factors` |
| ACCOUNTING_STATUSES | all fields | — | `accounting_statuses` |
| DAYCARE_YEAR_SETTINGS | all calculation selections | — | `daycare_school_years` |
| PAYROLL_ROLES | all fields | — | `roles` |
| PAYROLL_DEPARTMENTS | unit/daycare mapping | display label is DERIVED from master data | `allocation_units`, `daycares` |
| STAFFING_BUDGET_PARAMETERS | hours per FTE and effective months | — | `staffing_budget_parameters` |
| EMPLOYEES | identity, contact, dates, status, prior seniority source, primary relationships | employee id is SYNC_METADATA when generated; seniority years is DERIVED | existing employee/employment/assignment tables |
| EMPLOYEE_PAY_TERMS | effective-dated pay terms, eligibility flags, certificates and weekly schedule | employee number/name/status/seniority are DERIVED | `employee_pay_terms`; certificates may also normalize to `employee_certificates` during sync |
| MONTHLY_OCCUPANCY | monthly billable child counts and notes | year/daycare/classroom name are DERIVED; dropdowns are VALIDATION_ONLY | one row per month in `monthly_enrollment` |
| PAYROLL | month, employee, gross/cost, hours and allocation dimensions | employee check is VALIDATION_ONLY | `payroll_records`, `payroll_allocations` |
| BANK_TRANSACTIONS | source transaction, allocation target/category/status/document and notes | amount/direction/split check/row status/helpers are DERIVED or UI_ONLY | `bank_transactions`, `bank_allocations` |

## Grain preservation

- Budget: `daycare + school year + month + budget category`; unlocked results remain runtime calculations and locked results remain `budget_snapshots`.
- Occupancy: spreadsheet wide rows unfold to `classroom + age group + reporting month` in `monthly_enrollment`.
- Payroll: one source record can have multiple `payroll_allocations`, preserving split department/daycare rows.
- Bank: parent source transaction is `bank_transactions`; split rows are `bank_allocations` linked to it.
- Employee: stable identity remains `employees`; employment history remains `employments`; pay changes are effective-dated in `employee_pay_terms`.
- Accounting calendar month remains derived from `bank_transactions.transaction_date`. `bank_allocations.budget_month` is populated from the transaction month during future sync because v2 has no separate business-month input.

## Compatibility boundary

The migration is additive. Existing Sheets-backed APIs, engines, calculations and browser modules are unchanged. Data sync/import remains a later execution step and must resolve sheet text ids/codes to database UUID keys inside a validated import batch.
