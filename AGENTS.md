# Agent Instructions — CHAMAH Portal

## Authority and scope
- Follow the user's explicit task scope. Never treat a task as permission for unrelated changes.
- Preserve existing behavior, business rules, calculations, APIs, database schemas, Google Sheets contracts, package/lock files, Hebrew RTL text, and responsive UI unless explicitly authorized to change the affected item.
- Prefer small root-cause changes, existing components, deterministic logic, and backward compatibility. Inspect relevant implementation and tests before editing.
- Current implementation and verified runtime evidence outrank stale descriptive documentation. Record conflicts; never invent a resolution.
- This file is the universal safety and execution baseline. Domain-specific legacy facts and detailed historical rules are preserved verbatim in `docs/reference/AGENTS_2026-11-14_ARCHIVE.md`; consult its relevant sections when touching those domains. The archive is a reference, not an override of these safety controls.

## Context discipline
- Read this compact file once per task/session. Do not repeatedly reload unchanged instructions.
- Consult `docs/CODEX_WORKFLOW.md` for development execution; read only the relevant parts of other documents and source files.
- Search `PROJECT_LOG.md` by TRACK, feature, or decision; never require a full-history read by default. Append historical entries when required; never rewrite existing entries.
- `PROJECT_STATE.md` is a potentially stale snapshot, not a source of verified deployment truth. Check actual branch, project IDs, commits, and deployments before acting.
- Prompts should specify objective, scope, constraints, acceptance checks, and deliverable; do not restate this file.

## Security, data, and MCP
- Initial rollout is Director-only. Do not grant access to managers, secretaries, or other roles without explicit authorization.
- Enforce authentication, authorization, RLS, audit, provenance, approval, version/concurrency, and idempotency controls where applicable. Never bypass or weaken them to pass tests.
- For operational data imports, preserve source provenance, validate identity and duplicates, preview/reconcile, require the applicable Director approval before commit, and verify persisted results. Synthetic/test data must not be promoted into real Production data.
- For long-running MCP operations, preserve authorization at submission and retrieval, persistent status, and reliable result access.
- An MCP schema, mocked test, or successful build is not proof of authenticated live MCP acceptance. Report missing live verification as a blocker when required.

## Environment and deployment safety
- Never assume a connected/linked Supabase project is Preview. Historical shared-backend guidance is unsafe without current verification.
- Before any write, migration, Edge Function deployment, or release, verify exact environment, Supabase project ID, target Vercel project, and blast radius; explicitly identify whether a backend is shared with Production.
- Do not change Production data, schema, functions, deployment, aliases, or permissions without explicit Director approval covering that action. Preview work is not automatically safe if it shares a backend.
- Use isolated Preview when required; preserve forward-only migration discipline and deploy dependent migrations/functions consistently, without partial states.
- Production frontend canonical URL: `https://chamah-portal.vercel.app`. Verify serving deployment ID, Git SHA, approved commit, and canonical alias before claiming release success.
- Do not merge, deploy, or modify infrastructure unless the task explicitly authorizes it.

## Engineering and validation
- Preserve Budget Engine behavior and its contracts unless explicitly requested; distinguish Accounting `חשבון` grouping from BANKS allocation `עבור מחלקה` (see archive for exact legacy semantics).
- Keep runtime business rules in their implemented canonical sources; do not hardcode live business entities/data. Determine whether a workflow is Sheets-backed, database-backed, or hybrid from current code.
- Preserve mirrored static sources where present; do not edit generated `dist` directly.
- Use focused validation first, broader regression/security/integration checks when impact warrants. Never fabricate test results or report PASS while required checks remain incomplete.
- For documentation-only changes, verify scope and links; application build/UI tests are not automatically necessary.
- Push completed authorized work to its remote branch; do not claim pushed/deployed work unless verified.

## Documentation and completion
- Keep durable rules here, detailed workflows in `docs/CODEX_WORKFLOW.md`, legacy/domain facts in reference docs, and chronological implementation history in `PROJECT_LOG.md`.
- Update `PROJECT_LOG.md` for application, database, infrastructure, or business-behavior changes; documentation-only changes need not update it. Preserve all past entries.
- Every TRACK must end with the following fields (write `None` where inapplicable; use `TRACK: INTERNAL` if unnumbered):
```
TRACK:
Status:
Summary:
Root cause:
Files changed:
Database changes:
Migrations:
Edge Functions:
Tests:
Production impact:
Commit SHA:
Branch:
Preview URL:
Production URL (if deployed):
Blockers:
Next recommended TRACK:
```
- State exactly what was verified, what was not, whether Preview/Production changed, and the exact commit SHA. Do not label a documentation-only change as an application release.
