const CODES = new Set([
  "FILE_TOO_LARGE", "INVALID_FORMAT", "PARSE_FAILED", "RTL_OR_PDF_PARSE_FAILED",
  "MISSING_IDENTIFIER", "AMBIGUOUS_MATCH", "DUPLICATE_ROW", "UNKNOWN_ENTITY",
  "UNMAPPED_FIELD", "NEW_ENTITY_PROPOSAL", "NEEDS_REVIEW", "PERMISSION_DENIED",
  "WRONG_ENVIRONMENT", "UNKNOWN_COMMIT_STATE", "READBACK_FAILED", "RETRY_REQUIRED",
  "RESUME_AVAILABLE", "LEGACY_MUTATION_BLOCKED",
]);

export const errorEnvelope = (technicalCode: string, overrides: Record<string, unknown> = {}) => ({
  status: String(overrides.status || "BLOCKED"),
  technical_code: CODES.has(technicalCode) ? technicalCode : "PARSE_FAILED",
  correlation_id: String(overrides.correlation_id || crypto.randomUUID()),
  batch_id: overrides.batch_id ?? null,
  current_stage: String(overrides.current_stage || "REQUEST"),
  processed_count: Number.isInteger(overrides.processed_count) ? overrides.processed_count : 0,
  unprocessed_count: Number.isInteger(overrides.unprocessed_count) ? overrides.unprocessed_count : 0,
  data_written: overrides.data_written === true,
  retry_safe: overrides.retry_safe === true,
  resume_available: overrides.resume_available === true,
  next_action: String(overrides.next_action || "Review the issue and retry only when indicated."),
});

export const errorResponse = (technicalCode: string, status: number, message: string, overrides: Record<string, unknown> = {}) =>
  ({ ...errorEnvelope(technicalCode, overrides), message });
