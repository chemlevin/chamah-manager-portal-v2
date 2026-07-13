# Source Map

Status: Schema Freeze v1.

Last updated: 2026-07-13

## Purpose

This document maps known source surfaces to future database concepts.

## Source Surfaces

| Source | Current Role | Future Role |
|---|---|---|
| Handbook `docs/handbook/` | Business truth | Business truth |
| Google Sheets | Current operational data source and future editing interface | Editing interface and import source |
| Current APIs | Current Sheets-backed read layer | Future database-backed read layer |
| Website | Current consumer of APIs | Future consumer of database-backed APIs |
| Import/Sync | Not implemented | Validates and imports Sheet data to database |
| Database | Structure frozen v1 | Final system Source of Truth after import/sync |

## Existing Known Google Sheets Areas

- Bank files / BANKS data.
- Payroll files/data.
- Attendance data.
- Employee data.
- School Year configuration.
- Calendar Year configuration.
- Master Data configuration.
- No visible Budget tab in Google Sheets v1.

## Source Authority Rules

- Handbook defines business rules.
- Google Sheets provides editable operational/configuration data.
- Database stores accepted validated data.
- Existing code is current implementation evidence only.
