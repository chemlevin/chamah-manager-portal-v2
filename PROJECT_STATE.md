# Project State

Last reviewed: 2026-09-17 (TRACK034)

This file contains current operational state only. Durable rules belong in
`AGENTS.md` and `docs/business-rules.md`; detailed history belongs in
`PROJECT_LOG.md`.

## Canonical branch and Production

- Canonical branch: `main` / `origin/main`.
- Canonical Production URL: `https://chamah-portal.vercel.app`.
- Validated TRACK030C application commit:
  `ce07f9d61186db9a2e04642ffc2629a838a1aef6`.
- Validated TRACK030C Production deployment:
  `dpl_5pfiiDgd8Z7de7ZVb6jWBjELq4GM`.
- The preview-named project domain
  `https://chamah-manager-portal-v2-preview.vercel.app` currently routes to the
  same Production artifact. It is not a separate Preview artifact despite its
  hostname.

## Backend deployment head

- Linked Supabase project `vyyfuaqmbxvfqgbfqooc` is the canonical shared
  backend and Preview backend.
- Latest verified applied migration: remote migration
  `20260917084017 track030b_bank_upload_history`; repository source migration
  `supabase/migrations/20260917082920_track030b_bank_upload_history.sql`.
- Relevant active Edge Function: `portal-bank-workbench` version 16, JWT
  verification enabled.
- Other last documented relevant versions: `portal-workforce-workbench` v24
  (TRACK026H) and `portal-runtime-config` v2 (TRACK028B).
- TRACK029 keepalive job `track029-supabase-keepalive` runs at 00:00 and 12:00
  UTC and performs a read-only `school_years` probe.

## Latest completed TRACKs

- TRACK034 implementation is pushed and deployed to Preview; final authenticated
  live-browser validation is pending a Vercel-authenticated browser session.
- TRACK032: read-only Vercel domain audit confirmed both named hostnames route
  to the same canonical Production deployment.
- TRACK031: context sources consolidated; documentation/process only.
- TRACK030C-PROD-RERUN: bank description filtering and calendar-based accounting
  assignment months are promoted and authenticated on canonical Production;
  TRACK030B Upload History remains live.
- TRACK030B: bank upload history, migration, Bank Workbench v15, and canonical
  Production promotion completed and verified live.

## Open items and blockers

- TRACK034 Preview `dpl_9gYq8EmEgFJVvAp4de9QLkcHacou` is READY, but the
  available validation browser is stopped by Vercel Authentication and has no
  signed-in Vercel session. Local authenticated-mock desktop/mobile validation
  passed; live authenticated validation remains pending.
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
