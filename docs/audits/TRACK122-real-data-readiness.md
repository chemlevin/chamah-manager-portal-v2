# TRACK122 — Real Data Readiness

Date: 2026-11-12

Status: STOPPED at the Production Readiness Gate. No Production resource was changed.

## Reconciliation evidence

- Preview Supabase: `iwsbjudahtjyigecymzd`; migrations are applied through the TRACK120 operational delivery and repair migrations.
- Preview contains canonical tables for employees, employments, assignments, certificates, payroll, banking, budgets, suppliers, payments, reconciliation, policies, import batches/rows, audit, and data quality.
- Latest verified Preview deployment: `dpl_Gyhs1yJzgwDVA3LzHAZxdw8c3ZyE`, READY, commit `ef2f5b55a0119fa2db6e5c59dab987faeac779e0`.
- MCP source contains the 43-tool surface, including `search_operational_records`, `get_operational_record`, and `operational_report`. Actual Director OAuth/schema acceptance is recorded as PASS in the project log.
- Preview currently contains synthetic acceptance data only. No real organizational data was ingested.

## Domain assessment

| Domain | Status | Exact remaining gap |
|---|---|---|
| Workforce / profiles / assignments | PARTIAL | Canonical tables and Director read-back/import flow exist, but real-data mapping for employment periods, assignments, pay terms, leave, and organization-specific identifiers still requires a signed mapping profile and synthetic acceptance per source format. |
| Payroll / salary history | PARTIAL | Payroll tables and lifecycle exist, but the real source contract, historical-period mapping, correction policy, and acceptance fixtures are not yet approved. |
| Certificates | PARTIAL | Certificate types and employee certificate tables exist; real certificate document/expiry mapping and source validation fixture are missing. |
| Children / enrollment | BLOCKED | `monthly_enrollment` is aggregate classroom/age-group data; no canonical person-level child identity/enrollment model is present. |
| Billing / collections | BLOCKED | No canonical billing/collections tables or MCP domain contract were verified. |
| Suppliers / payments | READY | Canonical supplier/payment/attachment/reconciliation tables, MCP tools, approval gates, idempotency, audit, and synthetic Preview coverage exist. Real-data readiness still requires source mapping and a dry-run fixture. |
| Banking / reconciliation | READY | Bank accounts, immutable transactions, allocations, transfer workflow, reconciliation jobs/matches, and MCP tools exist. Real bank ingestion remains Preview-only until source-format mapping and account ownership are approved. |
| Budgets / configuration | PARTIAL | Budget categories/rules, compensation, staffing, licensing, calendars, and snapshots exist, but no verified real-source mapping/approval contract for configuration import was completed. |
| Policies / documents | PARTIAL | Published policy read, draft/approval/archive, and private attachment flows exist. Real document corpus ingestion needs classification, retention, versioning, and access decisions. |

## Target ingestion flow

The existing approval-bound flow is ready for supported canonical entities: source data → mapping → canonical validation → duplicate/conflict detection → `CREATE`/`UPDATE`/`UNCHANGED`/`CONFLICT`/`INVALID` → Preview → Director approval → atomic commit → read-back/audit. Unsupported domains must remain blocked rather than being forced into an unrelated entity.

## Production changes required later

None were applied. Before Production, obtain explicit approval for the exact migration/configuration plan, Production environment variables and MCP deployment, source mapping profiles, real-data retention/privacy rules, and any domain-specific schema or business-rule additions. Production migration and MCP changes must be deployed and verified together.

## Rollback plan

Stop before commit for any preview conflict or validation failure. For approved Preview changes, preserve audit evidence and apply a reviewed compensating correction rather than deleting source history. Production rollback requires a separately approved deployment rollback plus any matching forward database correction.

## Director Decision Register

1. Is aggregate monthly enrollment sufficient, or is person-level child identity/enrollment required?
2. What billing/collections source, lifecycle, and reconciliation semantics are in scope?
3. Which source formats and identifier mappings are authoritative for workforce, payroll history, certificates, budgets, suppliers, banking, and policies?
4. Should certificate/policy/payment source files be retained, and what retention/access rules apply?

