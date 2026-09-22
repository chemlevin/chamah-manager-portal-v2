# Project State

Last reviewed: 2026-09-22 (TRACK043)

This file contains current operational state only. Durable rules belong in
`AGENTS.md` and `docs/business-rules.md`; detailed history belongs in
`PROJECT_LOG.md`.

## Canonical branch and Production

- Canonical branch: `main` / `origin/main`.
- Canonical Production URL: `https://chamah-portal.vercel.app`.
- Canonical Production serves TRACK043 deployment `dpl_9eLZhS8jxCZKyym6m7fbEt9bTBqA`
  at Git SHA `fa89a8f5381e1ff78f155208fb4e25f087d0a154`, which includes approved
  TRACK042 commit `04c18fe5b43c202d332068b6b11e16c6f268f440`.
- The preview-named project domain
  `https://chamah-manager-portal-v2-preview.vercel.app` currently routes to the
  same Production artifact. It is not a separate Preview artifact despite its
  hostname.
- TRACK040 source Preview deployment `dpl_38SnDzWLySWii5hc77TjZkUj257g`
  remains READY at `https://chamah-portal-n9w9n6xi2-chamah.vercel.app`.

## Backend deployment head

- Linked Supabase project `vyyfuaqmbxvfqgbfqooc` is the canonical shared
  backend and Preview backend.
- Latest verified applied migration: remote migration
  `20260917084017 track030b_bank_upload_history`; repository source migration
  `supabase/migrations/20260917082920_track030b_bank_upload_history.sql`.
- Relevant active Edge Function: `portal-bank-workbench` version 19, JWT
  verification enabled (TRACK041 Production promotion).
- `portal-bank-transfer-workbench` version 3 is ACTIVE with JWT verification
  enabled; deployed source matches the approved TRACK042 file.
- Other last documented relevant versions: `portal-workforce-workbench` v24
  (TRACK026H) and `portal-runtime-config` v2 (TRACK028B).
- TRACK029 keepalive job `track029-supabase-keepalive` runs at 00:00 and 12:00
  UTC and performs a read-only `school_years` probe.

## Latest completed TRACKs

- TRACK043: promoted only the validated TRACK042 Bank Transfers changes to
  canonical Production. Authenticated autosave and split checks passed with
  disposable zero-amount rows, which were archived after testing; the
  pre-existing delete audit mismatch prevents a full regression pass.
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

- The pre-existing Bank Transfers delete handler audits with `ARCHIVE`, while
  `audit_events_operation_check` disallows `ARCHIVE`; a separate fix is needed.
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
