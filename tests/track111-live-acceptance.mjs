import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import process from 'node:process';

const endpoint = process.env.TRACK111_DEPLOYMENT;
const email = process.env.TRACK111_EMAIL;
const password = process.env.TRACK111_PASSWORD;
const expectedUserId = process.env.TRACK111_USER_ID;
const protectionBypass = process.env.TRACK111_VERCEL_BYPASS;
assert.ok(endpoint && email && password && expectedUserId && protectionBypass, 'TRACK111 live environment is incomplete');

const supabase = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const apiKey = 'sb_publishable_4MKSdjf7O1oVS4SWhQ36Qw_QUKW8dyW';
const auth = await fetch(`${supabase}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: apiKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
assert.equal(auth.status, 200, 'Director fixture sign-in failed');
const session = await auth.json();
assert.equal(session.user.id, expectedUserId);

let sequence = 0;
async function invoke(method, params) {
  const payload = JSON.stringify({ jsonrpc: '2.0', id: ++sequence, method, ...(params ? { params } : {}) });
  const response = await fetch(`${endpoint}/api/mcp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'x-vercel-protection-bypass': protectionBypass },
    body: payload,
    signal: AbortSignal.timeout(30000)
  });
  if (response.status !== 200) assert.fail(`MCP HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}
async function tool(name, args) {
  const response = await invoke('tools/call', { name, arguments: args });
  assert.equal(response.jsonrpc, '2.0');
  return response.result;
}
async function ok(name, args) {
  const result = await tool(name, args);
  assert.equal(result.isError, false, `${name}: ${result.content?.[0]?.text}`);
  return result.structuredContent;
}
async function denied(name, args) {
  const result = await tool(name, args);
  assert.equal(result.isError, true, `${name} unexpectedly succeeded`);
  return result;
}

const tools = (await invoke('tools/list')).result.tools.map(tool => tool.name);
for (const name of ['create_policy', 'update_policy', 'request_policy_archive_approval', 'archive_policy', 'request_bulk_policy_archive_approval', 'bulk_archive_policies', 'upload_policy_file', 'download_policy_file']) assert.ok(tools.includes(name), `missing ${name}`);

const marker = `TRACK111-${Date.now()}`;
const created = await ok('create_policy', { title: `${marker}-CRUD`, category: 'QA', body: 'created' });
assert.equal(created.verified, true);
const updated = await ok('update_policy', { document_id: created.id, title: `${marker}-CRUD-updated`, category: 'QA', body: 'updated', expected_updated_at: created.updated_at });
assert.equal(updated.verified, true);
await denied('update_policy', { document_id: created.id, title: 'stale', category: 'QA', body: 'stale', expected_updated_at: created.updated_at });

const fileBody = Buffer.from(`${marker}: private attachment`, 'utf8');
const uploaded = await ok('upload_policy_file', { document_id: created.id, filename: 'acceptance.txt', content_type: 'text/plain', base64: fileBody.toString('base64') });
assert.ok(uploaded.object_path.startsWith(`${expectedUserId}/${created.id}/`));
const downloaded = await ok('download_policy_file', { object_path: uploaded.object_path });
assert.deepEqual(Buffer.from(downloaded.base64, 'base64'), fileBody);
assert.equal(downloaded.size, fileBody.length);

const deleteReason = 'TRACK111 approved archive';
const approval = await ok('request_policy_archive_approval', { document_id: created.id, reason: deleteReason });
await denied('archive_policy', { document_id: created.id, approval_id: approval.approval_id, reason: `${deleteReason} tampered` });
const archived = await ok('archive_policy', { document_id: created.id, approval_id: approval.approval_id, reason: deleteReason });
assert.deepEqual({ status: archived.status, archived: archived.archived, deleted: archived.deleted }, { status: 'RETIRED', archived: true, deleted: false });
await denied('archive_policy', { document_id: created.id, approval_id: approval.approval_id, reason: deleteReason });

const bulkA = await ok('create_policy', { title: `${marker}-bulk-a`, category: 'QA', body: 'a' });
const bulkB = await ok('create_policy', { title: `${marker}-bulk-b`, category: 'QA', body: 'b' });
const bulkReason = 'TRACK111 approved bulk archive';
const bulkApproval = await ok('request_bulk_policy_archive_approval', { document_ids: [bulkA.id, bulkB.id], reason: bulkReason });
await denied('bulk_archive_policies', { document_ids: [bulkB.id, bulkA.id], approval_id: bulkApproval.approval_id, reason: bulkReason });
const bulk = await ok('bulk_archive_policies', { document_ids: [bulkA.id, bulkB.id], approval_id: bulkApproval.approval_id, reason: bulkReason });
assert.deepEqual({ affected: bulk.affected, atomic: bulk.atomic }, { affected: 2, atomic: true });

const rollbackA = await ok('create_policy', { title: `${marker}-rollback-a`, category: 'QA', body: 'a' });
const rollbackB = await ok('create_policy', { title: `${marker}-rollback-b`, category: 'QA', body: 'b' });
const missingId = randomUUID();
const rollbackReason = 'TRACK111 rollback proof';
const rollbackApproval = await ok('request_bulk_policy_archive_approval', { document_ids: [rollbackA.id, missingId], reason: rollbackReason });
await denied('bulk_archive_policies', { document_ids: [rollbackA.id, missingId], approval_id: rollbackApproval.approval_id, reason: rollbackReason });

console.log(`CHECKPOINT_JSON=${JSON.stringify({ marker, createdId: created.id, bulkIds: [bulkA.id, bulkB.id], rollbackIds: [rollbackA.id, rollbackB.id], missingId, rollbackApprovalId: rollbackApproval.approval_id, objectPath: uploaded.object_path })}`);
console.log('TRACK111_CHECKPOINT_READY');
await new Promise(resolve => setTimeout(resolve, Number(process.env.TRACK111_CHECKPOINT_MS || 60000)));

const cleanupReason = 'TRACK111 cleanup archive';
const cleanupApproval = await ok('request_bulk_policy_archive_approval', { document_ids: [rollbackA.id, rollbackB.id], reason: cleanupReason });
const cleanup = await ok('bulk_archive_policies', { document_ids: [rollbackA.id, rollbackB.id], approval_id: cleanupApproval.approval_id, reason: cleanupReason });
assert.equal(cleanup.affected, 2);
console.log(`RESULT_JSON=${JSON.stringify({ marker, documentIds: [created.id, bulkA.id, bulkB.id, rollbackA.id, rollbackB.id], objectPath: uploaded.object_path, tools: tools.length, passed: true })}`);
