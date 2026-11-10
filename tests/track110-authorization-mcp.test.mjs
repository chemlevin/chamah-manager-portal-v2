import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/20261110123552_track110_authorization_mcp.sql', import.meta.url), 'utf8');
const mcp = readFileSync(new URL('../api/mcp.js', import.meta.url), 'utf8');
const users = readFileSync(new URL('../supabase/functions/portal-users/index.ts', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../chamah-manager-portal/new/app.js', import.meta.url), 'utf8');

test('canonical authorization is role/action based, default deny and Director-only', () => {
  for (const table of ['portal_roles','portal_actions','portal_role_actions','portal_role_assignments']) assert.match(migration, new RegExp(`create table public\\.${table}`));
  assert.match(migration, /private\.portal_is_authorized/);
  assert.match(migration, /'DIRECTOR','מנהלת'/);
  assert.match(migration, /set is_active=\(user_id='3af86c7f-6ba4-41f4-8d7c-1db262cf3e79'/);
  assert.match(migration, /and exists\(select 1 from public\.portal_user_profiles p where p\.user_id=p_user_id and p\.is_active\)/);
  assert.doesNotMatch(migration, /delete from public\.portal_user_profiles/i);
});

test('MCP exposes closed semantic CRUD, bulk and file tools without service role', () => {
  for (const tool of ['create_policy','update_policy','request_policy_archive_approval','archive_policy','request_bulk_policy_archive_approval','bulk_archive_policies','upload_policy_file']) assert.match(mcp, new RegExp(`name:'${tool}'`));
  assert.match(mcp, /portal_my_authorization/);
  assert.match(mcp, /roles\?\.includes\('DIRECTOR'\)/);
  assert.doesNotMatch(mcp, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
  assert.doesNotMatch(mcp, /table_name|raw_sql|execute_sql/i);
});

test('sensitive actions use exact expiring one-time approvals and soft delete', () => {
  assert.match(migration, /expires_at>now\(\)/);
  assert.match(migration, /consumed_at is null/);
  assert.match(migration, /payload_digest=encode\(digest/);
  assert.match(migration, /status='RETIRED'/);
  assert.doesNotMatch(migration, /delete from public\.portal_policy_documents/i);
  assert.match(migration, /changed<>cardinality\(p_document_ids\)/);
});

test('uploads and downloads are private, constrained and audited', () => {
  assert.match(migration, /'policy-attachments','policy-attachments',false,10485760/);
  assert.match(migration, /allowed_mime_types/);
  assert.match(migration, /policy_attachments_director_insert/);
  assert.match(mcp, /bytes\.length>3\*1024\*1024/);
  assert.match(mcp, /portal_mcp_record_file/);
  assert.match(mcp, /name:'download_policy_file'/);
  assert.match(mcp, /storage\/v1\/object\/authenticated\/policy-attachments/);
  assert.doesNotMatch(mcp, /storage\/v1\/object\/public\/policy-attachments/);
});

test('legacy permissions UI is frozen and replaced by unified read-only status UX', () => {
  assert.match(users, /request\.method !== "GET"/);
  assert.match(users, /authorization_mode: "DIRECTOR_ONLY"/);
  assert.doesNotMatch(users, /auth\/v1\/invite/);
  assert.match(ui, /מודל הרשאה מאוחד/);
  assert.match(ui, /שינויי זהות והרשאה הוקפאו/);
});
