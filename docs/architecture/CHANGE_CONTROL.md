# Change Control

This document is subordinate to `AGENTS.md` and `CHAMAH_SYSTEM_RULES.md`, and uses `CHAMAH_RUNTIME_REGISTRY.md` for current runtime identity.

## Classification and authorization

- `LOCAL_SAFE_CHANGE`: documentation, tests, or isolated code with no external state change.
- `SHARED_CHANGE`: code or contract used by multiple surfaces; requires focused regression and compatibility evidence.
- `REQUIRES_EXPLICIT_AUTHORIZATION`: database/schema/migration, Edge Function, deployment, alias/domain, user/permission, connector, Production, or business-data action.
- `PROHIBITED_WITHOUT_BUSINESS_DECISION`: new parallel architecture, uncontrolled entity creation, destructive history deletion, or a change that resolves an unresolved business rule by assumption.

## Required sequence

Identify exact branch, commit, runtime, project IDs, scope, blast radius, and rollback. Inspect affected implementation and tests. Make the smallest change. Run focused checks, applicable repository checks, and environment-specific verification. Record exact evidence, files, commits, deployments, database/migration/function/user/permission effects, unresolved blockers, and next action in the final report and `PROJECT_LOG.md` when required.

No Production deployment or mutation is implied by Preview work. No migration, schema change, user/permission change, alias/domain change, connector change, or business-data write occurs without separate explicit authorization.

## Ingestion and rollback controls

Canonical lifecycle: `PROPOSED → PREVIEWED → RECONCILED → APPROVED → COMMITTED → VERIFIED`.

Flexible source formats are handled by adapters under the same safety core. Technical intake, raw evidence, unmatched/unmapped review, proposed mappings, and canonical data are distinct states. An adapter may preserve partial understanding, warnings, and unknown fields, but may not create entities, approvals, commits, or alternative database/MCP routes. Any missing storage field, parser variant, schema, or business rule is an additive proposal requiring this change-control process; no migration is implied.

Approval binds batch ID, content digest, contract version, row versions, actor, scope, reason, and idempotency key. Unknown commit results require status inspection first. Failed read-back cannot trigger blind recommit. Rollback is forward-only, exact-scope, recoverable, audited, and evidence-led; reset, truncate, broad delete, or history destruction is prohibited without a separately authorized recovery plan.

## Closure fields

Every TRACK or equivalent work item reports: status, summary, root cause, files changed, database changes, migrations, Edge Functions, tests, Production impact, commit SHA, branch, Preview URL, Production URL if deployed, blockers, and next recommended TRACK. Documentation-only work must not be labeled an application release.
