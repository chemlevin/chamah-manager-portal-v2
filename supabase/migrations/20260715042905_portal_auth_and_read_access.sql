create schema if not exists private;

create table if not exists private.portal_access (
  email text primary key check (email = lower(email)),
  role text not null check (role in ('ADMIN', 'VIEWER')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

revoke all on schema private from public, anon;
revoke all on all tables in schema private from public, anon, authenticated;

insert into private.portal_access (email, role)
values ('mlevin770@gmail.com', 'ADMIN')
on conflict (email) do update set role = excluded.role, is_active = true;

create or replace function private.can_read_portal()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.portal_access access
    where access.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and access.is_active
  );
$$;

revoke all on function private.can_read_portal() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.can_read_portal() to authenticated;
grant select on all tables in schema public to authenticated;

do $$
declare
  target record;
begin
  for target in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', target.tablename);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.can_read_portal()))',
      'portal_authorized_read',
      target.tablename
    );
  end loop;
end;
$$;
