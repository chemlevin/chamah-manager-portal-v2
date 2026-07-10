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

BR-0078 | Payroll Source of Truth

Rule: Payroll is the exclusive Source of Truth for payroll cost.

Rule: Bank transactions must not be used for payroll cost calculations.

Rule: Payroll data is used for budgeting, profitability, staffing analysis, and payroll reporting.

Notes:
- Employer Cost is imported from Payroll.
- Bank data is not part of Payroll calculations.

---

BR-0079 | Payroll Record

Rule: Each Payroll Record represents one Employee, one Month, and one Target Department.

Rule: If Target Department is Daycares, Target DC is required.

Rule: Payroll Records are monthly snapshots.

---

BR-0080 | Payroll Split

Rule: A Payroll Record may be split into multiple Payroll Allocation Rows.

Rule: Payroll splitting is performed by the user.

Rule: Split rows represent the operational allocation of payroll cost.

---

BR-0081 | Payroll Split Validation

Rule: The total Employer Cost of all split rows must equal the original Payroll Record.

Rule: The total Hours of all split rows must equal the original Payroll Record.

Rule: Validation failures generate Data Quality warnings.

Rule: Validation failures do not block saving.

---

BR-0082 | Payroll Data Sources

Rule: Employer Cost is imported from the Payroll System.

Rule: Attendance information is imported from the Attendance System.

Rule: Attendance data supports management analysis.

Notes:
- Payroll cost always follows Payroll data.

---

BR-0083 | Employee Matching

Rule: Employees are matched across systems using National ID.

Rule: Employee Name must not be used as the primary matching key.

---

BR-0084 | Employee Validation

Rule: Payroll Records may exist even if the Employee does not exist in Employees.

Rule: Missing Employee generates a Data Quality warning.

Rule: Missing Employee does not block import.

---

BR-0085 | Payroll Role

Rule: Each Payroll Allocation Row contains one Role.

Rule: Employees may have multiple Roles during the same Month.

Rule: Employees may have multiple Payroll Allocation Rows during the same Month.

---

BR-0086 | Budget Category Mapping

Rule: Budget Category is determined automatically from the assigned Role.

Rule: Users do not manually select Budget Category for Payroll rows.

Rule: Role-to-Budget Category mapping is configuration data.

---

BR-0087 | Payroll Allocation Completeness

Rule: Payroll Allocation Rows require:
- Target Department
- Target DC (when applicable)
- Role

Rule: Incomplete Payroll Allocation Rows generate Data Quality warnings.

Rule: Incomplete Payroll Allocation Rows are excluded from calculations requiring the missing allocation.

---

BR-0088 | Payroll Reporting

Rule: Budget and profitability calculations use Payroll Allocation Rows.

Rule: Original imported Payroll Records are preserved for audit.

---

BR-0089 | Payroll Data Quality

Rule: Payroll validation issues are reported through Data Quality reporting.

Rule: Payroll validation issues do not block operational workflow.

---

BR-0090 | Payroll Monthly Snapshot

Rule: Payroll data is imported independently each Month.

Rule: Payroll history is preserved through monthly Payroll Records.

Rule: Employee status is managed separately from Payroll Records.

---

## Reference Data

PlanningHours=160

## Related Decisions

## Open Questions

## Notes
