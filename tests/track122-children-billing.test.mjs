import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../supabase/migrations/20261112100000_track122_children_billing_provenance.sql',import.meta.url),'utf8');
const mcp=fs.readFileSync(new URL('../api/mcp.js',import.meta.url),'utf8');

test('TRACK122 migration defines minimum child and billing lifecycle entities',()=>{
  for(const table of ['children','child_enrollments','daycare_billing_records','collection_receipts','mcp_source_mapping_versions']) assert.match(sql,new RegExp(`create table if not exists public\\.${table}`));
  for(const field of ['source_record_id','source_version','source_mapping_version','source_payload','unmapped_fields']) assert.match(sql,new RegExp(field));
  assert.match(sql,/status in \('ACTIVE','ENDED'\)/);
  assert.match(sql,/status in \('OPEN','PARTIAL','PAID','VOID'\)/);
});

test('TRACK122 keeps the existing generic MCP ingestion contract',()=>{
  for(const entity of ['children','child_enrollments','daycare_billing_records','collection_receipts']) assert.match(sql,new RegExp(`when '${entity}'`));
  for(const tool of ['preview_operational_changes','request_operational_approval','commit_operational_changes','get_operational_batch']) assert.match(mcp,new RegExp(`name:'${tool}'`));
  assert.doesNotMatch(sql,/unsupported.*person_level_children|unsupported.*parent_billing/i);
});
