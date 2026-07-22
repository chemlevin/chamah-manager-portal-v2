import { test, expect } from '@playwright/test';
import { portalAccessFixture } from './new-portal-test-data.mjs';

const base = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';

async function openAccounting(page, route, access = portalAccessFixture) {
  await page.addInitScript(() => localStorage.setItem('chamah.portal.session', JSON.stringify({ access_token: 'accounting-access', refresh_token: 'accounting-refresh', expires_at: 4102444800 })));
  await page.route(`${base}/auth/v1/user`, (request) => request.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route(`${base}/rest/v1/rpc/portal_my_access**`, (request) => request.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(access) }));
  await page.route(`${base}/rest/v1/allocation_units**`, (request) => request.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.goto(`/new/#${route}`);
}

test('Accounting presents Summary Dashboard and Bank File as equal sibling choices', async ({ page }) => {
  await openAccounting(page, 'dashboards/unit/organization/accounting');
  await expect(page.getByRole('heading', { name: 'הנה״ח', exact: true })).toBeVisible();
  await expect(page.locator('.accounting-choice-grid .dashboard-type-card')).toHaveCount(2);
  await expect(page.locator('[data-accounting-screen="summary"]')).toContainText('דשבורד סיכום');
  await expect(page.locator('[data-accounting-screen="banks"]')).toContainText('קובץ בנקים');
});

test('Bank File reuses the spreadsheet workspace with mock data and preserved hierarchy', async ({ page }) => {
  await openAccounting(page, 'dashboards/unit/organization/accounting/banks');
  await expect(page.getByRole('heading', { name: 'קובץ בנקים' })).toBeVisible();
  await expect(page.locator('#breadcrumbs')).toContainText('הנה״ח/קובץ בנקים');
  await expect(page.locator('#bank-new-rows [data-bank-row]')).toHaveCount(6);
  await expect(page.locator('.bank-split-row')).toHaveCount(3);
  await expect(page.locator('#bank-new-details')).toContainText('ארנונה עיריית ירושלים');
  await page.getByRole('button', { name: 'דורש טיפול' }).click();
  await expect(page.locator('#bank-new-rows [data-bank-row]')).toHaveCount(3);
});

test('Bank File defaults to HIDDEN when the permission catalog has no explicit child row', async ({ page }) => {
  const legacySections = portalAccessFixture.sections.filter((item) => !item.screen_code.startsWith('dashboards.accounting.'));
  const access = { ...portalAccessFixture, profile: { ...portalAccessFixture.profile, is_super_admin: false }, sections: legacySections };
  await openAccounting(page, 'dashboards/unit/organization/accounting', access);
  await expect(page.locator('[data-accounting-screen="summary"]')).toBeVisible();
  await expect(page.locator('[data-accounting-screen="banks"]')).toHaveCount(0);
});
