# Entity Inventory

Status: Schema Freeze v1 inventory.

Last updated: 2026-07-13

## Purpose

This document lists the entities kept in Schema Freeze v1.

## Inventory

| Entity | Status | Notes |
|---|---|---|
| School Year | Frozen v1 | Existing table kept. |
| Calendar Year | Frozen v1 | Existing table kept; supports multiple OPEN years. |
| Legal Entity Type | Frozen v1 | Existing table kept. |
| Legal Entity | Frozen v1 | Existing table kept. |
| Allocation Unit | Frozen v1 | Flat v1 allocation/reporting target; no hierarchy. |
| Daycare | Frozen v1 | Existing table kept and linked to one allocation unit. |
| Classroom | Frozen v1 | Existing table kept. |
| Employee | Frozen v1 | Existing table kept. |
| Employee Certificate | Frozen v1 | Existing table kept. |
| Compensation Factor | Frozen v1 | Existing table kept. |
| Budget Category | Frozen v1 | Corrected category types in Migration 011. |
| Budget Rule | Frozen v1 | Compact rule model corrected in Migration 011. |
| Budget Snapshot | Frozen v1 | Immutable locked snapshot only. |
| Bank Account | Frozen v1 | Existing table kept. |
| Bank Transaction | Frozen v1 | Debit/credit/amount source model corrected in Migration 011. |
| Bank Allocation | Frozen v1 | Allocation target and accounting statuses corrected in Migration 011. |
| Payroll Record | Frozen v1 | Existing source table kept. |
| Payroll Allocation Row | Frozen v1 | Reconciliation and target contracts corrected in Migration 011. |
| Data Quality Issue | Frozen v1 | Approved Ignore metadata corrected in Migration 011. |
| Import Batch | Frozen v1 | Existing table kept. |
| Import Row | Frozen v1 | Existing table kept. |
| Audit Event | Frozen v1 | Existing shared audit table kept. |

## Status Meaning

- Frozen v1: kept as part of Database Structure Freeze v1.
