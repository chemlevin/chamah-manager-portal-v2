# Data Dictionary

Status: Draft implementation-ready dictionary.

Last updated: 2026-07-13

## Purpose

This document is the consolidated field-level reference for the approved Database Blueprint. It is intentionally compact and implementation-oriented. Detailed behavior remains in the individual table documents.

## Conventions

- Primary keys use UUID.
- Stable business entities use an immutable business code.
- User-facing names use `display_name`.
- Used business records are not physically deleted.
- Period-dependent facts use School Year, Calendar Year, month, or effective dates according to domain.
- Google Sheets is the editing surface; the database stores accepted validated data.

## Foundation and Time

### `school_years`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `school_year_id` | UUID | Yes | Primary key |
| `school_year_code` | VARCHAR(30) | Yes | Stable unique code, e.g. `SY-2026-2027` |
| `display_name` | VARCHAR(100) | Yes | User-facing name |
| `start_date` | DATE | Yes | Normally 1 September |
| `end_date` | DATE | Yes | Normally 31 August |
| `status` | VARCHAR(20) | Yes | DRAFT / ACTIVE / LOCKED |
| `is_selectable` | BOOLEAN | Yes | Available in dashboard selection |
| `website_visibility` | VARCHAR(20) | Yes | DISPLAYED / HIDDEN |
| `configuration_review_status` | VARCHAR(20) | Yes | NOT_REVIEWED / REVIEWED |
| `copied_from_school_year_id` | UUID | No | Self-reference for copied configuration |
| audit fields | standard | Yes/No | created/updated timestamps and users |

### `calendar_years`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `calendar_year_id` | UUID | Yes | Primary key |
| `calendar_year_code` | VARCHAR(20) | Yes | Stable unique code, e.g. `CY-2026` |
| `year_number` | SMALLINT | Yes | Unique year number |
| `display_name` | VARCHAR(50) | Yes | User-facing year |
| `start_date` | DATE | Yes | 1 January |
| `end_date` | DATE | Yes | 31 December |
| `status` | VARCHAR(20) | Yes | FUTURE / OPEN / CLOSED |
| `is_selectable` | BOOLEAN | Yes | Available in filters |
| `display_order` | INTEGER | Yes | UI ordering |
| audit fields | standard | Yes/No | opened/closed and created/updated metadata |

## Organization

### `legal_entities`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `legal_entity_id` | UUID | Yes | Primary key |
| `legal_entity_code` | VARCHAR(50) | Yes | Stable unique code |
| `display_name` | VARCHAR(150) | Yes | User-facing name |
| `legal_name` | VARCHAR(250) | Yes | Registered name |
| `entity_type_code` | VARCHAR(30) | Yes | NONPROFIT / COMPANY / future values |
| `registration_number` | VARCHAR(50) | Yes | Association/company registration number |
| `lifecycle_status` | VARCHAR(20) | Yes | ACTIVE / INACTIVE / ARCHIVED |
| audit fields | standard | Yes/No | row version included |

### `daycares`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `daycare_id` | UUID | Yes | Primary key |
| `daycare_code` | VARCHAR(50) | Yes | Stable unique code |
| `display_name` | VARCHAR(150) | Yes | User-facing name |
| `license_number` | VARCHAR(100) | No | One daycare represents one license |
| `legal_entity_id` | UUID | Yes | Current legal entity assignment |
| `address_text` | VARCHAR(500) | No | Simple operational address |
| `opened_on` | DATE | No | Opening date when known |
| `closed_on` | DATE | No | Closure date when applicable |
| `lifecycle_status` | VARCHAR(20) | Yes | ACTIVE / INACTIVE / ARCHIVED |
| `display_order` | INTEGER | Yes | UI ordering |
| audit fields | standard | Yes/No | row version included |

### `daycare_school_years`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `daycare_school_year_id` | UUID | Yes | Primary key |
| `daycare_id` | UUID | Yes | FK to Daycare |
| `school_year_id` | UUID | Yes | FK to School Year |
| `is_operating` | BOOLEAN | Yes | Whether active in this School Year |
| `notes` | TEXT | No | Free-text operational note |
| audit fields | standard | Yes/No | Unique `(daycare_id, school_year_id)` |

### `classrooms`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `classroom_id` | UUID | Yes | Primary key |
| `daycare_school_year_id` | UUID | Yes | FK to annual daycare operation |
| `classroom_code` | VARCHAR(50) | Yes | Stable within the School-Year scope |
| `display_name` | VARCHAR(100) | Yes | User-facing class name |
| `is_mixed` | BOOLEAN | Yes | Mixed age classroom flag |
| `effective_from` | DATE | Yes | Opening/effective date |
| `effective_to` | DATE | No | Closing date |
| `lifecycle_status` | VARCHAR(20) | Yes | ACTIVE / INACTIVE |
| audit fields | standard | Yes/No | No assumption of identity across School Years |

### `age_groups`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `age_group_id` | UUID | Yes | Primary key |
| `age_group_code` | VARCHAR(30) | Yes | Stable code |
| `display_name` | VARCHAR(100) | Yes | User-facing label |
| `display_order` | INTEGER | Yes | UI ordering |
| `lifecycle_status` | VARCHAR(20) | Yes | ACTIVE / INACTIVE |

### `monthly_enrollment`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `monthly_enrollment_id` | UUID | Yes | Primary key |
| `classroom_id` | UUID | Yes | FK to Classroom |
| `reporting_month` | DATE | Yes | First day of month |
| `age_group_id` | UUID | Yes | FK to Age Group |
| `children_count` | INTEGER | Yes | Budget child quantity |
| `notes` | TEXT | No | Optional note |
| audit fields | standard | Yes/No | Unique `(classroom_id, reporting_month, age_group_id)` |

## Employees

### `employees`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `employee_id` | UUID | Yes | Primary key |
| `employee_code` | VARCHAR(50) | Yes | Stable unique business code |
| `national_id` | VARCHAR(30) | No | Unique when present |
| `first_name` | VARCHAR(100) | Yes | Person identity |
| `last_name` | VARCHAR(100) | Yes | Person identity |
| `phone` | VARCHAR(30) | No | Contact |
| `email` | VARCHAR(254) | No | Contact |
| `lifecycle_status` | VARCHAR(20) | Yes | ACTIVE / INACTIVE / ARCHIVED |
| audit fields | standard | Yes/No | row version included |

### `employments`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `employment_id` | UUID | Yes | Primary key |
| `employee_id` | UUID | Yes | FK to Employee |
| `legal_entity_id` | UUID | Yes | Employer |
| `employment_start_date` | DATE | Yes | Contractual start |
| `employment_end_date` | DATE | No | End date |
| `recognized_prior_seniority_months` | INTEGER | Yes | Explicit prior seniority; not inferred only from start date |
| `employment_status` | VARCHAR(20) | Yes | ACTIVE / ENDED / SUSPENDED as finalized by implementation |
| audit fields | standard | Yes/No | Multiple periods allowed |

### `employee_assignments`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `assignment_id` | UUID | Yes | Primary key |
| `employment_id` | UUID | Yes | FK to Employment |
| `daycare_id` | UUID | No | Nullable for office/non-daycare work |
| `role_code` | VARCHAR(50) | Yes | Controlled role code |
| `effective_from` | DATE | Yes | Assignment start |
| `effective_to` | DATE | No | Assignment end |
| `is_primary` | BOOLEAN | Yes | Primary assignment flag |
| audit fields | standard | Yes/No | Supports changes without overwriting history |

### `employee_certificates`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `employee_certificate_id` | UUID | Yes | Primary key |
| `employee_id` | UUID | Yes | FK to Employee |
| `certificate_type_code` | VARCHAR(50) | Yes | Controlled list |
| `issued_on` | DATE | No | Issue date |
| `expires_on` | DATE | No | Expiry date |
| `status` | VARCHAR(20) | Yes | VALID / EXPIRED / MISSING / REVIEW as finalized |
| `notes` | TEXT | No | Optional free text |
| audit fields | standard | Yes/No | Employee-level credential |

## Payroll

### `payroll_records`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `payroll_record_id` | UUID | Yes | Primary key |
| `employment_id` | UUID | Yes | FK to Employment |
| `payroll_month` | DATE | Yes | First day of month |
| `source_employee_identifier` | VARCHAR(100) | No | Original payroll system identifier |
| `gross_pay` | NUMERIC(14,2) | No | Imported source value |
| `employer_cost` | NUMERIC(14,2) | Yes | Authoritative budget payroll cost |
| `source_payload` | JSONB | Yes | Raw normalized source row |
| `import_batch_id` | UUID | Yes | Traceability |
| audit fields | standard | Yes/No | Unique source identity per import design |

### `payroll_allocations`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `payroll_allocation_id` | UUID | Yes | Primary key |
| `payroll_record_id` | UUID | Yes | FK to Payroll Record |
| `daycare_id` | UUID | No | Nullable for office/other |
| `budget_category_id` | UUID | No | Optional classification |
| `allocation_amount` | NUMERIC(14,2) | Yes | Allocated cost |
| `allocation_percent` | NUMERIC(7,4) | No | Optional assistive input |
| `notes` | TEXT | No | Manual note |
| audit fields | standard | Yes/No | Source record remains separate |

## Banking and Accounting

### `bank_accounts`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `bank_account_id` | UUID | Yes | Primary key |
| `bank_account_code` | VARCHAR(50) | Yes | Stable unique code |
| `display_name` | VARCHAR(150) | Yes | User-facing account name |
| `legal_entity_id` | UUID | Yes | Owner |
| `account_identifier_masked` | VARCHAR(100) | No | Safe display identifier |
| `lifecycle_status` | VARCHAR(20) | Yes | ACTIVE / INACTIVE / ARCHIVED |
| audit fields | standard | Yes/No | No direct account number exposure requirement |

### `bank_transactions`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `bank_transaction_id` | UUID | Yes | Primary key |
| `bank_account_id` | UUID | Yes | FK to Bank Account |
| `transaction_date` | DATE | Yes | Source bank date |
| `description` | TEXT | Yes | Source description |
| `reference_number` | VARCHAR(100) | No | Source reference |
| `amount` | NUMERIC(14,2) | Yes | Signed source amount |
| `source_fingerprint` | VARCHAR(128) | Yes | Deduplication key |
| `source_payload` | JSONB | Yes | Raw normalized source row |
| `import_batch_id` | UUID | Yes | Traceability |
| audit fields | standard | Yes/No | Source data immutable except correction workflow |

### `bank_allocations`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `bank_allocation_id` | UUID | Yes | Primary key |
| `bank_transaction_id` | UUID | Yes | FK to Bank Transaction |
| `daycare_id` | UUID | No | Nullable for office/other |
| `budget_category_id` | UUID | No | Classification |
| `budget_month` | DATE | Yes | First day of budget month |
| `allocation_amount` | NUMERIC(14,2) | Yes | Allocated amount |
| `accounting_status` | VARCHAR(30) | Yes | Controlled workflow value |
| `notes` | TEXT | No | Manual note |
| audit fields | standard | Yes/No | Allocations must reconcile to source amount where required |

## Budget

### `budget_categories`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `budget_category_id` | UUID | Yes | Primary key |
| `budget_category_code` | VARCHAR(50) | Yes | Stable unique code |
| `display_name` | VARCHAR(150) | Yes | User-facing name |
| `category_type` | VARCHAR(30) | Yes | INCOME / PAYROLL / EXPENSE / OTHER |
| `lifecycle_status` | VARCHAR(20) | Yes | ACTIVE / INACTIVE / ARCHIVED |
| `display_order` | INTEGER | Yes | UI ordering |
| audit fields | standard | Yes/No | Used values never physically deleted |

### `budget_rules`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `budget_rule_id` | UUID | Yes | Primary key |
| `budget_category_id` | UUID | Yes | FK to Budget Category |
| `school_year_id` | UUID | No | Educational applicability |
| `calendar_year_id` | UUID | No | Accounting applicability where needed |
| `daycare_id` | UUID | No | Null means wider scope |
| `age_group_id` | UUID | No | Used for tuition/staffing rules |
| `effective_from` | DATE | Yes | Start of validity |
| `effective_to` | DATE | No | End of validity |
| `rule_type` | VARCHAR(50) | Yes | Controlled rule meaning |
| `numeric_value` | NUMERIC(14,4) | No | Configured amount/rate |
| `text_value` | TEXT | No | Only where rule requires nonnumeric configuration |
| audit fields | standard | Yes/No | Forward-only by default |

### `budget_results`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `budget_result_id` | UUID | Yes | Primary key |
| `daycare_id` | UUID | Yes | Result scope |
| `reporting_month` | DATE | Yes | First day of month |
| `budget_category_id` | UUID | Yes | Result category |
| `planned_amount` | NUMERIC(14,2) | Yes | Calculated/planned amount |
| `actual_amount` | NUMERIC(14,2) | Yes | Accepted actual amount |
| `calculation_run_id` | UUID | Yes | Traceability to calculation run |
| `is_locked` | BOOLEAN | Yes | Prevents silent recalculation |
| audit fields | standard | Yes/No | Unique by result scope/version design |

## Shared Technical Tables

### `import_batches`

Stores source spreadsheet/file, tab, trigger, actor, timestamps, counts, status, and error summary for every synchronization/import.

### `import_rows`

Stores source row identity, raw payload, parsed payload, validation result, error details, and linked accepted database record.

### `audit_events`

Stores entity type, entity ID, operation, previous values, new values, source, actor, timestamp, and import batch when applicable.

### `data_quality_issues`

Stores blocking errors and warnings with source entity reference, severity, status, explanation, and optional approved-ignore details.

### `calculation_runs`

Stores rule version, input snapshot references, start/end time, status, and result traceability for budget calculations.

## Standard Audit Fields

Where applicable:

- `created_at`
- `created_by_user_id`
- `updated_at`
- `updated_by_user_id`
- `row_version`

## Implementation Note

This dictionary is not permission to invent missing business values. Controlled list values, exact statuses, and rule payloads must be taken from the Handbook, approved decision log, or explicitly resolved open questions before implementation.