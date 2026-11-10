import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/20261110143000_track112_data_management_readiness.sql', import.meta.url), 'utf8');
const mcp = readFileSync(new URL('../api/mcp.js', import.meta.url), 'utf8');

test('operational MCP is Director action-gated and closed to generic access', () => {
  for (const action of ['DATA.READ','DATA.ANALYZE','EMPLOYEE.CREATE','EMPLOYEE.UPDATE','EMPLOYEE.IMPORT']) assert.match(migration, new RegExp(action.replace('.', '\\.')));
  assert.match(migration, /private\.portal_require_action/);
  assert.doesNotMatch(mcp, /SUPABASE_SERVICE_ROLE_KEY|raw_sql|execute_sql|table_name/i);
  for (const tool of ['data_capabilities','search_operational_data','analyze_operational_data','find_employee_duplicates','create_employee','update_employee','import_employees']) assert.match(mcp, new RegExp(`name:'${tool}'`));
});

test('missing domains are explicit and never fabricated', () => {
  for (const domain of ['children','parents','suppliers','collections']) assert.match(migration, new RegExp(`'domain','${domain}','status','MISSING'`));
  assert.match(migration, /monthly_enrollment stores aggregate quantities only/);
  assert.match(migration, /legacy transfer workflow, not a canonical payments aggregate/);
});

test('employee writes validate duplicates, concurrency, audit and persisted results', () => {
  assert.match(migration, /duplicate employee identity/);
  assert.match(migration, /p_expected_row_version/);
  assert.match(migration, /employee changed; refresh required/);
  assert.match(migration, /MCP_CREATE/);
  assert.match(migration, /MCP_UPDATE/);
  assert.match(migration, /'verified',exists/);
  assert.match(migration, /'verified_count'/);
});

test('bulk import is bounded and large work is declared asynchronous', () => {
  assert.match(migration, /jsonb_array_length\(p_rows\) not between 1 and 100/);
  assert.match(mcp, /args\.rows\.length>100/);
  assert.match(migration, /DURABLE_QUEUE_REQUIRED/);
});

