# Source Map

Status: Draft architecture, implementation-ready direction.

Last updated: 2026-07-12

## Purpose

Map each business data concept to its editing surface, accepted database authority, current source, and future consumers. The Handbook defines rules; Google Sheets is the operational editing surface; the database stores accepted data; APIs and dashboards consume database data.

## Authority Layers

| Layer | Role |
|---|---|
| `docs/handbook/` | Sole source of business truth |
| Existing repository code and tests | Evidence of current behavior; never overrides Handbook |
| Google Sheets | Human editing and operational import surface |
| Validation / Sync service | Accepts, rejects, warns, versions, and audits changes |
| Database | Final system Source of Truth for accepted records |
| APIs / Website / Dashboards | Read consumers of database-backed data |

## Business Data Source Map

| Data concept | Current source | Future editing surface | Database authority | Main consumers | Time model |
|---|---|---|---|---|---|
| School Years | Existing configuration / manual | `הגדרות` | `school_years` | All educational modules | Fixed annual period |
| Calendar Years | Existing configuration / manual | `הגדרות` | `calendar_years` | Banking, accounting, annual reporting | Fixed annual period |
| Legal Entities | Existing docs / configuration | `הגדרות` | `legal_entities` | Daycares, bank accounts, reporting | Stable master data |
| Daycares | Existing Sheets/config | `הגדרות` | `daycares` | Classes, employees, payroll, budget | Stable identity |
| Classroom setup | Existing BUDGET / manual configuration | `הגדרות` | `classroom_periods` | Enrollment, staffing, budget | School Year + effective dates |
| Age Groups | Handbook / code constants | `הגדרות` | `age_groups` or controlled reference rows | Tuition, staffing, mixed classrooms | Stable reference data |
| Tuition rules | Existing BUDGET / Handbook | `הגדרות` | `tuition_rules` | Budget income | School Year / effective period |
| Staffing rules | Existing BUDGET / Handbook | `הגדרות` | `staffing_rules` | Required staffing and hours | School Year / effective period |
| Monthly child quantity | Existing BUDGET occupancy sections | `ילדים` | `monthly_enrollments` | Budget income, staffing, dashboard | Calendar month within School Year |
| Employees | `עובדים` tab | `עובדים` | `employees` | Employees screen, payroll matching | Stable person identity |
| Employment periods | Employee fields / payroll evidence | `עובדים` | `employments` | Payroll, seniority, status | Effective dates |
| Role/daycare assignments | Employee fields / operational changes | `עובדים` | `employee_assignments` | Staffing, reporting, payroll context | Effective dates |
| Employee certificates | Employee fields | `עובדים` | `employee_certificates` | Compliance and compensation | Completion/expiry dates |
| Recognized seniority | Employee field, manually maintained | `עובדים` | Employment/seniority fields or history | Compensation, reporting | Effective value; not derived solely from hire date |
| Compensation rules | Handbook/config | `הגדרות` | `compensation_rules` | Display calculators and eligibility checks | School Year / effective period |
| Employee compensation eligibility | Manual employee decision | `עובדים` | `employee_compensation_eligibility` | Compensation reporting | Start/end month |
| Payroll source records | `PAYROLL` | `שכר` import area | `payroll_records` | Budget actual salary cost | Payroll month |
| Payroll allocations | `PAYROLL` manual classification | `שכר` | `payroll_allocations` | Daycare/role/category reporting | Payroll month |
| Bank accounts | Existing account lists | `הגדרות` | `bank_accounts` | Banking and accounting | Stable master data |
| Bank source transactions | Bank exports / `BANKS` | `בנקים` import area | `bank_transactions` | Accounting, cash flow, allocation | Transaction date |
| Bank allocations | `BANKS` manual fields | `בנקים` | `bank_allocations` | Budget actuals, management reporting | Separate Budget Month |
| Accounting workflow status | `BANKS` manual status | `בנקים` | Current status + status history | Accounting dashboard | Event history |
| Budget categories | Existing COST_RULES / category lists | `הגדרות` | `budget_categories` | Budget rules and actual classification | Stable identity + period config |
| Budget rules | BUDGET sections / Handbook | `הגדרות` | `budget_rules` | Budget engine | School Year / effective period |
| Manual budget inputs | Existing manual cells | `תקציב` only where necessary | `budget_manual_inputs` | Budget calculations | Month / School Year |
| Budget calculated results | Current API calculations | Read-only | Database view/result table when justified | Dashboard and reports | Monthly / annual aggregate |
| Import batch metadata | Not implemented | Hidden system area | `import_batches` | Audit and troubleshooting | Event |
| Validation errors and warnings | Not implemented | Inline status columns / review area | `data_quality_issues` where persistent | User correction, dashboard | Event lifecycle |
| Audit trail | Partial / absent | Hidden system area | `audit_events` | Traceability | Event |

## Current Sheet Areas To Future Tabs

| Current source area | Future visible tab | Notes |
|---|---|---|
| `עובדים` | `עובדים` | One visible tab may populate employee, employment, assignment, certificate, and eligibility structures |
| `PAYROLL` | `שכר` | Keeps imported source values separate from manual allocation fields |
| `BANKS` | `בנקים` | Keeps bank source fields protected and allocation/workflow fields editable |
| `BUDGET` occupancy/staffing/config sections | `הגדרות`, `ילדים`, and optional `תקציב` | Split by user task, not by database table |
| Existing account/category/helper lists | `הגדרות` | Small managed tables in one tab |

## Non-Duplication Rules

- Payroll is the sole authority for actual employer salary cost.
- Bank transactions are the authority for actual bank movements.
- Bank allocations classify transactions; they do not replace source transaction values.
- Monthly enrollment quantity is the authority for budget child count.
- Budget results are calculated outputs, not duplicated editable facts.
- Display names are never integration keys.
- Current-state convenience fields may exist only when the effective-dated history remains authoritative for historical reporting.
