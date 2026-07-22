import { test, expect } from '@playwright/test';
import { mockNewPortalSupabase, openNewPortal } from './new-portal-test-data.mjs';

const routes = [
  ['payroll', 'שכר', ['payroll/calculations']],
  ['payroll/calculations', 'חישובי שכר', ['payroll/calculations/new', 'payroll/calculations/existing', 'payroll/calculations/history']],
  ['payroll/calculations/new', 'חדש', []],
  ['payroll/calculations/existing', 'קיים', []],
  ['payroll/calculations/history', 'טבלאות עבר', []],
  ['training', 'הרשאות וטבלאות', ['training/guides', 'training/permissions']],
  ['training/guides', 'טבלאות', []],
  ['training/permissions', 'הרשאות', []]
];

const openPortal = async (page, route) => {
  await page.route('https://vyyfuaqmbxvfqgbfqooc.supabase.co/auth/v1/user', (request) => request.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'sections-test-user' }) }));
  await page.addInitScript(() => localStorage.setItem('chamah.portal.session', JSON.stringify({ access_token: 'sections-test-session', refresh_token: 'sections-test-refresh', expires_at: 4102444800 })));
  await page.goto(`/new/#${route}`);
};

test.describe('payroll and training portal sections', () => {
  for (const [route, heading, cards] of routes) {
    test(`${route} renders with navigation and breadcrumbs`, async ({ page }) => {
      const errors = [];
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('pageerror', (error) => errors.push(error.message));
      await openPortal(page, route);

      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.locator('#breadcrumbs [aria-current="page"]')).toHaveText(heading);
      await expect(page.locator(`[data-route="${route.startsWith('payroll') ? 'payroll' : 'training'}"].active`)).toHaveCount(1);
      for (const card of cards) await expect(page.locator(`.module-card[href="#${card}"]`)).toBeVisible();
      if (!cards.length) await expect(page.getByText('זהו עמוד מציין מקום בלבד.')).toBeVisible();

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      expect(errors).toEqual([]);
    });
  }

  test('desktop and mobile navigation expose the renamed and dashboard-backed sections', async ({ page }, testInfo) => {
    await openPortal(page, 'home');
    if (testInfo.project.name.startsWith('mobile')) {
      await expect(page.locator('#mobile-nav [data-route="staffing"]')).toBeVisible();
      await expect(page.locator('#mobile-nav [data-route="accounting"]')).toBeVisible();
      await page.locator('#mobile-more').click();
      await page.locator('#primary-nav [data-route="training"]').click();
    } else {
      await expect(page.locator('#primary-nav [data-route="payroll"]')).toBeVisible();
      await expect(page.locator('#primary-nav [data-route="training"]')).toBeVisible();
      await expect(page.locator('#primary-nav [data-route="staffing"]')).toBeVisible();
      await expect(page.locator('#primary-nav [data-route="accounting"]')).toBeVisible();
      await page.locator('#primary-nav [data-route="training"]').click();
    }
    await expect(page.getByRole('heading', { level: 1, name: 'הרשאות וטבלאות' })).toBeVisible();
  });

  test('top-level staff and accounting links reuse the organization dashboards', async ({ page }) => {
    await mockNewPortalSupabase(page);
    await openNewPortal(page, 'home');

    await page.locator('.module-card[href="#dashboards/unit/organization/staffing"]').click();
    await expect(page).toHaveURL(/#dashboards\/unit\/organization\/staffing$/);
    await expect(page.getByRole('heading', { level: 1, name: 'דשבורד צוות ורישוי · כלל הארגון' })).toBeVisible();
    await expect(page.locator('[data-route="staffing"].active')).toHaveCount(2);
    await expect(page.locator('[data-route="dashboards"].active')).toHaveCount(0);
    await expect(page.locator('#breadcrumbs [aria-current="page"]')).toHaveText('צוות ורישוי');

    await page.locator('[data-route="accounting"]:visible').click();
    await expect(page).toHaveURL(/#dashboards\/unit\/organization\/accounting$/);
    await expect(page.getByRole('heading', { level: 1, name: 'דשבורד הנהלת חשבונות · כלל הארגון' })).toBeVisible();
    await expect(page.locator('[data-route="accounting"].active')).toHaveCount(2);
    await expect(page.locator('[data-route="dashboards"].active')).toHaveCount(0);
    await expect(page.locator('#breadcrumbs [aria-current="page"]')).toHaveText('הנה״ח');
  });
});
