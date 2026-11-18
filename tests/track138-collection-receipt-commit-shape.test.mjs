import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync(new URL('../supabase/migrations/20261118140000_track138_collection_receipt_commit_shape_fix.sql',import.meta.url),'utf8');

test('TRACK138 normalizes existing flattened receipt rows only at commit time',()=>{
  assert.match(migration,/p_row->>'entity'='collection_receipts'/);
  assert.match(migration,/jsonb_typeof\(p_row->'values'\) is distinct from 'object'/);
  assert.match(migration,/'values',p_row-'entity'-'record_id'-'expected_row_version'/);
  assert.match(migration,/portal_mcp_apply_generic_row\(normalized\)/);
  assert.doesNotMatch(migration,/update public\.mcp_ingestion_batches/);
});
