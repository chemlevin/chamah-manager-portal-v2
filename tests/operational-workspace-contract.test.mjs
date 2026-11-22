import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('api/mcp-operational-workspace.js','utf8');
test('operational workspace is staging-only and has a closed catalog',()=>{
  assert.match(source,/prepare_operational_batch/);
  assert.match(source,/portal_mcp_preview_operational_changes/);
  assert.match(source,/COMMIT_FORBIDDEN/);
  assert.doesNotMatch(source,/portal_mcp_request_operational_approval/);
  assert.doesNotMatch(source,/portal_mcp_commit_operational_changes/);
});
test('operational workspace routes are registered',()=>{
  const v=fs.readFileSync('vercel.json','utf8');
  assert.match(v,/mcp-operational-workspace/);
});
