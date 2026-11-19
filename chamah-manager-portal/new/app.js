import { calculateBudgetModel, summarizeBudget } from './budget-calculations.js';
import { buildBankActuals, buildPayrollActuals, categoryActuals, summarizeActuals } from './actuals-calculations.js';
import { calculateSalary, salaryRuleIssues } from './salary-calculations.js';
import { buildLegalOccupancyAlternatives, calculateOccupancyModel } from './occupancy-calculations.js';
import { RULE_CATEGORIES, SYSTEM_RULES } from './management-catalog.generated.js';
import { DOCUMENTED_STATUS_RULES, REFERENCE_TABLES, VARIABLE_RULE_TABLES } from './management-data.js';
import { mountAdministrationPrototype } from './administration-prototype.js';
import { mountSettingsCenter } from './settings-center.js';
import { mountPolicyDocuments } from './policy-documents.js';
import { bankWorkbenchTemplateV2 as track015BankWorkbenchTemplate, mountBankWorkbenchV2 as mountBankWorkbench } from './bank-workbench-ux.js';
import { bankTransferWorkbenchTemplate, mountBankTransferWorkbench } from './bank-transfer-workbench.js';
import { workforceHubTemplate, employeesWorkbenchTemplate, payrollWorkbenchTemplate, parsePayrollWorkbook } from './workforce-workbench.js';
import { mountEmployeesWorkbench } from './employees-workbench.js';
import { mountPayrollWorkbench } from './payroll-workbench.js';
import { payrollLandingTemplate, payrollOpenTemplate, mountPayrollOpen, payrollMonthsTemplate, mountPayrollMonths, payrollReportsTemplate, mountPayrollReports } from './payroll-module.js';
import { mountWorkbenchPolish } from './workbench-polish.js';

window.parsePayrollWorkbookForWorkbench = parsePayrollWorkbook;

const SUPABASE_URL = '__CHAMAH_SUPABASE_URL__';
const SUPABASE_KEY = '__CHAMAH_PUBLISHABLE_KEY__';
const SESSION_KEY = 'chamah.portal.session';
const SESSION_REFRESH_LEEWAY_SECONDS = 60;
const AUTO_REFRESH_MAX_DELAY_MS = 30 * 60 * 1000;
const AUTO_REFRESH_RETRY_MS = 30 * 1000;
const MIN_PASSWORD_LENGTH = 10;
const PRODUCTION_PORTAL_URL = 'https://chamah-portal.vercel.app/';
const PREVIEW_PORTAL_URL = 'https://chamah-portal-chemlevin-chamah.vercel.app/';
const OAUTH_RESUME_PARAM = 'oauth_resume';
const $ = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 });

// Screen codes are the stable internal contract. UI copy stays local so damaged
// remote metadata can never leak into Hebrew navigation or administration views.
const HEBREW_SCREEN_LABELS = {
  home: '×¢××× ××××ª', dashboards: '××©×××¨×××', 'dashboards.finance': '××¡×¤××',
  'dashboards.accounting': '×× ××´×', 'dashboards.accounting.summary': '××©×××¨× ×¡××××',
  'dashboards.accounting.banks': '×§×××¥ ×× ×§××', 'dashboards.accounting.bank-transfers': '××¢××¨××ª ×× ×§××××ª', 'dashboards.licensing': '×¨××©××', 'dashboards.team': '×¦×××ª',
  'dashboards.staffing': '×¦×××ª ××¨××©××', 'dashboards.staffing.employees': '×¢×××××',
  'dashboards.staffing.employees.import': '××××× ×¢×××××',
  'dashboards.staffing.actual-payroll': '×××¦××¢ ×©××¨',
  'dashboards.occupancy': '×ª×¤××¡× ××ª×§×× ×', calculators: '×××©××× ××',
  'calculators.salary': '×××©××× ×©××¨', 'calculators.occupancy': '×××©××× ×ª×¤××¡×, ×ª×§×× × ××¨××××××ª',
  payroll: '×©××¨', 'payroll.open': '×¤×ª×××ª ××××© ×××©', 'payroll.working': '××××©×× ××¢××××',
  'payroll.closed': '××××©×× ×¡×××¨××', 'payroll.reports': '×××××ª ×©××¨', 'payroll.calculations': '×××©××× ×©××¨', 'payroll.calculations.new': '×××©',
  'payroll.calculations.existing': '×§×××', 'payroll.calculations.history': '××××××ª ×¢××¨',
  management: '× ×××× ×××××¨××ª', 'management.permissions': '××¨×©×××ª',
  'management.permissions.users': '×¨×©×××ª ××©×ª××©×× ×××¨×©×××ª', 'management.rules': '×××××',
  'management.rules.calculation': '×××× ×××©××', 'management.rules.system': '×××× ××¢×¨××ª', 'management.settings': '××××¨××ª', 'management.tables': '××××××ª',
  'management.tables.calculation': '××××××ª ×××©××', 'management.tables.variables': '××××× ××©×ª× ××',
  'management.audit': '×××× ×©×× ××××', documents: '××¡×××× ×× ××××', 'documents.manage': '×¢×¨×××ª × ××××', 'documents.publish': '×¤×¨×¡×× × ××××', knowledge: '××¨×× ××××¢ ×××©×ª××©', maintenance: '×ª××××§×', tasks: '××©××××ª'
};

function canonicalizeSections(sections) {
  const unique = new Map();
  let unnamed = 0;
  for (const section of sections || []) {
    if (!section?.screen_code || unique.has(section.screen_code)) continue;
    const remoteLabel = String(section.display_name || '').trim();
    const safeRemoteLabel = /[×-×ª]/.test(remoteLabel) && !/[ï¿½ÃÃ]|Ã[^\s]/.test(remoteLabel);
    const displayName = HEBREW_SCREEN_LABELS[section.screen_code] || (safeRemoteLabel ? remoteLabel : `××¡× × ××¡×£ ${++unnamed}`);
    const normalized = { ...section, display_name: displayName };
    if (section.screen_code === 'dashboards.accounting.bank-transfers' && portalAccess?.profile?.is_super_admin) normalized.permission_level = 'EDIT';
    unique.set(section.screen_code, normalized);
  }
  const canonical = [...unique.values()];
  const accounting = canonical.find((section) => section.screen_code === 'dashboards.accounting');
  if (accounting && !canonical.some((section) => section.screen_code === 'dashboards.accounting.summary')) canonical.push({ screen_code: 'dashboards.accounting.summary', parent_screen_code: 'dashboards.accounting', route: 'dashboards/unit/organization/accounting/summary', display_name: '××©×××¨× ×¡××××', icon: 'â¦', description: '××§×¨× ××¡×××ª ×¢× ×ª××××× ×× ×××ª ×××©××× ××ª.', display_order: 23, is_navigation_item: false, is_scope_required: true, permission_level: accounting.permission_level });
  if (accounting && !canonical.some((section) => section.screen_code === 'dashboards.accounting.banks')) canonical.push({ screen_code: 'dashboards.accounting.banks', parent_screen_code: 'dashboards.accounting', route: 'dashboards/unit/organization/accounting/banks', display_name: '×§×××¥ ×× ×§××', icon: 'â¤', description: '×¡××××ª ×¢×××× ××××¤×× ××ª× ××¢××ª ×× ×§.', display_order: 24, is_navigation_item: false, is_scope_required: true, permission_level: portalAccess?.profile?.is_super_admin ? 'EDIT' : 'HIDDEN' });
  if (accounting && !canonical.some((section) => section.screen_code === 'dashboards.accounting.bank-transfers')) canonical.push({ screen_code: 'dashboards.accounting.bank-transfers', parent_screen_code: 'dashboards.accounting', route: 'dashboards/unit/organization/accounting/bank-transfers', display_name: '××¢××¨××ª ×× ×§××××ª', icon: 'â', description: '×¡××××ª ×¢×××× ×××× × ×××¢×§× ×××¨ ××¢××¨××ª ×× ×§××××ª.', display_order: 25, is_navigation_item: false, is_scope_required: true, permission_level: portalAccess?.profile?.is_super_admin ? 'EDIT' : 'HIDDEN' });
  const staffing = canonical.find((section) => section.screen_code === 'dashboards.staffing');
  if (staffing && !canonical.some((section) => section.screen_code === 'dashboards.staffing.employees')) canonical.push({ screen_code: 'dashboards.staffing.employees', parent_screen_code: 'dashboards.staffing', route: 'dashboards/unit/organization/staffing/employees', display_name: '×¢×××××', icon: 'ð¥', description: '×¡××××ª ×¢×××× ×× ×××× ×¢×××××.', display_order: 25, is_navigation_item: false, is_scope_required: true, permission_level: staffing.permission_level });
  const employees = canonical.find((section) => section.screen_code === 'dashboards.staffing.employees');
  if (employees && !canonical.some((section) => section.screen_code === 'dashboards.staffing.employees.import')) canonical.push({ screen_code: 'dashboards.staffing.employees.import', parent_screen_code: 'dashboards.staffing.employees', route: 'dashboards/unit/organization/staffing/employees/import', display_name: '××××× ×¢×××××', icon: 'â§', description: '××××× ×¢××××× ××§×××¥ Excel ××××¨ ×××¤×× ××××××ª.', display_order: 26, is_navigation_item: false, is_scope_required: true, permission_level: portalAccess?.profile?.is_super_admin ? 'EDIT' : 'HIDDEN' });
  if (staffing && !canonical.some((section) => section.screen_code === 'dashboards.staffing.actual-payroll')) canonical.push({ screen_code: 'dashboards.staffing.actual-payroll', parent_screen_code: 'dashboards.staffing', route: 'dashboards/unit/organization/staffing/actual-payroll', display_name: '×××¦××¢ ×©××¨', icon: 'âª', description: '×¡××××ª ×¢×××× ××××¦××¢ ×©××¨ ××¤××¢×.', display_order: 26, is_navigation_item: false, is_scope_required: true, permission_level: staffing.permission_level });
  const payroll = canonical.find((section) => section.screen_code === 'payroll');
  const payrollChildren = [
    ['payroll.open', 'payroll/open', '×¤×ª×××ª ××××© ×××©', 51],
    ['payroll.working', 'payroll/working', '××××©×× ××¢××××', 52],
    ['payroll.closed', 'payroll/closed', '××××©×× ×¡×××¨××', 53],
    ['payroll.reports', 'payroll/reports', '×××××ª ×©××¨', 54],
  ];
  for (const [screen_code, route, display_name, display_order] of payrollChildren) {
    if (payroll && !canonical.some((section) => section.screen_code === screen_code)) canonical.push({ screen_code, parent_screen_code: 'payroll', route, display_name, icon: 'âª', description: '', display_order, is_navigation_item: false, is_scope_required: true, permission_level: portalAccess?.profile?.is_super_admin ? 'EDIT' : 'HIDDEN' });
  }
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
  { route: 'dashboards', icon: 'ð', title: '××©×××¨×××', description: '×ª××× ×ª ××¦× × ××××××ª ××¨××¨× ××¤× ×××××× ×××¨××× ××ª ××¨×××× ×××ª.' },
  { route: 'calculators', icon: 'ð§®', title: '×××©××× ××', description: '××× ×××©×× ××ª×× ×× ×©××¡×××¢× ××§×××ª ××××××ª ××××¨× ××××××§×ª.' },
  { route: 'staffing', href: 'dashboards/unit/organization/staffing', icon: 'ð¥', title: '×¦×××ª ××¨××©××', description: '×ª××× ×ª ××¦× ××¨××× ××ª ×©× ×¦×××ª, ×××©×¨××ª ××¨××©××.' },
  { route: 'accounting', href: 'dashboards/unit/organization/accounting', icon: 'ð§¾', title: '×× ××´×', description: '××§×¨× ××¨××× ××ª ×¢× ×ª××××× ×× ×××ª ×××©××× ××ª.' },
  { route: 'payroll', icon: 'âª', title: '×©××¨', description: '××¨×× ××××××¨× ××ª××××× ×©××¨ ×××××©××× ×©××¨.' },
  { route: 'training', icon: 'â¤', title: '××¨×©×××ª ×××××××ª', description: '××××××ª ×××× ××¨×©×××ª ××¨××× ××× ×××§×× ×××.' },
  { route: 'documents', icon: 'ð', title: '××¡×××× ×× ××××', description: '× ×××× ××¨××× ×××, ××××××ª ×××¨×¡×××ª ××¤××¨×¡×××ª.' },
  { route: 'knowledge', icon: 'ð', title: '××¨×× ××××¢ ×××©×ª××©', description: '× ××××, ×× ××××ª ××§×¦××¢×××ª ×××××¢ ×©××××©× ×××§×× ×××.' },
  { route: 'maintenance', icon: 'ð§', title: '×ª××××§×', description: '××××× ×ª×§×××ª, ××¢×§× ×××¤×× ×× ×××× ×ª××××§×ª ×××¢×× ××ª.' },
  { route: 'tasks', icon: 'â', title: '××©××××ª', description: '×¨×××× ××©××××ª, ××¢×§× ×××¨ ×××¦××¢ ××ª××¢×××£ ××¢×××× ××©×××¤×ª.' }
];

const dashboardTypes = [
  { id: 'finance', icon: 'âª', title: '××©×××¨× ××¡×¤××', description: '×ª××× × ××¡×¤××ª × ××××××ª ×¢×××¨ ×××××× ×©× ×××¨×.' },
  { id: 'accounting', icon: 'ð§¾', title: '×× ××´×', description: '××§×¨× ×¢× ×ª××××× ×× ×××ª ×××©××× ××ª ×©× ××××××.' },
  { id: 'licensing', icon: 'â', title: '××©×××¨× ×¨××©××', description: '×ª××× ×ª ××¦× ×©× ×¨××©××× ××ª, ×ª××§×¤×× ××¢×××× ×××¨××©××ª ××××××.' },
  { id: 'team', icon: 'ð¥', title: '××©×××¨× ×¦×××ª', description: '×ª××× ×ª ××¦× ×©× ×¦×××ª, ×ª×¤×§×××× ××××©×¨××ª ××××××.' },
  { id: 'staffing', icon: 'ð¥', title: '××©×××¨× ×¦×××ª ××¨××©××', description: '×ª××× ×ª ××¦× ×©× ×¦×××ª, ×××©×¨××ª ××¨××©×× ××××××.' },
  { id: 'occupancy', icon: 'ð«', title: '××©×××¨× ×ª×¤××¡× ××ª×§×× ×', description: '××¢×§× ×××¨ ×ª×¤××¡×, ×××ª××ª ×××¨××©××ª ×ª×§×× × ××××××.' }
];

const dashboardNavigationRoutes = new Set(['dashboards', 'staffing', 'accounting']);
const simpleRoutes = Object.fromEntries(modules.filter((module) => !dashboardNavigationRoutes.has(module.route)).map((module) => [module.route, module]));
simpleRoutes.home = { route: 'home', title: '×¢××× ××××ª' };
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
let refreshTimer = 0;
let refreshSessionPromise = null;
let authLifecycleActive = false;
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
  if (authLifecycleActive) scheduleSessionRefresh();
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
  if (detail.includes('expired')) return '×ª××§×£ ××§××©××¨ ×¤×. ××© ××©××× ×§××©××¨ ×××¤××¡ ×××© ××¨× Supabase.';
  return '×§××©××¨ ××××¤××¡ ××× × ×ª×§×£ ×× ×©×××¨ × ×¢×©× ×× ×©××××©. ××© ××©××× ×§××©××¨ ×××© ××¨× Supabase.';
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
  if (response.status === 429 || detail.includes('rate limit')) return '× ×©××× ××§×©××ª ×¨×××ª ×××. ××© ××××ª×× ××¢× ××¤× × × ××¡××× × ××¡×£.';
  if (response.status === 400 || detail.includes('invalid') || detail.includes('credentials')) return '××ª×××ª ××××× ×× ××¡××¡×× ××× × × ××× ××.';
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
    throw new Error(authErrorMessage(response, value, '××× ××¡× × ××©××. ××© ×× ×¡××ª ×©××.'));
  }
  saveSession(value);
  if (!session) throw new Error('×× ××ª×§×× ×××××¨ ××××××. ××© ×× ×¡××ª ×©××.');
}

async function requestPasswordRecovery(email) {
  const redirectUrl = location.hostname === new URL(PRODUCTION_PORTAL_URL).hostname
    ? PRODUCTION_PORTAL_URL
    : location.hostname.endsWith('.vercel.app')
      ? PREVIEW_PORTAL_URL
      : `${location.origin}/`;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectUrl)}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = `${value?.error_code || ''} ${value?.msg || ''}`.toLowerCase();
    if (response.status === 429 || detail.includes('rate limit')) throw new Error('× ×©××× ××§×©××ª ×¨×××ª ×××. ××© ××××ª×× ××¤× × × ××¡××× × ××¡×£.');
    throw new Error('×× × ××ª× ××©××× ××¢×ª ×§××©××¨ ×××¤××¡. ××© ×× ×¡××ª ×©×× ×××××¨ ×××ª×¨.');
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
  if (!await ensureAccessToken()) throw new Error('×ª××§×£ ×§××©××¨ ××××¤××¡ ×¤×. ××© ××©××× ×§××©××¨ ×××© ××¨× Supabase.');
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  if (!response.ok) {
    const value = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) throw new Error(recoveryErrorMessage(value));
    throw new Error('×× × ××ª× ××©×××¨ ××ª ××¡××¡××. ××© ×× ×¡××ª ×©××.');
  }
}

function showRecoveryView(error = '', mode = 'recovery') {
  $('#auth-restoring-view').hidden = true;
  $('#login-view').style.display = 'none';
  $('#app-view').hidden = true;
  $('#recovery-view').hidden = false;
  $('#recovery-title').textContent = mode === 'invite' ? '××©×××ª ××××× ×' : '××××¨×ª ×¡××¡×× ×××©×';
  $('#recovery-description').textContent = mode === 'invite'
    ? '×××¨× ×¡××¡×× ××× ×××©××× ××ª ××××× × ×××××× ×¡ ××¤××¨××.'
    : '×××¨× ×¡××¡×× ×××©× ××××××ª ××¤×××ª 10 ×ª××××, ×××ª ×××ª ×××¡×¤×¨ ×××.';
  $('#recovery-message').textContent = error;
  $('#recovery-fields').hidden = Boolean(error);
  if (!error) $('#new-password').focus();
}

async function showPortalHome() {
  startSessionLifecycle();
  $('#auth-restoring-view').hidden = true;
  $('#login-view').style.display = 'none';
  $('#recovery-view').hidden = true;
  $('#app-view').hidden = false;
  $('#israeli-date').textContent = formatToday();
  await loadPortalAccess();
  await render();
}

async function refreshSession() {
  if (refreshSessionPromise) return refreshSessionPromise;
  if (!session?.refresh_token) return false;
  const refreshToken = session.refresh_token;
  refreshSessionPromise = (async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refreshToken }) });
      if (!response.ok) {
        if ([400, 401, 403].includes(response.status)) saveSession(null);
        return false;
      }
      const value = await response.json();
      saveSession({ ...value, refresh_token: value.refresh_token || refreshToken });
      return Boolean(session);
    } catch {
      return false;
    } finally {
      refreshSessionPromise = null;
    }
  })();
  return refreshSessionPromise;
}

function stopSessionRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = 0;
}

function scheduleSessionRefresh(retry = false) {
  stopSessionRefresh();
  if (!authLifecycleActive || !session?.refresh_token) return;
  const expiresAtMs = Number(session.expires_at || 0) * 1000;
  const desiredDelay = retry
    ? AUTO_REFRESH_RETRY_MS
    : expiresAtMs
      ? Math.max(0, expiresAtMs - Date.now() - SESSION_REFRESH_LEEWAY_SECONDS * 1000)
      : AUTO_REFRESH_RETRY_MS;
  refreshTimer = setTimeout(async () => {
    if (!authLifecycleActive || !session) return;
    const refreshed = await ensureAccessToken();
    scheduleSessionRefresh(!refreshed);
  }, Math.min(desiredDelay, AUTO_REFRESH_MAX_DELAY_MS));
}

async function resumeSessionLifecycle() {
  if (!authLifecycleActive || !session || document.visibilityState === 'hidden') return;
  const refreshed = await ensureAccessToken();
  scheduleSessionRefresh(!refreshed);
}

function startSessionLifecycle() {
  authLifecycleActive = true;
  scheduleSessionRefresh();
}

function stopSessionLifecycle() {
  authLifecycleActive = false;
  stopSessionRefresh();
}

function showLogin(message = '') {
  stopSessionLifecycle();
  $('#auth-restoring-view').hidden = true;
  $('#recovery-view').hidden = true;
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
  $('#login-view').style.display = '';
  $('#login-message').textContent = message;
}

function validatedOAuthResumeUrl() {
  const value = new URLSearchParams(location.search).get(OAUTH_RESUME_PARAM);
  if (!value || value.length > 2048) return null;
  try {
    const resume = new URL(value);
    const portal = new URL(location.origin + '/');
    const authorizationId = resume.searchParams.get('authorization_id');
    if (resume.origin !== portal.origin || resume.pathname !== '/oauth/consent' || resume.hash || resume.username || resume.password || resume.searchParams.size !== 1 || !authorizationId || authorizationId.length > 300 || !/^[a-zA-Z0-9._~-]+$/.test(authorizationId)) return null;
    return resume.href;
  } catch {
    return null;
  }
}

function resumeOAuthAfterLogin() {
  const resumeUrl = validatedOAuthResumeUrl();
  if (!resumeUrl) return false;
  location.replace(resumeUrl);
  return true;
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
  if (!await ensureAccessToken()) throw new Error('××××××¨ ×¤×. ××© ×××ª×××¨ ××××©.');
  const controller = new AbortController();
  protectedRequests.add(controller);
  let response;
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { signal: controller.signal, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` } });
  } finally {
    protectedRequests.delete(controller);
  }
  if (!response.ok) throw new Error((await response.json()).message || `×©×××× ××§×¨×××ª ${table}`);
  const rows = await response.json();
  if (portalAccess?.profile?.scope_mode !== 'SELECTED' || portalAccess.profile.is_super_admin || !Array.isArray(rows)) return rows;
  const unitIds = new Set(portalAccess.allocation_unit_ids || []); const daycareIds = new Set(portalAccess.daycare_ids || []);
  if (table === 'allocation_units') return rows.filter((row) => unitIds.has(row.allocation_unit_id));
  if (table === 'daycares') return rows.filter((row) => daycareIds.has(row.daycare_id) || unitIds.has(row.allocation_unit_id));
  if (rows.some((row) => Object.hasOwn(row, 'daycare_id'))) return rows.filter((row) => !row.daycare_id || daycareIds.has(row.daycare_id));
  if (rows.some((row) => Object.hasOwn(row, 'allocation_unit_id'))) return rows.filter((row) => !row.allocation_unit_id || unitIds.has(row.allocation_unit_id));
  return rows;
}

async function runtimeConfiguration(screenCode) {
  if (!await ensureAccessToken()) throw new Error('××××××¨ ×¤×. ××© ×××ª×××¨ ××××©.');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/portal-runtime-config?screen=${encodeURIComponent(screenCode)}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 403) throw new Error('××× ××¨×©×× ××¦×¤××ª ×××¡× ×××××§×©.');
  if (!response.ok) throw new Error(payload.error || '××¢×× ×ª ××××¨××ª ×××¡× × ××©××.');
  if (payload.status === 'CONFIGURATION_MISSING') {
    throw new Error(`××¡×¨× ××××¨×ª ××¢×¨××ª × ××¨×©×ª: ${(payload.missing || []).join(', ')}`);
  }
  return payload.configuration || {};
}

async function rpc(name, body = {}) {
  if (!await ensureAccessToken()) throw new Error('××××××¨ ×¤×. ××© ×××ª×××¨ ××××©.');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error((await response.json()).message || '××¤×¢××× × ××©××.');
  return response.json();
}

async function loadPortalAccess() {
  portalAccess = await rpc('portal_my_access');
  if (!portalAccess?.profile) throw new Error('×××©×ª××© ××× ×¤×¨××¤×× ×¤××¨×× ×¤×¢××.');
  portalAccess.sections = canonicalizeSections(portalAccess.sections);
  $('#portal-profile').textContent = portalAccess.profile.display_name || session?.user?.email || '××©×ª××©×ª ××¤××¨××';
  renderPermissionNavigation();
}

function permissionFor(code) { return portalAccess?.sections?.find((item) => item.screen_code === code)?.permission_level || 'HIDDEN'; }
function canView(code) { return permissionFor(code) !== 'HIDDEN'; }
function portalSection(code) { return portalAccess?.sections?.find((item) => item.screen_code === code) || null; }

// Workbench APIs already reject writes without EDIT. Keep the presentation in
// the same state so VIEW users never receive an editable control that would
// inevitably fail at save time.
function enforceWorkbenchReadOnly(root = $('#page-content')) {
  if (!root) return;
  const mutationControls = [
    '#wf-add', '#wf-import', '#employee-import', '#wf-open-month', '#wf-close-month', '[data-open-month-primary]', '[data-save-new-payroll]', '[data-delete-allocation]', '[data-add-allocation]', '[data-save-allocations]', '[data-approve-temporary]', '[data-delete-record]', '[data-delete-payroll]', '[data-delete-selected-payroll]', '#wf-confirm-import',
    '[data-save-new]', '[data-edit-employee]', '[data-edit-employment]', '[data-edit-assignment]', '[data-version-term]', '[data-close-term]', '[data-new-term]', '[data-child]', '[data-deactivate]', '[data-archive]', '[data-bulk-archive]',
    '#bank-new-transaction', '#bank-import', '#bank-delete-selected', '[data-save-transaction]', '[data-add-split]', '[data-delete-transaction]', '[data-delete-split]', '[data-save-manual-inline]', '#confirm-bank-import', '#bank-apply-mapping', '#bank-manual-form button[type="submit"]',
    '#transfer-add', '#transfer-import', '#transfer-delete-selected', '[data-mark-completed]', '[data-approve-transfer]', '[data-delete-transfer]', '[data-upload-attachment]'
  ].join(',');
  const editableFields = '#wf-rows input, #wf-rows select, #wf-details input, #wf-details select, #wf-details textarea, #bank-new-rows input:not([readonly]), #bank-new-rows select, #bank-new-rows textarea, [data-transfer-row] input:not([readonly]), [data-transfer-row] select, [data-transfer-row] textarea';
  const apply = () => {
    root.querySelectorAll(mutationControls).forEach((control) => { control.hidden = true; control.disabled = true; control.setAttribute('aria-hidden', 'true'); });
    root.querySelectorAll(editableFields).forEach((field) => { field.disabled = true; field.setAttribute('aria-readonly', 'true'); });
    root.querySelectorAll('[data-select-row], [data-select-all], [data-payroll-select], [data-select-transaction], #bank-select-all, [data-select-transfer]').forEach((field) => { field.disabled = true; });
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(root, { childList: true, subtree: true });
  root.__workbenchReadOnlyObserver = observer;
}
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
  if (route.section === 'dashboards' && route.dashboardType === 'staffing' && route.dashboardChild) return `dashboards.staffing.${route.dashboardChild}`;
  if (route.section === 'dashboards' && route.dashboardType) return `dashboards.${route.dashboardType}`;
  if (route.section === 'calculators' && route.calculator) return `calculators.${route.calculator}`;
  if (route.section === 'payroll' && route.page) return `payroll.${route.page}`;
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
  if (parts[0] === 'payroll' && ['open', 'working', 'closed', 'reports'].includes(parts[1])) return { section: 'payroll', page: parts[1], monthId: parts[2] || '' };
  if (parts[0] === 'payroll' && parts[1] === 'calculations') return { section: 'payroll', page: 'reports' };
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
    const { units: rows = [] } = await runtimeConfiguration('home');
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
  return `<section class="page-heading"><div><p class="eyebrow">×¡××××ª ××¢×××× ×©××</p><h1>×©×××, ××¨××× ×××× ××¤××¨×× ×××´×</h1><p>×××× × ××ª× ×××××¢ ××× ××× ×× ××××, ×××¢×§× ×××××¢ ×©× ×××¨×××.</p></div><span class="status-badge status-success"><span aria-hidden="true">â</span> ×××¢×¨××ª ×××× ×</span></section>
  <section class="attention-panel panel" aria-labelledby="attention-title"><div class="attention-icon" aria-hidden="true">i</div><div><h2 id="attention-title">××¤××¨×× ××××© ×××§××</h2><p>××¢××¤×ª ××¢×××× ×××× ×. ×××××××× ×××¤×ª×× ××××¨×× ××¡×¤×¨×× ××× ×××××.</p></div><a class="button button-secondary" href="#knowledge">×××××¢ × ××¡×£</a></section>
  <section aria-labelledby="modules-title"><div class="section-heading"><div><h2 id="modules-title">××× ×ª×¨×¦× ××××©××?</h2><p>×××¨× ×ª××× ××× ××¤×ª×× ××ª ×¡××××ª ××¢×××× ×××ª××××.</p></div></div><div class="module-grid">${catalogModules.filter((module) => canView(module.screenCode)).map((module) => `<a class="module-card card" href="#${module.href || module.route}"><span class="module-icon" aria-hidden="true">${module.icon}</span><div><h3>${module.title}</h3><p>${module.description}</p></div><span class="card-action">×¤×ª××× <span aria-hidden="true">â</span></span></a>`).join('')}</div></section>`;
}

function accessDeniedTemplate() { return `<section class="error-state panel"><strong>××× ××¨×©×× ××¦×¤××ª ×××¡× ××</strong><p>×××¡× ×××¡×ª×¨ ×××ª×× ×××¨×©×××ª ×××©×ª××©.</p><a class="button button-primary" href="#home">×××¨× ××¢××× ××××ª</a></section>`; }

function comingSoonTemplate(module) {
  return `<section class="page-heading"><div><p class="eyebrow">${module.title}</p><h1>${module.title}</h1><p>${module.description}</p></div><span class="status-badge status-neutral">××ª×× ××</span></section><section class="coming-soon panel"><span class="coming-icon" aria-hidden="true">${module.icon}</span><span class="status-badge status-info">××§×¨××</span><h2>×××××× × ××¦× ×××× ×</h2><p>×× ×× × ××× ×× ×¢×××¨× ×¡××××ª ×¢×××× ××§×¦××¢××ª, ××××¨× ×××¨××¨×. ××× ×ª×ª×××¡×£ ××¤××¨×× ×××× ××¡×¤×¨×× ××× ××§×¨××××.</p><div class="next-action"><strong>××¤×¢××× ××××</strong><span>××¤×©×¨ ×××××¨ ××¢××× ××××ª ××××××¨ ×ª××× ×××¨.</span></div><a class="button button-primary" href="#home">×××¨× ××¢××× ××××ª</a></section>`;
}

const portalSections = {
  payroll: {
    title: '×©××¨',
    description: '××¨×× ××××××¨× ××ª××××× ×©××¨ ×××××©××× ×©××¨.',
    cards: [{ route: 'payroll/calculations', icon: 'â¤', title: '×××©××× ×©××¨', description: '×¤×ª×××ª ×××©×× ×××©, ×××©×××× ×§××××× ×××××××ª ×¢××¨.' }]
  },
  training: {
    title: '× ×××× ×××××¨××ª',
    description: '××¨×©×××ª ×××××¨××ª ×××¢×¨××ª ×××§×× ×××.',
    cards: [
      { route: 'training/permissions', icon: 'â¿', title: '××¨×©×××ª', description: '× ×××× ××©×ª××©××, ×ª×¤×§×××× ×××¨×©×××ª â ××× ×©×× ×× ×× ×× ×× × ××××××.' },
      { route: 'training/rules', icon: 'Â§', title: '×××××', description: '×§×××× ×××× ×××¢×¨××ª ×××ª××¢×××.' },
      { route: 'training/settings', icon: 'â', title: '××××¨××ª', description: '×× ××××¨××ª ×××¢×¨××ª ×××¨×× ×××, ××¤× × ××©××× ×¢×¡×§×××.' },
      { route: 'training/audit', icon: 'â·', title: '×××× ×©×× ××××', description: '×××¡×××¨×××ª ×©×× ×××× ×××××××ª ××¤× ××××××§×.' }
    ]
  }
};

const managementPages = {
  permissions: { title: '××¨×©×××ª', cards: [{ route: 'training/permissions/users', icon: 'ð¥', title: '×¨×©×××ª ××©×ª××©×× ×××¨×©×××ª', description: '× ×××× ××©×ª××©× ××¤××¨××, ××××× × ×ª×× ×× ×××¨×©×××ª ××¤× ××¡×.' }] },
  rules: { title: '×××××', cards: [{ route: 'training/rules/calculation', icon: 'Â§', title: '×××× ×××©××', description: '××¦××¨× ×× ×××× ×©× ×××× ×××©××.' }, { route: 'training/rules/system', icon: 'Â§', title: '×××× ××¢×¨××ª', description: `${SYSTEM_RULES.length} ××××× ××ª××¢××× ××ª×× ××¡××× ×Ö¾Handbook.` }] },
  settings: { title: '××××¨××ª', cards: [] }
};

const payrollCalculationCards = [
  { route: 'payroll/calculations/new', icon: '+', title: '×××©', description: '×¤×ª×××ª ×××©×× ×©××¨ ×××©.' },
  { route: 'payroll/calculations/existing', icon: 'â·', title: '×§×××', description: '×¦×¤××× ××××©××× ×©××¨ ×§×××××.' },
  { route: 'payroll/calculations/history', icon: 'â¦', title: '××××××ª ×¢××¨', description: '×¦×¤××× ×××××××ª ×©××¨ ××ª×§××¤××ª ×§×××××ª.' }
];

function sectionCardsTemplate(section, cards = portalSections[section].cards, title = portalSections[section].title, description = portalSections[section].description) {
  const details = portalSections[section];
  return `<section class="page-heading"><div><p class="eyebrow">${details.title}</p><h1>${title}</h1><p>${description}</p></div></section><section class="module-grid">${cards.filter((card) => canViewRoute(card.route)).map((card) => `<a class="module-card card" href="#${card.route}"><span class="module-icon" aria-hidden="true">${card.icon}</span><div><h3>${card.title}</h3><p>${card.description}</p></div><span class="card-action">×¤×ª××× <span aria-hidden="true">â</span></span></a>`).join('')}</section>`;
}

function placeholderTemplate(title, parentRoute, parentTitle) {
  return `<section class="page-heading"><div><p class="eyebrow">${parentTitle} / ${title}</p><h1>${title}</h1><p>×¢××× ×× ×××× ×××¨××× ×¢×ª××××ª.</p></div><span class="status-badge status-neutral">××ª×× ××</span></section><section class="coming-soon panel"><span class="status-badge status-info">××§×¨××</span><h2>××¢××× × ××¦× ×××× ×</h2><p>××× ×¢××× ××¦××× ××§×× ××××. ×× × ××¡×¤× × ×ª×× ××, ×××××¨×× ×× ×××××§× ×¢×¡×§××ª.</p><a class="button button-primary" href="#${parentRoute}">×××¨× ×× ${parentTitle}</a></section>`;
}

function managementHubTemplate(page) {
  const item = managementPages[page];
  return sectionCardsTemplate('training', item.cards, item.title, `××××¨×ª ××¡× ×¢×××× ××ª××× ${item.title}.`);
}

function usersPermissionsTemplate() {
  return `<section class="page-heading"><div><p class="eyebrow">××××× / ××¨×©×××ª ×××××××ª</p><h1>×¨×©×××ª ××©×ª××©×× ×××¨×©×××ª</h1><p>××§××¨ ×¡××××ª ××× ××¤××¨××, ×Ö¾API ××Ö¾MCP. ××©×× ×××× ××¨×××©×× × ×¢×××× ××××¨×©×× ×¤×¢××× ××××©×¨×ª ×××ª××¢××ª.</p></div><button id="invite-user-open" class="button button-primary" type="button" hidden>×××× ×ª ××©×ª××©</button><span class="status-badge status-success">Director only</span></section><p id="permissions-feedback" class="form-message" role="status"></p><div id="permissions-admin-state" class="state panel">×××¢× ××¨×©×××ª ×××××××ªâ¦</div><section id="permissions-admin" class="permissions-admin" hidden></section>`;
}

async function portalUsersRequest(method = 'GET', body) {
  if (!await ensureAccessToken()) throw new Error('××××××¨ ×¤×.');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/portal-users`, { method, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error || '××¤×¢××× × ××©××.');
  return value;
}

async function portalSettingsRequest(method = 'GET', body) {
  if (!await ensureAccessToken()) throw new Error('××××××¨ ×¤×.');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/portal-settings`, { method, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error || '××¤×¢××× × ××©××.');
  return value;
}

async function portalBankWorkbenchRequest(method = 'GET', body, query = '') {
  if (!await ensureAccessToken()) throw new Error('××××××¨ ×¤×.');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/portal-bank-workbench${query ? `?${query}` : ''}`, { method, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(value.error || '××¤×¢××× × ××©××.'); error.details = value.errors; throw error; }
  return value;
}

async function portalBankTransferRequest(method = 'GET', body) {
  if (!await ensureAccessToken()) throw new Error('××××××¨ ×¤×.');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/portal-bank-transfer-workbench`, { method, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error || '××¤×¢××× × ××©××.');
  return value;
}

async function portalWorkforceRequest(page, method = 'GET', body, month = '', view = '') {
  if (!await ensureAccessToken()) throw new Error('××××××¨ ×¤×.');
  const query = new URLSearchParams({ page });
  if (month) query.set('month', month);
  if (view) query.set('view', view);
  const response = await fetch(`${SUPABASE_URL}/functions/v1/portal-workforce-workbench?${query}`, { method, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(value.error || '××¤×¢××× × ××©××.'); error.details = value.errors; throw error; }
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
    const branchAction = usersAdminData.sections.some((child) => child.parent_screen_code === item.screen_code) ? `<button class="permission-row-action" type="button" data-apply-branch="${escapeHtml(item.screen_code)}">×××× ×¢× ××¢× ×£</button>` : '';
    const defaultAction = item.parent_screen_code ? `<button class="permission-row-action" type="button" data-default-permission ${usesSecureDefault ? 'hidden' : ''}>×××¨× ×××¨××¨×ª ×××××</button>` : '';
    return `<tr data-screen="${escapeHtml(item.screen_code)}" data-parent="${escapeHtml(item.parent_screen_code || '')}" data-explicit="${!usesSecureDefault}" style="--permission-depth:${depth(item)}"><th scope="row" class="permission-screen-name"><span>${escapeHtml(item.display_name)}</span><small data-permission-state>${usesSecureDefault ? '××¨××¨×ª ××××: ×× ×××¦××' : '××××¨× ××©××¨×'}</small><span class="permission-row-actions">${branchAction}${defaultAction}</span></th>${option('HIDDEN', '×× ×××¦××')}${option('VIEW', '×¦×¤×××')}${option('EDIT', '×¢×¨×××')}</tr>`;
  }).join('');
}

function renderPermissionsAdmin() {
  const root = $('#permissions-admin'); if (!root || !usersAdminData) return;
  usersAdminData = normalizeUsersAdminData(usersAdminData);
  if (usersAdminData.authorization_mode === 'DIRECTOR_ONLY') {
    const assignments = usersAdminData.role_assignments || [];
    const actions = usersAdminData.actions || [];
    const roleActions = new Set((usersAdminData.role_actions || []).filter((item) => item.role_code === 'DIRECTOR').map((item) => item.action_code));
    const assigned = new Map(assignments.filter((item) => !item.revoked_at).map((item) => [item.user_id, item.role_code]));
    const kindLabels = { READ: '×§×¨×××', CREATE: '××¦××¨×', UPDATE: '×¢××××', DELETE: '××××§× ××××§×¨×ª', BULK: '×¤×¢××× ××¨××××ª', FILE_UPLOAD: '××¢×××ª ×§×××¥', ADMIN: '× ×××× ×¨×××©' };
    root.innerHTML = `<section class="authorization-summary panel"><div><span class="status-badge status-success">×¤×¢××</span><h2>×××× ××¨×©×× ×××××</h2><p>××××ª ×××××ª×ª + ×ª×¤×§×× + ×¤×¢××× ×¡×× ×××ª. ×× ××××ª ××× ×ª×¤×§×× ×¤×¢×× × ××¡××ª ×××¨××¨×ª ××××.</p></div><dl><div><dt>×ª×¤×§×××× ×¤×¢××××</dt><dd>${(usersAdminData.roles || []).filter((item) => item.is_active).length}</dd></div><div><dt>×¤×¢××××ª ×××××¨××ª</dt><dd>${actions.length}</dd></div><div><dt>×¤×¢××××ª ×¢× ×××©××¨</dt><dd>${actions.filter((item) => item.requires_approval).length}</dd></div></dl></section><section class="authorization-layout"><section class="panel"><h2>××××××ª</h2><div class="authorization-identities">${usersAdminData.users.map((user) => { const profile=usersAdminData.profiles.find((item)=>item.user_id===user.id); const role=assigned.get(user.id); return `<article><div><strong>${escapeHtml(profile?.display_name || user.email || '××× ×©×')}</strong><small>${escapeHtml(user.email || '')}</small></div><span class="status-badge ${role && profile?.is_active ? 'status-success' : 'status-neutral'}">${role && profile?.is_active ? 'Director Â· ×¤×¢×××' : '×××©× ×××©××ª×ª'}</span></article>`; }).join('')}</div></section><section class="panel"><h2>×§×××× ×¤×¢××××ª Director</h2><div class="authorization-actions">${actions.filter((item)=>roleActions.has(item.action_code)).map((item)=>`<article><div><code>${escapeHtml(item.action_code)}</code><strong>${escapeHtml(item.display_name)}</strong></div><span>${escapeHtml(kindLabels[item.action_kind] || item.action_kind)}${item.requires_approval ? ' Â· ×××©××¨ ××××' : ''}</span></article>`).join('')}</div></section></section><section class="panel authorization-security"><h2>××§×¨××ª ×¤×¢××××ª</h2><ul><li>×××©× ××¤××¨×× ××Ö¾MCP ××× ×××ª ××××</li><li>××××§× ××× ××¨××× ×××× ×××× × ××××§×ª × ×ª×× ××</li><li>DELETE ×Ö¾BULK ×××¨×©×× ×××©××¨ ×§×¦×¨Ö¾×××× ××§×©××¨ ×××××§ ××ª××× ××¤×¢×××</li><li>×§××¦×× ××××××× ××¡×××× ××××©×¨×× ××Ö¾3 MiB ×××× MCP</li><li>×× ××××× ××¤×¢×××ª ××ª××× × ×¨×©×××ª ××××× ××××× append-only</li></ul><p class="muted">×©×× ××× ××××ª ×××¨×©×× ×××§×¤×× ××××©×§ ××. ×× ×××¤×ª×× ×¨×§ ××¨× ×¤×§××× ×¨×××©× ××××©×¨×ª.</p></section>`;
    root.hidden = false;
    return;
  }
  if (!selectedPortalUserId || !usersAdminData.users.some((item) => item.id === selectedPortalUserId)) selectedPortalUserId = usersAdminData.users[0]?.id || '';
  const model = selectedPortalUserId ? adminUserModel(selectedPortalUserId) : null;
  root.innerHTML = `<aside class="panel permissions-users"><h2>××©×ª××©××</h2><div class="management-filters"><label>×××¤××© ××©×ª××©<input id="user-search" type="search" placeholder="×©× ×× ××××´×"></label></div><div id="portal-user-list">${usersAdminData.users.map((user) => { const p = usersAdminData.profiles.find((item) => item.user_id === user.id); return `<button type="button" data-user-id="${user.id}" class="permission-user${user.id === selectedPortalUserId ? ' active' : ''}"><strong>${escapeHtml(p?.display_name || user.email || '××× ×©×')}</strong><small>${escapeHtml(user.email || '')}</small><span>${p?.is_super_admin ? '×× ×××ªÖ¾×¢×' : user.email_confirmed_at ? '×¤×¢×××' : '××××× ×'}</span></button>`; }).join('')}</div></aside><div class="permissions-editor">${model ? `<form id="permissions-form" class="panel" data-original-super-admin="${model.profile.is_super_admin}"><div class="permissions-editor-head"><div><p class="eyebrow">×¤×¨×× ××©×ª××©×ª</p><h2>${escapeHtml(model.profile.display_name || model.user.email)}</h2><p>${escapeHtml(model.user.email || '')}</p></div><span class="status-badge status-info">${model.profile.is_super_admin ? '×× ×××ªÖ¾×¢× â ×××©× ××××' : '××©×ª××©×ª ×¤××¨××'}</span></div><div class="form-grid"><label class="field">×©× ×ª×¦×××<input name="display_name" value="${escapeHtml(model.profile.display_name || '')}"></label><div class="access-level-field"><span>×¨××ª ××¨×©××</span><strong id="access-level-value">${model.profile.is_super_admin ? '×× ×××ªÖ¾×¢×' : '××©×ª××©×ª ×¤××¨××'}</strong><input name="is_super_admin" type="hidden" value="${model.profile.is_super_admin}"></div><label class="checkbox-field"><input name="is_active" type="checkbox" ${model.profile.is_active ? 'checked' : ''}> ××©×ª××©×ª ×¤×¢×××</label></div><button id="show-super-admin" class="button button-quiet super-admin-reveal" type="button" aria-expanded="false" aria-controls="super-admin-control">××¦× ××¨×©××ª ××©×ª××©Ö¾×¢×</button><section id="super-admin-control" class="super-admin-control" hidden><strong>××¨×©××ª ××©×ª××©Ö¾×¢×</strong><p>××©×ª××©Ö¾×¢× ××§×× ×××©× ×××× ××× ×××¡×××, ×××××¨××ª ×××× ×× ×××× ××¤××¨××.</p><button id="change-super-admin" class="button button-warning" type="button">${model.profile.is_super_admin ? '××¡×¨×ª ××¨×©××ª ××©×ª××©Ö¾×¢×' : '××¢× ×§×ª ××¨×©××ª ××©×ª××©Ö¾×¢×'}</button></section><fieldset><legend>×××× × ×ª×× ×× ××¨××× ×</legend><div class="scope-mode"><label><input type="radio" name="scope_mode" value="ORGANIZATION" ${model.profile.scope_mode === 'ORGANIZATION' ? 'checked' : ''}> ×× ×××¨×××</label><label><input type="radio" name="scope_mode" value="SELECTED" ${model.profile.scope_mode === 'SELECTED' ? 'checked' : ''}> ××××××ª ×××¢×× ××ª × ×××¨××</label></div><div class="scope-grid">${usersAdminData.allocation_units.map((unit) => `<label><input type="checkbox" name="unit_scope" value="${unit.allocation_unit_id}" ${model.unitIds.includes(unit.allocation_unit_id) ? 'checked' : ''}> <span>${escapeHtml(unit.display_name)}</span></label>`).join('')}${usersAdminData.daycares.map((daycare) => `<label><input type="checkbox" name="daycare_scope" value="${daycare.daycare_id}" ${model.daycareIds.includes(daycare.daycare_id) ? 'checked' : ''}> <span>${escapeHtml(daycare.display_name)}</span></label>`).join('')}</div></fieldset><section class="screen-permissions" aria-labelledby="screen-permissions-title"><h2 id="screen-permissions-title">××¨×©×××ª ×××¡×× ××¤××¨××</h2><p>××× ××¡× ×××××¨×ª ××¨×©×× ××¤××¨×©×ª.</p><div class="permission-table-wrap"><table id="permission-matrix" class="permission-table"><thead><tr><th scope="col">×©× ××¢×××</th><th scope="col">×××¡×ª×¨</th><th scope="col">×¦×¤×××</th><th scope="col">×¢×¨×××</th></tr></thead><tbody>${permissionRows(model)}</tbody></table></div></section><details class="audit-history"><summary>×××¡×××¨×××ª ×©×× ×××× (${model.audit.length})</summary>${model.audit.length ? model.audit.map((event) => `<p><strong>${escapeHtml(event.operation)}</strong> Â· ${new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.occurred_at))}</p>`).join('') : '<p>×× ×§××××ª ×××¡×××¨××.</p>'}</details><div class="form-actions"><button class="button button-primary" type="submit">×©×××¨×</button><button id="cancel-permissions" class="button button-secondary" type="button">×××××</button></div></form>` : '<section class="panel"><p>××× ××©×ª××©××.</p></section>'}</div>`;
  if (model) root.querySelector('.screen-permissions').insertAdjacentHTML('beforebegin', `<fieldset class="bank-transfer-permissions"><legend>××¢××¨××ª ×× ×§××××ª</legend><p>××¨×©××ª ×××¡× × ×§××¢×ª ××××× ××××: ×× ×××¦×× / ×¦×¤××× / ×¢×¨×××. ××¢×¨×××ª ×× ×××ª ××¢××: ×¢×¨×××, ××¢×× ××ª ××©××××× ×××× ×¤×¢××××ª ××××¦××¢. ×¡×× × ××ª ×××¢×× ××ª ××××× ×× ×ª×× ×× ×××¨××× ×.</p><button id="daycare-transfer-preset" class="button button-secondary" type="button">××× ×ª ×ª×¦××¨×ª ×¢×¨××× ××× ×××ª ××¢××</button><div class="scope-mode"><label><input type="radio" name="bank_transfer_scope" value="ALL" ${model.profile.bank_transfer_scope !== 'ASSIGNED_DAYCARES' ? 'checked' : ''}> ×× ×××¢××¨××ª</label><label><input type="radio" name="bank_transfer_scope" value="ASSIGNED_DAYCARES" ${model.profile.bank_transfer_scope === 'ASSIGNED_DAYCARES' ? 'checked' : ''}> ××¢×× ××ª ××©××××× ××××</label></div><div class="scope-grid"><label><input type="checkbox" name="approve_for_execution" ${model.profile.bank_transfer_approve_for_execution !== false ? 'checked' : ''}> ×××©××¨ ××××¦××¢</label><label><input type="checkbox" name="set_execution_date" ${model.profile.bank_transfer_set_execution_date !== false ? 'checked' : ''}> ×§×××¢× / ×©×× ×× ×ª××¨×× ×××¦××¢</label></div></fieldset>`);
  if (model && portalAccess?.profile?.is_super_admin) {
    const mcpControl = document.createElement('fieldset');
    mcpControl.className = 'bank-transfer-permissions';
    mcpControl.innerHTML = `<legend>×××©× ××¨× MCP</legend><p>×××©× ×××× ××§×¨×××ª × ×ª×× ×× ××¨× MCP ××××. ××× × ×××¤×©×¨×ª ××ª××× ×× ×©×× ××. ×¨×§ ×× ×××ªÖ¾×¢× ××××× ××©× ××ª ××¨×©×× ××.</p><label class="checkbox-field"><input id="mcp-full-read-toggle" type="checkbox" ${model.profile.mcp_full_read_access ? 'checked' : ''}> ×××©× ×××× ×× ×ª×× ×× ××¨× MCP</label><button class="button button-secondary" type="button" id="mcp-save-access">×©×××¨×ª ××¨×©××ª MCP</button>`;
    root.querySelector('.screen-permissions').insertAdjacentElement('beforebegin',mcpControl);
  }
  const permissionIntro = root.querySelector('.screen-permissions > p');
  if (permissionIntro) permissionIntro.textContent = '×× ×¢××× ××× ××¨×©×× ×©×××¨× × ×©××¨ ×××¡×ª×¨. ××¨×©××ª ×××¨× ××× × ×¤××ª××ª ×¢×××× ×××; ××¤×©×¨ ×××¢× ××§ ××¨×©×× ××¤××¨×©×ª ××¢× ×£ ×©××.';
  const hiddenHeading = root.querySelector('.permission-table thead th:nth-child(2)');
  if (hiddenHeading) hiddenHeading.textContent = '×× ×××¦××';
  root.hidden = false; bindPermissionsAdmin();
}

function bindPermissionsAdmin() {
  let dirty = false; let superAdminConfirmed = false; const form = $('#permissions-form');
  window.onbeforeunload = () => dirty ? '×§××××× ×©×× ×××× ×©×× × ×©××¨×.' : undefined;
  document.querySelectorAll('[data-user-id]').forEach((button) => button.addEventListener('click', () => { if (dirty && !confirm('×§××××× ×©×× ×××× ×©×× × ×©××¨×. ××¢×××¨ ×××©×ª××© ×××¨?')) return; selectedPortalUserId = button.dataset.userId; renderPermissionsAdmin(); }));
  form?.addEventListener('change', () => { dirty = true; });
  $('#daycare-transfer-preset')?.addEventListener('click', () => {
    const row = form.querySelector('[data-screen="dashboards.accounting.bank-transfers"]');
    row.querySelector('[data-permission][value="EDIT"]').click();
    form.querySelector('[name="bank_transfer_scope"][value="ASSIGNED_DAYCARES"]').click();
    form.querySelector('[name="scope_mode"][value="SELECTED"]').click();
    form.elements.approve_for_execution.checked = false;
    form.elements.set_execution_date.checked = false;
    dirty = true;
  });
  form?.querySelectorAll('[data-permission]').forEach((radio) => radio.addEventListener('change', () => {
    const row = radio.closest('[data-screen]');
    row.dataset.explicit = 'true';
    row.querySelector('[data-permission-state]').textContent = '××××¨× ××©××¨×';
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
      row.querySelector('[data-permission-state]').textContent = '××××¨× ××©××¨×';
      const reset = row.querySelector('[data-default-permission]');
      if (reset) reset.hidden = false;
    }
    dirty = true;
  }));
  form?.querySelectorAll('[data-default-permission]').forEach((button) => button.addEventListener('click', () => {
    const row = button.closest('[data-screen]');
    row.querySelector('[data-permission][value="HIDDEN"]').checked = true;
    row.dataset.explicit = 'false';
    row.querySelector('[data-permission-state]').textContent = '××¨××¨×ª ××××: ×× ×××¦××';
    button.hidden = true;
    dirty = true;
  }));
  $('#user-search')?.addEventListener('input', (event) => { const query = event.target.value.trim().toLowerCase(); document.querySelectorAll('[data-user-id]').forEach((item) => { item.hidden = !item.textContent.toLowerCase().includes(query); }); });
  $('#show-super-admin')?.addEventListener('click', (event) => { const control = $('#super-admin-control'); control.hidden = !control.hidden; event.currentTarget.setAttribute('aria-expanded', String(!control.hidden)); event.currentTarget.textContent = control.hidden ? '××¦× ××¨×©××ª ××©×ª××©Ö¾×¢×' : '××¡×ª×¨ ××¨×©××ª ××©×ª××©Ö¾×¢×'; });
  $('#change-super-admin')?.addEventListener('click', () => { const field = form.elements.is_super_admin; const granting = field.value !== 'true'; const warning = granting ? '××¢× ×§×ª ××¨×©××ª ××©×ª××©Ö¾×¢× ×ª××ª× ×××©× ×××× ××× ×××¡×××, ×××××¨××ª ×××× ×× ××××. ××××©××?' : '××¡×¨×ª ××¨×©××ª ××©×ª××©Ö¾×¢× ×ª××× ××ª ××××©× ××××× ××ª×¤×¢×× ××ª ×××¨×©×××ª ×××¤××¨×××ª ××¤× ××¡×. ××××©××?'; if (!confirm(warning)) return; field.value = String(granting); superAdminConfirmed = true; dirty = true; $('#access-level-value').textContent = granting ? '×× ×××ªÖ¾×¢×' : '××©×ª××©×ª ×¤××¨××'; $('#change-super-admin').textContent = granting ? '××¡×¨×ª ××¨×©××ª ××©×ª××©Ö¾×¢×' : '××¢× ×§×ª ××¨×©××ª ××©×ª××©Ö¾×¢×'; form.querySelectorAll('[data-permission]').forEach((radio) => { radio.disabled = granting; }); });
  $('#mcp-save-access')?.addEventListener('click', async () => {
    const enabled = $('#mcp-full-read-toggle').checked;
    if (enabled && !confirm('×××©×¨ ×××©× ×××× ××§×¨×××ª × ×ª×× ×× ××¨××× ××× ××¨× MCP ×××©×ª××© ××?')) return;
    $('#permissions-feedback').textContent = '×©×××¨ ××¨×©××ª MCPâ¦';
    try {
      await rpc('portal_admin_set_mcp_full_read_access',{p_user_id:selectedPortalUserId,p_enabled:enabled});
      const profile=usersAdminData.profiles.find(item=>item.user_id===selectedPortalUserId);
      if(profile)profile.mcp_full_read_access=enabled;
      $('#permissions-feedback').textContent = '××¨×©××ª MCP × ×©××¨×.';
    } catch(error){$('#permissions-feedback').textContent=error.message;$('#mcp-full-read-toggle').checked=!enabled;}
  });
  $('#cancel-permissions')?.addEventListener('click', renderPermissionsAdmin);
  form?.addEventListener('submit', async (event) => { event.preventDefault(); const values = new FormData(form); const isSuperAdmin = values.get('is_super_admin') === 'true'; if (isSuperAdmin !== (form.dataset.originalSuperAdmin === 'true') && !superAdminConfirmed) { $('#permissions-feedback').textContent = '××© ×××©×¨ ×××¤××¨×© ××ª ×©×× ×× ××¨×©××ª ××©×ª××©Ö¾××¢×.'; return; } if (!isSuperAdmin && values.get('bank_transfer_scope') === 'ASSIGNED_DAYCARES' && (values.get('scope_mode') !== 'SELECTED' || !values.getAll('daycare_scope').length)) { $('#permissions-feedback').textContent = '××© ×××××¨ ×××× × ×ª×× ×× × ×××¨ ×××©××× ××¤×××ª ××¢×× ×××.'; return; } const payload = { user_id: selectedPortalUserId, profile: { display_name: values.get('display_name'), is_active: values.has('is_active'), is_super_admin: isSuperAdmin, scope_mode: values.get('scope_mode') }, permissions: [...form.querySelectorAll('[data-screen][data-explicit="true"]')].map((row) => ({ screen_code: row.dataset.screen, permission_level: row.querySelector('[data-permission]:checked').value })), allocation_unit_ids: [...new Set(values.getAll('unit_scope'))], daycare_ids: [...new Set(values.getAll('daycare_scope'))], bank_transfer: { scope: values.get('bank_transfer_scope'), approve_for_execution: values.has('approve_for_execution'), set_execution_date: values.has('set_execution_date') } }; $('#permissions-feedback').textContent = '×©×××¨â¦'; try { usersAdminData = normalizeUsersAdminData(await portalUsersRequest('PATCH', payload)); dirty = false; $('#permissions-feedback').textContent = '××©×× ×××× × ×©××¨× ×××¦×××.'; renderPermissionsAdmin(); } catch (error) { $('#permissions-feedback').textContent = error.message; } });
}

async function loadPermissionsAdmin() {
  try { usersAdminData = normalizeUsersAdminData(await portalUsersRequest()); $('#permissions-admin-state').hidden = true; renderPermissionsAdmin(); } catch (error) { $('#permissions-admin-state').className = 'state error panel'; $('#permissions-admin-state').textContent = error.message; }
  if (usersAdminData?.authorization_mode === 'DIRECTOR_ONLY') return;
  if ($('#invite-user-open')) $('#invite-user-open').hidden = false;
  $('#invite-user-open')?.addEventListener('click', async () => { const email = prompt('××ª×××ª ××××´× ××××× ×:'); if (!email) return; const displayName = prompt('×©× ×ª×¦××× (×× ××××):') || ''; $('#permissions-feedback').textContent = '×©××× ×××× ×â¦'; try { usersAdminData = await portalUsersRequest('POST', { email, display_name: displayName }); $('#permissions-feedback').textContent = '××××× × × ×©××× ×××¦×××.'; renderPermissionsAdmin(); } catch (error) { $('#permissions-feedback').textContent = error.message; } });
}

function documentedText(value) {
  return escapeHtml(value).replace(/^###? (.+)$/gm, '<strong>$1</strong>').replace(/^[-*] (.+)$/gm, 'â¢ $1').replace(/\n/g, '<br>');
}

function systemRulesTemplate() {
  return `<section class="page-heading"><div><p class="eyebrow">××××× / ××§××¨: docs/handbook</p><h1>×××× ××¢×¨××ª</h1><p>${SYSTEM_RULES.length} ××××× ××ª××¢×××, ××× ×©×××©×ª ×××××× ××©×××¨×× (Reserved).</p></div><span class="status-badge status-success">×§×¨××× ××××</span></section><section class="management-filters panel"><label>×××¤××©<input id="rules-search" type="search" placeholder="××××, ×©× ×× ×ª××× ×××"></label><label>×ª×××<select id="rules-category"><option value="all">×× ××ª×××××</option>${RULE_CATEGORIES.map((category) => `<option value="${category.id}">${category.label} (${category.count})</option>`).join('')}</select></label><span id="rules-count" class="filter-result"></span></section><section id="rules-list" class="rules-list">${SYSTEM_RULES.map((rule) => `<details class="rule-card panel" data-rule data-category="${rule.category}" data-search="${escapeHtml(`${rule.id} ${rule.title} ${rule.details}`.toLowerCase())}"><summary><span><strong>${rule.id}</strong><span>${escapeHtml(rule.title)}</span></span><small>${rule.categoryLabel}</small></summary><div class="rule-details"><p class="source-note">××§××¨: ${rule.source}</p><div>${documentedText(rule.details)}</div></div></details>`).join('')}</section>`;
}

function bindSystemRules() {
  const search = $('#rules-search'); const category = $('#rules-category'); const count = $('#rules-count');
  const update = () => { const query = search.value.trim().toLowerCase(); let visible = 0; document.querySelectorAll('[data-rule]').forEach((item) => { const show = (!query || item.dataset.search.includes(query)) && (category.value === 'all' || item.dataset.category === category.value); item.hidden = !show; if (show) visible += 1; }); count.textContent = `${visible} ×××××`; };
  search.addEventListener('input', update); category.addEventListener('change', update); update();
}

function managementTableShell(title, description) {
  return `<section class="page-heading"><div><p class="eyebrow">××¨×©×××ª ×××××××ª</p><h1>${title}</h1><p>${description}</p></div><span class="status-badge status-success">×§×¨××× ××××</span></section><div id="management-table-state" class="state panel">×××¢× × ×ª×× ×× ×××× ××â¦</div><section id="management-tables" class="management-tables" hidden></section>`;
}

function displayValue(value) {
  if (value == null || value === '') return 'â';
  if (typeof value === 'boolean') return value ? '××' : '××';
  if (Array.isArray(value)) return value.join(', ') || 'â';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function dataTableTemplate(descriptor, rows) {
  const body = rows.length ? `<div class="management-table-scroll"><table><thead><tr>${descriptor.columns.map(([, label]) => `<th>${label}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${descriptor.columns.map(([key]) => `<td>${escapeHtml(displayValue(row[key]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="empty-inline">××× ×¨×©××××ª ×××× ××ª ×××§××¨ ×× ×ª×× ××.</p>';
  return `<details class="management-table-card panel" open><summary><span><strong>${descriptor.title}</strong><small>${descriptor.description}</small></span><span>${rows.length} ×¨×©××××ª</span></summary>${body}</details>`;
}

async function loadManagementTables(kind) {
  const descriptors = kind === 'reference' ? REFERENCE_TABLES : VARIABLE_RULE_TABLES;
  const cacheKey = `tables:${kind}`;
  if (!managementData.has(cacheKey)) managementData.set(cacheKey, runtimeConfiguration(kind === 'reference' ? 'management.tables.calculation' : 'management.tables.variables')
    .then((configuration) => descriptors.map((descriptor) => ({ descriptor, rows: configuration[descriptor.table] || [] })))
    .catch((error) => descriptors.map((descriptor) => ({ descriptor, rows: [], error: error.message }))));
  const results = await managementData.get(cacheKey);
  if (parseRoute().section !== 'training') return;
  const container = $('#management-tables'); if (!container) return;
  const cards = results.map(({ descriptor, rows, error }) => error ? `<details class="management-table-card panel"><summary><span><strong>${descriptor.title}</strong><small>${descriptor.description}</small></span><span>×× ××××</span></summary><p class="empty-inline">××§××¨ ×× ×ª×× ×× ××× × ×××× ×××©×ª××© ×× ××××.</p></details>` : dataTableTemplate(descriptor, rows));
  if (kind === 'reference') {
    const statusRules = SYSTEM_RULES.filter((rule) => DOCUMENTED_STATUS_RULES.includes(rule.id));
    cards.push(`<details class="management-table-card panel"><summary><span><strong>×¡××××¡×× ××¡×××××× ××ª××¢×××</strong><small>×¢×¨×× ×¡××××¡ ×©×××××¨× ×Ö¾Handbook.</small></span><span>${statusRules.length} ×§×××¦××ª</span></summary><div class="documented-statuses">${statusRules.map((rule) => `<article><strong>${rule.id} â ${escapeHtml(rule.title)}</strong><div>${documentedText(rule.details)}</div></article>`).join('')}</div></details>`);
  }
  container.innerHTML = cards.join(''); container.hidden = false; $('#management-table-state').hidden = true;
}

function auditLogTemplate() {
  return `<section class="page-heading"><div><p class="eyebrow">××¨×©×××ª ×××××××ª</p><h1>×××× ×©×× ××××</h1><p>×××¡×××¨×× ×××××××ª ××¤× ×¡×× ××××××§× ××××× ××××××§×.</p></div><span class="status-badge status-success">×§×¨××× ××××</span></section><section class="management-filters panel"><label>×××¤××©<input id="audit-search" type="search" placeholder="××××××§×, ×¤×¢××× ×× ××××"></label></section><div id="audit-state" class="state panel">×××¢× ×××¨××¢× ×××§××¨×ªâ¦</div><section id="audit-list" class="audit-list" hidden></section>`;
}

async function loadAuditLog() {
  let rows = []; let error = '';
  try { rows = await rest('audit_events', 'select=*&order=occurred_at.desc&limit=500'); } catch (caught) { error = caught.message; }
  if (parseRoute().page !== 'audit') return;
  const state = $('#audit-state'); const list = $('#audit-list');
  if (error) { state.className = 'state error panel'; state.textContent = '×××× ××©×× ×××× ××× × ×××× ×××©×ª××© ×× ××××.'; return; }
  if (!rows.length) { state.innerHTML = '<strong>××× ×××¨××¢× ×××§××¨×ª ×××× ××</strong><p>×××¨××¢×× ×××¤××¢× ××× ×××©×¨ ××§××¨ ××××§××¨×ª ×××× ×¨×©××××ª.</p>'; return; }
  state.hidden = true; list.hidden = false;
  list.innerHTML = rows.map((row) => `<article class="audit-card panel" data-audit-search="${escapeHtml(JSON.stringify(row).toLowerCase())}"><div><strong>${escapeHtml(displayValue(row.entity_type || row.object_type))}</strong><span>${escapeHtml(displayValue(row.action_type || row.action))}</span></div><dl><div><dt>×××× ××××××§×</dt><dd>${escapeHtml(displayValue(row.entity_id || row.object_id))}</dd></div><div><dt>×××¢×</dt><dd>${escapeHtml(displayValue(row.created_at))}</dd></div><div><dt>×××¦×¢</dt><dd>${escapeHtml(displayValue(row.actor_user_id || row.changed_by))}</dd></div></dl></article>`).join('');
  $('#audit-search').addEventListener('input', (event) => { const query = event.target.value.trim().toLowerCase(); document.querySelectorAll('[data-audit-search]').forEach((item) => { item.hidden = query && !item.dataset.auditSearch.includes(query); }); });
}

function calculatorsTemplate() {
  const cards = [
    { route: 'calculators/salary', icon: 'âª', title: '×××©××× ×©××¨', description: '××××× ×©××¨ ××××©× ××¤× ×××× ××©××¨ ××¤×¢××××.' },
    { route: 'calculators/occupancy', icon: 'â¦', title: '×ª×¤××¡×, ×ª×§×× × ××¨××××××ª', description: '××××§×ª ××¨×× ×××ª×, ×©××, ×¦×××ª ××××ª×× ××ª ××××××ª.' }
  ];
  return `<section class="page-heading"><div><p class="eyebrow">×××©××× ××</p><h1>×××©××× ××</h1><p>××× ×¢××¨ ××××©×× ×××ª×× ×× ×¢× ××¡××¡ ×××× ×××¨××× ××¤×¢××××.</p></div></section><section class="module-grid">${cards.filter((card) => canViewRoute(card.route)).map((card) => `<a class="module-card card" href="#${card.route}"><span class="module-icon">${card.icon}</span><div><h3>${card.title}</h3><p>${card.description}</p></div><span class="card-action">×¤×ª××× â</span></a>`).join('')}</section>`;
}

async function loadOccupancyRules() {
  if (occupancyModel.status === 'loading' || occupancyModel.status === 'ready') return;
  occupancyModel = { status: 'loading', error: '' };
  try {
    const { ages, licensing, rules, categories, parameters, years } = await runtimeConfiguration('calculators.occupancy');
    occupancyModel = { status: 'ready', error: '', ages, licensing, rules, categories, parameters, years };
  } catch (error) { occupancyModel = { status: 'error', error: error.message }; }
}

function occupancyManagementCalculatorTemplate() {
  return `<section class="page-heading"><div><p class="eyebrow">×××©××× ×× / ×ª×¤××¡×, ×ª×§×× × ××¨××××××ª</p><h1>×ª×¤××¡×, ×ª×§×× × ××¨××××××ª</h1><p>×©×××©× ×¦×¢××× ×§×¦×¨×× ×××××§×ª ××××ª× ×××§×××ª ××××× × ××××××ª.</p></div><a class="button button-secondary" href="#calculators">×××¨× ××××©××× ××</a></section><div id="occupancy-state" class="state panel">×××¢× ××××× ×¤×¢××××â¦</div><section id="occupancy-calculator" class="occupancy-calculator" hidden><form id="occupancy-form" class="panel occupancy-inputs" novalidate><section class="guided-step"><div class="guided-step-heading"><span>1</span><div><h2>×××× ×××ª× ××××§××?</h2><p>×××¨× ××ª ×§×××¦×ª ×××× ×©× ××××ª×. ××××ª× ××¢××¨××ª ×ª×××¨× ×× ××ª ×××¨××.</p></div></div><div id="occupancy-classroom-choices" class="occupancy-choice-grid" role="radiogroup" aria-label="×¡×× ×××ª×"></div></section><section class="guided-step"><div class="guided-step-heading"><span>2</span><div><h2>×× ××××¢ ××?</h2><p>×××××¨× ×§×××¢×ª ×××× × ×ª×× ×× ×¦×¨×× ××××× ××× ××××©××× ×××××¨.</p></div></div><div class="occupancy-choice-grid known-choice-grid" role="radiogroup" aria-label="× ×ª×× ×× ××××¢××"><label class="occupancy-choice"><input type="radio" name="knownType" value="AREA"><strong>××© ×× ×©×× ×××ª×</strong><small>× ××©× ××× ××××× ×××ª×¨ ××©××¥.</small></label><label class="occupancy-choice"><input type="radio" name="knownType" value="CHILDREN"><strong>××© ×× ××¡×¤×¨ ×××××</strong><small>× ××©× ××× ×©×× × ××¨×©.</small></label><label class="occupancy-choice"><input type="radio" name="knownType" value="BOTH"><strong>××© ×× ×× ×©×× ××× ××¡×¤×¨ ×××××</strong><small>× ××××§ ×× ××××ª× ×¢××××ª ×××¨××©××ª.</small></label></div></section><section id="occupancy-data-step" class="guided-step" hidden><div class="guided-step-heading"><span>3</span><div><h2>× ×ª×× × ××××ª×</h2><p id="occupancy-data-help"></p></div></div><div id="occupancy-mixed-selector" class="mixed-selector" hidden></div><div id="occupancy-required-fields" class="occupancy-fields"></div><label class="field">×©××¨ ×©×¢×ª× â ×× ××××<input name="hourlyWage" type="number" min="0" step="0.01" inputmode="decimal" placeholder="×× ××××¢, × ××©× ×¢×××ª ×©××¨ ×××ª×¨×"><small>××¤×©×¨ ×××©×××¨ ×¨××§. ×©××¨ ×××¡××£ ××××× ×¢×××ª ×××ª×¨× ××××.</small></label><div id="occupancy-calculated-fields" class="occupancy-calculated-fields" hidden><label class="field">×§×××××ª ×××§××ª ××¨×××ª<input name="calculatedCapacity" readonly aria-readonly="true"></label><label class="field">×©×× ×××§× × ××¨×©<input name="calculatedArea" readonly aria-readonly="true"></label></div><div id="occupancy-validation" class="inline-validation" role="alert" hidden></div><div id="occupancy-guidance" class="occupancy-guidance" role="status"></div><div class="occupancy-actions"><button class="button button-primary" type="submit">××©×× ×ª××¦××</button><button class="button button-quiet" type="reset">×××¤××¡</button></div></section></form><details class="panel occupancy-usage"><summary>××× ××©×ª××©×× ××××©×××?</summary><ol><li>××××¨×× ×¡×× ×××ª×.</li><li>××××¨×× ×× ××××¢ ××©××, ××¡×¤×¨ ×××××× ×× ×©× ×××.</li><li>×××× ×× ×¨×§ ××ª ×× ×ª×× ×× ×©××ª××§×©×. ××××ª× ××¢××¨××ª ×××× ×× ××××× ××× ×§×××¦×ª ××× ×©× ×××¨×.</li></ol></details><section id="occupancy-results" class="occupancy-results" hidden aria-live="polite"><div class="occupancy-result-heading"><div><h2>×ª××¦×××ª</h2><p id="occupancy-result-context" class="muted"></p></div><div class="occupancy-actions"><button class="button button-secondary" type="button" data-occupancy-print>×××¤×¡× / PDF</button><button class="button button-secondary" type="button" data-occupancy-csv>CSV</button></div></div><section id="occupancy-overall" class="panel occupancy-overall"></section><div id="occupancy-summary" class="occupancy-summary"></div><section id="occupancy-financial-impact" class="panel occupancy-financial"></section><section id="occupancy-recommendation" class="panel occupancy-recommendation"></section><section class="panel occupancy-alternatives"><div class="section-heading"><div><h2>××××¤××ª ×××§×××ª ××©××××©×××ª</h2><p>×× ××××¤× × ×××§× ××× ×§×××××ª, ×©××, ××¨×× ××ª×§×× ×ª ×¦×××ª.</p></div></div><div id="occupancy-alternatives"></div></section></section></section>`;
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
    $('#occupancy-state').textContent = '×× × ××ª× ×××¤×¢×× ××ª ××××©××× ×¢× ×××©×××ª ×××× ×¨××©××, ×ª×§×× ×, ×©××¨ ××××× ××©×¢××ª ×¤×¢××××ª ××× ×§×××¦××ª ××××.';
    return;
  }

  const classroomChoices = [...model.ages.map((age) => ({ value: age.age_group_code, title: age.display_name, help: '×××ª× ××§×××¦×ª ××× ×××ª.' })), { value: 'MIXED', title: '××¢××¨××ª', help: '×©×ª× ×§×××¦××ª ××× ×©×××ª×¨ ××©×× ××¤× ××××××.' }];
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
    $('#occupancy-mixed-selector').innerHTML = mixed ? `<strong>×××× ×§×××¦××ª ××× × ××¦×××ª ×××?</strong><p>×××¨× ×©×ª× ×§×××¦××ª. ×¨×§ ×©×××× ×©××××©×¨ ××××× ××¨××©×× ×××× ××××©×× ××××©××.</p><div class="mixed-age-choices">${model.ages.map((age) => `<label><input type="checkbox" name="mixedAge" value="${escapeHtml(age.age_group_code)}"><span>${escapeHtml(age.display_name)}</span></label>`).join('')}</div>` : '';
    renderRequiredFields();
  };
  const renderRequiredFields = () => {
    const ages = activeInputAges();
    const fields = [];
    if (needsArea()) fields.push(`<label class="field">×©×× ××××ª× ×××´×¨<input name="area" type="number" min="0.1" step="0.1" inputmode="decimal" placeholder="××××××: 55" required><small>××©×× ××¤× ×× ××¤××¢× ××©××××© ××××ª×.</small></label>`);
    if (needsChildren()) ages.forEach((age) => fields.push(`<label class="field">××¡×¤×¨ ${escapeHtml(ageByCode.get(age)?.display_name || age)}<input name="age_${escapeHtml(age)}" type="number" min="1" step="1" inputmode="numeric" placeholder="×××× × ××¡×¤×¨ ×××××" required><small>××¡×¤×¨ ×××××× ××¤××¢× ××§×××¦×ª ××× ××.</small></label>`));
    $('#occupancy-required-fields').innerHTML = fields.join('');
    $('#occupancy-data-help').textContent = selected('classroomType') === 'MIXED' ? '××××ª× ××¢××¨××ª ×××××× ×××××¨ ×©×ª× ×§×××¦××ª ×××××× ××¡×¤×¨ ××××× ××× ×××ª.' : selected('knownType') === 'AREA' ? '×××× × ×©×× ×××× ×× ××©× ×§×××××ª ××¨×××ª.' : selected('knownType') === 'CHILDREN' ? '×××× × ××¡×¤×¨ ××××× ×× ××©× ××ª ××©×× ×× ××¨×©.' : '×××× × ×©×× ×××¡×¤×¨ ××××× ×× ××××§ ××ª×××.';
    validateAndRender();
  };
  const validate = () => {
    const errors = [];
    const ages = activeInputAges();
    if (!selected('classroomType')) errors.push('××© ×××××¨ ×¡×× ×××ª×.');
    if (!selected('knownType')) errors.push('××© ×××××¨ ×× ××××¢ ××.');
    if (selected('classroomType') === 'MIXED') {
      if (ages.length !== 2) errors.push('××××ª× ××¢××¨××ª ××© ×××××¨ ×××××§ ×©×ª× ×§×××¦××ª ×××.');
      else {
        const licenses = ages.map((age) => licensing.find((rule) => rule.age_group === age));
        if (!licenses.every((rule, index) => (rule?.allowed_mixed_with || []).includes(ages[1 - index]))) errors.push('×©×××× ×§×××¦××ª ×××× ×©× ×××¨ ××× × ×××ª×¨ ××××ª× ××¢××¨××ª.');
      }
    }
    if (needsArea() && numberValue('area') <= 0) errors.push('××© ××××× ×©×× ×××ª× ×××× ×××¤×¡.');
    if (needsChildren()) ages.forEach((age) => { if (!Number.isInteger(numberValue(`age_${age}`)) || numberValue(`age_${age}`) <= 0) errors.push(`××© ××××× ××¡×¤×¨ ××××× ×©×× ×××××× ×¢×××¨ ${ageByCode.get(age)?.display_name || age}.`); });
    return errors;
  };
  const signed = (value, suffix = '') => `${value > 0 ? '+' : ''}${number.format(value)}${suffix}`;
  const metric = ({ label, ok, required, actual, difference, explanation, issue }) => `<article class="occupancy-metric ${ok ? 'status-good' : 'status-exception'}"><header><h3>${label}</h3><strong>${ok ? 'ð¢ ×ª×§××' : 'ð´ ×× ×ª×§××'}</strong></header><dl><div><dt>× ××¨×©</dt><dd>${required}</dd></div><div><dt>××¤××¢×</dt><dd>${actual}</dd></div><div><dt>××¤×¨×©</dt><dd>${difference}</dd></div></dl>${!ok && issue ? `<p class="occupancy-exception-reason">${issue}</p>` : ''}<details><summary>××× ×××©×?</summary><p>${explanation}</p></details></article>`;
  const renderResult = (calculationRequest, result) => {
    current = { request: calculationRequest, result };
    form.elements.calculatedCapacity.value = `${number.format(result.maximumLegalCapacity)} ×××××`;
    form.elements.calculatedArea.value = `${number.format(result.requiredSqm)} ××´×¨`;
    $('#occupancy-calculated-fields').hidden = false;
    const compositionLabel = result.details.map((detail) => `${escapeHtml(ageByCode.get(detail.age)?.display_name || detail.age)}: ${number.format(detail.children)}`).join(', ');
    const excess = result.details.filter((detail) => detail.children > detail.maxChildren).map((detail) => `${escapeHtml(ageByCode.get(detail.age)?.display_name || detail.age)}: ××¨××× ×©× ${number.format(detail.children - detail.maxChildren)}`).join('; ');
    const metrics = [
      { label: '×§×××××ª ×××××', ok: result.childrenCompliant, required: `×¢× ${number.format(result.maximumLegalCapacity)}`, actual: number.format(result.children), difference: signed(result.maximumLegalCapacity - result.children), issue: excess || '××¡×¤×¨ ×××××× ×××¨× ×××§×××××ª ××××§××ª.', explanation: '××××ª× ××-××××××ª ×¢× ×©×× ××××¢, ××§×××××ª ××× ×× ××× ×××× ×××××ª ×××××× ××¤×¢××× ×××× ××§×××××ª ×©××©×× ×××¤×©×¨.' },
      { label: '×©×× × ××¨×©', ok: result.areaCompliant, required: `${number.format(result.requiredSqm)} ××´×¨`, actual: `${number.format(result.actualSqm)} ××´×¨${needsArea() ? '' : ' (××××©×)'}`, difference: signed(result.remainingSqm, ' ××´×¨'), issue: `××¡×¨×× ${number.format(Math.abs(result.remainingSqm))} ××´×¨.`, explanation: '××× ×§×××¦×ª ×××: ××¡×¤×¨ ×××××× ××¤×× ×××´×¨ ×××× ×©×××× ××¨××©×× ××¤×¢××; ××××ª× ××¢××¨××ª ××××¨×× ××ª ××ª××¦×××ª.' },
      { label: '××¨×× ×××ª× ××¢××¨××ª', ok: result.compositionCompliant, required: '×©×××× ××××©×¨', actual: compositionLabel, difference: result.compositionCompliant ? '0 ××¨××××ª' : '1- ××¨×××', issue: '×©×××× ×××××× ××× × ××××©×¨ ××¤× ×××× ××¨××©×× ××¤×¢××××.', explanation: '×× ××× ×§×××¦××ª × ×××§ ×××××ª ××× ×¨×©×××ª ××©×××××× ××××ª×¨×× ×××¡××¡ ×× ×ª×× ××.' },
      { label: '×¦×××ª × ××¨×©', ok: result.staffingCompliant, required: result.requiredStaff == null ? '××× ×¤×¢××' : number.format(result.requiredStaff), actual: result.requiredStaff == null ? '×× × ××ª× ×××©×' : number.format(result.requiredStaff), difference: result.requiredStaff == null ? '××¡×¨ ×××' : '0', explanation: '××¡×¤×¨ ×××××× ××× ×§×××¦×ª ××× ×××××§ ××××¡ ××ª×§×× × ××¤×¢×× ×××¢××× ××©×××ª ××¢×××× ××¤×¢×××.' },
      { label: '××× ×¡× ××©××¢×¨×ª', ok: result.revenue > 0, required: '××× ×©××¨ ××××× ×¤×¢××', actual: money.format(result.revenue), difference: 'â', explanation: '××¡×¤×¨ ×××××× ××× ×§×××¦×ª ××× ××××¤× ××©××¨ ×××××× ×××××©× ××¤×¢××.' },
      { label: '××¢××××ª ×ª×¤××¡×', ok: result.efficiencyScore != null, required: '×¢× 100%', actual: `${number.format(result.efficiencyScore || 0)}%`, difference: signed((result.efficiencyScore || 0) - 100, '%'), explanation: '××¡×¤×¨ ×××××× ××¤××¢× ×××§× ××§×××××ª ××××§××ª ×©× ×××¨××.' },
      { label: '×¢×××ª ×©××¨ ××©××¢×¨×ª', ok: result.payrollCost == null || result.payrollCost <= result.revenue, required: result.payrollCost == null ? '×× ××××' : `×¢× ${money.format(result.revenue)}`, actual: result.payrollCost == null ? '×× ×××× ×©××¨' : money.format(result.payrollCost), difference: result.payrollCost == null ? 'â' : money.format(result.revenue - result.payrollCost), explanation: '××¦×××ª ×× ××¨×© ××¤×× ×©×¢××ª ××ª×§× ×××××©×××ª ××¤×¢××××ª ××¤×× ××©××¨ ××©×¢×ª× ×©××××.' },
      { label: '××ª×¨× ××©××¢×¨×ª', ok: result.surplus == null || result.surplus >= 0, required: '0 âª ×××¢××', actual: result.surplus == null ? '× ××¨×© ×©××¨ ×©×¢×ª×' : money.format(result.surplus), difference: result.surplus == null ? 'â' : money.format(result.surplus), explanation: '××× ×¡× ××©××¢×¨×ª ×¤×××ª ××××× ×¢×××ª ××©××¨. ×××¦×××ª ×××¨××ª ××× × × ×××××ª.' }
    ];
    const failures = [result.childrenCompliant, result.areaCompliant, result.compositionCompliant, result.staffingCompliant].filter((ok) => !ok).length;
    $('#occupancy-overall').className = `panel occupancy-overall ${result.compliant && result.staffingCompliant ? 'status-good' : 'status-exception'}`;
    $('#occupancy-overall').innerHTML = `<span>×¡××××¡ ××××</span><strong>${result.compliant && result.staffingCompliant ? 'ð¢ ×ª×§××' : 'ð´ ×× ×ª×§××'}</strong><dl><div><dt>× ××¨×©</dt><dd>4 ××××§××ª ×ª×§×× ××ª</dd></div><div><dt>××¤××¢×</dt><dd>${4 - failures} ××××§××ª ×ª×§×× ××ª</dd></div><div><dt>××¤×¨×©</dt><dd>${failures} ××¨××××ª</dd></div></dl>`;
    $('#occupancy-summary').innerHTML = metrics.map(metric).join('');
    $('#occupancy-financial-impact').innerHTML = result.payrollCost == null ? `<h2>××©×¤×¢× ××¡×¤××ª</h2><p>××× ×¡× ××××©××ª ××©××¢×¨×ª: <strong>${money.format(result.revenue)}</strong>. ×××¡××¤× ×©××¨ ×©×¢×ª× ××§×××ª ×¢×××ª ×©××¨ ×××ª×¨×.</p>` : `<h2>××©×¤×¢× ××¡×¤××ª</h2><div><span>××× ×¡×<strong>${money.format(result.revenue)}</strong></span><span>×¢×××ª ×©××¨<strong>${money.format(result.payrollCost)}</strong></span><span>××ª×¨×<strong>${money.format(result.surplus)}</strong></span></div><details><summary>××× ×××©×× ×××ª×¨×?</summary><p>××× ×¡× ××©××¢×¨×ª ×¤×××ª ×¦×××ª × ××¨×© ××¤×× ×©×¢××ª ××××©×××ª ××¤×× ××©××¨ ××©×¢×ª×.</p></details>`;
    const recommendation = !result.compositionCompliant ? '××© ×××××¨ ×©×ª× ×§×××¦××ª ××× ×©××©×××× ××× ××× ××××©×¨.' : !result.childrenCompliant ? '××© ×××¤×××ª ××ª ××¡×¤×¨ ×××××× ×¢× ××§×××××ª ××××§××ª.' : !result.areaCompliant ? `××© ××××¡××£ ××¤×××ª ${number.format(Math.abs(result.remainingSqm))} ××´×¨ ×× ×××¤×××ª ×××××.` : !result.staffingCompliant ? '×× × ××ª× ×××©×¨ ××ª ××××ª× ×¢× ×××©×××ª ××× ×ª×§×× ×ª ××¦×××ª.' : result.surplus != null && result.surplus < 0 ? '××××ª× ×ª×§×× ×, ×× ××××× ××©××¨ ×××× ××××× ×¡×.' : '××××ª× ×¢××××ª ×××¨××©××ª ××¤× ×× ×ª×× ×× ×©×××× ×.';
    $('#occupancy-recommendation').innerHTML = `<div><span>××××¦× × ××××××ª</span><strong>${recommendation}</strong></div>`;
    const alternatives = buildLegalOccupancyAlternatives(calculationRequest);
    $('#occupancy-alternatives').innerHTML = alternatives.length ? `<div class="occupancy-alternative-grid">${alternatives.map((row, index) => `<article class="occupancy-alternative-card"><header>${index === 0 ? '<span class="status-badge status-good">×××××¦×ª</span>' : ''}<strong>${row.details.map((detail) => `${escapeHtml(ageByCode.get(detail.age)?.display_name || detail.age)}: ${number.format(detail.children)}`).join(' + ')}</strong></header><p>${index === 0 ? '×××¤×©×¨××ª ××××§××ª ××¢××ª ×××©×¤×¢× ×××¡×¤××ª ××××× ××××ª×¨ ×××× ×××××¤××ª ×©× ×××§×.' : '××××¤× ×××§××ª ×§×¨××× ×× ×ª×× ×× ×©××× ×ª.'}</p><dl><div><dt>×©×× × ××¨×©</dt><dd>${number.format(row.requiredSqm)} ××´×¨</dd></div><div><dt>×¦×××ª</dt><dd>${number.format(row.requiredStaff)}</dd></div><div><dt>××× ×¡×</dt><dd>${money.format(row.revenue)}</dd></div><div><dt>××¢××××ª</dt><dd>${number.format(row.efficiencyScore)}%</dd></div></dl></article>`).join('')}</div>` : '<div class="empty-state compact">××× ××××¤× ×§×¨××× ×©×¢××¨× ××ª ×× ××××§××ª ××××§×××ª ×××ª×§×× ×.</div>';
    $('#occupancy-result-context').textContent = selected('knownType') === 'AREA' ? '×©×× â ×§×××××ª ×××××' : selected('knownType') === 'CHILDREN' ? '××××× â ×©×× × ××¨×©' : '××××§×ª ×©×× ×××¡×¤×¨ ×××××';
    $('#occupancy-results').hidden = false;
  };
  function validateAndRender(showErrors = false) {
    const errors = validate();
    $('#occupancy-validation').hidden = !showErrors || !errors.length;
    $('#occupancy-validation').innerHTML = errors.map((error) => `<p>${escapeHtml(error)}</p>`).join('');
    $('#occupancy-guidance').textContent = selected('knownType') === 'AREA' ? '× ××©× ××ª ××¡×¤×¨ ×××××× ×××¨×× ×©××©×× ×××¤×©×¨, ××× ××¢×××¨ ××ª ×××××ª ××¨××©××.' : selected('knownType') === 'CHILDREN' ? '× ××©× ××ª ××©×× ××××§× ×× ××¨×© ××¤× ××¡×¤×¨ ××××××.' : selected('knownType') === 'BOTH' ? '× ××××§ ××ª ××¡×¤×¨ ×××××× ××× ××©×× ×××× ××××××ª ××××ª×.' : '×××¨× ×× ××××¢ ×× ××× ××××©××.';
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
  $('[data-occupancy-csv]').addEventListener('click', () => { if (!current) return; const r = current.result; const rows = [['×××','× ××¨×©','××¤××¢×','××¤×¨×©'],['×¡××××¡ ××××','×ª×§××',r.compliant && r.staffingCompliant ? '×ª×§××' : '×× ×ª×§××',''],['×××××',r.allowedChildren,r.children,r.remainingChildren],['×©××',r.requiredSqm,r.actualSqm,r.remainingSqm],['××¨××','×××§×',r.compositionCompliant ? '×××§×' : '×× ×××§×',''],['×¦×××ª',r.requiredStaff,r.requiredStaff,0],['××× ×¡×','××× ×¤×¢××',r.revenue,''],['××¢××××ª',100,r.efficiencyScore,(r.efficiencyScore ?? 100)-100],['×¢×××ª ×©××¨','×××¤×¦××× ××',r.payrollCost ?? '',''],['××ª×¨×','0 ×××¢××',r.surplus ?? '',r.surplus ?? '']]; const blob = new Blob(['\uFEFF' + rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"','""')}"`).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'occupancy-calculator.csv'; link.click(); URL.revokeObjectURL(link.href); });
  $('#occupancy-state').hidden = true;
  $('#occupancy-calculator').hidden = false;
}

async function loadSalaryRules() {
  if (salaryModel.status === 'loading' || salaryModel.status === 'ready') return;
  salaryModel.status = 'loading';
  try {
    const { factors, rules, years } = await runtimeConfiguration('calculators.salary');
    const yearRules = rules.map((rule) => ({
      ...rule,
      minimum_seniority_years: Math.ceil(Number(rule.minimum_seniority_months || 0) / 12),
      maximum_seniority_years: rule.maximum_seniority_months == null ? null : Math.floor(Number(rule.maximum_seniority_months) / 12)
    }));
    salaryModel = { status: 'ready', factors, rules: yearRules, years, error: '' };
  } catch (error) { salaryModel = { status: 'error', factors: [], rules: [], years: [], error: error.message }; }
}

function salaryCalculatorTemplate() {
  return `<section class="page-heading"><div><p class="eyebrow">×××©××× ×× / ×××©××× ×©××¨</p><h1>×××©××× ×©××¨</h1><p>××××©×× ××××¡×¡ ×¢× ×××× ×©××¨ ×¤×¢×××× ×××× ××× ×× ×××××ª ×××¢× ×§ ××ª×××.</p></div><a class="button button-secondary" href="#calculators">×××¨× ××××©××× ××</a></section><div id="salary-state" class="state panel">×××¢× ×××× ×©××¨ ×¤×¢××××â¦</div><section id="salary-calculator" class="salary-calculator" hidden><form id="salary-form" class="panel salary-inputs"><label class="field">×ª×¢×¨××£ ×©×¢×ª×<input name="hourlyRate" type="number" min="0" step="0.01" value="50" required></label><label class="field">×©×¢××ª ××××©×××ª<input name="monthlyHours" type="number" min="1" step="0.5" value="160" required></label><label class="field">×××ª×§ ××××¨ (×©× ××)<input name="seniorityYears" type="number" min="0" step="1" value="0" required></label><label class="field">×××¨×××ª ×××ª×<select name="classManager"><option value="true">××</option><option value="false" selected>××</option></select></label><label class="field">×ª×¢×××<select name="certificate"><option value="YES">××</option><option value="COMMITMENT">××ª××××××ª</option><option value="NO">××</option></select></label><label class="field">×ª×××¨<select name="degree"><option value="true">××</option><option value="false">××</option></select></label><label class="field">××¦××× ××ª<select name="excellence"><option value="true">××</option><option value="false">××</option></select></label><label class="field">× ×¡××¢××ª<select name="travel"><option value="true">××</option><option value="false">××</option></select></label><div class="salary-actions"><button class="button button-quiet" type="reset">×××¤××¡</button><button class="button button-secondary" type="button" data-salary-print>×××¤×¡×</button></div></form><section class="salary-results"><div class="salary-summary"><article><span>××¨××× ××××©×</span><strong id="salary-gross">â</strong></article><article><span>×¢×××ª ××¤×§×××××ª ××©×¢×</span><strong id="salary-effective">â</strong></article><article><span>× ×× ××©××¢×¨</span><strong id="salary-net">â</strong></article></div><div class="panel salary-breakdown"><h2>×¤××¨×× ×××©××</h2><p id="salary-certificate-note" class="muted"></p><div id="salary-components"></div></div><section class="panel salary-comparison"><div><h2>××©××××ª ×ª×¨×××©×× A / B</h2><p>×©××¨× ××ª ××ª×¨×××© ×× ××××, ×¢××× × ×¢×¨××× ×××©×××.</p></div><div><button class="button button-secondary" type="button" data-scenario="A">×©×××¨×ª ×ª×¨×××© A</button><button class="button button-secondary" type="button" data-scenario="B">×©×××¨×ª ×ª×¨×××© B</button></div><div id="salary-scenarios"></div></section></section></section>`;
}

function bindSalaryCalculator() {
  const form = $('#salary-form'); let scenarios = {};
  const update = () => { const values = Object.fromEntries(new FormData(form)); const input = { ...values, hourlyRate: Number(values.hourlyRate), monthlyHours: Number(values.monthlyHours), seniorityYears: Number(values.seniorityYears), degree: values.degree === 'true', excellence: values.excellence === 'true', travel: values.travel === 'true' }; const result = calculateSalary(input, salaryModel.factors, salaryModel.rules, salaryModel.years); if (result.issues.length) { $('#salary-state').hidden = false; $('#salary-state').className = 'state error panel'; $('#salary-state').textContent = result.issues.join(' '); $('#salary-calculator').hidden = true; return null; } $('#salary-state').hidden = true; $('#salary-calculator').hidden = false; $('#salary-gross').textContent = money.format(result.gross); $('#salary-effective').textContent = money.format(result.effectiveHourly); $('#salary-net').textContent = `${money.format(result.netMin)}â${money.format(result.netMax)}`; $('#salary-certificate-note').textContent = input.certificate === 'COMMITMENT' ? '×ª××¡×¤×ª ××ª×¢××× ×××©×× ××¤× ××× ×××ª××××××ª ××¤×¢××.' : '××¡××××× ××××©××× ××¤× ×××××× ××¤×¢×××× ××©× ×ª ×××××××× ×©× ×××¨×.'; $('#salary-components').innerHTML = result.components.map((item) => `<div class="salary-component"><span>${escapeHtml(item.name)}</span><strong>${money.format(item.amount)}</strong></div>`).join(''); return { input, result }; };
  form.addEventListener('input', update); form.addEventListener('change', update); form.addEventListener('reset', () => setTimeout(update)); $('[data-salary-print]').addEventListener('click', () => window.print()); document.querySelectorAll('[data-scenario]').forEach((button) => button.addEventListener('click', () => { const current = update(); if (!current) return; scenarios[button.dataset.scenario] = current; const rows = Object.entries(scenarios).map(([key, value]) => `<div><strong>×ª×¨×××© ${key}</strong><span>${money.format(value.result.gross)}</span><small>${money.format(value.result.effectiveHourly)} ××©×¢×</small></div>`); if (scenarios.A && scenarios.B) rows.push(`<div><strong>×¤×¢×¨</strong><span>${money.format(scenarios.B.result.gross - scenarios.A.result.gross)}</span></div>`); $('#salary-scenarios').innerHTML = rows.join(''); })); update();
}

function loadingTemplate(label = '×××¢× × ×ª×× ××â¦') {
  return `<section class="loading-state panel" aria-live="polite"><span class="loading-spinner" aria-hidden="true"></span><strong>${label}</strong></section>`;
}

function unitsHubTemplate() {
  if (unitState.status === 'loading' || unitState.status === 'idle') return `<section class="page-heading"><div><p class="eyebrow">××©×××¨×××</p><h1>×××× ××××× ××¨××× ××ª ××¨×¦×× × ×××××§?</h1><p>×××¨× ××××× ××× ××¢×××¨ ×××©×××¨××× ××××ª×××× ××.</p></div></section>${loadingTemplate('×××¢× ××××××ª ××¨××× ×××ªâ¦')}`;
  if (unitState.status === 'error') return `<section class="page-heading"><div><p class="eyebrow">××©×××¨×××</p><h1>×××× ××××× ××¨××× ××ª ××¨×¦×× × ×××××§?</h1></div></section><section class="error-state panel"><strong>×× × ××ª× ×××¢×× ××ª ×××××××ª ×××¨××× ×××ª</strong><span>${escapeHtml(unitState.error)}</span><button class="button button-secondary" type="button" data-retry-units>× ××¡××× × ××¡×£</button></section>`;
  const cards = [{ allocation_unit_id: 'organization', display_name: '××× ×××¨×××', allocation_unit_type: 'ORGANIZATION', notes: null }, ...unitState.items];
  return `<section class="page-heading"><div><p class="eyebrow">××©×××¨×××</p><h1>×××× ××××× ××¨××× ××ª ××¨×¦×× × ×××××§?</h1><p>×××¨× ××××× ××× ××¢×××¨ ×××©×××¨××× ××××ª×××× ××.</p></div><span class="status-badge status-neutral">${unitState.items.length} ××××××ª ×¤×¢××××ª</span></section><section class="unit-grid" aria-label="××××××ª ××¨××× ×××ª">${cards.map(unitCardTemplate).join('')}</section>`;
}

function unitTypeLabel(type) {
  return ({ DAYCARE: '××¢×× ×××', OFFICE: '×××××ª ××©×¨×', MANAGEMENT: '×××××ª ×× ×××', DEVELOPMENT: '×××××ª ×¤××ª××', ORGANIZATION: '××× ××¨××× × ××××' })[type] || '';
}

function unitCardTemplate(unit) {
  const description = unit.notes || unitTypeLabel(unit.allocation_unit_type);
  return `<a class="unit-card card" data-unit-id="${escapeHtml(unit.allocation_unit_id)}" href="${unitRoute(unit.allocation_unit_id)}"><span class="unit-icon" aria-hidden="true">${unit.allocation_unit_type === 'DAYCARE' ? 'ð ' : unit.allocation_unit_type === 'ORGANIZATION' ? 'ð¢' : 'â¦'}</span><div><h2>${escapeHtml(unit.display_name)}</h2>${description ? `<p>${escapeHtml(description)}</p>` : ''}</div><span class="unit-status">××× × ×ª×× ×× ×××× ××</span><span class="card-action">××××¨×ª ××××× <span aria-hidden="true">â</span></span></a>`;
}

function findUnit(unitId) {
  if (unitId === 'organization') return { allocation_unit_id: 'organization', display_name: '××× ×××¨×××', allocation_unit_type: 'ORGANIZATION' };
  return unitState.items.find((unit) => unit.allocation_unit_id === unitId);
}

function unitHubTemplate(unit) {
  return `<section class="page-heading"><div><p class="eyebrow">××©×××¨××× Â· ${escapeHtml(unit.display_name)}</p><h1>${escapeHtml(unit.display_name)}</h1><p>×××¨× ××ª ×¡×× ×××©×××¨× ×©××¨×¦×× × ××¤×ª×× ×¢×××¨ ××××× ××.</p></div><a class="button button-secondary" href="#dashboards">×××¨× ××× ×××××××ª</a></section><section class="dashboard-type-grid" aria-label="×¡××× ××©×××¨×××">${dashboardTypes.filter((type) => canView(`dashboards.${type.id}`)).map((type) => `<a class="dashboard-type-card card" data-dashboard-type="${type.id}" href="${unitRoute(unit.allocation_unit_id, type.id)}"><span class="dashboard-type-icon" aria-hidden="true">${type.icon}</span><div><h2>${type.title}</h2><p>${type.description}</p></div><span class="card-action">×¤×ª×××ª ×××©×××¨× <span aria-hidden="true">â</span></span></a>`).join('')}</section>`;
}

function accountingHubTemplate(unit) {
  const cards = [
    { code: 'dashboards.accounting.summary', child: 'summary', icon: 'â¦', title: '××©×××¨× ×¡××××', description: '××§×¨× ××¡×××ª ×¢× ×¡××××¡ ××××¤×× ××ª× ××¢××ª ×××¢××¨× ××× ×××ª ××©××× ××ª.' },
    { code: 'dashboards.accounting.banks', child: 'banks', icon: 'â¤', title: '×§×××¥ ×× ×§××', description: '×¡××××ª ×¢×××× ××××¨× ××©×××, ××¡×××× ××××¤×× ××ª× ××¢××ª ×× ×§.' },
    { code: 'dashboards.accounting.bank-transfers', child: 'bank-transfers', icon: 'â', title: '××¢××¨××ª ×× ×§××××ª', description: '×××× ××¢×¨×××, ×¤××¦×× ×××¢×§× ×××¨ ×××¦××¢ ××¢××¨××ª ×× ×§××××ª.' }
  ];
  return `<section class="page-heading"><div><p class="eyebrow">×× ××´×</p><h1>×× ××´×</h1><p>×××¨× ××ª ×¡××××ª ××¢×××× ×©××¨×¦×× × ××¤×ª××.</p></div><a class="button button-secondary" href="${unitRoute(unit.allocation_unit_id)}">×××¨× ×××©×××¨×× ××××××</a></section><section class="accounting-choice-grid" aria-label="××¡×× ×× ×××ª ××©××× ××ª">${cards.filter((card) => canView(card.code)).map((card) => `<a class="dashboard-type-card card" data-accounting-screen="${card.child}" href="${unitRoute(unit.allocation_unit_id, `accounting/${card.child}`)}"><span class="dashboard-type-icon" aria-hidden="true">${card.icon}</span><div><h2>${card.title}</h2><p>${card.description}</p></div><span class="card-action">×¤×ª×××ª ×××¡× <span aria-hidden="true">â</span></span></a>`).join('') || '<section class="empty-state panel">××× ××¡×× ×× ××´× ×××× ×× ××¤× ×××¨×©×××ª ×× ××××××ª.</section>'}</section>`;
}

const bankWorkspaceRows = [];
let bankWorkspaceState = { selected: null, expanded: new Set(), quick: 'all', query: '' };

function bankWorkspaceTemplate() {
  return `<section class="bank-new-heading"><div><p class="eyebrow">×× ××´× / ×§×××¥ ×× ×§××</p><h1>×§×××¥ ×× ×§××</h1><p>×¡××××ª ×¢×××× ××××¨× ××©×××, ××©×××ª ××¡×××× ×××¢××¨× ××× ××´×.</p></div><span class="status-badge status-neutral">××× ×¨×©××××ª ×¢××××</span></section><section class="bank-new-summary"><button class="active" data-bank-quick="all"><span>×× ××ª× ××¢××ª</span><strong>0</strong><small>××× × ×ª×× ××</small></button><button data-bank-quick="attention"><span>×××¨×© ×××¤××</span><strong>0</strong><small>××× × ×ª×× ××</small></button><button data-bank-quick="split"><span>×ª× ××¢××ª ××¤××¦×××ª</span><strong>0</strong><small>××× × ×ª×× ××</small></button><article><span>××××ª ××ª×§××¤×</span><strong>âª0</strong><small>0 ×ª× ××¢××ª</small></article><article><span>×××× ××ª×§××¤×</span><strong>âª0</strong><small>0 ×ª× ××¢××ª</small></article></section><section class="bank-new-toolbar panel"><label class="bank-new-search">â <input id="bank-new-search" type="search" placeholder="×××¤××© ×ª××××¨ ×× ××¡×××ª×â¦"><kbd>/</kbd></label><label>××©×××<select><option>×× ×××©××× ××ª</option></select></label><label>××××©<select><option>×× ×××××©××</option></select></label><span id="bank-new-count">0 ×ª× ××¢××ª</span></section><section class="bank-new-main"><div class="bank-new-sheet panel"><div class="bank-new-scroll"><table><thead><tr><th>×ª××¨××</th><th>×ª××××¨ ×ª× ××¢×</th><th>××¡×××ª×</th><th>××©×××</th><th>××××</th><th>××××ª</th><th>×©×××</th><th>××××© ×××××</th><th>×¡××××¡</th><th>××¡××</th></tr></thead><tbody id="bank-new-rows"></tbody></table></div><footer>ââ ××¢××¨ ××× ×©××¨××ª Â· Enter ×¤×ª×××ª ×¤××¦×× Â· / ×××¤××©</footer></div><aside class="bank-new-details panel" id="bank-new-details" hidden></aside></section>`;
}

function bankWorkspaceFilteredRows() {
  const query = bankWorkspaceState.query.trim().toLocaleLowerCase('he-IL');
  return bankWorkspaceRows.filter((row) => (bankWorkspaceState.quick !== 'attention' || ['warning', 'danger'].includes(row.tone)) && (bankWorkspaceState.quick !== 'split' || row.splits) && (!query || `${row.description} ${row.reference}`.toLocaleLowerCase('he-IL').includes(query)));
}

function renderBankWorkspace() {
  const rows = bankWorkspaceFilteredRows();
  const table = $('#bank-new-rows'); if (!table) return;
  $('#bank-new-count').textContent = `${rows.length} ×ª× ××¢××ª`;
  table.innerHTML = rows.map((row) => `<tr tabindex="0" data-bank-row="${row.id}" class="${bankWorkspaceState.selected === row.id ? 'selected' : ''}"><td>${row.date}</td><td><strong>${row.splits ? `<button type="button" data-bank-expand="${row.id}" aria-label="×¤×ª×××ª ×¤××¦××">${bankWorkspaceState.expanded.has(row.id) ? 'â' : 'â¹'}</button>` : ''}${escapeHtml(row.description)}</strong></td><td>${escapeHtml(row.reference)}</td><td>${escapeHtml(row.account)}</td><td class="bank-debit">${row.debit ? money.format(row.debit) : 'â'}</td><td class="bank-credit">${row.credit ? money.format(row.credit) : 'â'}</td><td><span class="bank-allocation">${escapeHtml(row.allocation)}</span></td><td>${row.month}</td><td><span class="status-badge status-${row.tone}">${escapeHtml(row.status)}</span></td><td class="bank-document">${row.document ? 'â' : 'â'}</td></tr>${row.splits && bankWorkspaceState.expanded.has(row.id) ? row.splits.map((split, index) => `<tr class="bank-split-row"><td></td><td>â ×¤××¦×× ${index + 1}</td><td></td><td></td><td class="bank-debit">${money.format(split[1])}</td><td>â</td><td><span class="bank-allocation">${escapeHtml(split[0])}</span></td><td>${row.month}</td><td></td><td></td></tr>`).join('') : ''}`).join('') || '<tr><td colspan="10"><div class="admin-state admin-empty"><strong>××× ×ª× ××¢××ª ×× ×§ ×××¦××</strong><p>××ª× ××¢××ª ×××¤××¢× ××× ××××¨ ×××××¨ ××§××¨ ×× ×ª×× ×× ××××¡×¤×ª ××¨×©××× ××¨××©×× ×.</p></div></td></tr>';
  const selected = bankWorkspaceRows.find((row) => row.id === bankWorkspaceState.selected) || rows[0];
  if (!selected) { $('#bank-new-details').hidden = true; return; }
  $('#bank-new-details').hidden = false;
  $('#bank-new-details').innerHTML = `<p class="eyebrow">×¤×¨×× ×ª× ××¢×</p><h2>${escapeHtml(selected.description)}</h2><div class="bank-detail-amount"><small>${selected.debit ? '××××' : '××××ª'}</small><strong class="${selected.debit ? 'bank-debit' : 'bank-credit'}">${money.format(selected.debit || selected.credit)}</strong><span>${selected.date} Â· ${escapeHtml(selected.account)}</span></div><dl><div><dt>××¡×××ª×</dt><dd>${escapeHtml(selected.reference)}</dd></div><div><dt>××××© ×××××</dt><dd>${selected.month}</dd></div><div><dt>×©×××</dt><dd>${escapeHtml(selected.allocation)}</dd></div><div><dt>×¡××××¡</dt><dd>${escapeHtml(selected.status)}</dd></div></dl><section><h3>××¡××××</h3><div class="bank-document-box">${selected.document ? 'â± ××¡×××ª× ×¡×¨××§×.pdf<br><small>Google Drive Â· ××¡×× ×××××</small>' : '××¨× ×¦××¨×£ ××¡××'}</div></section><section><h3>××¢×¨××ª</h3><p>${escapeHtml(selected.note || '××× ××¢×¨××ª ××ª× ××¢× ××.')}</p></section><section><h3>×××¡×××¨××</h3><p>×××× Â· × ×¤×ª×× ×××××§×</p><p>× ×§××× ××§×××¥ ××× ×§</p></section><details><summary>××××¢ ××× ×</summary><p>×©×××ª ××× ××× ×××¡×ª×¨×× ××××××××.</p></details>`;
}

function bindBankWorkspace() {
  renderBankWorkspace();
  $('#bank-new-search')?.addEventListener('input', (event) => { bankWorkspaceState.query = event.target.value; renderBankWorkspace(); });
  document.querySelectorAll('[data-bank-quick]').forEach((button) => button.addEventListener('click', () => { bankWorkspaceState.quick = button.dataset.bankQuick; document.querySelectorAll('[data-bank-quick]').forEach((item) => item.classList.toggle('active', item === button)); renderBankWorkspace(); }));
  $('#bank-new-rows')?.addEventListener('click', (event) => { const expand = event.target.closest('[data-bank-expand]'); if (expand) { const id = Number(expand.dataset.bankExpand); bankWorkspaceState.expanded.has(id) ? bankWorkspaceState.expanded.delete(id) : bankWorkspaceState.expanded.add(id); bankWorkspaceState.selected = id; renderBankWorkspace(); return; } const row = event.target.closest('[data-bank-row]'); if (row) { bankWorkspaceState.selected = Number(row.dataset.bankRow); renderBankWorkspace(); } });
  $('#page-content')?.addEventListener('keydown', (event) => { if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') { event.preventDefault(); $('#bank-new-search')?.focus(); return; } if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key) || ['INPUT', 'SELECT'].includes(document.activeElement?.tagName)) return; const rows = bankWorkspaceFilteredRows(); const index = rows.findIndex((row) => row.id === bankWorkspaceState.selected); if (event.key === 'Enter') { const row = rows[index]; if (row?.splits) { bankWorkspaceState.expanded.has(row.id) ? bankWorkspaceState.expanded.delete(row.id) : bankWorkspaceState.expanded.add(row.id); renderBankWorkspace(); } return; } event.preventDefault(); const next = event.key === 'ArrowDown' ? Math.min(index + 1, rows.length - 1) : Math.max(index - 1, 0); if (rows[next]) { bankWorkspaceState.selected = rows[next].id; renderBankWorkspace(); $(`[data-bank-row="${rows[next].id}"]`)?.focus(); } });
}

function dashboardPlaceholderTemplate(unit, type) {
  return `<section class="page-heading"><div><p class="eyebrow">${escapeHtml(unit.display_name)} Â· ${type.title}</p><h1>${type.title}</h1><p>×××©×××¨× ×××¦× ×××§×©×¨ ×©× ${escapeHtml(unit.display_name)}.</p></div><a class="button button-secondary" href="${unitRoute(unit.allocation_unit_id)}">×××¨× ×××©×××¨×× ××××××</a></section><section class="coming-soon panel"><span class="coming-icon" aria-hidden="true">${type.icon}</span><span class="status-badge status-info">××§×¨××</span><h2>${type.title} ×¢×××¨ ${escapeHtml(unit.display_name)}</h2><p>×××¢× ×××× ×××¢×× ×ª × ×ª×× ×× ×××¢××××× ××¡×¤×¨×× × ×¢×ª×××. ××©×× ×× ×× ×××¦××× × ×ª×× ××, ××××× ×× ××ª×¨×××ª.</p></section>`;
}

function generalDashboardShell(unit) {
  return `<section class="financial-heading"><div><p class="eyebrow">××©×××¨× ××¡×¤××</p><h1>××©×××¨× ××¡×¤×× Â· ${escapeHtml(unit.display_name)}</h1><p>×ª××× ×ª ××¦× × ××××××ª ×××××¡×¡×ª ×¢× ×× ×ª×× ×× ××§××××× ××××.</p></div><div class="dashboard-context"><span><small>×××××ª ××§×¦××</small><strong>${escapeHtml(unit.display_name)}</strong></span><span><small>×©× ×ª ×××××××</small><strong id="context-year">â</strong></span><span><small>×ª×§××¤× × ×××¨×ª</small><strong id="context-period">â</strong></span></div></section>
  <section class="global-toolbar panel" aria-label="×¤×¢××××ª ××©×××¨×"><button id="refresh-dashboard" class="button button-secondary" type="button">â» ×¨×¢× ×× × ×ª×× ××</button><span class="last-updated"><small>×¢×××× ××××¨×× ×</small><strong id="last-updated">××¨× ×¢××××</strong></span><div class="toolbar-actions"><button class="button button-quiet" type="button" data-export="print">×××¤×¡×</button><button class="button button-quiet" type="button" data-export="pdf">PDF</button><button class="button button-quiet" type="button" data-export="excel">Excel</button></div></section>
  <div id="general-state" class="dashboard-skeleton" aria-live="polite">${Array.from({ length: 8 }, () => '<span></span>').join('')}</div>
  <div id="general-dashboard" hidden><section class="school-year-summary panel" aria-labelledby="summary-title"><div><p class="eyebrow">×¡×××× ×©× ×ª ××××××××</p><h2 id="summary-title">××ª××××ª ×©× ×ª ××××××××</h2><p id="summary-range">â</p></div><div id="school-year-metrics" class="summary-metrics"></div><div><small>×¢× ××××© ×× ×ª×× ×× ××××¨××</small><strong id="summary-month">â</strong></div></section><section class="period-panel panel"><div><h2>××××¨×ª ×ª×§××¤×</h2><p>×××¨× ××××××ª ×××××© ××× ×× ××¡×¤×¨ ××××©××. ××¡×××× ××©× ×ª× × ×©××¨ ×§×××¢.</p></div><div class="chip-filters"><fieldset id="unit-filter-group" hidden><legend>××××××ª</legend><div id="unit-chips" class="filter-chips"></div></fieldset><fieldset><legend>×©× ×ª ×××××××</legend><div id="year-chips" class="filter-chips"></div></fieldset><fieldset><legend>××××©××</legend><div id="month-chips" class="filter-chips month-chips"></div></fieldset></div></section><section id="kpis" class="financial-kpis" aria-label="××××× ××¨×××××"></section><section class="expandable-sections" aria-label="×¤××¨×× ×××©×××¨×">${[['budget','×§××××¨×××ª ×ª×§×¦××'],['payroll','×©××¨'],['hours','×©×¢××ª × ××¨×©××ª'],['children','×××××'],['bank','×ª× ××¢××ª ×× ×§'],['quality','×××¨×© ×ª×©×××ª ××']].map(([id, label]) => `<details class="dashboard-detail panel"><summary>${label}<span>×¤×ª×××ª ×¤××¨××</span></summary><div id="detail-${id}" class="detail-content"></div></details>`).join('')}</section></div>
  <aside id="kpi-panel" class="kpi-panel" hidden aria-labelledby="kpi-panel-title"><button id="close-kpi-panel" class="icon-button" type="button" aria-label="×¡×××¨×ª ××¨×× ×××××¢">Ã</button><p class="eyebrow">××¨×× ××××¢</p><h2 id="kpi-panel-title"></h2><p id="kpi-filters" class="kpi-context"></p><div class="info-tabs" role="tablist">${[['explanation','××¡××¨'],['calculation','×××©×× ×¢×¡×§×'],['details','×¤××¨××'],['source','× ×ª×× × ××§××¨'],['actions','×¤×¢××××ª']].map(([id,label], index) => `<button type="button" role="tab" data-info-tab="${id}" aria-selected="${index === 0}">${label}</button>`).join('')}</div><section class="info-tab-panel" data-info-panel="explanation"><p id="kpi-description"></p></section><section class="info-tab-panel" data-info-panel="calculation" hidden><p id="kpi-calculation"></p></section><section class="info-tab-panel" data-info-panel="details" hidden><div id="kpi-details" class="source-records"></div></section><section class="info-tab-panel" data-info-panel="source" hidden><p id="kpi-source" class="source-note"></p><div id="kpi-records" class="source-records"></div></section><section class="info-tab-panel" data-info-panel="actions" hidden><div class="info-actions"><button class="button button-secondary" type="button" data-info-action="print">×××¤×¡×</button><button class="button button-secondary" type="button" data-info-action="pdf">×××¦×× PDF</button><button class="button button-secondary" type="button" data-info-action="excel">×××¦×× Excel</button></div></section></aside><button id="kpi-backdrop" class="kpi-backdrop" type="button" aria-label="×¡×××¨×ª ××¨×× ×××××¢" hidden></button><div id="export-message" class="toast" role="status" hidden></div>`;
}

function accountingDashboardShell(unit) {
  return `<section class="financial-heading"><div><p class="eyebrow">××©×××¨× ×¡××××</p><h1>××©×××¨× ×¡×××× Â· ${escapeHtml(unit.display_name)}</h1><p>××§×¨× ×¢× ×©××××ª ×ª× ××¢××ª ××× ×§ ××ª×××× ××××¤×× ×××©××× ××.</p></div><div class="dashboard-context"><span><small>×××××ª ××§×¦××</small><strong>${escapeHtml(unit.display_name)}</strong></span><span><small>×©× ×ª ×××××××</small><strong id="context-year">â</strong></span><span><small>×ª×§××¤× × ×××¨×ª</small><strong id="context-period">â</strong></span></div></section>
  <section class="global-toolbar panel" aria-label="×¤×¢××××ª ××©×××¨×"><button id="refresh-dashboard" class="button button-secondary" type="button">â» ×¨×¢× ×× × ×ª×× ××</button><span class="last-updated"><small>×¢×××× ××××¨×× ×</small><strong id="last-updated">××¨× ×¢××××</strong></span><div class="toolbar-actions"><button class="button button-quiet" type="button" data-export="print">×××¤×¡×</button><button class="button button-quiet" type="button" data-export="pdf">PDF</button><button class="button button-quiet" type="button" data-export="excel">Excel</button></div></section>
  <div id="general-state" class="dashboard-skeleton" aria-live="polite">${Array.from({ length: 8 }, () => '<span></span>').join('')}</div>
  <div id="general-dashboard" hidden><section class="school-year-summary panel"><div><p class="eyebrow">×¡×××× ×©× × ×§×× ××¨××ª</p><h2>××ª××××ª ××©× × ××§×× ××¨××ª</h2><p id="summary-range">â</p></div><div id="school-year-metrics" class="summary-metrics"></div><div><small>×¢× ××××</small><strong id="summary-month">â</strong></div></section><section class="period-panel panel"><div><h2>××××¨×ª ×ª×§××¤×</h2><p>×××¨× ××××××ª ×××××© ××× ×× ××¡×¤×¨ ××××©××. ××¡×××× ××©× ×ª× ××§×× ××¨× × ×©××¨ ×§×××¢.</p></div><div class="chip-filters"><fieldset id="unit-filter-group" hidden><legend>××××××ª</legend><div id="unit-chips" class="filter-chips"></div></fieldset><fieldset><legend>×©× × ×§×× ××¨××ª</legend><div id="year-chips" class="filter-chips"></div></fieldset><fieldset><legend>××××©××</legend><div id="month-chips" class="filter-chips month-chips"></div></fieldset></div></section><section id="kpis" class="financial-kpis accounting-kpis" aria-label="×××× ×× ×××ª ××©××× ××ª"></section><section class="expandable-sections" aria-label="×¤××¨×× ×× ×××ª ××©××× ××ª">${[['daycare','×ª× ××¢××ª ××¤× ××¢××'],['unit','×ª× ××¢××ª ××¤× ×××××ª ××§×¦××'],['account','×ª× ××¢××ª ××¤× ××©××× ×× ×§'],['status','×ª× ××¢××ª ××¤× ×¡××××¡ ×× ××´×'],['attention','×ª× ××¢××ª ××××¨×©××ª ×ª×©×××ª ××'],['split','×ª× ××¢××ª ××¤××¦×××ª']].map(([id, label]) => `<details class="dashboard-detail panel"><summary>${label}<span>×¤×ª×××ª ×¤××¨××</span></summary><div id="detail-${id}" class="detail-content"></div></details>`).join('')}</section></div>
  <aside id="kpi-panel" class="kpi-panel" hidden aria-labelledby="kpi-panel-title"><button id="close-kpi-panel" class="icon-button" type="button" aria-label="×¡×××¨×ª ××¨×× ×××××¢">Ã</button><p class="eyebrow">××¨×× ××××¢</p><h2 id="kpi-panel-title"></h2><p id="kpi-filters" class="kpi-context"></p><div class="info-tabs" role="tablist">${[['explanation','××¡××¨'],['calculation','×××©×× ×¢×¡×§×'],['details','×¤××¨××'],['source','× ×ª×× × ××§××¨'],['actions','×¤×¢××××ª']].map(([id,label], index) => `<button type="button" role="tab" data-info-tab="${id}" aria-selected="${index === 0}">${label}</button>`).join('')}</div><section class="info-tab-panel" data-info-panel="explanation"><p id="kpi-description"></p></section><section class="info-tab-panel" data-info-panel="calculation" hidden><p id="kpi-calculation"></p></section><section class="info-tab-panel" data-info-panel="details" hidden><div id="kpi-details" class="source-records"></div></section><section class="info-tab-panel" data-info-panel="source" hidden><p id="kpi-source" class="source-note"></p><div id="kpi-records" class="source-records"></div></section><section class="info-tab-panel" data-info-panel="actions" hidden><div class="info-actions"><button class="button button-secondary" type="button" data-info-action="print">×××¤×¡×</button><button class="button button-secondary" type="button" data-info-action="pdf">×××¦×× PDF</button><button class="button button-secondary" type="button" data-info-action="excel">×××¦×× Excel</button></div></section></aside><button id="kpi-backdrop" class="kpi-backdrop" type="button" aria-label="×¡×××¨×ª ××¨×× ×××××¢" hidden></button><div id="export-message" class="toast" role="status" hidden></div>`;
}

function staffDashboardShell(unit) {
  const details = [['attention','×××¤×× ×××××'],['licensing','×¨××©×× ××ª×¢××××ª'],['missing','× ×ª×× × ×¢××× ××¡×¨××'],['workforce','× ××ª×× ××× ×××'],['comparison','××©××××ª ××¢×× ××ª'],['employees','×¨×©×××ª ×¢×××××']];
  return `<section class="financial-heading"><div><p class="eyebrow">×¦×××ª ××¨××©××</p><h1>××©×××¨× ×¦×××ª ××¨××©×× Â· ${escapeHtml(unit.display_name)}</h1><p>××§×¨×ª ×ª××§×£, ×©××××ª × ×ª×× ×× ××¤×¢××××ª × ××¨×©××ª ×¢×××¨ ××¢×××××.</p></div><div class="dashboard-context"><span><small>×××××ª ××§×¦××</small><strong>${escapeHtml(unit.display_name)}</strong></span></div></section>
  <section class="global-toolbar panel"><button id="refresh-dashboard" class="button button-secondary" type="button">â» ×¨×¢× ×× × ×ª×× ××</button><span class="last-updated"><small>×¢×××× ××××¨×× ×</small><strong id="last-updated">××¨× ×¢××××</strong></span><div class="toolbar-actions"><button class="button button-quiet" type="button" data-export="print">×××¤×¡×</button><button class="button button-quiet" type="button" data-export="pdf">PDF</button><button class="button button-quiet" type="button" data-export="excel">Excel</button></div></section>
  <div id="general-state" class="dashboard-skeleton" aria-live="polite">${Array.from({ length: 8 }, () => '<span></span>').join('')}</div><div id="general-dashboard" hidden><section class="period-panel panel"><div><h2>×ª××× ×ª ××¦× ×ª×¤×¢××××ª</h2><p>×××××× ××¦×××× ×¢××××× ×¤×¢×××× ××× ××©××× ×××××××× ×××¤××.</p></div></section><section id="kpis" class="financial-kpis" aria-label="×××× ×¦×××ª ××¨××©××"></section><section id="staff-daycare-summary" class="staff-daycare-summary panel" hidden><div class="section-heading"><div><p class="eyebrow">××¦× ×××¢×× ××ª</p><h2>×ª××× ×ª ××¦× ××¤× ××¢××</h2></div></div><div id="staff-daycare-grid" class="staff-daycare-grid"></div></section><section class="staff-filters panel" aria-label="×¡×× ×× ×¢×××××"><label>×××¤××© ×¢×××<input id="staff-search" type="search" placeholder="×©×, ××¢×× ×× ×ª×¤×§××"></label><label>××¦×<select id="staff-status-filter"><option value="all">×× ×××¦×××</option><option value="good">×ª×§××</option><option value="warning">×××¨×© ××¢×§×</option><option value="exception">×××¨×© ×××¤××</option></select></label><label id="staff-daycare-filter-wrap">××¢××<select id="staff-daycare-filter"><option value="all">×× ×××¢×× ××ª</option></select></label></section><section class="expandable-sections">${details.map(([id,label]) => `<details class="dashboard-detail panel"><summary>${label}<span>×¤×ª×××ª ×¤××¨××</span></summary><div id="detail-${id}" class="detail-content"></div></details>`).join('')}</section></div><aside id="kpi-panel" class="kpi-panel" hidden aria-labelledby="kpi-panel-title"><button id="close-kpi-panel" class="icon-button" type="button" aria-label="×¡×××¨×">Ã</button><p class="eyebrow">××¨×× ××××¢</p><h2 id="kpi-panel-title"></h2><p id="kpi-filters" class="kpi-context"></p><div class="info-tabs" role="tablist">${[['explanation','××¡××¨'],['calculation','×××©×× ×¢×¡×§×'],['details','×¤××¨××'],['source','× ×ª×× × ××§××¨'],['actions','×¤×¢××××ª']].map(([id,label], index) => `<button type="button" role="tab" data-info-tab="${id}" aria-selected="${index === 0}">${label}</button>`).join('')}</div><section class="info-tab-panel" data-info-panel="explanation"><p id="kpi-description"></p></section><section class="info-tab-panel" data-info-panel="calculation" hidden><p id="kpi-calculation"></p></section><section class="info-tab-panel" data-info-panel="details" hidden><div id="kpi-details" class="source-records"></div></section><section class="info-tab-panel" data-info-panel="source" hidden><p id="kpi-source" class="source-note"></p><div id="kpi-records" class="source-records"></div></section><section class="info-tab-panel" data-info-panel="actions" hidden><div class="info-actions"><button class="button button-secondary" type="button" data-info-action="print">×××¤×¡×</button><button class="button button-secondary" type="button" data-info-action="pdf">×××¦×× PDF</button><button class="button button-secondary" type="button" data-info-action="excel">×××¦×× Excel</button></div></section></aside><aside id="staff-record-panel" class="staff-record-panel" hidden aria-label="×¤×¨×× ×¢×××"><button id="close-staff-record" class="icon-button" type="button" aria-label="×¡×××¨×ª ×¤×¨×× ×¢×××">Ã</button><div id="staff-record-content"></div></aside><button id="kpi-backdrop" class="kpi-backdrop" type="button" hidden></button><div id="export-message" class="toast" hidden></div>`;
}

const staffDateStatus = (date) => { if (!date) return 'exception'; const days = (new Date(`${date}T00:00:00`) - new Date()) / 86400000; return days < 0 ? 'exception' : days <= 60 ? 'warning' : 'good'; };
async function loadStaffDashboard() {
  if (staffStatus === 'loading' || staffStatus === 'ready') return;
  staffStatus = 'loading'; staffError = '';
  try {
    const [employees, employments, assignments, terms, config] = await Promise.all([
      rest('employees', 'select=employee_id,employee_code,national_id,first_name,last_name,phone,email,birth_date,hebrew_birth_date,lifecycle_status,manager_employee_id,notes'),
      rest('employments', 'select=employment_id,employee_id,employment_start_date,employment_end_date,recognized_prior_seniority_months,employment_status,notes'),
      rest('employee_assignments', 'select=assignment_id,employment_id,allocation_unit_id,daycare_id,classroom_id,role_id,effective_from,effective_to,is_primary,notes'),
      rest('employee_pay_terms', 'select=employee_pay_term_id,employee_id,valid_from,valid_to,pay_type,base_pay,estimated_employment_percentage,caregiver_certificate_status,studies_end_date,has_degree,is_class_manager,first_aid_valid_until,safe_conduct_valid_until,weekly_schedule,notes'),
      runtimeConfiguration('dashboards.staffing')
    ]);
    const { roles = [], daycares = [], classrooms = [], units = [] } = config;
    staffModel = { employees, employments, assignments, terms, roles, daycares, classrooms, units: activeUnits(units) }; staffStatus = 'ready'; staffLastUpdated = new Date();
  } catch (error) { staffStatus = 'error'; staffError = error.message; }
}

const staffStatusLabels = { good: '×ª×§××', warning: '×××¨×© ××¢×§×', exception: '×××¨×© ×××¤××', neutral: '××× × ×ª×× ××' };
const staffBadgeClass = (status) => ({ good: 'success', warning: 'warning', exception: 'danger', neutral: 'neutral' }[status] || 'neutral');
function staffIssues(person) {
  const issues = [];
  if (person.firstAid !== 'good') issues.push({ label: person.firstAid === 'warning' ? '×¢××¨× ×¨××©×× × ×§×¨××× ××¤×§××¢×' : '×¢××¨× ×¨××©×× × ××¡×¨× ×× ×¤××', status: person.firstAid });
  if (person.safe !== 'good') issues.push({ label: person.safe === 'warning' ? '××ª× ××××ª ××××× ×§×¨××× ××¤×§××¢×' : '××ª× ××××ª ××××× ××¡×¨× ×× ×¤××', status: person.safe });
  person.missing.forEach((label) => issues.push({ label: `××¡×¨: ${label}`, status: 'exception' }));
  return issues;
}
function staffReadableRow(person) {
  return { ×¢×××: `${person.employee.first_name || ''} ${person.employee.last_name || ''}`.trim() || '×¢××× ××× ×©×', ××¢××: person.daycare?.display_name || '×× ×©×××', ×ª×¤×§××: person.role?.display_name || '×× ×××××¨', ××¦×: staffStatusLabels[person.overall], '×¢××¨× ×¨××©×× ×': person.term?.first_aid_valid_until || '××¡×¨', '××ª× ××××ª ×××××': person.term?.safe_conduct_valid_until || '××¡×¨', '×ª×¢×××ª ×××¤××ª': person.term?.caregiver_certificate_status || '××¡×¨', '× ××©××× ××××¤××': staffIssues(person).map((item) => item.label).join(', ') || '×××', __status: person.overall };
}
function staffRecordHtml(person) {
  const value = (item, formatter = String) => item === null || item === undefined || item === '' ? '×× ××××' : formatter(item);
  const issueGroups = ['exception', 'warning'].map((status) => ({ status, items: staffIssues(person).filter((item) => item.status === status) })).filter((group) => group.items.length);
  const history = staffModel.terms.filter((item) => item.employee_id === person.employee.employee_id && item !== person.term).sort((a, b) => String(b.valid_from).localeCompare(String(a.valid_from)));
  const schedule = person.term?.weekly_schedule && typeof person.term.weekly_schedule === 'object' ? Object.entries(person.term.weekly_schedule).map(([day, value]) => `<li><span>${escapeHtml(day)}</span><b>${value ? '×××××¨' : '×× ×××××¨'}</b></li>`).join('') : '<li>×× ×××× ××× ×©×××¢×</li>';
  return `<p class="eyebrow">×¤×¨××× ×××××</p><h2>${escapeHtml(`${person.employee.first_name || ''} ${person.employee.last_name || ''}`.trim() || '×¢××× ××× ×©×')}</h2><span class="status-badge status-${staffBadgeClass(person.overall)}">${staffStatusLabels[person.overall]}</span><section><h3>×¤×¨××× ×××©×××</h3><dl><div><dt>××¡×¤×¨ ×¢×××</dt><dd>${escapeHtml(value(person.employee.employee_code))}</dd></div><div><dt>×××¤××</dt><dd>${escapeHtml(value(person.employee.phone))}</dd></div><div><dt>××××´×</dt><dd>${escapeHtml(value(person.employee.email))}</dd></div><div><dt>×ª××¨×× ××××</dt><dd>${escapeHtml(value(person.employee.birth_date))}</dd></div><div><dt>×ª××¨×× ×××× ×¢××¨×</dt><dd>${escapeHtml(value(person.employee.hebrew_birth_date))}</dd></div></dl></section><section><h3>××¢×¡×§×</h3><dl><div><dt>×¡××××¡</dt><dd>×¤×¢××</dd></div><div><dt>×ª××××ª ××¢×¡×§×</dt><dd>${escapeHtml(value(person.employment.employment_start_date))}</dd></div><div><dt>×××ª×§ ××××¨</dt><dd>${escapeHtml(value(person.employment.recognized_prior_seniority_months))}</dd></div><div><dt>×ª×¤×§××</dt><dd>${escapeHtml(value(person.role?.display_name))}</dd></div><div><dt>××¢××</dt><dd>${escapeHtml(value(person.daycare?.display_name))}</dd></div></dl></section><section><h3>×ª× ×× ×©××¨ ×¤×¢××××</h3><dl><div><dt>×ª×§××¤×</dt><dd>${escapeHtml(value(person.term?.valid_from))}</dd></div><div><dt>×¡×× ×©××¨</dt><dd>${escapeHtml(value(person.term?.pay_type))}</dd></div><div><dt>×©××¨ ××¡××¡</dt><dd>${person.term?.base_pay == null ? '×× ××××' : money.format(person.term.base_pay)}</dd></div></dl><details><summary>×××¡×××¨×××ª ×ª× ×× ×©××¨</summary>${sourceRowsTemplate(history.map((term) => ({ '×ª××××': term.valid_from || '×× ××××', '×¡×××': term.valid_to || '×¤×¢××', '×¡×× ×©××¨': term.pay_type || '×× ××××', '×©××¨ ××¡××¡': term.base_pay == null ? '×× ××××' : money.format(term.base_pay) })))}</details></section><section><h3>×¨××©××</h3><dl><div><dt>×ª×¢×××ª ×××¤××ª</dt><dd>${escapeHtml(value(person.term?.caregiver_certificate_status))}</dd></div><div><dt>×¢××¨× ×¨××©×× ×</dt><dd>${escapeHtml(value(person.term?.first_aid_valid_until))}</dd></div><div><dt>××ª× ××××ª ×××××</dt><dd>${escapeHtml(value(person.term?.safe_conduct_valid_until))}</dd></div></dl></section><section><h3>××× ×©×××¢×</h3><ul class="staff-schedule">${schedule}</ul></section><section><h3>× ××©××× ××××¤××</h3>${issueGroups.length ? issueGroups.map((group) => `<div class="staff-issue-group status-${group.status}"><strong>${staffStatusLabels[group.status]}</strong>${group.items.map((item) => `<span>${escapeHtml(item.label)}</span>`).join('')}</div>`).join('') : '<p>×× × ××¦×× × ××©××× ××××¤××.</p>'}</section><section><h3>××¢×¨××ª</h3><p>${escapeHtml(person.employee.notes || person.employment.notes || person.term?.notes || '××× ××¢×¨××ª')}</p></section>`;
}
function openStaffRecord(employeeId) { const person = staffModel.people?.find((item) => item.employee.employee_id === employeeId); if (!person) return; $('#staff-record-content').innerHTML = staffRecordHtml(person); $('#staff-record-panel').hidden = false; $('#kpi-backdrop').hidden = false; $('#close-staff-record').focus(); }
function renderStaffData() {
  if (staffStatus === 'error') { $('#general-state').className = 'error-state panel'; $('#general-state').innerHTML = `<strong>×× × ××ª× ×××¢×× × ×ª×× × ×¦×××ª</strong><button class="button button-secondary" data-retry-dashboard>× ×¡× ×©××</button>`; return; }
  if (staffStatus !== 'ready') return;
  const m = staffModel; const isOrganization = activeDashboardUnit.allocation_unit_id === 'organization'; const today = new Date().toISOString().slice(0, 10);
  const people = m.employees.map((employee) => { const employment = m.employments.find((item) => item.employee_id === employee.employee_id && item.employment_status === 'ACTIVE'); const assignment = m.assignments.find((item) => item.employment_id === employment?.employment_id && item.is_primary && (!item.effective_to || item.effective_to >= today)); const term = m.terms.filter((item) => item.employee_id === employee.employee_id && item.valid_from <= today && (!item.valid_to || item.valid_to >= today)).sort((a,b) => b.valid_from.localeCompare(a.valid_from))[0]; const role = m.roles.find((item) => item.role_id === assignment?.role_id); const daycare = m.daycares.find((item) => item.daycare_id === assignment?.daycare_id); if (!employment || (!isOrganization && assignment?.allocation_unit_id !== activeDashboardUnit.allocation_unit_id)) return null; const missing = [['××¡×¤×¨ ×¢×××', employee.employee_code], ['×ª×¢×××ª ××××ª', employee.national_id], ['×××¤××', employee.phone], ['××××´×', employee.email], ['×ª××¨×× ××××', employee.birth_date], ['×ª××¨×× ×××× ×¢××¨×', employee.hebrew_birth_date], ['×ª××××ª ××¢×¡×§×', employment.employment_start_date], ['×××ª×§ ××××¨', employment.recognized_prior_seniority_months], ['×ª×¤×§××', role], ['×ª× ×× ×©××¨ ×¤×¢××××', term], ['×©××¨ ××¡××¡', term?.base_pay], ['×¡×× ×©××¨', term?.pay_type], ['×ª×¢×××ª ×××¤××ª', term?.caregiver_certificate_status], ['×¢××¨× ×¨××©×× ×', term?.first_aid_valid_until], ['××ª× ××××ª ×××××', term?.safe_conduct_valid_until], ['××× ×©×××¢×', term?.weekly_schedule]].filter(([,value]) => value === null || value === undefined || value === ''); if (role?.daycare_relevant && !daycare) missing.push(['××¢××', null]); if (['STUDYING','COMMITMENT_TO_STUDIES','××××××××','××ª××××××ª ××××××××'].includes(term?.caregiver_certificate_status) && !term?.studies_end_date) missing.push(['×ª××¨×× ××¢× ××××××××', null]); const firstAid = staffDateStatus(term?.first_aid_valid_until); const safe = staffDateStatus(term?.safe_conduct_valid_until); const overall = missing.length || firstAid === 'exception' || safe === 'exception' ? 'exception' : firstAid === 'warning' || safe === 'warning' ? 'warning' : 'good'; return { employee, employment, assignment, term, role, daycare, missing: missing.map(([label]) => label), firstAid, safe, overall }; }).filter(Boolean);
  staffModel.people = people; const query = staffFilters.query.trim().toLocaleLowerCase('he-IL'); const filtered = people.filter((person) => (staffFilters.status === 'all' || person.overall === staffFilters.status) && (staffFilters.daycare === 'all' || person.daycare?.daycare_id === staffFilters.daycare) && (!query || [person.employee.first_name, person.employee.last_name, person.daycare?.display_name, person.role?.display_name].filter(Boolean).join(' ').toLocaleLowerCase('he-IL').includes(query))); const definitions = (id, title, list, description) => ({ id, title, primary: list.length, formatter: number.format, utilization: list.some((p) => p.overall === 'exception') ? 101 : list.some((p) => p.overall === 'warning') ? 90 : 0, definition: { title, description, calculation: '×¡×¤××¨×ª ×¢××××× ×¤×¢×××× ××¢×× ×× ×××××¨× ××××¦××ª.', source: '× ×ª×× × ×¢×××××, ××¢×¡×§×, ×©××× ××ª× ×× ×©××¨ ×¤×¢×××× ×Ö¾Supabase' }, details: list.map(staffReadableRow), records: list.map(staffReadableRow) }); const cards = [definitions('staff-active','×¢××××× ×¤×¢××××',filtered,'×¢××××× ×¢× ××¢×¡×§× ×¤×¢×××.'), definitions('staff-attention','×××¨×©×× ×ª×©×××ª ××',filtered.filter((p)=>p.overall!=='good'),'×¢××××× ×¢× ×××¡×¨, ×ª××§×£ ×§×¨×× ×× ×ª××§×£ ×©×¤×.'), definitions('staff-compliant','×¢××××× ×ª×§×× ××',filtered.filter((p)=>p.overall==='good'),'×¢××××× ××× ×××¡×¨ ×× ×ª××§×£ ×§×¨××.'), definitions('staff-first-aid-expired','×¢××¨× ×¨××©×× × ×©×¤××',filtered.filter((p)=>p.firstAid==='exception'),'×¢××××× ×©×ª××§×£ ×¢××¨× ×¨××©×× × ××¡×¨ ×× ×¤×.'), definitions('staff-safe-expired','××ª× ××××ª ××××× ×©×¤××',filtered.filter((p)=>p.safe==='exception'),'×¢××××× ×©×ª××§×£ ××ª× ××××ª ××××× ××¡×¨ ×× ×¤×.'), definitions('staff-missing','× ×ª×× ×× ×××× ××× ××¡×¨××',filtered.filter((p)=>p.missing.length),'×¢××××× ×©××¡×¨ ××× ×©×× ×××× ××××©×¨.')]; staffModel.currentKpis = Object.fromEntries(cards.map((item)=>[item.id,item])); const card = (p) => { const issues = staffIssues(p); const visible = issues.slice(0, 3); return `<article class="staff-employee-card status-${p.overall}"><header><div><strong>${escapeHtml(`${p.employee.first_name || ''} ${p.employee.last_name || ''}`.trim() || '×¢××× ××× ×©×')}</strong><span>${escapeHtml(p.role?.display_name || '××× ×ª×¤×§××')}</span></div><b class="status-badge status-${staffBadgeClass(p.overall)}">${staffStatusLabels[p.overall]}</b></header><p>${escapeHtml(p.daycare?.display_name || '××× ××¢××')}</p><div class="staff-issue-badges">${visible.map((item) => `<span class="status-badge status-${staffBadgeClass(item.status)}">${escapeHtml(item.label)}</span>`).join('')}${issues.length > 3 ? `<span class="status-badge status-neutral">+${issues.length - 3}</span>` : ''}</div><button class="button button-secondary" type="button" data-staff-record="${p.employee.employee_id}">×¤×¨××× ×××××</button></article>`; }; $('#kpis').innerHTML = cards.map((item,index)=>kpiCardTemplate({...item,row:index<4?'primary':'secondary'})).join(''); $('#detail-attention').innerHTML = sourceRowsTemplate(filtered.filter((p)=>p.overall!=='good').map(staffReadableRow)); $('#detail-licensing').innerHTML = sourceRowsTemplate(filtered.map(staffReadableRow)); $('#detail-missing').innerHTML = sourceRowsTemplate(filtered.filter((p)=>p.missing.length).map(staffReadableRow)); $('#detail-workforce').innerHTML = sourceRowsTemplate(m.roles.map((role)=>({ ×ª×¤×§××: role.display_name, ×¢×××××: number.format(filtered.filter((p)=>p.role?.role_id===role.role_id).length) }))); $('#detail-comparison').closest('details').hidden = !isOrganization; $('#detail-comparison').innerHTML = sourceRowsTemplate(m.daycares.map((daycare)=>({ ××¢××:daycare.display_name, ×¤×¢××××:number.format(filtered.filter((p)=>p.daycare?.daycare_id===daycare.daycare_id).length), '×××¨×©×× ×××¤××':number.format(filtered.filter((p)=>p.daycare?.daycare_id===daycare.daycare_id && p.overall==='exception').length) }))); $('#detail-employees').innerHTML = `<div class="staff-employee-grid">${filtered.map(card).join('') || '<div class="empty-state compact">×× × ××¦×× ×¢××××× ××¤× ××¡×× ××.</div>'}</div>`; const select = $('#staff-daycare-filter'); select.innerHTML = `<option value="all">×× ×××¢×× ××ª</option>${m.daycares.filter((daycare) => isOrganization || daycare.allocation_unit_id === activeDashboardUnit.allocation_unit_id).map((daycare) => `<option value="${daycare.daycare_id}">${escapeHtml(daycare.display_name)}</option>`).join('')}`; select.value = staffFilters.daycare; $('#staff-search').value = staffFilters.query; $('#staff-status-filter').value = staffFilters.status; $('#staff-daycare-filter-wrap').hidden = !isOrganization; $('#staff-daycare-summary').hidden = !isOrganization; if (isOrganization) $('#staff-daycare-grid').innerHTML = m.daycares.map((daycare) => { const rows = people.filter((p) => p.daycare?.daycare_id === daycare.daycare_id); const severe = rows.some((p) => p.overall === 'exception') ? 'exception' : rows.some((p) => p.overall === 'warning') ? 'warning' : rows.length ? 'good' : 'neutral'; return `<article class="staff-daycare-card status-${severe}"><h3>${escapeHtml(daycare.display_name)}</h3><div><span>×¤×¢××××<b>${number.format(rows.length)}</b></span><span>×ª×§×× ××<b>${number.format(rows.filter((p) => p.overall === 'good').length)}</b></span><span>××¢×§×<b>${number.format(rows.filter((p) => p.overall === 'warning').length)}</b></span><span>×××¨×©×× ×××¤××<b>${number.format(rows.filter((p) => p.overall === 'exception').length)}</b></span><span>×××¡×¨××<b>${number.format(rows.filter((p) => p.missing.length).length)}</b></span></div></article>`; }).join(''); $('#last-updated').textContent = new Intl.DateTimeFormat('he-IL',{dateStyle:'short',timeStyle:'short'}).format(staffLastUpdated); $('#general-state').hidden=true; $('#general-dashboard').hidden=false; bindDashboardDynamicInteractions();
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
    const [config, enrollment, payroll, bank, ba, issues, budgetSnapshots, employments, employees, assignments] = await Promise.all([
      runtimeConfiguration('dashboards.finance'),
      rest('monthly_enrollment', 'select=monthly_enrollment_id,classroom_id,reporting_month,age_group_id,children_count'),
      rest('payroll_records', 'select=payroll_record_id,parent_payroll_record_id,row_kind,employment_id,payroll_month,source_employee_identifier,source_record_identifier,employer_cost,actual_hours,actual_allocation_unit_id,actual_daycare_id,role_id'),
      rest('bank_transactions', 'select=bank_transaction_id,transaction_date,description,amount'),
      rest('bank_allocations', 'select=bank_allocation_id,bank_transaction_id,movement_type,allocation_unit_id,daycare_id,budget_month,allocation_amount,budget_category_id'),
      rest('data_quality_issues', 'select=data_quality_issue_id,severity,status,explanation,entity_type&status=eq.OPEN'),
      rest('budget_snapshots', 'select=budget_snapshot_id,allocation_unit_id,daycare_id,reporting_month,budget_category_id,planned_amount,actual_amount,snapshot_status&snapshot_status=eq.LOCKED'),
      rest('employments', 'select=employment_id,employee_id,employment_start_date,employment_end_date,employment_status'),
      rest('employees', 'select=employee_id,first_name,last_name,lifecycle_status'),
      rest('employee_assignments', 'select=assignment_id,employment_id,allocation_unit_id,daycare_id,classroom_id,role_id,effective_from,effective_to,is_primary')
    ]);
    const { years = [], months = [], daycares = [], dsy = [], classrooms = [], units = [], budgetCategories = [], budgetRules = [], workCalendars = [], staffingParameters = [], ageGroups = [], roles = [] } = config;
    generalModel = { years, months, daycares, dsy, classrooms, enrollment, payroll, bank, ba, units: activeUnits(units), issues, budgetSnapshots, budgetCategories, budgetRules, workCalendars, staffingParameters, ageGroups, roles, employments, employees, assignments };
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
  $('#month-chips').innerHTML = available.map((item) => { const key = month(item.start_date); const selected = selectedReportingMonths.has(key); return `<button class="filter-chip${selected ? ' selected' : ''}" type="button" data-month="${key}" aria-pressed="${selected}">${escapeHtml(item.month_label)}</button>`; }).join('') || '<span class="empty-inline">××× ××××©×× ×××× ××</span>';
}

const kpiDefinitions = {
  revenue: { title: '××× ×¡××ª', description: '×××¡×¤×× ×©××ª×§××× ××ª×§××¤× ×©× ×××¨× ××¢×××ª ××¢× ×××× ×¡××ª.', calculation: '××××¨×× ××ª ×× ×××× ×¡××ª ××¤××¢× ××ª×§××¤× ×××©×××× ×××ª× ××ª×§×¦×× ×©××¨ ×××××× ×©× ×××ª× ×ª×§××¤×.', source: '××§×¦×××ª ×ª× ××¢××ª ×× ×§, ×¨××©×× ××××× ××ª×¢×¨××¤× ×©××¨ ×××××' },
  expenses: { title: '×××¦×××ª', description: '×××¦×××ª ××ª×¤×¢×× ×©××× × ×©××¨ ××ª×§××¤× ×©× ×××¨× ××¢×××ª ××ª×§×¦××.', calculation: '××××¨×× ××ª ×××¦×××ª ××ª×¤×¢×× ××¤××¢× ×××©×××× ×××ª× ××ª×§×¦×× ×××××©×¨ ××× ×§××××¨×××ª ×××¦××.', source: '××§×¦×××ª ×ª× ××¢××ª ×× ×§, ×§××××¨×××ª ××××× ×ª×§×¦××' },
  hours: { title: '×©×¢××ª × ××¨×©××ª', description: '×©×¢××ª ××¢×××× ×©×××¦×¢× ××¢×××ª ×©×¢××ª ××¦×××ª ×× ××¨×©××ª ×××¤×¢××ª ×××¢×× ××ª.', calculation: '×©×¢××ª ××××¦××¢ × ××§×××ª ×××©××¨. ××©×¢××ª ×× ××¨×©××ª ××××©×××ª ××¤× ××¡×¤×¨ ××××××, ××ª×§×× × ××©×¢××ª ××¤×¢××××ª ××× ××××©.', source: '×¨××©×× ×××××, ×ª×§×× ×ª ×¦×××ª, ××× ×¢×××× ×××§×¦×××ª ×©××¨' },
  payroll: { title: '×©××¨', description: '×¢×××ª ××©××¨ ××¤××¢× ××ª×§××¤× ××¢×××ª ×ª×§×¦×× ××©××¨ ×× ××¨×©.', calculation: '××××¨×× ××ª ×¢×××ª ××©××¨ ××¤××¢× ×××©×××× ××ª×§×¦×× ××××¤×××ª ×××ª×§×¦×× ××¢×× ××ª×¤×§×××× ××§×××¢××.', source: '××§×¦×××ª ×©××¨, ×©×¢××ª ×¦×××ª × ××¨×©××ª ××××× ×¦×××ª ×§×××¢' },
  balance: { title: '×××× ××××©×', description: '×××ª×¨× ××ª×¤×¢××××ª ×××××© ×× ×ª×× ×× ××××¨×× ×©× ×××¨, ××××¨ ×××¦×××ª ××©××¨.', calculation: '××× ×¡××ª ××¤××¢× ×××××© ×¤×××ª ×××¦×××ª ××¤××¢× ×××××© ×¤×××ª ×©××¨ ××¤××¢× ×××××©.', source: '××× ×¡××ª, ×××¦×××ª ×××§×¦×××ª ×©××¨ ×××××© ×× ×ª×× ×× ××××¨×× ×©× ×××¨' },
  children: { title: '×××××', description: '××¡×¤×¨ ×××××× ×××××© ×× ×ª×× ×× ××××¨×× ××××× ××××.', calculation: '××××¨×× ××ª ×××××× ××× ××××ª××ª ×××××© ××××¨××. ××××©×× ×§××××× ××× × × ×¦××¨××.', source: '×¨××©×× ×××××× ×××××©× ××¤× ××¢××, ×××ª× ××§×××¦×ª ×××' },
  attention: { title: '×××¨×© ×ª×©×××ª ××', description: '× ××©××× ×ª×¤×¢××××× ×× ×¤×¢×¨× × ×ª×× ×× ×©×¢×©×××× ×××©×¤××¢ ×¢× ×ª××× ×ª ×××¦× ×××¡×¤××ª.', calculation: '×¡××¤×¨×× ××ª ×× ×× ××©××× ××¤×ª×××× ×××ª ××¢×××ª ××××©×× ××¨×××× ××××ª ×××¡× × ×× ×©× ×××¨×.', source: '× ××©×× ×××××ª × ×ª×× ×× ×××§×¨××ª ××××©×× ×©× ×××©×××¨×' }
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
  return `<article class="financial-kpi ${utilizationClass(card.utilization)} kpi-${card.row || 'primary'}" data-kpi-card="${card.id}"><button class="kpi-open" type="button" data-kpi="${card.id}"><span>${card.title}</span><strong>${metric(card.primary, card.formatter)}</strong>${(card.lines || []).map((line) => `<small><span>${line.label}</span><b>${metric(line.value, line.formatter)}</b></small>`).join('')}</button><button class="kpi-info-button" type="button" data-kpi="${card.id}" aria-label="××××¢ ×¢× ${card.title}">××××¢</button></article>`;
}

function buildBudgetCategoryRows({ calculatedBudget, bankAllocations, payrollAllocations, relevantDaycares, categoryMap, unitById }) {
  const categoryByCode = new Map(generalModel.budgetCategories.map((item) => [item.budget_category_code, item]));
  const daycareByUnit = new Map(relevantDaycares.map((item) => [item.allocation_unit_id, item]));
  const aggregates = new Map();
  const actualsByCell = categoryActuals({ bankRows: bankAllocations, payrollRows: payrollAllocations });
  const ensure = (category, daycare) => {
    if (!category || !daycare) return null;
    const key = `${category.budget_category_id}|${daycare.daycare_id}`;
    if (!aggregates.has(key)) aggregates.set(key, { key, category, daycare, actual: actualsByCell.get(key) || 0, budget: 0, hasActual: actualsByCell.has(key), hasBudget: false, sources: [], details: [] });
    return aggregates.get(key);
  };
  bankAllocations.filter((row) => row.kind !== 'none').forEach((row) => { const item = ensure(row.category, daycareByUnit.get(row.allocation_unit_id)); if (!item) return; item.sources.push({ ××××©: row.budget_month, ××¢××: item.daycare.display_name, ×§××××¨××: item.category.display_name, ×¡×××: money.format(row.effect) }); });
  payrollAllocations.forEach((row) => { const item = ensure(categoryMap.get(row.budget_category_id), daycareByUnit.get(row.allocation_unit_id)); if (!item) return; item.sources.push({ ××××©: row.payroll_month, ××¢××: item.daycare.display_name, ×§××××¨××: item.category.display_name, ×¡×××: money.format(row.actual_amount) }); });
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
    item.details.push({ ××××©: row.month, ××¢××: daycare.display_name, ×§××××¨××: category.display_name, ×ª×§×¦××: money.format(value) });
  });
  generalModel.budgetCells = {};
  const values = [...aggregates.values()].sort((a, b) => a.category.display_name.localeCompare(b.category.display_name, 'he') || a.daycare.display_name.localeCompare(b.daycare.display_name, 'he'));
  const rows = values.map((item) => {
    const actual = item.hasActual ? item.actual : null;
    const budget = item.hasBudget ? item.budget : null;
    const used = utilization(actual, budget);
    generalModel.budgetCells[item.key] = { title: `${item.category.display_name} Â· ${item.daycare.display_name}`, definition: { title: `${item.category.display_name} Â· ${item.daycare.display_name}`, description: `××¦× ×§××××¨×××ª ${item.category.display_name} ×××¢×× ${item.daycare.display_name}.`, calculation: '××××¦××¢ ××¤××¢× ×××©××× ××ª×§×¦×× ×××××©×¨ ×©× ××§××××¨×× ××ª×§××¤× ×©× ×××¨×.', source: '×©××¨××ª ××ª×§×¦×× ×××××¦××¢ ××¤××¢× ×©× ××§××××¨×× ××××¢××' }, details: [{ ××¢××: item.daycare.display_name, ×§××××¨××: item.category.display_name, ××¤××¢×: metric(actual, money.format), ×ª×§×¦××: metric(budget, money.format), ××ª×¨×: actual == null || budget == null ? 'No Data' : money.format(budget - actual), × ××¦××: used == null ? 'No Data' : `${number.format(used)}%` }], records: [...item.sources, ...item.details] };
    return { ××¢××: item.daycare.display_name, ×§××××¨××: item.category.display_name, ××¤××¢×: metric(actual, money.format), ×ª×§×¦××: metric(budget, money.format), ××ª×¨×: actual == null || budget == null ? 'No Data' : money.format(budget - actual), × ××¦××: used == null ? 'No Data' : `${number.format(used)}%`, __status: used == null ? '' : used <= 85 ? 'good' : used <= 100 ? 'warning' : 'exception', __key: item.key };
  });
  const actualTotal = values.some((item) => item.hasActual) ? sum(values, (item) => item.hasActual ? item.actual : 0) : null;
  const budgetTotal = values.some((item) => item.hasBudget) ? sum(values, (item) => item.hasBudget ? item.budget : 0) : null;
  const totalUsed = utilization(actualTotal, budgetTotal);
  rows.push({ ××¢××: '×¡× ××××', ×§××××¨××: '×¡××××', ××¤××¢×: metric(actualTotal, money.format), ×ª×§×¦××: metric(budgetTotal, money.format), ××ª×¨×: actualTotal == null || budgetTotal == null ? 'No Data' : money.format(budgetTotal - actualTotal), × ××¦××: totalUsed == null ? 'No Data' : `${number.format(totalUsed)}%`, __status: totalUsed == null ? '' : totalUsed <= 85 ? 'good' : totalUsed <= 100 ? 'warning' : 'exception' });
  return rows;
}

function budgetMatrixTemplate(rows, daycares) {
  const cells = rows.filter((row) => row.__key);
  if (!cells.length) return '<div class="empty-state compact">No Data</div>';
  const categories = [...new Set(cells.map((row) => row.×§××××¨××))];
  return `<div class="table-wrap budget-matrix"><table class="data-table"><thead><tr><th>×§××××¨××</th>${daycares.map((daycare) => `<th>${escapeHtml(daycare.display_name)}</th>`).join('')}</tr></thead><tbody>${categories.map((category) => `<tr><th>${escapeHtml(category)}</th>${daycares.map((daycare) => { const cell = cells.find((row) => row.×§××××¨×× === category && row.××¢×× === daycare.display_name); return `<td>${cell ? `<button type="button" class="budget-cell status-${cell.__status}" data-budget-cell="${escapeHtml(cell.__key)}"><span>${cell.××¤××¢×}</span><small>×ª×§×¦×× ${cell.×ª×§×¦××}</small><small>× ××¦×× ${cell.× ××¦××}</small></button>` : 'No Data'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function renderDetailSections(view) {
  const calculatedRows = view.calculatedBudget.rows;
  $('#detail-budget').innerHTML = view.organizationMatrix || sourceRowsTemplate(view.budgetCategoryRows);
  $('#detail-payroll').innerHTML = sourceRowsTemplate(view.payrollDetails);
  $('#detail-hours').innerHTML = sourceRowsTemplate(calculatedRows.filter((row) => row.type === 'classroom').map((row) => ({ ××××©: row.month, ××¢××: row.daycare, ×××ª×: row.classroom, '×§×××¦×ª ×××': row.ageGroup, '×©×¢××ª × ××¨×©××ª': number.format(row.requiredHours || 0) })));
  $('#detail-children').innerHTML = sourceRowsTemplate(view.childrenDetails);
  $('#detail-bank').innerHTML = sourceRowsTemplate(view.bankAllocations.map((row) => ({ ××××©: row.budget_month, ×××××: view.unitById.get(row.allocation_unit_id)?.display_name || '×× ×©×××', ×§××××¨××: view.categoryMap.get(row.budget_category_id)?.display_name || '×× ×©×××', ×¡×××: money.format(row.allocation_amount), ×ª××××¨: view.bankById.get(row.bank_transaction_id)?.description || '' })));
  $('#detail-quality').innerHTML = sourceRowsTemplate([...generalModel.issues.map((row) => ({ ××××¨×: row.severity, ×ª×××: row.entity_type || '', ××¡××¨: row.explanation })), ...view.calculationIssues.map((row) => ({ ××××¨×: '×©××××ª ×××©××', ×ª×××: row.code, ××¡××¨: row.message, ××¢××: row.daycare || '', ××××©: row.month || '' }))]);
}

function renderGeneralData() {
  if (generalStatus === 'error') { $('#general-state').className = 'error-state panel'; $('#general-state').innerHTML = '<strong>×× × ××ª× ×××¢×× ××ª × ×ª×× × ×××©×××¨×</strong><span>×× ×ª×× ×× ××××¨×× ×× × ×©××¨× ××× ×©××× ×××× ××.</span><button class="button button-secondary" type="button" data-retry-dashboard>× ×¡× ×©××</button>'; return; }
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
  const roleById = new Map(generalModel.roles.map((item) => [item.role_id, item]));
  const bankById = new Map(generalModel.bank.map((item) => [item.bank_transaction_id, item]));
  const categoryMap = new Map(generalModel.budgetCategories.map((item) => [item.budget_category_id, item]));
  const bankAllocations = buildBankActuals(generalModel.ba.filter((item) => selectedMonthSet.has(month(item.budget_month)) && selectedUnitIds.has(item.allocation_unit_id)), categoryMap, generalModel.daycares);
  const payrollActuals = buildPayrollActuals({ records: generalModel.payroll, daycares: generalModel.daycares, roles: generalModel.roles, categories: generalModel.budgetCategories, selectedMonths: selectedMonthSet, selectedUnitIds });
  const payrollAllocations = payrollActuals.rows;
  const actualSummary = summarizeActuals({ bankRows: bankAllocations, payrollRows: payrollAllocations });
  const { incomeRows, expenseRows, income, expenses, payroll: payrollCost, actualHours } = actualSummary;
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
  const balancePayrollAllocations = payrollAllocations.filter((item) => month(item.payroll_month) === balanceMonth);
  const balanceSummary = summarizeActuals({ bankRows: balanceBankAllocations, payrollRows: balancePayrollAllocations });
  const balanceIncome = balanceSummary.income;
  const balanceExpenses = balanceSummary.expenses;
  const balancePayroll = balanceSummary.payroll;
  const actualResult = balanceIncome == null || balanceExpenses == null || balancePayroll == null ? null : balanceIncome - balanceExpenses - balancePayroll;
  const calculationIssues = [...calculatedBudget.issues, ...payrollActuals.issues.map((issue) => ({ ...issue, message: issue.code === 'PAYROLL_SPLIT_MISMATCH' ? '×¤××¦×× ××©××¨ ××× × ×ª××× ××¢×××ª ×××¢×¡××§ ×©× ×©××¨×ª ×××.' : '××©××¨×ª ×©××¨ ××× ×©××× ×§× ×× × ××¡×¤××§ ×××××× ××××¢××.' }))];
  const cards = [
    { id: 'revenue', title: '××× ×¡××ª', primary: income, formatter: money.format, utilization: utilization(income, revenueBudget), lines: [{ label: '××¤××¢×', value: income, formatter: money.format }, { label: '×ª×§×¦××', value: revenueBudget, formatter: money.format }, { label: '× ××¦××', value: utilization(income, revenueBudget), formatter: (value) => `${number.format(value)}%` }] },
    { id: 'expenses', title: '×××¦×××ª', primary: expenses, formatter: money.format, utilization: utilization(expenses, expenseBudget), lines: [{ label: '××¤××¢×', value: expenses, formatter: money.format }, { label: '×ª×§×¦××', value: expenseBudget, formatter: money.format }, { label: '× ××¦××', value: utilization(expenses, expenseBudget), formatter: (value) => `${number.format(value)}%` }] },
    { id: 'hours', title: '×©×¢××ª × ××¨×©××ª', primary: requiredHours, formatter: number.format, utilization: utilization(actualHours, requiredHours), lines: [{ label: '××¤××¢×', value: actualHours, formatter: number.format }, { label: '×ª×§×¦××', value: requiredHours, formatter: number.format }, { label: '× ××¦××', value: utilization(actualHours, requiredHours), formatter: (value) => `${number.format(value)}%` }] },
    { id: 'payroll', title: '×©××¨', primary: payrollCost, formatter: money.format, utilization: utilization(payrollCost, payrollBudget), lines: [{ label: '××¤××¢×', value: payrollCost, formatter: money.format }, { label: '×ª×§×¦××', value: payrollBudget, formatter: money.format }, { label: '× ××¦××', value: utilization(payrollCost, payrollBudget), formatter: (value) => `${number.format(value)}%` }] },
    { id: 'balance', title: '×××× ××××©×', row: 'secondary', primary: actualResult, formatter: money.format, utilization: actualResult == null ? null : actualResult >= 0 ? 0 : 101, lines: [{ label: '××× ×¡××ª ×¤×××ª ×××¦×××ª ××©××¨', value: actualResult, formatter: money.format }] },
    { id: 'children', title: '×××××', row: 'secondary', primary: children, formatter: number.format, utilization: null, lines: [{ label: '××××© ×××¨××', value: latestEnrollmentMonth ? generalModel.months.find((item) => month(item.start_date) === latestEnrollmentMonth)?.month_label || latestEnrollmentMonth : null }] },
    { id: 'attention', title: '×××¨×© ×ª×©×××ª ××', row: 'secondary', primary: generalModel.issues.length + calculationIssues.length, formatter: number.format, utilization: generalModel.issues.length + calculationIssues.length ? 101 : 0, lines: [{ label: '× ××©××× ×¤×ª××××', value: generalModel.issues.length + calculationIssues.length, formatter: number.format }] }
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
    const record = generalModel.payroll.find((item) => item.payroll_record_id === allocation.parent_payroll_record_id) || allocation;
    const employment = employmentById.get(record?.employment_id);
    const employee = employeeById.get(employment?.employee_id);
    const assignment = generalModel.assignments.find((item) => item.employment_id === record?.employment_id && (!item.effective_from || item.effective_from <= record.payroll_month) && (!item.effective_to || item.effective_to >= record.payroll_month) && (item.role_id === allocation.role_id || item.is_primary));
    return { ××××©: record?.payroll_month || '', ×¢×××: employee ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : record?.source_employee_identifier || '×× ××××', ×ª×¤×§××: roleById.get(allocation.role_id)?.display_name || '×× ××××', ×××ª×: classroomById.get(assignment?.classroom_id)?.display_name || '××× ×©××× ×××ª×', ×©×¢××ª: number.format(allocation.actual_hours || 0), '×¢×××ª ×©××¨': money.format(allocation.actual_amount) };
  });
  const childrenDetails = latestEnrollment.map((row) => { const classroom = classroomById.get(row.classroom_id); const daycare = daycareById.get(dsyById.get(classroom?.daycare_school_year_id)?.daycare_id); return { ××××©: row.reporting_month, ××¢××: daycare?.display_name || '×× ××××', ×××ª×: classroom?.display_name || '×× ××××', '×§×××¦×ª ×××': ageById.get(row.age_group_id)?.display_name || '×× ××××', ×××××: number.format(row.children_count) }; });
  const sourceIncome = incomeRows.map((row) => ({ ××××©: row.budget_month, ×××××: unitById.get(row.allocation_unit_id)?.display_name || '×× ×©×××', ×§××××¨××: row.category?.display_name || '×× ×©×××', ×¡×××: money.format(row.effect), ×ª××××¨: bankById.get(row.bank_transaction_id)?.description || '' }));
  const sourceExpenses = expenseRows.map((row) => ({ ××××©: row.budget_month, ×××××: unitById.get(row.allocation_unit_id)?.display_name || '×× ×©×××', ×§××××¨××: row.category?.display_name || '×× ×©×××', ×¡×××: money.format(row.effect), ×ª××××¨: bankById.get(row.bank_transaction_id)?.description || '' }));
  const hoursDetails = budgetRecords.filter((row) => row.type === 'classroom').map((row) => ({ ××××©: row.month, ××¢××: row.daycare, ×××ª×: row.classroom, '×§×××¦×ª ×××': row.ageGroup, ×××××: number.format(row.children), '×©×¢××ª × ××¨×©××ª': number.format(row.requiredHours || 0) }));
  const revenueBudgetSources = budgetRecords.filter((row) => row.type === 'classroom').map((row) => ({ ××××©: row.month, ××¢××: row.daycare, ×××ª×: row.classroom, '×§×××¦×ª ×××': row.ageGroup, ×××××: number.format(row.children), '×ª×§×¦×× ××× ×¡×': money.format(row.tuitionBudget) }));
  const expenseBudgetSources = budgetRecords.filter((row) => row.type === 'expense').map((row) => ({ ××××©: row.month, ××¢××: row.daycare, ×§××××¨××: row.category, ×ª×§×¦××: money.format(row.budget), ×©×××: row.method || '' }));
  const payrollBudgetSources = budgetRecords.filter((row) => ['daycare-month', 'fixed'].includes(row.type)).map((row) => ({ ××××©: row.month, ××¢××: row.daycare, ×¨×××: row.role || '×¦×××ª ×××¤×××ª', ×ª×§×¦××: money.format(row.budget ?? row.caregiverBudget ?? 0) }));
  const attentionDetails = [...generalModel.issues.map((row) => ({ ××××¨×: row.severity, ×ª×××: row.entity_type || '', ××¡××¨: row.explanation })), ...calculationIssues.map((row) => ({ ××××¨×: '×©××××ª ×××©××', ×ª×××: row.code, ××¡××¨: row.message }))];
  generalModel.currentKpis = {
    revenue: { ...cards[0], details: sourceIncome, records: [...sourceIncome, ...revenueBudgetSources] }, expenses: { ...cards[1], details: sourceExpenses, records: [...sourceExpenses, ...expenseBudgetSources] }, hours: { ...cards[2], details: hoursDetails, records: [...hoursDetails, ...payrollDetails.map((row) => ({ ××××©: row.××××©, ×¢×××: row.×¢×××, ×××ª×: row.×××ª×, ×©×¢××ª: row.×©×¢××ª }))] }, payroll: { ...cards[3], details: payrollDetails, records: [...payrollDetails, ...payrollBudgetSources] },
    balance: { ...cards[4], details: [{ ××××©: balanceMonth || 'No Data', ××× ×¡××ª: metric(balanceIncome, money.format), ×××¦×××ª: metric(balanceExpenses, money.format), ×©××¨: metric(balancePayroll, money.format), ××××: metric(actualResult, money.format) }], records: [...sourceIncome.filter((row) => month(row.××××©) === balanceMonth), ...sourceExpenses.filter((row) => month(row.××××©) === balanceMonth), ...payrollDetails.filter((row) => month(row.××××©) === balanceMonth)] },
    children: { ...cards[5], details: childrenDetails, records: childrenDetails }, attention: { ...cards[6], details: attentionDetails, records: attentionDetails }
  };
  $('#kpis').innerHTML = cards.map(kpiCardTemplate).join('');
  const selectedYear = generalModel.years.find((item) => item.school_year_id === selectedSchoolYearId);
  const yearMonths = generalModel.months.filter((item) => item.school_year_id === selectedSchoolYearId);
  const selectedLabels = yearMonths.filter((item) => selectedMonthSet.has(month(item.start_date))).map((item) => item.month_label);
  const yearMonthKeys = new Set(yearMonths.map((item) => month(item.start_date)));
  const allPayrollActuals = buildPayrollActuals({ records: generalModel.payroll, daycares: generalModel.daycares, roles: generalModel.roles, categories: generalModel.budgetCategories, selectedUnitIds }).rows;
  const dataMonthKeys = new Set([
    ...generalModel.enrollment.filter((item) => classroomIds.has(item.classroom_id)).map((item) => month(item.reporting_month)),
    ...generalModel.ba.filter((item) => selectedUnitIds.has(item.allocation_unit_id)).map((item) => month(item.budget_month)),
    ...allPayrollActuals.map((item) => month(item.payroll_month))
  ].filter((item) => yearMonthKeys.has(item)));
  const summaryMonth = yearMonths.filter((item) => dataMonthKeys.has(month(item.start_date))).at(-1);
  const summaryMonths = new Set(yearMonths.filter((item) => summaryMonth && item.school_year_sequence <= summaryMonth.school_year_sequence).map((item) => month(item.start_date)));
  const summaryBudget = summarizeBudget(calculateBudgetModel({ ...generalModel, budgetCategories: generalModel.budgetCategories }, { schoolYearId: selectedSchoolYearId, months: summaryMonths, unitIds: [...selectedUnitIds] }));
  const summaryBank = buildBankActuals(generalModel.ba.filter((item) => summaryMonths.has(month(item.budget_month)) && selectedUnitIds.has(item.allocation_unit_id)), categoryMap, generalModel.daycares);
  const summaryPayrollRows = buildPayrollActuals({ records: generalModel.payroll, daycares: generalModel.daycares, roles: generalModel.roles, categories: generalModel.budgetCategories, selectedMonths: summaryMonths, selectedUnitIds }).rows;
  const summaryActuals = summarizeActuals({ bankRows: summaryBank, payrollRows: summaryPayrollRows });
  $('#context-year').textContent = selectedYear?.display_name || '××× × ×ª×× ×× ×××× ××';
  $('#context-period').textContent = selectedLabels.length ? selectedLabels.join(', ') : '××× × ×ª×× ×× ×××× ××';
  $('#summary-range').textContent = selectedYear && summaryMonth ? `${yearMonths[0]?.month_label || ''} â ${summaryMonth.month_label}` : 'No Data';
  $('#summary-month').textContent = summaryMonth?.month_label || 'No Data';
  const summaryMetrics = summaryMonth ? [
    ['××× ×¡××ª', summaryActuals.income == null ? null : money.format(summaryActuals.income)],
    ['×××¦×××ª', summaryActuals.expenses == null ? null : money.format(summaryActuals.expenses)],
    ['×©××¨', summaryActuals.payroll == null ? null : money.format(summaryActuals.payroll)],
    ['×©×¢××ª × ××¨×©××ª', summaryBudget.requiredHours == null ? null : number.format(summaryBudget.requiredHours)]
  ] : [];
  $('#school-year-metrics').innerHTML = summaryMetrics.length ? summaryMetrics.map(([label, value]) => `<span><small>${label}</small><strong>${value ?? 'No Data'}</strong></span>`).join('') : '<strong>No Data</strong>';
  $('#last-updated').textContent = generalLastUpdated ? new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(generalLastUpdated) : '××¨× ×¢××××';
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
  const parts = ['<a href="#home">×¢××× ××××ª</a>'];
  if (route.section === 'home') return '<span aria-current="page">×¢××× ××××ª</span>';
  if (route.section === 'calculators' && route.calculator) return `${parts.join('')}<span aria-hidden="true">/</span><a href="#calculators">×××©××× ××</a><span aria-hidden="true">/</span><span aria-current="page">${route.calculator === 'salary' ? '×××©××× ×©××¨' : '×ª×¤××¡×, ×ª×§×× × ××¨××××××ª'}</span>`;
  if (route.section === 'payroll') {
    parts.push('<span aria-hidden="true">/</span>', route.page ? '<a href="#payroll">×©××¨</a>' : '<span aria-current="page">×©××¨</span>');
    if (route.page) parts.push('<span aria-hidden="true">/</span>', `<span aria-current="page">${HEBREW_SCREEN_LABELS[`payroll.${route.page}`]}</span>`);
    return parts.join('');
  }
  if (route.section === 'training') {
    const labels = { permissions: '××¨×©×××ª', rules: '×××××', tables: '××××××ª', audit: '×××× ×©×× ××××', users: '×¨×©×××ª ××©×ª××©×× ×××¨×©×××ª', system: '×××× ××¢×¨××ª', calculation: route.page === 'rules' ? '×××× ×××©××' : '××××××ª ×××©××', variables: '××©×ª× ××' };
    parts.push('<span aria-hidden="true">/</span>', route.page ? '<a href="#training">××¨×©×××ª ×××××××ª</a>' : '<span aria-current="page">××¨×©×××ª ×××××××ª</span>');
    if (route.page) parts.push('<span aria-hidden="true">/</span>', route.child ? `<a href="#training/${route.page}">${labels[route.page]}</a>` : `<span aria-current="page">${labels[route.page]}</span>`);
    if (route.child) parts.push('<span aria-hidden="true">/</span>', `<span aria-current="page">${labels[route.child]}</span>`);
    return parts.join('');
  }
  if (route.section !== 'dashboards') return `${parts.join('')}<span aria-hidden="true">/</span><span aria-current="page">${simpleRoutes[route.section].title}</span>`;
  if (route.dashboardType === 'staffing' || route.dashboardType === 'accounting') {
    const label = route.dashboardType === 'staffing' ? '×¦×××ª ××¨××©××' : '×× ××´×';
    const target = unitRoute('organization', route.dashboardType);
    parts.push('<span aria-hidden="true">/</span>', unit?.allocation_unit_id === 'organization' && !route.dashboardChild ? `<span aria-current="page">${label}</span>` : `<a href="${target}">${label}</a>`);
    if (unit && unit.allocation_unit_id !== 'organization') parts.push('<span aria-hidden="true">/</span>', `<span aria-current="page">${escapeHtml(unit.display_name)}</span>`);
    if (route.dashboardChild) parts.push('<span aria-hidden="true">/</span>', `<span aria-current="page">${route.dashboardChild === 'employees' ? '×¢×××××' : route.dashboardChild === 'actual-payroll' ? '×××¦××¢ ×©××¨' : route.dashboardChild === 'bank-transfers' ? '××¢××¨××ª ×× ×§××××ª' : route.dashboardChild}</span>`);
    return parts.join('');
  }
  parts.push('<span aria-hidden="true">/</span>', route.unitId ? '<a href="#dashboards">××©×××¨×××</a>' : '<span aria-current="page">××©×××¨×××</span>');
  if (unit) parts.push('<span aria-hidden="true">/</span>', type ? `<a href="${unitRoute(unit.allocation_unit_id)}">${escapeHtml(unit.display_name)}</a>` : `<span aria-current="page">${escapeHtml(unit.display_name)}</span>`);
  if (type) parts.push('<span aria-hidden="true">/</span>', `<span aria-current="page">${type.title}</span>`);
  return parts.join('');
}

async function render() {
  const pageContent = $('#page-content');
  pageContent.__workbenchReadOnlyObserver?.disconnect();
  delete pageContent.__workbenchReadOnlyObserver;
  const route = parseRoute();
  if (!portalAccess) return;
  const requestedScreen = routeScreenCode(route);
  if (!canView(requestedScreen)) {
    $('#page-content').innerHTML = accessDeniedTemplate();
    $('#breadcrumbs').innerHTML = '<a href="#home">×¢××× ××××ª</a><span aria-hidden="true">/</span><span aria-current="page">××× ××¨×©××</span>';
    document.title = '××× ××¨×©×× | ×¤××¨×× ×××´×';
    history.replaceState({}, '', `${location.pathname}#access-denied`);
    return;
  }
  const managementLabels = { permissions: '××¨×©×××ª', rules: '×××××', settings: '××××¨××ª', tables: '××××¨××ª', audit: '×××× ×©×× ××××', users: '×¨×©×××ª ××©×ª××©×× ×××¨×©×××ª', system: '×××× ××¢×¨××ª', calculation: route.page === 'rules' ? '×××× ×××©××' : '××××¨××ª', variables: '××××¨××ª' };
  let title = route.calculator === 'salary' ? '×××©××× ×©××¨' : route.calculator === 'occupancy' ? '×ª×¤××¡×, ×ª×§×× × ××¨××××××ª' : route.section === 'training' && (route.child || route.page) ? managementLabels[route.child || route.page] : route.section === 'payroll' && route.page ? HEBREW_SCREEN_LABELS[`payroll.${route.page}`] : route.section === 'home' ? '×¢××× ××××ª' : route.section === 'dashboards' ? '××©×××¨×××' : simpleRoutes[route.section].title;
  let unit = null;
  let type = null;
  if (route.section === 'home') $('#page-content').innerHTML = homeTemplate();
  else if (route.section === 'calculators' && route.calculator === 'salary') { $('#page-content').innerHTML = salaryCalculatorTemplate(); await loadSalaryRules(); if (parseRoute().calculator === 'salary') { if (salaryModel.status === 'error') { $('#salary-state').className = 'state error panel'; $('#salary-state').textContent = salaryModel.error || '×× × ××ª× ×××¢×× ××ª ×××× ××©××¨ ××¤×¢××××. × ×¡× ×©×× ×××××¨ ×××ª×¨.'; } else { bindSalaryCalculator(); } } }
  else if (route.section === 'calculators' && route.calculator === 'occupancy') { $('#page-content').innerHTML = occupancyManagementCalculatorTemplate(); await loadOccupancyRules(); if (parseRoute().calculator === 'occupancy') { if (occupancyModel.status === 'error') { $('#occupancy-state').className = 'state error panel'; $('#occupancy-state').textContent = occupancyModel.error || '×× × ××ª× ×××¢×× ××ª ×××× ××ª×¤××¡× ××¤×¢××××.'; } else { bindOccupancyManagementCalculator(); } } }
  else if (route.section === 'calculators') $('#page-content').innerHTML = calculatorsTemplate();
  else if (route.section === 'payroll') {
    const payrollRequest = (page, method, body, month) => portalWorkforceRequest(page, method, body, month, route.page || 'module');
    if (!route.page) $('#page-content').innerHTML = payrollLandingTemplate({ open: canView('payroll.open'), working: canView('payroll.working'), closed: canView('payroll.closed'), reports: canView('payroll.reports') });
    else if (route.page === 'open') { $('#page-content').innerHTML = payrollOpenTemplate(); await mountPayrollOpen(payrollRequest, { canEdit: permissionFor('payroll.open') === 'EDIT' }); }
    else if (route.page === 'reports') { $('#page-content').innerHTML = payrollReportsTemplate(); await mountPayrollReports(payrollRequest); }
    else if (!route.monthId) { $('#page-content').innerHTML = payrollMonthsTemplate(route.page); await mountPayrollMonths(payrollRequest, route.page); }
    else {
      const data = await payrollRequest('payroll', 'GET');
      const selected = data.months.find((item) => item.payroll_month_id === route.monthId);
      const expectedStatus = route.page === 'closed' ? 'CLOSED' : 'CURRENT';
      if (!selected || selected.month_status !== expectedStatus) $('#page-content').innerHTML = accessDeniedTemplate();
      else {
        $('#page-content').innerHTML = payrollWorkbenchTemplate();
        await mountPayrollWorkbench(payrollRequest, { selectedMonthId: selected.payroll_month_id, selectedMonth: selected.payroll_month.slice(0, 7), listRoute: `#payroll/${route.page}` });
        if (permissionFor(`payroll.${route.page}`) !== 'EDIT') enforceWorkbenchReadOnly();
        mountWorkbenchPolish({ title, module: '×©××¨', organization: '×× ×××¨×××', month: selected.payroll_month.slice(0, 7), onRefresh: () => render() });
      }
    }
  }
  else if (route.section === 'documents') { $('#page-content').innerHTML = '<div id="policy-documents-root"></div>'; await mountPolicyDocuments($('#policy-documents-root'), rpc, { manage: permissionFor('documents.manage'), publish: permissionFor('documents.publish') }); }
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
    else if (unitState.status === 'loading') $('#page-content').innerHTML = loadingTemplate('×××¢× ××ª ×¤×¨×× ××××××â¦');
    else {
      unit = findUnit(route.unitId);
      type = dashboardTypes.find((item) => item.id === route.dashboardType);
      if (!unit) $('#page-content').innerHTML = `<section class="error-state panel"><strong>×××××× ×××¨××× ××ª ×× × ××¦×× ×× ××× × ×¤×¢×××</strong><a class="button button-secondary" href="#dashboards">×××¨× ××× ×××××××ª</a></section>`;
      else if (!route.dashboardType) { title = unit.display_name; $('#page-content').innerHTML = unitHubTemplate(unit); }
      else if (!type) $('#page-content').innerHTML = `<section class="error-state panel"><strong>×¡×× ×××©×××¨× ×× × ××¦×</strong><a class="button button-secondary" href="${unitRoute(unit.allocation_unit_id)}">×××¨× ×××©×××¨×× ××××××</a></section>`;
      else if (type.id === 'finance') {
        title = type.title;
        dashboardMode = 'finance';
        activeDashboardUnit = unit;
        $('#page-content').innerHTML = generalDashboardShell(unit);
        await loadGeneralDashboard();
        if (parseRoute().unitId === unit.allocation_unit_id && parseRoute().dashboardType === 'finance') renderGeneralData();
      } else if (type.id === 'accounting' && !route.dashboardChild) {
        title = '×× ××´×';
        activeDashboardUnit = unit;
        $('#page-content').innerHTML = accountingHubTemplate(unit);
      } else if (type.id === 'accounting' && route.dashboardChild === 'banks') {
        title = '×§×××¥ ×× ×§××';
        activeDashboardUnit = unit;
        $('#page-content').innerHTML = track015BankWorkbenchTemplate();
        await mountBankWorkbench(portalBankWorkbenchRequest);
        if (permissionFor('dashboards.accounting.banks') !== 'EDIT') enforceWorkbenchReadOnly();
        mountWorkbenchPolish({ title: '×§×××¥ ×× ×§××', module: '×× ×"×', organization: unit.display_name, schoolYear: '×©× × ×§×× ××¨××ª', month: '×× ×××××©××', onRefresh: () => render() });
      } else if (type.id === 'accounting' && route.dashboardChild === 'bank-transfers') {
        title = '××¢××¨××ª ×× ×§××××ª';
        activeDashboardUnit = unit;
        $('#page-content').innerHTML = bankTransferWorkbenchTemplate();
        await mountBankTransferWorkbench(portalBankTransferRequest);
        if (permissionFor('dashboards.accounting.bank-transfers') !== 'EDIT') enforceWorkbenchReadOnly();
        mountWorkbenchPolish({ title: '××¢××¨××ª ×× ×§××××ª', module: '×× ×"×', organization: unit.display_name, onRefresh: () => render() });
      } else if (type.id === 'accounting' && route.dashboardChild === 'summary') {
        title = type.title;
        dashboardMode = 'accounting';
        activeDashboardUnit = unit;
        $('#page-content').innerHTML = accountingDashboardShell(unit);
        await loadAccountingDashboard();
        if (parseRoute().unitId === unit.allocation_unit_id && parseRoute().dashboardType === 'accounting' && parseRoute().dashboardChild === 'summary') renderAccountingData();
      } else if (type.id === 'staffing' && !route.dashboardChild) {
        title = '×¦×××ª ××¨××©××';
        activeDashboardUnit = unit;
        $('#page-content').innerHTML = workforceHubTemplate(canView('dashboards.staffing.employees'), false);
      } else if (type.id === 'staffing' && route.dashboardChild === 'employees') {
        title = '×¢×××××';
        activeDashboardUnit = unit;
        $('#page-content').innerHTML = employeesWorkbenchTemplate(permissionFor('dashboards.staffing.employees.import') === 'EDIT');
        await mountEmployeesWorkbench(portalWorkforceRequest);
        if (permissionFor('dashboards.staffing.employees') !== 'EDIT') enforceWorkbenchReadOnly();
        mountWorkbenchPolish({ title: '×¢×××××', module: '××× ×××', organization: unit.display_name, onRefresh: () => render() });
      } else if (type.id === 'staffing' && route.dashboardChild === 'actual-payroll') {
        location.hash = '#payroll';
        return;
      } else if (['licensing', 'team'].includes(type.id)) {
        title = type.title; dashboardMode = 'staffing'; activeDashboardUnit = unit; $('#page-content').innerHTML = staffDashboardShell(unit); await loadStaffDashboard(); if (parseRoute().unitId === unit.allocation_unit_id && parseRoute().dashboardType === type.id) renderStaffData();
      } else { title = type.title; $('#page-content').innerHTML = dashboardPlaceholderTemplate(unit, type); }
    }
  }
  const catalogTitle = portalSection(requestedScreen)?.display_name;
  if (catalogTitle && !(route.section === 'dashboards' && unit && !route.dashboardType)) title = catalogTitle;
  document.title = `${title} | ×¤××¨×× ×××´×`;
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
    button.textContent = '××¨×¢× × × ×ª×× ××â¦';
    if (dashboardMode === 'accounting') { accountingStatus = 'idle'; await loadAccountingDashboard(); if (parseRoute().dashboardType === 'accounting') renderAccountingData(); }
    else if (['staffing', 'licensing', 'team'].includes(dashboardMode)) { staffStatus = 'idle'; await loadStaffDashboard(); if (parseRoute().dashboardType === dashboardMode) renderStaffData(); }
    else { generalStatus = 'idle'; await loadGeneralDashboard(); if (parseRoute().dashboardType === 'finance') renderGeneralData(); }
    button.disabled = false;
    button.textContent = 'â» ×¨×¢× ×× × ×ª×× ××';
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
  const selectedYear = dashboardMode === 'staffing' ? '××¦× × ××××' : dashboardMode === 'accounting' ? activeModel.years.find((item) => item.calendar_year_id === selectedCalendarYearId)?.display_name : activeModel.years.find((item) => item.school_year_id === selectedSchoolYearId)?.display_name;
  const period = dashboardMode === 'staffing' ? '×¢××××× ×¤×¢××××' : dashboardMode === 'accounting' ? [...selectedReportingMonths].join(', ') : activeModel.months.filter((item) => selectedReportingMonths.has(month(item.start_date))).map((item) => item.month_label).join(', ');
  $('#kpi-panel-title').textContent = definition.title;
  $('#kpi-description').textContent = definition.description;
  $('#kpi-calculation').textContent = definition.calculation;
  $('#kpi-source').textContent = definition.source;
  $('#kpi-filters').textContent = `${activeDashboardUnit.display_name}; ${selectedYear}; ${period || '××× ×ª×§××¤× × ×××¨×ª'}`;
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
    const workbench = await portalBankWorkbenchRequest('GET');
    accountingModel = {
      years: workbench.calendarYears || [],
      transactions: workbench.transactions || [],
      allocations: workbench.allocations || [],
      accounts: workbench.accounts || [],
      units: activeUnits(workbench.units || []),
      daycares: workbench.daycares || [],
      categories: (workbench.categories || []).filter((item) => item.lifecycle_status === 'ACTIVE'),
      accountingStatuses: workbench.accountingStatuses || [],
    };
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
  return { ×ª××¨××: accountingCashDate(transaction), ××©×××: account?.display_name || '×× ×©×××', ×ª××××¨: transaction.description, ××¡×××ª×: transaction.reference_number || 'â', ×¡×××: money.format(transaction.amount), ××§×¦×××ª: number.format(allocations.length) };
}

function renderAccountingData() {
  if (accountingStatus === 'error') { $('#general-state').className = 'error-state panel'; $('#general-state').innerHTML = '<strong>×× × ××ª× ×××¢×× ××ª × ×ª×× × ×× ×××ª ×××©××× ××ª</strong><button class="button button-secondary" type="button" data-retry-dashboard>× ×¡× ×©××</button>'; return; }
  if (accountingStatus !== 'ready') return;
  setupAccountingFilters();
  const model = accountingModel; const selectedUnits = activeDashboardUnit.allocation_unit_id === 'organization' ? selectedDashboardUnitIds : new Set([activeDashboardUnit.allocation_unit_id]);
  const txById = new Map(model.transactions.map((item) => [item.bank_transaction_id, item]));
  const categoryById = new Map(model.categories.map((item) => [item.budget_category_id, item]));
  const accountingStatusById = new Map(model.accountingStatuses.map((item) => [item.accounting_status_id, item]));
  const accountingStatusCode = (row) => {
    const status = accountingStatusById.get(row.accounting_status_id);
    return status?.accounting_status_code || status?.sheet_accounting_status_id || '';
  };
  const accountingStatusLabel = (row) => accountingStatusById.get(row.accounting_status_id)?.display_name || '××× ×¡××××¡';
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
    ['missing-type', '××¡×¨ ×¡×× ×ª× ××¢×', '×¡×× ××ª× ××¢× ××× × ×××××¨ ×××× ×¡×, ×××¦×× ×× ×¤× ×××.', '××××§×× ××× ×§××××ª ××§×¦×× ×¢× ×§××××¨×× ×¢×¡×§××ª ×ª×§×¤×.', 'type'],
    ['missing-month', '××¡×¨ ××××© ×ª×§×¦×××', '×× ×××××¨ ××××© ×ª×§×¦××× ××××¤×× ××ª× ××¢×.', '×¡××¤×¨×× ×ª× ××¢××ª ××× ××§×¦×× ×× ×¢× ××§×¦×× ××× ××××© ×ª×§×¦×××.', 'budgetMonth'],
    ['missing-unit', '××¡×¨× ×××××ª ××§×¦××', '××ª× ××¢× ×¢×××× ××× × ××©××××ª ×××××× ××¨××× ××ª.', '×¡××¤×¨×× ×ª× ××¢××ª ××× ×©××¨×ª ××§×¦×× ×× ××× ×××××ª ××§×¦××.', 'allocationUnit'],
    ['missing-daycare', '××¡×¨ ××¢××', '×××××ª ××§×¦×× ××¡×× ××¢×× ××× × ×××××¨×ª ××¨×©×××ª ××¢×× ×¤×¢×××.', '× ×××§×ª ×¨×§ ××§×¦×× ×××××× ××¡×× ××¢××.', 'daycare'],
    ['invalid-split', '×¤××¦×× ×× ×ª×§××', '×¡××× ×××§×¦×××ª ××× × ×ª××× ××¡××× ×ª× ××¢×ªÖ¾×××.', '××©×××× ××ª ××¢×¨× ×××××× ×©× ×ª× ××¢×ªÖ¾××× ××¡× ×××§×¦×××ª.', 'split']
  ].map(([id, title, description, calculation, key]) => { const rows = analyses.filter((item) => item.missing[key]); return { id, title, primary: rows.length, formatter: number.format, utilization: rows.length ? 101 : 0, definition: { title, description, calculation, source: '×ª× ××¢××ª ×× ×§ ×××§×¦×××ª ×ª× ××¢×' }, details: rows.map((item) => ({ ...accountingTransactionRow(item.transaction, model, item.rows), ×¤×¢×¨: key === 'split' ? money.format(item.difference) : '×××¨×© ××©×××' })), records: rows.flatMap((item) => [accountingTransactionRow(item.transaction, model, item.rows), ...item.rows.map((row) => ({ ××××©: row.budget_month || '×× ×××××¨', ×××××: model.units.find((unit) => unit.allocation_unit_id === row.allocation_unit_id)?.display_name || '×× ×©×××', ×¡××××¡: accountingStatusLabel(row), ×¡×××: money.format(row.allocation_amount) }))]) }; });
  const workflowCards = [...new Set(selectedAllocations.map((item) => item.accounting_status_id).filter(Boolean))].map((statusId) => { const rows = selectedAllocations.filter((item) => item.accounting_status_id === statusId); const status = accountingStatusById.get(statusId); const title = status?.display_name || '××× ×¡××××¡'; const statusCode = status?.accounting_status_code || status?.sheet_accounting_status_id || ''; return { id: `status-${statusId}`, title, primary: rows.length, formatter: number.format, utilization: ['ACC-MISSING-DOCS', 'ACC-WAITING'].includes(statusCode) ? 101 : 0, definition: { title, description: `××§×¦×××ª ×× ××¦×××ª ××¡××××¡ ${title}.`, calculation: '×¡×¤××¨×ª ×©××¨××ª ××§×¦×× ××¡××××¡ ××§××× ×××§××¨.', source: '×¡××××¡ ×× ×××ª ×××©××× ××ª ×©× ×©××¨××ª ×××§×¦××' }, details: rows.map((row) => ({ ××××©: row.budget_month, ×××××: model.units.find((unit) => unit.allocation_unit_id === row.allocation_unit_id)?.display_name || '×× ×©×××', ×¡×××: money.format(row.allocation_amount), ×¡××××¡: title })), records: rows.map((row) => ({ ...accountingTransactionRow(txById.get(row.bank_transaction_id), model, [row]), ××××©: row.budget_month, ×××××: model.units.find((unit) => unit.allocation_unit_id === row.allocation_unit_id)?.display_name || '×× ×©×××', ×¡××××¡: title })) }; });
  const topCards = [
    { id: 'parents', title: '×ª× ××¢××ª ×× ×§', primary: analyses.length, formatter: number.format, utilization: null, definition: { title: '×ª× ××¢××ª ×× ×§', description: '××¡×¤×¨ ×ª× ××¢××ªÖ¾××× ××ª×§××¤×.', calculation: '×× ×ª× ××¢×ª ×× ×§ × ×¡×¤×¨×ª ×¤×¢× ×××ª, ×× ×× ×¤××¦×× ×××¡×¤×¨ ××§×¦×××ª.', source: '×ª× ××¢××ª ×× ×§ ××§××¨' }, details: analyses.map((item) => accountingTransactionRow(item.transaction, model, item.rows)), records: analyses.map((item) => accountingTransactionRow(item.transaction, model, item.rows)) },
    { id: 'allocated', title: '×ª× ××¢××ª ×©×××§×¦×', primary: analyses.filter((item) => item.rows.length).length, formatter: number.format, utilization: analyses.length ? analyses.filter((item) => item.rows.length).length / analyses.length * 100 : null, definition: { title: '×ª× ××¢××ª ×©×××§×¦×', description: '×ª× ××¢××ªÖ¾×× ×©××¤×××ª ××§×¦×× ×××ª ××©××××ª ×××××.', calculation: '×¡××¤×¨×× ×ª× ××¢××ªÖ¾×× ××××××××ª ×¢× ×©××¨×ª ××§×¦×× ×××ª ×× ×××ª×¨.', source: '×ª× ××¢××ª ×× ×§ ×××§×¦×××ª' }, details: analyses.filter((item) => item.rows.length).map((item) => accountingTransactionRow(item.transaction, model, item.rows)), records: analyses.filter((item) => item.rows.length).map((item) => accountingTransactionRow(item.transaction, model, item.rows)) },
    { id: 'complete', title: '×ª× ××¢××ª ×©×××©×××', primary: analyses.filter((item) => item.complete).length, formatter: number.format, utilization: analyses.length ? analyses.filter((item) => item.complete).length / analyses.length * 100 : null, definition: { title: '×ª× ××¢××ª ×©×××©×××', description: '×ª× ××¢××ª ×©×× ×××§×¦×××ª ×©××× ×××¢××¨× ××× ×××ª ×××©××× ××ª ×× ××× × ×××¨×©××ª ××¡×× ×ª×××.', calculation: '×× ×©××¨××ª ×××§×¦×× ××××××ª ×××××ª ××¡××××¡ ×§××× ×©× × ×©×× ××× ×××ª ××©××× ××ª ×× ××× ×¦××¨× ×××¡×× ×ª×××.', source: '×¡××××¡ ×× ×××ª ×××©××× ××ª ×©× ×××§×¦×××ª' }, details: analyses.filter((item) => item.complete).map((item) => accountingTransactionRow(item.transaction, model, item.rows)), records: analyses.filter((item) => item.complete).map((item) => accountingTransactionRow(item.transaction, model, item.rows)) },
    { id: 'attention', title: '×××¨×© ×ª×©×××ª ××', primary: analyses.filter((item) => item.attention).length, formatter: number.format, utilization: analyses.some((item) => item.attention) ? 101 : 0, definition: { title: '×××¨×© ×ª×©×××ª ××', description: '×ª× ××¢××ª ×¢× ××××¢ ××¡×¨, ×¤××¦×× ×× ×ª×§×× ×× ×¡××××¡ ×××¤×× ×¤×ª××.', calculation: '×¡××¤×¨×× ×ª× ××¢××ªÖ¾×× ×¢× ××¤×××ª ××¢×× ×××ª.', source: '×ª× ××¢××ª, ××§×¦×××ª ××¡××××¡ ×× ×××ª ×××©××× ××ª' }, details: analyses.filter((item) => item.attention).map((item) => accountingTransactionRow(item.transaction, model, item.rows)), records: analyses.filter((item) => item.attention).map((item) => accountingTransactionRow(item.transaction, model, item.rows)) }
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
  $('#context-year').textContent = year?.display_name || year?.calendar_year_code || 'No Data'; $('#context-period').textContent = period.join(', ') || 'No Data'; $('#summary-range').textContent = `${year.start_date} â ${ytdEnd.toISOString().slice(0, 10)}`; $('#summary-month').textContent = latest || 'No Data';
  const ytdAllocationRows = ytdAnalyses.flatMap((item) => item.rows);
  const ytdMetrics = [['×ª× ××¢××ªÖ¾××', ytdAnalyses.length], ['×××§×¦× ×××××§××ª', ytdAnalyses.filter((item) => item.rows.length).length], ['×××©×××', ytdAnalyses.filter((item) => item.complete).length], ['×××¨×©××ª ×ª×©×××ª ××', ytdAnalyses.filter((item) => item.attention).length]];
  if (isOrganization) ytdMetrics.push(['×©××¨××ª ××§×¦××', ytdAllocationRows.length], ['×¡××× ×ª× ××¢××ªÖ¾××', money.format(sum(ytdAnalyses, (item) => Math.abs(Number(item.transaction.amount))))], ['×¡××× ××§×¦×××ª', money.format(sum(ytdAllocationRows, (item) => Math.abs(Number(item.allocation_amount))))]);
  $('#school-year-metrics').innerHTML = ytdMetrics.map(([label,value]) => `<span><small>${label}</small><strong>${typeof value === 'number' ? number.format(value) : value}</strong></span>`).join('');
  $('#last-updated').textContent = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(accountingLastUpdated);
  const byUnit = (field, label) => sourceRowsTemplate([...new Map(selectedAllocations.map((row) => { const key = row[field] || 'missing'; const name = field === 'allocation_unit_id' ? model.units.find((item) => item.allocation_unit_id === row[field])?.display_name || '×× ×©×××' : key; return [key, { [label]: name }]; })).values()]);
  $('#detail-daycare').innerHTML = sourceRowsTemplate(model.daycares.filter((daycare) => selectedUnits.has(daycare.allocation_unit_id)).map((daycare) => { const rows = selectedAllocations.filter((item) => item.allocation_unit_id === daycare.allocation_unit_id); return { ××¢××: daycare.display_name, '×ª× ××¢××ªÖ¾××': number.format(new Set(rows.map((item) => item.bank_transaction_id)).size), ××§×¦×××ª: number.format(rows.length) }; }));
  $('#detail-unit').innerHTML = sourceRowsTemplate(model.units.filter((unit) => selectedUnits.has(unit.allocation_unit_id)).map((unit) => { const rows = selectedAllocations.filter((item) => item.allocation_unit_id === unit.allocation_unit_id); return { '×××××ª ××§×¦××': unit.display_name, '×ª× ××¢××ªÖ¾××': number.format(new Set(rows.map((item) => item.bank_transaction_id)).size), ××§×¦×××ª: number.format(rows.length) }; }));
  $('#detail-account').innerHTML = sourceRowsTemplate([...new Map(analyses.map((item) => [item.transaction.bank_account_id, item])).values()].map((item) => { const account = model.accounts.find((row) => row.bank_account_id === item.transaction.bank_account_id); const rows = analyses.filter((entry) => entry.transaction.bank_account_id === item.transaction.bank_account_id); return { ××©×××: account?.display_name || '×× ×©×××', '×ª× ××¢××ªÖ¾××': number.format(rows.length) }; }));
  $('#detail-status').innerHTML = sourceRowsTemplate(workflowCards.map((item) => ({ ×¡××××¡: item.title, ××§×¦×××ª: number.format(item.primary) })));
  $('#detail-attention').innerHTML = sourceRowsTemplate(topCards[3].details);
  $('#detail-split').innerHTML = isOrganization
    ? sourceRowsTemplate(analyses.filter((item) => item.rows.length > 1).map((item) => ({ ...accountingTransactionRow(item.transaction, model, item.rows), '×¡××× ××': money.format(Math.abs(Number(item.transaction.amount))), '×¡× ××§×¦×××ª': money.format(item.allocationTotal), ×¤×¢×¨: money.format(item.difference), ××¦×: Math.abs(item.difference) <= .01 ? '×ª×§××' : '×× ×ª×§××', __status: Math.abs(item.difference) <= .01 ? 'good' : 'exception' })))
    : '<div class="empty-state compact">××ª×¦×××ª ××¢×× ×××¦×××ª ××§×¦×××ª ××××. ××××§×ª ×¡××× ×ª× ××¢×ªÖ¾××× ×××× × ×××× ×××¨×××.</div>';
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
  if (!card?.records?.length) { showToast('××× ×¨×©××××ª ××§××¨ ×××× ××ª ××××¦××.'); return; }
  const rows = card.records.map((row) => Object.fromEntries(Object.entries(row).filter(([, value]) => typeof value !== 'object')));
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = `\ufeff${headers.map(escapeCsv).join(',')}\r\n${rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${card.title || kpiDefinitions[id]?.title || '××××¢'}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportDashboardCsv() {
  const activeModel = dashboardMode === 'accounting' ? accountingModel : dashboardMode === 'staffing' ? staffModel : generalModel;
  const rows = Object.entries(activeModel.currentKpis || {}).flatMap(([id, card]) => card.records.map((row) => ({ ×××: card.title || kpiDefinitions[id]?.title || id, ...Object.fromEntries(Object.entries(row).filter(([, value]) => typeof value !== 'object')) })));
  if (!rows.length) { showToast('××× ×¨×©××××ª ××§××¨ ×××× ××ª ××××¦××.'); return; }
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = `\ufeff${headers.map(escapeCsv).join(',')}\r\n${rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `××©×××¨×-${dashboardMode === 'accounting' ? '×× ×××ª-××©××× ××ª' : '××¡×¤××'}-${new Date().toISOString().slice(0, 10)}.csv`;
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
  if (!email.validity.valid) { message.textContent = '××© ××××× ××ª×××ª ×××× ×ª×§×× ×.'; email.focus(); return; }
  if (!password.value) { message.textContent = '××© ××××× ×¡××¡××.'; password.focus(); return; }
  setAuthPending(true);
  message.textContent = '××ª××¦×¢×ª ×× ××¡×â¦';
  try {
    await signInWithPassword(email.value.trim(), password.value);
    password.value = '';
    if (!await validateSession()) throw new Error('×× × ××ª× ××××ª ××ª ××××××¨. ××© ×× ×¡××ª ×©××.');
    if (resumeOAuthAfterLogin()) return;
    await showPortalHome();
  } catch (error) { message.textContent = error.message; }
  finally { setAuthPending(false); }
});
$('#toggle-password').addEventListener('click', () => {
  const password = $('#password');
  const visible = password.type === 'text';
  password.type = visible ? 'password' : 'text';
  $('#toggle-password').textContent = visible ? '××¦×' : '××¡×ª×¨';
  $('#toggle-password').setAttribute('aria-label', visible ? '××¦××ª ××¡××¡××' : '××¡×ª×¨×ª ××¡××¡××');
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
  if (!email.validity.valid) { message.textContent = '××© ××××× ×ª×××× ××ª×××ª ×××× ×ª×§×× ×.'; email.focus(); return; }
  recoveryRequestPending = true;
  $('#request-recovery').disabled = true;
  message.textContent = '×©××× ×§××©××¨ ×××¤××¡â¦';
  try {
    await requestPasswordRecovery(email.value.trim());
    message.textContent = '×× ×××ª×××ª ×××¨×©××ª ×××¢×¨××ª, ×§××©××¨ ××××¤××¡ ××¡××¡×× × ×©×× ××××.';
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
  if (!isStrongPassword(password.value)) { message.textContent = '××¡××¡×× ×××××ª ××××× ××¤×××ª 10 ×ª××××, ×××ª ×××ª ×××¡×¤×¨ ×××.'; password.focus(); return; }
  if (password.value !== confirmation.value) { message.textContent = '××¡××¡××××ª ××× × ×ª×××××ª.'; confirmation.focus(); return; }
  setRecoveryPending(true);
  message.textContent = '×©×××¨ ××ª ××¡××¡×× ××××©×â¦';
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
  showLogin();
  if (accessToken) {
    try { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` } }); } catch { /* Local recovery session is already cleared. */ }
  }
});
$('#logout').addEventListener('click', async () => {
  const accessToken = session?.access_token;
  stopSessionLifecycle();
  protectedRequests.forEach((controller) => controller.abort());
  protectedRequests.clear();
  saveSession(null);
  unitState = { status: 'idle', items: [], error: '' };
  generalModel = {};
  generalStatus = 'idle';
  $('#password').value = '';
  $('#password').type = 'password';
  $('#toggle-password').textContent = '××¦×';
  $('#toggle-password').setAttribute('aria-label', '××¦××ª ××¡××¡××');
  $('#toggle-password').setAttribute('aria-pressed', 'false');
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
  $('#login-view').style.display = '';
  $('#login-message').textContent = '×××ª× ×ª×§××ª ×××©×××.';
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
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') resumeSessionLifecycle(); });
window.addEventListener('focus', resumeSessionLifecycle);
window.addEventListener('online', resumeSessionLifecycle);
window.addEventListener('pageshow', resumeSessionLifecycle);

async function initializeAuth() {
  $('#auth-restoring-view').hidden = false;
  preserveLegacyCallbackAtRoot();
  const recovery = parseRecoveryCallback();
  if (recovery.isRecovery) {
    if (recovery.error) { showRecoveryView(recovery.error, recovery.mode); return; }
    if (!await validateSession()) { showRecoveryView('×§××©××¨ ××××××ª ××× × ×ª×§×£ ×× ×©×¤× ×ª××§×¤×. ××© ×××§×© ×§××©××¨ ×××©.', recovery.mode); return; }
    showRecoveryView('', recovery.mode);
    return;
  }
  if (!await validateSession()) {
    showLogin();
    return;
  }
  if (resumeOAuthAfterLogin()) return;
  await showPortalHome();
}

initializeAuth();
