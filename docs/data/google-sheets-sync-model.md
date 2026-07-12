# Google Sheets Sync Model

Status: Draft architecture.

Last updated: 2026-07-12

## Purpose

This document describes the intended Google Sheets editing and sync model.

## Approved Decisions

- Google Sheets is the operational editing interface.
- Users do not edit the database directly.
- Sheet validation does not replace import/database validation.
- Validation errors and warnings are displayed in Google Sheets.
- Only marked Sheet cells are editable.
- Dropdowns are used wherever possible.
- Free text is allowed only in explicitly defined fields.

## Sync Flow

```text
Google Sheets edit
  -> Sheet validation feedback
  -> Import/Sync validation
  -> Accepted database write
  -> API read
  -> Website display
```

## Editable Data

Editable data must be explicitly documented per table.

## Protected Data

Protected fields include:
- internal IDs
- business codes after use
- calculated fields
- audit fields
- sync fields

## Validation Layers

- Sheet validation:
  - helps users correct visible input problems
  - provides dropdowns and warnings
- Import/database validation:
  - authoritative acceptance check
  - prevents invalid database state

## Open Questions

- Exact Sheets tab names for each future table.
- Exact protection mechanism in Google Sheets.
- Whether rejected rows remain in the Sheet, an error Sheet, or an import review view.

