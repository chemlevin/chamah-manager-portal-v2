import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mcp = readFileSync(new URL('../api/mcp.js', import.meta.url), 'utf8');
const bank = readFileSync(new URL('../supabase/functions/portal-bank-workbench/index.ts', import.meta.url), 'utf8');
const workforce = readFileSync(new URL('../supabase/functions/portal-workforce-workbench/index.ts', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../chamah-manager-portal/new/admin-framework.js', import.meta.url), 'utf8');

test('MCP legacy mutations fail closed before RPC dispatch', () => {
  assert.match(mcp, /LEGACY_MUTATION_BLOCKED_TOOLS/);
  assert.match(mcp, /if\(LEGACY_MUTATION_BLOCKED_TOOLS\.has\(name\)\)return send\(res,200,legacyMutationBlocked\(id,name\)\)/);
  for (const name of ['create_employee', 'import_employees', 'create_supplier', 'import_suppliers', 'create_payment_request', 'import_payment_requests']) {
    assert.match(mcp, new RegExp(`'${name}'`));
  }
});

test('bank workbench blocks all mutating dispatch actions', () => {
  assert.match(bank, /portal-bank-workbench:\$\{normalizeText\(body\.action\)\}/);
  for (const action of ['confirm_import', 'create_manual_transaction', 'save_allocations', 'delete_transactions']) assert.match(bank, new RegExp(`"${action}"`));
  assert.ok(bank.indexOf('const body = await request.json();') < bank.indexOf('if (body.action === "delete_transactions")'));
  assert.ok(bank.indexOf('legacyMutationBlocked') < bank.indexOf('if (body.action === "delete_transactions")'));
});

test('workforce workbench blocks employee and payroll mutations', () => {
  assert.match(workforce, /portal-workforce-workbench:\$\{page\}:\$\{text\(body\.action\)\}/);
  for (const action of ['import_employees', 'save_employee', 'save_rows', 'commit_import', 'save_record', 'save_allocations']) assert.match(workforce, new RegExp(`"${action}"`));
});

test('generic admin delete hook is fail closed', () => {
  assert.match(admin, /LEGACY_MUTATION_BLOCKED/);
  assert.doesNotMatch(admin, /repository\.delete\(row\[metadata\.primaryKey\]/);
});
