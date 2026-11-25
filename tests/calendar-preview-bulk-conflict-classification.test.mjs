import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../supabase/migrations/20261125141754_calendar_preview_bulk_conflict_classification.sql', import.meta.url),
  'utf8',
);
const payload = JSON.parse(readFileSync(
  new URL('../tmp/calendar-859/production-calendar-859.json', import.meta.url),
  'utf8',
));

test('calendar Preview conflict classification uses the precomputed token map', () => {
  assert.match(migration, /for token in select unnest\(private\.portal_mcp_stable_tokens\(p_row\)\)/);
  assert.match(migration, /p_duplicate_tokens->>token/);
  assert.doesNotMatch(migration, /portal_mcp_row_conflicts\(p_row,p_all_rows\)/);
  assert.doesNotMatch(migration, /jsonb_array_elements\(p_all_rows\)/);
});

test('canonical Production calendar fixture is the immutable 859-row payload', () => {
  assert.equal(payload.rows.length, 859);
  assert.deepEqual(
    Object.fromEntries([...new Set(payload.rows.map((row) => row.entity))].map(
      (entity) => [entity, payload.rows.filter((row) => row.entity === entity).length],
    )),
    {
      holiday_calendars: 2,
      holiday_calendar_days: 730,
      daycare_calendar_assignments: 5,
      daycare_operating_hours: 30,
      daycare_calendar_exceptions: 32,
      daycare_monthly_operating_results: 60,
    },
  );
  const rowsDigest = createHash('sha256').update(JSON.stringify(payload.rows)).digest('hex');
  assert.equal(rowsDigest, 'fe1500559bae2f4f3aa3509b133e8b5352258ca9544675de92945819aadd1c04');
  assert.equal(payload.idempotency_key, 'calendar-sy-2026-2027-fe1500559bae2f4f3aa3509b133e8b53');
});
