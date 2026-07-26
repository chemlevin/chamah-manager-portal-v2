# Release Notes

## TRACK021C — Production Release

Date: 2026-07-26

Status: **FAILED — deployed, authenticated Production smoke test unavailable**

The approved TRACK019, TRACK020, TRACK020A, TRACK021, TRACK021A and TRACK021B
lineage through application commit
`266496b64bb07e3766d7fa76ca302b8f57dcafda` was fast-forwarded into `main`
and pushed. The existing Vercel project and Production aliases were used; no
project, domain or replacement Production site was created.

Production deployment:

- Deployment ID: `dpl_3ucC7p3eGC9Djc3bSNZEjtEgdNg5`
- Existing Production URL: `https://chamah-portal-chamah.vercel.app`
- State: `READY`
- The stable Preview alias was restored to the TRACK021B Preview deployment after
  Vercel initially included it in the Production alias update.
- TRACK022 and all uncommitted workspace files were excluded by deploying from an
  isolated clean `main` worktree.

Supabase:

- Production already contained every approved migration from TRACK019 through
  TRACK020A, including `20260726050810` through `20260726051427`; no forward
  migration remained to apply.
- The generic `db push --dry-run` remains blocked by pre-existing remote-only
  historical migration IDs. Migration history was not repaired or rewritten.
- Redeployed the four checked-in Edge Functions with JWT verification enabled:
  `portal-users` v6, `portal-settings` v3, `portal-bank-workbench` v10 and
  `portal-workforce-workbench` v5. All report `ACTIVE`.
- Read-only QA-identifier checks returned zero matching Auth users, Employees,
  Payroll records, Bank transactions and import batches. No deletion was required.

Validation:

- PASS: clean build, JavaScript syntax checks, shared autosave unit tests and
  `git diff --check`.
- PASS: 101 desktop/mobile release-candidate browser tests; one intentional
  duplicate mobile-landscape case skipped.
- Covered login/session restoration and refresh, Employees CRUD, Pay Terms
  history, Payroll month workflow and splits, autosave, Dashboard Workforce and
  Payroll data, Bank Workbench, legacy API retirement, RTL and responsive layout.
- PASS: live Production root and Workbench JavaScript assets return HTTP 200.
- PASS: retired `/api/employees` and `/api/payroll` return HTTP 404.
- PASS: all four Production Edge Functions reject unauthenticated requests with
  HTTP 401.
- PASS: live mobile Production login shell is Hebrew RTL, has zero horizontal
  overflow and produced no browser console errors.
- BLOCKED: no authorized Production browser session or release credential was
  available. Employees, Pay Terms, Payroll/autosave and Dashboard could not be
  exercised against live authenticated Production data.

Final status is **FAILED** because the requested authenticated Production smoke
gate could not be completed, even though the approved release is deployed and all
non-authenticated Production checks passed.

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
