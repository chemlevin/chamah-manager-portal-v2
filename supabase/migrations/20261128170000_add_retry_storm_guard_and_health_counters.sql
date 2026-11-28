-- Prevent retryable serialization SQLSTATEs from being reintroduced as
-- deterministic business-validation errors. The event trigger runs only when
-- DDL completes, so it adds no request-path or polling overhead.
create or replace function private.portal_guard_retryable_business_sqlstates()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $function$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.prokind = 'f'
      and n.nspname in ('public', 'private')
      and not (
        n.nspname = 'private'
        and p.proname = 'portal_guard_retryable_business_sqlstates'
      )
      and pg_get_functiondef(p.oid) ~* 'errcode\s*=\s*''40001'''
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Retryable SQLSTATE 40001 is forbidden in application business-validation functions';
  end if;
end
$function$;

revoke all on function private.portal_guard_retryable_business_sqlstates() from public;

drop event trigger if exists portal_guard_retryable_business_sqlstates;
create event trigger portal_guard_retryable_business_sqlstates
  on ddl_command_end
  when tag in ('CREATE FUNCTION')
  execute function private.portal_guard_retryable_business_sqlstates();

-- On-demand cumulative counters for the existing Supabase CPU alert and
-- incident runbook. Reading the view is explicit; it creates no background
-- workload and does not reset PostgreSQL statistics.
create or replace view private.portal_database_health_counters
with (security_invoker = false)
as
select
  clock_timestamp() as measured_at,
  d.stats_reset,
  d.xact_commit,
  d.xact_rollback,
  d.temp_files,
  d.temp_bytes,
  coalesce((
    select sum(s.calls)::bigint
    from extensions.pg_stat_statements s
    where s.queryid = 5360251647081715348
  ), 0::bigint) as incident_retry_setup_calls,
  (
    select count(*)::bigint
    from pg_stat_activity a
    where a.usename = 'authenticator'
      and a.state = 'idle in transaction (aborted)'
  ) as aborted_authenticator_sessions
from pg_stat_database d
where d.datname = current_database();

revoke all on private.portal_database_health_counters from public, anon, authenticated;
grant select on private.portal_database_health_counters to service_role;

comment on view private.portal_database_health_counters is
  'Low-overhead on-demand counters for CPU-incident monitoring. Compare samples for transaction, rollback, temporary-I/O, and retry-storm rates; never reset statistics.';
