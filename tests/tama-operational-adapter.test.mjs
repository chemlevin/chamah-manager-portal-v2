import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { buildOperationalPreviewRequest, CONTRACT_VERSION } = require('../lib/tama-operational-adapter.js');

const movement = (type, extra = {}) => ({
  movement_type: type,
  national_id: '238750186',
  amount: 100,
  report_month: '2026-09-01',
  entitlement_month: '2026-09-01',
  source_provenance: { filename: 'September-2026.pdf', page: 2, source_row: 11, raw_tokens: [{ text: '238750186', xMin: 390 }], extraction_method: 'pdf-word-coordinates' },
  original_payload: { raw_text: 'source row' },
  reason_code: type,
  confidence: 'HIGH',
  ...extra
});

test('builds contract 1.0.0 rows with national-ID identity and full lineage', () => {
  const request = buildOperationalPreviewRequest([{ status: 'PARSED_READ_ONLY', source_provenance: { filename: 'September-2026.pdf' }, movements: [movement('REGULAR')] }]);
  assert.equal(request.contract_version, CONTRACT_VERSION);
  assert.equal(request.rows[0].entity, 'government_funding_records');
  assert.equal(request.rows[0].values.national_id, '238750186');
  assert.equal(request.rows[0].values.source_payload.contributing_source_rows[0].page, 2);
  assert.equal(request.rows[0].values.source_payload.contributing_source_rows[0].source_row, 11);
  assert.equal(request.canonical_writes, false);
  assert.match(request.idempotency_key, /^tama-preview-/);
});

test('preserves movement categories and reports unresolved rows without dropping them', () => {
  const report = { movements: [movement('REGULAR'), movement('RETRO'), movement('REFUND'), movement('OFFSET_OR_DEDUCTION'), movement('CANCELLATION'), movement('ADJUSTMENT'), { movement_type: 'REGULAR', amount: 5 }] , exceptions: [{ code: 'UNRESOLVED_CHILD_ID' }] };
  const request = buildOperationalPreviewRequest([report]);
  assert.deepEqual(request.rows.map(row => row.values.movement_type), ['REGULAR', 'RETRO', 'REFUND', 'OFFSET_OR_DEDUCTION', 'CANCELLATION', 'ADJUSTMENT']);
  assert.equal(request.unresolved.length, 2);
  assert.equal(request.source_provenance.unresolved_count, 2);
});

test('does not match by row position and rejects missing national ID', () => {
  const request = buildOperationalPreviewRequest([{ movements: [movement('REGULAR', { national_id: null })] }]);
  assert.equal(request.rows.length, 0);
  assert.equal(request.unresolved[0].reason, 'MISSING_NATIONAL_ID');
});

test('normalizes missing TAMA amounts to numeric zero with source evidence', () => {
  const report = { status: 'PARSED_READ_ONLY', source_provenance: { filename: 'September-2026.pdf' }, movements: [
    { national_id: '238750186', movement_type: 'REGULAR', amount: null, original_payload: { numeric_values: { ministry_with_refund: { raw: null } } }, source_provenance: { filename: 'September-2026.pdf', page: 1, source_row: 1, raw_tokens: [{ text: '' }] } }
  ] };
  const request = buildOperationalPreviewRequest([report]);
  assert.equal(request.rows.length, 1);
  assert.equal(request.rows[0].values.amount, 0);
  assert.equal(request.unresolved.length, 0);
  assert.equal(request.rows[0].values.source_payload.contributing_source_rows[0].raw_payload.numeric_values.ministry_with_refund.raw, null);
  assert.equal(request.canonical_writes, false);
});

test('aggregates complementary same-child month rows while preserving contributors', () => {
  const a = movement('REGULAR', { amount: 100, source_provenance: { filename: 'October-2026-1.pdf', page: 1, source_row: 4 }, original_payload: { raw_text: '100' } });
  const b = movement('REGULAR', { amount: 25, source_provenance: { filename: 'October-2026-2.pdf', page: 2, source_row: 9 }, original_payload: { raw_text: '25' } });
  const request = buildOperationalPreviewRequest([{ source_provenance: { filename: 'October-2026-1.pdf' }, movements: [a] }, { source_provenance: { filename: 'October-2026-2.pdf' }, movements: [b] }]);
  assert.equal(request.rows.length, 1);
  assert.equal(request.rows[0].values.amount, 125);
  assert.equal(request.rows[0].values.source_payload.source_record_ids.length, 2);
  assert.equal(request.source_provenance.source_row_count, 2);
  assert.equal(request.canonical_writes, false);
});
