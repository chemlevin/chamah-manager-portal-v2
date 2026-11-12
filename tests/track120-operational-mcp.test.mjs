import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync(new URL('../api/mcp.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/20261111203330_track120_operational_mcp.sql',import.meta.url),'utf8');

test('institution users discover only scoped read tools',()=>{
  assert.match(api,/INSTITUTION_READ_TOOLS = new Set\(\['get_profile','list_daycares','staff_by_daycare','list_policies','read_policy'\]\)/);
  assert.match(api,/availableTools=isDirector\?TOOLS\.filter\(t=>!UNSAFE_LEGACY_WRITE_TOOLS\.has\(t\.name\)\):TOOLS\.filter\(t=>INSTITUTION_READ_TOOLS\.has\(t\.name\)\)/);
  assert.match(api,/Invalid or unauthorized tool/);
});

test('mixed-domain changes require preview, exact approval and atomic commit',()=>{
  assert.match(api,/preview_operational_changes/);
  assert.match(api,/request_operational_approval/);
  assert.match(api,/commit_operational_changes/);
  assert.match(migration,/portal_mcp_preview_operational_changes/);
  assert.match(migration,/portal_mcp_request_operational_approval/);
  assert.match(migration,/portal_consume_approval\(p_approval_id,'OPERATIONS\.WRITE'/);
  assert.match(migration,/for r in select value from jsonb_array_elements\(b\.rows\) loop/);
  assert.match(migration,/status='COMMITTED'/);
});

test('operational writes are closed to legacy direct MCP commands',()=>{
  for(const tool of ['create_employee','update_employee','import_employees','create_supplier','update_supplier','import_suppliers','create_payment_request','update_payment_request','import_payment_requests','record_payment_execution','confirm_bank_reconciliation','enqueue_bank_statement_import']) {
    assert.match(api,new RegExp(`UNSAFE_LEGACY_WRITE_TOOLS[\\s\\S]*'${tool}'`));
  }
});

test('canonical matching, concurrency and audit lineage are explicit',()=>{
  assert.match(migration,/AMBIGUOUS_STABLE_IDENTIFIERS/);
  assert.match(migration,/EXPECTED_ROW_VERSION_REQUIRED/);
  assert.match(migration,/row_version=expected/);
  assert.match(migration,/_mcp_batch_id/);
  assert.match(migration,/MCP_CREATE/);
  assert.match(migration,/MCP_UPDATE/);
});

