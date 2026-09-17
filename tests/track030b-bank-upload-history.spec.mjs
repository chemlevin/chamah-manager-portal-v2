import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const migrationPath = 'supabase/migrations/20260917082920_track030b_bank_upload_history.sql';
const functionPath = 'supabase/functions/portal-bank-workbench/index.ts';
const frontendPath = 'chamah-manager-portal/new/bank-workbench-ux.js';

test('new bank imports persist accepted source transaction bounds without historical backfill', async () => {
  const migration = await readFile(migrationPath, 'utf8');
  expect(migration).toContain("select min((row_value->>'transaction_date')::date), max((row_value->>'transaction_date')::date)");
  expect(migration).toContain("'source_transaction_min_date', source_transaction_min_date");
  expect(migration).toContain("'source_transaction_max_date', source_transaction_max_date");
  expect(migration).not.toMatch(/update\s+public\.import_batches/i);
  expect(migration).not.toMatch(/alter\s+table/i);
});
test('bank workbench GET shapes upload history from existing batches, accounts and transactions', async () => {
  const edgeFunction = await readFile(functionPath, 'utf8');
  const frontend = await readFile(frontendPath, 'utf8');
  expect(edgeFunction).toContain('bank_transactions?select=import_batch_id,bank_account_id,transaction_date');
  expect(edgeFunction).toContain('metadata.source_transaction_min_date');
  expect(edgeFunction).toContain('metadata.source_transaction_max_date');
  expect(edgeFunction).toContain('date_range_source');
  expect(edgeFunction).toContain('uploadHistory: { accounts: historyAccounts, batches: historyBatches }');
  expect(frontend).toContain('if(!state.data){message("הנתונים עדיין נטענים…");return;}renderUploadHistory()');
});

