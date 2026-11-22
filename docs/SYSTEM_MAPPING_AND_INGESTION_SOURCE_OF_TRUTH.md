# System Mapping and Ingestion Source of Truth

The domain matrix is subordinate to the permanent hierarchy and uses the flexible-ingestion contract: receipt is not canonicalization; unknown fields and unresolved identities remain preserved outside official business data.

Status: foundation map; completeness is explicitly classified.

The complete domain-by-domain pipeline is maintained in
`docs/architecture/CHAMAH_DOMAIN_PIPELINE_MATRIX.md`. This document remains
the source-of-truth contract summary; the matrix is the authoritative path and
readiness detail and must not be contradicted by older planning maps.

| Domain | Source formats | Identity / duplicate rule | Canonical path | Status / gap |
|---|---|---|---|---|
| Children | Sheets, XLSX, CSV, PDF review | national ID + source record; conflict quarantine | operational batch RPCs | Business MCP implemented; live fixture read-back not run |
| Enrollment | Sheets, XLSX, CSV | child + daycare + effective period | operational batch | parser inventory incomplete |
| Occupancy | Sheets, XLSX, CSV | daycare + classroom + month | budget/readers | canonical table path unproven |
| Billing | Sheets, XLSX, CSV | child/account + period | operational batch intended | source-to-table map incomplete |
| Collections | Sheets, XLSX, CSV | account + period + reference | operational batch intended | source contract incomplete |
| Government/TAMA | XLSX, CSV, PDF | child + period + report reference | review then batch | PDF/RTL end-to-end blocked |
| Employees | Sheets, XLSX, CSV | employee code + national ID; mismatch conflict | workforce preview; legacy writes blocked | approved commit unproven |
| Employments | Sheets, XLSX, CSV | employee + effective dates | none complete | BLOCKED: schema/RPC contract missing |
| Assignments | Sheets, XLSX, CSV | employee + daycare/classroom + effective dates | batch intended | historical rewrite evidence missing |
| Payroll | Sheets, XLSX, CSV, PDF review | employee + daycare + payroll month | preview; commit incomplete | parser/read-back matrix incomplete |
| Net salary | XLSX, CSV | employee + payroll month | none complete | BLOCKED: canonical source/table unresolved |
| Employer cost | Sheets, XLSX | employee + period + cost type | budget/payroll readers | source authority reconciliation needed |
| Bank statements | XLSX, CSV, PDF review | stable reference + account + date/value | bank preview; legacy writes blocked | PDF/duplicate fixtures incomplete |
| Suppliers | Sheets, XLSX, CSV | reviewed supplier identity | batch intended | direct MCP writes fail closed; portal map incomplete |
| Payments | XLSX, CSV | supplier/request/reference + period | approval-bound lifecycle | create/update/import blocked; batch path unproven |
| Budgets | Sheets: OCCUPANCY/STAFFING/COST_RULES | category + period + daycare scope | budget engine/readers | source-to-DB planning only |
| Discrepancies | generated reconciliation output | batch + row + reason | discrepancy/audit records | cross-domain matrix incomplete |
| Source evidence | original file/row/payload/report/month | batch + digest + reference | ingestion evidence fields | complete retention not live verified |
| Reports and audit | generated records/events | stable report/batch/event IDs | readers/audit trail | Preview/Production parity unverified |

All future operational ingestion uses `PROPOSED → PREVIEWED → RECONCILED → APPROVED → COMMITTED → VERIFIED`. Source filename, row, report number, month, original values, raw payload, digest, and provenance must survive. Unknown entities never auto-create. Duplicate uploads are idempotent. Site/deployment Preview and business-data Preview batch are distinct.

Business MCP is the only existing operational write surface. Analytical MCP and Manager Read-only MCP are future surfaces and are not implemented here.
