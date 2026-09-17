# Project State

Last reviewed: 2026-09-17 (TRACK035)

This file contains current operational state only. Durable rules belong in
`AGENTS.md` and `docs/business-rules.md`; detailed history belongs in
`PROJECT_LOG.md`.

## Canonical branch and Production

- Canonical branch: `main` / `origin/main`.
- Canonical Production URL: `https://chamah-portal.vercel.app`.
- Latest documented canonical Production commit:
  `eaa4be4ff086eeb2da09a5e13ef78f9ec6c7cc4a` (TRACK030B guard follow-up).
- Serving Production deployment documented for TRACK030B:
  `dpl_BfoRdTF68uKwj1oAB7KjA7ERS1yG`. The guard follow-up is recorded on
  `origin/main`; verify the live deployment ID, full serving SHA, and alias
  before any future Production report or promotion.
- TRACK031 is documentation/process only and does not change Production.
- TRACK035 is deployed to Preview only; Production is unchanged.

## Backend deployment head

- Linked Supabase is the canonical shared backend and Preview backend.
- Latest documented applied migration: remote migration
  `20260917084017 track030b_bank_upload_history`; repository source migration
  `supabase/migrations/20260917082920_track030b_bank_upload_history.sql`.
- Relevant active Edge Function: `portal-bank-workbench` version 17, JWT
  verification enabled (TRACK035 Preview deployment).
- Other last documented relevant versions: `portal-workforce-workbench` v24
  (TRACK026H) and `portal-runtime-config` v2 (TRACK028B).
- TRACK029 keepalive job `track029-supabase-keepalive` runs at 00:00 and 12:00
  UTC and performs a read-only `school_years` probe.

## Latest completed TRACKs

- TRACK034: continuous Bank Transaction loading baseline is present in the
  current feature branch and Preview deployment.
- TRACK031: context sources consolidated; documentation/process only.
- TRACK030C: bank description/month filter refinements validated on Preview;
  not promoted to Production in the current record.
- TRACK030B: bank upload history, migration, Bank Workbench v15, and canonical
  Production promotion completed.
- TRACK029: Supabase keepalive migration/job completed; no Production frontend
  change.
- TRACK028B: tuition rates and collection model completed on linked Preview;
  no Production frontend promotion recorded.

## Open items and blockers

- TRACK035 implementation is deployed to Preview, but its requested
  authenticated live UI validation is blocked because the available browser
  has no signed-in Vercel session. Local desktop/mobile acceptance coverage is
  otherwise complete.
- TRACK030C has no recorded canonical Production promotion.
- Before the next Production action, refresh remote refs and verify the live
  canonical deployment ID, full serving Git SHA, and alias; the local checkout
  may be on a feature branch or contain unrelated work.
- Pre-existing Supabase security/performance advisor findings remain outside
  TRACK030B scope.
- The long-term relationship between Accounting grouping by `חשבון` and
  allocation targeting by `עבור מחלקה` remains intentionally unresolved.
- Authentication and permission requirements for future modules must be derived
  from current implementation/task scope rather than older portal summaries.

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
