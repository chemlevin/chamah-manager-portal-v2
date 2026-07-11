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

BR-0059 | Budget Display Group

Rule: A Budget Category may belong to a Display Group.

Rule: Display Group is optional.

Rule: Display Group is used for reporting and presentation only.

Notes:
- Display Groups allow related Budget Categories to be shown together.
- Example: Payroll may include Caregiver, Manager, Cook, and Educational Instructor.

---

BR-0060 | Dynamic Budget Calculation

Rule: Budget calculations remain dynamic until the relevant period is locked.

Rule: Changes to source data update budget calculations while the period is unlocked.

Rule: Budget snapshots are created only through an explicit locking action.

Notes:
- Budget values are not final until locked.
- Dynamic calculation allows corrections to source data.

---

BR-0061 | Budget Locking

Rule: Budget periods are locked only by an explicit administrative action.

Rule: Budget periods are not locked automatically by date.

Rule: Only the owner/admin may lock or unlock a budget period.

Rule: Unlocking a locked period requires a defined unlock action.

Notes:
- Educational budget may be locked only after specific approval.
- Annual CY budget may be locked only after specific approval.

---

BR-0062 | Locked Period Recalculation

Rule: Source data changes do not automatically update locked budget periods.

Rule: A locked period must be unlocked before recalculation.

Rule: After recalculation, the period may be locked again.

Notes:
- Locked periods preserve approved budget results until intentionally reopened.

---

BR-0063 | Budget Calculation Library

Rule: Budget Calculation Methods are selected from a predefined Calculation Library.

Rule: Budget Categories must use Calculation Methods defined in the Calculation Library.

Rule: Free-form formulas are not allowed by default.

Rule: Calculation Methods may be managed through configuration data.

Notes:
- The owner/admin may update Calculation Library configuration.
- New calculation logic should be added through defined configuration, not ad-hoc formulas.

---

BR-0064 | Calculation Transparency

Rule: Every Budget Calculation Method must define:
- Data Sources.
- Required Fields.
- Parameters.
- Formula Logic.
- Business Explanation.
- Technical Explanation.

Rule: Budget calculations must be explainable from stored configuration and source data.

Notes:
- Business Explanation is for management understanding.
- Technical Explanation is for developers, API consumers, and AI agents.
- UI presentation of explanations is a design decision.

---

BR-0127 | Administration Budget Ownership

Rule: Administration Budget Categories belong to Administration.

Rule: Administration remains the owner of Administration Budget and Actual values.

Rule: Administration Budget Categories may be analyzed by DC without transferring ownership of the expense to the DC.

Notes:
- Examples include Accounting, Systems, Training, Staff Welfare, and Office expenses.

---

BR-0128 | Administration Actual Allocation

Rule: An actual Administration expense may be allocated between one or more DCs for Administration analysis.

Rule: The allocation represents which DCs benefited from or caused the Administration expense.

Rule: A full expense may be allocated to one DC when it applies only to that DC.

Rule: The sum of allocation rows must equal the original Administration expense.

Rule: The original source transaction must remain traceable.

---

BR-0129 | Budget and Actual Allocation Independence

Rule: The Budget Calculation Method determines planned Budget values only.

Rule: The Budget Calculation Method does not determine how an actual expense must be allocated.

Rule: Actual allocation represents operational reality and may differ from the planned Budget distribution.

Notes:
- Example: Training Budget may be calculated for all DCs, while an actual training expense may apply only to one DC.

---

BR-0130 | Administration Allocation and Overhead Separation

Rule: Administration Actual Allocation and Administration Overhead are separate business processes.

Rule: Administration Actual Allocation is used to analyze Administration expenses by DC and Budget Category.

Rule: Administration Overhead is an Internal Allocation charged to DCs according to BR-0048 and BR-0049.

Rule: Administration Actual Allocation must not create a DC operating expense outside Administration reporting.

Rule: DC reporting includes the applicable Overhead category, not the underlying Administration Budget Categories.

---

BR-0131 | Administration Budget Comparison by Daycare

Rule: Administration reporting may compare Budget and Actual values by:
- Administration Budget Category.
- DC.
- Administration Budget Category and DC.

Rule: The comparison displays:
- Budget.
- Actual.
- Monetary Variance.
- Percentage Variance.
- Status Color.

Rule: Administration Budget Categories are not displayed in a DC operating Dashboard unless explicitly configured otherwise.

---

## Reference Data

None.

## Related Decisions

## Open Questions

## Notes
