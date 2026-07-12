# Relationship Matrix

Status: Draft architecture.

Last updated: 2026-07-12

## Purpose

This document summarizes expected relationships between identified entities.

## Matrix

| From | To | Relationship | Status |
|---|---|---|---|
| School Year | School Year Configuration | one-to-many | Planned |
| Calendar Year | Bank Transaction | one-to-many by transaction date | Planned |
| Legal Entity Type | Legal Entity | one-to-many | Planned |
| Legal Entity | Bank Account | one-to-many | Planned |
| Legal Entity | Daycare | one-to-many/current ownership | Planned |
| Organization Unit | Organization Unit | parent-child hierarchy | Planned |
| Organization Unit | Daycare | one-to-many or one-to-one depending design | Planned |
| Daycare | Classroom | one-to-many | Planned |
| Daycare | Employee | one-to-many current assignment | Planned |
| Daycare | Payroll Allocation Row | one-to-many | Planned |
| Daycare | Bank Allocation | one-to-many | Planned |
| Budget Category | Budget Setting | one-to-many by SY/effective period | Planned |
| Budget Category | Budget Exception | one-to-many | Planned |
| Bank Transaction | Bank Allocation | one-to-many | Planned |
| Payroll Record | Payroll Allocation Row | one-to-many | Planned |
| Data Quality Issue | Source Entity | polymorphic/reference | Planned |
| Import Batch | Imported Rows | one-to-many | Planned |

## Open Questions

- Whether Daycare is a subtype of Organization Unit or linked one-to-one.
- Whether historical Legal Entity ownership requires a separate effective-dated relationship table.
- Whether audit events use polymorphic references or table-specific audit tables.

