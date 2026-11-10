# TRACK104 — Unified Ingestion Contract and Bank Pilot Design

Status: proposed, read-only design completed 2026-11-10

Scope: shared permission-scoped ingestion control plane, piloted against Bank imports

Implementation status: no code, schema, data, function, or deployment change was made

## 1. Decision summary

The portal should adopt one versioned ingestion control plane around the existing domain workflows. It should reuse `import_batches`, `import_rows`, `data_quality_issues`, `audit_events`, the portal permission catalog, and the existing atomic domain commit RPCs. It must not expose generic table writes or replace domain validation.

The Bank workflow is the first pilot because it already has the strongest reusable guarantees: upload and preview, deterministic fingerprints, exact duplicate detection, an atomic confirmation RPC, immutable source transactions, and upload history. The pilot should move canonical parsing and staged validation to a server-side adapter, persist the preview and every source row, require an explicit approval bound to an immutable preview version, and delegate the final write to an extended transactional Bank commit RPC.

This document proposes future changes only. Names and signatures are design targets, not deployed contracts.

## 2. Evidence and constraints

### 2.1 Verified current implementation

- The active Bank client parses XLSX, legacy XLS, CSV, and HTML-table exports, supports manual column mapping, and submits normalized rows for preview.
- `portal-bank-workbench` authenticates the caller and requires `dashboards.accounting.banks` VIEW for reads and EDIT for mutations.
- Bank preview matches one active `bank_accounts` row, validates date/description/amount, calculates SHA-256 over bank account ID, transaction date, normalized reference, and amount rounded to two decimals, and checks existing transactions.
- The preview token is a random UUID returned to the client but is not a persisted, signed, or expiring preview artifact.
- The client submits all preview rows back on confirmation. The Edge Function filters to `importable` rows and calls `portal_confirm_bank_import`.
- `portal_confirm_bank_import` is service-role-only. It revalidates accepted rows, rejects duplicate fingerprints within the request and against `bank_transactions`, and atomically inserts the completed batch and transactions.
- The database unique constraint on `(bank_account_id, source_fingerprint)` remains the final race-condition guard.
- `import_batches` is operational. `import_rows` and `data_quality_issues` exist but TRACK103 verified that they are not populated in the live project.
- Employee and Payroll flows also preview and commit imports, but use different request shapes, summaries, matching rules, and persistence behavior.

### 2.2 Preservation constraints

- Preserve current domain tables, calculations, Bank fingerprint semantics, immutable Bank source rows, allocation separation, and atomic commit behavior.
- Preserve existing API behavior until a separately approved implementation track introduces a versioned transition.
- Preserve the Bank workbench permission check and add narrower ingestion actions; do not infer authorization from possession of a batch ID.
- Keep service-role credentials inside trusted server components. Clients and AI connectors must use caller identity and purpose-built operations.
- Do not conflate Bank source transactions with BANKS compatibility allocation-ledger rows.
- Do not backfill historical imports in the pilot.

## 3. Current import contract map

| Workflow | Intake and parsing | Preview and validation | Approval/commit | Persistence and audit | Reusable parts | Gaps to standardize |
|---|---|---|---|---|---|---|
| Bank files | Browser parses XLSX/XLS/CSV/HTML, auto-detects or manually maps columns | Edge Function validates account, fields, exact duplicate fingerprint, and returns row classifications | Same user confirms; client resubmits rows; service-role-only `portal_confirm_bank_import` commits atomically | `import_batches`, `bank_transactions`, source payload, unique fingerprint, upload history | Permission gate, normalization/fingerprint rules, exact duplicate guard, atomic RPC, immutable facts | Server parser, persisted batch before commit, durable rows/issues, preview version/expiry, approval record, idempotency key |
| Employees | Browser mapping/preview; import action accepts up to 5,000 rows | Domain validation and upsert decisions occur in `portal_import_employees` | Requires `dashboards.staffing.employees.import` EDIT; one RPC performs batch and entity work | Batch and employee/employment records; saved user column mapping | Dedicated permission, batch creation, reusable mappings, atomic domain function | Common envelope/results, row lineage/issues, durable approval, content idempotency, consistent actor/source metadata |
| Payroll | Browser prepares rows; workbench has `preview_import`, `commit_import`/`save_rows`, and a separate single-record save path | Employee linking, month and numeric checks, row health, payroll-month lifecycle checks | Workbench permission plus current-month checks; bulk RPC `portal_save_payroll_rows_v2`; some single rows create batches directly | Payroll batches/records/allocations and audit events | Domain matching, month lifecycle, atomic bulk RPC, balanced allocation rules | Consolidate parallel paths, row lineage/issues, batch idempotency, persistent preview/approval |
| Google Sheets compatibility | Server APIs read configured Sheets for Budget and BANKS compatibility | Domain-specific engines normalize and calculate | Read-only APIs; no unified commit | Legacy source metadata and existing `sheet_*` lineage | Read-only adapters and reconciliation identifiers | Must enter shared contract only through explicit adapters; Budget parity is a separate program |
| AI/MCP | Current MCP surfaces are read-only and caller-JWT scoped | No ingestion preview tools | No ingestion approval or commit | No ingestion provenance | OAuth/caller-JWT model and narrow tools | Add status/read and draft-preview only after RLS review; defer commit authority |

### 3.1 Common elements worth reusing

1. `import_batches` as the batch aggregate and operational lifecycle record.
2. `import_rows` as the immutable source-row and validation ledger.
3. `data_quality_issues` as the durable review queue.
4. `audit_events` as the cross-domain action history.
5. Existing portal permissions, organization/daycare scopes, and caller identity.
6. Domain RPCs as final validators and writers.
7. Bank exact fingerprints and database uniqueness as duplicate protection.
8. Domain-specific user mapping preferences, without treating preferences as canonical source data.

### 3.2 Elements that must remain domain-specific

- File format adapters and field aliases.
- Master-data matching and domain validation rules.
- Exact and possible-duplicate algorithms.
- Commit payload construction and canonical target tables.
- Financial balance, payroll-month, employment, certificate, and Budget parity rules.

## 4. Unified contract

### 4.1 Ingestion envelope

Every upload or connector submission should resolve to a server-generated batch with this logical envelope:

```json
{
  "contract_version": "1.0",
  "ingestion_type": "BANK_TRANSACTIONS",
  "source_kind": "PORTAL_UPLOAD",
  "source_system": "BANK_EXPORT",
  "requested_operation": "APPEND",
  "source": {
    "file_name": "example.xlsx",
    "sheet_name": null,
    "content_digest": "sha256:...",
    "media_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  },
  "parser": {
    "parser_id": "bank-export",
    "parser_version": "1",
    "schema_version": "bank-row/1"
  },
  "scope": {
    "organization_id": null,
    "allocation_unit_id": null,
    "daycare_id": null,
    "bank_account_id": "uuid"
  },
  "idempotency_key": "caller-or-server-key",
  "correlation_id": "uuid",
  "parent_batch_id": null
}
```

Rules:

- The server derives the actor, actor type, permission snapshot, tenant scope, received timestamp, and canonical content digest. Client assertions cannot override them.
- `ingestion_type` is an allowlisted domain contract, never a table name.
- `requested_operation` is allowlisted per domain. Version 1 supports `APPEND`, `UPDATE_SOURCE_FIELDS`, and `RECONCILE`; Bank pilot supports `APPEND` only.
- The unique idempotency scope is actor/connector identity + ingestion type + effective scope + idempotency key. The content digest separately identifies identical bytes.
- File names are display metadata and never a duplicate key.
- Raw files should be stored in private object storage only if retention is approved. Database rows store an object reference and digest, not large file bytes.

### 4.2 Standard batch response

Every operation returns the same top-level structure:

```json
{
  "contract_version": "1.0",
  "batch_id": "uuid",
  "state": "NEEDS_REVIEW",
  "version": 3,
  "preview_expires_at": "2026-11-10T12:00:00Z",
  "summary": {
    "total": 100,
    "valid": 90,
    "warnings": 5,
    "errors": 3,
    "exact_duplicates": 2,
    "accepted": 0
  },
  "allowed_actions": ["READ", "APPROVE", "CANCEL"],
  "issues": [],
  "links": {}
}
```

The server computes `allowed_actions` from current identity, permission, scope, batch state, and separation-of-duties policy. It is informative only; every mutation rechecks authorization.

## 5. Lifecycle and state machine

### 5.1 Lifecycle

1. **Upload** — Authenticate, authorize upload, enforce size/type limits, stream to quarantine/private storage, compute content digest, create or replay an idempotent batch, and record source metadata. No canonical business row is changed.
2. **Parse** — Select an allowlisted versioned parser, scan the source, create one `import_rows` record per physical source row, and retain raw/parsed payloads according to retention policy.
3. **Preview** — Normalize data, resolve allowed master data, compute proposed operations and duplicate signals, and produce a versioned immutable preview projection.
4. **Validation** — Apply structural, referential, authorization-scope, domain, duplicate, and cross-row rules. Persist row results and durable issues.
5. **Approval** — An authorized user approves the exact batch version and preview digest. Approval is refused for blocking issues or stale/expired previews. High-risk domains may require a different approver from the uploader.
6. **Commit** — Acquire a batch lock, recheck authorization/scope, preview digest, rules/master-data versions, idempotency, and final domain constraints. Invoke one atomic domain RPC. Link accepted rows to canonical entities.
7. **Audit** — Persist the commit result, actor/approver identities, permission/scope snapshot, row outcomes, domain audit events, and terminal batch status. Failures preserve diagnosis without exposing secrets.

### 5.2 Proposed states

```text
RECEIVED -> PARSING -> PARSED -> VALIDATING -> PREVIEW_READY
                                      |             |
                                      v             v
                                   FAILED       NEEDS_REVIEW
                                                     |
                                         APPROVED <-+
                                             |
                                         COMMITTING
                                      +------+------+
                                      |             |
                                  COMPLETED   COMPLETED_WITH_ERRORS

Any pre-commit nonterminal state -> CANCELLED
Transient execution failure -> FAILED_RETRYABLE
Permanent parser/validation/commit failure -> FAILED
```

State transitions must use compare-and-swap on `row_version`. Only the commit RPC may enter `COMMITTING`; only that transaction may set a completed state. A retry against a completed idempotency key returns the existing result.

### 5.3 Approval contract

- Approval binds `batch_id`, `batch_version`, `preview_digest`, `approved_operation`, issue disposition set, approver, and expiry.
- Editing mappings, source scope, parsed fields, or issue decisions invalidates prior approval and produces a new version.
- Approval is not proof of commit permission. Commit rechecks current permission and scope.
- `CRITICAL` issues block approval. `WARNING` issues require explicit disposition. `INFORMATION` issues remain visible and do not block. `OK` should be represented as a validation result, not normally as an issue row.
- `APPROVED_IGNORE` requires the existing approver/reason/time metadata and optionally an expiry. It is never a substitute for resolving an authorization or integrity error.

## 6. Permission model

### 6.1 Proposed actions

Use purpose-built actions mapped to portal sections or a dedicated ingestion permission catalog:

| Action | Meaning | Bank pilot mapping |
|---|---|---|
| `INGESTION_UPLOAD` | Create a batch and submit content | `dashboards.accounting.banks` EDIT initially |
| `INGESTION_PREVIEW` | Parse/validate and view permitted row details | EDIT for own Bank batches; VIEW may read redacted summaries only |
| `INGESTION_REVIEW` | Assign/resolve warnings and nonblocking issues | EDIT, scoped to allowed bank accounts |
| `INGESTION_APPROVE` | Approve exact preview version | EDIT initially; optional separate approval flag later |
| `INGESTION_COMMIT` | Request domain commit | EDIT; server invokes service-role-only RPC |
| `INGESTION_AUDIT_READ` | Read batch/row/audit history | VIEW with row redaction and scope filtering |
| `INGESTION_ADMIN` | Retry/cancel stuck jobs, manage parsers/connectors | Explicit admin permission only |

### 6.2 Scope rules

- Every batch stores its effective scope and authorization snapshot at creation, but current permissions govern every subsequent read and action.
- Scope checks apply at both batch and row levels. A mixed-scope source is split into authorized batches or rejected; it is never partially hidden inside one commit without an explicit contract.
- Bank pilot scope is the selected `bank_account_id`. A new mapping table should associate bank accounts with the organizational scope model if Bank access must become narrower than the current screen-level permission.
- Direct access by UUID must return not found or forbidden without revealing cross-scope existence.
- Revocation immediately blocks preview detail, approval, and commit. Existing audit records remain accessible only under audit retention policy.

## 7. Row-level lineage

### 7.1 Required lineage chain

```text
source object + digest
        -> import_batch + parser/version + scope
        -> import_row + physical row identity + row fingerprint
        -> preview proposal + validation rule/version
        -> approval/disposition
        -> canonical entity + domain audit event
```

Each physical row receives a stable `source_row_key` derived from parser identity and physical location, plus a `row_fingerprint` derived from normalized business fields. These serve different purposes: source keys identify a location in one source; fingerprints support duplicate and replay analysis.

### 7.2 `import_rows` behavior

- Insert rows during parse, before domain commit.
- Keep `raw_payload` as received values and `parsed_payload` as the normalized version used for validation. Never overwrite the original raw payload.
- Store parser/schema versions, row fingerprint, preview digest, proposed operation, match result, validation status, and structured validation results.
- On commit, set accepted entity type/ID and committed timestamp for each accepted row.
- Exact duplicates and invalid rows remain linked to the batch with `REJECTED` or `DUPLICATE` outcomes; they are not discarded.
- One source row that produces multiple canonical entities uses a child `import_row_entity_links` table rather than overloading the existing single accepted entity columns.

### 7.3 Validation result shape

Each result should be deterministic and machine-readable:

```json
{
  "rule_code": "BANK.DATE.REQUIRED",
  "rule_version": "1",
  "severity": "CRITICAL",
  "field": "transaction_date",
  "message_key": "bank_date_required",
  "evidence": { "source_value": "" },
  "blocking": true
}
```

Human-readable Hebrew text is rendered from `message_key`; persisted evidence must be minimal and must not duplicate sensitive values unnecessarily.

## 8. Data-quality issue recording and review

### 8.1 When to create an issue

- Persist a `data_quality_issues` row for every actionable CRITICAL or WARNING result.
- INFORMATION results may remain in row validation JSON unless they require durable follow-up.
- Repeated evaluations of the same logical issue update its current evaluation and append immutable history; they must not silently delete the original finding.
- Authorization failures, malware findings, and secret leakage are security events, not ordinary data-quality issues. Record them in security/audit telemetry with restricted visibility.

### 8.2 Proposed issue identity

Use a unique logical key over batch, import row, rule code, rule version, and affected field/entity. This prevents duplicate issue rows on retry while allowing a rule-version change to create a new evaluation.

### 8.3 Review workflow

1. Reviewer filters by ingestion type, batch, severity, rule, status, assignee, and age.
2. Reviewer sees source context, normalized proposal, rule evidence, and permitted canonical match context.
3. Reviewer chooses `RESOLVE`, `APPROVED_IGNORE`, `REPARSE`, `REMAP`, or `CANCEL_BATCH` according to allowed actions.
4. Every disposition records actor, time, notes/reason, prior state, and resulting batch version.
5. Expired approved ignores reopen on reevaluation.
6. Commit refuses unresolved blocking issues and includes issue counts in its audit result.

The existing `ignored_*` columns conflict with the later canonical status name `APPROVED_IGNORE`. A future migration should deprecate or consistently map legacy `ignored_by_user_id`/`ignored_at`; it must not create two independent ignore authorities.

## 9. Proposed database changes

All changes below require a separate approved implementation track and forward-only migrations.

### 9.1 Extend `import_batches`

Proposed columns:

- Contract: `ingestion_type`, `contract_version`, `source_kind`, `requested_operation`.
- Provenance: `source_system`, `source_object_path`, `content_digest`, `media_type`, `parser_id`, `parser_version`, `schema_version`.
- Identity: `actor_type`, `connector_id`, `delegated_user_id`, `correlation_id`, `parent_batch_id`.
- Idempotency: `idempotency_key`, unique effective-scope key, `result_digest`.
- Scope: `organization_id`, `allocation_unit_id`, `daycare_id`, domain scope JSON; Bank pilot adds `bank_account_id`.
- Lifecycle: expanded state, `state_changed_at`, `preview_version`, `preview_digest`, `preview_expires_at`, `approval_required`, `approved_by_user_id`, `approved_at`, `committed_at`, `cancelled_at`, `failure_code`, `retry_count`.
- Concurrency: retain and enforce `row_version` compare-and-swap.

Prefer typed columns for security, state, and idempotency fields. Use metadata only for non-contract extension data.

### 9.2 Extend `import_rows`

Proposed columns:

- `parser_id`, `parser_version`, `schema_version`.
- `row_fingerprint`, `raw_payload_digest`, `preview_version`, `preview_digest`.
- `proposed_operation`, `match_status`, `matched_entity_type`, `matched_entity_id`, `match_confidence`.
- `validation_results`, `committed_at`, `rejected_reason_code`.
- Unique indexes on `(import_batch_id, source_row_key)` and an idempotent row-evaluation key.

Add `import_row_entity_links(import_row_id, entity_type, entity_id, relationship, committed_at)` for one-to-many results. Keep the existing accepted entity fields during transition for compatibility.

### 9.3 Extend `data_quality_issues`

Proposed columns:

- `import_batch_id` for efficient batch review.
- `rule_version`, `affected_field`, `logical_issue_key`, `blocking`.
- `evidence` with restricted/minimized structured context.
- `assigned_to_user_id`, `first_detected_at`, `last_evaluated_at`.
- `resolution_action`, `resolution_version`, and optional task linkage.

Add uniqueness on `logical_issue_key` and indexes for batch/status/severity/assignee. Preserve `original_issue_history` and canonical statuses `OPEN`, `RESOLVED`, and `APPROVED_IGNORE`.

### 9.4 Approval and source-object tables

Add:

- `ingestion_approvals`: immutable approval/revocation records bound to batch version and preview digest.
- `ingestion_source_objects`: private object reference, digest, size, media type, scan status, retention/deletion timestamps, and encryption/key metadata; never public URLs.
- Optional `ingestion_connectors`: connector identity, allowed ingestion types/scopes, credential reference, lifecycle, and last rotation; no credential material in the table.

### 9.5 RLS and grants

- Default deny all new tables.
- Browser/authenticated roles do not receive direct mutation privileges.
- Purpose-built RPCs derive `auth.uid()`; callers cannot supply trusted actor IDs.
- Service-role-only functions remain callable only from authenticated Edge Functions or trusted workers.
- Add restricted-user tests for batch UUID enumeration, cross-account reads, revoked permissions, and issue/audit redaction before enabling the pilot.

## 10. Proposed RPC and service contract

### 10.1 Control-plane RPCs

Suggested logical operations:

- `portal_ingestion_create(envelope, idempotency_key)` — creates/replays a batch after permission and scope checks.
- `portal_ingestion_finalize_upload(batch_id, source_object, expected_version)` — records digest/object metadata and queues parsing.
- `portal_ingestion_get(batch_id)` — returns permission-filtered batch summary and allowed actions.
- `portal_ingestion_list_rows(batch_id, filters, page)` — returns redacted permitted row results.
- `portal_ingestion_validate(batch_id, expected_version)` — runs or requests deterministic validation.
- `portal_ingestion_dispose_issue(issue_id, action, reason, expected_version)` — reviews one issue and invalidates stale approval when required.
- `portal_ingestion_approve(batch_id, preview_version, preview_digest, issue_dispositions)` — records approval.
- `portal_ingestion_commit(batch_id, preview_version, preview_digest, idempotency_key)` — permission gate and domain dispatcher.
- `portal_ingestion_cancel(batch_id, expected_version, reason)` and admin-only retry for noncommitted failures.

These are semantic contracts. They may be implemented by Edge Function routes plus narrower SQL functions rather than one generic SQL dispatcher. No caller may provide arbitrary SQL, target table, actor ID, or canonical entity ID outside an allowlisted domain payload.

### 10.2 Domain adapter interface

Each adapter implements:

```text
identify(source metadata) -> parser selection
parse(source object) -> immutable source rows
normalize(row) -> versioned domain row
validate(batch, rows, actor scope) -> results/issues
preview(batch, rows) -> proposed operations + digest
commit(approved preview) -> row/entity links + domain result
```

Adapter versions are immutable. A parser/rule update reparses into a new batch version or child batch and preserves the old result.

## 11. Bank pilot

### 11.1 Pilot scope

The pilot covers only portal-uploaded Bank transaction files and `APPEND`. It excludes Bank allocations, transfers, legacy `/api/allocations`, fuzzy auto-accept, AI commit, historical backfill, and Budget data.

### 11.2 Bank row contract

Normalized row:

```json
{
  "schema_version": "bank-row/1",
  "source_row_number": 12,
  "transaction_date": "2026-11-01",
  "description": "normalized nonempty text",
  "reference_number": "optional normalized text",
  "amount": "-123.45",
  "debit_amount": "123.45",
  "credit_amount": "0.00",
  "source_fingerprint": "64 lowercase hex characters"
}
```

Preserve the current exact fingerprint input and amount sign rules. Decimal values cross the contract as canonical strings, not floating-point JSON numbers. The database recomputes or verifies the fingerprint from canonical fields; it never trusts a client-supplied digest.

### 11.3 Bank pilot flow

1. User with Bank EDIT permission uploads a supported file.
2. Server creates a `RECEIVED` batch, computes SHA-256 while streaming to private quarantine storage, applies size/type limits, and scans the file.
3. Bank adapter parses and records every physical row. Manual mapping, if needed, is stored as a versioned proposal; applying it triggers a new preview version.
4. Adapter resolves exactly one active Bank account. Unknown, ambiguous, inactive, or unauthorized accounts create blocking issues.
5. Validation records field errors, within-file exact duplicates, existing exact duplicates, and possible duplicates separately.
6. Preview displays every row and stable totals. Exact duplicates are rejected but retained in lineage; possible duplicates require review and are not auto-accepted in the pilot.
7. Approval binds the preview digest/version. Any mapping or row change invalidates it.
8. Commit rechecks Bank EDIT permission, account scope, active account, approval, digest, all blocking issues, current exact duplicates, and the database unique index.
9. One transaction calls the Bank domain RPC to insert accepted `bank_transactions`, link accepted `import_rows`, finalize counters/state, and write audit events. A failure rolls back all canonical writes and leaves the batch retryable or failed with diagnosis.

### 11.4 Proposed Bank RPC evolution

Do not replace the current RPC in place during the first implementation. Add a versioned RPC, for example:

```text
portal_commit_bank_ingestion_v1(
  target_batch_id uuid,
  target_preview_version integer,
  target_preview_digest text,
  expected_row_version integer
) returns jsonb
```

The RPC should load accepted rows from server-owned `import_rows`; callers do not resubmit row payloads. It must:

- lock the batch and require `APPROVED`;
- verify nonexpired preview version/digest and Bank scope;
- recompute critical field and fingerprint validation;
- reject any newly created exact duplicate;
- insert all accepted transactions;
- create row/entity links and domain/import audit events;
- finalize counters and state atomically;
- return the existing completed result on an idempotent replay.

Keep `portal_confirm_bank_import` available for the existing UI until the pilot is proven and a compatibility cutover is approved.

### 11.5 Bank quality rules for pilot

| Rule code | Severity | Outcome |
|---|---|---|
| `BANK.ACCOUNT.UNKNOWN` / `AMBIGUOUS` / `INACTIVE` | CRITICAL | Block batch |
| `BANK.ACCOUNT.OUT_OF_SCOPE` | Security denial | Reject request; restricted audit event, not reviewable ignore |
| `BANK.DATE.INVALID` | CRITICAL | Reject row |
| `BANK.DESCRIPTION.REQUIRED` | CRITICAL | Reject row |
| `BANK.AMOUNT.INVALID_OR_ZERO` | CRITICAL | Reject row |
| `BANK.DUPLICATE.WITHIN_SOURCE` | WARNING, blocking for affected row | Reject duplicate occurrence; retain first deterministic row |
| `BANK.DUPLICATE.EXACT_EXISTING` | WARNING, blocking for affected row | Reject row; link existing transaction as match context |
| `BANK.DUPLICATE.POSSIBLE` | WARNING | Require reviewer decision; never auto-accept in pilot |
| `BANK.SOURCE.ROW_UNPARSEABLE` | CRITICAL | Retain raw row and reject |

The pilot must not change the current exact duplicate definition. Possible-duplicate scoring is additive and cannot override the unique index.

### 11.6 Bank pilot acceptance criteria

- Every physical source row is queryable through permitted batch lineage.
- Identical upload/idempotency replay creates no second batch or transaction set.
- Concurrent commits cannot create duplicates.
- Revoked or cross-scope users cannot read row details, approve, or commit.
- Preview modifications make approval stale.
- Exact duplicate, invalid, and accepted row counts reconcile to total rows.
- Canonical transaction insertion and row/batch/audit finalization are atomic.
- Existing Bank workbench behavior and `portal_confirm_bank_import` remain unchanged until an explicit cutover.
- No sensitive source file is publicly addressable or logged.

## 12. Threat model

| Threat | Attack/failure path | Required controls | Residual risk / verification |
|---|---|---|---|
| Authorization bypass | User guesses batch/row UUID, changes account ID, reuses another user's preview, or calls commit after revocation | Derive actor from JWT; current permission and scope check on every action; batch/row RLS; approval bound to actor/scope/version; no trusted client actor ID; restricted enumeration tests | Current Bank permission is screen-level and not account-scoped; business must decide whether account scope is required |
| Service-role abuse | Generic Edge Function route accepts arbitrary target/path or leaks key | Allowlisted actions/adapters/RPCs; no generic table/SQL target; secrets only in server environment; structured logs redact tokens and payloads; key rotation | Edge Function compromise remains high impact; isolate ingestion service and monitor unusual calls |
| Sensitive banking disclosure | Raw files, account numbers, descriptions, references, or balances leak through storage, logs, AI, URLs, or broad audit reads | Private encrypted storage; short retention; signed one-use download URLs; account masking; payload minimization; no raw content in logs; restricted audit/issue evidence; AI receives summaries/redacted rows by default | Bank descriptions can contain personal data; retention and lawful access need owner approval |
| Duplicate submission/replay | Double-click, network retry, same bytes under new file name, concurrent users, connector retry | Scoped idempotency key; content digest; row fingerprints; existing unique index; batch lock; idempotent completed result; possible-duplicate review | Legitimate same-day equal transactions with same reference still collide under current exact key; manual exception process is needed |
| Tampering between preview and commit | Client changes rows, mapping, account, or approval payload after preview | Server-owned rows; immutable preview digest/version; approval binding; commit loads server state and recomputes critical rules; content/object digest | Parser bugs can produce a consistently wrong digest; use fixtures and versioned parsers |
| Malicious file | Formula injection, zip bomb, oversized workbook, parser exploit, HTML/script payload | Size/row/decompression limits; quarantine; media sniffing; malware scan; sandboxed parser; escape UI/CSV output; never evaluate formulas/macros/external links | Third-party parser vulnerabilities require patching and dependency monitoring |
| Partial failure | Transactions commit but batch/lineage/audit does not, or worker crashes mid-parse | One database transaction for canonical commit/finalization; resumable precommit stages; compare-and-swap; retryable failure states; stale-job watchdog | Object storage and database cannot share one transaction; use digest/status compensation and orphan cleanup |
| Confused deputy | AI/connector or Edge Function uses broad service authority beyond caller | Caller JWT/delegation record; connector allowlist and scopes; purpose-built operations; commit permission recheck; human approval | No write-capable AI pilot until permission/RLS tests pass |
| Approval fraud/staleness | Approval reused after rule/master-data/source change | Preview expiry; rule/parser/master-data version snapshot; preview digest; explicit revocation; revalidation at commit | Defining material master-data change requires domain ownership |
| Data poisoning | Crafted rows influence future matching/suggestion rules | Suggestions are noncanonical; provenance/confidence; human approval; no learning from unapproved/ignored rows; anomaly monitoring | Future automated learning requires a separate governance track |
| Audit tampering | User edits/deletes lineage or issue history | No direct client writes; append-only approvals/audit/history; restrictive grants; retention policy; integrity digest where warranted | Database administrators remain trusted; external immutable export may be needed for compliance |
| Denial of service | Huge files, repeated previews, duplicate checks per row | Upload/row limits, rate quotas, streaming parse, bulk duplicate query, job queue, per-actor concurrency, cancellation | Current Bank preview performs per-row database duplicate reads and must be batched before scale-up |

## 13. Affected workflows

### Directly affected in a future Bank pilot

- Bank file upload, parser/mapping UI, preview dialog, confirmation, and upload history.
- `portal-bank-workbench` upload actions and permission enforcement.
- `portal_confirm_bank_import` compatibility path and a new versioned commit RPC.
- `import_batches`, `import_rows`, `data_quality_issues`, `audit_events`, Bank transaction lineage, private storage, and background job execution.

### Indirectly affected in later phases

- Employee import and saved column mappings.
- Payroll bulk and single-record import paths.
- Shared administration/audit/data-quality screens.
- MCP/AI read-only batch/status tools and, only later, draft preview tools.
- Google Sheets adapters and reconciliation.

### Explicitly unaffected by TRACK104 design

- Budget Engine behavior and inputs.
- Bank allocations and Bank Transfers.
- Legacy `/api/allocations` semantics.
- Production data, schema, Edge Functions, Vercel deployments, and Supabase deployments.

## 14. Risks and tradeoffs

- Persisting every raw row improves traceability but increases sensitive-data footprint. Field-level minimization and retention are mandatory.
- Server-side parsing removes browser trust and enables connectors, but introduces storage, worker, malware-scanning, and parser operations.
- A generic control plane can become an unsafe generic writer. Domain adapters and purpose-built commit RPCs are a nonnegotiable boundary.
- Strong idempotency may suppress a legitimate repeat file. Operators need a reviewed reprocess/exception path that creates a child batch and never bypasses row uniqueness silently.
- Dual-running the old and pilot paths increases temporary complexity. Compatibility is safer than replacing the existing atomic path before parity evidence exists.
- Durable issues can create review noise. Only actionable findings belong in `data_quality_issues`; informational validations should normally stay on `import_rows`.
- The current Bank fingerprint has known legitimate-collision risk. The pilot preserves it; changing it would be a separate business-rule decision and migration plan.

## 15. Open questions

1. Should Bank imports be scoped by organization, allocation unit, specific bank account, or only the existing Bank screen permission?
2. Must uploader and approver be different people for Bank files, and at what amount/risk threshold?
3. What are the legal and operational retention periods for raw Bank files, raw row payloads, rejected rows, and issue evidence?
4. May reviewers force-accept an exact fingerprint collision, or must legitimate collisions use a separately authorized manual transaction path?
5. Which Bank export formats and institutions are contractual, and who owns parser fixtures/version approval?
6. What maximum file size, row count, decompressed size, and processing time are acceptable?
7. Should `APPROVED_IGNORE` ever be allowed for Bank possible duplicates, and who may approve it?
8. Which master-data/rule changes invalidate an existing preview?
9. Is private Supabase Storage acceptable for source files, or is another encrypted retention store required?
10. Should historical `RUNNING` batches be administratively closed, and under what evidence? The pilot must not alter them automatically.
11. What redaction is required for data-quality reviewers, audit readers, and future AI tools?
12. Which existing `audit_events` source/operation enums should be extended for upload, approval, commit, retry, cancellation, and connector actors?

## 16. Phased implementation plan

### Phase 0 — Decisions and security proof

- Resolve Bank scope, separation of duties, retention, collision exception, storage, and limits.
- Audit RLS/direct grants and add restricted-user authorization tests.
- Freeze contract v1, state transitions, issue codes, parser fixtures, and redaction rules.
- No operational change.

### Phase 1 — Additive control plane

- Apply forward-only schema additions, new source/approval/link tables, RLS, grants, and control-plane RPCs.
- Add private source storage/quarantine and lifecycle cleanup.
- Add batch/row/issue/audit read APIs with permission filtering.
- Keep all existing import paths unchanged.

### Phase 2 — Bank shadow pilot

- Run the server parser and validations in shadow/read-only mode for new Bank uploads while the existing preview/commit remains authoritative.
- Compare row normalization, exact fingerprints, classifications, and summary totals.
- Persist pilot batches/rows/issues without canonical commit, clearly marked `SHADOW`.
- Do not backfill historical files or transactions.

### Phase 3 — Bank controlled commit pilot

- Enable the new preview/approval path for explicitly authorized pilot users.
- Commit through `portal_commit_bank_ingestion_v1`, retaining the existing RPC as fallback/compatibility.
- Verify idempotency, concurrent duplicate races, revocation, tampering, rollback, audit completeness, and upload-history parity.
- Roll back by disabling the pilot route, not by deleting committed transactions.

### Phase 4 — Bank cutover and operations

- Make the new path default only after parity and operator acceptance.
- Add stuck-batch monitoring, retry/cancel administration, retention jobs, metrics, and correction exports.
- Deprecate the client-resubmitted-row confirmation contract only through an explicit versioned API decision.

### Phase 5 — Domain adoption

- Migrate Employee import, then consolidate Payroll bulk/single-row paths.
- Reuse the control plane while retaining each domain adapter and commit RPC.
- Add read-only MCP batch/status/review tools; allow draft preview only after security approval. Human-approved AI commit remains a later track.
- Treat Budget ingestion/parity and legacy Accounting retirement as separate programs.

## 17. Validation plan for future implementation

- Contract/schema tests for every state transition and invalid transition.
- Parser golden fixtures for every supported Bank format, including malformed and adversarial files.
- Permission tests for anonymous, inactive, VIEW, EDIT, revoked, cross-scope, and admin users.
- Idempotency and concurrency tests for upload, preview, approval, and commit.
- Transaction rollback probes covering batch, rows, issues, transactions, links, and audits.
- Tamper tests for changed file, mapping, preview digest, account, row, and expired approval.
- Sensitive-data tests for logs, errors, URLs, storage policies, audit responses, and exports.
- Existing Bank workbench, atomic accounting, upload history, allocation, dashboard, build, and responsive regression suites.

## 18. TRACK104 outcome

TRACK104 defines the proposed shared contract and demonstrates its fit against the current Bank workflow without changing runtime behavior. The recommended next implementation track is Phase 0 only: decide scope/retention/separation-of-duties, perform the dedicated RLS/grants review, and freeze executable contract tests before any migration or upload-path change.
