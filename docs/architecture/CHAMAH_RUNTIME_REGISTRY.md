# CHAMAH Runtime Registry

Status: Authoritative

This is the only authoritative current-runtime identity registry. All other documents must refer to it and must not duplicate or override its values.

Status values: `VERIFIED`, `UNKNOWN`, `BLOCKED`, `STALE`.

Verification date for entries below: `2026-11-21`.

## Repository

| Field | Value | Status | Evidence |
|---|---|---|---|
| Active branch | `codex/oauth-canonical-host` | VERIFIED | Git inspection, 2026-11-21 |
| Active commit | `6a5325d2a283f49b4e627ab50446132557232dea` | VERIFIED | Git inspection, 2026-11-21 |
| Working tree | Dirty | VERIFIED | Git inspection, 2026-11-21 |

## Production

| Field | Value | Status | Evidence |
|---|---|---|---|
| Vercel project | `chamah-portal` | VERIFIED | Vercel read-only evidence, 2026-11-21 |
| Vercel project ID | `prj_6IND7ee2E9s3KispBh6iBDWwQo6X` | VERIFIED | Vercel read-only evidence, 2026-11-21 |
| Canonical alias | `https://chamah-portal.vercel.app` | VERIFIED | Vercel read-only evidence, 2026-11-21 |
| READY deployment | `dpl_AJRcm7soRUiqmU8FDrV3xCW4dTSy` | VERIFIED | Vercel read-only evidence, 2026-11-21 |
| Serving deployment SHA | Not established in this registry | UNKNOWN | Requires deployment read-back |
| Supabase project | Not established in this registry | UNKNOWN | Requires environment-specific verification |
| Edge Function versions | Not established in this registry | UNKNOWN | Requires Production inspection |
| MCP origin/catalog | Not established in this registry | UNKNOWN | Requires Production inspection |
| OAuth issuer | Not established in this registry | UNKNOWN | Requires Production inspection |

## Code Preview

| Field | Value | Status | Evidence |
|---|---|---|---|
| Vercel project | `chamah-manager-portal-v2-preview` | VERIFIED | Vercel and `.vercel/project.json`, 2026-11-21 |
| Vercel project ID | `prj_TLJVhQfA8oTkM5MCqfehqmBfVGwy` | VERIFIED | Vercel and `.vercel/project.json`, 2026-11-21 |
| Preview origin | `https://chamah-director-preview.vercel.app` | VERIFIED AS CONFIGURED | Vercel environment evidence, 2026-11-21 |
| Supabase project | `iwsbjudahtjyigecymzd` | BLOCKED | Configured value; isolation/deployed state not independently verified |
| Business-data use | Prohibited until isolation is proven | BLOCKED | Governance rule |

## Business-data Preview

| Field | Value | Status | Evidence |
|---|---|---|---|
| Vercel project | Not approved | BLOCKED | No independently verified isolated mapping |
| Supabase project | `iwsbjudahtjyigecymzd` is a candidate only | BLOCKED | Isolation boundary unproven |
| MCP/OAuth identity | Not approved | BLOCKED | Requires Director-approved isolated mapping |
| Business-data ingestion | Prohibited | BLOCKED | Governance rule |

## Accessible Supabase project

| Field | Value | Status | Evidence |
|---|---|---|---|
| Project | `chamah-manager` / `vyyfuaqmbxvfqgbfqooc` | VERIFIED | Supabase read-only evidence, 2026-11-21 |
| Status | `ACTIVE_HEALTHY` | VERIFIED | Supabase read-only evidence, 2026-11-21 |
| Environment relationship | Not established | UNKNOWN | Requires environment-specific verification |

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
| Deployment | `dpl_5WczXcfEBcvrPD4S3L6fRxuk7DHG` | VERIFIED | Vercel deployment evidence |
| Runtime commit | `cf05856a91f1db87aa0a39f53fa51c09cba3ff3c` | VERIFIED | Runtime health evidence |
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
