// Generated from docs/handbook by scripts/generate-management-catalog.mjs. Do not edit manually.
export const SYSTEM_RULES = [
  {
    "id": "BR-0001",
    "title": "Educational School Year",
    "category": "calendar-rules",
    "categoryLabel": "לוחות שנה ותקופות",
    "source": "docs/handbook/calendar-rules.md",
    "details": "Rule: The SY begins on **1 September** and ends on **31 August** of the following year.\n\nNotes: All educational calculations reference the SY."
  },
  {
    "id": "BR-0002",
    "title": "Age Groups",
    "category": "children-rules",
    "categoryLabel": "ילדים ורישום",
    "source": "docs/handbook/children-rules.md",
    "details": "Values: Three AG:\n\n- Infant\n- Toddler\n- Preschool"
  },
  {
    "id": "BR-0003",
    "title": "Infant",
    "category": "children-rules",
    "categoryLabel": "ילדים ורישום",
    "source": "docs/handbook/children-rules.md",
    "details": "Rule: Birth date > 1 June of the year preceding the SY."
  },
  {
    "id": "BR-0004",
    "title": "Toddler",
    "category": "children-rules",
    "categoryLabel": "ילדים ורישום",
    "source": "docs/handbook/children-rules.md",
    "details": "Rule: Birth date:\n\n1 September (SY -2)\n->\n31 May (SY -1)"
  },
  {
    "id": "BR-0005",
    "title": "Preschool",
    "category": "children-rules",
    "categoryLabel": "ילדים ורישום",
    "source": "docs/handbook/children-rules.md",
    "details": "Rule: Birth date:\n\n1 January (SY -2)\n->\n1 September (SY -2)\n\nNotes: Children older than this normally belong to kindergarten."
  },
  {
    "id": "BR-0006",
    "title": "Age Exception",
    "category": "children-rules",
    "categoryLabel": "ילדים ורישום",
    "source": "docs/handbook/children-rules.md",
    "details": "Rule: Children born before the Preschool range may remain in daycare only with special approval."
  },
  {
    "id": "BR-0007",
    "title": "Private Daycare",
    "category": "children-rules",
    "categoryLabel": "ילדים ורישום",
    "source": "docs/handbook/children-rules.md",
    "details": "Rule: Private daycare uses the same age classification rules.\n\nValues: Groups:\n\n- Private Infant\n- Private Toddler\n- Private Preschool"
  },
  {
    "id": "BR-0008",
    "title": "Tuition Categories",
    "category": "tuition-rules",
    "categoryLabel": "שכר לימוד",
    "source": "docs/handbook/tuition-rules.md",
    "details": "Values: Licensed:\n- Extended\n- Basic\n\nPrivate:\n- Infant\n- Toddler\n- Preschool"
  },
  {
    "id": "BR-0009",
    "title": "Legal Entity",
    "category": "tuition-rules",
    "categoryLabel": "שכר לימוד",
    "source": "docs/handbook/tuition-rules.md",
    "details": "Rule: Licensed tuition depends on LE:\n\n- Nonprofit\n- Company\n\nNotes: Private tuition is independent from LE."
  },
  {
    "id": "BR-0010",
    "title": "School Year",
    "category": "tuition-rules",
    "categoryLabel": "שכר לימוד",
    "source": "docs/handbook/tuition-rules.md",
    "details": "Rule: Tuition values are defined per SY.\n\nNotes: Historical values are never overwritten."
  },
  {
    "id": "BR-0011",
    "title": "Licensed Tuition Selection",
    "category": "tuition-rules",
    "categoryLabel": "שכר לימוד",
    "source": "docs/handbook/tuition-rules.md",
    "details": "Rule: Licensed tuition is determined by:\n\n- SY\n- LE\n- Licensing Category\n- AG"
  },
  {
    "id": "BR-0012",
    "title": "Private Tuition Selection",
    "category": "tuition-rules",
    "categoryLabel": "שכר לימוד",
    "source": "docs/handbook/tuition-rules.md",
    "details": "Rule: Private tuition is determined by:\n\n- SY\n- Private AG"
  },
  {
    "id": "BR-0013",
    "title": "Tuition Persistence",
    "category": "tuition-rules",
    "categoryLabel": "שכר לימוד",
    "source": "docs/handbook/tuition-rules.md",
    "details": "Rule: Changing tuition for a new SY must not modify previous SYs.\n\nNotes: Historical tuition remains immutable."
  },
  {
    "id": "BR-0014",
    "title": "Staffing Ratio",
    "category": "staffing-rules",
    "categoryLabel": "תקינה ושעות פעילות",
    "source": "docs/handbook/staffing-rules.md",
    "details": "Rule: Staffing ratio is determined by:\n- LT\n- AG"
  },
  {
    "id": "BR-0015",
    "title": "Staffing Rounding",
    "category": "staffing-rules",
    "categoryLabel": "תקינה ושעות פעילות",
    "source": "docs/handbook/staffing-rules.md",
    "details": "Rule: Round only after calculation.\n\nValues:\n0.01-0.50 -> +0.5\n\n0.51-0.99 -> +1"
  },
  {
    "id": "BR-0016",
    "title": "Area",
    "category": "classroom-rules",
    "categoryLabel": "כיתות ורישוי",
    "source": "docs/handbook/classroom-rules.md",
    "details": "Rule: Area/child depends on AG."
  },
  {
    "id": "BR-0017",
    "title": "Capacity",
    "category": "classroom-rules",
    "categoryLabel": "כיתות ורישוי",
    "source": "docs/handbook/classroom-rules.md",
    "details": "Rule: Max children depends on AG.\n\nNotes: Area cannot override maximum capacity."
  },
  {
    "id": "BR-0018",
    "title": "Area Tolerance",
    "category": "classroom-rules",
    "categoryLabel": "כיתות ורישוי",
    "source": "docs/handbook/classroom-rules.md",
    "details": "Rule: Shortage <1 m2 = Allowed.\n\nNotes: Shortage >=1 m2 = Not Allowed."
  },
  {
    "id": "BR-0019",
    "title": "Mixed Classroom",
    "category": "classroom-rules",
    "categoryLabel": "כיתות ורישוי",
    "source": "docs/handbook/classroom-rules.md",
    "details": "Values: Allowed:\n- Infant + Toddler\n- Toddler + Preschool\n\nNot Allowed:\n- Infant + Preschool"
  },
  {
    "id": "BR-0020",
    "title": "Mixed Area",
    "category": "classroom-rules",
    "categoryLabel": "כיתות ורישוי",
    "source": "docs/handbook/classroom-rules.md",
    "details": "Rule: Calculate each AG separately.\n\nFormula: Total Area = Sum."
  },
  {
    "id": "BR-0021",
    "title": "Mixed Staffing",
    "category": "classroom-rules",
    "categoryLabel": "כיתות ורישוי",
    "source": "docs/handbook/classroom-rules.md",
    "details": "Rule: Calculate each AG separately.\n\nFormula: Sum first. Round once."
  },
  {
    "id": "BR-0022",
    "title": "Operating Hours",
    "category": "staffing-rules",
    "categoryLabel": "תקינה ושעות פעילות",
    "source": "docs/handbook/staffing-rules.md",
    "details": "Rule: Operating hours are defined per SY.\n\nNotes: Historical values remain unchanged."
  },
  {
    "id": "BR-0023",
    "title": "Monthly Licensing Hours",
    "category": "staffing-rules",
    "categoryLabel": "תקינה ושעות פעילות",
    "source": "docs/handbook/staffing-rules.md",
    "details": "Rule: LicensingHours are calculated for each month using:\n- Operating Hours\n- Working Days (Sun-Thu)\n- Fridays\n\nNotes: LicensingHours vary every month."
  },
  {
    "id": "BR-0024",
    "title": "Required Licensing Hours",
    "category": "staffing-rules",
    "categoryLabel": "תקינה ושעות פעילות",
    "source": "docs/handbook/staffing-rules.md",
    "details": "Formula: Required Licensing Hours = LicensingHours x Required Staffing"
  },
  {
    "id": "BR-0025",
    "title": "Daycare Licensing Hours",
    "category": "staffing-rules",
    "categoryLabel": "תקינה ושעות פעילות",
    "source": "docs/handbook/staffing-rules.md",
    "details": "Formula: Total Daycare Licensing Hours = Sum of LicensingHours of all classrooms."
  },
  {
    "id": "BR-0029",
    "title": "Calendar Types",
    "category": "calendar-rules",
    "categoryLabel": "לוחות שנה ותקופות",
    "source": "docs/handbook/calendar-rules.md",
    "details": "Rule: The system supports two calendar types.\n\nValues:\n\n### SY\n\nUsed for:\n\n- Children\n- AG\n- Tuition\n- Staffing\n- Licensing\n- Classrooms\n- Educational Budgeting\n- Ministry regulations\n\nPeriod:\n- 1 September -> 31 August\n\n### CY\n\nUsed for:\n\n- Accounting\n- Bookkeeping\n- Financial Statements\n- Taxes\n- Annual Financial Reports\n\nPeriod:\n- 1 January -> 31 December\n\nNotes: Every module must explicitly use the correct calendar type."
  },
  {
    "id": "BR-0030",
    "title": "Caregiver",
    "category": "roles-rules",
    "categoryLabel": "תפקידי שכר",
    "source": "docs/handbook/roles-rules.md",
    "details": "Rule: Employment:\n- Hourly"
  },
  {
    "id": "BR-0031",
    "title": "Manager",
    "category": "roles-rules",
    "categoryLabel": "תפקידי שכר",
    "source": "docs/handbook/roles-rules.md",
    "details": "Rule: Employment:\n- Salary\n\nRule: HourlyRate is required for payroll calculations only.\n\nValues: Guideline:\n- 1 FTE per daycare with 3 classrooms.\n- <3 classrooms -> proportional reduction.\n- >3 classrooms -> proportional increase."
  },
  {
    "id": "BR-0032",
    "title": "Cook",
    "category": "roles-rules",
    "categoryLabel": "תפקידי שכר",
    "source": "docs/handbook/roles-rules.md",
    "details": "Rule: Employment:\n- Hourly\n\nValues: Guideline:\n- 1 FTE per daycare with 3 classrooms.\n- <3 classrooms -> proportional reduction.\n- >3 classrooms -> proportional increase.\n\nNotes: Applies only when:\n- On-site kitchen."
  },
  {
    "id": "BR-0033",
    "title": "Educational Instructor",
    "category": "roles-rules",
    "categoryLabel": "תפקידי שכר",
    "source": "docs/handbook/roles-rules.md",
    "details": "Rule: Employment:\n- Hourly\n\nValues: Required Guidance:\n- <=3 classrooms -> 4 hrs/month\n- >3 classrooms -> +1 hr/month per additional classroom\n\nNotes: Applies only when:\n- Guidance is not provided by the municipality."
  },
  {
    "id": "BR-0034",
    "title": "Employment Types",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Values:\nHourly\nSalary"
  },
  {
    "id": "BR-0035",
    "title": "Caregiver",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: Employment=Hourly"
  },
  {
    "id": "BR-0036",
    "title": "Cook",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: Employment=Hourly"
  },
  {
    "id": "BR-0037",
    "title": "Educational Instructor",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: Employment=Hourly"
  },
  {
    "id": "BR-0038",
    "title": "Manager",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: Employment=Salary\n\nRule: HourlyRate required for:\n- Leave\n- Sick Leave\n- Absence\n- Payroll\n- Budget"
  },
  {
    "id": "BR-0039",
    "title": "Licensing Hours",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: LicensingHours != EmployeeCount"
  },
  {
    "id": "BR-0040",
    "title": "Budget Headcount",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Formula: Headcount = LicensingHours / 160\n\nNotes: PlanningHours = 160.\n\nNotes: Not Licensing.\n\nNotes: Configurable by SY."
  },
  {
    "id": "BR-0041",
    "title": "Budget Basis",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Budget is calculated per: SY, Daycare, Classroom."
  },
  {
    "id": "BR-0042",
    "title": "Income",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Formula: Income = Children x Tuition.\n\nDepends: Tuition depends on: SY, LE, LT, AG."
  },
  {
    "id": "BR-0043",
    "title": "Staffing Cost",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Formula: Staffing Cost = Budget Headcount x Payroll.\n\nDepends: Headcount uses BR-0040."
  },
  {
    "id": "BR-0044",
    "title": "Fixed Roles",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Budget includes: Manager, Cook, Educational Instructor.\n\nDepends: Rules: BR-0031, BR-0032, BR-0033."
  },
  {
    "id": "BR-0045",
    "title": "Budget Version",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Budget generated per SY.\n\nNotes: Historical budgets remain unchanged."
  },
  {
    "id": "BR-0046",
    "title": "Budget Independence",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Budget calculations never modify: Tuition, Staffing, Payroll, RD.\n\nNotes: Budget uses existing rules only."
  },
  {
    "id": "BR-0047",
    "title": "Daycare Legal Entity",
    "category": "organization-rules",
    "categoryLabel": "מבנה ארגוני",
    "source": "docs/handbook/organization-rules.md",
    "details": "Rule: Each DC belongs to exactly one LE.\n\nNotes:\n- A DC cannot belong to more than one LE at the same time."
  },
  {
    "id": "BR-0048",
    "title": "Administration Overhead",
    "category": "organization-rules",
    "categoryLabel": "מבנה ארגוני",
    "source": "docs/handbook/organization-rules.md",
    "details": "Rule: Every DC must include an Administration Overhead allocation.\n\nRule: Administration Overhead is recorded as:\n- DC Expense.\n- Administration Internal Income.\n\nRule: Administration Overhead is an internal management allocation only.\n\nRule: Administration Overhead must not create or modify accounting records.\n\nRule: Administration Overhead must not create or modify bank transactions.\n\nRule: The system must separately track:\n- Actual Administration Cost.\n- Allocated Administration Overhead.\n\nFormula:\n\nAdministration Variance =\nActual Administration Cost\n-\nAllocated Administration Overhead\n\nNotes:\n- Internal allocations may be included or excluded from management reports.\n- Administration Variance is used to evaluate and improve the allocation method."
  },
  {
    "id": "BR-0049",
    "title": "Administration Allocation Method",
    "category": "organization-rules",
    "categoryLabel": "מבנה ארגוני",
    "source": "docs/handbook/organization-rules.md",
    "details": "Rule: Administration Overhead is allocated to DCs using an Allocation Method.\n\nRule: Allocation Method is configurable per SY.\n\nRule: Changing the Allocation Method for a new SY must not modify historical SY allocations.\n\n## Reference Data\n\nRD-0001 | Administration Allocation Method\n\nSY:\n2026-2027\n\nMethod:\nChildren Count\n\n## Related Decisions\n\n## Open Questions\n\n## Notes"
  },
  {
    "id": "BR-0050",
    "title": "Budget Category",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: A Budget Category is a fixed system entity used to plan and track financial activity.\n\nRule: Each Budget Category must have a stable internal ID.\n\nRule: Budget Category display names should remain consistent over time.\n\nValues:\n- Income\n- Expense\n- Internal Offset\n- Manual / Undefined\n\nNotes:\n- Budget Categories may represent income, expenses, internal offsets, or manually defined items.\n- Internal ID must remain stable even if the display name changes."
  },
  {
    "id": "BR-0051",
    "title": "Budget Category Configuration",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Each Budget Category must define:\n- Type.\n- Budget Calculation Method.\n- Budget Calculation Source.\n- Actual Performance Source.\n- Display Status.\n- Budget Requirement Status.\n- Active Status.\n\nRule: Configuration may vary by SY.\n\nNotes:\n- Budget Category configuration controls how planned budget and actual performance are compared.\n- Configuration changes for a new SY must not modify historical SY calculations."
  },
  {
    "id": "BR-0052",
    "title": "Budget Calculation Method",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Every Budget Category must define how its planned budget is calculated.\n\nRule: Budget Calculation Method may be formula-based, fixed amount, manual, or externally sourced.\n\nRule: Budget Calculation Method must be configurable from data and not hard-coded.\n\nNotes:\n- Calculation methods may change between SYs.\n- A fixed amount is a valid calculation method."
  },
  {
    "id": "BR-0053",
    "title": "Actual Performance Source",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Every Budget Category must define exactly one Actual Performance Source.\n\nRule: Actual Performance Source determines where actual performance is read from.\n\nValues:\n- BANKS\n- PAYROLL\n- CHILDREN\n- SYSTEM\n- MANUAL\n\nNotes:\n- Budget Calculation Source and Actual Performance Source may be different.\n- Actual performance is compared against planned budget."
  },
  {
    "id": "BR-0054",
    "title": "Budget Category Daycare Exception",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: A Budget Category may define DC-specific exceptions.\n\nRule: A DC-specific exception may override:\n- Budget Calculation Method.\n- Budget Calculation Value.\n- Budget Calculation Source.\n- Actual Performance Source.\n- Active Status.\n\nRule: DC-specific exceptions may be valid by SY or date range.\n\nRule: A valid DC-specific exception applies only to the specified DC.\n\nRule: A DC-specific exception must not modify the default Budget Category configuration for other DCs.\n\nNotes:\n- Exceptions are used for operational differences between DCs.\n- Historical calculations must use the exception that was valid at the calculation date."
  },
  {
    "id": "BR-0055",
    "title": "Budget Category Active Status",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Each Budget Category has an Active Status.\n\nValues:\n- Active\n- Inactive\n\nRule: Inactive Budget Categories are not calculated for the relevant SY, period, or DC.\n\nRule: Inactive Budget Categories remain available for historical reporting.\n\nNotes:\n- Inactive means not calculated, not deleted."
  },
  {
    "id": "BR-0056",
    "title": "Annual Budget Allocation",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Budget Categories are planned on an annual basis.\n\nRule: Annual budget may be distributed into monthly values for display and tracking.\n\nRule: Monthly values may vary above or below the average annual distribution.\n\nNotes:\n- Monthly display does not change the annual budget basis."
  },
  {
    "id": "BR-0057",
    "title": "Bank Transaction Split",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: A single bank transaction may be split into multiple budget allocations.\n\nRule: Each split allocation must be assigned to the relevant Budget Category.\n\nRule: Split allocations must preserve traceability to the original bank transaction.\n\nNotes:\n- Splitting is used when one supplier or payment includes multiple budget categories."
  },
  {
    "id": "BR-0058",
    "title": "Technical Bank Transfer",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Technical transfers between bank accounts are not Budget Categories by default.\n\nRule: Technical bank transfers must not affect budget, income, expense, or profitability reporting.\n\nRule: Financially meaningful transfers, such as loans or owner funding, must be classified separately.\n\nNotes:\n- Technical movement of money is not treated as operating activity.\n- Classification determines whether a transfer affects reports."
  },
  {
    "id": "BR-0059",
    "title": "Budget Display Group",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: A Budget Category may belong to a Display Group.\n\nRule: Display Group is optional.\n\nRule: Display Group is used for reporting and presentation only.\n\nNotes:\n- Display Groups allow related Budget Categories to be shown together.\n- Example: Payroll may include Caregiver, Manager, Cook, and Educational Instructor."
  },
  {
    "id": "BR-0060",
    "title": "Dynamic Budget Calculation",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Budget calculations remain dynamic until the relevant period is locked.\n\nRule: Changes to source data update budget calculations while the period is unlocked.\n\nRule: Budget snapshots are created only through an explicit locking action.\n\nNotes:\n- Budget values are not final until locked.\n- Dynamic calculation allows corrections to source data."
  },
  {
    "id": "BR-0061",
    "title": "Budget Locking",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Budget periods are locked only by an explicit administrative action.\n\nRule: Budget periods are not locked automatically by date.\n\nRule: Only the owner/admin may lock or unlock a budget period.\n\nRule: Unlocking a locked period requires a defined unlock action.\n\nNotes:\n- Educational budget may be locked only after specific approval.\n- Annual CY budget may be locked only after specific approval."
  },
  {
    "id": "BR-0062",
    "title": "Locked Period Recalculation",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Source data changes do not automatically update locked budget periods.\n\nRule: A locked period must be unlocked before recalculation.\n\nRule: After recalculation, the period may be locked again.\n\nNotes:\n- Locked periods preserve approved budget results until intentionally reopened."
  },
  {
    "id": "BR-0063",
    "title": "Budget Calculation Library",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Budget Calculation Methods are selected from a predefined Calculation Library.\n\nRule: Budget Categories must use Calculation Methods defined in the Calculation Library.\n\nRule: Free-form formulas are not allowed by default.\n\nRule: Calculation Methods may be managed through configuration data.\n\nNotes:\n- The owner/admin may update Calculation Library configuration.\n- New calculation logic should be added through defined configuration, not ad-hoc formulas."
  },
  {
    "id": "BR-0064",
    "title": "Calculation Transparency",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Every Budget Calculation Method must define:\n- Data Sources.\n- Required Fields.\n- Parameters.\n- Formula Logic.\n- Business Explanation.\n- Technical Explanation.\n\nRule: Budget calculations must be explainable from stored configuration and source data.\n\nNotes:\n- Business Explanation is for management understanding.\n- Technical Explanation is for developers, API consumers, and AI agents.\n- UI presentation of explanations is a design decision."
  },
  {
    "id": "BR-0065",
    "title": "Bank Account Entity",
    "category": "banking-rules",
    "categoryLabel": "בנקאות",
    "source": "docs/handbook/banking-rules.md",
    "details": "Rule: Bank Account is a system entity.\n\nRule: Bank Account is not stored only as free text from imported bank files.\n\nRule: Each Bank Account must belong to exactly one LE.\n\nRule: Each Bank Account currently uses ILS currency only.\n\nNotes:\n- Bank Account may include bank name, account name, branch, account number, currency, LE, and Active Status.\n- Future currencies may be added only through explicit configuration."
  },
  {
    "id": "BR-0066",
    "title": "Bank Import Source Data",
    "category": "banking-rules",
    "categoryLabel": "בנקאות",
    "source": "docs/handbook/banking-rules.md",
    "details": "Rule: Imported bank transactions contain Source Data.\n\nRule: Bank Source Data is read-only.\n\nRule: Users must not modify Bank Source Data.\n\nSource Data:\n- Account\n- Date\n- Transaction Description\n- Reference\n- Debit\n- Credit\n- Amount\n\nNotes:\n- Source Data preserves the original imported bank movement.\n- Users may add system fields and allocation fields separately."
  },
  {
    "id": "BR-0067",
    "title": "Action Type",
    "category": "banking-rules",
    "categoryLabel": "בנקאות",
    "source": "docs/handbook/banking-rules.md",
    "details": "Rule: Bank allocation rows must have an Action Type.\n\nValues:\n- Income\n- Expense\n- Internal\n- Exclude\n- Split\n\nRule: Action Type determines how the row participates in reporting and calculations.\n\nNotes:\n- Former Google Sheets field name: הגדרה.\n- Official system term: סוג פעולה."
  },
  {
    "id": "BR-0068",
    "title": "Action Type Behavior",
    "category": "banking-rules",
    "categoryLabel": "בנקאות",
    "source": "docs/handbook/banking-rules.md",
    "details": "Rule: Income rows may participate in income, budget, profitability, cash-flow, and management reports.\n\nRule: Expense rows may participate in expense, budget, profitability, cash-flow, and management reports.\n\nRule: Internal rows are used for internal allocations or offsets between departments or DCs.\n\nRule: Internal rows may appear in management reports but must not create new external income or expense at consolidated organization level.\n\nRule: Exclude rows are stored for traceability, reconciliation, cash-flow, or operational tracking, but must not participate in budget or profitability calculations.\n\nRule: Split rows represent original source rows that were split into allocation rows.\n\nRule: Split rows must not participate directly in budget or profitability calculations.\n\nNotes:\n- Payroll net bank payments may be marked Exclude when payroll cost is sourced from Payroll data.\n- Technical bank transfers may be marked Exclude unless financially meaningful.\n- Administration overhead may use Internal rows or system-generated internal allocation logic."
  },
  {
    "id": "BR-0069",
    "title": "Bank Allocation Fields",
    "category": "banking-rules",
    "categoryLabel": "בנקאות",
    "source": "docs/handbook/banking-rules.md",
    "details": "Rule: Users may add allocation and workflow fields to bank rows.\n\nCurrent allocation/workflow fields:\n- Action Type\n- Target Department\n- Target DC\n- Budget Category\n- Budget Month\n- Details / Notes\n- Accounting Status\n\nRule: Allocation field definitions must be documented before they are used for database migration.\n\nNotes:\n- Former Google Sheets field mappings:\n  - הגדרה -> Action Type / סוג פעולה\n  - עבור מחלקה -> Target Department / מחלקת יעד\n  - עבור מעון -> Target DC / מעון יעד\n  - פירוט -> Budget Category / סעיף תקציבי\n  - עבור חודש -> Budget Month / חודש תקציבי\n  - הנה\"ח -> Accounting Status / סטטוס הנהלת חשבונות\n  - הערות -> Notes / הערות"
  },
  {
    "id": "BR-0070",
    "title": "Target Department",
    "category": "banking-rules",
    "categoryLabel": "בנקאות",
    "source": "docs/handbook/banking-rules.md",
    "details": "Rule: Each allocated bank row may be assigned to one Target Department.\n\nRule: An allocated bank row must not be assigned to more than one Target Department.\n\nRule: If one bank transaction belongs to multiple departments, it must be split into multiple allocation rows.\n\nNotes:\n- Target Department is the management target of the row.\n- Target Department is separate from Bank Account or ledger grouping."
  },
  {
    "id": "BR-0071",
    "title": "Target Daycare",
    "category": "banking-rules",
    "categoryLabel": "בנקאות",
    "source": "docs/handbook/banking-rules.md",
    "details": "Rule: Target DC is required when Target Department is Daycares.\n\nRule: Target DC identifies the daycare affected by the allocation.\n\nRule: Rows assigned to non-daycare departments may not require Target DC.\n\nNotes:\n- Missing Target DC prevents daycare profitability reporting for that row.\n- Administration allocations may use department-level targeting when no specific DC applies."
  },
  {
    "id": "BR-0072",
    "title": "Budget Month",
    "category": "banking-rules",
    "categoryLabel": "בנקאות",
    "source": "docs/handbook/banking-rules.md",
    "details": "Rule: Budget Month may differ from the bank transaction date.\n\nRule: Bank transaction date determines the CY and cash-flow date.\n\nRule: Budget Month determines the management budget period to which the row belongs.\n\nRule: If one bank transaction belongs to multiple Budget Months, it must be split into multiple allocation rows.\n\nNotes:\n- Budget Month is used for budget and management reporting.\n- Bank Date remains the source date for bank and accounting context."
  },
  {
    "id": "BR-0073",
    "title": "Budget Category Requirement",
    "category": "banking-rules",
    "categoryLabel": "בנקאות",
    "source": "docs/handbook/banking-rules.md",
    "details": "Rule: Income, Expense, and Internal rows require a Budget Category before they can be used in budget or profitability calculations.\n\nRule: Exclude rows do not require a Budget Category.\n\nRule: Split source rows do not require a Budget Category because their split allocation rows carry the budget classification.\n\nNotes:\n- Former Google Sheets field name: פירוט.\n- Official system term: סעיף תקציבי."
  },
  {
    "id": "BR-0074",
    "title": "Bank Split Workflow",
    "category": "banking-rules",
    "categoryLabel": "בנקאות",
    "source": "docs/handbook/banking-rules.md",
    "details": "Rule: A bank transaction may be split into multiple allocation rows.\n\nRule: The original source row remains preserved.\n\nRule: When a row is split, the original source row may be marked with Action Type = Split.\n\nRule: Split allocation rows must reference or preserve traceability to the original source row.\n\nRule: Split allocation rows are the rows used for budget and management calculations.\n\nRule: The sum of split allocation rows must equal the amount of the original source row.\n\nNotes:\n- Split workflow is used when one bank movement belongs to multiple departments, DCs, Budget Categories, or Budget Months."
  },
  {
    "id": "BR-0075",
    "title": "Split Depth",
    "category": "banking-rules",
    "categoryLabel": "בנקאות",
    "source": "docs/handbook/banking-rules.md",
    "details": "Rule: Split allocation rows must not be split again.\n\nRule: Splitting is limited to one level:\n- Original source row.\n- Split allocation rows.\n\nNotes:\n- One-level split keeps allocation workflow simple and auditable."
  },
  {
    "id": "BR-0076",
    "title": "Source Traceability",
    "category": "banking-rules",
    "categoryLabel": "בנקאות",
    "source": "docs/handbook/banking-rules.md",
    "details": "Rule: Imported bank data must preserve source traceability when available.\n\nTraceability may include:\n- Source system.\n- Spreadsheet ID.\n- Tab name.\n- Row index.\n- Raw row data.\n- Import batch ID.\n- Source reference.\n\nRule: Traceability must allow the system to identify where an imported row came from.\n\nNotes:\n- Source traceability supports audit, re-import, duplicate detection, and debugging."
  },
  {
    "id": "BR-0077",
    "title": "Duplicate Detection",
    "category": "banking-rules",
    "categoryLabel": "בנקאות",
    "source": "docs/handbook/banking-rules.md",
    "details": "Rule: Duplicate bank import detection is required for long-term data quality.\n\nRule: Duplicate detection may be implemented after Phase 1.\n\nRule: Until duplicate detection is implemented, imports must preserve enough source traceability to support future duplicate checks.\n\nNotes:\n- Duplicate detection should not rely only on file name.\n- Future detection may use account, date, reference, amount, description, source row, and import batch.\n\n## Reference Data\n\n## Related Decisions\n\n## Open Questions\n\n## Notes"
  },
  {
    "id": "BR-0078",
    "title": "Payroll Source of Truth",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: Payroll is the exclusive Source of Truth for payroll cost.\n\nRule: Bank transactions must not be used for payroll cost calculations.\n\nRule: Payroll data is used for budgeting, profitability, staffing analysis, and payroll reporting.\n\nNotes:\n- Employer Cost is imported from Payroll.\n- Bank data is not part of Payroll calculations."
  },
  {
    "id": "BR-0079",
    "title": "Payroll Record",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: Each Payroll Record represents one Employee, one Month, and one Target Department.\n\nRule: If Target Department is Daycares, Target DC is required.\n\nRule: Payroll Records are monthly snapshots."
  },
  {
    "id": "BR-0080",
    "title": "Payroll Split",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: A Payroll Record may be split into multiple Payroll Allocation Rows.\n\nRule: Payroll splitting is performed by the user.\n\nRule: Split rows represent the operational allocation of payroll cost."
  },
  {
    "id": "BR-0081",
    "title": "Payroll Split Validation",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: The total Employer Cost of all split rows must equal the original Payroll Record.\n\nRule: The total Hours of all split rows must equal the original Payroll Record.\n\nRule: Validation failures generate Data Quality warnings.\n\nRule: Validation failures do not block saving."
  },
  {
    "id": "BR-0082",
    "title": "Payroll Data Sources",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: Employer Cost is imported from the Payroll System.\n\nRule: Attendance information is imported from the Attendance System.\n\nRule: Attendance data supports management analysis.\n\nNotes:\n- Payroll cost always follows Payroll data."
  },
  {
    "id": "BR-0083",
    "title": "Employee Matching",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: Employees are matched across systems using National ID.\n\nRule: Employee Name must not be used as the primary matching key."
  },
  {
    "id": "BR-0084",
    "title": "Employee Validation",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: Payroll Records may exist even if the Employee does not exist in Employees.\n\nRule: Missing Employee generates a Data Quality warning.\n\nRule: Missing Employee does not block import."
  },
  {
    "id": "BR-0085",
    "title": "Payroll Role",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: Each Payroll Allocation Row contains one Role.\n\nRule: Employees may have multiple Roles during the same Month.\n\nRule: Employees may have multiple Payroll Allocation Rows during the same Month."
  },
  {
    "id": "BR-0086",
    "title": "Budget Category Mapping",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: Budget Category is determined automatically from the assigned Role.\n\nRule: Users do not manually select Budget Category for Payroll rows.\n\nRule: Role-to-Budget Category mapping is configuration data."
  },
  {
    "id": "BR-0087",
    "title": "Payroll Allocation Completeness",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: Payroll Allocation Rows require:\n- Target Department\n- Target DC (when applicable)\n- Role\n\nRule: Incomplete Payroll Allocation Rows generate Data Quality warnings.\n\nRule: Incomplete Payroll Allocation Rows are excluded from calculations requiring the missing allocation."
  },
  {
    "id": "BR-0088",
    "title": "Payroll Reporting",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: Budget and profitability calculations use Payroll Allocation Rows.\n\nRule: Original imported Payroll Records are preserved for audit."
  },
  {
    "id": "BR-0089",
    "title": "Payroll Data Quality",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: Payroll validation issues are reported through Data Quality reporting.\n\nRule: Payroll validation issues do not block operational workflow."
  },
  {
    "id": "BR-0090",
    "title": "Payroll Monthly Snapshot",
    "category": "payroll-rules",
    "categoryLabel": "שכר והקצאות שכר",
    "source": "docs/handbook/payroll-rules.md",
    "details": "Rule: Payroll data is imported independently each Month.\n\nRule: Payroll history is preserved through monthly Payroll Records.\n\nRule: Employee status is managed separately from Payroll Records."
  },
  {
    "id": "BR-0091",
    "title": "Employee Source of Truth",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Employees is the Source of Truth for permanent employee information.\n\nRule: Payroll stores monthly records only and does not replace Employees."
  },
  {
    "id": "BR-0092",
    "title": "Employee Identity",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Employee identity is matched across systems using National ID.\n\nRule: Employee Name must not be used as the primary matching key.\n\nNotes:\n- Handling re-employment under the same National ID remains an Open Question."
  },
  {
    "id": "BR-0093",
    "title": "Current Employee State",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Employees stores the current employee state.\n\nCurrent state may include:\n- Employment Status.\n- Target Department.\n- Target DC.\n- Primary Role.\n- Employment Dates.\n- Seniority.\n- Certificates and training status.\n\nRule: Historical changes are stored separately."
  },
  {
    "id": "BR-0094",
    "title": "Primary Employee Assignment",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Each Employee has one current Target Department.\n\nRule: Each Employee has one current Target DC when applicable.\n\nRule: Each Employee has one current Primary Role.\n\nNotes:\n- Monthly work across multiple DCs, departments, or roles is represented in Payroll Allocation Rows."
  },
  {
    "id": "BR-0095",
    "title": "Employee History",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Employee assignment and status changes must remain available as history.\n\nHistory may include:\n- Department changes.\n- DC changes.\n- Role changes.\n- Employment Status changes.\n- Employment termination and return."
  },
  {
    "id": "BR-0096",
    "title": "Certificate Type",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Certificate Types are configuration data.\n\nEach Certificate Type may define:\n- Name.\n- Required Roles.\n- Salary Impact Status.\n- Expiration Requirement.\n- Active Status."
  },
  {
    "id": "BR-0097",
    "title": "Employee Certificate",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Employee Certificates are stored separately from the Employee record.\n\nEach Employee Certificate may include:\n- Certificate Type.\n- Certificate Status.\n- Completion Date.\n- Expiration Date."
  },
  {
    "id": "BR-0098",
    "title": "Certificate Status",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Values:\n- No Certificate.\n- Committed to Study.\n- Studying.\n- Certified.\n\nRule: Certificate Status represents the Employee's current certificate state."
  },
  {
    "id": "BR-0099",
    "title": "Certificate Expiration",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: A Certificate Type may have:\n- No Expiration.\n- Expiration Date Required.\n\nRule: When an expiration date is required, it is entered manually from the source certificate.\n\nRule: Expiration alerts are calculated from the stored expiration date."
  },
  {
    "id": "BR-0100",
    "title": "Role Certificate Requirements",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Certificate requirements may be defined by Role.\n\nCurrent requirements:\n\nCaregiver:\n- Caregiver Certificate.\n- First Aid.\n- Safe Conduct.\n\nManager:\n- Manager Course.\n- First Aid.\n- Safe Conduct.\n\nKitchen:\n- First Aid.\n- Safe Conduct.\n\nOffice:\n- None.\n\nEducational Instructor:\n- Advanced Degree may be recorded but is not currently a critical operational requirement."
  },
  {
    "id": "BR-0101",
    "title": "Internal Training",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Internal Safety and Procedures Training is recorded for Employees.\n\nRule: The system stores the completion date.\n\nRule: The signed source document is stored outside the system.\n\nNotes:\n- Training may be delivered by the DC Manager.\n- Training may be required for new Employees and renewed according to organizational policy."
  },
  {
    "id": "BR-0102",
    "title": "Employee Data Quality",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Missing required Employee data generates Data Quality warnings.\n\nRule: Data Quality warnings do not block operational work.\n\nRule: Employee certificate and training warnings are calculated according to configuration."
  },
  {
    "id": "BR-0103",
    "title": "Employee Seniority",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Employee Seniority is an explicit Employee attribute.\n\nRule: Seniority must not be calculated automatically from Employment Start Date.\n\nRule: Previous recognized Seniority may be granted according to organizational policy.\n\nRule: Employment Start Date and Seniority are independent values.\n\nNotes:\n- Employment Start Date represents the current employment relationship.\n- Seniority may include recognized previous experience.\n- Compensation and benefits that depend on Seniority must use the recorded Seniority value, not Employment Start Date."
  },
  {
    "id": "BR-0104",
    "title": "Compensation Factors",
    "category": "compensation-rules",
    "categoryLabel": "תגמול ושכר",
    "source": "docs/handbook/compensation-rules.md",
    "details": "Rule: Compensation Factors are configuration data.\n\nExamples:\n- Seniority.\n- Certificate.\n- Classroom Responsibility.\n- Scheduling Responsibility.\n- Special Assignment.\n- Future compensation factors."
  },
  {
    "id": "BR-0105",
    "title": "Compensation Value Types",
    "category": "compensation-rules",
    "categoryLabel": "תגמול ושכר",
    "source": "docs/handbook/compensation-rules.md",
    "details": "Values:\n- Hourly.\n- Global Monthly.\n- One-Time.\n\nRule: Hourly is the default compensation type.\n\nRule: Compensation type may change according to the applicable rule or seniority level."
  },
  {
    "id": "BR-0106",
    "title": "Compensation Rule Validity",
    "category": "compensation-rules",
    "categoryLabel": "תגמול ושכר",
    "source": "docs/handbook/compensation-rules.md",
    "details": "Rule: Compensation Rules are defined by SY or effective period.\n\nRule: Changing a Compensation Rule must not overwrite historical values.\n\nRule: A new value must be stored as a new effective configuration."
  },
  {
    "id": "BR-0107",
    "title": "Certificate Compensation",
    "category": "compensation-rules",
    "categoryLabel": "תגמול ושכר",
    "source": "docs/handbook/compensation-rules.md",
    "details": "Rule: Certificate possession and Certificate Status are stored in Employees.\n\nRule: The financial value of a Certificate Status is stored in Compensation Rules.\n\nRule: Not every Certificate affects compensation.\n\nExample:\n- Caregiver Certificate may affect compensation.\n- First Aid does not affect compensation."
  },
  {
    "id": "BR-0108",
    "title": "Compensation Status Value",
    "category": "compensation-rules",
    "categoryLabel": "תגמול ושכר",
    "source": "docs/handbook/compensation-rules.md",
    "details": "Rule: Compensation value may vary by Certificate Status.\n\nExample statuses:\n- Certified.\n- Studying.\n- Committed to Study.\n\nRule: Each applicable status may have a different compensation value."
  },
  {
    "id": "BR-0109",
    "title": "Employee Compensation Eligibility",
    "category": "compensation-rules",
    "categoryLabel": "תגמול ושכר",
    "source": "docs/handbook/compensation-rules.md",
    "details": "Rule: Compensation eligibility is assigned manually by an authorized user.\n\nAuthorized users:\n- Owner/Admin.\n- Authorized office user.\n\nRule: Eligibility is not activated automatically from Employee data.\n\nRule: Eligibility includes a Start Month and may include an End Month."
  },
  {
    "id": "BR-0110",
    "title": "Compensation Accumulation",
    "category": "compensation-rules",
    "categoryLabel": "תגמול ושכר",
    "source": "docs/handbook/compensation-rules.md",
    "details": "Rule: An Employee may receive multiple Compensation Factors simultaneously.\n\nRule: Compensation Factors accumulate unless a future rule explicitly defines otherwise."
  },
  {
    "id": "BR-0111",
    "title": "Hour Basis",
    "category": "compensation-rules",
    "categoryLabel": "תגמול ושכר",
    "source": "docs/handbook/compensation-rules.md",
    "details": "Rule: Hourly Compensation is calculated from Regular Hours by default.\n\nRule: Paid Vacation Hours may be included for specific Employees when manually configured.\n\nNotes:\n- Seniority or other conditions may justify a Global Monthly value instead of an Hourly value."
  },
  {
    "id": "BR-0112",
    "title": "Duplicate Compensation Warning",
    "category": "compensation-rules",
    "categoryLabel": "תגמול ושכר",
    "source": "docs/handbook/compensation-rules.md",
    "details": "Rule: Duplicate active Compensation Factors for the same Employee generate a Data Quality warning.\n\nRule: Duplicate entries do not block saving."
  },
  {
    "id": "BR-0113",
    "title": "Compensation History and Reporting",
    "category": "compensation-rules",
    "categoryLabel": "תגמול ושכר",
    "source": "docs/handbook/compensation-rules.md",
    "details": "Rule: Compensation configuration and Employee eligibility history must be preserved.\n\nRule: The system may calculate and display expected compensation for reporting, calculators, and management review.\n\nRule: The system does not calculate or issue official payroll.\n\nRule: Official Employer Cost remains sourced from Payroll data.\n\n## Reference Data\n\n## Related Decisions\n\n## Open Questions\n\n## Notes"
  },
  {
    "id": "BR-0114",
    "title": "Reporting Workspaces",
    "category": "reporting-rules",
    "categoryLabel": "דיווח ודשבורדים",
    "source": "docs/handbook/reporting-rules.md",
    "details": "Rule: The system provides separate reporting workspaces for:\n- Financial Management.\n- Accounting and Bank Workflow.\n- Employees and Licensing.\n- System Issues.\n\nRule: Each workspace displays its own relevant KPIs, issues, and source data."
  },
  {
    "id": "BR-0115",
    "title": "Default Reporting Scope",
    "category": "reporting-rules",
    "categoryLabel": "דיווח ודשבורדים",
    "source": "docs/handbook/reporting-rules.md",
    "details": "Rule: The default reporting scope is:\n- Entire Organization.\n- From the beginning of the current SY.\n- Through the current date.\n\nRule: Modules that use CY must explicitly use CY instead of SY."
  },
  {
    "id": "BR-0116",
    "title": "Reporting Filters",
    "category": "reporting-rules",
    "categoryLabel": "דיווח ודשבורדים",
    "source": "docs/handbook/reporting-rules.md",
    "details": "Rule: Reports support filtering by applicable dimensions.\n\nFilters may include:\n- Year.\n- One or multiple Months.\n- One or multiple Organizational Units.\n- One or multiple DCs.\n- Budget Category.\n- Action Type.\n- Employee.\n- Bank Account.\n- Accounting Status.\n\nRule: Only relevant filters are displayed for each workspace."
  },
  {
    "id": "BR-0117",
    "title": "Organizational Reporting Hierarchy",
    "category": "reporting-rules",
    "categoryLabel": "דיווח ודשבורדים",
    "source": "docs/handbook/reporting-rules.md",
    "details": "Rule: Reporting follows the configured Organizational Unit hierarchy.\n\nRule: Organization-level reports may be filtered to Organizational Units such as:\n- Daycares.\n- Administration.\n- Development.\n- Future units.\n\nRule: DC filtering applies only when the selected Organizational Unit contains DCs."
  },
  {
    "id": "BR-0118",
    "title": "Dashboard General Status",
    "category": "reporting-rules",
    "categoryLabel": "דיווח ודשבורדים",
    "source": "docs/handbook/reporting-rules.md",
    "details": "Rule: Each Dashboard begins with a General Status.\n\nValues:\n- Green.\n- Yellow.\n- Red.\n- Gray.\n\nRule: Gray represents missing data or inability to calculate.\n\nRule: General Status may be derived from the most severe relevant KPI or issue.\n\nNotes:\n- Detailed issues remain visible below the General Status.\n- Exact severity thresholds are configuration data."
  },
  {
    "id": "BR-0119",
    "title": "KPI Families",
    "category": "reporting-rules",
    "categoryLabel": "דיווח ודשבורדים",
    "source": "docs/handbook/reporting-rules.md",
    "details": "Values:\n- Financial.\n- Quantity.\n- Process.\n- Target Performance.\n\nRule: Every KPI belongs to one KPI Family."
  },
  {
    "id": "BR-0120",
    "title": "Financial and Target KPI Display",
    "category": "reporting-rules",
    "categoryLabel": "דיווח ודשבורדים",
    "source": "docs/handbook/reporting-rules.md",
    "details": "Rule: When a KPI has a defined target or budget, it must display:\n- Budget or Target.\n- Actual.\n- Monetary or quantitative variance.\n- Percentage variance.\n- Status Color.\n\nRule: When no target exists, the KPI displays only the applicable actual value.\n\nRule: Irrelevant KPIs are not displayed."
  },
  {
    "id": "BR-0121",
    "title": "KPI Explanation",
    "category": "reporting-rules",
    "categoryLabel": "דיווח ודשבורדים",
    "source": "docs/handbook/reporting-rules.md",
    "details": "Rule: Every KPI must provide an Explanation view.\n\nThe Explanation must include:\n- Displayed value.\n- Active reporting scope.\n- Data Source.\n- Formula or calculation logic.\n- Business explanation.\n- Reason when calculation is unavailable.\n- Access to filtered Source Rows."
  },
  {
    "id": "BR-0122",
    "title": "Source Rows",
    "category": "reporting-rules",
    "categoryLabel": "דיווח ודשבורדים",
    "source": "docs/handbook/reporting-rules.md",
    "details": "Rule: Source Rows must follow the active report filters.\n\nRule: Source Rows must not include records outside the selected scope.\n\nRule: Source Rows are displayed for review and correction guidance.\n\nRule: Direct navigation to source modules is optional and not required for the first implementation."
  },
  {
    "id": "BR-0123",
    "title": "Unavailable Calculation",
    "category": "reporting-rules",
    "categoryLabel": "דיווח ודשבורדים",
    "source": "docs/handbook/reporting-rules.md",
    "details": "Rule: A KPI must not display zero when it cannot be calculated.\n\nRule: The KPI must display:\n- Cannot Calculate.\n- Gray Status.\n\nRule: The Explanation must identify the missing or invalid source data."
  },
  {
    "id": "BR-0124",
    "title": "Dashboard Issues",
    "category": "reporting-rules",
    "categoryLabel": "דיווח ודשבורדים",
    "source": "docs/handbook/reporting-rules.md",
    "details": "Rule: Each Dashboard displays issues relevant to its own module.\n\nRule: The System Issues workspace aggregates issues from all modules.\n\nRule: Each issue must support access to the relevant filtered records."
  },
  {
    "id": "BR-0125",
    "title": "Reporting Comparisons",
    "category": "reporting-rules",
    "categoryLabel": "דיווח ודשבורדים",
    "source": "docs/handbook/reporting-rules.md",
    "details": "Rule: Period comparisons are not displayed on the primary Dashboards.\n\nRule: Comparisons are provided through a separate comparison view.\n\nComparison dimensions may include:\n- Period to Period.\n- Month to Month.\n- SY to SY.\n- DC to DC.\n- Organizational Unit to Organizational Unit."
  },
  {
    "id": "BR-0126",
    "title": "Reporting Freshness and Refresh",
    "category": "reporting-rules",
    "categoryLabel": "דיווח ודשבורדים",
    "source": "docs/handbook/reporting-rules.md",
    "details": "Rule: Every Dashboard must display when its data was last retrieved or refreshed.\n\nRule: Every Dashboard must provide a Refresh Data action.\n\nRule: Refresh must update the displayed data from the configured Source of Truth.\n\nRule: The refresh timestamp must update only after a successful refresh.\n\nRule: A failed refresh must preserve the last successful data and display an error state.\n\nNotes:\n- Data freshness information is required for management trust.\n- Refresh behavior must not silently replace valid data with incomplete data."
  },
  {
    "id": "BR-0127",
    "title": "Administration Budget Ownership",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Administration Budget Categories belong to Administration.\n\nRule: Administration remains the owner of Administration Budget and Actual values.\n\nRule: Administration Budget Categories may be analyzed by DC without transferring ownership of the expense to the DC.\n\nNotes:\n- Examples include Accounting, Systems, Training, Staff Welfare, and Office expenses."
  },
  {
    "id": "BR-0128",
    "title": "Administration Actual Allocation",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: An actual Administration expense may be allocated between one or more DCs for Administration analysis.\n\nRule: The allocation represents which DCs benefited from or caused the Administration expense.\n\nRule: A full expense may be allocated to one DC when it applies only to that DC.\n\nRule: The sum of allocation rows must equal the original Administration expense.\n\nRule: The original source transaction must remain traceable."
  },
  {
    "id": "BR-0129",
    "title": "Budget and Actual Allocation Independence",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: The Budget Calculation Method determines planned Budget values only.\n\nRule: The Budget Calculation Method does not determine how an actual expense must be allocated.\n\nRule: Actual allocation represents operational reality and may differ from the planned Budget distribution.\n\nNotes:\n- Example: Training Budget may be calculated for all DCs, while an actual training expense may apply only to one DC."
  },
  {
    "id": "BR-0130",
    "title": "Administration Allocation and Overhead Separation",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Administration Actual Allocation and Administration Overhead are separate business processes.\n\nRule: Administration Actual Allocation is used to analyze Administration expenses by DC and Budget Category.\n\nRule: Administration Overhead is an Internal Allocation charged to DCs according to BR-0048 and BR-0049.\n\nRule: Administration Actual Allocation must not create a DC operating expense outside Administration reporting.\n\nRule: DC reporting includes the applicable Overhead category, not the underlying Administration Budget Categories."
  },
  {
    "id": "BR-0131",
    "title": "Administration Budget Comparison by Daycare",
    "category": "budgeting-rules",
    "categoryLabel": "תקציב",
    "source": "docs/handbook/budgeting-rules.md",
    "details": "Rule: Administration reporting may compare Budget and Actual values by:\n- Administration Budget Category.\n- DC.\n- Administration Budget Category and DC.\n\nRule: The comparison displays:\n- Budget.\n- Actual.\n- Monetary Variance.\n- Percentage Variance.\n- Status Color.\n\nRule: Administration Budget Categories are not displayed in a DC operating Dashboard unless explicitly configured otherwise."
  },
  {
    "id": "BR-0132",
    "title": "Accounting Dashboard Purpose",
    "category": "accounting-rules",
    "categoryLabel": "הנהלת חשבונות",
    "source": "docs/handbook/accounting-rules.md",
    "details": "Rule: The Accounting Dashboard provides management visibility into the accounting treatment status of bank transactions.\n\nRule: The Accounting Dashboard is a control and monitoring view only.\n\nRule: The system does not replace the external accounting system."
  },
  {
    "id": "BR-0133",
    "title": "Accounting Tracking Unit",
    "category": "accounting-rules",
    "categoryLabel": "הנהלת חשבונות",
    "source": "docs/handbook/accounting-rules.md",
    "details": "Rule: Accounting Status is tracked per bank transaction or applicable bank allocation row.\n\nRule: Accounting workflow is independent from budget and management allocation completeness.\n\nNotes:\n- A transaction may be valid for Accounting while still missing budget allocation fields."
  },
  {
    "id": "BR-0134",
    "title": "Accounting Status",
    "category": "accounting-rules",
    "categoryLabel": "הנהלת חשבונות",
    "source": "docs/handbook/accounting-rules.md",
    "details": "Values:\n- Pending Submission.\n- Sent to Accounting.\n- Missing Documents.\n- No Supporting Document Required.\n\nRule: Accounting Status is maintained manually by an authorized user.\n\nAuthorized users:\n- Owner/Admin.\n- Authorized office user.\n\nNotes:\n- Former Google Sheets field name: הנה\"ח.\n- No Supporting Document Required applies to valid transactions such as bank fees or internal transfers where no external document exists."
  },
  {
    "id": "BR-0135",
    "title": "Open and Closed Accounting Status",
    "category": "accounting-rules",
    "categoryLabel": "הנהלת חשבונות",
    "source": "docs/handbook/accounting-rules.md",
    "details": "Closed Values:\n- Sent to Accounting.\n- No Supporting Document Required.\n\nOpen Values:\n- Pending Submission.\n- Missing Documents.\n- No Accounting Status.\n\nRule: Missing Documents is not considered submitted or closed."
  },
  {
    "id": "BR-0136",
    "title": "Accounting Completion Date",
    "category": "accounting-rules",
    "categoryLabel": "הנהלת חשבונות",
    "source": "docs/handbook/accounting-rules.md",
    "details": "Rule: A closed Accounting transaction may include a manually entered Completion Date.\n\nRule: Completion Date is not assigned automatically.\n\nRule: Completion Date may be updated by an authorized user."
  },
  {
    "id": "BR-0137",
    "title": "Accounting Status History",
    "category": "accounting-rules",
    "categoryLabel": "הנהלת חשבונות",
    "source": "docs/handbook/accounting-rules.md",
    "details": "Rule: Accounting Status may be changed backward or forward.\n\nRule: Status changes and prior Completion Dates must remain available in history.\n\nRule: Returning a transaction to an open status must not erase its previous accounting history."
  },
  {
    "id": "BR-0138",
    "title": "Accounting Period Scope",
    "category": "accounting-rules",
    "categoryLabel": "הנהלת חשבונות",
    "source": "docs/handbook/accounting-rules.md",
    "details": "Rule: The default Accounting Dashboard scope is:\n- Current CY.\n- From 1 January through the current date.\n- All Bank Accounts.\n- All Organizational Units.\n\nRule: Users may filter by applicable period and dimensions."
  },
  {
    "id": "BR-0139",
    "title": "Accounting Dashboard Metrics",
    "category": "accounting-rules",
    "categoryLabel": "הנהלת חשבונות",
    "source": "docs/handbook/accounting-rules.md",
    "details": "Rule: The Accounting Dashboard may display counts and monetary totals for:\n- Total Transactions.\n- Closed Transactions.\n- Open Transactions.\n- Pending Submission.\n- Sent to Accounting.\n- Missing Documents.\n- No Supporting Document Required.\n- Amount Pending Closure.\n\nRule: Metrics may be grouped by:\n- Bank Account.\n- Organizational Unit.\n- Department.\n- Month.\n- Selected period."
  },
  {
    "id": "BR-0140",
    "title": "Accounting Drill Down",
    "category": "accounting-rules",
    "categoryLabel": "הנהלת חשבונות",
    "source": "docs/handbook/accounting-rules.md",
    "details": "Rule: Accounting KPI values provide access to the filtered transaction list when relevant.\n\nRule: The filtered list must follow the active Accounting Dashboard filters.\n\nRule: Accounting drill-down displays accounting workflow data only.\n\nNotes:\n- Budget and financial management issues belong to their respective Dashboards."
  },
  {
    "id": "BR-0141",
    "title": "Accounting Search and Source List",
    "category": "accounting-rules",
    "categoryLabel": "הנהלת חשבונות",
    "source": "docs/handbook/accounting-rules.md",
    "details": "Rule: Accounting transaction lists support search and filtering by applicable fields.\n\nFields may include:\n- Row Number or stable Transaction ID.\n- Bank Account.\n- Transaction Date.\n- Amount.\n- Organizational Unit or Department.\n- Budget Month.\n- Budget Category.\n- Accounting Status.\n\nRule: The list may be sorted by:\n- Row Number or Transaction ID.\n- Bank Account.\n- Transaction Date.\n- Amount.\n- Department."
  },
  {
    "id": "BR-0142",
    "title": "Accounting and Management Independence",
    "category": "accounting-rules",
    "categoryLabel": "הנהלת חשבונות",
    "source": "docs/handbook/accounting-rules.md",
    "details": "Rule: Accounting Status must not affect:\n- Budget calculations.\n- Profitability calculations.\n- Management allocation.\n- Cash-flow source data.\n- Financial KPI calculations.\n\nRule: Budget or management allocation completeness must not prevent a valid Accounting Status from being assigned.\n\nRule: Each Dashboard displays only the data and issues relevant to its own business purpose.\n\n## Reference Data\n\n## Related Decisions\n\n## Open Questions\n\n## Notes"
  },
  {
    "id": "BR-0143",
    "title": "Staff and Licensing Views",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Staff and Licensing provides three operational views:\n- Staff and Licensing Dashboard.\n- Filtered Employee Card List.\n- Full Employee Record.\n\nRule: Each view serves a different level of management detail."
  },
  {
    "id": "BR-0144",
    "title": "Employee Treatment Status",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Values:\n- Normal.\n- Requires Attention.\n\nRule: An Employee is marked Requires Attention when required employee information is missing or invalid.\n\nCurrent examples:\n- Missing National ID.\n- Missing Salary Information.\n- Missing Weekly Day Off.\n- Missing Seniority.\n- Missing Role.\n- Missing Department or DC assignment.\n- Other required employee fields.\n\nRule: Technical Employee issues are important but are separate from Certificate status.\n\nNotes:\n- Requires Attention is displayed in Orange on the Employee Card.\n- Required Employee fields are configuration data."
  },
  {
    "id": "BR-0145",
    "title": "Independent Certificate Status",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Every required Certificate is evaluated independently.\n\nRule: One valid Certificate must not hide a problem in another Certificate.\n\nRule: Employee Cards display the current status of each primary Certificate separately.\n\nCurrent primary Certificates:\n- Professional / Caregiver Certificate.\n- First Aid.\n- Safe Conduct."
  },
  {
    "id": "BR-0146",
    "title": "Missing Certificate",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: A required Certificate with no valid Certificate Status is displayed in Red.\n\nRule: A missing required Certificate places the Employee in the Licensing Attention list.\n\nRule: Certificate problems and Technical Employee problems are tracked separately."
  },
  {
    "id": "BR-0147",
    "title": "Certificate Expiration Alerts",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Certificate expiration severity is calculated from the stored Expiration Date.\n\nValues:\n- 90 to 61 days remaining -> Orange.\n- 60 to 31 days remaining -> Light Pink.\n- 30 to 1 days remaining -> Light Red.\n- Expired -> Red.\n\nRule: A Certificate enters Requires Attention starting 90 days before expiration.\n\nRule: Color presentation must remain consistent across:\n- Dashboard.\n- Employee Card List.\n- Full Employee Record."
  },
  {
    "id": "BR-0148",
    "title": "Study and Commitment Target Date",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Certificate Status may include:\n- Committed to Study.\n- Studying.\n\nRule: These statuses may include a manually entered Target Completion Date.\n\nRule: When a Target Completion Date exists, the same alert thresholds defined in BR-0147 apply to that date.\n\nRule: When the Target Completion Date has passed and the Certificate is not Certified, the status is Red.\n\nNotes:\n- Target Completion Date is different from Certificate Expiration Date."
  },
  {
    "id": "BR-0149",
    "title": "Employee Summary Card",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: The Employee Summary Card displays:\n- Employee Name.\n- Current DC.\n- Current Role.\n- Employment Status.\n- General Employee Treatment Status.\n- Individual status for each primary Certificate.\n\nRule: The General Employee Treatment Status represents employee-data issues.\n\nRule: Certificate indicators represent licensing status independently.\n\nRule: The Employee Summary Card links to the Full Employee Record."
  },
  {
    "id": "BR-0150",
    "title": "Staff and Licensing Dashboard",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: The Staff and Licensing Dashboard displays the existing Staff and Licensing management metrics.\n\nMetrics may include:\n- Total Employees.\n- Active Employees.\n- Employees Requiring Attention.\n- Missing Professional Certificate.\n- Missing or Invalid First Aid.\n- Missing or Invalid Safe Conduct.\n- Additional existing Staff and Licensing metrics.\n\nRule: Dashboard metrics provide access to the corresponding filtered Employee Card List."
  },
  {
    "id": "BR-0151",
    "title": "Staff Work Lists",
    "category": "employees-rules",
    "categoryLabel": "עובדים",
    "source": "docs/handbook/employees-rules.md",
    "details": "Rule: Staff and Licensing issues are divided into operational work lists.\n\nValues:\n- Licensing Review.\n- Technical Details Review.\n\nLicensing Review may include:\n- Missing Certificate.\n- Expired Certificate.\n- Certificate nearing expiration.\n- Study or commitment target nearing or passing its date.\n\nTechnical Details Review may include:\n- Missing required Employee fields.\n- Invalid Employee assignments.\n- Missing employment or compensation-related information.\n\nRule: An Employee may appear in more than one work list.\n\nRule: The overall Employees Requiring Attention count counts each Employee once.\n\nRule: Each work list provides access to the relevant filtered Employee records.\n\n## Reference Data\n\n## Related Decisions\n\n## Open Questions\n\n## Notes"
  },
  {
    "id": "BR-0152",
    "title": "Manual Import Scope",
    "category": "import-rules",
    "categoryLabel": "ייבוא נתונים",
    "source": "docs/handbook/import-rules.md",
    "details": "Rule: Current imports are manual periodic uploads.\n\nRule: Import automation, queues, and continuous synchronization are not required for the initial implementation.\n\nNotes:\n- Typical usage is a small number of bank, payroll, attendance, or employee files each month."
  },
  {
    "id": "BR-0153",
    "title": "Import Duplicate Review",
    "category": "import-rules",
    "categoryLabel": "ייבוא נתונים",
    "source": "docs/handbook/import-rules.md",
    "details": "Rule: When a possible duplicate import is detected, the system must warn the user and present the detected duplicate for review.\n\nRule: Possible duplicates must not be imported silently.\n\nRule: Duplicate detection must not rely only on the file name."
  },
  {
    "id": "BR-0154",
    "title": "Incremental Import",
    "category": "import-rules",
    "categoryLabel": "ייבוא נתונים",
    "source": "docs/handbook/import-rules.md",
    "details": "Rule: A later import for an existing Month adds only new source records.\n\nRule: Existing valid records must not be deleted or recreated merely because an additional file was imported.\n\nRule: New source records may be added without individual approval."
  },
  {
    "id": "BR-0155",
    "title": "Bank Transaction Match Key",
    "category": "import-rules",
    "categoryLabel": "ייבוא נתונים",
    "source": "docs/handbook/import-rules.md",
    "details": "Rule: A possible matching bank transaction is identified using:\n- Bank Account.\n- Transaction Date.\n- Reference.\n- Amount.\n\nRule: A matching key supports duplicate detection and import comparison.\n\nNotes:\n- A stable internal Transaction ID remains the system identity after import."
  },
  {
    "id": "BR-0156",
    "title": "Source Update and Manual Data Preservation",
    "category": "import-rules",
    "categoryLabel": "ייבוא נתונים",
    "source": "docs/handbook/import-rules.md",
    "details": "Rule: When imported Source Data is updated, existing manual allocation and workflow data must be preserved.\n\nManual data may include:\n- Target Department.\n- Target DC.\n- Budget Month.\n- Budget Category.\n- Accounting Status.\n- Notes.\n\nRule: Source updates must not erase completed user work."
  },
  {
    "id": "BR-0157",
    "title": "Import Row Errors",
    "category": "import-rules",
    "categoryLabel": "ייבוא נתונים",
    "source": "docs/handbook/import-rules.md",
    "details": "Rule: An invalid source row must not prevent valid rows in the same file from being imported.\n\nRule: Invalid rows must be reported clearly after import.\n\nRule: Imported data must not be deleted without a warning and an explicit user action."
  },
  {
    "id": "BR-0158",
    "title": "Import Summary",
    "category": "import-rules",
    "categoryLabel": "ייבוא נתונים",
    "source": "docs/handbook/import-rules.md",
    "details": "Rule: Every import must return a summary.\n\nThe summary may include:\n- File name.\n- Import date and time.\n- New records.\n- Updated records.\n- Possible duplicates.\n- Invalid rows.\n- Records not imported.\n\nRule: Bank, Payroll, Attendance, and Employee imports follow the same general import principles.\n\n## Reference Data\n\n## Related Decisions\n\n## Open Questions\n\n## Notes"
  },
  {
    "id": "BR-0159",
    "title": "Master Data Identity",
    "category": "master-data-rules",
    "categoryLabel": "נתוני יסוד",
    "source": "docs/handbook/master-data-rules.md",
    "details": "Rule: Every Master Data entity has:\n- Stable internal ID.\n- Stable business code.\n- Display name.\n\nRule: Internal ID and business code must not change when the display name changes."
  },
  {
    "id": "BR-0160",
    "title": "Master Data Deletion",
    "category": "master-data-rules",
    "categoryLabel": "נתוני יסוד",
    "source": "docs/handbook/master-data-rules.md",
    "details": "Rule: Master Data that has been used by the system must not be permanently deleted.\n\nValues:\n- Active.\n- Inactive.\n- Archived.\n\nRule: Historical references must remain valid."
  },
  {
    "id": "BR-0161",
    "title": "Display Name Changes",
    "category": "master-data-rules",
    "categoryLabel": "נתוני יסוד",
    "source": "docs/handbook/master-data-rules.md",
    "details": "Rule: Display names may change without changing the entity identity.\n\nRule: Daycare name changes should normally be applied from a new SY without rewriting historical reporting."
  },
  {
    "id": "BR-0162",
    "title": "Business Meaning Change",
    "category": "master-data-rules",
    "categoryLabel": "נתוני יסוד",
    "source": "docs/handbook/master-data-rules.md",
    "details": "Rule: A material change in business meaning requires a new Master Data entity and a new business code.\n\nRule: The previous entity remains available for history and is marked Inactive when no longer used.\n\nExample:\n- Changing a Budget Category from Expense to Internal requires a new Budget Category."
  },
  {
    "id": "BR-0163",
    "title": "Forward-Only Configuration Changes",
    "category": "master-data-rules",
    "categoryLabel": "נתוני יסוד",
    "source": "docs/handbook/master-data-rules.md",
    "details": "Rule: Splitting, replacing, or redefining Master Data applies from the new effective period forward.\n\nRule: Historical records must continue using the entity and definition that applied at that time."
  },
  {
    "id": "BR-0164",
    "title": "Master Data Reactivation",
    "category": "master-data-rules",
    "categoryLabel": "נתוני יסוד",
    "source": "docs/handbook/master-data-rules.md",
    "details": "Rule: An Inactive Master Data entity may be reactivated when the same business entity returns to use.\n\nRule: Reactivation must preserve its original identity and history."
  },
  {
    "id": "BR-0165",
    "title": "Default Master Data Visibility",
    "category": "master-data-rules",
    "categoryLabel": "נתוני יסוד",
    "source": "docs/handbook/master-data-rules.md",
    "details": "Rule: Operational lists display Active records by default.\n\nRule: Inactive and Archived records remain available through separate filters or historical views.\n\nNotes:\n- Employee lists display active Employees by default.\n- Former Employees remain available in a separate list.\n\n## Reference Data\n\n## Related Decisions\n\n## Open Questions\n\n## Notes"
  },
  {
    "id": "BR-0166",
    "title": "Data Quality Severity",
    "category": "data-quality-rules",
    "categoryLabel": "איכות נתונים",
    "source": "docs/handbook/data-quality-rules.md",
    "details": "Rule: Data Quality severity is configuration data.\n\nInitial values:\n- Critical.\n- Warning.\n- Information.\n- OK.\n\nConfiguration may define:\n- Name.\n- Color.\n- Effective From.\n- Effective To.\n- Active Status.\n\nRule: Severity definitions must not be hard-coded unnecessarily."
  },
  {
    "id": "BR-0167",
    "title": "Cannot Calculate",
    "category": "data-quality-rules",
    "categoryLabel": "איכות נתונים",
    "source": "docs/handbook/data-quality-rules.md",
    "details": "Rule: When a required input for a displayed calculation is missing or invalid, the result must display Cannot Calculate.\n\nRule: The system must not display zero as a substitute for an unavailable calculation.\n\nRule: The Explanation must identify:\n- Why calculation is unavailable.\n- Which data is missing or invalid.\n- Where the data should be corrected."
  },
  {
    "id": "BR-0168",
    "title": "Duplicate and Contradiction Warnings",
    "category": "data-quality-rules",
    "categoryLabel": "איכות נתונים",
    "source": "docs/handbook/data-quality-rules.md",
    "details": "Rule: Possible duplicate records generate a warning and do not automatically block saving.\n\nRule: Contradictory data generates a warning.\n\nExample:\n- Employee is Active while Employment End Date has passed.\n\nRule: Context such as different DC, Role, or period must be considered before declaring a true duplicate."
  },
  {
    "id": "BR-0169",
    "title": "Data Quality Issue Status",
    "category": "data-quality-rules",
    "categoryLabel": "איכות נתונים",
    "source": "docs/handbook/data-quality-rules.md",
    "details": "Values:\n- Open.\n- Resolved.\n- Approved Ignore.\n\nRule: There is no In Progress status in the initial implementation.\n\nRule: No Responsible User field is required in the initial implementation."
  },
  {
    "id": "BR-0170",
    "title": "Automatic Re-evaluation",
    "category": "data-quality-rules",
    "categoryLabel": "איכות נתונים",
    "source": "docs/handbook/data-quality-rules.md",
    "details": "Rule: Data Quality issues are generated from current data and configured rules.\n\nRule: After data is corrected and successfully refreshed, the issue must disappear or change according to the current rule result.\n\nRule: Resolved issues are not displayed in the default Issues view."
  },
  {
    "id": "BR-0171",
    "title": "Recurring Issues",
    "category": "data-quality-rules",
    "categoryLabel": "איכות נתונים",
    "source": "docs/handbook/data-quality-rules.md",
    "details": "Rule: If a previously resolved issue occurs again, it is recorded as a new issue event.\n\nRule: Previous issue history remains unchanged."
  },
  {
    "id": "BR-0172",
    "title": "Approved Ignore",
    "category": "data-quality-rules",
    "categoryLabel": "איכות נתונים",
    "source": "docs/handbook/data-quality-rules.md",
    "details": "Rule: Approved Ignore must record:\n- Reason.\n- Approved By.\n- Approval Date.\n- Expiration Date.\n\nRule: Active Approved Ignore items remain visible in a dedicated KPI and list.\n\nRule: After the Expiration Date, the issue is evaluated again according to current data and rules."
  },
  {
    "id": "BR-0173",
    "title": "Issues Dashboard",
    "category": "data-quality-rules",
    "categoryLabel": "איכות נתונים",
    "source": "docs/handbook/data-quality-rules.md",
    "details": "Rule: The Issues Dashboard combines:\n- Severity.\n- Module.\n\nRule: Open issues are displayed by default.\n\nRule: Approved Ignore issues remain available separately.\n\nRule: Each missing or invalid item is displayed as a separate issue.\n\nRule: An entity may appear in multiple issue records while being counted once in applicable entity-level KPIs.\n\n## Reference Data\n\n## Related Decisions\n\n## Open Questions\n\n## Notes"
  },
  {
    "id": "BR-0174",
    "title": "School Year Lifecycle",
    "category": "calendar-rules",
    "categoryLabel": "לוחות שנה ותקופות",
    "source": "docs/handbook/calendar-rules.md",
    "details": "Values:\n- Draft.\n- Active.\n- Locked.\n\nRule: SY Status and Website Visibility are separate attributes.\n\nWebsite Visibility:\n- Displayed.\n- Hidden.\n\nRule: A Hidden SY remains stored in the database."
  },
  {
    "id": "BR-0175",
    "title": "Future School Years",
    "category": "calendar-rules",
    "categoryLabel": "לוחות שנה ותקופות",
    "source": "docs/handbook/calendar-rules.md",
    "details": "Rule: Multiple future SYs may exist in Draft status.\n\nRule: Draft SY data may be prepared without appearing in operational Dashboards.\n\nRule: Only the Owner/Admin may activate an SY."
  },
  {
    "id": "BR-0176",
    "title": "School Year Default Selection",
    "category": "calendar-rules",
    "categoryLabel": "לוחות שנה ותקופות",
    "source": "docs/handbook/calendar-rules.md",
    "details": "Rule: The current educational SY is the default selection for SY-based Dashboards.\n\nRule: The current CY is the default selection for Accounting.\n\nRule: Users must be able to switch years easily through the top filter controls."
  },
  {
    "id": "BR-0177",
    "title": "School Year Copy",
    "category": "calendar-rules",
    "categoryLabel": "לוחות שנה ותקופות",
    "source": "docs/handbook/calendar-rules.md",
    "details": "Rule: Creating a new SY copies applicable SY configuration from the selected previous SY.\n\nCopied configuration may include:\n- DC and Classroom configuration.\n- Tuition.\n- Staffing.\n- Budget Categories and calculation settings.\n- Compensation Rules.\n- Other SY-dependent configuration.\n\nRule: Copied configuration is marked for review before activation."
  },
  {
    "id": "BR-0178",
    "title": "Operational Data Is Not Copied",
    "category": "calendar-rules",
    "categoryLabel": "לוחות שנה ותקופות",
    "source": "docs/handbook/calendar-rules.md",
    "details": "Rule: Operational results from a previous SY are not copied into the new SY.\n\nExamples:\n- Bank transactions.\n- Monthly Payroll records.\n- Actual Budget performance.\n- Accounting workflow status.\n- Historical Data Quality issues.\n\nRule: Permanent entities continue to exist and are not recreated merely because a new SY begins."
  },
  {
    "id": "BR-0179",
    "title": "School Year Review",
    "category": "calendar-rules",
    "categoryLabel": "לוחות שנה ותקופות",
    "source": "docs/handbook/calendar-rules.md",
    "details": "Rule: Copied SY configuration must support review by the Owner/Admin or authorized office user.\n\nRule: Unreviewed required configuration generates a Data Quality warning.\n\nRule: Activation does not silently confirm unchecked configuration."
  },
  {
    "id": "BR-0180",
    "title": "School Year Lock and Reopening",
    "category": "calendar-rules",
    "categoryLabel": "לוחות שנה ותקופות",
    "source": "docs/handbook/calendar-rules.md",
    "details": "Rule: An SY remains editable until it is explicitly locked.\n\nRule: Activating a new SY does not automatically lock the previous SY.\n\nRule: A locked SY may be reopened only through an explicit Owner/Admin action.\n\nNotes:\n- No reopening reason is required in the initial implementation."
  },
  {
    "id": "BR-0181",
    "title": "Historical Employee State",
    "category": "calendar-rules",
    "categoryLabel": "לוחות שנה ותקופות",
    "source": "docs/handbook/calendar-rules.md",
    "details": "Rule: Employees stores the current state.\n\nRule: Changes to Employee Role, Department, DC, status, and other historical attributes must be preserved separately with their effective dates.\n\nRule: Historical data must remain available regardless of the currently selected SY."
  }
];
export const RULE_CATEGORIES = [
  {
    "id": "accounting-rules",
    "label": "הנהלת חשבונות",
    "count": 11
  },
  {
    "id": "banking-rules",
    "label": "בנקאות",
    "count": 13
  },
  {
    "id": "budgeting-rules",
    "label": "תקציב",
    "count": 26
  },
  {
    "id": "calendar-rules",
    "label": "לוחות שנה ותקופות",
    "count": 10
  },
  {
    "id": "children-rules",
    "label": "ילדים ורישום",
    "count": 6
  },
  {
    "id": "classroom-rules",
    "label": "כיתות ורישוי",
    "count": 6
  },
  {
    "id": "compensation-rules",
    "label": "תגמול ושכר",
    "count": 10
  },
  {
    "id": "data-quality-rules",
    "label": "איכות נתונים",
    "count": 8
  },
  {
    "id": "employees-rules",
    "label": "עובדים",
    "count": 22
  },
  {
    "id": "import-rules",
    "label": "ייבוא נתונים",
    "count": 7
  },
  {
    "id": "master-data-rules",
    "label": "נתוני יסוד",
    "count": 7
  },
  {
    "id": "organization-rules",
    "label": "מבנה ארגוני",
    "count": 3
  },
  {
    "id": "payroll-rules",
    "label": "שכר והקצאות שכר",
    "count": 20
  },
  {
    "id": "reporting-rules",
    "label": "דיווח ודשבורדים",
    "count": 13
  },
  {
    "id": "roles-rules",
    "label": "תפקידי שכר",
    "count": 4
  },
  {
    "id": "staffing-rules",
    "label": "תקינה ושעות פעילות",
    "count": 6
  },
  {
    "id": "tuition-rules",
    "label": "שכר לימוד",
    "count": 6
  }
];
