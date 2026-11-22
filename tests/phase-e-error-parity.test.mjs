import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { CODES, normalizeError } from '../api/error-contract.js';

const mcp = fs.readFileSync('api/mcp.js', 'utf8');
const edgeLegacy = [
  'supabase/functions/portal-bank-workbench/index.ts',
  'supabase/functions/portal-bank-transfer-workbench/index.ts',
  'supabase/functions/portal-workforce-workbench/index.ts',
].map((file) => fs.readFileSync(file, 'utf8')).join('\n');

const requiredCodes = [
  'FILE_TOO_LARGE', 'INVALID_FORMAT', 'PARSE_FAILED', 'RTL_OR_PDF_PARSE_FAILED',
  'MISSING_IDENTIFIER', 'AMBIGUOUS_MATCH', 'DUPLICATE_ROW', 'UNKNOWN_ENTITY',
  'UNMAPPED_FIELD', 'NEW_ENTITY_PROPOSAL', 'NEEDS_REVIEW', 'PERMISSION_DENIED',
  'WRONG_ENVIRONMENT', 'UNKNOWN_COMMIT_STATE', 'READBACK_FAILED', 'RETRY_REQUIRED',
  'RESUME_AVAILABLE', 'LEGACY_MUTATION_BLOCKED',
];

test('synthetic recovery vocabulary produces a complete safe envelope', () => {
  assert.deepEqual([...CODES].sort(), [...requiredCodes].sort());
  for (const code of requiredCodes) {
    const envelope = normalizeError(code, {
      batch_id: 'synthetic-batch', current_stage: 'PREVIEW', processed_count: 2,
      unprocessed_count: 1, retry_safe: code === 'RETRY_REQUIRED',
      resume_available: code === 'RESUME_AVAILABLE',
      next_action: 'Inspect the batch status before retrying.',
    });
    for (const field of ['status', 'technical_code', 'correlation_id', 'batch_id', 'current_stage', 'processed_count', 'unprocessed_count', 'data_written', 'retry_safe', 'resume_available', 'next_action']) assert.ok(field in envelope);
    assert.equal(envelope.technical_code, code);
    assert.doesNotMatch(JSON.stringify(envelope), /token|secret|password|private_key/i);
  }
});

test('MCP recovery and legacy guards are wired before database dispatch', () => {
  assert.match(mcp, /normalizeError/);
  assert.match(mcp, /Retry with the same idempotency key after checking batch status/);
  assert.match(mcp, /LEGACY_MUTATION_BLOCKED/);
  assert.match(mcp, /DISPATCH_GUARD/);
  assert.match(mcp, /get_operational_batch_status/);
  assert.match(mcp, /get_operational_batch_page/);
});

test('Preview Edge legacy mutation responses carry the blocked classification', () => {
  assert.equal((edgeLegacy.match(/technical_code:\s*"LEGACY_MUTATION_BLOCKED"/g) || []).length, 3);
  for (const field of ['correlation_id', 'batch_id', 'current_stage', 'processed_count', 'unprocessed_count', 'data_written', 'retry_safe', 'resume_available', 'next_action']) assert.match(edgeLegacy, new RegExp(field));
});

test('portal and non-legacy Edge failure parity remains explicitly unproven', { skip: 'Existing portal/Edge handlers still emit surface-specific raw errors; runtime unification requires a separate implementation change.' }, () => {});
