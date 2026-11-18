import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/20261118100000_track137_operational_intake_evidence.sql','utf8');
const api=fs.readFileSync('api/mcp.js','utf8');
test('TRACK137 persists exact staged evidence without changing the MCP 1.0.0 surface',()=>{
  for(const field of ['source_values','source_keys','current_values','changed_fields','classification','matching_evidence','staged_rows']) assert.match(sql,new RegExp(field));
  assert.match(sql,/strategy','STABLE_KEYS'/);
  assert.match(sql,/portal_mcp_match_operational_row_v2/);
  assert.match(sql,/jsonb_array_length\(p_rows\) not between 1 and 1000/);
  assert.match(api,/const CONTRACT_VERSION = '1\.0\.0'/);
});
test('TRACK137 keeps approval and commit lifecycle delegated to existing verified functions',()=>{
  assert.doesNotMatch(sql,/portal_mcp_request_operational_approval/);
  assert.doesNotMatch(sql,/portal_mcp_commit_operational_changes/);
  assert.match(sql,/preview_digest/);
  assert.match(sql,/mcp_ingestion_batches/);
});
test('TRACK137 read-back preserves audit evidence and exposes staged rows',()=>{
  assert.match(sql,/record_audit/);
  assert.match(sql,/authorization_audit/);
  assert.match(sql,/'staged_rows',b\.rows/);
  assert.match(sql,/'source_provenance',b\.source_provenance/);
});
