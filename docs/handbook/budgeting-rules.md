# Budgeting Rules

## Purpose

Budget calculation rules.

## Business Rules

BR-0041 | Budget Basis

Rule: Budget is calculated per: SY, Daycare, Classroom.

---

BR-0042 | Income

Formula: Income = Children x Tuition.

Depends: Tuition depends on: SY, LE, LT, AG.

---

BR-0043 | Staffing Cost

Formula: Staffing Cost = Budget Headcount x Payroll.

Depends: Headcount uses BR-0040.

---

BR-0044 | Fixed Roles

Rule: Budget includes: Manager, Cook, Educational Instructor.

Depends: Rules: BR-0031, BR-0032, BR-0033.

---

BR-0045 | Budget Version

Rule: Budget generated per SY.

Notes: Historical budgets remain unchanged.

---

BR-0046 | Budget Independence

Rule: Budget calculations never modify: Tuition, Staffing, Payroll, RD.

Notes: Budget uses existing rules only.

---

BR-0050 | Budget Category

Rule: A Budget Category is a fixed system entity used to plan and track financial activity.

Rule: Each Budget Category must have a stable internal ID.

Rule: Budget Category display names should remain consistent over time.

Values:
- Income
- Expense
- Internal Offset
- Manual / Undefined

Notes:
- Budget Categories may represent income, expenses, internal offsets, or manually defined items.
- Internal ID must remain stable even if the display name changes.

---

BR-0051 | Budget Category Configuration

Rule: Each Budget Category must define:
- Type.
- Budget Calculation Method.
- Budget Calculation Source.
- Actual Performance Source.
- Display Status.
- Budget Requirement Status.
- Active Status.

Rule: Configuration may vary by SY.

Notes:
- Budget Category configuration controls how planned budget and actual performance are compared.
- Configuration changes for a new SY must not modify historical SY calculations.

---

BR-0052 | Budget Calculation Method

Rule: Every Budget Category must define how its planned budget is calculated.

Rule: Budget Calculation Method may be formula-based, fixed amount, manual, or externally sourced.

Rule: Budget Calculation Method must be configurable from data and not hard-coded.

Notes:
- Calculation methods may change between SYs.
- A fixed amount is a valid calculation method.

---

BR-0053 | Actual Performance Source

Rule: Every Budget Category must define exactly one Actual Performance Source.

Rule: Actual Performance Source determines where actual performance is read from.

Values:
- BANKS
- PAYROLL
- CHILDREN
- SYSTEM
- MANUAL

Notes:
- Budget Calculation Source and Actual Performance Source may be different.
- Actual performance is compared against planned budget.

---

BR-0054 | Budget Category Daycare Exception

Rule: A Budget Category may define DC-specific exceptions.

Rule: A DC-specific exception may override:
- Budget Calculation Method.
- Budget Calculation Value.
- Budget Calculation Source.
- Actual Performance Source.
- Active Status.

Rule: DC-specific exceptions may be valid by SY or date range.

Rule: A valid DC-specific exception applies only to the specified DC.

Rule: A DC-specific exception must not modify the default Budget Category configuration for other DCs.

Notes:
- Exceptions are used for operational differences between DCs.
- Historical calculations must use the exception that was valid at the calculation date.

---

BR-0055 | Budget Category Active Status

Rule: Each Budget Category has an Active Status.

Values:
- Active
- Inactive

Rule: Inactive Budget Categories are not calculated for the relevant SY, period, or DC.

Rule: Inactive Budget Categories remain available for historical reporting.

Notes:
- Inactive means not calculated, not deleted.

---

BR-0056 | Annual Budget Allocation

Rule: Budget Categories are planned on an annual basis.

Rule: Annual budget may be distributed into monthly values for display and tracking.

Rule: Monthly values may vary above or below the average annual distribution.

Notes:
- Monthly display does not change the annual budget basis.

---

BR-0057 | Bank Transaction Split

Rule: A single bank transaction may be split into multiple budget allocations.

Rule: Each split allocation must be assigned to the relevant Budget Category.

Rule: Split allocations must preserve traceability to the original bank transaction.

Notes:
- Splitting is used when one supplier or payment includes multiple budget categories.

---

BR-0058 | Technical Bank Transfer

Rule: Technical transfers between bank accounts are not Budget Categories by default.

Rule: Technical bank transfers must not affect budget, income, expense, or profitability reporting.

Rule: Financially meaningful transfers, such as loans or owner funding, must be classified separately.

Notes:
- Technical movement of money is not treated as operating activity.
- Classification determines whether a transfer affects reports.

---

## Reference Data

None.

## Related Decisions

## Open Questions

## Notes
