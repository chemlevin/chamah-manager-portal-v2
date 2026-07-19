import { test, expect } from '@playwright/test';
import { calculateSalary, salaryRuleIssues } from '../chamah-manager-portal/new/salary-calculations.js';

const year = { school_year_id: 'sy', is_default: true, is_selectable: true };
const factor = (id, code, type = 'HOURLY') => ({ compensation_factor_id: id, compensation_factor_code: code, display_name: code, value_type: type, lifecycle_status: 'ACTIVE' });
const factors = [factor('seniority', 'SENIORITY-HOURLY'), factor('persistence', 'PERSISTENCE-HOURLY'), factor('persistenceGlobal', 'PERSISTENCE-GLOBAL_MONTHLY', 'GLOBAL_MONTHLY'), factor('management', 'CLASS_MANAGEMENT-HOURLY'), factor('certificate', 'CERTIFICATE-HOURLY'), factor('degree', 'DEGREE-HOURLY'), factor('excellence', 'EXCELLENCE-GLOBAL_MONTHLY', 'GLOBAL_MONTHLY'), factor('travel', 'TRAVEL-GLOBAL_MONTHLY', 'GLOBAL_MONTHLY')];
const rule = (id, amount, min = 0, max = null, condition = 'AUTOMATIC_BY_SENIORITY') => ({ compensation_factor_id: id, school_year_id: 'sy', amount, minimum_seniority_months: min, maximum_seniority_months: max, lifecycle_status: 'ACTIVE', eligibility_condition: condition, value_type: factors.find((item) => item.compensation_factor_id === id).value_type });
const rules = [rule('seniority', .5, 36, 48), rule('seniority', 1, 49, null), rule('persistence', 1, 12, 23), rule('persistence', 2, 24, 59), rule('persistence', 3, 60, 95), rule('persistenceGlobal', 550, 96, 131), rule('persistenceGlobal', 600, 132, 251), rule('persistenceGlobal', 700, 252, null), rule('management', 1.5, 12, null, 'CLASS_MANAGER=TRUE'), rule('certificate', 2, 0, null, 'CERTIFICATE_STATUS IN (CERTIFIED,COMMITTED)'), rule('degree', 1, 0, null, 'HAS_DEGREE=TRUE'), rule('excellence', 250, 0, null, 'EXCELLENCE_ELIGIBLE=TRUE'), rule('travel', 70, 0, null, 'TRAVEL_ELIGIBLE=TRUE')];
const input = { hourlyRate: 50, monthlyHours: 160, seniorityYears: 3, classManager: false, certificate: 'YES', degree: true, excellence: true, travel: true };

test('uses hourly and monthly rules without hardcoded amounts', () => {
  const result = calculateSalary(input, factors, rules, [year]);
  expect(result.issues).toEqual([]); expect(result.components.find((item) => item.key === 'SENIORITY').amount).toBe(80); expect(result.components.find((item) => item.key === 'EXCELLENCE').amount).toBe(250);
});
test('selects seniority and persistence at rule boundaries', () => {
  expect(calculateSalary({ ...input, seniorityYears: 3 }, factors, rules, [year]).components.find((item) => item.key === 'SENIORITY').amount).toBe(80);
  expect(calculateSalary({ ...input, seniorityYears: 8 }, factors, rules, [year]).components.find((item) => item.key === 'PERSISTENCE').amount).toBe(550);
});
test('calculates persistence from years and treats zero as the first year', () => {
  const persistence = (seniorityYears) => calculateSalary({ ...input, seniorityYears, monthlyHours: 182 }, factors, rules, [year]).components.find((item) => item.key === 'PERSISTENCE').amount;
  expect(persistence(0)).toBe(182);
  expect(persistence(3)).toBe(364);
  expect(persistence(6)).toBe(546);
  expect(persistence(8)).toBe(550);
});
test('keeps gross, breakdown, effective hourly and net range internally consistent', () => {
  const result = calculateSalary(input, factors, rules, [year]); const sum = result.components.reduce((total, item) => total + item.amount, 0);
  expect(result.gross).toBe(sum); expect(result.effectiveHourly).toBe(result.gross / 160); expect(result.netMin).toBe(result.gross * .78); expect(result.netMax).toBe(result.gross * .82);
});
test('excludes Havraa, localizes technical labels and keeps class management explicitly eligible-only', () => {
  const result = calculateSalary(input, factors, rules, [year]);
  expect(result.components.some((item) => item.key === 'HAVRAA')).toBe(false);
  expect(result.components.find((item) => item.key === 'PERSISTENCE').name).toBe('מענק התמדה');
  expect(result.components.find((item) => item.key === 'CLASS_MANAGEMENT').name).toBe('אחריות כיתה');
  expect(calculateSalary({ ...input, classManager: true }, factors, rules, [year]).components.find((item) => item.key === 'CLASS_MANAGEMENT').amount).toBe(240);
  expect(calculateSalary(input, factors, rules, [year]).components.find((item) => item.key === 'CLASS_MANAGEMENT').amount).toBe(0);
  expect(salaryRuleIssues(factors, rules, [year])).toEqual([]);
});
