# Personal Analytical MCP

Status: Authoritative source contract

The Personal Analytical MCP is served at `/api/mcp-analytical` and is implemented only by `api/mcp-analytical.js`. Its protected-resource metadata is served by `api/mcp-analytical-metadata.js`.

This endpoint reuses the canonical runtime contract and authenticated Supabase bearer session. It is intentionally separate from the Business MCP implementation in `api/mcp.js`.

The closed catalog is read-only and limited to profile, catalog/report reads, bounded record search and lookup, daycare/staff reads, employee duplicate/profile reads, child reconciliation reads, supplier/payment analysis, and `prepare_analysis`. `prepare_analysis` returns an ephemeral structured proposal and never creates preview rows, batches, approvals, commits, uploads, imports, or business records.

Mutation-shaped requests are rejected before any data RPC dispatch. The endpoint does not expose preview, approval, commit, upload/import, insert/update/delete/archive, payment transition, entity creation, or permission creation tools.

Route and build wiring is maintained in `vercel.json`. Any Production promotion requires exact source/deployment parity, authenticated tools/list verification, read-only smoke tests, and zero-write evidence.
