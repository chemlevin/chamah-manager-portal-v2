# Table: bank_allocations

Status: Schema Freeze v1.

Last updated: 2026-07-13

## Purpose

Stores manual bank allocation and accounting workflow fields separate from immutable bank source transactions.

## Key Fields

- `bank_allocation_id`
- `bank_transaction_id`
- `allocation_unit_id`
- `daycare_id`
- `budget_category_id`
- `budget_month`
- `allocation_amount`
- `accounting_status_id`
- `accounting_status` (deprecated read-only compatibility)
- `notes`

## Target Rule

`allocation_unit_id` is the authoritative flat target. `daycare_id` is retained for compatibility only and must remain `NULL` in Schema Freeze v1.

Supported allocation unit types are daycare, office, management, and development without hierarchy.

## Accounting Status

`accounting_status_id` references `accounting_statuses` and is the sole writable status
field. The legacy `accounting_status` code is retained only for reading historical rows;
an automatic migration backfills its ID and database enforcement rejects new legacy writes.

## Handbook Traceability

Supports Banking BR-0069 through BR-0076 and Accounting BR-0133 through BR-0142.
