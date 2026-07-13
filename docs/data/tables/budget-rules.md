# Table: budget_rules

Status: Schema Freeze v1.

Last updated: 2026-07-13

## Purpose

Stores compact effective-dated budget rule configuration.

## Rule Types

Allowed `rule_type` codes:

- `FORMULA_BASED`
- `FIXED_AMOUNT`
- `MANUAL`
- `EXTERNAL_SOURCE`

## Contract Fields

- `calculation_source`
- `actual_performance_source`
- `numeric_value`
- `text_value`
- `contract_notes`

`contract_notes` documents meaning, required dimensions, nullable dimensions, prohibited combinations, time model, source, and validation.

## Budget Storage Boundary

Unlocked budget results remain dynamic and are not stored. `budget_snapshots` stores immutable locked monthly results only.

## Google Sheets Boundary

No visible Budget tab exists in Google Sheets v1.

## Handbook Traceability

Supports Budgeting BR-0051 through BR-0064.
