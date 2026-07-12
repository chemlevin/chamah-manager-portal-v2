# Source Map

Status: Draft architecture.

Last updated: 2026-07-12

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
| Database | Not implemented | Final system Source of Truth |

## Existing Known Google Sheets Areas

- Bank files / BANKS data.
- Payroll files/data.
- Attendance data.
- Employee data.
- School Year configuration.
- Calendar Year configuration.
- Master Data configuration.

## Source Authority Rules

- Handbook defines business rules.
- Google Sheets provides editable operational/configuration data.
- Database stores accepted validated data.
- Existing code is current implementation evidence only.

