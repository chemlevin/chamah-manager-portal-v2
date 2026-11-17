-- Read-only MCP-facing RPCs. These do not alter existing portal policies or engines.
-- Run in order after verifying portal_effective_permission and portal scope tables.
create or replace function public.portal_mcp_list_daycares()
returns table(daycare_id uuid, display_name varchar, daycare_code varchar)
language sql stable security definer set search_path = ''
as $$
  select d.daycare_id, d.display_name, d.daycare_code
  from public.daycares d
  join public.portal_user_profiles p on p.user_id = auth.uid() and p.is_active
  where auth.uid() is not null
    and public.portal_effective_permission(auth.uid(), 'dashboards.staffing.employees') in ('VIEW','EDIT')
    and (p.is_super_admin or p.scope_mode::text = 'ORGANIZATION'
      or exists (select 1 from public.portal_user_daycares ud
        where ud.user_id = p.user_id and ud.permission_configuration_id = p.permission_configuration_id
          and ud.daycare_id = d.daycare_id))
  order by d.display_name;
$$;
revoke all on function public.portal_mcp_list_daycares() from public, anon;
grant execute on function public.portal_mcp_list_daycares() to authenticated, service_role;

create or replace function public.portal_mcp_staff_by_daycare(requested_daycare_id uuid)
returns table(employee_id uuid, first_name varchar, last_name varchar, assignment_effective_from date, assignment_effective_to date)
language sql stable security definer set search_path = ''
as $$
 select distinct e.employee_id, e.first_name, e.last_name, a.effective_from, a.effective_to
 from public.employee_assignments a
 join public.employments em on em.employment_id = a.employment_id
 join public.employees e on e.employee_id = em.employee_id
 where requested_daycare_id is not null and a.daycare_id = requested_daycare_id
   and auth.uid() is not null
   and exists (select 1 from public.portal_user_profiles p
     where p.user_id = auth.uid() and p.is_active
       and public.portal_effective_permission(p.user_id, 'dashboards.staffing.employees') in ('VIEW','EDIT')
       and (p.is_super_admin or p.scope_mode::text = 'ORGANIZATION'
         or exists (select 1 from public.portal_user_daycares ud
           where ud.user_id = p.user_id
             and ud.permission_configuration_id = p.permission_configuration_id
             and ud.daycare_id = requested_daycare_id)))
 order by e.last_name, e.first_name, e.employee_id, a.effective_from, a.effective_to
 limit 100;
$$;
revoke all on function public.portal_mcp_staff_by_daycare(uuid) from public, anon;
grant execute on function public.portal_mcp_staff_by_daycare(uuid) to authenticated, service_role;
