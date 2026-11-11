# TRACK118 — Full Director MCP Capability Audit

Date: 2026-11-11

Status: Audit complete; documentation only; implementation and Production rollout are not approved

Scope: Portal, Vercel APIs, Supabase schema/RPCs/Edge Functions, Director MCP server, deployment evidence, and tests

## Executive conclusion

The portal does **not** yet support complete Director-level operation through ChatGPT.

The current Director MCP is a strong, closed semantic foundation: `api/mcp.js` exposes 41 tools, authenticates the caller, requires an active `DIRECTOR` role before discovery or execution, delegates to action-gated RPCs using the caller JWT, and exposes no unrestricted SQL, table selector, or service-role credential. Policies, basic employee records, suppliers, canonical payment requests, payment attachments, payment lifecycle, execution evidence, statement import, and bank reconciliation have meaningful MCP coverage. Sensitive operations use approvals; mutable records use validation and/or optimistic concurrency; financial operations use idempotency and atomic RPCs; append-only audit evidence is retained; and financial imports/matching have durable asynchronous jobs.

The remaining gap is material. Employment records, assignments, pay terms, compensation eligibility, certificates, leave, payroll-month lifecycle, payroll rows and allocations, budgeting/configuration, daycare/classroom/master-data mutation, user/role administration, general reports/exports, and most imports are not exposed as MCP tools. Several of those operations already exist in portal Edge Functions and RPCs, but those portal paths use the legacy screen-permission/service-role workbench pattern and cannot simply be exposed to MCP. They must be wrapped by Director-only semantic commands that reuse the underlying validation and calculation logic.

The latest authenticated end-to-end MCP acceptance was a custom Node/Vercel JSON-RPC runner against Preview. It was **not actual ChatGPT MCP connector discovery and execution**. Therefore the project's primary acceptance criterion remains unmet even for the implemented 41-tool surface.

Production availability is also intentionally incomplete. TRACK110–116 database objects exist in the linked shared Supabase backend described as Preview, and the MCP implementation was exercised through Vercel Preview. The canonical Production Vercel alias was not promoted. TRACK117 blocks promotion because there is no independently verified complete backup/PITR restore point and migration history is not replay-clean. No Production change was made by TRACK118.

## Status vocabulary

- **Full**: the Director can complete the operation through the current MCP tool surface.
- **Partial**: MCP can read/analyze the domain or perform only part of its lifecycle.
- **None**: no semantic MCP tool exists for the operation.
- **Preview verified**: exercised through deployed Preview transport and linked backend with disposable data.
- **Contract verified**: static/local contract tests exist, but no complete live domain workflow was demonstrated.
- **ChatGPT unverified**: no recorded test used ChatGPT connector discovery, OAuth consent, tool invocation, and returned result as the client.
- **Production unavailable**: the required MCP/Vercel release is not served by the canonical Production alias, regardless of whether shared-backend schema objects exist.

## Capability matrix

| Business module / operation | Portal capability | Backend/API operation | MCP tool(s) | Read/write | Director authorization | Production availability | End-to-end status | Missing functionality |
|---|---|---|---|---|---|---|---|---|
| Director authorization and discovery | Read-only authorization dashboard | `portal_my_authorization`, role/action catalog | All discovery is gated; `data_capabilities` | Read | Active profile + `DIRECTOR`; default deny | Production unavailable | Preview transport verified; ChatGPT unverified | ChatGPT connector/OAuth acceptance; safe Director/credential recovery; authorization administration tools |
| Daycares and organizational visibility | Portal dashboards and selectors | `portal_mcp_list_daycares` | `list_daycares` | Read | Director gate plus RPC authorization | Production unavailable | Contract/live read evidence exists; ChatGPT unverified | Daycare/unit CRUD, lifecycle, school-year management, scoped detail queries |
| Policies / organizational documents | Portal document editor, versioning, publish/retire paths | Policy RPCs and private Storage | `list_policies`, `read_policy`, `create_policy`, `update_policy`, approval + single/bulk archive, upload/download | Read/write | Director actions; payload-bound approval for archive | Production unavailable | TRACK111 Preview E2E | Publish/version/history/search attachments are absent from MCP; no general document library or retention workflow |
| Employee core identity | Full portal workbench: list, create/update, deactivate/archive, import | `portal-workforce-workbench`; MCP employee RPCs | `staff_by_daycare`, operational search/analysis, duplicate check, create, update, import | Read/write, limited | Director-only MCP actions; caller-derived actor | Production unavailable | TRACK112 live disposable MCP acceptance; ChatGPT unverified | MCP deactivate/archive; get-by-ID/full profile; import preview/status; larger async import; portal and MCP command-path unification |
| Employments | Portal read/write | Workbench direct semantic route over `employments` | None | Portal read/write; MCP none | Portal legacy screen authorization only | No MCP Production capability | Portal tests only | Create/update/close employment; concurrency, validation, idempotency, audit verification through canonical MCP RPCs |
| Employee assignments | Portal read/write, effective dating | Workbench `save_assignment` over `employee_assignments` | None | Portal read/write; MCP none | Portal legacy screen authorization only | No MCP Production capability | Portal/workforce tests only | List/create/update/end assignments; daycare/classroom/role scope validation; overlap rules; atomic reassignment |
| Pay terms and salary conditions | Portal version/close flows | `portal_version_employee_pay_term`, `portal_close_employee_pay_term` | None | Portal read/write; MCP none | Portal legacy screen authorization only | No MCP Production capability | Focused payroll/workforce tests | Read/version/close tools; effective-date conflict detection; approval policy for sensitive compensation changes |
| Compensation eligibility | Portal read/write | Workbench `save_eligibility` | None | Portal read/write; MCP none | Portal legacy screen authorization only | No MCP Production capability | Portal tests only | Semantic MCP CRUD, effective dating, rule validation, audit/result verification |
| Certificates and training compliance | Portal read/write and compliance display | Workbench `save_certificate`; certificate tables | None | Portal read/write; MCP none | Portal legacy screen authorization only | No MCP Production capability | Portal tests only | Search expiring/missing; add/update/retire certificate; private evidence upload; reminder/report jobs |
| Leave / employee status periods | Portal read/write | Workbench `save_leave` | None | Portal read/write; MCP none | Portal legacy screen authorization only | No MCP Production capability | Portal tests only | Semantic leave CRUD, overlap validation, lifecycle/status consequences, reporting |
| Employee bulk import | Portal supports up to 5,000 rows; MCP supports 100 | `portal_import_employees`; `portal_mcp_import_employees` | `import_employees` | Write | Director-only MCP action | Production unavailable | Preview live for bounded import | Shared preview/commit contract; durable async job over 100; cancellation, status, downloadable error report, row lineage |
| Payroll read and analysis | Portal month lists, workbench, reports | Workforce Edge Function and payroll tables/RPCs | `search_operational_data(domain=payroll)`, `analyze_operational_data` | Read only in MCP | Director data actions | Production unavailable | Contract/live operational search coverage; not full payroll E2E | Detailed month/employee/component/allocation reports; stable schemas; pagination/export |
| Payroll month lifecycle | Portal open, close, reopen | `portal_open_payroll_month_v2`, close/reopen RPCs | None | Portal write; MCP none | Portal screen permissions, not canonical MCP actions | No MCP Production capability | Portal focused tests | Open/validate/close/reopen tools; exact approvals where required; lock-state and stale-version semantics |
| Payroll rows and temporary employees | Portal preview/import/save/delete/temporary approval | Workforce Edge Function, payroll save RPCs/tables | None | Portal write; MCP none | Portal screen permissions | No MCP Production capability | Portal focused tests | Preview/commit import jobs; row CRUD; temporary approval; delete/void policy; canonical Director actions and audit |
| Payroll allocations/splits | Portal preview/save splits | `portal_save_payroll_allocations` | None | Portal write; MCP none | Portal screen permissions | No MCP Production capability | Portal atomicity/workbench tests | Read/preview/save allocation tools; total equality; optimistic concurrency; batch atomicity |
| Salary calculator | Interactive portal calculator | Browser calculation logic | None | Calculation only | Portal access | Not an MCP capability | Browser calculation tests | Server-side reusable calculation command with versioned inputs/rules and explainable output |
| Budget calculations and snapshots | Portal dashboards/calculations | Browser calculation modules, legacy Vercel Budget API/engine, Supabase budget tables | No budget-specific MCP tool | Portal read/calculation; MCP none | No canonical MCP budget action | No MCP Production capability | Budget engine/browser tests only | Query calculated budget, scenario analysis, snapshot creation, variance report, provenance and rule-version output |
| Budget rules/configuration | Settings/rules portal surfaces | Supabase configuration tables/RPC patterns | None | Portal-dependent; MCP none | Legacy settings permissions | No MCP Production capability | Settings tests only | Director semantic CRUD/versioning, effective dating, impact preview, approval, rollback/reference history |
| Occupancy, classrooms and enrollment | Portal calculator/dashboard; aggregate monthly enrollment | Browser calculation logic and Supabase domain tables | None | Portal read/calculation; MCP none | No canonical MCP action | No MCP Production capability | Browser calculation tests | Classroom/enrollment reads and writes, scenario tool, rule-backed validation, import and reporting; no child/parent person-level model |
| Bank transaction search/analysis | Bank workbench and accounting dashboards | Bank Edge Function/tables; operational MCP RPC | `search_operational_data(domain=banking)`, `analyze_operational_data`, `search_bank_reconciliation` | Read | Director data/reconciliation actions | Production unavailable for Director MCP | TRACK115 imported-row lookup | Rich transaction filters/detail/export; assignment/edit workflow; unified bank account scope contract |
| Bank statement import | Portal bank upload/history | Durable financial job, cron worker, import tables | `enqueue_bank_statement_import`, `get_financial_job` | Write/read status | Director-only action | Production unavailable | TRACK115 Preview E2E | File parsing/preview contract, cancellation/retry administration, error artifact, generalized ingestion lineage, ChatGPT attachment/file path |
| Bank allocation / accounting assignment | Portal bank workbench supports assignment/split workflows | Bank workbench Edge Function and atomic accounting RPCs | No direct allocation/edit tool | Portal write; MCP none except reconciliation | Portal screen permissions | No MCP Production capability | Portal atomicity tests | MCP preview/save/split/unassign commands with canonical Director authorization and accounting invariants |
| Reconciliation suggestions | No equivalent complete Director chat flow | Durable suggestion job; suggestion table | `enqueue_reconciliation_suggestions`, `get_financial_job` | Write/read result | Director-only action | Production unavailable | TRACK114 live acceptance | List/inspect/reject suggestions; explain confidence; expiry/rebuild; no auto-confirm by design |
| Bank reconciliation confirmation | Portal/accounting visibility | Atomic reconciliation RPCs | `search_bank_reconciliation`, `confirm_bank_reconciliation` | Read/write | Director-only; idempotent, bounded | Production unavailable | TRACK115 Preview E2E | Reversal/correction workflow; approval policy decision for high-risk confirmations; richer evidence/reporting |
| Suppliers | Supplier portal shell exists; canonical backend added | Supplier semantic RPCs | search, duplicate check, create, update, import | Read/write | Director-only actions | Production unavailable | TRACK113/115 Preview E2E for create/update-related lifecycle | Archive/reactivate; full bank-detail history; async bulk import; portal UI parity; tax/identity business rules |
| Supplier bank details | No mature staff-facing UI demonstrated | Proposal/event/approval RPCs | propose, request verification approval, verify | Write | Director-only; exact one-time approval | Production unavailable | TRACK115 Preview E2E | Read/list detail tool; separation-of-duties/independent verifier decision; change cancellation; masking/export |
| Payment requests | No complete canonical portal UI demonstrated; legacy bank transfers remain separate | Canonical payment aggregate RPCs | search, create, update, import, transition approval, transition, analysis | Read/write | Director-only; approvals for sensitive states | Production unavailable | TRACK115 full Preview lifecycle | Get-by-ID/history; draft archive/reopen; async import; thresholds; separation of duties; legacy migration/reconciliation policy |
| Payment documents | Portal document surfaces are separate | Private Storage + atomic attachment operation state machine | `upload_payment_document` | Write | Director-only; actor-bound, idempotent | Production unavailable | TRACK116 failure injection and Preview E2E | List/download payment documents; replace/retire; malware scanning; retention/legal hold; larger files |
| Payment execution evidence | No complete canonical portal UI demonstrated | Immutable execution and allocation RPCs | `record_payment_execution` | Write | Director-only | Production unavailable | TRACK115 Preview E2E | Read/list execution evidence; correction/reversal policy; external bank execution integration; separation of duties |
| Legacy bank transfers | Full portal workbench with approvals and attachments | Dedicated Edge Function and transfer tables | None | Portal read/write; MCP none | Legacy screen/action controls | No MCP Production capability | Portal/Production tests exist for legacy workflow | Semantic MCP parity or approved migration to canonical payment requests; prevent duplicate sources of truth |
| Reports, dashboards and exports | Rich management dashboards and several CSV/report views | Mostly browser aggregation plus domain APIs | Operational analysis and supplier/payment analysis only | MCP read, limited | Director data actions | Production unavailable | Partial aggregate acceptance | Enumerated report catalog, parameterized reports, drill-down, CSV/PDF generation, async large reports, artifact download |
| Data-quality issues | Portal surfaces some issues | `data_quality_issues`, import/audit structures | `data_capabilities` and limited analyses | Read, partial | Director read/analyze | Production unavailable | Contract checks | Search/assign/resolve/reopen issues; lineage to source rows; bulk remediation with approvals |
| Master data: units, roles, daycares, classrooms, years, categories | Portal settings/administration surfaces vary | Supabase master/config tables and existing RPCs | `list_daycares` only | MCP read minimal | No MCP mutation actions | No MCP Production capability | Portal/settings tests only | Closed semantic CRUD/versioning, dependency checks, archive/restore, impact preview, audit |
| Users, roles and permissions | Read-only authorization dashboard; mutation intentionally frozen | Canonical role/action tables; portal-users GET | None | Read via portal only | Sole Director model | No MCP Production capability | TRACK110 authorization tests | Secure user invite/deactivate, role assignment/revocation, final-Director safeguard, break-glass and recovery; approval/reauthentication |
| Audit and history | Multiple portal/domain histories | Authorization audit, domain audit, lifecycle/event tables | No audit-query tool | Backend write; MCP no read | Writes derive actor server-side | Data exists in shared backend; no MCP Production interface | Auditing asserted in TRACK111–116 | Director audit search/export, correlation IDs, MCP client identity, redaction/retention, tamper-evidence monitoring |
| Long-running operations | No unified job center | Financial job table + pg_cron worker | enqueue statement/suggestions; `get_financial_job` | Read/write, financial only | Director-only | Production unavailable | TRACK114/115 Preview E2E | Generic job contract, cancel/retry, progress, result artifacts, employee/payroll/supplier/report imports, dead-letter operations |

## Existing MCP tool inventory

The 41 semantic tools in `api/mcp.js` fall into these groups:

1. **Policies/documents (10):** list, read, create, update, two approval-request tools, single/bulk archive, policy file upload/download.
2. **Organization/staff reads (2):** list daycares and staff by daycare.
3. **Operational discovery/data (3):** capabilities, bounded search, verified aggregate analysis.
4. **Employees (4):** duplicate detection, create, update, bounded synchronous import.
5. **Suppliers and bank details (8):** search, duplicate detection, create, update, import, propose bank detail, request verification approval, approval-bound verification.
6. **Payments/documents (7):** search, create, update, import, attachment upload, transition approval, transition.
7. **Execution/reconciliation/jobs (7):** record execution, search and confirm reconciliation, enqueue statement import, enqueue suggestions, get job, supplier/payment analysis.

This is a closed allowlist. Unknown tool names are rejected; request arguments are validated; bulk sizes are bounded; and the MCP source contains no generic SQL or generic table operation.

## Security and integrity assessment

### Controls already present

- Server-side active-Director gate runs before `tools/list` and `tools/call`.
- Domain RPCs additionally require semantic action codes; only `DIRECTOR` received TRACK110–116 actions.
- Caller identity comes from the bearer JWT and `auth.uid()`, never from tool arguments.
- Direct authenticated table access to new financial tables is revoked and RLS/default-deny is enabled.
- Sensitive policy, bank-detail, and payment transitions use short-lived, one-time, payload-bound approvals.
- Employee, supplier, payment, and policy updates use optimistic concurrency where implemented.
- Payment, attachment, execution, reconciliation, and financial-job operations use idempotency where required.
- Financial confirmation RPCs lock and validate totals atomically; suggestion jobs never auto-confirm.
- Policy and payment attachments use private Storage; payment attachment finalization/compensation is stateful and retry-safe.
- Mutation paths retain authorization/domain audit or lifecycle events.

### Security gaps that block complete Director operation

1. Actual ChatGPT OAuth discovery/consent/refresh/tool execution has not been accepted. A raw JSON-RPC runner cannot prove connector compatibility, schema rendering, attachment handling, consent UX, token refresh, or ChatGPT result behavior.
2. Director recovery is not operationally safe. The sole-Director model lacks a fully verified final-Director safeguard and tested recovery path, and leaked-password protection remains disabled.
3. Production recovery is not certified. No independently verified complete backup/PITR restore exists, and migration history has timestamp/content drift. This blocks safe promotion.
4. The portal workbench Edge Functions use a service-role data plane after legacy screen checks. Reusing them directly for MCP would create a confused-deputy risk. Shared business logic must move behind canonical semantic RPCs/commands first.
5. Cross-domain audit is not queryable through MCP and does not yet prove a uniform client/provider/session/correlation envelope for every operation.
6. File controls lack malware scanning, retention/legal-hold policy, and complete list/download/retire operations for payment documents.
7. Financial separation-of-duties, thresholds, independent bank-detail verification, and correction/reversal policy still require Director/finance decisions.
8. Generic asynchronous operations do not exist. Only statement import and reconciliation suggestions use the durable queue.

## Prioritized implementation plan

### P0 — Prove the real ChatGPT boundary and unblock safe release

1. Create an isolated/disposable Preview Director identity and connect the deployed Preview MCP as an actual ChatGPT custom MCP connector.
2. Verify protected-resource metadata, OAuth/PKCE consent, discovery of all expected tools, Director denial/revocation, token refresh, one read, one safe write, one approval-bound write, private file upload/download, one async job, and returned structured content.
3. Record the ChatGPT client/provider/session in the audit envelope without storing prompt text or secrets.
4. Add an automated connector-level acceptance checklist or harness where the platform permits; retain an explicit manual ChatGPT acceptance gate otherwise.
5. Resolve TRACK117 recovery gates: complete encrypted backup, isolated restore, migration-history reconciliation, and leaked-password/recovery decisions. Do not promote Production until these gates pass.

Acceptance: ChatGPT—not a custom JSON-RPC substitute—discovers and executes the Preview tools under the correct Director identity, revocation takes effect, evidence is auditable, and Production remains untouched.

### P1 — Workforce Director parity

Add semantic, caller-JWT, Director-only query/command RPCs and MCP tools for:

- employee get/deactivate/archive;
- employments;
- effective-dated assignments;
- pay terms;
- compensation eligibility;
- certificates and evidence;
- leave/status periods;
- async employee import preview/commit/status/cancel/error artifact.

Reuse workbench validation and existing versioning RPCs by extracting shared database commands rather than calling the service-role Edge Function from MCP. Require optimistic concurrency, overlap/effective-date validation, idempotency for creates/imports, persisted-result verification, and audit for every mutation.

### P2 — Payroll lifecycle and allocation parity

Expose detailed payroll queries, open/close/reopen month, preview/commit import, row save/void, temporary-employee approval, allocation preview/save, and reports. Reuse the existing payroll RPCs and calculation modules. Add canonical `PAYROLL.*` actions, stale-version protection, month locks, exact approval artifacts for close/reopen/temporary exceptions as policy dictates, and durable jobs for large imports/reports.

### P3 — Budgeting, occupancy, configuration and master data

Move reusable browser-only calculations behind deterministic server-side services without changing Budget Engine behavior. Add tools for calculated budget/variance/scenario reads first, then snapshot and rule/configuration versioning with impact preview and approval. Add closed commands for daycares, school years, classrooms, enrollment aggregates, roles, categories, and other master data with dependency checks and soft lifecycle transitions.

### P4 — Complete finance, documents and reporting

- Add bank assignment/split/unassign tools using existing atomic accounting writes.
- Decide and implement legacy bank-transfer versus canonical payment-request convergence.
- Add supplier archive/reactivate, bank-detail reads/history, payment detail/history, attachment list/download/retire, execution reads, reconciliation reversal/correction, and job cancellation/retry.
- Add a report catalog with bounded parameter schemas, synchronous small reports, asynchronous large CSV/PDF artifacts, and private downloads.
- Add data-quality issue search/assignment/resolution with source lineage.

### P5 — Director administration and operational hardening

After recovery policy is approved, add reauthenticated and approval-gated user invite/deactivate, role assignment/revocation, final-Director protection, and break-glass recovery. Add uniform correlation/audit search, rate limits/quotas, redaction tests, abuse monitoring, job operations, connector compatibility tests, and operational runbooks.

## Required implementation pattern

Every new capability should follow one path:

`ChatGPT MCP tool -> strict JSON schema -> Director/action authorization -> domain validation -> optional exact approval -> semantic transaction/RPC -> audit/outbox -> verified structured result`

Do not expose table names, SQL, arbitrary RPC names, Storage paths chosen by the caller, or a service-role credential. Portal and MCP should converge on the same domain query/command services; neither should call the other UI transport layer. Long work must enqueue a durable idempotent job and return a job ID with bounded status/result retrieval.

## Remaining blockers and decisions

1. Complete backup/PITR and isolated restore evidence is unavailable; migration replay history is not clean (TRACK117–117g).
2. Actual ChatGPT MCP connection and tool execution are untested.
3. Sole-Director recovery, final-Director protection, and break-glass policy are not approved/tested.
4. Leaked-password protection remains disabled.
5. Financial thresholds, separation of duties, independent bank verifier, self-approval rules, reversal/correction, and legacy-payment migration are unresolved.
6. File malware scanning, retention, legal hold, MIME/content verification, and payment-document download/retire policy are unresolved.
7. No generic durable job platform exists beyond the financial worker.
8. Children/parents are not person-level domains; collections are not modeled. `monthly_enrollment` is aggregate-only.
9. Portal workbench and canonical MCP authorization/command paths are not unified for workforce, payroll, banking assignments, settings, or master data.
10. Production MCP availability cannot be claimed until the approved commit, database state, Vercel deployment ID/Git SHA, canonical alias, authenticated Production discovery, and representative read/write workflows are all verified.

## Validation evidence used

- MCP implementation: `api/mcp.js`.
- Isolated earlier Edge MCP: `supabase/functions/portal-mcp-server/index.ts` (two read-only tools; not the Director server of record).
- Portal workbenches: `supabase/functions/portal-workforce-workbench/index.ts`, bank/payment Edge Functions, and `chamah-manager-portal/new/*`.
- Authorization and domain migrations: TRACK110, TRACK112, TRACK113, TRACK114, TRACK116 migrations.
- Contract tests: TRACK110, TRACK112, TRACK113, TRACK114, TRACK116 tests.
- Live Preview acceptance: TRACK111, TRACK112, TRACK113, TRACK114, TRACK115, and TRACK116 records in `PROJECT_LOG.md`.
- Production/recovery gate: TRACK117–117g records in `PROJECT_LOG.md`.

No application code, database, migration, Edge Function, Vercel deployment, Supabase setting, Production alias, or business record was changed by TRACK118.
