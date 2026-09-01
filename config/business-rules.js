const DAYCARE_MONTH_KEY_SEPARATOR = '|';
const DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS = 160;
const TUITION_ECONOMIC_MONTHS = 12;
const TUITION_PAYMENT_COUNTS = Object.freeze([11, 12]);

function cleanRuleValue(value) {
  return String(value ?? '').trim();
}

function daycareMonthKey(daycare, month) {
  return [cleanRuleValue(daycare), cleanRuleValue(month)].join(DAYCARE_MONTH_KEY_SEPARATOR);
}

function unitMonthKey(unit, month) {
  return [cleanRuleValue(unit), cleanRuleValue(month)].join(DAYCARE_MONTH_KEY_SEPARATOR);
}

function annualEconomicTuition(monthlyRate) {
  return Number(monthlyRate) * TUITION_ECONOMIC_MONTHS;
}

function tuitionInstallment(monthlyRate, paymentCount) {
  if (!TUITION_PAYMENT_COUNTS.includes(Number(paymentCount))) throw new RangeError('Tuition payment count must be 11 or 12.');
  return Number(paymentCount) === 12 ? Number(monthlyRate) : Math.round(annualEconomicTuition(monthlyRate) / 11);
}

function isTuitionCollectionMonth(schoolYearSequence, paymentCount) {
  if (!TUITION_PAYMENT_COUNTS.includes(Number(paymentCount))) throw new RangeError('Tuition payment count must be 11 or 12.');
  const sequence = Number(schoolYearSequence);
  return sequence >= 1 && sequence <= Number(paymentCount);
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
  allocationsGrain: Object.freeze({
    name: 'Allocations grain',
    value: 'organizational unit + business month',
    description: 'Allocated bank movements are grouped by organizational unit and business allocation month.',
    affectedModules: Object.freeze(['BANKS', 'TRANSACTIONS', 'Dashboard', 'Reports', 'Comparison']),
    editability: 'Fixed business rule',
    riskLevel: 'High',
  }),
  unitMonthKey: Object.freeze({
    name: 'Unit-month merge key',
    value: 'unit|month',
    description: 'Shared merge key for organizational-unit month data sets.',
    affectedModules: Object.freeze(['BANKS', 'TRANSACTIONS', 'Dashboard', 'Reports', 'Comparison']),
    editability: 'Fixed integration contract',
    riskLevel: 'Medium',
  }),
  tuitionCollection: Object.freeze({
    name: 'Tuition economic and collection model',
    value: '12 economic months; 11 or 12 collection payments',
    description: 'Annual economic tuition is monthly rate × 12. Eleven payments run Sep-Jul with zero August collection and use a whole-shekel rounded installment; twelve payments run Sep-Aug at the monthly rate.',
    affectedModules: Object.freeze(['Budget', 'Settings', 'Future cash-flow and collection features']),
    editability: 'Payment count is configured per daycare and school year; formulas are fixed business rules',
    riskLevel: 'High',
  }),
});

module.exports = {
  BUSINESS_RULES,
  DAYCARE_MONTH_KEY_SEPARATOR,
  DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS,
  TUITION_ECONOMIC_MONTHS,
  TUITION_PAYMENT_COUNTS,
  averageEmployeeMonthlyHours: DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS,
  cleanRuleValue,
  daycareMonthKey,
  unitMonthKey,
  annualEconomicTuition,
  tuitionInstallment,
  isTuitionCollectionMonth,
};
