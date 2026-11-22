# FOUNDATION-RECOVERY — Phase A Baseline

Status: PARTIAL — repository baseline plus fresh live evidence committed; Vercel alias/catalog reconciliation and a few live contract checks remain blocked.

Timestamp: 2026-11-22 (Asia/Jerusalem; session date; exact wall-clock time intentionally not relied upon)
Branch: `codex/tmp-system-mapping-ingestion-recovery`
Commit at capture: `fb45c1f681da21d4e4a536d4101c392b2e22d2b4`
New branch created: No
Business-data change: None observed or authorized

## Verified facts

| Fact | Evidence |
|---|---|
| Required branch is checked out | `git status --short --branch`, `git branch --show-current` |
| Worktree is clean before this artifact | Git status at baseline capture; artifact is the only intentional change |
| Production identity | `docs/architecture/CHAMAH_RUNTIME_REGISTRY.md`: canonical URL, Vercel project `prj_6IND7ee2E9s3KispBh6iBDWwQo6X`, Supabase project `vyyfuaqmbxvfqgbfqooc` |
| Preview identity | `docs/architecture/CHAMAH_RUNTIME_REGISTRY.md`: canonical URL, Vercel project `prj_TLJVhQfA8oTkM5MCqfehqmBfVGwy`, Supabase project `iwsbjudahtjyigecymzd` |
| Local migration ordering | `npm run migration:preflight`: 118 ordered local migrations |
| Local schema inventory | Read-only migration scan: 86 unique `public` table declarations |
| Local Edge Function inventory | 9 source directories: portal-bank-transfer-workbench, portal-bank-workbench, portal-mcp-readonly, portal-mcp-server, portal-oauth-callback-relay, portal-runtime-config, portal-settings, portal-users, portal-workforce-workbench |
| MCP implementation exists | `api/mcp.js`, `supabase/functions/portal-mcp-server/index.ts`, `docs/operating-system/mcp-contract-policy.json` |
| MCP surface boundary | Runtime registry: Business MCP existing; Analytical MCP and Manager Read-only MCP future/not implemented |
| Governance files exist | `AGENTS.md`, `docs/architecture/CHAMAH_SYSTEM_RULES.md`, `CHANGE_CONTROL.md`, `CHAMAH_RUNTIME_REGISTRY.md`, and source-of-truth documents |

## Unknown or blocked live facts

| Fact | State and evidence |
|---|---|
| Current Vercel deployment IDs, source commits, and canonical alias resolution | UNKNOWN: no fresh Vercel inspection was performed in this Phase A session; historical `PROJECT_LOG.md` entries are not current runtime authority |
| Current Preview deployment commit | UNKNOWN: registry requires exact deployment evidence; no deployment was made by this task |
| Remote Production/Preview migration heads and manifest diff | BLOCKED: local preflight is not remote read-back; no migration or database write was authorized |
| Public table counts, RLS status, policies, relevant RPC signatures, protected counts, batches, approvals, audits, and domain row counts | BLOCKED/UNKNOWN: no live database catalog or business-data query was executed |
| Current deployed Edge Function versions/hashes | UNKNOWN: local source inventory is verified; deployed versions were not freshly queried |
| Current OAuth issuer, runtime environment variables, MCP origin, and protected-resource metadata | UNKNOWN live state: registry records identities; no deployment/runtime probe was run |
| Authentication and role counts | UNKNOWN live state: source contracts and migrations are present; no Auth/profile query or permission change was performed |
| Production/Preview separation | VERIFIED at configured project-identity level by registry; fresh live cross-check remains BLOCKED |

## Environment separation

- Site/deployment Preview: `https://chamah-director-preview.vercel.app` and its Vercel/Supabase identities above.
- Business-data Preview batch: durable staged batches created by canonical preview tools; none was created in this Phase A session.
- Production business data: canonical Production identity above; no query or write was performed in this Phase A session.

## No-change confirmation

No application code, migration, database schema, business row, batch, approval, audit row, user, permission, deployment, Edge Function, alias, or connector was changed. This artifact is documentation-only and is the sole intentional Phase A change.

## Phase A gate

Result: **PARTIAL**, not PASS. Fresh live evidence is recorded below, but Vercel domain ownership cannot be reconciled with the available Vercel scope, the Production Business connector returns connector-side internal errors for all requested read-only calls, and live RPC differences remain. Phase B must not start automatically.

## Fresh live evidence — 2026-11-22

Evidence sources: authenticated Vercel MCP deployment/domain/environment reads; authenticated Supabase MCP project/migration/table/function reads and aggregate read-only SQL; Vercel protected URL fetches of the two canonical origins.

### Runtime and deployment

| Environment | Serving deployment | Serving marker | Runtime result |
|---|---|---|---|
| Production | `dpl_AJRcm7soRUiqmU8FDrV3xCW4dTSy` | `4833ad5d1725e1442d9f69304cf51744885a46b2` | `/api/runtime-health` HTTP 200; environment true; resource `https://chamah-portal.vercel.app/api/mcp` |
| Preview | `dpl_BUi5CbfwseSNo1Ugb2Usjpa6A2fj` | `d51d9321d3fdb747d9a8cb8a569088eb1a7f8db6` | `/api/runtime-health` HTTP 200; environment true; resource `https://chamah-director-preview.vercel.app/api/mcp` |

Both canonical MCP endpoints returned HTTP 405 to unauthenticated GET with `Allow: POST, OPTIONS` and a bearer challenge referencing their own protected-resource metadata. Protected-resource metadata returned HTTP 200 and the correct environment-specific OAuth issuer:

- Production issuer: `https://vyyfuaqmbxvfqgbfqooc.supabase.co/auth/v1`
- Preview issuer: `https://iwsbjudahtjyigecymzd.supabase.co/auth/v1`

The Vercel project-domain catalog verified `chamah-director-preview.vercel.app` on the Preview project. The Production project-domain catalog did not return `chamah-portal.vercel.app`; `get_deployment` for the serving Production deployment reported alias `chamah-manager-portal-v2-preview.vercel.app`. This conflicts with the canonical Production HTTP runtime result and is a live alias/catalog blocker requiring owner-side reconciliation.

Environment-variable inspection used `decrypt=false` and recorded names/targets only. Production project contains the expected production keys (`CHAMAH_ENVIRONMENT`, `CHAMAH_BUILD_COMMIT`, `CHAMAH_SUPABASE_PROJECT_ID`, `CHAMAH_PORTAL_ORIGIN`, `CHAMAH_MCP_ORIGIN`, `CHAMAH_OAUTH_ISSUER`, `CHAMAH_SUPABASE_URL`, `CHAMAH_SUPABASE_PUBLISHABLE_KEY`) plus historical Preview-target branch entries. Preview project contains the expected Preview keys and also production-target definitions. Values were not recorded.

### Supabase runtime catalogs

| Environment | Status / engine | Migration head | Public tables | RLS disabled | Aggregate rows |
|---|---|---|---:|---:|---:|
| Production | `ACTIVE_HEALTHY`, PostgreSQL 17 | `20261119144502 track137_bounded_operational_readback` | 87 | 0 | 8,532 |
| Preview | `ACTIVE_HEALTHY`, PostgreSQL 17 | `20261120041628 track152_bounded_operational_batch_readback` | 85 | 0 | 320 |

Policy counts from `pg_policies`: Production 53; Preview 52. All returned public tables reported `rls_enabled=true`.

Aggregate protected/workflow counts:

- Production: `mcp_ingestion_batches` 179 (`COMMITTED` 80, `CONFLICTS` 32, `READY` 67); approvals 125; business audit events 3,983; authorization audit 288; request-origin audit 40. Key domain counts: children 425, employees 144, employments 134, payroll records 264, daycares 7, suppliers 0, payment requests 0, collection receipts 766, government funding records 476, child discrepancies 257.
- Preview: `mcp_ingestion_batches` 43 (`COMMITTED` 15, `CONFLICTS` 5, `READY` 23); approvals 32; business audit events 22; authorization audit 44. Key domain counts: children 1, employees 1, employments 0, payroll records 0, daycares 8, suppliers 1, payment requests 0, collection receipts 1, government funding records 0, child discrepancies 0.

Relevant live RPC inventory includes operational catalog/preview/request-approval/commit/read-back/status/search/report functions, daycare import preview/approval/commit, authorization introspection, employee/supplier/payment adapters, and reconciliation functions. Production retains overloaded legacy and versioned signatures; Preview exposes the same families with the bounded batch-page/status additions. Exact signatures are in the read-only SQL evidence captured for this baseline; no RPC was invoked mutatively.

### Edge Functions

Production: 9 functions, all ACTIVE: `portal-bank-workbench` v20, `portal-bank-transfer-workbench` v6, `portal-settings` v4, `portal-mcp-readonly` v2, `portal-workforce-workbench` v25, `portal-mcp-server` v2, `portal-oauth-callback-relay` v3 (JWT verification disabled), `portal-runtime-config` v3, `portal-users` v9. Hashes were returned by the authenticated function catalog and are preserved in session evidence, not secrets.

Preview: 9 functions, all ACTIVE: `portal-workforce-workbench` v2, `portal-settings` v1, `portal-mcp-server` v1, `portal-mcp-readonly` v1, `portal-oauth-callback-relay` v1 (JWT verification disabled), `portal-bank-transfer-workbench` v2, `portal-bank-workbench` v2, `portal-users` v1, `portal-runtime-config` v1. Preview bank/workforce/transfer hashes match the previously recorded recovery evidence.

### Cross-environment result

Fresh runtime health, protected-resource metadata, OAuth issuer, and Supabase project identities are correctly separated: Production points to `vyyfuaqmbxvfqgbfqooc`; Preview points to `iwsbjudahtjyigecymzd`. No cross-environment leakage was observed in these checks. The Vercel alias/catalog inconsistency remains unexplained.

Smallest next action: obtain a read-only Vercel domain/alias reconciliation for `chamah-portal.vercel.app` and a supported authenticated Director MCP read-only call on Preview and Production, then update this baseline without changing runtime state.

## Phase A continuation — fresh reconciliation

### Vercel Production domain conclusion

Read-only Vercel evidence:

- Canonical Production runtime-health returned HTTP 200 and identified serving deployment `dpl_AJRcm7soRUiqmU8FDrV3xCW4dTSy` with build marker `4833ad5d1725e1442d9f69304cf51744885a46b2`.
- `get_deployment` confirmed that deployment is READY, target `production`, and owned by project `prj_6IND7ee2E9s3KispBh6iBDWwQo6X`.
- `list_project_domains` for the Production project returned only `chamah-manager-portal-v2-preview.vercel.app`, not `chamah-portal.vercel.app`.
- `get_deployment` reported alias `chamah-manager-portal-v2-preview.vercel.app` for the serving Production deployment.
- `get_domain` for both requested domains returned HTTP 403 from the connected Vercel scope, so authoritative domain-owner lookup was unavailable.

Conclusion: the canonical Production URL demonstrably serves the Production project/deployment, so real HTTP misrouting is not proven. Ownership and alias attachment cannot be reconciled from the available Vercel API scope. The Preview-named alias and missing Production project-domain entry remain an unexplained catalog/ownership mismatch; no alias change was made.

### Authenticated Production Business MCP

Using only the existing `Chamah Daycare Production` connector:

| Call | Result |
|---|---|
| `get_profile` | BLOCKED: connector error `-32603 Internal error` |
| `list_daycares` | BLOCKED: connector error `-32603 Internal error` |
| `list_policies` | BLOCKED: connector error `-32603 Internal error` |
| bounded staff/daycare read | Not attempted because no daycare ID could be obtained |

No authenticated identity, role classification, or connector-level endpoint confirmation was returned. No initialize/tools/list protocol calls were fabricated. No mutation-capable tool was called.

### Live RPC reconciliation

Evidence source: read-only `pg_proc`, `pg_get_function_identity_arguments`, `pg_get_function_result`, `prosecdef`, and `has_function_privilege` queries against both Supabase projects; repository definitions in `api/mcp.js`, `supabase/functions/portal-mcp-server/index.ts`, and `supabase/migrations/`.

| Capability | Production | Preview | Impact |
|---|---|---|---|
| Authorization/profile | `portal_my_authorization()` → `jsonb`; authenticated EXECUTE; SECURITY DEFINER | Same | Aligned |
| Daycare/policy/staff reads | `portal_mcp_list_daycares()`, `portal_mcp_list_policies(text)`, `portal_mcp_staff_by_daycare(uuid)`; table returns; authenticated EXECUTE; SECURITY DEFINER | Same | Aligned |
| Operational preview/approval | Contract-versioned and legacy overloads; authenticated EXECUTE; SECURITY DEFINER | Same | Compatibility overlap |
| Operational commit | Legacy overloads plus `portal_mcp_commit_operational_changes_v1(uuid,uuid,text)` | Legacy overloads; no v1 wrapper returned | Preview lacks the Production versioned wrapper |
| Daycare commit | Present; SECURITY DEFINER | Present; SECURITY DEFINER | Aligned |
| Batch read-back | `get_operational_batch(uuid)` plus offset/limit page function | Same plus cursor/detail-type page function and `get_operational_batch_status(uuid)` | Preview has newer bounded recovery/read-back contract |
| Request-origin audit | `portal_mcp_record_request_origin(jsonb)` present | Not returned by live routine inventory | Production has an audit adapter absent from Preview |
| Anonymous access | `anon` EXECUTE false for inspected routines | `anon` EXECUTE false for inspected routines | Aligned |

Both environments expose the core read/preview/approval/commit families, but their live signatures and grants are not identical. Production has the versioned commit wrapper and request-origin audit routine; Preview has the newer bounded status/cursor read-back functions. This release-matrix mismatch blocks Phase A PASS until explicitly reconciled through an authorized future change. No migration was applied.

### No-change confirmation

This continuation changed no code, database, migration, deployment, alias, domain, environment variable, user, permission, connector, or business data. Only this baseline document was updated.
