# Master Data Rules

## Purpose

## Business Rules

BR-0159 | Master Data Identity

Rule: Every Master Data entity has:
- Stable internal ID.
- Stable business code.
- Display name.

Rule: Internal ID and business code must not change when the display name changes.

---

BR-0160 | Master Data Deletion

Rule: Master Data that has been used by the system must not be permanently deleted.

Values:
- Active.
- Inactive.
- Archived.

Rule: Historical references must remain valid.

---

BR-0161 | Display Name Changes

Rule: Display names may change without changing the entity identity.

Rule: Daycare name changes should normally be applied from a new SY without rewriting historical reporting.

---

BR-0162 | Business Meaning Change

Rule: A material change in business meaning requires a new Master Data entity and a new business code.

Rule: The previous entity remains available for history and is marked Inactive when no longer used.

Example:
- Changing a Budget Category from Expense to Internal requires a new Budget Category.

---

BR-0163 | Forward-Only Configuration Changes

Rule: Splitting, replacing, or redefining Master Data applies from the new effective period forward.

Rule: Historical records must continue using the entity and definition that applied at that time.

---

BR-0164 | Master Data Reactivation

Rule: An Inactive Master Data entity may be reactivated when the same business entity returns to use.

Rule: Reactivation must preserve its original identity and history.

---

BR-0165 | Default Master Data Visibility

Rule: Operational lists display Active records by default.

Rule: Inactive and Archived records remain available through separate filters or historical views.

Notes:
- Employee lists display active Employees by default.
- Former Employees remain available in a separate list.

## Reference Data

## Related Decisions

## Open Questions

## Notes
