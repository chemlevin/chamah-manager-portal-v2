# Release Notes

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
