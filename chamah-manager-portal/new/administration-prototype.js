import { createAdministration, createMemoryRepository } from './admin-framework.js';

const status = { name: 'is_active', label: 'סטטוס', type: 'boolean', filterable: true, trueLabel: 'פעיל', falseLabel: 'מושבת', checkboxLabel: 'הרשומה פעילה', defaultValue: true };
const scopeOptions = [{ value: 'ORGANIZATION', label: 'כל הארגון' }, { value: 'DAYCARE', label: 'לפי מעון' }, { value: 'CLASSROOM', label: 'לפי כיתה' }];

const screens = {
  variables: {
    metadata: { entity: 'prototype_variables', label: 'משתנה', pluralLabel: 'משתנים', primaryKey: 'variable_id', statusField: 'is_active', description: 'פרמטרים עסקיים לדוגמה בלבד. הנתונים נשמרים בזיכרון עד לרענון הדף.', searchFields: ['code', 'name', 'category'], defaultSort: { field: 'name', direction: 'asc' }, duplicate: (record) => ({ ...record, code: `${record.code}_COPY`, name: `${record.name} — עותק` }), fields: [
      { name: 'variable_id', label: 'מזהה', form: false, table: false }, { name: 'code', label: 'קוד', required: true, sortable: true }, { name: 'name', label: 'שם המשתנה', required: true, sortable: true }, { name: 'category', label: 'תחום', required: true, filterable: true, options: [{ value: 'STAFFING', label: 'תקינה' }, { value: 'PAYROLL', label: 'שכר' }, { value: 'BUDGET', label: 'תקציב' }] }, { name: 'value', label: 'ערך', required: true }, { name: 'unit', label: 'יחידה', required: true }, status, { name: 'notes', label: 'הערות', type: 'textarea', table: false }
    ], createLabel: 'הוספת משתנה' },
    rows: [
      { variable_id: 'v1', code: 'INFANT_STAFF_RATIO', name: 'יחס תקינה — תינוקות', category: 'STAFFING', value: '1:6', unit: 'מטפלת לילדים', is_active: true, notes: 'דוגמה בלבד' },
      { variable_id: 'v2', code: 'SENIORITY_RATE', name: 'תוספת ותק שנתית', category: 'PAYROLL', value: '1.25', unit: '₪ לשעה', is_active: true },
      { variable_id: 'v3', code: 'PERSISTENCE_BONUS', name: 'מענק התמדה', category: 'PAYROLL', value: '750', unit: '₪ לחודש', is_active: false },
      { variable_id: 'v4', code: 'FOOD_COST_CHILD', name: 'עלות מזון לילד', category: 'BUDGET', value: '18', unit: '₪ ליום', is_active: true }
    ]
  },
  tables: {
    metadata: { entity: 'prototype_calculation_tables', label: 'טבלת חישוב', pluralLabel: 'טבלאות חישוב', primaryKey: 'table_id', statusField: 'is_active', description: 'קטלוג טבלאות דמו לצורכי אפיון ממשק בלבד.', searchFields: ['code', 'name', 'description'], defaultSort: { field: 'name', direction: 'asc' }, duplicate: (record) => ({ ...record, code: `${record.code}_COPY`, name: `${record.name} — עותק`, version: 'טיוטה' }), fields: [
      { name: 'table_id', label: 'מזהה', form: false, table: false }, { name: 'code', label: 'קוד טבלה', required: true, sortable: true }, { name: 'name', label: 'שם הטבלה', required: true, sortable: true }, { name: 'category', label: 'תחום', required: true, filterable: true, options: [{ value: 'STAFFING', label: 'תקינה' }, { value: 'PAYROLL', label: 'שכר' }, { value: 'BUDGET', label: 'תקציב' }] }, { name: 'version', label: 'גרסה', required: true }, { name: 'row_count', label: 'מספר שורות', type: 'number', min: 0, required: true }, status, { name: 'description', label: 'תיאור', type: 'textarea', table: false }
    ], createLabel: 'הוספת טבלה' },
    rows: [
      { table_id: 't1', code: 'STAFFING_RATIOS', name: 'יחסי תקינה לפי גיל', category: 'STAFFING', version: '2026.1', row_count: 3, is_active: true, description: 'תינוקות, פעוטות ובוגרים' },
      { table_id: 't2', code: 'SENIORITY_STEPS', name: 'מדרגות ותק', category: 'PAYROLL', version: '2026.1', row_count: 12, is_active: true },
      { table_id: 't3', code: 'FOOD_COSTS', name: 'עלויות מזון', category: 'BUDGET', version: '2026-Q3', row_count: 6, is_active: true },
      { table_id: 't4', code: 'PERSISTENCE_BONUS', name: 'מענקי התמדה', category: 'PAYROLL', version: 'טיוטה', row_count: 4, is_active: false }
    ]
  },
  rules: {
    metadata: { entity: 'prototype_calculation_rules', label: 'כלל חישוב', pluralLabel: 'כללי חישוב', primaryKey: 'rule_id', statusField: 'is_active', description: 'כללי דמו אינם מפעילים חישובים אמיתיים ואינם מחוברים למנועי המערכת.', searchFields: ['code', 'name', 'formula'], defaultSort: { field: 'priority', direction: 'asc' }, duplicate: (record) => ({ ...record, code: `${record.code}_COPY`, name: `${record.name} — עותק`, is_active: false }), fields: [
      { name: 'rule_id', label: 'מזהה', form: false, table: false }, { name: 'code', label: 'קוד כלל', required: true, sortable: true }, { name: 'name', label: 'שם הכלל', required: true, sortable: true }, { name: 'category', label: 'תחום', required: true, filterable: true, options: [{ value: 'STAFFING', label: 'תקינה' }, { value: 'PAYROLL', label: 'שכר' }, { value: 'BUDGET', label: 'תקציב' }] }, { name: 'scope', label: 'תחולה', type: 'select', required: true, options: scopeOptions }, { name: 'formula', label: 'נוסחה / תנאי', required: true }, { name: 'priority', label: 'עדיפות', type: 'number', min: 1, required: true, sortable: true }, status, { name: 'description', label: 'הסבר', type: 'textarea', table: false }
    ], createLabel: 'הוספת כלל' },
    rows: [
      { rule_id: 'r1', code: 'INFANT_RATIO', name: 'תקינת תינוקות', category: 'STAFFING', scope: 'CLASSROOM', formula: 'ceil(children / 6)', priority: 10, is_active: true },
      { rule_id: 'r2', code: 'SENIORITY_PAY', name: 'תוספת ותק', category: 'PAYROLL', scope: 'ORGANIZATION', formula: 'years × seniority_rate', priority: 20, is_active: true },
      { rule_id: 'r3', code: 'PERSISTENCE_ELIGIBILITY', name: 'זכאות למענק התמדה', category: 'PAYROLL', scope: 'DAYCARE', formula: 'months_employed ≥ 12', priority: 30, is_active: false },
      { rule_id: 'r4', code: 'MONTHLY_FOOD_COST', name: 'עלות מזון חודשית', category: 'BUDGET', scope: 'DAYCARE', formula: 'children × active_days × food_cost', priority: 40, is_active: true }
    ]
  }
};

let controller;
export function mountAdministrationPrototype(root, screen) {
  controller?.destroy();
  const config = screens[screen];
  if (!config) throw new Error('Unknown administration prototype screen.');
  controller = createAdministration({ root, metadata: config.metadata, repository: createMemoryRepository(config.rows) });
  return controller;
}
