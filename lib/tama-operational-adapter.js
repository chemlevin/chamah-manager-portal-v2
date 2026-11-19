'use strict';

const crypto = require('node:crypto');

const CONTRACT_VERSION = '1.0.0';
const ENTITY = 'government_funding_records';
const MOVEMENT_TYPES = new Set([
  'REGULAR', 'RETRO', 'RETRO_ADJUSTMENT_NEGATIVE', 'OFFSET_OR_DEDUCTION',
  'REFUND', 'CANCELLATION', 'ADJUSTMENT', 'NEGATIVE_UNCLASSIFIED'
]);

function canonical(value) {
  return JSON.stringify(value, Object.keys(value).sort());
}

function digest(value) {
  return crypto.createHash('sha256').update(canonical(value)).digest('hex');
}

function idempotencyKey(sourceDigest) {
  return `tama-preview-${sourceDigest}`;
}

function lineage(movement, sourceFile) {
  const source = movement.source_provenance || {};
  return {
    source_file: source.filename || sourceFile,
    filename: source.filename || sourceFile,
    page: source.page ?? null,
    source_row: source.source_row ?? null,
    raw_tokens: source.raw_tokens || [],
    raw_payload: movement.original_payload || null,
    extraction_method: source.extraction_method || null,
    coordinates: source.coordinates || null,
    report_month: movement.report_month || null,
    entitlement_month: movement.entitlement_month || null,
    retro_months: movement.retro_months || [],
    movement_type: movement.movement_type || null,
    reason_code: movement.reason_code || null,
    confidence: movement.confidence || null
  };
}

function movementRow(movement, sourceFile, reportIndex, movementIndex) {
  if (!movement.national_id) {
    return { status: 'UNRESOLVED', reason: 'MISSING_NATIONAL_ID', movement, report_index: reportIndex, movement_index: movementIndex };
  }
  if (!MOVEMENT_TYPES.has(movement.movement_type)) {
    return { status: 'UNRESOLVED', reason: 'UNSUPPORTED_MOVEMENT_TYPE', movement, report_index: reportIndex, movement_index: movementIndex };
  }
  const source = lineage(movement, sourceFile);
  const sourceRecordId = `${sourceFile}:${source.page ?? 0}:${source.source_row ?? movementIndex}`;
  return {
    operation: 'CREATE',
    entity: ENTITY,
    record_id: null,
    values: {
      national_id: String(movement.national_id),
      amount: movement.amount ?? null,
      funding_month: movement.entitlement_month || movement.report_month || null,
      movement_type: movement.movement_type,
      source_system: 'TAMA_GOVERNMENT_FUNDING',
      source_record_id: sourceRecordId,
      source_file: sourceFile,
      report_month: movement.report_month || null,
      entitlement_month: movement.entitlement_month || null,
      retro_months: movement.retro_months || [],
      grade: movement.grade || null,
      source_payload: source,
      original_values: movement.original_payload || null
    }
  };
}

function buildOperationalPreviewRequest(reports, options = {}) {
  if (!Array.isArray(reports) || reports.length === 0) throw new TypeError('At least one parsed TAMA report is required');
  const rows = [];
  const unresolved = [];
  const reportProvenance = [];
  reports.forEach((report, reportIndex) => {
    const sourceFile = report.source_provenance?.filename || report.report_header?.source_filename || options.sourceFile || `tama-report-${reportIndex + 1}.pdf`;
    reportProvenance.push({ source_file: sourceFile, report_header: report.report_header || {}, parser_status: report.status });
    (report.movements || []).forEach((movement, movementIndex) => {
      const row = movementRow(movement, sourceFile, reportIndex, movementIndex);
      if (row.status === 'UNRESOLVED') unresolved.push(row);
      else rows.push(row);
    });
    (report.exceptions || []).forEach(exception => unresolved.push({ status: 'UNRESOLVED', reason: exception.code, exception }));
  });
  const sourceProvenance = {
    source_system: 'TAMA_GOVERNMENT_FUNDING',
    parser: 'tama-coordinate-aware',
    parser_version: '1.0.0',
    contract_version: CONTRACT_VERSION,
    reports: reportProvenance,
    unresolved_count: unresolved.length,
    canonical_writes: false
  };
  const payload = { contract_version: CONTRACT_VERSION, rows, source_provenance: sourceProvenance };
  const previewDigest = digest(payload);
  return {
    contract_version: CONTRACT_VERSION,
    rows,
    source_name: options.sourceName || 'TAMA 2026 reports',
    source_provenance: { ...sourceProvenance, preview_digest: previewDigest },
    idempotency_key: options.idempotencyKey || idempotencyKey(previewDigest),
    preview_digest: previewDigest,
    unresolved,
    canonical_writes: false
  };
}

module.exports = { CONTRACT_VERSION, buildOperationalPreviewRequest, digest, idempotencyKey };
