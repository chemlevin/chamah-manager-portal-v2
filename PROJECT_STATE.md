# Project State

Last reviewed: 2026-09-23 (TRACK050)

This file contains current operational state only. Durable rules belong in
`AGENTS.md` and `docs/business-rules.md`; detailed history belongs in
`PROJECT_LOG.md`.

## Canonical branch and Production

- Canonical branch: `main` / `origin/main`.
- Canonical Production URL: `https://chamah-portal.vercel.app`.
- Canonical Production serves READY TRACK049 deployment
  `dpl_2Y416AaJAiRKiUQ2jdALgX54LofW` at approved Git SHA
  `08221283052b74591604dbf88500e31cb75e28c1`, containing the TRACK048
  pending transfer amount correction.
- The preview-named project domain
  `https://chamah-manager-portal-v2-preview.vercel.app` currently routes to the
  same Production artifact. It is not a separate Preview artifact despite its
  hostname.
- TRACK040 source Preview deployment `dpl_38SnDzWLySWii5hc77TjZkUj257g`
  remains READY at `https://chamah-portal-n9w9n6xi2-chamah.vercel.app`.

## Backend deployment head

- Linked Supabase project `vyyfuaqmbxvfqgbfqooc` is the canonical shared
  backend and Preview backend.
- Latest applied migration: `20260922142635_track045_bank_transfer_permissions`.
- Relevant active Edge Function: `portal-bank-workbench` version 19, JWT
  verification enabled (TRACK041 Production promotion).
- `portal-bank-transfer-workbench` version 5 and `portal-users` version 7 are
  ACTIVE with JWT verification enabled (TRACK045 permission foundation).
- Other last documented relevant versions: `portal-workforce-workbench` v24
  (TRACK026H) and `portal-runtime-config` v2 (TRACK028B).
- TRACK029 keepalive job `track029-supabase-keepalive` runs at 00:00 and 12:00
  UTC and performs a read-only `school_years` probe.

## Latest completed TRACKs

- TRACK050: added build-versioned frontend assets and an update-aware offline
  app shell for iPhone Home Screen installations. READY Preview
  `dpl_3895d96tZ3yhYs59EnQwdvXQewRZ` is available at
  `https://chamah-portal-hdn019hk2-chamah.vercel.app`; Production is unchanged.
- TRACK049: promoted only the approved TRACK048 artifact and assigned the
  canonical alias to its READY Production deployment. Live split amount and
  read-only browser/error checks passed; focused desktop and 390px tests 6/6.
- TRACK048: fixed Bank Transfers pending amount for split families. The
  Git-linked Preview `dpl_CLi7dzcJFtVaA4yuEz7EJHkKp6so` is READY at
  `https://chamah-portal-16di7psvq-chamah.vercel.app`, serving commit
  `f718f8fdffa4fe231c24b00ab8c60ae45dc82fc0`. No Production
  deployment or backend mutation was made.
- TRACK047: corrected only the outdated archive handler profile fixture; the
  focused desktop and 390px Bank Transfers/permissions suite passes 50/50.
- TRACK046: promoted the approved TRACK045 artifact to canonical Production;
  authenticated read-only smoke checks passed. No real data was changed.
- TRACK045: added daycare-scoped Bank Transfers permissions and independent
  approval/execution-date controls without changing existing assignments.
- TRACK044: corrected archive audit to use the allowed `UPDATE` operation;
  parent/child archive behavior is unchanged.
- TRACK043: promoted only the validated TRACK042 Bank Transfers changes to
  canonical Production. Authenticated autosave and split checks passed with
  disposable zero-amount rows, which were archived after testing; the
  the then-existing delete audit mismatch was subsequently fixed by TRACK044.
- TRACK041: promoted only the validated TRACK040 artifact to canonical
  Production, assigned the canonical alias, redeployed Bank Workbench v19 with
  JWT verification, and authenticated-smoked Finance, Bank, and Payroll.
- TRACK040: unified Bank and Payroll Actual contracts across Finance Dashboard
  KPIs, balances, summaries, and category matrices; Bank Workbench rejects new
  contradictory income/expense assignments. Promoted by TRACK041.
- TRACK038A: explicitly assigned the separately maintained canonical alias to
  the validated TRACK034/035 Production artifact; authenticated desktop and
  390px smoke passed with 2,453 total records, continuous loading, search,
  summaries, Upload History, calendar months, RTL, and no console errors.
- TRACK037: stabilized the TRACK034 import-loading test; the combined focused
  desktop/mobile suite passed 14/14 without application behavior changes.
- TRACK035: added tokenized Description search and full-filtered-dataset
  summary counts while retaining Reference in global search.
- TRACK034: replaced user pagination with continuous internal-table loading and
  reusable asynchronous/import feedback.
- TRACK032: read-only Vercel domain audit confirmed both named hostnames route
  to the same canonical Production deployment.
- TRACK031: context sources consolidated; documentation/process only.
- TRACK030C-PROD-RERUN: bank description filtering and calendar-based accounting
  assignment months are promoted and authenticated on canonical Production;
  TRACK030B Upload History remains live.
- TRACK030B: bank upload history, migration, Bank Workbench v15, and canonical
  Production promotion completed and verified live.

## Open items and blockers

- TRACK046's archive fixture regression blocker is closed by TRACK047 (50/50).
- No TRACK038A release blocker remains.
- Pre-existing Supabase security/performance advisor findings remain outside
  TRACK030C scope.
- The long-term relationship between Accounting grouping by `חשבון` and
  allocation targeting by `עבור מחלקה` remains intentionally unresolved.

## Active technical constraints

- Preserve canonical rules in `docs/business-rules.md`; Budget behavior,
  calculations, APIs, Sheets structure, schema, and RLS change only when a TRACK
  explicitly requires them.
- Keep Hebrew RTL and responsive behavior.
- Keep root/static mirrored sources synchronized; do not edit `dist/` directly.
- Dependent Supabase migrations and Edge Functions deploy together; never leave
  the shared backend partially deployed.
- Preview precedes Production. Frontend Production needs explicit approval and
  canonical alias/deployment/SHA verification.
- Current worktrees may contain unrelated changes. Inspect status and preserve
  them; stage only files owned by the active TRACK.
