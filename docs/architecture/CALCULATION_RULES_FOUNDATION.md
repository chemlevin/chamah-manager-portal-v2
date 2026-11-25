# Rules, Applicability, Runtime Context, and Results

Status: governed infrastructure implemented and isolated-Preview verified on 2026-11-25. Production remains empty of rules and applicability links.

## One registry, four separate concepts

1. **Rule definition** — `public.calculation_rules`. `rule_key` is the stable identity; each approved replacement receives a new immutable row, `calculation_rule_id`, and increasing `version`. The row contains the human instruction, typed rule kind, optional structured definition, source, approval link, effective period, lifecycle, handler and truthful implementation/enforcement status.
2. **Rule applicability** — `public.calculation_rule_contexts`. Rows reference the exact rule-version row. Conditions within one `applicability_group` are AND predicates; groups are alternatives (OR). Canonical domain UUID columns have foreign keys to their existing tables. `FRAMEWORK_TYPE` is the only code-valued context.
3. **Runtime context and inputs** — supplied to the resolver/executor from canonical operational sources. They are not copied into the registry as rules. Executions preserve the exact context, inputs, and source/version evidence.
4. **Result** — `public.calculation_rule_results`. It records the exact rule key/version, applicability group, handler contract version, context, source-backed inputs, output, timestamp, and whether it is a locked historical result or a current recalculation.

`public.calculation_rule_context_readable` is a `security_invoker` review view that resolves typed IDs to names without bypassing RLS. The machine connection is always `calculation_rules.calculation_rule_id` → `calculation_rule_contexts.calculation_rule_id`; names and `rule_number` are presentation aids.

## Governed workflow and access

Ordinary authenticated clients receive SELECT only and RLS still requires Director-readable authorization. No client role receives direct INSERT, UPDATE, or DELETE. The authenticated MCP exposes:

- `list_calculation_rules` and `read_calculation_rule` for authorized review;
- `preview_calculation_rule`, `request_calculation_rule_approval`, `commit_calculation_rule`, and `get_calculation_rule_batch` for the governed workflow;
- `resolve_calculation_rule` and `execute_calculation_rule` as the single supported resolution/execution path.

Preview validates the exact rule, canonical applicability IDs, handler contract, source, effective period, version, and conflicts. Approval is a real `portal_action_approvals` record bound to the batch ID, payload SHA-256 digest, action, operation, expected version, and preview row version. Commit consumes that approval, rechecks conflicts and versions under an advisory transaction lock, writes the rule and links atomically, audits the action, and reads the committed version back. A changed payload, mismatched approval, or stale version fails. The idempotency key makes safe retries return the same batch/result.

## Selection, exceptions, and conflicts

Resolution matches effective date and every condition in an applicability group. More conditions mean a more-specific exception and win over a broad rule. At equal specificity, lower `rule_priority` wins. Two compatible active rules with the same type, effective overlap, specificity, and priority are rejected at commit, including concurrent commits; if legacy or externally corrupted state is ambiguous, resolution fails closed as `AMBIGUOUS_RULE`. No match returns `MISSING_RULE`.

Replacement never edits the approved instruction. It creates the next version under the same `rule_key`, links `previous_version_id`, and marks the prior row `REPLACED`. Historical results retain the exact prior version and inputs.

## Stored versus enforced

- Every committed row is **stored** and has applicability.
- A row with no registered handler is `STORED_ONLY`, resolves as `UNSUPPORTED_HANDLER`, and is not executable.
- Only the versioned `STAFFING_RATIO_V1` and `BUDGET_PARAMETER_V1` contracts are currently **implemented** and **enforced** by `execute_calculation_rule`.
- Generic JSON is not executable. The preview rejects invalid structured definitions for registered handlers.
- The legacy `staffing_rules`, `budget_rules`, `staffing_budget_parameters`, payroll/compensation tables, and existing JavaScript engines remain the current source for existing Production behavior. They are not silently replaced or duplicated here.

Because the registry is empty, existing staffing and budget outputs are unchanged. A future approved rule becomes authoritative only when its scope resolves uniquely through the MCP executor and the relevant operation is deliberately routed to that executor. This controlled activation avoids changing unrelated legacy calculations. New calculation entry points must preserve rule/version, applicability, context/input provenance, method version, result, and historical/current mode.

## Before approving the first real rule

The Director must define and review the instruction, source evidence, applicability IDs/effective dates, precedence, handler support, and expected output. If the rule type has no handler, it may be stored for governance but remains visibly unenforced. For staffing or budget execution, the operation must use the canonical MCP resolver/executor and its source-backed runtime context. No business rule or applicability row was created by this infrastructure task.

## Migration and test locations

- `supabase/migrations/20261125161302_canonical_calculation_rules_and_contexts.sql` — original canonical tables/view.
- `supabase/migrations/20261125161358_enforce_calculation_rule_immutability.sql` — original active-version immutability.
- `supabase/migrations/20261125200346_rules_contexts_governed_workflow.sql` — stable versions, applicability groups, handlers/results, least privilege, resolver, workflow, approval, audit, and MCP RPCs.
- `supabase/migrations/20261125201106_calculation_rule_fk_indexes.sql` — covering indexes for the new history, approval, applicability and result foreign keys.
- `supabase/tests/calculation_rules_foundation.sql` — rollback-only isolated workflow/execution/security test.
- `tests/calculation-rules-foundation.test.mjs` and `tests/rules-contexts-governed-workflow.test.mjs` — repository contract tests.
