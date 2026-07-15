const SUPABASE_URL = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4MKSdjf7O1oVS4SWhQ36Qw_QUKW8dyW';
const SESSION_KEY = 'chamah.portal.session';
const SESSION_REFRESH_LEEWAY_SECONDS = 60;
const MIN_PASSWORD_LENGTH = 10;
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
let generalLastUpdated = null;
let activeDashboardUnit = null;
const protectedRequests = new Set();
let authPending = false;
let recoveryPending = false;

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

function cleanRecoveryUrl(route = 'reset-password') {
  history.replaceState({}, '', `${location.pathname}#${route}`);
}

function recoveryErrorMessage(value = {}) {
  const detail = `${value.error_code || ''} ${value.error_description || ''} ${value.error || ''}`.toLowerCase();
  if (detail.includes('expired')) return 'תוקף הקישור פג. יש לשלוח קישור איפוס חדש דרך Supabase.';
  return 'קישור האיפוס אינו תקף או שכבר נעשה בו שימוש. יש לשלוח קישור חדש דרך Supabase.';
}

function parseRecoveryCallback() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const search = new URLSearchParams(location.search);
  const error = hash.get('error') || search.get('error');
  const errorCode = hash.get('error_code') || search.get('error_code');
  const errorDescription = hash.get('error_description') || search.get('error_description');
  const isRecovery = hash.get('type') === 'recovery' || search.get('type') === 'recovery' || location.hash === '#reset-password' || Boolean(error || errorCode || errorDescription);
  if (!isRecovery) return { isRecovery: false, error: '' };
  if (error || errorCode || errorDescription) {
    saveSession(null);
    cleanRecoveryUrl();
    return { isRecovery: true, error: recoveryErrorMessage({ error, error_code: errorCode, error_description: errorDescription }) };
  }
  if (hash.get('access_token') && hash.get('refresh_token')) {
    saveSession({
      access_token: hash.get('access_token'),
      refresh_token: hash.get('refresh_token'),
      token_type: hash.get('token_type') || 'bearer',
      expires_in: Number(hash.get('expires_in') || 3600)
    });
    cleanRecoveryUrl();
  }
  return { isRecovery: true, error: '' };
}

function authErrorMessage(response, value, fallback) {
  const detail = `${value?.error_code || ''} ${value?.msg || ''} ${value?.message || ''}`.toLowerCase();
  if (response.status === 429 || detail.includes('rate limit')) return 'נשלחו בקשות רבות מדי. יש להמתין מעט לפני ניסיון נוסף.';
  if (response.status === 400 || detail.includes('invalid') || detail.includes('credentials')) return 'כתובת המייל או הסיסמה אינם נכונים.';
  return fallback;
}

async function signInWithPassword(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(authErrorMessage(response, value, 'הכניסה נכשלה. יש לנסות שוב.'));
  }
  saveSession(value);
  if (!session) throw new Error('לא התקבל חיבור מאובטח. יש לנסות שוב.');
}

function setAuthPending(pending) {
  authPending = pending;
  $('#login-submit').disabled = pending;
  $('#toggle-password').disabled = pending;
}

function setRecoveryPending(pending) {
  recoveryPending = pending;
  $('#save-password').disabled = pending;
  $('#return-to-login').disabled = pending;
  $('#show-recovery-passwords').disabled = pending;
}

function isStrongPassword(value) {
  return value.length >= MIN_PASSWORD_LENGTH && /\p{L}/u.test(value) && /\d/.test(value);
}

async function updateRecoveryPassword(password) {
  if (!await ensureAccessToken()) throw new Error('תוקף קישור האיפוס פג. יש לשלוח קישור חדש דרך Supabase.');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  if (!response.ok) {
    const value = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) throw new Error(recoveryErrorMessage(value));
    throw new Error('לא ניתן לשמור את הסיסמה. יש לנסות שוב.');
  }
}

function showRecoveryView(error = '') {
  $('#login-view').style.display = 'none';
  $('#app-view').hidden = true;
  $('#recovery-view').hidden = false;
  $('#recovery-message').textContent = error;
  $('#recovery-fields').hidden = Boolean(error);
  if (!error) $('#new-password').focus();
}

async function showPortalHome() {
  $('#login-view').style.display = 'none';
  $('#recovery-view').hidden = true;
  $('#app-view').hidden = false;
  $('#israeli-date').textContent = formatToday();
  await render();
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

function generalDashboardShell(unit) {
  return `<section class="financial-heading"><div><p class="eyebrow">דשבורד כספים</p><h1>דשבורד כספים · ${escapeHtml(unit.display_name)}</h1><p>תמונת מצב ניהולית המבוססת על הנתונים הקיימים בלבד.</p></div><div class="dashboard-context"><span><small>יחידת הקצאה</small><strong>${escapeHtml(unit.display_name)}</strong></span><span><small>שנת לימודים</small><strong id="context-year">—</strong></span><span><small>תקופה נבחרת</small><strong id="context-period">—</strong></span></div></section>
  <section class="global-toolbar panel" aria-label="פעולות דשבורד"><button id="refresh-dashboard" class="button button-secondary" type="button">↻ רענון נתונים</button><span class="last-updated"><small>עודכן לאחרונה</small><strong id="last-updated">טרם עודכן</strong></span><div class="toolbar-actions"><button class="button button-quiet" type="button" data-export="print">הדפסה</button><button class="button button-quiet" type="button" data-export="pdf">PDF</button><button class="button button-quiet" type="button" data-export="excel">Excel</button></div></section>
  <section class="period-panel panel"><div><h2>בחירת תקופה</h2><p>ניתן לבחור חודש אחד או מספר חודשים. סיכום שנת הלימודים נשאר קבוע.</p></div><div class="filters"><label class="field" for="year-filter"><span>שנת לימודים</span><select id="year-filter"></select></label><label class="field" for="month-filter"><span>חודשים</span><select id="month-filter" multiple aria-describedby="month-help"></select><small id="month-help">לבחירה מרובה: Ctrl או ⌘</small></label></div></section>
  <div id="general-state" class="dashboard-skeleton" aria-live="polite">${Array.from({ length: 8 }, () => '<span></span>').join('')}</div>
  <div id="general-dashboard" hidden><section class="school-year-summary panel" aria-labelledby="summary-title"><div><p class="eyebrow">הסיכום הניהולי הראשי</p><h2 id="summary-title">מתחילת שנת הלימודים</h2><p id="summary-range">—</p></div><div class="summary-arrow" aria-hidden="true">↓</div><div><small>עד החודש האחרון הזמין</small><strong id="summary-month">—</strong></div></section><section id="kpis" class="financial-kpis" aria-label="מדדים מרכזיים"></section><section class="expandable-sections" aria-label="פירוט הדשבורד">${['תקציב','שכר','שעות עבודה','ילדים','תנועות בנק','איכות נתונים'].map((label) => `<details class="dashboard-detail panel"><summary>${label}<span>פתיחת פירוט</span></summary><div class="detail-empty">הפירוט יתווסף כאשר נתוני המקור המתאימים יהיו זמינים.</div></details>`).join('')}</section></div>
  <aside id="kpi-panel" class="kpi-panel" hidden aria-labelledby="kpi-panel-title"><button id="close-kpi-panel" class="icon-button" type="button" aria-label="סגירת פירוט">×</button><p class="eyebrow">פירוט מדד</p><h2 id="kpi-panel-title"></h2><dl><div><dt>תיאור</dt><dd id="kpi-description"></dd></div><div><dt>חישוב</dt><dd id="kpi-calculation"></dd></div><div><dt>מקור נתונים</dt><dd id="kpi-source"></dd></div></dl><div class="empty-state compact"><strong>רשומות מקור</strong><span>רשומות המקור המפורטות יתווספו בשלב הבא.</span></div></aside><button id="kpi-backdrop" class="kpi-backdrop" type="button" aria-label="סגירת פירוט" hidden></button><div id="export-message" class="toast" role="status" hidden></div>`;
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
    generalLastUpdated = new Date();
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
  const selectedValues = new Set([...$('#month-filter').selectedOptions].map((option) => option.value));
  $('#month-filter').innerHTML = available.map((item) => `<option value="${item.start_date}">${escapeHtml(item.month_label)}</option>`).join('');
  [...$('#month-filter').options].forEach((option) => { option.selected = selectedValues.has(option.value); });
  const now = new Date().toISOString().slice(0, 7);
  const initial = available.find((item) => item.start_date.startsWith(now))?.start_date || available[0]?.start_date || '';
  if (![...$('#month-filter').selectedOptions].length && initial) $('#month-filter').value = initial;
}

const kpiDefinitions = [
  ['revenue', 'הכנסות', 'סך תנועות הבנק החיוביות בתקופה שנבחרה.', 'סכום תנועות חיוביות', 'תנועות בנק ושיוכי בנק'],
  ['expenses', 'הוצאות', 'סך תנועות הבנק השליליות בתקופה שנבחרה.', 'ערך מוחלט של תנועות שליליות', 'תנועות בנק ושיוכי בנק'],
  ['payroll', 'שכר', 'עלות השכר הזמינה בתקופה שנבחרה.', 'סכום עלות מעסיק', 'רשומות שכר והקצאות שכר'],
  ['profit', 'רווח / הפסד', 'המדד יוצג רק כאשר קיים מקור מאושר לחישוב.', 'טרם הוגדר', 'אין מקור זמין'],
  ['budget', 'תקציב', 'מסגרת התקציב המאושרת לתקופה.', 'טרם הוגדר', 'אין מקור זמין'],
  ['budget-use', 'ניצול תקציב', 'שיעור ניצול התקציב המאושר.', 'טרם הוגדר', 'אין מקור זמין'],
  ['hours', 'שעות עבודה', 'שעות העבודה בפועל.', 'טרם הוגדר', 'אין מקור זמין'],
  ['standard-hours', 'שעות תקן', 'שעות התקן המאושרות.', 'טרם הוגדר', 'אין מקור זמין'],
  ['hours-gap', 'פער שעות', 'הפער בין שעות בפועל לשעות התקן.', 'טרם הוגדר', 'אין מקור זמין'],
  ['hours-gap-percent', 'פער שעות %', 'שיעור הפער בין שעות בפועל לשעות התקן.', 'טרם הוגדר', 'אין מקור זמין'],
  ['children', 'ילדים', 'הערך בחודש האחרון שנבחר שבו קיימים נתונים; ילדים אינם נסכמים בין חודשים.', 'הערך העדכני ביותר', 'רישום חודשי'],
  ['alerts', 'התראות', 'מספר התראות איכות הנתונים הפתוחות.', 'ספירת התראות פתוחות', 'איכות נתונים']
];

function renderGeneralData() {
  if (generalStatus === 'error') { $('#general-state').className = 'error-state panel'; $('#general-state').innerHTML = '<strong>לא ניתן לטעון את נתוני הדשבורד</strong><span>הנתונים האחרונים נשמרו ככל שהיו זמינים.</span><button class="button button-secondary" type="button" data-retry-dashboard>נסה שוב</button>'; return; }
  if (generalStatus !== 'ready') return;
  setupGeneralFilters();
  const year = $('#year-filter').value;
  const selectedMonths = [...$('#month-filter').selectedOptions].map((option) => month(option.value));
  const selectedMonthSet = new Set(selectedMonths);
  const unitId = activeDashboardUnit?.allocation_unit_id;
  const dsyIds = new Set(generalModel.dsy.filter((item) => item.school_year_id === year && item.is_operating).map((item) => item.daycare_school_year_id));
  const classrooms = generalModel.classrooms.filter((item) => dsyIds.has(item.daycare_school_year_id));
  const relevantDaycares = unitId === 'organization' ? generalModel.daycares : generalModel.daycares.filter((item) => item.allocation_unit_id === unitId);
  const relevantDsyIds = new Set(generalModel.dsy.filter((item) => relevantDaycares.some((daycare) => daycare.daycare_id === item.daycare_id) && item.school_year_id === year && item.is_operating).map((item) => item.daycare_school_year_id));
  const classroomIds = new Set(classrooms.filter((item) => unitId === 'organization' || relevantDsyIds.has(item.daycare_school_year_id)).map((item) => item.classroom_id));
  const enrollment = generalModel.enrollment.filter((item) => classroomIds.has(item.classroom_id) && selectedMonthSet.has(month(item.reporting_month)));
  const payroll = generalModel.payroll.filter((item) => selectedMonthSet.has(month(item.payroll_month)));
  const payrollIds = new Set(payroll.map((item) => item.payroll_record_id));
  const payrollAllocations = generalModel.pa.filter((item) => payrollIds.has(item.payroll_record_id) && (unitId === 'organization' || item.allocation_unit_id === unitId));
  const bankAllocations = generalModel.ba.filter((item) => selectedMonthSet.has(month(item.budget_month)) && (unitId === 'organization' || item.allocation_unit_id === unitId));
  const bankIds = new Set(bankAllocations.map((item) => item.bank_transaction_id));
  const transactions = generalModel.bank.filter((item) => bankIds.has(item.bank_transaction_id));
  const income = sum(transactions.filter((item) => item.amount > 0), (item) => item.amount);
  const expense = Math.abs(sum(transactions.filter((item) => item.amount < 0), (item) => item.amount));
  const latestEnrollmentMonth = [...new Set(enrollment.map((item) => month(item.reporting_month)))].sort().at(-1);
  const children = latestEnrollmentMonth ? sum(enrollment.filter((item) => month(item.reporting_month) === latestEnrollmentMonth), (item) => item.children_count) : null;
  const payrollValue = unitId === 'organization' ? sum(payroll, (item) => item.employer_cost) : sum(payrollAllocations, (item) => item.allocation_amount);
  const values = { revenue: transactions.some((item) => item.amount > 0) ? money.format(income) : null, expenses: transactions.some((item) => item.amount < 0) ? money.format(expense) : null, payroll: payrollValue ? money.format(payrollValue) : null, children, alerts: generalModel.issues.length };
  $('#kpis').innerHTML = kpiDefinitions.map(([id, label]) => `<button class="financial-kpi" type="button" data-kpi="${id}"><span>${label}</span><strong>${values[id] ?? 'אין נתונים'}</strong><small>${values[id] == null ? 'המקור טרם זמין' : 'לתקופה שנבחרה'}</small></button>`).join('');
  const selectedLabels = [...$('#month-filter').selectedOptions].map((option) => option.textContent);
  const selectedYear = generalModel.years.find((item) => item.school_year_id === year);
  const yearMonths = generalModel.months.filter((item) => item.school_year_id === year);
  $('#context-year').textContent = selectedYear?.display_name || 'אין נתונים';
  $('#context-period').textContent = selectedLabels.length ? selectedLabels.join(', ') : 'לא נבחרה תקופה';
  $('#summary-range').textContent = selectedYear ? `${new Intl.DateTimeFormat('he-IL').format(new Date(selectedYear.start_date))} – ${new Intl.DateTimeFormat('he-IL').format(new Date(selectedYear.end_date))}` : 'אין נתוני שנת לימודים';
  $('#summary-month').textContent = yearMonths.at(-1)?.month_label || 'אין נתונים זמינים';
  $('#last-updated').textContent = generalLastUpdated ? new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(generalLastUpdated) : 'טרם עודכן';
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
      else if (type.id === 'finance') {
        title = type.title;
        activeDashboardUnit = unit;
        $('#page-content').innerHTML = generalDashboardShell(unit);
        await loadGeneralDashboard();
        if (parseRoute().unitId === unit.allocation_unit_id && parseRoute().dashboardType === 'finance') renderGeneralData();
      } else { title = type.title; $('#page-content').innerHTML = dashboardPlaceholderTemplate(unit, type); }
    }
  }
  document.title = `${title} | פורטל חמ״ה`;
  $('#breadcrumbs').innerHTML = breadcrumbsTemplate(route, unit, type);
  document.querySelectorAll('[data-route]').forEach((item) => item.classList.toggle('active', item.dataset.route === route.section));
  const retryButton = $('[data-retry-units]');
  if (retryButton) retryButton.addEventListener('click', () => { unitState = { status: 'idle', items: [], error: '' }; render(); });
  const yearFilter = $('#year-filter');
  if (yearFilter) yearFilter.addEventListener('change', () => { $('#month-filter').innerHTML = ''; setupGeneralFilters(); renderGeneralData(); });
  const monthFilter = $('#month-filter');
  if (monthFilter) monthFilter.addEventListener('change', renderGeneralData);
  document.querySelectorAll('[data-kpi]').forEach((card) => card.addEventListener('click', () => openKpiPanel(card.dataset.kpi)));
  $('#close-kpi-panel')?.addEventListener('click', closeKpiPanel);
  $('#kpi-backdrop')?.addEventListener('click', closeKpiPanel);
  $('#refresh-dashboard')?.addEventListener('click', async () => {
    const button = $('#refresh-dashboard');
    button.disabled = true;
    button.textContent = 'מרענן נתונים…';
    generalStatus = 'idle';
    await loadGeneralDashboard();
    if (parseRoute().dashboardType === 'finance') renderGeneralData();
    button.disabled = false;
    button.textContent = '↻ רענון נתונים';
  });
  $('[data-retry-dashboard]')?.addEventListener('click', async () => { generalStatus = 'idle'; $('#general-state').className = 'dashboard-skeleton'; $('#general-state').innerHTML = Array.from({ length: 8 }, () => '<span></span>').join(''); await loadGeneralDashboard(); renderGeneralData(); });
  document.querySelectorAll('[data-export]').forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.export === 'print') window.print();
    else showToast(`ייצוא ${button.textContent} יהיה זמין בהמשך.`);
  }));
  closeMenu();
  $('#main-content').focus({ preventScroll: true });
}

function openKpiPanel(id) {
  const definition = kpiDefinitions.find((item) => item[0] === id);
  if (!definition) return;
  const [, title, description, calculation, source] = definition;
  $('#kpi-panel-title').textContent = title;
  $('#kpi-description').textContent = description;
  $('#kpi-calculation').textContent = calculation;
  $('#kpi-source').textContent = source;
  $('#kpi-panel').hidden = false;
  $('#kpi-backdrop').hidden = false;
  $('#close-kpi-panel').focus();
}

function closeKpiPanel() {
  if (!$('#kpi-panel')) return;
  $('#kpi-panel').hidden = true;
  $('#kpi-backdrop').hidden = true;
}

function showToast(message) {
  const toast = $('#export-message');
  toast.textContent = message;
  toast.hidden = false;
  window.setTimeout(() => { toast.hidden = true; }, 2600);
}

function openMenu() { $('#sidebar').classList.add('open'); $('#sidebar-backdrop').classList.add('open'); $('#menu-toggle').setAttribute('aria-expanded', 'true'); document.body.classList.add('menu-open'); }
function closeMenu() { $('#sidebar').classList.remove('open'); $('#sidebar-backdrop').classList.remove('open'); $('#menu-toggle').setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); }
function formatToday() { return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()); }

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (authPending) return;
  const message = $('#login-message');
  const email = $('#email');
  const password = $('#password');
  if (!email.validity.valid) { message.textContent = 'יש להזין כתובת מייל תקינה.'; email.focus(); return; }
  if (!password.value) { message.textContent = 'יש להזין סיסמה.'; password.focus(); return; }
  setAuthPending(true);
  message.textContent = 'מתבצעת כניסה…';
  try {
    await signInWithPassword(email.value.trim(), password.value);
    password.value = '';
    if (!await validateSession()) throw new Error('לא ניתן לאמת את החיבור. יש לנסות שוב.');
    $('#login-view').style.display = 'none';
    $('#app-view').hidden = false;
    $('#israeli-date').textContent = formatToday();
    await render();
  } catch (error) { message.textContent = error.message; }
  finally { setAuthPending(false); }
});
$('#toggle-password').addEventListener('click', () => {
  const password = $('#password');
  const visible = password.type === 'text';
  password.type = visible ? 'password' : 'text';
  $('#toggle-password').textContent = visible ? 'הצג' : 'הסתר';
  $('#toggle-password').setAttribute('aria-label', visible ? 'הצגת הסיסמה' : 'הסתרת הסיסמה');
  $('#toggle-password').setAttribute('aria-pressed', String(!visible));
});
$('#forgot-password').addEventListener('click', () => {
  const help = $('#recovery-help');
  help.hidden = !help.hidden;
  $('#forgot-password').setAttribute('aria-expanded', String(!help.hidden));
});
$('#show-recovery-passwords').addEventListener('change', () => {
  const type = $('#show-recovery-passwords').checked ? 'text' : 'password';
  $('#new-password').type = type;
  $('#confirm-password').type = type;
});
$('#recovery-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (recoveryPending) return;
  const password = $('#new-password');
  const confirmation = $('#confirm-password');
  const message = $('#recovery-message');
  if (!isStrongPassword(password.value)) { message.textContent = 'הסיסמה חייבת לכלול לפחות 10 תווים, אות אחת ומספר אחד.'; password.focus(); return; }
  if (password.value !== confirmation.value) { message.textContent = 'הסיסמאות אינן תואמות.'; confirmation.focus(); return; }
  setRecoveryPending(true);
  message.textContent = 'שומר את הסיסמה החדשה…';
  try {
    await updateRecoveryPassword(password.value);
    password.value = '';
    confirmation.value = '';
    cleanRecoveryUrl('home');
    unitState = { status: 'idle', items: [], error: '' };
    await showPortalHome();
  } catch (error) { message.textContent = error.message; }
  finally { setRecoveryPending(false); }
});
$('#return-to-login').addEventListener('click', async () => {
  if (recoveryPending) return;
  const accessToken = session?.access_token;
  saveSession(null);
  cleanRecoveryUrl('home');
  $('#recovery-view').hidden = true;
  $('#login-view').style.display = '';
  $('#login-message').textContent = '';
  if (accessToken) {
    try { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` } }); } catch { /* Local recovery session is already cleared. */ }
  }
});
$('#logout').addEventListener('click', async () => {
  const accessToken = session?.access_token;
  protectedRequests.forEach((controller) => controller.abort());
  protectedRequests.clear();
  saveSession(null);
  unitState = { status: 'idle', items: [], error: '' };
  generalModel = {};
  generalStatus = 'idle';
  $('#password').value = '';
  $('#password').type = 'password';
  $('#toggle-password').textContent = 'הצג';
  $('#toggle-password').setAttribute('aria-label', 'הצגת הסיסמה');
  $('#toggle-password').setAttribute('aria-pressed', 'false');
  $('#app-view').hidden = true;
  $('#login-view').style.display = '';
  $('#login-message').textContent = 'ההתנתקות הושלמה.';
  history.replaceState({}, '', `${location.pathname}#home`);
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
  const recovery = parseRecoveryCallback();
  if (recovery.isRecovery) {
    if (recovery.error) { showRecoveryView(recovery.error); return; }
    if (!await validateSession()) { showRecoveryView('קישור האיפוס אינו תקף או שפג תוקפו. יש לשלוח קישור חדש דרך Supabase.'); return; }
    showRecoveryView();
    return;
  }
  if (!await validateSession()) {
    $('#app-view').hidden = true;
    $('#login-view').style.display = '';
    return;
  }
  await showPortalHome();
}

initializeAuth();
