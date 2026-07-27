-- Repair canonical permission catalog coverage for every currently visible
-- permissions row. Existing permission rows are preserved by the upsert.
insert into public.portal_sections (
  screen_code, parent_screen_code, route, display_name, icon, description,
  display_order, is_active, is_navigation_item, is_scope_required
)
values
  ('dashboards.accounting.summary', 'dashboards.accounting',
   'dashboards/unit/organization/accounting/summary', 'דשבורד סיכום', '▦',
   'בקרה מסכמת על תהליכי הנהלת החשבונות.', 23, true, false, true),
  ('dashboards.accounting.bank-transfers', 'dashboards.accounting',
   'dashboards/unit/organization/accounting/bank-transfers', 'העברות בנקאיות', '↔',
   'סביבת עבודה להכנה, פיצול ומעקב אחר העברות בנקאיות.', 25, true, false, true),
  ('dashboards.staffing.employees.import', 'dashboards.staffing.employees',
   'dashboards/unit/organization/staffing/employees/import', 'ייבוא עובדים', '⇧',
   'ייבוא עובדים מקובץ Excel לאחר מיפוי ואימות.', 26, true, false, true),
  ('dashboards.staffing.actual-payroll', 'dashboards.staffing',
   'dashboards/unit/organization/staffing/actual-payroll', 'ביצוע שכר', '₪',
   'סביבת עבודה לקליטה, התאמה והקצאה של ביצוע השכר בפועל.', 27, true, false, true)
on conflict (screen_code) do update set
  parent_screen_code = excluded.parent_screen_code,
  route = excluded.route,
  display_name = excluded.display_name,
  icon = excluded.icon,
  description = excluded.description,
  display_order = excluded.display_order,
  is_active = excluded.is_active,
  is_navigation_item = excluded.is_navigation_item,
  is_scope_required = excluded.is_scope_required,
  updated_at = timezone('utc', now());
