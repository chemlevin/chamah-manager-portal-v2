create type public.portal_permission_level as enum ('HIDDEN', 'VIEW', 'EDIT');
create type public.portal_scope_mode as enum ('ORGANIZATION', 'SELECTED');

create table public.portal_sections (
  screen_code text primary key,
  parent_screen_code text references public.portal_sections(screen_code),
  route text not null unique,
  display_name text not null,
  icon text,
  description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  is_navigation_item boolean not null default false,
  is_scope_required boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint portal_sections_code_chk check (screen_code ~ '^[a-z0-9._-]+$')
);

create table public.portal_user_profiles (
  user_id uuid primary key references auth.users(id),
  display_name text,
  is_active boolean not null default true,
  is_super_admin boolean not null default false,
  scope_mode public.portal_scope_mode not null default 'SELECTED',
  permission_configuration_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.portal_user_permissions (
  permission_configuration_id uuid not null,
  user_id uuid not null references public.portal_user_profiles(user_id),
  screen_code text not null references public.portal_sections(screen_code),
  permission_level public.portal_permission_level not null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by_user_id uuid references auth.users(id),
  primary key (permission_configuration_id, screen_code)
);

create table public.portal_user_allocation_units (
  permission_configuration_id uuid not null,
  user_id uuid not null references public.portal_user_profiles(user_id),
  allocation_unit_id uuid not null references public.allocation_units(allocation_unit_id),
  primary key (permission_configuration_id, allocation_unit_id)
);

create table public.portal_user_daycares (
  permission_configuration_id uuid not null,
  user_id uuid not null references public.portal_user_profiles(user_id),
  daycare_id uuid not null references public.daycares(daycare_id),
  primary key (permission_configuration_id, daycare_id)
);

create index portal_sections_parent_idx on public.portal_sections(parent_screen_code, display_order);
create index portal_user_permissions_user_idx on public.portal_user_permissions(user_id);
create index portal_user_allocation_units_user_idx on public.portal_user_allocation_units(user_id);
create index portal_user_daycares_user_idx on public.portal_user_daycares(user_id);

insert into public.portal_sections (screen_code,parent_screen_code,route,display_name,icon,description,display_order,is_navigation_item,is_scope_required) values
('home',null,'home','עמוד הבית','⌂','שער הכניסה לפורטל',10,true,false),
('dashboards',null,'dashboards','דשבורדים','▦','דשבורדים לפי יחידה ארגונית',20,true,true),
('dashboards.finance','dashboards','dashboards/unit/organization/finance','דשבורד כספים','₪',null,21,false,true),
('dashboards.accounting','dashboards','dashboards/unit/organization/accounting','הנה״ח','🧾',null,22,true,true),
('dashboards.staffing','dashboards','dashboards/unit/organization/staffing','צוות ורישוי','👥',null,23,true,true),
('dashboards.occupancy','dashboards','dashboards/unit/organization/occupancy','תפוסה ותקינה','🏫',null,24,false,true),
('calculators',null,'calculators','מחשבונים','⌗',null,30,true,false),
('calculators.salary','calculators','calculators/salary','מחשבון שכר','₪',null,31,false,false),
('calculators.occupancy','calculators','calculators/occupancy','מחשבון תפוסה, תקינה ורווחיות','🏫',null,32,false,false),
('payroll',null,'payroll','שכר','₪',null,40,true,true),
('payroll.calculations','payroll','payroll/calculations','חישובי שכר','▤',null,41,false,true),
('payroll.calculations.new','payroll.calculations','payroll/calculations/new','חדש','+',null,42,false,true),
('payroll.calculations.existing','payroll.calculations','payroll/calculations/existing','קיים','◷',null,43,false,true),
('payroll.calculations.history','payroll.calculations','payroll/calculations/history','טבלאות עבר','▦',null,44,false,true),
('management',null,'training','הרשאות וטבלאות','▤',null,50,true,false),
('management.permissions','management','training/permissions','הרשאות','⚿',null,51,false,false),
('management.permissions.users','management.permissions','training/permissions/users','רשימת משתמשים והרשאות','👥',null,52,false,false),
('management.rules','management','training/rules','כללים','§',null,53,false,false),
('management.rules.system','management.rules','training/rules/system','כללי מערכת','§',null,54,false,false),
('management.tables','management','training/tables','טבלאות','▦',null,55,false,false),
('management.tables.calculation','management.tables','training/tables/calculation','טבלאות חישוב','▦',null,56,false,false),
('management.tables.variables','management.tables','training/tables/variables','כללים משתנים','⇄',null,57,false,false),
('management.audit','management','training/audit','יומן שינויים','◷',null,58,false,false),
('knowledge',null,'knowledge','מרכז הידע למשתמש','📚',null,60,true,false),
('maintenance',null,'maintenance','תחזוקה','🔧',null,70,true,true),
('tasks',null,'tasks','משימות','✓',null,80,true,true);

insert into public.portal_user_profiles (user_id, display_name)
select id, nullif(trim(coalesce(raw_user_meta_data->>'full_name','')), '') from auth.users where deleted_at is null;
update public.portal_user_profiles set is_super_admin=true, scope_mode='ORGANIZATION'
where user_id=(select id from auth.users where deleted_at is null and email_confirmed_at is not null order by created_at limit 1);

create or replace function public.portal_effective_permission(target_user_id uuid, target_screen_code text)
returns public.portal_permission_level language plpgsql stable security definer set search_path = public, pg_temp as $$
declare result public.portal_permission_level; current_code text := target_screen_code; parent_code text;
begin
  if exists (select 1 from public.portal_user_profiles where user_id=target_user_id and is_active and is_super_admin) then return 'EDIT'; end if;
  if not exists (select 1 from public.portal_user_profiles where user_id=target_user_id and is_active) then return 'HIDDEN'; end if;
  while current_code is not null loop
    select up.permission_level into result from public.portal_user_permissions up join public.portal_user_profiles p on p.user_id=up.user_id and p.permission_configuration_id=up.permission_configuration_id where up.user_id=target_user_id and up.screen_code=current_code;
    if found then return result; end if;
    select parent_screen_code into parent_code from public.portal_sections where screen_code=current_code and is_active;
    current_code := parent_code;
  end loop;
  return 'HIDDEN';
end $$;

create or replace function public.portal_my_access()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
select jsonb_build_object(
 'profile', jsonb_build_object('user_id',p.user_id,'display_name',p.display_name,'is_active',p.is_active,'is_super_admin',p.is_super_admin,'scope_mode',p.scope_mode),
 'sections', coalesce((select jsonb_agg(jsonb_build_object('screen_code',s.screen_code,'parent_screen_code',s.parent_screen_code,'route',s.route,'display_name',s.display_name,'icon',s.icon,'description',s.description,'display_order',s.display_order,'is_navigation_item',s.is_navigation_item,'is_scope_required',s.is_scope_required,'permission_level',public.portal_effective_permission(auth.uid(),s.screen_code)) order by s.display_order) from public.portal_sections s where s.is_active),'[]'::jsonb),
 'allocation_unit_ids', case when p.is_super_admin or p.scope_mode='ORGANIZATION' then '[]'::jsonb else coalesce((select jsonb_agg(allocation_unit_id) from public.portal_user_allocation_units where user_id=p.user_id and permission_configuration_id=p.permission_configuration_id),'[]'::jsonb) end,
 'daycare_ids', case when p.is_super_admin or p.scope_mode='ORGANIZATION' then '[]'::jsonb else coalesce((select jsonb_agg(daycare_id) from public.portal_user_daycares where user_id=p.user_id and permission_configuration_id=p.permission_configuration_id),'[]'::jsonb) end
) from public.portal_user_profiles p where p.user_id=auth.uid() and p.is_active;
$$;

create or replace function public.portal_can_manage_users(actor_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
select public.portal_effective_permission(actor_id,'management.permissions.users')='EDIT';
$$;

create or replace function public.portal_guard_final_super_admin()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if old.is_super_admin and old.is_active and (not coalesce(new.is_super_admin,false) or not coalesce(new.is_active,false))
     and (select count(*) from public.portal_user_profiles where is_super_admin and is_active and user_id<>old.user_id)=0 then
    raise exception 'FINAL_SUPER_ADMIN_PROTECTED' using errcode='P0001';
  end if;
  if new.is_super_admin then new.scope_mode := 'ORGANIZATION'; new.is_active := true; end if;
  new.updated_at := timezone('utc',now()); return new;
end $$;
create trigger portal_guard_final_super_admin before update on public.portal_user_profiles for each row execute function public.portal_guard_final_super_admin();

create or replace function public.portal_admin_save_user(
  actor_id uuid, target_user_id uuid, profile_values jsonb,
  permission_values jsonb default '[]'::jsonb,
  allocation_unit_ids uuid[] default '{}'::uuid[], daycare_ids uuid[] default '{}'::uuid[])
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare before_value jsonb; after_value jsonb; item jsonb; requested_super boolean; new_configuration_id uuid := gen_random_uuid();
begin
  if not public.portal_can_manage_users(actor_id) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
  if not exists(select 1 from auth.users where id=target_user_id and deleted_at is null) then raise exception 'AUTH_USER_NOT_FOUND'; end if;
  select jsonb_build_object('profile',to_jsonb(p)-'permission_configuration_id'-'updated_at','permissions',coalesce((select jsonb_agg(to_jsonb(x)-'permission_configuration_id'-'updated_at' order by screen_code) from public.portal_user_permissions x where x.user_id=target_user_id and x.permission_configuration_id=p.permission_configuration_id),'[]'::jsonb),'allocation_unit_ids',coalesce((select jsonb_agg(allocation_unit_id) from public.portal_user_allocation_units where user_id=target_user_id and permission_configuration_id=p.permission_configuration_id),'[]'::jsonb),'daycare_ids',coalesce((select jsonb_agg(daycare_id) from public.portal_user_daycares where user_id=target_user_id and permission_configuration_id=p.permission_configuration_id),'[]'::jsonb)) into before_value from public.portal_user_profiles p where p.user_id=target_user_id;
  requested_super := coalesce((profile_values->>'is_super_admin')::boolean,false);
  insert into public.portal_user_profiles(user_id,display_name,is_active,is_super_admin,scope_mode,permission_configuration_id)
  values(target_user_id,nullif(trim(profile_values->>'display_name'),''),coalesce((profile_values->>'is_active')::boolean,true),requested_super,
    case when requested_super then 'ORGANIZATION'::public.portal_scope_mode else coalesce((profile_values->>'scope_mode')::public.portal_scope_mode,'SELECTED') end,new_configuration_id)
  on conflict(user_id) do update set display_name=excluded.display_name,is_active=excluded.is_active,is_super_admin=excluded.is_super_admin,scope_mode=excluded.scope_mode,permission_configuration_id=excluded.permission_configuration_id;
  for item in select value from jsonb_array_elements(coalesce(permission_values,'[]'::jsonb)) loop
    insert into public.portal_user_permissions(permission_configuration_id,user_id,screen_code,permission_level,updated_by_user_id)
    values(new_configuration_id,target_user_id,item->>'screen_code',(item->>'permission_level')::public.portal_permission_level,actor_id);
  end loop;
  if not requested_super and coalesce(profile_values->>'scope_mode','SELECTED')='SELECTED' then
    insert into public.portal_user_allocation_units select new_configuration_id,target_user_id, unnest(allocation_unit_ids) on conflict do nothing;
    insert into public.portal_user_daycares select new_configuration_id,target_user_id, unnest(daycare_ids) on conflict do nothing;
  end if;
  select jsonb_build_object('profile',to_jsonb(p)-'permission_configuration_id'-'updated_at','permissions',coalesce((select jsonb_agg(to_jsonb(x)-'permission_configuration_id'-'updated_at' order by screen_code) from public.portal_user_permissions x where x.user_id=target_user_id and x.permission_configuration_id=p.permission_configuration_id),'[]'::jsonb),'allocation_unit_ids',coalesce((select jsonb_agg(allocation_unit_id) from public.portal_user_allocation_units where user_id=target_user_id and permission_configuration_id=p.permission_configuration_id),'[]'::jsonb),'daycare_ids',coalesce((select jsonb_agg(daycare_id) from public.portal_user_daycares where user_id=target_user_id and permission_configuration_id=p.permission_configuration_id),'[]'::jsonb)) into after_value from public.portal_user_profiles p where p.user_id=target_user_id;
  if before_value is distinct from after_value then
    insert into public.audit_events(entity_type,entity_id,operation,previous_values,new_values,source_type,actor_user_id)
    values('PORTAL_USER',target_user_id,case when before_value is null then 'INSERT' else 'UPDATE' end,before_value,after_value,'PORTAL_ADMIN',actor_id);
  end if;
end $$;

alter table public.portal_sections enable row level security;
alter table public.portal_user_profiles enable row level security;
alter table public.portal_user_permissions enable row level security;
alter table public.portal_user_allocation_units enable row level security;
alter table public.portal_user_daycares enable row level security;

create policy portal_sections_authenticated_read on public.portal_sections for select to authenticated using (is_active);
create policy portal_profiles_self_read on public.portal_user_profiles for select to authenticated using (user_id=auth.uid());
create policy portal_permissions_self_read on public.portal_user_permissions for select to authenticated using (user_id=auth.uid());
create policy portal_units_self_read on public.portal_user_allocation_units for select to authenticated using (user_id=auth.uid());
create policy portal_daycares_self_read on public.portal_user_daycares for select to authenticated using (user_id=auth.uid());

revoke all on public.portal_user_profiles, public.portal_user_permissions, public.portal_user_allocation_units, public.portal_user_daycares from anon, authenticated;
grant select on public.portal_sections to authenticated;
grant select on public.portal_user_profiles, public.portal_user_permissions, public.portal_user_allocation_units, public.portal_user_daycares to authenticated;
revoke all on function public.portal_effective_permission(uuid,text), public.portal_can_manage_users(uuid) from public, anon, authenticated;
grant execute on function public.portal_effective_permission(uuid,text), public.portal_can_manage_users(uuid) to service_role;
grant execute on function public.portal_my_access() to authenticated, service_role;
revoke all on function public.portal_admin_save_user(uuid,uuid,jsonb,jsonb,uuid[],uuid[]) from public, anon, authenticated;
grant execute on function public.portal_admin_save_user(uuid,uuid,jsonb,jsonb,uuid[],uuid[]) to service_role;

comment on table public.portal_sections is 'Normalized catalog and stable screen codes for portal routing, navigation, breadcrumbs and permission inheritance.';
comment on table public.portal_user_profiles is 'Portal identity attributes layered on Supabase Auth; SUPER_ADMIN is an invariant, not a fixed business role.';
