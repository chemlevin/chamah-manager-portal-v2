# Data Quality Rules

## Purpose

## Business Rules

BR-0166 | Data Quality Severity

Rule: Data Quality severity is configuration data.

Initial values:
- Critical.
- Warning.
- Information.
- OK.

Configuration may define:
- Name.
- Color.
- Effective From.
- Effective To.
- Active Status.

Rule: Severity definitions must not be hard-coded unnecessarily.

---

BR-0167 | Cannot Calculate

Rule: When a required input for a displayed calculation is missing or invalid, the result must display Cannot Calculate.

Rule: The system must not display zero as a substitute for an unavailable calculation.

Rule: The Explanation must identify:
- Why calculation is unavailable.
- Which data is missing or invalid.
- Where the data should be corrected.

---

BR-0168 | Duplicate and Contradiction Warnings

Rule: Possible duplicate records generate a warning and do not automatically block saving.

Rule: Contradictory data generates a warning.

Example:
- Employee is Active while Employment End Date has passed.

Rule: Context such as different DC, Role, or period must be considered before declaring a true duplicate.

---

BR-0169 | Data Quality Issue Status

Values:
- Open.
- Resolved.
- Approved Ignore.

Rule: There is no In Progress status in the initial implementation.

Rule: No Responsible User field is required in the initial implementation.

---

BR-0170 | Automatic Re-evaluation

Rule: Data Quality issues are generated from current data and configured rules.

Rule: After data is corrected and successfully refreshed, the issue must disappear or change according to the current rule result.

Rule: Resolved issues are not displayed in the default Issues view.

---

BR-0171 | Recurring Issues

Rule: If a previously resolved issue occurs again, it is recorded as a new issue event.

Rule: Previous issue history remains unchanged.

---

BR-0172 | Approved Ignore

Rule: Approved Ignore must record:
- Reason.
- Approved By.
- Approval Date.
- Expiration Date.

Rule: Active Approved Ignore items remain visible in a dedicated KPI and list.

Rule: After the Expiration Date, the issue is evaluated again according to current data and rules.

---

BR-0173 | Issues Dashboard

Rule: The Issues Dashboard combines:
- Severity.
- Module.

Rule: Open issues are displayed by default.

Rule: Approved Ignore issues remain available separately.

Rule: Each missing or invalid item is displayed as a separate issue.

Rule: An entity may appear in multiple issue records while being counted once in applicable entity-level KPIs.

## Reference Data

## Related Decisions

## Open Questions

## Notes
