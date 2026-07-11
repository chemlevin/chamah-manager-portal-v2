# Accounting Rules

## Purpose

## Business Rules

BR-0132 | Accounting Dashboard Purpose

Rule: The Accounting Dashboard provides management visibility into the accounting treatment status of bank transactions.

Rule: The Accounting Dashboard is a control and monitoring view only.

Rule: The system does not replace the external accounting system.

---

BR-0133 | Accounting Tracking Unit

Rule: Accounting Status is tracked per bank transaction or applicable bank allocation row.

Rule: Accounting workflow is independent from budget and management allocation completeness.

Notes:
- A transaction may be valid for Accounting while still missing budget allocation fields.

---

BR-0134 | Accounting Status

Values:
- Pending Submission.
- Sent to Accounting.
- Missing Documents.
- No Supporting Document Required.

Rule: Accounting Status is maintained manually by an authorized user.

Authorized users:
- Owner/Admin.
- Authorized office user.

Notes:
- Former Google Sheets field name: הנה"ח.
- No Supporting Document Required applies to valid transactions such as bank fees or internal transfers where no external document exists.

---

BR-0135 | Open and Closed Accounting Status

Closed Values:
- Sent to Accounting.
- No Supporting Document Required.

Open Values:
- Pending Submission.
- Missing Documents.
- No Accounting Status.

Rule: Missing Documents is not considered submitted or closed.

---

BR-0136 | Accounting Completion Date

Rule: A closed Accounting transaction may include a manually entered Completion Date.

Rule: Completion Date is not assigned automatically.

Rule: Completion Date may be updated by an authorized user.

---

BR-0137 | Accounting Status History

Rule: Accounting Status may be changed backward or forward.

Rule: Status changes and prior Completion Dates must remain available in history.

Rule: Returning a transaction to an open status must not erase its previous accounting history.

---

BR-0138 | Accounting Period Scope

Rule: The default Accounting Dashboard scope is:
- Current CY.
- From 1 January through the current date.
- All Bank Accounts.
- All Organizational Units.

Rule: Users may filter by applicable period and dimensions.

---

BR-0139 | Accounting Dashboard Metrics

Rule: The Accounting Dashboard may display counts and monetary totals for:
- Total Transactions.
- Closed Transactions.
- Open Transactions.
- Pending Submission.
- Sent to Accounting.
- Missing Documents.
- No Supporting Document Required.
- Amount Pending Closure.

Rule: Metrics may be grouped by:
- Bank Account.
- Organizational Unit.
- Department.
- Month.
- Selected period.

---

BR-0140 | Accounting Drill Down

Rule: Accounting KPI values provide access to the filtered transaction list when relevant.

Rule: The filtered list must follow the active Accounting Dashboard filters.

Rule: Accounting drill-down displays accounting workflow data only.

Notes:
- Budget and financial management issues belong to their respective Dashboards.

---

BR-0141 | Accounting Search and Source List

Rule: Accounting transaction lists support search and filtering by applicable fields.

Fields may include:
- Row Number or stable Transaction ID.
- Bank Account.
- Transaction Date.
- Amount.
- Organizational Unit or Department.
- Budget Month.
- Budget Category.
- Accounting Status.

Rule: The list may be sorted by:
- Row Number or Transaction ID.
- Bank Account.
- Transaction Date.
- Amount.
- Department.

---

BR-0142 | Accounting and Management Independence

Rule: Accounting Status must not affect:
- Budget calculations.
- Profitability calculations.
- Management allocation.
- Cash-flow source data.
- Financial KPI calculations.

Rule: Budget or management allocation completeness must not prevent a valid Accounting Status from being assigned.

Rule: Each Dashboard displays only the data and issues relevant to its own business purpose.

## Reference Data

## Related Decisions

## Open Questions

## Notes
