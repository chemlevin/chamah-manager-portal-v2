# Project State

Last reviewed: 2026-09-22 (TRACK042)

This file contains current operational state only. Durable rules belong in
`AGENTS.md` and `docs/business-rules.md`; detailed history belongs in
`PROJECT_LOG.md`.

## Canonical branch and Production

- Canonical branch: `main` / `origin/main`.
- Canonical Production URL: `https://chamah-portal.vercel.app`.
- Serving canonical Production deployment verified during TRACK036:
  `dpl_DdocEox1zT6E2tJu41YNqb1ZydAR`, Git SHA
  `c779166dbe2c273165f18eed1a1188d7b8a3d5e9` (TRACK030C production
  documentation commit on `main`).
- TRACK031 is documentation/process only and does not change Production.
- The stable Preview alias serves combined TRACK034/035 deployment
  `dpl_cTGnWqwmgrShu3YKQXLLXMr5FGX8`, Git SHA
  `51f76a79473b186a9a8882a6fea2ccec24fc4724`. Production is unchanged by
  TRACK036.
- TRACK040 Preview deployment `dpl_38SnDzWLySWii5hc77TjZkUj257g` is READY at
  `https://chamah-portal-n9w9n6xi2-chamah.vercel.app`; Production is unchanged.
- TRACK042 Preview deployment `dpl_FqTucMJWjHRedYGnhJ8FDibbjMkr` is READY at
  `https://chamah-portal-4qgb1mi0g-chamah.vercel.app`, serving Git SHA
  `5d0b6e01830c645c5c918c3e69b03a7e592c04a1`; TRACK042 made no Production deployment.

## Backend deployment head

- Linked Supabase is the canonical shared backend and Preview backend.
- Latest documented applied migration: remote migration
  `20260917084017 track030b_bank_upload_history`; repository source migration
  `supabase/migrations/20260917082920_track030b_bank_upload_history.sql`.
- Relevant active Edge Function: `portal-bank-workbench` version 19, JWT
  verification enabled (observed during TRACK042 backend check).
- `portal-bank-transfer-workbench` version 3 is ACTIVE with JWT verification
  enabled (TRACK042 paged full-dataset read on the linked Preview backend).
- Other last documented relevant versions: `portal-workforce-workbench` v24
  (TRACK026H) and `portal-runtime-config` v2 (TRACK028B).
- TRACK029 keepalive job `track029-supabase-keepalive` runs at 00:00 and 12:00
  UTC and performs a read-only `school_years` probe.

## Latest completed TRACKs

- TRACK042: Bank Transfers autosave, entry date display, split copying/collapse, and full-dataset missing-attachment filter validated on desktop and 390px Preview workflow. No database or Production change.
- TRACK040: unified Bank and Payroll Actual contracts across Finance Dashboard
  KPIs, balances, summaries, and category matrices; Bank Workbench rejects new
  contradictory income/expense assignments. Preview only.
- TRACK037: stabilized the TRACK034 import-feedback test with deterministic
  request lifecycle synchronization; the combined TRACK034/035 desktop and
  390px mobile suite passes 14/14 with no application artifact change.
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

- Bank Transfer parent and split rows independently store canonical unit/daycare IDs, but both associations are nullable. Future daycare-scoped permissions must define how unassigned rows and splits with differing assignments are handled.
- TRACK037 resolved the remaining TRACK034 mobile test timing failure. The
  combined TRACK034/035 suite passes 14/14 on desktop 1440px and mobile 390px;
  no application or deployment change was required. Combined TRACK034/035 is
  ready for a separately approved Production promotion.
- Before the next Production action, refresh remote refs and verify the live
  canonical deployment ID, full serving Git SHA, and alias; the local checkout
  may be on a feature branch or contain unrelated work.
- Pre-existing Supabase security/performance advisor findings remain outside
  TRACK030B scope.
- The long-term relationship between Accounting grouping by `חשבון` and
  allocation targeting by `עבור מחלקה` remains intentionally unresolved.
- Authentication and permission requirements for future modules must be derived
  from current implementation/task scope rather than older portal summaries.
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
