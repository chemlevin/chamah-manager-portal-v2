# Reporting Rules

## Purpose

## Business Rules

BR-0114 | Reporting Workspaces

Rule: The system provides separate reporting workspaces for:
- Financial Management.
- Accounting and Bank Workflow.
- Employees and Licensing.
- System Issues.

Rule: Each workspace displays its own relevant KPIs, issues, and source data.

---

BR-0115 | Default Reporting Scope

Rule: The default reporting scope is:
- Entire Organization.
- From the beginning of the current SY.
- Through the current date.

Rule: Modules that use CY must explicitly use CY instead of SY.

---

BR-0116 | Reporting Filters

Rule: Reports support filtering by applicable dimensions.

Filters may include:
- Year.
- One or multiple Months.
- One or multiple Organizational Units.
- One or multiple DCs.
- Budget Category.
- Action Type.
- Employee.
- Bank Account.
- Accounting Status.

Rule: Only relevant filters are displayed for each workspace.

---

BR-0117 | Organizational Reporting Hierarchy

Rule: Reporting follows the configured Organizational Unit hierarchy.

Rule: Organization-level reports may be filtered to Organizational Units such as:
- Daycares.
- Administration.
- Development.
- Future units.

Rule: DC filtering applies only when the selected Organizational Unit contains DCs.

---

BR-0118 | Dashboard General Status

Rule: Each Dashboard begins with a General Status.

Values:
- Green.
- Yellow.
- Red.
- Gray.

Rule: Gray represents missing data or inability to calculate.

Rule: General Status may be derived from the most severe relevant KPI or issue.

Notes:
- Detailed issues remain visible below the General Status.
- Exact severity thresholds are configuration data.

---

BR-0119 | KPI Families

Values:
- Financial.
- Quantity.
- Process.
- Target Performance.

Rule: Every KPI belongs to one KPI Family.

---

BR-0120 | Financial and Target KPI Display

Rule: When a KPI has a defined target or budget, it must display:
- Budget or Target.
- Actual.
- Monetary or quantitative variance.
- Percentage variance.
- Status Color.

Rule: When no target exists, the KPI displays only the applicable actual value.

Rule: Irrelevant KPIs are not displayed.

---

BR-0121 | KPI Explanation

Rule: Every KPI must provide an Explanation view.

The Explanation must include:
- Displayed value.
- Active reporting scope.
- Data Source.
- Formula or calculation logic.
- Business explanation.
- Reason when calculation is unavailable.
- Access to filtered Source Rows.

---

BR-0122 | Source Rows

Rule: Source Rows must follow the active report filters.

Rule: Source Rows must not include records outside the selected scope.

Rule: Source Rows are displayed for review and correction guidance.

Rule: Direct navigation to source modules is optional and not required for the first implementation.

---

BR-0123 | Unavailable Calculation

Rule: A KPI must not display zero when it cannot be calculated.

Rule: The KPI must display:
- Cannot Calculate.
- Gray Status.

Rule: The Explanation must identify the missing or invalid source data.

---

BR-0124 | Dashboard Issues

Rule: Each Dashboard displays issues relevant to its own module.

Rule: The System Issues workspace aggregates issues from all modules.

Rule: Each issue must support access to the relevant filtered records.

---

BR-0125 | Reporting Comparisons

Rule: Period comparisons are not displayed on the primary Dashboards.

Rule: Comparisons are provided through a separate comparison view.

Comparison dimensions may include:
- Period to Period.
- Month to Month.
- SY to SY.
- DC to DC.
- Organizational Unit to Organizational Unit.

---

BR-0126 | Reporting Freshness and Refresh

Rule: Every Dashboard must display when its data was last retrieved or refreshed.

Rule: Every Dashboard must provide a Refresh Data action.

Rule: Refresh must update the displayed data from the configured Source of Truth.

Rule: The refresh timestamp must update only after a successful refresh.

Rule: A failed refresh must preserve the last successful data and display an error state.

Notes:
- Data freshness information is required for management trust.
- Refresh behavior must not silently replace valid data with incomplete data.

---

## Reference Data

None.

## Related Decisions

## Open Questions

## Notes
