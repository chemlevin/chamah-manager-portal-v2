# Business Rules Foundation

This project treats spreadsheet values as dynamic data and business rules as explicit code contracts.

## Central module

Shared rules that engines need at runtime live in `config/business-rules.js`.

Current exports:

- `DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS`: `160`
- `averageEmployeeMonthlyHours`: alias for the same default value
- `DAYCARE_MONTH_KEY_SEPARATOR`: `|`
- `daycareMonthKey(daycare, month)`: trims daycare and month and returns `daycare|month`
- `BUSINESS_RULES`: read-only metadata describing shared rules

## Runtime rules currently centralized

### Budget grain

Budget data is calculated by daycare + month.

### Payroll grain

Payroll data is aggregated by daycare + month and can expose class-level breakdowns inside each group.

### Daycare-month key

The shared merge key is:

`daycare|month`

This supports future joins between Budget, Payroll, Comparison, Dashboard, and Reports.

### Average employee monthly hours

The default is:

`160`

Budget uses this to calculate `requiredEmployeeHeadcount` from required classroom hours. This does not change `requiredStaff`, which remains regulatory staffing.

## Data-driven constraints

Do not hardcode spreadsheet values in engine logic:

- daycare names
- month names
- employee names
- class names
- categories
- costs
- hours
- row counts
- current sheet values

Current Google Sheets data is test data only. It may validate parsing, grouping, calculations, and API shape, but it must not define business logic.

## Relationship to /rules

The `/rules` page is read-only and administrator-facing. It documents current rules from `rules.json`.

The runtime source of shared engine rules is `config/business-rules.js`. Future work may generate the UI data from the central module or move both behind a controlled rules service.


## Allocations ledger

BANKS is treated as an allocation ledger. Each row is an allocation row, not necessarily a unique bank transaction.

The same ?????? may appear multiple times and must not be deduplicated.

Allocation reporting grain is:

`organizational unit + business month`

The shared helper is `unitMonthKey(unit, month)`, which returns `unit|month`.

Do not calculate final profit/loss in the allocations layer. It prepares allocated cash movement totals for later comparison and reporting.
