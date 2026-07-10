# Compensation Rules

## Purpose

## Business Rules

BR-0104 | Compensation Factors

Rule: Compensation Factors are configuration data.

Examples:
- Seniority.
- Certificate.
- Classroom Responsibility.
- Scheduling Responsibility.
- Special Assignment.
- Future compensation factors.

---

BR-0105 | Compensation Value Types

Values:
- Hourly.
- Global Monthly.
- One-Time.

Rule: Hourly is the default compensation type.

Rule: Compensation type may change according to the applicable rule or seniority level.

---

BR-0106 | Compensation Rule Validity

Rule: Compensation Rules are defined by SY or effective period.

Rule: Changing a Compensation Rule must not overwrite historical values.

Rule: A new value must be stored as a new effective configuration.

---

BR-0107 | Certificate Compensation

Rule: Certificate possession and Certificate Status are stored in Employees.

Rule: The financial value of a Certificate Status is stored in Compensation Rules.

Rule: Not every Certificate affects compensation.

Example:
- Caregiver Certificate may affect compensation.
- First Aid does not affect compensation.

---

BR-0108 | Compensation Status Value

Rule: Compensation value may vary by Certificate Status.

Example statuses:
- Certified.
- Studying.
- Committed to Study.

Rule: Each applicable status may have a different compensation value.

---

BR-0109 | Employee Compensation Eligibility

Rule: Compensation eligibility is assigned manually by an authorized user.

Authorized users:
- Owner/Admin.
- Authorized office user.

Rule: Eligibility is not activated automatically from Employee data.

Rule: Eligibility includes a Start Month and may include an End Month.

---

BR-0110 | Compensation Accumulation

Rule: An Employee may receive multiple Compensation Factors simultaneously.

Rule: Compensation Factors accumulate unless a future rule explicitly defines otherwise.

---

BR-0111 | Hour Basis

Rule: Hourly Compensation is calculated from Regular Hours by default.

Rule: Paid Vacation Hours may be included for specific Employees when manually configured.

Notes:
- Seniority or other conditions may justify a Global Monthly value instead of an Hourly value.

---

BR-0112 | Duplicate Compensation Warning

Rule: Duplicate active Compensation Factors for the same Employee generate a Data Quality warning.

Rule: Duplicate entries do not block saving.

---

BR-0113 | Compensation History and Reporting

Rule: Compensation configuration and Employee eligibility history must be preserved.

Rule: The system may calculate and display expected compensation for reporting, calculators, and management review.

Rule: The system does not calculate or issue official payroll.

Rule: Official Employer Cost remains sourced from Payroll data.

## Reference Data

## Related Decisions

## Open Questions

## Notes
