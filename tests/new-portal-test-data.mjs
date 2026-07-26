export const activeDaycareId = '11111111-1111-4111-8111-111111111111';
export const activeOfficeId = '22222222-2222-4222-8222-222222222222';
export const inactiveUnitId = '33333333-3333-4333-8333-333333333333';
const portalSectionLabels = {
  home: 'עמוד הבית', dashboards: 'דשבורדים', 'dashboards.finance': 'כספים', 'dashboards.accounting': 'הנה״ח', 'dashboards.accounting.summary': 'דשבורד סיכום', 'dashboards.accounting.banks': 'קובץ בנקים', 'dashboards.accounting.bank-transfers': 'העברות בנקאיות', 'dashboards.licensing': 'רישוי', 'dashboards.team': 'צוות', 'dashboards.staffing': 'צוות ורישוי', 'dashboards.staffing.employees': 'עובדים', 'dashboards.staffing.actual-payroll': 'ביצוע שכר', 'dashboards.occupancy': 'תפוסה ותקינה',
  calculators: 'מחשבונים', 'calculators.salary': 'מחשבון שכר', 'calculators.occupancy': 'מחשבון תפוסה, תקינה ורווחיות',
  payroll: 'שכר', 'payroll.calculations': 'חישובי שכר', 'payroll.calculations.new': 'חדש', 'payroll.calculations.existing': 'קיים', 'payroll.calculations.history': 'טבלאות עבר',
  management: 'ניהול והגדרות', 'management.permissions': 'הרשאות', 'management.permissions.users': 'רשימת משתמשים והרשאות', 'management.rules': 'כללים', 'management.rules.calculation': 'כללי חישוב', 'management.rules.system': 'כללי מערכת', 'management.settings': 'הגדרות', 'management.tables': 'טבלאות', 'management.tables.calculation': 'טבלאות חישוב', 'management.tables.variables': 'משתנים', 'management.audit': 'יומן שינויים',
  knowledge: 'מרכז הידע למשתמש', maintenance: 'תחזוקה', tasks: 'משימות'
};
export const portalAccessFixture = { profile: { user_id: 'test-user', display_name: 'משתמשת בדיקה', is_active: true, is_super_admin: true, scope_mode: 'ORGANIZATION' }, allocation_unit_ids: [], daycare_ids: [], sections: [
  ['home', 'home', null], ['dashboards', 'dashboards', null], ['dashboards.finance', 'dashboards/unit/organization/finance', 'dashboards'], ['dashboards.accounting', 'dashboards/unit/organization/accounting', 'dashboards'], ['dashboards.accounting.summary', 'dashboards/unit/organization/accounting/summary', 'dashboards.accounting'], ['dashboards.accounting.banks', 'dashboards/unit/organization/accounting/banks', 'dashboards.accounting'], ['dashboards.accounting.bank-transfers', 'dashboards/unit/organization/accounting/bank-transfers', 'dashboards.accounting'], ['dashboards.licensing', 'dashboards/unit/organization/licensing', 'dashboards'], ['dashboards.team', 'dashboards/unit/organization/team', 'dashboards'], ['dashboards.staffing', 'dashboards/unit/organization/staffing', 'dashboards'], ['dashboards.staffing.employees', 'dashboards/unit/organization/staffing/employees', 'dashboards.staffing'], ['dashboards.staffing.actual-payroll', 'dashboards/unit/organization/staffing/actual-payroll', 'dashboards.staffing'], ['dashboards.occupancy', 'dashboards/unit/organization/occupancy', 'dashboards'], ['calculators', 'calculators', null], ['calculators.salary', 'calculators/salary', 'calculators'], ['calculators.occupancy', 'calculators/occupancy', 'calculators'], ['payroll', 'payroll', null], ['payroll.calculations', 'payroll/calculations', 'payroll'], ['payroll.calculations.new', 'payroll/calculations/new', 'payroll.calculations'], ['payroll.calculations.existing', 'payroll/calculations/existing', 'payroll.calculations'], ['payroll.calculations.history', 'payroll/calculations/history', 'payroll.calculations'], ['management', 'training', null], ['management.permissions', 'training/permissions', 'management'], ['management.permissions.users', 'training/permissions/users', 'management.permissions'], ['management.rules', 'training/rules', 'management'], ['management.rules.calculation', 'training/rules/calculation', 'management.rules'], ['management.rules.system', 'training/rules/system', 'management.rules'], ['management.settings', 'training/settings', 'management'], ['management.tables', 'training/tables', 'management'], ['management.tables.calculation', 'training/tables/calculation', 'management.tables'], ['management.tables.variables', 'training/tables/variables', 'management.tables'], ['management.audit', 'training/audit', 'management'], ['knowledge', 'knowledge', null], ['maintenance', 'maintenance', null], ['tasks', 'tasks', null]
].map(([screen_code, route, parent_screen_code], display_order) => ({ screen_code, route, parent_screen_code, display_name: portalSectionLabels[screen_code], display_order, permission_level: 'EDIT' })) };

export const allocationUnits = [
  { allocation_unit_id: activeDaycareId, display_name: 'יחידה פעילה א', allocation_unit_type: 'DAYCARE', lifecycle_status: 'ACTIVE', display_order: 2, notes: null },
  { allocation_unit_id: activeOfficeId, display_name: 'יחידה פעילה ב', allocation_unit_type: 'OFFICE', lifecycle_status: 'ACTIVE', display_order: 1, notes: null },
  { allocation_unit_id: inactiveUnitId, display_name: 'יחידה לא פעילה', allocation_unit_type: 'DAYCARE', lifecycle_status: 'INACTIVE', display_order: 0, notes: null }
];

const generalResponses = {
  calendar_years: [{ calendar_year_id: 'calendar-2026', calendar_year_code: 'CY-2026', display_name: '2026', start_date: '2026-01-01', end_date: '2026-12-31', status: 'OPEN', is_selectable: true }, { calendar_year_id: 'calendar-2027', calendar_year_code: 'CY-2027', display_name: '2027', start_date: '2027-01-01', end_date: '2027-12-31', status: 'FUTURE', is_selectable: false }],
  school_years: [{ school_year_id: 'year-1', display_name: 'תשפ״ז', start_date: '2026-09-01', end_date: '2027-08-31', is_default: true, is_selectable: true }],
  school_year_months: [
    { school_year_month_id: 'month-9', school_year_id: 'year-1', month_label: 'ספטמבר 2026', start_date: '2026-09-01', school_year_sequence: 1 },
    { school_year_month_id: 'month-10', school_year_id: 'year-1', month_label: 'אוקטובר 2026', start_date: '2026-10-01', school_year_sequence: 2 },
    { school_year_month_id: 'month-11', school_year_id: 'year-1', month_label: 'נובמבר 2026', start_date: '2026-11-01', school_year_sequence: 3 }
  ],
  daycares: [{ daycare_id: 'daycare-1', daycare_code: 'DC-ONE', allocation_unit_id: activeDaycareId, display_name: 'מעון א', lifecycle_status: 'ACTIVE', display_order: 1 }],
  daycare_school_years: [{ daycare_school_year_id: 'dsy-1', daycare_id: 'daycare-1', school_year_id: 'year-1', is_operating: true, tuition_standard_type: 'EXTENDED', staffing_standard_type: 'EXTENDED' }],
  classrooms: [{ classroom_id: 'class-1', daycare_school_year_id: 'dsy-1', display_name: 'כיתה א', licensed_capacity: 22, lifecycle_status: 'ACTIVE', display_order: 1, effective_from: '2026-09-01', effective_to: null }],
  classroom_capacity_breakdowns: [{ classroom_id: 'class-1', age_group_id: 'age-infant', licensed_capacity: 22, lifecycle_status: 'ACTIVE' }],
  classroom_licensing_rules: [
    { classroom_licensing_rule_id: 'license-infant', age_group: 'INFANT', sqm_per_child: 2.8, max_children: 22, allowed_mixed_with: ['TODDLER'], valid_from: '2026-09-01', valid_to: null, rounding_method: 'FLOOR', lifecycle_status: 'ACTIVE' },
    { classroom_licensing_rule_id: 'license-toddler', age_group: 'TODDLER', sqm_per_child: 2.6, max_children: 27, allowed_mixed_with: ['INFANT', 'GRADUATE'], valid_from: '2026-09-01', valid_to: null, rounding_method: 'FLOOR', lifecycle_status: 'ACTIVE' },
    { classroom_licensing_rule_id: 'license-graduate', age_group: 'GRADUATE', sqm_per_child: 2.2, max_children: 33, allowed_mixed_with: ['TODDLER'], valid_from: '2026-09-01', valid_to: null, rounding_method: 'FLOOR', lifecycle_status: 'ACTIVE' }
  ],
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
    { bank_allocation_id: 'ba-1', bank_transaction_id: 'bank-1', allocation_unit_id: activeDaycareId, budget_month: '2026-09-01', allocation_amount: 90000, budget_category_id: 'cat-income', accounting_status_id: 'status-no-send' },
    { bank_allocation_id: 'ba-2', bank_transaction_id: 'bank-1', allocation_unit_id: activeOfficeId, budget_month: '2026-09-01', allocation_amount: 30000, budget_category_id: 'cat-income', accounting_status_id: 'status-waiting' },
    { bank_allocation_id: 'ba-3', bank_transaction_id: 'bank-2', allocation_unit_id: activeDaycareId, budget_month: '2026-09-01', allocation_amount: -30000, budget_category_id: 'cat-expense', accounting_status_id: 'status-missing' }
  ],
  accounting_statuses: [
    { accounting_status_id: 'status-missing', accounting_status_code: 'ACC-MISSING-DOCS', sheet_accounting_status_id: 'ACC-MISSING-DOCS', display_name: 'חסרים מסמכים', display_order: 10, is_final: false, lifecycle_status: 'ACTIVE' },
    { accounting_status_id: 'status-waiting', accounting_status_code: 'ACC-WAITING', sheet_accounting_status_id: 'ACC-WAITING', display_name: 'ממתין לשליחה', display_order: 20, is_final: false, lifecycle_status: 'ACTIVE' },
    { accounting_status_id: 'status-no-send', accounting_status_code: 'ACC-NO-SEND', sheet_accounting_status_id: 'ACC-NO-SEND', display_name: 'אין צורך לשלוח', display_order: 30, is_final: true, lifecycle_status: 'ACTIVE' }
  ],
  budget_categories: [
    { budget_category_id: 'cat-income', budget_category_code: 'CAT-TUITION', display_name: 'שכר לימוד', category_type: 'INCOME', lifecycle_status: 'ACTIVE' },
    { budget_category_id: 'cat-expense', budget_category_code: 'CAT-FOOD', display_name: 'אוכל', category_type: 'EXPENSE', lifecycle_status: 'ACTIVE' },
    { budget_category_id: 'cat-payroll', budget_category_code: 'CAT-PAYROLL-STAFF', display_name: 'שכר צוות', category_type: 'EXPENSE', lifecycle_status: 'ACTIVE' },
    { budget_category_id: 'cat-fixed', budget_category_code: 'CAT-PAYROLL-NONSTAFF', display_name: 'שכר קבוע', category_type: 'EXPENSE', lifecycle_status: 'ACTIVE' }
  ],
  bank_accounts: [{ bank_account_id: 'account-1', display_name: 'חשבון תפעולי', bank_account_code: 'BANK-1', lifecycle_status: 'ACTIVE' }],
  age_groups: [{ age_group_id: 'age-infant', age_group_code: 'INFANT', display_name: 'תינוקות', display_order: 1, lifecycle_status: 'ACTIVE' }, { age_group_id: 'age-toddler', age_group_code: 'TODDLER', display_name: 'פעוטות', display_order: 2, lifecycle_status: 'ACTIVE' }, { age_group_id: 'age-graduate', age_group_code: 'GRADUATE', display_name: 'בוגרים', display_order: 3, lifecycle_status: 'ACTIVE' }],
  roles: [{ role_id: 'role-caregiver', role_code: 'ROLE-CAREGIVER', display_name: 'מטפלת' }, { role_id: 'role-manager', role_code: 'ROLE-MANAGER', display_name: 'מנהלת' }],
  employments: [{ employment_id: 'employment-1', employee_id: 'employee-1', employment_start_date: '2026-01-01', employment_end_date: null, employment_status: 'ACTIVE' }],
  employees: [{ employee_id: 'employee-1', first_name: 'שרה', last_name: 'כהן', lifecycle_status: 'ACTIVE' }],
  employee_pay_terms: [{ employee_pay_term_id: 'term-1', employee_id: 'employee-1', valid_from: '2026-01-01', valid_to: null, pay_type: 'MONTHLY', base_pay: 9000, caregiver_certificate_status: 'CERTIFIED', studies_end_date: null, has_degree: false, is_class_manager: false, first_aid_valid_until: '2027-01-01', safe_conduct_valid_until: '2027-01-01', weekly_schedule: { sunday: true, monday: true, tuesday: true, wednesday: true, thursday: true, friday: false } }],
  employee_assignments: [{ assignment_id: 'assignment-1', employment_id: 'employment-1', allocation_unit_id: activeDaycareId, daycare_id: 'daycare-1', classroom_id: 'class-1', role_id: 'role-caregiver', effective_from: '2026-01-01', effective_to: null, is_primary: true }],
  monthly_work_calendars: [
    { school_year_month_id: 'month-9', sun_thu_hours_per_day: 8.5, friday_hours_per_day: 4.5, sun_thu_workdays: 22, friday_workdays: 4 },
    { school_year_month_id: 'month-10', sun_thu_hours_per_day: 8.5, friday_hours_per_day: 4.5, sun_thu_workdays: 21, friday_workdays: 5 },
    { school_year_month_id: 'month-11', sun_thu_hours_per_day: 8.5, friday_hours_per_day: 4.5, sun_thu_workdays: 22, friday_workdays: 4 }
  ],
  staffing_budget_parameters: [{ school_year_id: 'year-1', monthly_hours_per_fte: 160, hourly_budget_cost: 60, budget_formula: 'MONTHLY_REQUIRED_STAFF_HOURS × HOURLY_BUDGET_COST', effective_from_month_id: 'month-9', effective_to_month_id: 'month-11', lifecycle_status: 'ACTIVE' }],
  budget_rules: [
    { budget_rule_id: 'staff-rule', budget_category_id: 'cat-payroll', school_year_id: 'year-1', age_group_id: 'age-infant', effective_from: '2026-09-01', effective_to: '2027-08-31', lifecycle_status: 'ACTIVE', standard_type: 'EXTENDED', calculation_method: 'STAFFING_RATIO', parameter_1: 5, rounding_method: 'CEIL_PER_AGE_GROUP' },
    { budget_rule_id: 'tuition-rule', budget_category_id: 'cat-income', school_year_id: 'year-1', age_group_id: 'age-infant', effective_from: '2026-09-01', effective_to: '2027-08-31', lifecycle_status: 'ACTIVE', standard_type: 'EXTENDED', calculation_method: 'TUITION_MONTHLY', numeric_value: 3487 },
    { budget_rule_id: 'staff-rule-toddler', budget_category_id: 'cat-payroll', school_year_id: 'year-1', age_group_id: 'age-toddler', effective_from: '2026-09-01', effective_to: '2027-08-31', lifecycle_status: 'ACTIVE', standard_type: 'EXTENDED', calculation_method: 'STAFFING_RATIO', parameter_1: 8, rounding_method: 'CEIL_PER_AGE_GROUP' },
    { budget_rule_id: 'staff-rule-graduate', budget_category_id: 'cat-payroll', school_year_id: 'year-1', age_group_id: 'age-graduate', effective_from: '2026-09-01', effective_to: '2027-08-31', lifecycle_status: 'ACTIVE', standard_type: 'EXTENDED', calculation_method: 'STAFFING_RATIO', parameter_1: 10, rounding_method: 'CEIL_PER_AGE_GROUP' },
    { budget_rule_id: 'tuition-rule-toddler', budget_category_id: 'cat-income', school_year_id: 'year-1', age_group_id: 'age-toddler', effective_from: '2026-09-01', effective_to: '2027-08-31', lifecycle_status: 'ACTIVE', standard_type: 'EXTENDED', calculation_method: 'TUITION_MONTHLY', numeric_value: 3000 },
    { budget_rule_id: 'tuition-rule-graduate', budget_category_id: 'cat-income', school_year_id: 'year-1', age_group_id: 'age-graduate', effective_from: '2026-09-01', effective_to: '2027-08-31', lifecycle_status: 'ACTIVE', standard_type: 'EXTENDED', calculation_method: 'TUITION_MONTHLY', numeric_value: 2500 },
    { budget_rule_id: 'tuition-rule-fallback', budget_category_id: 'cat-income', school_year_id: 'year-1', age_group_id: null, effective_from: '2026-09-01', effective_to: '2027-08-31', lifecycle_status: 'ACTIVE', standard_type: null, calculation_method: 'TUITION_MONTHLY', numeric_value: 2800 },
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
  const settingsPrimaryKeys = { school_years:'school_year_id',calendar_years:'calendar_year_id',school_year_months:'school_year_month_id',legal_entity_types:'legal_entity_type_id',legal_entities:'legal_entity_id',allocation_units:'allocation_unit_id',daycares:'daycare_id',daycare_school_years:'daycare_school_year_id',classrooms:'classroom_id',age_groups:'age_group_id',budget_categories:'budget_category_id',bank_accounts:'bank_account_id',accounting_statuses:'accounting_status_id',roles:'role_id',certificate_types:'certificate_type_id',classroom_licensing_rules:'classroom_licensing_rule_id',staffing_rules:'staffing_rule_id',staffing_budget_parameters:'staffing_budget_parameter_id',compensation_factors:'compensation_factor_id',compensation_rules:'compensation_rule_id',budget_rules:'budget_rule_id',travel_rates:'travel_rate_id' };
  const settingsData = Object.fromEntries(Object.keys(settingsPrimaryKeys).map((name) => [name, name === 'allocation_units' ? structuredClone(units) : structuredClone(generalResponses[name] || [])]));
  await page.route('**/auth/v1/user**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'test-user' }) }));
  await page.route('**/auth/v1/token**', (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('grant_type') !== 'password') return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Unsupported test grant.' }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'test-session', refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer' }) });
  });
  await page.route('**/functions/v1/portal-settings', async (route) => {
    const request = route.request(), method = request.method();
    if (method === 'GET') return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ data: settingsData }) });
    const payload = request.postDataJSON(), key = settingsPrimaryKeys[payload.table];
    if (method === 'POST') {
      const row = { ...payload.values, [key]: `created-${payload.table}` };
      settingsData[payload.table].push(row);
      return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ row }) });
    }
    if (method === 'PATCH') {
      const index = settingsData[payload.table].findIndex((item) => String(item[key]) === String(payload.id));
      const row = { ...settingsData[payload.table][index], ...payload.values };
      settingsData[payload.table][index] = row;
      return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ row }) });
    }
    if (method === 'DELETE') {
      settingsData[payload.table] = settingsData[payload.table].filter((item) => String(item[key]) !== String(payload.id));
      return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ row: null }) });
    }
    return route.fulfill({ status: 405, body: '{}' });
  });
  await page.route('**/functions/v1/portal-bank-workbench', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify({
      calendarYears: generalResponses.calendar_years.filter((item) => item.is_selectable),
      transactions: generalResponses.bank_transactions,
      allocations: generalResponses.bank_allocations,
      accounts: generalResponses.bank_accounts,
      units,
      daycares: generalResponses.daycares,
      categories: generalResponses.budget_categories,
      accountingStatuses: generalResponses.accounting_statuses,
      assignmentMonths: generalResponses.school_year_months,
      batches: [],
    }),
  }));
  await page.route('**/functions/v1/portal-workforce-workbench**', (route) => {
    const payroll = new URL(route.request().url()).searchParams.get('page') === 'payroll';
    const body = payroll ? {
      records: generalResponses.payroll_records.map((row) => ({
        ...row,
        employee_match_status: 'LINKED',
        record_origin: 'IMPORT',
        allocation_unit_id: activeDaycareId,
        daycare_id: 'daycare-1',
        role_id: 'role-caregiver',
        employee_pay_term_id: 'term-1',
      })),
      allocations: generalResponses.payroll_allocations,
      employees: generalResponses.employees.map((row) => ({ ...row, employee_code: 'EMP-1' })),
      employments: generalResponses.employments,
      assignments: generalResponses.employee_assignments,
      payTerms: generalResponses.employee_pay_terms,
      months: [
        { payroll_month: '2026-07-01', month_status: 'CURRENT', opening_method: 'ACTIVE_EMPLOYEES' },
        { payroll_month: '2026-06-01', month_status: 'CLOSED', opening_method: 'PREVIOUS_MONTH' },
      ],
      canReopen: true,
    } : {
      employees: generalResponses.employees.map((row) => ({ ...row, employee_code: 'EMP-1' })),
      employments: generalResponses.employments,
      assignments: generalResponses.employee_assignments,
      payTerms: generalResponses.employee_pay_terms,
      eligibility: [], employeeCertificates: [], leave: [],
    };
    return route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify({
      ...body, units, daycares: generalResponses.daycares, roles: generalResponses.roles,
      certificates: [], compensationFactors: [], entities: [{ legal_entity_id:'entity-1', display_name:'עמותה' }],
      daycareSchoolYears: generalResponses.daycare_school_years,
      classrooms: generalResponses.classrooms,
    }) });
  });
  await page.route('https://vyyfuaqmbxvfqgbfqooc.supabase.co/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').pop();
    requestedTables.push({ table, search: url.search });
    const body = table === 'portal_my_access' ? portalAccessFixture : table === 'calendar_years' && url.searchParams.get('is_selectable') === 'eq.true'
      ? generalResponses.calendar_years.filter((item) => item.is_selectable)
      : table === 'allocation_units' && url.searchParams.get('lifecycle_status') === 'eq.ACTIVE'
      ? units
      : table === 'allocation_units'
        ? []
        : (generalResponses[table] || []);
    await route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(body) });
  });
  await page.route('**/rest/v1/rpc/portal_my_access**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(portalAccessFixture) }));
  return requestedTables;
}

export async function openNewPortal(page, route = 'home') {
  await page.goto('/new/');
  if (await page.locator('#email').isVisible()) {
    await page.locator('#email').fill('qa@example.test');
    await page.locator('#password').fill('בדיקה12345');
    const signInResponse = page.waitForResponse((response) => response.url().includes('/auth/v1/token?grant_type=password'));
    await page.locator('#login-submit').click();
    if (!(await signInResponse).ok()) throw new Error('Supabase test login did not succeed.');
  }
  await page.waitForSelector('#app-view:not([hidden])');
  await page.waitForSelector('#page-content .page-heading');
  await page.waitForFunction(() => document.title.startsWith('עמוד הבית |'));
  await page.evaluate((value) => { location.hash = value; }, route);
  if (route.includes('/finance') || route.includes('/accounting')) await page.waitForSelector('#general-dashboard:not([hidden])');
}
