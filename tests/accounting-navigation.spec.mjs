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

test('Accounting presents Summary Dashboard and Bank File as equal sibling choices', async ({ page }) => {
  await openAccounting(page, 'dashboards/unit/organization/accounting');
  await expect(page.locator('.accounting-choice-grid .dashboard-type-card')).toHaveCount(2);
  await expect(page.locator('[data-accounting-screen="summary"]')).toBeVisible();
  await expect(page.locator('[data-accounting-screen="banks"]')).toBeVisible();
});

test('Bank File exposes TRACK015 import and workbench controls with an empty data state', async ({ page }) => {
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks');
  await expect(page.getByRole('heading', { name: 'קובץ בנקים' })).toBeVisible();
  await expect(page.locator('#bank-new-rows [data-bank-row]')).toHaveCount(0);
  await expect(page.getByText('אין תנועות בנק להצגה')).toBeVisible();
  await expect(page.locator('#bank-new-details')).toBeHidden();
  await expect(page.getByPlaceholder('חיפוש תיאור או אסמכתא…')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ייבוא קובץ' })).toBeVisible();
});

test('Bank File provides workflow filters and inline spreadsheet allocation editing', async ({ page }) => {
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks', portalAccessFixture, {
    accounts: [{ bank_account_id: 'account-1', display_name: 'חשבון מרכזי' }],
    transactions: [
      { bank_transaction_id: 'tx-1', bank_account_id: 'account-1', transaction_date: '2026-07-24', description: 'חשמל', reference_number: '100', amount: -100, attachment_count: 0 },
      { bank_transaction_id: 'tx-2', bank_account_id: 'account-1', transaction_date: '2026-07-23', description: 'עמלה', reference_number: '101', amount: -20, attachment_count: 0 },
    ],
    allocations: [{ bank_allocation_id: 'allocation-1', bank_transaction_id: 'tx-1', movement_type: 'EXPENSE', allocation_unit_id: 'fe05de40-2551-4e90-befe-db4253d66e1c', budget_category_id: 'ab5e648d-c280-44ad-a56d-8fc6e825f92a', budget_month: '2026-07-01', accounting_status: 'PENDING_SUBMISSION', allocation_amount: -60, notes: '' }],
  });
  await expect(page.locator('[data-bank-row="tx-1"]')).toContainText('דורש טיפול');
  await expect(page.locator('[data-bank-row="tx-1"] select[name="movement_type"]')).toBeVisible();
  await expect(page.locator('[data-bank-row="tx-1"] select[name="allocation_unit_id"]')).toBeVisible();
  await expect(page.locator('[data-bank-row="tx-1"] input[name="notes"]')).toBeVisible();
  await page.locator('[data-add-split="tx-1"]').click();
  await expect(page.locator('[data-bank-row="tx-1"]')).toHaveCount(2);
  await page.locator('[data-workflow="untreated"]').click();
  await expect(page.locator('[data-bank-row="tx-1"]')).toHaveCount(0);
  await expect(page.locator('[data-bank-row="tx-2"]')).toHaveCount(1);
  await page.locator('[data-workflow="all"]').click();
  await page.locator('[data-open-metadata="tx-1"]').first().click();
  await expect(page.getByText('מסמכים: 0')).toBeVisible();
  await expect(page.locator('#bank-new-details select')).toHaveCount(0);
});

test('Bank File supports selection checkboxes for future bulk actions', async ({ page }) => {
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks', portalAccessFixture, {
    accounts: [{ bank_account_id: 'account-1', display_name: 'חשבון מרכזי' }],
    transactions: [{ bank_transaction_id: 'tx-1', bank_account_id: 'account-1', transaction_date: '2026-07-24', description: 'חשמל', reference_number: '100', amount: -100, attachment_count: 0 }],
  });
  await page.locator('[data-select-transaction="tx-1"]').check();
  await expect(page.locator('#bank-selection-count')).toContainText('1 תנועות נבחרו');
  await page.locator('#bank-select-all').uncheck();
  await expect(page.locator('#bank-selection-count')).toContainText('לא נבחרו');
});

test('Bank File defaults to HIDDEN when the permission catalog has no explicit child row', async ({ page }) => {
  const legacySections = portalAccessFixture.sections.filter((item) => !item.screen_code.startsWith('dashboards.accounting.'));
  const access = { ...portalAccessFixture, profile: { ...portalAccessFixture.profile, is_super_admin: false }, sections: legacySections };
  await openAccounting(page, 'dashboards/unit/organization/accounting', access);
  await expect(page.locator('[data-accounting-screen="summary"]')).toBeVisible();
  await expect(page.locator('[data-accounting-screen="banks"]')).toHaveCount(0);
});
