const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const option = (value, label) => ({ value, label });
const statuses = [option('ACTIVE', 'פעיל'), option('INACTIVE', 'לא פעיל'), option('ARCHIVED', 'בארכיון')];
const f = (name, label, type = 'text', config = {}) => ({ name, label, type, ...config });
const link = (name, label, source, key, config = {}) => f(name, label, 'link', { source, key, display: 'display_name', ...config });

export const SETTINGS_SECTIONS = [
  { id: 'periods', title: 'תקופות ושנים', description: 'שנות לימודים, שנים קלנדריות וחודשי דיווח.', tables: [
    { table: 'school_years', key: 'school_year_id', title: 'שנות לימודים', fields: [f('display_name','שם השנה'),f('school_year_code','קוד קבוע','text',{technical:true}),f('start_date','מתאריך','date'),f('end_date','עד תאריך','date'),f('status','מצב','select',{options:[option('DRAFT','טיוטה'),option('ACTIVE','פעילה'),option('LOCKED','נעולה')]}),f('is_selectable','זמינה לבחירה','boolean'),f('is_default','ברירת מחדל','boolean')] },
    { table: 'calendar_years', key: 'calendar_year_id', title: 'שנים קלנדריות', fields: [f('display_name','שם השנה'),f('calendar_year_code','קוד קבוע','text',{technical:true}),f('year_number','שנה','number'),f('start_date','מתאריך','date'),f('end_date','עד תאריך','date'),f('status','מצב','select',{options:[option('FUTURE','עתידית'),option('OPEN','פתוחה'),option('CLOSED','סגורה')]})] },
    { table: 'school_year_months', key: 'school_year_month_id', title: 'חודשי שנת לימודים', fields: [link('school_year_id','שנת לימודים','school_years','school_year_id'),f('month_label','חודש'),f('reporting_month','חודש דיווח'),f('start_date','מתאריך','date'),f('end_date','עד תאריך','date'),f('school_year_sequence','סדר','number')] }
  ]},
  { id: 'organization', title: 'הארגון והמעונות', description: 'ישויות משפטיות, יחידות דיווח ומעונות.', tables: [
    { table: 'legal_entity_types', key: 'legal_entity_type_id', title: 'סוגי ישות משפטית', fields: [f('display_name','שם הסוג'),f('legal_entity_type_code','קוד קבוע','text',{technical:true}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'legal_entities', key: 'legal_entity_id', title: 'ישויות משפטיות', fields: [f('display_name','שם לתצוגה'),f('legal_name','שם משפטי'),link('legal_entity_type_id','סוג ישות','legal_entity_types','legal_entity_type_id'),f('registration_number','מספר רישום'),f('legal_entity_code','קוד קבוע','text',{technical:true}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'allocation_units', key: 'allocation_unit_id', title: 'יחידות ארגוניות', fields: [f('display_name','שם היחידה'),f('allocation_unit_type','סוג','select',{options:[option('DAYCARE','מעון'),option('OFFICE','משרד'),option('MANAGEMENT','הנהלה'),option('DEVELOPMENT','פיתוח'),option('OTHER','אחר')]}),link('legal_entity_id','ישות משפטית','legal_entities','legal_entity_id'),f('allocation_unit_code','קוד קבוע','text',{technical:true}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'daycares', key: 'daycare_id', title: 'מעונות', fields: [f('display_name','שם המעון'),link('legal_entity_id','ישות משפטית','legal_entities','legal_entity_id'),link('allocation_unit_id','יחידת דיווח','allocation_units','allocation_unit_id',{dependsOn:'legal_entity_id',match:'legal_entity_id'}),f('license_number','מספר רישיון'),f('city','עיר'),f('daycare_code','קוד קבוע','text',{technical:true}),f('lifecycle_status','מצב','select',{options:statuses})] }
  ]},
  { id: 'classrooms', title: 'הפעלת מעונות וכיתות', description: 'הקשר בין שנה, מעון וכיתה.', tables: [
    { table: 'daycare_school_years', key: 'daycare_school_year_id', title: 'הפעלת מעון בשנה', fields: [link('school_year_id','שנת לימודים','school_years','school_year_id'),link('daycare_id','מעון','daycares','daycare_id'),f('is_operating','פעיל בשנה','boolean'),f('tuition_standard_type','תקן שכר לימוד'),f('staffing_standard_type','תקן כוח אדם')] },
    { table: 'classrooms', key: 'classroom_id', title: 'כיתות', fields: [link('daycare_school_year_id','מעון ושנה','daycare_school_years','daycare_school_year_id',{display:'_label'}),f('display_name','שם הכיתה'),f('classroom_code','קוד קבוע','text',{technical:true}),f('area_sqm','שטח במ״ר','number'),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'age_groups', key: 'age_group_id', title: 'קבוצות גיל', fields: [f('display_name','שם הקבוצה'),f('age_group_code','קוד קבוע','text',{technical:true}),f('display_order','סדר','number'),f('lifecycle_status','מצב','select',{options:statuses})] }
  ]},
  { id: 'finance', title: 'כספים והנהלת חשבונות', description: 'סעיפי תקציב, חשבונות בנק ומצבי טיפול.', tables: [
    { table: 'budget_categories', key: 'budget_category_id', title: 'סעיפי תקציב', fields: [f('display_name','שם הסעיף'),f('budget_category_code','קוד קבוע','text',{technical:true}),f('category_type','סוג','select',{options:[option('INCOME','הכנסה'),option('EXPENSE','הוצאה'),option('INTERNAL_OFFSET','קיזוז פנימי'),option('MANUAL_UNDEFINED','ידני / לא מוגדר')]}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'bank_accounts', key: 'bank_account_id', title: 'חשבונות בנק', fields: [f('account_name','שם החשבון'),link('legal_entity_id','ישות משפטית','legal_entities','legal_entity_id'),f('bank_name','בנק'),f('branch_number','סניף'),f('account_number','מספר חשבון'),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'accounting_statuses', key: 'accounting_status_id', title: 'מצבי הנהלת חשבונות', fields: [f('display_name','שם המצב'),f('display_order','סדר','number'),f('is_final','מצב סופי','boolean'),f('lifecycle_status','מצב','select',{options:statuses})] }
  ]},
  { id: 'rules', title: 'צוות וכללים', description: 'תפקידים, הכשרות וכללי רישוי ותקינה.', tables: [
    { table: 'roles', key: 'role_id', title: 'תפקידים', fields: [f('display_name','שם התפקיד'),f('role_code','קוד קבוע','text',{technical:true}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'certificate_types', key: 'certificate_type_id', title: 'תעודות והכשרות', fields: [f('display_name','שם התעודה'),f('certificate_type_code','קוד קבוע','text',{technical:true}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'classroom_licensing_rules', key: 'classroom_licensing_rule_id', title: 'כללי רישוי כיתה', fields: [f('age_group','קבוצת גיל'),f('sqm_per_child','מ״ר לילד','number'),f('max_children','מקסימום ילדים','number'),f('valid_from','בתוקף מתאריך','date'),f('valid_to','עד תאריך','date'),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'staffing_rules', key: 'staffing_rule_id', title: 'כללי תקינה', fields: [link('school_year_id','שנת לימודים','school_years','school_year_id'),f('standard_type','סוג תקן'),f('age_group','קבוצת גיל'),f('children_per_staff','ילדים לאשת צוות','number'),f('minimum_staff','מינימום צוות','number'),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'staffing_budget_parameters', key: 'staffing_budget_parameter_id', title: 'פרמטרי תקציב צוות', fields: [link('school_year_id','שנת לימודים','school_years','school_year_id'),f('monthly_hours_per_fte','שעות חודשיות למשרה','number'),f('hourly_budget_cost','עלות שעתית לתקציב','number'),link('effective_from_month_id','בתוקף מחודש','school_year_months','school_year_month_id',{display:'month_label',dependsOn:'school_year_id',match:'school_year_id'}),link('effective_to_month_id','עד חודש','school_year_months','school_year_month_id',{display:'month_label',dependsOn:'school_year_id',match:'school_year_id'}),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'compensation_factors', key: 'compensation_factor_id', title: 'רכיבי תגמול', fields: [f('display_name','שם הרכיב'),f('factor_code','קוד קבוע','text',{technical:true}),f('calculation_type','סוג חישוב'),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'compensation_rules', key: 'compensation_rule_id', title: 'כללי תגמול ושכר', fields: [link('compensation_factor_id','רכיב תגמול','compensation_factors','compensation_factor_id'),link('school_year_id','שנת לימודים','school_years','school_year_id'),f('numeric_value','ערך','number'),f('minimum_seniority_months','וותק מזערי','number'),f('maximum_seniority_months','וותק מרבי','number'),f('effective_from','בתוקף מתאריך','date'),f('effective_to','עד תאריך','date'),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'budget_rules', key: 'budget_rule_id', title: 'כללי תקציב', fields: [link('budget_category_id','סעיף תקציב','budget_categories','budget_category_id'),link('school_year_id','שנת לימודים','school_years','school_year_id'),link('daycare_id','מעון','daycares','daycare_id'),link('allocation_unit_id','יחידה ארגונית','allocation_units','allocation_unit_id'),link('age_group_id','קבוצת גיל','age_groups','age_group_id'),f('numeric_value','ערך','number'),f('effective_from','בתוקף מתאריך','date'),f('effective_to','עד תאריך','date'),f('lifecycle_status','מצב','select',{options:statuses})] },
    { table: 'travel_rates', key: 'travel_rate_id', title: 'תעריפי נסיעות', fields: [link('school_year_id','שנת לימודים','school_years','school_year_id'),f('daily_travel_amount','תעריף יומי','number'),f('maximum_monthly_travel_amount','תקרה חודשית','number'),f('lifecycle_status','מצב','select',{options:statuses})] }
  ]}
];

const configs = SETTINGS_SECTIONS.flatMap((section) => section.tables);
const byTable = new Map(configs.map((config) => [config.table, config]));

export function mountSettingsCenter(root, request, { canEdit = false } = {}) {
  let data = {}, query = '', editing = null, message = '';
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
      return `<select name="${def.name}"><option value="">בחירה…</option>${rows.map((r) => `<option value="${escape(r[def.key])}" ${String(value) === String(r[def.key]) ? 'selected' : ''}>${escape(r[def.display])}</option>`).join('')}</select>`;
    }
    if (def.type === 'select') return `<select name="${def.name}"><option value="">בחירה…</option>${def.options.map((o) => `<option value="${o.value}" ${value === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}</select>`;
    if (def.type === 'boolean') return `<select name="${def.name}"><option value="true" ${value ? 'selected' : ''}>כן</option><option value="false" ${!value ? 'selected' : ''}>לא</option></select>`;
    return `<input name="${def.name}" type="${def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text'}" ${def.type === 'number' ? 'step="any"' : ''} value="${escape(value)}">`;
  };
  const render = () => {
    root.innerHTML = `<section class="settings-shell" dir="rtl"><header class="settings-heading"><div><p class="eyebrow">מרכז ניהול</p><h1>הגדרות</h1><p>כל הגדרות המערכת במקום אחד, לפי נושאים עסקיים ולא לפי טבלאות.</p></div><div class="settings-source"><strong>Supabase</strong><span>מקור הנתונים הראשי</span></div></header>
    <div class="settings-toolbar panel"><label>חיפוש הגדרה<input data-settings-search type="search" value="${escape(query)}" placeholder="מעון, שנה, תפקיד…"></label><span>${configs.length} קבוצות הגדרה</span></div>${message ? `<p class="settings-feedback" role="status">${escape(message)}</p>` : ''}
    <nav class="settings-jump">${SETTINGS_SECTIONS.map((s) => `<a href="#settings-${s.id}">${s.title}</a>`).join('')}</nav>
    ${SETTINGS_SECTIONS.map((section, index) => { const cards = section.tables.filter((c) => !query || c.title.includes(query)).map((config) => { const rows = data[config.table] || []; return `<details class="settings-card panel" ${index === 0 ? 'open' : ''}><summary><span><strong>${config.title}</strong><small>${section.description}</small></span><b>${rows.length}</b></summary><div class="settings-card-body">${canEdit ? `<button class="button button-primary" data-settings-add="${config.table}">הוספה</button>` : '<span class="status-badge status-neutral">צפייה בלבד</span>'}<div class="settings-records">${rows.length ? rows.map((row) => `<article><div>${config.fields.slice(0,4).map((def) => `<span><small>${def.label}</small><strong>${escape(label(def,row))}</strong></span>`).join('')}</div>${canEdit ? `<button class="button button-quiet" data-settings-edit="${config.table}" data-id="${row[config.key]}">עריכה</button>` : ''}</article>`).join('') : '<p class="empty-inline">אין רשומות.</p>'}</div></div></details>`; }).join(''); return cards ? `<section id="settings-${section.id}" class="settings-section"><header><span>${index+1}</span><div><h2>${section.title}</h2><p>${section.description}</p></div></header>${cards}</section>` : ''; }).join('')}
    ${editing ? `<div class="settings-dialog-backdrop"><section class="settings-dialog" role="dialog" aria-modal="true"><header><h2>${editing.config.title}</h2><button data-settings-close aria-label="סגירה">×</button></header><form data-settings-form><div class="settings-form-grid">${editing.config.fields.filter((d)=>!d.technical).map((d)=>`<label><span>${d.label}</span>${control(d,editing.record)}</label>`).join('')}</div>${editing.config.fields.some((d)=>d.technical)?`<details class="settings-technical"><summary>פרטים טכניים</summary>${editing.config.fields.filter((d)=>d.technical).map((d)=>`<label><span>${d.label}</span>${control(d,editing.record)}</label>`).join('')}</details>`:''}<footer><button type="button" class="button button-secondary" data-settings-close>ביטול</button><button class="button button-primary">שמירה</button>${editing.id?'<button type="button" class="button button-danger" data-settings-delete>מחיקה</button>':''}</footer></form></section></div>` : ''}</section>`;
    bind();
  };
  const bind = () => {
    root.querySelector('[data-settings-search]')?.addEventListener('input', (event) => { query=event.target.value.trim(); render(); root.querySelector('[data-settings-search]')?.focus(); });
    root.querySelectorAll('[data-settings-add]').forEach((b)=>b.onclick=()=>{editing={config:byTable.get(b.dataset.settingsAdd),record:{},id:''};render();});
    root.querySelectorAll('[data-settings-edit]').forEach((b)=>b.onclick=()=>{const config=byTable.get(b.dataset.settingsEdit);const record=data[config.table].find((r)=>String(r[config.key])===b.dataset.id);editing={config,record:{...record},id:record[config.key]};render();});
    root.querySelectorAll('[data-settings-close]').forEach((b)=>b.onclick=()=>{editing=null;render();});
    root.querySelector('[data-settings-form]')?.addEventListener('change',(event)=>{editing.record[event.target.name]=event.target.value;const deps=editing.config.fields.filter((d)=>d.dependsOn===event.target.name);deps.forEach((d)=>editing.record[d.name]='');if(deps.length)render();});
    root.querySelector('[data-settings-form]')?.addEventListener('submit',async(event)=>{event.preventDefault();const values=new FormData(event.currentTarget);const row={};editing.config.fields.forEach((def)=>{let value=values.get(def.name);if(def.type==='boolean')value=value==='true';if(def.type==='number')value=value===''?null:Number(value);row[def.name]=value===''?null:value;});try{const result=await request(editing.id?'PATCH':'POST',{table:editing.config.table,id:editing.id||undefined,values:row});data[editing.config.table]=editing.id?data[editing.config.table].map((r)=>String(r[editing.config.key])===String(editing.id)?result.row:r):[...data[editing.config.table],result.row];editing=null;message='ההגדרה נשמרה בהצלחה.';hydrate();render();}catch(error){message=error.message;render();}});
    root.querySelector('[data-settings-delete]')?.addEventListener('click',async()=>{if(!confirm('למחוק את ההגדרה? קשרים קיימים ימנעו מחיקה לא תקינה.'))return;try{await request('DELETE',{table:editing.config.table,id:editing.id});data[editing.config.table]=data[editing.config.table].filter((r)=>String(r[editing.config.key])!==String(editing.id));editing=null;message='ההגדרה נמחקה.';render();}catch(error){message=error.message;render();}});
  };
  root.innerHTML='<section class="state panel">טוען את הגדרות המערכת…</section>';
  request('GET').then((result)=>{data=result.data;hydrate();render();}).catch((error)=>{root.innerHTML=`<section class="state error panel"><strong>לא ניתן לטעון את ההגדרות</strong><p>${escape(error.message)}</p></section>`;});
}
