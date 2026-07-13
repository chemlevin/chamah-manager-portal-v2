# Table: bank_transactions

Status: Schema Freeze v1.

Last updated: 2026-07-13

## Purpose

Stores immutable imported bank source movements.

## Key Fields

- `bank_transaction_id`
- `bank_account_id`
- `transaction_date`
- `description`
- `reference_number`
- `debit_amount`
- `credit_amount`
- `amount`
- `source_fingerprint`
- `source_payload`
- `import_batch_id`

## Validation

- Debit and credit are non-negative.
- Debit-only rows have negative signed amount.
- Credit-only rows have positive signed amount.
- Zero rows have zero debit, credit, and amount.
- Source fields are immutable after import.

## Handbook Traceability

Supports Banking BR-0065 through BR-0077 and Import BR-0155 through BR-0157.
