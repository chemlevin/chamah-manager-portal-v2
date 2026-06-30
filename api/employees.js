const crypto = require('crypto');

const SHEET_ID = '18jel-vx6yR2LvcqxO6cTCAwKiAV8WUz2dQSDEzNB4G0';
const TAB_NAME = 'עובדים';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/+/g, '-')
    .replace(///g, '_');
}

function getCredentials() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google service account environment variables.');
  }

  return {
    clientEmail,
    privateKey: privateKey.replace(/\n/g, '
'),
  };
}

async function getAccessToken() {
  const { clientEmail, privateKey } = getCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: clientEmail,
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const unsignedToken = base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(claim));
  const signature = crypto.createSign('RSA-SHA256').update(unsignedToken).sign(privateKey);
  const assertion = unsignedToken + '.' + base64url(signature);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error('Google auth failed: ' + details);
  }

  const data = await response.json();
  return data.access_token;
}

function rowsToObjects(values) {
  const [headers = [], ...rows] = values || [];
  return rows
    .filter((row) => row.some((cell) => String(cell || '').trim()))
    .map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        item[String(header || '').trim()] = String(row[index] || '').trim();
      });
      return item;
    });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const token = await getAccessToken();
    const range = encodeURIComponent(TAB_NAME + '!A:AF');
    const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + SHEET_ID + '/values/' + range + '?majorDimension=ROWS';
    const response = await fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error('Google Sheets fetch failed: ' + details);
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ employees: rowsToObjects(data.values) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'לא ניתן לטעון את נתוני הצוות כרגע.' });
  }
};
