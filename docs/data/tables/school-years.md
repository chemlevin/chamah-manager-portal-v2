# Table: school_years

Status: Frozen v1.

Last updated: 2026-07-13

## Related Handbook Rules

- BR-0001
- BR-0029
- BR-0174
- BR-0175
- BR-0176
- BR-0177
- BR-0178
- BR-0179
- BR-0180

## Related Architecture Decisions

- DBD-0001
- DBD-0002
- DBD-0003
- DBD-0004
- DBD-0005
- DBD-0010

## Purpose

Stores School Year records for SY-based configuration, dashboards, and reporting.

## Source Of Truth

Target Source of Truth: database after validated import/sync.

Operational editing interface: Google Sheets.

## Primary Key

- `school_year_id`: stable internal ID.

## Business Code

- `school_year_code`: stable business code, for example `2026-2027`.

## Fields And Types

| Field | Type | Notes |
|---|---|---|
| `school_year_id` | UUID | Protected internal ID. |
| `school_year_code` | Text | Stable business code. |
| `display_name` | Text | User-facing name. |
| `start_date` | Date | Expected 1 September. |
| `end_date` | Date | Expected 31 August. |
| `status` | Enum/Text | Draft, Active, Locked. |
| `website_visibility` | Enum/Text | Displayed, Hidden. |
| `review_status` | Text | Draft architecture; values not approved. |
| `created_at` | Timestamp | Audit field. |
| `created_by` | Text/ID | Audit field. |
| `updated_at` | Timestamp | Audit field. |
| `updated_by` | Text/ID | Audit field. |

## Nullable Fields

- `review_status`
- `created_by`
- `updated_by`

## Defaults

- `status`: Draft.
- `website_visibility`: Hidden.

## Constraints

- `school_year_code` is unique.
- `start_date` should be 1 September.
- `end_date` should be 31 August of the following year.
- Start date must be before end date.

## Foreign Keys

None in this approved concept.

## Indexes

- Unique index on `school_year_code`.
- Index on `status`.
- Index on `website_visibility`.

## Historical Behavior

Historical School Years remain stored. Historical configuration and operational data must not be overwritten.

## Lifecycle

- Draft
- Active
- Locked

## Effective Dates

The School Year period is represented by `start_date` and `end_date`.

## Relationships

- Future SY-dependent configuration may reference `school_year_id`.
- Operational results from previous SYs are not copied into new SYs.

## Validation

- Validate date range.
- Validate unique business code.
- Validate lifecycle status.
- Validate visibility value.

## Google Sheets Editing Model

Users edit marked non-protected fields in Google Sheets. Sheet validation assists but does not replace import/database validation.

## Editable Columns

- `display_name`
- `start_date`
- `end_date`
- `status`
- `website_visibility`
- `review_status`

## Protected Columns

- `school_year_id`
- `school_year_code` after use
- audit fields
- sync fields

## Dropdown Sources

- `status`: Draft, Active, Locked.
- `website_visibility`: Displayed, Hidden.

## Free-Text Fields

- `display_name`
- `review_status` until values are approved.

## Blocking Errors

- Missing business code.
- Duplicate business code.
- Invalid date range.
- Invalid lifecycle status.

## Warnings

- Draft SY with required configuration not reviewed.
- Hidden active SY, if business owner expects it to appear.

## Sync Behavior

Google Sheets -> Validation -> Import/Sync -> Database.

Adding a row creates a new School Year entity.

## Audit Requirements

Record creation, update, importer/sync metadata, and source row traceability where available.

## Handbook Traceability

This table supports SY lifecycle and default selection rules from Calendar rules.

## Open Questions

- Exact values for `review_status`.
- Whether active SY count is limited to one.
