# Data Architecture Overview

Status: Schema Freeze v1.

Last updated: 2026-07-13

## Purpose

This document explains the target database architecture at a high level.

## Target Flow

```text
Google Sheets
  -> Validation
  -> Import/Sync
  -> Database
  -> APIs
  -> Website
```

## Current Phase Boundary

The current 33-table schema is kept and corrected by Migration 011. Existing application code, APIs, Google Sheets integration, calculations, UI, and tests continue unchanged during Schema Freeze v1.

## Target Responsibilities

- Google Sheets:
  - operational editing interface
  - displays validation warnings and errors
  - limits editing to defined cells
  - has no visible Budget tab in v1
- Import/Sync:
  - reads Sheets
  - validates records
  - writes accepted records to database
  - preserves source traceability
- Database:
  - final Source of Truth
  - stable identities
  - historical records
  - accepted configuration and operational data
  - flat allocation unit targets
- APIs:
  - eventually read accepted data from the database
- Website:
  - eventually displays database-backed accepted data

## Schema Freeze v1 Boundary

- Keep `allocation_units` flat.
- Use `allocation_unit_id` as the authoritative bank/payroll allocation target.
- Store bank debit, credit, signed amount, and source payload.
- Keep dynamic budget results out of storage until explicit lock.
- Store immutable locked budget snapshots.
- Keep RLS enabled without permissive public policies.
- Add no visible Budget tab in Google Sheets v1.

## Future Work

- Import implementation.
- API read model changes.
- API/auth RLS policies.
- UI switch from Sheets-backed APIs to database-backed APIs.
