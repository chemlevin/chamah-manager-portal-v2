import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(new URL('../supabase/migrations/20261116130000_track130_employee_identity_matching.sql', import.meta.url), 'utf8');

test('employee identity mismatches are conflicts in both directions', () => {
  assert.match(sql, /EMPLOYEE_CODE_NATIONAL_ID_CONFLICT/);
  assert.match(sql, /NATIONAL_ID_EMPLOYEE_CODE_CONFLICT/);
  assert.match(sql, /employee_code/);
  assert.match(sql, /national_id/);
  assert.doesNotMatch(sql, /update public\.employees/i);
});
