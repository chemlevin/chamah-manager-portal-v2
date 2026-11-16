import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(new URL('../supabase/migrations/20261116120000_track130_child_identity_matching.sql', import.meta.url), 'utf8');

test('TRACK130 child matching uses national ID and the complete source-row key', () => {
  assert.match(sql, /e='children'/);
  assert.match(sql, /national_id/);
  assert.match(sql, /t\.source_system=v_source_system and t\.source_record_id=v_source_record_id/);
  assert.match(sql, /children\|source_system=%s\|source_record_id=%s/);
  assert.match(sql, /NATIONAL_ID_SOURCE_CONFLICT/);
  assert.match(sql, /SOURCE_ROW_NATIONAL_ID_CONFLICT/);
});
