# TRACK119 — Production Operational Readiness Audit

Date: 2026-11-11

Status: Read-only audit complete; TRACK119b closed; no Production change approved or performed

## Accepted ChatGPT ingestion boundary

TRACK119b acceptance is complete. ChatGPT's native attachment interface read the synthetic CSV files, parsed their rows, and submitted structured records to the Preview MCP daycare ingestion tools. The MCP validated, matched, previewed, approval-gated, committed, read back, and audited those records.

This is **parsed-record ingestion**, which is the required operational workflow. It does not require the MCP server to receive or retain the original CSV binary. **Binary file transfer** is a separate capability needed only when source-file retention, evidence download, hashing, or independent server-side parsing is a business requirement. Chrome automation access to local file URLs is therefore not a TRACK119b blocker.

## Canonical data and current MCP coverage

| Priority domain | Canonical tables | Portal capability | Current MCP capability | Minimum operational gap |
|---|---|---|---|---|
| Employees | `employees` | Read, create, update, archive, CSV/XLSX import | Search, duplicate check, create, update, create-only import | Approval-bound preview/commit; update/skip/conflict import semantics; get-by-ID/read-back |
| Employments | `employments` | Read and save | None | Semantic read/create/update/close with concurrency and audit |
| Assignments | `employee_assignments` | Read and effective-dated save | Staff-by-daycare read only | Semantic list/create/update/end; daycare/unit/role validation; overlap and ambiguity reporting |
| Employment details | `employee_pay_terms`, `employee_compensation_eligibility`, `employee_leave_periods` | Read, version/close/save | None | Semantic reads and approval-bound effective-dated writes |
| Certificates | `employee_certificates`, `certificate_types` | Read and save | None | Search missing/expiring; create/update/retire; stable employee/type matching |
| Children | None at person level; `monthly_enrollment` is aggregate only | Aggregate occupancy only | Reports domain as missing | Canonical child/enrollment/guardian schema and privacy/authorization decision |
| Payroll | `payroll_months`, `payroll_records`, `payroll_allocations` | Full month, row, import, temporary-worker, allocation workflow | Search/analyze only | Preview/commit import, row correction, allocation update, lifecycle tools, approvals |
| Banking | `bank_accounts`, `bank_transactions`, `bank_allocations`, import/reconciliation tables | Import, assignment, split, reconciliation | Search/analyze, enqueue import, reconciliation | Allocation correction/update tools and portal-visible verification |
| Suppliers/payments | `suppliers`, `payment_requests` and related event/document/execution tables | Supplier UI is incomplete; portal finance primarily exposes legacy bank transfers | Strong canonical create/update/import/payment lifecycle MCP coverage | Approval-bound import consistency and portal UI over the canonical payment aggregate |
| Daycares | `daycares`, `allocation_units` | Portal selectors/settings | Accepted search and approval-gated ingestion | Production promotion only after explicit approval and release gates |

## Authorization finding

- Director authentication is enforced twice: `api/mcp.js` requires an active `DIRECTOR` role before discovery/execution, and each canonical RPC requires a semantic action.
- Existing daycare/staff read RPCs contain institution/daycare scope checks through `portal_user_daycares`, `scope_mode`, and legacy screen permissions.
- Institution-level MCP read-only access is **not currently possible**, because the transport rejects every authenticated user who lacks `DIRECTOR` before those scoped RPCs can execute.
- The shortest safe correction is a transport capability matrix: Directors receive the full semantic tool allowlist; institution users receive only scoped read tools. Write tools must remain undiscoverable and uncallable for institution users, with RPC scope checks retained as defense in depth.

## Actual blockers

1. Workforce MCP writes are incomplete. Existing portal workbench actions cannot be exposed directly because they rely on the legacy screen-permission/service-role Edge Function path.
2. Employee MCP import is create-only and immediately writes. It lacks the daycare flow's database matching, preview, Director approval, update/skip/conflict classification, and exact payload binding required for real data.
3. Relationship read-back is missing. ChatGPT cannot retrieve a complete employee profile containing employment, assignment, pay terms, eligibility, certificates, and leave after a write.
4. Institution read-only access is blocked at MCP transport despite scoped read RPCs already existing.
5. Person-level children do not have canonical tables, identifiers, privacy rules, or portal screens. Aggregate `monthly_enrollment` cannot substitute for child records.
6. Payroll and bank allocation corrections exist in the portal but lack canonical MCP commands and approval policy.
7. Canonical `payment_requests` MCP coverage is ahead of the actual portal UI, which still emphasizes legacy `bank_transfers`; MCP writes cannot be considered portal-verified until the UI reads the same aggregate.
8. Production release remains approval-gated. No Production schema, OAuth, Vercel alias, environment, or data change is authorized by this audit.

## Shortest implementation path

1. **Approval-gated workforce ingestion foundation:** reuse `mcp_ingestion_batches`, exact payload digests, one-time approvals, stable identifiers, row versions, audit events, and `CREATE/UPDATE/SKIP/CONFLICT` from TRACK119b. Extend it to employee identity plus related workforce rows; never match by name alone.
2. **Workforce read/write parity:** add complete employee-profile read-back and semantic commands for employments, assignments, pay terms, eligibility, certificates, and leave. Reuse the existing canonical tables and validation rules behind `portal-workforce-workbench`.
3. **Portal visibility acceptance:** after each Preview MCP commit, reload the existing Employees workbench and verify the same IDs, versions, effective dates, assignment, pay details, and certificate status appear. Add automated UI coverage using synthetic Preview data.
4. **Scoped institution read-only MCP:** replace the transport's binary Director rejection with role-based tool discovery. Permit only `get_profile`, scoped daycare/staff/employee reads, and explicitly approved aggregate reports for institution users. Test cross-institution denial and absence of write tools.
5. **Payroll and finance parity:** add approval-gated payroll preview/commit/correction/allocation commands using existing atomic RPCs. Add bank-allocation correction tools. Make the portal consume canonical `payment_requests` before relying on MCP payment writes operationally.
6. **Children as a separate schema decision:** define stable child/enrollment/guardian identifiers, retention and sensitive-data access before implementing ingestion. Do not place person-level child data into `monthly_enrollment` or free text.
7. **Production promotion:** only after synthetic Preview acceptance for CSV parsing, approval, commit, read-back, portal rendering, audit, Director allow, institution scoped allow, and cross-scope/write denial. Production deployment and migration require a separate explicit approval.

## Recommended minimum operational release

The smallest useful first release is workforce management: employee identity, employment, assignment, pay term, and certificate read/write/import with approval-bound commits and portal read-back. Leave, eligibility, payroll, banking corrections, canonical payments UI, and children should follow in that order. This releases real operational value without weakening authorization or inventing a parallel data model.
