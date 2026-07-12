# Data Architecture Overview

Status: Draft architecture.

Last updated: 2026-07-12

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

The database is not implemented. Existing application code, APIs, Google Sheets integration, calculations, UI, and tests continue unchanged during the blueprint phase.

## Target Responsibilities

- Google Sheets:
  - operational editing interface
  - displays validation warnings and errors
  - limits editing to defined cells
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
- APIs:
  - eventually read accepted data from the database
- Website:
  - eventually displays database-backed accepted data

## Draft Architecture Areas

- Master Data
- Year and calendar configuration
- Google Sheets editing model
- Import and validation
- Data quality
- Audit/history
- Operational entities
- Reporting read models

## Future Work

- SQL schema design.
- Migration design.
- Import implementation.
- API read model changes.
- UI switch from Sheets-backed APIs to database-backed APIs.

