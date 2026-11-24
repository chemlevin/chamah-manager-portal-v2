import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('api/mcp-operational-workspace-runtime.js','utf8');
const routes=fs.readFileSync('vercel.json','utf8');
test('routing is server-pinned to the two verified environments',()=>{
  assert.match(source,/production:\{project:'vyyfuaqmbxvfqgbfqooc'/);
  assert.match(source,/preview:\{project:'iwsbjudahtjyigecymzd'/);
  assert.match(source,/Operational Workspace runtime mismatch/);
  assert.match(routes,/mcp-operational-workspace-runtime\.js/);
});
test('Production Director catalog exposes only the guarded scan in addition to read-only tools',()=>{
  assert.match(source,/PRODUCTION&&auth\.roles\?\.includes\('DIRECTOR'\)\?PRODUCTION_TOOLS:PREVIEW_TOOLS/);
  assert.match(source,/production_inventory_scan/);
  assert.match(source,/authorization:'DIRECTOR_ONLY'/);
  assert.match(source,/portal_director_production_inventory_scan/);
  assert.match(source,/vyyfuaqmbxvfqgbfqooc/);
});
test('Preview cannot expose or dispatch the Production scan',()=>{
  assert.match(source,/Production scan unavailable in Preview/);
  assert.match(source,/PREVIEW_TOOLS=\[PROFILE,CATALOG,CHILD\]/);
  assert.match(source,/dispatch\(name,args\).*portal_mcp_child_reconciliation/s);
});
test('Bearer, role, project, and child reconciliation guards are present',()=>{
  assert.match(source,/authentication_required/);
  assert.match(source,/Director authorization required/);
  assert.match(source,/Production project mismatch/);
  assert.match(source,/portal_mcp_child_reconciliation/);
});
