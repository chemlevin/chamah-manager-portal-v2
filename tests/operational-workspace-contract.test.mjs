import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('api/mcp-operational-workspace.js','utf8');
test('operational workspace is staging-only and has a closed catalog',()=>{
  assert.match(source,/prepare_operational_batch/);
  assert.match(source,/portal_mcp_preview_operational_changes/);
  assert.match(source,/COMMIT_FORBIDDEN/);
  assert.match(source,/stable_identifiers/);
  assert.match(source,/CREATE_PROPOSAL/);
  assert.match(source,/UPDATE_PROPOSAL/);
  assert.match(source,/MISSING_IDENTIFIER/);
  assert.match(source,/raw_source/);
  assert.match(source,/additionalProperties:false/);
  assert.doesNotMatch(source,/portal_mcp_request_operational_approval/);
  assert.doesNotMatch(source,/portal_mcp_commit_operational_changes/);
});
test('staging contract uses structured rows and preserves unresolved source evidence',()=>{
  assert.match(source,/rows:\{type:'array'.*items:ROW_ITEM_SCHEMA/s);
  assert.match(source,/unmapped_fields/);
  assert.match(source,/stable_identifiers/);
  assert.match(source,/data_written:false/);
  assert.match(source,/canonical_writes:false/);
  assert.match(source,/function parseTransportRow/);
  assert.match(source,/JSON\.parse\(row\)/);
});
test('operational workspace routes are registered',()=>{
  const v=fs.readFileSync('vercel.json','utf8');
  assert.match(v,/mcp-operational-workspace/);
});
test('Preview canonical route delegates to the closed Operational Workspace catalog',()=>{
  const mcp=fs.readFileSync('api/mcp.js','utf8');
  assert.match(mcp,/RUNTIME\.environment==='preview'.*mcp-operational-workspace/s);
  assert.match(source,/filter\(t=>\['get_profile','prepare_operational_batch','get_operational_batch','list_operational_batches'\]/);
  assert.match(source,/RUNTIME\.supabaseProjectId!=='iwsbjudahtjyigecymzd'/);
});
