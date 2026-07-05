import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const engine = require('../api/budget-engine.js');
const businessRules = require('../config/business-rules.js');

function finalBusinessRows() {
  return [
    ['TABLE: OCCUPANCY'],
    ['מעון', 'חודש', 'כיתה 1', 'כמות ילדים', 'כיתה 2', 'כמות ילדים 2'],
    ['מחנה', '09/2026', 'תינוק', '18', 'פעוט', '26'],
    ['מחנה', '10/2026', 'תינוק', '10', 'פעוט', '20'],
    ['אשקלון', '09/2026', 'תינוק', '18', 'בוגר', '32'],
    ['TABLE: STAFFING'],
    ['כיתה', 'כמות צוות לילד', 'שכר לימוד'],
    ['תינוק', '5', '3936'],
    ['פעוט', '8', '2917'],
    ['בוגר', '10', '2587'],
    ['TABLE: MONTH_HOURS'],
    ['חודש', 'שעות תקן', 'ימי עבודה'],
    ['09/2026', '182', '22'],
    ['10/2026', '176', '20'],
    ['TABLE: FIXED_STAFF'],
    ['מעון', 'חודש', 'תפקיד 1', 'כמות 1'],
    ['מחנה', '09/2026', 'מנהלת', '1'],
    ['אשקלון', '09/2026', 'מנהלת', '1'],
    ['TABLE: COST_RULES'],
    ['סעיף תקציבי', 'בסיס לחישוב', 'בסיס נוסף', 'ערך', 'תקופה', 'חלוקה', 'מעון חריג'],
    ['אוכל', 'ילדים', 'ימי עבודה', '8', 'חודשי', '1', ''],
    ['אוכל', 'ילדים', 'ימי עבודה', '13', 'חודשי', '1', 'אשקלון'],
    ['חשמל', 'כיתות', '', '100', 'שנתי', '1', ''],
  ];
}

function finalModel() {
  return engine.calculateBudgetModel(engine.parseBudgetTables(finalBusinessRows()));
}

test.describe('budget calculation engine', () => {
  test('reads dynamic BUDGET tables by marker until the next marker', () => {
    const rows = finalBusinessRows();
    rows.splice(4, 0, ['נתיבות', '11/2026', 'בוגר', '33', '', '']);

    const tables = engine.parseBudgetTables(rows);

    expect(Object.keys(tables).sort()).toEqual(['COST_RULES', 'FIXED_STAFF', 'MONTH_HOURS', 'OCCUPANCY', 'STAFFING']);
    expect(tables.OCCUPANCY).toHaveLength(4);
    expect(tables.STAFFING).toHaveLength(3);
  });

  test('calculates staffing per classroom slot before daycare aggregation', () => {
    const model = finalModel();
    const machaneSep = model.byDaycareMonth.find((row) => row.daycare === 'מחנה' && row.month === '09/2026');

    expect(machaneSep.classroomCount).toBe(2);
    expect(machaneSep.children).toBe(44);
    expect(machaneSep.requiredStaff).toBe(7.5);
    expect(machaneSep.requiredHours).toBe(1365);
  });

  test('supports mixed classroom only when explicitly marked as mixed', () => {
    const rows = [
      ['TABLE: OCCUPANCY'],
      ['מעון', 'חודש', 'שם כיתה', 'כיתה מעורבת', 'כיתה 1', 'כמות ילדים', 'כיתה 2', 'כמות ילדים 2'],
      ['אשקלון', '09/2026', 'חדר א', 'כן', 'פעוט', '16', 'תינוק', '10'],
      ['TABLE: STAFFING'],
      ['כיתה', 'כמות צוות לילד', 'שכר לימוד'],
      ['תינוק', '5', '3936'],
      ['פעוט', '8', '2917'],
      ['TABLE: MONTH_HOURS'],
      ['חודש', 'שעות תקן', 'ימי עבודה'],
      ['09/2026', '182', '22'],
      ['TABLE: FIXED_STAFF'],
      ['מעון', 'חודש', 'תפקיד 1', 'כמות 1'],
      ['אשקלון', '09/2026', 'מנהלת', '1'],
      ['TABLE: COST_RULES'],
      ['סעיף תקציבי', 'בסיס לחישוב', 'ערך'],
      ['חשמל', 'כיתות', '100'],
    ];

    const model = engine.calculateBudgetModel(engine.parseBudgetTables(rows));

    expect(model.classroomStaffing).toHaveLength(1);
    expect(model.classroomStaffing[0]).toEqual(expect.objectContaining({ classroom: 'חדר א', children: 26, requiredStaff: 4 }));
  });

  test('calculates expected revenue per daycare/month from occupancy and staffing tuition', () => {
    const model = finalModel();
    const machaneSep = model.byDaycareMonth.find((row) => row.daycare === 'מחנה' && row.month === '09/2026');
    const machaneOct = model.byDaycareMonth.find((row) => row.daycare === 'מחנה' && row.month === '10/2026');

    expect(machaneSep.expectedRevenue).toBe(18 * 3936 + 26 * 2917);
    expect(machaneOct.expectedRevenue).toBe(10 * 3936 + 20 * 2917);
  });

  test('calculates costs per daycare/month and multiplies by monthly work days', () => {
    const model = finalModel();
    const machaneSep = model.byDaycareMonth.find((row) => row.daycare === 'מחנה' && row.month === '09/2026');
    const machaneOct = model.byDaycareMonth.find((row) => row.daycare === 'מחנה' && row.month === '10/2026');

    expect(machaneSep.calculatedCosts.find((cost) => cost.category === 'אוכל')).toEqual(expect.objectContaining({ daycare: 'מחנה', month: '09/2026', quantity: 44, additionalQuantity: 22, total: 44 * 22 * 8 }));
    expect(machaneOct.calculatedCosts.find((cost) => cost.category === 'אוכל')).toEqual(expect.objectContaining({ daycare: 'מחנה', month: '10/2026', quantity: 30, additionalQuantity: 20, total: 30 * 20 * 8 }));
  });

  test('applies daycare exception rule and does not double count the general rule', () => {
    const model = finalModel();
    const ashkelonSep = model.byDaycareMonth.find((row) => row.daycare === 'אשקלון' && row.month === '09/2026');
    const foodCosts = ashkelonSep.calculatedCosts.filter((cost) => cost.category === 'אוכל');

    expect(foodCosts).toHaveLength(1);
    expect(foodCosts[0]).toEqual(expect.objectContaining({ sourceDaycare: 'אשקלון', quantity: 50, additionalQuantity: 22, total: 50 * 22 * 13 }));
  });

  test('keeps fixed staff separate from classroom staffing but includes fixed staff hours', () => {
    const model = finalModel();
    const machaneSep = model.byDaycareMonth.find((row) => row.daycare === 'מחנה' && row.month === '09/2026');

    expect(machaneSep.requiredStaff).toBe(7.5);
    expect(machaneSep.fixedStaffPositions).toBe(1);
    expect(machaneSep.fixedStaffHours).toBe(182);
    expect(machaneSep.totalRequiredHours).toBe(1365 + 182);
  });

  test('calculates Hebrew classroom and staff quantity cost bases', () => {
    const rows = [
      ['TABLE: OCCUPANCY'],
      ['מעון', 'חודש', 'כיתה 1', 'כמות ילדים', 'כיתה 2', 'כמות ילדים 2'],
      ['מחנה', '09/2026', 'תינוק', '10', 'פעוט', '16'],
      ['TABLE: STAFFING'],
      ['כיתה', 'כמות צוות לילד', 'שכר לימוד'],
      ['תינוק', '5', '3936'],
      ['פעוט', '8', '2917'],
      ['TABLE: MONTH_HOURS'],
      ['חודש', 'שעות תקן', 'ימי עבודה'],
      ['09/2026', '182', '22'],
      ['TABLE: FIXED_STAFF'],
      ['מעון', 'חודש', 'תפקיד 1', 'כמות 1', 'עלות 1'],
      ['מחנה', '09/2026', 'מנהלת', '1', '11000'],
      ['TABLE: COST_RULES'],
      ['סעיף תקציבי', 'בסיס לחישוב', 'ערך', 'חלוקה'],
      ['חשמל', 'כמות כיתות', '9000', '12'],
      ['גיבוש לצוות', 'כמות צוות', '2880', '12'],
    ];

    const model = engine.calculateBudgetModel(engine.parseBudgetTables(rows));
    const machaneSep = model.byDaycareMonth.find((row) => row.daycare === 'מחנה' && row.month === '09/2026');
    const electricity = machaneSep.calculatedCosts.find((cost) => cost.category === 'חשמל');
    const staffEvent = machaneSep.calculatedCosts.find((cost) => cost.category === 'גיבוש לצוות');

    expect(electricity).toEqual(expect.objectContaining({ quantity: 2, total: 2 * 9000 / 12 }));
    expect(staffEvent).toEqual(expect.objectContaining({ quantity: 4 + 1, total: (4 + 1) * 2880 / 12 }));
  });

  test('calculates fixed staff role budgets from FIXED_STAFF quantity times cost', () => {
    const rows = [
      ['TABLE: OCCUPANCY'],
      ['מעון', 'חודש', 'כיתה 1', 'כמות ילדים'],
      ['אשקלון', '09/2026', 'תינוק', '10'],
      ['TABLE: STAFFING'],
      ['כיתה', 'כמות צוות לילד', 'שכר לימוד'],
      ['תינוק', '5', '3936'],
      ['TABLE: MONTH_HOURS'],
      ['חודש', 'שעות תקן', 'ימי עבודה'],
      ['09/2026', '205', '26'],
      ['TABLE: FIXED_STAFF'],
      ['חודש', 'מעון', 'תפקיד 1', 'כמות 1', 'עלות 1', 'תפקיד 2', 'כמות 2', 'עלות 2', 'תפקיד 3', 'כמות 3', 'עלות 3'],
      ['09/2026', 'אשקלון', 'מנהלת', '1', '12000', 'מטבח', '2', '150', 'מדריכה', '1', '900'],
      ['TABLE: COST_RULES'],
      ['סעיף תקציבי', 'בסיס לחישוב', 'ערך'],
      ['מנהלת', '', ''],
      ['מטבח', '', ''],
      ['מדריכה', '', ''],
    ];

    const model = engine.calculateBudgetModel(engine.parseBudgetTables(rows));
    const ashkelonSep = model.byDaycareMonth.find((row) => row.daycare === 'אשקלון' && row.month === '09/2026');

    expect(ashkelonSep.calculatedCosts.find((cost) => cost.category === 'מנהלת')).toEqual(expect.objectContaining({ basis: 'fixed', quantity: 1, amount: 12000, total: 12000 }));
    expect(ashkelonSep.calculatedCosts.find((cost) => cost.category === 'מטבח')).toEqual(expect.objectContaining({ basis: 'fixed', quantity: 2, amount: 150, total: 300 }));
    expect(ashkelonSep.calculatedCosts.find((cost) => cost.category === 'מדריכה')).toEqual(expect.objectContaining({ basis: 'fixed', quantity: 1, amount: 900, total: 900 }));
  });

  test('partial COST_RULES does not fail and calculates only existing categories', () => {
    const rows = finalBusinessRows().filter((row) => row[0] !== 'חשמל');
    const model = engine.calculateBudgetModel(engine.parseBudgetTables(rows));
    const categories = [...new Set(model.costs.map((cost) => cost.category))];

    expect(categories).toEqual(['אוכל']);
    expect(model.byDaycareMonth.length).toBe(3);
  });


  test('calculates real-world required employee headcount separately from regulatory staff', () => {
    const rows = [
      ['TABLE: OCCUPANCY'],
      ['מעון', 'חודש', 'כיתה 1', 'כמות ילדים', 'כיתה 2', 'כמות ילדים 2', 'כיתה 3', 'כמות ילדים 3', 'כיתה 4', 'כמות ילדים 4'],
      ['מחנה', '09/2026', 'תינוק', '18', 'תינוק', '18', 'פעוט', '26', 'בוגר', '32'],
      ['TABLE: STAFFING'],
      ['כיתה', 'כמות צוות לילד', 'שכר לימוד'],
      ['תינוק', '5', '3936'],
      ['פעוט', '8', '2917'],
      ['בוגר', '10', '2587'],
      ['TABLE: MONTH_HOURS'],
      ['חודש', 'שעות תקן', 'ימי עבודה'],
      ['09/2026', '205', '26'],
      ['TABLE: FIXED_STAFF'],
      ['חודש', 'מעון', 'תפקיד 1', 'כמות 1'],
      ['09/2026', 'מחנה', 'מנהלת', '1'],
      ['TABLE: COST_RULES'],
      ['סעיף תקציבי', 'בסיס לחישוב', 'ערך'],
      ['שכר מטפלות', 'שעתי', '60'],
    ];

    const model = engine.calculateBudgetModel(engine.parseBudgetTables(rows));
    const machaneSep = model.byDaycareMonth[0];
    const payroll = machaneSep.calculatedCosts.find((cost) => cost.category === 'שכר מטפלות');

    expect(machaneSep.requiredStaff).toBe(15);
    expect(machaneSep.requiredHours).toBe(3075);
    expect(businessRules.DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS).toBe(160);
    expect(engine.DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS).toBe(businessRules.DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS);
    expect(machaneSep.averageEmployeeMonthlyHours).toBe(businessRules.DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS);
    expect(machaneSep.requiredEmployeeHeadcount).toBe(19.5);
    expect(payroll).toEqual(expect.objectContaining({ quantity: 3075, total: 184500 }));
  });

  test('supports configurable average employee monthly hours for headcount planning', () => {
    const model = finalModel();
    const custom = engine.calculateBudgetModel(engine.parseBudgetTables(finalBusinessRows()), { averageEmployeeMonthlyHours: 150 });
    const defaultMachane = model.byDaycareMonth.find((row) => row.daycare === 'מחנה' && row.month === '09/2026');
    const customMachane = custom.byDaycareMonth.find((row) => row.daycare === 'מחנה' && row.month === '09/2026');

    expect(customMachane.requiredStaff).toBe(defaultMachane.requiredStaff);
    expect(customMachane.requiredHours).toBe(defaultMachane.requiredHours);
    expect(customMachane.averageEmployeeMonthlyHours).toBe(150);
    expect(customMachane.requiredEmployeeHeadcount).toBe(Math.ceil((customMachane.requiredHours / 150) * 2) / 2);
  });

  test('supports budget coverage percentage with unmapped actual expense categories', () => {
    const rows = [
      ...finalBusinessRows(),
      ['TABLE: BANK_TRANSACTIONS'],
      ['סכום', 'הגדרה', 'עבור מחלקה', 'עבור חודש', 'פירוט'],
      ['-820', 'אוכל', 'מחנה', '09/2026', 'קניות'],
      ['-180', 'ניקיון', 'מחנה', '09/2026', 'חשבון'],
    ];

    const model = engine.calculateBudgetModel(engine.parseBudgetTables(rows));

    expect(model.budgetCoverage.actualExpenseTotal).toBe(1000);
    expect(model.budgetCoverage.budgetedActualExpenseTotal).toBe(820);
    expect(model.budgetCoverage.coveragePercentage).toBe(82);
    expect(model.budgetCoverage.unmappedExpenseCategories).toEqual(['ניקיון']);
    expect(model.budgetCoverage.label).toBe('Unmapped expense categories');
  });

  test('preserves duplicate numbered classroom headers from the live BUDGET sheet', () => {
    const rows = [
      ['TABLE: OCCUPANCY'],
      ['מעון', 'חודש', 'כיתה 6', 'כמות ילדים 6', 'כיתה 6', 'כמות ילדים 6 ', 'כיתה 7', 'כמות ילדים 7', 'כיתה 7', 'כמות ילדים 7 '],
      ['נאות', '09/2026', 'תינוק', '6', 'פעוט', '20', 'פעוט', '6', 'בוגר', '25'],
      ['TABLE: STAFFING'],
      ['כיתה', 'כמות צוות לילד', 'שכר לימוד'],
      ['תינוק', '5', '3936'],
      ['פעוט', '8', '2917'],
      ['בוגר', '10', '2587'],
      ['TABLE: MONTH_HOURS'],
      ['חודש', 'שעות תקן', 'ימי עבודה'],
      ['09/2026', '205', '26'],
      ['TABLE: FIXED_STAFF'],
      ['חודש', 'מעון', 'תפקיד 1', 'כמות 1'],
      ['09/2026', 'נאות', 'מנהלת', '1'],
      ['TABLE: COST_RULES'],
      ['סעיף תקציבי', 'בסיס לחישוב', 'ערך'],
      ['חשמל', 'כיתות', '9000'],
    ];

    const model = engine.calculateBudgetModel(engine.parseBudgetTables(rows));

    expect(model.byDaycareMonth[0]).toEqual(expect.objectContaining({ daycare: 'נאות', children: 57, classroomCount: 4 }));
  });

});
