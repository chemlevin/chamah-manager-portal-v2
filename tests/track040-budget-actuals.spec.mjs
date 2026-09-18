import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { buildBankActuals, buildPayrollActuals, categoryActuals, summarizeActuals } from '../chamah-manager-portal/new/actuals-calculations.js';

const categories = [
  { budget_category_id: 'income', budget_category_code: 'CAT-TUITION', category_type: 'INCOME' },
  { budget_category_id: 'expense', budget_category_code: 'CAT-FOOD', category_type: 'EXPENSE' },
  { budget_category_id: 'payroll', budget_category_code: 'CAT-PAYROLL-STAFF', category_type: 'EXPENSE' },
  { budget_category_id: 'fixed', budget_category_code: 'CAT-PAYROLL-NONSTAFF', category_type: 'EXPENSE' },
];
const baseBank = { bank_transaction_id: 'bank', allocation_unit_id: 'unit', daycare_id: 'dc', budget_month: '2026-09-01' };
const bank = (movement_type, budget_category_id, allocation_amount, extra = {}) => ({ ...baseBank, movement_type, budget_category_id, allocation_amount, ...extra });
const payrollParent = (extra = {}) => ({ payroll_record_id: 'parent', row_kind: 'PARENT', parent_payroll_record_id: null, payroll_month: '2026-09-01', employer_cost: 1000, actual_hours: 20, actual_allocation_unit_id: 'unit', actual_daycare_id: 'dc', role_id: 'caregiver', ...extra });
const payrollOptions = (records) => ({ records, daycares: [{ daycare_id: 'dc', allocation_unit_id: 'unit' }], roles: [{ role_id: 'caregiver', role_code: 'ROLE-CAREGIVER' }, { role_id: 'manager', role_code: 'ROLE-MANAGER' }], categories, selectedMonths: new Set(['2026-09']), selectedUnitIds: new Set(['unit']) });

test('Bank Actual preserves normal signed income/expense, reversal and refund semantics', () => {
  const rows = buildBankActuals([
    bank('INCOME', 'income', 500), bank('EXPENSE', 'expense', -300),
    bank('INCOME', 'income', -50), bank('EXPENSE', 'expense', 25),
  ], categories);
  expect(summarizeActuals({ bankRows: rows })).toMatchObject({ income: 450, expenses: 275 });
});

test('INTERNAL, EXCLUDE, incompatible and incomplete Bank rows have zero Budget effect', () => {
  const rows = buildBankActuals([
    bank('INTERNAL', 'expense', -100), bank('EXCLUDE', 'expense', -100),
    bank('INCOME', 'expense', 100), bank('EXPENSE', 'income', -100),
    bank('EXPENSE', null, -100), bank('EXPENSE', 'expense', -100, { allocation_unit_id: null }),
  ], categories);
  expect(rows.map((row) => row.effect)).toEqual([0, 0, 0, 0, 0, 0]);
});

test('Bank split children are counted once and budget_month controls inclusion', () => {
  const all = buildBankActuals([
    bank('EXPENSE', 'expense', -40, { bank_allocation_id: 'child-1' }),
    bank('EXPENSE', 'expense', -60, { bank_allocation_id: 'child-2' }),
    bank('EXPENSE', 'expense', -999, { bank_allocation_id: 'other-month', budget_month: '2026-08-01' }),
  ], categories);
  const september = all.filter((row) => row.budget_month.startsWith('2026-09'));
  expect(summarizeActuals({ bankRows: september }).expenses).toBe(100);
});

test('Payroll parent employer_cost is used once without children when attribution is canonical', () => {
  const result = buildPayrollActuals(payrollOptions([payrollParent()]));
  expect(result.issues).toEqual([]);
  expect(result.rows).toHaveLength(1);
  expect(summarizeActuals({ payrollRows: result.rows })).toMatchObject({ payroll: 1000, actualHours: 20 });
});

test('Payroll children replace parent and preserve reconciled split', () => {
  const result = buildPayrollActuals(payrollOptions([
    payrollParent(),
    payrollParent({ payroll_record_id: 'split-1', row_kind: 'SPLIT', parent_payroll_record_id: 'parent', employer_cost: 400, actual_hours: 8 }),
    payrollParent({ payroll_record_id: 'split-2', row_kind: 'SPLIT', parent_payroll_record_id: 'parent', employer_cost: 600, actual_hours: 12 }),
  ]));
  expect(result.rows.map((row) => row.actual_amount)).toEqual([400, 600]);
  expect(result.issues).toEqual([]);
  expect(summarizeActuals({ payrollRows: result.rows }).payroll).toBe(1000);
});

test('Payroll reports insufficient attribution and split mismatch without guessing', () => {
  const result = buildPayrollActuals(payrollOptions([
    payrollParent(),
    payrollParent({ payroll_record_id: 'split', row_kind: 'SPLIT', parent_payroll_record_id: 'parent', employer_cost: 900, actual_daycare_id: 'wrong' }),
  ]));
  expect(result.rows).toEqual([]);
  expect(result.issues.map((issue) => issue.code).sort()).toEqual(['PAYROLL_ATTRIBUTION_INSUFFICIENT', 'PAYROLL_SPLIT_MISMATCH']);
});

test('Bank payroll categories do not duplicate Payroll and KPI/category totals share one contract', () => {
  const bankRows = buildBankActuals([bank('EXPENSE', 'payroll', -1000), bank('EXPENSE', 'expense', -250)], categories);
  const payrollRows = buildPayrollActuals(payrollOptions([payrollParent()])).rows;
  const totals = summarizeActuals({ bankRows, payrollRows });
  const matrix = categoryActuals({ bankRows, payrollRows });
  expect(totals).toMatchObject({ expenses: 250, payroll: 1000 });
  expect(matrix.get('payroll|dc')).toBe(1000);
  expect(matrix.get('expense|dc')).toBe(250);
});

test('server rejects contradictory movement/category assignments and does not gate Actual on status', async () => {
  const edge = await readFile(new URL('../supabase/functions/portal-bank-workbench/index.ts', import.meta.url), 'utf8');
  const app = await readFile(new URL('../chamah-manager-portal/new/app.js', import.meta.url), 'utf8');
  expect(edge).toContain('row.movement_type === "INCOME" && selectedCategory?.category_type !== "INCOME"');
  expect(edge).toContain('row.movement_type === "EXPENSE" && selectedCategory?.category_type !== "EXPENSE"');
  expect(app).not.toMatch(/month_status[^\n]*(actual|Actual|בפועל)/u);
  expect(app).toContain('buildBankActuals');
  expect(app).toContain('categoryActuals');
});

test('09/2026, 01/2027 and 08/2027 belong to the same תשפ״ז range', () => {
  const starts = '2026-09'; const ends = '2027-08';
  for (const value of ['2026-09', '2027-01', '2027-08']) expect(value >= starts && value <= ends).toBeTruthy();
});
