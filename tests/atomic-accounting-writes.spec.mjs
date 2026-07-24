import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const migrationPath = 'supabase/migrations/20260724151321_track_017a_atomic_accounting_writes.sql';
const functionPath = 'supabase/functions/portal-bank-workbench/index.ts';

test('confirmed imports use one transactional RPC with database validation', async () => {
  const [migration, edgeFunction] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(functionPath, 'utf8'),
  ]);

  expect(migration).toContain('function public.portal_confirm_bank_import');
  expect(migration).toContain('Import rows failed validation');
  expect(migration).toContain('Import contains transactions that already exist');
  expect(migration).toContain('Not all import rows were persisted');
  expect(edgeFunction).toContain('write("rpc/portal_confirm_bank_import"');
  expect(edgeFunction).toContain('write("rpc/portal_create_manual_bank_transaction"');
  expect(edgeFunction).not.toContain('write("import_batches", "POST"');
  expect(edgeFunction).not.toContain('write("bank_transactions", "POST"');
});

test('transaction deletion uses one RPC and the rollback probe covers both tables', async () => {
  const [migration, edgeFunction, rollbackProbe] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(functionPath, 'utf8'),
    readFile('tests/sql/track017a_atomic_accounting_rollback.sql', 'utf8'),
  ]);

  expect(migration).toContain('function public.portal_delete_bank_transactions');
  expect(migration).toContain('delete from public.bank_allocations');
  expect(migration).toContain('delete from public.bank_transactions');
  expect(migration).toContain('Not all bank transactions were deleted');
  expect(edgeFunction).toContain('write("rpc/portal_delete_bank_transactions"');
  expect(edgeFunction).not.toContain('write(`bank_allocations?bank_transaction_id=');
  expect(rollbackProbe).toContain('TRACK017A_IMPORT_ROLLBACK_FAILED');
  expect(rollbackProbe).toContain('TRACK017A_DELETE_ROLLBACK_FAILED');
  expect(rollbackProbe).toContain('rollback;');
});

test('the live lifecycle probe covers every Accounting release step', async () => {
  const lifecycleProbe = await readFile('tests/sql/track017a_accounting_lifecycle.sql', 'utf8');
  for (const marker of [
    'portal_confirm_bank_import',
    'portal_create_manual_bank_transaction',
    'portal_save_bank_allocations',
    'TRACK017A edit',
    'TRACK017A_LIFECYCLE_RELOAD_FAILED',
    'TRACK017A split 1',
    'TRACK017A_LIFECYCLE_SPLIT_OR_EXPORT_SOURCE_FAILED',
    'TRACK017A_LIFECYCLE_DASHBOARD_SOURCE_FAILED',
    'portal_delete_bank_transactions',
    'rollback;',
  ]) {
    expect(lifecycleProbe).toContain(marker);
  }
});
