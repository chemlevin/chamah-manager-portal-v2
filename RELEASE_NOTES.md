# Release Notes

## TRACK018 — Production Release

Date: 2026-07-24

Status: **FAILED — deployed, Production smoke test did not pass**

The approved TRACK017A release commit
`09b4cc61d24ee93ef8fdd91bc51a822f87692e51` was fast-forwarded into `main`
and pushed. The existing Vercel project `chamah-portal`
(`prj_6IND7ee2E9s3KispBh6iBDWwQo6X`) was deployed to its existing Production
aliases. No Vercel project, URL, alias, or domain was created.

Production deployment:

- Deployment ID: `dpl_74v1AbkaMKpJEHQ9Si6ezn9JoXV1`
- Existing Production URL: `https://chamah-portal-chamah.vercel.app`
- State: `READY`
- Source release commit: `09b4cc61d24ee93ef8fdd91bc51a822f87692e51`

Supabase:

- Production migration history already contained the approved forward migration
  `20260724151321_track_017a_atomic_accounting_writes`; no remaining forward
  migration was applied during TRACK018.
- Redeployed the checked-in Edge Function sources from the approved commit:
  `portal-users` v5, `portal-settings` v2, and
  `portal-bank-workbench` v9.
- All three functions are ACTIVE with JWT verification enabled.

Smoke-test result:

- PASS: Production root and preserved Accounting page return HTTP 200.
- PASS: Desktop and mobile login shell renders in Hebrew RTL without console or
  failed-network errors; mobile has no horizontal overflow.
- PASS: `/new/` redirects to the Production root.
- PASS: all three Edge Functions reject unauthenticated requests with HTTP 401.
- FAIL: `/api/employees`, `/api/budget`, `/api/payroll`, and
  `/api/allocations` return HTTP 500.
- Vercel runtime logs identify the cause as missing Google service-account
  Production environment variables.
- No temporary QA/test rows or Auth users were created, so no data cleanup was
  required.

Final status is **FAILED** because the complete Production smoke test did not
pass. The approved frontend and Supabase release remains deployed; Production
configuration must be supplied by the credential owner before the four
Google-backed APIs can pass.

## TRACK017 — Production Release

Date: 2026-07-24

Status: **FAILED — not deployed**

The approved TRACK013–TRACK015H release was not merged into `main` or promoted
to Production because mandatory TRACK016 release gates remain open.

Blocking items:

- Production Vercel environment variables are absent.
- Git and live Supabase migration histories are not reconciled.
- Supabase security advisories remain unresolved.
- The persisted Accounting end-to-end workflow and realistic-volume load gate
  have not passed against an isolated release environment.
- Release-hygiene artifacts have not been safely attributed and removed.

Production impact:

- Production commit, aliases, database schema/data, Auth users, RPCs, and Edge
  Functions were unchanged.
- No rollback is required.

Release candidate:

- Commit: `f2d23f8fd58ef97088a4d82956778b031cf97110`
- Preview: `https://chamah-portal-4tpk5rct6-chamah.vercel.app`
- Preview status: READY

Retry requirements are recorded in `PROJECT_LOG.md` under
“2026-07-24 - TRACK017 Production Release Gate”.
