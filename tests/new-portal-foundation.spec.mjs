import { test, expect } from '@playwright/test';

const openPortal = async (page, route = 'home') => {
  await page.route('https://vyyfuaqmbxvfqgbfqooc.supabase.co/auth/v1/user', (request) => request.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'visual-test-user' }) }));
  await page.addInitScript(() => localStorage.setItem('chamah.portal.session', JSON.stringify({ access_token: 'visual-test-session', refresh_token: 'visual-test-refresh', expires_at: 4102444800 })));
  await page.goto(`/new/#${route}`);
};

test.describe('new portal foundation', () => {
  test('renders the Hebrew RTL home and five navigation cards', async ({ page }) => {
    await openPortal(page);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('ברוכה הבאה');
    await expect(page.locator('.module-card')).toHaveCount(5);
    await expect(page.locator('.module-card[href="#dashboards"]')).toBeVisible();
    await expect(page.locator('.module-card[href="#knowledge"]')).toBeVisible();
  });

  test('opens a consistent coming-soon screen from a module card', async ({ page }) => {
    await openPortal(page);
    await page.locator('.module-card[href="#tasks"]').click();
    await expect(page.getByRole('heading', { level: 1, name: 'משימות' })).toBeVisible();
    await expect(page.getByText('בקרוב', { exact: true })).toBeVisible();
    await expect(page.locator('#breadcrumbs')).toContainText('עמוד הבית/משימות');
  });

  test('keeps the shell inside the viewport and exposes mobile navigation', async ({ page }, testInfo) => {
    await openPortal(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    if (testInfo.project.name.startsWith('mobile')) {
      await expect(page.locator('#mobile-nav')).toBeVisible();
      await page.locator('#mobile-more').click();
      await expect(page.locator('#sidebar')).toHaveClass(/open/);
      await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'true');
    } else {
      await expect(page.locator('#sidebar')).toBeVisible();
    }
  });
});
