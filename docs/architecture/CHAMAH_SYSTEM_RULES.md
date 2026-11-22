# CHAMAH System Rules

Status: permanent, authoritative system and data-governance constitution.

## Authority and precedence

The permanent hierarchy is:

1. `AGENTS.md` — mandatory Codex behavior, authorization, safety, scope, and reporting.
2. This file — system, environment, data, ingestion, identity, lineage, MCP, and security rules.
3. `CHANGE_CONTROL.md` — implementation, testing, approval, deployment, rollback, and closure.
4. `CHAMAH_RUNTIME_REGISTRY.md` — current verified Production/Preview runtime identities only.

All other documents are subordinate domain detail, operating guidance, evidence, or history. `PROJECT_STATE.md`, `PROJECT_LOG.md`, audit reports, and historical architecture documents cannot override this hierarchy. Current code and verified runtime evidence describe behavior; they never authorize bypassing governance. The absent `docs/reference/AGENTS_2026-11-14_ARCHIVE.md` is not an authority.

## Environments

- Production is the authoritative live business-data environment.
- Preview site/deployment is a code/runtime environment; a business-data Preview batch is a staged data object and is not the same thing.
- Production and Preview must be identified by exact Vercel and Supabase project IDs before any operation.
- No cross-environment database read/write assumption is valid without current evidence. Production writes from Preview workflows and Preview writes from Production workflows are prohibited.
- Production promotion, migration, Edge Function deployment, alias change, or permission change requires explicit authorization and successful preceding gates.

## Git and implementation

Scoped recovery work continues on the approved temporary branch `codex/tmp-system-mapping-ingestion-recovery`. Do not create a new branch per issue, modify `main` directly, create permanent alternative branches, or create parallel routes/connectors/ingestion architectures. Every change preserves branch, commit, deployment, source provenance, and rollback identity. Worktrees may be retained only when their purpose and branch identity are recorded.

## Source truth, identity, and matching

### Flexible ingestion, stable safety core

Source formats and layouts may vary. The safety core may not. Technical receipt or successful parsing never makes information canonical. Every source is classified through these boundaries:

1. **Technical intake** — receipt and parser output only; no business write.
2. **RAW/source evidence** — the original file or payload and its provenance.
3. **UNMATCHED/UNMAPPED/NEEDS_REVIEW** — safely read information whose canonical destination, identity, or meaning is not verified.
4. **PROPOSED** — a candidate mapping, correction, or new-entity proposal awaiting reconciliation and any required approval.
5. **CANONICAL** — verified information accepted into the approved business model.

Adapters may support new CSV, XLS/XLSX, PDF, HTML, RTL, structured, or changing source variants, including changed headers and columns. They must preserve partial understanding and warnings, never silently discard unknown fields, and use the same identity, provenance, reconciliation, approval, commit, read-back, audit, authorization, and idempotency controls. New entities require an explicit proposal, reconciliation, and appropriate approval; new schema or business logic requires change control. No adapter may create an uncontrolled route, branch, MCP surface, or database path. If the existing safe storage fields are insufficient, the gap is documented as an additive proposal and no migration is applied.

The Handbook defines business rules; current code defines current implementation behavior; validated database records define accepted system data after the canonical workflow. Google Sheets and source files are input/editing surfaces, not permission to bypass validation.

- Children match by normalized national ID plus stable source-system/source-record identity where available.
- Employees match by employee code and national ID; a mismatch is a conflict requiring review.
- All domains use stable source IDs, canonical IDs, and effective dates where available.
- Row position is never a matching key.
- Exact duplicates are retained in lineage and rejected from commit; possible duplicates and ambiguous matches require review.
- Unknown or unresolved children, employees, daycares, branches, suppliers, bank accounts, or other entities cannot silently create master data.
- Historical assignments and facts are not rewritten without evidence; retroactive changes are effective-dated.

## Canonical ingestion lifecycle

Every operational upload or correction follows:

`PROPOSED → PREVIEWED → RECONCILED → APPROVED → COMMITTED → VERIFIED`

- `PROPOSED`: source and intent are received with provenance and idempotency identity; no business data is changed.
- `PREVIEWED`: parsing, normalization, identity matching, duplicate detection, and validation produce a durable or explicitly ephemeral preview; no canonical business entity is committed.
- `RECONCILED`: matched, unmatched, duplicate, conflict, missing, and unresolved outcomes are visible with source evidence; blocking issues are resolved or explicitly quarantined.
- `APPROVED`: an authorized Director approves the exact batch, digest, contract version, row versions, scope, and reason; approval is not transferable to changed content.
- `COMMITTED`: one authorized atomic commit performs the approved change and records its result; committed state must not remain `READY`.
- `VERIFIED`: bounded read-back confirms the exact committed result, lineage, audit, counts, and status; failed read-back is not permission to recommit blindly.

## Provenance and lineage

Preserve source filename, source row/physical identity, report number, reporting month, original values, normalized values, source payload, parser/version, stable IDs, matching decision, conflict reason, batch ID, content digest, approval ID, commit result, read-back result, and audit event. Secrets and unnecessary personal data must not be copied into logs, errors, or documentation.

## Safety and writes

All mutations require server-side authorization, provenance, canonical preview/reconciliation, exact approval, atomic commit where promised, read-back, and audit. Legacy direct-write paths are read-only or fail closed before database dispatch. Manager and Analytical surfaces cannot mutate. Physical deletion of authoritative payroll, bank, audit, or lineage history is prohibited unless a separately authorized, policy-bound recovery action proves exact scope, protection, recovery, and audit. Archive is soft, exact, dependency-safe, authorized, and audited.

Approval binds the exact batch and digest. Retries are idempotent. An unknown commit result requires batch-status inspection before retry. Failed read-back cannot trigger blind recommit. A batch cannot be reported committed while its persisted status remains `READY`.

## MCP surfaces

1. **Business MCP** — existing Director-authorized operational reads and approval-bound writes.
2. **Analytical MCP** — future separate surface for file analysis, reconciliation, discrepancy detection, and batch preparation only; no database write, approval, commit, upload, update, delete, or archive.
3. **Manager MCP** — future separate authenticated read-only surface scoped by user and daycare; no upload, approval, commit, update, delete, archive, or other mutation.

Future surfaces are documented only in this phase and are not implemented, deployed, or implied by the existing Business MCP.

## Common errors and recovery

MCP, portal APIs, and Edge Functions must use one safe envelope containing: `status`, `technical_code`, `correlation_id`, `batch_id` when available, `current_stage`, `processed_count`, `unprocessed_count`, `data_written`, `retry_safe`, `resume_available`, and an exact `next_action`. The contract applies to oversized files/responses, unsupported formats, parser/header/RTL/PDF failures, missing or ambiguous identifiers, duplicates, unknown entities, timeouts before/after RPC, unknown commits, failed read-back, duplicate retries, resume, permission failures, wrong environments, and partial processing. Errors must be plain-language enough for the user while excluding secrets, tokens, full payloads, and unnecessary personal data.

The controlled code vocabulary includes `FILE_TOO_LARGE`, `INVALID_FORMAT`, `PARSE_FAILED`, `RTL_OR_PDF_PARSE_FAILED`, `MISSING_IDENTIFIER`, `AMBIGUOUS_MATCH`, `DUPLICATE_ROW`, `UNKNOWN_ENTITY`, `UNMAPPED_FIELD`, `NEW_ENTITY_PROPOSAL`, `NEEDS_REVIEW`, `PERMISSION_DENIED`, `WRONG_ENVIRONMENT`, `UNKNOWN_COMMIT_STATE`, `READBACK_FAILED`, `RETRY_REQUIRED`, `RESUME_AVAILABLE`, and `LEGACY_MUTATION_BLOCKED`. Implementations may add a more specific code only when it preserves the envelope and plain-language next action.

## Change classification

Every change is classified as one of: `LOCAL_SAFE_CHANGE`, `SHARED_CHANGE`, `REQUIRES_EXPLICIT_AUTHORIZATION`, or `PROHIBITED_WITHOUT_BUSINESS_DECISION`. The classification, exact scope, affected environment, rollback path, tests, and evidence are recorded before closure.
