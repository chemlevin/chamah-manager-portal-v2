revoke all on function public.portal_guard_final_super_admin() from public, anon, authenticated, service_role;
revoke all on function public.portal_my_access() from public, anon;
grant execute on function public.portal_my_access() to authenticated, service_role;
