import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('api/mcp.js', 'utf8');
const policy = JSON.parse(fs.readFileSync('docs/operating-system/mcp-contract-policy.json', 'utf8'));

assert.match(source, /const CONTRACT_VERSION = '1\.0\.0'/);
assert.match(source, /const BASE_TOOLS = \[/);
assert.match(source, /if\(m\.method==='tools\/list'\)/);
assert.match(source, /if\(m\.method==='initialize'\)/);
assert.equal(policy.classification, 'BACKWARD_COMPATIBLE');
assert.equal(policy.connectorRefreshRequired, false);
assert.match(source, /const SERVER_VERSION = '1\.9\.0'/);
assert.match(source, /portal_mcp_record_request_origin/);

const requiredTools = ['get_profile', 'operational_catalog', 'preview_operational_changes',
  'request_operational_approval', 'commit_operational_changes', 'get_operational_batch'];
for (const name of requiredTools) assert.match(source, new RegExp(`name:'${name}'`));
for (const forbidden of ['required: true', 'required:true']) assert.doesNotMatch(source, new RegExp(forbidden));
console.log(`MCP contract gate passed: ${requiredTools.length} anchor tools; classification=${policy.classification}; refresh=${policy.connectorRefreshRequired}`);
