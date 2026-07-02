const DAYCARE_MONTH_KEY_SEPARATOR = '|';
const DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS = 160;

function cleanRuleValue(value) {
  return String(value ?? '').trim();
}

function daycareMonthKey(daycare, month) {
  return [cleanRuleValue(daycare), cleanRuleValue(month)].join(DAYCARE_MONTH_KEY_SEPARATOR);
}

const BUSINESS_RULES = Object.freeze({
  budgetGrain: Object.freeze({
    name: 'Budget grain',
    value: 'daycare + month',
    description: 'Budget calculations are grouped by daycare and month.',
    affectedModules: Object.freeze(['Budget', 'Payroll', 'Comparison', 'Dashboard', 'Reports']),
    editability: 'Fixed business rule',
    riskLevel: 'High',
  }),
  payrollGrain: Object.freeze({
    name: 'Payroll grain',
    value: 'daycare + month',
    description: 'Payroll calculations are grouped by daycare and month.',
    affectedModules: Object.freeze(['Payroll', 'Comparison', 'Dashboard', 'Reports']),
    editability: 'Fixed business rule',
    riskLevel: 'High',
  }),
  daycareMonthKey: Object.freeze({
    name: 'Daycare-month merge key',
    value: 'daycare|month',
    description: 'Shared merge key for daycare-month data sets.',
    affectedModules: Object.freeze(['Budget', 'Payroll', 'Comparison', 'Dashboard']),
    editability: 'Fixed integration contract',
    riskLevel: 'Medium',
  }),
  averageEmployeeMonthlyHours: Object.freeze({
    name: 'Average employee monthly hours',
    value: DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS,
    description: 'Default monthly hours used to translate required classroom hours into required employee headcount.',
    affectedModules: Object.freeze(['Budget', 'Comparison', 'Dashboard']),
    editability: 'Configurable later; fixed in UI now',
    riskLevel: 'High',
  }),
});

module.exports = {
  BUSINESS_RULES,
  DAYCARE_MONTH_KEY_SEPARATOR,
  DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS,
  averageEmployeeMonthlyHours: DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS,
  cleanRuleValue,
  daycareMonthKey,
};
