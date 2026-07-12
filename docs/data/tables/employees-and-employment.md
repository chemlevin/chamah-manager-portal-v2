# Domain Blueprint — Employees and Employment

Status: Draft architecture for review.

Last updated: 2026-07-12

Related decisions: DBD-0002, DBD-0003, DBD-0006, DBD-0008, DBD-0016, DBD-0021, DBD-0025.

Related Handbook areas: Employees, Roles, Certificates, Compensation, Payroll.

## Purpose

Define a compact employee data model that preserves history without turning the system into a full HR platform.

The operational Google Sheets experience remains one visible `עובדים` tab. Behind that tab, the database separates stable person identity from employment-specific and period-specific facts.

## Core Model

### `employees`

Stable person identity.

Recommended fields:

- `employee_id` UUID primary key.
- `employee_code` stable business code.
- `national_id` unique business identifier when available.
- `display_name`.
- `birth_date` nullable.
- `phone` nullable.
- `email` nullable.
- `lifecycle_status`.
- audit and row-version fields.

The employee record does not own daycare, role, salary, or employment status.

### `employment_periods`

One legal employment relationship for one employee and one Legal Entity over a defined period.

Recommended fields:

- `employment_period_id` UUID primary key.
- `employee_id` FK.
- `legal_entity_id` FK.
- `employment_start_date`.
- `employment_end_date` nullable.
- `employment_status`.
- `employment_type`.
- `recognized_seniority_years` or equivalent approved seniority value.
- `base_hourly_rate` nullable where applicable.
- audit and row-version fields.

A returning employee creates a new Employment Period rather than a new Employee.

Recognized seniority is not derived only from employment start date. Previous approved seniority must be stored explicitly.

### `employee_assignments`

Effective-dated operational assignment inside an Employment Period.

Recommended fields:

- `employee_assignment_id` UUID primary key.
- `employment_period_id` FK.
- `daycare_id` nullable for office/non-daycare assignments.
- `classroom_configuration_id` nullable.
- `role_code` or `role_id` according to final role-list design.
- `effective_from`.
- `effective_to` nullable.
- `is_primary_assignment`.
- weekly-hours or employment-scope fields only where required by approved business rules.
- audit and row-version fields.

Role or daycare changes create new effective-dated assignments and do not overwrite prior history.

### `employee_certificates`

One certificate record per employee and certificate type.

Recommended fields:

- `employee_certificate_id` UUID primary key.
- `employee_id` FK.
- `certificate_type_code` or `certificate_type_id`.
- `certificate_status`.
- `completion_date` nullable.
- `expiration_date` nullable.
- `target_completion_date` nullable.
- `notes` nullable.
- audit and row-version fields.

Certificates belong to the person unless a future Handbook rule explicitly makes one employment-specific.

### `employee_compensation_eligibility`

Manual employee eligibility for approved compensation factors.

Recommended fields:

- `employee_compensation_eligibility_id` UUID primary key.
- `employment_period_id` FK.
- `compensation_rule_code` or `compensation_rule_id`.
- `start_month`.
- `end_month` nullable.
- `approved_value_override` nullable only if allowed by the related rule.
- `notes` nullable.
- audit and row-version fields.

Compensation calculations are management estimates. Official employer cost continues to come from Payroll.

## Simplification Rules

- Do not create separate tables for every employee status value.
- Do not create an HR workflow engine.
- Do not create a separate Person table unless a future non-employee-person requirement appears.
- Do not split contact details into multiple tables.
- Do not create salary-history structures beyond approved employment-period and payroll needs.
- Keep roles and certificate types as controlled reference lists in the Settings tab unless independent lifecycle or configuration requirements justify dedicated tables.

## Historical Rules

- Employee identity remains stable across return-to-work events.
- Employment Periods preserve legal-employment history.
- Assignment history preserves daycare, classroom, and role changes.
- Seniority corrections must be audited and must not silently rewrite historical calculations.
- Inactive or departed employees remain available for historical Payroll, Budget, and compliance reporting.

## Google Sheets Editing Model

Visible tab: `עובדים`.

The visible tab may contain flattened current-state columns for usability, while synchronization writes to multiple database tables.

Suggested editable columns:

- employee code on new row only.
- national ID.
- employee name.
- phone.
- birth date.
- legal entity through dropdown.
- employment start/end date.
- employee status through dropdown.
- employment type through dropdown.
- recognized seniority.
- daycare through dropdown.
- classroom through filtered dropdown where relevant.
- role through dropdown.
- base hourly rate where required.
- certificate statuses and dates.
- notes.

Protected/system columns:

- database IDs.
- row version.
- sync status.
- validation status.
- error details.
- last synchronized timestamp.
- audit fields.

## Validation

Blocking examples:

- duplicate National ID for a different employee.
- missing employee name.
- invalid Legal Entity.
- invalid daycare or role.
- assignment outside the Employment Period.
- overlapping primary assignments where prohibited.
- employment end before start.
- invalid certificate date ordering.

Warning examples:

- missing National ID.
- missing base hourly rate for a role that requires it.
- certificate missing or expiring soon.
- active employment without active assignment.
- seniority value that differs materially from the date-based indication.

## Sync Behavior

- A new visible employee row may create one Employee, one Employment Period, one current Assignment, and certificate rows in one validated sync transaction.
- Updating current daycare or role closes the prior Assignment and creates a new one when the effective date changes.
- Existing history is never deleted because the current Sheet row changed.
- Invalid child records of the flattened row do not silently overwrite accepted database history.

## Open Questions Collected for Final Review

- Exact approved unit and precision for recognized seniority.
- Whether base hourly rate belongs on Employment Period or a separate effective-dated rate record.
- Whether an employee may have more than one active assignment at the same time in normal operation.
- Exact role list and employment-type values for the first implementation.
