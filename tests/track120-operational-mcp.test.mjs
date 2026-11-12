import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync(new URL('../api/mcp.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../supabase/migrations/20261111203330_track120_operational_mcp.sql',import.meta.url),'utf8');
const auditLineage=fs.readFileSync(new URL('../supabase/migrations/20261112032954_track120_audit_lineage_fix.sql',import.meta.url),'utf8');
const auditReadback=fs.readFileSync(new URL('../supabase/migrations/20261112065000_track120_batch_audit_readback.sql',import.meta.url),'utf8');
const fullDelivery=fs.readFileSync(new URL('../supabase/migrations/20261112070000_track120_full_operational_delivery.sql',import.meta.url),'utf8');
const approvalScopeFix=fs.readFileSync(new URL('../supabase/migrations/20261112082000_track120_authorization_audit_channel_fix.sql',import.meta.url),'utf8');

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
  assert.match(auditLineage,/_mcp_batch_id/);
  assert.match(migration,/MCP_CREATE/);
  assert.match(migration,/MCP_UPDATE/);
});

test('batch read-back exposes record and authorization audit evidence',()=>{
  assert.match(auditReadback,/record_audit/);
  assert.match(auditReadback,/authorization_audit/);
  assert.match(auditReadback,/_mcp_batch_id/);
  assert.match(auditReadback,/resource_type='OPERATIONAL_CHANGESET'/);
});

test('final delivery exposes canonical search, record read-back and reporting',()=>{
  for(const tool of ['search_operational_records','get_operational_record','operational_report']) assert.match(api,new RegExp(`name:'${tool}'`));
  assert.match(fullDelivery,/portal_mcp_search_records/);
  assert.match(fullDelivery,/portal_mcp_get_record/);
  assert.match(fullDelivery,/portal_mcp_operational_report/);
  assert.match(fullDelivery,/private\.portal_is_authorized\(auth\.uid\(\),'OPERATIONS\.READ'\)/);
});

test('final delivery keeps new domains canonical and approval bound',()=>{
  for(const entity of ['roles','compensation_factors','budget_categories','budget_rules','classrooms','monthly_enrollment','bank_accounts','bank_transactions']) assert.match(fullDelivery,new RegExp(`when '${entity}'`));
  assert.match(fullDelivery,/portal_consume_approval\(p_approval_id,'OPERATIONS\.WRITE'/);
  assert.match(fullDelivery,/DUPLICATE_IN_BATCH/);
  assert.match(fullDelivery,/REQUIRED_FIELD:/);
  assert.match(fullDelivery,/STALE_ROW_VERSION/);
  assert.match(fullDelivery,/MCP_CREATE/);
  assert.match(fullDelivery,/MCP_UPDATE/);
});

test('operational commit consumes the private void approval helper',()=>{
  assert.match(approvalScopeFix,/perform private\.portal_consume_approval\(p_approval_id,'OPERATIONS\.WRITE'/);
  assert.doesNotMatch(approvalScopeFix,/public\.portal_consume_approval/);
  assert.match(approvalScopeFix,/approval:=jsonb_build_object\('approval_id',p_approval_id/);
  assert.match(approvalScopeFix,/previous_values/);
  assert.doesNotMatch(approvalScopeFix,/old_values/);
  assert.match(approvalScopeFix,/actor_user_id,channel,action_code/);
  assert.match(approvalScopeFix,/values\(auth\.uid\(\),'MCP','OPERATIONS\.WRITE'/);
});

