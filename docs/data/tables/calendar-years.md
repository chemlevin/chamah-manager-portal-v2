# Table: calendar_years

Status: Frozen v1.

Last updated: 2026-07-13

## Related Handbook Rules

- BR-0029
- BR-0176
- Accounting rules that use CY scope.

## Related Architecture Decisions

- DBD-0001
- DBD-0002
- DBD-0003
- DBD-0004
- DBD-0005
- DBD-0010
- DBD-0011

## Purpose

Stores Calendar Year records for accounting, bookkeeping, taxes, financial statements, and CY-based dashboards.

## Source Of Truth

Target Source of Truth: database after validated import/sync.

Operational editing interface: Google Sheets.

## Primary Key

- `calendar_year_id`: stable internal ID.

## Business Code

- `calendar_year_code`: stable business code, for example `2026`.

## Fields And Types

| Field | Type | Notes |
|---|---|---|
| `calendar_year_id` | UUID | Protected internal ID. |
| `calendar_year_code` | Text | Stable year code. |
| `display_name` | Text | User-facing name. |
| `start_date` | Date | Expected 1 January. |
| `end_date` | Date | Expected 31 December. |
| `status` | Enum/Text | FUTURE, OPEN, CLOSED. |
| `created_at` | Timestamp | Audit field. |
| `created_by` | Text/ID | Audit field. |
| `updated_at` | Timestamp | Audit field. |
| `updated_by` | Text/ID | Audit field. |

## Nullable Fields

- `created_by`
- `updated_by`

## Defaults

- `status`: FUTURE for future years unless opened.

## Constraints

- `calendar_year_code` is unique.
- `start_date` should be 1 January.
- `end_date` should be 31 December.
- Start date must be before end date.
- Multiple OPEN years are allowed.

## Foreign Keys

None in this approved concept.

## Indexes

- Unique index on `calendar_year_code`.
- Index on `status`.

## Historical Behavior

Calendar Years remain stored after closing. Prior-year accounting work may continue after year-end, so more than one Calendar Year may be OPEN.

## Lifecycle

- FUTURE
- OPEN
- CLOSED

## Effective Dates

The Calendar Year period is represented by `start_date` and `end_date`.

## Relationships

- Bank transactions and accounting workflow may relate to Calendar Year by transaction date.

## Validation

- Validate year code.
- Validate date range.
- Validate lifecycle status.
- Allow multiple OPEN years.

## Google Sheets Editing Model

Users edit marked non-protected fields in Google Sheets. Sheet validation assists but does not replace import/database validation.

## Editable Columns

- `display_name`
- `start_date`
- `end_date`
- `status`

## Protected Columns

- `calendar_year_id`
- `calendar_year_code` after use
- audit fields
- sync fields

## Dropdown Sources

- `status`: FUTURE, OPEN, CLOSED.

## Free-Text Fields

- `display_name`

## Blocking Errors

- Missing calendar year code.
- Duplicate calendar year code.
- Invalid date range.
- Invalid status.

## Warnings

- Old OPEN years may produce a warning but are allowed.

## Sync Behavior

Google Sheets -> Validation -> Import/Sync -> Database.

Adding a row creates a new Calendar Year entity.

## Audit Requirements

Record creation, update, importer/sync metadata, and source row traceability where available.

## Handbook Traceability

This table supports CY rules in Calendar and Accounting documentation.

## Open Questions

- Whether Calendar Year needs Website Visibility.
- Whether CLOSED years may be reopened and by whom.
