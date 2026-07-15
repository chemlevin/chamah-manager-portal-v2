const SUPABASE_URL = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4MKSdjf7O1oVS4SWhQ36Qw_QUKW8dyW';
const SESSION_KEY = 'chamah.portal.session';
const AUTH_REDIRECT_URL = 'https://chamah-manager-portal-v2-preview.vercel.app/new/';
const SESSION_REFRESH_LEEWAY_SECONDS = 60;
const $ = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });

const modules = [
  { route: 'dashboards', icon: '📊', title: 'דשבורדים', description: 'תמונת מצב ניהולית ברורה לפי היחידה הארגונית הרלוונטית.' },
  { route: 'calculators', icon: '🧮', title: 'מחשבונים', description: 'כלי חישוב ותכנון שיסייעו בקבלת החלטות מהירה ומדויקת.' },
  { route: 'tasks', icon: '✅', title: 'משימות', description: 'ריכוז משימות, מעקב אחר ביצוע ותיעדוף העבודה השוטפת.' },
  { route: 'maintenance', icon: '🔧', title: 'תחזוקה', description: 'דיווח תקלות, מעקב טיפול וניהול תחזוקת המעונות.' },
  { route: 'knowledge', icon: '📚', title: 'מרכז ידע והנחיות', description: 'נהלים, הנחיות מקצועיות ומידע ארגוני במקום אחד.' }
];

const dashboardTypes = [
  { id: 'finance', icon: '₪', title: 'דשבורד כספים', description: 'תמונה כספית ניהולית עבור היחידה שנבחרה.' },
  { id: 'accounting', icon: '🧾', title: 'דשבורד הנה״ח', description: 'בקרה על תהליכי הנהלת החשבונות של היחידה.' },
  { id: 'staffing', icon: '👥', title: 'דשבורד צוות ורישוי', description: 'תמונת מצב של צוות, הכשרות ורישוי ביחידה.' },
  { id: 'occupancy', icon: '🏫', title: 'דשבורד תפוסה ותקינה', description: 'מעקב אחר תפוסה, כיתות ודרישות תקינה ביחידה.' }
];

const simpleRoutes = Object.fromEntries(modules.filter((module) => module.route !== 'dashboards').map((module) => [module.route, module]));
simpleRoutes.home = { route: 'home', title: 'עמוד הבית' };
let session = readSession();
let unitState = { status: 'idle', items: [], error: '' };
let generalModel = {};
let generalStatus = 'idle';
let generalError = '';
const protectedRequests = new Set();

function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

function saveSession(value) {
  session = normalizeSession(value);
  session ? localStorage.setItem(SESSION_KEY, JSON.stringify(session)) : localStorage.removeItem(SESSION_KEY);
}

function normalizeSession(value) {
  if (!value?.access_token || !value?.refresh_token) return null;
  const expiresIn = Number(value.expires_in || 0);
  const expiresAt = Number(value.expires_at) || (expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : 0);
  return { ...value, expires_at: expiresAt };
}

function cleanAuthUrl() {
  history.replaceState({}, '', `${new URL(AUTH_REDIRECT_URL).pathname}#home`);
}

function parseCallback() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const search = new URLSearchParams(location.search);
  const error = hash.get('error_description') || search.get('error_description');
  if (hash.get('access_token') && hash.get('refresh_token')) {
    saveSession({
      access_token: hash.get('access_token'),
      refresh_token: hash.get('refresh_token'),
      token_type: hash.get('token_type') || 'bearer',
      expires_in: Number(hash.get('expires_in') || 3600)
    });
    cleanAuthUrl();
  } else if (error) {
    saveSession(null);
    cleanAuthUrl();
  }
  return error;
}

async function sendLoginLink(email) {
  const endpoint = new URL(`${SUPABASE_URL}/auth/v1/otp`);
  endpoint.searchParams.set('redirect_to', AUTH_REDIRECT_URL);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, create_user: false })
  });
  if (!response.ok) throw new Error((await response.json()).msg || 'שליחת הקישור נכשלה. אפשר לנסות שוב בעוד רגע.');
}

async function refreshSession() {
  if (!session?.refresh_token) return false;
  const refreshToken = session.refresh_token;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refreshToken }) });
  if (!response.ok) { saveSession(null); return false; }
  const value = await response.json();
  saveSession({ ...value, refresh_token: value.refresh_token || refreshToken });
  return Boolean(session);
}

async function ensureAccessToken() {
  if (!session?.access_token || !session?.refresh_token) return false;
  if (!session.expires_at || session.expires_at <= Date.now() / 1000 + SESSION_REFRESH_LEEWAY_SECONDS) return refreshSession();
  return true;
}

async function validateSession() {
  if (!await ensureAccessToken()) return false;
  const validate = () => fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` } });
  let response = await validate();
  if (response.status === 401 && await refreshSession()) response = await validate();
  if (!response.ok) saveSession(null);
  return response.ok;
}

async function rest(table, query = '') {
  if (!await ensureAccessToken()) throw new Error('החיבור פג. יש להתחבר מחדש.');
  const controller = new AbortController();
  protectedRequests.add(controller);
  let response;
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { signal: controller.signal, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` } });
  } finally {
    protectedRequests.delete(controller);
  }
  if (!response.ok) throw new Error((await response.json()).message || `שגיאה בקריאת ${table}`);
  return response.json();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function parseRoute() {
  const parts = location.hash.slice(1).split('/').filter(Boolean).map(decodeURIComponent);
  if (!parts.length || parts[0] === 'home') return { section: 'home' };
  if (parts[0] === 'dashboards') return { section: 'dashboards', unitId: parts[1] === 'unit' ? parts[2] : null, dashboardType: parts[1] === 'unit' ? parts[3] : null };
  return simpleRoutes[parts[0]] ? { section: parts[0] } : { section: 'home' };
}

function unitRoute(unitId, dashboardType = '') {
  return `#dashboards/unit/${encodeURIComponent(unitId)}${dashboardType ? `/${dashboardType}` : ''}`;
}

function activeUnits(rows) {
  return rows.filter((unit) => unit.lifecycle_status === 'ACTIVE').sort((a, b) => Number(a.display_order ?? 0) - Number(b.display_order ?? 0) || String(a.display_name).localeCompare(String(b.display_name), 'he') || String(a.allocation_unit_id).localeCompare(String(b.allocation_unit_id)));
}

async function loadUnits() {
  if (unitState.status === 'loading' || unitState.status === 'ready') return;
  unitState = { status: 'loading', items: [], error: '' };
  try {
    const rows = await rest('allocation_units', 'select=allocation_unit_id,display_name,allocation_unit_type,lifecycle_status,display_order,notes&lifecycle_status=eq.ACTIVE&order=display_order.asc,display_name.asc,allocation_unit_id.asc');
    unitState = { status: 'ready', items: activeUnits(rows), error: '' };
  } catch (error) {
    unitState = { status: 'error', items: [], error: error.message };
  }
}

function homeTemplate() {
  return `<section class="page-heading"><div><p class="eyebrow">סביבת העבודה שלך</p><h1>שלום, ברוכה הבאה לפורטל חמ״ה</h1><p>מכאן ניתן להגיע לכל כלי הניהול, המעקב והידע של הארגון.</p></div><span class="status-badge status-success"><span aria-hidden="true">●</span> המערכת זמינה</span></section>
  <section class="attention-panel panel" aria-labelledby="attention-title"><div class="attention-icon" aria-hidden="true">i</div><div><h2 id="attention-title">הפורטל החדש בהקמה</h2><p>מעטפת העבודה מוכנה. המודולים ייפתחו בהדרגה בספרינטים הבאים.</p></div><a class="button button-secondary" href="#knowledge">למידע נוסף</a></section>
  <section aria-labelledby="modules-title"><div class="section-heading"><div><h2 id="modules-title">לאן תרצי להמשיך?</h2><p>בחרי תחום כדי לפתוח את סביבת העבודה המתאימה.</p></div></div><div class="module-grid">${modules.map((module) => `<a class="module-card card" href="#${module.route}"><span class="module-icon" aria-hidden="true">${module.icon}</span><div><h3>${module.title}</h3><p>${module.description}</p></div><span class="card-action">פתיחה <span aria-hidden="true">←</span></span></a>`).join('')}</div></section>`;
}

function comingSoonTemplate(module) {
  return `<section class="page-heading"><div><p class="eyebrow">${module.title}</p><h1>${module.title}</h1><p>${module.description}</p></div><span class="status-badge status-neutral">בתכנון</span></section><section class="coming-soon panel"><span class="coming-icon" aria-hidden="true">${module.icon}</span><span class="status-badge status-info">בקרוב</span><h2>המודול נמצא בהכנה</h2><p>אנחנו בונים עבורך סביבת עבודה מקצועית, מהירה וברורה. היא תתווסף לפורטל באחד הספרינטים הקרובים.</p><div class="next-action"><strong>הפעולה הבאה</strong><span>אפשר לחזור לעמוד הבית ולבחור תחום אחר.</span></div><a class="button button-primary" href="#home">חזרה לעמוד הבית</a></section>`;
}

function loadingTemplate(label = 'טוען נתונים…') {
  return `<section class="loading-state panel" aria-live="polite"><span class="loading-spinner" aria-hidden="true"></span><strong>${label}</strong></section>`;
}

function unitsHubTemplate() {
  if (unitState.status === 'loading' || unitState.status === 'idle') return `<section class="page-heading"><div><p class="eyebrow">דשבורדים</p><h1>איזו יחידה ארגונית ברצונך לבדוק?</h1><p>בחרי יחידה כדי לעבור לדשבורדים המותאמים לה.</p></div></section>${loadingTemplate('טוען יחידות ארגוניות…')}`;
  if (unitState.status === 'error') return `<section class="page-heading"><div><p class="eyebrow">דשבורדים</p><h1>איזו יחידה ארגונית ברצונך לבדוק?</h1></div></section><section class="error-state panel"><strong>לא ניתן לטעון את היחידות הארגוניות</strong><span>${escapeHtml(unitState.error)}</span><button class="button button-secondary" type="button" data-retry-units>ניסיון נוסף</button></section>`;
  const cards = [{ allocation_unit_id: 'organization', display_name: 'כלל הארגון', allocation_unit_type: 'ORGANIZATION', notes: null }, ...unitState.items];
  return `<section class="page-heading"><div><p class="eyebrow">דשבורדים</p><h1>איזו יחידה ארגונית ברצונך לבדוק?</h1><p>בחרי יחידה כדי לעבור לדשבורדים המותאמים לה.</p></div><span class="status-badge status-neutral">${unitState.items.length} יחידות פעילות</span></section><section class="unit-grid" aria-label="יחידות ארגוניות">${cards.map(unitCardTemplate).join('')}</section>`;
}

function unitTypeLabel(type) {
  return ({ DAYCARE: 'מעון יום', OFFICE: 'יחידת משרד', MANAGEMENT: 'יחידת הנהלה', DEVELOPMENT: 'יחידת פיתוח', ORGANIZATION: 'מבט ארגוני כולל' })[type] || '';
}

function unitCardTemplate(unit) {
  const description = unit.notes || unitTypeLabel(unit.allocation_unit_type);
  return `<a class="unit-card card" data-unit-id="${escapeHtml(unit.allocation_unit_id)}" href="${unitRoute(unit.allocation_unit_id)}"><span class="unit-icon" aria-hidden="true">${unit.allocation_unit_type === 'DAYCARE' ? '🏠' : unit.allocation_unit_type === 'ORGANIZATION' ? '🏢' : '▦'}</span><div><h2>${escapeHtml(unit.display_name)}</h2>${description ? `<p>${escapeHtml(description)}</p>` : ''}</div><span class="unit-status">אין נתונים זמינים</span><span class="card-action">בחירת יחידה <span aria-hidden="true">←</span></span></a>`;
}

function findUnit(unitId) {
  if (unitId === 'organization') return { allocation_unit_id: 'organization', display_name: 'כלל הארגון', allocation_unit_type: 'ORGANIZATION' };
  return unitState.items.find((unit) => unit.allocation_unit_id === unitId);
}

function unitHubTemplate(unit) {
  return `<section class="page-heading"><div><p class="eyebrow">דשבורדים · ${escapeHtml(unit.display_name)}</p><h1>${escapeHtml(unit.display_name)}</h1><p>בחרי את סוג הדשבורד שברצונך לפתוח עבור יחידה זו.</p></div><a class="button button-secondary" href="#dashboards">חזרה לכל היחידות</a></section><section class="dashboard-type-grid" aria-label="סוגי דשבורדים">${dashboardTypes.map((type) => `<a class="dashboard-type-card card" data-dashboard-type="${type.id}" href="${unitRoute(unit.allocation_unit_id, type.id)}"><span class="dashboard-type-icon" aria-hidden="true">${type.icon}</span><div><h2>${type.title}</h2><p>${type.description}</p></div><span class="card-action">פתיחת הדשבורד <span aria-hidden="true">←</span></span></a>`).join('')}</section>`;
}

function dashboardPlaceholderTemplate(unit, type) {
  return `<section class="page-heading"><div><p class="eyebrow">${escapeHtml(unit.display_name)} · ${type.title}</p><h1>${type.title}</h1><p>הדשבורד יוצג בהקשר של ${escapeHtml(unit.display_name)}.</p></div><a class="button button-secondary" href="${unitRoute(unit.allocation_unit_id)}">חזרה לדשבורדי היחידה</a></section><section class="coming-soon panel"><span class="coming-icon" aria-hidden="true">${type.icon}</span><span class="status-badge status-info">בקרוב</span><h2>${type.title} עבור ${escapeHtml(unit.display_name)}</h2><p>היעד מוכן לטעינת נתונים ייעודיים בספרינט עתידי. בשלב זה לא מוצגים נתונים, מדדים או התראות.</p></section>`;
}

function generalDashboardShell() {
  return `<section class="page-heading general-dashboard-heading"><div><p class="eyebrow">כלל הארגון · דשבורד כספים</p><h1>דשבורד כספים</h1><p>נתונים חיים מ־Supabase</p></div><div class="filters"><label class="field" for="year-filter"><span>שנת לימודים</span><select id="year-filter"></select></label><label class="field" for="month-filter"><span>חודש</span><select id="month-filter"></select></label></div></section><div id="general-state" class="state">טוען נתונים חיים…</div><div id="general-dashboard" hidden><section id="kpis" class="kpis"></section><section class="panel data-panel"><div class="panel-head"><div><p class="eyebrow">לפי מעון</p><h2>תפוסה</h2></div><span id="daycare-count"></span></div><div id="daycares" class="daycare-grid"></div></section><section class="panel data-panel"><div class="panel-head"><div><p class="eyebrow">איכות נתונים</p><h2>מה חסר ודורש טיפול</h2></div><span id="issues-count"></span></div><div id="issues" class="issues"></div></section></div>`;
}

const sum = (items, getter) => items.reduce((total, item) => total + Number(getter(item) || 0), 0);
const month = (date) => String(date || '').slice(0, 7);

async function loadGeneralDashboard() {
  if (generalStatus === 'loading' || generalStatus === 'ready') return;
  generalStatus = 'loading';
  generalError = '';
  try {
    const [years, months, daycares, dsy, classrooms, enrollment, payroll, pa, bank, ba, units, issues] = await Promise.all([
      rest('school_years', 'select=school_year_id,display_name,start_date,end_date,is_default,is_selectable&is_selectable=eq.true&order=start_date.desc'), rest('school_year_months', 'select=school_year_id,month_label,start_date,school_year_sequence&order=school_year_sequence'), rest('daycares', 'select=daycare_id,allocation_unit_id,display_name,lifecycle_status,display_order&order=display_order'), rest('daycare_school_years', 'select=daycare_school_year_id,daycare_id,school_year_id,is_operating'), rest('classrooms', 'select=classroom_id,daycare_school_year_id,display_name'), rest('monthly_enrollment', 'select=classroom_id,reporting_month,children_count'), rest('payroll_records', 'select=payroll_record_id,payroll_month,employer_cost'), rest('payroll_allocations', 'select=payroll_record_id,allocation_unit_id,allocation_amount'), rest('bank_transactions', 'select=bank_transaction_id,transaction_date,amount'), rest('bank_allocations', 'select=bank_transaction_id,allocation_unit_id,budget_month,allocation_amount'), rest('allocation_units', 'select=allocation_unit_id,display_name'), rest('data_quality_issues', 'select=severity,status,explanation,entity_type&status=eq.OPEN')
    ]);
    generalModel = { years, months, daycares, dsy, classrooms, enrollment, payroll, pa, bank, ba, units, issues };
    generalStatus = 'ready';
  } catch (error) {
    generalStatus = 'error';
    generalError = error.message;
  }
}

function setupGeneralFilters() {
  const yearSelect = $('#year-filter');
  if (!yearSelect) return;
  const oldValue = yearSelect.value;
  yearSelect.innerHTML = generalModel.years.map((year) => `<option value="${year.school_year_id}">${escapeHtml(year.display_name)}</option>`).join('');
  yearSelect.value = oldValue && generalModel.years.some((year) => year.school_year_id === oldValue) ? oldValue : (generalModel.years.find((year) => year.is_default) || generalModel.years[0])?.school_year_id || '';
  const available = generalModel.months.filter((item) => item.school_year_id === yearSelect.value);
  $('#month-filter').innerHTML = available.map((item) => `<option value="${item.start_date}">${escapeHtml(item.month_label)}</option>`).join('');
  const now = new Date().toISOString().slice(0, 7);
  $('#month-filter').value = available.find((item) => item.start_date.startsWith(now))?.start_date || available[0]?.start_date || '';
}

function renderGeneralData() {
  if (generalStatus === 'error') { $('#general-state').textContent = generalError; $('#general-state').classList.add('error'); return; }
  if (generalStatus !== 'ready') return;
  setupGeneralFilters();
  const year = $('#year-filter').value;
  const selectedMonth = month($('#month-filter').value);
  const dsyIds = new Set(generalModel.dsy.filter((item) => item.school_year_id === year && item.is_operating).map((item) => item.daycare_school_year_id));
  const classrooms = generalModel.classrooms.filter((item) => dsyIds.has(item.daycare_school_year_id));
  const classroomIds = new Set(classrooms.map((item) => item.classroom_id));
  const enrollment = generalModel.enrollment.filter((item) => classroomIds.has(item.classroom_id) && month(item.reporting_month) === selectedMonth);
  const payroll = generalModel.payroll.filter((item) => month(item.payroll_month) === selectedMonth);
  const payrollIds = new Set(payroll.map((item) => item.payroll_record_id));
  const payrollAllocations = generalModel.pa.filter((item) => payrollIds.has(item.payroll_record_id));
  const bankAllocations = generalModel.ba.filter((item) => month(item.budget_month) === selectedMonth);
  const bankIds = new Set(bankAllocations.map((item) => item.bank_transaction_id));
  const transactions = generalModel.bank.filter((item) => bankIds.has(item.bank_transaction_id));
  const income = sum(transactions.filter((item) => item.amount > 0), (item) => item.amount);
  const expense = Math.abs(sum(transactions.filter((item) => item.amount < 0), (item) => item.amount));
  const values = [['כמות ילדים', sum(enrollment, (item) => item.children_count)], ['עלות שכר', money.format(sum(payroll, (item) => item.employer_cost))], ['הכנסות בנק', money.format(income)], ['הוצאות בנק', money.format(expense)]];
  $('#kpis').innerHTML = values.map((value) => `<article class="kpi"><span>${value[0]}</span><strong>${value[1]}</strong></article>`).join('');
  const daycareRows = generalModel.daycares.filter((daycare) => generalModel.dsy.some((item) => item.daycare_id === daycare.daycare_id && item.school_year_id === year && item.is_operating)).map((daycare) => { const ids = new Set(classrooms.filter((classroom) => generalModel.dsy.some((item) => item.daycare_school_year_id === classroom.daycare_school_year_id && item.daycare_id === daycare.daycare_id)).map((classroom) => classroom.classroom_id)); return { ...daycare, children: sum(enrollment.filter((item) => ids.has(item.classroom_id)), (item) => item.children_count), payroll: sum(payrollAllocations.filter((item) => item.allocation_unit_id === daycare.allocation_unit_id), (item) => item.allocation_amount) }; });
  $('#daycares').innerHTML = daycareRows.length ? daycareRows.map((daycare) => `<article class="daycare-card"><strong>${escapeHtml(daycare.display_name)}</strong><div class="number">${daycare.children} ילדים</div><small>שכר משויך: ${money.format(daycare.payroll)}</small></article>`).join('') : '<div class="empty-state">אין נתוני תפוסה בחודש שנבחר</div>';
  $('#daycare-count').textContent = `${daycareRows.length} מעונות`;
  const missing = [];
  if (!enrollment.length) missing.push('לא נמצאו נתוני תפוסה לחודש שנבחר');
  if (!payroll.length) missing.push('לא נמצאו רשומות שכר לחודש שנבחר');
  if (!bankAllocations.length) missing.push('לא נמצאו שיוכי תנועות בנק לחודש שנבחר');
  generalModel.issues.forEach((issue) => missing.push(issue.explanation));
  $('#issues').innerHTML = missing.length ? missing.map((item) => `<div class="issue">${escapeHtml(item)}</div>`).join('') : '<div class="empty-state">לא נמצאו נתונים חסרים או התראות פתוחות</div>';
  $('#issues-count').textContent = missing.length ? `${missing.length} דורשים טיפול` : 'תקין';
  $('#general-state').hidden = true;
  $('#general-dashboard').hidden = false;
}

function breadcrumbsTemplate(route, unit, type) {
  const parts = ['<a href="#home">עמוד הבית</a>'];
  if (route.section === 'home') return '<span aria-current="page">עמוד הבית</span>';
  if (route.section !== 'dashboards') return `${parts.join('')}<span aria-hidden="true">/</span><span aria-current="page">${simpleRoutes[route.section].title}</span>`;
  parts.push('<span aria-hidden="true">/</span>', route.unitId ? '<a href="#dashboards">דשבורדים</a>' : '<span aria-current="page">דשבורדים</span>');
  if (unit) parts.push('<span aria-hidden="true">/</span>', type ? `<a href="${unitRoute(unit.allocation_unit_id)}">${escapeHtml(unit.display_name)}</a>` : `<span aria-current="page">${escapeHtml(unit.display_name)}</span>`);
  if (type) parts.push('<span aria-hidden="true">/</span>', `<span aria-current="page">${type.title}</span>`);
  return parts.join('');
}

async function render() {
  const route = parseRoute();
  let title = route.section === 'home' ? 'עמוד הבית' : route.section === 'dashboards' ? 'דשבורדים' : simpleRoutes[route.section].title;
  let unit = null;
  let type = null;
  if (route.section === 'home') $('#page-content').innerHTML = homeTemplate();
  else if (route.section !== 'dashboards') $('#page-content').innerHTML = comingSoonTemplate(simpleRoutes[route.section]);
  else {
    if (unitState.status === 'idle') { $('#page-content').innerHTML = unitsHubTemplate(); loadUnits().then(render); }
    else if (!route.unitId) $('#page-content').innerHTML = unitsHubTemplate();
    else if (unitState.status === 'loading') $('#page-content').innerHTML = loadingTemplate('טוען את פרטי היחידה…');
    else {
      unit = findUnit(route.unitId);
      type = dashboardTypes.find((item) => item.id === route.dashboardType);
      if (!unit) $('#page-content').innerHTML = `<section class="error-state panel"><strong>היחידה הארגונית לא נמצאה או אינה פעילה</strong><a class="button button-secondary" href="#dashboards">חזרה לכל היחידות</a></section>`;
      else if (!route.dashboardType) { title = unit.display_name; $('#page-content').innerHTML = unitHubTemplate(unit); }
      else if (!type) $('#page-content').innerHTML = `<section class="error-state panel"><strong>סוג הדשבורד לא נמצא</strong><a class="button button-secondary" href="${unitRoute(unit.allocation_unit_id)}">חזרה לדשבורדי היחידה</a></section>`;
      else if (unit.allocation_unit_id === 'organization' && type.id === 'finance') {
        title = type.title;
        $('#page-content').innerHTML = generalDashboardShell();
        await loadGeneralDashboard();
        if (parseRoute().unitId === 'organization' && parseRoute().dashboardType === 'finance') renderGeneralData();
      } else { title = type.title; $('#page-content').innerHTML = dashboardPlaceholderTemplate(unit, type); }
    }
  }
  document.title = `${title} | פורטל חמ״ה`;
  $('#breadcrumbs').innerHTML = breadcrumbsTemplate(route, unit, type);
  document.querySelectorAll('[data-route]').forEach((item) => item.classList.toggle('active', item.dataset.route === route.section));
  const retryButton = $('[data-retry-units]');
  if (retryButton) retryButton.addEventListener('click', () => { unitState = { status: 'idle', items: [], error: '' }; render(); });
  const yearFilter = $('#year-filter');
  if (yearFilter) yearFilter.addEventListener('change', () => { setupGeneralFilters(); renderGeneralData(); });
  const monthFilter = $('#month-filter');
  if (monthFilter) monthFilter.addEventListener('change', renderGeneralData);
  closeMenu();
  $('#main-content').focus({ preventScroll: true });
}

function openMenu() { $('#sidebar').classList.add('open'); $('#sidebar-backdrop').classList.add('open'); $('#menu-toggle').setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-open'); }
function closeMenu() { $('#sidebar').classList.remove('open'); $('#sidebar-backdrop').classList.remove('open'); $('#menu-toggle').setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); }
function formatToday() { return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()); }

$('#login-form').addEventListener('submit', async (event) => { event.preventDefault(); const email = $('#email'); const message = $('#login-message'); if (!email.validity.valid) { message.textContent = 'יש להזין כתובת דוא״ל תקינה.'; email.focus(); return; } message.textContent = 'שולח קישור כניסה…'; try { await sendLoginLink(email.value.trim()); message.textContent = 'הקישור נשלח. יש לפתוח אותו מאותו דפדפן.'; } catch (error) { message.textContent = error.message; } });
$('#logout').addEventListener('click', async () => {
  const accessToken = session?.access_token;
  protectedRequests.forEach((controller) => controller.abort());
  protectedRequests.clear();
  saveSession(null);
  unitState = { status: 'idle', items: [], error: '' };
  generalModel = {};
  generalStatus = 'idle';
  $('#app-view').hidden = true;
  $('#login-view').style.display = '';
  $('#login-message').textContent = 'ההתנתקות הושלמה.';
  cleanAuthUrl();
  if (accessToken) {
    try { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` } }); } catch { /* Local logout is already complete. */ }
  }
});
$('#menu-toggle').addEventListener('click', () => $('#sidebar').classList.contains('open') ? closeMenu() : openMenu());
$('#mobile-more').addEventListener('click', openMenu);
$('#sidebar-backdrop').addEventListener('click', closeMenu);
window.addEventListener('hashchange', render);
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

async function initializeAuth() {
  const callbackError = parseCallback();
  if (callbackError) $('#login-message').textContent = callbackError;
  if (!await validateSession()) {
    $('#app-view').hidden = true;
    $('#login-view').style.display = '';
    return;
  }
  $('#login-view').style.display = 'none';
  $('#app-view').hidden = false;
  $('#israeli-date').textContent = formatToday();
  await render();
}

initializeAuth();
