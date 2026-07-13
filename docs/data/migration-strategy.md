# Migration Strategy

Status: Schema Freeze v1.

Last updated: 2026-07-13

## Purpose

This document describes the v1 database migration strategy.

## Strategy

1. Keep migrations 001-010 unchanged.
2. Apply one corrective Migration 011.
3. Freeze the 33-table database structure.
4. Build import/sync later.
5. Compare database read models against current Sheets-backed outputs later.
6. Switch APIs/screens only after parity approval.

## Current Phase

Database Structure Freeze v1.

## Non-Goals In Current Phase

- No additional migrations after Migration 011 in this task.
- No ORM models.
- No API changes.
- No UI changes.
- No Google Sheets integration changes.

## Migration Guardrails

- Historical data must not be overwritten.
- Used records must not be physically deleted.
- Source traceability must be preserved.
- Existing runtime behavior must remain unchanged until an explicit implementation phase.
