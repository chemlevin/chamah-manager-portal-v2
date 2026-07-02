import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const engine = require('../api/payroll-engine.js');

test.describe('payroll calculation engine', () => {
  test('normalizes dynamic payroll rows and groups totals by daycare and month', () => {
    const model = engine.calculatePayrollModel([
      ['Daycare', 'Month', 'Employee', 'Class', 'Base Pay', 'Bonus', 'Deductions'],
      ['North', '09/2026', 'Ada', 'Infants', '₪5,100', '250', ''],
      ['North', '09/2026', 'Ben', 'Toddlers', '4,900', '₪100', '-50'],
      ['South', '10/2026', 'Chen', 'Garden', '₪ 6,000', '', '(200)'],
    ]);

    expect(model.rows).toHaveLength(3);
    expect(model.byDaycareMonth).toHaveLength(2);

    const north = model.byDaycareMonth.find((row) => row.daycare === 'North' && row.month === '09/2026');
    expect(north).toEqual(expect.objectContaining({ daycare: 'North', month: '09/2026', employeeCount: 2, rowCount: 2, total: 10300 }));
    expect(north.numericFields).toEqual({ 'Base Pay': 10000, Bonus: 350, Deductions: -50 });

    const south = model.byDaycareMonth.find((row) => row.daycare === 'South' && row.month === '10/2026');
    expect(south).toEqual(expect.objectContaining({ total: 5800 }));
  });

  test('ignores empty rows and skips rows missing daycare or month', () => {
    const model = engine.calculatePayrollModel([
      ['Daycare', 'Month', 'Employee', 'Salary'],
      ['', '', '', ''],
      ['North', '', 'Ada', '₪5,100'],
      ['', '09/2026', 'Ben', '4,900'],
      ['North', '09/2026', 'Chen', '₪1,200'],
    ]);

    expect(model.rows).toHaveLength(1);
    expect(model.byDaycareMonth).toHaveLength(1);
    expect(model.byDaycareMonth[0]).toEqual(expect.objectContaining({ daycare: 'North', month: '09/2026', total: 1200 }));
  });

  test('keeps payroll data dynamic without fixed employee or field names', () => {
    const model = engine.calculatePayrollModel([
      ['מעון', 'חודש', 'שם עובד', 'שעות', 'תעריף', 'החזר נסיעות'],
      ['כרמל', '11/2026', 'ליה', '120', '₪45', '1,000'],
      ['כרמל', '11/2026', 'נועה', '80', '50', ''],
    ]);

    expect(model.byDaycareMonth[0]).toEqual(expect.objectContaining({ daycare: 'כרמל', month: '11/2026', employeeCount: 2, total: 1295 }));
    expect(model.byDaycareMonth[0].numericFields).toEqual({ 'שעות': 200, 'תעריף': 95, 'החזר נסיעות': 1000 });
  });

  test('normalizes shekel signs, commas, and blanks in numeric fields', () => {
    expect(engine.numberValue('₪12,345')).toBe(12345);
    expect(engine.numberValue('')).toBe(0);
    expect(engine.numberValue(' ₪ 1,250 ')).toBe(1250);
  });
});
