const INTAKE_CLASSIFICATIONS = Object.freeze(['RAW', 'UNMAPPED', 'NEEDS_REVIEW', 'CREATE_PROPOSAL', 'PROPOSED', 'CANONICAL']);

function createIntakeAdapter({ id, version, formats, parse }) {
  if (!id || !version || !Array.isArray(formats) || typeof parse !== 'function') throw new TypeError('Invalid intake adapter contract');
  return Object.freeze({ id, version, formats: Object.freeze([...formats]), parse });
}

function createIntakeResult(input = {}) {
  const classification = input.classification || 'RAW';
  if (!INTAKE_CLASSIFICATIONS.includes(classification)) throw new TypeError('Invalid intake classification');
  return {
    source: input.source || {}, original_headers: input.original_headers || [], original_rows: input.original_rows || [],
    normalized_values: input.normalized_values || [], detected_identifiers: input.detected_identifiers || [],
    confidence: input.confidence ?? null, warnings: input.warnings || [], unmapped_fields: input.unmapped_fields || [],
    conflicts: input.conflicts || [], proposed_mappings: input.proposed_mappings || [], proposed_entities: input.proposed_entities || [],
    classification, error: input.error || null
  };
}

module.exports = { INTAKE_CLASSIFICATIONS, createIntakeAdapter, createIntakeResult };
