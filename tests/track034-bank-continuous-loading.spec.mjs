import { test, expect } from '@playwright/test';
import { portalAccessFixture } from './new-portal-test-data.mjs';

const base = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const account = { bank_account_id: 'account-1', display_name: 'חשבון מרכזי', source_account_number: '00123456', lifecycle_status: 'ACTIVE' };
const transactions = Array.from({ length: 125 }, (_, index) => ({ bank_transaction_id: `tx-${index + 1}`, bank_account_id: account.bank_account_id, transaction_date: `2026-07-${String(28 - (index % 20)).padStart(2, '0')}`, description: index < 63 ? `עמלה ${index + 1}` : `הפקדה ${index + 1}`, reference_number: String(1000 + index), amount: -(index + 1), attachment_count: 0 }));

async function openBank(page, { delayPage = 0, onConfirm = () => {} } = {}) {
  const browserErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('chamah.portal.session', JSON.stringify({ access_token: 'accounting-access', refresh_token: 'accounting-refresh', expires_at: 4102444800 })));
  await page.route(`${base}/auth/v1/user`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route(`${base}/rest/v1/**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${base}/functions/v1/**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route(`${base}/rest/v1/rpc/portal_my_access**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(portalAccessFixture) }));
  await page.route(`${base}/rest/v1/allocation_units**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${base}/functions/v1/portal-bank-workbench**`, async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      const body = request.postDataJSON();
      if (body.action === 'preview') { await new Promise((resolve) => setTimeout(resolve, 250)); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ preview_token: 'preview', account, account_number: body.account_number, rows: body.rows.map((row) => ({ ...row, errors: [], duplicate: false, importable: true })), summary: { total: body.rows.length, importable: body.rows.length, duplicates: 0, invalid: 0 } }) }); }
      if (body.action === 'confirm_import') { onConfirm(); await new Promise((resolve) => setTimeout(resolve, 250)); return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ batch_id: 'batch-1', imported: 1, transactions: [{ bank_transaction_id: 'tx-imported' }] }) }); }
    }
    const params = new URL(request.url()).searchParams, query = (params.get('query') || '').toLowerCase(), description = (params.get('description') || '').toLowerCase();
    const matching = transactions.filter((row) => (!query || `${row.description} ${row.reference_number}`.toLowerCase().includes(query)) && (!description || row.description.toLowerCase().includes(description)));
    const pageNumber = Number(params.get('page') || 1), pageSize = Number(params.get('page_size') || 50), pageCount = Math.max(1, Math.ceil(matching.length / pageSize));
    if (delayPage === pageNumber) await new Promise((resolve) => setTimeout(resolve, 350));
    const body = { transactions: matching.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), allocations: [], accounts: [account], units: [], daycares: [], categories: [], batches: [], uploadHistory: { accounts: [], batches: [] }, calendarYears: [{ year_number: 2026, display_name: '2026' }], assignmentMonths: [], accountingStatuses: [], complete: true, activeYear: 2026, queueCounts: { all: matching.length, unassigned: matching.length, attention: matching.length }, pagination: { page: pageNumber, pageSize, total: matching.length, pageCount, hasPrevious: pageNumber > 1, hasNext: pageNumber < pageCount } };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/new/#dashboards/unit/organization/accounting/banks');
  await expect(page.locator('[data-bank-row]')).toHaveCount(50);
  return browserErrors;
}

const scrollToBottom = (page) => page.locator('#bank-scroll').evaluate((element) => { element.scrollTop = element.scrollHeight; element.dispatchEvent(new Event('scroll')); });

test('TRACK034 appends all server pages without duplicates or skipped rows', async ({ page }) => {
  const browserErrors = await openBank(page, { delayPage: 2 });
  await expect(page.locator('.bank-pagination')).toHaveCount(0);
  await expect(page.locator('#bank-load-progress')).toHaveText('נטענו 50 מתוך 125');
  await scrollToBottom(page); await expect(page.locator('#bank-load-more-status')).toContainText('טוען תנועות נוספות...');
  await expect(page.locator('[data-bank-row]')).toHaveCount(100); await scrollToBottom(page); await expect(page.locator('[data-bank-row]')).toHaveCount(125);
  const ids = await page.locator('[data-bank-row]').evaluateAll((rows) => rows.map((row) => row.dataset.bankRow));
  expect(ids).toEqual(transactions.map((row) => row.bank_transaction_id)); expect(new Set(ids).size).toBe(125); expect(browserErrors).toEqual([]);
});

test('TRACK034 resets filters and ignores an in-flight stale append', async ({ page }) => {
  await openBank(page, { delayPage: 2 }); await scrollToBottom(page); await page.locator('#bank-description-filter').fill('הפקדה');
  await expect(page.locator('[data-bank-row]')).toHaveCount(50); await expect(page.locator('#bank-load-progress')).toHaveText('נטענו 50 מתוך 62');
  await page.waitForTimeout(450); await expect(page.locator('[data-bank-row]')).toHaveCount(50); await expect(page.locator('[data-bank-row]').first()).toContainText('הפקדה 64');
  await scrollToBottom(page); await expect(page.locator('[data-bank-row]')).toHaveCount(62);
});

test('TRACK034 animates processing, prevents duplicate import, and fits the viewport', async ({ page }) => {
  let confirmations = 0; const browserErrors = await openBank(page, { onConfirm: () => { confirmations += 1; } });
  await page.locator('#bank-file').setInputFiles({ name: 'bank.csv', mimeType: 'text/csv', buffer: Buffer.from('דוח תנועות חשבון 00123456\nתאריך,תיאור,אסמכתא,סכום\n24/07/2026,עמלה,77,-12.50', 'utf8') });
  await expect(page.locator('#bank-import')).toHaveAttribute('aria-busy', 'true'); await expect(page.locator('#bank-import .portal-loading-spinner')).toBeVisible(); await expect(page.locator('#bank-import-dialog')).toBeVisible();
  const confirm = page.locator('#confirm-bank-import'); await confirm.click(); await confirm.click({ force: true }); await expect(page.locator('#bank-import-dialog')).toBeHidden();
  expect(confirmations).toBe(1); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); expect(browserErrors).toEqual([]);
});
