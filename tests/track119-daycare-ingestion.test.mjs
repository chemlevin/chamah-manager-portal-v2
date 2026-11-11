import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/20261111170000_track119_daycare_ingestion.sql', import.meta.url), 'utf8');
const fix = readFileSync(new URL('../supabase/migrations/20261111195638_track119b_daycare_matching_and_audit_fix.sql', import.meta.url), 'utf8');
const mcp = readFileSync(new URL('../api/mcp.js', import.meta.url), 'utf8');
const build = readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8');

test('daycare ingestion is staged, conflict checked and approval bound', () => {
  for (const tool of ['search_daycares','preview_daycare_import','request_daycare_import_approval','commit_daycare_import']) assert.match(mcp, new RegExp(`name:'${tool}'`));
  assert.match(migration, /DUPLICATE_IN_FILE/);
  assert.match(migration, /STALE_ROW_VERSION/);
  assert.match(migration, /LICENSE_NUMBER_CONFLICT/);
  assert.match(migration, /portal_consume_approval/);
  assert.match(migration, /status='COMMITTED'/);
  assert.doesNotMatch(mcp, /service_role|SUPABASE_SERVICE_ROLE_KEY/i);
});

test('TRACK119b uses stable identifiers, explicit skip and supported audit operations', () => {
  assert.match(fix, /matching_basis/);
  assert.match(fix, /STABLE_IDENTIFIER_CONFLICT/);
  assert.match(fix, /AMBIGUOUS_STABLE_IDENTIFIERS/);
  assert.match(fix, /then 'SKIP'/);
  assert.match(fix, /audit_operation:='MCP_CREATE'/);
  assert.match(fix, /audit_operation:='MCP_UPDATE'/);
  assert.doesNotMatch(fix, /'MCP_IMPORT'/);
  assert.match(fix, /portal_consume_approval/);
});

test('Preview Supabase selection is environment-scoped while Production retains its fallback', () => {
  assert.match(mcp, /process\.env\.CHAMAH_SUPABASE_URL/);
  assert.match(build, /CHAMAH_SUPABASE_URL and CHAMAH_SUPABASE_PUBLISHABLE_KEY must be configured together/);
  assert.match(build, /replaceAll\(productionUrl, previewSupabaseUrl\)/);
});
