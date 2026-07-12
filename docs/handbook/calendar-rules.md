# Calendar Rules

## Purpose

Define calendar rules used by the system.

## Business Rules

BR-0001 | Educational School Year

Rule: The SY begins on **1 September** and ends on **31 August** of the following year.

Notes: All educational calculations reference the SY.

---

BR-0029 | Calendar Types

Rule: The system supports two calendar types.

Values:

### SY

Used for:

- Children
- AG
- Tuition
- Staffing
- Licensing
- Classrooms
- Educational Budgeting
- Ministry regulations

Period:
- 1 September -> 31 August

### CY

Used for:

- Accounting
- Bookkeeping
- Financial Statements
- Taxes
- Annual Financial Reports

Period:
- 1 January -> 31 December

Notes: Every module must explicitly use the correct calendar type.

---

BR-0174 | School Year Lifecycle

Values:
- Draft.
- Active.
- Locked.

Rule: SY Status and Website Visibility are separate attributes.

Website Visibility:
- Displayed.
- Hidden.

Rule: A Hidden SY remains stored in the database.

---

BR-0175 | Future School Years

Rule: Multiple future SYs may exist in Draft status.

Rule: Draft SY data may be prepared without appearing in operational Dashboards.

Rule: Only the Owner/Admin may activate an SY.

---

BR-0176 | School Year Default Selection

Rule: The current educational SY is the default selection for SY-based Dashboards.

Rule: The current CY is the default selection for Accounting.

Rule: Users must be able to switch years easily through the top filter controls.

---

BR-0177 | School Year Copy

Rule: Creating a new SY copies applicable SY configuration from the selected previous SY.

Copied configuration may include:
- DC and Classroom configuration.
- Tuition.
- Staffing.
- Budget Categories and calculation settings.
- Compensation Rules.
- Other SY-dependent configuration.

Rule: Copied configuration is marked for review before activation.

---

BR-0178 | Operational Data Is Not Copied

Rule: Operational results from a previous SY are not copied into the new SY.

Examples:
- Bank transactions.
- Monthly Payroll records.
- Actual Budget performance.
- Accounting workflow status.
- Historical Data Quality issues.

Rule: Permanent entities continue to exist and are not recreated merely because a new SY begins.

---

BR-0179 | School Year Review

Rule: Copied SY configuration must support review by the Owner/Admin or authorized office user.

Rule: Unreviewed required configuration generates a Data Quality warning.

Rule: Activation does not silently confirm unchecked configuration.

---

BR-0180 | School Year Lock and Reopening

Rule: An SY remains editable until it is explicitly locked.

Rule: Activating a new SY does not automatically lock the previous SY.

Rule: A locked SY may be reopened only through an explicit Owner/Admin action.

Notes:
- No reopening reason is required in the initial implementation.

---

BR-0181 | Historical Employee State

Rule: Employees stores the current state.

Rule: Changes to Employee Role, Department, DC, status, and other historical attributes must be preserved separately with their effective dates.

Rule: Historical data must remain available regardless of the currently selected SY.

---

## Reference Data

None.

## Related Decisions

## Open Questions

None.

## Notes
