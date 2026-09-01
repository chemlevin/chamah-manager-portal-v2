-- TRACK029: keep the linked Preview Supabase database active with one real,
-- read-only metadata-table access every 12 hours. Keep this job unless the
-- project has an approved replacement for inactivity prevention.
--
-- The DO block intentionally suppresses row data. pg_cron records only the
-- run status/command result, so no school-year value is returned or logged.
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'track029-supabase-keepalive',
  '0 */12 * * *',
  $keepalive$
  do $job$
  begin
    perform school_year_id
    from public.school_years
    limit 1;
  end
  $job$;
  $keepalive$
);
