import { calculateBudgetModel, summarizeBudget } from './budget-calculations.js';
import { calculateSalary, salaryRuleIssues } from './salary-calculations.js';
import { buildLegalOccupancyAlternatives, calculateOccupancyModel } from './occupancy-calculations.js';
import { RULE_CATEGORIES, SYSTEM_RULES } from './management-catalog.generated.js';
import { DOCUMENTED_STATUS_RULES, REFERENCE_TABLES, VARIABLE_RULE_TABLES } from './management-data.js';
import { mountAdministrationPrototype } from './administration-prototype.js';
import { mountSettingsCenter } from './settings-center.js';
import { bankWorkbenchTemplateV2 as track015BankWorkbenchTemplate, mountBankWorkbenchV2 as mountBankWorkbench } from './bank-workbench-ux.js';

const SUPABASE_URL = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_4MKSdjf7O1oVS4SWhQ36Qw_QUKW8dyW';
const SESSION_KEY = 'chamah.portal.session';
const SESSION_REFRESH_LEEWAY_SECONDS = 60;
const MIN_PASSWORD_LENGTH = 10;
const CANONICAL_PORTAL_URL = 'https://chamah-portal.vercel.app/';
const $ = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 });

// Screen codes are the stable internal contract. UI copy stays local so damaged
// remote metadata can never leak into Hebrew navigation or administration views.
const HEBREW_SCREEN_LABELS = {
  home: 'עמוד הבית', dashboards: 'דשבורדים', 'dashboards.finance': 'כספים',
  'dashboards.accounting': 'הנה״ח', 'dashboards.accounting.summary': 'דשבורד סיכום',
  'dashboards.accounting.banks': 'קובץ בנקים', 'dashboards.licensing': 'רישוי', 'dashboards.team': 'צוות',
  'dashboards.staffing': 'צוות ורישוי',
  'dashboards.occupancy': 'תפוסה ותקינה', calculators: 'מחשבונים',
  'calculators.salary': 'מחשבון שכר', 'calculators.occupancy': 'מחשבון תפוסה, תקינה ורווחיות',
  payroll: 'שכר', 'payroll.calculations': 'חישובי שכר', 'payroll.calculations.new': 'חדש',
  'payroll.calculations.existing': 'קיים', 'payroll.calculations.history': 'טבלאות עבר',
  management: 'ניהול והגדרות', 'management.permissions': 'הרשאות',
  'management.permissions.users': 'רשימת משתמשים והרשאות', 'management.rules': 'כללים',
  'management.rules.calculation': 'כללי חישוב', 'management.rules.system': 'כללי מערכת', 'management.settings': 'הגדרות', 'management.tables': 'טבלאות',
  'management.tables.calculation': 'טבלאות חישוב', 'management.tables.variables': 'כללים משתנים',
  'management.audit': 'יומן שינויים', knowledge: 'מרכז הידע למשתמש', maintenance: 'תחזוקה', tasks: 'משימות'
};

function canonicalizeSections(sections) {
  const unique = new Map();
  let unnamed = 0;
  for (const section of sections || []) {
    if (!section?.screen_code || unique.has(section.screen_code)) continue;
    const remoteLabel = String(section.display_name || '').trim();
    const safeRemoteLabel = /[א-ת]/.test(remoteLabel) && !/[�ÃÂ]|×[^\s]/.test(remoteLabel);
    const displayName = HEBREW_SCREEN_LABELS[section.screen_code] || (safeRemoteLabel ? remoteLabel : `מסך נוסף ${++unnamed}`);
    unique.set(section.screen_code, { ...section, display_name: displayName });
  }
  const canonical = [...unique.values()];
  const accounting = canonical.find((section) => section.screen_code === 'dashboards.accounting');
  if (accounting && !canonical.some((section) => section.screen_code === 'dashboards.accounting.summary')) canonical.push({ screen_code: 'dashboards.accounting.summary', parent_screen_code: 'dashboards.accounting', route: 'dashboards/unit/organization/accounting/summary', display_name: 'דשבורד סיכום', icon: '▦', description: 'בקרה מסכמת על תהליכי הנהלת החשבונות.', display_order: 23, is_navigation_item: false, is_scope_required: true, permission_level: accounting.permission_level });
  if (accounting && !canonical.some((section) => section.screen_code === 'dashboards.accounting.banks')) canonical.push({ screen_code: 'dashboards.accounting.banks', parent_screen_code: 'dashboards.accounting', route: 'dashboards/unit/organization/accounting/banks', display_name: 'קובץ בנקים', icon: '▤', description: 'סביבת עבודה לטיפול בתנועות בנק.', display_order: 24, is_navigation_item: false, is_scope_required: true, permission_level: portalAccess?.profile?.is_super_admin ? 'EDIT' : 'HIDDEN' });
  return canonical.sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
}

function uniqueByStableId(rows, idField) {
  const unique = new Map();
  for (const row of rows || []) {
    const id = String(row?.[idField] || '').trim();
    if (id && !unique.has(id)) unique.set(id, row);
  }
  return [...unique.values()];
}

function normalizeUsersAdminData(value) {
  return {
    ...value,
    sections: canonicalizeSections(value?.sections),
    allocation_units: uniqueByStableId(value?.allocation_units, 'allocation_unit_id'),
    daycares: uniqueByStableId(value?.daycares, 'daycare_id')
  };
}

const modules = [
  { route: 'dashboards', icon: '📊', title: 'דשבורדים', description: 'תמונת מצב ניהולית ברורה לפי היחידה הארגונית הרלוונטית.' },
  { route: 'calculators', icon: '🧮', title: 'מחשבונים', description: 'כלי חישוב ותכנון שיסייעו בקבלת החלטות מהירה ומדויקת.' },
  { route: 'staffing', href: 'dashboards/unit/organization/staffing', icon: '👥', title: 'צוות ורישוי', description: 'תמונת מצב ארגונית של צוות, הכשרות ורישוי.' },
  { route: 'accounting', href: 'dashboards/unit/organization/accounting', icon: '🧾', title: 'הנה״ח', description: 'בקרה ארגונית על תהליכי הנהלת החשבונות.' },
  { route: 'payroll', icon: '₪', title: 'שכר', description: 'מרכז מודולרי לתהליכי שכר ולחישובי שכר.' },
  { route: 'training', icon: '▤', title: 'הרשאות וטבלאות', description: 'טבלאות וכלי הרשאות ארגוניים במקום אחד.' },
  { route: 'knowledge', icon: '📚', title: 'מרכז הידע למשתמש', description: 'נהלים, הנחיות מקצועיות ומידע שימושי במקום אחד.' },
  { route: 'maintenance', icon: '🔧', title: 'תחזוקה', description: 'דיווח תקלות, מעקב טיפול וניהול תחזוקת המעונות.' },
  { route: 'tasks', icon: '✅', title: 'משימות', description: 'ריכוז משימות, מעקב אחר ביצוע ותיעדוף העבודה השוטפת.' }
];

const dashboardTypes = [
  { id: 'finance', icon: '₪', title: 'דשבורד כספים', description: 'תמונה כספית ניהולית עבור היחידה שנבחרה.' },
  { id: 'accounting', icon: '🧾', title: 'הנה״ח', description: 'בקרה על תהליכי הנהלת החשבונות של היחידה.' },
  { id: 'licensing', icon: '✓', title: 'דשבורד רישוי', description: 'תמונת מצב של רישיונות, תוקפים ועמידה בדרישות ביחידה.' },
  { id: 'team', icon: '👥', title: 'דשבורד צוות', description: 'תמונת מצב של צוות, תפקידים והכשרות ביחידה.' },
  { id: 'staffing', icon: '👥', title: 'דשבורד צוות ורישוי', description: 'תמונת מצב של צוות, הכשרות ורישוי ביחידה.' },
  { id: 'occupancy', icon: '🏫', title: 'דשבורד תפוסה ותקינה', description: 'מעקב אחר תפוסה, כיתות ודרישות תקינה ביחידה.' }
];

const dashboardNavigationRoutes = new Set(['dashboards', 'staffing', 'accounting']);
const simpleRoutes = Object.fromEntries(modules.filter((module) => !dashboardNavigationRoutes.has(module.route)).map((module) => [module.route, module]));
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
const managementData = new Map();
let portalAccess = null;
let usersAdminData = null;
let selectedPortalUserId = '';

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

function preserveLegacyCallbackAtRoot() {
  if (location.pathname !== '/new' && location.pathname !== '/new/') return;
  history.replaceState({}, '', `/${location.search}${location.hash}`);
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
  await loadPortalAccess();
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
  const rows = await response.json();
  if (portalAccess?.profile?.scope_mode !== 'SELECTED' || portalAccess.profile.is_super_admin || !Array.isArray(rows)) return rows;
  const unitIds = new Set(portalAccess.allocation_unit_ids || []); const daycareIds = new Set(portalAccess.daycare_ids || []);
  if (table === 'allocation_units') return rows.filter((row) => unitIds.has(row.allocation_unit_id));
  if (table === 'daycares') return rows.filter((row) => daycareIds.has(row.daycare_id) || unitIds.has(row.allocation_unit_id));
  if (rows.some((row) => Object.hasOwn(row, 'daycare_id'))) return rows.filter((row) => !row.daycare_id || daycareIds.has(row.daycare_id));
  if (rows.some((row) => Object.hasOwn(row, 'allocation_unit_id'))) return rows.filter((row) => !row.allocation_unit_id || unitIds.has(row.allocation_unit_id));
  return rows;
}

async function rpc(name, body = {}) {
  if (!await ensureAccessToken()) throw new Error('החיבור פג. יש להתחבר מחדש.');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error((await response.json()).message || 'הפעולה נכשלה.');
  return response.json();
}

async function loadPortalAccess() {
  portalAccess = await rpc('portal_my_access');
  if (!portalAccess?.profile) throw new Error('למשתמש אין פרופיל פורטל פעיל.');
  portalAccess.sections = canonicalizeSections(portalAccess.sections);
  $('#portal-profile').textContent = portalAccess.profile.display_name || session?.user?.email || 'משתמשת הפורטל';
  renderPermissionNavigation();
}

function permissionFor(code) { return portalAccess?.sections?.find((item) => item.screen_code === code)?.permission_level || 'HIDDEN'; }
function canView(code) { return permissionFor(code) !== 'HIDDEN'; }
function portalSection(code) { return portalAccess?.sections?.find((item) => item.screen_code === code) || null; }
function canViewRoute(route) {
  const section = portalAccess?.sections?.find((item) => item.route === route);
  return Boolean(section && section.permission_level !== 'HIDDEN');
}
function navigationScreenCode(route) {
  if (route === 'staffing') return 'dashboards.staffing';
  if (route === 'accounting') return 'dashboards.accounting';
  if (route === 'training') return 'management';
  return route;
}
function routeScreenCode(route) {
  if (route.section === 'training' && ['settings', 'tables'].includes(route.page)) return 'management.settings';
  if (route.section === 'dashboards' && route.dashboardType === 'accounting' && route.dashboardChild) return `dashboards.accounting.${route.dashboardChild}`;
  if (route.section === 'dashboards' && route.dashboardType) return `dashboards.${route.dashboardType}`;
  if (route.section === 'calculators' && route.calculator) return `calculators.${route.calculator}`;
  if (route.section === 'payroll' && route.child) return `payroll.calculations.${route.child}`;
  if (route.section === 'payroll' && route.page) return 'payroll.calculations';
  if (route.section === 'training' && route.page === 'rules' && route.child === 'calculation') return 'management.rules.system';
  if (route.section === 'training') return route.child ? `management.${route.page}.${route.child}` : route.page ? `management.${route.page}` : 'management';
  return route.section;
}

function renderPermissionNavigation() {
  document.querySelectorAll('#primary-nav [data-route], #mobile-nav [data-route]').forEach((item) => {
    const section = portalSection(navigationScreenCode(item.dataset.route));
    item.hidden = !section || section.permission_level === 'HIDDEN';
    if (!section) return;
    item.href = `#${section.route}`;
    item.setAttribute('aria-label', section.display_name);
    const icon = item.querySelector('[aria-hidden="true"]');
    const label = item.querySelector('span:last-child');
    if (icon && section.icon) icon.textContent = section.icon;
    if (label && !item.closest('#mobile-nav')) label.textContent = section.display_name;
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function parseRoute() {
  const parts = location.hash.slice(1).split('/').filter(Boolean).map(decodeURIComponent);
  if (!parts.length || parts[0] === 'home') return { section: 'home' };
  if (parts[0] === 'dashboards') return { section: 'dashboards', unitId: parts[1] === 'unit' ? parts[2] : null, dashboardType: parts[1] === 'unit' ? parts[3] : null, dashboardChild: parts[1] === 'unit' ? parts[4] : null };
  if (parts[0] === 'calculators' && ['salary', 'occupancy'].includes(parts[1])) return { section: 'calculators', calculator: parts[1] };
  if (parts[0] === 'payroll' && parts[1] === 'calculations' && ['new', 'existing', 'history'].includes(parts[2])) return { section: 'payroll', page: 'calculations', child: parts[2] };
  if (parts[0] === 'payroll' && parts[1] === 'calculations') return { section: 'payroll', page: 'calculations' };
  if (parts[0] === 'training') return { section: 'training', page: parts[1] || '', child: parts[2] || '' };
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
  const catalogModules = modules.map((module) => {
    const section = portalSection(navigationScreenCode(module.route));
    return section ? { ...module, href: section.route, icon: section.icon || module.icon, title: section.display_name, description: section.description || module.description, screenCode: section.screen_code } : { ...module, screenCode: navigationScreenCode(module.route) };
  });
  return `<section class="page-heading"><div><p class="eyebrow">סביבת העבודה שלך</p><h1>שלום, ברוכה הבאה לפורטל חמ״ה</h1><p>מכאן ניתן להגיע לכל כלי הניהול, המעקב והידע של הארגון.</p></div><span class="status-badge status-success"><span aria-hidden="true">●</span> המערכת זמינה</span></section>
  <section class="attention-panel panel" aria-labelledby="attention-title"><div class="attention-icon" aria-hidden="true">i</div><div><h2 id="attention-title">הפורטל החדש בהקמה</h2><p>מעטפת העבודה מוכנה. המודולים ייפתחו בהדרגה בספרינטים הבאים.</p></div><a class="button button-secondary" href="#knowledge">למידע נוסף</a></section>
  <section aria-labelledby="modules-title"><div class="section-heading"><div><h2 id="modules-title">לאן תרצי להמשיך?</h2><p>בחרי תחום כדי לפתוח את סביבת העבודה המתאימה.</p></div></div><div class="module-grid">${catalogModules.filter((module) => canView(module.screenCode)).map((module) => `<a class="module-card card" href="#${module.href || module.route}"><span class="module-icon" aria-hidden="true">${module.icon}</span><div><h3>${module.title}</h3><p>${module.description}</p></div><span class="card-action">פתיחה <span aria-hidden="true">←</span></span></a>`).join('')}</div></section>`;
}

function accessDeniedTemplate() { return `<section class="error-state panel"><strong>אין הרשאה לצפות במסך זה</strong><p>המסך הוסתר בהתאם להרשאות המשתמש.</p><a class="button button-primary" href="#home">חזרה לעמוד הבית</a></section>`; }

function comingSoonTemplate(module) {
  return `<section class="page-heading"><div><p class="eyebrow">${module.title}</p><h1>${module.title}</h1><p>${module.description}</p></div><span class="status-badge status-neutral">בתכנון</span></section><section class="coming-soon panel"><span class="coming-icon" aria-hidden="true">${module.icon}</span><span class="status-badge status-info">בקרוב</span><h2>המודול נמצא בהכנה</h2><p>אנחנו בונים עבורך סביבת עבודה מקצועית, מהירה וברורה. היא תתווסף לפורטל באחד הספרינטים הקרובים.</p><div class="next-action"><strong>הפעולה הבאה</strong><span>אפשר לחזור לעמוד הבית ולבחור תחום אחר.</span></div><a class="button button-primary" href="#home">חזרה לעמוד הבית</a></section>`;
}

const portalSections = {
  payroll: {
    title: 'שכר',
    description: 'מרכז מודולרי לתהליכי שכר ולחישובי שכר.',
    cards: [{ route: 'payroll/calculations', icon: '▤', title: 'חישובי שכר', description: 'פתיחת חישוב חדש, חישובים קיימים וטבלאות עבר.' }]
  },
  training: {
    title: 'ניהול והגדרות',
    description: 'הרשאות והגדרות המערכת במקום אחד.',
    cards: [
      { route: 'training/permissions', icon: '⚿', title: 'הרשאות', description: 'ניהול משתמשים, תפקידים והרשאות — ללא שינוי מנגנוני האבטחה.' },
      { route: 'training/rules', icon: '§', title: 'כללים', description: 'קטלוג כללי המערכת המתועדים.' },
      { route: 'training/settings', icon: '⚙', title: 'הגדרות', description: 'כל הגדרות המערכת במרכז אחד, לפי נושאים עסקיים.' },
      { route: 'training/audit', icon: '◷', title: 'יומן שינויים', description: 'היסטוריית שינויים גלובלית לפי אובייקט.' }
    ]
  }
};

const managementPages = {
  permissions: { title: 'הרשאות', cards: [{ route: 'training/permissions/users', icon: '👥', title: 'רשימת משתמשים והרשאות', description: 'ניהול משתמשי הפורטל, טווחי נתונים והרשאות לפי מסך.' }] },
  rules: { title: 'כללים', cards: [{ route: 'training/rules/calculation', icon: '§', title: 'כללי חישוב', description: 'יצירה וניהול של כללי חישוב.' }, { route: 'training/rules/system', icon: '§', title: 'כללי מערכת', description: `${SYSTEM_RULES.length} כללים מתועדים מתוך מסמכי ה־Handbook.` }] },
  settings: { title: 'הגדרות', cards: [] }
};

const payrollCalculationCards = [
  { route: 'payroll/calculations/new', icon: '+', title: 'חדש', description: 'פתיחת חישוב שכר חדש.' },
  { route: 'payroll/calculations/existing', icon: '◷', title: 'קיים', description: 'צפייה בחישובי שכר קיימים.' },
  { route: 'payroll/calculations/history', icon: '▦', title: 'טבלאות עבר', description: 'צפייה בטבלאות שכר מתקופות קודמות.' }
];

function sectionCardsTemplate(section, cards = portalSections[section].cards, title = portalSections[section].title, description = portalSections[section].description) {
  const details = portalSections[section];
  return `<section class="page-heading"><div><p class="eyebrow">${details.title}</p><h1>${title}</h1><p>${description}</p></div></section><section class="module-grid">${cards.filter((card) => canViewRoute(card.route)).map((card) => `<a class="module-card card" href="#${card.route}"><span class="module-icon" aria-hidden="true">${card.icon}</span><div><h3>${card.title}</h3><p>${card.description}</p></div><span class="card-action">פתיחה <span aria-hidden="true">←</span></span></a>`).join('')}</section>`;
}

function placeholderTemplate(title, parentRoute, parentTitle) {
  return `<section class="page-heading"><div><p class="eyebrow">${parentTitle} / ${title}</p><h1>${title}</h1><p>עמוד זה הוכן להרחבה עתידית.</p></div><span class="status-badge status-neutral">בתכנון</span></section><section class="coming-soon panel"><span class="status-badge status-info">בקרוב</span><h2>העמוד נמצא בהכנה</h2><p>זהו עמוד מציין מקום בלבד. לא נוספו נתונים, חיבורים או לוגיקה עסקית.</p><a class="button button-primary" href="#${parentRoute}">חזרה אל ${parentTitle}</a></section>`;
}

function managementHubTemplate(page) {
  const item = managementPages[page];
  return sectionCardsTemplate('training', item.cards, item.title, `בחירת מסך עבודה בתחום ${item.title}.`);
}

function usersPermissionsTemplate() {
  return `<section class="page-heading"><div><p class="eyebrow">הרשאות / ניהול משתמשים</p><h1>רשימת משתמשים והרשאות</h1><p>ניהול משתמשי Supabase Auth, טווח נתונים והרשאות מפורשות לפי מסך.</p></div><button id="invite-user-open" class="button button-primary" type="button">הזמנת משתמש</button></section><p id="permissions-feedback" class="form-message" role="status"></p><div id="permissions-admin-state" class="state panel">טוען משתמשים והרשאות…</div><section id="permissions-admin" class="permissions-admin" hidden></section>`;
}

async function portalUsersRequest(method = 'GET', body) {
  if (!await ensureAccessToken()) throw new Error('החיבור פג.');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/portal-users`, { method, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error || 'הפעולה נכשלה.');
  return value;
}

async function portalSettingsRequest(method = 'GET', body) {
  if (!await ensureAccessToken()) throw new Error('החיבור פג.');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/portal-settings`, { method, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error || 'הפעולה נכשלה.');
  return value;
}

async function portalBankWorkbenchRequest(method = 'GET', body) {
  if (!await ensureAccessToken()) throw new Error('החיבור פג.');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/portal-bank-workbench`, { method, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(value.error || 'הפעולה נכשלה.'); error.details = value.errors; throw error; }
  return value;
}

function adminUserModel(userId) {
  const user = usersAdminData.users.find((item) => item.id === userId);
  const profile = usersAdminData.profiles.find((item) => item.user_id === userId) || { user_id: userId, display_name: '', is_active: true, is_super_admin: false, scope_mode: 'SELECTED' };
  return { user, profile, permissions: usersAdminData.permissions.filter((item) => item.user_id === userId && item.permission_configuration_id === profile.permission_configuration_id), unitIds: usersAdminData.unit_scopes.filter((item) => item.user_id === userId && item.permission_configuration_id === profile.permission_configuration_id).map((item) => item.allocation_unit_id), daycareIds: usersAdminData.daycare_scopes.filter((item) => item.user_id === userId && item.permission_configuration_id === profile.permission_configuration_id).map((item) => item.daycare_id), audit: usersAdminData.audit_events.filter((item) => item.entity_id === userId) };
}

function permissionRows(model) {
  const explicit = new Map(model.permissions.map((item) => [item.screen_code, item.permission_level]));
  const sectionsByCode = new Map(usersAdminData.sections.map((item) => [item.screen_code, item]));
  const depth = (item) => {
    let value = 0; let current = item;
    while (current?.parent_screen_code && sectionsByCode.has(current.parent_screen_code)) {
      value += 1; current = sectionsByCode.get(current.parent_screen_code);
    }
    return value;
  };
  return usersAdminData.sections.map((item) => {
    const level = explicit.get(item.screen_code) || 'HIDDEN';
    const usesSecureDefault = !explicit.has(item.screen_code);
    const disabled = model.profile.is_super_admin ? 'disabled' : '';
    const option = (value, label) => `<td><label class="permission-radio"><input type="radio" name="permission-${escapeHtml(item.screen_code)}" value="${value}" data-permission ${level === value ? 'checked' : ''} ${disabled}><span>${label}</span></label></td>`;
    const branchAction = usersAdminData.sections.some((child) => child.parent_screen_code === item.screen_code) ? `<button class="permission-row-action" type="button" data-apply-branch="${escapeHtml(item.screen_code)}">החלה על הענף</button>` : '';
    const defaultAction = item.parent_screen_code ? `<button class="permission-row-action" type="button" data-default-permission ${usesSecureDefault ? 'hidden' : ''}>חזרה לברירת המחדל</button>` : '';
    return `<tr data-screen="${escapeHtml(item.screen_code)}" data-parent="${escapeHtml(item.parent_screen_code || '')}" data-explicit="${!usesSecureDefault}" style="--permission-depth:${depth(item)}"><th scope="row" class="permission-screen-name"><span>${escapeHtml(item.display_name)}</span><small data-permission-state>${usesSecureDefault ? 'ברירת מחדל: לא להציג' : 'הגדרה ישירה'}</small><span class="permission-row-actions">${branchAction}${defaultAction}</span></th>${option('HIDDEN', 'לא להציג')}${option('VIEW', 'צפייה')}${option('EDIT', 'עריכה')}</tr>`;
  }).join('');
}

function renderPermissionsAdmin() {
  const root = $('#permissions-admin'); if (!root || !usersAdminData) return;
  if (!selectedPortalUserId || !usersAdminData.users.some((item) => item.id === selectedPortalUserId)) selectedPortalUserId = usersAdminData.users[0]?.id || '';
  const model = selectedPortalUserId ? adminUserModel(selectedPortalUserId) : null;
  usersAdminData = normalizeUsersAdminData(usersAdminData);
  root.innerHTML = `<aside class="panel permissions-users"><h2>משתמשים</h2><div class="management-filters"><label>חיפוש משתמש<input id="user-search" type="search" placeholder="שם או דוא״ל"></label></div><div id="portal-user-list">${usersAdminData.users.map((user) => { const p = usersAdminData.profiles.find((item) => item.user_id === user.id); return `<button type="button" data-user-id="${user.id}" class="permission-user${user.id === selectedPortalUserId ? ' active' : ''}"><strong>${escapeHtml(p?.display_name || user.email || 'ללא שם')}</strong><small>${escapeHtml(user.email || '')}</small><span>${p?.is_super_admin ? 'מנהלת־על' : user.email_confirmed_at ? 'פעילה' : 'הוזמנה'}</span></button>`; }).join('')}</div></aside><div class="permissions-editor">${model ? `<form id="permissions-form" class="panel" data-original-super-admin="${model.profile.is_super_admin}"><div class="permissions-editor-head"><div><p class="eyebrow">פרטי משתמשת</p><h2>${escapeHtml(model.profile.display_name || model.user.email)}</h2><p>${escapeHtml(model.user.email || '')}</p></div><span class="status-badge status-info">${model.profile.is_super_admin ? 'מנהלת־על — גישה מלאה' : 'משתמשת פורטל'}</span></div><div class="form-grid"><label class="field">שם תצוגה<input name="display_name" value="${escapeHtml(model.profile.display_name || '')}"></label><div class="access-level-field"><span>רמת הרשאה</span><strong id="access-level-value">${model.profile.is_super_admin ? 'מנהלת־על' : 'משתמשת פורטל'}</strong><input name="is_super_admin" type="hidden" value="${model.profile.is_super_admin}"></div><label class="checkbox-field"><input name="is_active" type="checkbox" ${model.profile.is_active ? 'checked' : ''}> משתמשת פעילה</label></div><button id="show-super-admin" class="button button-quiet super-admin-reveal" type="button" aria-expanded="false" aria-controls="super-admin-control">הצג הרשאת משתמש־על</button><section id="super-admin-control" class="super-admin-control" hidden><strong>הרשאת משתמש־על</strong><p>משתמש־על מקבל גישה מלאה לכל המסכים, ההגדרות וכלי הניהול בפורטל.</p><button id="change-super-admin" class="button button-warning" type="button">${model.profile.is_super_admin ? 'הסרת הרשאת משתמש־על' : 'הענקת הרשאת משתמש־על'}</button></section><fieldset><legend>טווח נתונים ארגוני</legend><div class="scope-mode"><label><input type="radio" name="scope_mode" value="ORGANIZATION" ${model.profile.scope_mode === 'ORGANIZATION' ? 'checked' : ''}> כל הארגון</label><label><input type="radio" name="scope_mode" value="SELECTED" ${model.profile.scope_mode === 'SELECTED' ? 'checked' : ''}> יחידות ומעונות נבחרים</label></div><div class="scope-grid">${usersAdminData.allocation_units.map((unit) => `<label><input type="checkbox" name="unit_scope" value="${unit.allocation_unit_id}" ${model.unitIds.includes(unit.allocation_unit_id) ? 'checked' : ''}> <span>${escapeHtml(unit.display_name)}</span></label>`).join('')}${usersAdminData.daycares.map((daycare) => `<label><input type="checkbox" name="daycare_scope" value="${daycare.daycare_id}" ${model.daycareIds.includes(daycare.daycare_id) ? 'checked' : ''}> <span>${escapeHtml(daycare.display_name)}</span></label>`).join('')}</div></fieldset><section class="screen-permissions" aria-labelledby="screen-permissions-title"><h2 id="screen-permissions-title">הרשאות למסכי הפורטל</h2><p>לכל מסך מוגדרת הרשאה מפורשת.</p><div class="permission-table-wrap"><table id="permission-matrix" class="permission-table"><thead><tr><th scope="col">שם העמוד</th><th scope="col">מוסתר</th><th scope="col">צפייה</th><th scope="col">עריכה</th></tr></thead><tbody>${permissionRows(model)}</tbody></table></div></section><details class="audit-history"><summary>היסטוריית שינויים (${model.audit.length})</summary>${model.audit.length ? model.audit.map((event) => `<p><strong>${escapeHtml(event.operation)}</strong> · ${new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.occurred_at))}</p>`).join('') : '<p>לא קיימת היסטוריה.</p>'}</details><div class="form-actions"><button class="button button-primary" type="submit">שמירה</button><button id="cancel-permissions" class="button button-secondary" type="button">ביטול</button></div></form>` : '<section class="panel"><p>אין משתמשים.</p></section>'}</div>`;
  const permissionIntro = root.querySelector('.screen-permissions > p');
  if (permissionIntro) permissionIntro.textContent = 'כל עמוד ללא הרשאה שמורה נשאר מוסתר. הרשאת הורה אינה פותחת עמודי ילד; אפשר להעניק הרשאה מפורשת לענף שלם.';
  const hiddenHeading = root.querySelector('.permission-table thead th:nth-child(2)');
  if (hiddenHeading) hiddenHeading.textContent = 'לא להציג';
  root.hidden = false; bindPermissionsAdmin();
}

function bindPermissionsAdmin() {
  let dirty = false; let superAdminConfirmed = false; const form = $('#permissions-form');
  window.onbeforeunload = () => dirty ? 'קיימים שינויים שלא נשמרו.' : undefined;
  document.querySelectorAll('[data-user-id]').forEach((button) => button.addEventListener('click', () => { if (dirty && !confirm('קיימים שינויים שלא נשמרו. לעבור למשתמש אחר?')) return; selectedPortalUserId = button.dataset.userId; renderPermissionsAdmin(); }));
  form?.addEventListener('change', () => { dirty = true; });
  form?.querySelectorAll('[data-permission]').forEach((radio) => radio.addEventListener('change', () => {
    const row = radio.closest('[data-screen]');
    row.dataset.explicit = 'true';
    row.querySelector('[data-permission-state]').textContent = 'הגדרה ישירה';
    const reset = row.querySelector('[data-default-permission]');
    if (reset) reset.hidden = false;
  }));
  form?.querySelectorAll('[data-apply-branch]').forEach((button) => button.addEventListener('click', () => {
    const source = button.closest('[data-screen]');
    const level = source.querySelector('[data-permission]:checked').value;
    const descendants = (parentCode) => [...form.querySelectorAll(`[data-parent="${CSS.escape(parentCode)}"]`)].flatMap((row) => [row, ...descendants(row.dataset.screen)]);
    for (const row of [source, ...descendants(source.dataset.screen)]) {
      row.querySelector(`[data-permission][value="${level}"]`).checked = true;
      row.dataset.explicit = 'true';
      row.querySelector('[data-permission-state]').textContent = 'הגדרה ישירה';
      const reset = row.querySelector('[data-default-permission]');
      if (reset) reset.hidden = false;
    }
    dirty = true;
  }));
  form?.querySelectorAll('[data-default-permission]').forEach((button) => button.addEventListener('click', () => {
    const row = button.closest('[data-screen]');
    row.querySelector('[data-permission][value="HIDDEN"]').checked = true;
    row.dataset.explicit = 'false';
    row.querySelector('[data-permission-state]').textContent = 'ברירת מחדל: לא להציג';
    button.hidden = true;
    dirty = true;
  }));
  $('#user-search')?.addEventListener('input', (event) => { const query = event.target.value.trim().toLowerCase(); document.querySelectorAll('[data-user-id]').forEach((item) => { item.hidden = !item.textContent.toLowerCase().includes(query); }); });
  $('#show-super-admin')?.addEventListener('click', (event) => { const control = $('#super-admin-control'); control.hidden = !control.hidden; event.currentTarget.setAttribute('aria-expanded', String(!control.hidden)); event.currentTarget.textContent = control.hidden ? 'הצג הרשאת משתמש־על' : 'הסתר הרשאת משתמש־על'; });
  $('#change-super-admin')?.addEventListener('click', () => { const field = form.elements.is_super_admin; const granting = field.value !== 'true'; const warning = granting ? 'הענקת הרשאת משתמש־על תיתן גישה מלאה לכל המסכים, ההגדרות וכלי הניהול. להמשיך?' : 'הסרת הרשאת משתמש־על תבטל את הגישה המלאה ותפעיל את ההרשאות המפורטות לפי מסך. להמשיך?'; if (!confirm(warning)) return; field.value = String(granting); superAdminConfirmed = true; dirty = true; $('#access-level-value').textContent = granting ? 'מנהלת־על' : 'משתמשת פורטל'; $('#change-super-admin').textContent = granting ? 'הסרת הרשאת משתמש־על' : 'הענקת הרשאת משתמש־על'; form.querySelectorAll('[data-permission]').forEach((radio) => { radio.disabled = granting; }); });
  $('#cancel-permissions')?.addEventListener('click', renderPermissionsAdmin);
  form?.addEventListener('submit', async (event) => { event.preventDefault(); const values = new FormData(form); const isSuperAdmin = values.get('is_super_admin') === 'true'; if (isSuperAdmin !== (form.dataset.originalSuperAdmin === 'true') && !superAdminConfirmed) { $('#permissions-feedback').textContent = 'יש לאשר במפורש את שינוי הרשאת משתמש־העל.'; return; } const payload = { user_id: selectedPortalUserId, profile: { display_name: values.get('display_name'), is_active: values.has('is_active'), is_super_admin: isSuperAdmin, scope_mode: values.get('scope_mode') }, permissions: [...form.querySelectorAll('[data-screen][data-explicit="true"]')].map((row) => ({ screen_code: row.dataset.screen, permission_level: row.querySelector('[data-permission]:checked').value })), allocation_unit_ids: [...new Set(values.getAll('unit_scope'))], daycare_ids: [...new Set(values.getAll('daycare_scope'))] }; $('#permissions-feedback').textContent = 'שומר…'; try { usersAdminData = normalizeUsersAdminData(await portalUsersRequest('PATCH', payload)); dirty = false; $('#permissions-feedback').textContent = 'השינויים נשמרו בהצלחה.'; renderPermissionsAdmin(); } catch (error) { $('#permissions-feedback').textContent = error.message; } });
}

async function loadPermissionsAdmin() {
  try { usersAdminData = normalizeUsersAdminData(await portalUsersRequest()); $('#permissions-admin-state').hidden = true; renderPermissionsAdmin(); } catch (error) { $('#permissions-admin-state').className = 'state error panel'; $('#permissions-admin-state').textContent = error.message; }
  $('#invite-user-open')?.addEventListener('click', async () => { const email = prompt('כתובת דוא״ל להזמנה:'); if (!email) return; const displayName = prompt('שם תצוגה (לא חובה):') || ''; $('#permissions-feedback').textContent = 'שולח הזמנה…'; try { usersAdminData = await portalUsersRequest('POST', { email, display_name: displayName }); $('#permissions-feedback').textContent = 'ההזמנה נשלחה בהצלחה.'; renderPermissionsAdmin(); } catch (error) { $('#permissions-feedback').textContent = error.message; } });
}

function documentedText(value) {
  return escapeHtml(value).replace(/^###? (.+)$/gm, '<strong>$1</strong>').replace(/^[-*] (.+)$/gm, '• $1').replace(/\n/g, '<br>');
}

function systemRulesTemplate() {
  return `<section class="page-heading"><div><p class="eyebrow">כללים / מקור: docs/handbook</p><h1>כללי מערכת</h1><p>${SYSTEM_RULES.length} כללים מתועדים, ללא שלושת המזהים השמורים (Reserved).</p></div><span class="status-badge status-success">קריאה בלבד</span></section><section class="management-filters panel"><label>חיפוש<input id="rules-search" type="search" placeholder="מזהה, שם או תוכן כלל"></label><label>תחום<select id="rules-category"><option value="all">כל התחומים</option>${RULE_CATEGORIES.map((category) => `<option value="${category.id}">${category.label} (${category.count})</option>`).join('')}</select></label><span id="rules-count" class="filter-result"></span></section><section id="rules-list" class="rules-list">${SYSTEM_RULES.map((rule) => `<details class="rule-card panel" data-rule data-category="${rule.category}" data-search="${escapeHtml(`${rule.id} ${rule.title} ${rule.details}`.toLowerCase())}"><summary><span><strong>${rule.id}</strong><span>${escapeHtml(rule.title)}</span></span><small>${rule.categoryLabel}</small></summary><div class="rule-details"><p class="source-note">מקור: ${rule.source}</p><div>${documentedText(rule.details)}</div></div></details>`).join('')}</section>`;
}

function bindSystemRules() {
  const search = $('#rules-search'); const category = $('#rules-category'); const count = $('#rules-count');
  const update = () => { const query = search.value.trim().toLowerCase(); let visible = 0; document.querySelectorAll('[data-rule]').forEach((item) => { const show = (!query || item.dataset.search.includes(query)) && (category.value === 'all' || item.dataset.category === category.value); item.hidden = !show; if (show) visible += 1; }); count.textContent = `${visible} כללים`; };
  search.addEventListener('input', update); category.addEventListener('change', update); update();
}

function managementTableShell(title, description) {
  return `<section class="page-heading"><div><p class="eyebrow">הרשאות וטבלאות</p><h1>${title}</h1><p>${description}</p></div><span class="status-badge status-success">קריאה בלבד</span></section><div id="management-table-state" class="state panel">טוען נתונים זמינים…</div><section id="management-tables" class="management-tables" hidden></section>`;
}

function displayValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'כן' : 'לא';
  if (Array.isArray(value)) return value.join(', ') || '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function dataTableTemplate(descriptor, rows) {
  const body = rows.length ? `<div class="management-table-scroll"><table><thead><tr>${descriptor.columns.map(([, label]) => `<th>${label}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${descriptor.columns.map(([key]) => `<td>${escapeHtml(displayValue(row[key]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="empty-inline">אין רשומות זמינות במקור הנתונים.</p>';
  return `<details class="management-table-card panel" open><summary><span><strong>${descriptor.title}</strong><small>${descriptor.description}</small></span><span>${rows.length} רשומות</span></summary>${body}</details>`;
}

async function loadManagementTables(kind) {
  const descriptors = kind === 'reference' ? REFERENCE_TABLES : VARIABLE_RULE_TABLES;
  const cacheKey = `tables:${kind}`;
  if (!managementData.has(cacheKey)) managementData.set(cacheKey, Promise.all(descriptors.map(async (descriptor) => { try { return { descriptor, rows: await rest(descriptor.table, 'select=*&limit=500') }; } catch (error) { return { descriptor, rows: [], error: error.message }; } })));
  const results = await managementData.get(cacheKey);
  if (parseRoute().section !== 'training') return;
  const container = $('#management-tables'); if (!container) return;
  const cards = results.map(({ descriptor, rows, error }) => error ? `<details class="management-table-card panel"><summary><span><strong>${descriptor.title}</strong><small>${descriptor.description}</small></span><span>לא זמין</span></summary><p class="empty-inline">מקור הנתונים אינו זמין למשתמש הנוכחי.</p></details>` : dataTableTemplate(descriptor, rows));
  if (kind === 'reference') {
    const statusRules = SYSTEM_RULES.filter((rule) => DOCUMENTED_STATUS_RULES.includes(rule.id));
    cards.push(`<details class="management-table-card panel"><summary><span><strong>סטטוסים וסיווגים מתועדים</strong><small>ערכי סטטוס שהוגדרו ב־Handbook.</small></span><span>${statusRules.length} קבוצות</span></summary><div class="documented-statuses">${statusRules.map((rule) => `<article><strong>${rule.id} — ${escapeHtml(rule.title)}</strong><div>${documentedText(rule.details)}</div></article>`).join('')}</div></details>`);
  }
  container.innerHTML = cards.join(''); container.hidden = false; $('#management-table-state').hidden = true;
}

function auditLogTemplate() {
  return `<section class="page-heading"><div><p class="eyebrow">הרשאות וטבלאות</p><h1>יומן שינויים</h1><p>היסטוריה גלובלית לפי סוג אובייקט ומזהה אובייקט.</p></div><span class="status-badge status-success">קריאה בלבד</span></section><section class="management-filters panel"><label>חיפוש<input id="audit-search" type="search" placeholder="אובייקט, פעולה או מזהה"></label></section><div id="audit-state" class="state panel">טוען אירועי ביקורת…</div><section id="audit-list" class="audit-list" hidden></section>`;
}

async function loadAuditLog() {
  let rows = []; let error = '';
  try { rows = await rest('audit_events', 'select=*&order=occurred_at.desc&limit=500'); } catch (caught) { error = caught.message; }
  if (parseRoute().page !== 'audit') return;
  const state = $('#audit-state'); const list = $('#audit-list');
  if (error) { state.className = 'state error panel'; state.textContent = 'יומן השינויים אינו זמין למשתמש הנוכחי.'; return; }
  if (!rows.length) { state.innerHTML = '<strong>אין אירועי ביקורת זמינים</strong><p>אירועים יופיעו כאן כאשר מקור הביקורת יכיל רשומות.</p>'; return; }
  state.hidden = true; list.hidden = false;
  list.innerHTML = rows.map((row) => `<article class="audit-card panel" data-audit-search="${escapeHtml(JSON.stringify(row).toLowerCase())}"><div><strong>${escapeHtml(displayValue(row.entity_type || row.object_type))}</strong><span>${escapeHtml(displayValue(row.action_type || row.action))}</span></div><dl><div><dt>מזהה אובייקט</dt><dd>${escapeHtml(displayValue(row.entity_id || row.object_id))}</dd></div><div><dt>מועד</dt><dd>${escapeHtml(displayValue(row.created_at))}</dd></div><div><dt>מבצע</dt><dd>${escapeHtml(displayValue(row.actor_user_id || row.changed_by))}</dd></div></dl></article>`).join('');
  $('#audit-search').addEventListener('input', (event) => { const query = event.target.value.trim().toLowerCase(); document.querySelectorAll('[data-audit-search]').forEach((item) => { item.hidden = query && !item.dataset.auditSearch.includes(query); }); });
}

function calculatorsTemplate() {
  const cards = [
    { route: 'calculators/salary', icon: '₪', title: 'מחשבון שכר', description: 'אומדן שכר חודשי לפי כללי השכר הפעילים.' },
    { route: 'calculators/occupancy', icon: '▦', title: 'תפוסה, תקינה ורווחיות', description: 'בדיקת הרכב כיתה, שטח, צוות והיתכנות כלכלית.' }
  ];
  return `<section class="page-heading"><div><p class="eyebrow">מחשבונים</p><h1>מחשבונים</h1><p>כלי עזר לחישוב ולתכנון על בסיס כללי הארגון הפעילים.</p></div></section><section class="module-grid">${cards.filter((card) => canViewRoute(card.route)).map((card) => `<a class="module-card card" href="#${card.route}"><span class="module-icon">${card.icon}</span><div><h3>${card.title}</h3><p>${card.description}</p></div><span class="card-action">פתיחה ←</span></a>`).join('')}</section>`;
}

async function loadOccupancyRules() {
  if (occupancyModel.status === 'loading' || occupancyModel.status === 'ready') return;
  occupancyModel = { status: 'loading', error: '' };
  try {
    const [ages, licensing, rules, categories, parameters, years] = await Promise.all([
      rest('age_groups', 'select=age_group_id,age_group_code,display_name,display_order,lifecycle_status&lifecycle_status=eq.ACTIVE&order=display_order'),
      rest('classroom_licensing_rules', 'select=classroom_licensing_rule_id,age_group,sqm_per_child,max_children,allowed_mixed_with,valid_from,valid_to,rounding_method,lifecycle_status&lifecycle_status=eq.ACTIVE'),
      rest('budget_rules', 'select=budget_rule_id,budget_category_id,school_year_id,age_group_id,effective_from,effective_to,numeric_value,lifecycle_status,calculation_method,parameter_1,standard_type,minimum_staff,rounding_method&lifecycle_status=eq.ACTIVE'),
      rest('budget_categories', 'select=budget_category_id,budget_category_code,category_type,lifecycle_status&lifecycle_status=eq.ACTIVE'),
      rest('staffing_budget_parameters', 'select=staffing_budget_parameter_id,school_year_id,monthly_hours_per_fte,lifecycle_status&lifecycle_status=eq.ACTIVE'),
      rest('school_years', 'select=school_year_id,display_name,start_date,end_date,is_default,is_selectable&is_selectable=eq.true')
    ]);
    occupancyModel = { status: 'ready', error: '', ages, licensing, rules, categories, parameters, years };
  } catch (error) { occupancyModel = { status: 'error', error: error.message }; }
}

function occupancyManagementCalculatorTemplate() {
  return `<section class="page-heading"><div><p class="eyebrow">מחשבונים / תפוסה, תקינה ורווחיות</p><h1>תפוסה, תקינה ורווחיות</h1><p>שלושה צעדים קצרים לבדיקת הכיתה ולקבלת החלטה ניהולית.</p></div><a class="button button-secondary" href="#calculators">חזרה למחשבונים</a></section><div id="occupancy-state" class="state panel">טוען כללים פעילים…</div><section id="occupancy-calculator" class="occupancy-calculator" hidden><form id="occupancy-form" class="panel occupancy-inputs" novalidate><section class="guided-step"><div class="guided-step-heading"><span>1</span><div><h2>איזו כיתה בודקים?</h2><p>בחרי את קבוצת הגיל של הכיתה. בכיתה מעורבת תבחרי גם את ההרכב.</p></div></div><div id="occupancy-classroom-choices" class="occupancy-choice-grid" role="radiogroup" aria-label="סוג כיתה"></div></section><section class="guided-step"><div class="guided-step-heading"><span>2</span><div><h2>מה ידוע לך?</h2><p>הבחירה קובעת אילו נתונים צריך להזין ומה המחשבון יחזיר.</p></div></div><div class="occupancy-choice-grid known-choice-grid" role="radiogroup" aria-label="נתונים ידועים"><label class="occupancy-choice"><input type="radio" name="knownType" value="AREA"><strong>יש לי שטח כיתה</strong><small>נחשב כמה ילדים מותר לשבץ.</small></label><label class="occupancy-choice"><input type="radio" name="knownType" value="CHILDREN"><strong>יש לי מספר ילדים</strong><small>נחשב כמה שטח נדרש.</small></label><label class="occupancy-choice"><input type="radio" name="knownType" value="BOTH"><strong>יש לי גם שטח וגם מספר ילדים</strong><small>נבדוק אם הכיתה עומדת בדרישות.</small></label></div></section><section id="occupancy-data-step" class="guided-step" hidden><div class="guided-step-heading"><span>3</span><div><h2>נתוני הכיתה</h2><p id="occupancy-data-help"></p></div></div><div id="occupancy-mixed-selector" class="mixed-selector" hidden></div><div id="occupancy-required-fields" class="occupancy-fields"></div><label class="field">שכר שעתי — לא חובה<input name="hourlyWage" type="number" min="0" step="0.01" inputmode="decimal" placeholder="אם ידוע, נחשב עלות שכר ויתרה"><small>אפשר להשאיר ריק. שכר יוסיף אומדן עלות ויתרה בלבד.</small></label><div id="occupancy-calculated-fields" class="occupancy-calculated-fields" hidden><label class="field">קיבולת חוקית מרבית<input name="calculatedCapacity" readonly aria-readonly="true"></label><label class="field">שטח חוקי נדרש<input name="calculatedArea" readonly aria-readonly="true"></label></div><div id="occupancy-validation" class="inline-validation" role="alert" hidden></div><div id="occupancy-guidance" class="occupancy-guidance" role="status"></div><div class="occupancy-actions"><button class="button button-primary" type="submit">חשבי תוצאה</button><button class="button button-quiet" type="reset">איפוס</button></div></section></form><details class="panel occupancy-usage"><summary>איך משתמשים במחשבון?</summary><ol><li>בוחרים סוג כיתה.</li><li>בוחרים אם ידוע השטח, מספר הילדים או שניהם.</li><li>מזינים רק את הנתונים שהתבקשו. בכיתה מעורבת מזינים ילדים בכל קבוצת גיל שנבחרה.</li></ol></details><section id="occupancy-results" class="occupancy-results" hidden aria-live="polite"><div class="occupancy-result-heading"><div><h2>תוצאות</h2><p id="occupancy-result-context" class="muted"></p></div><div class="occupancy-actions"><button class="button button-secondary" type="button" data-occupancy-print>הדפסה / PDF</button><button class="button button-secondary" type="button" data-occupancy-csv>CSV</button></div></div><section id="occupancy-overall" class="panel occupancy-overall"></section><div id="occupancy-summary" class="occupancy-summary"></div><section id="occupancy-financial-impact" class="panel occupancy-financial"></section><section id="occupancy-recommendation" class="panel occupancy-recommendation"></section><section class="panel occupancy-alternatives"><div class="section-heading"><div><h2>חלופות חוקיות ושימושיות</h2><p>כל חלופה נבדקה מול קיבולת, שטח, הרכב ותקינת צוות.</p></div></div><div id="occupancy-alternatives"></div></section></section></section>`;
}

function bindOccupancyManagementCalculator() {
  const form = $('#occupancy-form');
  const model = occupancyModel;
  const ageById = new Map(model.ages.map((age) => [age.age_group_id, age]));
  const ageByCode = new Map(model.ages.map((age) => [age.age_group_code, age]));
  const categoryById = new Map(model.categories.map((item) => [item.budget_category_id, item]));
  const activeYear = model.years.find((year) => year.is_default) || model.years.find((year) => year.is_selectable) || model.years[0];
  const overlapsActiveYear = (from, to) => !activeYear || (!from || from <= activeYear.end_date) && (!to || to >= activeYear.start_date);
  const licensing = model.licensing.filter((rule) => overlapsActiveYear(rule.valid_from, rule.valid_to));
  const staffingRows = model.rules.filter((rule) => categoryById.get(rule.budget_category_id)?.budget_category_code === 'CAT-PAYROLL-STAFF' && rule.school_year_id === activeYear?.school_year_id && rule.calculation_method === 'STAFFING_RATIO' && rule.parameter_1 != null && overlapsActiveYear(rule.effective_from, rule.effective_to));
  const tuitionRows = model.rules.filter((rule) => categoryById.get(rule.budget_category_id)?.budget_category_code === 'CAT-TUITION' && rule.school_year_id === activeYear?.school_year_id && rule.calculation_method === 'TUITION_MONTHLY' && rule.numeric_value != null && overlapsActiveYear(rule.effective_from, rule.effective_to));
  const monthlyOperatingHours = model.parameters.find((row) => row.school_year_id === activeYear?.school_year_id)?.monthly_hours_per_fte || 0;
  const standardTypes = [...new Set(staffingRows.map((rule) => rule.standard_type).filter(Boolean))];
  const completeStandards = standardTypes.map((type) => {
    const staffingAges = new Set(staffingRows.filter((rule) => rule.standard_type === type).map((rule) => ageById.get(rule.age_group_id)?.age_group_code));
    const specificTuitionAges = new Set(tuitionRows.filter((rule) => rule.standard_type === type).map((rule) => ageById.get(rule.age_group_id)?.age_group_code).filter(Boolean));
    const hasGeneralTuition = tuitionRows.some((rule) => !rule.age_group_id && (!rule.standard_type || rule.standard_type === type));
    const complete = model.ages.every((age) => staffingAges.has(age.age_group_code) && (specificTuitionAges.has(age.age_group_code) || hasGeneralTuition));
    return { type, complete, specificity: specificTuitionAges.size };
  }).filter((row) => row.complete).sort((a, b) => b.specificity - a.specificity || a.type.localeCompare(b.type));
  const standardType = completeStandards[0]?.type;
  if (!activeYear || !licensing.length || !standardType || !monthlyOperatingHours) {
    $('#occupancy-state').className = 'state error panel';
    $('#occupancy-state').textContent = 'לא ניתן להפעיל את המחשבון עד להשלמת כללי רישוי, תקינה, שכר לימוד ושעות פעילות לכל קבוצות הגיל.';
    return;
  }

  const classroomChoices = [...model.ages.map((age) => ({ value: age.age_group_code, title: age.display_name, help: 'כיתה לקבוצת גיל אחת.' })), { value: 'MIXED', title: 'מעורבת', help: 'שתי קבוצות גיל שמותר לשלב לפי הכללים.' }];
  $('#occupancy-classroom-choices').innerHTML = classroomChoices.map((choice) => `<label class="occupancy-choice"><input type="radio" name="classroomType" value="${escapeHtml(choice.value)}"><strong>${escapeHtml(choice.title)}</strong><small>${escapeHtml(choice.help)}</small></label>`).join('');

  const numberValue = (name) => Number(form.elements[name]?.value || 0);
  const selected = (name) => form.elements[name]?.value || '';
  const selectedMixedAges = () => [...form.querySelectorAll('[name="mixedAge"]:checked')].map((input) => input.value);
  const activeInputAges = () => selected('classroomType') === 'MIXED' ? selectedMixedAges() : [selected('classroomType')].filter(Boolean);
  const needsArea = () => ['AREA', 'BOTH'].includes(selected('knownType'));
  const needsChildren = () => ['CHILDREN', 'BOTH'].includes(selected('knownType')) || selected('classroomType') === 'MIXED';
  const ruleRequest = (composition) => {
    const budgetRules = staffingRows.filter((rule) => rule.standard_type === standardType).map((rule) => ({ ...rule, age_group: ageById.get(rule.age_group_id)?.age_group_code }));
    const tuitionRules = tuitionRows.filter((rule) => !rule.standard_type || rule.standard_type === standardType).map((rule) => ({ ...rule, age_group: ageById.get(rule.age_group_id)?.age_group_code }));
    return { composition, area: needsArea() ? numberValue('area') : 0, capacityAge: activeInputAges()[0], standardType, hourlyWage: form.elements.hourlyWage.value, budgetRules, licensingRules: licensing, tuitionRules, monthlyOperatingHours };
  };
  const currentComposition = () => Object.fromEntries(activeInputAges().map((age) => [age, numberValue(`age_${age}`)]));

  let current = null;
  const configureFields = () => {
    const classroomType = selected('classroomType');
    const knownType = selected('knownType');
    $('#occupancy-data-step').hidden = !(classroomType && knownType);
    if (!classroomType || !knownType) return;
    const mixed = classroomType === 'MIXED';
    $('#occupancy-mixed-selector').hidden = !mixed;
    $('#occupancy-mixed-selector').innerHTML = mixed ? `<strong>אילו קבוצות גיל נמצאות יחד?</strong><p>בחרי שתי קבוצות. רק שילוב שמאושר בכללי הרישוי יוכל להמשיך לחישוב.</p><div class="mixed-age-choices">${model.ages.map((age) => `<label><input type="checkbox" name="mixedAge" value="${escapeHtml(age.age_group_code)}"><span>${escapeHtml(age.display_name)}</span></label>`).join('')}</div>` : '';
    renderRequiredFields();
  };
  const renderRequiredFields = () => {
    const ages = activeInputAges();
    const fields = [];
    if (needsArea()) fields.push(`<label class="field">שטח הכיתה במ״ר<input name="area" type="number" min="0.1" step="0.1" inputmode="decimal" placeholder="לדוגמה: 55" required><small>השטח הפנוי בפועל לשימוש הכיתה.</small></label>`);
    if (needsChildren()) ages.forEach((age) => fields.push(`<label class="field">מספר ${escapeHtml(ageByCode.get(age)?.display_name || age)}<input name="age_${escapeHtml(age)}" type="number" min="1" step="1" inputmode="numeric" placeholder="הזיני מספר ילדים" required><small>מספר הילדים בפועל בקבוצת גיל זו.</small></label>`));
    $('#occupancy-required-fields').innerHTML = fields.join('');
    $('#occupancy-data-help').textContent = selected('classroomType') === 'MIXED' ? 'בכיתה מעורבת חייבים לבחור שתי קבוצות ולהזין מספר ילדים לכל אחת.' : selected('knownType') === 'AREA' ? 'הזיני שטח בלבד ונחשב קיבולת מרבית.' : selected('knownType') === 'CHILDREN' ? 'הזיני מספר ילדים ונחשב את השטח הנדרש.' : 'הזיני שטח ומספר ילדים ונבדוק התאמה.';
    validateAndRender();
  };
  const validate = () => {
    const errors = [];
    const ages = activeInputAges();
    if (!selected('classroomType')) errors.push('יש לבחור סוג כיתה.');
    if (!selected('knownType')) errors.push('יש לבחור מה ידוע לך.');
    if (selected('classroomType') === 'MIXED') {
      if (ages.length !== 2) errors.push('בכיתה מעורבת יש לבחור בדיוק שתי קבוצות גיל.');
      else {
        const licenses = ages.map((age) => licensing.find((rule) => rule.age_group === age));
        if (!licenses.every((rule, index) => (rule?.allowed_mixed_with || []).includes(ages[1 - index]))) errors.push('שילוב קבוצות הגיל שנבחר אינו מותר בכיתה מעורבת.');
      }
    }
    if (needsArea() && numberValue('area') <= 0) errors.push('יש להזין שטח כיתה גדול מאפס.');
    if (needsChildren()) ages.forEach((age) => { if (!Number.isInteger(numberValue(`age_${age}`)) || numberValue(`age_${age}`) <= 0) errors.push(`יש להזין מספר ילדים שלם וחיובי עבור ${ageByCode.get(age)?.display_name || age}.`); });
    return errors;
  };
  const signed = (value, suffix = '') => `${value > 0 ? '+' : ''}${number.format(value)}${suffix}`;
  const metric = ({ label, ok, required, actual, difference, explanation, issue }) => `<article class="occupancy-metric ${ok ? 'status-good' : 'status-exception'}"><header><h3>${label}</h3><strong>${ok ? '🟢 תקין' : '🔴 לא תקין'}</strong></header><dl><div><dt>נדרש</dt><dd>${required}</dd></div><div><dt>בפועל</dt><dd>${actual}</dd></div><div><dt>הפרש</dt><dd>${difference}</dd></div></dl>${!ok && issue ? `<p class="occupancy-exception-reason">${issue}</p>` : ''}<details><summary>איך חושב?</summary><p>${explanation}</p></details></article>`;
  const renderResult = (calculationRequest, result) => {
    current = { request: calculationRequest, result };
    form.elements.calculatedCapacity.value = `${number.format(result.maximumLegalCapacity)} ילדים`;
    form.elements.calculatedArea.value = `${number.format(result.requiredSqm)} מ״ר`;
    $('#occupancy-calculated-fields').hidden = false;
    const compositionLabel = result.details.map((detail) => `${escapeHtml(ageByCode.get(detail.age)?.display_name || detail.age)}: ${number.format(detail.children)}`).join(', ');
    const excess = result.details.filter((detail) => detail.children > detail.maxChildren).map((detail) => `${escapeHtml(ageByCode.get(detail.age)?.display_name || detail.age)}: חריגה של ${number.format(detail.children - detail.maxChildren)}`).join('; ');
    const metrics = [
      { label: 'קיבולת ילדים', ok: result.childrenCompliant, required: `עד ${number.format(result.maximumLegalCapacity)}`, actual: number.format(result.children), difference: signed(result.maximumLegalCapacity - result.children), issue: excess || 'מספר הילדים חורג מהקיבולת החוקית.', explanation: 'בכיתה חד-גילאית עם שטח ידוע, הקיבולת היא הנמוך מבין מגבלת הילדים הפעילה לבין הקיבולת שהשטח מאפשר.' },
      { label: 'שטח נדרש', ok: result.areaCompliant, required: `${number.format(result.requiredSqm)} מ״ר`, actual: `${number.format(result.actualSqm)} מ״ר${needsArea() ? '' : ' (מחושב)'}`, difference: signed(result.remainingSqm, ' מ״ר'), issue: `חסרים ${number.format(Math.abs(result.remainingSqm))} מ״ר.`, explanation: 'לכל קבוצת גיל: מספר הילדים כפול המ״ר לילד שבכלל הרישוי הפעיל; בכיתה מעורבת מחברים את התוצאות.' },
      { label: 'הרכב כיתה מעורבת', ok: result.compositionCompliant, required: 'שילוב מאושר', actual: compositionLabel, difference: result.compositionCompliant ? '0 חריגות' : '1- חריגה', issue: 'שילוב הגילים אינו מאושר לפי כללי הרישוי הפעילים.', explanation: 'כל זוג קבוצות נבדק הדדית מול רשימת השילובים המותרים בבסיס הנתונים.' },
      { label: 'צוות נדרש', ok: result.staffingCompliant, required: result.requiredStaff == null ? 'כלל פעיל' : number.format(result.requiredStaff), actual: result.requiredStaff == null ? 'לא ניתן לחשב' : number.format(result.requiredStaff), difference: result.requiredStaff == null ? 'חסר כלל' : '0', explanation: 'מספר הילדים בכל קבוצת גיל מחולק ביחס התקינה הפעיל ומעוגל בשיטת העיגול הפעילה.' },
      { label: 'הכנסה משוערת', ok: result.revenue > 0, required: 'כלל שכר לימוד פעיל', actual: money.format(result.revenue), difference: '—', explanation: 'מספר הילדים בכל קבוצת גיל מוכפל בשכר הלימוד החודשי הפעיל.' },
      { label: 'יעילות תפוסה', ok: result.efficiencyScore != null, required: 'עד 100%', actual: `${number.format(result.efficiencyScore || 0)}%`, difference: signed((result.efficiencyScore || 0) - 100, '%'), explanation: 'מספר הילדים בפועל חלקי הקיבולת החוקית של ההרכב.' },
      { label: 'עלות שכר משוערת', ok: result.payrollCost == null || result.payrollCost <= result.revenue, required: result.payrollCost == null ? 'לא חובה' : `עד ${money.format(result.revenue)}`, actual: result.payrollCost == null ? 'לא הוזן שכר' : money.format(result.payrollCost), difference: result.payrollCost == null ? '—' : money.format(result.revenue - result.payrollCost), explanation: 'הצוות הנדרש כפול שעות התקן החודשיות הפעילות כפול השכר השעתי שהוזן.' },
      { label: 'יתרה משוערת', ok: result.surplus == null || result.surplus >= 0, required: '0 ₪ ומעלה', actual: result.surplus == null ? 'נדרש שכר שעתי' : money.format(result.surplus), difference: result.surplus == null ? '—' : money.format(result.surplus), explanation: 'הכנסה משוערת פחות אומדן עלות השכר. הוצאות אחרות אינן נכללות.' }
    ];
    const failures = [result.childrenCompliant, result.areaCompliant, result.compositionCompliant, result.staffingCompliant].filter((ok) => !ok).length;
    $('#occupancy-overall').className = `panel occupancy-overall ${result.compliant && result.staffingCompliant ? 'status-good' : 'status-exception'}`;
    $('#occupancy-overall').innerHTML = `<span>סטטוס כללי</span><strong>${result.compliant && result.staffingCompliant ? '🟢 תקין' : '🔴 לא תקין'}</strong><dl><div><dt>נדרש</dt><dd>4 בדיקות תקינות</dd></div><div><dt>בפועל</dt><dd>${4 - failures} בדיקות תקינות</dd></div><div><dt>הפרש</dt><dd>${failures} חריגות</dd></div></dl>`;
    $('#occupancy-summary').innerHTML = metrics.map(metric).join('');
    $('#occupancy-financial-impact').innerHTML = result.payrollCost == null ? `<h2>השפעה כספית</h2><p>הכנסה חודשית משוערת: <strong>${money.format(result.revenue)}</strong>. הוסיפי שכר שעתי לקבלת עלות שכר ויתרה.</p>` : `<h2>השפעה כספית</h2><div><span>הכנסה<strong>${money.format(result.revenue)}</strong></span><span>עלות שכר<strong>${money.format(result.payrollCost)}</strong></span><span>יתרה<strong>${money.format(result.surplus)}</strong></span></div><details><summary>איך חושבה היתרה?</summary><p>הכנסה משוערת פחות צוות נדרש כפול שעות חודשיות כפול השכר השעתי.</p></details>`;
    const recommendation = !result.compositionCompliant ? 'יש לבחור שתי קבוצות גיל שהשילוב ביניהן מאושר.' : !result.childrenCompliant ? 'יש להפחית את מספר הילדים עד לקיבולת החוקית.' : !result.areaCompliant ? `יש להוסיף לפחות ${number.format(Math.abs(result.remainingSqm))} מ״ר או להפחית ילדים.` : !result.staffingCompliant ? 'לא ניתן לאשר את הכיתה עד להשלמת כלל תקינת הצוות.' : result.surplus != null && result.surplus < 0 ? 'הכיתה תקינה, אך אומדן השכר גבוה מההכנסה.' : 'הכיתה עומדת בדרישות לפי הנתונים שהוזנו.';
    $('#occupancy-recommendation').innerHTML = `<div><span>המלצה ניהולית</span><strong>${recommendation}</strong></div>`;
    const alternatives = buildLegalOccupancyAlternatives(calculationRequest);
    $('#occupancy-alternatives').innerHTML = alternatives.length ? `<div class="occupancy-alternative-grid">${alternatives.map((row, index) => `<article class="occupancy-alternative-card"><header>${index === 0 ? '<span class="status-badge status-good">מומלצת</span>' : ''}<strong>${row.details.map((detail) => `${escapeHtml(ageByCode.get(detail.age)?.display_name || detail.age)}: ${number.format(detail.children)}`).join(' + ')}</strong></header><p>${index === 0 ? 'האפשרות החוקית בעלת ההשפעה הכספית הטובה ביותר מבין החלופות שנבדקו.' : 'חלופה חוקית קרובה לנתונים שהזנת.'}</p><dl><div><dt>שטח נדרש</dt><dd>${number.format(row.requiredSqm)} מ״ר</dd></div><div><dt>צוות</dt><dd>${number.format(row.requiredStaff)}</dd></div><div><dt>הכנסה</dt><dd>${money.format(row.revenue)}</dd></div><div><dt>יעילות</dt><dd>${number.format(row.efficiencyScore)}%</dd></div></dl></article>`).join('')}</div>` : '<div class="empty-state compact">אין חלופה קרובה שעברה את כל בדיקות החוקיות והתקינה.</div>';
    $('#occupancy-result-context').textContent = selected('knownType') === 'AREA' ? 'שטח ← קיבולת ילדים' : selected('knownType') === 'CHILDREN' ? 'ילדים ← שטח נדרש' : 'בדיקת שטח ומספר ילדים';
    $('#occupancy-results').hidden = false;
  };
  function validateAndRender(showErrors = false) {
    const errors = validate();
    $('#occupancy-validation').hidden = !showErrors || !errors.length;
    $('#occupancy-validation').innerHTML = errors.map((error) => `<p>${escapeHtml(error)}</p>`).join('');
    $('#occupancy-guidance').textContent = selected('knownType') === 'AREA' ? 'נחשב את מספר הילדים המרבי שהשטח מאפשר, בלי לעבור את מגבלת הרישוי.' : selected('knownType') === 'CHILDREN' ? 'נחשב את השטח החוקי הנדרש לפי מספר הילדים.' : selected('knownType') === 'BOTH' ? 'נבדוק את מספר הילדים מול השטח ומול מגבלות הכיתה.' : 'בחרי מה ידוע לך כדי להמשיך.';
    if (errors.length) { current = null; $('#occupancy-results').hidden = true; $('#occupancy-calculated-fields').hidden = true; return false; }
    const composition = needsChildren() ? currentComposition() : {};
    const calculationRequest = ruleRequest(composition);
    renderResult(calculationRequest, calculateOccupancyModel(calculationRequest));
    return true;
  }
  form.addEventListener('change', (event) => {
    if (event.target.name === 'classroomType' || event.target.name === 'knownType') configureFields();
    else if (event.target.name === 'mixedAge') renderRequiredFields();
    else validateAndRender();
  });
  form.addEventListener('input', () => validateAndRender());
  form.addEventListener('submit', (event) => { event.preventDefault(); validateAndRender(true); });
  form.addEventListener('reset', () => setTimeout(() => { current = null; $('#occupancy-data-step').hidden = true; $('#occupancy-results').hidden = true; $('#occupancy-calculated-fields').hidden = true; $('#occupancy-validation').hidden = true; }));
  $('[data-occupancy-print]').addEventListener('click', () => window.print());
  $('[data-occupancy-csv]').addEventListener('click', () => { if (!current) return; const r = current.result; const rows = [['מדד','נדרש','בפועל','הפרש'],['סטטוס כללי','תקין',r.compliant && r.staffingCompliant ? 'תקין' : 'לא תקין',''],['ילדים',r.allowedChildren,r.children,r.remainingChildren],['שטח',r.requiredSqm,r.actualSqm,r.remainingSqm],['הרכב','חוקי',r.compositionCompliant ? 'חוקי' : 'לא חוקי',''],['צוות',r.requiredStaff,r.requiredStaff,0],['הכנסה','כלל פעיל',r.revenue,''],['יעילות',100,r.efficiencyScore,(r.efficiencyScore ?? 100)-100],['עלות שכר','אופציונלי',r.payrollCost ?? '',''],['יתרה','0 ומעלה',r.surplus ?? '',r.surplus ?? '']]; const blob = new Blob(['\uFEFF' + rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"','""')}"`).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'occupancy-calculator.csv'; link.click(); URL.revokeObjectURL(link.href); });
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
    const yearRules = rules.map((rule) => ({
      ...rule,
      minimum_seniority_years: Math.ceil(Number(rule.minimum_seniority_months || 0) / 12),
      maximum_seniority_years: rule.maximum_seniority_months == null ? null : Math.floor(Number(rule.maximum_seniority_months) / 12)
    }));
    salaryModel = { status: 'ready', factors, rules: yearRules, years, error: '' };
  } catch (error) { salaryModel = { status: 'error', factors: [], rules: [], years: [], error: error.message }; }
}

function salaryCalculatorTemplate() {
  return `<section class="page-heading"><div><p class="eyebrow">מחשבונים / מחשבון שכר</p><h1>מחשבון שכר</h1><p>החישוב מבוסס על כללי שכר פעילים בלבד ומניח זכאות למענק התמדה.</p></div><a class="button button-secondary" href="#calculators">חזרה למחשבונים</a></section><div id="salary-state" class="state panel">טוען כללי שכר פעילים…</div><section id="salary-calculator" class="salary-calculator" hidden><form id="salary-form" class="panel salary-inputs"><label class="field">תעריף שעתי<input name="hourlyRate" type="number" min="0" step="0.01" value="50" required></label><label class="field">שעות חודשיות<input name="monthlyHours" type="number" min="1" step="0.5" value="160" required></label><label class="field">וותק מוכר (שנים)<input name="seniorityYears" type="number" min="0" step="1" value="0" required></label><label class="field">אחראית כיתה<select name="classManager"><option value="true">כן</option><option value="false" selected>לא</option></select></label><label class="field">תעודה<select name="certificate"><option value="YES">כן</option><option value="COMMITMENT">התחייבות</option><option value="NO">לא</option></select></label><label class="field">תואר<select name="degree"><option value="true">כן</option><option value="false">לא</option></select></label><label class="field">מצוינות<select name="excellence"><option value="true">כן</option><option value="false">לא</option></select></label><label class="field">נסיעות<select name="travel"><option value="true">כן</option><option value="false">לא</option></select></label><div class="salary-actions"><button class="button button-quiet" type="reset">איפוס</button><button class="button button-secondary" type="button" data-salary-print>הדפסה</button></div></form><section class="salary-results"><div class="salary-summary"><article><span>ברוטו חודשי</span><strong id="salary-gross">—</strong></article><article><span>עלות אפקטיבית לשעה</span><strong id="salary-effective">—</strong></article><article><span>נטו משוער</span><strong id="salary-net">—</strong></article></div><div class="panel salary-breakdown"><h2>פירוט חישוב</h2><p id="salary-certificate-note" class="muted"></p><div id="salary-components"></div></div><section class="panel salary-comparison"><div><h2>השוואת תרחישים A / B</h2><p>שמרי את התרחיש הנוכחי, עדכני ערכים והשווי.</p></div><div><button class="button button-secondary" type="button" data-scenario="A">שמירת תרחיש A</button><button class="button button-secondary" type="button" data-scenario="B">שמירת תרחיש B</button></div><div id="salary-scenarios"></div></section></section></section>`;
}

function bindSalaryCalculator() {
  const form = $('#salary-form'); let scenarios = {};
  const update = () => { const values = Object.fromEntries(new FormData(form)); const input = { ...values, hourlyRate: Number(values.hourlyRate), monthlyHours: Number(values.monthlyHours), seniorityYears: Number(values.seniorityYears), degree: values.degree === 'true', excellence: values.excellence === 'true', travel: values.travel === 'true' }; const result = calculateSalary(input, salaryModel.factors, salaryModel.rules, salaryModel.years); if (result.issues.length) { $('#salary-state').hidden = false; $('#salary-state').className = 'state error panel'; $('#salary-state').textContent = result.issues.join(' '); $('#salary-calculator').hidden = true; return null; } $('#salary-state').hidden = true; $('#salary-calculator').hidden = false; $('#salary-gross').textContent = money.format(result.gross); $('#salary-effective').textContent = money.format(result.effectiveHourly); $('#salary-net').textContent = `${money.format(result.netMin)}–${money.format(result.netMax)}`; $('#salary-certificate-note').textContent = input.certificate === 'COMMITMENT' ? 'תוספת התעודה חושבה לפי כלל ההתחייבות הפעיל.' : 'הסכומים מחושבים לפי הכללים הפעילים בשנת הלימודים שנבחרה.'; $('#salary-components').innerHTML = result.components.map((item) => `<div class="salary-component"><span>${escapeHtml(item.name)}</span><strong>${money.format(item.amount)}</strong></div>`).join(''); return { input, result }; };
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
  return `<section class="page-heading"><div><p class="eyebrow">דשבורדים · ${escapeHtml(unit.display_name)}</p><h1>${escapeHtml(unit.display_name)}</h1><p>בחרי את סוג הדשבורד שברצונך לפתוח עבור יחידה זו.</p></div><a class="button button-secondary" href="#dashboards">חזרה לכל היחידות</a></section><section class="dashboard-type-grid" aria-label="סוגי דשבורדים">${dashboardTypes.filter((type) => canView(`dashboards.${type.id}`)).map((type) => `<a class="dashboard-type-card card" data-dashboard-type="${type.id}" href="${unitRoute(unit.allocation_unit_id, type.id)}"><span class="dashboard-type-icon" aria-hidden="true">${type.icon}</span><div><h2>${type.title}</h2><p>${type.description}</p></div><span class="card-action">פתיחת הדשבורד <span aria-hidden="true">←</span></span></a>`).join('')}</section>`;
}

function accountingHubTemplate(unit) {
  const cards = [
    { code: 'dashboards.accounting.summary', child: 'summary', icon: '▦', title: 'דשבורד סיכום', description: 'בקרה מסכמת על סטטוס הטיפול בתנועות והעברה להנהלת חשבונות.' },
    { code: 'dashboards.accounting.banks', child: 'banks', icon: '▤', title: 'קובץ בנקים', description: 'סביבת עבודה מהירה לשיוך, מסמכים וטיפול בתנועות בנק.' }
  ];
  return `<section class="page-heading"><div><p class="eyebrow">הנה״ח</p><h1>הנה״ח</h1><p>בחרי את סביבת העבודה שברצונך לפתוח.</p></div><a class="button button-secondary" href="${unitRoute(unit.allocation_unit_id)}">חזרה לדשבורדי היחידה</a></section><section class="accounting-choice-grid" aria-label="מסכי הנהלת חשבונות">${cards.filter((card) => canView(card.code)).map((card) => `<a class="dashboard-type-card card" data-accounting-screen="${card.child}" href="${unitRoute(unit.allocation_unit_id, `accounting/${card.child}`)}"><span class="dashboard-type-icon" aria-hidden="true">${card.icon}</span><div><h2>${card.title}</h2><p>${card.description}</p></div><span class="card-action">פתיחת המסך <span aria-hidden="true">←</span></span></a>`).join('') || '<section class="empty-state panel">אין מסכי הנה״ח זמינים לפי ההרשאות הנוכחיות.</section>'}</section>`;
}

const bankWorkspaceRows = [];
let bankWorkspaceState = { selected: null, expanded: new Set(), quick: 'all', query: '' };

function bankWorkspaceTemplate() {
  return `<section class="bank-new-heading"><div><p class="eyebrow">הנה״ח / קובץ בנקים</p><h1>קובץ בנקים</h1><p>סביבת עבודה מהירה לשיוך, השלמת מסמכים והעברה להנה״ח.</p></div><span class="status-badge status-neutral">אין רשומות עדיין</span></section><section class="bank-new-summary"><button class="active" data-bank-quick="all"><span>כל התנועות</span><strong>0</strong><small>אין נתונים</small></button><button data-bank-quick="attention"><span>דורש טיפול</span><strong>0</strong><small>אין נתונים</small></button><button data-bank-quick="split"><span>תנועות מפוצלות</span><strong>0</strong><small>אין נתונים</small></button><article><span>זכות בתקופה</span><strong>₪0</strong><small>0 תנועות</small></article><article><span>חובה בתקופה</span><strong>₪0</strong><small>0 תנועות</small></article></section><section class="bank-new-toolbar panel"><label class="bank-new-search">⌕ <input id="bank-new-search" type="search" placeholder="חיפוש תיאור או אסמכתא…"><kbd>/</kbd></label><label>חשבון<select><option>כל החשבונות</option></select></label><label>חודש<select><option>כל החודשים</option></select></label><span id="bank-new-count">0 תנועות</span></section><section class="bank-new-main"><div class="bank-new-sheet panel"><div class="bank-new-scroll"><table><thead><tr><th>תאריך</th><th>תיאור תנועה</th><th>אסמכתא</th><th>חשבון</th><th>חובה</th><th>זכות</th><th>שיוך</th><th>חודש דיווח</th><th>סטטוס</th><th>מסמך</th></tr></thead><tbody id="bank-new-rows"></tbody></table></div><footer>↑↓ מעבר בין שורות · Enter פתיחת פיצול · / חיפוש</footer></div><aside class="bank-new-details panel" id="bank-new-details" hidden></aside></section>`;
}

function bankWorkspaceFilteredRows() {
  const query = bankWorkspaceState.query.trim().toLocaleLowerCase('he-IL');
  return bankWorkspaceRows.filter((row) => (bankWorkspaceState.quick !== 'attention' || ['warning', 'danger'].includes(row.tone)) && (bankWorkspaceState.quick !== 'split' || row.splits) && (!query || `${row.description} ${row.reference}`.toLocaleLowerCase('he-IL').includes(query)));
}

function renderBankWorkspace() {
  const rows = bankWorkspaceFilteredRows();
  const table = $('#bank-new-rows'); if (!table) return;
  $('#bank-new-count').textContent = `${rows.length} תנועות`;
  table.innerHTML = rows.map((row) => `<tr tabindex="0" data-bank-row="${row.id}" class="${bankWorkspaceState.selected === row.id ? 'selected' : ''}"><td>${row.date}</td><td><strong>${row.splits ? `<button type="button" data-bank-expand="${row.id}" aria-label="פתיחת פיצול">${bankWorkspaceState.expanded.has(row.id) ? '⌄' : '‹'}</button>` : ''}${escapeHtml(row.description)}</strong></td><td>${escapeHtml(row.reference)}</td><td>${escapeHtml(row.account)}</td><td class="bank-debit">${row.debit ? money.format(row.debit) : '—'}</td><td class="bank-credit">${row.credit ? money.format(row.credit) : '—'}</td><td><span class="bank-allocation">${escapeHtml(row.allocation)}</span></td><td>${row.month}</td><td><span class="status-badge status-${row.tone}">${escapeHtml(row.status)}</span></td><td class="bank-document">${row.document ? '⌕' : '—'}</td></tr>${row.splits && bankWorkspaceState.expanded.has(row.id) ? row.splits.map((split, index) => `<tr class="bank-split-row"><td></td><td>└ פיצול ${index + 1}</td><td></td><td></td><td class="bank-debit">${money.format(split[1])}</td><td>—</td><td><span class="bank-allocation">${escapeHtml(split[0])}</span></td><td>${row.month}</td><td></td><td></td></tr>`).join('') : ''}`).join('') || '<tr><td colspan="10"><div class="admin-state admin-empty"><strong>אין תנועות בנק להצגה</strong><p>התנועות יופיעו כאן לאחר חיבור מקור הנתונים והוספת הרשומה הראשונה.</p></div></td></tr>';
  const selected = bankWorkspaceRows.find((row) => row.id === bankWorkspaceState.selected) || rows[0];
  if (!selected) { $('#bank-new-details').hidden = true; return; }
  $('#bank-new-details').hidden = false;
  $('#bank-new-details').innerHTML = `<p class="eyebrow">פרטי תנועה</p><h2>${escapeHtml(selected.description)}</h2><div class="bank-detail-amount"><small>${selected.debit ? 'חובה' : 'זכות'}</small><strong class="${selected.debit ? 'bank-debit' : 'bank-credit'}">${money.format(selected.debit || selected.credit)}</strong><span>${selected.date} · ${escapeHtml(selected.account)}</span></div><dl><div><dt>אסמכתא</dt><dd>${escapeHtml(selected.reference)}</dd></div><div><dt>חודש דיווח</dt><dd>${selected.month}</dd></div><div><dt>שיוך</dt><dd>${escapeHtml(selected.allocation)}</dd></div><div><dt>סטטוס</dt><dd>${escapeHtml(selected.status)}</dd></div></dl><section><h3>מסמכים</h3><div class="bank-document-box">${selected.document ? '▱ אסמכתא סרוקה.pdf<br><small>Google Drive · מסמך הדגמה</small>' : 'טרם צורף מסמך'}</div></section><section><h3>הערות</h3><p>${escapeHtml(selected.note || 'אין הערות לתנועה זו.')}</p></section><section><h3>היסטוריה</h3><p>היום · נפתחה לבדיקה</p><p>נקלטה מקובץ הבנק</p></section><details><summary>מידע טכני</summary><p>שדות טכניים מוסתרים מהגיליון.</p></details>`;
}

function bindBankWorkspace() {
  renderBankWorkspace();
  $('#bank-new-search')?.addEventListener('input', (event) => { bankWorkspaceState.query = event.target.value; renderBankWorkspace(); });
  document.querySelectorAll('[data-bank-quick]').forEach((button) => button.addEventListener('click', () => { bankWorkspaceState.quick = button.dataset.bankQuick; document.querySelectorAll('[data-bank-quick]').forEach((item) => item.classList.toggle('active', item === button)); renderBankWorkspace(); }));
  $('#bank-new-rows')?.addEventListener('click', (event) => { const expand = event.target.closest('[data-bank-expand]'); if (expand) { const id = Number(expand.dataset.bankExpand); bankWorkspaceState.expanded.has(id) ? bankWorkspaceState.expanded.delete(id) : bankWorkspaceState.expanded.add(id); bankWorkspaceState.selected = id; renderBankWorkspace(); return; } const row = event.target.closest('[data-bank-row]'); if (row) { bankWorkspaceState.selected = Number(row.dataset.bankRow); renderBankWorkspace(); } });
  $('#page-content')?.addEventListener('keydown', (event) => { if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') { event.preventDefault(); $('#bank-new-search')?.focus(); return; } if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key) || ['INPUT', 'SELECT'].includes(document.activeElement?.tagName)) return; const rows = bankWorkspaceFilteredRows(); const index = rows.findIndex((row) => row.id === bankWorkspaceState.selected); if (event.key === 'Enter') { const row = rows[index]; if (row?.splits) { bankWorkspaceState.expanded.has(row.id) ? bankWorkspaceState.expanded.delete(row.id) : bankWorkspaceState.expanded.add(row.id); renderBankWorkspace(); } return; } event.preventDefault(); const next = event.key === 'ArrowDown' ? Math.min(index + 1, rows.length - 1) : Math.max(index - 1, 0); if (rows[next]) { bankWorkspaceState.selected = rows[next].id; renderBankWorkspace(); $(`[data-bank-row="${rows[next].id}"]`)?.focus(); } });
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
  return `<section class="financial-heading"><div><p class="eyebrow">דשבורד סיכום</p><h1>דשבורד סיכום · ${escapeHtml(unit.display_name)}</h1><p>בקרה על שלמות תנועות הבנק ותהליך הטיפול החשבונאי.</p></div><div class="dashboard-context"><span><small>יחידת הקצאה</small><strong>${escapeHtml(unit.display_name)}</strong></span><span><small>שנת לימודים</small><strong id="context-year">—</strong></span><span><small>תקופה נבחרת</small><strong id="context-period">—</strong></span></div></section>
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
  const isPrototypeAdministration = route.section === 'training' && route.page === 'rules' && route.child === 'calculation';
  const target = isPrototypeAdministration ? null : portalSection(routeScreenCode(route));
  if (target) {
    const byCode = new Map((portalAccess?.sections || []).map((item) => [item.screen_code, item]));
    const chain = [];
    let current = target;
    while (current) {
      chain.unshift(current);
      const inferredParent = current.screen_code.includes('.') ? current.screen_code.slice(0, current.screen_code.lastIndexOf('.')) : '';
      current = byCode.get(current.parent_screen_code || inferredParent) || null;
    }
    const home = byCode.get('home');
    if (home && chain[0]?.screen_code !== 'home') chain.unshift(home);
    if (route.section === 'dashboards' && unit && unit.allocation_unit_id !== 'organization') {
      const dashboardIndex = chain.findIndex((item) => item.screen_code === 'dashboards');
      const unitCrumb = { screen_code: 'dashboard-unit', route: `dashboards/unit/${encodeURIComponent(unit.allocation_unit_id)}`, display_name: unit.display_name };
      chain.splice(Math.max(dashboardIndex + 1, 1), 0, unitCrumb);
    }
    return chain.map((item, index) => {
      const last = index === chain.length - 1;
      const label = escapeHtml(item.display_name);
      const crumb = last ? `<span aria-current="page">${label}</span>` : `<a href="#${item.route}">${label}</a>`;
      return index ? `<span aria-hidden="true">/</span>${crumb}` : crumb;
    }).join('');
  }
  const parts = ['<a href="#home">עמוד הבית</a>'];
  if (route.section === 'home') return '<span aria-current="page">עמוד הבית</span>';
  if (route.section === 'calculators' && route.calculator) return `${parts.join('')}<span aria-hidden="true">/</span><a href="#calculators">מחשבונים</a><span aria-hidden="true">/</span><span aria-current="page">${route.calculator === 'salary' ? 'מחשבון שכר' : 'תפוסה, תקינה ורווחיות'}</span>`;
  if (route.section === 'payroll') {
    parts.push('<span aria-hidden="true">/</span>', route.page ? '<a href="#payroll">שכר</a>' : '<span aria-current="page">שכר</span>');
    if (route.page) parts.push('<span aria-hidden="true">/</span>', route.child ? '<a href="#payroll/calculations">חישובי שכר</a>' : '<span aria-current="page">חישובי שכר</span>');
    if (route.child) parts.push('<span aria-hidden="true">/</span>', `<span aria-current="page">${payrollCalculationCards.find((item) => item.route.endsWith(route.child)).title}</span>`);
    return parts.join('');
  }
  if (route.section === 'training') {
    const labels = { permissions: 'הרשאות', rules: 'כללים', tables: 'טבלאות', audit: 'יומן שינויים', users: 'רשימת משתמשים והרשאות', system: 'כללי מערכת', calculation: route.page === 'rules' ? 'כללי חישוב' : 'טבלאות חישוב', variables: 'משתנים' };
    parts.push('<span aria-hidden="true">/</span>', route.page ? '<a href="#training">הרשאות וטבלאות</a>' : '<span aria-current="page">הרשאות וטבלאות</span>');
    if (route.page) parts.push('<span aria-hidden="true">/</span>', route.child ? `<a href="#training/${route.page}">${labels[route.page]}</a>` : `<span aria-current="page">${labels[route.page]}</span>`);
    if (route.child) parts.push('<span aria-hidden="true">/</span>', `<span aria-current="page">${labels[route.child]}</span>`);
    return parts.join('');
  }
  if (route.section !== 'dashboards') return `${parts.join('')}<span aria-hidden="true">/</span><span aria-current="page">${simpleRoutes[route.section].title}</span>`;
  if (route.dashboardType === 'staffing' || route.dashboardType === 'accounting') {
    const label = route.dashboardType === 'staffing' ? 'צוות ורישוי' : 'הנה״ח';
    const target = unitRoute('organization', route.dashboardType);
    parts.push('<span aria-hidden="true">/</span>', unit?.allocation_unit_id === 'organization' ? `<span aria-current="page">${label}</span>` : `<a href="${target}">${label}</a>`);
    if (unit && unit.allocation_unit_id !== 'organization') parts.push('<span aria-hidden="true">/</span>', `<span aria-current="page">${escapeHtml(unit.display_name)}</span>`);
    return parts.join('');
  }
  parts.push('<span aria-hidden="true">/</span>', route.unitId ? '<a href="#dashboards">דשבורדים</a>' : '<span aria-current="page">דשבורדים</span>');
  if (unit) parts.push('<span aria-hidden="true">/</span>', type ? `<a href="${unitRoute(unit.allocation_unit_id)}">${escapeHtml(unit.display_name)}</a>` : `<span aria-current="page">${escapeHtml(unit.display_name)}</span>`);
  if (type) parts.push('<span aria-hidden="true">/</span>', `<span aria-current="page">${type.title}</span>`);
  return parts.join('');
}

async function render() {
  const route = parseRoute();
  if (!portalAccess) return;
  const requestedScreen = routeScreenCode(route);
  if (!canView(requestedScreen)) {
    $('#page-content').innerHTML = accessDeniedTemplate();
    $('#breadcrumbs').innerHTML = '<a href="#home">עמוד הבית</a><span aria-hidden="true">/</span><span aria-current="page">אין הרשאה</span>';
    document.title = 'אין הרשאה | פורטל חמ״ה';
    history.replaceState({}, '', `${location.pathname}#access-denied`);
    return;
  }
  const managementLabels = { permissions: 'הרשאות', rules: 'כללים', settings: 'הגדרות', tables: 'הגדרות', audit: 'יומן שינויים', users: 'רשימת משתמשים והרשאות', system: 'כללי מערכת', calculation: route.page === 'rules' ? 'כללי חישוב' : 'הגדרות', variables: 'הגדרות' };
  let title = route.calculator === 'salary' ? 'מחשבון שכר' : route.calculator === 'occupancy' ? 'תפוסה, תקינה ורווחיות' : route.section === 'training' && (route.child || route.page) ? managementLabels[route.child || route.page] : route.child ? payrollCalculationCards.find((item) => item.route.endsWith(route.child)).title : route.section === 'payroll' && route.page ? 'חישובי שכר' : route.section === 'home' ? 'עמוד הבית' : route.section === 'dashboards' ? 'דשבורדים' : simpleRoutes[route.section].title;
  let unit = null;
  let type = null;
  if (route.section === 'home') $('#page-content').innerHTML = homeTemplate();
  else if (route.section === 'calculators' && route.calculator === 'salary') { $('#page-content').innerHTML = salaryCalculatorTemplate(); await loadSalaryRules(); if (parseRoute().calculator === 'salary') { if (salaryModel.status === 'error') { $('#salary-state').className = 'state error panel'; $('#salary-state').textContent = 'לא ניתן לטעון את כללי השכר הפעילים. נסי שוב מאוחר יותר.'; } else { bindSalaryCalculator(); } } }
  else if (route.section === 'calculators' && route.calculator === 'occupancy') { $('#page-content').innerHTML = occupancyManagementCalculatorTemplate(); await loadOccupancyRules(); if (parseRoute().calculator === 'occupancy') { if (occupancyModel.status === 'error') { $('#occupancy-state').className = 'state error panel'; $('#occupancy-state').textContent = 'לא ניתן לטעון את כללי התפוסה הפעילים.'; } else { bindOccupancyManagementCalculator(); } } }
  else if (route.section === 'calculators') $('#page-content').innerHTML = calculatorsTemplate();
  else if (route.section === 'payroll' && route.child) $('#page-content').innerHTML = placeholderTemplate(title, 'payroll/calculations', 'חישובי שכר');
  else if (route.section === 'payroll' && route.page === 'calculations') $('#page-content').innerHTML = sectionCardsTemplate('payroll', payrollCalculationCards, 'חישובי שכר', 'בחירת מסלול לחישוב חדש, עבודה קיימת או טבלאות עבר.');
  else if (route.section === 'payroll') $('#page-content').innerHTML = sectionCardsTemplate('payroll');
  else if (route.section === 'training' && route.page === 'permissions' && route.child === 'users') { $('#page-content').innerHTML = usersPermissionsTemplate(); await loadPermissionsAdmin(); }
  else if (route.section === 'training' && route.page === 'rules' && route.child === 'system') { $('#page-content').innerHTML = systemRulesTemplate(); bindSystemRules(); }
  else if (route.section === 'training' && route.page === 'rules' && route.child === 'calculation') { $('#page-content').innerHTML = '<div id="prototype-admin-root"></div>'; mountAdministrationPrototype($('#prototype-admin-root'), 'rules'); }
  else if (route.section === 'training' && ['settings', 'tables'].includes(route.page)) { $('#page-content').innerHTML = '<div id="settings-center-root"></div>'; mountSettingsCenter($('#settings-center-root'), portalSettingsRequest, { canEdit: permissionFor('management.settings') === 'EDIT' }); }
  else if (route.section === 'training' && route.page === 'audit') { $('#page-content').innerHTML = auditLogTemplate(); await loadAuditLog(); }
  else if (route.section === 'training' && managementPages[route.page]) $('#page-content').innerHTML = managementHubTemplate(route.page);
  else if (route.section === 'training') $('#page-content').innerHTML = sectionCardsTemplate('training');
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
      } else if (type.id === 'accounting' && !route.dashboardChild) {
        title = 'הנה״ח';
        activeDashboardUnit = unit;
        $('#page-content').innerHTML = accountingHubTemplate(unit);
      } else if (type.id === 'accounting' && route.dashboardChild === 'banks') {
        title = 'קובץ בנקים';
        activeDashboardUnit = unit;
        $('#page-content').innerHTML = track015BankWorkbenchTemplate();
        await mountBankWorkbench(portalBankWorkbenchRequest);
      } else if (type.id === 'accounting' && route.dashboardChild === 'summary') {
        title = type.title;
        dashboardMode = 'accounting';
        activeDashboardUnit = unit;
        $('#page-content').innerHTML = accountingDashboardShell(unit);
        await loadAccountingDashboard();
        if (parseRoute().unitId === unit.allocation_unit_id && parseRoute().dashboardType === 'accounting' && parseRoute().dashboardChild === 'summary') renderAccountingData();
      } else if (['staffing', 'licensing', 'team'].includes(type.id)) {
        title = type.title; dashboardMode = type.id; activeDashboardUnit = unit; $('#page-content').innerHTML = staffDashboardShell(unit); await loadStaffDashboard(); if (parseRoute().unitId === unit.allocation_unit_id && parseRoute().dashboardType === type.id) renderStaffData();
      } else { title = type.title; $('#page-content').innerHTML = dashboardPlaceholderTemplate(unit, type); }
    }
  }
  const catalogTitle = portalSection(requestedScreen)?.display_name;
  if (catalogTitle && !(route.section === 'dashboards' && unit && !route.dashboardType)) title = catalogTitle;
  document.title = `${title} | פורטל חמ״ה`;
  $('#breadcrumbs').innerHTML = breadcrumbsTemplate(route, unit, type);
  const navigationRoute = route.section === 'dashboards' && ['staffing', 'accounting'].includes(route.dashboardType) ? route.dashboardType : route.section;
  document.querySelectorAll('[data-route]').forEach((item) => item.classList.toggle('active', item.dataset.route === navigationRoute));
  const mobileQuickRoutes = new Set(['home', 'dashboards', 'staffing', 'accounting']);
  $('#mobile-more').classList.toggle('active', !mobileQuickRoutes.has(navigationRoute));
  const retryButton = $('[data-retry-units]');
  if (retryButton) retryButton.addEventListener('click', () => { unitState = { status: 'idle', items: [], error: '' }; render(); });
  $('#close-kpi-panel')?.addEventListener('click', closeKpiPanel);
  $('#kpi-backdrop')?.addEventListener('click', closeKpiPanel);
  $('#refresh-dashboard')?.addEventListener('click', async () => {
    const button = $('#refresh-dashboard');
    button.disabled = true;
    button.textContent = 'מרענן נתונים…';
    if (dashboardMode === 'accounting') { accountingStatus = 'idle'; await loadAccountingDashboard(); if (parseRoute().dashboardType === 'accounting') renderAccountingData(); }
    else if (['staffing', 'licensing', 'team'].includes(dashboardMode)) { staffStatus = 'idle'; await loadStaffDashboard(); if (parseRoute().dashboardType === dashboardMode) renderStaffData(); }
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

async function loadAccountingDashboard() {
  if (accountingStatus === 'loading' || accountingStatus === 'ready') return;
  accountingStatus = 'loading'; accountingError = '';
  try {
    const [years, transactions, allocations, accounts, units, daycares, categories, accountingStatuses] = await Promise.all([
      rest('calendar_years', 'select=calendar_year_id,calendar_year_code,display_name,start_date,end_date,status,is_selectable&is_selectable=eq.true&order=start_date.desc'),
      rest('bank_transactions', 'select=bank_transaction_id,bank_account_id,transaction_date,description,reference_number,amount,debit_amount,credit_amount&order=transaction_date.desc'),
      rest('bank_allocations', 'select=bank_allocation_id,bank_transaction_id,allocation_unit_id,budget_month,budget_category_id,allocation_amount,accounting_status_id,notes'),
      rest('bank_accounts', 'select=bank_account_id,display_name,bank_account_code,lifecycle_status'),
      rest('allocation_units', 'select=allocation_unit_id,display_name,allocation_unit_type,lifecycle_status,display_order&lifecycle_status=eq.ACTIVE&order=display_order.asc,display_name.asc'),
      rest('daycares', 'select=daycare_id,allocation_unit_id,display_name,lifecycle_status,display_order&order=display_order'),
      rest('budget_categories', 'select=budget_category_id,display_name,category_type,lifecycle_status&lifecycle_status=eq.ACTIVE'),
      rest('accounting_statuses', 'select=accounting_status_id,sheet_accounting_status_id,display_name,is_final,lifecycle_status&order=display_order,display_name')
    ]);
    accountingModel = { years, transactions, allocations, accounts, units: activeUnits(units), daycares, categories, accountingStatuses };
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
  const accountingStatusById = new Map(model.accountingStatuses.map((item) => [item.accounting_status_id, item]));
  const accountingStatusCode = (row) => accountingStatusById.get(row.accounting_status_id)?.sheet_accounting_status_id || '';
  const accountingStatusLabel = (row) => accountingStatusById.get(row.accounting_status_id)?.display_name || 'ללא סטטוס';
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
    const statuses = [...new Set(rows.map((item) => item.accounting_status_id).filter(Boolean))];
    const complete = rows.length > 0 && rows.every((item) => ['ACC-SENT', 'ACC-NO-SEND', 'ACC-APPROVED'].includes(accountingStatusCode(item)));
    const attention = Object.values(missing).some(Boolean) || rows.some((item) => ['ACC-WAITING', 'ACC-MISSING-DOCS'].includes(accountingStatusCode(item)));
    return { transaction, rows, allocationTotal, difference, missing, statuses, complete, attention };
  });
  const missingCards = [
    ['missing-type', 'חסר סוג תנועה', 'סוג התנועה אינו מוגדר כהכנסה, הוצאה או פנימי.', 'בודקים האם קיימת הקצאה עם קטגוריה עסקית תקפה.', 'type'],
    ['missing-month', 'חסר חודש תקציבי', 'לא הוגדר חודש תקציבי לטיפול בתנועה.', 'סופרים תנועות ללא הקצאה או עם הקצאה ללא חודש תקציבי.', 'budgetMonth'],
    ['missing-unit', 'חסרה יחידת הקצאה', 'התנועה עדיין אינה משויכת ליחידה ארגונית.', 'סופרים תנועות ללא שורת הקצאה או ללא יחידת הקצאה.', 'allocationUnit'],
    ['missing-daycare', 'חסר מעון', 'יחידת הקצאה מסוג מעון אינה מחוברת לרשומת מעון פעילה.', 'נבדקת רק הקצאה ליחידה מסוג מעון.', 'daycare'],
    ['invalid-split', 'פיצול לא תקין', 'סכום ההקצאות אינו תואם לסכום תנועת־האב.', 'משווים את הערך המוחלט של תנועת־האב לסך ההקצאות.', 'split']
  ].map(([id, title, description, calculation, key]) => { const rows = analyses.filter((item) => item.missing[key]); return { id, title, primary: rows.length, formatter: number.format, utilization: rows.length ? 101 : 0, definition: { title, description, calculation, source: 'תנועות בנק והקצאות תנועה' }, details: rows.map((item) => ({ ...accountingTransactionRow(item.transaction, model, item.rows), פער: key === 'split' ? money.format(item.difference) : 'דורש השלמה' })), records: rows.flatMap((item) => [accountingTransactionRow(item.transaction, model, item.rows), ...item.rows.map((row) => ({ חודש: row.budget_month || 'לא הוגדר', יחידה: model.units.find((unit) => unit.allocation_unit_id === row.allocation_unit_id)?.display_name || 'לא שויך', סטטוס: accountingStatusLabel(row), סכום: money.format(row.allocation_amount) }))]) }; });
  const workflowCards = [...new Set(selectedAllocations.map((item) => item.accounting_status_id).filter(Boolean))].map((statusId) => { const rows = selectedAllocations.filter((item) => item.accounting_status_id === statusId); const status = accountingStatusById.get(statusId); const title = status?.display_name || 'ללא סטטוס'; return { id: `status-${statusId}`, title, primary: rows.length, formatter: number.format, utilization: ['ACC-MISSING-DOCS', 'ACC-WAITING'].includes(status?.sheet_accounting_status_id) ? 101 : 0, definition: { title, description: `הקצאות הנמצאות בסטטוס ${title}.`, calculation: 'ספירת שורות הקצאה בסטטוס הקיים במקור.', source: 'סטטוס הנהלת החשבונות של שורות ההקצאה' }, details: rows.map((row) => ({ חודש: row.budget_month, יחידה: model.units.find((unit) => unit.allocation_unit_id === row.allocation_unit_id)?.display_name || 'לא שויך', סכום: money.format(row.allocation_amount), סטטוס: title })), records: rows.map((row) => ({ ...accountingTransactionRow(txById.get(row.bank_transaction_id), model, [row]), חודש: row.budget_month, יחידה: model.units.find((unit) => unit.allocation_unit_id === row.allocation_unit_id)?.display_name || 'לא שויך', סטטוס: title })) }; });
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
    return { transaction, rows, complete: rows.length > 0 && rows.every((item) => ['ACC-SENT', 'ACC-NO-SEND', 'ACC-APPROVED'].includes(accountingStatusCode(item))), attention: missing || rows.some((item) => ['ACC-WAITING', 'ACC-MISSING-DOCS'].includes(accountingStatusCode(item))) };
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
    await showPortalHome();
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
  preserveLegacyCallbackAtRoot();
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
