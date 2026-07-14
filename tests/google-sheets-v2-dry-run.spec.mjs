import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSettingsTables, unfoldMonthlyOccupancy, mapPayrollRows, mapBankRows } from '../scripts/lib/google-sheets-v2-dry-run.mjs';

test('parses stacked settings tables', () => {
  const tables = parseSettingsTables([['TABLE: X'], ['id', 'name'], ['A', 'Alpha'], ['END TABLE']]);
  assert.equal(tables.X.rows[0].record.name, 'Alpha');
  assert.equal(tables.X.rows[0].sourceRow, 3);
});

test('unfolds occupancy months', () => {
  const rows = [['year', 'daycare', 'classroom', 'name', 'age', 'Sep', 'Oct'], ['', '', 'C1', '', 'INFANT', 4, 5]];
  const result = unfoldMonthlyOccupancy(rows, ['M1', 'M2']);
  assert.deepEqual(result.map((row) => row.childrenCount), [4, 5]);
});

test('preserves payroll split rows', () => {
  const rows = [[], ['', '09/2026', '7', '', 'מטפלת', 'מחנה', 100], ['', '09/2026', '7', '', 'מטפלת', 'סניף', 200]];
  const result = mapPayrollRows(rows);
  assert.equal(result.length, 2);
  assert.notEqual(result[0].sourceId, result[1].sourceId);
});

test('maps a bank child row to an allocation', () => {
  const parent = ['BT-1', '', '123', '2026-09-01', 'x', 'r', 0, 100, 100, 'פיצול', '', 1, '', '', 'מעונות', 'מחנה', 'אוכל', 'ממתין'];
  const child = ['BT-2', 'BT-1', '', '', '', '', '', '', '', 'חלוקה', '', '', 100, '', 'מעונות', 'מחנה', 'אוכל', 'ממתין'];
  const result = mapBankRows([[], parent, child]);
  assert.equal(result[1].destinationTable, 'bank_allocations');
  assert.deepEqual(result[1].errors, []);
});

test('blocks an allocation with an unknown parent', () => {
  const row = ['BT-2', 'MISSING', '', '', '', '', '', '', '', 'חלוקה', '', '', 100, '', 'משרד', '', 'אוכל', 'ממתין'];
  assert.ok(mapBankRows([[], row])[0].errors.includes('PARENT_TRANSACTION_NOT_FOUND'));
});

