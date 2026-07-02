const DEFAULT_SHEET_ID = '18jel-vx6yR2LvcqxO6cTCAwKiAV8WUz2dQSDEzNB4G0';
const PAYROLL_TAB_NAME = process.env.GOOGLE_PAYROLL_SHEET_NAME || 'PAYROLL';
const RANGE = PAYROLL_TAB_NAME + '!A:Z';
const ERROR_MESSAGE = 'לא ניתן לטעון את נתוני השכר כרגע.';

const { calculatePayrollModel } = require('./payroll-engine');

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
  return process.env.GOOGLE_PAYROLL_SHEET_ID || process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
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

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const sheets = createSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: RANGE,
      majorDimension: 'ROWS',
    });

    const sheetRows = response.data.values || [];
    const payroll = calculatePayrollModel(sheetRows);

    sendJson(res, 200, { payroll, byDaycareMonth: payroll.byDaycareMonth });
  } catch (error) {
    console.error('Payroll API error:', error);
    sendJson(res, 500, {
      error: ERROR_MESSAGE,
      code: 'PAYROLL_SHEETS_LOAD_FAILED',
    });
  }
};
