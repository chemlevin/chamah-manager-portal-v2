# Organization Rules

## Purpose

## Business Rules

BR-0047 | Daycare Legal Entity

Rule: Each DC belongs to exactly one LE.

Notes:
- A DC cannot belong to more than one LE at the same time.

---

BR-0048 | Administration Overhead

Rule: Every DC must include an Administration Overhead allocation.

Rule: Administration Overhead is recorded as:
- DC Expense.
- Administration Internal Income.

Rule: Administration Overhead is an internal management allocation only.

Rule: Administration Overhead must not create or modify accounting records.

Rule: Administration Overhead must not create or modify bank transactions.

Rule: The system must separately track:
- Actual Administration Cost.
- Allocated Administration Overhead.

Formula:

Administration Variance =
Actual Administration Cost
-
Allocated Administration Overhead

Notes:
- Internal allocations may be included or excluded from management reports.
- Administration Variance is used to evaluate and improve the allocation method.

---

BR-0049 | Administration Allocation Method

Rule: Administration Overhead is allocated to DCs using an Allocation Method.

Rule: Allocation Method is configurable per SY.

Rule: Changing the Allocation Method for a new SY must not modify historical SY allocations.

## Reference Data

RD-0001 | Administration Allocation Method

SY:
2026-2027

Method:
Children Count

## Related Decisions

## Open Questions

## Notes
