import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration=readFileSync(new URL('../supabase/migrations/20261116100000_track130_child_reconciliation.sql',import.meta.url),'utf8');
const mcp=readFileSync(new URL('../api/mcp.js',import.meta.url),'utf8');

test('generic approval mapping accepts any READY operational batch',()=>{
  assert.match(mcp,/case 'request_operational_approval':[\s\S]*rpc='portal_mcp_request_operational_approval'/);
  assert.match(mcp,/params=\{p_batch_id:args\.batch_id,p_reason:args\.reason\.trim\(\)\}/);
  assert.match(migration,/b\.domain<>'OPERATIONS' or b\.status<>'READY'/);
  assert.doesNotMatch(migration,/request_operational_approval[\s\S]{0,1200}portal_mcp_reject_synthetic/);
});

test('synthetic promotion remains blocked at commit',()=>{
  assert.match(migration,/portal_mcp_reject_synthetic/);
  assert.match(migration,/portal_mcp_commit_operational_changes/);
});
