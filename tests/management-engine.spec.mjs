import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';

const require = createRequire(import.meta.url);
const { buildManagementIntelligence } = require('../api/management-engine');

const budget = {
  byDaycareMonth: [
    {
      daycare: 'אשקלון',
      month: '1',
      children: 20,
      requiredHours: 320,
      totalRequiredHours: 400,
      requiredEmployeeHeadcount: 2,
      expectedRevenue: 50000,
      totalBudgetCosts: 18000,
    },
    {
      daycare: 'נאות',
      month: '1',
      children: 12,
      requiredHours: 160,
      requiredEmployeeHeadcount: 1,
      expectedRevenue: 30000,
      totalBudgetCosts: 9000,
      capacity: 15,
    },
  ],
  classroomStaffing: [
    {
      daycare: 'אשקלון',
      month: '1',
      classroom: 'כיתה א',
      children: 20,
      requiredStaff: 2,
      expectedRevenue: 50000,
      ageGroups: [
        { ageGroup: 'תינוקות', children: 8, roundedStaff: 1, expectedRevenue: 24000 },
        { ageGroup: 'פעוטות', children: 12, roundedStaff: 1, expectedRevenue: 26000 },
      ],
    },
    {
      daycare: 'נאות',
      month: '1',
      classroom: 'כיתה ב',
      children: 12,
      requiredStaff: 1,
      expectedRevenue: 30000,
      ageGroups: [
        { ageGroup: 'פעוטות', children: 12, roundedStaff: 1, expectedRevenue: 30000 },
      ],
    },
  ],
};

const payroll = {
  rows: [
    { daycare: 'אשקלון', month: '1', employee: 'עובדת א', totalPayrollHours: 120, totalPayrollCost: 10000 },
    { daycare: 'אשקלון', month: '1', employee: 'עובדת ב', totalPayrollHours: 140, totalPayrollCost: 12000 },
    { daycare: 'נאות', month: '1', employee: 'עובדת ג', totalPayrollHours: 160, totalPayrollCost: 11000 },
  ],
  byDaycareMonth: [
    {
      daycare: 'אשקלון',
      month: '1',
      employeeCount: 2,
      totalPayrollHours: 260,
      totalPayrollCost: 22000,
      byClass: [
        { classroom: 'כיתה א', employeeCount: 2, totalPayrollHours: 260, totalPayrollCost: 22000 },
      ],
    },
    {
      daycare: 'נאות',
      month: '1',
      employeeCount: 1,
      totalPayrollHours: 160,
      totalPayrollCost: 11000,
      byClass: [
        { classroom: 'כיתה ב', employeeCount: 1, totalPayrollHours: 160, totalPayrollCost: 11000 },
      ],
    },
  ],
};

const allocations = {
  rows: [
    { unit: 'אשקלון', businessMonth: '1', reference: '100', debit: 3000, credit: 0, netCash: -3000, accountingCategory: 'אוכל', notes: 'Food expenses free text' },
    { unit: 'אשקלון', businessMonth: '1', reference: '100', debit: 2000, credit: 0, netCash: -2000, accountingCategory: 'תחזוקה', notes: 'Maintenance free text' },
    { unit: 'נאות', businessMonth: '1', reference: '200', debit: 0, credit: 10000, netCash: 10000, accountingCategory: 'הכנסה', notes: 'Income free text' },
    { unit: 'אשקלון', businessMonth: '1', reference: '999', debit: 9000, credit: 0, netCash: -9000, accountingCategory: 'חריג לא לחישוב', notes: 'Excluded free text' },
  ],
  byUnitMonth: [
    { unit: 'אשקלון', businessMonth: '1', rowCount: 2, debit: 5000, credit: 0, netCash: -5000 },
    { unit: 'נאות', businessMonth: '1', rowCount: 1, debit: 0, credit: 10000, netCash: 10000 },
  ],
  unmappedRows: [
    { rowIndex: 8, unit: '', businessMonth: '1', unmappedReason: 'Missing unit' },
    { rowIndex: 9, unit: '', businessMonth: '', debit: 7000, credit: 0, accountingCategory: 'חריג לא לחישוב', notes: 'Excluded free text', unmappedReason: 'Missing unit and businessMonth' },
  ],
  totals: { rowCount: 3, debit: 5000, credit: 10000, netCash: 5000 },
};

const employees = {
  employees: [
    { name: 'עובדת א', status: 'עובדת', department: 'אשקלון' },
    { name: 'עובדת ב', status: 'עובדת', department: 'אשקלון' },
    { name: 'עובדת ג', status: 'עזבה', department: 'נאות' },
  ],
};

test('builds organization-level management intelligence from existing API payloads', () => {
  const result = buildManagementIntelligence({ budget, payroll, allocations, employees });

  expect(result.organization.children).toBe(32);
  expect(result.organization.requiredHours).toBe(480);
  expect(result.organization.payrollHours).toBe(420);
  expect(result.organization.hoursDifference).toBe(-60);
  expect(result.organization.requiredEmployees).toBe(3);
  expect(result.organization.payrollEmployees).toBe(3);
  expect(result.organization.activeEmployees).toBe(2);
  expect(result.organization.allocationExpenses).toBe(5000);
  expect(result.organization.allocationIncome).toBe(10000);
});

test('keeps payroll operational cost separate from actual allocation expenses', () => {
  const result = buildManagementIntelligence({ budget, payroll, allocations, employees });

  expect(result.financial.allocationsActual.expenses).toBe(5000);
  expect(result.financial.payrollOperationalOnly.cost).toBe(33000);
  expect(result.financial.payrollOperationalOnly.note).toContain('not counted as actual expense');
});

test('summarizes daycare, class, age group, and staffing comparisons', () => {
  const result = buildManagementIntelligence({ budget, payroll, allocations, employees });
  const ashkelon = result.comparisons.daycareMonth.find((group) => group.daycare === 'אשקלון');
  const infants = result.byAgeGroup.find((group) => group.ageGroup === 'תינוקות');
  const classA = result.byClass.find((group) => group.classroom === 'כיתה א');

  expect(ashkelon.requiredHours).toBe(320);
  expect(ashkelon.payrollHours).toBe(260);
  expect(ashkelon.hoursDifference).toBe(-60);
  expect(ashkelon.requiredEmployees).toBe(2);
  expect(ashkelon.payrollEmployees).toBe(2);
  expect(infants.children).toBe(8);
  expect(classA.children).toBe(20);
});

test('uses regulatory required hours and staffing-only payroll values for comparisons', () => {
  const result = buildManagementIntelligence({
    budget: {
      byDaycareMonth: [{
        daycare: 'אשקלון',
        month: '09/2026',
        requiredHours: 3075,
        totalRequiredHours: 3280,
        requiredEmployeeHeadcount: 19.5,
      }],
    },
    payroll: {
      byDaycareMonth: [{
        daycare: 'אשקלון',
        month: '09/2026',
        employeeCount: 15,
        staffingEmployeeCount: 14,
        totalPayrollHours: 1080,
        staffingPayrollHours: 1015,
        totalPayrollCost: 108523.63,
      }],
    },
    allocations: {},
    employees: {},
  });

  const ashkelon = result.comparisons.daycareMonth.find((group) => group.daycare === 'אשקלון');
  expect(ashkelon.requiredHours).toBe(3075);
  expect(ashkelon.payrollHours).toBe(1015);
  expect(ashkelon.hoursDifference).toBe(-2060);
  expect(ashkelon.requiredEmployees).toBe(19.5);
  expect(ashkelon.payrollEmployees).toBe(14);
});

test('reports allocation data quality and unmapped allocation issues', () => {
  const result = buildManagementIntelligence({ budget, payroll, allocations, employees });

  expect(result.dataQuality.allocations.totalRows).toBe(4);
  expect(result.dataQuality.allocations.mappedRows).toBe(3);
  expect(result.dataQuality.allocations.unmappedRows).toBe(1);
  expect(result.dataQuality.allocations.excludedRows).toBe(2);
  expect(result.dataQuality.allocations.percentage).toBe(75);
  expect(result.issues.some((issue) => issue.type === 'allocation_unmapped_row')).toBe(true);
});

test('excludes special accounting category from management financial totals without creating issues', () => {
  const result = buildManagementIntelligence({ budget, payroll, allocations, employees });

  expect(result.organization.allocationExpenses).toBe(5000);
  expect(result.financial.allocationsActual.expenses).toBe(5000);
  expect(result.financial.allocationsActual.excludedRows).toEqual([
    { rowIndex: undefined, unit: 'אשקלון', businessMonth: '1', category: 'חריג לא לחישוב' },
    { rowIndex: 9, unit: '', businessMonth: '', category: 'חריג לא לחישוב' },
  ]);
  expect(result.financial.allocationsActual.byCategory.map((item) => item.category)).toEqual([
    'אוכל',
    'תחזוקה',
    'הכנסה',
  ]);
  expect(result.issues.filter((issue) => issue.type === 'allocation_unmapped_row')).toHaveLength(1);
});

test('does not use free text notes as accounting category logic', () => {
  const result = buildManagementIntelligence({
    budget,
    payroll,
    allocations: {
      rows: [
        {
          unit: 'אשקלון',
          businessMonth: '1',
          debit: 9000,
          credit: 0,
          accountingCategory: 'חשמל',
          notes: 'חריג לא לחישוב',
        },
      ],
      unmappedRows: [],
    },
    employees,
  });

  expect(result.organization.allocationExpenses).toBe(9000);
  expect(result.financial.allocationsActual.excludedRows).toEqual([]);
  expect(result.financial.allocationsActual.byCategory).toEqual([
    { category: 'חשמל', debit: 9000, credit: 0, netCash: -9000, rowCount: 1 },
  ]);
});

test('does not invent capacity when budget data does not expose capacity', () => {
  const result = buildManagementIntelligence({
    budget: { byDaycareMonth: [budget.byDaycareMonth[0]], classroomStaffing: [] },
    payroll,
    allocations,
    employees,
  });

  expect(result.organization.capacity).toBeNull();
  expect(result.organization.availableCapacity).toBeNull();
  expect(result.dataAvailability.budget.capacity).toBe(false);
  expect(result.dataAvailability.budget.capacityMissingReason).toContain('No explicit capacity field');
});

test('lists reports that are possible from available data', () => {
  const result = buildManagementIntelligence({ budget, payroll, allocations, employees });

  expect(result.possibleReports).toContain('Required hours vs payroll hours by daycare/month.');
  expect(result.possibleReports).toContain('Required employee headcount vs payroll employee count by daycare/month.');
  expect(result.possibleReports).toContain('Actual allocation income/expense by organizational unit and business month.');
});
