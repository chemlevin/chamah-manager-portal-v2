import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const migrationsDir = path.resolve('supabase/migrations');
const trackMigrationName = '20260924025849_track054_explicit_table_grants.sql';
const serviceOnlyTables = new Set([
  'bank_transfers',
  'employee_leave_periods',
  'payroll_calculation_input_rules',
  'payroll_months',
]);

function createdPublicTables(source) {
  return [...source.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_][a-z0-9_]*)/gi)]
    .map((match) => match[1]);
}

test('TRACK054 explicitly preserves the intended grants for every public table', () => {
  const migrationFiles = fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort();
  const tables = migrationFiles.flatMap((name) => createdPublicTables(
    fs.readFileSync(path.join(migrationsDir, name), 'utf8'),
  ));
  const source = fs.readFileSync(path.join(migrationsDir, trackMigrationName), 'utf8');

  assert.equal(new Set(tables).size, tables.length);
  for (const table of tables) {
    assert.ok(source.includes(`public.${table}`), `${table} must have an explicit TRACK054 grant`);
  }

  const authenticatedGrant = source.match(/grant select on table([\s\S]*?)to authenticated;/i)?.[1] ?? '';
  for (const table of tables) {
    assert.equal(authenticatedGrant.includes(`public.${table}`), !serviceOnlyTables.has(table), table);
  }

  assert.doesNotMatch(source, /grant\s+[^;]*\s+to\s+anon\b/i);
  const serviceGrant = source.match(/grant all privileges on table([\s\S]*?)to service_role;/i)?.[1] ?? '';
  for (const table of tables) assert.ok(serviceGrant.includes(`public.${table}`), table);
  assert.match(source, /grant all privileges on sequence[\s\S]*?to service_role;/i);
  assert.match(source, /alter default privileges[\s\S]*?on tables from public, anon, authenticated, service_role;/i);
  assert.match(source, /alter default privileges[\s\S]*?on sequences from public, anon, authenticated, service_role;/i);
});

test('future public tables must declare RLS and role grants in their creation migration', () => {
  const futureFiles = fs.readdirSync(migrationsDir)
    .filter((name) => name > trackMigrationName && name.endsWith('.sql'));

  for (const name of futureFiles) {
    const source = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
    for (const table of createdPublicTables(source)) {
      assert.match(source,
        new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i'),
        `${name}: enable RLS on ${table}`,
      );
      assert.match(source,
        new RegExp(`revoke[\\s\\S]*?on(?:\\s+table)?\\s+public\\.${table}[\\s\\S]*?from[\\s\\S]*?anon[\\s\\S]*?authenticated`, 'i'),
        `${name}: revoke browser grants on ${table}`,
      );
      assert.match(source,
        new RegExp(`grant[\\s\\S]*?on(?:\\s+table)?\\s+public\\.${table}[\\s\\S]*?to\\s+service_role`, 'i'),
        `${name}: explicitly grant ${table} to service_role`,
      );
    }
  }
});
