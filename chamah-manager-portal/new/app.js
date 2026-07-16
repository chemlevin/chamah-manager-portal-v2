import { calculateBudgetModel, summarizeBudget } from './budget-calculations.js';

const SUPABASE_URL = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4MKSdjf7O1oVS4SWhQ36Qw_QUKW8dyW';
const SESSION_KEY = 'chamah.portal.session';
const SESSION_REFRESH_LEEWAY_SECONDS = 60;
const MIN_PASSWORD_LENGTH = 10;
const CANONICAL_PORTAL_URL = 'https://chamah-manager-portal-v2-preview.vercel.app/new/';
const $ = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 });

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
let accountingModel = {};
let accountingStatus = 'idle';
let accountingError = '';
let accountingLastUpdated = null;
let staffModel = {};
let staffStatus = 'idle';
let staffError = '';
let staffLastUpdated = null;
let dashboardMode = 'finance';
let activeDashboardUnit = null;
let selectedSchoolYearId = '';
let selectedCalendarYearId = '';
let selectedReportingMonths = new Set();
let selectedDashboardUnitIds = new Set();
let recoveryRequestPending = false;
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

async function requestPasswordRecovery(email) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(CANONICAL_PORTAL_URL)}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = `${value?.error_code || ''} ${value?.msg || ''}`.toLowerCase();
    if (response.status === 429 || detail.includes('rate limit')) throw new Error('נשלחו בקשות רבות מדי. יש להמתין לפני ניסיון נוסף.');
    throw new Error('לא ניתן לשלוח כעת קישור איפוס. יש לנסות שוב מאוחר יותר.');
  }
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
  <div id="general-state" class="dashboard-skeleton" aria-live="polite">${Array.from({ length: 8 }, () => '<span></span>').join('')}</div>
  <div id="general-dashboard" hidden><section class="school-year-summary panel" aria-labelledby="summary-title"><div><p class="eyebrow">סיכום שנת הלימודים</p><h2 id="summary-title">מתחילת שנת הלימודים</h2><p id="summary-range">—</p></div><div id="school-year-metrics" class="summary-metrics"></div><div><small>עד חודש הנתונים האחרון</small><strong id="summary-month">—</strong></div></section><section class="period-panel panel"><div><h2>בחירת תקופה</h2><p>בחרי יחידות וחודש אחד או מספר חודשים. הסיכום השנתי נשאר קבוע.</p></div><div class="chip-filters"><fieldset id="unit-filter-group" hidden><legend>יחידות</legend><div id="unit-chips" class="filter-chips"></div></fieldset><fieldset><legend>שנת לימודים</legend><div id="year-chips" class="filter-chips"></div></fieldset><fieldset><legend>חודשים</legend><div id="month-chips" class="filter-chips month-chips"></div></fieldset></div></section><section id="kpis" class="financial-kpis" aria-label="מדדים מרכזיים"></section><section class="expandable-sections" aria-label="פירוט הדשבורד">${[['budget','קטגוריות תקציב'],['payroll','שכר'],['hours','שעות נדרשות'],['children','ילדים'],['bank','תנועות בנק'],['quality','דורש תשומת לב']].map(([id, label]) => `<details class="dashboard-detail panel"><summary>${label}<span>פתיחת פירוט</span></summary><div id="detail-${id}" class="detail-content"></div></details>`).join('')}</section></div>
  <aside id="kpi-panel" class="kpi-panel" hidden aria-labelledby="kpi-panel-title"><button id="close-kpi-panel" class="icon-button" type="button" aria-label="סגירת מרכז המידע">×</button><p class="eyebrow">מרכז מידע</p><h2 id="kpi-panel-title"></h2><p id="kpi-filters" class="kpi-context"></p><div class="info-tabs" role="tablist">${[['explanation','הסבר'],['calculation','חישוב עסקי'],['details','פירוט'],['source','נתוני מקור'],['actions','פעולות']].map(([id,label], index) => `<button type="button" role="tab" data-info-tab="${id}" aria-selected="${index === 0}">${label}</button>`).join('')}</div><section class="info-tab-panel" data-info-panel="explanation"><p id="kpi-description"></p></section><section class="info-tab-panel" data-info-panel="calculation" hidden><p id="kpi-calculation"></p></section><section class="info-tab-panel" data-info-panel="details" hidden><div id="kpi-details" class="source-records"></div></section><section class="info-tab-panel" data-info-panel="source" hidden><p id="kpi-source" class="source-note"></p><div id="kpi-records" class="source-records"></div></section><section class="info-tab-panel" data-info-panel="actions" hidden><div class="info-actions"><button class="button button-secondary" type="button" data-info-action="print">הדפסה</button><button class="button button-secondary" type="button" data-info-action="pdf">ייצוא PDF</button><button class="button button-secondary" type="button" data-info-action="excel">ייצוא Excel</button></div></section></aside><button id="kpi-backdrop" class="kpi-backdrop" type="button" aria-label="סגירת מרכז המידע" hidden></button><div id="export-message" class="toast" role="status" hidden></div>`;
}

function accountingDashboardShell(unit) {
  return `<section class="financial-heading"><div><p class="eyebrow">דשבורד הנהלת חשבונות</p><h1>דשבורד הנהלת חשבונות · ${escapeHtml(unit.display_name)}</h1><p>בקרה על שלמות תנועות הבנק ותהליך הטיפול החשבונאי.</p></div><div class="dashboard-context"><span><small>יחידת הקצאה</small><strong>${escapeHtml(unit.display_name)}</strong></span><span><small>שנת לימודים</small><strong id="context-year">—</strong></span><span><small>תקופה נבחרת</small><strong id="context-period">—</strong></span></div></section>
  <section class="global-toolbar panel" aria-label="פעולות דשבורד"><button id="refresh-dashboard" class="button button-secondary" type="button">↻ רענון נתונים</button><span class="last-updated"><small>עודכן לאחרונה</small><strong id="last-updated">טרם עודכן</strong></span><div class="toolbar-actions"><button class="button button-quiet" type="button" data-export="print">הדפסה</button><button class="button button-quiet" type="button" data-export="pdf">PDF</button><button class="button button-quiet" type="button" data-export="excel">Excel</button></div></section>
  <div id="general-state" class="dashboard-skeleton" aria-live="polite">${Array.from({ length: 8 }, () => '<span></span>').join('')}</div>
  <div id="general-dashboard" hidden><section class="school-year-summary panel"><div><p class="eyebrow">סיכום שנה קלנדרית</p><h2>מתחילת השנה הקלנדרית</h2><p id="summary-range">—</p></div><div id="school-year-metrics" class="summary-metrics"></div><div><small>עד היום</small><strong id="summary-month">—</strong></div></section><section class="period-panel panel"><div><h2>בחירת תקופה</h2><p>בחרי יחידות וחודש אחד או מספר חודשים. הסיכום השנתי הקלנדרי נשאר קבוע.</p></div><div class="chip-filters"><fieldset id="unit-filter-group" hidden><legend>יחידות</legend><div id="unit-chips" class="filter-chips"></div></fieldset><fieldset><legend>שנה קלנדרית</legend><div id="year-chips" class="filter-chips"></div></fieldset><fieldset><legend>חודשים</legend><div id="month-chips" class="filter-chips month-chips"></div></fieldset></div></section><section id="kpis" class="financial-kpis accounting-kpis" aria-label="מדדי הנהלת חשבונות"></section><section class="expandable-sections" aria-label="פירוט הנהלת חשבונות">${[['daycare','תנועות לפי מעון'],['unit','תנועות לפי יחידת הקצאה'],['account','תנועות לפי חשבון בנק'],['status','תנועות לפי סטטוס הנה״ח'],['attention','תנועות הדורשות תשומת לב'],['split','תנועות מפוצלות']].map(([id, label]) => `<details class="dashboard-detail panel"><summary>${label}<span>פתיחת פירוט</span></summary><div id="detail-${id}" class="detail-content"></div></details>`).join('')}</section></div>
  <aside id="kpi-panel" class="kpi-panel" hidden aria-labelledby="kpi-panel-title"><button id="close-kpi-panel" class="icon-button" type="button" aria-label="סגירת מרכז המידע">×</button><p class="eyebrow">מרכז מידע</p><h2 id="kpi-panel-title"></h2><p id="kpi-filters" class="kpi-context"></p><div class="info-tabs" role="tablist">${[['explanation','הסבר'],['calculation','חישוב עסקי'],['details','פירוט'],['source','נתוני מקור'],['actions','פעולות']].map(([id,label], index) => `<button type="button" role="tab" data-info-tab="${id}" aria-selected="${index === 0}">${label}</button>`).join('')}</div><section class="info-tab-panel" data-info-panel="explanation"><p id="kpi-description"></p></section><section class="info-tab-panel" data-info-panel="calculation" hidden><p id="kpi-calculation"></p></section><section class="info-tab-panel" data-info-panel="details" hidden><div id="kpi-details" class="source-records"></div></section><section class="info-tab-panel" data-info-panel="source" hidden><p id="kpi-source" class="source-note"></p><div id="kpi-records" class="source-records"></div></section><section class="info-tab-panel" data-info-panel="actions" hidden><div class="info-actions"><button class="button button-secondary" type="button" data-info-action="print">הדפסה</button><button class="button button-secondary" type="button" data-info-action="pdf">ייצוא PDF</button><button class="button button-secondary" type="button" data-info-action="excel">ייצוא Excel</button></div></section></aside><button id="kpi-backdrop" class="kpi-backdrop" type="button" aria-label="סגירת מרכז המידע" hidden></button><div id="export-message" class="toast" role="status" hidden></div>`;
}

function staffDashboardShell(unit) {
  return `<section class="financial-heading"><div><p class="eyebrow">צוות ורישוי</p><h1>דשבורד צוות ורישוי · ${escapeHtml(unit.display_name)}</h1><p>בקרת תוקף, שלמות נתונים ופעולות נדרשות עבור העובדים.</p></div><div class="dashboard-context"><span><small>יחידת הקצאה</small><strong>${escapeHtml(unit.display_name)}</strong></span></div></section>
  <section class="global-toolbar panel"><button id="refresh-dashboard" class="button button-secondary" type="button">↻ רענון נתונים</button><span class="last-updated"><small>עודכן לאחרונה</small><strong id="last-updated">טרם עודכן</strong></span><div class="toolbar-actions"><button class="button button-quiet" type="button" data-export="print">הדפסה</button><button class="button button-quiet" type="button" data-export="pdf">PDF</button><button class="button button-quiet" type="button" data-export="excel">Excel</button></div></section>
  <div id="general-state" class="dashboard-skeleton" aria-live="polite">${Array.from({ length: 8 }, () => '<span></span>').join('')}</div><div id="general-dashboard" hidden><section class="period-panel panel"><div><h2>תמונת מצב תפעולית</h2><p>המדדים מציגים עובדים פעילים והנושאים המחייבים טיפול.</p></div><div class="chip-filters"><fieldset id="unit-filter-group" hidden><legend>יחידות</legend><div id="unit-chips" class="filter-chips"></div></fieldset></div></section><section id="kpis" class="financial-kpis" aria-label="מדדי צוות ורישוי"></section><section class="expandable-sections">${[['licensing','רישוי ותעודות'],['missing','נתוני עובד חסרים'],['workforce','ניתוח כוח אדם'],['comparison','השוואת מעונות'],['employees','רשימת עובדים']].map(([id,label]) => `<details class="dashboard-detail panel" ${id === 'employees' ? 'open' : ''}><summary>${label}<span>פתיחת פירוט</span></summary><div id="detail-${id}" class="detail-content"></div></details>`).join('')}</section></div><aside id="kpi-panel" class="kpi-panel" hidden aria-labelledby="kpi-panel-title"><button id="close-kpi-panel" class="icon-button" type="button" aria-label="סגירה">×</button><p class="eyebrow">מרכז מידע</p><h2 id="kpi-panel-title"></h2><p id="kpi-filters" class="kpi-context"></p><div class="info-tabs" role="tablist">${[['explanation','הסבר'],['calculation','חישוב עסקי'],['details','פירוט'],['source','נתוני מקור'],['actions','פעולות']].map(([id,label], index) => `<button type="button" role="tab" data-info-tab="${id}" aria-selected="${index === 0}">${label}</button>`).join('')}</div><section class="info-tab-panel" data-info-panel="explanation"><p id="kpi-description"></p></section><section class="info-tab-panel" data-info-panel="calculation" hidden><p id="kpi-calculation"></p></section><section class="info-tab-panel" data-info-panel="details" hidden><div id="kpi-details" class="source-records"></div></section><section class="info-tab-panel" data-info-panel="source" hidden><p id="kpi-source" class="source-note"></p><div id="kpi-records" class="source-records"></div></section><section class="info-tab-panel" data-info-panel="actions" hidden><div class="info-actions"><button class="button button-secondary" type="button" data-info-action="print">הדפסה</button><button class="button button-secondary" type="button" data-info-action="pdf">ייצוא PDF</button><button class="button button-secondary" type="button" data-info-action="excel">ייצוא Excel</button></div></section></aside><button id="kpi-backdrop" class="kpi-backdrop" type="button" hidden></button><div id="export-message" class="toast" hidden></div>`;
}

const staffDateStatus = (date) => { if (!date) return 'exception'; const days = (new Date(`${date}T00:00:00`) - new Date()) / 86400000; return days < 0 ? 'exception' : days <= 60 ? 'warning' : 'good'; };
async function loadStaffDashboard() {
  if (staffStatus === 'loading' || staffStatus === 'ready') return;
  staffStatus = 'loading'; staffError = '';
  try {
    const [employees, employments, assignments, terms, roles, daycares, classrooms, units] = await Promise.all([
      rest('employees', 'select=employee_id,employee_code,national_id,first_name,last_name,phone,email,birth_date,hebrew_birth_date,lifecycle_status,manager_employee_id,notes'),
      rest('employments', 'select=employment_id,employee_id,employment_start_date,employment_end_date,recognized_prior_seniority_months,employment_status,notes'),
      rest('employee_assignments', 'select=assignment_id,employment_id,allocation_unit_id,daycare_id,classroom_id,role_id,effective_from,effective_to,is_primary,notes'),
      rest('employee_pay_terms', 'select=employee_pay_term_id,employee_id,valid_from,valid_to,pay_type,base_pay,estimated_employment_percentage,caregiver_certificate_status,studies_end_date,has_degree,is_class_manager,first_aid_valid_until,safe_conduct_valid_until,weekly_schedule,notes'),
      rest('roles', 'select=role_id,display_name,daycare_relevant,lifecycle_status'), rest('daycares', 'select=daycare_id,allocation_unit_id,display_name,lifecycle_status'), rest('classrooms', 'select=classroom_id,display_name,lifecycle_status'), rest('allocation_units', 'select=allocation_unit_id,display_name,allocation_unit_type,lifecycle_status')
    ]); staffModel = { employees, employments, assignments, terms, roles, daycares, classrooms, units: activeUnits(units) }; staffStatus = 'ready'; staffLastUpdated = new Date();
  } catch (error) { staffStatus = 'error'; staffError = error.message; }
}

function renderStaffData() {
  if (staffStatus === 'error') { $('#general-state').className = 'error-state panel'; $('#general-state').innerHTML = `<strong>לא ניתן לטעון נתוני צוות</strong><button class="button button-secondary" data-retry-dashboard>נסי שוב</button>`; return; }
  if (staffStatus !== 'ready') return;
  const m = staffModel; const isOrganization = activeDashboardUnit.allocation_unit_id === 'organization'; const today = new Date().toISOString().slice(0, 10);
  const people = m.employees.map((employee) => {
    const employment = m.employments.find((item) => item.employee_id === employee.employee_id && item.employment_status === 'ACTIVE'); const assignment = m.assignments.find((item) => item.employment_id === employment?.employment_id && item.is_primary && (!item.effective_to || item.effective_to >= today)); const term = m.terms.filter((item) => item.employee_id === employee.employee_id && item.valid_from <= today && (!item.valid_to || item.valid_to >= today)).sort((a,b) => b.valid_from.localeCompare(a.valid_from))[0]; const role = m.roles.find((item) => item.role_id === assignment?.role_id); const daycare = m.daycares.find((item) => item.daycare_id === assignment?.daycare_id); if (!employment || (!isOrganization && assignment?.allocation_unit_id !== activeDashboardUnit.allocation_unit_id)) return null;
    const missing = [['מספר עובד', employee.employee_code], ['תעודת זהות', employee.national_id], ['טלפון', employee.phone], ['דוא״ל', employee.email], ['תאריך לידה', employee.birth_date], ['תאריך לידה עברי', employee.hebrew_birth_date], ['תחילת העסקה', employment.employment_start_date], ['וותק מוכר', employment.recognized_prior_seniority_months], ['תפקיד', role], ['תנאי שכר פעילים', term], ['שכר בסיס', term?.base_pay], ['סוג שכר', term?.pay_type], ['תעודת מטפלת', term?.caregiver_certificate_status], ['עזרה ראשונה', term?.first_aid_valid_until], ['התנהגות בטוחה', term?.safe_conduct_valid_until], ['לוח שבועי', term?.weekly_schedule]].filter(([,value]) => value === null || value === undefined || value === ''); if (role?.daycare_relevant && !daycare) missing.push(['מעון', null]); if (['STUDYING','COMMITMENT_TO_STUDIES','בלימודים','התחייבות ללימודים'].includes(term?.caregiver_certificate_status) && !term?.studies_end_date) missing.push(['תאריך יעד ללימודים', null]); const firstAid = staffDateStatus(term?.first_aid_valid_until); const safe = staffDateStatus(term?.safe_conduct_valid_until); const overall = missing.length || firstAid === 'exception' || safe === 'exception' ? 'exception' : firstAid === 'warning' || safe === 'warning' ? 'warning' : 'good'; return { employee, employment, assignment, term, role, daycare, missing: missing.map(([label]) => label), firstAid, safe, overall };
  }).filter(Boolean);
  const row = (p) => ({ עובד: `${p.employee.first_name || ''} ${p.employee.last_name || ''}`.trim(), מעון: p.daycare?.display_name || 'לא שויך', תפקיד: p.role?.display_name || 'לא הוגדר', 'עזרה ראשונה': p.term?.first_aid_valid_until || 'חסר', 'התנהגות בטוחה': p.term?.safe_conduct_valid_until || 'חסר', 'תעודת מטפלת': p.term?.caregiver_certificate_status || 'חסר', 'שדות חסרים': p.missing.join(', ') || '—', __status: p.overall });
  const definitions = (id, title, list, description) => ({ id, title, primary: list.length, formatter: number.format, utilization: list.some((p) => p.overall === 'exception') ? 101 : 0, definition: { title, description, calculation: 'ספירת עובדים פעילים העונים להגדרה המוצגת.', source: 'נתוני עובדים, העסקה, שיוך ותנאי שכר פעילים ב־Supabase' }, details: list.map(row), records: list.map(row) });
  const cards = [definitions('staff-active','עובדים פעילים',people,'עובדים עם העסקה פעילה.'), definitions('staff-compliant','עובדים תקינים',people.filter((p)=>p.overall==='good'),'עובדים ללא חוסר או תוקף קרוב.'), definitions('staff-attention','דורשים תשומת לב',people.filter((p)=>p.overall!=='good'),'עובדים עם חוסר, תוקף קרוב או תוקף שפג.'), definitions('staff-first-aid-expired','עזרה ראשונה שפגה',people.filter((p)=>p.firstAid==='exception'),'עובדים שתוקף עזרה ראשונה חסר או פג.'), definitions('staff-safe-expired','התנהגות בטוחה שפגה',people.filter((p)=>p.safe==='exception'),'עובדים שתוקף התנהגות בטוחה חסר או פג.'), definitions('staff-missing','נתונים חיוניים חסרים',people.filter((p)=>p.missing.length),'עובדים שחסר להם שדה חובה מאושר.')]; staffModel.currentKpis = Object.fromEntries(cards.map((item)=>[item.id,item])); $('#kpis').innerHTML = cards.map((item,index)=>kpiCardTemplate({...item,row:index<4?'primary':'secondary'})).join(''); $('#detail-licensing').innerHTML = sourceRowsTemplate(people.map(row)); $('#detail-missing').innerHTML = sourceRowsTemplate(people.filter((p)=>p.missing.length).map(row)); $('#detail-workforce').innerHTML = sourceRowsTemplate(m.roles.map((role)=>({ תפקיד: role.display_name, עובדים: number.format(people.filter((p)=>p.role?.role_id===role.role_id).length,)}))); $('#detail-comparison').closest('details').hidden = !isOrganization; $('#detail-comparison').innerHTML = sourceRowsTemplate(m.daycares.map((daycare)=>({ מעון:daycare.display_name, פעילים:number.format(people.filter((p)=>p.daycare?.daycare_id===daycare.daycare_id).length), 'דורשים טיפול':number.format(people.filter((p)=>p.daycare?.daycare_id===daycare.daycare_id && p.overall==='exception').length)}))); $('#detail-employees').innerHTML = sourceRowsTemplate(people.map(row)); $('#last-updated').textContent = new Intl.DateTimeFormat('he-IL',{dateStyle:'short',timeStyle:'short'}).format(staffLastUpdated); $('#general-state').hidden=true; $('#general-dashboard').hidden=false; bindDashboardDynamicInteractions();
}

const sum = (items, getter) => items.reduce((total, item) => total + Number(getter(item) || 0), 0);
const month = (date) => String(date || '').slice(0, 7);
function accountingCashDate(transaction) {
  const value = String(transaction?.cashDate || transaction?.cash_date || transaction?.transaction_date || '');
  const israeli = value.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (israeli) return `${israeli[3]}-${israeli[2].padStart(2, '0')}-${israeli[1].padStart(2, '0')}`;
  return value.slice(0, 10);
}
const accountingMonth = (transaction) => month(accountingCashDate(transaction));

async function loadGeneralDashboard() {
  if (generalStatus === 'loading' || generalStatus === 'ready') return;
  generalStatus = 'loading';
  generalError = '';
  try {
    const [years, months, daycares, dsy, classrooms, enrollment, payroll, pa, bank, ba, units, issues, budgetSnapshots, budgetCategories, budgetRules, workCalendars, staffingParameters, ageGroups, roles, employments, employees, assignments] = await Promise.all([
      rest('school_years', 'select=school_year_id,display_name,start_date,end_date,is_default,is_selectable&is_selectable=eq.true&order=start_date.desc'),
      rest('school_year_months', 'select=school_year_month_id,school_year_id,month_label,start_date,school_year_sequence&order=school_year_sequence'),
      rest('daycares', 'select=daycare_id,daycare_code,allocation_unit_id,display_name,lifecycle_status,display_order&order=display_order'),
      rest('daycare_school_years', 'select=daycare_school_year_id,daycare_id,school_year_id,is_operating,tuition_calculation_mode,tuition_standard_type,staffing_calculation_mode,staffing_standard_type'),
      rest('classrooms', 'select=classroom_id,daycare_school_year_id,display_name,lifecycle_status,effective_from,effective_to'),
      rest('monthly_enrollment', 'select=monthly_enrollment_id,classroom_id,reporting_month,age_group_id,children_count'),
      rest('payroll_records', 'select=payroll_record_id,employment_id,payroll_month,source_employee_identifier,source_record_identifier,employer_cost,regular_hours,overtime_hours'),
      rest('payroll_allocations', 'select=payroll_allocation_id,payroll_record_id,allocation_unit_id,role_id,allocation_amount,allocated_hours,budget_category_id'),
      rest('bank_transactions', 'select=bank_transaction_id,transaction_date,description,amount'),
      rest('bank_allocations', 'select=bank_allocation_id,bank_transaction_id,allocation_unit_id,budget_month,allocation_amount,budget_category_id'),
      rest('allocation_units', 'select=allocation_unit_id,display_name,allocation_unit_type,lifecycle_status,display_order&lifecycle_status=eq.ACTIVE&order=display_order.asc,display_name.asc'),
      rest('data_quality_issues', 'select=data_quality_issue_id,severity,status,explanation,entity_type&status=eq.OPEN'),
      rest('budget_snapshots', 'select=budget_snapshot_id,allocation_unit_id,daycare_id,reporting_month,budget_category_id,planned_amount,actual_amount,snapshot_status&snapshot_status=eq.LOCKED'),
      rest('budget_categories', 'select=budget_category_id,budget_category_code,display_name,category_type,lifecycle_status,requires_budget,budget_source&lifecycle_status=eq.ACTIVE'),
      rest('budget_rules', 'select=budget_rule_id,budget_category_id,school_year_id,daycare_id,allocation_unit_id,age_group_id,effective_from,effective_to,rule_type,numeric_value,text_value,lifecycle_status,sheet_rule_id,calculation_method,parameter_1,parameter_2,show_budget,display_scope,effective_from_month_id,effective_to_month_id,standard_type,minimum_staff,rounding_method'),
      rest('monthly_work_calendars', 'select=monthly_work_calendar_id,school_year_month_id,sun_thu_hours_per_day,friday_hours_per_day,sun_thu_workdays,friday_workdays'),
      rest('staffing_budget_parameters', 'select=staffing_budget_parameter_id,school_year_id,monthly_hours_per_fte,hourly_budget_cost,budget_formula,effective_from_month_id,effective_to_month_id,lifecycle_status'),
      rest('age_groups', 'select=age_group_id,age_group_code,display_name,lifecycle_status'),
      rest('roles', 'select=role_id,role_code,display_name,role_group'),
      rest('employments', 'select=employment_id,employee_id,employment_start_date,employment_end_date,employment_status'),
      rest('employees', 'select=employee_id,first_name,last_name,lifecycle_status'),
      rest('employee_assignments', 'select=assignment_id,employment_id,allocation_unit_id,daycare_id,classroom_id,role_id,effective_from,effective_to,is_primary')
    ]);
    generalModel = { years, months, daycares, dsy, classrooms, enrollment, payroll, pa, bank, ba, units: activeUnits(units), issues, budgetSnapshots, budgetCategories, budgetRules, workCalendars, staffingParameters, ageGroups, roles, employments, employees, assignments };
    generalStatus = 'ready';
    generalLastUpdated = new Date();
  } catch (error) {
    generalStatus = 'error';
    generalError = error.message;
  }
}

function setupGeneralFilters() {
  if (!generalModel.years?.length) return;
  if (!selectedSchoolYearId || !generalModel.years.some((year) => year.school_year_id === selectedSchoolYearId)) selectedSchoolYearId = (generalModel.years.find((year) => year.is_default) || generalModel.years[0]).school_year_id;
  const available = generalModel.months.filter((item) => item.school_year_id === selectedSchoolYearId);
  const availableKeys = new Set(available.map((item) => month(item.start_date)));
  selectedReportingMonths = new Set([...selectedReportingMonths].filter((value) => availableKeys.has(value)));
  if (!selectedReportingMonths.size && available.length) {
    const availableDataMonths = [...new Set(generalModel.enrollment.map((item) => month(item.reporting_month)))].filter((value) => availableKeys.has(value)).sort();
    selectedReportingMonths.add(availableDataMonths[0] || month(available[0].start_date));
  }
  const unitFilter = $('#unit-filter-group');
  if (activeDashboardUnit?.allocation_unit_id === 'organization') {
    unitFilter.hidden = false;
    const selectableUnits = generalModel.units.filter((item) => item.allocation_unit_id !== 'organization');
    selectedDashboardUnitIds = new Set([...selectedDashboardUnitIds].filter((id) => selectableUnits.some((unit) => unit.allocation_unit_id === id)));
    if (!selectedDashboardUnitIds.size) selectedDashboardUnitIds = new Set(selectableUnits.map((unit) => unit.allocation_unit_id));
    $('#unit-chips').innerHTML = selectableUnits.map((unit) => { const selected = selectedDashboardUnitIds.has(unit.allocation_unit_id); return `<button class="filter-chip${selected ? ' selected' : ''}" type="button" data-dashboard-unit="${escapeHtml(unit.allocation_unit_id)}" aria-pressed="${selected}">${escapeHtml(unit.display_name)}</button>`; }).join('');
  } else {
    unitFilter.hidden = true;
    selectedDashboardUnitIds = new Set(activeDashboardUnit ? [activeDashboardUnit.allocation_unit_id] : []);
  }
  $('#year-chips').innerHTML = generalModel.years.map((year) => `<button class="filter-chip${year.school_year_id === selectedSchoolYearId ? ' selected' : ''}" type="button" data-year="${escapeHtml(year.school_year_id)}" aria-pressed="${year.school_year_id === selectedSchoolYearId}">${escapeHtml(year.display_name)}</button>`).join('');
  $('#month-chips').innerHTML = available.map((item) => { const key = month(item.start_date); const selected = selectedReportingMonths.has(key); return `<button class="filter-chip${selected ? ' selected' : ''}" type="button" data-month="${key}" aria-pressed="${selected}">${escapeHtml(item.month_label)}</button>`; }).join('') || '<span class="empty-inline">אין חודשים זמינים</span>';
}

const kpiDefinitions = {
  revenue: { title: 'הכנסות', description: 'הכספים שהתקבלו בתקופה שנבחרה לעומת יעד ההכנסות.', calculation: 'מחברים את כל ההכנסות בפועל בתקופה ומשווים אותן לתקציב שכר הלימוד של אותה תקופה.', source: 'הקצאות תנועות בנק, רישום ילדים ותעריפי שכר לימוד' },
  expenses: { title: 'הוצאות', description: 'הוצאות התפעול שאינן שכר בתקופה שנבחרה לעומת התקציב.', calculation: 'מחברים את הוצאות התפעול בפועל ומשווים אותן לתקציב המאושר לכל קטגוריית הוצאה.', source: 'הקצאות תנועות בנק, קטגוריות וכללי תקציב' },
  hours: { title: 'שעות נדרשות', description: 'שעות העבודה שבוצעו לעומת שעות הצוות הנדרשות להפעלת המעונות.', calculation: 'שעות הביצוע נלקחות מהשכר. השעות הנדרשות מחושבות לפי מספר הילדים, התקינה ושעות הפעילות בכל חודש.', source: 'רישום ילדים, תקינת צוות, לוח עבודה והקצאות שכר' },
  payroll: { title: 'שכר', description: 'עלות השכר בפועל בתקופה לעומת תקציב השכר הנדרש.', calculation: 'מחברים את עלות השכר בפועל ומשווים לתקציב המטפלות ולתקציב בעלי התפקידים הקבועים.', source: 'הקצאות שכר, שעות צוות נדרשות וכללי צוות קבוע' },
  balance: { title: 'מאזן חודשי', description: 'היתרה התפעולית בחודש הנתונים האחרון שנבחר, לאחר הוצאות ושכר.', calculation: 'הכנסות בפועל בחודש פחות הוצאות בפועל בחודש פחות שכר בפועל בחודש.', source: 'הכנסות, הוצאות והקצאות שכר בחודש הנתונים האחרון שנבחר' },
  children: { title: 'ילדים', description: 'מספר הילדים בחודש הנתונים האחרון הזמין בלבד.', calculation: 'מחברים את הילדים בכל הכיתות בחודש האחרון. חודשים קודמים אינם נצברים.', source: 'רישום הילדים החודשי לפי מעון, כיתה וקבוצת גיל' },
  attention: { title: 'דורש תשומת לב', description: 'נושאים תפעוליים או פערי נתונים שעשויים להשפיע על תמונת המצב הכספית.', calculation: 'סופרים את כל הנושאים הפתוחים ואת בעיות החישוב הרלוונטיות למסננים שנבחרו.', source: 'נושאי איכות נתונים ובקרות החישוב של הדשבורד' }
};

function utilization(actual, planned) { return actual !== null && planned > 0 ? (actual / planned) * 100 : null; }
function utilizationClass(value) { return value === null ? '' : value <= 85 ? 'status-good' : value <= 100 ? 'status-warning' : 'status-exception'; }
function metric(value, formatter = (item) => String(item)) { return value === null || value === undefined ? 'No Data' : formatter(value); }
function sourceRowsTemplate(rows) {
  if (!rows.length) return '<div class="empty-state compact">No Data</div>';
  const keys = Object.keys(rows[0]).filter((key) => !key.startsWith('__'));
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${keys.map((key) => `<th>${escapeHtml(key)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 100).map((row) => `<tr class="${row.__status ? `status-row status-${row.__status}` : ''}">${keys.filter((key) => key !== '__status').map((key) => `<td>${escapeHtml(row[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function kpiCardTemplate(card) {
  return `<article class="financial-kpi ${utilizationClass(card.utilization)} kpi-${card.row || 'primary'}" data-kpi-card="${card.id}"><button class="kpi-open" type="button" data-kpi="${card.id}"><span>${card.title}</span><strong>${metric(card.primary, card.formatter)}</strong>${(card.lines || []).map((line) => `<small><span>${line.label}</span><b>${metric(line.value, line.formatter)}</b></small>`).join('')}</button><button class="kpi-info-button" type="button" data-kpi="${card.id}" aria-label="מידע על ${card.title}">מידע</button></article>`;
}

function buildBudgetCategoryRows({ calculatedBudget, bankAllocations, payrollAllocations, relevantDaycares, categoryMap, unitById }) {
  const categoryByCode = new Map(generalModel.budgetCategories.map((item) => [item.budget_category_code, item]));
  const daycareByUnit = new Map(relevantDaycares.map((item) => [item.allocation_unit_id, item]));
  const aggregates = new Map();
  const ensure = (category, daycare) => {
    if (!category || !daycare) return null;
    const key = `${category.budget_category_id}|${daycare.daycare_id}`;
    if (!aggregates.has(key)) aggregates.set(key, { key, category, daycare, actual: 0, budget: 0, hasActual: false, hasBudget: false, sources: [], details: [] });
    return aggregates.get(key);
  };
  bankAllocations.forEach((row) => { const item = ensure(categoryMap.get(row.budget_category_id), daycareByUnit.get(row.allocation_unit_id)); if (!item) return; item.actual += Math.abs(Number(row.allocation_amount || 0)); item.hasActual = true; item.sources.push({ חודש: row.budget_month, מעון: item.daycare.display_name, קטגוריה: item.category.display_name, סכום: money.format(Math.abs(Number(row.allocation_amount || 0))) }); });
  payrollAllocations.forEach((row) => { const item = ensure(categoryMap.get(row.budget_category_id), daycareByUnit.get(row.allocation_unit_id)); if (!item) return; item.actual += Number(row.allocation_amount || 0); item.hasActual = true; item.sources.push({ חודש: generalModel.payroll.find((record) => record.payroll_record_id === row.payroll_record_id)?.payroll_month || '', מעון: item.daycare.display_name, קטגוריה: item.category.display_name, סכום: money.format(row.allocation_amount) }); });
  calculatedBudget.rows.forEach((row) => {
    let category;
    let value;
    if (row.type === 'expense') { category = categoryByCode.get(row.categoryCode); value = row.budget; }
    else if (row.type === 'classroom') { category = categoryByCode.get('CAT-TUITION'); value = row.tuitionBudget; }
    else if (row.type === 'daycare-month') { category = categoryByCode.get('CAT-PAYROLL-STAFF'); value = row.caregiverBudget; }
    else if (row.type === 'fixed') { category = categoryByCode.get('CAT-PAYROLL-NONSTAFF'); value = row.budget; }
    const daycare = relevantDaycares.find((item) => item.daycare_id === row.daycareId);
    const item = ensure(category, daycare);
    if (!item || value == null) return;
    item.budget += Number(value);
    item.hasBudget = true;
    item.details.push({ חודש: row.month, מעון: daycare.display_name, קטגוריה: category.display_name, תקציב: money.format(value) });
  });
  generalModel.budgetCells = {};
  const values = [...aggregates.values()].sort((a, b) => a.category.display_name.localeCompare(b.category.display_name, 'he') || a.daycare.display_name.localeCompare(b.daycare.display_name, 'he'));
  const rows = values.map((item) => {
    const actual = item.hasActual ? item.actual : null;
    const budget = item.hasBudget ? item.budget : null;
    const used = utilization(actual, budget);
    generalModel.budgetCells[item.key] = { title: `${item.category.display_name} · ${item.daycare.display_name}`, definition: { title: `${item.category.display_name} · ${item.daycare.display_name}`, description: `מצב קטגוריית ${item.category.display_name} במעון ${item.daycare.display_name}.`, calculation: 'הביצוע בפועל מושווה לתקציב המאושר של הקטגוריה בתקופה שנבחרה.', source: 'שורות התקציב והביצוע בפועל של הקטגוריה והמעון' }, details: [{ מעון: item.daycare.display_name, קטגוריה: item.category.display_name, בפועל: metric(actual, money.format), תקציב: metric(budget, money.format), יתרה: actual == null || budget == null ? 'No Data' : money.format(budget - actual), ניצול: used == null ? 'No Data' : `${number.format(used)}%` }], records: [...item.sources, ...item.details] };
    return { מעון: item.daycare.display_name, קטגוריה: item.category.display_name, בפועל: metric(actual, money.format), תקציב: metric(budget, money.format), יתרה: actual == null || budget == null ? 'No Data' : money.format(budget - actual), ניצול: used == null ? 'No Data' : `${number.format(used)}%`, __status: used == null ? '' : used <= 85 ? 'good' : used <= 100 ? 'warning' : 'exception', __key: item.key };
  });
  const actualTotal = values.some((item) => item.hasActual) ? sum(values, (item) => item.hasActual ? item.actual : 0) : null;
  const budgetTotal = values.some((item) => item.hasBudget) ? sum(values, (item) => item.hasBudget ? item.budget : 0) : null;
  const totalUsed = utilization(actualTotal, budgetTotal);
  rows.push({ מעון: 'סך הכול', קטגוריה: 'סיכום', בפועל: metric(actualTotal, money.format), תקציב: metric(budgetTotal, money.format), יתרה: actualTotal == null || budgetTotal == null ? 'No Data' : money.format(budgetTotal - actualTotal), ניצול: totalUsed == null ? 'No Data' : `${number.format(totalUsed)}%`, __status: totalUsed == null ? '' : totalUsed <= 85 ? 'good' : totalUsed <= 100 ? 'warning' : 'exception' });
  return rows;
}

function budgetMatrixTemplate(rows, daycares) {
  const cells = rows.filter((row) => row.__key);
  if (!cells.length) return '<div class="empty-state compact">No Data</div>';
  const categories = [...new Set(cells.map((row) => row.קטגוריה))];
  return `<div class="table-wrap budget-matrix"><table class="data-table"><thead><tr><th>קטגוריה</th>${daycares.map((daycare) => `<th>${escapeHtml(daycare.display_name)}</th>`).join('')}</tr></thead><tbody>${categories.map((category) => `<tr><th>${escapeHtml(category)}</th>${daycares.map((daycare) => { const cell = cells.find((row) => row.קטגוריה === category && row.מעון === daycare.display_name); return `<td>${cell ? `<button type="button" class="budget-cell status-${cell.__status}" data-budget-cell="${escapeHtml(cell.__key)}"><span>${cell.בפועל}</span><small>תקציב ${cell.תקציב}</small><small>ניצול ${cell.ניצול}</small></button>` : 'No Data'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function renderDetailSections(view) {
  const calculatedRows = view.calculatedBudget.rows;
  $('#detail-budget').innerHTML = view.organizationMatrix || sourceRowsTemplate(view.budgetCategoryRows);
  $('#detail-payroll').innerHTML = sourceRowsTemplate(view.payrollDetails);
  $('#detail-hours').innerHTML = sourceRowsTemplate(calculatedRows.filter((row) => row.type === 'classroom').map((row) => ({ חודש: row.month, מעון: row.daycare, כיתה: row.classroom, 'קבוצת גיל': row.ageGroup, 'שעות נדרשות': number.format(row.requiredHours || 0) })));
  $('#detail-children').innerHTML = sourceRowsTemplate(view.childrenDetails);
  $('#detail-bank').innerHTML = sourceRowsTemplate(view.bankAllocations.map((row) => ({ חודש: row.budget_month, יחידה: view.unitById.get(row.allocation_unit_id)?.display_name || 'לא שויך', קטגוריה: view.categoryMap.get(row.budget_category_id)?.display_name || 'לא שויך', סכום: money.format(row.allocation_amount), תיאור: view.bankById.get(row.bank_transaction_id)?.description || '' })));
  $('#detail-quality').innerHTML = sourceRowsTemplate([...generalModel.issues.map((row) => ({ חומרה: row.severity, תחום: row.entity_type || '', הסבר: row.explanation })), ...view.calculationIssues.map((row) => ({ חומרה: 'שגיאת חישוב', תחום: row.code, הסבר: row.message, מעון: row.daycare || '', חודש: row.month || '' }))]);
}

function renderGeneralData() {
  if (generalStatus === 'error') { $('#general-state').className = 'error-state panel'; $('#general-state').innerHTML = '<strong>לא ניתן לטעון את נתוני הדשבורד</strong><span>הנתונים האחרונים נשמרו ככל שהיו זמינים.</span><button class="button button-secondary" type="button" data-retry-dashboard>נסה שוב</button>'; return; }
  if (generalStatus !== 'ready') return;
  setupGeneralFilters();
  const selectedMonthSet = selectedReportingMonths;
  const unitId = activeDashboardUnit?.allocation_unit_id;
  const selectedUnitIds = unitId === 'organization' ? selectedDashboardUnitIds : new Set([unitId]);
  const relevantDaycares = generalModel.daycares.filter((item) => selectedUnitIds.has(item.allocation_unit_id));
  const relevantDaycareIds = new Set(relevantDaycares.map((item) => item.daycare_id));
  const relevantDsyIds = new Set(generalModel.dsy.filter((item) => relevantDaycareIds.has(item.daycare_id) && item.school_year_id === selectedSchoolYearId && item.is_operating).map((item) => item.daycare_school_year_id));
  const classroomIds = new Set(generalModel.classrooms.filter((item) => relevantDsyIds.has(item.daycare_school_year_id)).map((item) => item.classroom_id));
  const enrollment = generalModel.enrollment.filter((item) => classroomIds.has(item.classroom_id) && selectedMonthSet.has(month(item.reporting_month)));
  const latestEnrollmentMonth = [...new Set(enrollment.map((item) => month(item.reporting_month)))].sort().at(-1);
  const latestEnrollment = latestEnrollmentMonth ? enrollment.filter((item) => month(item.reporting_month) === latestEnrollmentMonth) : [];
  const children = latestEnrollment.length ? sum(latestEnrollment, (item) => item.children_count) : null;
  const payroll = generalModel.payroll.filter((item) => selectedMonthSet.has(month(item.payroll_month)));
  const payrollById = new Map(payroll.map((item) => [item.payroll_record_id, item]));
  const payrollAllocations = generalModel.pa.filter((item) => payrollById.has(item.payroll_record_id) && selectedUnitIds.has(item.allocation_unit_id));
  const payrollCost = payrollAllocations.length ? sum(payrollAllocations, (item) => item.allocation_amount) : null;
  const actualHours = payrollAllocations.some((item) => item.allocated_hours != null) ? sum(payrollAllocations, (item) => item.allocated_hours) : null;
  const roleById = new Map(generalModel.roles.map((item) => [item.role_id, item]));
  const caregiverActual = sum(payrollAllocations.filter((item) => roleById.get(item.role_id)?.role_code === 'ROLE-CAREGIVER'), (item) => item.allocation_amount);
  const fixedActual = sum(payrollAllocations.filter((item) => roleById.get(item.role_id)?.role_code !== 'ROLE-CAREGIVER'), (item) => item.allocation_amount);
  const bankAllocations = generalModel.ba.filter((item) => selectedMonthSet.has(month(item.budget_month)) && selectedUnitIds.has(item.allocation_unit_id));
  const bankById = new Map(generalModel.bank.map((item) => [item.bank_transaction_id, item]));
  const categoryMap = new Map(generalModel.budgetCategories.map((item) => [item.budget_category_id, item]));
  const incomeRows = bankAllocations.filter((item) => categoryMap.get(item.budget_category_id)?.category_type === 'INCOME' && Number(item.allocation_amount) > 0);
  const expenseRows = bankAllocations.filter((item) => categoryMap.get(item.budget_category_id)?.category_type === 'EXPENSE' && !['CAT-PAYROLL-STAFF', 'CAT-PAYROLL-NONSTAFF'].includes(categoryMap.get(item.budget_category_id)?.budget_category_code));
  const income = incomeRows.length ? sum(incomeRows, (item) => item.allocation_amount) : null;
  const expenses = expenseRows.length ? sum(expenseRows, (item) => Math.abs(Number(item.allocation_amount))) : null;
  const budgetRows = generalModel.budgetSnapshots.filter((item) => selectedMonthSet.has(month(item.reporting_month)) && (unitId === 'organization' || item.allocation_unit_id === unitId || relevantDaycareIds.has(item.daycare_id)));
  const calculatedBudget = calculateBudgetModel({ ...generalModel, budgetCategories: generalModel.budgetCategories }, { schoolYearId: selectedSchoolYearId, months: selectedMonthSet, unitIds: [...selectedUnitIds] });
  const budgetSummary = summarizeBudget(calculatedBudget);
  generalModel.calculatedBudget = calculatedBudget;
  const revenueBudget = budgetSummary.tuitionBudget;
  const expenseBudget = budgetSummary.expenseBudget;
  const payrollBudget = budgetSummary.payrollBudget;
  const requiredHours = budgetSummary.requiredHours;
  const balanceMonth = [...selectedMonthSet].sort().at(-1);
  const balanceBankAllocations = bankAllocations.filter((item) => month(item.budget_month) === balanceMonth);
  const balanceIncomeRows = balanceBankAllocations.filter((item) => categoryMap.get(item.budget_category_id)?.category_type === 'INCOME' && Number(item.allocation_amount) > 0);
  const balanceExpenseRows = balanceBankAllocations.filter((item) => categoryMap.get(item.budget_category_id)?.category_type === 'EXPENSE' && !['CAT-PAYROLL-STAFF', 'CAT-PAYROLL-NONSTAFF'].includes(categoryMap.get(item.budget_category_id)?.budget_category_code));
  const balancePayrollIds = new Set(payroll.filter((item) => month(item.payroll_month) === balanceMonth).map((item) => item.payroll_record_id));
  const balancePayrollAllocations = payrollAllocations.filter((item) => balancePayrollIds.has(item.payroll_record_id));
  const balanceIncome = balanceIncomeRows.length ? sum(balanceIncomeRows, (item) => item.allocation_amount) : null;
  const balanceExpenses = balanceExpenseRows.length ? sum(balanceExpenseRows, (item) => Math.abs(Number(item.allocation_amount))) : null;
  const balancePayroll = balancePayrollAllocations.length ? sum(balancePayrollAllocations, (item) => item.allocation_amount) : null;
  const actualResult = balanceIncome == null || balanceExpenses == null || balancePayroll == null ? null : balanceIncome - balanceExpenses - balancePayroll;
  const calculationIssues = calculatedBudget.issues;
  const cards = [
    { id: 'revenue', title: 'הכנסות', primary: income, formatter: money.format, utilization: utilization(income, revenueBudget), lines: [{ label: 'בפועל', value: income, formatter: money.format }, { label: 'תקציב', value: revenueBudget, formatter: money.format }, { label: 'ניצול', value: utilization(income, revenueBudget), formatter: (value) => `${number.format(value)}%` }] },
    { id: 'expenses', title: 'הוצאות', primary: expenses, formatter: money.format, utilization: utilization(expenses, expenseBudget), lines: [{ label: 'בפועל', value: expenses, formatter: money.format }, { label: 'תקציב', value: expenseBudget, formatter: money.format }, { label: 'ניצול', value: utilization(expenses, expenseBudget), formatter: (value) => `${number.format(value)}%` }] },
    { id: 'hours', title: 'שעות נדרשות', primary: requiredHours, formatter: number.format, utilization: utilization(actualHours, requiredHours), lines: [{ label: 'בפועל', value: actualHours, formatter: number.format }, { label: 'תקציב', value: requiredHours, formatter: number.format }, { label: 'ניצול', value: utilization(actualHours, requiredHours), formatter: (value) => `${number.format(value)}%` }] },
    { id: 'payroll', title: 'שכר', primary: payrollCost, formatter: money.format, utilization: utilization(payrollCost, payrollBudget), lines: [{ label: 'בפועל', value: payrollCost, formatter: money.format }, { label: 'תקציב', value: payrollBudget, formatter: money.format }, { label: 'ניצול', value: utilization(payrollCost, payrollBudget), formatter: (value) => `${number.format(value)}%` }] },
    { id: 'balance', title: 'מאזן חודשי', row: 'secondary', primary: actualResult, formatter: money.format, utilization: actualResult == null ? null : actualResult >= 0 ? 0 : 101, lines: [{ label: 'הכנסות פחות הוצאות ושכר', value: actualResult, formatter: money.format }] },
    { id: 'children', title: 'ילדים', row: 'secondary', primary: children, formatter: number.format, utilization: null, lines: [{ label: 'חודש אחרון', value: latestEnrollmentMonth ? generalModel.months.find((item) => month(item.start_date) === latestEnrollmentMonth)?.month_label || latestEnrollmentMonth : null }] },
    { id: 'attention', title: 'דורש תשומת לב', row: 'secondary', primary: generalModel.issues.length + calculationIssues.length, formatter: number.format, utilization: generalModel.issues.length + calculationIssues.length ? 101 : 0, lines: [{ label: 'נושאים פתוחים', value: generalModel.issues.length + calculationIssues.length, formatter: number.format }] }
  ];
  const budgetRecords = calculatedBudget.rows;
  const classroomById = new Map(generalModel.classrooms.map((item) => [item.classroom_id, item]));
  const dsyById = new Map(generalModel.dsy.map((item) => [item.daycare_school_year_id, item]));
  const daycareById = new Map(generalModel.daycares.map((item) => [item.daycare_id, item]));
  const ageById = new Map(generalModel.ageGroups.map((item) => [item.age_group_id, item]));
  const unitById = new Map(generalModel.units.map((item) => [item.allocation_unit_id, item]));
  const employmentById = new Map(generalModel.employments.map((item) => [item.employment_id, item]));
  const employeeById = new Map(generalModel.employees.map((item) => [item.employee_id, item]));
  const payrollDetails = payrollAllocations.map((allocation) => {
    const record = payrollById.get(allocation.payroll_record_id);
    const employment = employmentById.get(record?.employment_id);
    const employee = employeeById.get(employment?.employee_id);
    const assignment = generalModel.assignments.find((item) => item.employment_id === record?.employment_id && (!item.effective_from || item.effective_from <= record.payroll_month) && (!item.effective_to || item.effective_to >= record.payroll_month) && (item.role_id === allocation.role_id || item.is_primary));
    return { חודש: record?.payroll_month || '', עובד: employee ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : record?.source_employee_identifier || 'לא זמין', תפקיד: roleById.get(allocation.role_id)?.display_name || 'לא זמין', כיתה: classroomById.get(assignment?.classroom_id)?.display_name || 'ללא שיוך כיתה', שעות: number.format(allocation.allocated_hours || 0), 'עלות שכר': money.format(allocation.allocation_amount) };
  });
  const childrenDetails = latestEnrollment.map((row) => { const classroom = classroomById.get(row.classroom_id); const daycare = daycareById.get(dsyById.get(classroom?.daycare_school_year_id)?.daycare_id); return { חודש: row.reporting_month, מעון: daycare?.display_name || 'לא זמין', כיתה: classroom?.display_name || 'לא זמין', 'קבוצת גיל': ageById.get(row.age_group_id)?.display_name || 'לא זמין', ילדים: number.format(row.children_count) }; });
  const sourceIncome = incomeRows.map((row) => ({ חודש: row.budget_month, יחידה: unitById.get(row.allocation_unit_id)?.display_name || 'לא שויך', קטגוריה: categoryMap.get(row.budget_category_id)?.display_name || 'לא שויך', סכום: money.format(row.allocation_amount), תיאור: bankById.get(row.bank_transaction_id)?.description || '' }));
  const sourceExpenses = expenseRows.map((row) => ({ חודש: row.budget_month, יחידה: unitById.get(row.allocation_unit_id)?.display_name || 'לא שויך', קטגוריה: categoryMap.get(row.budget_category_id)?.display_name || 'לא שויך', סכום: money.format(Math.abs(Number(row.allocation_amount))), תיאור: bankById.get(row.bank_transaction_id)?.description || '' }));
  const hoursDetails = budgetRecords.filter((row) => row.type === 'classroom').map((row) => ({ חודש: row.month, מעון: row.daycare, כיתה: row.classroom, 'קבוצת גיל': row.ageGroup, ילדים: number.format(row.children), 'שעות נדרשות': number.format(row.requiredHours || 0) }));
  const revenueBudgetSources = budgetRecords.filter((row) => row.type === 'classroom').map((row) => ({ חודש: row.month, מעון: row.daycare, כיתה: row.classroom, 'קבוצת גיל': row.ageGroup, ילדים: number.format(row.children), 'תקציב הכנסה': money.format(row.tuitionBudget) }));
  const expenseBudgetSources = budgetRecords.filter((row) => row.type === 'expense').map((row) => ({ חודש: row.month, מעון: row.daycare, קטגוריה: row.category, תקציב: money.format(row.budget), שיטה: row.method || '' }));
  const payrollBudgetSources = budgetRecords.filter((row) => ['daycare-month', 'fixed'].includes(row.type)).map((row) => ({ חודש: row.month, מעון: row.daycare, רכיב: row.role || 'צוות מטפלות', תקציב: money.format(row.budget ?? row.caregiverBudget ?? 0) }));
  const attentionDetails = [...generalModel.issues.map((row) => ({ חומרה: row.severity, תחום: row.entity_type || '', הסבר: row.explanation })), ...calculationIssues.map((row) => ({ חומרה: 'שגיאת חישוב', תחום: row.code, הסבר: row.message }))];
  generalModel.currentKpis = {
    revenue: { ...cards[0], details: sourceIncome, records: [...sourceIncome, ...revenueBudgetSources] }, expenses: { ...cards[1], details: sourceExpenses, records: [...sourceExpenses, ...expenseBudgetSources] }, hours: { ...cards[2], details: hoursDetails, records: [...hoursDetails, ...payrollDetails.map((row) => ({ חודש: row.חודש, עובד: row.עובד, כיתה: row.כיתה, שעות: row.שעות }))] }, payroll: { ...cards[3], details: payrollDetails, records: [...payrollDetails, ...payrollBudgetSources] },
    balance: { ...cards[4], details: [{ חודש: balanceMonth || 'No Data', הכנסות: metric(balanceIncome, money.format), הוצאות: metric(balanceExpenses, money.format), שכר: metric(balancePayroll, money.format), מאזן: metric(actualResult, money.format) }], records: [...sourceIncome.filter((row) => month(row.חודש) === balanceMonth), ...sourceExpenses.filter((row) => month(row.חודש) === balanceMonth), ...payrollDetails.filter((row) => month(row.חודש) === balanceMonth)] },
    children: { ...cards[5], details: childrenDetails, records: childrenDetails }, attention: { ...cards[6], details: attentionDetails, records: attentionDetails }
  };
  $('#kpis').innerHTML = cards.map(kpiCardTemplate).join('');
  const selectedYear = generalModel.years.find((item) => item.school_year_id === selectedSchoolYearId);
  const yearMonths = generalModel.months.filter((item) => item.school_year_id === selectedSchoolYearId);
  const selectedLabels = yearMonths.filter((item) => selectedMonthSet.has(month(item.start_date))).map((item) => item.month_label);
  const yearMonthKeys = new Set(yearMonths.map((item) => month(item.start_date)));
  const payrollRecordIdsForUnits = new Set(generalModel.pa.filter((item) => selectedUnitIds.has(item.allocation_unit_id)).map((item) => item.payroll_record_id));
  const dataMonthKeys = new Set([
    ...generalModel.enrollment.filter((item) => classroomIds.has(item.classroom_id)).map((item) => month(item.reporting_month)),
    ...generalModel.ba.filter((item) => selectedUnitIds.has(item.allocation_unit_id)).map((item) => month(item.budget_month)),
    ...generalModel.payroll.filter((item) => payrollRecordIdsForUnits.has(item.payroll_record_id)).map((item) => month(item.payroll_month))
  ].filter((item) => yearMonthKeys.has(item)));
  const summaryMonth = yearMonths.filter((item) => dataMonthKeys.has(month(item.start_date))).at(-1);
  const summaryMonths = new Set(yearMonths.filter((item) => summaryMonth && item.school_year_sequence <= summaryMonth.school_year_sequence).map((item) => month(item.start_date)));
  const summaryBudget = summarizeBudget(calculateBudgetModel({ ...generalModel, budgetCategories: generalModel.budgetCategories }, { schoolYearId: selectedSchoolYearId, months: summaryMonths, unitIds: [...selectedUnitIds] }));
  const summaryBank = generalModel.ba.filter((item) => summaryMonths.has(month(item.budget_month)) && selectedUnitIds.has(item.allocation_unit_id));
  const summaryIncomeRows = summaryBank.filter((item) => categoryMap.get(item.budget_category_id)?.category_type === 'INCOME' && Number(item.allocation_amount) > 0);
  const summaryExpenseRows = summaryBank.filter((item) => categoryMap.get(item.budget_category_id)?.category_type === 'EXPENSE' && !['CAT-PAYROLL-STAFF', 'CAT-PAYROLL-NONSTAFF'].includes(categoryMap.get(item.budget_category_id)?.budget_category_code));
  const summaryPayrollIds = new Set(generalModel.payroll.filter((item) => summaryMonths.has(month(item.payroll_month))).map((item) => item.payroll_record_id));
  const summaryPayrollRows = generalModel.pa.filter((item) => summaryPayrollIds.has(item.payroll_record_id) && selectedUnitIds.has(item.allocation_unit_id));
  $('#context-year').textContent = selectedYear?.display_name || 'אין נתונים זמינים';
  $('#context-period').textContent = selectedLabels.length ? selectedLabels.join(', ') : 'אין נתונים זמינים';
  $('#summary-range').textContent = selectedYear && summaryMonth ? `${yearMonths[0]?.month_label || ''} → ${summaryMonth.month_label}` : 'No Data';
  $('#summary-month').textContent = summaryMonth?.month_label || 'No Data';
  const summaryMetrics = summaryMonth ? [
    ['הכנסות', summaryIncomeRows.length ? money.format(sum(summaryIncomeRows, (row) => row.allocation_amount)) : null],
    ['הוצאות', summaryExpenseRows.length ? money.format(sum(summaryExpenseRows, (row) => Math.abs(Number(row.allocation_amount)))) : null],
    ['שכר', summaryPayrollRows.length ? money.format(sum(summaryPayrollRows, (row) => row.allocation_amount)) : null],
    ['שעות נדרשות', summaryBudget.requiredHours == null ? null : number.format(summaryBudget.requiredHours)]
  ] : [];
  $('#school-year-metrics').innerHTML = summaryMetrics.length ? summaryMetrics.map(([label, value]) => `<span><small>${label}</small><strong>${value ?? 'No Data'}</strong></span>`).join('') : '<strong>No Data</strong>';
  $('#last-updated').textContent = generalLastUpdated ? new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(generalLastUpdated) : 'טרם עודכן';
  const budgetCategoryRows = buildBudgetCategoryRows({ calculatedBudget, bankAllocations, payrollAllocations, relevantDaycares, categoryMap, unitById });
  const organizationMatrix = unitId === 'organization' ? budgetMatrixTemplate(budgetCategoryRows, relevantDaycares) : '';
  renderDetailSections({ payrollAllocations, bankAllocations, bankById, categoryMap, unitById, childrenDetails, payrollDetails, budgetCategoryRows, organizationMatrix, calculatedBudget, calculationIssues });
  $('#general-state').hidden = true;
  $('#general-dashboard').hidden = false;
  bindDashboardDynamicInteractions();
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
        dashboardMode = 'finance';
        activeDashboardUnit = unit;
        $('#page-content').innerHTML = generalDashboardShell(unit);
        await loadGeneralDashboard();
        if (parseRoute().unitId === unit.allocation_unit_id && parseRoute().dashboardType === 'finance') renderGeneralData();
      } else if (type.id === 'accounting') {
        title = type.title;
        dashboardMode = 'accounting';
        activeDashboardUnit = unit;
        $('#page-content').innerHTML = accountingDashboardShell(unit);
        await loadAccountingDashboard();
        if (parseRoute().unitId === unit.allocation_unit_id && parseRoute().dashboardType === 'accounting') renderAccountingData();
      } else if (type.id === 'staffing') {
        title = type.title; dashboardMode = 'staffing'; activeDashboardUnit = unit; $('#page-content').innerHTML = staffDashboardShell(unit); await loadStaffDashboard(); if (parseRoute().unitId === unit.allocation_unit_id && parseRoute().dashboardType === 'staffing') renderStaffData();
      } else { title = type.title; $('#page-content').innerHTML = dashboardPlaceholderTemplate(unit, type); }
    }
  }
  document.title = `${title} | פורטל חמ״ה`;
  $('#breadcrumbs').innerHTML = breadcrumbsTemplate(route, unit, type);
  document.querySelectorAll('[data-route]').forEach((item) => item.classList.toggle('active', item.dataset.route === route.section));
  const retryButton = $('[data-retry-units]');
  if (retryButton) retryButton.addEventListener('click', () => { unitState = { status: 'idle', items: [], error: '' }; render(); });
  $('#close-kpi-panel')?.addEventListener('click', closeKpiPanel);
  $('#kpi-backdrop')?.addEventListener('click', closeKpiPanel);
  $('#refresh-dashboard')?.addEventListener('click', async () => {
    const button = $('#refresh-dashboard');
    button.disabled = true;
    button.textContent = 'מרענן נתונים…';
    if (dashboardMode === 'accounting') { accountingStatus = 'idle'; await loadAccountingDashboard(); if (parseRoute().dashboardType === 'accounting') renderAccountingData(); }
    else if (dashboardMode === 'staffing') { staffStatus = 'idle'; await loadStaffDashboard(); if (parseRoute().dashboardType === 'staffing') renderStaffData(); }
    else { generalStatus = 'idle'; await loadGeneralDashboard(); if (parseRoute().dashboardType === 'finance') renderGeneralData(); }
    button.disabled = false;
    button.textContent = '↻ רענון נתונים';
  });
  $('[data-retry-dashboard]')?.addEventListener('click', async () => { $('#general-state').className = 'dashboard-skeleton'; $('#general-state').innerHTML = Array.from({ length: 8 }, () => '<span></span>').join(''); if (dashboardMode === 'accounting') { accountingStatus = 'idle'; await loadAccountingDashboard(); renderAccountingData(); } else { generalStatus = 'idle'; await loadGeneralDashboard(); renderGeneralData(); } });
  document.querySelectorAll('[data-export]').forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.export === 'print' || button.dataset.export === 'pdf') window.print();
    else exportDashboardCsv();
  }));
  closeMenu();
  $('#main-content').focus({ preventScroll: true });
}

function bindDashboardDynamicInteractions() {
  const rerenderDashboard = () => dashboardMode === 'accounting' ? renderAccountingData() : dashboardMode === 'staffing' ? renderStaffData() : renderGeneralData();
  document.querySelectorAll('[data-year]').forEach((button) => button.addEventListener('click', () => { if (dashboardMode === 'accounting') selectedCalendarYearId = button.dataset.year; else selectedSchoolYearId = button.dataset.year; selectedReportingMonths = new Set(); rerenderDashboard(); }));
  document.querySelectorAll('[data-month]').forEach((button) => button.addEventListener('click', () => {
    const value = button.dataset.month;
    if (selectedReportingMonths.has(value) && selectedReportingMonths.size > 1) selectedReportingMonths.delete(value); else selectedReportingMonths.add(value);
    rerenderDashboard();
  }));
  document.querySelectorAll('[data-dashboard-unit]').forEach((button) => button.addEventListener('click', () => {
    const value = button.dataset.dashboardUnit;
    if (selectedDashboardUnitIds.has(value) && selectedDashboardUnitIds.size > 1) selectedDashboardUnitIds.delete(value); else selectedDashboardUnitIds.add(value);
    rerenderDashboard();
  }));
  document.querySelectorAll('.kpi-open').forEach((button) => button.addEventListener('click', () => openKpiPanel(button.dataset.kpi)));
  document.querySelectorAll('.kpi-info-button').forEach((button) => button.addEventListener('click', () => openKpiPanel(button.dataset.kpi)));
  document.querySelectorAll('[data-budget-cell]').forEach((button) => button.addEventListener('click', () => openKpiPanel(`budget:${button.dataset.budgetCell}`)));
}

function openKpiPanel(id) {
  const activeModel = dashboardMode === 'accounting' ? accountingModel : dashboardMode === 'staffing' ? staffModel : generalModel;
  const isBudgetCell = id.startsWith('budget:');
  const card = isBudgetCell ? activeModel.budgetCells?.[id.slice(7)] : activeModel.currentKpis?.[id];
  const definition = card?.definition || kpiDefinitions[id];
  if (!definition || !card) return;
  const selectedYear = dashboardMode === 'staffing' ? 'מצב נוכחי' : dashboardMode === 'accounting' ? activeModel.years.find((item) => item.calendar_year_id === selectedCalendarYearId)?.display_name : activeModel.years.find((item) => item.school_year_id === selectedSchoolYearId)?.display_name;
  const period = dashboardMode === 'staffing' ? 'עובדים פעילים' : dashboardMode === 'accounting' ? [...selectedReportingMonths].join(', ') : activeModel.months.filter((item) => selectedReportingMonths.has(month(item.start_date))).map((item) => item.month_label).join(', ');
  $('#kpi-panel-title').textContent = definition.title;
  $('#kpi-description').textContent = definition.description;
  $('#kpi-calculation').textContent = definition.calculation;
  $('#kpi-source').textContent = definition.source;
  $('#kpi-filters').textContent = `${activeDashboardUnit.display_name}; ${selectedYear}; ${period || 'אין תקופה נבחרת'}`;
  $('#kpi-details').innerHTML = sourceRowsTemplate(card.details || []);
  $('#kpi-records').innerHTML = sourceRowsTemplate(card.records || []);
  document.querySelectorAll('[data-info-tab]').forEach((button, index) => button.setAttribute('aria-selected', String(index === 0)));
  document.querySelectorAll('[data-info-panel]').forEach((panel) => { panel.hidden = panel.dataset.infoPanel !== 'explanation'; });
  $('#kpi-panel').hidden = false;
  $('#kpi-backdrop').hidden = false;
  $('#close-kpi-panel').focus();
  document.querySelectorAll('[data-info-tab]').forEach((button) => button.onclick = () => {
    document.querySelectorAll('[data-info-tab]').forEach((item) => item.setAttribute('aria-selected', String(item === button)));
    document.querySelectorAll('[data-info-panel]').forEach((panel) => { panel.hidden = panel.dataset.infoPanel !== button.dataset.infoTab; });
  });
  document.querySelectorAll('[data-info-action]').forEach((button) => button.onclick = () => {
    if (button.dataset.infoAction === 'excel') exportKpiCsv(id);
    else printKpi(id);
  });
}

function closeKpiPanel() {
  if (!$('#kpi-panel')) return;
  $('#kpi-panel').hidden = true;
  $('#kpi-backdrop').hidden = true;
}

const accountingStatusLabels = {
  PENDING_SUBMISSION: 'ממתין להגשה',
  SENT_TO_ACCOUNTING: 'נשלח להנהלת חשבונות',
  MISSING_DOCUMENTS: 'חסרים מסמכים',
  NO_SUPPORTING_DOCUMENT_REQUIRED: 'אין צורך במסמך תומך'
};

async function loadAccountingDashboard() {
  if (accountingStatus === 'loading' || accountingStatus === 'ready') return;
  accountingStatus = 'loading'; accountingError = '';
  try {
    const [years, transactions, allocations, accounts, units, daycares, categories] = await Promise.all([
      rest('calendar_years', 'select=calendar_year_id,calendar_year_code,display_name,start_date,end_date,status,is_selectable&is_selectable=eq.true&order=start_date.desc'),
      rest('bank_transactions', 'select=bank_transaction_id,bank_account_id,transaction_date,description,reference_number,amount,debit_amount,credit_amount&order=transaction_date.desc'),
      rest('bank_allocations', 'select=bank_allocation_id,bank_transaction_id,allocation_unit_id,budget_month,budget_category_id,allocation_amount,accounting_status,notes'),
      rest('bank_accounts', 'select=bank_account_id,display_name,bank_account_code,lifecycle_status'),
      rest('allocation_units', 'select=allocation_unit_id,display_name,allocation_unit_type,lifecycle_status,display_order&lifecycle_status=eq.ACTIVE&order=display_order.asc,display_name.asc'),
      rest('daycares', 'select=daycare_id,allocation_unit_id,display_name,lifecycle_status,display_order&order=display_order'),
      rest('budget_categories', 'select=budget_category_id,display_name,category_type,lifecycle_status&lifecycle_status=eq.ACTIVE')
    ]);
    accountingModel = { years, transactions, allocations, accounts, units: activeUnits(units), daycares, categories };
    accountingStatus = 'ready'; accountingLastUpdated = new Date();
  } catch (error) { accountingStatus = 'error'; accountingError = error.message; }
}

function setupAccountingFilters() {
  const model = accountingModel;
  if (!model.years?.length) return;
  if (!selectedCalendarYearId || !model.years.some((item) => item.calendar_year_id === selectedCalendarYearId)) selectedCalendarYearId = (model.years.find((item) => item.status === 'OPEN') || model.years[0]).calendar_year_id;
  const year = model.years.find((item) => item.calendar_year_id === selectedCalendarYearId);
  const gregorianYear = Number(year.start_date.slice(0, 4));
  const available = Array.from({ length: 12 }, (_, index) => { const key = `${gregorianYear}-${String(index + 1).padStart(2, '0')}`; return { start_date: `${key}-01`, month_label: new Intl.DateTimeFormat('he-IL-u-ca-gregory', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${key}-01T00:00:00Z`)) }; });
  const availableKeys = new Set(available.map((item) => month(item.start_date)));
  selectedReportingMonths = new Set([...selectedReportingMonths].filter((item) => availableKeys.has(item)));
  if (!selectedReportingMonths.size && available.length) {
    const source = model.transactions.map(accountingMonth);
    selectedReportingMonths.add(source.filter((item) => availableKeys.has(item)).sort().at(-1) || month(available[0].start_date));
  }
  const unitFilter = $('#unit-filter-group');
  if (activeDashboardUnit?.allocation_unit_id === 'organization') {
    unitFilter.hidden = false;
    const selectable = model.units.filter((item) => item.allocation_unit_id !== 'organization');
    selectedDashboardUnitIds = new Set([...selectedDashboardUnitIds].filter((id) => selectable.some((item) => item.allocation_unit_id === id)));
    if (!selectedDashboardUnitIds.size) selectedDashboardUnitIds = new Set(selectable.map((item) => item.allocation_unit_id));
    $('#unit-chips').innerHTML = selectable.map((item) => `<button class="filter-chip${selectedDashboardUnitIds.has(item.allocation_unit_id) ? ' selected' : ''}" type="button" data-dashboard-unit="${escapeHtml(item.allocation_unit_id)}" aria-pressed="${selectedDashboardUnitIds.has(item.allocation_unit_id)}">${escapeHtml(item.display_name)}</button>`).join('');
  } else { unitFilter.hidden = true; selectedDashboardUnitIds = new Set(activeDashboardUnit ? [activeDashboardUnit.allocation_unit_id] : []); }
  $('#year-chips').innerHTML = model.years.map((item) => `<button class="filter-chip${item.calendar_year_id === selectedCalendarYearId ? ' selected' : ''}" type="button" data-year="${escapeHtml(item.calendar_year_id)}" aria-pressed="${item.calendar_year_id === selectedCalendarYearId}">${escapeHtml(item.display_name || item.calendar_year_code)}</button>`).join('');
  $('#month-chips').innerHTML = available.map((item) => { const value = month(item.start_date); return `<button class="filter-chip${selectedReportingMonths.has(value) ? ' selected' : ''}" type="button" data-month="${value}" aria-pressed="${selectedReportingMonths.has(value)}">${escapeHtml(item.month_label)}</button>`; }).join('');
}

function accountingTransactionRow(transaction, model, allocations = []) {
  const account = model.accounts.find((item) => item.bank_account_id === transaction.bank_account_id);
  return { תאריך: accountingCashDate(transaction), חשבון: account?.display_name || 'לא שויך', תיאור: transaction.description, אסמכתא: transaction.reference_number || '—', סכום: money.format(transaction.amount), הקצאות: number.format(allocations.length) };
}

function renderAccountingData() {
  if (accountingStatus === 'error') { $('#general-state').className = 'error-state panel'; $('#general-state').innerHTML = '<strong>לא ניתן לטעון את נתוני הנהלת החשבונות</strong><button class="button button-secondary" type="button" data-retry-dashboard>נסה שוב</button>'; return; }
  if (accountingStatus !== 'ready') return;
  setupAccountingFilters();
  const model = accountingModel; const selectedUnits = activeDashboardUnit.allocation_unit_id === 'organization' ? selectedDashboardUnitIds : new Set([activeDashboardUnit.allocation_unit_id]);
  const txById = new Map(model.transactions.map((item) => [item.bank_transaction_id, item]));
  const categoryById = new Map(model.categories.map((item) => [item.budget_category_id, item]));
  const allocationsByTx = new Map(model.transactions.map((item) => [item.bank_transaction_id, []]));
  model.allocations.forEach((item) => { if (allocationsByTx.has(item.bank_transaction_id)) allocationsByTx.get(item.bank_transaction_id).push(item); });
  const unitDaycare = new Map(model.daycares.filter((item) => item.lifecycle_status === 'ACTIVE').map((item) => [item.allocation_unit_id, item]));
  const isOrganization = activeDashboardUnit.allocation_unit_id === 'organization';
  const selectedParents = isOrganization ? model.transactions.filter((item) => selectedReportingMonths.has(accountingMonth(item))) : [...new Set(model.allocations.filter((item) => selectedUnits.has(item.allocation_unit_id)).map((item) => item.bank_transaction_id))].map((id) => txById.get(id)).filter((item) => selectedReportingMonths.has(accountingMonth(item)));
  const selectedParentIds = new Set(selectedParents.map((item) => item.bank_transaction_id));
  const selectedAllocations = model.allocations.filter((item) => selectedParentIds.has(item.bank_transaction_id) && (isOrganization ? true : selectedUnits.has(item.allocation_unit_id)));
  const analyses = selectedParents.map((transaction) => {
    const rows = isOrganization ? allocationsByTx.get(transaction.bank_transaction_id) || [] : selectedAllocations.filter((item) => item.bank_transaction_id === transaction.bank_transaction_id);
    const validType = rows.some((item) => ['INCOME', 'EXPENSE', 'INTERNAL'].includes(categoryById.get(item.budget_category_id)?.category_type));
    const allocationTotal = sum(rows, (item) => Math.abs(Number(item.allocation_amount)));
    const difference = Math.abs(Number(transaction.amount)) - allocationTotal;
    const missing = { type: !validType, budgetMonth: !rows.length || rows.some((item) => !item.budget_month), allocationUnit: !rows.length || rows.some((item) => !item.allocation_unit_id), daycare: rows.some((item) => model.units.find((unit) => unit.allocation_unit_id === item.allocation_unit_id)?.allocation_unit_type === 'DAYCARE' && !unitDaycare.has(item.allocation_unit_id)), split: rows.length > 0 && Math.abs(difference) > .01 };
    const statuses = [...new Set(rows.map((item) => item.accounting_status).filter(Boolean))];
    const complete = rows.length > 0 && rows.every((item) => ['SENT_TO_ACCOUNTING', 'NO_SUPPORTING_DOCUMENT_REQUIRED'].includes(item.accounting_status));
    const attention = Object.values(missing).some(Boolean) || rows.some((item) => ['PENDING_SUBMISSION', 'MISSING_DOCUMENTS'].includes(item.accounting_status));
    return { transaction, rows, allocationTotal, difference, missing, statuses, complete, attention };
  });
  const missingCards = [
    ['missing-type', 'חסר סוג תנועה', 'סוג התנועה אינו מוגדר כהכנסה, הוצאה או פנימי.', 'בודקים האם קיימת הקצאה עם קטגוריה עסקית תקפה.', 'type'],
    ['missing-month', 'חסר חודש תקציבי', 'לא הוגדר חודש תקציבי לטיפול בתנועה.', 'סופרים תנועות ללא הקצאה או עם הקצאה ללא חודש תקציבי.', 'budgetMonth'],
    ['missing-unit', 'חסרה יחידת הקצאה', 'התנועה עדיין אינה משויכת ליחידה ארגונית.', 'סופרים תנועות ללא שורת הקצאה או ללא יחידת הקצאה.', 'allocationUnit'],
    ['missing-daycare', 'חסר מעון', 'יחידת הקצאה מסוג מעון אינה מחוברת לרשומת מעון פעילה.', 'נבדקת רק הקצאה ליחידה מסוג מעון.', 'daycare'],
    ['invalid-split', 'פיצול לא תקין', 'סכום ההקצאות אינו תואם לסכום תנועת־האב.', 'משווים את הערך המוחלט של תנועת־האב לסך ההקצאות.', 'split']
  ].map(([id, title, description, calculation, key]) => { const rows = analyses.filter((item) => item.missing[key]); return { id, title, primary: rows.length, formatter: number.format, utilization: rows.length ? 101 : 0, definition: { title, description, calculation, source: 'תנועות בנק והקצאות תנועה' }, details: rows.map((item) => ({ ...accountingTransactionRow(item.transaction, model, item.rows), פער: key === 'split' ? money.format(item.difference) : 'דורש השלמה' })), records: rows.flatMap((item) => [accountingTransactionRow(item.transaction, model, item.rows), ...item.rows.map((row) => ({ חודש: row.budget_month || 'לא הוגדר', יחידה: model.units.find((unit) => unit.allocation_unit_id === row.allocation_unit_id)?.display_name || 'לא שויך', סטטוס: accountingStatusLabels[row.accounting_status] || 'ללא סטטוס', סכום: money.format(row.allocation_amount) }))]) }; });
  const workflowCards = [...new Set(selectedAllocations.map((item) => item.accounting_status).filter(Boolean))].map((status) => { const rows = selectedAllocations.filter((item) => item.accounting_status === status); const title = accountingStatusLabels[status] || status; return { id: `status-${status}`, title, primary: rows.length, formatter: number.format, utilization: status === 'MISSING_DOCUMENTS' || status === 'PENDING_SUBMISSION' ? 101 : 0, definition: { title, description: `הקצאות הנמצאות בסטטוס ${title}.`, calculation: 'ספירת שורות הקצאה בסטטוס הקיים במקור.', source: 'סטטוס הנהלת החשבונות של שורות ההקצאה' }, details: rows.map((row) => ({ חודש: row.budget_month, יחידה: model.units.find((unit) => unit.allocation_unit_id === row.allocation_unit_id)?.display_name || 'לא שויך', סכום: money.format(row.allocation_amount), סטטוס: title })), records: rows.map((row) => ({ ...accountingTransactionRow(txById.get(row.bank_transaction_id), model, [row]), חודש: row.budget_month, יחידה: model.units.find((unit) => unit.allocation_unit_id === row.allocation_unit_id)?.display_name || 'לא שויך', סטטוס: title })) }; });
  const topCards = [
    { id: 'parents', title: 'תנועות בנק', primary: analyses.length, formatter: number.format, utilization: null, definition: { title: 'תנועות בנק', description: 'מספר תנועות־האב בתקופה.', calculation: 'כל תנועת בנק נספרת פעם אחת, גם אם פוצלה למספר הקצאות.', source: 'תנועות בנק מקור' }, details: analyses.map((item) => accountingTransactionRow(item.transaction, model, item.rows)), records: analyses.map((item) => accountingTransactionRow(item.transaction, model, item.rows)) },
    { id: 'allocated', title: 'תנועות שהוקצו', primary: analyses.filter((item) => item.rows.length).length, formatter: number.format, utilization: analyses.length ? analyses.filter((item) => item.rows.length).length / analyses.length * 100 : null, definition: { title: 'תנועות שהוקצו', description: 'תנועות־אב שלפחות הקצאה אחת משויכת אליהן.', calculation: 'סופרים תנועות־אב ייחודיות עם שורת הקצאה אחת או יותר.', source: 'תנועות בנק והקצאות' }, details: analyses.filter((item) => item.rows.length).map((item) => accountingTransactionRow(item.transaction, model, item.rows)), records: analyses.filter((item) => item.rows.length).map((item) => accountingTransactionRow(item.transaction, model, item.rows)) },
    { id: 'complete', title: 'תנועות שהושלמו', primary: analyses.filter((item) => item.complete).length, formatter: number.format, utilization: analyses.length ? analyses.filter((item) => item.complete).length / analyses.length * 100 : null, definition: { title: 'תנועות שהושלמו', description: 'תנועות שכל ההקצאות שלהן הועברו להנהלת החשבונות או אינן דורשות מסמך תומך.', calculation: 'כל שורות ההקצאה חייבות להיות בסטטוס קיים של נשלח להנהלת חשבונות או אין צורך במסמך תומך.', source: 'סטטוס הנהלת החשבונות של ההקצאות' }, details: analyses.filter((item) => item.complete).map((item) => accountingTransactionRow(item.transaction, model, item.rows)), records: analyses.filter((item) => item.complete).map((item) => accountingTransactionRow(item.transaction, model, item.rows)) },
    { id: 'attention', title: 'דורש תשומת לב', primary: analyses.filter((item) => item.attention).length, formatter: number.format, utilization: analyses.some((item) => item.attention) ? 101 : 0, definition: { title: 'דורש תשומת לב', description: 'תנועות עם מידע חסר, פיצול לא תקין או סטטוס טיפול פתוח.', calculation: 'סופרים תנועות־אב עם לפחות בעיה אחת.', source: 'תנועות, הקצאות וסטטוס הנהלת החשבונות' }, details: analyses.filter((item) => item.attention).map((item) => accountingTransactionRow(item.transaction, model, item.rows)), records: analyses.filter((item) => item.attention).map((item) => accountingTransactionRow(item.transaction, model, item.rows)) }
  ];
  const cards = [...topCards, ...missingCards, ...workflowCards];
  accountingModel.currentKpis = Object.fromEntries(cards.map((item) => [item.id, item]));
  $('#kpis').innerHTML = cards.map((item, index) => kpiCardTemplate({ ...item, row: index < 4 ? 'primary' : 'secondary' })).join('');
  const year = model.years.find((item) => item.calendar_year_id === selectedCalendarYearId); const gregorianYear = Number(year.start_date.slice(0, 4)); const yearStart = new Date(`${year.start_date}T00:00:00`); const yearEnd = new Date(`${year.end_date}T23:59:59`); const yearMonths = Array.from({ length: 12 }, (_, index) => { const key = `${gregorianYear}-${String(index + 1).padStart(2, '0')}`; return { start_date: `${key}-01`, month_label: new Intl.DateTimeFormat('he-IL-u-ca-gregory', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${key}-01T00:00:00Z`)) }; }); const period = yearMonths.filter((item) => selectedReportingMonths.has(month(item.start_date))).map((item) => item.month_label);
  const schoolYearMonths = new Set(yearMonths.map((item) => month(item.start_date)));
  const ytdParents = isOrganization
    ? model.transactions.filter((item) => schoolYearMonths.has(accountingMonth(item)))
    : [...new Set(model.allocations.filter((item) => selectedUnits.has(item.allocation_unit_id)).map((item) => item.bank_transaction_id))].map((id) => txById.get(id)).filter((item) => item && schoolYearMonths.has(accountingMonth(item)));
  const ytdAnalyses = ytdParents.map((transaction) => {
    const rows = isOrganization ? allocationsByTx.get(transaction.bank_transaction_id) || [] : model.allocations.filter((item) => item.bank_transaction_id === transaction.bank_transaction_id && selectedUnits.has(item.allocation_unit_id));
    const difference = Math.abs(Number(transaction.amount)) - sum(rows, (item) => Math.abs(Number(item.allocation_amount)));
    const missing = !rows.length || rows.some((item) => !item.budget_month || !item.allocation_unit_id) || Math.abs(difference) > .01;
    return { transaction, rows, complete: rows.length > 0 && rows.every((item) => ['SENT_TO_ACCOUNTING', 'NO_SUPPORTING_DOCUMENT_REQUIRED'].includes(item.accounting_status)), attention: missing || rows.some((item) => ['PENDING_SUBMISSION', 'MISSING_DOCUMENTS'].includes(item.accounting_status)) };
  });
  const currentDate = new Date(); const ytdEnd = currentDate >= yearStart && currentDate <= yearEnd ? currentDate : yearEnd; const latest = [...new Set(ytdParents.filter((item) => new Date(`${accountingCashDate(item)}T00:00:00`) <= ytdEnd).map(accountingMonth))].filter(Boolean).sort().at(-1);
  $('#context-year').textContent = year?.display_name || year?.calendar_year_code || 'No Data'; $('#context-period').textContent = period.join(', ') || 'No Data'; $('#summary-range').textContent = `${year.start_date} → ${ytdEnd.toISOString().slice(0, 10)}`; $('#summary-month').textContent = latest || 'No Data';
  const ytdAllocationRows = ytdAnalyses.flatMap((item) => item.rows);
  const ytdMetrics = [['תנועות־אב', ytdAnalyses.length], ['הוקצו למחלקות', ytdAnalyses.filter((item) => item.rows.length).length], ['הושלמו', ytdAnalyses.filter((item) => item.complete).length], ['דורשות תשומת לב', ytdAnalyses.filter((item) => item.attention).length]];
  if (isOrganization) ytdMetrics.push(['שורות הקצאה', ytdAllocationRows.length], ['סכום תנועות־אב', money.format(sum(ytdAnalyses, (item) => Math.abs(Number(item.transaction.amount))))], ['סכום הקצאות', money.format(sum(ytdAllocationRows, (item) => Math.abs(Number(item.allocation_amount))))]);
  $('#school-year-metrics').innerHTML = ytdMetrics.map(([label,value]) => `<span><small>${label}</small><strong>${typeof value === 'number' ? number.format(value) : value}</strong></span>`).join('');
  $('#last-updated').textContent = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(accountingLastUpdated);
  const byUnit = (field, label) => sourceRowsTemplate([...new Map(selectedAllocations.map((row) => { const key = row[field] || 'missing'; const name = field === 'allocation_unit_id' ? model.units.find((item) => item.allocation_unit_id === row[field])?.display_name || 'לא שויך' : key; return [key, { [label]: name }]; })).values()]);
  $('#detail-daycare').innerHTML = sourceRowsTemplate(model.daycares.filter((daycare) => selectedUnits.has(daycare.allocation_unit_id)).map((daycare) => { const rows = selectedAllocations.filter((item) => item.allocation_unit_id === daycare.allocation_unit_id); return { מעון: daycare.display_name, 'תנועות־אב': number.format(new Set(rows.map((item) => item.bank_transaction_id)).size), הקצאות: number.format(rows.length) }; }));
  $('#detail-unit').innerHTML = sourceRowsTemplate(model.units.filter((unit) => selectedUnits.has(unit.allocation_unit_id)).map((unit) => { const rows = selectedAllocations.filter((item) => item.allocation_unit_id === unit.allocation_unit_id); return { 'יחידת הקצאה': unit.display_name, 'תנועות־אב': number.format(new Set(rows.map((item) => item.bank_transaction_id)).size), הקצאות: number.format(rows.length) }; }));
  $('#detail-account').innerHTML = sourceRowsTemplate([...new Map(analyses.map((item) => [item.transaction.bank_account_id, item])).values()].map((item) => { const account = model.accounts.find((row) => row.bank_account_id === item.transaction.bank_account_id); const rows = analyses.filter((entry) => entry.transaction.bank_account_id === item.transaction.bank_account_id); return { חשבון: account?.display_name || 'לא שויך', 'תנועות־אב': number.format(rows.length) }; }));
  $('#detail-status').innerHTML = sourceRowsTemplate(workflowCards.map((item) => ({ סטטוס: item.title, הקצאות: number.format(item.primary) })));
  $('#detail-attention').innerHTML = sourceRowsTemplate(topCards[3].details);
  $('#detail-split').innerHTML = isOrganization
    ? sourceRowsTemplate(analyses.filter((item) => item.rows.length > 1).map((item) => ({ ...accountingTransactionRow(item.transaction, model, item.rows), 'סכום אב': money.format(Math.abs(Number(item.transaction.amount))), 'סך הקצאות': money.format(item.allocationTotal), פער: money.format(item.difference), מצב: Math.abs(item.difference) <= .01 ? 'תקין' : 'לא תקין', __status: Math.abs(item.difference) <= .01 ? 'good' : 'exception' })))
    : '<div class="empty-state compact">בתצוגת מעון מוצגות הקצאות בלבד. בדיקת סכום תנועת־האב זמינה בכלל הארגון.</div>';
  $('#general-state').hidden = true; $('#general-dashboard').hidden = false; bindDashboardDynamicInteractions();
}

function showToast(message) {
  const toast = $('#export-message');
  toast.textContent = message;
  toast.hidden = false;
  window.setTimeout(() => { toast.hidden = true; }, 2600);
}

function printKpi(id) {
  if (id.startsWith('budget:')) { window.print(); return; }
  const card = document.querySelector(`[data-kpi-card="${id}"]`);
  if (!card) { window.print(); return; }
  document.body.classList.add('print-single-kpi');
  card.classList.add('print-target');
  window.print();
  window.setTimeout(() => { document.body.classList.remove('print-single-kpi'); card.classList.remove('print-target'); }, 0);
}

function exportKpiCsv(id) {
  const activeModel = dashboardMode === 'accounting' ? accountingModel : generalModel;
  const card = id.startsWith('budget:') ? activeModel.budgetCells?.[id.slice(7)] : activeModel.currentKpis?.[id];
  if (!card?.records?.length) { showToast('אין רשומות מקור זמינות לייצוא.'); return; }
  const rows = card.records.map((row) => Object.fromEntries(Object.entries(row).filter(([, value]) => typeof value !== 'object')));
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = `\ufeff${headers.map(escapeCsv).join(',')}\r\n${rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${card.title || kpiDefinitions[id]?.title || 'מידע'}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportDashboardCsv() {
  const activeModel = dashboardMode === 'accounting' ? accountingModel : generalModel;
  const rows = Object.entries(activeModel.currentKpis || {}).flatMap(([id, card]) => card.records.map((row) => ({ מדד: card.title || kpiDefinitions[id]?.title || id, ...Object.fromEntries(Object.entries(row).filter(([, value]) => typeof value !== 'object')) })));
  if (!rows.length) { showToast('אין רשומות מקור זמינות לייצוא.'); return; }
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = `\ufeff${headers.map(escapeCsv).join(',')}\r\n${rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `דשבורד-${dashboardMode === 'accounting' ? 'הנהלת-חשבונות' : 'כספים'}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
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
$('#request-recovery').addEventListener('click', async () => {
  if (recoveryRequestPending) return;
  const email = $('#email');
  const message = $('#recovery-request-message');
  if (!email.validity.valid) { message.textContent = 'יש להזין תחילה כתובת מייל תקינה.'; email.focus(); return; }
  recoveryRequestPending = true;
  $('#request-recovery').disabled = true;
  message.textContent = 'שולח קישור איפוס…';
  try {
    await requestPasswordRecovery(email.value.trim());
    message.textContent = 'אם הכתובת מורשית במערכת, קישור לאיפוס הסיסמה נשלח אליה.';
  } catch (error) { message.textContent = error.message; }
  finally { recoveryRequestPending = false; $('#request-recovery').disabled = false; }
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
