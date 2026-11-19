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
  assert.equal(request.rows[0].values.source_payload.page, 2);
  assert.equal(request.rows[0].values.source_payload.source_row, 11);
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
