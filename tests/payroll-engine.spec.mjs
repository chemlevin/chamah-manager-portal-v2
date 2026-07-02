import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const engine = require('../api/payroll-engine.js');
const businessRules = require('../config/business-rules.js');

test.describe('payroll calculation engine', () => {
  test('uses the centralized daycare-month key helper', () => {
    expect(engine.daycareMonthKey('North', '09/2026')).toBe('North|09/2026');
    expect(engine.daycareMonthKey(' North ', ' 09/2026 ')).toBe('North|09/2026');
    expect(engine.daycareMonthKey).toBe(businessRules.daycareMonthKey);
  });

  test('normalizes dynamic payroll rows and groups payroll cost and hours by daycare and month', () => {
    const model = engine.calculatePayrollModel([
      ['Daycare', 'Month', 'Employee', 'Class', 'Hours', 'Base Pay', 'Bonus', 'Deductions'],
      ['North', '09/2026', 'Ada', 'Infants', '120.5', '₪5,100.50', '250', ''],
      ['North', '09/2026', 'Ben', 'Toddlers', '80', '4,900', '₪100', '-50'],
      ['South', '10/2026', 'Chen', 'Garden', '', '₪ 6,000', '', '(200)'],
    ]);

    expect(model.rows).toHaveLength(3);
    expect(model.byDaycareMonth).toHaveLength(2);
    expect(Object.keys(model.byDaycareMonthKey).sort()).toEqual(['North|09/2026', 'South|10/2026']);

    const north = model.byDaycareMonth.find((row) => row.daycare === 'North' && row.month === '09/2026');
    expect(north).toEqual(expect.objectContaining({ daycare: 'North', month: '09/2026', employeeCount: 2, rowCount: 2, totalPayrollCost: 10300.5, totalPayrollHours: 200.5 }));
    expect(north.costFields).toEqual({ 'Base Pay': 10000.5, Bonus: 350, Deductions: -50 });
    expect(north.hourFields).toEqual({ Hours: 200.5 });
    expect(model.byDaycareMonthKey['North|09/2026']).toBe(north);

    const south = model.byDaycareMonth.find((row) => row.daycare === 'South' && row.month === '10/2026');
    expect(south).toEqual(expect.objectContaining({ totalPayrollCost: 5800, totalPayrollHours: 0 }));
  });

  test('creates byClass aggregates inside each daycare and month group', () => {
    const model = engine.calculatePayrollModel([
      ['Daycare', 'Month', 'Employee', 'Class', 'Hours', 'Salary'],
      ['North', '09/2026', 'Ada', 'Infants', '100', '₪5,000'],
      ['North', '09/2026', 'Ben', 'Infants', '80', '₪4,000'],
      ['North', '09/2026', 'Chen', 'Toddlers', '50', '₪2,500'],
    ]);

    const north = model.byDaycareMonth[0];
    expect(model.byDaycareMonthKey['North|09/2026']).toBe(north);
    expect(north.byClass).toHaveLength(2);
    expect(north.byClass.find((row) => row.classroom === 'Infants')).toEqual(expect.objectContaining({ employeeCount: 2, rowCount: 2, totalPayrollCost: 9000, totalPayrollHours: 180 }));
    expect(north.byClass.find((row) => row.classroom === 'Toddlers')).toEqual(expect.objectContaining({ employeeCount: 1, totalPayrollCost: 2500, totalPayrollHours: 50 }));
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
    expect(Object.keys(model.byDaycareMonthKey)).toEqual(['North|09/2026']);
    expect(model.byDaycareMonth[0]).toEqual(expect.objectContaining({ daycare: 'North', month: '09/2026', totalPayrollCost: 1200 }));
    expect(model.byDaycareMonthKey['North|09/2026']).toEqual(expect.objectContaining({ daycare: 'North', month: '09/2026', totalPayrollCost: 1200 }));
  });

  test('keeps payroll data dynamic without fixed employee or field names', () => {
    const model = engine.calculatePayrollModel([
      ['מעון', 'חודש', 'שם עובד', 'כיתה', 'שעות', 'שכר', 'החזר נסיעות'],
      ['כרמל', '11/2026', 'ליה', 'פעוט', '120', '₪45', '1,000'],
      ['כרמל', '11/2026', 'נועה', 'בוגר', '80', '50', ''],
    ]);

    expect(model.byDaycareMonth[0]).toEqual(expect.objectContaining({ daycare: 'כרמל', month: '11/2026', employeeCount: 2, totalPayrollCost: 1095, totalPayrollHours: 200 }));
    expect(model.byDaycareMonth[0].costFields).toEqual({ 'שכר': 95, 'החזר נסיעות': 1000 });
    expect(model.byDaycareMonth[0].hourFields).toEqual({ 'שעות': 200 });
  });

  test('normalizes shekel signs, commas, decimals and blanks in numeric fields', () => {
    expect(engine.numberValue('₪12,345.67')).toBe(12345.67);
    expect(engine.numberValue('')).toBe(0);
    expect(engine.numberValue(' ₪ 1,250 ')).toBe(1250);
  });
});
