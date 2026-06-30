const SHEET_ID = '18jel-vx6yR2LvcqxO6cTCAwKiAV8WUz2dQSDEzNB4G0';
const TAB_NAME = 'עובדים';
const RANGE = TAB_NAME + '!A:AF';
const ERROR_MESSAGE = 'לא ניתן לטעון את נתוני הצוות כרגע.';

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

function createSheetsClient() {
  const { google } = require('googleapis');
  const clientEmail = getClientEmail();
  const privateKey = getPrivateKey();

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google service account environment variables.');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

function rowsToObjects(values = []) {
  if (!Array.isArray(values) || values.length === 0) return [];

  const [headerRow, ...dataRows] = values;
  const headers = (headerRow || []).map((header) => String(header || '').trim());

  return dataRows
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell || '').trim()))
    .map((row) => {
      return headers.reduce((employee, header, index) => {
        if (!header) return employee;
        employee[header] = String(row[index] || '').trim();
        return employee;
      }, {});
    });
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
      spreadsheetId: SHEET_ID,
      range: RANGE,
      majorDimension: 'ROWS',
    });

    const sheetRows = response.data.values || [];
    const employees = rowsToObjects(sheetRows);

    sendJson(res, 200, { employees });
  } catch (error) {
    console.error('Employees API error:', error);
    sendJson(res, 500, {
      error: ERROR_MESSAGE,
      code: 'EMPLOYEES_SHEETS_LOAD_FAILED',
    });
  }
};
