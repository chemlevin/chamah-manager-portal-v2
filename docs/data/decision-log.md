# Database Decision Log

Status: Active architecture log.

Last updated: 2026-07-13

## Purpose

This document records stable database blueprint decisions. Decision IDs are permanent. Superseded decisions remain in this file and are marked accordingly.

## Decisions

### DBD-0001 | Parallel Database Blueprint

Status: Approved.

Decision: The new database is designed in parallel to the existing system.

Impact: Current website, APIs, Google Sheets integration, calculations, UI, and tests are not changed during blueprint work.

### DBD-0002 | Google Sheets Operational Editing

Status: Approved.

Decision: Google Sheets is the operational editing interface for the owner and office staff.

Impact: Users do not edit the database directly. Only marked cells are editable, dropdowns are used wherever possible, and free text is limited to explicitly defined fields.

### DBD-0003 | Database Final Source Of Truth

Status: Approved.

Decision: The database is the final system Source of Truth after validation and import/sync.

Impact: The website will eventually read accepted data from the database. Google Sheets remains the operational editing surface, not the authoritative storage layer.

### DBD-0004 | Target Data Flow

Status: Approved.

Decision: Target data flow is Google Sheets -> Validation -> Import/Sync -> Database -> APIs -> Website.

Impact: Sheet validation and import/database validation are separate layers. Invalid rows remain visible in Google Sheets with correction guidance and are not silently accepted.

### DBD-0005 | Protected Fields

Status: Approved.

Decision: IDs, business codes after use, calculated fields, audit fields, sync fields, and database-controlled history fields are protected.

Impact: Users edit only marked Sheet cells. Copy/paste does not bypass validation.

### DBD-0006 | Master Data Identity

Status: Approved.

Decision: Every Master Data entity has a stable internal ID, stable business code, and display name.

Impact: Display-name changes do not create new identities. Adding a new valid Sheet row creates a new business entity. A material meaning change requires a new row and new business code.

### DBD-0007 | No Physical Delete After Use

Status: Approved.

Decision: Used records are never physically deleted.

Impact: Records move through lifecycle statuses and remain available for history.

### DBD-0008 | Configuration And Operational Data Separation

Status: Approved.

Decision: Configuration and operational data are separated.

Impact: School Year configuration can be copied without copying operational results. Rules and values that change by period are stored separately from stable identity records.

### DBD-0009 | Imported And Manual Data Separation

Status: Approved.

Decision: Imported source data and manual user data are separated.

Impact: Source updates must not erase completed user allocation, classification, workflow, or notes fields.

### DBD-0010 | Multiple Selectable Years

Status: Approved.

Decision: Multiple School Years and Calendar Years may remain selectable, while one year is displayed at a time in a dashboard.

Impact: Prior, current, and future years remain accessible according to lifecycle and visibility.

### DBD-0011 | Multiple Open Calendar Years

Status: Approved.

Decision: Multiple Calendar Years may remain OPEN simultaneously because prior-year accounting work may continue after year-end.

Impact: Calendar Year lifecycle is FUTURE / OPEN / CLOSED and does not enforce a single OPEN year.

### DBD-0012 | Separate School Year And Calendar Year

Status: Approved.

Decision: School Year and Calendar Year are separate period entities.

Impact: Educational modules use School Year. Accounting, banking, tax, and annual financial reporting use Calendar Year. A single transaction or monthly result may be related to both through its dates and reporting context.

### DBD-0013 | Legal Entity Scope Is Lightweight

Status: Approved.

Decision: Legal Entity is a required classification and ownership dimension, but it is not the central hierarchy of the system.

Impact: The current operation is expected to remain almost entirely under one nonprofit. The model supports an additional company, bank account, or daycare ownership change without introducing a heavy multi-company hierarchy.

### DBD-0014 | Consolidated View Is Reporting Scope

Status: Approved.

Decision: "All legal entities" is a management reporting scope, not a legal or accounting entity.

Impact: Financial and operational records remain assigned to their actual legal entity. Consolidated management views must not be represented as official consolidated accounting unless explicitly configured in the future.

### DBD-0015 | Daycare Means One License

Status: Approved.

Decision: One Daycare represents one daycare license.

Impact: Classrooms exist inside the Daycare. Classroom count, age composition, and mixed-classroom configuration may change by School Year or effective period without changing Daycare identity.

### DBD-0016 | Stable Identity Versus Period Configuration

Status: Approved.

Decision: Stable entities are separated from information that changes by School Year, Calendar Year, month, or effective period.

Impact: Daycare identity is separate from yearly classroom configuration. Employee identity is separate from employment and assignments. Bank source transactions are separate from manual allocations.

### DBD-0017 | Classroom Is Period-Bound Operational Configuration

Status: Approved.

Decision: A classroom configuration belongs to a Daycare and School Year and may have effective start and end dates within that year.

Impact: A classroom may be opened or closed during the year. A classroom is not assumed to be the same business record across different School Years merely because it has the same display name or number.

### DBD-0018 | Monthly Enrollment Is Budget Child Source

Status: Approved.

Decision: For budget income, a child counted by the office for a specific month is treated as generating tuition income for that month.

Impact: Budget child quantity is stored monthly by classroom and age group. Expected tuition income is calculated from monthly enrollment quantity multiplied by the applicable tuition rule.

### DBD-0019 | Mixed Classroom Monthly Breakdown

Status: Approved.

Decision: Monthly enrollment for a mixed classroom is stored separately by Age Group.

Impact: Tuition, staffing, and area calculations are performed by Age Group and then aggregated according to Handbook rules.

### DBD-0020 | Time Model Depends On Domain

Status: Approved.

Decision: The database does not force every domain into a monthly snapshot model.

Impact: Payroll and budget child quantities are monthly; bank transactions remain dated events with a separate Budget Month; employment and certificates use effective dates; classrooms use School Year plus effective dates.

### DBD-0021 | Person And Employment Are Separate

Status: Approved architecture principle.

Decision: A person/employee identity is separate from an employment relationship with a Legal Entity.

Impact: The same person may have multiple employment periods, may return after termination, and may theoretically be employed by more than one Legal Entity. Detailed table design remains pending the Employees domain.

### DBD-0022 | New Google Workspace For Final Operation

Status: Approved target architecture.

Decision: The final operational editing environment will use a newly structured Google Drive / Google Sheets workspace designed from the approved database blueprint.

Impact: Existing Sheets remain unchanged during blueprint and migration preparation. New Sheets will be organized by domain, use protected columns and controlled lists, and synchronize to the database.

### DBD-0023 | Publish And Sync Workflow

Status: Approved target direction.

Decision: Google Sheets changes are validated and published/synchronized through a controlled process rather than being treated as accepted database data immediately.

Impact: Each sync produces a summary of new, updated, invalid, warning, duplicate, and rejected rows. Exact trigger method is an implementation decision to be finalized before build.

### DBD-0024 | Questions Deferred Unless Structurally Blocking

Status: Approved working method.

Decision: Non-blocking questions are collected for final review instead of interrupting table-by-table design.

Impact: Architecture work continues domain by domain. Only a question that would materially change the overall schema should stop progress.

### DBD-0025 | Keep Current Schema With Corrective Migration

Status: Approved.

Decision: The current 33-table schema is kept for Database Structure Freeze v1 and corrected through one Migration 011.

Impact: Migrations 001-010 remain unchanged. The schema is not rebuilt.

### DBD-0026 | Flat Allocation Units

Status: Approved.

Decision: `allocation_units` is the v1 allocation and reporting target model. It remains flat and does not require an organization hierarchy.

Impact: `allocation_unit_id` is the authoritative target for bank and payroll allocations.

### DBD-0027 | Handbook-Constrained Workflow Values

Status: Approved.

Decision: Bank accounting statuses, budget category types, data quality severities/statuses, and payroll allocation finalization statuses use constrained stable codes mapped to Handbook values.

Impact: Incorrect prior codes are replaced by Migration 011 constraints.

### DBD-0028 | Dynamic Budget Results And Locked Snapshots

Status: Approved.

Decision: Unlocked budget results are dynamic runtime results. `budget_snapshots` stores immutable locked monthly snapshots only.

Impact: Budget data storage remains compact and does not create a visible Google Sheets Budget tab in v1.

### DBD-0029 | RLS Policy Deferral

Status: Approved.

Decision: RLS remains enabled, but no permissive public policies are added during Schema Freeze v1.

Impact: API/auth-specific policies are deferred to a later security phase.
