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
    { school_year_id: 'year-1', month_label: 'ספטמבר 2026', start_date: '2026-09-01', school_year_sequence: 1 },
    { school_year_id: 'year-1', month_label: 'אוקטובר 2026', start_date: '2026-10-01', school_year_sequence: 2 }
  ],
  daycares: [{ daycare_id: 'daycare-1', allocation_unit_id: activeDaycareId, display_name: 'מעון א', lifecycle_status: 'ACTIVE', display_order: 1 }],
  daycare_school_years: [{ daycare_school_year_id: 'dsy-1', daycare_id: 'daycare-1', school_year_id: 'year-1', is_operating: true }],
  classrooms: [{ classroom_id: 'class-1', daycare_school_year_id: 'dsy-1', display_name: 'כיתה א' }],
  monthly_enrollment: [
    { monthly_enrollment_id: 'enroll-1', classroom_id: 'class-1', reporting_month: '2026-09-01', children_count: 18 },
    { monthly_enrollment_id: 'enroll-2', classroom_id: 'class-1', reporting_month: '2026-10-01', children_count: 20 }
  ],
  payroll_records: [
    { payroll_record_id: 'pay-1', payroll_month: '2026-09-01', employer_cost: 80000, regular_hours: 900, overtime_hours: 50 },
    { payroll_record_id: 'pay-2', payroll_month: '2026-10-01', employer_cost: 85000, regular_hours: 920, overtime_hours: 60 }
  ],
  payroll_allocations: [
    { payroll_allocation_id: 'pa-1', payroll_record_id: 'pay-1', allocation_unit_id: activeDaycareId, allocation_amount: 50000, allocated_hours: 600, budget_category_id: 'cat-payroll' },
    { payroll_allocation_id: 'pa-2', payroll_record_id: 'pay-2', allocation_unit_id: activeDaycareId, allocation_amount: 52000, allocated_hours: 620, budget_category_id: 'cat-payroll' },
    { payroll_allocation_id: 'pa-3', payroll_record_id: 'pay-1', allocation_unit_id: activeOfficeId, allocation_amount: 30000, allocated_hours: 350, budget_category_id: 'cat-payroll' }
  ],
  bank_transactions: [
    { bank_transaction_id: 'bank-1', transaction_date: '2026-09-03', description: 'הכנסה', amount: 120000 },
    { bank_transaction_id: 'bank-2', transaction_date: '2026-09-05', description: 'הוצאה', amount: -30000 }
  ],
  bank_allocations: [
    { bank_allocation_id: 'ba-1', bank_transaction_id: 'bank-1', allocation_unit_id: activeDaycareId, budget_month: '2026-09-01', allocation_amount: 90000, budget_category_id: 'cat-income' },
    { bank_allocation_id: 'ba-2', bank_transaction_id: 'bank-1', allocation_unit_id: activeOfficeId, budget_month: '2026-09-01', allocation_amount: 30000, budget_category_id: 'cat-income' },
    { bank_allocation_id: 'ba-3', bank_transaction_id: 'bank-2', allocation_unit_id: activeDaycareId, budget_month: '2026-09-01', allocation_amount: -30000, budget_category_id: 'cat-expense' }
  ],
  budget_categories: [
    { budget_category_id: 'cat-income', display_name: 'הכנסות', category_type: 'INCOME', lifecycle_status: 'ACTIVE' },
    { budget_category_id: 'cat-expense', display_name: 'הוצאות', category_type: 'EXPENSE', lifecycle_status: 'ACTIVE' },
    { budget_category_id: 'cat-payroll', display_name: 'שכר', category_type: 'PAYROLL', lifecycle_status: 'ACTIVE' }
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
  await page.route('https://vyyfuaqmbxvfqgbfqooc.supabase.co/auth/v1/user', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'test-user' }) }));
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
