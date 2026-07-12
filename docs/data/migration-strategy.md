# Migration Strategy

Status: Draft architecture.

Last updated: 2026-07-12

## Purpose

This document describes the non-implementation migration strategy.

## Strategy

1. Blueprint the data model.
2. Define Google Sheets editing models.
3. Define validation and import behavior.
4. Build database schema later.
5. Build import/sync later.
6. Compare database read models against current Sheets-backed outputs.
7. Switch APIs/screens only after parity approval.

## Current Phase

Blueprint only.

## Non-Goals In Current Phase

- No migrations.
- No SQL.
- No ORM models.
- No API changes.
- No UI changes.
- No Google Sheets integration changes.

## Migration Guardrails

- Historical data must not be overwritten.
- Used records must not be physically deleted.
- Source traceability must be preserved.
- Existing runtime behavior must remain unchanged until an explicit implementation phase.

