# Payroll Rules

## Purpose

Payroll.

## Business Rules

BR-0034 | Employment Types

Values:
Hourly
Salary

---

BR-0035 | Caregiver

Rule: Employment=Hourly

---

BR-0036 | Cook

Rule: Employment=Hourly

---

BR-0037 | Educational Instructor

Rule: Employment=Hourly

---

BR-0038 | Manager

Rule: Employment=Salary

Rule: HourlyRate required for:
- Leave
- Sick Leave
- Absence
- Payroll
- Budget

---

BR-0039 | Licensing Hours

Rule: LicensingHours != EmployeeCount

---

BR-0040 | Budget Headcount

Formula: Headcount = LicensingHours / 160

Notes: PlanningHours = 160.

Notes: Not Licensing.

Notes: Configurable by SY.

---

## Reference Data

PlanningHours=160

## Related Decisions

## Open Questions

## Notes
