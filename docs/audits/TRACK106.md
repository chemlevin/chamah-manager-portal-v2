# TRACK106 — Phase 1 Security and Schema Design

Status: design and read-only audit completed 2026-11-10; no implementation approval granted  
Scope: repository and linked Supabase project `vyyfuaqmbxvfqgbfqooc`; no code, migration, data, user, policy, grant, function, storage object, Edge Function, Preview, or Production change was made.

## 1. Approved policy baseline

This document treats the TRACK106 product and access decisions as approved requirements. They supersede nonbinding recommendations in TRACK105 where they differ.

- The Director reads all organizational data and is the only current mutation authority, including imports, edits, overwrites, deletions, archived-file deletion, and user/permission administration.
- Super Managers read all organizational data and are read-only. Regular managers read only assigned scope and permissions and are read-only. A secretary is not implicitly a writer.
- Chat validation is advisory and temporary. It reports every detected error, mismatch, duplicate, partial overlap, and uncertainty. It never imports, changes, deletes, rejects, or creates a pending-import queue.
- A chat-only file is discarded after validation. A Director-imported original is retained in the website archive with its import record until the Director manually deletes it.
- Duplicate and overlap findings are decisions for the Director and assistant. They are not silently accepted, imported, rejected, or discarded.
- A future manager import capability requires a new, narrowly scoped permission and a complete direct import flow. It is not granted by an existing `EDIT` permission or natural-language instruction.

### Conflicts with earlier repository assumptions

| Existing assumption | Conflict and resolution |
|---|---|
| TRACK105 recommended a different Bank approver from the uploader. | TRACK106 approves Director-controlled import without a separate approval step. No approval queue is proposed for the current state. Any future separation-of-duties change needs a new product decision. |
| TRACK104 proposed general uploader/reviewer/approver roles and durable approval artifacts. | Current design has one mutation authority: Director. Durable import authorization is still recorded, but it is a Director commit decision, not a pending approval workflow. |
| Existing Edge Functions treat screen `EDIT` as mutation authority. | This conflicts with Director-only writes. `EDIT` must not authorize mutation unless a future explicit mutation capability is added and enforced server-side. |
| The Bank preview currently omits duplicate rows from the submitted importable set, and confirmation can proceed with remaining rows. | Reporting is useful, but duplicate/overlap disposition must be explicit. A Director must choose how to proceed; the system must not silently discard duplicate rows as an incidental side effect. |
| `BR-0154` permits adding new source records without individual approval. | It remains compatible only within a Director-authorized import. It does not authorize non-Director imports. |
| Existing documentation references a secretary Bank workbench. | “Secretary” is not a database role. Secretary access must be ordinary read scope plus the temporary-validation capability; it grants no write authority. |

## 2. Mapping approved roles to the actual model

### Verified current model

`portal_user_profiles` contains `is_active`, `is_super_admin`, `scope_mode`, permission configuration, Bank-transfer capabilities, and `mcp_full_read_access`. Per-screen levels live in `portal_user_permissions`; organizational assignments live in `portal_user_allocation_units` and `portal_user_daycares`. There is no `role` column and no canonical Director, Super Manager, regular manager, or secretary identifier.

The linked project contained four active profiles during this audit: one active `is_super_admin`, three organization-scoped profiles, and one selected-scope profile. Counts are evidence of configuration only; no identity was inferred from them.

### Proposed mapping

| Product concept | Current representation | Required Phase 1 rule |
|---|---|---|
| Director | The sole active `is_super_admin = true` profile is the closest current representation. | Treat active super-admin as Director only after an owner confirms this mapping. All mutation gates require this server-derived status. Preserve the final-super-admin guard. |
| Super Manager | No distinct flag. Closest representation is active `scope_mode = ORGANIZATION`, non-super-admin, with appropriate VIEW permissions or full-read capability. | Read all authorized organizational domains, never mutate or administer users. Do not infer the role solely from organization scope; record a stable role/capability in a future migration. |
| Regular manager | Active non-super-admin with `scope_mode = SELECTED`, screen VIEW permissions, and unit/daycare assignments. | Read only the intersection of screen permission and assigned organizational scope. Read-only by default. |
| Secretary | No distinct role. | Model as a regular scoped user plus an explicit temporary-validation capability. It grants no persistent upload, import, archive, edit, or delete permission. |

Recommendation: add a constrained `portal_role_code` (`DIRECTOR`, `SUPER_MANAGER`, `MANAGER`, `SECRETARY`) or an equivalent normalized role assignment, while retaining screen permissions and organizational scope as separate dimensions. Backfill must be owner-reviewed and fail closed; never derive roles from display names or current `EDIT` values.

## 3. Authorization matrix

“Allowed” below means allowed only after authentication, active-profile validation, and relevant scope checks. “Future explicit grant” is not implemented or implied today.

| Capability | Director | Super Manager | Regular manager | Secretary |
|---|---|---|---|---|
| Organizational reads | All | All | Assigned scope and VIEW permission only | Assigned scope and VIEW permission only |
| Chat data queries | All read domains exposed by allowlisted tools | All read domains exposed by allowlisted tools | Assigned scope only | Assigned scope only |
| Temporary chat file validation | Allowed | Allowed within full read scope | Allowed within assigned scope | Allowed within assigned scope |
| Complete duplicate check | Allowed across organization | Allowed across organization, read-only | Only within visible scope; result must say incomplete otherwise | Only within visible scope; result must say incomplete otherwise |
| Import preview/advisory result | Allowed | Allowed, read-only | Allowed, read-only | Allowed, read-only |
| Actual import/commit | Allowed | Denied | Denied; future explicit direct-import permission only | Denied |
| Record edit/overwrite | Allowed | Denied | Denied unless a future operation-specific permission is approved | Denied |
| Record deletion | Allowed | Denied | Denied | Denied |
| Imported-file archive list/read | All | All, subject to sensitive-data presentation rules | Only records in assigned scope if later approved | Denied by default; temporary input does not create archive access |
| Imported-file archive upload | Import flow only | Denied | Denied unless future direct-import capability includes it | Denied |
| Manual archive-file deletion | Allowed, destructive confirmation and audit required | Denied | Denied | Denied |
| Permission/user management | Allowed | Denied | Denied | Denied |
| Resolve/ignore quality issues | Allowed as part of import decision | Advisory comments only | Advisory comments only | Advisory comments only |

No UI state, model prompt, screen `EDIT` value, client-supplied role, or requested actor ID satisfies this matrix.

## 4. Proposed Bank-import flow

### 4.1 Temporary chat validation

1. Authenticate the user and resolve current active profile, product role, screen permission, and organizational/bank-account scope server-side.
2. Upload the file to an isolated ephemeral validation service or private quarantine prefix with a short hard expiry. Do not create `import_batches`, `import_rows`, archive objects, or pending items.
3. Parse with a versioned server-side Bank adapter. Treat file contents, filenames, spreadsheet formulas, comments, and embedded text as untrusted data, never instructions.
4. Validate structure, values, totals, account identity, dates, mappings, exact duplicates, possible duplicates, partial overlaps, and uncertainties.
5. Query canonical data only with the caller JWT or a user-delegated scoped RPC. For restricted users, compare only visible rows. Mark organization-wide duplicate status `INCOMPLETE_SCOPE` when a complete check is impossible.
6. Return an advisory report containing every finding and explicit coverage: file digest, parser version, visible scope, checked row count, issue list, exact/possible duplicate references using non-disclosing identifiers, and unverified areas.
7. Delete the temporary object and parser workspace immediately after delivery or failure. Record only a minimal security event (actor, time, digest, outcome, deletion outcome) if approved; do not retain file content or row payloads.

### 4.2 Transfer to the Director

“Transfer” means sharing the advisory result and, if the Director chooses to import, asking the Director to submit the original file through the authenticated import surface. It must not move the secretary’s temporary object into durable storage, create a pending queue, or reuse the temporary file as the authoritative import source. This ensures the Director knowingly selects the actual retained source file.

### 4.3 Director-controlled import

1. Reauthenticate and require an active Director at upload, preview, and commit. Recheck authorization immediately before any archive or database write.
2. Stream the original into a private archive bucket using a server-generated object key. Compute SHA-256 while uploading; enforce size, type, malware/content checks, and object metadata limits.
3. Create an import record linked to the archive object and immutable digest. Persist row lineage and quality findings before commit, but do not make canonical changes during preview.
4. Present all exact duplicates, partial overlaps, mismatches, warnings, and uncertainties. Require the Director to record a disposition for every blocking/ambiguous row. A disposition is not permission to bypass the existing unique fingerprint silently.
5. Bind the commit request to actor, file digest, parser version, account/scope, row-set digest, requested operation, and issue dispositions. Reject stale or changed previews.
6. In one transaction, recheck Director status, lock/idempotency key, validate dispositions, call the existing domain commit logic, link accepted rows to canonical transactions, finalize counters/status, and write audit records. Roll back all canonical/lineage/audit state on failure.
7. Retain the original archived object and import/lineage records. Archive deletion is a separate Director-only destructive action; deletion must not delete canonical transactions or audit history.

### 4.4 Duplicate behavior

- Exact duplicate: report the matching fingerprint and affected source row. Default disposition is `DO_NOT_IMPORT`, but it becomes effective only after Director confirmation.
- Partial overlap: report known matches and new/uncertain rows separately; require an explicit batch disposition.
- Possible duplicate/collision: keep out of automatic commit and require a documented exception path. Existing unique constraints remain authoritative until a separately approved rule change.
- Restricted validator: never reveal the existence or content of out-of-scope matches. Report that the organization-wide check is incomplete.

## 5. Prompt-based privilege-escalation prevention

### Security boundary

The model is not an authorization component. Authorization occurs before tool dispatch and again inside every RPC/Edge Function. Tool arguments are requests, not authority.

### Required controls

1. Split read and mutation tools into separate allowlists. The general chat runtime receives read-only tools and temporary validation only. It receives no generic SQL, REST proxy, table name, arbitrary RPC name, service key, storage path, or mutation tool.
2. Verify the bearer token with Supabase Auth for every call. Resolve role, active state, permissions, and scope from protected database state; never trust `user_metadata`, prompts, filenames, client role claims, or caller-supplied actor IDs.
3. Use caller-JWT RLS for reads. If a privileged worker is unavoidable for parsing, it must pass a signed, short-lived delegation envelope and call purpose-built RPCs that independently reauthorize the original user. It must not use service-role reads to expand chat visibility.
4. Dispatch by a closed semantic action enum. Reject “change/delete/overwrite/import” from non-Directors before invoking any write-capable function. The same check repeats in the database operation.
5. Derive audit actor from the verified JWT/delegation context. Do not accept `actor_id` from an external request.
6. Sanitize tool output and apply field-level minimization. Out-of-scope objects must be indistinguishable from nonexistent objects (`404`/empty result, not a revealing `403`).
7. Treat attachment content as data. Disable formula execution, macros, external links, archive traversal, and instruction interpretation. Apply resource limits and parser timeouts.
8. Recheck access after permission revocation and immediately before commit/download. Do not rely on a stale chat session or preview token.
9. Log denied mutation attempts and suspicious prompt/tool patterns without retaining sensitive prompt attachments.

## 6. Read-only audit of current controls

### 6.1 RLS and grants

Verified live on 2026-11-10:

- RLS is enabled on reviewed ingestion, quality, audit, Bank, and portal-security tables.
- `authenticated` has SELECT-only grants on `import_batches`, `import_rows`, `data_quality_issues`, `audit_events`, `bank_accounts`, `bank_transactions`, and `bank_allocations`; no reviewed direct client mutation grant was found.
- Those seven sensitive tables all use the same `portal_authorized_read` predicate: `private.can_read_portal()`. It is portal-wide, not role-, owner-, bank-account-, unit-, daycare-, or issue-redaction-scoped.
- User profile/permission/scope tables use self-read policies (`user_id = auth.uid()`).

Gap: the sensitive read model violates regular-manager/secretary scope and can expose Bank, import, issue, and audit records to any user passing the broad portal predicate. Super Manager full read is compatible, but there is no distinct Super Manager rule.

### 6.2 RPC execution rights

Verified controls to preserve:

- `portal_confirm_bank_import`, `portal_import_employees`, `portal_save_payroll_rows_v2`, Bank allocation/manual/delete functions, and payroll lifecycle functions are service-role-only.
- MCP read RPCs are narrow authenticated `SECURITY DEFINER` functions and the current MCP tool list is read-only.

Concrete gaps:

- Current domain RPCs accept caller-supplied `actor_id`; Edge Functions supply the authenticated user, but the database boundary cannot prove that identity by itself.
- Broad default EXECUTE privileges remain a future-footgun. Several trigger/validation functions are executable by PUBLIC/anon/authenticated. Even if not directly useful, every new function must explicitly revoke PUBLIC/anon/authenticated before minimum grants.
- `portal_admin_set_mcp_full_read_access` is executable by `authenticated` and relies on internal checks. It should be reviewed under Director-only permission management and preferably exposed only through a Director-gated semantic operation.
- Service-role-only is not equivalent to Director-only. Every service-role Edge Function must reauthorize the original caller and operation.

### 6.3 Edge Functions

`portal-bank-workbench` authenticates the caller, then uses service-role reads/writes and treats GET as VIEW and every non-GET as EDIT. It reads all Bank transactions, allocations, accounts, batches, and history through the service role. It permits preview, confirm import, allocation changes, manual transactions, and deletion for any user with Bank EDIT. It has no Director check and no Bank-account scope enforcement. This is the largest direct conflict with TRACK106.

`portal-workforce-workbench`, `portal-settings`, `portal-users`, and `portal-bank-transfer-workbench` also use a service-role trust boundary. Existing operation-specific checks vary. Phase 1 must inventory every mutation action and require Director, not generic EDIT. `portal-users` is closest to the approved rule because its database save RPC checks user-management authority, but the approved Director mapping still needs to be made explicit.

### 6.4 Chat/MCP tools

Verified positive controls:

- `api/mcp.js`, `portal-mcp-server`, and `portal-mcp-readonly` require a bearer token, expose a closed tool list, reject unknown tools, and contain no write tool.
- Current tools are policy listing/reading, daycare listing, and limited staff-by-daycare queries; caller JWT delegation is used for constrained reads.

Gaps:

- Current chat tools do not implement Bank-file validation, archive access, issue reporting, or incomplete-scope duplicate semantics.
- Full-read access is a separate `mcp_full_read_access` flag rather than a proven Super Manager role. It must not imply mutation authority.
- Any future validation tool must preserve caller scope and must not reuse the service-role Bank workbench read path.

### 6.5 Storage

Verified live state:

- The only bucket is private `bank-transfer-attachments`, limited to 10 MiB. No storage RLS policies were returned by the live catalog query; the Edge Function accesses objects with service-role credentials and creates signed URLs after its own permission checks.
- No Bank-import source archive bucket or temporary chat-validation bucket exists.

Gaps:

- Imported Bank source files are not archived alongside imports as required.
- There is no policy-enforced separation between ephemeral validation and durable archive objects.
- Storage access is mediated entirely by privileged Functions, making route authorization, path ownership, expiry, deletion audit, and signed-URL scope critical.

## 7. Proposed schema, RPC, and storage design

Names are proposals for a future forward-only migration, not implemented objects.

### 7.1 Role and capability additions

- `portal_user_roles(user_id, role_code, granted_by, granted_at, revoked_at)` with one active primary role; Director role changes are Director-only and final-Director protection applies.
- `portal_user_capabilities(user_id, capability_code, scope_json, granted_by, granted_at, revoked_at)` for future narrow capabilities such as `BANK_IMPORT_EXECUTE`. No current non-Director row is seeded.
- Keep screen permissions and organizational assignments; effective read access is the intersection of active role, screen VIEW, and scope.

### 7.2 Import control plane

Extend `import_batches` with `operation`, `content_sha256`, `row_set_sha256`, `parser_name`, `parser_version`, `bank_account_id`, `archive_object_id`, `requested_by`, `committed_by`, `decision_at`, `state_version`, and explicit states `UPLOADED`, `PARSED`, `VALIDATED`, `DECISION_REQUIRED`, `COMMITTING`, `COMPLETED`, `FAILED`, `CANCELLED`. No `PENDING_DIRECTOR_APPROVAL` state is needed.

Use `import_rows` for every physical row with immutable `source_row_number`, normalized row digest, raw/parsed payload subject to approved minimization, validation status, duplicate class, matched canonical ID, and accepted canonical ID. Add uniqueness on batch + source row and batch + row digest where appropriate.

Use `data_quality_issues` for durable issue code, severity, category, evidence digest/minimized evidence, status, disposition, decided-by, reason, and timestamps. Authorization/integrity issues cannot be ignored. Every detected issue is retained for Director imports; chat-only findings are not written here.

Add `import_row_matches` for exact/possible/partial-overlap candidates without overwriting the row result, and `import_decisions` for explicit Director dispositions bound to batch version and digest.

Extend `audit_events` or add append-only `import_audit_events` for upload, parse, validate, decision, commit attempt/result, archive download, deletion request/result, permission denial, and recovery. Audits retain actor derived from auth context, request correlation ID, prior/new state digests, and no unrestricted raw file content.

### 7.3 Archive objects

Add `import_source_objects` with bucket, object key, content digest, size, MIME type, scan result, import batch, uploaded/verified/deleted actor/time, deletion reason, and lifecycle status. Database deletion marks the object deleted but preserves its audit identity and digest.

Create two private buckets/prefixes:

- `chat-validation-temp`: no direct client access, hard short TTL, random keys, automatic cleanup, no import-batch foreign key, no signed download URL.
- `import-source-archive`: durable Director-import originals only, server-generated paths, object versioning/immutability where supported, Director-only upload/delete, authorized scoped read, short signed URLs, and explicit audit.

Storage policies alone must be least-privilege, but privileged Edge Functions must repeat authorization because service-role bypasses RLS. A scheduled cleanup/reconciliation job must detect expired temporary objects, orphan metadata, and missing archive objects.

### 7.4 Semantic RPCs

- `portal_validate_bank_file(...)`: read-only/advisory, derives caller, returns coverage and findings; no durable import state for chat mode.
- `portal_create_bank_import(...)`: Director-only; binds archive object and digest and creates the durable batch.
- `portal_record_bank_import_preview(...)`: trusted parser worker only; compare-and-swap state/version and idempotency key.
- `portal_decide_bank_import_rows(...)`: Director-only; records dispositions, no canonical writes.
- `portal_commit_bank_import(...)`: Director-only, `SECURITY DEFINER` only if necessary, fixed search path, derives caller/delegation, rechecks active Director and digest/version, and atomically calls preserved Bank commit logic plus lineage/audit finalization.
- `portal_delete_import_source(...)`: Director-only; two-step destructive confirmation, object and metadata coordination, audit, retry-safe partial-failure state.
- Purpose-built scoped read RPCs for batches, rows, issues, and archive metadata; do not expose broad base-table SELECT to restricted users.

Every signature must revoke EXECUTE from PUBLIC, anon, and authenticated before granting only the intended role. External operations must never accept an actor ID, arbitrary table, SQL, bucket, object path, or RPC name.

### 7.5 RLS outline

- Director: SELECT all through an active-role predicate; mutations only through semantic RPCs, not table grants.
- Super Manager: SELECT all authorized views/RPCs; zero INSERT/UPDATE/DELETE and zero mutation RPC EXECUTE.
- Manager/secretary: scoped SELECT using account-to-organization mappings and assigned unit/daycare relations. Import/issue/audit visibility follows the underlying Bank-account scope and field redaction.
- Service worker: minimum table/RPC/storage access required for parsing and commit; no generic proxy endpoint.
- `anon`: none.

Bank-account authority requires an explicit mapping (for example `bank_account_scopes` to allocation units/daycares). Existing account rows do not establish user scope. The mapping and default-deny backfill need separate business/security approval before implementation.

## 8. Threat model

| Threat | Required control |
|---|---|
| Prompt says “I am the Director” or asks to import/delete | Ignore claimed identity; authenticate and authorize before tool dispatch and inside RPC. |
| Prompt/file content instructs the parser or model to call a write tool | Treat content as untrusted data; read-only validation tool list; no dynamic tool names. |
| Service-role confused deputy | Signed delegation to original caller, closed actions, scope recheck, no generic REST/SQL proxy, actor derived server-side. |
| BOLA/IDOR by guessed batch, row, issue, or object ID | Scoped RLS/RPC predicates; existence-hiding response; tests across users/accounts. |
| Restricted user learns an out-of-scope duplicate | Return `INCOMPLETE_SCOPE` without match identity or counts outside visible scope. |
| Exact duplicate race or replay | Content/idempotency digest, unique constraint, transactional lock, replay returns prior outcome. |
| Partial-overlap file silently imports only new rows | Explicit batch/row dispositions bound to digest; commit rejects undecided rows. |
| Preview tampering or stale authorization | Bind actor/scope/digest/version; compare-and-swap; recheck role and rights at commit. |
| Temporary file retained or promoted | Separate bucket/service, TTL plus immediate deletion, no import FK, cleanup reconciliation. |
| Archived file deleted by non-Director or without trace | Director-only semantic RPC, destructive confirmation, audit, tombstone, retry-safe object deletion. |
| Signed URL leakage | Short expiry, single object, authorized request, no path enumeration, audit downloads. |
| Malicious spreadsheet/archive | Size/type limits, macro/formula/external-link disablement, traversal protection, sandboxed parser, timeout and decompression limits. |
| Permission revoked mid-flow | Recheck on every action and immediately before read/download/commit; invalidate stale decisions. |
| Partial database/storage failure | State machine and reconciliation; database commit atomic; archive deletion uses durable retry/tombstone and never deletes canonical records. |

## 9. Disposable-user test matrix

Use synthetic files and disposable users in an isolated Supabase branch or approved Preview environment. No production financial data is required.

| Case | Identities / setup | Expected result |
|---|---|---|
| Director read and import | Active Director, clean file | Full preview, explicit decision, atomic commit, archive retained, lineage/issues/audit complete. |
| Super Manager mutation attempt | Organization-read non-Director with old EDIT permission | All reads allowed; preview allowed; import/edit/delete/user change rejected before mutation RPC and again by RPC. |
| Regular manager scope | User assigned daycare/account A; rows for A and B | Only A data visible; B IDs indistinguishable from missing; complete duplicate claim prohibited. |
| Secretary validation | Secretary scoped to A, validation file | Advisory report only; no batch/archive/pending item; temporary object deleted. |
| Prompt injection | File cells and prompt request service-role writes | Content reported as data; no write tool invoked; denial/security event recorded. |
| Natural-language mutation | Each non-Director asks to overwrite/delete/import | Deterministic authorization rejection with no mutation-capable call. |
| Exact duplicate | Existing matching transaction | Finding reported; commit blocked until Director disposition; no silent import/discard. |
| Partial overlap | File contains existing, new, and ambiguous rows | All groups reported; explicit Director disposition required; unchanged preview digest enforced. |
| Incomplete duplicate scope | Restricted user file may match account B | No B disclosure; report states organization-wide duplicate check incomplete. |
| Temporary disposal success/failure | Chat validation completes, parser fails, client disconnects | Object absent after each path; cleanup retry and alert if deletion initially fails. |
| Archive access | Director, Super Manager, scoped manager, secretary | Matrix enforced; signed URLs short-lived; unauthorized object IDs reveal nothing. |
| Manual archive deletion | Director and non-Director | Only Director can confirm; object removed/tombstoned and audited; canonical transaction remains. |
| Revoked permission | Revoke between preview and query/commit | Next action fails; cached token/session does not preserve access; decision invalidated. |
| Role spoofing/stale JWT | Modify user metadata or use pre-change token | No privilege change; protected state is authoritative. |
| Concurrent duplicate imports | Two Director sessions, same file | One canonical result; other returns idempotent prior result/conflict; no duplicate rows. |
| Tampered preview | Change file, account, mapping, row, or digest | Commit rejected as stale/tampered. |
| Partial DB failure | Fault after rows/issues but before canonical commit | Entire database transaction rolls back; retry is safe. |
| Storage/database split failure | Archive stored but batch creation fails; deletion fails after tombstone | Orphan reconciled or quarantined; no untracked canonical import; alerts/audit present. |
| User/permission management | Director and every non-Director role | Director succeeds; all others fail at Edge Function and database boundary. |
| MCP enumeration | Guess batch/object IDs through chat tools | No out-of-scope existence, metadata, counts, or timing disclosure beyond accepted tolerance. |

Catalog assertions must also verify RLS enabled, policy commands/roles/predicates, no authenticated table mutations, exact RPC ACLs, no unsafe default EXECUTE, private bucket settings, and absence of public storage policies.

## 10. Implementation phases and approval gates

### Phase 1A — Role and authorization foundation

Design migration for canonical product roles/capabilities, Director mapping, account scope, purpose-built read predicates, and Director-only mutation guards. Inventory every existing Edge Function mutation action.

**Gate A:** named business/security approval of role backfill, sole-Director mapping, Bank-account-to-organization scope, behavior of existing non-Director EDIT permissions, and emergency Director recovery. Separate approval is required to apply the migration or deploy functions.

### Phase 1B — Temporary validation service

Implement sandboxed server parser, caller-scoped duplicate queries, complete issue reporting, explicit coverage, and guaranteed disposal without import records.

**Gate B:** security/privacy approval of ephemeral storage technology, maximum TTL, minimal security logging, file limits, malware/parser controls, and incomplete-scope wording. Separate approval is required to create a bucket/job or deploy the validator.

### Phase 1C — Durable archive and lineage

Implement archive metadata/bucket, import row lineage, durable issues/matches/decisions, audit events, retention-until-manual-deletion behavior, and reconciliation.

**Gate C:** records/privacy/security approval of archived-file access, manual deletion semantics, audit retention, raw-row minimization, legal-hold stance, and backup implications. Separate approval is required for schema/storage changes.

### Phase 1D — Director Bank import pilot

Add Director upload/preview/decision/commit RPCs while preserving `portal_confirm_bank_import` behavior behind the existing route until cutover. Require atomic finalization and explicit duplicate/overlap decisions.

**Gate D:** finance/security approval of duplicate dispositions and legitimate fingerprint-collision exception; passing catalog, disposable-user, idempotency, rollback, storage, Bank workbench, upload-history, allocation, authentication, build, and responsive tests in Preview. Separate approval is required to deploy the pilot.

### Phase 1E — Cutover and hardening

Make the Director-only route default, remove non-Director mutation reachability, monitor denials/cleanup/orphans, and document recovery. Do not change Production without explicit Production approval and canonical deployment verification.

**Gate E:** operator acceptance, rollback plan, complete audit evidence, and explicit Production approval.

### Future manager direct import

This is a separate product/security TRACK. It requires a named operation-specific permission, scope model, administration UX, direct end-to-end import tests, and new approval. It must not reuse generic EDIT or inherit Director powers.

## 11. Verification and limitations

Completed:

- Read TRACK103, TRACK104, TRACK105, project instructions/log, relevant handbooks, migrations, Bank/user/MCP/storage-related Edge Functions, chat endpoints, and TRACK105 contract tests.
- Queried the linked project read-only for reviewed RLS policies, authenticated grants, relevant function ACL/security mode, profile-model columns/counts, storage buckets/policies, and deployed Edge Function inventory.
- Confirmed current Supabase guidance that RLS and grants are separate controls, service-role bypass is privileged, Storage access is policy-controlled for ordinary clients, and `SECURITY DEFINER`/default function EXECUTE require explicit hardening.

Not completed by design:

- No disposable identities were created and no live authorization attempts were executed because the task prohibits user/data/access-control changes.
- No file was uploaded, parsed, retained, or deleted; therefore temporary disposal and archive behavior remain proposed, not verified.
- No migration/RPC/storage policy was applied, no Edge Function was deployed, and no application/build/Playwright test was required for this Markdown-only design.
- Function source was not exhaustively re-derived from the live catalog; local migration/function source and live ACL/catalog evidence were cross-checked. Future implementation must run catalog tests against the exact Preview migration.

## 12. Phase 1 decision

The repository is not safe to implement the Bank archive/import flow merely by adding UI or chat tools. Phase 1 must first establish a canonical role/capability mapping, replace broad sensitive reads with scoped access, and make every mutation Director-only at both service and database boundaries. The existing read-only MCP allowlist and service-only domain commit RPCs are useful foundations, but the current service-role Bank workbench and portal-wide read predicate do not satisfy TRACK106.
