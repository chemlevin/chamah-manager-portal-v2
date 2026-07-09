# Phase 1 Schema Proposal

Status: proposal only. No database has been created by this document.

## Schema Principles

- Preserve current Sheets/API behavior during Phase 1.
- Add stable internal IDs where Sheets currently use names.
- Keep source traceability for all imported rows.
- Prefer read-only parity first; do not replace APIs until outputs match current Sheets-based responses.
- Use JSON columns for dynamic sheet fields until the data contracts are finalized.
- Use SY/CY explicitly where calendar meaning matters.

## Table: `legal_entities`

- Purpose:
  - Stores LE values used by daycare ownership and tuition/budget logic.
- Related BRs:
  - BR-0009, BR-0047.
- Columns:
  - `legal_entity_id uuid PK`
  - `code text unique not null`
  - `display_name text not null`
  - `entity_type text not null`
  - `active boolean not null default true`
  - `created_at timestamptz not null`
  - `updated_at timestamptz not null`
- Keys:
  - PK: `legal_entity_id`
  - Unique: `code`
- Indexes:
  - `legal_entities_active_idx(active)`
- Sheet mapping:
  - No current direct Sheet source found.
  - Values documented in tuition rules: Nonprofit, Company.
- Open questions:
  - Are Nonprofit and Company enough, or are legal entities real named corporations?
  - Does LE change by SY or is it current-state only?

## Table: `organization_units`

- Purpose:
  - Stable registry for units used in BANKS allocations, overhead, projects, and reporting.
- Related BRs:
  - BR-0047, BR-0048, BR-0049.
- Columns:
  - `organization_unit_id uuid PK`
  - `code text unique not null`
  - `display_name text not null`
  - `unit_type text not null`
  - `parent_unit_id uuid null FK -> organization_units.organization_unit_id`
  - `active boolean not null default true`
  - `source_name text null`
  - `created_at timestamptz not null`
  - `updated_at timestamptz not null`
- Keys:
  - PK: `organization_unit_id`
  - FK: `parent_unit_id`
- Indexes:
  - `organization_units_type_idx(unit_type)`
  - `organization_units_parent_idx(parent_unit_id)`
  - `organization_units_source_name_idx(source_name)`
- Sheet mapping:
  - BANKS `עבור מחלקה`, `מחלקה`, `מעון`, `יחידה`
  - `config/organizational-units.js` known units
- Open questions:
  - Should `חשבון` become an organization unit, a bank account group, or a separate dimension?
  - Which units are daycares vs overhead vs project?

## Table: `daycares`

- Purpose:
  - Stable daycare entity mapped from current sheet names.
- Related BRs:
  - BR-0047, BR-0048, BR-0049.
- Columns:
  - `daycare_id uuid PK`
  - `organization_unit_id uuid not null FK -> organization_units.organization_unit_id`
  - `legal_entity_id uuid not null FK -> legal_entities.legal_entity_id`
  - `code text unique not null`
  - `display_name text not null`
  - `source_name text null`
  - `active boolean not null default true`
  - `effective_from date null`
  - `effective_to date null`
  - `created_at timestamptz not null`
  - `updated_at timestamptz not null`
- Keys:
  - PK: `daycare_id`
  - FK: `organization_unit_id`
  - FK: `legal_entity_id`
- Indexes:
  - `daycares_legal_entity_idx(legal_entity_id)`
  - `daycares_source_name_idx(source_name)`
  - `daycares_active_idx(active)`
- Sheet mapping:
  - BUDGET daycare aliases.
  - PAYROLL daycare aliases.
  - BANKS allocation unit aliases where the unit is a daycare.
  - Employees `מעון`.
- Open questions:
  - Should daycare-to-LE history be modeled in a separate history table?
  - What is the canonical daycare code list?

## Table: `classrooms`

- Purpose:
  - Stable classroom entity for capacity, occupancy, staffing, and payroll grouping.
- Related BRs:
  - BR-0016 to BR-0021, BR-0041.
- Columns:
  - `classroom_id uuid PK`
  - `daycare_id uuid not null FK -> daycares.daycare_id`
  - `code text not null`
  - `display_name text not null`
  - `source_name text null`
  - `default_age_group text null`
  - `area_m2 numeric(10,2) null`
  - `max_capacity integer null`
  - `active boolean not null default true`
  - `created_at timestamptz not null`
  - `updated_at timestamptz not null`
- Keys:
  - PK: `classroom_id`
  - Unique: `(daycare_id, code)`
- Indexes:
  - `classrooms_daycare_idx(daycare_id)`
  - `classrooms_source_name_idx(source_name)`
- Sheet mapping:
  - BUDGET `כיתה`, `שם כיתה`, `מספר כיתה`, `חדר`, `כיתה בפועל`
  - PAYROLL `כיתה`, `שם כיתה`, `חדר`
  - Employees `כיתה`
- Open questions:
  - Is classroom identity stable across SYs?
  - Should area/capacity be effective-dated by SY?

## Table: `children`

- Purpose:
  - Child-level registry for future child classification and occupancy calculations.
- Related BRs:
  - BR-0002 to BR-0007, BR-0042.
- Columns:
  - `child_id uuid PK`
  - `daycare_id uuid not null FK -> daycares.daycare_id`
  - `classroom_id uuid null FK -> classrooms.classroom_id`
  - `external_child_id text null`
  - `display_name text null`
  - `birth_date date null`
  - `school_year text not null`
  - `age_group text not null`
  - `private_daycare boolean not null default false`
  - `status text not null default 'active'`
  - `source_row_json jsonb null`
  - `created_at timestamptz not null`
  - `updated_at timestamptz not null`
- Keys:
  - PK: `child_id`
  - FK: `daycare_id`
  - FK: `classroom_id`
- Indexes:
  - `children_daycare_sy_idx(daycare_id, school_year)`
  - `children_classroom_idx(classroom_id)`
  - `children_age_group_idx(age_group)`
- Sheet mapping:
  - No current inspected child-level Sheet/API source.
  - BUDGET `OCCUPANCY` currently has aggregated child counts only.
- Open questions:
  - Where is the authoritative child roster?
  - Should Phase 1 store children or only aggregate occupancy facts until a source exists?

## Table: `budget_categories`

- Purpose:
  - Stable budget category registry.
- Related BRs:
  - BR-0050, BR-0051, BR-0053, BR-0055, BR-0059.
- Columns:
  - `budget_category_id uuid PK`
  - `internal_code text unique not null`
  - `display_name text not null`
  - `category_type text not null`
  - `display_group text null`
  - `display_status text not null default 'visible'`
  - `budget_requirement_status text null`
  - `active boolean not null default true`
  - `created_at timestamptz not null`
  - `updated_at timestamptz not null`
- Keys:
  - PK: `budget_category_id`
  - Unique: `internal_code`
- Indexes:
  - `budget_categories_type_idx(category_type)`
  - `budget_categories_display_group_idx(display_group)`
  - `budget_categories_active_idx(active)`
- Sheet mapping:
  - BUDGET `COST_RULES` category aliases.
  - BANKS `פירוט` may map here, pending owner decision.
- Open questions:
  - What is the canonical category list?
  - Should display group be free text or separate table?

## Table: `budget_settings`

- Purpose:
  - SY-specific configuration for budget category calculations and sources.
- Related BRs:
  - BR-0041 to BR-0046, BR-0051 to BR-0056, BR-0060 to BR-0064.
- Columns:
  - `budget_setting_id uuid PK`
  - `budget_category_id uuid not null FK -> budget_categories.budget_category_id`
  - `school_year text not null`
  - `calculation_method_code text not null`
  - `calculation_source text not null`
  - `actual_performance_source text not null`
  - `calculation_value numeric(14,2) null`
  - `calculation_parameters_json jsonb null`
  - `required_fields_json jsonb null`
  - `formula_logic text null`
  - `business_explanation text null`
  - `technical_explanation text null`
  - `active boolean not null default true`
  - `created_at timestamptz not null`
  - `updated_at timestamptz not null`
- Keys:
  - PK: `budget_setting_id`
  - FK: `budget_category_id`
  - Unique: `(budget_category_id, school_year)`
- Indexes:
  - `budget_settings_sy_idx(school_year)`
  - `budget_settings_source_idx(actual_performance_source)`
  - `budget_settings_method_idx(calculation_method_code)`
- Sheet mapping:
  - BUDGET `COST_RULES`
  - BUDGET `MONTH_HOURS`
  - BUDGET `STAFFING`
  - BUDGET `FIXED_STAFF`
- Open questions:
  - Should operating hours and staffing ratios be separate settings tables?
  - What is the controlled list for calculation methods?

## Table: `budget_exceptions`

- Purpose:
  - DC-specific overrides to default budget category settings.
- Related BRs:
  - BR-0054.
- Columns:
  - `budget_exception_id uuid PK`
  - `budget_category_id uuid not null FK -> budget_categories.budget_category_id`
  - `daycare_id uuid not null FK -> daycares.daycare_id`
  - `school_year text null`
  - `valid_from date null`
  - `valid_to date null`
  - `override_calculation_method_code text null`
  - `override_calculation_value numeric(14,2) null`
  - `override_calculation_source text null`
  - `override_actual_performance_source text null`
  - `override_active boolean null`
  - `notes text null`
  - `created_at timestamptz not null`
  - `updated_at timestamptz not null`
- Keys:
  - PK: `budget_exception_id`
  - FK: `budget_category_id`
  - FK: `daycare_id`
- Indexes:
  - `budget_exceptions_daycare_idx(daycare_id)`
  - `budget_exceptions_category_idx(budget_category_id)`
  - `budget_exceptions_sy_idx(school_year)`
  - `budget_exceptions_validity_idx(valid_from, valid_to)`
- Sheet mapping:
  - BUDGET `COST_RULES` daycare-specific rows.
- Open questions:
  - How should overlapping exception date ranges be prevented?
  - Is SY enough, or are date ranges required from day one?

## Table: `bank_transactions`

- Purpose:
  - Canonical bank transaction row before one-to-many budget allocation splits.
- Related BRs:
  - BR-0057, BR-0058.
- Columns:
  - `bank_transaction_id uuid PK`
  - `source_system text not null default 'google_sheets'`
  - `source_spreadsheet_id text null`
  - `source_tab text null`
  - `source_row_index integer null`
  - `account_name text null`
  - `cash_date date null`
  - `description text null`
  - `reference text null`
  - `definition text null`
  - `debit numeric(14,2) not null default 0`
  - `credit numeric(14,2) not null default 0`
  - `net_cash numeric(14,2) not null default 0`
  - `is_technical_transfer boolean not null default false`
  - `raw_row_json jsonb null`
  - `created_at timestamptz not null`
  - `updated_at timestamptz not null`
- Keys:
  - PK: `bank_transaction_id`
- Indexes:
  - `bank_transactions_cash_date_idx(cash_date)`
  - `bank_transactions_reference_idx(reference)`
  - `bank_transactions_account_idx(account_name)`
  - `bank_transactions_source_idx(source_spreadsheet_id, source_tab, source_row_index)`
- Sheet mapping:
  - BANKS `חשבון`, `תאריך`, `תיאור תנועה`, `אסמכתא`, `הגדרה`, debit/credit/amount fields.
- Open questions:
  - Does a single BANKS row currently represent a transaction or an allocation row?
  - How should duplicate references be handled if rows are split?

## Table: `bank_allocations`

- Purpose:
  - One allocation line for a bank transaction, supporting splits across DCs/categories/months.
- Related BRs:
  - BR-0048, BR-0053, BR-0057, BR-0058.
- Columns:
  - `bank_allocation_id uuid PK`
  - `bank_transaction_id uuid not null FK -> bank_transactions.bank_transaction_id`
  - `organization_unit_id uuid null FK -> organization_units.organization_unit_id`
  - `daycare_id uuid null FK -> daycares.daycare_id`
  - `budget_category_id uuid null FK -> budget_categories.budget_category_id`
  - `business_month text null`
  - `allocation_amount numeric(14,2) not null`
  - `allocation_type text null`
  - `accounting_status text null`
  - `notes text null`
  - `raw_allocation_json jsonb null`
  - `created_at timestamptz not null`
  - `updated_at timestamptz not null`
- Keys:
  - PK: `bank_allocation_id`
  - FK: `bank_transaction_id`
  - FK: `organization_unit_id`
  - FK: `daycare_id`
  - FK: `budget_category_id`
- Indexes:
  - `bank_allocations_transaction_idx(bank_transaction_id)`
  - `bank_allocations_unit_month_idx(organization_unit_id, business_month)`
  - `bank_allocations_daycare_month_idx(daycare_id, business_month)`
  - `bank_allocations_category_idx(budget_category_id)`
  - `bank_allocations_status_idx(accounting_status)`
- Sheet mapping:
  - BANKS `עבור מחלקה`, `עבור חודש`, `פירוט`, `הנה"ח`, `הערות`.
- Open questions:
  - Should accounting status live on transaction, allocation, or both?
  - Should unallocated rows be stored with null unit/category or in a separate review table?

## Table: `payroll_records`

- Purpose:
  - Imported payroll row with normalized grouping fields and preserved dynamic cost/hour fields.
- Related BRs:
  - BR-0034 to BR-0040, BR-0043.
- Columns:
  - `payroll_record_id uuid PK`
  - `source_system text not null default 'google_sheets'`
  - `source_spreadsheet_id text null`
  - `source_tab text null`
  - `source_row_index integer null`
  - `daycare_id uuid null FK -> daycares.daycare_id`
  - `classroom_id uuid null FK -> classrooms.classroom_id`
  - `payroll_month text not null`
  - `employee_source_name text null`
  - `employee_external_id text null`
  - `employment_type text null`
  - `role text null`
  - `total_payroll_hours numeric(12,2) not null default 0`
  - `total_payroll_cost numeric(14,2) not null default 0`
  - `is_staffing_compliance_row boolean not null default false`
  - `hour_fields_json jsonb null`
  - `cost_fields_json jsonb null`
  - `raw_row_json jsonb null`
  - `created_at timestamptz not null`
  - `updated_at timestamptz not null`
- Keys:
  - PK: `payroll_record_id`
  - FK: `daycare_id`
  - FK: `classroom_id`
- Indexes:
  - `payroll_records_daycare_month_idx(daycare_id, payroll_month)`
  - `payroll_records_classroom_idx(classroom_id)`
  - `payroll_records_employee_idx(employee_external_id, employee_source_name)`
  - `payroll_records_source_idx(source_spreadsheet_id, source_tab, source_row_index)`
- Sheet mapping:
  - PAYROLL identity aliases and dynamic numeric cost/hour fields.
- Open questions:
  - Should employee become a real FK in Phase 1?
  - Should salary, benefits, deductions, and reimbursements become separate payroll fact tables later?

## Tables Not Included Yet But Likely Needed Later

- `employees`
- `employee_compliance_records`
- `tuition_rates`
- `staffing_ratios`
- `operating_hours`
- `budget_locks`
- `budget_snapshots`
- `calculation_library`
- `import_batches`
- `source_row_audit`

