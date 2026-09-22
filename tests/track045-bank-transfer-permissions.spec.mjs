import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { test } from '@playwright/test';

const ids = {
  actor: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  own: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  other: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  unit: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  parent: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  ownChild: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  otherChild: '11111111-1111-4111-8111-111111111111',
  unassigned: '22222222-2222-4222-8222-222222222222',
  ownRow: '33333333-3333-4333-8333-333333333333',
};

function harness({ level = 'EDIT', scope = 'ASSIGNED_DAYCARES', approve = false, date = false, superAdmin = false, assigned = [ids.own] } = {}) {
  const rows = [
    { bank_transfer_id: ids.parent, parent_transfer_id: null, row_number: 1, daycare_id: ids.other, amount: 1000, name: 'secret parent', lifecycle_status: 'ACTIVE', status: 'PENDING' },
    { bank_transfer_id: ids.ownChild, parent_transfer_id: ids.parent, row_number: 2, daycare_id: ids.own, amount: 200, name: 'own allocation', lifecycle_status: 'ACTIVE', status: 'PENDING' },
    { bank_transfer_id: ids.otherChild, parent_transfer_id: ids.parent, row_number: 3, daycare_id: ids.other, amount: 800, name: 'secret allocation', lifecycle_status: 'ACTIVE', status: 'PENDING' },
    { bank_transfer_id: ids.unassigned, parent_transfer_id: null, row_number: 4, daycare_id: null, amount: 99, name: 'unassigned', lifecycle_status: 'ACTIVE', status: 'PENDING' },
    { bank_transfer_id: ids.ownRow, parent_transfer_id: null, row_number: 5, daycare_id: ids.own, allocation_unit_id: ids.unit, amount: 40, name: 'own row', lifecycle_status: 'ACTIVE', status: 'PENDING', execution_date: null },
  ];
  let handler;
  const fetch = async (input, options = {}) => {
    const url = new URL(input), path = url.pathname;
    if (path === '/auth/v1/user') return Response.json({ id: ids.actor });
    if (path.endsWith('/rpc/portal_has_permission')) {
      const required = JSON.parse(options.body).required_level;
      return Response.json(level === 'EDIT' || level === 'VIEW' && required === 'VIEW');
    }
    if (path.endsWith('/portal_user_profiles')) return Response.json([{ is_active: true, is_super_admin: superAdmin, bank_transfer_scope: scope, bank_transfer_approve_for_execution: approve, bank_transfer_set_execution_date: date, permission_configuration_id: ids.actor }]);
    if (path.endsWith('/portal_user_daycares')) return Response.json(assigned.map((daycare_id) => ({ daycare_id })));
    if (path.endsWith('/budget_categories')) return Response.json([]);
    if (path.endsWith('/allocation_units')) return Response.json([{ allocation_unit_id: ids.unit, display_name: 'unit' }]);
    if (path.endsWith('/daycares')) return Response.json(url.searchParams.has('daycare_id') ? [{ daycare_id: ids.own, allocation_unit_id: ids.unit }] : [{ daycare_id: ids.own, allocation_unit_id: ids.unit }, { daycare_id: ids.other, allocation_unit_id: ids.unit }]);
    if (path.endsWith('/audit_events')) return new Response(null, { status: 201 });
    if (path.endsWith('/bank_transfers')) {
      if (options.method === 'PATCH') {
        const selected = rows.filter((row) => row.bank_transfer_id === url.searchParams.get('bank_transfer_id')?.slice(3));
        selected.forEach((row) => Object.assign(row, JSON.parse(options.body)));
        return Response.json(selected);
      }
      if (options.method === 'POST') {
        const body = JSON.parse(options.body);
        const created = { bank_transfer_id: crypto.randomUUID(), row_number: rows.length + 1, ...body };
        rows.push(created); return Response.json([created]);
      }
      return Response.json(rows.filter((row) => row.lifecycle_status === 'ACTIVE'
        && (!url.searchParams.has('bank_transfer_id') || row.bank_transfer_id === url.searchParams.get('bank_transfer_id').slice(3))
        && (!url.searchParams.has('parent_transfer_id') || row.parent_transfer_id === url.searchParams.get('parent_transfer_id').slice(3))
        && (!url.searchParams.has('row_number') || row.row_number > Number(url.searchParams.get('row_number').slice(3)))));
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  const source = readFileSync(new URL('../supabase/functions/portal-bank-transfer-workbench/index.ts', import.meta.url), 'utf8');
  vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*\r?\n/, '')), {
    Deno: { env: { get: (name) => name === 'SUPABASE_URL' ? 'https://example.test' : 'test' }, serve: (callback) => { handler = callback; } },
    fetch, Response, URL, Uint8Array, atob, crypto, console,
  });
  const request = async (method, body) => {
    const response = await handler(new Request('https://example.test/functions/v1/portal-bank-transfer-workbench', {
      method, headers: { Authorization: 'Bearer test' }, ...(body ? { body: JSON.stringify(body) } : {}),
    }));
    return { status: response.status, body: await response.json() };
  };
  return { request, rows };
}

test('HIDDEN and VIEW do not write; scoped VIEW reads only its allocation', async () => {
  assert.equal((await harness({ level: 'HIDDEN' }).request('GET')).status, 403);
  const view = harness({ level: 'VIEW' });
  assert.equal((await view.request('POST', { action: 'delete', bank_transfer_id: ids.ownRow })).status, 403);
  const result = await view.request('GET');
  assert.deepEqual(result.body.transfers.map((row) => row.bank_transfer_id), [ids.ownChild, ids.ownRow]);
  assert.equal(result.body.transfers[0].parent_transfer_id, null);
  assert.equal(JSON.stringify(result.body).includes('secret'), false);
  assert.deepEqual(result.body.daycares.map((row) => row.daycare_id), [ids.own]);
});

test('scoped EDIT denies cross-daycare IDs, reassignment, parent mutation and protected actions', async () => {
  const { request, rows } = harness();
  for (const id of [ids.parent, ids.otherChild, ids.unassigned]) {
    assert.equal((await request('POST', { action: 'delete', bank_transfer_id: id })).status, 404);
    assert.equal((await request('POST', { action: 'attachment_url', bank_transfer_id: id })).status, 404);
  }
  assert.equal((await request('POST', { action: 'save', bank_transfer_id: ids.ownRow, daycare_id: ids.other, allocation_unit_id: ids.unit, amount: 50 })).status, 403);
  assert.equal((await request('POST', { action: 'save', bank_transfer_id: ids.ownRow, daycare_id: ids.own, allocation_unit_id: ids.unit, amount: 50, execution_date: '2026-09-22' })).status, 403);
  assert.equal((await request('POST', { action: 'approve_for_execution', bank_transfer_id: ids.ownRow })).status, 403);
  assert.equal((await request('POST', { action: 'mark_completed', bank_transfer_id: ids.ownRow })).status, 403);
  assert.equal((await request('POST', { action: 'save', bank_transfer_id: ids.ownRow, daycare_id: ids.own, allocation_unit_id: ids.unit, amount: 50, status: 'COMPLETED', execution_date: '2026-09-22' })).status, 403);
  const own = await request('POST', { action: 'save', bank_transfer_id: ids.ownRow, daycare_id: ids.own, allocation_unit_id: ids.unit, amount: 50 });
  assert.equal(own.status, 200);
  assert.equal(rows.find((row) => row.bank_transfer_id === ids.ownRow).amount, 50);
  const child = await request('POST', { action: 'save', bank_transfer_id: ids.ownChild, daycare_id: ids.own, allocation_unit_id: ids.unit, amount: 220 });
  assert.equal(child.status, 200);
  assert.equal(child.body.transfer.parent_transfer_id, null);
  assert.equal(rows.find((row) => row.bank_transfer_id === ids.ownChild).parent_transfer_id, ids.parent);
});

test('single assigned daycare auto-fills creation; ALL and super-admin retain full access', async () => {
  const scoped = harness();
  const created = await scoped.request('POST', { action: 'save', name: 'new', amount: 10 });
  assert.equal(created.status, 201);
  assert.equal(created.body.transfer.daycare_id, ids.own);
  assert.equal(created.body.transfer.allocation_unit_id, ids.unit);
  const all = harness({ scope: 'ALL', approve: true, date: true });
  assert.equal((await all.request('GET')).body.transfers.length, 5);
  assert.equal((await all.request('POST', { action: 'approve_for_execution', bank_transfer_id: ids.parent })).status, 200);
  const admin = harness({ superAdmin: true });
  assert.equal((await admin.request('GET')).body.transfers.length, 5);
});

test('multiple assignments require explicit permitted daycare and date/approval flags work independently', async () => {
  const multiple = harness({ assigned: [ids.own, ids.other], approve: true, date: false });
  assert.equal((await multiple.request('POST', { action: 'save', name: 'ambiguous', amount: 1 })).status, 403);
  assert.equal((await multiple.request('POST', { action: 'save', name: 'chosen', amount: 1, daycare_id: ids.other, allocation_unit_id: ids.unit })).status, 201);
  assert.equal((await multiple.request('POST', { action: 'approve_for_execution', bank_transfer_id: ids.ownRow })).status, 200);
  assert.equal((await multiple.request('POST', { action: 'save', bank_transfer_id: ids.ownRow, daycare_id: ids.own, allocation_unit_id: ids.unit, amount: 40, execution_date: '2026-09-22' })).status, 403);
  const withDate = harness({ approve: false, date: true });
  assert.equal((await withDate.request('POST', { action: 'save', bank_transfer_id: ids.ownRow, daycare_id: ids.own, allocation_unit_id: ids.unit, amount: 40, execution_date: '2026-09-22' })).status, 200);
  assert.equal((await withDate.request('POST', { action: 'approve_for_execution', bank_transfer_id: ids.ownRow })).status, 403);
});

test('own parent with a foreign split is hidden while own child remains isolated', async () => {
  const { request, rows } = harness();
  rows.find((row) => row.bank_transfer_id === ids.parent).daycare_id = ids.own;
  const result = await request('GET');
  assert.deepEqual(result.body.transfers.map((row) => row.bank_transfer_id), [ids.ownChild, ids.ownRow]);
  assert.equal(JSON.stringify(result.body).includes('secret parent'), false);
  assert.equal(JSON.stringify(result.body).includes('secret allocation'), false);
  assert.equal((await request('POST', { action: 'delete', bank_transfer_id: ids.parent })).status, 403);
});
