# Governed Rules, Applicability, Context, Results, and Overrides

Status: infrastructure deployed 2026-11-25. Production contains zero rule, applicability, result, and override records.

## Separate identities and lifecycles

- **Rule instruction** — `public.calculation_rules`. `rule_key` is stable; every approved replacement is a new immutable `calculation_rule_id` and version. An instruction is committed as `APPROVED` without requiring applicability.
- **Applicability** — `public.calculation_rule_applicability_sets` plus `public.calculation_rule_contexts`. It has its own version, effective period, priority, approval, source and audit lifecycle. Conditions in a group are AND; groups are OR. A set with zero conditions is explicitly network-wide.
- **Runtime context** — source-backed facts supplied from canonical daycare, classroom, school/calendar year, age-group, enrollment, calendar, hours and budget tables. The registry references canonical IDs; it does not recreate facts.
- **Result** — `public.calculation_rule_results`. It retains the exact rule/version, applicability set/group, handler version, inputs and their source/version, runtime context, output, timestamp and historical/current mode.
- **Director override** — `public.calculation_rule_overrides`. It is bound to one unchanged result, exact context and effective period. It preserves `original_output`, `adjusted_output`, required justification, source, Director approval and audit. It cannot modify the rule or another context/result.

The readable review view remains `public.calculation_rule_context_readable` with `security_invoker=true`. UUIDs are authoritative; display names and rule numbers are presentation only.

## Governed operations

Rule instruction:

`preview_calculation_rule` → `request_calculation_rule_approval` → `commit_calculation_rule`.

Applicability:

`preview_rule_applicability` → `request_rule_applicability_approval` → `commit_rule_applicability`.

Director override:

`preview_rule_override` → `request_rule_override_approval` → `commit_rule_override` → `read_calculation_result`.

Each workflow binds a real `portal_action_approvals` row to the exact SHA-256 payload digest, action, batch, expected version and preview row version. Changed payloads, expired/consumed approvals, stale versions, reused idempotency keys with different payloads, unauthorized callers and mismatched scope fail. Commits lock the governing identity, write atomically, audit and read back. The legacy combined commit RPC is explicitly revoked.

Authenticated clients receive no direct writes. Director authorization is checked inside every SECURITY DEFINER entry point; RLS and explicit grants remain defense in depth. Batch tables are intentionally RPC-only and have no SELECT policy.

## Resolution and execution

The resolver considers only approved rule versions with active applicability:

1. effective date must match;
2. every condition in an applicability group must match the supplied canonical runtime context;
3. greatest specificity wins;
4. lower numeric priority breaks differing priorities;
5. equal-specificity/equal-priority compatible overlap is rejected at commit; any residual tie fails closed as `AMBIGUOUS_RULE`.

No match returns `MISSING_RULE`. A matched instruction without a registered handler returns `UNSUPPORTED_HANDLER`.

Truthful states:

- `stored=true`: approved instruction exists;
- `applicability_defined=true`: an active applicability version exists, including an explicit zero-condition network scope;
- `implemented=true`: a versioned tested handler exists;
- `enforced=true`: an active applicability exists and the supported execution path calls the handler.

Only `STAFFING_RATIO_V1` and `BUDGET_PARAMETER_V1` are executable. Generic JSON and operational procedures remain stored-only.

## Existing calculations and controlled transition

`api/budget-engine.js` accepts already resolved canonical results only when `useGovernedRules: true`. It does not resolve rules independently. Exact context matching selects the server result and preserves rule, applicability, original, adjusted and final output evidence. When the option is absent or the registry/result list is empty, the legacy staffing and budget behavior is byte-for-byte unchanged. This is the activation boundary for future approved scopes; unrelated legacy scopes continue unchanged.

The browser budget model remains legacy until its caller supplies server-resolved governed results. No Production formula, ratio, amount or historical result was migrated by this work.

## Migrations and tests

- `20261125161302_canonical_calculation_rules_and_contexts.sql`
- `20261125161358_enforce_calculation_rule_immutability.sql`
- `20261125200346_rules_contexts_governed_workflow.sql`
- `20261125201106_calculation_rule_fk_indexes.sql`
- `20261125203251_separate_applicability_and_director_overrides.sql`
- `20261125203351_close_legacy_rule_commit_and_index.sql`
- `supabase/tests/calculation_rules_foundation.sql` — isolated rollback workflow/execution/override test.
- `tests/rules-contexts-governed-workflow.test.mjs`, `tests/governed-budget-adapter.test.mjs`, and existing budget-engine regression tests.

Before the first real rule, review its instruction/source, approve it, separately define and approve exact applicability, confirm handler support, and activate the governed adapter only for that scope.
