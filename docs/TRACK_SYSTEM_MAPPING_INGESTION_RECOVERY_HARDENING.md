# SYSTEM-MAPPING-AND-INGESTION-RECOVERY — Hardening update

Status: Partially completed in isolated Preview work.

## Hardened paths

- `api/mcp.js`: Director-resolved legacy mutation names now fail closed with `LEGACY_MUTATION_BLOCKED` before RPC selection or dispatch. The response includes status, technical code, correlation ID, stage, processed/unprocessed counts, write flag, retry/resume flags, and next action. Manager tool discovery remains closed and read-only.
- `supabase/functions/portal-bank-workbench/index.ts`: `confirm_import`, `create_manual_transaction`, `save_allocations`, and `delete_transactions` now fail closed before database dispatch.
- `supabase/functions/portal-workforce-workbench/index.ts`: employee and payroll mutation actions now fail closed before database dispatch. Read-only GETs and payroll `preview_import` remain available for review only.
- `chamah-manager-portal/new/admin-framework.js`: generic direct-delete hook is blocked and directs the user to approved archive flow.

## Compatibility classification

These are deliberate safety blocks for legacy paths. They do not delete data, archive data, create entities, or change database behavior. Canonical operational MCP preview/approval/commit tools remain the intended mutation route.

Supplier/payment portal-specific mutation adapters and domain RPCs remain classified as legacy/direct-write until they are migrated or independently proven against the canonical batch contract. No Production Edge Function was deployed.

## Verification

Passed: focused MCP/role/diagnostic/read-only/runtime tests (24/24), new legacy-guard tests, MCP contract check, JavaScript syntax checks, and diff check. Browser admin-framework execution was attempted but did not complete within the available command window; no live business flow was exercised.

No real business data, approvals, commits, imports, database writes, migrations, permission changes, user changes, or Production changes occurred.
