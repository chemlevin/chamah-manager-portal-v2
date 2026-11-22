# TRACK153 — Chamah Operational Workspace

Status: Implementation complete for local/Preview-gated validation; Production promotion not authorized.

## Decision

- Reuse the existing `portal_mcp_*` read RPCs and the versioned `portal_mcp_preview_operational_changes` staging RPC.
- Store staged batches in the existing `mcp_ingestion_batches` model so Business MCP can read the same `batch_id` and digest.
- Keep approval and commit exclusively on Business MCP; the personal endpoint has no approval/commit catalog entries and rejects those names before RPC dispatch.
- Flexible JSON source inspection and reconciliation preserve source rows, unknown fields, row numbers, and explicit unresolved outcomes. Parser adapters for binary Excel/PDF are not introduced without an approved isolated ingestion runtime.
- No schema migration is required for this additive surface.

## Safety boundary

The current runtime registry marks the configured Preview Supabase isolation as BLOCKED. Therefore this change is locally testable but must not perform live Preview staging writes or claim a real connector pass until the isolation boundary and authenticated Preview runtime are independently verified.

## TRACK
TRACK: TRACK153
Status: IMPLEMENTED — PREVIEW BLOCKED
Summary: Added the Chamah Operational Workspace personal MCP endpoint, metadata route, closed staging-only catalog, flexible source inspection/reconciliation, shared batch readback, and explicit forbidden-mutation rejection.
Root cause: Existing analytical MCP was read-only and existing Business MCP combined read, approval, and commit; no personal staging-only surface existed.
Files changed: `api/mcp-operational-workspace.js`, `api/mcp-operational-workspace-metadata.js`, `vercel.json`, this document, focused tests.
Database changes: None.
Migrations: None.
Edge Functions: None.
Tests: Node syntax, MCP contract, focused Operational Workspace contract tests, build, migration preflight, diff check.
Production impact: None; no Production deployment or data write.
Commit SHA: `a4d4149` (full SHA recorded in final report).
Branch: `codex/oauth-canonical-host` (existing temporary working branch; unrelated dirty files preserved).
Preview URL: Not deployed; registry blocks live ingestion verification.
Production URL (if deployed): None.
Blockers: Preview Supabase isolation and authenticated connector/OAuth flow are not independently verified; Production promotion requires explicit Director approval.
Next recommended TRACK: Verify isolated Business-data Preview mapping, deploy exact commit to existing Preview, then run authenticated OAuth and staging/readback smoke tests.
