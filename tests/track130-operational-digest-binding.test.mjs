import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql=readFileSync(new URL('../supabase/migrations/20261116150000_track130_operational_digest_binding.sql',import.meta.url),'utf8');
const integration=readFileSync(new URL('./sql/track130_operational_digest_binding.sql',import.meta.url),'utf8');

test('approval binds the immutable preview digest and staged row version',()=>{
  assert.match(sql,/values\(auth\.uid\(\),'OPERATIONS\.WRITE','OPERATIONAL_CHANGESET',b\.batch_id,b\.preview_digest/);
  assert.match(sql,/approval_row_version=b\.row_version/);
  assert.match(sql,/b\.preview_digest<>encode\(extensions\.digest\(b\.rows::text,'sha256'\),'hex'\)/);
});

test('commit consumes the exact stored digest and rejects row-version drift',()=>{
  assert.match(sql,/portal_consume_approval_digest\(p_approval_id,'OPERATIONS\.WRITE','OPERATIONAL_CHANGESET',b\.batch_id,b\.preview_digest\)/);
  assert.match(sql,/b\.approval_row_version is distinct from b\.row_version/);
  assert.match(sql,/portal_mcp_reject_synthetic/);
  assert.match(sql,/status='COMMITTED'/);
});

test('integration regression covers Preview to Approval to Commit in a rollback transaction',()=>{
  assert.match(integration,/portal_mcp_preview_operational_changes/);
  assert.match(integration,/approval->>'payload_digest' is distinct from preview->>'preview_digest'/);
  assert.match(integration,/portal_mcp_request_operational_approval/);
  assert.match(integration,/portal_mcp_commit_operational_changes/);
  assert.match(integration,/if committed->>'status' <> 'COMMITTED'/);
  assert.match(integration,/rollback;/);
});
