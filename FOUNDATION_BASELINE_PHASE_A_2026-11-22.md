# FOUNDATION-RECOVERY — Phase A Baseline

Status: PARTIAL — repository baseline committed; live identity/count evidence remains blocked where it could not be freshly read.

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

Result: **PARTIAL**, not PASS. The repository baseline and local inventories are recorded, but live deployment, database, RLS/policy, protected-count, and current runtime evidence are not available in this session. Phase B must not start automatically until these blockers are accepted or resolved through read-only evidence.

Smallest next action: obtain read-only access to the existing Vercel and Supabase runtime catalogs, then append exact deployment, migration-head, RLS/policy, Edge Function, MCP metadata, and protected-count evidence without changing state.
