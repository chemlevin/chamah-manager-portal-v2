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
- `TUITION_ECONOMIC_MONTHS`: `12`
- `TUITION_PAYMENT_COUNTS`: `[11, 12]`
- `annualEconomicTuition(monthlyRate)`: exact `monthlyRate × 12`
- `tuitionInstallment(monthlyRate, paymentCount)`: collection installment rounded to a whole shekel only for 11 payments
- `isTuitionCollectionMonth(schoolYearSequence, paymentCount)`: September-first collection schedule predicate

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

### Tuition economic and collection model

- The official tuition rate is a monthly economic/Budget rate on a 12-month basis.
- Annual economic tuition is exactly `monthly_rate × 12`.
- With 11 payments, collection runs September through July; August collection is zero. The displayed/collected installment is `ROUND((monthly_rate × 12) / 11)` to a whole shekel.
- With 12 payments, collection runs September through August and the installment equals the monthly rate.
- Installment rounding never changes annual economic tuition.
- `daycare_school_years.tuition_payment_count` is collection-schedule metadata only. It must not change `calculateBudgetModel()`, `tuitionBudget`, occupancy calculations, or actual-income logic.
- Budget remains `children_count × monthly_rate` in every one of the 12 school-year months, including August.
- Actual income continues to come only from actual financial/accounting data.

For תשפ״ז (`SY-2026-2027`), the official monthly rates are INFANT ₪4,185, TODDLER ₪3,102, GRADUATE ₪2,751, and the GANON daycare-specific rate ₪3,102. The corresponding 11-payment installments are ₪4,565, ₪3,384, and ₪3,001.

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
