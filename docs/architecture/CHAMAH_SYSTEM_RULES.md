# CHAMAH System Rules

Status: Authoritative

This document defines permanent architecture and data-governance rules. `AGENTS.md` remains the mandatory root rule set; `CHANGE_CONTROL.md` defines procedures; `CHAMAH_RUNTIME_REGISTRY.md` is the sole current runtime-identity registry.

## Authority and environments

- Verified runtime evidence is authoritative for describing deployed state.
- Approved governance rules are authoritative for what Codex may do. Runtime behavior never justifies bypassing governance.
- Current runtime identities are read only from `docs/architecture/CHAMAH_RUNTIME_REGISTRY.md`; other documents must not duplicate or override them.
- Code Preview verifies code and deployments and must not use Production business data.
- Business-data Preview is for isolated business-data testing and must use non-Production data.
- Production is the live business environment.
- A Supabase project must not be classified as both Code Preview and Business-data Preview unless isolation is explicitly proven in the runtime registry. Until then, Business-data Preview is `BLOCKED` and business-data ingestion is prohibited.

## Fail-closed operation

If environment identity, deployment SHA, schema version, MCP contract, authorization, target scope, approval, or source lineage is ambiguous, contradictory, unavailable, or stale: stop; do not guess, continue, or write partial data.

## Git and business-data controls

Codex and system workflows must not automatically create Git branches, Git worktrees, commits, merges, releases, daycares, children, employees, suppliers, bank accounts, classrooms, legal entities, payment counterparties, or any other master entity. Unknown, unmatched, duplicate, or ambiguous items become review, conflict, discrepancy, or quarantine items.

No business-data write may occur through MCP, API, Edge Function, browser, SQL, Supabase client, script, job, or any other path unless it uses authorization, provenance, preview, reconciliation, approval, atomic commit, read-back, and audit.

## Canonical ingestion

```text
source capture → parser → normalization → stable-identifier matching → conflict detection → preview → reconciliation → Director approval → atomic commit → persisted read-back → audit and lineage
```

Stable identifiers and deterministic normalization are mandatory where available. Ambiguous or unmatched items cannot be committed as new master entities.

## History and deletion

Business records are archive-first. No reset, clear, truncate, bulk delete, or broad archive is allowed without explicit authorization, exact target scope, protected-count verification, recovery plan, audit, and post-action read-back. Physical deletion requires a separately approved retention policy. Reports, cards, approvals, lineage, source evidence, reconciliation records, and audit records must be preserved.

## Lineage and reliability

Imported and corrected records must retain applicable source, file/digest, row/external ID, batch, parser/normalization version, matching decision, actor, role, request/correlation ID, approval, deployment, correction reason, and historical impact.

Every mutation must define idempotency, versioning, timeout, retry, resume, partial-failure, oversized-file, and read-back behavior. A timeout requires status/read-back before retry. Large imports require persistent status, bounded batches, resumable cursors, and durable recovery.

## MCP separation and validation

Operational MCP controls operational workflows; Analytical MCP is reporting-only; Manager MCP is read-only and institution-scoped. Catalogs, origins, credentials, and authorization checks must prevent privilege confusion.

Before Production, Code Preview must be verified, Business-data Preview must be `VERIFIED` for ingestion claims, focused governance/security/domain tests must pass, dependencies must be complete, deployment SHA and alias must be verified, authenticated smoke checks must pass, and rollback/recovery must be documented.

Business decisions remain required for the approved Business-data Preview project, legacy writable paths, master-data creation workflows, retention/deletion, limits, historical restatement, TAMA Production approval, and physical MCP separation.
