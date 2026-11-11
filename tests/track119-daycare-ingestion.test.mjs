import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/20261111170000_track119_daycare_ingestion.sql', import.meta.url), 'utf8');
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

test('Preview Supabase selection is environment-scoped while Production retains its fallback', () => {
  assert.match(mcp, /process\.env\.CHAMAH_SUPABASE_URL/);
  assert.match(build, /CHAMAH_SUPABASE_URL and CHAMAH_SUPABASE_PUBLISHABLE_KEY must be configured together/);
  assert.match(build, /replaceAll\(productionUrl, previewSupabaseUrl\)/);
});
