import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const contract = read('../docs/architecture/TRACK104-unified-ingestion-contract.md');
const bankMigration = read('../supabase/migrations/20260917082920_track030b_bank_upload_history.sql');
const employeeMigration = read('../supabase/migrations/20260727041915_track025d_employee_excel_import.sql');
const payrollPrivilegeMigration = read('../supabase/migrations/20260727103035_track026_revoke_payroll_rpc_browser_execute.sql');
const ingestionSchema = read('../supabase/migrations/20260713140119_import_audit_and_data_quality.sql');

test('contract requires authorization on every action and commit-time revocation checks', () => {
  assert.match(contract, /current permissions govern every subsequent read and action/i);
  assert.match(contract, /Revocation immediately blocks preview detail, approval, and commit/i);
  assert.match(contract, /Direct access by UUID must return not found or forbidden/i);
  assert.match(contract, /callers cannot supply trusted actor IDs/i);
});

test('contract freezes preview, approval, and commit sequencing', () => {
  const preview = contract.indexOf('3. **Preview**');
  const approval = contract.indexOf('5. **Approval**');
  const commit = contract.indexOf('6. **Commit**');
  assert.ok(preview >= 0 && approval > preview && commit > approval);
  assert.match(contract, /Approval binds `batch_id`, `batch_version`, `preview_digest`/);
  assert.match(contract, /Editing mappings, source scope, parsed fields, or issue decisions invalidates prior approval/i);
  assert.match(contract, /Commit rechecks current permission and scope/i);
});

test('contract preserves exact duplicate rejection and requires reviewed possible duplicates', () => {
  assert.match(contract, /pilot must not change the current exact duplicate definition/i);
  assert.match(contract, /Exact duplicates are rejected but retained in lineage/i);
  assert.match(contract, /possible duplicates require review and are not auto-accepted/i);
  assert.match(contract, /database unique constraint.*final race-condition guard/i);
});

test('contract requires complete row lineage and durable quality review', () => {
  for (const marker of [
    'source object + digest',
    'import_batch + parser/version + scope',
    'import_row + physical row identity + row fingerprint',
    'approval/disposition',
    'canonical entity + domain audit event',
  ]) assert.ok(contract.includes(marker), marker);

  assert.match(contract, /Persist a `data_quality_issues` row for every actionable CRITICAL or WARNING result/);
  assert.match(contract, /APPROVED_IGNORE.*approver\/reason\/time metadata/i);
  assert.match(contract, /Every physical source row is queryable through permitted batch lineage/i);
  assert.match(ingestionSchema, /create table public\.import_rows/i);
  assert.match(ingestionSchema, /create table public\.data_quality_issues/i);
});

test('existing domain commit RPCs remain service-only', () => {
  assert.match(bankMigration, /revoke all on function public\.portal_confirm_bank_import[\s\S]*from public, anon, authenticated/i);
  assert.match(bankMigration, /grant execute on function public\.portal_confirm_bank_import[\s\S]*to service_role/i);
  assert.match(employeeMigration, /revoke all on function public\.portal_import_employees[\s\S]*from public, anon, authenticated/i);
  assert.match(employeeMigration, /grant execute on function public\.portal_import_employees[\s\S]*to service_role/i);
  assert.match(payrollPrivilegeMigration, /revoke execute on function public\.portal_save_payroll_rows_v2[\s\S]*from public, anon, authenticated/i);
  assert.match(payrollPrivilegeMigration, /grant execute on function public\.portal_save_payroll_rows_v2[\s\S]*to service_role/i);
});

test('Phase 0 contract forbids generic writers and preserves the current Bank path', () => {
  assert.match(contract, /never a table name/i);
  assert.match(contract, /No caller may provide arbitrary SQL, target table, actor ID/i);
  assert.match(contract, /Keep `portal_confirm_bank_import` available/i);
  assert.match(contract, /No operational change/i);
});
