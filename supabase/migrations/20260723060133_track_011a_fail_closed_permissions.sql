-- TRACK 011A: permissions are direct and fail closed.
-- A parent permission never grants a child implicitly. Missing rows are HIDDEN.

create or replace function public.portal_effective_permission(
  target_user_id uuid,
  target_screen_code text
)
returns public.portal_permission_level
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result public.portal_permission_level;
begin
  if exists (
    select 1
    from public.portal_user_profiles
    where user_id = target_user_id
      and is_active
      and is_super_admin
  ) then
    return 'EDIT';
  end if;

  if not exists (
    select 1
    from public.portal_user_profiles
    where user_id = target_user_id
      and is_active
  ) then
    return 'HIDDEN';
  end if;

  if not exists (
    select 1
    from public.portal_sections
    where screen_code = target_screen_code
      and is_active
  ) then
    return 'HIDDEN';
  end if;

  select permission.permission_level
  into result
  from public.portal_user_permissions permission
  join public.portal_user_profiles profile
    on profile.user_id = permission.user_id
   and profile.permission_configuration_id = permission.permission_configuration_id
  where permission.user_id = target_user_id
    and permission.screen_code = target_screen_code;

  return coalesce(result, 'HIDDEN'::public.portal_permission_level);
end
$$;

create or replace function public.portal_has_permission(
  target_user_id uuid,
  target_screen_code text,
  required_level public.portal_permission_level default 'VIEW'
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case required_level
    when 'EDIT' then public.portal_effective_permission(target_user_id, target_screen_code) = 'EDIT'
    when 'VIEW' then public.portal_effective_permission(target_user_id, target_screen_code) in ('VIEW', 'EDIT')
    else public.portal_effective_permission(target_user_id, target_screen_code) in ('HIDDEN', 'VIEW', 'EDIT')
  end
$$;

revoke all on function public.portal_effective_permission(uuid, text) from public, anon, authenticated;
grant execute on function public.portal_effective_permission(uuid, text) to service_role;

revoke all on function public.portal_has_permission(uuid, text, public.portal_permission_level) from public, anon, authenticated;
grant execute on function public.portal_has_permission(uuid, text, public.portal_permission_level) to service_role;

comment on function public.portal_effective_permission(uuid, text) is
  'Fail-closed direct permission resolver. Missing, inactive, unknown, and child-only records resolve to HIDDEN; SUPER_ADMIN resolves to EDIT.';
comment on function public.portal_has_permission(uuid, text, public.portal_permission_level) is
  'Service-only authorization predicate for Edge Functions and server APIs.';
