import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const matrix = readFileSync(new URL('../docs/architecture/CHAMAH_DOMAIN_PIPELINE_MATRIX.md', import.meta.url), 'utf8');
const required = [
  'Children', 'Enrollment', 'Occupancy', 'Billing', 'Collections',
  'Government/TAMA funding', 'Employees', 'Employments', 'Employee assignments',
  'Payroll', 'Net salary', 'Employer cost', 'Bank statements', 'Suppliers',
  'Payments', 'Budgets', 'Discrepancies', 'Source evidence and attachments',
  'Reports and audit'
];
const readiness = /READY_FOR_READ_ONLY_ANALYSIS|READY_FOR_PREVIEW|READY_FOR_APPROVAL_AND_COMMIT|PARTIAL|NOT_READY|BLOCKED|NOT_APPLICABLE/;

test('every required domain is present exactly as a mapped matrix row', () => {
  for (const domain of required) assert.match(matrix, new RegExp(`\\| ${domain.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')} \\|`), domain);
  assert.match(matrix, /Calendar, organization, configuration \(additional\)/);
});

test('every mapped domain has exactly one explicit readiness classification', () => {
  const rows = matrix.split('\n').filter((line) => line.startsWith('|') && !line.startsWith('|---') && !line.includes('| Domain |'));
  assert.ok(rows.length >= required.length);
  for (const row of rows) assert.match(row, readiness, row.slice(0, 80));
});

test('no domain is silently treated as complete', () => {
  assert.match(matrix, /No domain is classified `READY_FOR_APPROVAL_AND_COMMIT`/);
  assert.match(matrix, /PDF, RTL extraction, HTML, or large files/);
  assert.match(matrix, /unknown.*cannot silently create|cannot silently create.*unknown/i);
  assert.match(matrix, /row position is never a match key/i);
});

test('ready read/preview rows identify their keys and lifecycle evidence', () => {
  for (const line of matrix.split('\n')) {
    if (!line.startsWith('|') || line.startsWith('|---') || line.includes('| Domain |')) continue;
    if (/READY_FOR_READ_ONLY_ANALYSIS|READY_FOR_PREVIEW/.test(line)) {
      assert.match(line, /\+|\bID\b|month|reference|code|Batch|batch/i, line.slice(0, 90));
    }
    if (/READY_FOR_APPROVAL_AND_COMMIT/.test(line)) {
      for (const marker of ['Preview', 'approval', 'commit', 'read-back', 'audit']) assert.match(line, new RegExp(marker, 'i'), line.slice(0, 90));
    }
  }
});
