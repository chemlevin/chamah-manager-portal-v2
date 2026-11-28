import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../supabase/migrations/20261128164719_fix_postgrest_40001_retry_storm.sql', import.meta.url),
  'utf8',
);

const guardMigration = readFileSync(
  new URL('../supabase/migrations/20261128170000_add_retry_storm_guard_and_health_counters.sql', import.meta.url),
  'utf8',
);

test('migration replaces retryable business-validation SQLSTATE and verifies the live catalog', () => {
  assert.match(migration, /pg_get_functiondef\(p\.oid\)/);
  assert.match(migration, /errcode=''P0001''/);
  assert.match(migration, /Retryable SQLSTATE 40001 remains/);
  assert.doesNotMatch(migration, /create\s+index/i);
  assert.doesNotMatch(migration, /disable\s+row\s+level\s+security/i);
});

test('DDL guard permanently rejects retryable business SQLSTATEs without request-path polling', () => {
  assert.match(guardMigration, /returns event_trigger/i);
  assert.match(guardMigration, /on ddl_command_end/i);
  assert.match(guardMigration, /when tag in \('CREATE FUNCTION'\)/i);
  assert.match(guardMigration, /Retryable SQLSTATE 40001 is forbidden/i);
  assert.match(guardMigration, /errcode = 'P0001'/i);
  assert.doesNotMatch(guardMigration, /cron\.schedule|pg_sleep|set_config\s*\(/i);
});

test('health counters are on-demand, private, and preserve PostgreSQL statistics', () => {
  assert.match(guardMigration, /private\.portal_database_health_counters/i);
  assert.match(guardMigration, /xact_commit/);
  assert.match(guardMigration, /xact_rollback/);
  assert.match(guardMigration, /temp_bytes/);
  assert.match(guardMigration, /incident_retry_setup_calls/);
  assert.match(guardMigration, /aborted_authenticator_sessions/);
  assert.match(guardMigration, /revoke all .* from public, anon, authenticated/i);
  assert.doesNotMatch(guardMigration, /pg_stat_statements_reset|pg_stat_reset/i);
});
