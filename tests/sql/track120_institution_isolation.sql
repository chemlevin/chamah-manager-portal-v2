begin;

insert into auth.users(instance_id,id,aud,role,email,created_at,updated_at)
values('00000000-0000-0000-0000-000000000000','12000000-0000-4000-8000-000000000001','authenticated','authenticated','track120-institution@example.invalid',now(),now());
insert into public.portal_user_profiles(user_id,display_name,is_active,is_super_admin,scope_mode,permission_configuration_id,mcp_full_read_access)
values('12000000-0000-4000-8000-000000000001','TRACK120 Institution Test',true,false,'SELECTED','12000000-0000-4000-8000-000000000002',false);
insert into public.portal_user_permissions(permission_configuration_id,user_id,screen_code,permission_level)
values('12000000-0000-4000-8000-000000000002','12000000-0000-4000-8000-000000000001','dashboards.staffing.employees','VIEW');
insert into public.portal_user_daycares(permission_configuration_id,user_id,daycare_id)
values(
  '12000000-0000-4000-8000-000000000002',
  '12000000-0000-4000-8000-000000000001',
  '7d88087d-b213-4787-b798-7287e56f403a');

set local role authenticated;
select set_config('request.jwt.claim.sub','12000000-0000-4000-8000-000000000001',true);

do $$
declare visible_ids uuid[]; denied_count integer;
begin
  select array_agg(daycare_id order by daycare_id) into visible_ids
  from public.portal_mcp_list_daycares();
  if visible_ids is distinct from array['7d88087d-b213-4787-b798-7287e56f403a'::uuid] then
    raise exception 'Institution scope leaked daycares: %',visible_ids;
  end if;
  select count(*) into denied_count
  from public.portal_mcp_staff_by_daycare('c18206ae-b5fd-4f8e-84e3-ddcfe4b572d7');
  if denied_count<>0 then raise exception 'Cross-institution staff access was not denied'; end if;
end $$;

rollback;

