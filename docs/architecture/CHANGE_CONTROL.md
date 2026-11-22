# Change Control

For every application or data change: identify exact branch/runtime, inspect affected code/tests, make the smallest change, run focused and applicable repository checks, record evidence in `PROJECT_LOG.md`, and state what was not verified. Do not deploy or modify Production without separate explicit authorization.

Canonical ingestion state machine: `PROPOSED → PREVIEWED → RECONCILED → APPROVED → COMMITTED → VERIFIED`.

Approval binds batch ID, content digest, contract version, row versions, actor, and idempotency key. Retry after an unknown commit checks batch status first; failed read-back cannot trigger blind recommit. Rollback is forward-only and evidence-led. No reset, truncate, broad delete, schema change, migration, identity change, or business-data cleanup is allowed in this recovery task.
