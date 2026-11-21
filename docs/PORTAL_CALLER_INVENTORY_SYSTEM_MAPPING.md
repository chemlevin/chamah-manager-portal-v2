# Portal caller inventory — SYSTEM-MAPPING-AND-INGESTION-RECOVERY

| Caller | Surface | Operation / dispatch | Classification | Preview reachability | Safeguard |
|---|---|---|---|---|---|
| `chamah-manager-portal/new/workforce-workbench.js` → `portal-workforce-workbench` | frontend → Edge Function | employee import/save/deactivate/delete; payroll save/import/save-record/delete | legacy direct write | reachable from workforce screens | Edge Function dispatch guard; read-only GET and `preview_import` remain available |
| `chamah-manager-portal/new/bank-workbench*.js` → `portal-bank-workbench` | frontend → Edge Function | bank confirm/manual/save-allocation/delete | legacy direct write / physical delete RPC | reachable from accounting screens | Edge Function dispatch guard; read-only GET remains available |
| `chamah-manager-portal/new/bank-transfer-workbench.js` → `portal-bank-transfer-workbench` | frontend → Edge Function | transfer save/approve/complete/archive/import/attachment upload | legacy direct write/archive | reachable from bank-transfer screen | Edge Function dispatch guard; `attachment_url` read remains available |
| `chamah-manager-portal/new/admin-framework.js` → PostgREST adapter | frontend adapter | generic repository create/update/delete and status toggle | generic legacy direct write/delete | reachable from administration screens | adapter and handlers fail closed before `fetch` |
| `api/mcp.js` supplier tools | API/MCP | supplier create/update/import | legacy direct write | reachable through Director catalog | `LEGACY_MUTATION_BLOCKED` before RPC dispatch |
| `api/mcp.js` payment request tools | API/MCP | payment create/update/import | legacy direct write | reachable through Director catalog | `LEGACY_MUTATION_BLOCKED` before RPC dispatch |
| `api/mcp.js` payment transition | API/MCP | request approval then transition with approval ID | canonical approval-bound | reachable through Director catalog | explicit Director authorization and approval contract |
| `supabase/functions/portal-mcp-server` | Edge Function | canonical MCP delegation | canonical/read-only delegation | deployed Preview function | no generic table-write surface |

No supplier/payment-specific portal Edge Function was present. Direct supplier/payment RPCs remain in the database migration history but are not dispatched by the hardened MCP surface. Existing legacy browser tests that assert successful direct writes are now stale compatibility tests and must not be used as upload readiness evidence.

Manager live verification remains blocked because no authenticated Manager session is available. No test user was created.

## Preview safety classification

- Payroll `preview_import` is ephemeral: it returns a random preview token and prepared rows after read-only employee matching; the function's preview branch performs no write dispatch.
- Bank workbench `preview` performs read-only validation and returns a preview payload; its confirm/import action is blocked.
- Canonical MCP daycare and operational previews are durable staged previews: they insert only into `mcp_ingestion_batches`, return a batch ID, and require a separate Director approval before commit. Their preview functions do not insert business entities, create approvals, or commit data.

## Error/recovery contract

MCP request errors now carry a structured envelope with status, technical code, correlation ID, batch ID, stage, write flag, retry/resume flags, and next action. Timeout/upstream failures are reported as safe retryable or blocked responses. Full portal/Edge Function parity for parser, timeout, read-back, and resume cases remains a blocker.
