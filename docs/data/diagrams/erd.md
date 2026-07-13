# Schema Freeze v1 ERD

Status: Schema Freeze v1 diagram.

Last updated: 2026-07-13

## Purpose

This diagram shows the kept database structure after Migration 011 corrections.

```mermaid
erDiagram
  SCHOOL_YEARS ||--o{ DAYCARE_SCHOOL_YEARS : scopes
  CALENDAR_YEARS ||--o{ BUDGET_RULES : scopes
  LEGAL_ENTITY_TYPES ||--o{ LEGAL_ENTITIES : classifies
  LEGAL_ENTITIES ||--o{ BANK_ACCOUNTS : owns
  LEGAL_ENTITIES ||--o{ DAYCARES : owns
  LEGAL_ENTITIES ||--o{ ALLOCATION_UNITS : may_own
  ALLOCATION_UNITS ||--o| DAYCARES : represents_daycare
  ALLOCATION_UNITS ||--o{ BANK_ALLOCATIONS : targets
  ALLOCATION_UNITS ||--o{ PAYROLL_ALLOCATIONS : targets
  DAYCARES ||--o{ DAYCARE_SCHOOL_YEARS : operates
  DAYCARE_SCHOOL_YEARS ||--o{ CLASSROOMS : has
  CLASSROOMS ||--o{ CLASSROOM_AGE_GROUPS : allows
  CLASSROOMS ||--o{ MONTHLY_ENROLLMENT : records
  AGE_GROUPS ||--o{ CLASSROOM_AGE_GROUPS : classifies
  AGE_GROUPS ||--o{ MONTHLY_ENROLLMENT : classifies
  EMPLOYEES ||--o{ EMPLOYMENTS : has
  EMPLOYMENTS ||--o{ EMPLOYEE_ASSIGNMENTS : assigned
  EMPLOYMENTS ||--o{ EMPLOYEE_CERTIFICATES : certifies
  EMPLOYMENTS ||--o{ PAYROLL_RECORDS : source
  EMPLOYMENTS ||--o{ EMPLOYEE_COMPENSATION_ELIGIBILITY : eligible
  CERTIFICATE_TYPES ||--o{ EMPLOYEE_CERTIFICATES : classifies
  ROLES ||--o{ EMPLOYEE_ASSIGNMENTS : classifies
  ROLES ||--o{ PAYROLL_ALLOCATIONS : classifies
  COMPENSATION_FACTORS ||--o{ COMPENSATION_RULES : configures
  COMPENSATION_FACTORS ||--o{ EMPLOYEE_COMPENSATION_ELIGIBILITY : applies
  IMPORT_BATCHES ||--o{ IMPORT_ROWS : contains
  IMPORT_BATCHES ||--o{ BANK_TRANSACTIONS : imports
  IMPORT_BATCHES ||--o{ PAYROLL_RECORDS : imports
  BANK_ACCOUNTS ||--o{ BANK_TRANSACTIONS : has
  BANK_TRANSACTIONS ||--o{ BANK_ALLOCATIONS : allocates
  BUDGET_CATEGORIES ||--o{ BANK_ALLOCATIONS : classifies
  BUDGET_CATEGORIES ||--o{ PAYROLL_ALLOCATIONS : classifies
  BUDGET_CATEGORIES ||--o{ BUDGET_RULES : configures
  BUDGET_CATEGORIES ||--o{ BUDGET_SNAPSHOTS : snapshots
  CALCULATION_RUNS ||--o{ BUDGET_SNAPSHOTS : locks
  PAYROLL_RECORDS ||--o{ PAYROLL_ALLOCATIONS : allocates
  IMPORT_ROWS ||--o{ DATA_QUALITY_ISSUES : may_have

  SCHOOL_YEARS {
    uuid school_year_id PK
    text school_year_code
    text status
  }

  CALENDAR_YEARS {
    uuid calendar_year_id PK
    text calendar_year_code
    text status
  }

  ALLOCATION_UNITS {
    uuid allocation_unit_id PK
    text allocation_unit_code
    text allocation_unit_type
  }

  BANK_TRANSACTIONS {
    uuid bank_transaction_id PK
    numeric debit_amount
    numeric credit_amount
    numeric amount
    jsonb source_payload
  }

  BANK_ALLOCATIONS {
    uuid bank_allocation_id PK
    uuid allocation_unit_id FK
    text accounting_status
  }

  BUDGET_CATEGORIES {
    uuid budget_category_id PK
    text category_type
  }

  BUDGET_RULES {
    uuid budget_rule_id PK
    text rule_type
    text calculation_source
    text actual_performance_source
  }

  PAYROLL_ALLOCATIONS {
    uuid payroll_allocation_id PK
    text allocation_status
  }

  DATA_QUALITY_ISSUES {
    uuid data_quality_issue_id PK
    text severity
    text status
  }
```

## Notes

- `allocation_units` is flat in v1.
- No `organization_units` hierarchy is required in v1.
- `allocation_unit_id` is authoritative for bank and payroll allocations.
- Dynamic budget results are not stored until explicit lock creates immutable `budget_snapshots`.
