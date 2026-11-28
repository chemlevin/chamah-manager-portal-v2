# CHAMAH Production CPU incident — 2026-11-28

## Status

Resolved and closed. Production Supabase project: `vyyfuaqmbxvfqgbfqooc`.

## Root cause

Public/private business-validation functions raised SQLSTATE `40001`. PostgREST 14.5 treated that serialization-failure code as retryable and internally repeated the RPC transaction. This caused approximately 958 setup transactions per second, almost one rollback per execution, and high CPU despite sparse external Vercel, Edge, and MCP request volumes.

## Repair and prevention

- Forward-only migration replaced business-validation `40001` codes with non-retryable `P0001`, preserving messages, authorization, grants, RLS, audit, approval, concurrency, idempotency, and business logic.
- DDL-time event trigger rejects any future public/private function containing `ERRCODE = '40001'`. It runs only after `CREATE FUNCTION`, not on request paths.
- Private view `private.portal_database_health_counters` exposes cumulative transaction, rollback, temporary-I/O, incident-query, and aborted-authenticator counters on demand. Access is revoked from `public`, `anon`, and `authenticated`; only `service_role` can select it.
- Existing native Supabase CPU alert (>80%) remains enabled. Saved Production notebook `96a65ad9-0f35-450c-b8d7-7148f5a24982` correlates that CPU signal with database counters without scheduled polling.

## Verification

- Preview guard probe failed with `P0001` and rolled back as designed.
- Focused role-boundary, calculation-rule routing, repair, guard, and monitoring tests passed 13/13 under verified Production runtime configuration.
- Production at 2026-11-28 17:14:41 UTC: incident counter `198792899`; rollbacks `198729735`; aborted authenticator sessions `0`; forbidden business functions `0`; guard enabled.
- Protected counts unchanged before/after monitoring deployment: auth users 6; daycares 7; children 439; employees 144; suppliers 0; bank accounts 5; bank transactions 247; payroll records 264; calculation rules 77; calculation-rule change batches 99; portal approvals 338; audit events 10466.
- No statistics reset, index changes, compute upgrade, frontend deployment, Edge Function deployment, or business-data write occurred.

## Monitoring procedure

Use the saved Supabase notebook and compare two counter samples:

`rate = (new_value - old_value) / elapsed_seconds`

Investigate any increase in `incident_retry_setup_calls`, any non-zero `aborted_authenticator_sessions`, a sustained rollback-rate departure from baseline, or a renewed CPU alert. Do not reset PostgreSQL statistics.
