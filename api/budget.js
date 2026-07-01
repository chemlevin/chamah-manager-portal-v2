const DEFAULT_SHEET_ID = '18jel-vx6yR2LvcqxO6cTCAwKiAV8WUz2dQSDEzNB4G0';
const BUDGET_TAB_NAME = process.env.GOOGLE_BUDGET_SHEET_NAME || 'BUDGET';
const RANGE = BUDGET_TAB_NAME + '!A:Z';
const ERROR_MESSAGE = 'לא ניתן לטעון את נתוני התקציב כרגע.';

const { parseBudgetTables, calculateBudgetModel } = require('./budget-engine');

function normalizePrivateKey(value) {
  if (!value) return '';
  return value
    .replace(/^"|"$/g, '')
    .replace(/\\n/g, "\n")
    .trim();
}

function getPrivateKey() {
  const key = process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  return normalizePrivateKey(key);
}

function getClientEmail() {
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || '';
}

function getSpreadsheetId() {
  return process.env.GOOGLE_BUDGET_SHEET_ID || process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
}

function createSheetsClient() {
  const { google } = require('googleapis');
  const clientEmail = getClientEmail();
  const privateKey = getPrivateKey();
  if (!clientEmail || !privateKey) throw new Error('Missing Google service account environment variables.');
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

function sendJson(res, status, body) {
  res.status(status).json(body);
}

function isDebugEnabled(req) {
  return process.env.BUDGET_API_DEBUG === 'true'
    || process.env.DEBUG_BUDGET_API === 'true'
    || (req.query && req.query.debug === '1' && process.env.VERCEL_ENV !== 'production');
}

function googleErrorDetails(error) {
  const response = error && error.response;
  const data = response && response.data;
  const errors = Array.isArray(data && data.error && data.error.errors) ? data.error.errors : [];
  const message = (data && data.error && data.error.message) || error.message || String(error);
  return {
    name: error.name || 'Error',
    message,
    status: (response && response.status) || error.code || null,
    reason: errors[0] && errors[0].reason || null,
    domain: errors[0] && errors[0].domain || null,
  };
}

function classifyBudgetError(error, stage) {
  const details = googleErrorDetails(error);
  const message = String(details.message || '').toLowerCase();
  const status = Number(details.status || 0);

  if (stage === 'createSheetsClient') return 'BUDGET_AUTH_CONFIG_FAILED';
  if (stage === 'parseBudgetTables') return 'BUDGET_PARSE_FAILED';
  if (stage === 'calculateBudgetModel') return 'BUDGET_CALCULATION_FAILED';
  if (status === 401 || status === 403 || message.includes('permission') || message.includes('unauthorized')) return 'BUDGET_AUTH_FAILED';
  if (message.includes('unable to parse range') || message.includes('range') || message.includes('sheet') || message.includes('tab')) return 'BUDGET_TAB_OR_RANGE_NOT_FOUND';
  return 'BUDGET_SHEETS_LOAD_FAILED';
}

function buildDebugPayload(error, context) {
  const details = googleErrorDetails(error);
  return {
    stage: context.stage,
    spreadsheetId: context.spreadsheetId,
    sheetName: context.sheetName,
    range: context.range,
    authentication: {
      hasClientEmail: Boolean(getClientEmail()),
      hasPrivateKey: Boolean(getPrivateKey()),
    },
    googleApi: details,
    likelyCause: classifyBudgetError(error, context.stage),
    loadedRows: context.loadedRows,
    parsedTables: context.parsedTables,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const context = {
    stage: 'init',
    spreadsheetId: getSpreadsheetId(),
    sheetName: BUDGET_TAB_NAME,
    range: RANGE,
    loadedRows: null,
    parsedTables: null,
  };

  try {
    context.stage = 'createSheetsClient';
    const sheets = createSheetsClient();

    context.stage = 'loadSheetValues';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: context.spreadsheetId,
      range: context.range,
      majorDimension: 'ROWS',
    });

    const sheetRows = response.data.values || [];
    context.loadedRows = sheetRows.length;

    context.stage = 'parseBudgetTables';
    const tables = parseBudgetTables(sheetRows);
    context.parsedTables = Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, Array.isArray(rows) ? rows.length : 0]));

    context.stage = 'calculateBudgetModel';
    const budget = calculateBudgetModel(tables);

    sendJson(res, 200, { tables, budget });
  } catch (error) {
    const code = classifyBudgetError(error, context.stage);
    console.error('Budget API error:', {
      code,
      stage: context.stage,
      spreadsheetId: context.spreadsheetId,
      sheetName: context.sheetName,
      range: context.range,
      loadedRows: context.loadedRows,
      parsedTables: context.parsedTables,
      originalError: googleErrorDetails(error),
      stack: error && error.stack,
    });

    const body = { error: ERROR_MESSAGE, code };
    if (isDebugEnabled(req)) body.debug = buildDebugPayload(error, context);
    sendJson(res, 500, body);
  }
};
