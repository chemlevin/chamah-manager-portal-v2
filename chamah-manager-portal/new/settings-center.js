const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const option = (value, label) => ({ value, label });
const statuses = [option('ACTIVE', 'פעיל'), option('INACTIVE', 'לא פעיל'), option('ARCHIVED', 'בארכיון')];
const f = (name, label, type = 'text', config = {}) => ({ name, label, type, ...config });
const link = (name, label, source, key, config = {}) => f(name, label, 'link', { source, key, display: 'display_name', ...config });

export const SETTINGS_SECTIONS = [
  { id: 'periods', title: 'תקופות ושנים', description: 'שנות לימודים, שנים קלנדריות וחודשי דיווח.', tables: [
    { table: 'school_years', key: 'school_year_id', title: 'שנות לימודים', fields: [f('display_name','שם השנה'),f('school_year_code','קוד קבוע','text',{technical:true}),f('start_date','מתאריך','date'),f('end_date','עד תאריך','date'),f('status','מצב','select',{options:[option('DRAFT','טיוטה'),option('ACTIVE','פעילה'),option('LOCKED','נעולה')]}),f('is_selectable','זמינה לבחירה','boolean')] },
    { table: 'calendar_years', key: 'calendar_year_id', title: 'שנים קלנדריות', fields: [f('display_name','שם השנה'),f('calendar_year_code','קוד קבוע','text',{technical:true}),f('year_number','שנה','number'),f('start_date','מתאריך','date'),f('end_date','עד תאריך','date'),f('status','מצב','select',{options:[option('FUTURE','עתידית'),option('OPEN','פתוחה'),option('CLOSED','סגורה')]}),f('is_selectable','זמינה לבחירה','boolean')] },
    { table: 'school_year_months', key: 'school_year_month_id', title: 'חודשי שנת לימודים', fields: [link('school_year_id','שנת לימודים','school_years','school_year_id'),f('month_label','חודש'),f('reporting_month','חודש דיווח'),f('start_date','מתאריך','date'),f('end_date','עד תאריך','date'),f('school_year_sequence','סדר','number')] }
  ]},
  { id: 'organization', title: 'הארגון והמעונות', description: 'ישויות משפטיות, יחידות דיווח ומעונות.', tables: [
    { table: 'legal_entity_types', key: 'legal_entity_type_id', title: 'סוגי ישות משפטית', fields: [f('display_name','שם הסוג'),f('legal_entity_type_code','קוד קבוע','text',{technical:true}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'legal_entities', key: 'legal_entity_id', title: 'ישויות משפטיות', fields: [f('display_name','שם לתצוגה'),f('legal_name','שם משפטי'),link('legal_entity_type_id','סוג ישות','legal_entity_types','legal_entity_type_id'),f('registration_number','מספר רישום'),f('legal_entity_code','קוד קבוע','text',{technical:true}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'allocation_units', key: 'allocation_unit_id', title: 'יחידות ארגוניות', fields: [f('display_name','שם היחידה'),f('allocation_unit_type','סוג','select',{options:[option('DAYCARE','מעון'),option('OFFICE','משרד'),option('MANAGEMENT','הנהלה'),option('DEVELOPMENT','פיתוח'),option('OTHER','אחר')]}),link('legal_entity_id','ישות משפטית','legal_entities','legal_entity_id'),f('allocation_unit_code','קוד קבוע','text',{technical:true}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'daycares', key: 'daycare_id', title: 'מעונות', fields: [f('display_name','שם המעון'),link('legal_entity_id','ישות משפטית','legal_entities','legal_entity_id'),link('allocation_unit_id','יחידת דיווח','allocation_units','allocation_unit_id',{dependsOn:'legal_entity_id',match:'legal_entity_id'}),f('license_number','מספר רישיון'),f('address_text','כתובת'),f('opened_on','תאריך פתיחה','date'),f('closed_on','תאריך סגירה','date'),f('daycare_code','קוד קבוע','text',{technical:true}),f('lifecycle_status','מצב','select',{options:statuses})] }
  ]},
  { id: 'classrooms', title: 'הפעלת מעונות וכיתות', description: 'הקשר בין שנה, מעון וכיתה.', tables: [
    { table: 'daycare_school_years', key: 'daycare_school_year_id', title: 'הפעלת מעון בשנה', fields: [link('school_year_id','שנת לימודים','school_years','school_year_id'),link('daycare_id','מעון','daycares','daycare_id'),f('is_operating','פעיל בשנה','boolean')] },
    { table: 'classrooms', key: 'classroom_id', title: 'כיתות', fields: [link('daycare_school_year_id','מעון ושנה','daycare_school_years','daycare_school_year_id',{display:'_label'}),f('display_name','שם הכיתה'),f('classroom_code','קוד קבוע','text',{technical:true}),f('is_mixed','כיתה מעורבת','boolean'),f('effective_from','בתוקף מתאריך','date'),f('effective_to','עד תאריך','date'),f('lifecycle_status','מצב','select',{options:statuses.filter((item)=>item.value!=='ARCHIVED')})] },
    { table: 'age_groups', key: 'age_group_id', title: 'קבוצות גיל', fields: [f('display_name','שם הקבוצה'),f('age_group_code','קוד קבוע','text',{technical:true}),f('display_order','סדר','number'),f('lifecycle_status','מצב','select',{options:statuses})] }
  ]},
  { id: 'finance', title: 'כספים והנהלת חשבונות', description: 'סעיפי תקציב, חשבונות בנק ומצבי טיפול.', tables: [
    { table: 'budget_categories', key: 'budget_category_id', title: 'סעיפי תקציב', fields: [f('display_name','שם הסעיף'),f('budget_category_code','קוד קבוע','text',{technical:true}),f('category_type','סוג','select',{options:[option('INCOME','הכנסה'),option('EXPENSE','הוצאה'),option('INTERNAL_OFFSET','קיזוז פנימי'),option('MANUAL_UNDEFINED','ידני / לא מוגדר')]}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'bank_accounts', key: 'bank_account_id', title: 'חשבונות בנק', fields: [f('display_name','שם החשבון'),link('legal_entity_id','ישות משפטית','legal_entities','legal_entity_id'),f('account_identifier_masked','מזהה חשבון מוסווה'),f('bank_account_code','קוד קבוע','text',{technical:true}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'accounting_statuses', key: 'accounting_status_id', title: 'מצבי הנהלת חשבונות', fields: [f('display_name','שם המצב'),f('display_order','סדר','number'),f('is_final','מצב סופי','boolean'),f('lifecycle_status','מצב','select',{options:statuses})] }
  ]},
  { id: 'rules', title: 'צוות וכללים', description: 'תפקידים, הכשרות וכללי רישוי ותקינה.', tables: [
    { table: 'roles', key: 'role_id', title: 'תפקידים', fields: [f('display_name','שם התפקיד'),f('role_code','קוד קבוע','text',{technical:true}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'certificate_types', key: 'certificate_type_id', title: 'תעודות והכשרות', fields: [f('display_name','שם התעודה'),f('certificate_type_code','קוד קבוע','text',{technical:true}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'classroom_licensing_rules', key: 'classroom_licensing_rule_id', title: 'כללי רישוי כיתה', fields: [f('age_group','קבוצת גיל','select',{options:[option('INFANT','תינוקות'),option('TODDLER','פעוטות'),option('GRADUATE','בוגרים')]}),f('sqm_per_child','מ״ר לילד','number'),f('max_children','מקסימום ילדים','number'),f('rounding_method','שיטת עיגול','select',{options:[option('FLOOR','עיגול כלפי מטה')]}),f('valid_from','בתוקף מתאריך','date'),f('valid_to','עד תאריך','date'),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'staffing_rules', key: 'staffing_rule_id', title: 'כללי תקינה', fields: [link('school_year_id','שנת לימודים','school_years','school_year_id'),f('standard_type','סוג תקן','select',{options:[option('BASIC','בסיסי'),option('EXTENDED','מורחב')]}),f('age_group','קבוצת גיל','select',{options:[option('INFANT','תינוקות'),option('TODDLER','פעוטות'),option('GRADUATE','בוגרים')]}),f('children_per_staff','ילדים לאשת צוות','number'),f('minimum_staff','מינימום צוות','number'),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'staffing_budget_parameters', key: 'staffing_budget_parameter_id', title: 'פרמטרי תקציב צוות', fields: [link('school_year_id','שנת לימודים','school_years','school_year_id'),f('monthly_hours_per_fte','שעות חודשיות למשרה','number'),f('hourly_budget_cost','עלות שעתית לתקציב','number'),link('effective_from_month_id','בתוקף מחודש','school_year_months','school_year_month_id',{display:'month_label',dependsOn:'school_year_id',match:'school_year_id'}),link('effective_to_month_id','עד חודש','school_year_months','school_year_month_id',{display:'month_label',dependsOn:'school_year_id',match:'school_year_id'}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'compensation_factors', key: 'compensation_factor_id', title: 'רכיבי תגמול', fields: [f('display_name','שם הרכיב'),f('compensation_factor_code','קוד קבוע','text',{technical:true}),f('value_type','סוג ערך','select',{options:[option('HOURLY','שעתי'),option('GLOBAL_MONTHLY','חודשי קבוע'),option('ONE_TIME','חד־פעמי')]}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'compensation_rules', key: 'compensation_rule_id', title: 'כללי תגמול ושכר', fields: [link('compensation_factor_id','רכיב תגמול','compensation_factors','compensation_factor_id'),link('school_year_id','שנת לימודים','school_years','school_year_id'),f('amount','סכום','number'),f('minimum_seniority_months','וותק מזערי','number'),f('maximum_seniority_months','וותק מרבי','number'),f('applies_to_paid_leave_hours','חל על שעות היעדרות בתשלום','boolean'),f('effective_from','בתוקף מתאריך','date'),f('effective_to','עד תאריך','date'),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'budget_rules', key: 'budget_rule_id', title: 'כללי תקציב', fields: [link('budget_category_id','סעיף תקציב','budget_categories','budget_category_id'),link('school_year_id','שנת לימודים','school_years','school_year_id'),link('calendar_year_id','שנה קלנדרית','calendar_years','calendar_year_id'),f('rule_type','סוג כלל','select',{options:[option('FORMULA_BASED','נוסחה מאושרת'),option('FIXED_AMOUNT','סכום קבוע'),option('MANUAL','ערך ידני'),option('EXTERNAL_SOURCE','מקור חיצוני')]}),f('calculation_source','מקור חישוב','select',{options:[option('BANKS','בנקים'),option('PAYROLL','שכר'),option('CHILDREN','ילדים'),option('SYSTEM','מערכת'),option('MANUAL','ידני')]}),f('actual_performance_source','מקור ביצוע בפועל','select',{options:[option('BANKS','בנקים'),option('PAYROLL','שכר'),option('CHILDREN','ילדים'),option('SYSTEM','מערכת'),option('MANUAL','ידני')]}),link('daycare_id','מעון','daycares','daycare_id'),link('allocation_unit_id','יחידה ארגונית','allocation_units','allocation_unit_id'),link('age_group_id','קבוצת גיל','age_groups','age_group_id'),f('numeric_value','ערך מספרי','number'),f('text_value','קוד שיטה / מקור'),f('effective_from','בתוקף מתאריך','date'),f('effective_to','עד תאריך','date'),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'travel_rates', key: 'travel_rate_id', title: 'תעריפי נסיעות', fields: [link('school_year_id','שנת לימודים','school_years','school_year_id'),f('daily_travel_amount','תעריף יומי','number'),f('maximum_monthly_travel_amount','תקרה חודשית','number'),f('lifecycle_status','מצב','select',{options:statuses})] }
  ]}
];

const configs = SETTINGS_SECTIONS.flatMap((section) => section.tables);
const byTable = new Map(configs.map((config) => [config.table, config]));
const requiredFields = {
  school_years: ['display_name','school_year_code','start_date','end_date','status'],
  calendar_years: ['display_name','calendar_year_code','year_number','start_date','end_date','status'],
  school_year_months: ['school_year_id','month_label','reporting_month','start_date','end_date','school_year_sequence'],
  legal_entity_types: ['display_name','legal_entity_type_code','lifecycle_status'],
  legal_entities: ['display_name','legal_name','legal_entity_type_id','registration_number','legal_entity_code','lifecycle_status'],
  allocation_units: ['display_name','allocation_unit_type','allocation_unit_code','lifecycle_status'],
  daycares: ['display_name','legal_entity_id','allocation_unit_id','daycare_code','lifecycle_status'],
  daycare_school_years: ['school_year_id','daycare_id'],
  classrooms: ['daycare_school_year_id','display_name','classroom_code','effective_from','lifecycle_status'],
  age_groups: ['display_name','age_group_code','display_order','lifecycle_status'],
  budget_categories: ['display_name','budget_category_code','category_type','lifecycle_status'],
  bank_accounts: ['display_name','legal_entity_id','bank_account_code','lifecycle_status'],
  accounting_statuses: ['display_name','display_order','lifecycle_status'],
  roles: ['display_name','role_code','lifecycle_status'],
  certificate_types: ['display_name','certificate_type_code','lifecycle_status'],
  classroom_licensing_rules: ['age_group','sqm_per_child','max_children','rounding_method','valid_from','lifecycle_status'],
  staffing_rules: ['school_year_id','standard_type','age_group','children_per_staff','minimum_staff','lifecycle_status'],
  staffing_budget_parameters: ['school_year_id','monthly_hours_per_fte','hourly_budget_cost','effective_from_month_id','lifecycle_status'],
  compensation_factors: ['display_name','compensation_factor_code','value_type','lifecycle_status'],
  compensation_rules: ['compensation_factor_id','amount','minimum_seniority_months','effective_from','lifecycle_status'],
  budget_rules: ['budget_category_id','rule_type','effective_from','lifecycle_status'],
  travel_rates: ['school_year_id','daily_travel_amount','maximum_monthly_travel_amount','lifecycle_status']
};
configs.forEach((config) => config.fields.forEach((field) => { field.required = requiredFields[config.table]?.includes(field.name) || false; }));

const ruleHelp = {
  roles: ['מגדיר את תפקידי העובדות במערכת.','הקוד הוא מזהה יציב; השבתה מונעת שימוש חדש ואינה מוחקת היסטוריה.','משמש הקצאות עובדים ושכר.','צוות, שכר, דשבורד כוח אדם.'],
  certificate_types: ['מגדיר תעודות והכשרות שניתן לשייך לעובדות.','כל תעודה נשמרת בקוד יציב ובמצב מחזור חיים.','משמש רישומי הסמכה וציות.','עובדים, בקרות ציות ודוחות.'],
  classroom_licensing_rules: ['מגדיר שטח וקיבולת מרביים לפי קבוצת גיל.','הקיבולת היא המינימום בין מגבלת השטח למקסימום הילדים, בעיגול כלפי מטה.','תלוי בקבוצת גיל ובטווח תוקף שאינו הפוך.','מחשבון תפוסה, רישוי ודשבורד תפוסה.'],
  staffing_rules: ['מגדיר יחס ילדים לאשת צוות ומינימום צוות.','הצוות הנדרש מחושב לפי היחס, אך לעולם לא יורד מהמינימום.','תלוי בשנת לימודים, סוג תקן וקבוצת גיל.','תקינה, תפוסה, תקציב ודשבורד צוות.'],
  staffing_budget_parameters: ['מגדיר שעות משרה ועלות שעה לתקציב צוות.','עלות התקציב נגזרת משעות הצוות הנדרשות כפול העלות השעתית.','טווח החודשים חייב להשתייך לאותה שנת לימודים ולהיות בסדר כרונולוגי.','תקציב, שכר צפוי ודשבורד פיננסי.'],
  compensation_factors: ['מגדיר את סוגי רכיבי התגמול.','סוג הערך קובע אם הרכיב שעתי, חודשי קבוע או חד־פעמי.','כללי תגמול מפנים לרכיב באמצעות מזהה יציב.','מחשבון שכר, תנאי העסקה ודוחות שכר.'],
  compensation_rules: ['מגדיר סכום תגמול לפי רכיב, ותק וטווח תוקף.','הוותק המרבי אינו יכול להיות קטן מהמזערי והסכום אינו שלילי.','תלוי ברכיב תגמול; שנת לימודים היא תחום אופציונלי.','מחשבון שכר ותכנון עלויות שכר.'],
  budget_rules: ['מגדיר כלל תקציבי מתוארך עבור סעיף ותחום ארגוני.','סוג הכלל קובע את חוזה הערך: סכום קבוע דורש ערך מספרי, נוסחה דורשת קוד שיטה, ומקור חיצוני דורש קוד ומקור חישוב.','תלוי בסעיף תקציב, בשנת לימודים או שנה קלנדרית, ובמקורות התחום שנבחרו.','תקציב ודשבורדים פיננסיים; אינו משנה נתוני עבר נעולים.'],
  travel_rates: ['מגדיר תעריף נסיעה יומי ותקרה חודשית.','התקרה החודשית חייבת להיות לפחות בגובה התעריף היומי.','תלוי בשנת לימודים פעילה.','מחשבון שכר ותכנון עלויות נסיעה.']
};

function validate(config, row, data) {
  const errors = [];
  const field = (name) => config.fields.find((item) => item.name === name);
  for (const name of requiredFields[config.table] || []) if (row[name] === null || row[name] === undefined || String(row[name]).trim() === '') errors.push(`${field(name)?.label || name} הוא שדה חובה.`);
  for (const def of config.fields) {
    const value = row[def.name];
    if (def.type === 'number' && value !== null && value !== undefined && (!Number.isFinite(value))) errors.push(`${def.label} חייב להיות מספר תקין.`);
    if ((def.technical || def.name.endsWith('_code')) && value && !/^[A-Z0-9_-]+$/.test(String(value))) errors.push(`${def.label} חייב להכיל אותיות אנגליות גדולות, מספרים, מקף או קו תחתון.`);
  }
  const datePairs = [['start_date','end_date'],['valid_from','valid_to'],['effective_from','effective_to'],['opened_on','closed_on']];
  datePairs.forEach(([start,end]) => { if (row[start] && row[end] && row[end] < row[start]) errors.push(`${field(end)?.label || 'תאריך הסיום'} אינו יכול להיות לפני ${field(start)?.label || 'תאריך ההתחלה'}.`); });
  const positive = ['sqm_per_child','max_children','children_per_staff','minimum_staff','monthly_hours_per_fte','hourly_budget_cost','daily_travel_amount','maximum_monthly_travel_amount'];
  positive.forEach((name) => { if (row[name] !== null && row[name] !== undefined && Number(row[name]) <= 0) errors.push(`${field(name)?.label || name} חייב להיות גדול מאפס.`); });
  ['display_order','school_year_sequence','minimum_seniority_months','maximum_seniority_months','amount'].forEach((name) => { if (row[name] !== null && row[name] !== undefined && Number(row[name]) < 0) errors.push(`${field(name)?.label || name} אינו יכול להיות שלילי.`); });
  if (config.table === 'calendar_years' && row.year_number && (Number(row.year_number) < 2000 || Number(row.year_number) > 2200)) errors.push('השנה חייבת להיות בין 2000 ל־2200.');
  if (config.table === 'calendar_years' && row.year_number && ((row.start_date && Number(row.start_date.slice(0,4)) !== Number(row.year_number)) || (row.end_date && Number(row.end_date.slice(0,4)) !== Number(row.year_number)))) errors.push('תאריכי השנה הקלנדרית חייבים להיות בתוך השנה שנבחרה.');
  if (config.table === 'compensation_rules' && row.maximum_seniority_months !== null && row.maximum_seniority_months !== undefined && Number(row.maximum_seniority_months) < Number(row.minimum_seniority_months || 0)) errors.push('הוותק המרבי אינו יכול להיות קטן מהוותק המזערי.');
  if (config.table === 'travel_rates' && Number(row.maximum_monthly_travel_amount) < Number(row.daily_travel_amount)) errors.push('התקרה החודשית אינה יכולה להיות נמוכה מהתעריף היומי.');
  if (config.table === 'budget_rules') {
    if (!row.school_year_id && !row.calendar_year_id) errors.push('יש לבחור שנת לימודים או שנה קלנדרית.');
    if (row.rule_type === 'FIXED_AMOUNT' && (row.numeric_value === null || row.numeric_value === '') ) errors.push('כלל מסוג סכום קבוע דורש ערך מספרי.');
    if (row.rule_type === 'FIXED_AMOUNT' && String(row.text_value || '').trim()) errors.push('כלל מסוג סכום קבוע אינו מקבל קוד שיטה / מקור.');
    if (row.rule_type === 'FORMULA_BASED' && !String(row.text_value || '').trim()) errors.push('כלל מבוסס נוסחה דורש קוד שיטה מאושר.');
    if (row.rule_type === 'EXTERNAL_SOURCE' && (!String(row.text_value || '').trim() || !row.calculation_source)) errors.push('כלל ממקור חיצוני דורש קוד מקור ומקור חישוב.');
    if (row.rule_type === 'MANUAL' && (row.numeric_value === null || row.numeric_value === '') && !String(row.text_value || '').trim()) errors.push('כלל ידני דורש ערך מספרי או ערך טקסטואלי.');
  }
  if (config.table === 'daycares' && row.allocation_unit_id) {
    const unit = (data.allocation_units || []).find((item) => String(item.allocation_unit_id) === String(row.allocation_unit_id));
    if (unit && String(unit.legal_entity_id || '') !== String(row.legal_entity_id || '')) errors.push('יחידת הדיווח חייבת להשתייך לישות המשפטית שנבחרה.');
  }
  if (config.table === 'staffing_budget_parameters' && row.effective_to_month_id) {
    const months = data.school_year_months || [], from = months.find((item) => String(item.school_year_month_id) === String(row.effective_from_month_id)), to = months.find((item) => String(item.school_year_month_id) === String(row.effective_to_month_id));
    if (from && to && Number(to.school_year_sequence) < Number(from.school_year_sequence)) errors.push('חודש הסיום אינו יכול להיות לפני חודש ההתחלה.');
  }
  return [...new Set(errors)];
}

export function mountSettingsCenter(root, request, { canEdit = false } = {}) {
  let data = {}, query = '', editing = null, message = '', errors = [], helpTable = '';
  const hydrate = () => {
    const years = new Map((data.school_years || []).map((r) => [r.school_year_id, r.display_name]));
    const daycares = new Map((data.daycares || []).map((r) => [r.daycare_id, r.display_name]));
    (data.daycare_school_years || []).forEach((r) => { r._label = `${daycares.get(r.daycare_id) || 'מעון'} · ${years.get(r.school_year_id) || 'שנה'}`; });
  };
  const label = (def, row) => {
    const value = row[def.name];
    if (def.type === 'link') return (data[def.source] || []).find((r) => String(r[def.key]) === String(value))?.[def.display] || 'לא משויך';
    if (def.type === 'boolean') return value ? 'כן' : 'לא';
    return def.options?.find((o) => o.value === value)?.label || value || '—';
  };
  const control = (def, record) => {
    const value = record[def.name] ?? '';
    if (def.type === 'link') {
      let rows = data[def.source] || [];
      if (def.dependsOn && record[def.dependsOn]) rows = rows.filter((r) => String(r[def.match]) === String(record[def.dependsOn]));
      return `<select name="${def.name}" ${def.required ? 'required' : ''}><option value="">בחירה…</option>${rows.map((r) => `<option value="${escape(r[def.key])}" ${String(value) === String(r[def.key]) ? 'selected' : ''}>${escape(r[def.display])}</option>`).join('')}</select>`;
    }
    if (def.type === 'select') return `<select name="${def.name}" ${def.required ? 'required' : ''}><option value="">בחירה…</option>${def.options.map((o) => `<option value="${o.value}" ${value === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}</select>`;
    if (def.type === 'boolean') return `<select name="${def.name}"><option value="true" ${value ? 'selected' : ''}>כן</option><option value="false" ${!value ? 'selected' : ''}>לא</option></select>`;
    return `<input name="${def.name}" type="${def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text'}" ${def.type === 'number' ? 'step="any"' : ''} ${def.required ? 'required' : ''} value="${escape(value)}">`;
  };
  const help = (config) => {
    const values = ruleHelp[config.table];
    if (!values) return '';
    const required = config.fields.filter((item) => item.required).map((item) => item.label).join(', ');
    return `<button class="button button-quiet settings-help-button" type="button" data-settings-help="${config.table}" aria-expanded="${helpTable === config.table}">עזרה</button>${helpTable === config.table ? `<aside class="settings-help" role="note"><h3>עזרה: ${config.title}</h3><dl><div><dt>מטרה</dt><dd>${values[0]}</dd></div><div><dt>לוגיקה עסקית</dt><dd>${values[1]}</dd></div><div><dt>תלויות</dt><dd>${values[2]}</dd></div><div><dt>מודולים מושפעים</dt><dd>${values[3]}</dd></div><div><dt>שדות חובה</dt><dd>${required || 'אין'}</dd></div><div><dt>השפעת שינוי</dt><dd>השינוי חל על חישובים ותצוגות המשתמשים בכלל הפעיל; נתוני עבר נעולים אינם נכתבים מחדש.</dd></div></dl></aside>` : ''}`;
  };
  const render = () => {
    root.innerHTML = `<section class="settings-shell" dir="rtl"><header class="settings-heading"><div><p class="eyebrow">מרכז ניהול</p><h1>הגדרות</h1><p>כל הגדרות המערכת במקום אחד, לפי נושאים עסקיים ולא לפי טבלאות.</p></div><div class="settings-heading-actions"><button class="button button-secondary" type="button" data-settings-back>חזרה</button><div class="settings-source"><strong>Supabase</strong><span>מקור הנתונים הראשי</span></div></div></header>
    <div class="settings-toolbar panel"><label>חיפוש הגדרה<input data-settings-search type="search" value="${escape(query)}" placeholder="מעון, שנה, תפקיד…"></label><span>${configs.length} קבוצות הגדרה</span></div>${message ? `<p class="settings-feedback" role="status">${escape(message)}</p>` : ''}
    <nav class="settings-jump">${SETTINGS_SECTIONS.map((s) => `<a href="#settings-${s.id}">${s.title}</a>`).join('')}</nav>
    ${SETTINGS_SECTIONS.map((section, index) => { const cards = section.tables.filter((c) => !query || c.title.includes(query)).map((config) => { const rows = data[config.table] || []; return `<details class="settings-card panel"><summary><span><strong>${config.title}</strong><small>${section.description}</small></span><b>${rows.length}</b></summary><div class="settings-card-body"><div class="settings-card-actions">${canEdit ? `<button class="button button-primary" data-settings-add="${config.table}">הוספה</button>` : '<span class="status-badge status-neutral">צפייה בלבד</span>'}${help(config)}</div><div class="settings-records">${rows.length ? rows.map((row) => `<article><div>${config.fields.slice(0,4).map((def) => `<span><small>${def.label}</small><strong>${escape(label(def,row))}</strong></span>`).join('')}</div>${canEdit ? `<button class="button button-quiet" data-settings-edit="${config.table}" data-id="${row[config.key]}">עריכה</button>` : ''}</article>`).join('') : '<p class="empty-inline">אין רשומות.</p>'}</div></div></details>`; }).join(''); return cards ? `<section id="settings-${section.id}" class="settings-section"><header><span>${index+1}</span><div><h2>${section.title}</h2><p>${section.description}</p></div></header>${cards}</section>` : ''; }).join('')}
    ${editing ? `<div class="settings-dialog-backdrop"><section class="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title"><header><h2 id="settings-dialog-title">${editing.config.title}</h2><button type="button" data-settings-close aria-label="סגירה">×</button></header><form data-settings-form novalidate>${errors.length ? `<div class="settings-validation" role="alert"><strong>יש לתקן את השדות הבאים:</strong><ul>${errors.map((item)=>`<li>${escape(item)}</li>`).join('')}</ul></div>` : ''}<div class="settings-form-grid">${editing.config.fields.filter((d)=>!d.technical).map((d)=>`<label><span>${d.label}${d.required?' *':''}</span>${control(d,editing.record)}</label>`).join('')}</div>${editing.config.fields.some((d)=>d.technical)?`<details class="settings-technical" ${errors.length?'open':''}><summary>פרטים טכניים</summary>${editing.config.fields.filter((d)=>d.technical).map((d)=>`<label><span>${d.label}${d.required?' *':''}</span>${control(d,editing.record)}</label>`).join('')}</details>`:''}<footer><button type="button" class="button button-secondary" data-settings-close>ביטול</button><button class="button button-primary">שמירה</button>${editing.id?'<button type="button" class="button button-danger" data-settings-delete>מחיקה</button>':''}</footer></form></section></div>` : ''}</section>`;
    root.querySelector('[data-settings-back]')?.addEventListener('click', () => history.back());
    bind();
  };
  const bind = () => {
    root.querySelector('[data-settings-search]')?.addEventListener('input', (event) => { query=event.target.value.trim(); render(); root.querySelector('[data-settings-search]')?.focus(); });
    root.querySelectorAll('[data-settings-help]').forEach((b)=>b.onclick=()=>{helpTable=helpTable===b.dataset.settingsHelp?'':b.dataset.settingsHelp;render();const card=root.querySelector(`[data-settings-help="${b.dataset.settingsHelp}"]`)?.closest('details');if(card)card.open=true;});
    root.querySelectorAll('[data-settings-add]').forEach((b)=>b.onclick=()=>{const config=byTable.get(b.dataset.settingsAdd);const record={};config.fields.forEach((field)=>{if(field.name==='lifecycle_status')record[field.name]='ACTIVE';if(field.type==='boolean')record[field.name]=false;});errors=[];editing={config,record,id:''};render();});
    root.querySelectorAll('[data-settings-edit]').forEach((b)=>b.onclick=()=>{const config=byTable.get(b.dataset.settingsEdit);const record=data[config.table].find((r)=>String(r[config.key])===b.dataset.id);errors=[];editing={config,record:{...record},id:record[config.key]};render();});
    root.querySelectorAll('[data-settings-close]').forEach((b)=>b.onclick=()=>{editing=null;render();});
    root.querySelector('[data-settings-form]')?.addEventListener('change',(event)=>{editing.record[event.target.name]=event.target.value;const deps=editing.config.fields.filter((d)=>d.dependsOn===event.target.name);deps.forEach((d)=>editing.record[d.name]='');if(deps.length)render();});
    root.querySelector('[data-settings-form]')?.addEventListener('submit',async(event)=>{event.preventDefault();const values=new FormData(event.currentTarget);const row={};editing.config.fields.forEach((def)=>{let value=values.get(def.name);if(def.type==='boolean')value=value==='true';if(def.type==='number')value=value===''?null:Number(value);if(typeof value==='string')value=value.trim();row[def.name]=value===''?null:value;});errors=validate(editing.config,row,data);editing.record={...editing.record,...row};if(errors.length){render();return;}try{const result=await request(editing.id?'PATCH':'POST',{table:editing.config.table,id:editing.id||undefined,values:row});data[editing.config.table]=editing.id?data[editing.config.table].map((r)=>String(r[editing.config.key])===String(editing.id)?result.row:r):[...data[editing.config.table],result.row];editing=null;errors=[];message='ההגדרה נשמרה בהצלחה.';hydrate();render();}catch(error){errors=[error.message];render();}});
    root.querySelector('[data-settings-delete]')?.addEventListener('click',async()=>{if(!confirm('למחוק את ההגדרה? קשרים קיימים ימנעו מחיקה לא תקינה.'))return;try{await request('DELETE',{table:editing.config.table,id:editing.id});data[editing.config.table]=data[editing.config.table].filter((r)=>String(r[editing.config.key])!==String(editing.id));editing=null;message='ההגדרה נמחקה.';render();}catch(error){message=error.message;render();}});
  };
  root.innerHTML='<section class="state panel">טוען את הגדרות המערכת…</section>';
  request('GET').then((result)=>{data=result.data;hydrate();render();}).catch((error)=>{root.innerHTML=`<section class="state error panel"><strong>לא ניתן לטעון את ההגדרות</strong><p>${escape(error.message)}</p></section>`;});
}
