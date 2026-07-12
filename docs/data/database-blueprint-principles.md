# Database Blueprint Principles

Status: Draft architecture reference.

Last updated: 2026-07-12

## Purpose

This document records the core principles for the future database blueprint.

## Business Authority

- The Handbook under `docs/handbook/` is the only source of business truth.
- Existing implementation is evidence of current behavior, but it does not override the Handbook.
- Missing business rules must remain open questions. Do not invent them.

## Approved Architecture Principles

- The new database is designed in parallel to the existing system.
- The current website, APIs, and Google Sheets are not changed during the blueprint phase.
- Google Sheets is the operational editing interface.
- Users do not edit the database directly.
- The database is the final system Source of Truth.
- The website will eventually read accepted data from the database.
- Data flow is:
  - Google Sheets -> Validation -> Import/Sync -> Database -> APIs -> Website.
- Sheet validation does not replace import/database validation.

## Editing Principles

- Only marked Sheet cells are editable.
- Dropdowns are used wherever possible.
- Free text is allowed only in explicitly defined fields.
- IDs, business codes after use, calculated fields, audit fields, and sync fields are protected.
- Validation errors and warnings are displayed in Google Sheets.

## Identity Principles

- Every Master Data entity has:
  - stable internal ID
  - stable business code
  - display name
- Adding a new row creates a new business entity.
- A display-name change does not create a new identity.
- A material business-meaning change requires a new row and a new business code.
- Used records are never physically deleted.
- Historical data must never be overwritten.

## Data Separation Principles

- Configuration and operational data are separated.
- Imported source data and manual user data are separated.
- Source traceability must be preserved.

## Year Principles

- Multiple School Years and Calendar Years may remain selectable.
- One year is displayed at a time in a dashboard.
- Multiple Calendar Years may remain open simultaneously because prior-year accounting work may continue after year-end.

