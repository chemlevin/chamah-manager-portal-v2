insert into public.portal_sections
  (screen_code,parent_screen_code,route,display_name,icon,description,display_order,is_active,is_navigation_item,is_scope_required)
values ('management.settings','management','training/settings','הגדרות','⚙','מרכז ההגדרות האחוד של הפורטל',56,true,true,false)
on conflict (screen_code) do update set display_name=excluded.display_name,route=excluded.route,description=excluded.description,is_active=true,is_navigation_item=true,updated_at=timezone('utc',now());

update public.portal_sections
set is_active=false,is_navigation_item=false,updated_at=timezone('utc',now())
where screen_code in ('management.tables','management.tables.calculation','management.tables.variables');
