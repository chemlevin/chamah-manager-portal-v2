# Relationship Matrix

Status: Schema Freeze v1.

Last updated: 2026-07-13

## Purpose

This document summarizes the kept Schema Freeze v1 relationships.

## Matrix

| From | To | Relationship | Status |
|---|---|---|---|
| School Year | Daycare School Year | one-to-many | Frozen v1 |
| Calendar Year | Bank Transaction | one-to-many by transaction date | Frozen v1 |
| Legal Entity Type | Legal Entity | one-to-many | Frozen v1 |
| Legal Entity | Bank Account | one-to-many | Frozen v1 |
| Legal Entity | Daycare | one-to-many/current ownership | Frozen v1 |
| Allocation Unit | Daycare | one-to-one for daycare units | Frozen v1 |
| Allocation Unit | Bank Allocation | one-to-many authoritative target | Frozen v1 |
| Allocation Unit | Payroll Allocation Row | one-to-many authoritative target | Frozen v1 |
| Daycare | Classroom | one-to-many through daycare school year | Frozen v1 |
| Daycare | Employee Assignment | one-to-many current/effective assignment | Frozen v1 |
| Budget Category | Budget Rule | one-to-many by period/effective dates | Frozen v1 |
| Budget Category | Budget Snapshot | one-to-many immutable locked results | Frozen v1 |
| Bank Transaction | Bank Allocation | one-to-many | Frozen v1 |
| Payroll Record | Payroll Allocation Row | one-to-many | Frozen v1 |
| Import Batch | Import Row | one-to-many | Frozen v1 |
| Import Batch | Bank/Payroll source rows | one-to-many | Frozen v1 |
| Data Quality Issue | Source Entity | polymorphic/reference | Frozen v1 |
| Audit Event | Source Entity | polymorphic/reference | Frozen v1 |

## Open Questions

- API/auth policy relationships are deferred.
- Historical Legal Entity ownership expansion is deferred.
