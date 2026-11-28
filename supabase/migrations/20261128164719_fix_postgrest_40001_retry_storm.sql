-- PostgREST 14 retries SQLSTATE 40001 inside RPC transactions. These routines
-- used 40001 for deterministic business/concurrency validation, which turned a
-- single rejected request into an unbounded transaction retry loop. Preserve
-- the same validation messages and rollback behavior while changing only the
-- SQLSTATE to the standard, non-retryable PL/pgSQL exception P0001.
do $migration$
declare
  routine record;
  original_definition text;
  repaired_definition text;
begin
  for routine in
    select p.oid,
           n.nspname as schema_name,
           p.proname as routine_name,
           pg_get_function_identity_arguments(p.oid) as identity_arguments
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.prokind = 'f'
      and n.nspname in ('public', 'private')
      and pg_get_functiondef(p.oid) ~* 'errcode\s*=\s*''40001'''
    order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
  loop
    original_definition := pg_get_functiondef(routine.oid);
    repaired_definition := regexp_replace(
      original_definition,
      'errcode\s*=\s*''40001''',
      'errcode=''P0001''',
      'gi'
    );

    if repaired_definition = original_definition
       or repaired_definition ~* 'errcode\s*=\s*''40001''' then
      raise exception
        'Unable to remove retryable SQLSTATE from %.%(%)',
        routine.schema_name,
        routine.routine_name,
        routine.identity_arguments;
    end if;

    execute repaired_definition;
  end loop;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.prokind = 'f'
      and n.nspname in ('public', 'private')
      and pg_get_functiondef(p.oid) ~* 'errcode\s*=\s*''40001'''
  ) then
    raise exception 'Retryable SQLSTATE 40001 remains in an application RPC routine';
  end if;
end
$migration$;

comment on schema private is
  'Internal application routines. Custom business validation must not raise retryable SQLSTATE 40001 through PostgREST.';
