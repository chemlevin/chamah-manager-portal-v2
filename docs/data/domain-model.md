# Database Domain Model

Status: Draft architecture.

Last updated: 2026-07-12

## Purpose

This document defines the domain boundaries and time models for the future Chamah Manager Portal database. It is architecture documentation only. It does not implement SQL, migrations, APIs, sync jobs, or Google Sheets.

## Governing Rules

- The Handbook under `docs/handbook/` is the only source of business truth.
- Existing code and Google Sheets describe the current implementation and migration source, but do not override the Handbook.
- The existing website, APIs, calculations, and Google Sheets remain unchanged during the blueprint phase.
- Google Sheets is the operational editing interface.
- The database is the final system Source of Truth after validation and synchronization.
- The website will eventually read accepted data from the database.

## Target Data Flow

```text
Google Sheets
  -> validation and publish/sync
  -> database
  -> APIs
  -> website, dashboards, and reporting
```

## Domains

### 1. Foundation and Periods

Contains stable period identities and lifecycle controls:

- School Years.
- Calendar Years.
- Calendar Months / Reporting Months.
- Period selection and dashboard availability.
- Period locking where explicitly required.

School Year and Calendar Year remain separate concepts. Multiple years may remain selectable. Multiple Calendar Years may remain open simultaneously.

### 2. Organization and Daycare Structure

Contains:

- Legal Entity Types.
- Legal Entities.
- Daycares.
- Daycare legal-entity assignment history when required.
- Daycare School Year operations.
- Daycare School Year Classrooms.
- Classroom age-group composition.

A Daycare represents one license. Classroom structure may change by School Year and may change during a School Year through effective dates.

### 3. Children and Monthly Enrollment

Contains:

- Child identity when individual child records are introduced.
- Enrollment periods.
- Classroom assignment.
- Monthly enrollment counts by classroom and age group.

For budget income, the approved operational meaning is:

> A child recorded by the office user for a month is counted as generating tuition income for that month.

Monthly enrollment is therefore the authoritative quantity input for expected tuition income. It is not attendance and is not an average-presence measure.

### 4. Employees and Licensing

Contains:

- Person / employee identity.
- Employment relationships with a specific Legal Entity.
- Employment periods and re-employment.
- Role and assignment history.
- Seniority as an explicit value independent from employment start date.
- Certificates, training, expiration, and target completion dates.

Person and employment are separate concepts. One person may have multiple employment relationships, including relationships with different Legal Entities or repeated periods with the same Legal Entity.

### 5. Payroll

Contains:

- Immutable imported Payroll source records.
- Monthly payroll facts.
- User-managed payroll allocation rows.
- Allocation validation.

Payroll remains the exclusive Source of Truth for employer payroll cost. Bank transactions are not used to calculate payroll cost.

### 6. Banking and Accounting

Contains:

- Bank Accounts.
- Immutable imported Bank Transactions.
- User-managed Bank Allocation rows.
- Accounting workflow status and status history.
- Split traceability.

Transaction date determines cash and Calendar Year context. Budget Month is a separate management allocation field.

### 7. Budget and Management Allocation

Contains:

- Budget Categories.
- School-Year-dependent category configuration.
- Calculation methods and calculation library.
- Daycare-specific exceptions.
- Annual plans and monthly distribution.
- Dynamic calculation results.
- Explicit lock snapshots.
- Administration actual allocations.
- Administration overhead allocations.

Configuration, source facts, calculated current values, and locked approved values remain separate.

### 8. Compensation

Contains:

- Compensation Factors.
- Effective compensation rules.
- Employee eligibility periods.
- Hourly, global monthly, and one-time value types.

Expected compensation is for management review and calculators. Official Employer Cost remains sourced from Payroll.

### 9. Imports, Audit, and Data Quality

Contains:

- Import batches.
- Source-row traceability.
- Parsed and raw source values.
- Row-level import outcomes.
- Change audit.
- Data Quality issue events.
- Approved Ignore records.

Possible duplicates and contradictions normally create warnings rather than silent rejection. Invalid rows do not prevent valid rows in the same import from being accepted.

### 10. Reporting

Contains or derives:

- Report scopes.
- KPI definitions and explanations.
- Source-row drill-down.
- Refresh history.
- Reporting views and aggregates.

A reporting result that cannot be calculated must display Cannot Calculate rather than zero.

## Temporal Strategy

No single time model is forced on all domains.

| Data type | Time model |
|---|---|
| School Year configuration | School Year and, where required, effective dates |
| Calendar accounting work | Calendar Year and transaction/accounting dates |
| Daycare classroom structure | School Year plus effective dates |
| Monthly enrollment | One row per classroom, month, and age group |
| Employment and assignments | Effective-dated periods |
| Certificates | Completion, expiration, and target dates |
| Payroll | Immutable monthly source snapshots plus allocations |
| Bank transactions | Immutable dated events plus separate Budget Month allocation |
| Budget configuration | School Year or effective period |
| Locked budget | Explicit immutable snapshot |
| Data Quality | Current evaluation plus historical issue events |

## Identity Versus Operational State

Stable identity is separated from changing operational state.

Examples:

- `daycares` stores daycare identity; School-Year operation and classrooms are stored separately.
- Person identity is separate from employment relationships and assignment history.
- Bank source transactions are separate from allocations and accounting workflow.
- Payroll source records are separate from payroll allocations.
- Budget Category identity is separate from its School-Year configuration.

## Scope Aggregation

The system may provide an `ALL` management scope across multiple Legal Entities, Daycares, or units. `ALL` is a reporting selection and is not stored as a business entity.

## Implementation Boundary

The blueprint must be complete before Codex creates:

- PostgreSQL/Supabase schema.
- Migrations.
- Google Sheets workspace.
- Sync service.
- Database-backed APIs.
- Website integration.

No database implementation is authorized by this document.