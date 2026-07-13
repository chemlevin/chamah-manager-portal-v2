# Table: legal_entity_types

Status: Frozen v1.

Last updated: 2026-07-13

## Related Handbook Rules

- BR-0009
- BR-0047

## Related Architecture Decisions

- DBD-0001
- DBD-0002
- DBD-0003
- DBD-0005
- DBD-0006
- DBD-0007

## Purpose

Stores legal entity type master data used to classify Legal Entities.

## Source Of Truth

Target Source of Truth: database after validated import/sync.

Operational editing interface: Google Sheets.

## Primary Key

- `legal_entity_type_id`: stable internal ID.

## Business Code

- `legal_entity_type_code`: stable business code.

## Fields And Types

| Field | Type | Notes |
|---|---|---|
| `legal_entity_type_id` | UUID | Protected internal ID. |
| `legal_entity_type_code` | Text | Stable business code. |
| `display_name` | Text | User-facing name. |
| `status` | Enum/Text | Active, Inactive, Archived. |
| `created_at` | Timestamp | Audit field. |
| `created_by` | Text/ID | Audit field. |
| `updated_at` | Timestamp | Audit field. |
| `updated_by` | Text/ID | Audit field. |

## Nullable Fields

- `created_by`
- `updated_by`

## Defaults

- `status`: Active.

## Constraints

- `legal_entity_type_code` is unique.
- Used records are not physically deleted.
- Business code must not change after use.

## Foreign Keys

None in this table.

Future `legal_entities` may reference this table.

## Indexes

- Unique index on `legal_entity_type_code`.
- Index on `status`.

## Historical Behavior

Used Legal Entity Types remain available for historical references. A material business-meaning change requires a new row and new business code.

## Lifecycle

- Active
- Inactive
- Archived

## Effective Dates

No effective-date fields are approved for this draft table.

## Relationships

- Future `legal_entities` table may reference `legal_entity_type_id`.

## Validation

- Validate unique business code.
- Validate status.
- Validate display name is present.

## Google Sheets Editing Model

Users edit marked non-protected fields in Google Sheets. Sheet validation assists but does not replace import/database validation.

## Editable Columns

- `display_name`
- `status`

## Protected Columns

- `legal_entity_type_id`
- `legal_entity_type_code` after use
- audit fields
- sync fields

## Dropdown Sources

- `status`: Active, Inactive, Archived.

## Free-Text Fields

- `display_name`

## Blocking Errors

- Missing business code.
- Duplicate business code.
- Missing display name.
- Invalid status.

## Warnings

- Attempting to repurpose an existing business code.

## Sync Behavior

Google Sheets -> Validation -> Import/Sync -> Database.

Adding a new row creates a new Legal Entity Type.

## Audit Requirements

Record creation, update, importer/sync metadata, and source row traceability where available.

## Handbook Traceability

This table supports LE concepts in Tuition and Organization rules.

## Example Rows

| Code | Display name | Notes |
|---|---|---|
| `NONPROFIT` | עמותה | Example. |
| `COMPANY` | חברה | Example. |
| `PUBLIC_BENEFIT_COMPANY` | חל״צ | Example of a future new row, not a replacement for an existing row. |

## Open Questions

- Are these legal entity type values final?
- Are additional legal entity types required?
- Should legal entity types have effective dates?
