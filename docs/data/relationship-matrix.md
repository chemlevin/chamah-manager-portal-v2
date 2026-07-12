# Relationship Matrix

Status: Draft v1 architecture, ready for design review.

Last updated: 2026-07-12

## Purpose

This document defines the core relationships for the Chamah Manager Portal database blueprint. It intentionally avoids enterprise-scale abstractions and keeps the model aligned with the compact Google Sheets working model.

## Core Relationship Matrix

| From | To | Cardinality | Required | Time Behavior | Notes |
|---|---|---:|---:|---|---|
| Legal Entity Type | Legal Entity | 1:N | Yes on Legal Entity | Stable master data | Usually one nonprofit; additional company only if needed. |
| Legal Entity | Daycare | 1:N | Yes on Daycare | Current assignment plus history only when ownership changes | One Daycare represents one license. |
| School Year | Daycare School Year | 1:N | Yes | School-Year scoped | Defines whether and how a Daycare operates in that School Year. |
| Daycare | Daycare School Year | 1:N | Yes | School-Year scoped | Stable Daycare identity remains unchanged across years. |
| Daycare School Year | Classroom | 1:N | Yes | Effective-dated inside School Year | Classroom may open or close during the year. |
| Classroom | Classroom Age Group | 1:N | Yes | Same effective period as Classroom | One row for a regular class, two rows for an approved mixed class. |
| Age Group | Classroom Age Group | 1:N | Yes | Stable reference data | Infant, Toddler, Preschool. |
| Classroom | Monthly Enrollment | 1:N | Yes | Monthly | Quantity used for budget income. |
| Age Group | Monthly Enrollment | 1:N | Yes | Monthly | Mixed classes are split by Age Group. |
| Reporting Month | Monthly Enrollment | 1:N | Yes | Monthly | One row per Classroom + Month + Age Group. |
| School Year | Tuition Rule | 1:N | Yes | School-Year scoped | Tuition also depends on Legal Entity / licensing context / Age Group as defined by Handbook. |
| Age Group | Tuition Rule | 1:N | Yes | School-Year scoped | Monthly expected income uses applicable tuition rule. |
| Person / Employee | Employment | 1:N | Yes on Employment | Effective-dated | Supports re-employment and more than one Legal Entity if ever needed. |
| Legal Entity | Employment | 1:N | Yes | Effective-dated | Employment, not person identity, belongs to Legal Entity. |
| Employment | Employee Assignment | 1:N | Yes | Effective-dated | Role, Daycare, Classroom and working scope can change without replacing the person. |
| Daycare | Employee Assignment | 1:N | Usually yes for daycare staff | Effective-dated | Office or non-daycare roles may use no Daycare. |
| Classroom | Employee Assignment | 1:N | Optional | Effective-dated | Used only when assignment is classroom-specific. |
| Role | Employee Assignment | 1:N | Yes | Effective-dated | Role is controlled reference/configuration. |
| Person / Employee | Employee Certificate | 1:N | Yes | Completion/expiry dates | Certificates belong to the person unless Handbook later requires employment-specific ownership. |
| Certificate Type | Employee Certificate | 1:N | Yes | Stable reference data | Certificate requirements can be configured separately. |
| Employment | Compensation Eligibility | 1:N | Yes | Start/End month | Manual eligibility for approved compensation factors. |
| Compensation Rule | Compensation Eligibility | 1:N | Yes | School-Year/effective period | Rules are configuration; eligibility is operational. |
| Payroll Source Record | Payroll Allocation | 1:N | Yes for reporting allocation | Monthly import + manual allocation | Allocation totals should reconcile to source record; mismatch creates warning. |
| Employment / Person | Payroll Source Record | 1:N | Preferred | Monthly | Match by stable identity, not employee name. |
| Reporting Month | Payroll Source Record | 1:N | Yes | Monthly | Payroll remains monthly snapshot data. |
| Bank Account | Bank Transaction | 1:N | Yes | Dated source event | Source values remain read-only. |
| Legal Entity | Bank Account | 1:N | Yes | Stable/effective | A bank account belongs to one Legal Entity. |
| Bank Transaction | Bank Allocation | 1:N | Yes for assigned rows | Manual operational allocation | One-level split only; allocations must reconcile to source amount. |
| Reporting Month | Bank Allocation | 1:N | Yes for budget reporting | Business/Budget Month | Separate from transaction date and Calendar Year. |
| Daycare / Unit | Bank Allocation | 1:N | Optional by action type | Monthly allocation | Income/expense may be assigned to Daycare or other approved unit. |
| Budget Category | Bank Allocation | 1:N | Required for budget-relevant rows | Monthly allocation | Excluded/Internal actions follow Handbook rules. |
| Budget Category | Budget Rule | 1:N | Yes | School-Year/effective period | Calculation method and source belong to configuration. |
| Reporting Month | Budget Result | 1:N | Yes | Monthly | Calculated or locked result. |
| Daycare | Budget Result | 1:N | Usually yes | Monthly | Results can also exist at broader scope where Handbook permits. |
| Budget Category | Budget Result | 1:N | Yes | Monthly | Stores approved result or materialized calculation output only when needed. |
| Import Batch | Import Row Result | 1:N | Yes | Immutable event history | Shared technical model for Sheet imports. |
| Import Batch | Source Records | 1:N | Optional by domain | Import event | Source records keep batch traceability. |
| Data Quality Issue | Business Record | N:1 logical reference | Yes | Issue lifecycle | Implement with controlled entity type + record ID, not many domain-specific issue tables. |
| Audit Event | Business Record | N:1 logical reference | Yes | Immutable event history | Shared audit table unless implementation review identifies a concrete limitation. |

## Compactness Decisions

The following are deliberately **not** separate user-facing structures:

- No generic enterprise organization hierarchy is required for v1.
- Daycare is not forced through an `organization_units` subtype model.
- Reference statuses are not automatically separate tables when a small controlled code set is sufficient.
- Google Sheets tabs do not mirror database tables.
- Technical import, audit and issue tables remain hidden from daily work.

## Key Uniqueness Rules

- One `Daycare School Year` per Daycare + School Year.
- One Classroom business code within a Daycare School Year.
- One Classroom Age Group row per Classroom + Age Group.
- One Monthly Enrollment row per Classroom + Reporting Month + Age Group.
- One Payroll source identity per source system + source record key + payroll month.
- One Bank source identity per Bank Account + source transaction key/import fingerprint.
- Bank and Payroll allocation amounts must reconcile to their source records.

## Historical Authority

Where both a current convenience field and an effective-dated history exist, historical reporting uses the effective-dated relationship. Current fields may be materialized only for usability and performance.

## Remaining Design Review Questions

1. Whether Daycare Legal Entity history is needed in v1 immediately or can be activated only if a transfer occurs.
2. Whether a visible Budget tab is required for manual values, or whether Budget remains calculation/reporting only.
3. Whether employee certificates belong solely to Person or, for any exceptional certificate type, to Employment.
4. Exact matching key supplied by the payroll source for stable employee reconciliation.
