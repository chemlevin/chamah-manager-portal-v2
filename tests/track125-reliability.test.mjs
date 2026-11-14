import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectMigrations, runPreflight } from '../scripts/migration-preflight.mjs';

test('migration preflight detects missing and forward dependencies', () => {
  const result = inspectMigrations([{ name: '100_first.sql', dependencies: [] }, { name: '200_second.sql', dependencies: ['150'] }, { name: '300_third.sql', dependencies: ['400'] }, { name: '400_future.sql', dependencies: [] }]);
  assert.match(result.issues.join('\n'), /missing migration 150/);
  assert.match(result.issues.join('\n'), /non-prior migration 400/);
});

test('migration preflight reports pending remote history', async () => {
  const result = await runPreflight({ migrationsDir: 'supabase/migrations', remoteVersions: ['20260724120000'] });
  assert.ok(result.pending.length > 0);
});
