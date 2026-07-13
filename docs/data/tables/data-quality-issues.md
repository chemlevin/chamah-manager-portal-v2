# Table: data_quality_issues

Status: Schema Freeze v1.

Last updated: 2026-07-13

## Purpose

Stores system validation outcomes and user-approved ignore decisions.

## Severity

Allowed values:

- `CRITICAL`
- `WARNING`
- `INFORMATION`
- `OK`

## Status

Allowed values:

- `OPEN`
- `RESOLVED`
- `APPROVED_IGNORE`

## Approved Ignore Metadata

Approved Ignore requires:

- `approved_ignore_approved_by_user_id`
- `approved_ignore_approved_at`
- `approved_ignore_reason`
- optional `approved_ignore_expires_at`
- `original_issue_history`

## Handbook Traceability

Supports Data Quality BR-0166 through BR-0173.
