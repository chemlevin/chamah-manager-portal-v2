# Data Quality Model

Status: Draft architecture.

Last updated: 2026-07-12

## Purpose

This document summarizes the future data quality model.

## Related Handbook Rules

- BR-0166 to BR-0173.
- BR-0167 aligns with reporting rules for unavailable calculation.

## Severity

Initial severity values:
- Critical
- Warning
- Information
- OK

Severity is configuration data and should not be hard-coded unnecessarily.

## Issue Status

Initial issue statuses:
- Open
- Resolved
- Approved Ignore

There is no In Progress status in the initial implementation.

## Re-Evaluation

Data Quality issues are generated from current data and configured rules. After correction and successful refresh, an issue must disappear or change according to the current rule result.

## Approved Ignore

Approved Ignore must record:
- reason
- approved by
- approval date
- expiration date

## Open Questions

- Which validations are blocking errors for each table.
- Which validations are warnings for each table.
- How validation messages are displayed in Google Sheets.

