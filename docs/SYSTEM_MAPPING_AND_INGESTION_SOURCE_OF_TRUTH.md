# SYSTEM-MAPPING-AND-INGESTION-RECOVERY

## Governance references

Permanent rules: `docs/architecture/CHAMAH_SYSTEM_RULES.md`.
Change and release procedures: `docs/architecture/CHANGE_CONTROL.md`.
Current runtime identities: `docs/architecture/CHAMAH_RUNTIME_REGISTRY.md`.
This document remains mapping evidence and does not override those authorities.

Status: audit artifacts and safety gate completed; implementation/release gate remains blocked.

## Authoritative current topology

Production is `https://chamah-portal.vercel.app`, Vercel project `prj_6IND7ee2E9s3KispBh6iBDWwQo6X`, Supabase `vyyfuaqmbxvfqgbfqooc`, and issuer `https://vyyfuaqmbxvfqgbfqooc.supabase.co/auth/v1`.

Preview is `https://chamah-director-preview.vercel.app`, Vercel project `prj_TLJVhQfA8oTkM5MCqfehqmBfVGwy`, Supabase `iwsbjudahtjyigecymzd`, and issuer `https://iwsbjudahtjyigecymzd.supabase.co/auth/v1`. Read-only Preview database access is now verified: status `ACTIVE_HEALTHY`, migration head `20261120041628_track152_bounded_operational_batch_readback`, and all inspected public base tables have RLS enabled.

Live runtime health confirms both origins and issuers. The machine-readable evidence is in [live-truth-snapshot-2026-11-21.json](../live-truth-snapshot-2026-11-21.json).

The approved SHA `6a5325d2a283f49b4e627ab50446132557232dea` is now deployed to Preview as READY deployment `dpl_EpcYQTiqRffP8uUdswLRq8UR7mQC`, with `CHAMAH_BUILD_COMMIT` corrected for Preview only and the canonical alias reassigned to that deployment. Runtime health, browser bundle, protected-resource metadata, and unauthenticated MCP behavior were verified on `https://chamah-director-preview.vercel.app`. Production was not changed.

## Source-of-truth rules

1. Identity is server-resolved from the authenticated session and environment. Client claims, names, spreadsheet row positions, and display labels are not identity keys.
2. A new real upload must use `PROPOSED → PREVIEWED → RECONCILED → APPROVED → COMMITTED → VERIFIED`. The exact source digest, contract version, provenance, stable-key decision, approval, and idempotency key bind the batch.
3. Unknown, missing, duplicated, ambiguous, or contradictory identifiers are `CONFLICT` or `UNMATCHED`; they never create a new entity automatically.
4. The canonical operational path is the public MCP contract anchored by `operational_catalog`, `preview_operational_changes`, `request_operational_approval`, `commit_operational_changes`, and bounded batch/status/page reads. Internal RPCs are adapters and are not direct connector contracts.
5. Read-back is mandatory. A timeout or failed read-back is not permission to commit again; inspect batch status and idempotency first.
6. Archive/correction is the default deletion model. Physical deletion, where legacy code still exposes it, is unsafe for real uploads until Director authorization, dependency checks, append-only audit, and read-back are proven.
7. The current rollout is Director-only. A future manager MCP must be bounded, scope-resolved, and read-only.

## Domain implementation map

| Domain | Current implementation | Classification | Main risk / gate |
|---|---|---|---|
| Children, enrollment, occupancy | Child reconciliation/identity migrations and operational batch contract; existing cards and reports | canonical mixed-domain path plus legacy reads | preserve national-ID + enrollment-context matching; no automatic child creation |
| Billing, collections, receipts | operational contract and collection receipt lineage/read-back fixes | canonical for covered operations; legacy domain paths remain | exact month/year and source lineage required |
| TAMA/government funding | registered operational domain, bounded national-ID matching, conflict/discrepancy workflow | canonical for covered path | unresolved funding rows remain conflicts |
| Employees/employments/assignments | `portal-workforce-workbench`, employee parser/import, canonical employee identity matching, operational MCP | mixed: canonical batch path plus direct legacy workbench import | legacy import is not equivalent to approval-bound mixed-domain workflow |
| Payroll/net salary/employer cost | monthly payroll preview/commit plus `portal_save_payroll_rows_v2` and older sequential save path | mixed and legacy coexistence | no uniform content digest/recovery across old path; physical delete inventory required |
| Bank statements/allocations | `portal-bank-workbench`, atomic bank import/allocation RPCs, operational reads | mixed; direct workbench mutation remains reachable | bank deletion path and screen-permission scope require hardening |
| Suppliers/payments | operational MCP proposal/approval/transition tools and portal functions | canonical for covered MCP operations; portal parity incomplete | payment writes require approval, idempotency, audit, read-back |
| Budgets/discrepancies/reports | budget APIs and existing reports; discrepancies tied to canonical conflict paths where covered | read-only or domain-specific | Budget Engine contracts remain protected; no generic ingestion rewrite |
| Source evidence/audit | `import_batches`, `import_rows`, `data_quality_issues`, `audit_events`, source lineage RPCs | partially canonical | durable row-level population is not proven for every legacy importer |

## Mutation and deletion map

| Reachable surface | Mutation | Safeguard status |
|---|---|---|
| Operational MCP | preview, approval, atomic commit, archive, bounded status/read-back | approval-bound for canonical tools; live deployed version must still be verified against repository |
| Workforce workbench | employee import, payroll row save, payroll allocation save | authenticated/service-role RPC path; not one unified batch contract |
| Bank workbench | confirm import, allocation save, transaction delete | atomic RPCs exist; physical delete remains reachable and must be treated as blocked for new real uploads |
| Payment MCP/portal | draft create/update, approval, transition, attachment finalization | canonical approval/idempotency path for covered operations; UI parity not proven |
| Admin framework | generic repository delete hook | unsafe until every repository implementation is proven archive/approval-bound |

No new daycare, branch, organization, employee, child, bank account, or supplier may be created from an unknown value. Existing creation tools are therefore not safe ingestion tools unless reached through the matching and approval contract.

## Responsibility surfaces

- Operational Business MCP: Director/Admin-only mutation surface; approval, atomic commit, audit, lineage, idempotency, and read-back required. No generic table writes.
- Personal Analytical MCP: ephemeral read/analyze/normalize/match/propose only. It must not persist batches or call approval/commit/update/delete/archive.
- Manager Read-only MCP: future bounded reads only, using authenticated email, server-resolved role, and daycare scope. It must not expose mutation tools.

The currently inspected repository `api/mcp.js` contains both canonical approval-bound tools and older direct-write/import tools such as `create_employee`, `import_employees`, `create_supplier`, and `import_payment_requests`. They are classified as legacy/direct-write until live deployed tool discovery and authorization tests prove otherwise. This is the principal remaining unification blocker.

## Required error/recovery envelope

Every ingestion result must expose status, Hebrew business message, technical code, correlation ID, batch ID, stage, processed/unprocessed counts, write flag, retry-safe flag, resume availability, exact next action, and source filename/row where applicable. Required terminal/recovery statuses are `READY`, `NEEDS_INFORMATION`, `PARTIAL`, `CONFLICTS_FOUND`, `TOO_LARGE`, `RETRYABLE`, `RESUMABLE`, `BLOCKED`, `COMMITTED`, and `VERIFIED`.

Unknown commit state must resolve through batch status/idempotency before retry. A failed read-back must never trigger a second commit. Oversized inputs/outputs must chunk or paginate within bounded limits.

## Conflict matrix

| Subject | Source conflict | Verified actual | Resolution candidate |
|---|---|---|---|
| Deployment provenance | local HEAD vs live build | live endpoints report `4833ad5`; local HEAD is `6a5325d` | Preview deploy/verify approved commit before any Production release |
| Canonical aliases | project detail domain payload vs alias lookup | `get_alias` and runtime-health agree on canonical aliases and separate projects | alias + runtime-health are authoritative |
| Preview Supabase evidence | Foundation says separated; prior connector denied Preview inspection | dedicated read-only connector now verifies project, migrations, tables, RLS, policies, grants, counts, and Edge Functions | complete canonical-domain verification after approved Preview deployment is READY |
| MCP surface | docs describe canonical approval-bound workflow; source exposes legacy direct-write tools too | source-level mixed surface confirmed | classify legacy tools and block real-upload use until routed or explicitly retired |
| Preview persistence | historical audits describe both persisted and ephemeral previews | implementation varies by domain | only durable approval-bound batches may be used for real uploads |
| Deletion | archive policy in canonical docs vs physical bank/payroll delete paths | physical delete code remains reachable | block new real uploads through those paths; harden with audited archive/correction |

## Verification limits

This track performed no business-table insert/update/delete, no upload, no approval, no commit, no migration, no Edge Function deployment, no permission change, and no user change. Production migration head and Edge Function versions were read only. Preview database migration/table/function inventory and a direct proof of zero business data in Preview remain unverified because the available Supabase connector denied read access to the Preview project.
