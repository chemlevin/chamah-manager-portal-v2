import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const api=readFileSync(new URL('../api/mcp.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261118000000_track137_operational_batch_discovery.sql',import.meta.url),'utf8');

test('TRACK137 exposes an additive read-only batch discovery tool with filters',()=>{
  assert.match(api,/name:'list_operational_batches'/);
  for(const key of ['entity','month','status','source','limit','offset']) assert.match(api,new RegExp(key));
  assert.match(api,/portal_mcp_list_operational_batches/);
  assert.match(api,/list_operational_batches','child_reconciliation/);
});

test('TRACK137 RPC is actor-scoped, read-only, and returns required inventory fields',()=>{
  assert.match(sql,/create or replace function public\.portal_mcp_list_operational_batches/);
  for(const field of ['batch_id','entity','source','month','row_count','status','approval_id','approval_valid','committed_at','duplicate_conflict_indicators']) assert.match(sql,new RegExp("'"+field+"'"));
  assert.match(sql,/b\.actor_user_id=auth\.uid\(\)/);
  assert.match(sql,/portal_is_authorized\(auth\.uid\(\),'OPERATIONS\.READ'\)/);
  assert.match(sql,/language sql stable security definer/);
  assert.match(sql,/revoke all on function/);
  assert.doesNotMatch(sql,/insert into|update public\.mcp_ingestion_batches|delete from/i);
});
