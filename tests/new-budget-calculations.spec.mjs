import { test, expect } from '@playwright/test';
import { calculateBudgetModel, roundRequiredStaff, summarizeBudget } from '../chamah-manager-portal/new/budget-calculations.js';

const baseData = {
  months: [{ school_year_month_id: 'm9', school_year_id: 'sy', start_date: '2026-09-01', school_year_sequence: 1 }],
  daycares: [{ daycare_id: 'dc', allocation_unit_id: 'unit', display_name: 'מעון', lifecycle_status: 'ACTIVE' }],
  dsy: [{ daycare_school_year_id: 'dsy', daycare_id: 'dc', school_year_id: 'sy', is_operating: true, staffing_standard_type: 'EXTENDED', tuition_standard_type: 'EXTENDED' }],
  classrooms: [{ classroom_id: 'room', daycare_school_year_id: 'dsy', display_name: 'כיתה', lifecycle_status: 'ACTIVE', effective_from: '2026-09-01' }],
  enrollment: [{ classroom_id: 'room', reporting_month: '2026-09-01', age_group_id: 'age', children_count: 21 }],
  ageGroups: [{ age_group_id: 'age', display_name: 'פעוטות' }],
  budgetCategories: [
    { budget_category_id: 'staff', budget_category_code: 'CAT-PAYROLL-STAFF', category_type: 'EXPENSE' },
    { budget_category_id: 'fixed', budget_category_code: 'CAT-PAYROLL-NONSTAFF', category_type: 'EXPENSE' },
    { budget_category_id: 'tuition', budget_category_code: 'CAT-TUITION', category_type: 'INCOME' },
    { budget_category_id: 'food', budget_category_code: 'CAT-FOOD', category_type: 'EXPENSE', display_name: 'אוכל' }
  ],
  budgetRules: [
    { budget_category_id: 'staff', school_year_id: 'sy', age_group_id: 'age', standard_type: 'EXTENDED', parameter_1: 8, lifecycle_status: 'ACTIVE', effective_from: '2026-09-01' },
    { budget_category_id: 'fixed', school_year_id: 'sy', daycare_id: 'dc', parameter_1: 'MANAGER', parameter_2: 1, numeric_value: 10000, lifecycle_status: 'ACTIVE', effective_from: '2026-09-01' },
    { budget_category_id: 'tuition', school_year_id: 'sy', age_group_id: 'age', standard_type: 'EXTENDED', numeric_value: 2700, lifecycle_status: 'ACTIVE', effective_from: '2026-09-01' },
    { budget_category_id: 'food', school_year_id: 'sy', calculation_method: 'PER_CHILD_WORKDAY', parameter_1: 8, display_scope: 'ALL_DAYCARES', show_budget: true, lifecycle_status: 'ACTIVE', effective_from: '2026-09-01' }
  ],
  workCalendars: [{ school_year_month_id: 'm9', sun_thu_hours_per_day: 8.5, friday_hours_per_day: 4.5, sun_thu_workdays: 22, friday_workdays: 4 }],
  staffingParameters: [{ school_year_id: 'sy', monthly_hours_per_fte: 160, hourly_budget_cost: 60, effective_from_month_id: 'm9', effective_to_month_id: 'm9', lifecycle_status: 'ACTIVE' }]
};

test.describe('new portal approved budget calculations', () => {
  test('applies BR-0015 half-position rounding', () => {
    expect(roundRequiredStaff(2.01)).toBe(2.5);
    expect(roundRequiredStaff(2.51)).toBe(3);
  });

  test('calculates required hours and payroll from imported hourly cost instead of 160', () => {
    const model = calculateBudgetModel(baseData, { schoolYearId: 'sy', months: new Set(['2026-09']), unitIds: ['unit'] });
    const summary = summarizeBudget(model);
    expect(summary.requiredHours).toBe(615);
    expect(summary.caregiverBudget).toBe(36900);
    expect(summary.fixedBudget).toBe(10000);
    expect(summary.payrollBudget).toBe(46900);
    expect(summary.tuitionBudget).toBe(56700);
    expect(summary.expenseBudget).toBe(4368);
    expect(model.issues).toEqual([]);
  });

  test('reports the exact missing imported configuration', () => {
    const model = calculateBudgetModel({ ...baseData, staffingParameters: [] }, { schoolYearId: 'sy', months: new Set(['2026-09']), unitIds: ['unit'] });
    expect(model.issues).toContainEqual(expect.objectContaining({ code: 'MISSING_HOURLY_BUDGET_COST' }));
    expect(summarizeBudget(model).payrollBudget).toBeNull();
  });
});
