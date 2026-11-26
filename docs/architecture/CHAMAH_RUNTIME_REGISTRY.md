# CHAMAH Runtime Registry

Status: Authoritative

This is the only authoritative current-runtime identity registry. All other documents must refer to it and must not duplicate or override its values.

Status values: `VERIFIED`, `UNKNOWN`, `BLOCKED`, `STALE`.

Verification date for current entries below: `2026-11-25`.

## Repository

| Field | Value | Status | Evidence |
|---|---|---|---|
| Active branch | `codex/chamah-calculation-rules-foundation-git-001` | VERIFIED | Git inspection and GitHub push, 2026-11-25 |
| Active implementation commit | `c5816d1` plus exact Production migration filename reconciliation pending completion commit | VERIFIED | Git inspection, GitHub push and Production schema read-back, 2026-11-26 |
| Working tree | Completion evidence and migration filename reconciliation pending commit | VERIFIED | Git inspection, 2026-11-26 |

## Production

| Field | Value | Status | Evidence |
|---|---|---|---|
| Vercel project | `chamah-portal` | VERIFIED | Vercel read-only evidence, 2026-11-21 |
| Vercel project ID | `prj_6IND7ee2E9s3KispBh6iBDWwQo6X` | VERIFIED | Vercel read-only evidence, 2026-11-21 |
| Canonical alias | `https://chamah-portal.vercel.app` | VERIFIED | Vercel read-only evidence, 2026-11-21 |
| READY deployment | `dpl_FUAe5hgwMhYx4ADEajqqUxSi5Kjn` | VERIFIED | Canonical runtime health read-back, 2026-11-25 |
| Serving deployment SHA | `e2ea57e91822ca907444929e00b0877b9d1902e5` | VERIFIED | Canonical runtime health read-back, 2026-11-25 |
| Supabase project | `vyyfuaqmbxvfqgbfqooc` (`chamah-manager`) | VERIFIED | Vercel environment, Supabase project and live schema read-back, 2026-11-25 |
| Edge Function versions | Not established in this registry | UNKNOWN | Requires Production inspection |
| MCP origin/catalog | `https://chamah-portal.vercel.app/api/mcp`; server source `1.9.0` | VERIFIED | Fresh-session authenticated `get_profile` returned `DIRECTOR`; `list_calculation_rules` returned `{"items":[],"total":0}`; authenticated Director profile rechecked after final migration, 2026-11-26 |
| OAuth issuer | `https://vyyfuaqmbxvfqgbfqooc.supabase.co/auth/v1` | VERIFIED | Canonical runtime health and authenticated profile, 2026-11-25 |

## Code Preview

| Field | Value | Status | Evidence |
|---|---|---|---|
| Vercel project | `chamah-manager-portal-v2-preview` | VERIFIED | Vercel and `.vercel/project.json`, 2026-11-21 |
| Vercel project ID | `prj_TLJVhQfA8oTkM5MCqfehqmBfVGwy` | VERIFIED | Vercel and `.vercel/project.json`, 2026-11-21 |
| Preview origin | `https://chamah-director-preview.vercel.app` | VERIFIED AS CONFIGURED | Vercel environment evidence, 2026-11-21 |
| Supabase project | `iwsbjudahtjyigecymzd` (`chamah-manager-preview`) | VERIFIED ISOLATED | Distinct project, organization, host and region; no foreign servers/dblink, 2026-11-25 |
| Business-data use | Synthetic rollback-only workflow tests | VERIFIED | Transaction rollback and zero rule/context/result/batch read-back, 2026-11-25 |

## Business-data Preview

| Field | Value | Status | Evidence |
|---|---|---|---|
| Vercel project | Not approved | BLOCKED | No independently verified isolated mapping |
| Supabase project | `iwsbjudahtjyigecymzd` | VERIFIED ISOLATED FOR SYNTHETIC RULE TESTS | Distinct project/organization/host/region and no database links, 2026-11-25 |
| MCP/OAuth identity | Preview staging connector remains separately constrained | VERIFIED | Preview route/source and deployment health, 2026-11-25 |
| Business-data ingestion | No Production data; synthetic transaction tests must roll back | VERIFIED CONSTRAINT | Zero post-test registry counts, 2026-11-25 |

## Accessible Supabase project

| Field | Value | Status | Evidence |
|---|---|---|---|
| Project | `chamah-manager` / `vyyfuaqmbxvfqgbfqooc` | VERIFIED | Supabase read-only evidence, 2026-11-21 |
| Status | `ACTIVE_HEALTHY` | VERIFIED | Supabase read-only evidence, 2026-11-21 |
| Environment relationship | Production | VERIFIED | Vercel Production configuration and canonical runtime health, 2026-11-25 |

## Edge Functions observed

| Function | Version | JWT | Status | Evidence |
|---|---:|---|---|---|
| `portal-mcp-server` | 2 | enabled | VERIFIED | Supabase read-only evidence |
| `portal-mcp-readonly` | 2 | enabled | VERIFIED | Supabase read-only evidence |
| `portal-users` | 9 | enabled | VERIFIED | Supabase read-only evidence |
| `portal-workforce-workbench` | 25 | enabled | VERIFIED | Supabase read-only evidence |
| `portal-oauth-callback-relay` | 3 | disabled | VERIFIED | Supabase read-only evidence |
| `portal-bank-workbench` | 20 | enabled | VERIFIED | Supabase read-only evidence |
| `portal-runtime-config` | 3 | enabled | VERIFIED | Supabase read-only evidence |
| `portal-settings` | 4 | enabled | VERIFIED | Supabase read-only evidence |
| `portal-bank-transfer-workbench` | 6 | enabled | VERIFIED | Supabase read-only evidence |

## Canonical Preview Operational Workspace

| Field | Value | Status | Evidence |
|---|---|---|---|
| Connector classification | Current Operational Workspace | VERIFIED IN SOURCE / PREVIEW DEPLOYMENT | `api/mcp.js`, `api/mcp-operational-workspace.js` |
| Canonical endpoint | `https://chamah-director-preview.vercel.app/api/mcp` | VERIFIED | Preview routing and runtime contract |
| Compatibility endpoint | `https://chamah-director-preview.vercel.app/api/mcp-operational-workspace` | COMPATIBILITY ONLY | Same handler; not a separate connector identity |
| Vercel project | `prj_TLJVhQfA8oTkM5MCqfehqmBfVGwy` | VERIFIED | Preview deployment evidence |
| Deployment | `dpl_6fWe7WNjXwpZk7v1XqGYdrJF5MiB` | VERIFIED | Vercel deployment evidence |
| Runtime commit | `beb34140c46a491680f4bd102d28d70a4bf7fc49` | VERIFIED | Runtime health evidence |
| Supabase project | `iwsbjudahtjyigecymzd` | VERIFIED CONFIGURATION | Preview environment evidence |
| OAuth issuer | `https://iwsbjudahtjyigecymzd.supabase.co/auth/v1` | VERIFIED CONFIGURATION | Preview metadata evidence |
| Allowed tools | `get_profile`, `prepare_operational_batch`, `get_operational_batch`, `list_operational_batches` | VERIFIED IN SOURCE | Closed Preview catalog |
| Approval/commit/canonical writes | Absent and blocked | VERIFIED IN SOURCE | Preview handler boundary |

The Preview `/api/mcp` route delegates to the Preview-only Operational Workspace handler. Production `/api/mcp` retains the Business MCP implementation under the Production runtime contract.

## MCP

| Field | Value | Status | Evidence |
|---|---|---|---|
| Application MCP implementation | `api/mcp.js` | VERIFIED IN SOURCE | Repository inspection |
| Director catalog | Broad catalog excluding unsafe legacy tools | VERIFIED IN SOURCE / DEPLOYED PARITY UNKNOWN | `api/mcp.js` |
| Manager catalog | Institution-scoped read-only tools | VERIFIED IN SOURCE / DEPLOYED PARITY UNKNOWN | `api/mcp.js` |
| Operational/Analytical/Manager origins | Not fully established | UNKNOWN | Requires runtime inspection |

## Update rule

Every update requires exact evidence, verification date, evidence source, affected environment, and reviewer/approver. Conflicts remain `UNKNOWN` or `BLOCKED`; values must never be selected by assumption.
