export const REFERENCE_TABLES = [
  { table: 'school_years', title: 'שנות לימודים', description: 'תקופות SY מתועדות.', columns: [['display_name', 'שנת לימודים'], ['start_date', 'תחילה'], ['end_date', 'סיום'], ['is_default', 'ברירת מחדל'], ['is_selectable', 'זמינה לבחירה']] },
  { table: 'calendar_years', title: 'שנים קלנדריות', description: 'תקופות CY לדיווח כספי.', columns: [['display_name', 'שנה'], ['start_date', 'תחילה'], ['end_date', 'סיום'], ['status', 'מצב']] },
  { table: 'school_year_months', title: 'חודשי שנת לימודים', description: 'חודשי הדיווח לפי רצף שנת הלימודים.', columns: [['month_label', 'חודש'], ['school_year_id', 'שנת לימודים'], ['start_date', 'תחילה'], ['end_date', 'סיום'], ['school_year_sequence', 'סדר']] },
  { table: 'legal_entity_types', title: 'סוגי ישות משפטית', description: 'סוגי הישויות המשפטיות המוגדרים במערכת.', columns: [['display_name', 'סוג'], ['legal_entity_type_code', 'קוד'], ['lifecycle_status', 'מצב']] },
  { table: 'legal_entities', title: 'ישויות משפטיות', description: 'הישויות המשפטיות הפעילות וההיסטוריות.', columns: [['display_name', 'ישות'], ['legal_entity_code', 'קוד'], ['legal_entity_type_id', 'סוג'], ['lifecycle_status', 'מצב']] },
  { table: 'allocation_units', title: 'מחלקות ויחידות הקצאה', description: 'יעדי הקצאה ודיווח ארגוניים.', columns: [['display_name', 'יחידה'], ['allocation_unit_type', 'סוג'], ['lifecycle_status', 'מצב']] },
  { table: 'daycares', title: 'מעונות', description: 'מעונות המערכת.', columns: [['display_name', 'מעון'], ['daycare_code', 'קוד'], ['allocation_unit_id', 'יחידה'], ['lifecycle_status', 'מצב']] },
  { table: 'age_groups', title: 'קבוצות גיל', description: 'קבוצות הגיל המשמשות רישוי וחישוב.', columns: [['display_name', 'קבוצת גיל'], ['age_group_code', 'קוד'], ['display_order', 'סדר'], ['lifecycle_status', 'מצב']] },
  { table: 'classrooms', title: 'כיתות', description: 'כיתות לפי מעון ושנת לימודים.', columns: [['display_name', 'כיתה'], ['classroom_code', 'קוד'], ['daycare_id', 'מעון'], ['school_year_id', 'שנת לימודים'], ['lifecycle_status', 'מצב']] },
  { table: 'roles', title: 'תפקידי שכר', description: 'תפקידים המשמשים הקצאות שכר.', columns: [['display_name', 'תפקיד'], ['role_code', 'קוד'], ['lifecycle_status', 'מצב']] },
  { table: 'certificate_types', title: 'סוגי תעודות', description: 'סוגי תעודות והכשרות עובדים.', columns: [['display_name', 'תעודה'], ['certificate_type_code', 'קוד'], ['lifecycle_status', 'מצב']] },
  { table: 'budget_categories', title: 'סעיפי תקציב', description: 'קטגוריות תקציב יציבות.', columns: [['display_name', 'סעיף'], ['budget_category_code', 'קוד'], ['category_type', 'סוג'], ['lifecycle_status', 'מצב']] },
  { table: 'bank_accounts', title: 'חשבונות בנק', description: 'חשבונות הבנק המוגדרים במערכת.', columns: [['account_name', 'חשבון'], ['bank_name', 'בנק'], ['branch_number', 'סניף'], ['account_number', 'מספר חשבון'], ['lifecycle_status', 'מצב']] }
];

export const DOCUMENTED_STATUS_RULES = ['BR-0067', 'BR-0134', 'BR-0135', 'BR-0118', 'BR-0055', 'BR-0105'];

export const VARIABLE_RULE_TABLES = [
  { table: 'classroom_licensing_rules', title: 'כללי רישוי כיתה', description: 'שטח, קיבולת, שילובי גיל ועיגול לפי תוקף.', columns: [['age_group', 'קבוצת גיל'], ['sqm_per_child', 'מ״ר לילד'], ['max_children', 'מקסימום ילדים'], ['allowed_mixed_with', 'שילוב מותר'], ['rounding_method', 'עיגול'], ['valid_from', 'בתוקף מ־'], ['valid_to', 'בתוקף עד'], ['lifecycle_status', 'מצב']] },
  { table: 'budget_rules', title: 'כללי תקציב, שכר לימוד ותקינה', description: 'פרמטרים משתנים לחישובי תקציב, תקינה ושכר לימוד.', columns: [['budget_category_id', 'סעיף תקציב'], ['school_year_id', 'שנת לימודים'], ['age_group_id', 'קבוצת גיל'], ['standard_type', 'תקן'], ['calculation_method', 'שיטת חישוב'], ['numeric_value', 'ערך'], ['effective_from', 'בתוקף מ־'], ['effective_to', 'בתוקף עד'], ['lifecycle_status', 'מצב']] },
  { table: 'staffing_budget_parameters', title: 'פרמטרי שעות תקינה', description: 'שעות חודשיות לתכנון תקינה לפי שנת לימודים.', columns: [['school_year_id', 'שנת לימודים'], ['monthly_hours_per_fte', 'שעות חודשיות למשרה'], ['effective_from', 'בתוקף מ־'], ['effective_to', 'בתוקף עד'], ['lifecycle_status', 'מצב']] },
  { table: 'compensation_factors', title: 'רכיבי תגמול', description: 'רכיבי שכר כגון ותק, תעודה, תפקיד, נסיעות ותוספות.', columns: [['display_name', 'רכיב'], ['factor_code', 'קוד'], ['calculation_type', 'סוג חישוב'], ['lifecycle_status', 'מצב']] },
  { table: 'compensation_rules', title: 'כללי תגמול ושכר', description: 'ערכי רכיבי תגמול לפי תוקף, ותק ושנת לימודים.', columns: [['compensation_factor_id', 'רכיב'], ['school_year_id', 'שנת לימודים'], ['numeric_value', 'ערך'], ['minimum_seniority_months', 'וותק מזערי'], ['maximum_seniority_months', 'וותק מרבי'], ['effective_from', 'בתוקף מ־'], ['effective_to', 'בתוקף עד'], ['lifecycle_status', 'מצב']] }
];
