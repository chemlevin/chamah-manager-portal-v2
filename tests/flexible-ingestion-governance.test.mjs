import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const rules = fs.readFileSync('docs/architecture/CHAMAH_SYSTEM_RULES.md', 'utf8');
const contract = fs.readFileSync('docs/architecture/FLEXIBLE_INTAKE_ADAPTER_CONTRACT.md', 'utf8');
const change = fs.readFileSync('docs/architecture/CHANGE_CONTROL.md', 'utf8');
const matrix = fs.readFileSync('docs/architecture/CHAMAH_DOMAIN_PIPELINE_MATRIX.md', 'utf8');
const mcp = fs.readFileSync('api/mcp.js', 'utf8');

test('flexible intake keeps the stable safety core', () => {
  for (const term of ['Flexible ingestion, stable safety core', 'Technical intake', 'RAW/source evidence', 'UNMATCHED/UNMAPPED/NEEDS_REVIEW', 'PROPOSED', 'CANONICAL', 'uncontrolled route']) assert.match(rules, new RegExp(term.replaceAll('/', '\\/')));
  assert.match(change, /adapters under the same safety core/);
});

test('adapter contract preserves partial understanding without canonicalizing it', () => {
  for (const field of ['source format', 'supported variant', 'header detection', 'RTL', 'date and amount parsing', 'stable identifiers', 'mapping confidence', 'warnings', 'unmapped fields', 'output classification', 'parser failure']) assert.match(contract, new RegExp(field, 'i'));
  for (const classification of ['RAW', 'UNMAPPED', 'NEEDS_REVIEW', 'CREATE_PROPOSAL', 'PROPOSED', 'CANONICAL']) assert.match(contract, new RegExp('`' + classification + '`'));
  assert.match(contract, /Row position is never identity/);
  assert.match(contract, /does not currently prove dedicated first-class columns/);
});

test('mapping and runtime guard references are explicit', () => {
  assert.match(matrix, /FLEXIBLE_INTAKE_ADAPTER_CONTRACT/);
  assert.match(matrix, /RAW\/source evidence/);
  assert.match(mcp, /LEGACY_MUTATION_BLOCKED/);
  assert.match(mcp, /data_written/);
});

test('required structured error vocabulary is governed', () => {
  for (const code of ['FILE_TOO_LARGE', 'INVALID_FORMAT', 'PARSE_FAILED', 'RTL_OR_PDF_PARSE_FAILED', 'MISSING_IDENTIFIER', 'AMBIGUOUS_MATCH', 'DUPLICATE_ROW', 'UNKNOWN_ENTITY', 'UNMAPPED_FIELD', 'NEW_ENTITY_PROPOSAL', 'NEEDS_REVIEW', 'PERMISSION_DENIED', 'WRONG_ENVIRONMENT', 'UNKNOWN_COMMIT_STATE', 'READBACK_FAILED', 'RETRY_REQUIRED', 'RESUME_AVAILABLE', 'LEGACY_MUTATION_BLOCKED']) assert.match(rules, new RegExp('`' + code + '`'));
});
