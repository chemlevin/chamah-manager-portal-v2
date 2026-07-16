export const activeDaycareId = '11111111-1111-4111-8111-111111111111';
export const activeOfficeId = '22222222-2222-4222-8222-222222222222';
export const inactiveUnitId = '33333333-3333-4333-8333-333333333333';

export const allocationUnits = [
  { allocation_unit_id: activeDaycareId, display_name: 'יחידה פעילה א', allocation_unit_type: 'DAYCARE', lifecycle_status: 'ACTIVE', display_order: 2, notes: null },
  { allocation_unit_id: activeOfficeId, display_name: 'יחידה פעילה ב', allocation_unit_type: 'OFFICE', lifecycle_status: 'ACTIVE', display_order: 1, notes: null },
  { allocation_unit_id: inactiveUnitId, display_name: 'יחידה לא פעילה', allocation_unit_type: 'DAYCARE', lifecycle_status: 'INACTIVE', display_order: 0, notes: null }
];

const generalResponses = {
  school_years: [{ school_year_id: 'year-1', display_name: 'תשפ״ז', start_date: '2026-09-01', end_date: '2027-08-31', is_default: true, is_selectable: true }],
  school_year_months: [
    { school_year_month_id: 'month-9', school_year_id: 'year-1', month_label: 'ספטמבר 2026', start_date: '2026-09-01', school_year_sequence: 1 },
    { school_year_month_id: 'month-10', school_year_id: 'year-1', month_label: 'אוקטובר 2026', start_date: '2026-10-01', school_year_sequence: 2 },
    { school_year_month_id: 'month-11', school_year_id: 'year-1', month_label: 'נובמבר 2026', start_date: '2026-11-01', school_year_sequence: 3 }
  ],
  daycares: [{ daycare_id: 'daycare-1', daycare_code: 'DC-ONE', allocation_unit_id: activeDaycareId, display_name: 'מעון א', lifecycle_status: 'ACTIVE', display_order: 1 }],
  daycare_school_years: [{ daycare_school_year_id: 'dsy-1', daycare_id: 'daycare-1', school_year_id: 'year-1', is_operating: true, tuition_standard_type: 'EXTENDED', staffing_standard_type: 'EXTENDED' }],
  classrooms: [{ classroom_id: 'class-1', daycare_school_year_id: 'dsy-1', display_name: 'כיתה א', lifecycle_status: 'ACTIVE', effective_from: '2026-09-01', effective_to: null }],
  monthly_enrollment: [
    { monthly_enrollment_id: 'enroll-1', classroom_id: 'class-1', reporting_month: '2026-09-01', age_group_id: 'age-infant', children_count: 18 },
    { monthly_enrollment_id: 'enroll-2', classroom_id: 'class-1', reporting_month: '2026-10-01', age_group_id: 'age-infant', children_count: 20 },
    { monthly_enrollment_id: 'enroll-3', classroom_id: 'class-1', reporting_month: '2026-11-01', age_group_id: 'age-infant', children_count: 21 }
  ],
  payroll_records: [
    { payroll_record_id: 'pay-1', employment_id: 'employment-1', source_employee_identifier: 'EMP-1', payroll_month: '2026-09-01', employer_cost: 80000, regular_hours: 900, overtime_hours: 50 },
    { payroll_record_id: 'pay-2', employment_id: 'employment-1', source_employee_identifier: 'EMP-1', payroll_month: '2026-10-01', employer_cost: 85000, regular_hours: 920, overtime_hours: 60 }
  ],
  payroll_allocations: [
    { payroll_allocation_id: 'pa-1', payroll_record_id: 'pay-1', allocation_unit_id: activeDaycareId, role_id: 'role-caregiver', allocation_amount: 50000, allocated_hours: 600, budget_category_id: 'cat-payroll' },
    { payroll_allocation_id: 'pa-2', payroll_record_id: 'pay-2', allocation_unit_id: activeDaycareId, role_id: 'role-caregiver', allocation_amount: 52000, allocated_hours: 620, budget_category_id: 'cat-payroll' },
    { payroll_allocation_id: 'pa-3', payroll_record_id: 'pay-1', allocation_unit_id: activeOfficeId, role_id: 'role-manager', allocation_amount: 30000, allocated_hours: 350, budget_category_id: 'cat-fixed' }
  ],
  bank_transactions: [
    { bank_transaction_id: 'bank-1', bank_account_id: 'account-1', transaction_date: '2026-09-03', description: 'הכנסה', reference_number: '100', amount: 120000, debit_amount: 0, credit_amount: 120000 },
    { bank_transaction_id: 'bank-2', bank_account_id: 'account-1', transaction_date: '2026-09-05', description: 'הוצאה', reference_number: '200', amount: -30000, debit_amount: 30000, credit_amount: 0 }
  ],
  bank_allocations: [
    { bank_allocation_id: 'ba-1', bank_transaction_id: 'bank-1', allocation_unit_id: activeDaycareId, budget_month: '2026-09-01', allocation_amount: 90000, budget_category_id: 'cat-income', accounting_status: 'NO_SUPPORTING_DOCUMENT_REQUIRED' },
    { bank_allocation_id: 'ba-2', bank_transaction_id: 'bank-1', allocation_unit_id: activeOfficeId, budget_month: '2026-09-01', allocation_amount: 30000, budget_category_id: 'cat-income', accounting_status: 'PENDING_SUBMISSION' },
    { bank_allocation_id: 'ba-3', bank_transaction_id: 'bank-2', allocation_unit_id: activeDaycareId, budget_month: '2026-09-01', allocation_amount: -30000, budget_category_id: 'cat-expense', accounting_status: 'MISSING_DOCUMENTS' }
  ],
  budget_categories: [
    { budget_category_id: 'cat-income', budget_category_code: 'CAT-TUITION', display_name: 'שכר לימוד', category_type: 'INCOME', lifecycle_status: 'ACTIVE' },
    { budget_category_id: 'cat-expense', budget_category_code: 'CAT-FOOD', display_name: 'אוכל', category_type: 'EXPENSE', lifecycle_status: 'ACTIVE' },
    { budget_category_id: 'cat-payroll', budget_category_code: 'CAT-PAYROLL-STAFF', display_name: 'שכר צוות', category_type: 'EXPENSE', lifecycle_status: 'ACTIVE' },
    { budget_category_id: 'cat-fixed', budget_category_code: 'CAT-PAYROLL-NONSTAFF', display_name: 'שכר קבוע', category_type: 'EXPENSE', lifecycle_status: 'ACTIVE' }
  ],
  bank_accounts: [{ bank_account_id: 'account-1', display_name: 'חשבון תפעולי', bank_account_code: 'BANK-1', lifecycle_status: 'ACTIVE' }],
  age_groups: [{ age_group_id: 'age-infant', age_group_code: 'INFANT', display_name: 'תינוקות', lifecycle_status: 'ACTIVE' }],
  roles: [{ role_id: 'role-caregiver', role_code: 'ROLE-CAREGIVER', display_name: 'מטפלת' }, { role_id: 'role-manager', role_code: 'ROLE-MANAGER', display_name: 'מנהלת' }],
  employments: [{ employment_id: 'employment-1', employee_id: 'employee-1', employment_start_date: '2026-01-01', employment_end_date: null, employment_status: 'ACTIVE' }],
  employees: [{ employee_id: 'employee-1', first_name: 'שרה', last_name: 'כהן', lifecycle_status: 'ACTIVE' }],
  employee_assignments: [{ assignment_id: 'assignment-1', employment_id: 'employment-1', allocation_unit_id: activeDaycareId, daycare_id: 'daycare-1', classroom_id: 'class-1', role_id: 'role-caregiver', effective_from: '2026-01-01', effective_to: null, is_primary: true }],
  monthly_work_calendars: [
    { school_year_month_id: 'month-9', sun_thu_hours_per_day: 8.5, friday_hours_per_day: 4.5, sun_thu_workdays: 22, friday_workdays: 4 },
    { school_year_month_id: 'month-10', sun_thu_hours_per_day: 8.5, friday_hours_per_day: 4.5, sun_thu_workdays: 21, friday_workdays: 5 },
    { school_year_month_id: 'month-11', sun_thu_hours_per_day: 8.5, friday_hours_per_day: 4.5, sun_thu_workdays: 22, friday_workdays: 4 }
  ],
  staffing_budget_parameters: [{ school_year_id: 'year-1', monthly_hours_per_fte: 160, hourly_budget_cost: 60, budget_formula: 'MONTHLY_REQUIRED_STAFF_HOURS × HOURLY_BUDGET_COST', effective_from_month_id: 'month-9', effective_to_month_id: 'month-11', lifecycle_status: 'ACTIVE' }],
  budget_rules: [
    { budget_rule_id: 'staff-rule', budget_category_id: 'cat-payroll', school_year_id: 'year-1', age_group_id: 'age-infant', effective_from: '2026-09-01', effective_to: '2027-08-31', lifecycle_status: 'ACTIVE', standard_type: 'EXTENDED', parameter_1: 5, rounding_method: 'CEIL_PER_AGE_GROUP' },
    { budget_rule_id: 'tuition-rule', budget_category_id: 'cat-income', school_year_id: 'year-1', age_group_id: 'age-infant', effective_from: '2026-09-01', effective_to: '2027-08-31', lifecycle_status: 'ACTIVE', standard_type: 'EXTENDED', numeric_value: 3487 },
    { budget_rule_id: 'manager-rule', budget_category_id: 'cat-fixed', school_year_id: 'year-1', daycare_id: 'daycare-1', effective_from: '2026-09-01', effective_to: '2027-08-31', lifecycle_status: 'ACTIVE', parameter_1: 'MANAGER', parameter_2: 1, numeric_value: 10500 },
    { budget_rule_id: 'food-rule', budget_category_id: 'cat-expense', school_year_id: 'year-1', effective_from: '2026-09-01', effective_to: '2027-08-31', lifecycle_status: 'ACTIVE', calculation_method: 'PER_CHILD_WORKDAY', parameter_1: 8, display_scope: 'ALL_DAYCARES', show_budget: true }
  ],
  budget_snapshots: [
    { budget_snapshot_id: 'budget-1', allocation_unit_id: activeDaycareId, daycare_id: null, reporting_month: '2026-09-01', budget_category_id: 'cat-income', planned_amount: 100000, actual_amount: 90000, snapshot_status: 'LOCKED' },
    { budget_snapshot_id: 'budget-2', allocation_unit_id: activeDaycareId, daycare_id: null, reporting_month: '2026-09-01', budget_category_id: 'cat-expense', planned_amount: 40000, actual_amount: 30000, snapshot_status: 'LOCKED' },
    { budget_snapshot_id: 'budget-3', allocation_unit_id: activeDaycareId, daycare_id: null, reporting_month: '2026-09-01', budget_category_id: 'cat-payroll', planned_amount: 60000, actual_amount: 50000, snapshot_status: 'LOCKED' }
  ],
  data_quality_issues: [{ data_quality_issue_id: 'issue-1', severity: 'WARNING', status: 'OPEN', explanation: 'נדרש להשלים מקור', entity_type: 'PAYROLL' }]
};

export async function mockNewPortalSupabase(page, units = allocationUnits) {
  const requestedTables = [];
  await page.route('**/auth/v1/user**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'test-user' }) }));
  await page.route('https://vyyfuaqmbxvfqgbfqooc.supabase.co/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').pop();
    requestedTables.push({ table, search: url.search });
    const body = table === 'allocation_units' && url.searchParams.get('lifecycle_status') === 'eq.ACTIVE'
      ? units
      : table === 'allocation_units'
        ? []
        : (generalResponses[table] || []);
    await route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(body) });
  });
  return requestedTables;
}

export async function openNewPortal(page, route = 'home') {
  await page.addInitScript(() => localStorage.setItem('chamah.portal.session', JSON.stringify({ access_token: 'test-session', refresh_token: 'test-refresh', expires_at: 4102444800 })));
  await page.goto(`/new/#${route}`);
}
