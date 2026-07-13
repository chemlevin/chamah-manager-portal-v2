# Database Implementation Roadmap

Status: Blueprint execution roadmap. No implementation has started.

Last updated: 2026-07-13

## Goal

Build the new database, controlled Google Sheets workspace, synchronization layer, database-backed APIs, and a new parallel portal environment without disrupting the current production system.

## Phase 0 — Blueprint Approval

Deliverables:

- Approved domain model
- Approved data dictionary
- Approved ERD and relationship matrix
- Approved Google Sheets workspace and mapping
- Resolved structurally blocking questions
- Final design review

Exit criteria:

- Blueprint marked implementation-ready
- No unresolved question that changes core schema
- Owner approves the visible Google Sheets workflow

## Phase 1 — Environment Setup

Tasks:

- Create one PostgreSQL/Supabase project for the portal
- Configure development, staging, and production environment variables
- Define secret-management rules
- Enable backups and point-in-time recovery according to selected plan
- Document connection ownership and access
- Create a separate Vercel project or equivalent deployment environment for the new portal
- Keep the current production deployment unchanged

Exit criteria:

- Empty database environment available
- Separate new-portal environment available
- No production API uses the new database yet
- Credentials are not committed to the repository

## Phase 2 — Core Schema

Implementation order:

1. School Years and Calendar Years
2. Legal Entities, Daycares, Age Groups
3. Daycare School Years and Classrooms
4. Employees, Employments, Assignments, Certificates
5. Bank Accounts and Budget Categories
6. Monthly Enrollment
7. Payroll Records and Allocations
8. Bank Transactions and Allocations
9. Budget Rules, Calculation Runs, and Results
10. Import, Audit, and Data Quality tables

Tasks:

- Create migrations
- Create constraints and indexes
- Create seed/reference values only from approved data
- Add database-level validation where appropriate
- Add automated schema tests

Exit criteria:

- Clean database can be rebuilt from migrations
- Constraints match the Blueprint
- No application behavior changed

## Phase 3 — Compact Google Sheets Workspace

Default visible tabs:

1. `הגדרות`
2. `ילדים`
3. `עובדים`
4. `שכר`
5. `בנקים`
6. `תקציב` only if manual budget input is required

Tasks:

- Build protected ranges
- Add dropdowns from controlled lists
- Add row identity and row-version columns
- Add inline validation and sync-result columns
- Hide technical list/sync tabs
- Test bulk paste and correction workflow

Exit criteria:

- Owner and office staff can perform normal work without database access
- No user-facing tab mirrors unnecessary internal tables

## Phase 4 — Import and Sync Service

Tasks:

- Build explicit publish/sync action first
- Create import batches and per-row results
- Validate types, required fields, references, periods, duplicates, and concurrency
- Accept valid rows independently from invalid rows
- Return blocking errors and warnings to Sheets
- Preserve raw source payload and accepted database record link

Exit criteria:

- Repeat imports are idempotent
- Invalid data is not silently accepted
- Manual allocations and notes are preserved
- Every accepted row is traceable

## Phase 5 — Historical Migration

Tasks:

- Inventory current Sheet tabs and fields
- Map each historical source field to the new schema
- Load master/configuration data first
- Load employees and organization data
- Load monthly enrollment and payroll
- Load bank transactions and allocations
- Reconcile totals by month and daycare
- Record unmapped or ambiguous data as migration issues

Exit criteria:

- Historical totals reconcile within approved tolerances
- No source record is lost without an explicit documented decision

## Phase 6 — Database Read APIs

Tasks:

- Implement database-backed read services for the new portal
- Preserve existing response contracts where they are still useful
- Add read models/views for dashboard needs
- Compare database outputs against current Sheets-backed outputs
- Do not make the new portal depend on legacy Sheet connectors

Exit criteria:

- Automated and manual parity checks pass
- Current production APIs remain available as a reference and rollback source

## Phase 7 — New Parallel Portal

Tasks:

- Build the new portal in a separate deployment environment
- Reuse proven UI components and interaction patterns where useful
- Reimplement data access against the new database-backed APIs only
- Recreate screens module by module rather than as one uncontrolled rewrite
- Keep current calculations traceable to Handbook rules and parity tests
- Avoid copying legacy Sheet-specific mappings and workarounds

Suggested module order:

1. Reference/configuration views
2. Organization and children
3. Employees and payroll
4. Banking/accounting
5. Budget/dashboard

Exit criteria:

- New portal operates independently of legacy Google Sheets structure
- Core screens match approved behavior and numbers
- Current production portal remains available

## Phase 8 — Parallel Run

Tasks:

- Continue current operational process
- Synchronize new Sheets/database in parallel
- Run the new portal alongside the current portal
- Compare children, payroll, bank, budget, and dashboard outputs each month
- Resolve discrepancies before cutover

Minimum recommendation:

- At least one complete monthly cycle
- Prefer two monthly cycles for payroll/banking confidence

Exit criteria:

- Owner approves parity
- No unresolved blocking data-quality issue
- Rollback plan tested

## Phase 9 — Cutover

Tasks:

- Move users to the new portal only after approved parity
- Monitor errors and reconciliation
- Keep the old portal available temporarily as rollback/reference
- Do not retire the old environment immediately

Exit criteria:

- New portal reads accepted data from the database
- Operational edits continue through the new controlled Sheets workspace
- Owner approves production use

## Phase 10 — Stabilization And Legacy Retirement

Tasks:

- Monitor sync failures and performance
- Review Data Quality issues
- Simplify fields or tabs proven unnecessary
- Finalize backup and recovery runbook
- Document support procedure
- Freeze the old portal to read-only when confidence is sufficient
- Retire the old portal only after the agreed retention period and verified rollback no longer being required

## Phase 11 — Optional Future Enhancements

Only after stable operation:

- Admin monitoring screen
- Direct website editing for selected domains
- AI/BI access
- Automated scheduled sync
- Replace Sheets entirely if desired

These are optional and must not complicate the initial build.
