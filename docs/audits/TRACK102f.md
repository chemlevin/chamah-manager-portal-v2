# TRACK102f — SUPER_ADMIN Acceptance & OAuth Cleanup Audit

Date: 2026-11-10  
Environment: canonical Production (`https://chamah-portal.vercel.app`) and linked Supabase project  
Result: PASS with historical cleanup awaiting approval

## Scope and safeguards

One uniquely tagged disposable Production Auth identity was created. Its portal profile was active and `is_super_admin = true`, with `scope_mode = SELECTED`, `mcp_full_read_access = false`, no explicit screen-permission rows, and no daycare or allocation-unit assignments. No existing user, permission, business record, application code, Auth setting, migration, Edge Function, or deployment was changed.

OAuth codes, tokens, refresh tokens, passwords, PKCE verifiers, state values, employee names, and daycare identifiers were kept in memory and are not included in this report or repository.

## SUPER_ADMIN acceptance results

| Test | Expected | Result |
| --- | --- | --- |
| Minimum scope | Zero explicit permissions and daycare assignments | PASS — 0 permission rows, 0 daycare rows |
| OAuth authorization | Fresh state and PKCE S256 through HTTPS relay | PASS |
| Token validation | `authenticated` audience, correct issuer, positive lifetime no greater than 3600 seconds | PASS — 3600 seconds |
| MCP initialization | Protocol request accepted | PASS — HTTP 200 |
| Tool discovery | Only the four approved read-only tools | PASS |
| Fabricated write | Rejected | PASS |
| Administrative daycare read | All current daycares | PASS — 7/7 |
| Administrative staffing read | Authorized read response | PASS |
| Refresh before revocation | New token pair issued | PASS |
| SUPER_ADMIN revocation with existing token | Current database permissions take effect immediately | PASS — visible daycares changed from 7 to 0 |
| Refresh after role revocation | Refresh may succeed, but access remains restricted | PASS — 0 visible daycares |
| Inactive profile with existing token | MCP blocked | PASS — HTTP 403 |
| Deleted identity access token | MCP blocked | PASS — HTTP 401 |
| Deleted identity refresh token | Refresh blocked | PASS — HTTP 400 |

The result confirms that the MCP authorization path reads current server-side portal state rather than relying solely on stale token claims. SUPER_ADMIN grants organization-wide MCP read access, but it does not add write tools. Removing SUPER_ADMIN takes effect for an already-issued access token. Deactivating the profile blocks MCP initialization, and deleting the Auth identity invalidates refresh capability and causes the MCP Auth user check to fail.

## Cleanup verification

The disposable identity's portal permission, daycare, allocation-unit, profile, and Auth records were deleted in dependency order. Post-cleanup verification returned:

- TRACK102f-tagged Auth users: 0
- Orphan portal profiles: 0
- Orphan portal permission rows: 0
- Orphan portal daycare rows: 0
- OAuth callback relay rows: 0
- Cleanup failures: 0

The successful authorization and consent records associated with the disposable user were removed by Auth's user-deletion cascade. No TRACK102f test artifact remains.

## Historical OAuth authorization audit

The five rows previously described as “orphan OAuth authorizations” are more precisely expired, unassigned authorization requests:

- All five use the registered Chamah MCP acceptance client.
- All are `pending`, with `user_id IS NULL`.
- All expired ten minutes after creation on 2026-11-10.
- None was approved.
- None contains an authorization code.
- All contain state and a PKCE challenge, but these values are expired and were not read or reported.
- All request the canonical MCP resource and standard `openid email profile` scope.
- The first two use the earlier non-relay redirect flow; the last three use the HTTPS callback relay. Their timestamps and redirect generations align with the failed TRACK102/102d authorization attempts documented in `PROJECT_LOG.md`.
- No database foreign key points to `auth.oauth_authorizations`; the rows have only outgoing client/user relationships. There are no linked user records or OAuth consents for these unassigned requests.

### Security impact

Risk is low. The records cannot be exchanged for tokens because they are expired, remain pending, have no assigned user, have no approval, and contain no authorization code. The Auth schema is not exposed through the public Data API. Their main impact is stale Auth-table clutter and possible confusion in future audits.

### Deletion safety and approval requirement

Targeted deletion appears safe because the rows are expired, unapproved, code-free, unassigned, and have no inbound foreign-key dependencies. Deletion would not revoke or alter an active consent, session, user, client, or token. However, they are Auth-owned historical records, and the track explicitly forbids deleting them without approval. They remain unchanged.

If approved, delete only rows matching all of these safeguards: the known acceptance client, `status = pending`, `user_id IS NULL`, `approved_at IS NULL`, `authorization_code IS NULL`, `expires_at < now()`, and the five audited creation timestamps. Re-query the same predicate and confirm zero rows afterward.

## Residual risks

- Five harmless but stale expired authorization requests remain pending explicit cleanup approval.
- Supabase access tokens are stateless; generic Supabase APIs may accept an already-issued JWT until expiry after user deletion. The canonical MCP endpoint closes this window because it performs an Auth user lookup and current portal-access check on every request. See [Supabase user deletion guidance](https://supabase.com/docs/guides/auth/managing-user-data) and [session guidance](https://supabase.com/docs/guides/auth/sessions).

## Production impact

Temporary test Auth and portal-permission state only; fully removed. Historical OAuth rows were inspected read-only. No deployment was performed.
