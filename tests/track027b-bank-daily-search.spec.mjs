import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const edge = fs.readFileSync('supabase/functions/portal-bank-workbench/index.ts', 'utf8');
const ui = fs.readFileSync('chamah-manager-portal/new/bank-workbench-ux.js', 'utf8');

test('TRACK027B removes silent caps and returns explicit complete pagination metadata', () => {
  expect(edge).not.toContain('limit=2000');
  expect(edge).not.toContain('limit=5000');
  expect(edge).toContain('const readAll = async');
  expect(edge).toContain('pagination: { page: safePage, pageSize, total, pageCount');
  expect(edge).toContain('complete: true');
});

test('TRACK027B preserves the existing classification predicates server-side', () => {
  const contracts = [
    '!rows.length || rows.some',
    'selectedUnit?.allocation_unit_type === "DAYCARE" && !row.daycare_id',
    'row.movement_type !== "EXCLUDE" && !row.budget_category_id',
    'Math.abs(remaining) <= .01',
    'statusCode(value) === "ACC-MISSING-DOCS"',
    'statusCode(value) === "ACC-WAITING"',
    'statuses.every((value) => value.is_final)',
  ];
  contracts.forEach((contract) => expect(edge).toContain(contract));
  expect(ui).toContain('const missing = !rows.length || rows.some');
  expect(ui).toContain('const balanced = rows.length > 0 && Math.abs(remaining) <= .01');
});

test('TRACK027B exposes all daily-work controls and server query parameters', () => {
  ['bank-year-filter','bank-month-filter','bank-assignment-filter','bank-daycare-filter','bank-department-filter','bank-account-filter','bank-category-filter','bank-status-filter','bank-split-filter','bank-page-prev','bank-page-next'].forEach((id) => expect(ui).toContain(`id="${id}"`));
  ['transaction_month','assignment_month','description_presence','reference_presence','page_size'].forEach((name) => expect(edge).toContain(name));
  expect(ui).toContain('תנועות בנק —');
});
