import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const require = createRequire(import.meta.url);
const rules = require('../config/business-rules.js');
const root = path.resolve(import.meta.dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260901040851_track028b_tuition_rates_collection_model.sql'), 'utf8');
const budgetSource = fs.readFileSync(path.join(root, 'chamah-manager-portal/new/budget-calculations.js'), 'utf8');

test.describe('TRACK028B tuition economic and collection rules', () => {
  test('keeps annual economic tuition exact and rounds only 11-payment installments', () => {
    expect(rules.annualEconomicTuition(4185)).toBe(50220);
    expect(rules.annualEconomicTuition(3102)).toBe(37224);
    expect(rules.annualEconomicTuition(2751)).toBe(33012);
    expect(rules.tuitionInstallment(4185, 11)).toBe(4565);
    expect(rules.tuitionInstallment(3102, 11)).toBe(3384);
    expect(rules.tuitionInstallment(2751, 11)).toBe(3001);
    expect(rules.tuitionInstallment(3102, 12)).toBe(3102);
  });

  test('defines Sep-Jul for 11 payments and Sep-Aug for 12 payments', () => {
    expect(Array.from({ length: 12 }, (_, index) => rules.isTuitionCollectionMonth(index + 1, 11))).toEqual([true, true, true, true, true, true, true, true, true, true, true, false]);
    expect(Array.from({ length: 12 }, (_, index) => rules.isTuitionCollectionMonth(index + 1, 12))).toEqual(Array(12).fill(true));
  });

  test('migration is code-targeted and leaves ambiguous private daycare unconfigured', () => {
    expect(migration).toContain("school_year_code = 'SY-2026-2027'");
    expect(migration).toContain("d.daycare_code = 'DC-GANON'");
    expect(migration).not.toContain("'DC-PRIVATE'");
    for (const amount of ['4185', '3102', '2751']) expect(migration).toContain(amount);
  });

  test('collection metadata is not consumed by the budget calculation', () => {
    expect(budgetSource).not.toContain('tuition_payment_count');
    expect(budgetSource).toContain('tuitionBudget: childCount * numberValue(tuitionRule?.numeric_value)');
  });
});
