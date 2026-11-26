import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync(new URL('../supabase/migrations/20261126063000_safe_expression_rule_handlers.sql', import.meta.url), 'utf8');

test('safe expression handler is bounded and has no dynamic SQL execution', () => {
  assert.match(sql, /p_depth > 16/);
  assert.match(sql, /when 'const'/);
  assert.match(sql, /when 'input'/);
  assert.match(sql, /when 'add'/);
  assert.match(sql, /when 'multiply'/);
  assert.match(sql, /when 'divide'/);
  assert.match(sql, /when 'ceil_step'/);
  assert.match(sql, /when 'if'/);
  assert.doesNotMatch(sql, /\bexecute\s+format\b/i);
  assert.doesNotMatch(sql, /\beval\b/i);
});

test('staffing and budget rule types share the same safe evaluator operation', () => {
  assert.match(sql, /SAFE_EXPRESSION_STAFFING_V1','STAFFING_ROUNDING'.*'SAFE_EXPRESSION'/s);
  assert.match(sql, /SAFE_EXPRESSION_STAFFING_RATIO_V1','STAFFING_RATIO'.*'SAFE_EXPRESSION'/s);
  assert.match(sql, /SAFE_EXPRESSION_BUDGET_V1','BUDGET_FORMULA'.*'SAFE_EXPRESSION'/s);
  assert.match(sql, /h\.operation_code='SAFE_EXPRESSION'/);
});
