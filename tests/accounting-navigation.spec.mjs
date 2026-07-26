import { test, expect } from '@playwright/test';
import { portalAccessFixture } from './new-portal-test-data.mjs';

const base = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';

async function openAccounting(page, route, access = portalAccessFixture, workbench = {}) {
  await page.addInitScript(() => localStorage.setItem('chamah.portal.session', JSON.stringify({ access_token: 'accounting-access', refresh_token: 'accounting-refresh', expires_at: 4102444800 })));
  await page.route(`${base}/auth/v1/user`, (request) => request.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route(`${base}/rest/v1/rpc/portal_my_access**`, (request) => request.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(access) }));
  await page.route(`${base}/rest/v1/allocation_units**`, (request) => request.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(`${base}/functions/v1/portal-bank-workbench`, async (request) => {
    const defaults = {
      transactions: [], allocations: [], accounts: [], units: [], daycares: [], categories: [], batches: [],
      assignmentMonths: [{ school_year_month_id: 'month-2026-07', start_date: '2026-07-01', month_label: 'יולי 2026' }],
      accountingStatuses: [
        { accounting_status_id: 'status-missing', accounting_status_code: 'ACC-MISSING-DOCS', sheet_accounting_status_id: 'ACC-MISSING-DOCS', display_name: 'חסרים מסמכים', display_order: 10, is_final: false, lifecycle_status: 'ACTIVE' },
        { accounting_status_id: 'status-waiting', accounting_status_code: 'ACC-WAITING', sheet_accounting_status_id: 'ACC-WAITING', display_name: 'ממתין לשליחה', display_order: 20, is_final: false, lifecycle_status: 'ACTIVE' },
        { accounting_status_id: 'status-sent', accounting_status_code: 'ACC-SENT', sheet_accounting_status_id: 'ACC-SENT', display_name: 'נשלח להנה״ח', display_order: 30, is_final: true, lifecycle_status: 'ACTIVE' },
      ],
    };
    const response = { ...defaults, ...workbench };
    response.accounts = response.accounts.map((row) => ({ lifecycle_status: 'ACTIVE', ...row }));
    response.units = response.units.map((row) => ({ lifecycle_status: 'ACTIVE', ...row }));
    response.daycares = response.daycares.map((row) => ({ lifecycle_status: 'ACTIVE', ...row }));
    response.categories = response.categories.map((row) => ({ lifecycle_status: 'ACTIVE', ...row }));
    await request.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
  });
  await page.goto(`/new/#${route}`);
}

const account = { bank_account_id: 'account-1', display_name: 'חשבון מרכזי' };
const transactions = [
  { bank_transaction_id: 'tx-1', bank_account_id: 'account-1', transaction_date: '2026-07-24', description: 'חשמל', reference_number: '100', amount: -100, attachment_count: 2 },
  { bank_transaction_id: 'tx-2', bank_account_id: 'account-1', transaction_date: '2026-07-23', description: 'עמלה', reference_number: '101', amount: -20, attachment_count: 0 },
];
const allocation = { bank_allocation_id: 'allocation-1', bank_transaction_id: 'tx-1', movement_type: 'EXPENSE', allocation_unit_id: 'fe05de40-2551-4e90-befe-db4253d66e1c', budget_category_id: 'ab5e648d-c280-44ad-a56d-8fc6e825f92a', budget_month: '2026-07-01', accounting_status_id: 'status-waiting', allocation_amount: -60, notes: 'בדיקת חשמל' };

test('Accounting presents Summary Dashboard and Bank File as equal sibling choices', async ({ page }) => {
  await openAccounting(page, 'dashboards/unit/organization/accounting');
  await expect(page.locator('.accounting-choice-grid .dashboard-type-card')).toHaveCount(3);
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
  await page.locator('#bank-new-transaction').click();
  await expect(page.locator('[data-manual-bank-row]')).toBeVisible();
  await expect(page.locator('[data-manual-bank-row]')).toContainText('יוקצו אוטומטית');
});

test('Bank File renders automatic health and tree-style split row numbers', async ({ page }, testInfo) => {
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks', portalAccessFixture, { accounts: [account], transactions, allocations: [allocation] });
  await expect(page.locator('.bank-workbench-table thead th')).toHaveText(['#', 'סטטוס', 'חשבון בנק', 'תאריך', 'תיאור', 'אסמכתא', 'סכום', 'סוג תנועה', 'מחלקה', 'מעון', 'סעיף תקציבי', 'חודש שיוך', 'סטטוס הנה"ח', 'הערות', 'מסמך']);
  const parent = page.locator('[data-bank-row="tx-1"]').first();
  await expect(parent.locator('.bank-row-status').first()).toHaveText('בעייתי');
  await expect(parent).toHaveClass(/bank-row-error/);
  await expect(parent.locator('.bank-tree-number')).toContainText('1');
  await expect(parent.locator('select[name="movement_type"]')).toBeVisible();
  await expect(parent.locator('input[name="notes"]')).toBeVisible();
  await page.locator('[data-add-split="tx-1"]').click();
  await expect(page.locator('[data-bank-row="tx-1"]')).toHaveCount(3);
  await expect(page.locator('[data-bank-row="tx-1"] .bank-tree-number')).toHaveText(['1', '1.1', '1.2']);
  await expect(page.locator('[data-bank-row="tx-1"]').first()).toContainText(/מקורי/);
  if (testInfo.project.name === 'desktop-1440') await page.screenshot({ path: 'screenshots/track025a/bank-files-desktop.png', fullPage: true });
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

test('Bank File supports selection checkboxes and bulk delete', async ({ page }) => {
  const deletePayloads = [];
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks', portalAccessFixture, { accounts: [account], transactions });
  await page.unroute(`${base}/functions/v1/portal-bank-workbench`);
  await page.route(`${base}/functions/v1/portal-bank-workbench`, async (route) => {
    const body = route.request().postDataJSON() || {};
    if (body.action === 'delete_transactions') {
      deletePayloads.push(body);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ deleted: 1 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transactions, allocations: [], accounts: [account], units: [], daycares: [], categories: [], batches: [] }) });
  });
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-delete-transaction="tx-1"]').click();
  await expect(page.locator('[data-bank-row="tx-1"]')).toHaveCount(0);
  await page.locator('[data-select-transaction="tx-2"]').check();
  await expect(page.locator('#bank-selection-count')).toContainText('1 תנועות נבחרו');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#bank-delete-selected').click();
  await expect(page.locator('[data-bank-row="tx-2"]')).toHaveCount(0);
  expect(deletePayloads.map((payload) => payload.bank_transaction_ids)).toEqual([['tx-1'], ['tx-2']]);
});

test('Bank File detects a real header after summary rows and combines debit and credit columns', async ({ page }) => {
  let previewPayload;
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks', portalAccessFixture, { accounts: [{ ...account, source_account_number: '00123456' }] });
  await page.unroute(`${base}/functions/v1/portal-bank-workbench`);
  await page.route(`${base}/functions/v1/portal-bank-workbench`, async (route) => {
    const body = route.request().postDataJSON() || {};
    if (body.action === 'preview') {
      previewPayload = body;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ preview_token: 'csv-preview', account, account_number: body.account_number, rows: body.rows.map((row) => ({ ...row, errors: [], duplicate: false, importable: true })), summary: { total: 2, importable: 2, duplicates: 0, invalid: 0 } }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transactions: [], allocations: [], accounts: [{ ...account, source_account_number: '00123456' }], units: [], daycares: [], categories: [], batches: [] }) });
  });
  await page.locator('#bank-file').setInputFiles({ name: 'debit-credit.csv', mimeType: 'text/csv', buffer: Buffer.from('דוח תנועות חשבון 00123456\nסיכום חודשי\nתאריך,תיאור,אסמכתא,חובה,זכות\n24/07/2026,עמלה,00077,12.50,\n23/07/2026,הפקדה,00078,,100.25', 'utf8') });
  await expect(page.getByRole('heading', { name: 'תצוגה מקדימה לפני ייבוא' })).toBeVisible();
  expect(previewPayload.account_number).toBe('00123456');
  expect(previewPayload.rows).toMatchObject([{ reference_number: '00077', amount: -12.5 }, { reference_number: '00078', amount: 100.25 }]);
});

test('Bank File opens manual column mapping when auto-detection fails', async ({ page }) => {
  let previewPayload;
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks', portalAccessFixture, { accounts: [{ ...account, source_account_number: '123456' }] });
  await page.unroute(`${base}/functions/v1/portal-bank-workbench`);
  await page.route(`${base}/functions/v1/portal-bank-workbench`, async (route) => {
    const body = route.request().postDataJSON() || {};
    if (body.action === 'preview') {
      previewPayload = body;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ preview_token: 'manual-preview', account, account_number: body.account_number, rows: body.rows.map((row) => ({ ...row, errors: [], duplicate: false, importable: true })), summary: { total: 1, importable: 1, duplicates: 0, invalid: 0 } }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transactions: [], allocations: [], accounts: [{ lifecycle_status: 'ACTIVE', ...account, source_account_number: '123456' }], units: [], daycares: [], categories: [], accountingStatuses: [], assignmentMonths: [], batches: [] }) });
  });
  await page.locator('#bank-file').setInputFiles({ name: 'manual.csv', mimeType: 'text/csv', buffer: Buffer.from('כותרת דוח\nיום,מלל,מזהה,ערך\n24/07/2026,בדיקה,00009,-10', 'utf8') });
  await expect(page.getByRole('heading', { name: 'מיפוי עמודות ידני' })).toBeVisible();
  await page.locator('#bank-map-header').selectOption('1');
  await page.locator('[data-map="transaction_date"]').selectOption('0');
  await page.locator('[data-map="description"]').selectOption('1');
  await page.locator('[data-map="reference_number"]').selectOption('2');
  await page.locator('[data-map="amount"]').selectOption('3');
  await page.locator('#bank-map-account').selectOption('123456');
  await page.locator('#bank-apply-mapping').click();
  await expect(page.getByRole('heading', { name: 'תצוגה מקדימה לפני ייבוא' })).toBeVisible();
  expect(previewPayload.rows[0]).toMatchObject({ transaction_date: '2026-07-24', reference_number: '00009', amount: -10 });
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
    if (body.action === 'confirm_import') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ batch_id: 'fixture-batch', imported: 2, transactions: [{ bank_transaction_id: 'fixture-1' }, { bank_transaction_id: 'fixture-2' }] }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transactions: [], allocations: [], accounts: [{ lifecycle_status: 'ACTIVE', ...account, source_account_number: '123456' }], units: [], daycares: [], categories: [], accountingStatuses: [], assignmentMonths: [], batches: [] }) });
  });
  await page.locator('#bank-file').setInputFiles('tests/fixtures/bank-export-html.xls');
  await expect(page.getByRole('heading', { name: 'תצוגה מקדימה לפני ייבוא' })).toBeVisible();
  await expect(page.locator('#bank-import-content tbody tr')).toHaveCount(2);
  expect(previewPayload.account_number).toBe('123456');
  expect(previewPayload.rows).toMatchObject([
    { transaction_date: '2026-07-24', description: 'תשלום לספק ירושלים', reference_number: '000012345', amount: -1234.56 },
    { transaction_date: '2026-07-23', description: 'הפקדה מלקוח', reference_number: '987654', amount: 2500 },
  ]);
  await page.locator('#confirm-bank-import').click();
  await expect(page.locator('#bank-message')).toContainText('יובאו 2 תנועות');
});

test('Bank File locks source amount, edits split amounts, and enforces department-daycare dependency', async ({ page }) => {
  const office = { allocation_unit_id: 'fe05de40-2551-4e90-befe-db4253d66e1c', allocation_unit_type: 'OFFICE', display_name: 'משרד' };
  const daycareUnit = { allocation_unit_id: '692c8d30-1ba3-4502-acbc-2424f84f0d9f', allocation_unit_type: 'DAYCARE', display_name: 'אשקלון' };
  const development = { allocation_unit_id: 'b876ae79-8b8d-4915-9f57-fb282dde8057', allocation_unit_type: 'DEVELOPMENT', display_name: 'פיתוח' };
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks', portalAccessFixture, { accounts: [account], transactions, allocations: [], units: [office, daycareUnit, development] });
  const sourceAmount = page.locator('[data-bank-row="tx-1"] input[name="allocation_amount"]');
  await expect(sourceAmount).toHaveValue('-100');
  await expect(sourceAmount).toHaveAttribute('readonly', '');
  const row = page.locator('[data-bank-row="tx-1"]').first();
  await expect(row.locator('select[name="department"] option')).toHaveText(['בחירה…', 'מעונות', 'משרד', 'פיתוח']);
  await row.locator('select[name="department"]').selectOption('DAYCARES');
  await expect(row.locator('[data-daycare-field]')).toBeVisible();
  await row.locator('select[name="department"]').selectOption(office.allocation_unit_id);
  await expect(row.locator('[data-daycare-field]')).toBeHidden();
  await page.locator('[data-add-split="tx-1"]').click();
  const splitAmounts = page.locator('[data-bank-row="tx-1"][data-allocation-entry] input[name="allocation_amount"]');
  await expect(splitAmounts).toHaveCount(2);
  await expect(splitAmounts.first()).not.toHaveAttribute('readonly', '');
  await splitAmounts.nth(1).fill('-25');
  await expect(splitAmounts.nth(1)).toHaveValue('-25');
});

test('Bank File filter choices come only from the current dataset', async ({ page }) => {
  const unusedAccount = { bank_account_id: 'account-unused', display_name: 'חשבון ללא תנועות' };
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks', portalAccessFixture, { accounts: [account, unusedAccount], transactions, allocations: [allocation] });
  await expect(page.locator('#bank-account-filter option')).toHaveText(['כל החשבונות', 'חשבון מרכזי']);
  await expect(page.locator('#bank-status-filter option')).toHaveText(['כל הסטטוסים', 'ממתין לשליחה']);
  await page.locator('#bank-export-open').click();
  await page.locator('input[name="export_scope"][value="selection"]').check();
  await expect(page.locator('[data-export-filter="account"] option')).toHaveText(['הכול', 'חשבון מרכזי']);
  await expect(page.locator('[data-export-filter="accountingStatus"] option')).toHaveText(['הכול', 'ממתין לשליחה']);
  await expect(page.locator('[data-export-filter="accountingMonth"] option')).toHaveText(['הכול', '2026-07']);
});

test('Bank File creates a MANUAL transaction with the server-generated transaction ID', async ({ page }) => {
  let createdPayload;
  let currentTransactions = [];
  const manual = { bank_transaction_id: 'manual-generated-id', bank_account_id: account.bank_account_id, transaction_date: '2026-07-24', description: 'תנועה ידנית', reference_number: 'M-1', amount: -45, source_payload: { source: 'MANUAL' } };
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks', portalAccessFixture, { accounts: [account] });
  await page.unroute(`${base}/functions/v1/portal-bank-workbench`);
  await page.route(`${base}/functions/v1/portal-bank-workbench`, async (route) => {
    const body = route.request().postDataJSON() || {};
    if (body.action === 'create_manual_transaction') {
      createdPayload = body;
      currentTransactions = [manual];
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ batch_id: 'manual-batch', transaction: manual }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transactions: currentTransactions, allocations: [], accounts: [{ lifecycle_status: 'ACTIVE', ...account }], units: [], daycares: [], categories: [], accountingStatuses: [], assignmentMonths: [], batches: [] }) });
  });
  await page.locator('#bank-new-transaction').click();
  const row = page.locator('[data-manual-bank-row]');
  await row.locator('[name="bank_account_id"]').selectOption(account.bank_account_id);
  await row.locator('[name="transaction_date"]').fill('2026-07-24');
  await row.locator('[name="description"]').fill('תנועה ידנית');
  await row.locator('[name="reference_number"]').fill('M-1');
  await row.locator('[name="amount"]').fill('-45');
  await row.locator('[data-save-manual-inline]').click();
  expect(createdPayload).toMatchObject({ action: 'create_manual_transaction', bank_account_id: account.bank_account_id, transaction_date: '2026-07-24', description: 'תנועה ידנית', reference_number: 'M-1', amount: -45 });
  await expect(page.locator('[data-bank-row="manual-generated-id"]')).toContainText('מקור: MANUAL');
  await expect(page.locator('[data-bank-row="manual-generated-id"] input[name="allocation_amount"]')).toHaveAttribute('readonly', '');
});

test('Bank File defaults to HIDDEN when the permission catalog has no explicit child row', async ({ page }) => {
  const legacySections = portalAccessFixture.sections.filter((item) => !item.screen_code.startsWith('dashboards.accounting.'));
  const access = { ...portalAccessFixture, profile: { ...portalAccessFixture.profile, is_super_admin: false }, sections: legacySections };
  await openAccounting(page, 'dashboards/unit/organization/accounting', access);
  await expect(page.locator('[data-accounting-screen="summary"]')).toBeVisible();
  await expect(page.locator('[data-accounting-screen="banks"]')).toHaveCount(0);
});
