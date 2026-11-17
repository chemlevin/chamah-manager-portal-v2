# TRACK107 — Phase 1A Implementation Gates and Migration Design

Status: read-only Phase 1A audit completed 2026-11-10; no migration or access-control change applied  
Supabase project inspected: `chamah-manager` (`vyyfuaqmbxvfqgbfqooc`, isolated Preview backend)  
Scope: TRACK103–TRACK106, repository source/migrations/tests, and read-only live catalog/configuration inspection. No user, data, grant, RLS policy, function, bucket, deployment, Preview access, or Production access was changed.

## 1. Approved policy translated into enforcement rules

The approved product roles are application roles, not PostgreSQL login roles:

| Product role | Read authority | Mutation authority |
|---|---|---|
| Director | All organizational data | Sole user allowed to change business data, import/archive/delete source files, and administer users, roles, scopes, and capabilities |
| Super Manager | All organizational data | None by default; a future operation-specific capability requires a separate approval and must never inherit user/permission administration |
| Manager | Assigned organizational scope only | None by default |

Chat validation is advisory and temporary. It may parse and compare visible data, must disclose incomplete duplicate coverage, and must never persist an import, archive a source, mutate canonical data, choose a duplicate resolution, or invoke a mutation RPC.

## 2. Actual identities and role mapping

### Verified current model

- Supabase Auth is the identity provider. All four active `portal_user_profiles` rows join to `auth.users`; all four Auth identities are confirmed.
- One active profile is `is_super_admin = true`, `scope_mode = ORGANIZATION`. Three active profiles are non-super-admin: two organization-wide and one selected-scope.
- No canonical Director, Super Manager, or Manager role row exists. Current authorization is composed from `is_super_admin`, `scope_mode`, per-screen `HIDDEN/VIEW/EDIT`, daycare/allocation-unit assignments, Bank-transfer flags, and a separate MCP full-read flag.
- There is exactly one active super-admin, but `is_super_admin` is not an adequate permanent Director identifier: it is an editable privilege flag and currently means broad implicit screen access, not the approved business role.
- Current `mcp_full_read_access` is false for all active profiles. It is a read capability and must not be treated as a product role or mutation permission.

### Proposed reliable Director mapping

Use the immutable Supabase Auth subject (`auth.users.id`, surfaced as `auth.uid()`) as the only identity key. Add a protected role assignment keyed by `user_id`, with `DIRECTOR`, `SUPER_MANAGER`, and `MANAGER`; derive effective authority from that row on every request. Do not authorize by email, display name, request body actor ID, JWT `user_metadata`, or credentials.

The sole Director backfill must be an explicitly approved mapping from the existing active super-admin's `user_id` to `DIRECTOR`. The migration must accept the UUID through a reviewed migration constant or pre-approved seed artifact without recording email, password, tokens, service keys, or other credentials in source, logs, tests, or responses. Before backfill, a read-only precondition must prove: the UUID exists in `auth.users`, has an active profile, is the approved person, and the resulting active-Director count will be exactly one. A final-Director guard and documented break-glass recovery are required.

`app_metadata` may later cache a non-authoritative role hint, but protected database state remains authoritative because JWT claims can be stale. `user_metadata` must never participate in authorization.

### Backfill proposal

| Current state | Proposed role | Gate |
|---|---|---|
| Named, approved sole active super-admin identity | Director | Director/business/security approval of the exact Auth UUID through a secure out-of-band review |
| Organization-wide non-super-admin | Super Manager only if individually approved; otherwise Manager with explicit scope | Business owner approval for each identity |
| Selected-scope non-super-admin | Manager | Confirm daycare/allocation-unit assignments and Bank-account scope |

No role should be inferred automatically from current `EDIT`, organization scope, email, or display name.

## 3. Bank and import scope mapping

### Established mappings

- `bank_transactions.bank_account_id` establishes the source account for every Bank transaction. Preview currently matches an uploaded account number to one active `bank_accounts` row.
- `bank_allocations` establishes post-import business classification. All 14 current allocation rows have both `allocation_unit_id` and `daycare_id`.
- Each of the seven daycares has an `allocation_unit_id`; nine allocation units and all five Bank accounts currently belong to one legal entity.
- `portal_user_daycares` and `portal_user_allocation_units` are the existing user-scope assignment tables. Live state contains one daycare assignment and no allocation-unit assignment.
- `import_batches.triggered_by_user_id` records an actor when present (18 of 20 current batches). `import_rows.accepted_entity_type/id` and `data_quality_issues.entity_type/id` can link to accepted or affected entities.

### Missing or ambiguous mappings

- `bank_accounts` contains `legal_entity_id` but no daycare or allocation-unit key. Legal entity is too broad to distinguish the seven daycares or nine units in the current organization.
- There is no `bank_account_scopes` relation and no proved rule connecting a Bank account to one or more allocation units/daycares.
- A transaction is unscoped until allocation rows exist; therefore allocation-based filtering would hide new/unallocated transactions or leak organization-wide data.
- An import batch has no first-class `bank_account_id`, daycare, allocation unit, or scope snapshot. Bank account is inferred from transactions or metadata, which is insufficient for authorization.
- `import_rows` and `data_quality_issues` have no direct scope columns, and both tables are currently empty. Their future visibility must inherit a trusted batch/account scope, not caller-supplied JSON.
- Five accounts all share one legal entity. The audit cannot infer whether each account is organization-wide, belongs to one daycare/unit, or covers several scopes. This is a business mapping gate.
- Existing Bank workbench GET uses service-role reads of all Bank/import data after only a screen-level permission check. It does not apply user daycare/unit/account scope.

### Required mapping design

Add `bank_account_scopes(bank_account_id, scope_type, allocation_unit_id, daycare_id, valid_from, valid_to, granted_by, created_at)` with validated mutually exclusive targets and default-deny semantics. Permit an explicitly approved `ORGANIZATION` scope only where a business owner confirms it. Add `bank_account_id` plus an immutable authorization-scope snapshot to durable Bank import batches. Rows, issues, matches, decisions, and archive objects inherit batch/account scope. Do not derive authority from allocation rows or file content.

## 4. Existing non-Director `EDIT` inventory

### Live grants

Three active non-super-admin profiles collectively hold 58 `EDIT` permission rows. Two users have `EDIT` on Bank File, Bank Transfers, payroll execution, calculators, and dashboard parents. One user additionally has employee management/import and the full payroll workflow. No non-Director `EDIT` grant exists for the user-permissions screen in the inspected live rows, but the current model permits such a grant to be assigned by a super-admin.

### Effective mutation surfaces

| Screen / permission | Service boundary | Current affected operations |
|---|---|---|
| `dashboards.accounting.banks` | `portal-bank-workbench` using service role | Preview; confirm Bank import; create manual transaction; save allocations; delete transactions |
| `dashboards.accounting.bank-transfers` | `portal-bank-transfer-workbench` using service role | Create/update/delete transfers and splits, status/approval/execution actions, attachment upload/delete; attachment URL is treated as read |
| `dashboards.staffing.employees` | `portal-workforce-workbench` | Create/update employee and employment data, assignments, pay terms, eligibility, certificates, leave, and related deletes/status changes |
| `dashboards.staffing.employees.import` | `portal-workforce-workbench` | Employee file preview and commit through `portal_import_employees` |
| payroll screens, including open/working/closed/reopen and actual payroll | `portal-workforce-workbench` | Open/close/reopen months, save/import/delete payroll records, approve temporary employees, save allocations and monthly data |
| `management.settings` if granted | `portal-settings` | Allow-listed canonical settings mutations |
| `management.permissions.users` if granted | `portal-users` | Invite users; change profiles, screen permissions, organizational scopes, and Bank-transfer flags |
| policy-document `documents.manage/publish` if granted | authenticated `SECURITY DEFINER` RPCs | Create/save/publish/retire policy documents |

Parent/dashboard/calculator `EDIT` values are primarily navigation/presentation grants unless a child service checks them, but they must still be normalized to `VIEW` for non-Directors so `EDIT` cannot become an accidental future capability.

### Required treatment

1. Do not translate existing `EDIT` rows into mutation capabilities.
2. On migration, preserve visibility by converting every active non-Director `EDIT` to `VIEW` where read access remains approved; use `HIDDEN` where scope or data sensitivity cannot yet be enforced.
3. Make the role/capability decision authoritative in every mutation Edge Function before any service-role call. Screen `EDIT` becomes presentation-only compatibility data and cannot authorize writes.
4. Add a second database boundary: Director-only semantic mutation RPCs derive `auth.uid()` or validate a signed caller delegation, recheck active role, and never trust an actor ID supplied by the client.
5. Revoke authenticated execution from all mutation RPCs unless a Director-aware RPC is intentionally exposed. Service-role-only legacy RPCs remain internal and must be reachable only from a closed, Director-gated action.
6. User/permission administration is permanently Director-only. No specific capability may delegate it to a Super Manager or Manager under the approved policy.
7. Any future non-Director mutation is a new product/security decision, named capability, scoped operation, UI change, database guard, and test matrix—not a restored generic `EDIT` grant.

## 5. Proposed Phase 1A migration design

This is design only. No SQL file was created or applied.

### A. Canonical roles and capabilities

- `portal_roles(role_code)` seeded with `DIRECTOR`, `SUPER_MANAGER`, `MANAGER`.
- `portal_user_roles(user_id, role_code, granted_by, granted_at, revoked_at)` with one active primary role.
- `portal_capabilities(capability_code, is_delegable)` and `portal_user_capabilities(...)` for future narrow grants. Seed no non-Director mutation capability in Phase 1A. Mark user/permission management non-delegable.
- Private helpers such as `private.current_portal_role()`, `private.is_active_director()`, `private.can_read_organization()`, and scope predicates. Helpers read protected tables and use `auth.uid()`; no external actor argument.
- Final-Director constraint/trigger plus a controlled break-glass procedure. Role changes are semantic Director-only RPCs, not table writes.

### B. Scoped reads

- Director and Super Manager: organization-wide SELECT through purpose-built views/RPCs or RLS predicates.
- Manager: intersection of active profile, role, screen VIEW, assigned daycare/allocation unit, and Bank-account scope.
- Replace `private.can_read_portal()` on Bank, import, quality, audit, workforce, and payroll sensitive tables with domain-specific scope predicates. Default deny missing/ambiguous mappings.
- Prefer purpose-built scoped read RPCs/views for Bank/import/quality/audit responses and redact fields not needed by restricted users. Any view exposed to authenticated users must use `security_invoker = true` or otherwise be protected explicitly.
- Duplicate checks for restricted users return `INCOMPLETE_SCOPE` when organization-wide completeness cannot be proved and never reveal an out-of-scope match identity or count.

### C. Director-only mutations

- Revoke direct authenticated table mutations. Current live authenticated table grants are SELECT-only, which should remain the baseline.
- Introduce semantic Director mutation RPCs with fixed `search_path`, explicit ACLs, internal authorization recheck, idempotency/version checks, and actor derived from trusted context.
- Edge Functions authenticate the caller, authorize the exact action, then call only the matching semantic RPC. Remove generic method-to-`EDIT` authorization as the mutation decision.
- Preserve current domain validation and atomic RPC logic behind the new guard; do not change Bank/payroll/workforce calculations or public response contracts in Phase 1A.
- Harden authenticated policy-document mutation RPCs and `portal_admin_set_mcp_full_read_access`; both currently execute as `SECURITY DEFINER` for `authenticated` and must enforce the approved Director rule internally or be restricted to a Director-gated service path.
- Audit every allowed/denied privileged action without storing secrets or unrestricted file contents.

### D. Imports and chat validation

- Director import: durable batch, archived original, row lineage/issues/decisions, explicit duplicate disposition, and atomic commit.
- Chat validation: separate read-only action and temporary object path; no import batch, archive record, durable issue, or mutation RPC; deterministic cleanup on success/error/timeout plus reconciliation.
- Chat reports all visible problems and duplicates but does not choose a disposition. Restricted callers receive an explicit coverage statement.

### E. Storage

- Keep `bank-transfer-attachments` private. It currently has no `storage.objects` policy and is accessed by service-role Functions; those Functions must enforce the canonical role/scope on every list/read/upload/delete/signed-URL action.
- Proposed private `chat-validation-temp`: server-only, random paths, short approved TTL, no signed downloads, no durable import linkage, automatic cleanup and orphan alarm.
- Proposed private `import-source-archive`: Director-only upload/manual delete, authorized scoped reads, short single-object signed URLs, immutable digest/metadata, tombstone/audit on deletion, and no canonical-record cascade.
- Ordinary client Storage policies must be explicit and least-privilege. Service-role bypass means equivalent checks must also exist in Functions; Storage RLS alone is insufficient.

### F. Migration order and fail-closed rollout

1. Add protected role/capability structures and helpers without changing behavior.
2. Backfill the named Director and approved read roles/scopes; assert one active Director.
3. Add and populate approved Bank-account scope mappings; unresolved accounts stay inaccessible to restricted users.
4. Add scoped read RPCs/policies and catalog tests.
5. Add Director guards to every mutation route/RPC and downgrade non-Director `EDIT` compatibility rows.
6. Add storage buckets/policies only in their separately approved TRACKs; deploy matching Function enforcement atomically with dependent schema.
7. Run disposable-identity tests in isolated Preview, then require a separate deployment approval. No Production change is implicit.

## 6. Read-only catalog checks for implementation verification

The future test suite should execute only catalog `SELECT` statements unless a separately approved disposable-user acceptance phase is running.

### Roles and identity

- Assert the canonical role tables, constraints, RLS, owners, and ACLs.
- Assert exactly one active Director after the approved backfill; assert the Director row joins to an active profile and `auth.users` ID without selecting email or credentials.
- Assert no authorization policy/function references `raw_user_meta_data`, email, display name, or a caller-supplied actor as authority.
- Assert final-Director guard and Director-only role-management RPC definitions/ACLs.

### Grants and RLS

- From `information_schema.role_table_grants`, assert `anon` has no protected access and `authenticated` has no INSERT/UPDATE/DELETE on protected base tables.
- From `pg_class`, assert RLS is enabled and forced where required on every exposed protected table.
- From `pg_policies`, snapshot `cmd`, roles, `qual`, and `with_check`; reject portal-wide predicates on scoped Bank/import/quality/audit tables and reject mutation policies for non-Directors.
- Verify every restricted relation can trace to a trusted scope key. Reject nullable/missing Bank-account scope backfill unless explicitly organization-wide and approved.

### RPCs and views

- From `pg_proc`, assert exact signature, owner, `prosecdef`, volatility, `proconfig` search path, and ACL for every portal function.
- Assert mutation RPCs are not executable by PUBLIC/anon/general authenticated users unless the function itself performs the canonical Director check; prefer service-only exposure behind a closed Director-gated Function.
- Reject default PUBLIC EXECUTE and unexpected owner default ACLs.
- Inspect `pg_get_functiondef` for trusted-actor derivation and role recheck; flag external actor IDs, dynamic SQL, arbitrary table/bucket/RPC names, or service-role proxy behavior.
- From `pg_views`/`pg_class`, assert exposed views use security-invoker behavior or have no anon/authenticated access.

### Storage

- From `storage.buckets`, assert expected private buckets, size/MIME limits, and no public bucket.
- From `pg_policies` on `storage.objects`, assert exact per-bucket SELECT/INSERT/UPDATE/DELETE roles and predicates; assert no wildcard public policy.
- Assert temporary and archive bucket predicates/path schemes cannot overlap. Catalog inspection cannot prove TTL cleanup, signed-URL expiry, or Function service-role checks; those require separately approved runtime tests.

### Configuration drift

- Assert the live Edge Function inventory/version matches the approved release manifest.
- Compare repository migration expectations to live `pg_policies`, grants, function ACLs, bucket configuration, and schema migration history.
- Produce counts and object names only; never emit Auth emails, tokens, API keys, source account numbers, file contents, or personal/business row payloads.

## 7. Read-only checks completed in TRACK107

- Read TRACK103, TRACK104, TRACK105, TRACK106, project instructions/log, relevant role/security/data documentation, migrations, portal permission/UI code, mutation Edge Functions, and security tests.
- Queried live Preview catalog/configuration using `SELECT` only for profile/Auth linkage aggregates, current screen permissions, assignments, Bank/import scope shape, table grants, RLS policies, function ACL/security mode, and Storage buckets/policies.
- Verified current authenticated table grants are SELECT-only across the reviewed public tables.
- Verified reviewed Bank/import/quality tables use the same broad `private.can_read_portal()` SELECT policy.
- Verified the only current bucket is private `bank-transfer-attachments`, 10 MiB, with no `storage.objects` policies.
- Verified sensitive domain commit RPCs are generally service-role-only, but authenticated `SECURITY DEFINER` policy-document mutation RPCs and MCP-access administration require explicit Director-policy review.
- Consulted current Supabase guidance: application authorization should use RLS/RBAC rather than login-role proliferation; Storage ordinary-client access uses `storage.objects` RLS; service-role access bypasses RLS; authorization must not trust user-editable metadata; grants and RLS are separate controls.

## 8. Unexecuted checks

- No disposable user was created and no existing user's role, scope, permission, token, or session was changed.
- No live mutation/denial attempt was made. Proving Director success, non-Director denial, revocation behavior, cross-scope invisibility, and stale-JWT handling requires separately approved disposable identities or controlled existing test identities.
- No file was uploaded, retained, archived, signed, downloaded, or deleted. Temporary disposal and archive behavior are unimplemented designs.
- No migration, SQL DDL/DML, grant, RLS change, function deployment, bucket, scheduled cleanup, or Vercel deployment occurred.
- Application build and Playwright UI tests were not required for this Markdown-only audit. Existing repository read-only contract tests were run separately and are reported in the completion record.

## 9. Unresolved mappings and risks

| Severity | Gate / risk |
|---|---|
| Critical | The exact Auth UUID approved as the sole Director has not been recorded in a migration approval artifact. Current super-admin is evidence, not automatic authorization to backfill. |
| Critical | Bank-account-to-organization/daycare/unit ownership is unknown. Restricted Bank/import reads must default deny until all five accounts are explicitly mapped. |
| Critical | Non-Director `EDIT` currently reaches service-role mutation paths. A partial rollout that changes UI only would not enforce policy. |
| High | Two organization-wide non-super-admin profiles are not yet approved as Super Managers versus scoped Managers. |
| High | Screen `EDIT`, super-admin, scope mode, Bank-transfer action flags, and MCP full-read are overlapping authorization concepts. Compatibility behavior must be specified during backfill. |
| High | Service-role Functions bypass RLS. Database policy changes without simultaneous route guards leave a confused-deputy path. |
| High | Import/quality/audit scope is absent, and unallocated Bank transactions cannot inherit allocation scope. |
| High | Authenticated `SECURITY DEFINER` document/admin RPCs need Director-policy hardening and exact ACL review. |
| Medium | There are no Storage policies, archive bucket, temporary validation bucket, TTL cleanup, or reconciliation job. |
| Medium | Two of 20 historical batches lack an actor, so old records need a documented read-scope rule rather than invented ownership. |
| Medium | Current default function-execute posture can expose a future RPC if explicit revoke is omitted. |

## 10. Exact approval gates before any change

**Gate A1 — Identity and roles:** Director, business owner, and security approve the exact Supabase Auth UUID for the sole Director; classify each other active identity as Super Manager or Manager; approve final-Director recovery and role-change procedure.

**Gate A2 — Scope:** Finance/operations/security approve every Bank-account mapping (organization, allocation unit, and/or daycare), the treatment of unallocated transactions, historical batches without actors, and default-deny behavior for incomplete mappings.

**Gate A3 — Existing permissions:** Director/business/security approve conversion of all non-Director `EDIT` rows to `VIEW` or `HIDDEN`, removal of Bank-transfer action flags for non-Directors unless read-only, and the rule that no current `EDIT` creates a future capability.

**Gate A4 — Migration package:** Security and engineering approve exact forward-only SQL, object owners, ACLs, RLS predicates, Function guards, audit behavior, rollback/recovery plan, and catalog assertions. This audit does not authorize application.

**Gate A5 — Storage/privacy:** Privacy, records, security, and finance approve temporary TTL/file controls, durable archive retention-until-manual-deletion, archive readers, manual deletion semantics, backup/legal-hold stance, and audit minimization. This is required before bucket/job creation.

**Gate A6 — Preview execution:** Separate explicit authority to apply the migration and deploy all dependent Functions together to isolated Preview. Partial deployment is prohibited.

**Gate A7 — Runtime acceptance:** Separate authority to create/use disposable test identities and synthetic files. Tests must cover Director success; Super Manager read-only; Manager scope/cross-scope denial; every mutation path; permissions administration; chat advisory-only behavior; duplicate coverage; revocation/stale JWT; storage cleanup/archive/delete; and service-role confused-deputy resistance.

**Gate A8 — Production:** Explicit Production approval only after catalog/runtime tests pass, operator acceptance and rollback are documented, and the canonical Production deployment rule is satisfied.

## 11. Phase 1A conclusion

The approved policy is implementable without exposing credentials by binding protected role rows to immutable Supabase Auth UUIDs and deriving every authorization decision from `auth.uid()` plus protected scope relations. Implementation must not begin until the sole Director identity, all other role classifications, and every Bank-account scope are approved. The current system is not compliant through UI changes alone: non-Director `EDIT` reaches privileged mutation services, and Bank/import reads lack account-to-organization scope. The Phase 1A migration must therefore ship role backfill, scoped-read foundations, Director guards, permission normalization, catalog tests, and matching Function enforcement as one approved fail-closed change set.
