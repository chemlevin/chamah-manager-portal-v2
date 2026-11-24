# CHAMAH Production Schema Baseline

**Status:** NON_EXECUTABLE / documentation-only
**Capture date:** 2026-11-24 (Asia/Jerusalem)
**Production project:** `vyyfuaqmbxvfqgbfqooc`
**Canonical MCP:** `https://chamah-portal.vercel.app/api/mcp`
**Canonical branch:** `codex/oauth-canonical-host`
**Verified deployment commit:** `51dc306ad122eecdf5fba89c07e6c0f2038d80e7` (last Production deployment with verifiable Git metadata)

## Scope and safety

This artifact is a read-only source-of-truth record. It contains no executable SQL, migration, deployment instruction, or data mutation.

No business data was modified while capturing this baseline.

## Verified governed pipeline

`Source ingestion → lineage → stable-key reconciliation → Preview → reconciliation → approval eligibility → Director approval → Commit → read-back → audit/lifecycle history`

The governed operational batch contract tracks task/correlation/operation identifiers, batch ID, digest, source provenance, idempotency, row versions, approval state, commit result, lineage, audit, lifecycle history, discrepancies, and protected-count checks.

Approval is fail-closed when source provenance, required lineage, stable identity, or conflict checks are incomplete.

## Relevant Production objects

Core operational objects verified through the applied migration history include:

- `mcp_ingestion_batches`: staged rows, Preview, digest, source provenance, status, approval, commit result, row version.
- `canonical_source_batches`: verified source-batch registry.
- `operational_period_relationship_facts`: period-scoped relationship facts with stable keys, rule/version, source batch, source record, source system, source lineage, original payload, effective period, and evidence.
- `operational_relationship_rules`: active versioned relationship rules.
- `metadata_lineage_reconciliation_operations`: task/operation tracking for metadata-only lineage reconciliation.
- `operational_batch_lifecycle_history`: append-only batch lifecycle transitions.
- `audit_events`: append-only operation/audit evidence.
- `portal_authorization_audit`: approval and authorization evidence.
- `daycare_billing_records`: canonical billing source records.
- `children`, `child_enrollments`, `employees`, payroll, budget, banking, supplier, occupancy, and collection entities governed through the generic operational catalog.

## Active relationship and age-group contracts

- `CHILD_BILLED_AT_DAYCARE_MONTH@1.0.0`
  - Evidence: `CANONICAL_BILLING_RECORD`
  - Stable relationship key: relationship type + child + daycare + reporting month
  - Enrollment is not asserted.
- `CHILD_AGE_GROUP_SOURCE_TRANSLATION@1.0.0`
  - `פעוט` → `TODDLER`
  - `תינוק` → `INFANT`
  - `בוגר` → `PRESCHOOL`
- `CHILD_AGE_GROUP_PERIOD@1.0.0`
  - Director-supplied child national-ID mappings, effective for the 2026-09-01 through 2026-10-31 reporting period.

## Active MCP/RPC governance surface

Production MCP handlers include profile/authentication, operational catalog, source and record reads, bounded batch status/page reads, generic operational Preview, approval, Commit, read-back, and lineage-reconciliation Preview/approval/Commit handlers.

Relevant RPC families include:

- `portal_mcp_preview_operational_changes`
- `portal_mcp_request_operational_approval`
- `portal_mcp_commit_operational_changes`
- `portal_mcp_get_operational_batch`
- `portal_mcp_get_operational_batch_status`
- `portal_mcp_get_operational_batch_page`
- `portal_mcp_preview_lineage_reconciliation`
- `portal_mcp_request_lineage_reconciliation_approval`
- `portal_mcp_commit_lineage_reconciliation`

## Applied Production migration history

The Production migration registry includes the relationship/lineage sequence through:

- `20261124130018_production_lineage_reconciliation_rpc`
- `20261124135122_lineage_preview_audit_contract`
- `20261124143456_billing_relationship_governed_workflow`
- `20261124143533_billing_relationship_preview_classification`
- `20261124145207_billing_relationship_commit_approval_namespace`
- `20261124145404_billing_relationship_commit_payload_binding`
- `20261124153914_billing_relationship_json_typed_commit`
- `20261124155850` (historical source gap)
- `20261124155958` (historical source gap)

Earlier applied operational, provenance, batch, approval, audit, lifecycle, exception, payroll, banking, budget, supplier, and occupancy migrations remain recorded in the Production registry.

## Historical source gaps

The exact SQL bodies for these already-applied Production migrations were not found in repository history, Git objects/reflogs, deployment source, or permitted workspace artifacts:

- Production migration `20261124155850`
- Production migration `20261124155958`

Their SQL is intentionally not recreated, inferred, renamed, or re-applied.

## Available migration-file hashes

SHA-256 hashes are available for migration files present in the repository workspace. The two historical source-gap migrations have no hash because their exact SQL files are unavailable. A complete hash manifest must therefore be treated as incomplete until those source artifacts are recovered.

## Verification record

- Production project ID verified: `vyyfuaqmbxvfqgbfqooc`
- Production deployment state verified: `READY`
- Canonical Production MCP profile previously verified: `DIRECTOR`
- Applied migration registry read from Production.
- Current billing Preview was not modified, approved, or committed during this capture.

**Baseline status:** READABLE, NON_EXECUTABLE, source-artifact gaps explicitly preserved.

