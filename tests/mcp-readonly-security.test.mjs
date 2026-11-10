import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../supabase/functions/portal-mcp-server/index.ts', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/migrations/20261109_mcp_readonly_scoped_rpcs.sql', import.meta.url), 'utf8');

test('legacy Edge MCP endpoint remains scoped and contains no privileged key', () => {
  assert.match(server, /name: "list_my_daycares"/);
  assert.match(server, /name: "list_staff_by_daycare"/);
  assert.match(server, /method === "tools\/list"/);
  assert.match(server, /method !== "tools\/call"/);
  assert.doesNotMatch(server, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
  assert.match(server, /Authorization: auth/);
  assert.match(server, /auth\/v1\/user/);
  assert.match(server, /uuid\.test\(args\.daycare_id\)/);
  assert.match(server, /Object\.keys\(args\)\.length === 1/);
});

test('Both RPCs enforce active user, screen and daycare scope', () => {
  for (const fn of ['portal_mcp_list_daycares', 'portal_mcp_staff_by_daycare']) {
    const start = sql.indexOf('create or replace function public.' + fn);
    assert.ok(start >= 0, fn);
    const next = sql.indexOf('revoke all on function', start);
    const body = sql.slice(start, next);
    assert.match(body, /auth\.uid\(\) is not null/);
    assert.match(body, /p\.is_active/);
    assert.match(body, /portal_effective_permission/);
    assert.match(body, /dashboards\.staffing\.employees/);
    assert.match(body, /portal_user_daycares/);
    assert.match(body, /permission_configuration_id/);
  }
  assert.match(sql, /revoke all on function public\.portal_mcp_list_daycares\(\) from public, anon/);
  assert.match(sql, /revoke all on function public\.portal_mcp_staff_by_daycare\(uuid\) from public, anon/);
});

test('legacy scoped RPC source does not modify existing policies, data, or payroll logic', () => {
  assert.doesNotMatch(sql, /\b(drop|truncate|delete|update|alter policy|create policy)\b/i);
  assert.doesNotMatch(server, /\b(insert|update|delete)\b/i);
});
