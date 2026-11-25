'use strict';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DOMAIN_KEYS = {
  child: ['child_id', 'national_id', 'first_name', 'last_name'],
  enrollment: ['child_enrollment_id', 'child_id', 'daycare_id', 'enrollment_month'],
  billing: ['daycare_billing_record_id', 'child_id', 'billing_month', 'amount_due'],
  collection: ['collection_receipt_id', 'daycare_billing_record_id', 'receipt_date', 'amount'],
  government: ['government_funding_record_id', 'government_funding_report_id', 'funding_month', 'amount'],
  payroll: ['payroll_record_id', 'source_record_identifier', 'payroll_month', 'gross_pay'],
  payrollAllocation: ['payroll_allocation_id', 'payroll_record_id', 'allocation_unit_id', 'allocation_amount'],
  bank: ['bank_transaction_id', 'source_fingerprint', 'transaction_date', 'amount'],
  bankAllocation: ['bank_allocation_id', 'bank_transaction_id', 'budget_month', 'allocation_amount'],
  occupancy: ['daycare_monthly_occupancy_id', 'daycare_id', 'reporting_month', 'age_group_id', 'children_count'],
  budget: ['budget_category_id', 'budget_rule_id', 'budget_month', 'numeric_value'],
};

const ENTITY_BY_KEY = {
  child: 'children', enrollment: 'child_enrollments', billing: 'daycare_billing_records',
  collection: 'collection_receipts', government: 'government_funding_records', payroll: 'payroll_records',
  payrollAllocation: 'payroll_allocations', bank: 'bank_transactions', bankAllocation: 'bank_allocations',
  occupancy: 'daycare_monthly_occupancy', budget: 'budget_rules',
};

function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function hasAny(row, keys) { return keys.some((key) => row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== ''); }
const REQUIRED_FIELDS = {
  child: ['national_id'], enrollment: ['child_id', 'daycare_id', 'enrollment_month'], billing: ['child_id', 'daycare_id', 'billing_month', 'amount_due'],
  collection: ['daycare_billing_record_id', 'receipt_date', 'amount'], government: ['government_funding_report_id', 'funding_month', 'amount'],
  payroll: ['source_record_identifier', 'payroll_month', 'gross_pay'], payrollAllocation: ['payroll_record_id', 'allocation_unit_id', 'allocation_amount'],
  bank: ['source_fingerprint', 'transaction_date', 'amount'], bankAllocation: ['bank_transaction_id', 'budget_month', 'allocation_amount'],
  occupancy: ['daycare_id', 'reporting_month', 'age_group_id', 'children_count'], budget: ['budget_rule_id', 'numeric_value'],
};
function sourceEvidence(raw, rowNumber) {
  const values = object(raw.values || raw.record || raw.data || raw);
  return { source_row: rowNumber, source_row_number: rowNumber, raw_source: raw, original_payload: raw.original_payload || raw.raw || raw, source_file: raw.source_file || raw.source_filename || values.source_file || null, source_sheet: raw.source_sheet || raw.sheet || values.source_sheet || null, source_batch_id: raw.source_batch_id || values.source_batch_id || null, source_record_id: raw.source_record_id || values.source_record_id || null, reporting_month: raw.reporting_month || raw.month || values.reporting_month || values.month || null, source_fingerprint: raw.source_fingerprint || values.source_fingerprint || null };
}

function discrepancy(raw, rowNumber, reason) {
  return { entity: 'child_discrepancies', values: { discrepancy_type: 'INGESTION_UNRESOLVED', severity: 'ERROR', status: 'OPEN', evidence: { reason, source_row: rowNumber }, source_payload: raw }, ...sourceEvidence(raw, rowNumber), classification: 'NEEDS_REVIEW', stable_identifiers: {} };
}

function fanOutRow(input, index = 0) {
  const raw = object(input);
  const values = object(raw.values || raw.record || raw.data || raw);
  const rowNumber = Number(raw.row_number || raw.source_row || index + 1);
  if (raw.entity) return [{ ...raw, values: { ...values }, ...sourceEvidence(raw, rowNumber) }];

  const rows = [];
  for (const [key, entity] of Object.entries(ENTITY_BY_KEY)) {
    if (REQUIRED_FIELDS[key].every((field) => hasAny(values, [field]))) rows.push({ entity, values: { ...values }, ...sourceEvidence(raw, rowNumber), stable_identifiers: {}, classification: 'CREATE_PROPOSAL' });
  }
  if (!rows.length) return [discrepancy(raw, rowNumber, 'No canonical entity could be classified with certainty')];
  return rows;
}

function fanOutRows(rows = []) { return rows.flatMap((row, index) => fanOutRow(row, index)); }

const DETERMINISTIC = {
  children: ['national_id'],
  child_enrollments: ['child_id', 'daycare_id', 'enrollment_month'],
  daycare_billing_records: ['child_id', 'daycare_id', 'billing_month'],
  collection_receipts: ['source_system', 'source_record_id'],
  government_funding_records: ['government_funding_report_id', 'child_id', 'funding_month'],
  payroll_records: ['source_record_identifier'],
  payroll_allocations: ['payroll_record_id', 'allocation_unit_id'],
  bank_transactions: ['source_fingerprint'],
  bank_allocations: ['bank_transaction_id', 'allocation_unit_id', 'budget_month'],
  daycare_monthly_occupancy: ['daycare_id', 'reporting_month', 'age_group_id'],
  budget_rules: ['budget_rule_id'],
};

function hasValue(value) { return value !== undefined && value !== null && String(value).trim() !== ''; }
function splitFanOutRows(rows = []) {
  const canonical_proposals = [];
  const review_items = [];
  for (const row of rows) {
    const fields = DETERMINISTIC[row.entity] || [];
    const values = object(row.values);
    const missing = fields.filter((field) => !hasValue(values[field]));
    if (row.entity === 'child_discrepancies' || row.classification === 'NEEDS_REVIEW' || missing.length) {
      review_items.push({
        ...row,
        reason: row.entity === 'child_discrepancies' ? row.values?.evidence?.reason || 'Unresolved source row' : `Missing deterministic identifier fields: ${missing.join(', ')}`,
        candidate_matches: row.candidate_matches || [],
        required_information: missing.length ? missing : ['verified canonical match'],
      });
    } else canonical_proposals.push(row);
  }
  return { canonical_proposals, review_items };
}

module.exports = { fanOutRow, fanOutRows, splitFanOutRows, discrepancy };
