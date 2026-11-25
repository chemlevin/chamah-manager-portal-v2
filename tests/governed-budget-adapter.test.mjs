import assert from 'node:assert/strict';
import test from 'node:test';
import engine from '../api/budget-engine.js';

const tables = {
  OCCUPANCY: [{ daycare: 'D1', month: '2099-02', classroom: 'C1', age_group: 'A1', children: 12 }],
  STAFFING: [{ age_group: 'A1', ratio: 6, minimum_staff: 1 }],
  MONTH_HOURS: [{ daycare: 'D1', month: '2099-02', operating_hours: 100 }],
  FIXED_STAFF: [], COST_RULES: [],
};

test('empty registry preserves the existing staffing path', () => {
  const legacy = engine.calculateBudgetModel(tables);
  const empty = engine.calculateBudgetModel(tables, { useGovernedRules: true, governedResults: [] });
  assert.deepEqual(empty, legacy);
  assert.equal(legacy.classroomStaffing[0].requiredStaff, 2);
});

test('existing staffing entry point consumes an exact governed result and exposes trace', () => {
  const governedResults = [{ status: 'CALCULATED', handler_code: 'STAFFING_RATIO_V1', calculation_result_id: 'result-1', rule_key: 'rule-1', version: 1, applicability_set_id: 'app-1', runtime_context: { daycare: 'D1', month: '2099-02', classroom: 'C1', age_group: 'A1' }, original_output: { required_staff: 2.5 }, adjusted_output: { required_staff: 3 }, final_output: { required_staff: 3 } }];
  const model = engine.calculateBudgetModel(tables, { useGovernedRules: true, governedResults });
  assert.equal(model.classroomStaffing[0].requiredStaff, 3);
  assert.equal(model.classroomStaffing[0].ageGroups[0].calculationTrace.ruleKey, 'rule-1');
  assert.deepEqual(model.classroomStaffing[0].ageGroups[0].calculationTrace.originalOutput, { required_staff: 2.5 });
  assert.deepEqual(model.classroomStaffing[0].ageGroups[0].calculationTrace.adjustedOutput, { required_staff: 3 });
});
