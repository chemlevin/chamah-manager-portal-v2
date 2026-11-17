import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync('api/mcp.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20261116190000_track132_operational_import_contract.sql','utf8');
const fix=fs.readFileSync('supabase/migrations/20261117100000_track132_commit_rpc_mapping_fix.sql','utf8');

test('TRACK132 exposes one versioned contract across wrapper and RPC calls',()=>{
  for(const tool of ['preview_operational_changes','request_operational_approval','commit_operational_changes']){
    assert.match(api,new RegExp(`${tool}[\\s\\S]{0,500}contract_version`));
  }
  assert.match(api,/p_contract_version:args\.contract_version/);
  assert.match(api,/portal_mcp_operational_contract_catalog/);
  assert.match(migration,/portal_operational_contract_version\(\)/);
  assert.match(migration,/contract_version text/);
  assert.match(migration,/raise exception 'VERSION_MISMATCH'/g);
  assert.match(migration,/portal_mcp_preview_operational_changes\(text,jsonb,text,jsonb,text\)/);
  assert.match(migration,/portal_mcp_request_operational_approval\(text,uuid,text\)/);
  assert.match(migration,/portal_mcp_commit_operational_changes\(text,uuid,uuid\)/);
});

test('new connector registration advertises the TRACK132 manifest version',()=>{
  assert.match(api,/const SERVER_VERSION = '1\.6\.0'/);
  assert.match(api,/const CONTRACT_VERSION = '1\.0\.0'/);
  assert.match(api,/version:SERVER_VERSION,contractVersion:CONTRACT_VERSION/);
  assert.doesNotMatch(api,/contractVersion:'stable-1'/);
});

test('TRACK132 keeps the shared safeguards in the delegated commit path',()=>{
  assert.match(api,/rpc='portal_mcp_commit_operational_changes_v1';params=\{p_batch_id:args\.batch_id,p_approval_id:args\.approval_id,p_contract_version:args\.contract_version\}/);
  assert.match(fix,/portal_mcp_commit_operational_changes_v1/);
  assert.match(fix,/p_batch_id uuid/);
  assert.match(fix,/p_approval_id uuid/);
  assert.match(fix,/p_contract_version text/);
  assert.match(migration,/portal_mcp_commit_operational_changes\(p_batch_id,p_approval_id\)/);
  assert.match(migration,/stored is distinct from p_contract_version/);
  assert.match(migration,/approval_minutes/);
});

test('TRACK132 regression covers the real-shape workflow and UUID contract',()=>{
  assert.match(api,/contract_version:\{type:'string',const:'1\.0\.0'\}/);
  assert.match(api,/batch_id:\{type:'string',format:'uuid'\}/);
  assert.match(api,/approval_id:\{type:'string',format:'uuid'\}/);
  assert.match(fix,/portal_mcp_commit_operational_changes_v1/);
  assert.match(api,/get_operational_batch/);
});
