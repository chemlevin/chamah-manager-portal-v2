# Google Sheets Workspace Blueprint

Status: Draft architecture.

Last updated: 2026-07-12

## Purpose

Define the future Google Drive and Google Sheets workspace used by the owner and authorized office users to maintain data that is synchronized into the database.

Google Sheets is the operational editing interface. The database is the final system Source of Truth after validation and synchronization.

## Core Workflow

```text
User edits marked Google Sheets cells
  -> Sheet-level validation
  -> Publish / Sync action
  -> server-side validation
  -> accepted changes committed to database
  -> database-backed APIs refresh website data
  -> row status and errors returned to Google Sheets
```

Direct database editing is not part of normal operations.

## Workspace Principles

1. Only clearly marked cells are editable.
2. Dropdowns are used wherever a closed list exists.
3. Free text is allowed only in explicitly documented fields.
4. Database IDs, row versions, audit fields, calculated fields, and sync fields are protected.
5. Adding a new editable row creates a proposed new business record.
6. Changing a display name updates the same record when its stable identity is unchanged.
7. A material meaning change requires a new row and new Business Code.
8. Used records are not deleted; lifecycle fields are updated.
9. Sheet protections improve usability but do not replace import/database validation.
10. Bulk paste is allowed only into editable ranges and is fully revalidated during sync.

## Recommended Google Drive Structure

```text
Chamah Data Workspace/
  00 Control and Instructions/
  01 Foundation and Configuration/
  02 Organization and Daycares/
  03 Children and Monthly Enrollment/
  04 Employees and Licensing/
  05 Payroll Imports/
  06 Banking and Accounting/
  07 Budget and Compensation/
  08 Data Quality and Sync Reports/
  09 Read-Only Reports/
  99 Archive/
```

The final number of spreadsheets is determined during detailed mapping. The preferred rule is one spreadsheet per operational domain, not one spreadsheet per database table and not one giant workbook for the entire system.

## Proposed Spreadsheets

### A. Foundation and Configuration

Suggested file: `Chamah - Foundation & Configuration`

Possible tabs:

- `SCHOOL_YEARS`
- `CALENDAR_YEARS`
- `LEGAL_ENTITY_TYPES`
- `LEGAL_ENTITIES`
- `AGE_GROUPS`
- `ROLES`
- `CERTIFICATE_TYPES`
- `BUDGET_CATEGORIES`
- `ACCOUNTING_STATUSES`
- `ACTION_TYPES`
- protected lookup tabs generated from accepted database values

### B. Organization and Daycares

Suggested file: `Chamah - Organization & Daycares`

Possible tabs:

- `DAYCARES`
- `DAYCARE_SCHOOL_YEARS`
- `CLASSROOMS`
- `CLASSROOM_AGE_GROUPS`
- `BANK_ACCOUNTS`

### C. Children and Monthly Enrollment

Suggested file: `Chamah - Children & Enrollment`

Possible tabs:

- `MONTHLY_ENROLLMENT`
- future `CHILDREN`
- future `ENROLLMENT_PERIODS`
- future `CLASSROOM_PLACEMENTS`

The first implementation may use monthly aggregate enrollment without requiring full individual child migration, provided the approved budget quantity rule remains satisfied.

### D. Employees and Licensing

Suggested file: `Chamah - Employees & Licensing`

Possible tabs:

- `PEOPLE`
- `EMPLOYMENTS`
- `EMPLOYEE_ASSIGNMENTS`
- `EMPLOYEE_CERTIFICATES`
- `INTERNAL_TRAINING`
- `COMPENSATION_ELIGIBILITY`

### E. Payroll

Suggested file: `Chamah - Payroll`

Possible tabs:

- protected/imported `PAYROLL_SOURCE`
- editable `PAYROLL_ALLOCATIONS`
- read-only `PAYROLL_IMPORT_RESULTS`

### F. Banking and Accounting

Suggested file: `Chamah - Banking & Accounting`

Possible tabs:

- protected/imported `BANK_TRANSACTIONS`
- editable `BANK_ALLOCATIONS`
- editable accounting workflow columns or a dedicated `ACCOUNTING_WORKFLOW` tab
- read-only `BANK_IMPORT_RESULTS`

### G. Budget and Compensation

Suggested file: `Chamah - Budget & Compensation`

Possible tabs:

- `TUITION_RULES`
- `STAFFING_RULES`
- `OPERATING_HOURS`
- `CLASSROOM_CAPACITY_RULES`
- `BUDGET_CATEGORY_CONFIG`
- `BUDGET_EXCEPTIONS`
- `BUDGET_ANNUAL_PLAN`
- `BUDGET_MONTHLY_DISTRIBUTION`
- `COMPENSATION_RULES`

### H. Control, Data Quality, and Reports

Suggested file: `Chamah - Control Center`

Possible tabs:

- `SYNC_RUNS`
- `SYNC_ERRORS`
- `DATA_QUALITY_ISSUES`
- `APPROVED_IGNORE`
- `REFERENCE_LIST_STATUS`
- read-only operational reports

## Standard System Columns

Every editable data tab should include protected system columns where applicable:

| Column | Purpose |
|---|---|
| `database_id` | Stable database UUID after first accepted sync |
| `business_code` | Stable business identity for Master Data |
| `row_version` | Optimistic concurrency value |
| `sync_status` | Current row synchronization state |
| `validation_status` | Valid, Warning, or Error |
| `error_details` | Human-readable correction guidance |
| `last_synced_at` | Last successful accepted sync |
| `last_sync_batch_id` | Traceability to sync/import batch |
| `source_row_key` | Stable Sheet-side row identity when needed |

Master Data Business Codes are editable only while creating a new unused record. After first accepted use they are protected.

## Standard Sync Statuses

Recommended technical statuses:

- `NEW`
- `CHANGED`
- `VALID`
- `WARNING`
- `ERROR`
- `POSSIBLE_DUPLICATE`
- `CONFLICT`
- `SYNCED`
- `INACTIVE`

These are synchronization/workflow values, not business lifecycle statuses.

## Error Presentation

Each rejected or warned row must identify:

- the field in error;
- the entered value;
- the applicable rule;
- whether the issue blocks synchronization;
- what the user should correct.

Recommended visual convention:

- light blue: editable input;
- gray: protected/system field;
- green: synchronized and valid;
- yellow: warning, accepted or awaiting review;
- orange: possible duplicate or conflict;
- red: blocking error.

Color is presentation only. Machine-readable status columns control behavior.

## Dropdown Strategy

Dropdowns must use accepted reference data synchronized from the database. A user-facing dropdown should normally display a readable label while the import layer resolves the stable ID or Business Code.

Examples:

- Daycare.
- School Year.
- Calendar Month.
- Age Group.
- Role.
- Legal Entity.
- Certificate Type and Status.
- Budget Category.
- Bank Account.
- Action Type.
- Accounting Status.

Inactive values remain available for existing historical rows but are excluded from new-row selection by default.

## Publish and Sync

The preferred initial workflow is an explicit `Publish Changes` or `Sync` action rather than immediate synchronization of each cell edit.

A sync run must return:

- new records;
- updated records;
- unchanged records;
- accepted warnings;
- possible duplicates;
- conflicts;
- blocking errors;
- records not imported.

Valid rows are not blocked by invalid rows in the same batch.

## Conflict Policy

The database stores the last accepted record and row version. If a Sheet row is based on an older version than the database:

1. The row is marked `CONFLICT`.
2. The database value is not silently overwritten.
3. The user receives a field-level comparison or correction instruction.
4. A deliberate resolution action is required.

## Existing Google Sheets

The current operational spreadsheet remains unchanged during blueprint and implementation preparation. It is used to understand current fields and as a migration source. The new workspace will be created only after the complete database and Sheet mapping are approved.

## Implementation Deliverables for Codex

After blueprint approval, Codex should receive:

- exact spreadsheet/file list;
- exact tab schemas;
- column order;
- editable/protected definitions;
- dropdown sources;
- validation rules;
- sync endpoint contracts;
- import and audit mapping;
- initial seed/reference data;
- permission and protection plan.

This document does not authorize creation of the workspace yet.