import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { CODES, normalizeError } from '../api/error-contract.js';
import { INTAKE_CLASSIFICATIONS, createIntakeAdapter, createIntakeResult } from '../api/intake-adapter.js';

const migration = fs.readFileSync('supabase/migrations/20261122055320_flexible_intake_staging_contract.sql', 'utf8');
const mcp = fs.readFileSync('api/mcp.js', 'utf8');

test('intake result preserves unknown fields and remains outside canonical data', () => {
  const adapter = createIntakeAdapter({ id: 'fixture', version: '1', formats: ['CSV'], parse: () => createIntakeResult({ classification: 'UNMAPPED', unmapped_fields: ['new_field'] }) });
  const result = adapter.parse({});
  assert.equal(result.classification, 'UNMAPPED');
  assert.deepEqual(result.unmapped_fields, ['new_field']);
  assert.deepEqual(INTAKE_CLASSIFICATIONS, ['RAW', 'UNMAPPED', 'NEEDS_REVIEW', 'CREATE_PROPOSAL', 'PROPOSED', 'CANONICAL']);
});

test('staging migration contains required metadata and classifications', () => {
  for (const field of ['source_digest', 'source_media_type', 'parser_id', 'parser_version', 'reporting_period', 'correlation_id', 'contract_version', 'original_headers', 'original_values', 'normalized_values', 'detected_identifiers', 'mapping_confidence', 'unmapped_fields', 'parser_warnings', 'conflict_reason', 'proposed_entity', 'proposed_field', 'output_classification']) assert.match(migration, new RegExp(field));
  for (const classification of INTAKE_CLASSIFICATIONS) assert.match(migration, new RegExp("'" + classification + "'"));
  assert.doesNotMatch(migration, /insert into public\.(children|employees|daycares|payroll_records|bank_transactions)/i);
});

test('shared error envelope covers the controlled vocabulary', () => {
  assert.equal(CODES.size, 18);
  const envelope = normalizeError('READBACK_FAILED', { batch_id: 'b', processed_count: 1, unprocessed_count: 2, retry_safe: false, resume_available: true });
  for (const field of ['status', 'technical_code', 'correlation_id', 'batch_id', 'current_stage', 'processed_count', 'unprocessed_count', 'data_written', 'retry_safe', 'resume_available', 'next_action']) assert.ok(field in envelope);
  assert.equal(envelope.technical_code, 'READBACK_FAILED');
  assert.match(mcp, /normalizeError/);
});
