import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { test } from '@playwright/test';

test('archive uses an allowed audit operation and remains archived on reload', async () => {
  const source = readFileSync(new URL('../supabase/functions/portal-bank-transfer-workbench/index.ts', import.meta.url), 'utf8');
  const migration = readFileSync(new URL('../supabase/migrations/20260713140119_import_audit_and_data_quality.sql', import.meta.url), 'utf8');
  const allowed = new Set(migration.match(/operation varchar\(20\) not null check \(operation in \(([^)]+)\)\)/)[1].match(/'[^']+'/g).map((value) => value.slice(1, -1)));
  const parentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const childId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const rows = [
    { bank_transfer_id: parentId, parent_transfer_id: null, row_number: 1, lifecycle_status: 'ACTIVE' },
    { bank_transfer_id: childId, parent_transfer_id: parentId, row_number: 2, lifecycle_status: 'ACTIVE' },
  ];
  const audits = [];
  let handler;
  const fetch = async (input, options = {}) => {
    const url = new URL(input);
    if (url.pathname === '/auth/v1/user') return Response.json({ id: parentId });
    if (url.pathname.endsWith('/rpc/portal_has_permission')) return Response.json(true);
    if (url.pathname.endsWith('/portal_user_profiles')) return Response.json([{
      is_active: true, is_super_admin: false, bank_transfer_scope: 'ALL',
      bank_transfer_approve_for_execution: false, bank_transfer_set_execution_date: false,
      permission_configuration_id: parentId,
    }]);
    if (url.pathname.endsWith('/audit_events')) {
      const event = JSON.parse(options.body);
      if (!allowed.has(event.operation)) return Response.json({ message: 'audit_events_operation_check' }, { status: 400 });
      audits.push(event);
      return new Response(null, { status: 201 });
    }
    if (url.pathname.endsWith('/bank_transfers')) {
      if (options.method === 'PATCH') {
        const ids = url.searchParams.get('bank_transfer_id').slice(4, -1).split(',');
        const saved = rows.filter((row) => ids.includes(row.bank_transfer_id));
        saved.forEach((row) => Object.assign(row, JSON.parse(options.body)));
        return Response.json(saved);
      }
      const selected = rows.filter((row) =>
        (!url.searchParams.has('bank_transfer_id') || row.bank_transfer_id === url.searchParams.get('bank_transfer_id').slice(3)) &&
        (!url.searchParams.has('parent_transfer_id') || row.parent_transfer_id === url.searchParams.get('parent_transfer_id').slice(3)) &&
        (!url.searchParams.has('lifecycle_status') || row.lifecycle_status === url.searchParams.get('lifecycle_status').slice(3)));
      return Response.json(selected);
    }
    return Response.json([]);
  };
  const javascript = stripTypeScriptTypes(source.replace(/^import .*\r?\n/, ''));
  vm.runInNewContext(javascript, { Deno: { env: { get: (name) => name === 'SUPABASE_URL' ? 'https://example.test' : 'test' }, serve: (callback) => { handler = callback; } }, fetch, Response, URL, console });
  const request = (method, body) => handler(new Request('https://example.test/functions/v1/portal-bank-transfer-workbench', {
    method, headers: { Authorization: 'Bearer test' }, ...(body ? { body: JSON.stringify(body) } : {}),
  }));
  const archived = await request('POST', { action: 'delete', bank_transfer_id: parentId });
  assert.equal(archived.status, 200);
  assert.deepEqual((await archived.json()).archived, [parentId, childId]);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].operation, 'UPDATE');
  assert.equal(audits[0].previous_values.parent.bank_transfer_id, parentId);
  assert.equal(audits[0].previous_values.children[0].bank_transfer_id, childId);
  assert.equal(audits[0].new_values.lifecycle_status, 'ARCHIVED');
  assert.deepEqual(rows.map((row) => row.lifecycle_status), ['ARCHIVED', 'ARCHIVED']);
  const reloaded = await request('GET');
  assert.deepEqual((await reloaded.json()).transfers, []);
});
