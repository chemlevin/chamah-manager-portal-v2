# Canonical Business Rules

This file is the authoritative business-rule catalog for the portal. Existing
rules here remain binding unless a TRACK explicitly changes a rule and updates
the implementation and tests with it. Spreadsheet and database values are data,
not implicit business rules.

## Shared runtime rules

`config/business-rules.js` owns shared executable contracts:

- `DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS = 160` and its
  `averageEmployeeMonthlyHours` alias.
- `DAYCARE_MONTH_KEY_SEPARATOR = "|"`.
- `daycareMonthKey(daycare, month)` and `unitMonthKey(unit, month)` trim values
  and return `scope|month`.
- `TUITION_ECONOMIC_MONTHS = 12`.
- `TUITION_PAYMENT_COUNTS = [11, 12]`.
- `annualEconomicTuition(monthlyRate)` is exactly `monthlyRate × 12`.
- `tuitionInstallment(monthlyRate, paymentCount)` rounds to a whole shekel only
  for 11 payments.
- `isTuitionCollectionMonth(schoolYearSequence, paymentCount)` uses a
  September-first collection schedule.

Do not hardcode live daycare, month, employee, class, category, cost, hour, row,
or current sheet values in engine logic. Production-like sheet data may verify
parsing and calculations but must not define rules.

## Tuition

- The official monthly tuition rate is a 12-month economic/Budget rate.
- Annual economic tuition is exactly `monthly_rate × 12`.
- Eleven-payment collection runs September through July; August collection is
  zero. The installment is `ROUND((monthly_rate × 12) / 11)`.
- Twelve-payment collection runs September through August at the monthly rate.
- Installment rounding never changes annual economic tuition.
- `daycare_school_years.tuition_payment_count` controls collection scheduling
  only. It must not change Budget, occupancy, or actual-income calculations.
- Budget remains `children_count × monthly_rate` in all 12 school-year months.
- Actual income comes only from actual financial/accounting data.
- For תשפ״ז (`SY-2026-2027`), monthly rates are INFANT ₪4,185, TODDLER
  ₪3,102, GRADUATE ₪2,751, and GANON ₪3,102. The corresponding 11-payment
  installments are ₪4,565, ₪3,384, and ₪3,001.

## Budget

- Budget grain is daycare + month.
- `api/budget-engine.js` requires `OCCUPANCY`, `STAFFING`, `MONTH_HOURS`,
  `FIXED_STAFF`, and `COST_RULES` tables parsed from dynamic `TABLE: NAME`
  sections.
- Calculate classroom staffing before daycare/month aggregation.
- Mixed classrooms are supported only when explicitly marked mixed.
- Expected revenue is occupancy children × staffing tuition.
- Cost rules may use Hebrew classroom/staff quantity bases.
- Daycare-specific exception rules must not double count with general rules.
- Fixed staff remains separate from classroom staffing but contributes hours and
  costs.
- Required employee headcount is separate from regulatory required staff and
  uses the 160-hour default.
- Partial `COST_RULES` is valid; calculate only categories that exist.
- Track unmapped actual-expense categories as Budget coverage gaps.

## Payroll

- Payroll grain is daycare + month, using `daycareMonthKey`.
- Preserve dynamic cost fields and aggregate payroll hours and costs.
- Expose class-level aggregates within daycare/month groups.
- Separate total payroll cost from staffing-compliance caregiver rows.
- Skip empty rows and rows missing daycare or month.

## Allocations and banking

- BANKS is an allocation ledger. Every source row is an allocation row; repeated
  references must not be deduplicated.
- Allocation reporting grain is organizational unit + business month, using
  `unitMonthKey`.
- `תאריך` is cash date; `עבור חודש` is business month; `פירוט` is accounting
  category; `הערות` remains free text and is never category logic.
- Rows missing organizational unit or business month are `unmappedRows`.
- Normalize debit/credit values containing shekel signs, commas, blanks,
  decimals, or parentheses.
- Do not calculate final profit/loss in the allocations layer.
- Management totals keep payroll operational cost separate from actual
  allocation expenses and exclude explicitly configured special categories.
- Do not infer or invent capacity when Budget does not expose it.

### Budget Actual contract

- A complete `INCOME` bank allocation assigned to an `INCOME` category contributes its signed amount to Actual income; a negative income reversal reduces income.
- A complete `EXPENSE` bank allocation assigned to an `EXPENSE` category contributes the negated signed allocation amount to Actual expense; a positive refund or credit therefore reduces expense.
- `INTERNAL` and `EXCLUDE` allocations always have zero Budget effect, including legacy rows that retain a category.
- Missing or contradictory movement/category assignments have zero Budget effect. New contradictory `INCOME`/`EXPENSE` assignments are rejected by the Bank Workbench.
- Split bank allocation rows are the sole Budget rows for their parent transaction and are counted exactly once. Accounting status does not gate Actual visibility.
- Payroll Actual comes only from `payroll_records.employer_cost`. When a parent has split payroll children, the children replace the parent; otherwise the parent is used once only when its canonical actual unit/daycare attribution is sufficient.
- Payroll rows with insufficient attribution are reported and not guessed. Bank allocations in payroll categories never contribute Budget Actual or duplicate Payroll in category matrices.
- Finance KPIs, balances, school-year summaries, and category matrices use this same Actual contract. `budget_month` remains the controlling Bank Budget month and may intentionally differ from transaction date.

## Accounting UI

- The dedicated Accounting page fetches `/api/allocations` and is separate from
  Budget Engine behavior.
- Its grouping and filtering source is the raw BANKS `חשבון` value. Empty
  accounts display as `לא שויך`; do not infer names from numeric mappings or use
  `מעון` as the page grouping source.
- Calendar-month filters cover 01/2026 through 12/2027; YTD is calendar YTD.
- Parse Israeli bank dates as `DD/MM/YYYY`, `D/M/YYYY`, `DD.MM.YYYY`, or
  `D.M.YYYY`; sort newest first and place invalid/empty dates last.
- Refresh in place manually, every five minutes, and on persisted `pageshow`;
  preserve active filters and explanation-modal state.
- Source-table and CSV output follow visible source-row logic and retain original
  accounting context fields.
- `docs/organizational-units.md` describes `עבור מחלקה` as the allocation target;
  this differs from Accounting UI grouping by `חשבון`. Treat them as separate
  workflows until an explicit rule change resolves the relationship.

## Employees, occupancy, and salary

- Employee status categories include active, left, maternity leave,
  sick/accident, unpaid leave, and temporary/other. KPI cards act as filters.
- Employee dates use explicit Israeli parsing, not browser date parsing.
- Training/compliance covers caregiver certificate, graduation, first aid, and
  safe conduct.
- Occupancy uses one unified flow for area-to-children, children-to-area, or
  validation when both exist.
- Default age groups are infants, toddlers, and older children. Mixed classrooms
  allow adjacent groups only.
- Occupancy alternatives use active database licensing, staffing, tuition, and
  operating-hour rules; recommendations rank valid compositions and monthly
  balance.
- Salary gross uses hourly wage, seniority, monthly hours, class-management
  eligibility, certificate, and degree inputs. The UI estimates net as 84%–89%
  of gross.

## Presentation and ownership boundaries

### Bank Transfers permission boundary (TRACK045)

- The Bank Transfers screen retains direct HIDDEN / VIEW / EDIT permissions. Its
  data scope is independently ALL or ASSIGNED_DAYCARES; scope never grants a
  hidden screen or write access to a VIEW user.
- ASSIGNED_DAYCARES uses the user's current explicit daycare assignments.
  Unassigned transfers are invisible. A split child assigned to an allowed
  daycare may be viewed and edited without disclosing its parent or sibling
  allocation when they are outside scope; cross-daycare parent mutation is
  denied.
- The `approve_for_execution` and `set_execution_date` actions are independent
  of EDIT and of each other. Completing an open transfer requires the approval
  action; changing its execution date requires the date action. Both are
  enforced by the API. Super-admin retains full access.
- A single permitted daycare is assigned automatically on creation; with
  multiple permitted daycares, the user selects only among those assignments.

- Google Sheets/database own operational source data; API handlers own secure
  access and response shaping; engines own deterministic parsing/calculation;
  browser modules own presentation, filtering, refresh, and export.
- Management views are problem-first: surface actionable issues and data-quality
  gaps, preserve interactive filters/KPIs, and remain dense, responsive, Hebrew,
  and RTL.
- The `/rules` page is read-only administrator documentation from `rules.json`.
  Shared executable rules remain in `config/business-rules.js` until an approved
  architecture change replaces that boundary.
