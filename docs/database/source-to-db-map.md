# Source To Database Map

Status: planning document only. It maps current repository data flows to candidate future tables.

## Current Source Map

| Current Source | Current Owner | Current Consumer | Candidate DB Tables |
|---|---|---|---|
| BUDGET / `OCCUPANCY` | Google Sheet | `api/budget-engine.js` | `children`, `classrooms`, `daycares`, budget fact/import tables |
| BUDGET / `STAFFING` | Google Sheet | `api/budget-engine.js` | `budget_settings`, possible staffing settings table later |
| BUDGET / `MONTH_HOURS` | Google Sheet | `api/budget-engine.js` | `budget_settings`, possible calendar/operating-hours table later |
| BUDGET / `FIXED_STAFF` | Google Sheet | `api/budget-engine.js` | `budget_settings`, `payroll_records` only if actual payroll |
| BUDGET / `COST_RULES` | Google Sheet | `api/budget-engine.js` | `budget_categories`, `budget_settings`, `budget_exceptions` |
| PAYROLL tab | Google Sheet | `api/payroll-engine.js` | `payroll_records` |
| BANKS tab | Google Sheet | `api/allocations-engine.js`, `accounting/script.js` | `bank_transactions`, `bank_allocations`, `budget_categories`, `organization_units` |
| עובדים tab | Google Sheet | `api/employees.js`, `employees/script.js` | future employees table; Phase 1 requested table list does not include employees |
| `config/organizational-units.js` | Code config | Dashboard/management context | `organization_units`, `daycares` |
| Handbook rules | Docs | Planning/business reference | table comments, validation rules, future rules registry |

## API Endpoint Map

| Endpoint | Current Source | Response Purpose | Future DB Read Candidate |
|---|---|---|---|
| `/api/budget` | BUDGET sheet | Budget model for dashboard | Read-only view over `budget_categories`, `budget_settings`, `budget_exceptions`, `daycares`, `classrooms`, imported budget facts |
| `/api/payroll` | PAYROLL sheet | Payroll grouped by daycare+month | `payroll_records` grouped by daycare+month |
| `/api/allocations` | BANKS sheet | Allocation ledger grouped by unit+business month | `bank_transactions` + `bank_allocations` |
| `/api/employees` | עובדים sheet | Employee rows for employees page/dashboard | future employees/compliance schema, not in requested Phase 1 table list |

## Current Column / Field Mapping

### BUDGET / OCCUPANCY

- Current aliases:
  - daycare: `daycare`, `department`, `branch`, `site`, `מעון`, `מעון חריג`, `מחלקה`, `סניף`, `עבור מחלקה`
  - month: `month`, `חודש`, `עבור חודש`
  - classroom: `classroom`, `class`, `כיתה`, `שם כיתה`, `מספר כיתה`, `חדר`, `כיתה בפועל`
  - AG: `ageGroup`, `age_group`, `age`, `שכבת גיל`, `גיל`, `קבוצת גיל`, `כיתה`
  - children: `children`, `childCount`, `count`, `ילדים`, `מספר ילדים`, `כמות ילדים`
  - ratio: `ratio`, `staffRatio`, `תקינה`, `יחס`, `כמות צוות לילד`
  - tuition: `tuition`, `monthlyTuition`, `שכר לימוד`
- Candidate mapping:
  - daycare -> `daycares.source_name` then `daycares.daycare_id`
  - classroom -> `classrooms.source_name` then `classrooms.classroom_id`
  - AG -> `children.age_group` or future classroom occupancy facts
  - month -> period columns in imported facts/settings

### BUDGET / COST_RULES

- Current aliases:
  - category: `category`, `name`, `סעיף`, `קטגוריה`, `שם`, `סעיף תקציבי`, `הגדרה`, `קטגוריית הוצאה`
  - basis: `basis`, `calculationBasis`, `בסיס חישוב`, `בסיס לחישוב`, `לפי`
  - additionalBasis: `additionalBasis`, `secondaryBasis`, `בסיס נוסף`, `בסיס משני`
  - amount: `amount`, `rate`, `cost`, `עלות`, `סכום`, `תעריף`, `ערך`, `עלות 1`
  - detail: `detail`, `description`, `פירוט`, `תיאור`
  - period: `period`, `תקופה`
  - divisor: `divisor`, `divider`, `מחלק`, `חלוקה`
- Candidate mapping:
  - category -> `budget_categories.display_name`
  - basis/method -> `budget_settings.calculation_method_code`
  - amount/rate -> `budget_settings.calculation_value`
  - daycare-specific rows -> `budget_exceptions`

### PAYROLL

- Current identity aliases:
  - daycare: `daycare`, `department`, `branch`, `site`, `maon`, `מעון`, `מחלקה`, `סניף`, `עבור מחלקה`
  - month: `month`, `payrollMonth`, `salaryMonth`, `חודש`, `חודש שכר`, `עבור חודש`
  - employee: `employee`, `employeeName`, `name`, `worker`, `staff`, `שם עובד`, `עובד`, `עובדת`, `שם`
  - classroom: `classroom`, `class`, `room`, `כיתה`, `שם כיתה`, `חדר`
- Current semantic numeric aliases:
  - hours fields include `hours`, `payrollHours`, `workHours`, `actualHours`, `standardHours`, `שעות`, `שעות עבודה`, `שעות שכר`, `שעות בפועל`
  - cost fields include `salary`, `payroll`, `pay`, `cost`, `amount`, `gross`, `net`, `base pay`, `bonus`, `deductions`, `reimbursement`, `wage`, `שכר`, `עלות`, `סכום`, `ברוטו`, `נטו`, `בסיס`, `בונוס`, `ניכוי`, `ניכויים`, `החזר`, `תשלום`
- Candidate mapping:
  - row -> `payroll_records`
  - daycare -> `daycares`
  - classroom -> `classrooms`
  - month -> `payroll_month`
  - dynamic cost/hour values -> `cost_fields_json`, `hour_fields_json`, and summary numeric columns

### BANKS / Allocations

- Current aliases:
  - reference: `reference`, `asmachta`, `אסמכתא`, `מספר אסמכתא`
  - cashDate: `date`, `cashDate`, `bankDate`, `תאריך`, `תאריך בנק`, `תאריך פעולה`
  - businessMonth: `businessMonth`, `allocationMonth`, `month`, `עבור חודש`, `חודש`, `חודש שיוך`
  - unit: `unit`, `organizationalUnit`, `department`, `daycare`, `עבור מחלקה`, `מחלקה`, `מעון`, `יחידה`
  - debit: `debit`, `moneyOut`, `expense`, `חובה`, `יציאה`, `הוצאה`
  - credit: `credit`, `moneyIn`, `income`, `זכות`, `כניסה`, `הכנסה`
  - definition: `definition`, `category`, `type`, `הגדרה`, `סוג`, `קטגוריה`
  - accountingCategory: `accountingCategory`, `accounting category`, `detail`, `details`, `expenseType`, `expense type`, `פירוט`
  - accountingStatus: `accountingStatus`, `bookkeeping`, `הנה"ח`, `הנהח`, `סטטוס הנהח`, `סטטוס הנה"ח`
  - notes: `notes`, `comment`, `description`, `הערות`, `תיאור`
- Accounting page also uses raw:
  - `חשבון`
  - `תיאור תנועה`
  - `סכום`
- Candidate mapping:
  - cash movement row -> `bank_transactions`
  - allocation row/split -> `bank_allocations`
  - `עבור מחלקה` -> `organization_units`
  - `חשבון` -> account/grouping column on `bank_transactions`
  - `פירוט` -> `budget_categories` or free-text category pending owner decision

### עובדים / Employees

- Current fields include:
  - `מספר עובד`, `תעודת זהות`, `שם עובדת`, `מעון`, `מנהלת ישירה`, `כיתה`, `תפקיד`, `משרה`, `היקף שעות`, `תאריך תחילת עבודה`, `ותק לשכר`, `תעודת מטפלת`, `סיום לימודים`, `שכר בסיס`, `עזרה ראשונה עד`, `התנהלות בטוחה עד`, `סטטוס`, `סוג העסקה`, `מסמכים חסרים`, `הערות`, `עדכון אחרון`
- Candidate mapping:
  - Not in requested Phase 1 table list.
  - If added later, should use `daycares`, `classrooms`, and role/reference tables.

## Traceability Requirements

- Every imported row should preserve:
  - source system: Google Sheets
  - spreadsheet ID
  - tab name
  - row index
  - source reference/date/month when available
  - raw row JSON
  - import batch ID
- This is especially important for:
  - BANKS splits
  - payroll dynamic fields
  - budget COST_RULES exceptions
  - daycare/classroom name matching

