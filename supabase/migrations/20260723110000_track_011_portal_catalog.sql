-- TRACK 011: repair UTF-8 catalog copy and register every current portal page.
-- Stable screen codes remain unchanged so saved permission rows keep their IDs.

insert into public.portal_sections
  (screen_code, parent_screen_code, route, display_name, icon, description, display_order, is_navigation_item, is_scope_required)
values
  ('home', null, 'home', 'עמוד הבית', '⌂', 'שער הכניסה לפורטל', 10, true, false),
  ('dashboards', null, 'dashboards', 'דשבורדים', '▦', 'דשבורדים לפי יחידה ארגונית', 20, true, true),
  ('dashboards.finance', 'dashboards', 'dashboards/unit/organization/finance', 'כספים', '₪', 'תמונה כספית ניהולית', 21, false, true),
  ('dashboards.accounting', 'dashboards', 'dashboards/unit/organization/accounting', 'הנה״ח', '🧾', 'בקרה על הנהלת החשבונות', 22, true, true),
  ('dashboards.licensing', 'dashboards', 'dashboards/unit/organization/licensing', 'רישוי', '✓', 'רישיונות ועמידה בדרישות', 23, false, true),
  ('dashboards.team', 'dashboards', 'dashboards/unit/organization/team', 'צוות', '👥', 'צוות, תפקידים והכשרות', 24, false, true),
  ('dashboards.staffing', 'dashboards', 'dashboards/unit/organization/staffing', 'צוות ורישוי', '👥', 'תצוגת צוות ורישוי משולבת', 25, true, true),
  ('dashboards.occupancy', 'dashboards', 'dashboards/unit/organization/occupancy', 'תפוסה ותקינה', '🏫', 'תפוסה, כיתות ותקינה', 26, false, true),
  ('calculators', null, 'calculators', 'מחשבונים', '⌗', 'כלי חישוב ותכנון', 30, true, false),
  ('calculators.salary', 'calculators', 'calculators/salary', 'מחשבון שכר', '₪', 'אומדן שכר לפי הכללים הפעילים', 31, false, false),
  ('calculators.occupancy', 'calculators', 'calculators/occupancy', 'מחשבון תפוסה, תקינה ורווחיות', '🏫', 'תכנון תפוסה, שטח וצוות', 32, false, false),
  ('payroll', null, 'payroll', 'שכר', '₪', 'תהליכי שכר וחישובי שכר', 40, true, true),
  ('payroll.calculations', 'payroll', 'payroll/calculations', 'חישובי שכר', '▤', 'מרכז חישובי השכר', 41, false, true),
  ('payroll.calculations.new', 'payroll.calculations', 'payroll/calculations/new', 'חדש', '+', 'פתיחת חישוב שכר חדש', 42, false, true),
  ('payroll.calculations.existing', 'payroll.calculations', 'payroll/calculations/existing', 'קיים', '◷', 'חישובי שכר קיימים', 43, false, true),
  ('payroll.calculations.history', 'payroll.calculations', 'payroll/calculations/history', 'טבלאות עבר', '▦', 'טבלאות שכר מתקופות קודמות', 44, false, true),
  ('management', null, 'training', 'הרשאות וטבלאות', '▤', 'ניהול והרשאות הפורטל', 50, true, false),
  ('management.permissions', 'management', 'training/permissions', 'הרשאות', '⚿', 'ניהול הרשאות', 51, false, false),
  ('management.permissions.users', 'management.permissions', 'training/permissions/users', 'רשימת משתמשים והרשאות', '👥', 'משתמשים, טווחי נתונים והרשאות', 52, false, false),
  ('management.rules', 'management', 'training/rules', 'כללים', '§', 'כללי חישוב ומערכת', 53, false, false),
  ('management.rules.calculation', 'management.rules', 'training/rules/calculation', 'כללי חישוב', '§', 'כללי חישוב ניתנים לניהול', 54, false, false),
  ('management.rules.system', 'management.rules', 'training/rules/system', 'כללי מערכת', '§', 'קטלוג כללי המערכת', 55, false, false),
  ('management.tables', 'management', 'training/tables', 'טבלאות', '▦', 'טבלאות חישוב ומשתנים', 56, false, false),
  ('management.tables.calculation', 'management.tables', 'training/tables/calculation', 'טבלאות חישוב', '▦', 'טבלאות חישוב ניתנות לניהול', 57, false, false),
  ('management.tables.variables', 'management.tables', 'training/tables/variables', 'משתנים', '⇄', 'משתנים וכללים דינמיים', 58, false, false),
  ('management.audit', 'management', 'training/audit', 'יומן שינויים', '◷', 'היסטוריית שינויים אמיתית', 59, false, false),
  ('knowledge', null, 'knowledge', 'מרכז הידע למשתמש', '📚', 'נהלים והנחיות למשתמש', 60, true, false),
  ('maintenance', null, 'maintenance', 'תחזוקה', '🔧', 'דיווח ומעקב תחזוקה', 70, true, true),
  ('tasks', null, 'tasks', 'משימות', '✓', 'משימות ומעקב ביצוע', 80, true, true)
on conflict (screen_code) do update set
  parent_screen_code = excluded.parent_screen_code,
  route = excluded.route,
  display_name = excluded.display_name,
  icon = excluded.icon,
  description = excluded.description,
  display_order = excluded.display_order,
  is_active = true,
  is_navigation_item = excluded.is_navigation_item,
  is_scope_required = excluded.is_scope_required,
  updated_at = timezone('utc', now());
