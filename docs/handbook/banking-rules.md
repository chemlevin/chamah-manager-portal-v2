# Banking Rules

## Purpose

## Business Rules

BR-0065 | Bank Account Entity

Rule: Bank Account is a system entity.

Rule: Bank Account is not stored only as free text from imported bank files.

Rule: Each Bank Account must belong to exactly one LE.

Rule: Each Bank Account currently uses ILS currency only.

Notes:
- Bank Account may include bank name, account name, branch, account number, currency, LE, and Active Status.
- Future currencies may be added only through explicit configuration.

---

BR-0066 | Bank Import Source Data

Rule: Imported bank transactions contain Source Data.

Rule: Bank Source Data is read-only.

Rule: Users must not modify Bank Source Data.

Source Data:
- Account
- Date
- Transaction Description
- Reference
- Debit
- Credit
- Amount

Notes:
- Source Data preserves the original imported bank movement.
- Users may add system fields and allocation fields separately.

---

BR-0067 | Action Type

Rule: Bank allocation rows must have an Action Type.

Values:
- Income
- Expense
- Internal
- Exclude
- Split

Rule: Action Type determines how the row participates in reporting and calculations.

Notes:
- Former Google Sheets field name: הגדרה.
- Official system term: סוג פעולה.

---

BR-0068 | Action Type Behavior

Rule: Income rows may participate in income, budget, profitability, cash-flow, and management reports.

Rule: Expense rows may participate in expense, budget, profitability, cash-flow, and management reports.

Rule: Internal rows are used for internal allocations or offsets between departments or DCs.

Rule: Internal rows may appear in management reports but must not create new external income or expense at consolidated organization level.

Rule: Exclude rows are stored for traceability, reconciliation, cash-flow, or operational tracking, but must not participate in budget or profitability calculations.

Rule: Split rows represent original source rows that were split into allocation rows.

Rule: Split rows must not participate directly in budget or profitability calculations.

Notes:
- Payroll net bank payments may be marked Exclude when payroll cost is sourced from Payroll data.
- Technical bank transfers may be marked Exclude unless financially meaningful.
- Administration overhead may use Internal rows or system-generated internal allocation logic.

---

BR-0069 | Bank Allocation Fields

Rule: Users may add allocation and workflow fields to bank rows.

Current allocation/workflow fields:
- Action Type
- Target Department
- Target DC
- Budget Category
- Budget Month
- Details / Notes
- Accounting Status

Rule: Allocation field definitions must be documented before they are used for database migration.

Notes:
- Former Google Sheets field mappings:
  - הגדרה -> Action Type / סוג פעולה
  - עבור מחלקה -> Target Department / מחלקת יעד
  - עבור מעון -> Target DC / מעון יעד
  - פירוט -> Budget Category / סעיף תקציבי
  - עבור חודש -> Budget Month / חודש תקציבי
  - הנה"ח -> Accounting Status / סטטוס הנהלת חשבונות
  - הערות -> Notes / הערות

---

BR-0070 | Target Department

Rule: Each allocated bank row may be assigned to one Target Department.

Rule: An allocated bank row must not be assigned to more than one Target Department.

Rule: If one bank transaction belongs to multiple departments, it must be split into multiple allocation rows.

Notes:
- Target Department is the management target of the row.
- Target Department is separate from Bank Account or ledger grouping.

---

BR-0071 | Target Daycare

Rule: Target DC is required when Target Department is Daycares.

Rule: Target DC identifies the daycare affected by the allocation.

Rule: Rows assigned to non-daycare departments may not require Target DC.

Notes:
- Missing Target DC prevents daycare profitability reporting for that row.
- Administration allocations may use department-level targeting when no specific DC applies.

---

BR-0072 | Budget Month

Rule: Budget Month may differ from the bank transaction date.

Rule: Bank transaction date determines the CY and cash-flow date.

Rule: Budget Month determines the management budget period to which the row belongs.

Rule: If one bank transaction belongs to multiple Budget Months, it must be split into multiple allocation rows.

Notes:
- Budget Month is used for budget and management reporting.
- Bank Date remains the source date for bank and accounting context.

---

BR-0073 | Budget Category Requirement

Rule: Income, Expense, and Internal rows require a Budget Category before they can be used in budget or profitability calculations.

Rule: Exclude rows do not require a Budget Category.

Rule: Split source rows do not require a Budget Category because their split allocation rows carry the budget classification.

Notes:
- Former Google Sheets field name: פירוט.
- Official system term: סעיף תקציבי.

---

BR-0074 | Bank Split Workflow

Rule: A bank transaction may be split into multiple allocation rows.

Rule: The original source row remains preserved.

Rule: When a row is split, the original source row may be marked with Action Type = Split.

Rule: Split allocation rows must reference or preserve traceability to the original source row.

Rule: Split allocation rows are the rows used for budget and management calculations.

Rule: The sum of split allocation rows must equal the amount of the original source row.

Notes:
- Split workflow is used when one bank movement belongs to multiple departments, DCs, Budget Categories, or Budget Months.

---

BR-0075 | Split Depth

Rule: Split allocation rows must not be split again.

Rule: Splitting is limited to one level:
- Original source row.
- Split allocation rows.

Notes:
- One-level split keeps allocation workflow simple and auditable.

---

BR-0076 | Source Traceability

Rule: Imported bank data must preserve source traceability when available.

Traceability may include:
- Source system.
- Spreadsheet ID.
- Tab name.
- Row index.
- Raw row data.
- Import batch ID.
- Source reference.

Rule: Traceability must allow the system to identify where an imported row came from.

Notes:
- Source traceability supports audit, re-import, duplicate detection, and debugging.

---

BR-0077 | Duplicate Detection

Rule: Duplicate bank import detection is required for long-term data quality.

Rule: Duplicate detection may be implemented after Phase 1.

Rule: Until duplicate detection is implemented, imports must preserve enough source traceability to support future duplicate checks.

Notes:
- Duplicate detection should not rely only on file name.
- Future detection may use account, date, reference, amount, description, source row, and import batch.

## Reference Data

## Related Decisions

## Open Questions

## Notes
