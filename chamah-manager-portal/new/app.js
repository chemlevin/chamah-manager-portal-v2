import { calculateBudgetModel, summarizeBudget } from './budget-calculations.js';
import { calculateSalary, salaryRuleIssues } from './salary-calculations.js';
import { calculateOccupancyModel } from './occupancy-calculations.js';

const SUPABASE_URL = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4MKSdjf7O1oVS4SWhQ36Qw_QUKW8dyW';
const SESSION_KEY = 'chamah.portal.session';
const SESSION_REFRESH_LEEWAY_SECONDS = 60;
const MIN_PASSWORD_LENGTH = 10;
const CANONICAL_PORTAL_URL = 'https://chamah-manager-portal-v2.vercel.app/';
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
let occupancyModel = { status: 'idle', error: '' };
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
let staffFilters = { query: '', status: 'all', daycare: 'all' };
let recoveryRequestPending = false;
const protectedRequests = new Set();
let authPending = false;
let recoveryPending = false;
let salaryModel = { status: 'idle', factors: [], rules: [], years: [], error: '' };

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
  const callbackType = hash.get('type') || search.get('type');
  const mode = callbackType === 'invite' ? 'invite' : 'recovery';
  const isRecovery = callbackType === 'recovery' || callbackType === 'invite' || location.hash === '#reset-password' || Boolean(error || errorCode || errorDescription);
  if (!isRecovery) return { isRecovery: false, error: '' };
  if (error || errorCode || errorDescription) {
    saveSession(null);
    cleanRecoveryUrl();
    return { isRecovery: true, mode, error: recoveryErrorMessage({ error, error_code: errorCode, error_description: errorDescription }) };
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
  return { isRecovery: true, mode, error: '' };
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

function showRecoveryView(error = '', mode = 'recovery') {
  $('#login-view').style.display = 'none';
  $('#app-view').hidden = true;
  $('#recovery-view').hidden = false;
  $('#recovery-title').textContent = mode === 'invite' ? 'השלמת ההזמנה' : 'הגדרת סיסמה חדשה';
  $('#recovery-description').textContent = mode === 'invite'
    ? 'בחרי סיסמה כדי להשלים את ההזמנה ולהיכנס לפורטל.'
    : 'בחרי סיסמה חדשה הכוללת לפחות 10 תווים, אות אחת ומספר אחד.';
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
  if (parts[0] === 'calculators' && ['salary', 'occupancy'].includes(parts[1])) return { section: 'calculators', calculator: parts[1] };
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

function calculatorsTemplate() {
  return `<section class="page-heading"><div><p class="eyebrow">מחשבונים</p><h1>מחשבונים</h1><p>כלי עזר לחישוב ולתכנון על בסיס כללי הארגון הפעילים.</p></div></section><section class="module-grid"><a class="module-card card" href="#calculators/salary"><span class="module-icon">₪</span><div><h3>מחשבון שכר</h3><p>אומדן שכר חודשי לפי כללי השכר הפעילים.</p></div><span class="card-action">פתיחה ←</span></a><a class="module-card card" href="#calculators/occupancy"><span class="module-icon">▦</span><div><h3>תפוסה, תקינה ורווחיות</h3><p>בדיקת הרכב כיתה, שטח, צוות והיתכנות כלכלית.</p></div><span class="card-action">פתיחה ←</span></a></section>`;
}

async function loadOccupancyRules() {
  if (occupancyModel.status === 'loading' || occupancyModel.status === 'ready') return;
  occupancyModel = { status: 'loading', error: '' };
  try {
    const [ages, licensing, rules, categories, parameters, years, daycares, daycareYears, classrooms, capacities, enrollments, months] = await Promise.all([
      rest('age_groups', 'select=age_group_id,age_group_code,display_name,display_order,lifecycle_status&lifecycle_status=eq.ACTIVE&order=display_order'),
      rest('classroom_licensing_rules', 'select=classroom_licensing_rule_id,age_group,sqm_per_child,max_children,allowed_mixed_with,valid_from,valid_to,rounding_method,lifecycle_status&lifecycle_status=eq.ACTIVE'),
      rest('budget_rules', 'select=budget_rule_id,budget_category_id,school_year_id,age_group_id,effective_from,effective_to,numeric_value,lifecycle_status,parameter_1,standard_type&lifecycle_status=eq.ACTIVE'),
      rest('budget_categories', 'select=budget_category_id,budget_category_code,category_type,lifecycle_status&lifecycle_status=eq.ACTIVE'),
      rest('staffing_budget_parameters', 'select=staffing_budget_parameter_id,school_year_id,monthly_hours_per_fte,lifecycle_status&lifecycle_status=eq.ACTIVE'),
      rest('school_years', 'select=school_year_id,display_name,start_date,end_date,is_default,is_selectable'),
      rest('daycares', 'select=daycare_id,display_name,lifecycle_status,display_order&lifecycle_status=eq.ACTIVE&order=display_order'),
      rest('daycare_school_years', 'select=daycare_school_year_id,daycare_id,school_year_id,is_operating,staffing_standard_type'),
      rest('classrooms', 'select=classroom_id,daycare_school_year_id,display_name,licensed_capacity,lifecycle_status,display_order&lifecycle_status=eq.ACTIVE&order=display_order'),
      rest('classroom_capacity_breakdowns', 'select=classroom_id,age_group_id,licensed_capacity,lifecycle_status&lifecycle_status=eq.ACTIVE'),
      rest('monthly_enrollment', 'select=classroom_id,reporting_month,age_group_id,children_count'),
      rest('school_year_months', 'select=school_year_month_id,school_year_id,month_label,start_date,school_year_sequence&order=start_date')
    ]);
    occupancyModel = { status: 'ready', error: '', ages, licensing, rules, categories, parameters, years, daycares, daycareYears, classrooms, capacities, enrollments, months };
  } catch (error) { occupancyModel = { status: 'error', error: error.message }; }
}

function occupancyCalculatorTemplate() {
  return `<section class="page-heading"><div><p class="eyebrow">מחשבונים / תפוסה, תקינה ורווחיות</p><h1>תפוסה, תקינה ורווחיות</h1><p>בדיקת כיתה קיימת או תכנון כיתה חדשה לפי הכללים הפעילים.</p></div><a class="button button-secondary" href="#calculators">חזרה למחשבונים</a></section><div id="occupancy-state" class="state panel">טוען נתוני כיתות וכללים פעילים…</div><section id="occupancy-calculator" class="occupancy-calculator" hidden><form id="occupancy-form" class="panel occupancy-inputs"><fieldset class="mode-switch"><legend>מצב חישוב</legend><label><input type="radio" name="mode" value="existing" checked> כיתה קיימת</label><label><input type="radio" name="mode" value="planning"> כיתה חדשה / תכנון</label></fieldset><div id="occupancy-existing-fields" class="occupancy-fields"><label class="field">מעון<select name="daycareId"></select></label><label class="field">כיתה<select name="classroomId"></select></label><label class="field">חודש<select name="reportingMonth"></select></label></div><div class="occupancy-fields"><label class="field">סוג תקינה<select name="standardType"></select></label><label class="field">שטח כיתה במ״ר<input name="area" type="number" min="0" step="0.1" required></label><label class="field">שכר שעתי — אופציונלי<input name="hourlyWage" type="number" min="0" step="0.01" placeholder="ללא עלות שכר"></label></div><fieldset class="age-composition"><legend>הרכב ילדים</legend><div id="occupancy-age-inputs"></div></fieldset><div class="occupancy-actions"><button class="button button-primary" type="submit">חישוב</button><button class="button button-quiet" type="reset">איפוס</button></div></form><section id="occupancy-results" class="occupancy-results" hidden aria-live="polite"><div class="occupancy-result-heading"><div><h2>תוצאות מאוחדות</h2><p id="occupancy-result-context" class="muted"></p></div><div class="occupancy-actions"><button class="button button-secondary" type="button" data-occupancy-print>הדפסה / PDF</button><button class="button button-secondary" type="button" data-occupancy-csv>CSV</button></div></div><div id="occupancy-summary" class="occupancy-summary"></div><section id="occupancy-financial" class="panel occupancy-financial"></section><section class="panel occupancy-alternatives"><div class="section-heading"><div><h2>חלופות תקינות</h2><p>הרכבים אפשריים העומדים במגבלות הילדים והשטח.</p></div></div><div id="occupancy-alternatives"></div></section></section></section>`;
}

function bindOccupancyCalculator() {
  const form = $('#occupancy-form');
  const model = occupancyModel;
  const ageById = new Map(model.ages.map((age) => [age.age_group_id, age]));
  const ageByCode = new Map(model.ages.map((age) => [age.age_group_code, age]));
  const categoryById = new Map(model.categories.map((item) => [item.budget_category_id, item]));
  const activeYear = model.years.find((year) => year.is_default) || model.years.find((year) => year.is_selectable) || model.years[0];
  const daycareYears = model.daycareYears.filter((row) => row.is_operating && (!activeYear || row.school_year_id === activeYear.school_year_id));
  const daycareYearById = new Map(daycareYears.map((row) => [row.daycare_school_year_id, row]));
  const licensing = model.licensing.map((rule) => ({ ...rule, age_group: rule.age_group }));
  const standardTypes = [...new Set(model.rules.map((rule) => rule.standard_type).filter(Boolean))];
  const numberValue = (name) => Number(form.elements[name]?.value || 0);
  const setOptions = (select, rows, value, label) => { select.innerHTML = rows.map((row) => `<option value="${escapeHtml(value(row))}">${escapeHtml(label(row))}</option>`).join(''); };
  setOptions(form.elements.daycareId, model.daycares.filter((daycare) => daycareYears.some((row) => row.daycare_id === daycare.daycare_id)), (row) => row.daycare_id, (row) => row.display_name);
  setOptions(form.elements.standardType, standardTypes, (row) => row, (row) => row === 'EXTENDED' ? 'מורחבת' : row === 'BASIC' ? 'בסיסית' : row);
  $('#occupancy-age-inputs').innerHTML = model.ages.map((age) => `<label class="field">${escapeHtml(age.display_name)}<input name="age_${escapeHtml(age.age_group_code)}" type="number" min="0" step="1" value="0"></label>`).join('');
  const updateClassrooms = () => {
    const yearIds = daycareYears.filter((row) => row.daycare_id === form.elements.daycareId.value).map((row) => row.daycare_school_year_id);
    const rows = model.classrooms.filter((row) => yearIds.includes(row.daycare_school_year_id));
    setOptions(form.elements.classroomId, rows, (row) => row.classroom_id, (row) => row.display_name);
    updateMonths();
  };
  const updateMonths = () => {
    const classroom = model.classrooms.find((row) => row.classroom_id === form.elements.classroomId.value);
    const yearId = daycareYearById.get(classroom?.daycare_school_year_id)?.school_year_id;
    const rows = model.months.filter((row) => !yearId || row.school_year_id === yearId);
    setOptions(form.elements.reportingMonth, rows, (row) => row.start_date, (row) => row.month_label);
    loadExistingComposition();
  };
  const loadExistingComposition = () => {
    if (form.elements.mode.value !== 'existing') return;
    const rows = model.enrollments.filter((row) => row.classroom_id === form.elements.classroomId.value && row.reporting_month === form.elements.reportingMonth.value);
    model.ages.forEach((age) => { form.elements[`age_${age.age_group_code}`].value = rows.find((row) => row.age_group_id === age.age_group_id)?.children_count || 0; });
    const classroom = model.classrooms.find((row) => row.classroom_id === form.elements.classroomId.value);
    const setting = daycareYearById.get(classroom?.daycare_school_year_id);
    if (setting?.staffing_standard_type && standardTypes.includes(setting.staffing_standard_type)) form.elements.standardType.value = setting.staffing_standard_type;
  };
  const inputs = (composition = null) => {
    const selected = composition || Object.fromEntries(model.ages.map((age) => [age.age_group_code, numberValue(`age_${age.age_group_code}`)]));
    const ageIdByCode = new Map(model.ages.map((age) => [age.age_group_code, age.age_group_id]));
    const standardType = form.elements.standardType.value;
    const rules = model.rules.filter((rule) => rule.standard_type === standardType && rule.parameter_1 != null).map((rule) => ({ ...rule, age_group: ageById.get(rule.age_group_id)?.age_group_code }));
    const tuition = model.rules.filter((rule) => categoryById.get(rule.budget_category_id)?.category_type === 'INCOME' && rule.numeric_value != null).map((rule) => ({ ...rule, age_group: ageById.get(rule.age_group_id)?.age_group_code }));
    const hours = model.parameters.find((row) => !activeYear || row.school_year_id === activeYear.school_year_id)?.monthly_hours_per_fte || 0;
    return { composition: selected, area: numberValue('area'), standardType, hourlyWage: form.elements.hourlyWage.value, budgetRules: rules, licensingRules: licensing, tuitionRules: tuition, monthlyOperatingHours: hours, ageIdByCode };
  };
  const alternatives = (base) => {
    const rows = [];
    for (const license of licensing) {
      for (let count = 1; count <= Number(license.max_children || 0); count += 1) {
        const result = calculateOccupancyModel(inputs({ [license.age_group]: count }));
        if (result.compliant) rows.push(result);
      }
    }
    return rows.sort((a, b) => b.efficiencyScore - a.efficiencyScore || b.revenue - a.revenue).filter((row, index, all) => index === all.findIndex((item) => JSON.stringify(item.details.map((d) => [d.age,d.children])) === JSON.stringify(row.details.map((d) => [d.age,d.children])))).slice(0, 6);
  };
  let current = null;
  const summaryCard = (label, value, ok, note) => `<article class="occupancy-metric ${ok ? 'status-good' : 'status-exception'}"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
  const renderResult = (event) => {
    event?.preventDefault();
    if (!form.reportValidity()) return;
    const request = inputs();
    current = { request, result: calculateOccupancyModel(request) };
    const result = current.result;
    const childrenOk = result.validMix && result.children <= result.allowedChildren;
    const sqmOk = Number(request.area) >= Math.floor(result.requiredSqm);
    $('#occupancy-summary').innerHTML = [summaryCard('תקינת ילדים', childrenOk ? 'תקין' : 'לא תקין', childrenOk, `${number.format(result.children)} מתוך ${number.format(result.allowedChildren)}`), summaryCard('תקינת שטח', sqmOk ? 'תקין' : 'לא תקין', sqmOk, `${number.format(result.requiredSqm)} מ״ר נדרשים`), summaryCard('צוות נדרש', result.requiredStaff == null ? 'חסר כלל' : number.format(result.requiredStaff), result.requiredStaff != null, `${number.format(result.staffingHours || 0)} שעות חודשיות`), summaryCard('הכנסה', money.format(result.revenue), result.revenue > 0, 'לפי כללי שכר לימוד פעילים'), summaryCard('יעילות', result.efficiencyScore == null ? '—' : `${number.format(result.efficiencyScore)}%`, result.efficiencyScore != null, result.revenuePerStaffingHour == null ? 'לפי ניצול קיבולת' : `${money.format(result.revenuePerStaffingHour)} לשעת צוות`)].join('');
    $('#occupancy-financial').innerHTML = result.payrollCost == null ? '<h2>יעילות תפעולית</h2><p>לא הוזן שכר שעתי. מוצגים מדדי יעילות ללא אומדן עלות שכר.</p>' : `<h2>רווחיות משוערת</h2><div><span>עלות שכר<strong>${money.format(result.payrollCost)}</strong></span><span>עודף<strong>${money.format(result.surplus)}</strong></span><span>שיעור עודף<strong>${number.format(result.surplusPercent)}%</strong></span></div>`;
    const candidates = alternatives(result);
    $('#occupancy-alternatives').innerHTML = candidates.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>הרכב</th><th>ילדים</th><th>שטח נדרש</th><th>צוות</th><th>הכנסה</th><th>יעילות</th></tr></thead><tbody>${candidates.map((row) => `<tr><td>${row.details.map((detail) => `${escapeHtml(ageByCode.get(detail.age)?.display_name || detail.age)}: ${number.format(detail.children)}`).join(', ')}</td><td>${number.format(row.children)}</td><td>${number.format(row.requiredSqm)} מ״ר</td><td>${number.format(row.requiredStaff)}</td><td>${money.format(row.revenue)}</td><td>${number.format(row.efficiencyScore)}%</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state compact">לא נמצאו חלופות תקינות לפי השטח והכללים שנבחרו.</div>';
    $('#occupancy-result-context').textContent = form.elements.mode.value === 'existing' ? `${form.elements.daycareId.selectedOptions[0]?.textContent || ''} · ${form.elements.classroomId.selectedOptions[0]?.textContent || ''} · ${form.elements.reportingMonth.selectedOptions[0]?.textContent || ''}` : 'תרחיש תכנון לכיתה חדשה';
    $('#occupancy-results').hidden = false;
  };
  form.addEventListener('submit', renderResult);
  form.elements.daycareId.addEventListener('change', updateClassrooms);
  form.elements.classroomId.addEventListener('change', updateMonths);
  form.elements.reportingMonth.addEventListener('change', loadExistingComposition);
  form.addEventListener('change', (event) => { if (event.target.name === 'mode') { const existing = event.target.value === 'existing'; $('#occupancy-existing-fields').hidden = !existing; model.ages.forEach((age) => { form.elements[`age_${age.age_group_code}`].readOnly = existing; }); if (existing) loadExistingComposition(); else model.ages.forEach((age) => { form.elements[`age_${age.age_group_code}`].value = 0; }); } });
  form.addEventListener('reset', () => setTimeout(() => { $('#occupancy-results').hidden = true; updateClassrooms(); }));
  $('[data-occupancy-print]').addEventListener('click', () => window.print());
  $('[data-occupancy-csv]').addEventListener('click', () => { if (!current) return; const r = current.result; const rows = [['מדד','ערך'],['ילדים',r.children],['קיבולת ילדים',r.allowedChildren],['שטח נדרש',r.requiredSqm],['צוות נדרש',r.requiredStaff],['הכנסה',r.revenue],['עלות שכר',r.payrollCost ?? ''],['עודף',r.surplus ?? ''],['שיעור עודף',r.surplusPercent ?? ''],['יעילות',r.efficiencyScore ?? '']]; const blob = new Blob(['\uFEFF' + rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"','""')}"`).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'occupancy-calculator.csv'; link.click(); URL.revokeObjectURL(link.href); });
  updateClassrooms();
  model.ages.forEach((age) => { form.elements[`age_${age.age_group_code}`].readOnly = true; });
  $('#occupancy-state').hidden = true;
  $('#occupancy-calculator').hidden = false;
}

function unifiedOccupancyCalculatorTemplate() {
  return `<section class="page-heading"><div><p class="eyebrow">מחשבונים / תפוסה, תקינה ורווחיות</p><h1>תפוסה, תקינה ורווחיות</h1><p>מחשבון אחד לתכנון ולבדיקת כיתה לפי הכללים הפעילים במערכת.</p></div><a class="button button-secondary" href="#calculators">חזרה למחשבונים</a></section><div id="occupancy-state" class="state panel">טוען כללים פעילים…</div><section id="occupancy-calculator" class="occupancy-calculator" hidden><form id="occupancy-form" class="panel occupancy-inputs"><div class="occupancy-fields"><label class="field">קבוצת גיל לחישוב לפי שטח<select name="capacityAge"></select></label><label class="field">סוג תקינה<select name="standardType"></select></label><label class="field">שטח כיתה במ״ר — אופציונלי<input name="area" type="number" min="0" step="0.1" placeholder="אפשר לחשב לפי ילדים בלבד"></label><label class="field">שכר שעתי — אופציונלי<input name="hourlyWage" type="number" min="0" step="0.01" placeholder="ללא אומדן עלות שכר"></label></div><fieldset class="age-composition"><legend>הרכב ילדים — אופציונלי בחישוב לפי שטח</legend><div id="occupancy-age-inputs"></div></fieldset><div id="occupancy-guidance" class="occupancy-guidance" role="status"></div><div class="occupancy-actions"><button class="button button-primary" type="submit">חישוב</button><button class="button button-quiet" type="reset">איפוס</button></div></form><section id="occupancy-results" class="occupancy-results" hidden aria-live="polite"><div class="occupancy-result-heading"><div><h2>תוצאות</h2><p id="occupancy-result-context" class="muted"></p></div><div class="occupancy-actions"><button class="button button-secondary" type="button" data-occupancy-print>הדפסה / PDF</button><button class="button button-secondary" type="button" data-occupancy-csv>CSV</button></div></div><section id="occupancy-overall" class="panel occupancy-overall"></section><div id="occupancy-summary" class="occupancy-summary"></div><section id="occupancy-recommendation" class="panel occupancy-recommendation"></section><section class="panel occupancy-alternatives"><div class="section-heading"><div><h2>חלופות חוקיות</h2><p>חלופות המבוססות על כללי הרישוי, השטח והתקינה הפעילים.</p></div></div><div id="occupancy-alternatives"></div></section></section></section>`;
}

function bindUnifiedOccupancyCalculator() {
  const form = $('#occupancy-form');
  const model = occupancyModel;
  const ageById = new Map(model.ages.map((age) => [age.age_group_id, age]));
  const ageByCode = new Map(model.ages.map((age) => [age.age_group_code, age]));
  const categoryById = new Map(model.categories.map((item) => [item.budget_category_id, item]));
  const activeYear = model.years.find((year) => year.is_default) || model.years.find((year) => year.is_selectable) || model.years[0];
  const licensing = model.licensing.map((rule) => ({ ...rule, age_group: rule.age_group }));
  const standardTypes = [...new Set(model.rules.map((rule) => rule.standard_type).filter(Boolean))];
  const numberValue = (name) => Number(form.elements[name]?.value || 0);
  const options = (rows, value, label) => rows.map((row) => `<option value="${escapeHtml(value(row))}">${escapeHtml(label(row))}</option>`).join('');
  form.elements.capacityAge.innerHTML = options(model.ages, (row) => row.age_group_code, (row) => row.display_name);
  form.elements.standardType.innerHTML = options(standardTypes, (row) => row, (row) => row === 'EXTENDED' ? 'מורחבת' : row === 'BASIC' ? 'בסיסית' : row);
  $('#occupancy-age-inputs').innerHTML = model.ages.map((age) => `<label class="field">${escapeHtml(age.display_name)}<input name="age_${escapeHtml(age.age_group_code)}" type="number" min="0" step="1" value="0"></label>`).join('');
  const request = (composition = null) => {
    const standardType = form.elements.standardType.value;
    const budgetRules = model.rules.filter((rule) => rule.standard_type === standardType && rule.parameter_1 != null).map((rule) => ({ ...rule, age_group: ageById.get(rule.age_group_id)?.age_group_code }));
    const tuitionRules = model.rules.filter((rule) => categoryById.get(rule.budget_category_id)?.category_type === 'INCOME' && rule.numeric_value != null).map((rule) => ({ ...rule, age_group: ageById.get(rule.age_group_id)?.age_group_code }));
    const monthlyOperatingHours = model.parameters.find((row) => !activeYear || row.school_year_id === activeYear.school_year_id)?.monthly_hours_per_fte || 0;
    return { composition: composition || Object.fromEntries(model.ages.map((age) => [age.age_group_code, numberValue(`age_${age.age_group_code}`)])), area: numberValue('area'), capacityAge: form.elements.capacityAge.value, standardType, hourlyWage: form.elements.hourlyWage.value, budgetRules, licensingRules: licensing, tuitionRules, monthlyOperatingHours };
  };
  let firstInputKind = '';
  const guidance = () => {
    const children = model.ages.reduce((sum, age) => sum + numberValue(`age_${age.age_group_code}`), 0);
    const area = numberValue('area');
    $('#occupancy-guidance').textContent = area && children && firstInputKind === 'area' ? 'התחלת בשטח: נחשב את קיבולת הילדים ונבדוק את המספר שהוזן.' : area && children && firstInputKind === 'children' ? 'התחלת בילדים: נחשב את השטח הנדרש ונבדוק את השטח שהוזן.' : area ? 'התחלת בשטח: מספר הילדים יחושב לפי קבוצת הגיל והכלל הפעיל.' : children ? 'התחלת בילדים: השטח הנדרש יחושב לפי הרכב הכיתה והכללים הפעילים.' : 'הזינו שטח או מספר ילדים כדי להתחיל.';
  };
  const signed = (value, suffix = '') => `${value > 0 ? '+' : ''}${number.format(value)}${suffix}`;
  const metric = ({ label, ok, required, actual, difference, explanation, issue }) => `<article class="occupancy-metric ${ok ? 'status-good' : 'status-exception'}"><header><h3>${label}</h3><strong>${ok ? '🟢 תקין' : '🔴 לא תקין'}</strong></header><dl><div><dt>נדרש</dt><dd>${required}</dd></div><div><dt>בפועל</dt><dd>${actual}</dd></div><div><dt>הפרש</dt><dd>${difference}</dd></div></dl>${!ok && issue ? `<p class="occupancy-exception-reason">${issue}</p>` : ''}<details><summary>הסבר החישוב</summary><p>${explanation}</p></details></article>`;
  let current = null;
  const legalAlternatives = () => licensing.map((license) => {
    const base = request(numberValue('area') ? {} : { [license.age_group]: Number(license.max_children || 0) });
    return calculateOccupancyModel({ ...base, capacityAge: license.age_group });
  }).filter((row) => row.compliant).sort((a, b) => b.revenue - a.revenue || b.efficiencyScore - a.efficiencyScore).slice(0, 6);
  const render = (event = null) => {
    event?.preventDefault();
    if (event && !form.reportValidity()) return;
    const calculationRequest = request();
    if (!calculationRequest.area && !Object.values(calculationRequest.composition).some(Number)) { guidance(); return; }
    const result = calculateOccupancyModel(calculationRequest);
    current = { request: calculationRequest, result };
    const composition = result.details.map((detail) => `${escapeHtml(ageByCode.get(detail.age)?.display_name || detail.age)}: ${number.format(detail.children)}`).join(', ');
    const childExcess = result.details.filter((detail) => detail.children > detail.maxChildren).map((detail) => `${escapeHtml(ageByCode.get(detail.age)?.display_name || detail.age)}: ${number.format(detail.children - detail.maxChildren)} ילדים מעל המותר`).join('; ');
    const metrics = [
      { label: 'תקינת ילדים', ok: result.childrenCompliant, required: `עד ${number.format(result.allowedChildren)}`, actual: number.format(result.children), difference: signed(result.remainingChildren), issue: childExcess || 'מספר הילדים חורג מהקיבולת המותרת.', explanation: 'המספר בפועל נבדק מול הקיבולת הפעילה לכל קבוצת גיל.' },
      { label: 'תקינת שטח', ok: result.areaCompliant, required: `${number.format(result.requiredSqm)} מ״ר`, actual: `${number.format(result.actualSqm)} מ״ר${calculationRequest.area ? '' : ' (מחושב)'}`, difference: signed(result.remainingSqm, ' מ״ר'), issue: `חסרים ${number.format(Math.abs(result.remainingSqm))} מ״ר כדי לעמוד בדרישה.`, explanation: 'השטח הנדרש הוא סכום הילדים בכל קבוצת גיל כפול מ״ר לילד לפי כלל הרישוי הפעיל.' },
      { label: 'תקינת הרכב כיתה', ok: result.compositionCompliant, required: 'הרכב גילאים מורשה', actual: composition || 'לא הוזן', difference: result.compositionCompliant ? '0 חריגות' : '1- חריגה', issue: 'שילוב קבוצות הגיל שהוזן אינו מאושר לכיתה משותפת.', explanation: 'שילוב קבוצות הגיל נבדק מול כללי הרישוי הפעילים.' },
      { label: 'צוות נדרש', ok: result.requiredStaff != null, required: result.requiredStaff == null ? 'כלל פעיל' : number.format(result.requiredStaff), actual: result.requiredStaff == null ? 'לא ניתן לחשב' : number.format(result.requiredStaff), difference: result.requiredStaff == null ? 'חסר כלל' : '0', explanation: 'סכום יחסי התקינה לפי קבוצת גיל מעוגל באמצעות מנגנון התקינה הקנוני.' },
      { label: 'הכנסה', ok: result.revenue > 0, required: 'כללי שכר לימוד פעילים', actual: money.format(result.revenue), difference: '—', explanation: 'מספר הילדים בכל קבוצת גיל מוכפל בכלל ההכנסה הפעיל שלה.' },
      { label: 'יעילות', ok: result.efficiencyScore != null, required: 'עד 100%', actual: result.efficiencyScore == null ? '—' : `${number.format(result.efficiencyScore)}%`, difference: result.efficiencyScore == null ? '—' : signed(result.efficiencyScore - 100, '%'), explanation: 'שיעור הילדים בפועל מתוך קיבולת הילדים החוקית.' },
      { label: 'עלות שכר אופציונלית', ok: result.payrollCost == null || result.payrollCost <= result.revenue, required: result.payrollCost == null ? 'לא נדרש לחישוב' : `עד ${money.format(result.revenue)}`, actual: result.payrollCost == null ? 'לא הוזן שכר שעתי' : money.format(result.payrollCost), difference: result.payrollCost == null ? '—' : money.format(result.revenue - result.payrollCost), explanation: 'צוות נדרש כפול שעות הפעלה חודשיות כפול השכר השעתי שהוזן.' },
      { label: 'יתרה משוערת', ok: result.surplus == null || result.surplus >= 0, required: '0 ₪ ומעלה', actual: money.format(result.surplus ?? result.revenue), difference: money.format(result.surplus ?? result.revenue), explanation: result.surplus == null ? 'ללא שכר שעתי מוצגת ההכנסה לפני עלות שכר.' : 'הכנסה פחות אומדן עלות השכר בלבד.' }
    ];
    $('#occupancy-overall').className = `panel occupancy-overall ${result.compliant ? 'status-good' : 'status-exception'}`;
    const validationFailures = [result.childrenCompliant, result.areaCompliant, result.compositionCompliant].filter((ok) => !ok).length;
    $('#occupancy-overall').innerHTML = `<span>סטטוס כללי</span><strong>${result.compliant ? '🟢 תקין' : '🔴 לא תקין'}</strong><dl><div><dt>נדרש</dt><dd>3 מתוך 3 בדיקות תקינות</dd></div><div><dt>בפועל</dt><dd>${3 - validationFailures} מתוך 3 תקינות</dd></div><div><dt>הפרש</dt><dd>${validationFailures} חריגות</dd></div></dl>${validationFailures ? '<p class="occupancy-exception-reason">יש לטפל בחריגות המסומנות באדום לפני אישור הכיתה.</p>' : ''}`;
    $('#occupancy-summary').innerHTML = metrics.map(metric).join('');
    const factorLabels = { composition: 'הרכב הכיתה', children: 'קיבולת הילדים', area: 'שטח הכיתה' };
    const recommendation = !result.compositionCompliant ? 'יש לבחור הרכב גילאים המותר לפי כללי הרישוי.' : !result.childrenCompliant ? 'יש להפחית ילדים או לבחור חלופה חוקית בעלת קיבולת מתאימה.' : !result.areaCompliant ? `נדרשים עוד ${number.format(Math.abs(result.remainingSqm))} מ״ר לפחות.` : result.surplus != null && result.surplus < 0 ? 'הכיתה תקינה, אך אומדן עלות השכר גבוה מההכנסה.' : 'הכיתה עומדת בבדיקות. אפשר להשוות לחלופות החוקיות לפני החלטה.';
    $('#occupancy-recommendation').innerHTML = `<div><span>גורם מגביל</span><strong>${factorLabels[result.limitingFactor] || 'קיבולת הילדים'}</strong></div><div><span>המלצה</span><strong>${recommendation}</strong></div><details><summary>הסבר ההמלצה</summary><p>ההמלצה נקבעת לפי חריגות בהרכב, בקיבולת ובשטח, ולאחר מכן לפי אומדן היתרה.</p></details>`;
    const candidates = legalAlternatives();
    $('#occupancy-alternatives').innerHTML = candidates.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>הרכב</th><th>ילדים</th><th>שטח נדרש</th><th>צוות</th><th>הכנסה</th><th>יעילות</th></tr></thead><tbody>${candidates.map((row) => `<tr><td>${row.details.map((detail) => `${escapeHtml(ageByCode.get(detail.age)?.display_name || detail.age)}: ${number.format(detail.children)}`).join(', ')}</td><td>${number.format(row.children)}</td><td>${number.format(row.requiredSqm)} מ״ר</td><td>${number.format(row.requiredStaff)}</td><td>${money.format(row.revenue)}</td><td>${number.format(row.efficiencyScore)}%</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state compact">לא נמצאו חלופות חוקיות לפי הכללים הפעילים.</div>';
    $('#occupancy-result-context').textContent = result.inputMethod === 'area-to-children' ? 'חישוב מ״ר ← ילדים' : result.inputMethod === 'children-to-area' ? 'חישוב ילדים ← מ״ר' : 'בדיקת שטח ומספר ילדים';
    $('#occupancy-results').hidden = false;
  };
  form.addEventListener('submit', render);
  form.addEventListener('input', (event) => {
    if (!firstInputKind && Number(event.target.value) > 0) firstInputKind = event.target.name === 'area' ? 'area' : event.target.name?.startsWith('age_') ? 'children' : '';
    guidance();
    const calculationRequest = request();
    if (calculationRequest.area || Object.values(calculationRequest.composition).some(Number)) render();
    else { current = null; $('#occupancy-results').hidden = true; }
  });
  form.addEventListener('change', () => { if (current) render(); });
  form.addEventListener('reset', () => setTimeout(() => { firstInputKind = ''; current = null; $('#occupancy-results').hidden = true; guidance(); }));
  $('[data-occupancy-print]').addEventListener('click', () => window.print());
  $('[data-occupancy-csv]').addEventListener('click', () => { if (!current) return; const r = current.result; const rows = [['מדד','נדרש','בפועל','הפרש'],['סטטוס כללי','תקין',r.compliant ? 'תקין' : 'לא תקין',''],['ילדים',r.allowedChildren,r.children,r.remainingChildren],['שטח',r.requiredSqm,r.actualSqm,r.remainingSqm],['הרכב','חוקי',r.compositionCompliant ? 'חוקי' : 'לא חוקי',''],['צוות',r.requiredStaff,r.requiredStaff,0],['הכנסה','כלל פעיל',r.revenue,''],['יעילות',100,r.efficiencyScore,(r.efficiencyScore ?? 100)-100],['עלות שכר','אופציונלי',r.payrollCost ?? '',''],['יתרה','0 ומעלה',r.surplus ?? r.revenue,r.surplus ?? r.revenue],['גורם מגביל','',r.limitingFactor,'']]; const blob = new Blob(['\uFEFF' + rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"','""')}"`).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'occupancy-calculator.csv'; link.click(); URL.revokeObjectURL(link.href); });
  guidance();
  $('#occupancy-state').hidden = true;
  $('#occupancy-calculator').hidden = false;
}

async function loadSalaryRules() {
  if (salaryModel.status === 'loading' || salaryModel.status === 'ready') return;
  salaryModel.status = 'loading';
  try {
    const [factors, rules, years] = await Promise.all([
      rest('compensation_factors', 'select=compensation_factor_id,compensation_factor_code,display_name,value_type,lifecycle_status,display_order&lifecycle_status=eq.ACTIVE&order=display_order'),
      rest('compensation_rules', 'select=compensation_rule_id,compensation_factor_id,school_year_id,effective_from,effective_to,minimum_seniority_months,maximum_seniority_months,amount,eligibility_condition,proration_method,lifecycle_status&lifecycle_status=eq.ACTIVE'),
      rest('school_years', 'select=school_year_id,school_year_code,display_name,start_date,end_date,is_default,is_selectable&is_selectable=eq.true')
    ]);
    salaryModel = { status: 'ready', factors, rules, years, error: '' };
  } catch (error) { salaryModel = { status: 'error', factors: [], rules: [], years: [], error: error.message }; }
}

function salaryCalculatorTemplate() {
  return `<section class="page-heading"><div><p class="eyebrow">מחשבונים / מחשבון שכר</p><h1>מחשבון שכר</h1><p>החישוב מבוסס על כללי שכר פעילים בלבד.</p></div><a class="button button-secondary" href="#calculators">חזרה למחשבונים</a></section><div id="salary-state" class="state panel">טוען כללי שכר פעילים…</div><section id="salary-calculator" class="salary-calculator" hidden><form id="salary-form" class="panel salary-inputs"><label class="field">תעריף שעתי<input name="hourlyRate" type="number" min="0" step="0.01" value="50" required></label><label class="field">שעות חודשיות<input name="monthlyHours" type="number" min="1" step="0.5" value="160" required></label><label class="field">וותק מוכר (חודשים)<input name="seniorityMonths" type="number" min="0" step="1" value="0" required></label><label class="field">אחראית כיתה<select name="classManager"><option value="true">כן</option><option value="false" selected>לא</option></select></label><label class="field">תעודה<select name="certificate"><option value="YES">כן</option><option value="COMMITMENT">התחייבות</option><option value="NO">לא</option></select></label><label class="field">תואר<select name="degree"><option value="true">כן</option><option value="false">לא</option></select></label><label class="field">מצוינות<select name="excellence"><option value="true">כן</option><option value="false">לא</option></select></label><label class="field">נסיעות<select name="travel"><option value="true">כן</option><option value="false">לא</option></select></label><p class="salary-havraa-note">החישוב מניח זכאות להבראה בשנה הראשונה (5 ימים), ללא תלות בוותק המוכר.</p><div class="salary-actions"><button class="button button-quiet" type="reset">איפוס</button><button class="button button-secondary" type="button" data-salary-print>הדפסה</button></div></form><section class="salary-results"><div class="salary-summary"><article><span>ברוטו חודשי</span><strong id="salary-gross">—</strong></article><article><span>עלות אפקטיבית לשעה</span><strong id="salary-effective">—</strong></article><article><span>נטו משוער</span><strong id="salary-net">—</strong></article></div><div class="panel salary-breakdown"><h2>פירוט חישוב</h2><p id="salary-certificate-note" class="muted"></p><div id="salary-components"></div></div><section class="panel salary-comparison"><div><h2>השוואת תרחישים A / B</h2><p>שמרי את התרחיש הנוכחי, עדכני ערכים והשווי.</p></div><div><button class="button button-secondary" type="button" data-scenario="A">שמירת תרחיש A</button><button class="button button-secondary" type="button" data-scenario="B">שמירת תרחיש B</button></div><div id="salary-scenarios"></div></section></section></section>`;
}

function bindSalaryCalculator() {
  const form = $('#salary-form'); let scenarios = {};
  const update = () => { const values = Object.fromEntries(new FormData(form)); const input = { ...values, hourlyRate: Number(values.hourlyRate), monthlyHours: Number(values.monthlyHours), seniorityMonths: Number(values.seniorityMonths), degree: values.degree === 'true', excellence: values.excellence === 'true', travel: values.travel === 'true' }; const result = calculateSalary(input, salaryModel.factors, salaryModel.rules, salaryModel.years); if (result.issues.length) { $('#salary-state').hidden = false; $('#salary-state').className = 'state error panel'; $('#salary-state').textContent = result.issues.join(' '); $('#salary-calculator').hidden = true; return null; } $('#salary-state').hidden = true; $('#salary-calculator').hidden = false; $('#salary-gross').textContent = money.format(result.gross); $('#salary-effective').textContent = money.format(result.effectiveHourly); $('#salary-net').textContent = `${money.format(result.netMin)}–${money.format(result.netMax)}`; $('#salary-certificate-note').textContent = input.certificate === 'COMMITMENT' ? 'תוספת התעודה חושבה לפי כלל ההתחייבות הפעיל.' : 'הסכומים מחושבים לפי הכללים הפעילים בשנת הלימודים שנבחרה.'; $('#salary-components').innerHTML = result.components.map((item) => `<div class="salary-component"><span>${escapeHtml(item.name)}</span><strong>${money.format(item.amount)}</strong></div>`).join(''); return { input, result }; };
  form.addEventListener('input', update); form.addEventListener('change', update); form.addEventListener('reset', () => setTimeout(update)); $('[data-salary-print]').addEventListener('click', () => window.print()); document.querySelectorAll('[data-scenario]').forEach((button) => button.addEventListener('click', () => { const current = update(); if (!current) return; scenarios[button.dataset.scenario] = current; const rows = Object.entries(scenarios).map(([key, value]) => `<div><strong>תרחיש ${key}</strong><span>${money.format(value.result.gross)}</span><small>${money.format(value.result.effectiveHourly)} לשעה</small></div>`); if (scenarios.A && scenarios.B) rows.push(`<div><strong>פער</strong><span>${money.format(scenarios.B.result.gross - scenarios.A.result.gross)}</span></div>`); $('#salary-scenarios').innerHTML = rows.join(''); })); update();
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
  const details = [['attention','טיפול מיידי'],['licensing','רישוי ותעודות'],['missing','נתוני עובד חסרים'],['workforce','ניתוח כוח אדם'],['comparison','השוואת מעונות'],['employees','רשימת עובדים']];
  return `<section class="financial-heading"><div><p class="eyebrow">צוות ורישוי</p><h1>דשבורד צוות ורישוי · ${escapeHtml(unit.display_name)}</h1><p>בקרת תוקף, שלמות נתונים ופעולות נדרשות עבור העובדים.</p></div><div class="dashboard-context"><span><small>יחידת הקצאה</small><strong>${escapeHtml(unit.display_name)}</strong></span></div></section>
  <section class="global-toolbar panel"><button id="refresh-dashboard" class="button button-secondary" type="button">↻ רענון נתונים</button><span class="last-updated"><small>עודכן לאחרונה</small><strong id="last-updated">טרם עודכן</strong></span><div class="toolbar-actions"><button class="button button-quiet" type="button" data-export="print">הדפסה</button><button class="button button-quiet" type="button" data-export="pdf">PDF</button><button class="button button-quiet" type="button" data-export="excel">Excel</button></div></section>
  <div id="general-state" class="dashboard-skeleton" aria-live="polite">${Array.from({ length: 8 }, () => '<span></span>').join('')}</div><div id="general-dashboard" hidden><section class="period-panel panel"><div><h2>תמונת מצב תפעולית</h2><p>המדדים מציגים עובדים פעילים והנושאים המחייבים טיפול.</p></div></section><section id="kpis" class="financial-kpis" aria-label="מדדי צוות ורישוי"></section><section id="staff-daycare-summary" class="staff-daycare-summary panel" hidden><div class="section-heading"><div><p class="eyebrow">מצב המעונות</p><h2>תמונת מצב לפי מעון</h2></div></div><div id="staff-daycare-grid" class="staff-daycare-grid"></div></section><section class="staff-filters panel" aria-label="סינון עובדים"><label>חיפוש עובד<input id="staff-search" type="search" placeholder="שם, מעון או תפקיד"></label><label>מצב<select id="staff-status-filter"><option value="all">כל המצבים</option><option value="good">תקין</option><option value="warning">דורש מעקב</option><option value="exception">דורש טיפול</option></select></label><label id="staff-daycare-filter-wrap">מעון<select id="staff-daycare-filter"><option value="all">כל המעונות</option></select></label></section><section class="expandable-sections">${details.map(([id,label]) => `<details class="dashboard-detail panel"><summary>${label}<span>פתיחת פירוט</span></summary><div id="detail-${id}" class="detail-content"></div></details>`).join('')}</section></div><aside id="kpi-panel" class="kpi-panel" hidden aria-labelledby="kpi-panel-title"><button id="close-kpi-panel" class="icon-button" type="button" aria-label="סגירה">×</button><p class="eyebrow">מרכז מידע</p><h2 id="kpi-panel-title"></h2><p id="kpi-filters" class="kpi-context"></p><div class="info-tabs" role="tablist">${[['explanation','הסבר'],['calculation','חישוב עסקי'],['details','פירוט'],['source','נתוני מקור'],['actions','פעולות']].map(([id,label], index) => `<button type="button" role="tab" data-info-tab="${id}" aria-selected="${index === 0}">${label}</button>`).join('')}</div><section class="info-tab-panel" data-info-panel="explanation"><p id="kpi-description"></p></section><section class="info-tab-panel" data-info-panel="calculation" hidden><p id="kpi-calculation"></p></section><section class="info-tab-panel" data-info-panel="details" hidden><div id="kpi-details" class="source-records"></div></section><section class="info-tab-panel" data-info-panel="source" hidden><p id="kpi-source" class="source-note"></p><div id="kpi-records" class="source-records"></div></section><section class="info-tab-panel" data-info-panel="actions" hidden><div class="info-actions"><button class="button button-secondary" type="button" data-info-action="print">הדפסה</button><button class="button button-secondary" type="button" data-info-action="pdf">ייצוא PDF</button><button class="button button-secondary" type="button" data-info-action="excel">ייצוא Excel</button></div></section></aside><aside id="staff-record-panel" class="staff-record-panel" hidden aria-label="פרטי עובד"><button id="close-staff-record" class="icon-button" type="button" aria-label="סגירת פרטי עובד">×</button><div id="staff-record-content"></div></aside><button id="kpi-backdrop" class="kpi-backdrop" type="button" hidden></button><div id="export-message" class="toast" hidden></div>`;
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

const staffStatusLabels = { good: 'תקין', warning: 'דורש מעקב', exception: 'דורש טיפול', neutral: 'ללא נתונים' };
const staffBadgeClass = (status) => ({ good: 'success', warning: 'warning', exception: 'danger', neutral: 'neutral' }[status] || 'neutral');
function staffIssues(person) {
  const issues = [];
  if (person.firstAid !== 'good') issues.push({ label: person.firstAid === 'warning' ? 'עזרה ראשונה קרובה לפקיעה' : 'עזרה ראשונה חסרה או פגה', status: person.firstAid });
  if (person.safe !== 'good') issues.push({ label: person.safe === 'warning' ? 'התנהגות בטוחה קרובה לפקיעה' : 'התנהגות בטוחה חסרה או פגה', status: person.safe });
  person.missing.forEach((label) => issues.push({ label: `חסר: ${label}`, status: 'exception' }));
  return issues;
}
function staffReadableRow(person) {
  return { עובד: `${person.employee.first_name || ''} ${person.employee.last_name || ''}`.trim() || 'עובד ללא שם', מעון: person.daycare?.display_name || 'לא שויך', תפקיד: person.role?.display_name || 'לא הוגדר', מצב: staffStatusLabels[person.overall], 'עזרה ראשונה': person.term?.first_aid_valid_until || 'חסר', 'התנהגות בטוחה': person.term?.safe_conduct_valid_until || 'חסר', 'תעודת מטפלת': person.term?.caregiver_certificate_status || 'חסר', 'נושאים לטיפול': staffIssues(person).map((item) => item.label).join(', ') || 'אין', __status: person.overall };
}
function staffRecordHtml(person) {
  const value = (item, formatter = String) => item === null || item === undefined || item === '' ? 'לא הוזן' : formatter(item);
  const issueGroups = ['exception', 'warning'].map((status) => ({ status, items: staffIssues(person).filter((item) => item.status === status) })).filter((group) => group.items.length);
  const history = staffModel.terms.filter((item) => item.employee_id === person.employee.employee_id && item !== person.term).sort((a, b) => String(b.valid_from).localeCompare(String(a.valid_from)));
  const schedule = person.term?.weekly_schedule && typeof person.term.weekly_schedule === 'object' ? Object.entries(person.term.weekly_schedule).map(([day, value]) => `<li><span>${escapeHtml(day)}</span><b>${value ? 'מוגדר' : 'לא מוגדר'}</b></li>`).join('') : '<li>לא הוזן לוח שבועי</li>';
  return `<p class="eyebrow">פרטים מלאים</p><h2>${escapeHtml(`${person.employee.first_name || ''} ${person.employee.last_name || ''}`.trim() || 'עובד ללא שם')}</h2><span class="status-badge status-${staffBadgeClass(person.overall)}">${staffStatusLabels[person.overall]}</span><section><h3>פרטים אישיים</h3><dl><div><dt>מספר עובד</dt><dd>${escapeHtml(value(person.employee.employee_code))}</dd></div><div><dt>טלפון</dt><dd>${escapeHtml(value(person.employee.phone))}</dd></div><div><dt>דוא״ל</dt><dd>${escapeHtml(value(person.employee.email))}</dd></div><div><dt>תאריך לידה</dt><dd>${escapeHtml(value(person.employee.birth_date))}</dd></div><div><dt>תאריך לידה עברי</dt><dd>${escapeHtml(value(person.employee.hebrew_birth_date))}</dd></div></dl></section><section><h3>העסקה</h3><dl><div><dt>סטטוס</dt><dd>פעיל</dd></div><div><dt>תחילת העסקה</dt><dd>${escapeHtml(value(person.employment.employment_start_date))}</dd></div><div><dt>וותק מוכר</dt><dd>${escapeHtml(value(person.employment.recognized_prior_seniority_months))}</dd></div><div><dt>תפקיד</dt><dd>${escapeHtml(value(person.role?.display_name))}</dd></div><div><dt>מעון</dt><dd>${escapeHtml(value(person.daycare?.display_name))}</dd></div></dl></section><section><h3>תנאי שכר פעילים</h3><dl><div><dt>תקופה</dt><dd>${escapeHtml(value(person.term?.valid_from))}</dd></div><div><dt>סוג שכר</dt><dd>${escapeHtml(value(person.term?.pay_type))}</dd></div><div><dt>שכר בסיס</dt><dd>${person.term?.base_pay == null ? 'לא הוזן' : money.format(person.term.base_pay)}</dd></div></dl><details><summary>היסטוריית תנאי שכר</summary>${sourceRowsTemplate(history.map((term) => ({ 'תחילה': term.valid_from || 'לא הוזן', 'סיום': term.valid_to || 'פעיל', 'סוג שכר': term.pay_type || 'לא הוזן', 'שכר בסיס': term.base_pay == null ? 'לא הוזן' : money.format(term.base_pay) })))}</details></section><section><h3>רישוי</h3><dl><div><dt>תעודת מטפלת</dt><dd>${escapeHtml(value(person.term?.caregiver_certificate_status))}</dd></div><div><dt>עזרה ראשונה</dt><dd>${escapeHtml(value(person.term?.first_aid_valid_until))}</dd></div><div><dt>התנהגות בטוחה</dt><dd>${escapeHtml(value(person.term?.safe_conduct_valid_until))}</dd></div></dl></section><section><h3>לוח שבועי</h3><ul class="staff-schedule">${schedule}</ul></section><section><h3>נושאים לטיפול</h3>${issueGroups.length ? issueGroups.map((group) => `<div class="staff-issue-group status-${group.status}"><strong>${staffStatusLabels[group.status]}</strong>${group.items.map((item) => `<span>${escapeHtml(item.label)}</span>`).join('')}</div>`).join('') : '<p>לא נמצאו נושאים לטיפול.</p>'}</section><section><h3>הערות</h3><p>${escapeHtml(person.employee.notes || person.employment.notes || person.term?.notes || 'אין הערות')}</p></section>`;
}
function openStaffRecord(employeeId) { const person = staffModel.people?.find((item) => item.employee.employee_id === employeeId); if (!person) return; $('#staff-record-content').innerHTML = staffRecordHtml(person); $('#staff-record-panel').hidden = false; $('#kpi-backdrop').hidden = false; $('#close-staff-record').focus(); }
function renderStaffData() {
  if (staffStatus === 'error') { $('#general-state').className = 'error-state panel'; $('#general-state').innerHTML = `<strong>לא ניתן לטעון נתוני צוות</strong><button class="button button-secondary" data-retry-dashboard>נסי שוב</button>`; return; }
  if (staffStatus !== 'ready') return;
  const m = staffModel; const isOrganization = activeDashboardUnit.allocation_unit_id === 'organization'; const today = new Date().toISOString().slice(0, 10);
  const people = m.employees.map((employee) => { const employment = m.employments.find((item) => item.employee_id === employee.employee_id && item.employment_status === 'ACTIVE'); const assignment = m.assignments.find((item) => item.employment_id === employment?.employment_id && item.is_primary && (!item.effective_to || item.effective_to >= today)); const term = m.terms.filter((item) => item.employee_id === employee.employee_id && item.valid_from <= today && (!item.valid_to || item.valid_to >= today)).sort((a,b) => b.valid_from.localeCompare(a.valid_from))[0]; const role = m.roles.find((item) => item.role_id === assignment?.role_id); const daycare = m.daycares.find((item) => item.daycare_id === assignment?.daycare_id); if (!employment || (!isOrganization && assignment?.allocation_unit_id !== activeDashboardUnit.allocation_unit_id)) return null; const missing = [['מספר עובד', employee.employee_code], ['תעודת זהות', employee.national_id], ['טלפון', employee.phone], ['דוא״ל', employee.email], ['תאריך לידה', employee.birth_date], ['תאריך לידה עברי', employee.hebrew_birth_date], ['תחילת העסקה', employment.employment_start_date], ['וותק מוכר', employment.recognized_prior_seniority_months], ['תפקיד', role], ['תנאי שכר פעילים', term], ['שכר בסיס', term?.base_pay], ['סוג שכר', term?.pay_type], ['תעודת מטפלת', term?.caregiver_certificate_status], ['עזרה ראשונה', term?.first_aid_valid_until], ['התנהגות בטוחה', term?.safe_conduct_valid_until], ['לוח שבועי', term?.weekly_schedule]].filter(([,value]) => value === null || value === undefined || value === ''); if (role?.daycare_relevant && !daycare) missing.push(['מעון', null]); if (['STUDYING','COMMITMENT_TO_STUDIES','בלימודים','התחייבות ללימודים'].includes(term?.caregiver_certificate_status) && !term?.studies_end_date) missing.push(['תאריך יעד ללימודים', null]); const firstAid = staffDateStatus(term?.first_aid_valid_until); const safe = staffDateStatus(term?.safe_conduct_valid_until); const overall = missing.length || firstAid === 'exception' || safe === 'exception' ? 'exception' : firstAid === 'warning' || safe === 'warning' ? 'warning' : 'good'; return { employee, employment, assignment, term, role, daycare, missing: missing.map(([label]) => label), firstAid, safe, overall }; }).filter(Boolean);
  staffModel.people = people; const query = staffFilters.query.trim().toLocaleLowerCase('he-IL'); const filtered = people.filter((person) => (staffFilters.status === 'all' || person.overall === staffFilters.status) && (staffFilters.daycare === 'all' || person.daycare?.daycare_id === staffFilters.daycare) && (!query || [person.employee.first_name, person.employee.last_name, person.daycare?.display_name, person.role?.display_name].filter(Boolean).join(' ').toLocaleLowerCase('he-IL').includes(query))); const definitions = (id, title, list, description) => ({ id, title, primary: list.length, formatter: number.format, utilization: list.some((p) => p.overall === 'exception') ? 101 : list.some((p) => p.overall === 'warning') ? 90 : 0, definition: { title, description, calculation: 'ספירת עובדים פעילים העונים להגדרה המוצגת.', source: 'נתוני עובדים, העסקה, שיוך ותנאי שכר פעילים ב־Supabase' }, details: list.map(staffReadableRow), records: list.map(staffReadableRow) }); const cards = [definitions('staff-active','עובדים פעילים',filtered,'עובדים עם העסקה פעילה.'), definitions('staff-attention','דורשים תשומת לב',filtered.filter((p)=>p.overall!=='good'),'עובדים עם חוסר, תוקף קרוב או תוקף שפג.'), definitions('staff-compliant','עובדים תקינים',filtered.filter((p)=>p.overall==='good'),'עובדים ללא חוסר או תוקף קרוב.'), definitions('staff-first-aid-expired','עזרה ראשונה שפגה',filtered.filter((p)=>p.firstAid==='exception'),'עובדים שתוקף עזרה ראשונה חסר או פג.'), definitions('staff-safe-expired','התנהגות בטוחה שפגה',filtered.filter((p)=>p.safe==='exception'),'עובדים שתוקף התנהגות בטוחה חסר או פג.'), definitions('staff-missing','נתונים חיוניים חסרים',filtered.filter((p)=>p.missing.length),'עובדים שחסר להם שדה חובה מאושר.')]; staffModel.currentKpis = Object.fromEntries(cards.map((item)=>[item.id,item])); const card = (p) => { const issues = staffIssues(p); const visible = issues.slice(0, 3); return `<article class="staff-employee-card status-${p.overall}"><header><div><strong>${escapeHtml(`${p.employee.first_name || ''} ${p.employee.last_name || ''}`.trim() || 'עובד ללא שם')}</strong><span>${escapeHtml(p.role?.display_name || 'ללא תפקיד')}</span></div><b class="status-badge status-${staffBadgeClass(p.overall)}">${staffStatusLabels[p.overall]}</b></header><p>${escapeHtml(p.daycare?.display_name || 'ללא מעון')}</p><div class="staff-issue-badges">${visible.map((item) => `<span class="status-badge status-${staffBadgeClass(item.status)}">${escapeHtml(item.label)}</span>`).join('')}${issues.length > 3 ? `<span class="status-badge status-neutral">+${issues.length - 3}</span>` : ''}</div><button class="button button-secondary" type="button" data-staff-record="${p.employee.employee_id}">פרטים מלאים</button></article>`; }; $('#kpis').innerHTML = cards.map((item,index)=>kpiCardTemplate({...item,row:index<4?'primary':'secondary'})).join(''); $('#detail-attention').innerHTML = sourceRowsTemplate(filtered.filter((p)=>p.overall!=='good').map(staffReadableRow)); $('#detail-licensing').innerHTML = sourceRowsTemplate(filtered.map(staffReadableRow)); $('#detail-missing').innerHTML = sourceRowsTemplate(filtered.filter((p)=>p.missing.length).map(staffReadableRow)); $('#detail-workforce').innerHTML = sourceRowsTemplate(m.roles.map((role)=>({ תפקיד: role.display_name, עובדים: number.format(filtered.filter((p)=>p.role?.role_id===role.role_id).length) }))); $('#detail-comparison').closest('details').hidden = !isOrganization; $('#detail-comparison').innerHTML = sourceRowsTemplate(m.daycares.map((daycare)=>({ מעון:daycare.display_name, פעילים:number.format(filtered.filter((p)=>p.daycare?.daycare_id===daycare.daycare_id).length), 'דורשים טיפול':number.format(filtered.filter((p)=>p.daycare?.daycare_id===daycare.daycare_id && p.overall==='exception').length) }))); $('#detail-employees').innerHTML = `<div class="staff-employee-grid">${filtered.map(card).join('') || '<div class="empty-state compact">לא נמצאו עובדים לפי הסינון.</div>'}</div>`; const select = $('#staff-daycare-filter'); select.innerHTML = `<option value="all">כל המעונות</option>${m.daycares.filter((daycare) => isOrganization || daycare.allocation_unit_id === activeDashboardUnit.allocation_unit_id).map((daycare) => `<option value="${daycare.daycare_id}">${escapeHtml(daycare.display_name)}</option>`).join('')}`; select.value = staffFilters.daycare; $('#staff-search').value = staffFilters.query; $('#staff-status-filter').value = staffFilters.status; $('#staff-daycare-filter-wrap').hidden = !isOrganization; $('#staff-daycare-summary').hidden = !isOrganization; if (isOrganization) $('#staff-daycare-grid').innerHTML = m.daycares.map((daycare) => { const rows = people.filter((p) => p.daycare?.daycare_id === daycare.daycare_id); const severe = rows.some((p) => p.overall === 'exception') ? 'exception' : rows.some((p) => p.overall === 'warning') ? 'warning' : rows.length ? 'good' : 'neutral'; return `<article class="staff-daycare-card status-${severe}"><h3>${escapeHtml(daycare.display_name)}</h3><div><span>פעילים<b>${number.format(rows.length)}</b></span><span>תקינים<b>${number.format(rows.filter((p) => p.overall === 'good').length)}</b></span><span>מעקב<b>${number.format(rows.filter((p) => p.overall === 'warning').length)}</b></span><span>דורשים טיפול<b>${number.format(rows.filter((p) => p.overall === 'exception').length)}</b></span><span>חוסרים<b>${number.format(rows.filter((p) => p.missing.length).length)}</b></span></div></article>`; }).join(''); $('#last-updated').textContent = new Intl.DateTimeFormat('he-IL',{dateStyle:'short',timeStyle:'short'}).format(staffLastUpdated); $('#general-state').hidden=true; $('#general-dashboard').hidden=false; bindDashboardDynamicInteractions();
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
  if (route.section === 'calculators' && route.calculator) return `${parts.join('')}<span aria-hidden="true">/</span><a href="#calculators">מחשבונים</a><span aria-hidden="true">/</span><span aria-current="page">${route.calculator === 'salary' ? 'מחשבון שכר' : 'תפוסה, תקינה ורווחיות'}</span>`;
  if (route.section !== 'dashboards') return `${parts.join('')}<span aria-hidden="true">/</span><span aria-current="page">${simpleRoutes[route.section].title}</span>`;
  parts.push('<span aria-hidden="true">/</span>', route.unitId ? '<a href="#dashboards">דשבורדים</a>' : '<span aria-current="page">דשבורדים</span>');
  if (unit) parts.push('<span aria-hidden="true">/</span>', type ? `<a href="${unitRoute(unit.allocation_unit_id)}">${escapeHtml(unit.display_name)}</a>` : `<span aria-current="page">${escapeHtml(unit.display_name)}</span>`);
  if (type) parts.push('<span aria-hidden="true">/</span>', `<span aria-current="page">${type.title}</span>`);
  return parts.join('');
}

async function render() {
  const route = parseRoute();
  let title = route.calculator === 'salary' ? 'מחשבון שכר' : route.calculator === 'occupancy' ? 'תפוסה, תקינה ורווחיות' : route.section === 'home' ? 'עמוד הבית' : route.section === 'dashboards' ? 'דשבורדים' : simpleRoutes[route.section].title;
  let unit = null;
  let type = null;
  if (route.section === 'home') $('#page-content').innerHTML = homeTemplate();
  else if (route.section === 'calculators' && route.calculator === 'salary') { $('#page-content').innerHTML = salaryCalculatorTemplate(); await loadSalaryRules(); if (parseRoute().calculator === 'salary') { if (salaryModel.status === 'error') { $('#salary-state').className = 'state error panel'; $('#salary-state').textContent = 'לא ניתן לטעון את כללי השכר הפעילים. נסי שוב מאוחר יותר.'; } else { bindSalaryCalculator(); } } }
  else if (route.section === 'calculators' && route.calculator === 'occupancy') { $('#page-content').innerHTML = unifiedOccupancyCalculatorTemplate(); await loadOccupancyRules(); if (parseRoute().calculator === 'occupancy') { if (occupancyModel.status === 'error') { $('#occupancy-state').className = 'state error panel'; $('#occupancy-state').textContent = 'לא ניתן לטעון את נתוני הכיתות והכללים הפעילים.'; } else { bindUnifiedOccupancyCalculator(); } } }
  else if (route.section === 'calculators') $('#page-content').innerHTML = calculatorsTemplate();
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
  document.querySelectorAll('[data-staff-record]').forEach((button) => button.addEventListener('click', () => openStaffRecord(button.dataset.staffRecord)));
  $('#close-staff-record')?.addEventListener('click', () => { $('#staff-record-panel').hidden = true; $('#kpi-backdrop').hidden = true; });
  $('#staff-search')?.addEventListener('input', (event) => { staffFilters.query = event.target.value; renderStaffData(); $('#staff-search')?.focus(); });
  $('#staff-status-filter')?.addEventListener('change', (event) => { staffFilters.status = event.target.value; renderStaffData(); });
  $('#staff-daycare-filter')?.addEventListener('change', (event) => { staffFilters.daycare = event.target.value; renderStaffData(); });
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
  $('#staff-record-panel')?.setAttribute('hidden', '');
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
  const activeModel = dashboardMode === 'accounting' ? accountingModel : dashboardMode === 'staffing' ? staffModel : generalModel;
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
  const activeModel = dashboardMode === 'accounting' ? accountingModel : dashboardMode === 'staffing' ? staffModel : generalModel;
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
    if (recovery.error) { showRecoveryView(recovery.error, recovery.mode); return; }
    if (!await validateSession()) { showRecoveryView('קישור האימות אינו תקף או שפג תוקפו. יש לבקש קישור חדש.', recovery.mode); return; }
    showRecoveryView('', recovery.mode);
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
