import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const engine = require('../api/budget-engine.js');

const budgetRows = [
  ['TABLE: OCCUPANCY'],
  ['מעון', 'חודש', 'כיתה', 'שכבת גיל', 'ילדים'],
  ['אשקלון', '2026-09', 'כיתה א', 'תינוק', '18'],
  ['אשקלון', '2026-09', 'כיתה ב', 'תינוק', '18'],
  ['אשקלון', '2026-09', 'כיתה ג', 'פעוט', '16'],
  ['אשקלון', '2026-09', 'כיתה ג', 'תינוק', '10'],
  ['נתיבות', '2026-09', 'כיתה א', 'בוגר', '30'],
  ['TABLE: STAFFING'],
  ['שכבת גיל', 'תקינה'],
  ['תינוק', '1/5'],
  ['פעוט', '1/8'],
  ['בוגר', '1/10'],
  ['TABLE: MONTH_HOURS'],
  ['חודש', 'שעות חודשיות', 'ימי עבודה'],
  ['2026-09', '182', '22'],
  ['TABLE: FIXED_STAFF'],
  ['מעון', 'חודש', 'תפקיד', 'תקנים'],
  ['אשקלון', '2026-09', 'מנהלת', '1'],
  ['TABLE: COST_RULES'],
  ['סעיף', 'מעון', 'בסיס חישוב', 'עלות', 'מחלק'],
  ['מזון אשקלון', 'אשקלון', 'children', '12', '1'],
  ['ציוד כיתות', '', 'classrooms', '100', '1'],
  ['עלות צוות', '', 'staff', '9000', '1'],
  ['ימי פעילות', '', 'work days', '30', '1'],
  ['שעות הדרכה', '', 'hourly', '50', '1'],
  ['קבוע חודשי', '', 'fixed/monthly', '1000', '1'],
];

function parsedTables() {
  return engine.parseBudgetTables(budgetRows);
}

test.describe('budget calculation engine', () => {
  test('reads all BUDGET tables by TABLE markers', () => {
    const tables = parsedTables();
    expect(Object.keys(tables).sort()).toEqual(['COST_RULES', 'FIXED_STAFF', 'MONTH_HOURS', 'OCCUPANCY', 'STAFFING']);
    expect(tables.OCCUPANCY).toHaveLength(5);
    expect(tables.COST_RULES).toHaveLength(6);
  });

  test('calculates staffing per classroom before daycare aggregation', () => {
    const tables = parsedTables();
    const classrooms = engine.calculateClassroomStaffing(tables.OCCUPANCY, tables.STAFFING);
    const infantA = classrooms.find((room) => room.classroom === 'כיתה א');
    const infantB = classrooms.find((room) => room.classroom === 'כיתה ב');
    const daycare = engine.aggregateStaffingByDaycare(classrooms).find((row) => row.daycare === 'אשקלון');

    expect(infantA.requiredStaff).toBe(4);
    expect(infantB.requiredStaff).toBe(4);
    expect(daycare.requiredStaff).toBe(12);
  });

  test('calculates mixed classroom staffing by age group then sums rounded staff', () => {
    const tables = parsedTables();
    const classrooms = engine.calculateClassroomStaffing(tables.OCCUPANCY, tables.STAFFING);
    const mixed = classrooms.find((room) => room.classroom === 'כיתה ג');

    expect(mixed.ageGroups).toHaveLength(2);
    expect(mixed.ageGroups.find((row) => row.ageGroup === 'פעוט').roundedStaff).toBe(2);
    expect(mixed.ageGroups.find((row) => row.ageGroup === 'תינוק').roundedStaff).toBe(2);
    expect(mixed.requiredStaff).toBe(4);
  });

  test('calculates monthly required hours from classroom staff positions', () => {
    const tables = parsedTables();
    const classrooms = engine.calculateClassroomStaffing(tables.OCCUPANCY, tables.STAFFING);
    const hours = engine.calculateMonthlyRequiredHours(classrooms, tables.MONTH_HOURS);
    const ashkelon = hours.find((row) => row.daycare === 'אשקלון');

    expect(ashkelon.requiredStaff).toBe(12);
    expect(ashkelon.standardHours).toBe(182);
    expect(ashkelon.requiredHours).toBe(2184);
  });

  test('parses fixed staff separately and calculates monthly hours', () => {
    const tables = parsedTables();
    const fixed = engine.fixedStaffWithHours(tables.FIXED_STAFF, tables.MONTH_HOURS);

    expect(fixed).toEqual([
      expect.objectContaining({ daycare: 'אשקלון', month: '2026-09', role: 'מנהלת', positions: 1, standardHours: 182, requiredHours: 182 }),
    ]);
  });

  test('calculates cost rules by basis and divisor', () => {
    const tables = parsedTables();
    const model = engine.calculateBudgetModel(tables);
    const byCategory = Object.fromEntries(model.costs.map((cost) => [cost.category, cost]));

    expect(byCategory['ציוד כיתות'].quantity).toBe(4);
    expect(byCategory['ציוד כיתות'].total).toBe(400);
    expect(byCategory['עלות צוות'].quantity).toBe(16);
    expect(byCategory['עלות צוות'].total).toBe(144000);
    expect(byCategory['ימי פעילות'].quantity).toBe(22);
    expect(byCategory['ימי פעילות'].total).toBe(660);
    expect(byCategory['קבוע חודשי'].quantity).toBe(1);
    expect(byCategory['קבוע חודשי'].total).toBe(1000);
  });

  test('applies daycare exception rule, for example Ashkelon food cost', () => {
    const tables = parsedTables();
    const model = engine.calculateBudgetModel(tables);
    const food = model.costs.find((cost) => cost.category === 'מזון אשקלון');

    expect(food.daycare).toBe('אשקלון');
    expect(food.quantity).toBe(62);
    expect(food.total).toBe(744);
  });
});


test.describe('budget calculation engine Hebrew sheet columns', () => {
  test('maps Hebrew BUDGET columns into the existing calculation model', () => {
    const rows = [
      ['TABLE: OCCUPANCY'],
      ['מעון', 'חודש', 'שם כיתה', 'כיתה מעורבת', 'כיתה 1', 'כמות ילדים', 'כיתה 2', 'כמות ילדים 2'],
      ['אשקלון', '09/2026', 'חדר א', 'כן', 'פעוט', '16', 'תינוק', '10'],
      ['TABLE: STAFFING'],
      ['כיתה', 'כמות צוות לילד', 'שכר לימוד', 'מינימום צוות'],
      ['תינוק', '5', '3936', '1'],
      ['פעוט', '8', '2917', '1'],
      ['בוגר', '10', '2587', '1'],
      ['TABLE: MONTH_HOURS'],
      ['חודש', 'שעות תקן'],
      ['09/2026', '182'],
      ['TABLE: FIXED_STAFF'],
      ['מעון', 'חודש', 'תפקיד 1', 'כמות 1', 'עלות 1'],
      ['אשקלון', '09/2026', 'מנהלת', '1', '12000'],
      ['TABLE: COST_RULES'],
      ['סעיף תקציבי', 'מעון', 'בסיס לחישוב', 'ערך', 'תקופה'],
      ['מזון', 'אשקלון', 'ילדים', '12', 'חודשי'],
    ];

    const model = engine.calculateBudgetModel(engine.parseBudgetTables(rows));

    expect(model.classroomStaffing).toHaveLength(1);
    expect(model.classroomStaffing[0]).toEqual(expect.objectContaining({ daycare: 'אשקלון', classroom: 'חדר א', children: 26, requiredStaff: 4 }));
    expect(model.daycareStaffing[0]).toEqual(expect.objectContaining({ daycare: 'אשקלון', children: 26, requiredStaff: 4 }));
    expect(model.monthlyRequiredHours[0]).toEqual(expect.objectContaining({ standardHours: 182, requiredHours: 728 }));
    expect(model.fixedStaff[0]).toEqual(expect.objectContaining({ role: 'מנהלת', positions: 1, amount: 12000 }));
    expect(model.costs[0]).toEqual(expect.objectContaining({ category: 'מזון', quantity: 26, total: 312 }));
  });
});


test.describe('budget classroom grouping and extra cost basis', () => {
  test('treats wide occupancy age groups as separate classrooms unless mixed is explicit', () => {
    const rows = [
      ['TABLE: OCCUPANCY'],
      ['מעון', 'חודש', 'כיתה 1', 'כמות ילדים', 'כיתה 2', 'כמות ילדים 2', 'כיתה 3', 'כמות ילדים 3', 'כיתה 4', 'כמות ילדים 4'],
      ['אשקלון', '09/2026', 'תינוק', '18', 'תינוק', '18', 'פעוט', '26', 'בוגר', '32'],
      ['TABLE: STAFFING'],
      ['כיתה', 'כמות צוות לילד'],
      ['תינוק', '5'],
      ['פעוט', '8'],
      ['בוגר', '10'],
      ['TABLE: MONTH_HOURS'],
      ['חודש', 'שעות תקן', 'ימי עבודה'],
      ['09/2026', '182', '22'],
      ['TABLE: FIXED_STAFF'],
      ['מעון', 'חודש', 'תפקיד 1', 'כמות 1'],
      ['אשקלון', '09/2026', 'מנהלת', '1'],
      ['TABLE: COST_RULES'],
      ['סעיף תקציבי', 'בסיס לחישוב', 'ערך'],
      ['ציוד כיתות', 'כיתות', '100'],
    ];

    const model = engine.calculateBudgetModel(engine.parseBudgetTables(rows));

    expect(model.classroomStaffing).toHaveLength(4);
    expect(model.daycareStaffing[0]).toEqual(expect.objectContaining({ classroomCount: 4, children: 94, requiredStaff: 15 }));
    expect(model.classroomStaffing.map((room) => room.ageGroups)).toEqual([
      [expect.objectContaining({ ageGroup: 'תינוק', children: 18, roundedStaff: 4 })],
      [expect.objectContaining({ ageGroup: 'תינוק', children: 18, roundedStaff: 4 })],
      [expect.objectContaining({ ageGroup: 'פעוט', children: 26, roundedStaff: 3.5 })],
      [expect.objectContaining({ ageGroup: 'בוגר', children: 32, roundedStaff: 3.5 })],
    ]);
  });

  test('multiplies COST_RULES by additional work days basis', () => {
    const rows = [
      ['TABLE: OCCUPANCY'],
      ['מעון', 'חודש', 'כיתה 1', 'כמות ילדים'],
      ['אשקלון', '09/2026', 'תינוק', '10'],
      ['TABLE: STAFFING'],
      ['כיתה', 'כמות צוות לילד'],
      ['תינוק', '5'],
      ['TABLE: MONTH_HOURS'],
      ['חודש', 'שעות תקן', 'ימי עבודה'],
      ['09/2026', '182', '22'],
      ['TABLE: FIXED_STAFF'],
      ['מעון', 'חודש', 'תפקיד 1', 'כמות 1'],
      ['אשקלון', '09/2026', 'מנהלת', '1'],
      ['TABLE: COST_RULES'],
      ['סעיף תקציבי', 'מעון', 'בסיס לחישוב', 'בסיס נוסף', 'ערך'],
      ['מזון', 'אשקלון', 'ילדים', 'ימי עבודה', '12'],
    ];

    const model = engine.calculateBudgetModel(engine.parseBudgetTables(rows));
    const food = model.costs.find((cost) => cost.category === 'מזון');

    expect(food.quantity).toBe(10);
    expect(food.additionalQuantity).toBe(22);
    expect(food.total).toBe(2640);
  });
});


test.describe('budget partial coverage model', () => {
  test('supports incomplete COST_RULES and surfaces unmapped actual expense categories', () => {
    const rows = [
      ['TABLE: OCCUPANCY'],
      ['מעון', 'חודש', 'כיתה 1', 'כמות ילדים'],
      ['אשקלון', '09/2026', 'תינוק', '10'],
      ['TABLE: STAFFING'],
      ['כיתה', 'כמות צוות לילד'],
      ['תינוק', '5'],
      ['TABLE: MONTH_HOURS'],
      ['חודש', 'שעות תקן', 'ימי עבודה'],
      ['09/2026', '182', '22'],
      ['TABLE: FIXED_STAFF'],
      ['מעון', 'חודש', 'תפקיד 1', 'כמות 1'],
      ['אשקלון', '09/2026', 'מנהלת', '1'],
      ['TABLE: COST_RULES'],
      ['סעיף תקציבי', 'מעון', 'בסיס לחישוב', 'ערך'],
      ['מזון', 'אשקלון', 'ילדים', '12'],
      ['ציוד', 'אשקלון', 'כיתות', '100'],
      ['TABLE: BANK_TRANSACTIONS'],
      ['סכום', 'הגדרה', 'עבור מחלקה', 'עבור חודש', 'פירוט'],
      ['-820', 'מזון', 'אשקלון', '09/2026', 'קניות'],
      ['-180', 'חשמל', 'אשקלון', '09/2026', 'חשבון'],
    ];

    const model = engine.calculateBudgetModel(engine.parseBudgetTables(rows));

    expect(model.costs).toHaveLength(2);
    expect(model.budgetCoverage.actualExpenseTotal).toBe(1000);
    expect(model.budgetCoverage.budgetedActualExpenseTotal).toBe(820);
    expect(model.budgetCoverage.coveragePercentage).toBe(82);
    expect(model.budgetCoverage.budgetedCategories).toEqual([expect.objectContaining({ category: 'מזון', total: 820 })]);
    expect(model.budgetCoverage.actualExpensesWithoutBudget).toEqual([expect.objectContaining({ category: 'חשמל', total: 180 })]);
    expect(model.budgetCoverage.unmappedExpenseCategories).toEqual(['חשמל']);
    expect(model.budgetCoverage.budgetCategoriesWithoutActual).toEqual(['ציוד']);
  });

  test('keeps budget coverage empty when no actual expenses are loaded', () => {
    const model = engine.calculateBudgetModel(parsedTables());

    expect(model.budgetCoverage.actualExpenseTotal).toBe(0);
    expect(model.budgetCoverage.coveragePercentage).toBe(0);
    expect(model.budgetCoverage.actualExpensesWithoutBudget).toEqual([]);
  });
});
