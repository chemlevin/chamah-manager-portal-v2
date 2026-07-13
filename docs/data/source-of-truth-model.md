# Source Of Truth Model

Status: Schema Freeze v1.

Last updated: 2026-07-13

## Purpose

This document defines the intended source-of-truth model.

## Business Truth

The Handbook under `docs/handbook/` is the only source of business truth.

## Operational Editing

Google Sheets is the operational editing interface. Users do not edit the database directly.

No visible Budget tab is added to Google Sheets v1.

## Final Data Truth

The database is the final system Source of Truth after records are validated and imported/synced.

## Current Implementation

The current implementation reads Google Sheets directly through APIs. This describes current behavior only. It does not override the Handbook.

Schema Freeze v1 keeps the database structure ready for future import/sync and API parity work. It does not switch the portal to database reads.

## Source Separation

- Imported Source Data:
  - original data from bank, payroll, attendance, employee, or configuration files/sheets
  - read-only after import unless explicitly updated through import process
- Manual User Data:
  - allocation fields
  - workflow fields
  - notes and approved manual configuration
- System Data:
  - IDs
  - audit fields
  - sync fields
  - calculated fields

## Protection Rules

- IDs are protected.
- Business codes are protected after use.
- Calculated fields are protected.
- Audit and sync fields are protected.
- Free text is allowed only where explicitly documented.
