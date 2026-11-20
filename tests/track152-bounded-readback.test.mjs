import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const api=readFileSync(new URL('../api/mcp.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261120120000_track152_bounded_operational_batch_readback.sql',import.meta.url),'utf8');

test('TRACK152 exposes bounded status and detail read-back tools',()=>{
  for(const name of ['get_operational_batch_status','get_operational_batch_page']) assert.match(api,new RegExp(`name:'${name}'`));
  for(const detail of ['staged_rows','committed_records','record_audit','authorization_audit','source_lineage','discrepancies']) assert.match(api,new RegExp(detail));
  assert.match(api,/portal_mcp_get_operational_batch_status/);
  assert.match(api,/portal_mcp_get_operational_batch_page/);
  assert.match(api,/args\.limit>100/);
  assert.match(api,/MAX_OPERATIONAL_BATCH_PAGE_RESPONSE_BYTES/);
  assert.match(api,/reduce limit and retry with the same cursor/);
});

test('TRACK152 migration is additive, actor-scoped, bounded, deterministic, and read-only',()=>{
  assert.match(sql,/create or replace function public\.portal_mcp_get_operational_batch_status/);
  assert.match(sql,/create or replace function public\.portal_mcp_get_operational_batch_page/);
  for(const field of ['approval_state','commit_result_digest','integrity_flags','next_action','max_limit','returned_count','total_count','next_cursor','complete','response_size_bytes']) assert.match(sql,new RegExp(`'${field}'`));
  assert.match(sql,/private\.portal_is_authorized\(auth\.uid\(\),'OPERATIONS\.READ'\)/);
  assert.match(sql,/x\.actor_user_id=auth\.uid\(\)/);
  assert.match(sql,/order by a\.occurred_at,a\.audit_event_id/);
  assert.match(sql,/order by a\.occurred_at,a\.event_id/);
  assert.match(sql,/limit safe_limit/);
  assert.match(sql,/revoke all on function/);
  assert.doesNotMatch(sql,/insert into|update public\.|delete from/i);
});
