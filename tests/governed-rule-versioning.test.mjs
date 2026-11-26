import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../supabase/migrations/20261126110439_governed_calculation_rule_versioning.sql',import.meta.url),'utf8');
const mcp=fs.readFileSync(new URL('../api/mcp.js',import.meta.url),'utf8');

test('immutable versions retain the stable rule key and rule number',()=>{
  assert.match(migration,/unique\(rule_number, version\)/i);
  assert.match(migration,/new_number:=old_rule\.rule_number/);
  assert.match(migration,/new_version:=old_rule\.version\+1/);
  assert.match(migration,/previous_version_id/);
  assert.match(migration,/lifecycle_status='REPLACED'/);
});

test('amendments retain governed metadata and exact workflow references',()=>{
  for(const field of ['change_reason','change_summary','structured_diff','preview_reference','approval_reference','commit_reference','approved_by_user_id']) assert.match(migration,new RegExp(field));
  assert.match(migration,/versioning_contract_version/);
  assert.match(migration,/calculation_rule_structured_diff/);
  assert.match(migration,/approver_user_id/);
  assert.match(migration,/version_chain/);
});

test('validation errors are actionable and identify stage, field, received and expected values',()=>{
  for(const field of ['stage','field','received_value','expected_value','code']) assert.match(migration,new RegExp(field));
  assert.match(migration,/PREVIEW_VALIDATION/);
  assert.match(migration,/COMMIT_VALIDATION/);
});

test('effective-date resolution considers immutable history and selects the latest effective version',()=>{
  assert.match(migration,/lifecycle_status in\('APPROVED','REPLACED'\)/);
  assert.match(migration,/partition by rule_key order by effective_from desc,version desc/);
  assert.match(migration,/p_effective_date between r\.effective_from/);
});

test('replacement carries forward unchanged approved applicability and enforcement',()=>{
  assert.match(migration,/previous_applicability_set_id/);
  assert.match(migration,/from public\.calculation_rule_contexts where applicability_set_id=old_set\.applicability_set_id/);
  assert.match(migration,/then 'ENFORCED' else 'NOT_ENFORCED'/);
});

test('MCP contract describes the governed amendment and full-chain readback',()=>{
  assert.match(mcp,/complete immutable version chain/);
  assert.match(mcp,/same rule_key and rule number/);
  assert.match(mcp,/server-computed structured diff/);
});
