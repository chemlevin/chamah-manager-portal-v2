import { test, expect } from '@playwright/test';
import { portalAccessFixture } from './new-portal-test-data.mjs';

const base = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const account = { bank_account_id: 'account-1', display_name: 'חשבון מרכזי', source_account_number: '00123456', lifecycle_status: 'ACTIVE' };
const defaults = {
  allocations: [], accounts: [account], units: [], daycares: [], categories: [], batches: [], uploadHistory: { accounts: [], batches: [] },
  calendarYears: [{ year_number: 2026, display_name: '2026' }], assignmentMonths: [], accountingStatuses: [], complete: true,
};

const transactions = Array.from({ length: 125 }, (_, index) => ({
  bank_transaction_id: `tx-${index + 1}`,
  bank_account_id: account.bank_account_id,
  transaction_date: `2026-07-${String(28 - (index % 20)).padStart(2, '0')}`,
  description: index < 63 ? `עמלה ${index + 1}` : `הפקדה ${index + 1}`,
  reference_number: String(1000 + index), amount: -(index + 1), attachment_count: 0,
}));

function createRequestGate() {
  let markStarted;
  let release;
  return {
    started: new Promise((resolve) => { markStarted = resolve; }),
    pending: new Promise((resolve) => { release = resolve; }),
    markStarted,
    release,
  };
}

async function openBank(page, { delayPage = 0, onConfirm = () => {}, previewGate, confirmGate } = {}) {
  const browserErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('chamah.portal.session', JSON.stringify({ access_token: 'accounting-access', refresh_token: 'accounting-refresh', expires_at: 4102444800 })));
  await page.route(`${base}/auth/v1/user`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route(`${base}/rest/v1/rpc/portal_my_access**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(portalAccessFixture) }));
  await page.route(`${base}/rest/v1/allocation_units**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${base}/functions/v1/portal-runtime-config**`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ allocation_units: [], daycares: [], accounting_statuses: [], budget_categories: [] }) }));
  await page.route(`${base}/functions/v1/portal-bank-workbench**`, async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      const body = request.postDataJSON();
      if (body.action === 'preview') {
        if (previewGate) {
          previewGate.markStarted();
          await previewGate.pending;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ preview_token: 'track034-preview', account, account_number: body.account_number, rows: body.rows.map((row) => ({ ...row, errors: [], duplicate: false, importable: true })), summary: { total: body.rows.length, importable: body.rows.length, duplicates: 0, invalid: 0 } }) });
      }
      if (body.action === 'confirm_import') {
        onConfirm();
        if (confirmGate) {
          confirmGate.markStarted();
          await confirmGate.pending;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ batch_id: 'batch-1', imported: 1, transactions: [{ bank_transaction_id: 'tx-imported' }] }) });
      }
    }
    const params = new URL(request.url()).searchParams;
    const query = (params.get('query') || '').toLowerCase();
    const descriptionTerms = (params.get('description') || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matching = transactions.filter((row) => (!query || `${row.description} ${row.reference_number}`.toLowerCase().includes(query)) && descriptionTerms.every((term) => row.description.toLowerCase().includes(term)));
    const pageNumber = Number(params.get('page') || 1), pageSize = Number(params.get('page_size') || 50);
    if (descriptionTerms.length) await new Promise((resolve) => setTimeout(resolve, 350));
    if (delayPage && pageNumber === delayPage) await new Promise((resolve) => setTimeout(resolve, 350));
    const pageRows = matching.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
    const pageCount = Math.max(1, Math.ceil(matching.length / pageSize));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...defaults, transactions: pageRows, activeYear: 2026, resultSummary: { total: matching.length, split: 0, assigned: 0, unassigned: matching.length }, queueCounts: { all: matching.length, unassigned: matching.length, attention: matching.length }, pagination: { page: pageNumber, pageSize, total: matching.length, pageCount, hasPrevious: pageNumber > 1, hasNext: pageNumber < pageCount } }) });
  });
  await page.goto('/new/#dashboards/unit/organization/accounting/banks');
  await expect(page.locator('[data-bank-row]')).toHaveCount(50);
  return browserErrors;
}

async function scrollToBottom(page) {
  await page.locator('#bank-scroll').evaluate((element) => { element.scrollTop = element.scrollHeight; element.dispatchEvent(new Event('scroll')); });
}

test('TRACK034 continuously appends complete server pages without pagination, duplicates or skipped rows', async ({ page }) => {
  const browserErrors = await openBank(page, { delayPage: 2 });
  await expect(page.locator('.bank-pagination')).toHaveCount(0);
  await expect(page.locator('#bank-load-progress')).toHaveText('נטענו 50 מתוך 125');
  await expect(page.locator('#bank-workflow-cards')).toContainText('רשומות125');
  await expect(page.locator('#bank-workflow-cards')).toContainText('לא שויכו125');
  await scrollToBottom(page);
  await expect(page.locator('#bank-load-more-status')).toContainText('טוען תנועות נוספות...');
  await scrollToBottom(page);
  await expect(page.locator('[data-bank-row]')).toHaveCount(100);
  await scrollToBottom(page);
  await expect(page.locator('[data-bank-row]')).toHaveCount(125);
  await expect(page.locator('#bank-load-progress')).toHaveText('נטענו 125 מתוך 125');
  await expect(page.locator('#bank-workflow-cards')).toContainText('רשומות125');
  const ids = await page.locator('[data-bank-row]').evaluateAll((rows) => rows.map((row) => row.dataset.bankRow));
  expect(new Set(ids).size).toBe(125);
  expect(ids).toEqual(transactions.map((row) => row.bank_transaction_id));
  expect(browserErrors).toEqual([]);
});

test('TRACK034 resets to the first matching page and ignores a stale in-flight append', async ({ page }) => {
  await openBank(page, { delayPage: 2 });
  await scrollToBottom(page);
  await page.locator('#bank-description-filter').fill('64 הפקדה');
  await expect(page.locator('#bank-load-more-status')).toContainText('טוען תנועות...');
  await expect(page.locator('#bank-workflow-cards')).toContainText('רשומות1');
  await page.locator('#bank-description-filter').fill('הפקדה');
  await expect(page.locator('[data-bank-row]')).toHaveCount(50);
  await expect(page.locator('#bank-load-progress')).toHaveText('נטענו 50 מתוך 62');
  await expect(page.locator('#bank-workflow-cards')).toContainText('רשומות62');
  await page.waitForTimeout(450);
  await expect(page.locator('[data-bank-row]')).toHaveCount(50);
  await expect(page.locator('[data-bank-row]').first()).toContainText('הפקדה 64');
  await scrollToBottom(page);
  await expect(page.locator('[data-bank-row]')).toHaveCount(62);
});

test('TRACK035 keeps reference in global search and Clear All restores the full summary', async ({ page }) => {
  await openBank(page);
  await page.locator('#bank-new-search').fill('1124');
  await expect(page.locator('[data-bank-row]')).toHaveCount(1);
  await expect(page.locator('#bank-workflow-cards')).toContainText('רשומות1');
  await page.locator('#bank-clear-all').click();
  await expect(page.locator('[data-bank-row]')).toHaveCount(50);
  await expect(page.locator('#bank-workflow-cards')).toContainText('רשומות125');
  await expect(page.locator('#bank-description-filter')).toHaveValue('');
});

test('TRACK034 shows processing feedback and prevents duplicate import confirmation', async ({ page }) => {
  let confirmations = 0;
  const previewGate = createRequestGate();
  const confirmGate = createRequestGate();
  await openBank(page, { onConfirm: () => { confirmations += 1; }, previewGate, confirmGate });
  await page.locator('#bank-file').setInputFiles({ name: 'bank.csv', mimeType: 'text/csv', buffer: Buffer.from('דוח תנועות חשבון 00123456\nתאריך,תיאור,אסמכתא,סכום\n24/07/2026,עמלה,77,-12.50', 'utf8') });
  await previewGate.started;
  await expect(page.locator('#bank-import')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#bank-import .portal-loading-spinner')).toBeVisible();
  previewGate.release();
  await expect(page.locator('#bank-import-dialog')).toBeVisible();
  await expect(page.locator('#bank-import')).not.toHaveAttribute('aria-busy', 'true');
  const confirm = page.locator('#confirm-bank-import');
  await confirm.click();
  await confirmGate.started;
  await confirm.click({ force: true });
  await expect(confirm).toHaveAttribute('aria-busy', 'true');
  confirmGate.release();
  await expect(page.locator('#bank-import-dialog')).toBeHidden();
  expect(confirmations).toBe(1);
  await expect(page.locator('#bank-import')).toBeEnabled();
});

test('TRACK034 has no viewport overflow at 390px', async ({ page }) => {
  const browserErrors = await openBank(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(browserErrors).toEqual([]);
});
