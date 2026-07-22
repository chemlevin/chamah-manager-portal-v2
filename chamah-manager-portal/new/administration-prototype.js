import { createAdministration, createMemoryRepository } from './admin-framework.js';

export const DEMO_SOURCE_CATALOG = [
  { code: 'MONTHLY_OCCUPANCY', label: 'תפוסה חודשית', section: 'OCCUPANCY', fields: [
    { code: 'children_count', label: 'מספר ילדים', dataType: 'NUMBER', operations: ['SUM', 'AVERAGE', 'MIN', 'MAX', 'GREATER_THAN'] },
    { code: 'reporting_month', label: 'חודש דיווח', dataType: 'DATE', operations: ['IN_PERIOD', 'EQUALS'] },
    { code: 'daycare_id', label: 'מעון', dataType: 'REFERENCE', operations: ['EQUALS', 'IN_LIST'] }
  ] },
  { code: 'PAYROLL', label: 'נתוני שכר', section: 'PAYROLL', fields: [
    { code: 'employer_cost', label: 'עלות מעסיק', dataType: 'CURRENCY', operations: ['SUM', 'AVERAGE', 'GREATER_THAN'] },
    { code: 'regular_hours', label: 'שעות רגילות', dataType: 'NUMBER', operations: ['SUM', 'AVERAGE', 'GREATER_THAN'] },
    { code: 'payroll_month', label: 'חודש שכר', dataType: 'DATE', operations: ['IN_PERIOD', 'EQUALS'] },
    { code: 'employee_id', label: 'עובדת', dataType: 'REFERENCE', operations: ['EQUALS', 'IN_LIST'] }
  ] },
  { code: 'BANK_TRANSACTIONS', label: 'תנועות בנק', section: 'ACCOUNTING', fields: [
    { code: 'amount', label: 'סכום תנועה', dataType: 'CURRENCY', operations: ['SUM', 'AVERAGE', 'GREATER_THAN', 'LESS_THAN'] },
    { code: 'transaction_date', label: 'תאריך תנועה', dataType: 'DATE', operations: ['IN_PERIOD', 'EQUALS'] },
    { code: 'accounting_status', label: 'סטטוס הנהלת חשבונות', dataType: 'ENUM', operations: ['EQUALS', 'IN_LIST'] }
  ] },
  { code: 'EMPLOYEES', label: 'עובדות', section: 'EMPLOYEES', fields: [
    { code: 'employment_status', label: 'סטטוס העסקה', dataType: 'ENUM', operations: ['EQUALS', 'IN_LIST'] },
    { code: 'seniority_years', label: 'שנות ותק', dataType: 'NUMBER', operations: ['AVERAGE', 'GREATER_THAN', 'LESS_THAN'] },
    { code: 'start_date', label: 'תאריך תחילת עבודה', dataType: 'DATE', operations: ['IN_PERIOD', 'BEFORE', 'AFTER'] }
  ] },
  { code: 'CLASSROOMS', label: 'כיתות', section: 'OCCUPANCY', fields: [
    { code: 'licensed_capacity', label: 'תפוסה מורשית', dataType: 'NUMBER', operations: ['SUM', 'AVERAGE', 'GREATER_THAN'] },
    { code: 'age_group', label: 'קבוצת גיל', dataType: 'ENUM', operations: ['EQUALS', 'IN_LIST'] },
    { code: 'daycare_id', label: 'מעון', dataType: 'REFERENCE', operations: ['EQUALS', 'IN_LIST'] }
  ] },
  { code: 'DAYCARES', label: 'מעונות', section: 'ORGANIZATION', fields: [
    { code: 'lifecycle_status', label: 'סטטוס פעילות', dataType: 'ENUM', operations: ['EQUALS', 'IN_LIST'] },
    { code: 'allocation_unit_id', label: 'יחידה ארגונית', dataType: 'REFERENCE', operations: ['EQUALS', 'IN_LIST'] },
    { code: 'display_name', label: 'שם המעון', dataType: 'TEXT', operations: ['EQUALS', 'CONTAINS'] }
  ] }
];

const option = (value, label) => ({ value, label });
const sources = DEMO_SOURCE_CATALOG.map((source) => option(source.code, source.label));
const sourceFor = (record) => DEMO_SOURCE_CATALOG.find((source) => source.code === record.source_code);
const fieldFor = (record) => sourceFor(record)?.fields.find((field) => field.code === record.source_field);
const fieldsFor = (record) => (sourceFor(record)?.fields || []).map((field) => option(field.code, field.label));
const operationsFor = (record) => (fieldFor(record)?.operations || []).map((code) => option(code, ({ SUM: 'סכום', AVERAGE: 'ממוצע', MIN: 'מינימום', MAX: 'מקסימום', EQUALS: 'שווה ל־', IN_LIST: 'אחד מתוך', GREATER_THAN: 'גדול מ־', LESS_THAN: 'קטן מ־', IN_PERIOD: 'בתקופה', BEFORE: 'לפני', AFTER: 'אחרי', CONTAINS: 'מכיל' })[code]));
const sectionOptions = ['OCCUPANCY', 'PAYROLL', 'ACCOUNTING', 'EMPLOYEES', 'ORGANIZATION'].map((code) => option(code, ({ OCCUPANCY: 'תפוסה ותקינה', PAYROLL: 'שכר', ACCOUNTING: 'הנהלת חשבונות', EMPLOYEES: 'עובדות', ORGANIZATION: 'מבנה ארגוני' })[code]));
const dataTypes = ['NUMBER', 'CURRENCY', 'PERCENTAGE', 'TEXT', 'DATE', 'BOOLEAN', 'ENUM', 'REFERENCE'].map((code) => option(code, ({ NUMBER: 'מספר', CURRENCY: 'מטבע', PERCENTAGE: 'אחוז', TEXT: 'טקסט', DATE: 'תאריך', BOOLEAN: 'כן / לא', ENUM: 'רשימת ערכים', REFERENCE: 'הפניה' })[code]));
const units = [option('COUNT', 'כמות'), option('ILS', 'ש״ח'), option('PERCENT', 'אחוזים'), option('HOURS', 'שעות'), option('DAYS', 'ימים'), option('EMPLOYEES', 'עובדות'), option('CHILDREN', 'ילדים'), option('NONE', 'ללא יחידה')];
const periods = [option('CURRENT_MONTH', 'החודש הנוכחי'), option('SCHOOL_YEAR', 'שנת לימודים'), option('CALENDAR_YEAR', 'שנה קלנדרית'), option('ROLLING_12_MONTHS', '12 חודשים אחרונים'), option('ALL_TIME', 'כל התקופות')];
const aggregations = [option('NONE', 'ללא צבירה'), option('SUM', 'סכום'), option('AVERAGE', 'ממוצע'), option('COUNT', 'ספירה'), option('MIN', 'מינימום'), option('MAX', 'מקסימום')];
const status = { name: 'is_active', label: 'סטטוס', type: 'boolean', filterable: true, trueLabel: 'פעיל', falseLabel: 'מושבת', checkboxLabel: 'הרשומה פעילה', defaultValue: true };

const sourceFields = [
  { name: 'source_code', label: 'מקור נתונים', type: 'select', required: true, options: sources, onChange: (record) => { record.source_field = ''; record.operation = ''; } },
  { name: 'source_field', label: 'שדה מקור', type: 'select', required: true, options: fieldsFor, disableWhenEmpty: true, onChange: (record) => { record.operation = ''; } },
  { name: 'related_section', label: 'תחום קשור', type: 'select', required: true, options: sectionOptions },
  { name: 'operation', label: 'סינון או תנאי', type: 'select', required: true, options: operationsFor, disableWhenEmpty: true },
  { name: 'time_period', label: 'תקופת זמן', type: 'select', required: true, options: periods },
  { name: 'aggregation', label: 'שיטת צבירה', type: 'select', required: true, options: aggregations }
];
const technicalCode = (label) => ({ name: 'code', label, required: true, technical: true, table: false, pattern: '^[A-Z][A-Z0-9_]*$', patternMessage: 'הקוד חייב להכיל אותיות אנגליות גדולות, מספרים וקו תחתון בלבד', help: 'מזהה יציב לחיבורים עתידיים. אינו מיועד לשינוי תכוף.' });

const screens = {
  variables: {
    metadata: { entity: 'prototype_variables', label: 'משתנה', pluralLabel: 'משתנים', primaryKey: 'variable_id', statusField: 'is_active', description: 'קטלוג משתנים עסקיים מבוסס מטא־דאטה. נתוני הדמו מתאפסים ברענון.', searchFields: ['code', 'display_title', 'description'], defaultSort: { field: 'display_title', direction: 'asc' }, technicalHelp: 'כאן מוצג הקוד האנגלי היציב המשמש מערכות וחיבורים עתידיים.', duplicate: (record) => ({ ...record, code: `${record.code}_COPY`, display_title: `${record.display_title} — עותק` }), fields: [
      { name: 'variable_id', label: 'מזהה', form: false, table: false },
      { name: 'display_title', label: 'כותרת', required: true, sortable: true },
      { name: 'description', label: 'תיאור', type: 'textarea', required: true, table: false },
      { name: 'data_type', label: 'סוג נתון', type: 'select', required: true, options: dataTypes },
      { name: 'unit', label: 'יחידת מידה', type: 'select', required: true, options: units },
      ...sourceFields, status, technicalCode('קוד משתנה')
    ], createLabel: 'הוספת משתנה' },
    rows: [
      { variable_id: 'v1', code: 'MONTHLY_OCCUPANCY_RATE', display_title: 'שיעור תפוסה חודשי', description: 'אחוז הילדים הרשומים מתוך התפוסה המורשית בכל מעון.', data_type: 'PERCENTAGE', unit: 'PERCENT', source_code: 'MONTHLY_OCCUPANCY', source_field: 'children_count', related_section: 'OCCUPANCY', operation: 'AVERAGE', time_period: 'CURRENT_MONTH', aggregation: 'AVERAGE', is_active: true },
      { variable_id: 'v2', code: 'MONTHLY_PAYROLL_COST', display_title: 'עלות שכר חודשית', description: 'סך עלות המעסיק ברשומות השכר לתקופה שנבחרה.', data_type: 'CURRENCY', unit: 'ILS', source_code: 'PAYROLL', source_field: 'employer_cost', related_section: 'PAYROLL', operation: 'SUM', time_period: 'CURRENT_MONTH', aggregation: 'SUM', is_active: true },
      { variable_id: 'v3', code: 'ACTIVE_EMPLOYEE_COUNT', display_title: 'מספר עובדות פעילות', description: 'ספירת עובדות שסטטוס ההעסקה שלהן פעיל.', data_type: 'NUMBER', unit: 'EMPLOYEES', source_code: 'EMPLOYEES', source_field: 'employment_status', related_section: 'EMPLOYEES', operation: 'EQUALS', time_period: 'CURRENT_MONTH', aggregation: 'COUNT', is_active: true },
      { variable_id: 'v4', code: 'MONTHLY_BANK_EXPENSES', display_title: 'הוצאות בנק חודשיות', description: 'סכום תנועות הבנק המסווגות כהוצאה במהלך החודש.', data_type: 'CURRENCY', unit: 'ILS', source_code: 'BANK_TRANSACTIONS', source_field: 'amount', related_section: 'ACCOUNTING', operation: 'SUM', time_period: 'CURRENT_MONTH', aggregation: 'SUM', is_active: false }
    ]
  },
  rules: {
    metadata: { entity: 'prototype_calculation_rules', label: 'כלל חישוב', pluralLabel: 'כללי חישוב', primaryKey: 'rule_id', statusField: 'is_active', description: 'כללי דמו מובנים שאינם מפעילים חישובים אמיתיים.', searchFields: ['code', 'display_title', 'description'], defaultSort: { field: 'priority', direction: 'asc' }, technicalHelp: 'הקוד האנגלי הוא מזהה פנימי בלבד. בחירת המקור והשדה נעשית באמצעות הקטלוג המובנה.', duplicate: (record) => ({ ...record, code: `${record.code}_COPY`, display_title: `${record.display_title} — עותק`, is_active: false }), fields: [
      { name: 'rule_id', label: 'מזהה', form: false, table: false },
      { name: 'display_title', label: 'כותרת', required: true, sortable: true },
      { name: 'description', label: 'תיאור', type: 'textarea', required: true, table: false },
      ...sourceFields,
      { name: 'priority', label: 'עדיפות', type: 'number', min: 1, required: true, sortable: true }, status, technicalCode('קוד כלל')
    ], createLabel: 'הוספת כלל' },
    rows: [
      { rule_id: 'r1', code: 'INFANT_STAFFING_REQUIREMENT', display_title: 'תקינת צוות לתינוקות', description: 'חישוב דרישת צוות לפי מספר הילדים בכיתה.', source_code: 'MONTHLY_OCCUPANCY', source_field: 'children_count', related_section: 'OCCUPANCY', operation: 'GREATER_THAN', time_period: 'CURRENT_MONTH', aggregation: 'MAX', priority: 10, is_active: true },
      { rule_id: 'r2', code: 'SENIORITY_BONUS_ELIGIBILITY', display_title: 'זכאות לתוספת ותק', description: 'בדיקת שנות הוותק של העובדת לצורך זכאות.', source_code: 'EMPLOYEES', source_field: 'seniority_years', related_section: 'EMPLOYEES', operation: 'GREATER_THAN', time_period: 'ALL_TIME', aggregation: 'NONE', priority: 20, is_active: true },
      { rule_id: 'r3', code: 'PERSISTENCE_BONUS_ELIGIBILITY', display_title: 'זכאות למענק התמדה', description: 'בדיקת תאריך תחילת העבודה בתקופת הזכאות.', source_code: 'EMPLOYEES', source_field: 'start_date', related_section: 'PAYROLL', operation: 'BEFORE', time_period: 'SCHOOL_YEAR', aggregation: 'NONE', priority: 30, is_active: false },
      { rule_id: 'r4', code: 'FOOD_COST_BY_OCCUPANCY', display_title: 'עלות מזון לפי תפוסה', description: 'צבירת מספר הילדים לצורך חישוב עלות מזון.', source_code: 'MONTHLY_OCCUPANCY', source_field: 'children_count', related_section: 'OCCUPANCY', operation: 'SUM', time_period: 'CURRENT_MONTH', aggregation: 'SUM', priority: 40, is_active: true }
    ]
  }
};

// Calculation Tables remain the TRACK 009 prototype and are intentionally unchanged.
const tableScreen = {
  metadata: { entity: 'prototype_calculation_tables', label: 'טבלת חישוב', pluralLabel: 'טבלאות חישוב', primaryKey: 'table_id', statusField: 'is_active', description: 'קטלוג טבלאות דמו לצורכי אפיון ממשק בלבד.', searchFields: ['code', 'name'], fields: [
    { name: 'table_id', label: 'מזהה', form: false, table: false }, { name: 'code', label: 'קוד טבלה', required: true }, { name: 'name', label: 'שם הטבלה', required: true }, { name: 'version', label: 'גרסה', required: true }, status
  ] },
  rows: [{ table_id: 't1', code: 'STAFFING_RATIOS', name: 'יחסי תקינה לפי גיל', version: '2026.1', is_active: true }, { table_id: 't2', code: 'SENIORITY_STEPS', name: 'מדרגות ותק', version: '2026.1', is_active: true }, { table_id: 't3', code: 'FOOD_COSTS', name: 'עלויות מזון', version: '2026-Q3', is_active: true }, { table_id: 't4', code: 'PERSISTENCE_BONUS', name: 'מענקי התמדה', version: 'טיוטה', is_active: false }]
};
screens.tables = tableScreen;

let controller;
export function mountAdministrationPrototype(root, screen) {
  controller?.destroy();
  const config = screens[screen];
  if (!config) throw new Error('Unknown administration prototype screen.');
  controller = createAdministration({ root, metadata: config.metadata, repository: createMemoryRepository(config.rows) });
  return controller;
}
