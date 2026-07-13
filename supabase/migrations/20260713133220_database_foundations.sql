-- Chamah Manager Portal - Database foundations only.
-- Phase 1 boundary: no business tables, seed data, API code, Edge Functions,
-- Google Sheets sync, or portal behavior changes.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Shared trigger function for setting updated_at on mutable business and configuration tables.';
