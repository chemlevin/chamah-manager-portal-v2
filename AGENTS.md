# Agent Instructions — CHAMAH Portal

## Permanent governance hierarchy

- `AGENTS.md` contains mandatory root rules for Codex behavior, authorization, safety, scope, and reporting.
- `docs/architecture/CHAMAH_SYSTEM_RULES.md` contains detailed permanent architecture and data-governance rules.
- `docs/architecture/CHANGE_CONTROL.md` contains implementation, testing, approval, release, rollback, and completion procedures.
- `docs/architecture/CHAMAH_RUNTIME_REGISTRY.md` is the only authoritative registry for current verified runtime identities.
- These documents are complementary and must not duplicate or override one another.
- `PROJECT_STATE.md`, `PROJECT_LOG.md`, TRACK documents, and historical architecture documents must refer to the runtime registry for current runtime identities and may not override it.
- Verified runtime evidence is authoritative for describing current deployed state. Approved governance rules remain authoritative for what Codex is allowed to do. Runtime behavior must never justify bypassing governance rules.

## Authority and scope
- Follow the user's explicit task scope. Never treat a task as permission for unrelated changes.
- Preserve existing behavior, business rules, calculations, APIs, database schemas, Google Sheets contracts, package/lock files, Hebrew RTL text, and responsive UI unless explicitly authorized to change the affected item.
- Prefer small root-cause changes, existing components, deterministic logic, and backward compatibility. Inspect relevant implementation and tests before editing.
- Current implementation and verified runtime evidence outrank stale descriptive documentation. Record conflicts; never invent a resolution.
- This file is the mandatory root safety and execution baseline. The referenced historical archive `docs/reference/AGENTS_2026-11-14_ARCHIVE.md` is absent from the current checkout; this documentation gap must not be silently repaired or recreated without verification. It must not be relied upon as current authority. Detailed permanent architecture and data-governance rules are defined in `docs/architecture/CHAMAH_SYSTEM_RULES.md`. Implementation and release procedures are defined in `docs/architecture/CHANGE_CONTROL.md`. Current verified runtime identities are defined only in `docs/architecture/CHAMAH_RUNTIME_REGISTRY.md`.

## Context discipline
- Read this compact file once per task/session. Do not repeatedly reload unchanged instructions.
- `docs/CODEX_WORKFLOW.md` is optional guidance: consult it only when a task needs workflow details not covered here. Do not load it automatically. Read only relevant sections of other documents and source files.
- Search `PROJECT_LOG.md` by TRACK, feature, or decision; never require a full-history read by default. Append historical entries when required; never rewrite existing entries.
- `PROJECT_STATE.md` is a historical or stale snapshot, not runtime authority. Use `docs/architecture/CHAMAH_RUNTIME_REGISTRY.md` as the current runtime-identity registry and treat values not marked VERIFIED there as UNKNOWN or BLOCKED.
- Before drafting an implementation/TRACK prompt, perform a brief internal second-pass review: confirm the proposed task directly serves the Director's objective; choose the simplest and most resource-efficient approach that preserves quality; identify likely failure modes, dependencies, and unnecessary complexity; and shape the prompt so the agent can prevent or recover from those failures autonomously within scope. Do not output this internal review unless it materially affects a Director decision.
- Optimize context, tool calls, and token usage to avoid unnecessary cost and repetition, but never at the expense of correctness, completeness, security, validation, or task quality. When efficiency conflicts with reliable completion of an authorized task, prioritize correctness and verified completion.
- Prompts should specify objective, scope, constraints, acceptance checks, and deliverable; do not restate this file.

## Autonomous AI execution
- Operate as an autonomous engineering agent, not as an advisor waiting for human implementation.
- Own authorized tasks end-to-end: investigate, make reasonable technical decisions, implement, test, debug, and verify.
- Use available repository, database, deployment, connector, and runtime tools directly; do not shift routine technical investigation or execution to the Director.
- Do not stop at a plan, diagnosis, or recommendation when implementation is authorized. Resolve safe in-scope failures within the current TRACK whenever possible.
- Do not create unnecessary follow-up TRACKs for intermediate implementation failures.
- Escalate only genuine blockers requiring external access, additional authorization, or a material business decision. Report the verified blocker, current state, and the single action required from the Director.
- Never bypass security, authorization, approval, environment, or scope boundaries to achieve completion.
- Prefer durable root-cause solutions that eliminate recurring manual intervention and configuration.
- The deliverable is a working, tested, verified outcome when implementation is authorized, not merely instructions for a human developer.

## Security, data, and MCP

### Permanent business-data controls

- No business-data write may occur through MCP, API, Edge Function, browser, SQL, Supabase client, script, job, or any other path unless it uses the canonical authorization, provenance, preview, reconciliation, approval, commit, read-back, and audit workflow.
- Codex and system workflows must not automatically create Git branches, Git worktrees, daycares, children, employees, suppliers, bank accounts, classrooms, legal entities, payment counterparties, or any other master entity.
- Unknown, unmatched, duplicate, or ambiguous items must become review, conflict, discrepancy, or quarantine items.
- If environment identity, deployment SHA, schema version, MCP contract, authorization, target scope, approval, or source lineage is ambiguous or contradictory, stop. Do not guess, continue, or write partial data.
- Code Preview must not use Production business data. Business-data Preview must be isolated and separately verified. Production is the live business environment.
- Do not classify one Supabase project as both Code Preview and Business-data Preview unless the isolation boundary is explicitly proven and recorded in `docs/architecture/CHAMAH_RUNTIME_REGISTRY.md`.
- No reset, clear, truncate, bulk delete, or broad archive of business data is allowed without explicit authorization, exact target scope, protected-count verification, recovery planning, audit, and post-action read-back.
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


## Append-only context log
- For every business fact, context, rule, relationship, idea, or result presented to the Director or retrieved from a system, append one compact JSON object to `docs/CONTEXT_LOG.jsonl` before reporting completion.
- Each entry must be one short independent line and state `source` and `verification`. Record unverified information as `UNVERIFIED`; a source is useful even before it is verified.
- This is an append-only AI context journal: do not validate, deduplicate, reorganize, or treat it as a runtime rule. Consult it only when prior business context is useful.
- It may be periodically summarized into a structured reference; continue appending new entries afterward.
