# Google Sheets Mapping

Status: Draft architecture.

Last updated: 2026-07-12

## Purpose

This document defines general Google Sheets mapping principles for future database tables.

## General Mapping Rules

- Each future table may have a corresponding Sheet tab or managed Sheet section.
- Only marked cells are editable.
- Dropdowns are used wherever possible.
- Free text is allowed only in explicitly defined fields.
- Protected columns are not edited by users.

## Protected Column Examples

- Internal ID.
- Business code after use.
- Calculated fields.
- Audit fields.
- Sync fields.

## Validation Display

Google Sheets may display:
- blocking errors
- warnings
- accepted values
- issue explanations

## Open Questions

- Exact tab names.
- Exact column order.
- Whether each table uses one Sheet tab.
- Whether validation appears inline, in separate columns, or in a separate review tab.

