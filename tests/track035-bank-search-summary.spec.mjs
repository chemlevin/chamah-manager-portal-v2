import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const edge = fs.readFileSync('supabase/functions/portal-bank-workbench/index.ts', 'utf8');
const ui = fs.readFileSync('chamah-manager-portal/new/bank-workbench-ux.js', 'utf8');

test('TRACK035 description search is tokenized, server-side and replaces presence controls', () => {
  expect(ui).toContain('חיפוש בתיאור');
  expect(ui).not.toContain('id="bank-description-presence"');
  expect(ui).not.toContain('id="bank-reference-presence"');
  expect(edge).toContain('split(/\\s+/).filter(Boolean)');
  expect(edge).toContain('descriptionTerms.every((term)');
  expect(edge).toContain('transaction.reference_number');
});

test('TRACK035 returns canonical full filtered summary before slicing the requested page', () => {
  const summaryAt = edge.indexOf('const resultSummary =');
  const pagingAt = edge.indexOf('const pageTransactions =');
  expect(summaryAt).toBeGreaterThan(edge.indexOf('const matching ='));
  expect(summaryAt).toBeLessThan(pagingAt);
  expect(edge).toContain('split: matching.filter((row: Record<string, unknown>) => classify(row).split).length');
  expect(edge).toContain('assigned: matching.filter((row: Record<string, unknown>) => !classify(row).untreated).length');
  expect(edge).toContain('unassigned: matching.filter((row: Record<string, unknown>) => classify(row).untreated).length');
  for (const label of ['רשומות', 'מפוצלות', 'שויכו', 'לא שויכו']) expect(ui).toContain(label);
});
