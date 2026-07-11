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

---

BR-0103 | Employee Seniority

Rule: Employee Seniority is an explicit Employee attribute.

Rule: Seniority must not be calculated automatically from Employment Start Date.

Rule: Previous recognized Seniority may be granted according to organizational policy.

Rule: Employment Start Date and Seniority are independent values.

Notes:
- Employment Start Date represents the current employment relationship.
- Seniority may include recognized previous experience.
- Compensation and benefits that depend on Seniority must use the recorded Seniority value, not Employment Start Date.

---

BR-0143 | Staff and Licensing Views

Rule: Staff and Licensing provides three operational views:
- Staff and Licensing Dashboard.
- Filtered Employee Card List.
- Full Employee Record.

Rule: Each view serves a different level of management detail.

---

BR-0144 | Employee Treatment Status

Values:
- Normal.
- Requires Attention.

Rule: An Employee is marked Requires Attention when required employee information is missing or invalid.

Current examples:
- Missing National ID.
- Missing Salary Information.
- Missing Weekly Day Off.
- Missing Seniority.
- Missing Role.
- Missing Department or DC assignment.
- Other required employee fields.

Rule: Technical Employee issues are important but are separate from Certificate status.

Notes:
- Requires Attention is displayed in Orange on the Employee Card.
- Required Employee fields are configuration data.

---

BR-0145 | Independent Certificate Status

Rule: Every required Certificate is evaluated independently.

Rule: One valid Certificate must not hide a problem in another Certificate.

Rule: Employee Cards display the current status of each primary Certificate separately.

Current primary Certificates:
- Professional / Caregiver Certificate.
- First Aid.
- Safe Conduct.

---

BR-0146 | Missing Certificate

Rule: A required Certificate with no valid Certificate Status is displayed in Red.

Rule: A missing required Certificate places the Employee in the Licensing Attention list.

Rule: Certificate problems and Technical Employee problems are tracked separately.

---

BR-0147 | Certificate Expiration Alerts

Rule: Certificate expiration severity is calculated from the stored Expiration Date.

Values:
- 90 to 61 days remaining -> Orange.
- 60 to 31 days remaining -> Light Pink.
- 30 to 1 days remaining -> Light Red.
- Expired -> Red.

Rule: A Certificate enters Requires Attention starting 90 days before expiration.

Rule: Color presentation must remain consistent across:
- Dashboard.
- Employee Card List.
- Full Employee Record.

---

BR-0148 | Study and Commitment Target Date

Rule: Certificate Status may include:
- Committed to Study.
- Studying.

Rule: These statuses may include a manually entered Target Completion Date.

Rule: When a Target Completion Date exists, the same alert thresholds defined in BR-0147 apply to that date.

Rule: When the Target Completion Date has passed and the Certificate is not Certified, the status is Red.

Notes:
- Target Completion Date is different from Certificate Expiration Date.

---

BR-0149 | Employee Summary Card

Rule: The Employee Summary Card displays:
- Employee Name.
- Current DC.
- Current Role.
- Employment Status.
- General Employee Treatment Status.
- Individual status for each primary Certificate.

Rule: The General Employee Treatment Status represents employee-data issues.

Rule: Certificate indicators represent licensing status independently.

Rule: The Employee Summary Card links to the Full Employee Record.

---

BR-0150 | Staff and Licensing Dashboard

Rule: The Staff and Licensing Dashboard displays the existing Staff and Licensing management metrics.

Metrics may include:
- Total Employees.
- Active Employees.
- Employees Requiring Attention.
- Missing Professional Certificate.
- Missing or Invalid First Aid.
- Missing or Invalid Safe Conduct.
- Additional existing Staff and Licensing metrics.

Rule: Dashboard metrics provide access to the corresponding filtered Employee Card List.

---

BR-0151 | Staff Work Lists

Rule: Staff and Licensing issues are divided into operational work lists.

Values:
- Licensing Review.
- Technical Details Review.

Licensing Review may include:
- Missing Certificate.
- Expired Certificate.
- Certificate nearing expiration.
- Study or commitment target nearing or passing its date.

Technical Details Review may include:
- Missing required Employee fields.
- Invalid Employee assignments.
- Missing employment or compensation-related information.

Rule: An Employee may appear in more than one work list.

Rule: The overall Employees Requiring Attention count counts each Employee once.

Rule: Each work list provides access to the relevant filtered Employee records.

## Reference Data

## Related Decisions

## Open Questions

## Notes
