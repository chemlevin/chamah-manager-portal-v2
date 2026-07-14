import fs from 'node:fs/promises';
import { google } from 'googleapis';
import { analyzeWorkbook } from './lib/google-sheets-v2-dry-run.mjs';

const spreadsheetId = process.env.GOOGLE_SHEETS_V2_ID || '16Jj7x1oBdlZsR1FITrjJzXHeCN3OfGto-kMIjDQ2LMM';
const outputPrefix = process.argv[2] || 'reports/google-sheets-v2-dry-run';
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL,
  key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
if (!auth.email || !auth.key) throw new Error('Missing Google service-account environment variables.');
const sheets = google.sheets({ version: 'v4', auth });
const ranges = ['הגדרות!A1:O301', 'EMPLOYEES!A1:R1000', 'EMPLOYEE_PAY_TERMS!A1:Y1000',
  'MONTHLY_OCCUPANCY!A1:R1000', 'PAYROLL!A1:O1000', 'BANK_TRANSACTIONS!A1:U1000'];
const response = await sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges, valueRenderOption: 'UNFORMATTED_VALUE' });
const workbook = Object.fromEntries(response.data.valueRanges.map((range) => [range.range.split('!')[0].replaceAll("'", ''), range.values || []]));
const report = analyzeWorkbook(workbook);
const blocking = report.items.filter((item) => item.operation === 'ERROR');
const markdown = `# Google Sheets v2 Dry Run\n\n- Generated: ${report.generatedAt}\n- Mode: read only\n- Ready inserts: ${report.counts.INSERT || 0}\n- Updates: ${report.counts.UPDATE || 0}\n- Blocking errors: ${report.counts.ERROR || 0}\n\n## Blocking errors\n\n${blocking.length ? blocking.map((item) => `- ${item.sourceSheet} row ${item.sourceRow}: ${item.errors.join(', ')}`).join('\n') : 'None.'}\n`;
await fs.mkdir(outputPrefix.split('/').slice(0, -1).join('/') || '.', { recursive: true });
await fs.writeFile(`${outputPrefix}.json`, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(`${outputPrefix}.md`, markdown);
console.log(JSON.stringify(report.counts));

