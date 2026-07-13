# Final Design Review

Status: Passed with Migration 011 corrections.

Last updated: 2026-07-13

## Purpose

This review records the final Schema Freeze v1 design decision after reconciling the live database, migrations 001-010, Migration 011, the Handbook, and the data architecture documents.

## Review Result

The existing 33-table schema is kept.

Migration 011 corrects the areas that conflicted with the Handbook while preserving the already recovered schema, avoiding table drops, and avoiding data deletion.

## Accepted Design Decisions

- Keep `allocation_units` flat for v1.
- Do not introduce an `organization_units` hierarchy in v1.
- Use `allocation_unit_id` as the authoritative allocation target for bank and payroll allocations.
- Keep dynamic budget results out of storage until explicitly locked.
- Keep immutable locked budget snapshots in `budget_snapshots`.
- Keep Google Sheets as the operational editing interface.
- Add no visible Budget tab in Google Sheets v1.
- Keep RLS enabled and defer access policies to the API/auth phase.

## Corrected By Migration 011

- Bank accounting statuses now align to Handbook BR-0134.
- Budget category types now align to Handbook BR-0050.
- Budget rule types now use approved calculation method classes instead of invented domain-specific rule names.
- Data Quality supports critical, warning, informational, and OK semantics.
- Approved Ignore stores approver, approval timestamp, reason, optional expiration, status, and original issue history.
- Bank transactions store first-class debit, credit, signed amount, and source payload.
- Bank source columns are immutable after import.
- Bank allocation target ambiguity is blocked.
- Payroll allocations may remain draft but finalized allocations must reconcile to source payroll cost and hours.

## Not In Scope

- No portal changes.
- No API changes.
- No calculation changes.
- No Google Sheets changes.
- No Handbook edits.
- No table drops.
- No data deletion.
- No public access policies.

## Remaining Review Notes

Future work should define API/auth policies, import jobs, and operational editing screens before the database is used by the portal.
