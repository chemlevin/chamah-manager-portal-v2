import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const edge = fs.readFileSync('supabase/functions/portal-bank-workbench/index.ts', 'utf8');
const ui = fs.readFileSync('chamah-manager-portal/new/bank-workbench-ux.js', 'utf8');

test('TRACK030C adds a dedicated AND-composed partial description filter', () => {
  expect(ui).toContain('id="bank-description-filter"');
  expect(ui).toContain('description:state.description');
  expect(ui).toContain('["description",`תיאור: ${state.description}`]');
  expect(edge).toContain('requestUrl.searchParams.get("description")');
  expect(edge).toContain('normalizeText(transaction.description).toLocaleLowerCase("he").includes(description)');
});

test('TRACK030C uses calendar periods for the existing accounting assignment month source', () => {
  expect(edge).toContain('read("calendar_years?select=*&order=start_date")');
  expect(edge).not.toContain('read("school_year_months?select=*&order=start_date")');
  expect(edge).toContain('const assignmentMonths = [...assignmentMonthKeys]');
  expect(edge).toContain('normalizeText(row.budget_month)');
});

test('TRACK030C keeps assignment and row validity contracts unchanged', () => {
  expect(ui).toContain('!row.budget_month');
  expect(edge).toContain('!row.budget_month');
  expect(edge).toContain('budget_month: row.budget_month ? `${row.budget_month.slice(0, 7)}-01` : null');
});
