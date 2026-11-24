import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const api=fs.readFileSync(new URL('../api/mcp.js',import.meta.url),'utf8');
const sql=fs.readFileSync(new URL('../supabase/migrations/20261124220000_production_lineage_reconciliation_rpc.sql',import.meta.url),'utf8');
test('Production MCP exposes governed lineage reconciliation stages',()=>{for(const n of ['preview_lineage_reconciliation','request_lineage_reconciliation_approval','commit_lineage_reconciliation'])assert.match(api,new RegExp(n));for(const n of ['METADATA_ONLY_LINEAGE_RECONCILIATION','portal_mcp_preview_lineage_reconciliation','portal_mcp_request_lineage_reconciliation_approval','portal_mcp_commit_lineage_reconciliation','business_writes','canonical_source_batches','portal_consume_approval'])assert.match(sql,new RegExp(n));});
test('lineage reconciliation is explicit and idempotent',()=>{assert.match(sql,/p_batch_ids uuid\[\]/);assert.match(sql,/idempotency_key text not null unique/);assert.match(sql,/on conflict\(idempotency_key\)/);assert.match(sql,/status<>'COMMITTED'/);assert.match(sql,/source_batch_ids/);});
