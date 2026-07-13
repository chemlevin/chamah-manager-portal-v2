# Table: payroll_allocations

Status: Schema Freeze v1.

Last updated: 2026-07-13

## Purpose

Stores manual management allocation rows for immutable monthly payroll source records.

## Target Rule

`allocation_unit_id` is the authoritative flat allocation target.

## Allocation Status

Allowed values:

- `DRAFT`
- `FINALIZED`

Draft allocations may be incomplete.

Finalized allocations must reconcile to the related `payroll_records` source:

- allocation amounts sum to `employer_cost`
- allocation percents sum to 100
- each allocation amount matches its percent
- allocated hours sum to source hours when source hours exist

## Handbook Traceability

Supports Payroll BR-0078 through BR-0090.
