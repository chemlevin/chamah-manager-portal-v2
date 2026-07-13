# Compact Blueprint — Payroll, Banking, and Budget

Status: Draft architecture for final review.

Last updated: 2026-07-12

Related Handbook domains: Payroll, Banking, Accounting, Budget, Reporting, Data Quality, Imports.

Related decisions: DBD-0002 through DBD-0009, DBD-0013 through DBD-0025.

## Purpose

Define a compact operational model for Payroll, Banking, and Budget without turning the system into a full ERP. The user-facing Google Sheets model remains simple, while the database preserves source data, allocations, history, and calculation traceability.

## User-Facing Google Sheets Model

Visible tabs are intentionally limited:

- `שכר`
- `בנקים`
- `תקציב` only for configuration or approved manual values; calculated results are read-only or shown in the website.

A visible tab may map to more than one database table. Technical tables are not exposed as separate tabs.

---

# Payroll Domain

## Core Tables

### `payroll_records`

One imported monthly payroll source record for one employee and payroll month.

Key fields:

- `payroll_record_id` UUID primary key
- `employee_id` UUID foreign key
- `employment_id` UUID nullable foreign key when resolvable
- `calendar_year_id` UUID foreign key
- `payroll_month` DATE normalized to first day of month
- `source_department_text` original source value
- `source_role_text` original source value
- `employer_cost` NUMERIC
- `gross_salary` NUMERIC nullable
- `total_hours` NUMERIC nullable
- `source_payload` JSONB for preserved imported fields
- `import_batch_id` UUID foreign key
- audit and row-version fields

Rules:

- Payroll is the official Source of Truth for employer cost.
- Original imported values are immutable after acceptance except through a controlled correction import.
- Employee matching uses stable identity, not employee name alone.
- A payroll month is monthly data; do not force daily modeling.

### `payroll_allocations`

Operational allocation of a payroll record to one or more Daycares, Units, Classrooms, or Roles.

Key fields:

- `payroll_allocation_id` UUID primary key
- `payroll_record_id` UUID foreign key
- `daycare_id` UUID nullable
- `classroom_id` UUID nullable
- `role_id` UUID nullable
- `allocated_employer_cost` NUMERIC
- `allocated_hours` NUMERIC nullable
- `allocation_notes` TEXT nullable
- audit fields

Rules:

- One payroll record may have one or more allocation rows.
- Allocations must not overwrite source payroll fields.
- Cost and hours totals should reconcile to the source record; mismatch creates a warning unless a future Handbook rule makes it blocking.

## Google Sheets Tab: `שכר`

Editable business columns may include:

- employee identifier
- payroll month
- source department
- source role
- employer cost
- hours
- allocation Daycare
- allocation Classroom
- allocation Role
- allocated cost
- allocated hours
- notes

Protected columns:

- database IDs
- import batch
- row version
- validation status
- sync status
- error details
- audit fields

---

# Banking and Accounting Domain

## Core Tables

### `bank_accounts`

Stable bank-account identity.

Key fields:

- `bank_account_id` UUID primary key
- `bank_account_code` VARCHAR unique business code
- `display_name` VARCHAR
- `legal_entity_id` UUID foreign key
- `bank_name` VARCHAR nullable
- `account_identifier_masked` VARCHAR nullable
- `lifecycle_status` VARCHAR
- audit fields

### `bank_transactions`

One source bank movement as imported from a bank file or Sheet.

Key fields:

- `bank_transaction_id` UUID primary key
- `bank_account_id` UUID foreign key
- `transaction_date` DATE
- `value_date` DATE nullable
- `reference` VARCHAR nullable
- `description` TEXT nullable
- `debit_amount` NUMERIC default 0
- `credit_amount` NUMERIC default 0
- `source_payload` JSONB
- `source_row_key` VARCHAR stable import identity when available
- `import_batch_id` UUID foreign key
- audit fields

Rules:

- Transaction date and Budget Month are separate concepts.
- Source bank fields are read-only after acceptance.
- Duplicate detection must not rely on reference alone.
- Net amount is derived from credit minus debit; source debit and credit remain preserved.

### `bank_allocations`

Manual classification and allocation of a bank transaction.

Key fields:

- `bank_allocation_id` UUID primary key
- `bank_transaction_id` UUID foreign key
- `action_type` VARCHAR
- `daycare_id` UUID nullable
- `organizational_unit_code` VARCHAR nullable only if retained as a simple reporting dimension
- `budget_category_id` UUID nullable
- `budget_month` DATE nullable normalized to first day of month
- `allocated_debit` NUMERIC default 0
- `allocated_credit` NUMERIC default 0
- `accounting_status` VARCHAR
- `notes` TEXT nullable
- audit fields

Rules:

- One transaction may have multiple allocation rows.
- Allocation rows must reconcile to the source transaction total.
- Accounting status is workflow only and does not change financial classification.
- `Exclude` and `Internal` actions remain explicit classifications, not free-text conventions.

### `accounting_status_history`

Required only because accounting status may move forward and backward and the Handbook requires historical status tracking.

Key fields:

- `accounting_status_history_id` UUID primary key
- `bank_allocation_id` UUID foreign key
- `from_status` VARCHAR nullable
- `to_status` VARCHAR
- `changed_at` TIMESTAMPTZ
- `changed_by_user_id` UUID nullable
- `reason` TEXT nullable

## Google Sheets Tab: `בנקים`

Editable business columns may include:

- account
- transaction date
- description
- reference
- debit
- credit
- action type
- Daycare or Unit
- Budget Category
- Budget Month
- accounting status
- notes

Protected columns:

- database IDs
- source import identity
- raw source payload
- row version
- validation and sync fields
- audit fields

---

# Budget Domain

## Core Tables

### `budget_categories`

Stable identity for budget categories.

Key fields:

- `budget_category_id` UUID primary key
- `budget_category_code` VARCHAR unique
- `display_name` VARCHAR
- `category_type` VARCHAR
- `lifecycle_status` VARCHAR
- `display_order` INTEGER
- audit fields

### `budget_rules`

Effective-dated configuration for how a category is budgeted.

Key fields:

- `budget_rule_id` UUID primary key
- `budget_category_id` UUID foreign key
- `school_year_id` UUID nullable
- `calendar_year_id` UUID nullable
- `daycare_id` UUID nullable for an exception
- `calculation_method` VARCHAR
- `calculation_value` NUMERIC nullable
- `actual_source` VARCHAR
- `effective_from` DATE
- `effective_to` DATE nullable
- `lifecycle_status` VARCHAR
- audit fields

Rules:

- Rules are configuration, not operational results.
- No free-form formulas in Google Sheets.
- Calculation methods come from an approved controlled list.
- Daycare-specific exceptions are rows, not duplicated category identities.

### `budget_monthly_results`

Calculated monthly result per Daycare and Budget Category.

Key fields:

- `budget_monthly_result_id` UUID primary key
- `budget_month` DATE
- `school_year_id` UUID nullable
- `calendar_year_id` UUID
- `daycare_id` UUID
- `budget_category_id` UUID
- `planned_amount` NUMERIC nullable
- `actual_amount` NUMERIC nullable
- `variance_amount` NUMERIC nullable
- `calculation_status` VARCHAR
- `calculation_run_id` UUID
- `is_locked` BOOLEAN default false
- audit fields

Rules:

- Calculated results are not edited manually in the normal Sheet workflow.
- Missing input produces `CANNOT_CALCULATE`, not zero.
- Locked results do not recalculate until explicitly reopened.
- Monthly child income uses monthly enrollment multiplied by the applicable tuition rule.
- Payroll actuals come from accepted Payroll records and allocations.
- Bank actuals come from accepted Bank allocations, excluding explicitly excluded categories.

### `budget_manual_values`

Optional compact table only for approved manual budget inputs that have no operational source.

Key fields:

- `budget_manual_value_id` UUID primary key
- `budget_month` DATE
- `daycare_id` UUID nullable
- `budget_category_id` UUID
- `amount` NUMERIC
- `notes` TEXT nullable
- `source_sheet_row_key` VARCHAR nullable
- audit fields

This table exists only if manual values are confirmed as required. It must not duplicate values already sourced from Payroll, Banking, Children, or configuration rules.

## Google Sheets Tab: `תקציב`

Preferred use:

- budget categories
- budget rules
- approved manual values only
- explanatory notes

Calculated monthly results should be read-only or displayed in the website, not maintained by hand.

---

# Cross-Domain Validation

Blocking examples:

- invalid employee, Daycare, account, category, or month reference
- duplicate stable business code
- invalid amount type
- missing required period
- attempted edit of protected source data
- allocation total exceeding source amount

Warning examples:

- payroll allocation not fully reconciled
- bank allocation not fully reconciled
- missing optional category mapping
- active rule with incomplete optional metadata
- missing payroll employee match where source row is still retained

# Minimal Technical Tables

The implementation should keep technical support limited to what is necessary:

- `import_batches`
- `import_rows`
- `data_quality_issues`
- `audit_events`
- optional `calculation_runs`

Do not create separate technical tables for every status or dropdown unless they require user-managed configuration or independent history.

# Open Questions For Final Review

- Whether `organizational_unit_code` remains necessary in addition to Daycare for non-Daycare expenses such as Office and Development.
- Whether Budget Month is selected manually for every Bank allocation or may default from transaction date and then be overridden.
- Exact set of budget calculation methods to expose in the compact configuration tab.
- Whether manual budget values are still needed after all operational sources are connected.

# Implementation Boundary

This document is architecture only. Do not create SQL migrations, Supabase objects, APIs, Google Sheets, or application changes until the full blueprint passes final review.
