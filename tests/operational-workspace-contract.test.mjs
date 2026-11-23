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
  assert.match(source,/filter\(t=>READ_TOOLS\.includes\(t\.name\)\|\|t\.name==='prepare_operational_batch'/);
  assert.match(source,/RUNTIME\.supabaseProjectId!=='iwsbjudahtjyigecymzd'/);
});

test('read and analysis tools are cataloged and never use staging dispatch',()=>{
  for(const tool of ['operational_catalog','operational_report','analyze_operational_data','search_operational_records']) assert.match(source,new RegExp(`name:'${tool}'`));
  assert.match(source,/operational_catalog:\['portal_mcp_operational_contract_catalog'/);
  assert.match(source,/operational_report:\['portal_mcp_operational_report'/);
  assert.match(source,/analyze_operational_data:\['portal_mcp_analyze_operational_data'/);
  assert.match(source,/search_operational_records:\['portal_mcp_search_records'/);
  assert.match(source,/if\(name==='prepare_operational_batch'\)/);
  assert.doesNotMatch(source,/if\(name==='operational_catalog'\).*portal_mcp_preview_operational_changes/s);
  assert.doesNotMatch(source,/if\(name==='operational_report'\).*portal_mcp_preview_operational_changes/s);
  assert.doesNotMatch(source,/if\(name==='analyze_operational_data'\).*portal_mcp_preview_operational_changes/s);
});
