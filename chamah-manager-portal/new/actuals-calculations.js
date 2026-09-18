const numberValue = (value) => Number(value || 0);
const monthKey = (value) => String(value || '').slice(0, 7);

export const PAYROLL_CATEGORY_CODES = new Set(['CAT-PAYROLL-STAFF', 'CAT-PAYROLL-NONSTAFF']);

export function bankActualEffect(row, category) {
  if (!row?.movement_type || !row?.allocation_unit_id || !row?.budget_month || !row?.budget_category_id || !category) return 0;
  if (row.movement_type === 'INTERNAL' || row.movement_type === 'EXCLUDE') return 0;
  if (PAYROLL_CATEGORY_CODES.has(category.budget_category_code)) return 0;
  const amount = numberValue(row.allocation_amount);
  if (row.movement_type === 'INCOME' && category.category_type === 'INCOME') return amount;
  if (row.movement_type === 'EXPENSE' && category.category_type === 'EXPENSE') return -amount;
  return 0;
}

export function buildBankActuals(rows, categories, daycares = []) {
  const categoryById = categories instanceof Map ? categories : new Map((categories || []).map((item) => [item.budget_category_id, item]));
  const daycareByUnit = new Map(daycares.map((item) => [item.allocation_unit_id, item]));
  return (rows || []).map((row) => {
    const category = categoryById.get(row.budget_category_id);
    const canonicalDaycare = daycareByUnit.get(row.allocation_unit_id);
    const attributionComplete = !canonicalDaycare || row.daycare_id === canonicalDaycare.daycare_id;
    const effect = attributionComplete ? bankActualEffect(row, category) : 0;
    const kind = attributionComplete && row.movement_type === 'INCOME' && category?.category_type === 'INCOME' && !PAYROLL_CATEGORY_CODES.has(category?.budget_category_code) ? 'income'
      : attributionComplete && row.movement_type === 'EXPENSE' && category?.category_type === 'EXPENSE' && !PAYROLL_CATEGORY_CODES.has(category?.budget_category_code) ? 'expense' : 'none';
    return { ...row, category, effect, kind };
  });
}

function canonicalPayrollAttribution(record, daycareByUnit) {
  const unitId = record.actual_allocation_unit_id;
  if (!unitId) return null;
  const daycare = daycareByUnit.get(unitId);
  if (!daycare) return record.actual_daycare_id ? null : { allocationUnitId: unitId, daycareId: null };
  return record.actual_daycare_id === daycare.daycare_id ? { allocationUnitId: unitId, daycareId: daycare.daycare_id } : null;
}

export function buildPayrollActuals({ records = [], daycares = [], roles = [], categories = [], selectedMonths, selectedUnitIds } = {}) {
  const daycareByUnit = new Map(daycares.map((item) => [item.allocation_unit_id, item]));
  const roleById = new Map(roles.map((item) => [item.role_id, item]));
  const categoryByCode = new Map(categories.map((item) => [item.budget_category_code, item]));
  const childrenByParent = new Map();
  records.filter((row) => row.row_kind === 'SPLIT' && row.parent_payroll_record_id).forEach((row) => {
    if (!childrenByParent.has(row.parent_payroll_record_id)) childrenByParent.set(row.parent_payroll_record_id, []);
    childrenByParent.get(row.parent_payroll_record_id).push(row);
  });
  const rows = [];
  const issues = [];
  records.filter((row) => row.row_kind !== 'SPLIT').forEach((parent) => {
    if (selectedMonths && !selectedMonths.has(monthKey(parent.payroll_month))) return;
    const children = childrenByParent.get(parent.payroll_record_id) || [];
    const sources = children.length ? children : [parent];
    if (children.length) {
      const childTotal = children.reduce((total, child) => total + numberValue(child.employer_cost), 0);
      if (Math.abs(childTotal - numberValue(parent.employer_cost)) > .01) issues.push({ code: 'PAYROLL_SPLIT_MISMATCH', payrollRecordId: parent.payroll_record_id, month: monthKey(parent.payroll_month), expected: numberValue(parent.employer_cost), actual: childTotal });
    }
    sources.forEach((source) => {
      const attribution = canonicalPayrollAttribution(source, daycareByUnit);
      if (!attribution) {
        issues.push({ code: 'PAYROLL_ATTRIBUTION_INSUFFICIENT', payrollRecordId: parent.payroll_record_id, sourceRecordId: source.payroll_record_id, month: monthKey(parent.payroll_month) });
        return;
      }
      if (selectedUnitIds && !selectedUnitIds.has(attribution.allocationUnitId)) return;
      const role = roleById.get(source.role_id);
      const categoryCode = role?.role_code === 'ROLE-CAREGIVER' ? 'CAT-PAYROLL-STAFF' : 'CAT-PAYROLL-NONSTAFF';
      rows.push({ ...source, payroll_month: parent.payroll_month, parent_payroll_record_id: parent.payroll_record_id, allocation_unit_id: attribution.allocationUnitId, daycare_id: attribution.daycareId, budget_category_id: categoryByCode.get(categoryCode)?.budget_category_id || null, actual_amount: numberValue(source.employer_cost), actual_hours: source.actual_hours == null ? null : numberValue(source.actual_hours), role });
    });
  });
  return { rows, issues };
}

export function summarizeActuals({ bankRows = [], payrollRows = [] } = {}) {
  const incomeRows = bankRows.filter((row) => row.kind === 'income');
  const expenseRows = bankRows.filter((row) => row.kind === 'expense');
  return {
    incomeRows,
    expenseRows,
    income: incomeRows.length ? incomeRows.reduce((total, row) => total + row.effect, 0) : null,
    expenses: expenseRows.length ? expenseRows.reduce((total, row) => total + row.effect, 0) : null,
    payroll: payrollRows.length ? payrollRows.reduce((total, row) => total + row.actual_amount, 0) : null,
    actualHours: payrollRows.some((row) => row.actual_hours != null) ? payrollRows.reduce((total, row) => total + numberValue(row.actual_hours), 0) : null,
  };
}

export function categoryActuals({ bankRows = [], payrollRows = [] } = {}) {
  const values = new Map();
  const add = (categoryId, daycareId, amount) => {
    if (!categoryId || !daycareId) return;
    const key = `${categoryId}|${daycareId}`;
    values.set(key, (values.get(key) || 0) + numberValue(amount));
  };
  bankRows.filter((row) => row.kind !== 'none').forEach((row) => add(row.budget_category_id, row.daycare_id, row.effect));
  payrollRows.forEach((row) => add(row.budget_category_id, row.daycare_id, row.actual_amount));
  return values;
}
