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
  school_year_months: [{ school_year_id: 'year-1', month_label: 'ספטמבר 2026', start_date: '2026-09-01', school_year_sequence: 1 }],
  daycares: [], daycare_school_years: [], classrooms: [], monthly_enrollment: [], payroll_records: [], payroll_allocations: [], bank_transactions: [], bank_allocations: [], data_quality_issues: []
};

export async function mockNewPortalSupabase(page, units = allocationUnits) {
  const requestedTables = [];
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
  await page.addInitScript(() => localStorage.setItem('chamah.portal.session', JSON.stringify({ access_token: 'test-session', expires_at: 4102444800 })));
  await page.goto(`/new/#${route}`);
}
