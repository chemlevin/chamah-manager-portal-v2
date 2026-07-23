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

export const DEMO_METADATA_GRAPH = {
  MONTHLY_OCCUPANCY_RATE: {
    dependsOn: [{ type: 'source', label: 'תפוסה חודשית' }, { type: 'table', label: 'יחסי תקינה לפי גיל', href: '#training/tables/calculation' }],
    dependents: [{ type: 'rule', label: 'עלות מזון לפי תפוסה', href: '#training/rules/calculation' }, { type: 'variable', label: 'עלות מזון חודשית' }],
    usedBy: [{ type: 'dashboard', label: 'תמונת מצב תפוסה' }, { type: 'report', label: 'דוח תפוסה חודשי' }, { type: 'calculation', label: 'תחזית עלות מזון' }],
    impact: { variables: ['עלות מזון חודשית'], rules: ['עלות מזון לפי תפוסה'], dashboards: ['תמונת מצב תפוסה'], reports: ['דוח תפוסה חודשי'], calculations: ['תחזית עלות מזון'] }
  },
  MONTHLY_PAYROLL_COST: {
    dependsOn: [{ type: 'source', label: 'נתוני שכר' }],
    dependents: [{ type: 'rule', label: 'בקרת עלות שכר' }],
    usedBy: [{ type: 'dashboard', label: 'לוח עלויות הנהלה' }, { type: 'report', label: 'דוח עלות שכר חודשי' }],
    impact: { variables: [], rules: ['בקרת עלות שכר'], dashboards: ['לוח עלויות הנהלה'], reports: ['דוח עלות שכר חודשי'], calculations: ['יחס שכר להכנסה'] }
  },
  ACTIVE_EMPLOYEE_COUNT: {
    dependsOn: [{ type: 'source', label: 'עובדות' }],
    dependents: [{ type: 'rule', label: 'תקינת צוות לתינוקות', href: '#training/rules/calculation' }],
    usedBy: [{ type: 'dashboard', label: 'מצבת כוח אדם' }, { type: 'report', label: 'דוח עובדות פעילות' }],
    impact: { variables: [], rules: ['תקינת צוות לתינוקות'], dashboards: ['מצבת כוח אדם'], reports: ['דוח עובדות פעילות'], calculations: ['פער תקינה'] }
  },
  MONTHLY_BANK_EXPENSES: {
    dependsOn: [{ type: 'source', label: 'תנועות בנק' }],
    dependents: [],
    usedBy: [{ type: 'dashboard', label: 'תמונת מצב כספית' }, { type: 'report', label: 'דוח הוצאות חודשי' }],
    impact: { variables: [], rules: [], dashboards: ['תמונת מצב כספית'], reports: ['דוח הוצאות חודשי'], calculations: ['יתרה תפעולית'] }
  },
  INFANT_STAFFING_REQUIREMENT: {
    dependsOn: [{ type: 'variable', label: 'שיעור תפוסה חודשי', href: '#training/tables/variables' }, { type: 'table', label: 'יחסי תקינה לפי גיל', href: '#training/tables/calculation' }],
    dependents: [{ type: 'calculation', label: 'פער תקינה' }],
    usedBy: [{ type: 'dashboard', label: 'התראות כוח אדם' }, { type: 'report', label: 'דוח תקינה למעון' }],
    impact: { variables: [], rules: [], dashboards: ['התראות כוח אדם'], reports: ['דוח תקינה למעון'], calculations: ['פער תקינה', 'עלות צוות נדרשת'] }
  },
  SENIORITY_BONUS_ELIGIBILITY: {
    dependsOn: [{ type: 'source', label: 'עובדות' }, { type: 'table', label: 'מדרגות ותק', href: '#training/tables/calculation' }],
    dependents: [{ type: 'calculation', label: 'תוספת ותק משוערת' }],
    usedBy: [{ type: 'report', label: 'דוח זכאויות שכר' }],
    impact: { variables: [], rules: [], dashboards: [], reports: ['דוח זכאויות שכר'], calculations: ['תוספת ותק משוערת'] }
  },
  PERSISTENCE_BONUS_ELIGIBILITY: {
    dependsOn: [{ type: 'source', label: 'עובדות' }, { type: 'table', label: 'מענקי התמדה', href: '#training/tables/calculation' }],
    dependents: [{ type: 'calculation', label: 'מענק התמדה משוער' }],
    usedBy: [{ type: 'report', label: 'דוח מענקי התמדה' }],
    impact: { variables: [], rules: [], dashboards: [], reports: ['דוח מענקי התמדה'], calculations: ['מענק התמדה משוער'] }
  },
  FOOD_COST_BY_OCCUPANCY: {
    dependsOn: [{ type: 'variable', label: 'שיעור תפוסה חודשי', href: '#training/tables/variables' }, { type: 'table', label: 'עלויות מזון', href: '#training/tables/calculation' }],
    dependents: [{ type: 'variable', label: 'עלות מזון חודשית' }],
    usedBy: [{ type: 'dashboard', label: 'בקרת הוצאות מזון' }, { type: 'report', label: 'דוח מזון למעון' }],
    impact: { variables: ['עלות מזון חודשית'], rules: [], dashboards: ['בקרת הוצאות מזון'], reports: ['דוח מזון למעון'], calculations: ['תחזית עלות מזון'] }
  },
  STAFFING_RATIOS: { dependsOn: [], dependents: [{ type: 'rule', label: 'תקינת צוות לתינוקות', href: '#training/rules/calculation' }], usedBy: [{ type: 'calculation', label: 'פער תקינה' }] },
  SENIORITY_STEPS: { dependsOn: [], dependents: [{ type: 'rule', label: 'זכאות לתוספת ותק', href: '#training/rules/calculation' }], usedBy: [{ type: 'report', label: 'דוח זכאויות שכר' }] },
  FOOD_COSTS: { dependsOn: [], dependents: [{ type: 'rule', label: 'עלות מזון לפי תפוסה', href: '#training/rules/calculation' }], usedBy: [{ type: 'calculation', label: 'תחזית עלות מזון' }] },
  PERSISTENCE_BONUS: { dependsOn: [], dependents: [{ type: 'rule', label: 'זכאות למענק התמדה', href: '#training/rules/calculation' }], usedBy: [{ type: 'report', label: 'דוח מענקי התמדה' }] }
};

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const graphFor = (record) => DEMO_METADATA_GRAPH[record.code] || { dependsOn: [], dependents: [], usedBy: [], impact: {} };
const sourceLabel = (record) => sourceFor(record)?.label || 'טרם נבחר מקור';
const fieldLabel = (record) => fieldFor(record)?.label || 'טרם נבחר שדה';
const optionLabel = (options, value) => options.find((item) => item.value === value)?.label || 'טרם נבחר';
const referenceList = (items, empty = 'אין הפניות') => items.length
  ? `<ul class="metadata-reference-list">${items.map((item) => `<li><a href="${escape(item.href || '#')}" ${item.href ? '' : 'data-demo-reference'}><span>${escape(item.label)}</span><small>${escape(({ source: 'מקור', table: 'טבלה', variable: 'משתנה', rule: 'כלל', dashboard: 'לוח מחוונים', report: 'דוח', calculation: 'חישוב' })[item.type] || item.type)}</small></a></li>`).join('')}</ul>`
  : `<p class="metadata-empty">${empty}</p>`;

function renderWhereUsed(record) {
  const graph = graphFor(record);
  return `<div class="metadata-inspector-body"><p class="metadata-inspector-name">${escape(record.display_title || record.name)}</p>
    <section><h3>תלוי ב־</h3>${referenceList(graph.dependsOn)}</section>
    <section><h3>תלויים בו</h3>${referenceList(graph.dependents)}</section>
    <section><h3>כל המקומות שמפנים לרשומה</h3>${referenceList(graph.usedBy)}</section>
    <p class="metadata-demo-note">מפת ההפניות מבוססת על מטא־דאטה לדוגמה בלבד.</p></div>`;
}

function renderDesigner(record, kind) {
  const graph = graphFor(record);
  const impact = graph.impact || {};
  const result = kind === 'rule' ? (record.display_title || 'תוצאת הכלל') : (record.display_title || 'משתנה תוצאה');
  const usedBy = graph.usedBy.map((item) => item.label).join(', ') || 'אין שימושים';
  const impactGroups = [
    ['משתנים מושפעים', impact.variables], ['כללים מושפעים', impact.rules], ['לוחות מחוונים מושפעים', impact.dashboards],
    ['דוחות מושפעים', impact.reports], ['חישובים מושפעים', impact.calculations]
  ];
  return `<section class="metadata-panel" aria-labelledby="data-flow-title"><header><div><p class="admin-eyebrow">מפת מטא־דאטה</p><h3 id="data-flow-title">זרימת נתונים</h3></div><span class="metadata-demo-badge">הדגמה</span></header>
    <ol class="metadata-flow">
      <li><small>מקור</small><strong>${escape(sourceLabel(record))}</strong></li><li><small>שדה</small><strong>${escape(fieldLabel(record))}</strong></li>
      <li><small>מסננים</small><strong>${escape(optionLabel(operationsFor(record), record.operation))}</strong></li><li><small>צבירה</small><strong>${escape(optionLabel(aggregations, record.aggregation))}</strong></li>
      <li><small>משתנה תוצאה</small><strong>${escape(result)}</strong></li><li><small>בשימוש אצל</small><strong>${escape(usedBy)}</strong></li>
    </ol>
    <div class="metadata-dependencies"><section><h4>תלוי ב־</h4>${referenceList(graph.dependsOn)}</section><section><h4>תלויים בו</h4>${referenceList(graph.dependents)}</section></div>
  </section>
  <section class="metadata-panel metadata-impact" aria-labelledby="impact-title"><header><div><p class="admin-eyebrow">לפני שמירה</p><h3 id="impact-title">ניתוח השפעה</h3></div></header>
    <p>השינוי עשוי להשפיע על הרכיבים הבאים. זהו ניתוח הדגמה ואינו מפעיל מערכות אמיתיות.</p>
    <div class="metadata-impact-grid">${impactGroups.map(([label, items]) => `<article><strong>${escape(label)}</strong><span>${items?.length || 0}</span><p>${escape(items?.join(', ') || 'ללא השפעה ידועה')}</p></article>`).join('')}</div>
  </section>
  <section class="metadata-panel metadata-preview" aria-labelledby="preview-title"><header><div><p class="admin-eyebrow">סביבת ניסוי</p><h3 id="preview-title">תצוגה מקדימה של החישוב</h3></div></header>
    <div class="metadata-preview-inputs"><label>ערך לדוגמה<input type="number" value="${kind === 'rule' ? 8 : 24}" data-preview-value></label><label>${kind === 'rule' ? 'סף להשוואה' : 'מספר רשומות'}<input type="number" value="${kind === 'rule' ? 5 : 3}" min="1" data-preview-factor></label></div>
    <ol class="metadata-preview-steps" data-preview-steps></ol><output class="metadata-preview-result" data-preview-result></output>
    <p class="metadata-demo-note">החישוב הוא המחשה בלבד ואינו משתמש במנועי Chamah.</p>
  </section>`;
}

function bindDesigner(root, record, kind) {
  const valueInput = root.querySelector('[data-preview-value]');
  const factorInput = root.querySelector('[data-preview-factor]');
  const steps = root.querySelector('[data-preview-steps]');
  const output = root.querySelector('[data-preview-result]');
  if (!valueInput || !factorInput || !steps || !output) return;
  const update = () => {
    const value = Number(valueInput.value) || 0;
    const factor = Number(factorInput.value) || 0;
    if (kind === 'rule') {
      const passed = value > factor;
      steps.innerHTML = `<li>נקלט ערך מקור: <strong>${value}</strong></li><li>הופעל תנאי הדגמה: ${value} &gt; ${factor}</li><li>נוצרה תוצאת כלל: <strong>${passed ? 'התנאי מתקיים' : 'התנאי לא מתקיים'}</strong></li>`;
      output.value = passed ? 'תוצאה: זכאות / חריגה זוהתה' : 'תוצאה: ללא זכאות / חריגה';
    } else {
      const result = record.aggregation === 'AVERAGE' ? value / Math.max(factor, 1) : value * Math.max(factor, 1);
      steps.innerHTML = `<li>נקלט ערך מקור: <strong>${value}</strong></li><li>הוחלה צבירת ${escape(optionLabel(aggregations, record.aggregation))} על ${factor} רשומות</li><li>נוצר משתנה תוצאה: <strong>${result.toLocaleString('he-IL', { maximumFractionDigits: 2 })}</strong></li>`;
      output.value = `תוצאה לדוגמה: ${result.toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;
    }
  };
  valueInput.addEventListener('input', update);
  factorInput.addEventListener('input', update);
  update();
}

const designerMetadata = (kind) => ({
  renderEditorExtensions: (record) => renderDesigner(record, kind),
  bindEditorExtensions: (root, record) => bindDesigner(root, record, kind),
  renderInspector: renderWhereUsed
});

const screens = {
  variables: {
    metadata: { entity: 'prototype_variables', label: 'משתנה', pluralLabel: 'משתנים', primaryKey: 'variable_id', statusField: 'is_active', ...designerMetadata('variable'), description: 'קטלוג משתנים עסקיים מבוסס מטא־דאטה. נתוני הדמו מתאפסים ברענון.', searchFields: ['code', 'display_title', 'description'], defaultSort: { field: 'display_title', direction: 'asc' }, technicalHelp: 'כאן מוצג הקוד האנגלי היציב המשמש מערכות וחיבורים עתידיים.', duplicate: (record) => ({ ...record, code: `${record.code}_COPY`, display_title: `${record.display_title} — עותק` }), fields: [
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
    metadata: { entity: 'prototype_calculation_rules', label: 'כלל חישוב', pluralLabel: 'כללי חישוב', primaryKey: 'rule_id', statusField: 'is_active', ...designerMetadata('rule'), description: 'כללי דמו מובנים שאינם מפעילים חישובים אמיתיים.', searchFields: ['code', 'display_title', 'description'], defaultSort: { field: 'priority', direction: 'asc' }, technicalHelp: 'הקוד האנגלי הוא מזהה פנימי בלבד. בחירת המקור והשדה נעשית באמצעות הקטלוג המובנה.', duplicate: (record) => ({ ...record, code: `${record.code}_COPY`, display_title: `${record.display_title} — עותק`, is_active: false }), fields: [
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
  metadata: { entity: 'prototype_calculation_tables', label: 'טבלת חישוב', pluralLabel: 'טבלאות חישוב', primaryKey: 'table_id', statusField: 'is_active', renderInspector: renderWhereUsed, description: 'קטלוג טבלאות דמו לצורכי אפיון ממשק בלבד.', searchFields: ['code', 'name'], fields: [
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
