# Flexible Intake Adapter Contract

Status: permanent subordinate contract under `CHAMAH_SYSTEM_RULES.md`; no schema or runtime route is implied.

## Adapter result

Every adapter accepts a source descriptor and returns a bounded result with:

- source format and supported variant;
- source filename, digest, type, domain/report guess, and reporting period;
- header detection result, original headers, source row, original row values, and source payload;
- normalized values and detected stable identifiers;
- proposed entity/field, mapping confidence, parser warnings, unmapped fields, and conflict reason;
- parser/contract version and correlation ID;
- output classification: `RAW`, `UNMAPPED`, `NEEDS_REVIEW`, `CREATE_PROPOSAL`, `PROPOSED`, or `CANONICAL`.

## Format behavior

CSV, XLS/XLSX, PDF, HTML, structured payload, and portal/manual input are accepted only when an implementation explicitly supports that variant. Header detection must tolerate changed order and safely report changed, missing, or added columns. RTL and PDF extraction failures return `RTL_OR_PDF_PARSE_FAILED`; other parser failures return `PARSE_FAILED`. Date and amount parsing must be locale-aware and report ambiguity. Hebrew normalization must be loss-aware: original values remain available. Large files are bounded and return `FILE_TOO_LARGE` rather than partial silent loss.

## Identity and mapping

Adapters extract stable source IDs where available and use domain keys defined in the domain matrix. Row position is never identity. Missing, ambiguous, duplicate, wrong-period, or wrong-entity matches remain review/conflict results. Unknown entities become `CREATE_PROPOSAL` or `NEEDS_REVIEW`; they are never inserted automatically. Unknown fields remain in source evidence/unmapped output and require a controlled extension proposal before canonical use.

## Storage boundary

The existing `import_batches`/`import_rows`/`data_quality_issues` and staged MCP batch mechanisms are the available safe storage primitives. They preserve raw/parsed payloads, source row identity, validation status, and issue lineage. The repository does not currently prove dedicated first-class columns for every adapter metadata item above (for example original headers, confidence, unmapped-field arrays, and correlation ID across every path). This is an explicit additive storage proposal, not a migration: extend the existing safe staging mechanism only after separate schema authorization and compatibility review.

## Safety and errors

An adapter never creates an approval, commits a business row, bypasses reconciliation, or dispatches a legacy write. It returns the common envelope from `CHAMAH_SYSTEM_RULES.md`, with the relevant code such as `INVALID_FORMAT`, `MISSING_IDENTIFIER`, `UNMAPPED_FIELD`, `NEW_ENTITY_PROPOSAL`, or `NEEDS_REVIEW`. Partial understanding is returned when safe; otherwise the source remains RAW with a parser error and next action.
