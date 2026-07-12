# Google Sheets Mapping

Status: Draft architecture, compact operational model.

Last updated: 2026-07-12

## Purpose

Define the future Google Sheets working surface without mirroring the internal database table count. The default design is one operational spreadsheet with one settings tab and four core data tabs, plus an optional budget-input tab only if manual budget values remain necessary.

## Visible Workbook Structure

| Tab | User purpose | Main database concepts affected |
|---|---|---|
| `הגדרות` | Manage controlled lists and period configuration | Years, legal entities, daycares, classrooms, age groups, roles, certificate types, bank accounts, budget categories, tuition/staffing/compensation rules |
| `ילדים` | Enter monthly child quantities for budget and staffing | Monthly enrollment by month, daycare, classroom, age group |
| `עובדים` | Maintain employee details and employment-related operational fields | Employees, employments, assignments, certificates, seniority, compensation eligibility |
| `שכר` | Import payroll source rows and classify/split them | Payroll records and payroll allocations |
| `בנקים` | Import bank movements and classify/account for them | Bank transactions, bank allocations, accounting workflow |
| `תקציב` | Optional manual inputs and review only | Manual budget inputs; calculated outputs remain read-only |

The target is five visible tabs by default: `הגדרות`, `ילדים`, `עובדים`, `שכר`, `בנקים`. Add `תקציב` only where an approved manual input cannot live in `הגדרות`.

## Hidden / Protected System Areas

These may be hidden tabs or protected ranges and are not daily work surfaces:

- `_LISTS` — database-synchronized dropdown values.
- `_SYNC` — last sync, pending changes, batch status, counts.
- `_ERRORS` — optional consolidated validation review.
- `_META` — spreadsheet IDs, schema version, tab version.

Technical join tables, UUID lists, audit events, and raw database structures must not be exposed as separate user tabs.

## Standard System Columns

Each editable row uses a consistent protected group, preferably at the far right and hidden by default:

| Column | Purpose |
|---|---|
| `database_id` | Stable internal record ID after first accepted sync |
| `business_code` | Stable code where applicable; editable only for a new master-data row |
| `row_version` | Prevent silent overwrite of a newer database record |
| `sync_status` | NEW / PENDING / SYNCED / UPDATED / ERROR / CONFLICT |
| `validation_status` | VALID / WARNING / ERROR |
| `error_details` | Human-readable correction instructions |
| `last_synced_at` | Last accepted synchronization timestamp |

Not every operational source row requires a business code. Imported financial rows use their source identity and database ID.

## Tab Mapping

### `הגדרות`

Use multiple clearly titled table blocks in one tab rather than separate tabs.

Recommended blocks:

1. Years: School Years and Calendar Years.
2. Organization: Legal Entities and Daycares.
3. Classroom setup by School Year.
4. Reference lists: Age Groups, Roles, Certificate Types.
5. Finance references: Bank Accounts and Budget Categories.
6. Rules: Tuition, Staffing, Compensation, selected Budget Rules.

Rules:

- Each block has its own fixed headers and protected system columns.
- New rows create new master/configuration records.
- A material meaning change creates a new row, not a repurposed code.
- Effective-dated rules must include their period fields.

### `ילדים`

Recommended editable columns:

| Column | Input type |
|---|---|
| School Year | Dropdown |
| Month | Dropdown/date-controlled |
| Daycare | Dropdown |
| Classroom | Dependent dropdown filtered by daycare/year/month |
| Age Group | Dropdown constrained by classroom configuration |
| Children Count | Non-negative integer |
| Notes | Optional free text |

Protected/system columns follow the standard pattern.

Unique business grain: month + classroom + age group.

### `עובדים`

One visible row should remain easy to understand even if synchronization writes to several normalized structures.

Recommended user-facing columns include:

- Employee Number.
- National ID.
- Employee Name.
- Birth dates and contact details.
- Employment status.
- Legal Entity.
- Employment start/end dates.
- Daycare.
- Classroom where relevant.
- Role.
- Employment type.
- Hours / work pattern.
- Recognized seniority.
- Salary reference fields approved for manual management.
- Caregiver certificate status/completion.
- First aid expiry.
- Safe conduct expiry.
- Compensation eligibility fields.
- Notes.

When one employee needs multiple simultaneous assignments, the implementation may use a secondary managed section in the same tab or repeated rows with a protected employee ID. Do not create another visible workbook unless actual usage proves necessary.

### `שכר`

Separate protected imported columns from editable allocation columns.

Protected source area:

- Payroll month.
- Employee identifier/name.
- Source department.
- Employer cost.
- Hours and source payroll fields.
- Import batch metadata.

Editable allocation area:

- Target daycare/department.
- Role/category where required.
- Allocated cost.
- Allocated hours.
- Notes.

A single source record may require multiple allocation rows. The Sheet layout may use repeated source identifiers; database identity remains authoritative.

### `בנקים`

Protected source columns:

- Bank account.
- Transaction date.
- Description.
- Reference.
- Debit.
- Credit.
- Source amount.
- Import identity.

Editable columns:

- Action type.
- Target department/daycare.
- Budget category.
- Budget month.
- Accounting status.
- Notes.
- Split allocation amount when required.

The transaction date and Budget Month remain separate.

### `תקציב` (Optional)

Only include values that are genuinely entered manually, such as an approved exceptional amount or explicit override allowed by Handbook rules. Do not copy calculated budget results into editable cells.

## Editable Cell Rules

- Editable cells have one consistent fill style.
- Protected cells are gray or visually distinct and range-protected.
- Dropdowns are used for relationships and statuses.
- Free text is limited to names, notes, descriptions, and explicitly approved fields.
- Formulas entered by users are rejected unless the field explicitly permits formulas.
- Bulk paste is allowed only into editable ranges and every row is validated independently.

## Publish / Sync Experience

The workbook should show:

- Last successful sync.
- Pending changed rows.
- Blocking errors.
- Warnings.
- Accepted inserts and updates.
- Conflicts.

Preferred workflow:

1. User edits marked cells.
2. Sheet performs immediate basic validation.
3. User publishes/synchronizes changes.
4. Sync service revalidates all affected rows.
5. Valid rows commit to database and receive IDs/versions.
6. Invalid rows remain with clear correction messages.
7. Website reads accepted database state.

## Conflict Policy

- Database row version newer than Sheet row version: `CONFLICT`, no silent overwrite.
- Missing required relationship: `ERROR`, no commit.
- Warning-only row: commit is allowed unless a specific Handbook rule says otherwise.
- Clearing a used master-data row does not delete it.
- Source imports never erase manual allocations or workflow fields.

## Final Implementation Requirement

Codex must generate the workbook from this blueprint after database tables and sync contracts are approved. The workbook design is task-oriented, not table-oriented.
