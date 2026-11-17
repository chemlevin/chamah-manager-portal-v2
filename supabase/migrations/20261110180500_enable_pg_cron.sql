-- TRACK119 fresh-environment prerequisite for the financial reconciliation job.
-- Supabase Cron creates and owns the cron schema used by the following migration.
create extension if not exists pg_cron;
