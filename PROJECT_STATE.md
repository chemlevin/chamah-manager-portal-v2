# Project State

Last reviewed: 2026-09-18 (TRACK040)

This file contains current operational state only. Durable rules belong in
`AGENTS.md` and `docs/business-rules.md`; detailed history belongs in
`PROJECT_LOG.md`.

## Canonical branch and Production

- Canonical branch: `main` / `origin/main`.
- Canonical Production URL: `https://chamah-portal.vercel.app`.
- Canonical Production serves validated TRACK034/035 application SHA
  `51f76a79473b186a9a8882a6fea2ccec24fc4724` through READY deployment
  `dpl_CPpTqXrsr2UZGpYjU97LSt3TTW8H`.
- The preview-named project domain
  `https://chamah-manager-portal-v2-preview.vercel.app` currently routes to the
  same Production artifact. It is not a separate Preview artifact despite its
  hostname.
- TRACK040 Preview deployment `dpl_38SnDzWLySWii5hc77TjZkUj257g` is READY at
  `https://chamah-portal-n9w9n6xi2-chamah.vercel.app`; Production is unchanged.

## Backend deployment head

- Linked Supabase project `vyyfuaqmbxvfqgbfqooc` is the canonical shared
  backend and Preview backend.
- Latest verified applied migration: remote migration
  `20260917084017 track030b_bank_upload_history`; repository source migration
  `supabase/migrations/20260917082920_track030b_bank_upload_history.sql`.
- Relevant active Edge Function: `portal-bank-workbench` version 18, JWT
  verification enabled (TRACK040 Preview backend deployment).
- Other last documented relevant versions: `portal-workforce-workbench` v24
  (TRACK026H) and `portal-runtime-config` v2 (TRACK028B).
- TRACK029 keepalive job `track029-supabase-keepalive` runs at 00:00 and 12:00
  UTC and performs a read-only `school_years` probe.

## Latest completed TRACKs

- TRACK040: unified Bank and Payroll Actual contracts across Finance Dashboard
  KPIs, balances, summaries, and category matrices; Bank Workbench rejects new
  contradictory income/expense assignments. Preview only.
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

- No TRACK038A release blocker remains.
- Pre-existing Supabase security/performance advisor findings remain outside
  TRACK030C scope.
- The long-term relationship between Accounting grouping by `חשבון` and
  allocation targeting by `עבור מחלקה` remains intentionally unresolved.
- TRACK040 real-browser authenticated Preview validation remains blocked by the
  isolated validation browser having no Vercel/OpenAI or portal account session;
  protected artifact retrieval and authenticated mocked end-to-end coverage pass.

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
