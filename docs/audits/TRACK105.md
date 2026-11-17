# TRACK105 — Phase 0 Policy Register, Access Audit, and Contract Tests

Status: Phase 0 evidence and gates documented 2026-11-10; policy decisions remain open

Scope: read-only review of TRACK103, TRACK104, repository migrations/functions/tests, and linked Supabase catalog metadata for project `vyyfuaqmbxvfqgbfqooc`. No migration, production-data mutation, deployment, role change, grant change, or policy change was performed.

## 1. Outcome

TRACK104 is not ready for a migration or ingestion-path implementation. The existing service-only domain RPC boundary is suitable to preserve, but the current read model is portal-wide rather than ingestion- and bank-account-scoped. The four requested policy questions also require explicit owner decisions. This TRACK records recommendations without adopting them as policy.

## 2. Decision register

| Decision | Evidence | Recommended option (not adopted) | Impact | Authorized owner decision required? |
|---|---|---|---|---|
| Bank account scope | Current Bank UI/API uses `dashboards.accounting.banks` VIEW/EDIT. Live RLS on `bank_accounts`, `bank_transactions`, `bank_allocations`, `import_batches`, and `import_rows` uses the portal-wide `private.can_read_portal()` predicate. TRACK104 identifies guessed batch IDs, account substitution, and cross-scope reads as threats. No bank-account-to-user scope relation exists. | Require explicit bank-account scope for upload, row detail, review, approval, commit, and audit. Derive it from an owner-approved mapping to the existing organizational scope model; reject mixed/out-of-scope batches. Keep screen permission as a prerequisite, not sufficient authorization. | Requires a scope model, scoped RLS/RPC predicates, migration, administration UX, and cross-account tests. Users with current Bank EDIT may lose access until mapped. | **Yes — business owner and security owner.** The business owner defines who may access which accounts; security approves enforcement and migration defaults. |
| Separation of duties | Current Bank uploader can preview and confirm with the same EDIT permission. TRACK104 proposes approval binding but leaves same-person approval and thresholds open. Financial source ingestion can create canonical transactions, while allocations remain a later workflow. | Require a different approver for Bank commits by default. Permit an explicitly authorized low-risk exception only if the owner defines a monetary/risk threshold and emergency path. Never allow self-approval merely because the uploader has EDIT. | Adds approver permissions, queues, availability/coverage requirements, immutable approval records, and stale/revoked approval tests. It can slow small-file operations. | **Yes — finance/business owner and security owner.** Finance sets thresholds and operational coverage; security approves exception controls. |
| Retention | TRACK104 notes that raw files, descriptions, references, rejected rows, and issue evidence may contain personal/financial data. `import_rows` and `data_quality_issues` are currently empty, so enabling them materially expands stored sensitive data. Existing documentation has no approved retention period or deletion/legal-hold rule. | Minimize by default: retain canonical lineage/digests and structured outcomes longer than raw file/payload content; apply short, separately approved lifecycles to raw files, raw rows, rejected rows, and evidence; support legal hold and auditable deletion. Do not persist raw source content until periods are approved. | Determines storage architecture, lifecycle jobs, audit availability, incident exposure, privacy obligations, and whether Phase 1 can store source objects/raw payloads. | **Yes — legal/privacy owner, finance records owner, and security owner.** Engineering must not infer periods. |
| Exact-duplicate exceptions | Current Bank fingerprint is account + date + normalized reference + two-decimal amount, protected by a unique index and atomic RPC. TRACK103/104 identify legitimate collisions. Current manual transaction path creates a distinct fingerprint and is service-only. | Do not force-accept or bypass the exact fingerprint constraint in v1. Route a legitimate collision through a separately authorized manual/exception workflow that records the existing match, reason, approver, and lineage. Any future fingerprint change is a separate business-rule/migration decision. | Preserves deterministic idempotency and race protection, but adds manual review effort and may delay legitimate same-key transactions. Requires exception audit and reporting. | **Yes — finance/business owner and security owner.** Finance owns legitimacy criteria; security approves bypass/exception authority. |

No recommendation above is an approved rule. Phase 1 must reference dated, named approvals for all four decisions.

## 3. Read-only access audit

### 3.1 Evidence collected

- Local migrations and Edge Functions were inspected for RLS, grants, permission checks, actor handling, and RPC calls.
- Linked Supabase catalog metadata was queried read-only through `pg_policies`, `information_schema.role_table_grants`, `pg_proc`, `pg_roles`, `pg_default_acl`, and table RLS flags.
- Relevant Supabase guidance was checked on 2026-11-10. RLS and SQL grants are separate controls; new Data API exposure now requires explicit grants in affected configurations. This reinforces the need to test both layers.

### 3.2 Current controls that should be preserved

| Control | Verified state |
|---|---|
| RLS enabled | Enabled on all reviewed ingestion, quality, audit, Bank, and portal-scope tables. `FORCE ROW LEVEL SECURITY` is not enabled. |
| Client mutations | `authenticated` has SELECT only on the reviewed tables; no direct INSERT/UPDATE/DELETE grants were found. `anon` has no reviewed table privileges. |
| Canonical Bank commit | `portal_confirm_bank_import` is security invoker and executable only by `service_role`, not PUBLIC/anon/authenticated. |
| Employee and Payroll commits | `portal_import_employees` and `portal_save_payroll_rows_v2` are security invoker and service-role-only. |
| Permission helpers | `portal_effective_permission` and `portal_has_permission` are SECURITY DEFINER but not executable by PUBLIC/anon/authenticated. `portal_my_access` is the narrow authenticated entry point. |
| Portal scope tables | `portal_user_permissions`, `portal_user_allocation_units`, and `portal_user_daycares` have self-read RLS and authenticated SELECT only. |

### 3.3 Concrete gaps against TRACK104

| Severity | Gap | Evidence and consequence | Required remediation before pilot |
|---|---|---|---|
| Critical | Portal-wide read policy exposes sensitive ingestion and Bank records | `import_batches`, `import_rows`, `data_quality_issues`, `audit_events`, `bank_accounts`, `bank_transactions`, and `bank_allocations` all use `portal_authorized_read` with only `private.can_read_portal()`. Any active portal reader can read all rows through the Data API. There is no ownership, action, account scope, or reviewer redaction. | Replace broad access for new ingestion surfaces with scoped policies or purpose-built read RPCs/views. Test anonymous, inactive, VIEW, EDIT, revoked, cross-account, and audit-reader cases. Existing application dependencies must be mapped before altering legacy reads. |
| Critical | No enforceable Bank-account scope model | Existing allocation-unit/daycare assignments do not establish bank-account authority. Batch UUID possession cannot be safely constrained to an account today. | Obtain policy decision; add an explicit mapping and fail-closed scope derivation. Never trust client-supplied account scope. |
| High | Proposed lifecycle/approval objects and authorization do not exist | There are no ingestion approval/source-object/link tables or v1 control-plane RPCs. Current Bank preview UUID is not a persisted, expiring, immutable approval artifact. | Implement only after policy gates; bind approval to actor, scope, batch version, digest, operation, disposition set, and expiry; recheck current rights on commit. |
| High | Row lineage and quality review are dormant | `import_rows` and `data_quality_issues` exist but TRACK103 found zero live rows. Current Bank commit inserts batch and canonical transactions without durable per-row records/issues. | Add deterministic row persistence, entity links, issue identities/history, and atomic finalization tests before controlled commit. |
| High | Actor identity is supplied to service-only RPCs | Current RPC signatures accept `actor_id`. Edge Functions derive the user before invocation, but the database functions themselves do not bind actor ID to a caller identity. Service-role compromise or a confused-deputy route could misattribute actions. | New public-facing semantic operations must derive the actor from JWT/delegation context; internal domain RPC calls must accept only trusted, allowlisted service paths and validate delegation metadata. |
| Medium | Broad default function EXECUTE exists | Live default privileges grant EXECUTE on new public-schema functions to anon/authenticated/service_role for common owners. Existing sensitive functions explicitly revoke it, but omission in a future migration would expose a new RPC. | Every ingestion migration must revoke PUBLIC/anon/authenticated before granting the minimum role. Add catalog tests for each signature and consider owner-specific default-privilege hardening in a separately approved migration. |
| Medium | Service role has broad table authority and BYPASSRLS | This is expected for trusted Edge Functions but makes allowlisting, caller reauthorization, logging, and route isolation mandatory. | No generic table/SQL proxy. Recheck current permission/scope on every action and keep domain commits purpose-built. |
| Medium | RLS is not forced for owners | `relforcerowsecurity=false` on reviewed tables. Owners and BYPASSRLS roles are outside ordinary policies. | Treat privileged components as trusted computing base. Decide during implementation whether FORCE RLS is compatible; do not enable it without an impact review. |
| Medium | Current Bank scope is screen-level | The Edge Function requires Bank VIEW/EDIT, but this is not account authorization and cannot satisfy TRACK104 cross-scope criteria. | Preserve screen checks and add account scope after owner approval. |

## 4. Executable tests added

`tests/track105-ingestion-contract.test.mjs` is a repository-level Node contract suite. It currently verifies:

- authorization is rechecked on every action and revocation blocks detail/approval/commit;
- preview precedes approval, approval binds version/digest, mutations stale approval, and commit rechecks rights;
- exact duplicates remain rejected, possible duplicates require review, and the unique index remains authoritative;
- required source-to-row-to-approval-to-canonical lineage and durable CRITICAL/WARNING review are present in the frozen contract;
- existing Bank, Employee, and Payroll commit RPCs remain service-only;
- the control plane cannot accept arbitrary tables/SQL/actor IDs and must preserve the current Bank RPC during pilot transition.

These are contract and migration-source tests, not live restricted-user acceptance tests. They intentionally do not claim that the proposed control plane exists.

## 5. Coverage still required

Before Phase 1 migration approval:

1. Add migration-level catalog tests for every new table, view, function, policy, grant, owner, and default privilege.
2. Add disposable restricted-user tests for anon, inactive, VIEW, EDIT/uploader, reviewer, approver, revoked, cross-account, audit reader, ingestion admin, and service worker.
3. Prove batch/row UUID enumeration fails closed and does not reveal existence.
4. Prove upload -> parse -> preview -> validate -> approve -> commit ordering, invalid transitions, compare-and-swap, expiry, cancellation, retry, and stale approval.
5. Prove same-key replay returns the prior result; concurrent commits cannot duplicate; a reviewed legitimate collision cannot bypass the unique index silently.
6. Prove every physical row has immutable raw/parsed lineage, deterministic validation results, issue history, and accepted entity links.
7. Prove unresolved CRITICAL issues block approval/commit; WARNING dispositions are explicit; `APPROVED_IGNORE` records reason/approver/time/expiry and cannot waive authorization/integrity errors.
8. Prove canonical writes, row links, batch counters/state, and audit events finalize atomically and roll back together.
9. Prove source objects, logs, errors, URLs, audit responses, exports, and AI tools do not disclose unapproved raw banking data.
10. Run existing Bank workbench, upload history, atomic accounting, allocation, dashboard, authentication, build, and responsive regressions after implementation.

## 6. Explicit gates before migration or ingestion-path implementation

All gates are blocking:

1. Named business/security approval of Bank-account scope and a mapping/default-access plan.
2. Named finance/security approval of separation of duties, thresholds, exception coverage, and emergency procedure.
3. Named legal/privacy/records/security approval of retention, deletion, legal hold, redaction, and storage location for each artifact class.
4. Named finance/security approval of the exact-duplicate collision exception path; no silent uniqueness bypass.
5. Contract v1 frozen with state transitions, issue codes/severities, invalidation rules, parser fixtures/owners, limits, redaction, and audit enums.
6. Proposed schema/RPC/RLS/grant design reviewed together; grants and RLS must both be explicit and least-privilege.
7. Executable catalog and disposable-identity authorization tests written before or with the migration and passing in an isolated Preview/branch environment.
8. Rollback/disable strategy preserves committed canonical records and reverts by disabling the pilot route, not deleting transactions.
9. Evidence that existing Bank behavior and `portal_confirm_bank_import` remain unchanged until an explicitly approved cutover.
10. Separate approval to apply migrations/deploy functions. TRACK105 grants no deployment authority.

Until every gate is met, permitted next work is limited to policy clarification, test design, parser fixtures containing no sensitive production data, and review of a proposed migration without application.
