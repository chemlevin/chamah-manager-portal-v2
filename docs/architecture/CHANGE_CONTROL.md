# CHAMAH Change Control

Status: Authoritative

`AGENTS.md` contains mandatory root rules. `CHAMAH_SYSTEM_RULES.md` contains permanent architecture and data-governance rules. `CHAMAH_RUNTIME_REGISTRY.md` contains the only current runtime identities.

## Required pre-change record

Record objective, scope, current branch and commit from the registry, working-tree status, target environment, affected surfaces, blast radius, authorization, rollback/recovery path, and acceptance checks.

## Git and environment controls

Codex must not automatically create branches, worktrees, commits, merges, or releases. Temporary work requires explicit authorization, purpose, owner, base commit, target environment, lifecycle, and cleanup authority.

Before any write, migration, function deployment, release, or business-data operation, verify the registry’s environment identity, deployment SHA, Supabase project, schema/migration state, Edge Functions, MCP origin/catalog, OAuth issuer, and data-isolation boundary. If any value is ambiguous, contradictory, stale, or `BLOCKED`, stop.

## Business-data controls

No business-data write may occur through MCP, API, Edge Function, browser, SQL, Supabase client, script, job, or any other path unless it uses the canonical authorization, provenance, preview, reconciliation, approval, commit, read-back, and audit workflow.

No automatic master-entity creation is permitted. Unknown or unmatched items must be staged as review/conflict items.

No reset, clear, truncate, bulk delete, or broad archive is allowed without explicit authorization, exact target scope, protected-count verification, recovery plan, audit, and post-action read-back.

## Release gates

Before Production promotion, focused tests, Code Preview verification, Business-data Preview verification for ingestion claims, dependency checks, authorization/provenance/idempotency/concurrency/retry/timeout/partial-failure tests, deployment SHA verification, canonical-alias verification, authenticated smoke checks, and rollback documentation are required.

## Completion report

Every implementation TRACK must include:

```text
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

Documentation-only changes must not be reported as application releases.
