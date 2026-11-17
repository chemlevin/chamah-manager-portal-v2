# TRACK108 — Read-only Architecture Assessment

Status: completed 2026-11-10; documentation only; no implementation authorized

Repository branch: `audit/track105-policy-contract`

Supabase project inspected: `chamah-manager` (`vyyfuaqmbxvfqgbfqooc`, ACTIVE_HEALTHY, PostgreSQL 17)

Scope: TRACK106–107, relevant earlier audits and architecture documentation, repository source/migrations/tests, and read-only live Supabase catalog and operational aggregates.

No migration, DML, identity change, permission change, RLS/grant change, Storage operation, Edge Function deployment, Vercel deployment, or business-data modification was performed. Personal credentials, email addresses, unmasked bank account numbers, tokens, file contents, and transaction details are intentionally omitted.

## תקציר מנהלים

המערכת אינה זקוקה למחיקה ובנייה מחדש של הנתונים, אבל שכבת ההרשאות והשירותים הקיימת אינה בסיס בטוח להמשך. יש ארבעה משתמשים פעילים, משתמש־על פעיל יחיד, וחמישה חשבונות בנק. בפועל, הרשאות `EDIT` כלליות מאפשרות כיום למשתמשים שאינם מנהל/ת לבצע פעולות דרך Edge Functions המשתמשות ב־service role. בנוסף, מדיניות הקריאה המרכזית רחבה מדי ואינה אוכפת היקף לפי מעון או חשבון בנק.

המלצה: **בנייה מחדש חלקית ומדורגת**. לשמר את נתוני הליבה, קשרי המפתח, כללי החישוב, היסטוריית הייבוא, ה־audit וה־RPC האטומיים התקינים; להחליף את מודל ההרשאות, שכבת השירות המועדפת וזרימת התשלומים. המודל החדש צריך להפריד בין תפקיד, היקף וגישה לפעולה: המזכירה תוכל ליצור בקשת תשלום, לשייך הוצאה ולצרף מסמכים; רק המנהל/ת יאשר/תאשר פעולה כספית רגישה; ורישום ביצוע תשלום יהיה שלב נפרד ומתועד. אין לבצע שינוי עד לאישור מפורש של זהות המנהל/ת, סיווג שאר המשתמשים, מיפוי חמשת חשבונות הבנק, מטריצת הפעולות, והפרדת התפקידים בתהליך התשלום.

## 1. Assessment conclusion

### Recommendation

Adopt a **partial rebuild around preserved data**:

1. Preserve the canonical domain data and proven invariants.
2. Replace the current overlapping authorization concepts with one protected authorization model.
3. Replace broad service-role workbenches incrementally with purpose-built, action-level commands and scoped queries.
4. Introduce a dedicated supplier-payment-request aggregate instead of stretching `bank_transfers` into an approval, documentation, allocation, and payment-confirmation ledger.
5. Retire obsolete compatibility structures only after usage and data-retention proof.

This is more efficient than either patching every current screen permission in place or rebuilding all operational data. The core database contains valuable, structured information; the highest-risk defects are concentrated in authorization and privileged service boundaries.

### Confidence

- **High:** current authorization and service-role design requires replacement, not cosmetic repair.
- **High:** canonical business data and several database invariants are worth preserving.
- **High:** account/daycare authorization cannot be safely inferred from existing allocation rows.
- **Medium:** the supplier workflow should be a new aggregate linked to existing master data and later to bank evidence. Final accounting states and approval thresholds require Director/finance decisions.
- **Low:** which current users should receive which future business role. The database proves technical configuration, not organizational responsibility.

## 2. Evidence reviewed

### Repository

- `docs/audits/TRACK106.md` and `docs/audits/TRACK107.md`, plus TRACK103–105 and the TRACK104 ingestion contract.
- Project instructions/log and relevant architecture, banking, roles, data, and security documentation.
- Portal permission migrations and catalog; Bank, workforce, settings, users, transfer, runtime-config, MCP, OAuth relay Edge Functions; relevant tests.
- Live/repository drift was checked at the object and deployed-function inventory level. Full source equivalence for every deployed function was not proven.

### Live Supabase, SELECT-only

- Auth/profile linkage and non-sensitive identity attributes.
- Effective and historical screen permissions; daycare/allocation-unit assignments.
- Bank account, transaction, allocation, import, transfer, and mapping aggregates.
- Table columns, constraints, grants, RLS flags/policies, function security/ACL metadata, Storage buckets/policies, deployed Edge Functions, and advisors.

### Missing evidence

- No authoritative HR/organization register identifies the Director, Super Managers, Managers, or secretary.
- No approved mapping states which bank account belongs to which daycare/unit or is organization-wide.
- No approved supplier-payment state machine, monetary threshold, substitute approver, retention schedule, or legal-hold rule exists.
- No runtime denial/success test used real or disposable identities in TRACK108.
- Supabase dashboard-only Auth settings beyond advisor-visible configuration were not independently enumerated.
- No live file was opened and no Storage object content or signed URL was tested.

## 3. Current architecture

| Layer | Verified current state | Assessment |
|---|---|---|
| Client | Hebrew RTL SPA under `chamah-manager-portal/new/`; legacy/static compatibility routes remain | Keep the SPA approach; consolidate obsolete compatibility surfaces after usage proof |
| Identity | Supabase Auth; four active profiles join to confirmed Auth users | Keep Supabase Auth; replace mutable privilege flags as role identity |
| Authorization | `is_super_admin`, `scope_mode`, screen `HIDDEN/VIEW/EDIT`, daycare/unit rows, transfer flags, and MCP full-read overlap | Replace with role + scope + action capability; retain screen catalog for navigation only |
| Reads | Many exposed tables grant authenticated `SELECT`; most domain RLS policies call `private.can_read_portal()` | Replace broad predicate with domain scope or protected query APIs |
| Writes | Privileged Edge Functions authenticate, check screen `EDIT`, then use service role; critical RPCs are usually service-only | Preserve semantic/atomic RPC logic; replace screen-level mutation authority and broad privileged reads |
| Storage | One private bucket, `bank-transfer-attachments`, 10 MiB; no `storage.objects` policy | Keep private storage concept; add explicit object model, MIME rules, retention, and function authorization |
| Banking | Five active accounts, 2,451 transactions, 14 allocations, 2,437 unallocated transactions | Preserve source transactions; add explicit account scope and workflow records |
| Imports | 20 batches; zero `import_rows`; zero `data_quality_issues`; two batches lack actor | Preserve historical batches; activate a minimized lineage model only where operationally justified |
| Audit | Shared audit structures and actor fields exist | Keep, harden, and define append-only/retention guarantees |
| AI/MCP | Closed read-only tool allowlist and caller-JWT scoped RPCs | Keep as a separate read boundary; do not expose generic mutation tools |
| Legacy Sheets | Compatibility Budget/allocations routes still exist | Inventory actual users before retirement; do not merge Sheets and Supabase semantics casually |

## 4. Identity and permission inventory

### 4.1 Active identities

UUIDs are included because they are the immutable authorization keys; email addresses and credentials are omitted.

| Identity | Auth UUID | Live profile | Current scope | Current role conclusion |
|---|---|---|---|---|
| A | `3af86c7f-6ba4-41f4-8d7c-1db262cf3e79` | Active, unnamed, `is_super_admin=true` | Organization | Only **technical Director candidate**; business identity not confirmed |
| ריקי | `a275e2c5-dda7-4ca2-9c5a-5eb97bf3e27d` | Active, non-super-admin | Organization | Role unknown; do not infer Super Manager from scope |
| שרון | `df75e8e8-0c67-41b9-91b2-8b53c348d185` | Active, non-super-admin | Organization | Role unknown; do not infer Super Manager/secretary from permissions |
| לאה | `66238a62-4af6-4e1a-8844-3d512632bcea` | Active, non-super-admin | Selected; one daycare, no unit row | Manager/secretary classification unknown |

All four Auth identities are confirmed and unbanned. `mcp_full_read_access=false` for all four. Last-sign-in data proves account use, not business role.

### 4.2 `EDIT` grants: historical versus effective

TRACK107 reported 58 non-Director `EDIT` rows. TRACK108 verified that 58 is the count across **all retained permission configurations**. Only 35 rows belong to the active profiles' current `permission_configuration_id` values.

| Identity | Current effective `EDIT` rows | All retained `EDIT` rows | Current sensitive reach |
|---|---:|---:|---|
| ריקי | 11 | 28 | Payroll execution/reopen plus navigation/calculators; exact effective mutation depends on service screen checks |
| שרון | 21 | 21 | Bank, transfers, employees/import, payroll lifecycle, and related dashboards |
| לאה | 3 | 9 | Bank workbench, Bank transfers, team dashboard |
| **Total non-super-admin** | **35** | **58** | Three current users have at least one `EDIT` |

The 23 superseded rows are not effective through the current permission resolver because it joins the active configuration ID, but they are obsolete authorization residue and complicate audits. They should be retained or archived according to an approved permission-history policy, not silently deleted.

### 4.3 Effective mutation paths

| Current gate | Privileged boundary | Risk |
|---|---|---|
| `dashboards.accounting.banks = EDIT` | `portal-bank-workbench` + service role | Import confirm, manual transaction, allocations, deletion; no canonical role or account scope |
| `dashboards.accounting.bank-transfers = EDIT` | `portal-bank-transfer-workbench` + service role | Create/update/delete/split/status, attachments, approval/date flags |
| Employee/payroll `EDIT` | `portal-workforce-workbench` + service role | Workforce and payroll mutations through direct REST and RPC paths |
| `management.settings = EDIT` | `portal-settings` + service role | Allowlisted master-data changes |
| User-management `EDIT` | `portal-users` + service role | Invite and change profiles, permissions, scopes, transfer flags |
| Document manage/publish `EDIT` | authenticated `SECURITY DEFINER` RPCs | Direct authenticated mutation endpoint; internal checks depend on legacy permission semantics |

Screen `EDIT` currently serves navigation, UI behavior, and authority. That combination is the central authorization design flaw.

## 5. Bank and daycare/allocation mappings

### 5.1 Five bank accounts

| Code | Display name | Masked account | Transactions | Allocations | Unallocated transactions | Observed allocation coverage |
|---|---|---|---:|---:|---:|---|
| BA-003 | אשקלון | `****3880` | 326 | 1 | 325 | One daycare/unit appears in existing allocations; not proof of account ownership |
| BA-001 | מחנה | `****0007` | 502 | 0 | 502 | No allocation evidence |
| BA-002 | מרכזי | `****0063` | 952 | 10 | 942 | One daycare/unit appears; not proof of exclusive scope |
| BA-004 | נאות | `****2327` | 273 | 1 | 272 | One daycare/unit appears; not proof of exclusive scope |
| BA-005 | סניף | `****2331` | 398 | 2 | 396 | One daycare/unit appears; not proof of exclusive scope |

Every transaction has a bank account. All five accounts belong to the same legal entity. There is no `bank_account_scopes` relation or other trusted account-to-daycare/unit authorization mapping.

### 5.2 Daycare/allocation-unit mapping

| Daycare | Status | Allocation unit |
|---|---|---|
| אשקלון | Active | `UNIT-DC-ASHKELON` / אשקלון |
| גנון | Active | `UNIT-DC-GANON` / גנון |
| מחנה | Active | `UNIT-DC-MAHANE` / מחנה |
| מרכזי | Active | `UNIT-DC-MERKAZI` / מרכזי |
| נאות הכפר | Active | `UNIT-DC-NEOT` / נאות הכפר |
| סניף | Active | `UNIT-DC-SNIF` / סניף |
| פרטי | Inactive | `UNIT-DC-PRIVATE` / פרטי |

All seven daycare rows have allocation units. This does not solve account authorization: 2,437 of 2,451 transactions have no allocations, and authorization cannot depend on a classification that is absent before secretary review.

### 5.3 Required future mapping

Create an explicit, effective-dated relation between bank account and organizational scope. Recommended target:

`bank_account_scopes(bank_account_id, scope_type, daycare_id, allocation_unit_id, valid_from, valid_to, approved_by, created_at)`

- `scope_type` is one of `ORGANIZATION`, `DAYCARE`, `ALLOCATION_UNIT`.
- Target columns are mutually exclusive and validated.
- Missing or ambiguous mapping denies restricted reads and writes.
- Historical transactions use the mapping effective on the transaction/import date, or an approved immutable scope snapshot.
- Allocation rows remain accounting classification, never authorization evidence.

## 6. RLS, grants, Auth, functions, and Storage

### 6.1 Positive foundations to keep

- RLS is enabled on all inspected public tables.
- Reviewed canonical domain tables grant authenticated users `SELECT`, not direct INSERT/UPDATE/DELETE.
- High-impact Bank/payroll/import RPCs are generally service-role-only.
- Bank transaction source fingerprint is unique per account and source fields have preservation guards.
- Bank allocations are separate from immutable source transactions and have FK/check constraints.
- Auth profiles are keyed to `auth.users.id`; final-super-admin protection exists.
- MCP tools are read-only and allowlisted.
- Storage bucket is private; service-role mediation currently prevents ordinary client access in the absence of object policies.

### 6.2 Critical/high weaknesses

| Severity | Finding | Evidence and effect |
|---|---|---|
| Critical | Screen `EDIT` authorizes privileged writes | Edge Functions translate non-GET to `EDIT`, then use service role, so RLS cannot contain a confused-deputy error |
| Critical | Broad domain reads | Most operational tables use the same `private.can_read_portal()` SELECT predicate, not daycare/account/action scope |
| High | Service role is an application data plane | Bank/workforce/settings/users/transfer/runtime functions hold broad authority; correctness depends on every route and branch reauthorizing perfectly |
| High | Mutable flags are treated as roles/capabilities | `is_super_admin`, scope mode, transfer flags, MCP full-read, and screen levels overlap and can contradict one another |
| High | Caller actor IDs remain in internal RPC signatures | Edge Functions currently pass verified IDs, but the database mutation boundary does not derive the actor itself |
| High | Authenticated `SECURITY DEFINER` endpoints | Supabase advisor reports 11 callable functions, including policy mutations and MCP access administration; each needs intent/definition review |
| High | Supplier transfer authority is overbroad | All four active profiles have `bank_transfer_scope=ALL`; three have approve and execution-date flags; current flags do not express separation of duties |
| Medium | RLS without policies on five tables | Advisor identifies `bank_transfers`, `employee_leave_periods`, `payroll_calculation_input_rules`, `payroll_months`, and OAuth relays; some are intentionally service-only, but intent is not uniformly documented |
| Medium | Leaked-password protection disabled | Supabase security advisor warning; enablement is a Director/security decision |
| Medium | Default function EXECUTE residue | Trigger/validation functions remain executable by PUBLIC/anon/authenticated; low direct exploitability does not justify broad defaults |
| Medium | No forced RLS | Inspected tables use RLS but not `FORCE ROW LEVEL SECURITY`; owner/service paths therefore require deliberate controls |
| Medium | Permission-history residue | 23 superseded non-Director `EDIT` rows remain alongside current configurations |

Advisor reference: [Supabase database linter](https://supabase.com/docs/guides/database/database-linter) and [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

### 6.3 Edge Function inventory

Nine functions are active: `portal-users` v7, `portal-settings` v3, `portal-bank-workbench` v19, `portal-workforce-workbench` v24, `portal-bank-transfer-workbench` v5, `portal-runtime-config` v2, `portal-mcp-readonly` v1, `portal-mcp-server` v1, and `portal-oauth-callback-relay` v2. All except the intentionally public callback relay have platform JWT verification enabled; application-level bearer validation remains required.

### 6.4 Storage

The only bucket is private `bank-transfer-attachments`, limited to 10 MiB, with no MIME allowlist and no `storage.objects` policies. The transfer Edge Function performs service-role uploads, deletes, and signed-URL creation. This is workable only if every object operation uses a generated path, verifies the original user/action/scope, limits file type by content, uses short signed URLs, and audits deletion. Those guarantees were not runtime-tested in TRACK108.

## 7. Structures to keep, refactor, replace, or retire

| Structure | Decision | Reason |
|---|---|---|
| Supabase Auth UUID identity | Keep | Stable identity key; suitable for protected role assignments |
| Canonical master/domain tables and FKs | Keep | Valuable structured data and tested business relationships |
| Bank source transaction immutability/fingerprint | Keep with exception workflow | Strong audit/idempotency foundation; collision treatment needs policy |
| Separate `bank_allocations` | Keep and extend | Correct separation of source fact from business classification |
| Audit events and actor/timestamps | Keep and harden | Necessary for financial workflow and authorization changes |
| Domain atomic RPC logic | Keep behind new guards | Preserves invariants; current external authority model is inadequate |
| Screen catalog and HIDDEN/VIEW/EDIT | Keep for navigation temporarily; retire as write authority | Useful UI compatibility, unsafe as action authorization |
| `is_super_admin` / scope mode / transfer flags / MCP flag | Replace as authoritative model | Overlapping, mutable, hard to reason about |
| `private.can_read_portal()` on sensitive domains | Replace | Authentication/portal membership is not object authorization |
| General service-role workbench reads/writes | Replace incrementally | Large confused-deputy blast radius |
| `import_batches` historical data | Keep | Preserves import history |
| Dormant `import_rows`/quality structures | Refactor before use | Current shape can retain excessive raw payload; zero live rows means no migration compatibility burden |
| `bank_transfers` | Keep historical rows; stop expanding as the sole supplier-payment model | Existing eight rows are valuable, but the table lacks complete request/approval/payment evidence semantics |
| Private Storage | Keep; split by purpose | Attachments, import archives, and temporary validation require different policies/retention |
| Read-only MCP allowlist | Keep | Good containment boundary |
| Legacy Sheets APIs and old static routes | Candidate for retirement after telemetry/owner confirmation | Parallel semantics increase maintenance; current use was not proven |
| Superseded permission configurations | Archive/retain by approved history rule | Not effective, but may be audit evidence |

## 8. Recommended unified authorization model

Authorization is the conjunction of four independently modeled dimensions:

`active identity × role baseline × resource scope × action capability/context`

### 8.1 Protected model

| Relation | Purpose |
|---|---|
| `portal_roles` | Small role catalog: `DIRECTOR`, `FINANCE_MANAGER`, `MANAGER`, `SECRETARY`, optional `AUDITOR` |
| `portal_user_roles` | Effective-dated assignment keyed to Auth UUID; one primary role initially |
| `portal_actions` | Stable semantic actions, e.g. `payment_request.create`, `payment_request.submit`, `payment.approve`, `payment.record`, `bank.allocate` |
| `portal_role_actions` | Baseline actions for each role |
| `portal_user_action_overrides` | Exceptional allow/deny, time-limited, reasoned, and audited; never for final-Director protection |
| `portal_user_scopes` | Effective-dated `ORGANIZATION`, `ALLOCATION_UNIT`, `DAYCARE`, or `BANK_ACCOUNT` scopes |
| `bank_account_scopes` | Trusted mapping from accounts to organizational scope |

### 8.2 Enforcement rules

- Database state is authoritative; JWT `user_metadata`, email, display name, client role, and prompt text are never authority.
- Edge Functions verify the bearer token and call only semantic queries/commands.
- Sensitive mutations recheck action, scope, workflow state, amount threshold, separation-of-duties rule, and row version in one database transaction.
- Actor is derived from `auth.uid()` when user-JWT RPCs are used. A service worker may use a signed delegation envelope containing original actor, action, resource, scope, expiry, and nonce; the database validates it.
- Service role is limited to narrow workers that cannot safely run as the caller. It is not a generic portal session.
- UI screen permissions are projections from action access, not the source of mutation authority.
- Deny by default on missing role, scope, account mapping, workflow mapping, inactive identity, stale version, or revoked action.

### 8.3 Recommended initial action matrix

This is a recommendation, not an approved policy.

| Action | Director | Finance Manager | Manager | Secretary |
|---|---|---|---|---|
| Read organization financial data | Yes | Yes | Scoped | Scoped/minimized |
| Create/edit draft payment request | Yes | Yes | Optional scoped | Yes, scoped |
| Allocate draft expense | Yes | Yes | Optional scoped | Yes, scoped |
| Attach/replace draft documents | Yes | Yes | Optional scoped | Yes, scoped |
| Submit request | Yes | Yes | Optional scoped | Yes, scoped |
| Approve/reject sensitive payment | Yes | Optional below approved threshold | No | No |
| Execute payment | Per approved operational role | Optional if approved | No | No |
| Record payment confirmation | Yes | Recommended operational role | No | Recommended only if evidence-based and cannot self-approve |
| Change bank/account mapping | Yes | No by default | No | No |
| Manage users/roles/actions | Yes | No | No | No |
| Delete financial evidence | Director-only exception | No | No | No |

## 9. Supplier-payment workflow architecture

### 9.1 Why not use only `bank_transfers`

`bank_transfers` currently combines beneficiary/bank details, amount, category, unit/daycare, simple status, optional attachment, approval flag, and execution date. It has eight rows, no attachments, six rows without daycare/unit, three statuses, and no durable multi-document, allocation-set, approval-decision, or payment-confirmation event model. Extending it further would preserve ambiguity between a request, an approval, an instruction, and proof of payment.

### 9.2 Recommended aggregate

| Structure | Responsibility |
|---|---|
| `payment_requests` | Request header, supplier/payee reference, requested amount/currency, scope, due date, state, creator, versions |
| `payment_request_allocations` | One or more daycare/unit/category/month allocations whose sum equals requested amount |
| `payment_request_documents` | Private Storage object metadata, digest, type, uploader, lifecycle, malware/validation state |
| `payment_decisions` | Immutable submit/approve/reject/cancel decisions, actor, role, timestamp, reason, bound version/digest |
| `payment_executions` | Execution instruction/status without overwriting approval evidence |
| `payment_confirmations` | Payment date, reference, amount, evidence document, recorder, and reconciliation state |
| `payment_request_events` | Append-only lifecycle/audit projection |
| Optional `suppliers` | Canonical supplier identity and verified payment destination; requires separate privacy/master-data design |

Recommended state sequence:

`DRAFT → SUBMITTED → NEEDS_INFORMATION | APPROVED | REJECTED → SCHEDULED/EXECUTING → PAID_RECORDED → RECONCILED`

- Secretary owns draft completeness, allocation, document attachment, submission, and permitted corrections.
- Director owns approval/rejection of sensitive financial actions. Approval binds exact request version, amount, payee destination, allocations, and document digests.
- Payment execution is distinct from approval.
- Payment confirmation is distinct from execution and cannot rewrite the approval decision.
- Any material edit after approval invalidates approval and returns to review.
- Bank reconciliation links a confirmed payment to a source bank transaction without changing immutable bank source data.

### 9.3 Required controls

- Server-generated private object paths; no user-controlled bucket/path.
- File size, MIME/content sniffing, malware scanning, digest, and retention policy.
- Allocation sum invariant and scope consistency.
- Idempotency key and row-version checks.
- No self-approval where separation of duties is approved; no approval after role revocation.
- Threshold and substitute approver rules are data, not code branches.
- Immutable decision/confirmation history; corrections create new events/versions.
- Explicit handling of rejected/cancelled documents and legal holds.

## 10. Repair versus rebuild comparison

Scores: 1 poor, 5 strong. Cost score is higher when cheaper.

| Option | Security | Simplicity | Delivery speed | Cost | Maintenance | Data risk | Overall |
|---|---:|---:|---:|---:|---:|---:|---:|
| Repair current permission flags and functions in place | 2 | 2 | 4 | 4 | 2 | 4 | 18/30 |
| **Partial rebuild: preserve data, replace authorization/service workflow** | **5** | **4** | **3** | **3** | **5** | **4** | **24/30** |
| Extensive rebuild of portal and database | 4 | 3 | 1 | 1 | 3 | 1 | 13/30 |

### Option A — Repair in place

Fastest initial change, but every legacy `EDIT`, scope flag, Edge Function branch, service-role read, and future workflow would remain coupled. It has the lowest short-term cost and the highest probability of recurring authorization defects.

### Option B — Partial rebuild (recommended)

Adds a canonical authorization kernel and supplier workflow beside existing data, adapts one domain at a time, and retires old gates after parity. It preserves business value and limits migration risk while removing the core complexity.

### Option C — Extensive rebuild

Potentially clean, but it would reimplement tested calculations, import fingerprints, payroll/workforce invariants, responsive portal behavior, and 2,451 bank records. With the portal currently non-operational, a broad rebuild may appear attractive, but the data and domain model are not the main failure. The cost and reconciliation risk are unjustified without evidence that the canonical data is corrupt.

## 11. Phased implementation plan

No phase below is authorized by TRACK108.

### Phase 0 — Decisions and safety baseline

- Confirm Director Auth UUID and classify every active identity.
- Approve action matrix, thresholds, separation of duties, bank mappings, retention, and recovery.
- Freeze current data counts/digests and define rollback/reconciliation evidence.
- Create executable catalog/security contract tests before migration.

### Phase 1 — Authorization kernel

- Add roles, actions, effective-dated assignments/scopes, bank-account scopes, and private authorization helpers.
- Backfill only approved mappings; unresolved resources default deny.
- Add semantic authorization introspection for the UI.
- Do not yet remove legacy permissions.

### Phase 2 — Privileged boundary hardening

- Introduce scoped queries and action-specific command RPCs.
- Convert Bank/workforce/settings/users/transfer functions one surface at a time.
- Derive actor from trusted context, bind row versions/idempotency, and reduce service-role use.
- Normalize current effective non-Director `EDIT` values only after new action parity exists.

### Phase 3 — Supplier-payment pilot

- Add payment request/allocations/documents/decisions/executions/confirmations/events and private Storage controls.
- Migrate or link the eight current `bank_transfers` without deleting source rows.
- Pilot secretary draft/submit and Director approval with synthetic data and disposable identities.

### Phase 4 — Banking scope and reconciliation

- Activate approved account mappings.
- Scope Bank reads/imports/allocations.
- Link paid confirmations to immutable bank transactions.
- Resolve historical unallocated data only through an approved business process; never infer bulk mappings from account names.

### Phase 5 — Retirement and simplification

- Remove legacy mutation authority and obsolete transfer flags after parity.
- Archive superseded permission configurations under the approved audit policy.
- Retire Sheets/legacy routes only after telemetry and owner sign-off.
- Review unused indexes and dormant structures after real workload evidence; do not delete based solely on advisor “unused” status.

## 12. Exact decisions requiring Director approval

1. Confirm that Auth UUID `3af86c7f-6ba4-41f4-8d7c-1db262cf3e79` is the sole Director identity, or provide the correct UUID through a secure review.
2. Classify ריקי, שרון, and לאה as Finance Manager, Manager, Secretary, Auditor, inactive, or another approved role.
3. Approve each current effective non-Director `EDIT` outcome: action grant, read-only projection, or hidden.
4. Approve whether superseded permission configurations are retained indefinitely, archived for a period, or minimized after an audit export.
5. Map each of BA-001 through BA-005 to organization/daycare/allocation-unit scope and effective dates; approve default deny for unresolved mapping.
6. Decide whether restricted users may see unallocated transactions for mapped accounts and what fields must be redacted.
7. Approve secretary actions: create, edit draft, allocate, attach/replace documents, submit, correct after return, and record payment confirmation.
8. Approve whether the same person may create, submit, approve, execute, and/or confirm a payment; define prohibited combinations.
9. Approve Director-only actions and any finance-manager monetary thresholds, substitute approver, emergency/break-glass procedure, and vacation coverage.
10. Define what constitutes a material change that invalidates approval: amount, payee bank details, allocations, category/month, documents, or due date.
11. Approve payment states, rejection/cancellation/reopen rules, partial payments, over/underpayment, and reconciliation rules.
12. Approve supplier master-data ownership, bank-detail verification process, and sensitive-field visibility.
13. Approve attachment types, maximum size, malware scanning, retention, deletion, backup, legal hold, and signed-URL lifetime.
14. Approve Bank import source-file and row/evidence retention, including treatment of the two historical batches without actor.
15. Approve the exact-duplicate exception process; do not silently weaken the existing unique fingerprint.
16. Approve enabling Supabase leaked-password protection and the final-Director/break-glass recovery procedure.
17. Approve whether service-role functions remain an interim boundary and the deadline/acceptance criteria for their replacement.
18. Approve legacy Sheets/static-route retirement only after evidence of current use and data parity.
19. Approve a separate isolated Preview migration/function deployment and disposable-identity runtime test plan.
20. Approve Production only after the full role/scope/action and supplier-payment acceptance matrix passes.

## 13. Required acceptance evidence before implementation completion

- Director success and non-Director denial for every semantic action.
- Secretary can complete draft/allocate/attach/submit but cannot approve or change protected approval evidence.
- Cross-daycare, cross-unit, and cross-account invisibility, including unallocated rows.
- Immediate denial after role/scope/action revocation, including stale sessions on sensitive commands.
- Approval invalidation on every approved material change.
- No self-approval where prohibited; threshold and substitute behavior verified.
- Storage upload/read/delete/signed-URL controls, malicious file handling, cleanup, and retention verified.
- Service-role confused-deputy tests and direct RPC/table access tests.
- Bank import idempotency/duplicate invariants and payroll/workforce calculations unchanged unless explicitly approved.
- Data reconciliation proves no loss of historical profiles, permissions, accounts, transactions, allocations, transfers, imports, or audit events.

## 14. Final assessment

The portal's non-operational state permits a clean security cutover, but does not justify discarding valuable data or reimplementing the entire domain. The durable solution is to rebuild the authorization and financial workflow boundaries while preserving canonical records and proven invariants. The first implementation should not be a UI repair. It should be an approved authorization kernel and scoped command/query boundary, followed by the supplier-payment workflow and only then retirement of legacy structures.
