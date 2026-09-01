import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const migration = readFileSync(
  new URL('../supabase/migrations/20260901100027_track029_supabase_keepalive.sql', import.meta.url),
  'utf8'
);

test('TRACK029 schedules a read-only Supabase keepalive every 12 hours', () => {
  expect(migration).toContain("'track029-supabase-keepalive'");
  expect(migration).toContain("'0 */12 * * *'");
  expect(migration).toMatch(/perform\s+school_year_id\s+from\s+public\.school_years\s+limit\s+1/iu);
  expect(migration).not.toMatch(/\b(insert|update|delete|merge|truncate)\b/iu);
});
