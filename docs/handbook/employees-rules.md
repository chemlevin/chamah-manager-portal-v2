# Employees Rules

## Purpose

## Business Rules

BR-0091 | Employee Source of Truth

Rule: Employees is the Source of Truth for permanent employee information.

Rule: Payroll stores monthly records only and does not replace Employees.

---

BR-0092 | Employee Identity

Rule: Employee identity is matched across systems using National ID.

Rule: Employee Name must not be used as the primary matching key.

Notes:
- Handling re-employment under the same National ID remains an Open Question.

---

BR-0093 | Current Employee State

Rule: Employees stores the current employee state.

Current state may include:
- Employment Status.
- Target Department.
- Target DC.
- Primary Role.
- Employment Dates.
- Seniority.
- Certificates and training status.

Rule: Historical changes are stored separately.

---

BR-0094 | Primary Employee Assignment

Rule: Each Employee has one current Target Department.

Rule: Each Employee has one current Target DC when applicable.

Rule: Each Employee has one current Primary Role.

Notes:
- Monthly work across multiple DCs, departments, or roles is represented in Payroll Allocation Rows.

---

BR-0095 | Employee History

Rule: Employee assignment and status changes must remain available as history.

History may include:
- Department changes.
- DC changes.
- Role changes.
- Employment Status changes.
- Employment termination and return.

---

BR-0096 | Certificate Type

Rule: Certificate Types are configuration data.

Each Certificate Type may define:
- Name.
- Required Roles.
- Salary Impact Status.
- Expiration Requirement.
- Active Status.

---

BR-0097 | Employee Certificate

Rule: Employee Certificates are stored separately from the Employee record.

Each Employee Certificate may include:
- Certificate Type.
- Certificate Status.
- Completion Date.
- Expiration Date.

---

BR-0098 | Certificate Status

Values:
- No Certificate.
- Committed to Study.
- Studying.
- Certified.

Rule: Certificate Status represents the Employee's current certificate state.

---

BR-0099 | Certificate Expiration

Rule: A Certificate Type may have:
- No Expiration.
- Expiration Date Required.

Rule: When an expiration date is required, it is entered manually from the source certificate.

Rule: Expiration alerts are calculated from the stored expiration date.

---

BR-0100 | Role Certificate Requirements

Rule: Certificate requirements may be defined by Role.

Current requirements:

Caregiver:
- Caregiver Certificate.
- First Aid.
- Safe Conduct.

Manager:
- Manager Course.
- First Aid.
- Safe Conduct.

Kitchen:
- First Aid.
- Safe Conduct.

Office:
- None.

Educational Instructor:
- Advanced Degree may be recorded but is not currently a critical operational requirement.

---

BR-0101 | Internal Training

Rule: Internal Safety and Procedures Training is recorded for Employees.

Rule: The system stores the completion date.

Rule: The signed source document is stored outside the system.

Notes:
- Training may be delivered by the DC Manager.
- Training may be required for new Employees and renewed according to organizational policy.

---

BR-0102 | Employee Data Quality

Rule: Missing required Employee data generates Data Quality warnings.

Rule: Data Quality warnings do not block operational work.

Rule: Employee certificate and training warnings are calculated according to configuration.

## Reference Data

## Related Decisions

## Open Questions

## Notes
