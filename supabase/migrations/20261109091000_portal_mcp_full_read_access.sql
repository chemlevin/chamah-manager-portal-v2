alter table public.portal_user_profiles add column if not exists mcp_full_read_access boolean not null default false;
create or replace function public.portal_mcp_has_full_read_access()
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.portal_user_profiles p where p.user_id=auth.uid() and p.is_active and (p.is_super_admin or p.mcp_full_read_access));
$$;
create or replace function public.portal_admin_set_mcp_full_read_access(p_user_id uuid,p_enabled boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare previous boolean;
begin
 if auth.uid() is null or not exists(select 1 from public.portal_user_profiles where user_id=auth.uid() and is_active and is_super_admin) then
  raise exception 'Only active super administrators can manage MCP full access' using errcode='42501';
 end if;
 if p_user_id is null or p_enabled is null then raise exception 'Invalid input' using errcode='22023'; end if;
 select mcp_full_read_access into previous from public.portal_user_profiles where user_id=p_user_id for update;
 if not found then raise exception 'User not found' using errcode='22023'; end if;
 update public.portal_user_profiles set mcp_full_read_access=p_enabled where user_id=p_user_id;
 if previous is distinct from p_enabled then
  insert into public.audit_events(entity_type,entity_id,operation,previous_values,new_values,source_type,actor_user_id)
  values('PORTAL_USER',p_user_id,'UPDATE',jsonb_build_object('mcp_full_read_access',previous),jsonb_build_object('mcp_full_read_access',p_enabled),'PORTAL_ADMIN',auth.uid());
 end if;
end $$;
revoke all on function public.portal_admin_set_mcp_full_read_access(uuid,boolean),public.portal_mcp_has_full_read_access() from public,anon;
grant execute on function public.portal_admin_set_mcp_full_read_access(uuid,boolean),public.portal_mcp_has_full_read_access() to authenticated;
