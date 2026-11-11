-- TRACK119 Preview only: authorize the synthetic acceptance identity created in Auth.
insert into private.portal_access(email,role,is_active)
values('track119-director@example.com','ADMIN',true)
on conflict(email) do update set role='ADMIN',is_active=true;

insert into public.portal_user_profiles(user_id,display_name,is_active,is_super_admin,scope_mode)
select id,'TRACK119 Synthetic Director',true,true,'ORGANIZATION'::public.portal_scope_mode
from auth.users where email='track119-director@example.com'
on conflict(user_id) do update set display_name=excluded.display_name,is_active=true,is_super_admin=true,scope_mode='ORGANIZATION';

insert into public.portal_role_assignments(user_id,role_code,assigned_by)
select id,'DIRECTOR',id from auth.users where email='track119-director@example.com'
on conflict(user_id,role_code,valid_from) do nothing;
