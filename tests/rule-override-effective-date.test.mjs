import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sql = fs.readFileSync(new URL('../supabase/migrations/20261126073000_rule_override_effective_date_default.sql', import.meta.url), 'utf8');
test('exact-result override defaults an omitted range to the calculation date', () => {
  assert.match(sql, /coalesce\(\(b\.payload->>'effective_from'\)::date,r\.calculation_timestamp::date\)/);
  assert.match(sql, /coalesce\(\(b\.payload->>'effective_to'\)::date,effective_date\)/);
  assert.match(sql, /portal_consume_approval/);
  assert.match(sql, /b\.payload->'scope'<>r\.runtime_context/);
});
