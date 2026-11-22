# Chamah permanent operating system

## Authority references

Current runtime identities: `docs/architecture/CHAMAH_RUNTIME_REGISTRY.md`.
Permanent system rules: `docs/architecture/CHAMAH_SYSTEM_RULES.md`.
Change and release procedures: `docs/architecture/CHANGE_CONTROL.md`.
Runtime statements here must not override the registry.

This directory is the model-independent handoff for Chamah. It is derived from
the repository and current implementation; chat history is context only.

## Canonical truth

- **Repository:** code, migrations, tests, public contracts, and operating rules.
- **Preview/Production databases:** persisted data and applied migration state.
- **MCP catalog and contract:** public tool names, arguments, envelopes, and authorization behavior.
- **Business Project:** shared operating instructions, reports, and source documents.
- **Codex environment:** implementation and verification only.

Evidence labels are deliberately explicit: `PROPOSED`, `APPROVED`,
`IMPLEMENTED`, `DEPLOYED`, `VERIFIED`, and `BLOCKED`.

## Operating protocol

Every new domain follows:

`intake → provenance → normalization → identity matching → duplicate/conflict detection → reconciliation → discrepancy → Preview → Director Approval → atomic Commit → read-back verification → final report`

The canonical mixed-domain implementation is exposed through the existing
`operational_catalog`, `preview_operational_changes`,
`request_operational_approval`, `commit_operational_changes`, and
`get_operational_batch` MCP tools. Internal RPCs are adapters, not connector
requirements. Approval is bound to the exact batch, digest, contract version,
row versions, actor, and idempotency state.

Archive is Director-only, soft by default, exact-entity/record/reason/version
bound, dependency-safe, and audited. Hard deletion is not a public operational
capability.

## Environments and current evidence

- Canonical Production portal/MCP: `https://chamah-portal.vercel.app`.
- Verified Production Supabase project: `vyyfuaqmbxvfqgbfqooc`.
- Production deployment and migration evidence is recorded in `PROJECT_LOG.md` under TRACK135.
- TRACK135 committed the already-approved child batch and verified 100 children and audit rows. TRACK136 creates no batch, approval, or business row.
- Preview is not assumed to be isolated; verify project ID and deployment before every write or migration.

## MCP compatibility policy

The public MCP API is frozen. Existing tool names, required arguments, types,
response envelopes, and authorization behavior must remain callable. Internal
database/RPC changes are `INTERNAL` when the public manifest is unchanged;
additive optional changes are `BACKWARD_COMPATIBLE`; removal, renaming, new
required arguments, incompatible types, or envelope changes are `BREAKING` and
block deployment. The gate is `scripts/check-mcp-contract.mjs`.

## Identity, reconciliation, and evidence

Children use normalized national ID plus source-system/source-record identity.
Employees use employee code and national ID; mismatches are conflicts. Monthly
records bind stable identity to month/effective date. Reconciliation reports
matched, unmatched, duplicate, conflict, missing-field, excess, unexplained,
and unresolved-discrepancy results with source evidence.

Request-origin metadata is persisted by `portal_mcp_record_request_origin`
before every MCP preview, approval, commit, archive, and delete adapter. The
adapter records client application, connector/session IDs, request/correlation
IDs, exact endpoint, deployment commit, and authenticated actor. Missing or
invalid headers become `Unknown`; secrets and payloads are never stored.
Live database read-back remains required before deployment, but the repository
contract and migration are implemented and verified locally.

## Tomorrow's safe procedure

1. Copy `docs/operating-system/future-work-template.md` and assign a TRACK.
2. Fill identity keys, provenance, relationships, month/effective date,
   reconciliation, approval, archive/delete, tests, and compatibility class.
3. Implement Preview → approval → atomic Commit → read-back using existing
   generic tools where possible.
4. Run `npm run contract:check`, focused tests, migration preflight, and
   rollback-only synthetic verification.
5. Verify exact environment/project/deployment and obtain explicit Director
   authorization before any write or release.
6. Append the required TRACK completion fields to `PROJECT_LOG.md`.

See `docs/operating-system/future-work-template.md` for the machine-readable
and human-readable work contract.
