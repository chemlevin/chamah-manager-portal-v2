# Calculation Rules Foundation

Status: Production-parity foundation verified 2026-11-25; no rules or contexts exist yet.

## Objects and identifiers

- `public.calculation_rules` stores the canonical UUID `calculation_rule_id`, a human-facing identity `rule_number`, type, JSON definition, effective dates, priority, lifecycle, evidence JSON, replacement link, version, actor/timestamp fields, and `row_version`.
- `public.calculation_rule_contexts` links each rule UUID to one typed context. A check constraint requires exactly the matching foreign-key column (or `context_code` for `FRAMEWORK_TYPE`), and `(calculation_rule_id, context_kind)` is unique.
- `public.calculation_rule_context_readable` joins the canonical IDs to display names for review. It is a `security_invoker` view, so underlying table RLS still applies.
- `private.guard_calculation_rule_activation()` requires at least one context before activation and prevents changes to selected fields of an active rule.
- `private.guard_calculation_rule_context_mutation()` prevents insert, update, or delete of contexts belonging to an active rule.

The canonical connection is `calculation_rules.calculation_rule_id` → `calculation_rule_contexts.calculation_rule_id`. Consumers must calculate with UUIDs; `rule_number`, `context_name`, and the readable view are presentation aids.

## Verified Production state

Read-only inspection of Production project `vyyfuaqmbxvfqgbfqooc` confirmed migration-history versions `20261125161302` and `20261125161358`, including their stored SQL. The live columns, constraints, foreign keys, indexes, RLS policies, triggers, function definitions/ACLs, comments, and `security_invoker` view match those statements. Both tables contain zero rows.

Enforced now:

- typed context values and canonical foreign keys;
- valid dates, enumerated types/statuses, positive versions, and bounded priority;
- RLS enabled with `authenticated` read policies gated by `private.can_read_portal()`;
- non-empty source and approval JSON plus at least one context before activation;
- immutability of the listed active-rule fields and all active-rule contexts;
- restricted trigger-function execution (`postgres` only).

Not enforced or not integrated:

- `approval_evidence` is only required to be a non-empty JSON object. It is not validated against an approval ID, digest, actor, scope, expiry, preview, or audit record.
- No exclusion constraint or resolver prevents overlapping, conflicting, equally prioritized, or otherwise ambiguous active rules.
- `version` and `row_version` are positive integers but are not automatically incremented or checked for concurrency. `updated_at`/`updated_by_user_id` are not maintained by these triggers. Active lifecycle/version metadata can still change because the immutable-field list is selective.
- A rule may supersede itself, may supersede an unrelated rule, and no version-chain uniqueness or continuity is enforced.
- Existing staffing and budget calculations do not read these objects. They continue to use `staffing_rules`, `budget_rules`, `staffing_budget_parameters`, `classroom_licensing_rules`, compensation/payroll rule tables, and existing JavaScript engines.
- The generic governed Preview → Approval → Commit registry does not register `calculation_rules` or `calculation_rule_contexts`; the settings/runtime table allowlists also omit them. No governed write path exists for these entities.

## Read access defect and proposed repair

Production ACL inspection found owner-only privileges on both tables and the view. Consequently, the `authenticated` policy cannot be reached and the readable view cannot be selected by authorized portal users. `service_role` also lacks explicit SELECT privileges, so an MCP/Data API reader is not enabled by this foundation alone.

The smallest proposed repair is in `supabase/proposals/calculation_rule_read_grants.sql`. It grants SELECT only to `authenticated` and `service_role`; it creates no write path and has not been applied. It must become a separately approved migration after isolated tests confirm authorized authenticated reads, unauthorized denial, service-role/MCP reads, and underlying lookup-table permissions through the invoker view.

## Before the first rule can be approved

Implement and verify a governed rule-specific Preview → reconciliation → Director approval → atomic commit → read-back → audit workflow. Bind approval to the exact rule/context payload digest and version; add deterministic conflict/overlap resolution; define version-chain and concurrency behavior; add explicit read grants and authenticated/MCP integration; then connect calculations only through a separately reviewed migration and application change with historical-result tests. Until then, these tables are an empty structural registry, not an active calculation source.
