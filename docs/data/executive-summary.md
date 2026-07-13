# Database Blueprint Executive Summary

Status: Final management summary for Database Blueprint v1.0.

Last updated: 2026-07-13

## Objective

Replace the current direct Google Sheets data dependency with a controlled data platform that remains simple for daily office work.

The target system keeps Google Sheets as the operational work surface, makes PostgreSQL/Supabase the final Source of Truth, and serves a new parallel portal through database-backed APIs.

## Target Architecture

```text
One compact Google Sheets workspace
        ↓
Validation and explicit Publish/Sync
        ↓
PostgreSQL / Supabase
        ↓
Database-backed APIs
        ↓
New portal in a parallel environment
```

The existing portal remains active during implementation and comparison. It is not modified or retired until the new system produces verified matching results.

## Daily User Experience

The owner and office staff continue working in Google Sheets, not directly in the database.

Default visible work tabs:

- `הגדרות`
- `ילדים`
- `עובדים`
- `שכר`
- `בנקים`
- optional `תקציב` only if recurring manual budget entry is required

The visible workspace is intentionally compact. Internal normalization, audit, import history, technical IDs, and relationship tables are hidden or protected.

## Business Model Summary

- One Daycare represents one license.
- Classroom configuration belongs to a School Year and may change inside the year.
- Mixed classrooms store monthly children separately by Age Group.
- A child entered for a month is treated as producing tuition income for that month.
- Employee identity is separate from employment periods and assignments.
- Recognized prior seniority is stored explicitly and is not always derived from hire date.
- Payroll source data is separated from daycare/department allocation.
- Bank source transactions are separated from manual classification and allocation.
- Budget results are calculated from accepted configuration and operational data.
- Legal Entity support remains lightweight because the expected operation is primarily one nonprofit, with simple expansion support for another entity or bank account.

## Data Protection Principles

- The Handbook is the only business-rule Source of Truth.
- Every Master Data record has a stable internal ID, stable Business Code, and Display Name.
- Used business records are not physically deleted.
- History is not silently overwritten.
- Imported source data does not erase manual classifications, allocations, or notes.
- Sheet dropdowns and protections reduce mistakes, but server-side validation remains authoritative.
- Every accepted or rejected synchronization row is traceable.

## Expected Database Size

The blueprint deliberately avoids an enterprise-scale model.

The final build should contain only the business tables and small technical support set justified by the approved data model. The exact number may change slightly during migration implementation, but Codex must not create a separate table for every dropdown, status, or user-facing tab.

A table is justified only when it protects history, models a real repeating relationship, prevents duplication, supports an independent lifecycle, or is required for reliable synchronization and validation.

## Implementation Approach

1. Create the database environment.
2. Build the schema from migrations.
3. Create the compact Google Sheets workspace.
4. Build controlled validation and Publish/Sync.
5. Migrate reliable historical data.
6. Reconcile children, payroll, banking, and budget totals.
7. Build database-backed APIs.
8. Build a new portal in a separate environment.
9. Run old and new systems in parallel.
10. Cut over only after verified parity and owner approval.

## Why A New Parallel Portal

A separate portal environment allows a clean database-backed implementation without destabilizing the current production system.

The current portal remains useful as:

- behavioral reference
- output comparison baseline
- rollback option
- source of reusable UI patterns and proven workflows

The new portal must not copy legacy direct-Sheets dependencies or undocumented workarounds.

## Remaining Owner Decisions

The core schema has no unresolved structural blocker. Remaining choices are implementation-level:

- whether a visible `תקציב` tab is needed
- final Publish/Sync trigger
- Supabase/PostgreSQL plan and ownership
- historical migration depth
- one or two monthly parallel-run cycles

These decisions are recorded in `open-questions.md` and can be resolved at the relevant implementation phase.

## Final Outcome

The delivered Blueprint provides Codex with a controlled implementation plan rather than permission to redesign the system.

The expected result is:

- simple Google Sheets operation
- reliable database history
- validated synchronized data
- a clean replacement portal
- a safe parallel migration path
- future ability to add reporting, automation, AI access, or direct website editing without replacing the database foundation
