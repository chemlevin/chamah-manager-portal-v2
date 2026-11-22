# Source Of Truth Model

Status: Schema Freeze v1.

Last updated: 2026-07-13

## Purpose

This document defines the intended source-of-truth model.

Governance precedence is defined by `AGENTS.md`,
`docs/architecture/CHAMAH_SYSTEM_RULES.md`,
`docs/architecture/CHANGE_CONTROL.md`, and
`docs/architecture/CHAMAH_RUNTIME_REGISTRY.md`. This domain document cannot
override that hierarchy.

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

Flexible ingestion does not change authority. Technical intake and RAW/source evidence preserve what was received; UNMATCHED/UNMAPPED/NEEDS_REVIEW preserves information without a verified destination; PROPOSED records a candidate interpretation; only CANONICAL data affects official calculations. See `docs/architecture/FLEXIBLE_INTAKE_ADAPTER_CONTRACT.md`.

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
