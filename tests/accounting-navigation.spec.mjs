import { test, expect } from '@playwright/test';
import { portalAccessFixture } from './new-portal-test-data.mjs';

const base = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';

async function openAccounting(page, route, access = portalAccessFixture, workbench = {}) {
  await page.addInitScript(() => localStorage.setItem('chamah.portal.session', JSON.stringify({ access_token: 'accounting-access', refresh_token: 'accounting-refresh', expires_at: 4102444800 })));
  await page.route(`${base}/auth/v1/user`, (request) => request.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route(`${base}/rest/v1/rpc/portal_my_access**`, (request) => request.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(access) }));
  await page.route(`${base}/rest/v1/allocation_units**`, (request) => request.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${base}/functions/v1/portal-bank-workbench`, async (request) => {
    const defaults = { transactions: [], allocations: [], accounts: [], units: [], daycares: [], categories: [], batches: [] };
    await request.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...defaults, ...workbench }) });
  });
  await page.goto(`/new/#${route}`);
}

const account = { bank_account_id: 'account-1', display_name: 'חשבון מרכזי' };
const transactions = [
  { bank_transaction_id: 'tx-1', bank_account_id: 'account-1', transaction_date: '2026-07-24', description: 'חשמל', reference_number: '100', amount: -100, attachment_count: 2 },
  { bank_transaction_id: 'tx-2', bank_account_id: 'account-1', transaction_date: '2026-07-23', description: 'עמלה', reference_number: '101', amount: -20, attachment_count: 0 },
];
const allocation = { bank_allocation_id: 'allocation-1', bank_transaction_id: 'tx-1', movement_type: 'EXPENSE', allocation_unit_id: 'fe05de40-2551-4e90-befe-db4253d66e1c', budget_category_id: 'ab5e648d-c280-44ad-a56d-8fc6e825f92a', budget_month: '2026-07-01', accounting_status: 'PENDING_SUBMISSION', allocation_amount: -60, notes: 'בדיקת חשמל' };

test('Accounting presents Summary Dashboard and Bank File as equal sibling choices', async ({ page }) => {
  await openAccounting(page, 'dashboards/unit/organization/accounting');
  await expect(page.locator('.accounting-choice-grid .dashboard-type-card')).toHaveCount(2);
  await expect(page.locator('[data-accounting-screen="summary"]')).toBeVisible();
  await expect(page.locator('[data-accounting-screen="banks"]')).toBeVisible();
});

test('Bank File exposes import, search, filters and export controls with an empty state', async ({ page }) => {
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks');
  await expect(page.getByRole('heading', { name: 'קובץ בנקים' })).toBeVisible();
  await expect(page.locator('#bank-new-rows [data-bank-row]')).toHaveCount(0);
  await expect(page.getByText('אין תנועות בנק להצגה')).toBeVisible();
  await expect(page.locator('#bank-new-details')).toBeHidden();
  await expect(page.locator('#bank-new-search')).toHaveAttribute('placeholder', /מספר שורה/);
  await expect(page.locator('#bank-clear-search')).toBeVisible();
  await expect(page.locator('#bank-clear-all')).toBeVisible();
  await expect(page.locator('#bank-export-open')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ייבוא קובץ' })).toBeVisible();
});

test('Bank File renders exact status reasons and tree-style split row numbers', async ({ page }) => {
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks', portalAccessFixture, { accounts: [account], transactions, allocations: [allocation] });
  const parent = page.locator('[data-bank-row="tx-1"]').first();
  await expect(parent).toContainText(/שגיאת איזון/);
  await expect(parent).toHaveClass(/bank-row-error/);
  await expect(parent.locator('.bank-tree-number')).toContainText('1');
  await expect(parent.locator('select[name="movement_type"]')).toBeVisible();
  await expect(parent.locator('input[name="notes"]')).toBeVisible();
  await page.locator('[data-add-split="tx-1"]').click();
  await expect(page.locator('[data-bank-row="tx-1"]')).toHaveCount(3);
  await expect(page.locator('[data-bank-row="tx-1"] .bank-tree-number')).toHaveText(['1', '1.1', '1.2']);
  await expect(page.locator('[data-bank-row="tx-1"]').first()).toContainText(/מקורי/);
  await expect(page.locator('[data-bank-row="tx-1"]').first()).toContainText(/מוקצה/);
  await expect(page.locator('[data-bank-row="tx-1"]').first()).toContainText(/נותר/);
});

test('Bank File searches notes and row numbers and exposes removable filter chips', async ({ page }) => {
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks', portalAccessFixture, { accounts: [account], transactions, allocations: [allocation] });
  await page.locator('#bank-new-search').fill('בדיקת חשמל');
  await expect(page.locator('[data-bank-row="tx-1"]')).toHaveCount(1);
  await expect(page.locator('[data-bank-row="tx-2"]')).toHaveCount(0);
  await expect(page.locator('#bank-filter-chips')).toContainText('חיפוש');
  await page.locator('#bank-clear-search').click();
  await page.locator('#bank-new-search').fill('2');
  await expect(page.locator('[data-bank-row="tx-2"]')).toHaveCount(1);
  await expect(page.locator('[data-bank-row="tx-1"]')).toHaveCount(0);
  await page.locator('#bank-clear-all').click();
  await expect(page.locator('[data-bank-row]')).toHaveCount(2);
});

test('Bank File export offers current view and filter selection with live match count', async ({ page }) => {
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks', portalAccessFixture, { accounts: [account], transactions, allocations: [allocation] });
  await page.locator('#bank-export-open').click();
  await expect(page.locator('#bank-export-dialog')).toBeVisible();
  await expect(page.getByText('התצוגה הנוכחית — בדיוק השורות המוצגות')).toBeVisible();
  await expect(page.locator('#bank-export-count')).toHaveText('2');
  await page.locator('input[name="export_scope"][value="selection"]').check();
  await expect(page.locator('#bank-export-filters')).toBeVisible();
  await page.locator('[data-export-filter="workflow"]').selectOption('untreated');
  await expect(page.locator('#bank-export-count')).toHaveText('1');
  await expect(page.getByText('Excel (.xlsx)')).toBeVisible();
  await expect(page.getByText('PDF', { exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.locator('#bank-export-confirm').click();
  await expect((await download).suggestedFilename()).toMatch(/^bank-transactions-\d{4}-\d{2}-\d{2}\.xlsx$/);
});

test('Bank File supports selection checkboxes for future bulk actions', async ({ page }) => {
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks', portalAccessFixture, { accounts: [account], transactions: [transactions[0]] });
  await page.locator('[data-select-transaction="tx-1"]').check();
  await expect(page.locator('#bank-selection-count')).toContainText('1 תנועות נבחרו');
  await page.locator('#bank-select-all').uncheck();
  await expect(page.locator('#bank-selection-count')).toContainText('לא נבחרו');
});

test('Bank File detects and maps an HTML table exported with an .xls extension', async ({ page }) => {
  let previewPayload;
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks', portalAccessFixture, {
    accounts: [{ ...account, source_account_number: '123456' }],
  });
  await page.unroute(`${base}/functions/v1/portal-bank-workbench`);
  await page.route(`${base}/functions/v1/portal-bank-workbench`, async (route) => {
    const body = route.request().postDataJSON() || {};
    if (body.action === 'preview') {
      previewPayload = body;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          preview_token: 'html-xls-preview',
          account: { ...account, source_account_number: '123456' },
          account_number: body.account_number,
          rows: body.rows.map((row) => ({ ...row, errors: [], duplicate: false, importable: true })),
          summary: { total: body.rows.length, importable: body.rows.length, duplicates: 0, invalid: 0 },
        }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transactions: [], allocations: [], accounts: [{ ...account, source_account_number: '123456' }], units: [], daycares: [], categories: [], batches: [] }) });
  });
  await page.locator('#bank-file').setInputFiles('tests/fixtures/bank-export-html.xls');
  await expect(page.getByRole('heading', { name: 'תצוגה מקדימה לפני ייבוא' })).toBeVisible();
  await expect(page.locator('#bank-import-content tbody tr')).toHaveCount(2);
  expect(previewPayload.account_number).toBe('123456');
  expect(previewPayload.rows).toMatchObject([
    { transaction_date: '2026-07-24', description: 'תשלום לספק ירושלים', reference_number: '000012345', amount: -1234.56 },
    { transaction_date: '2026-07-23', description: 'הפקדה מלקוח', reference_number: '987654', amount: 2500 },
  ]);
});

test('Bank File defaults to HIDDEN when the permission catalog has no explicit child row', async ({ page }) => {
  const legacySections = portalAccessFixture.sections.filter((item) => !item.screen_code.startsWith('dashboards.accounting.'));
  const access = { ...portalAccessFixture, profile: { ...portalAccessFixture.profile, is_super_admin: false }, sections: legacySections };
  await openAccounting(page, 'dashboards/unit/organization/accounting', access);
  await expect(page.locator('[data-accounting-screen="summary"]')).toBeVisible();
  await expect(page.locator('[data-accounting-screen="banks"]')).toHaveCount(0);
});
