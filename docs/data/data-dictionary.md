# Data Dictionary

Status: Schema Freeze v1.

Last updated: 2026-07-13

## Purpose

This document records the database structure frozen by migrations 001-011 for the Chamah Manager Portal. It does not change the current website, APIs, calculations, Google Sheets, or Handbook.

## Freeze Scope

Schema Freeze v1 keeps the existing 33 public tables and applies corrective constraints in Migration 011.

RLS remains enabled on public tables. No permissive public policies are added in this phase. API/auth-specific policies are deferred.

## Core Conventions

- Stable internal IDs use UUID primary keys.
- Business codes remain stable after use.
- Mutable business/configuration rows use `updated_at` and `row_version` where already present.
- Imported source data remains separate from manual allocation/workflow data.
- Used records are not physically deleted.
- Flat `allocation_units` are the authoritative management target model for v1.

## Accounting Status Codes

`bank_allocations.accounting_status` uses stable codes for Handbook BR-0134 values:

| Code | Handbook value | Meaning |
|---|---|---|
| `PENDING_SUBMISSION` | Pending Submission | Open accounting item not yet sent. |
| `SENT_TO_ACCOUNTING` | Sent to Accounting | Closed accounting item sent externally. |
| `MISSING_DOCUMENTS` | Missing Documents | Open item waiting for documentation. |
| `NO_SUPPORTING_DOCUMENT_REQUIRED` | No Supporting Document Required | Closed item that needs no external document. |
| `NULL` | No Accounting Status | No status assigned yet. |

## Budget Category Types

`budget_categories.category_type` uses Handbook BR-0050 concepts:

| Code | Handbook concept |
|---|---|
| `INCOME` | Income |
| `EXPENSE` | Expense |
| `INTERNAL_OFFSET` | Internal Offset |
| `MANUAL_UNDEFINED` | Manual / Undefined |

`PAYROLL` is not a category type. Payroll is an actual performance source and may be represented by budget categories with the relevant approved type.

## Budget Rule Contracts

`budget_rules` remains one compact effective-dated table.

Approved `rule_type` codes:

| Code | Meaning | Required value field |
|---|---|---|
| `FORMULA_BASED` | Uses an approved calculation method/library code. | `text_value` |
| `FIXED_AMOUNT` | Uses a fixed configured amount. | `numeric_value` |
| `MANUAL` | Manual configured value or reference. | `numeric_value` or `text_value` |
| `EXTERNAL_SOURCE` | Uses an approved external source. | `text_value` plus `calculation_source` |

Allowed source codes for `calculation_source` and `actual_performance_source`:

- `BANKS`
- `PAYROLL`
- `CHILDREN`
- `SYSTEM`
- `MANUAL`

`contract_notes` documents the rule meaning, required dimensions, nullable dimensions, prohibited combinations, time model, source, and validation.

Dynamic unlocked budget results are calculated at runtime. `budget_snapshots` stores immutable locked monthly snapshots created only by explicit locking.

## Data Quality

`data_quality_issues.severity` values:

- `CRITICAL`
- `WARNING`
- `INFORMATION`
- `OK`

`data_quality_issues.status` values:

- `OPEN`
- `RESOLVED`
- `APPROVED_IGNORE`

Approved Ignore requires:

- `approved_ignore_approved_by_user_id`
- `approved_ignore_approved_at`
- `approved_ignore_reason`
- optional `approved_ignore_expires_at`
- `original_issue_history`

## Bank Source Traceability

`bank_transactions` stores first-class source amount fields:

- `debit_amount`
- `credit_amount`
- `amount`
- `source_payload`

Valid amount combinations are:

- debit only: `amount = -debit_amount`
- credit only: `amount = credit_amount`
- zero movement: debit, credit, and amount all zero

Source columns are immutable after import.

## Allocation Targets

`allocation_unit_id` is the authoritative target for:

- `bank_allocations`
- `payroll_allocations`

`allocation_units` are flat in v1 and support daycare, office, management, and development units without a hierarchy.

`bank_allocations.daycare_id` is retained only as a compatibility pointer and must remain `NULL` in Schema Freeze v1.

## Payroll Reconciliation

`payroll_allocations.allocation_status` values:

- `DRAFT`
- `FINALIZED`

Draft allocations may be incomplete.

Finalized allocations for a payroll record must:

- not be mixed with draft allocations for the same record
- sum `allocation_amount` to `payroll_records.employer_cost`
- sum `allocation_percent` to 100
- match amount to percent for each finalized row
- sum `allocated_hours` to source payroll hours when source hours exist

## Google Sheets v1 Boundary

Google Sheets remains the operational editing interface, but there is no visible Budget tab in Google Sheets v1. Budget configuration/database editing is deferred until an explicit future phase.
