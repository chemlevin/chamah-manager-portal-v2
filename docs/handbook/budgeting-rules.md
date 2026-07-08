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

## Reference Data

None.

## Related Decisions

## Open Questions

## Notes
