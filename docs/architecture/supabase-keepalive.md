# Supabase Keepalive

## Purpose

TRACK029 prevents the linked Preview Supabase project from pausing because of
inactivity. The scheduled job is infrastructure maintenance and must not be
removed unless an approved replacement provides equivalent real database
activity.

## Implementation

- Scheduler: Supabase Cron (`pg_cron`) in the linked Preview database.
- Job name: `track029-supabase-keepalive`.
- Schedule: `0 */12 * * *` (00:00 and 12:00 UTC every day).
- Activity: a read of `public.school_years.school_year_id` with `LIMIT 1`.
- Data safety: the read runs inside a PostgreSQL `DO` block, so no selected
  value is returned or logged.
- Observability: `cron.job_run_details` records the run status and command
  result only.

The job performs no write operation, needs no portal user or session, and does
not call an Edge Function or expose database credentials.
