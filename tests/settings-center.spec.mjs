import { test, expect } from '@playwright/test';
import { mockNewPortalSupabase, openNewPortal } from './new-portal-test-data.mjs';

test.describe('TRACK 013 Settings center', () => {
  test.beforeEach(async ({ page }) => { await mockNewPortalSupabase(page); });
  test('groups authoritative configuration by business subject', async ({ page }) => {
    await openNewPortal(page, 'training/settings');
    await expect(page.getByRole('heading', { name: 'הגדרות', exact: true })).toBeVisible();
    for (const name of ['תקופות ושנים', 'הארגון והמעונות', 'הפעלת מעונות וכיתות', 'כספים והנהלת חשבונות', 'צוות וכללים']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.getByText('Supabase', { exact: true })).toBeVisible();
  });
  test('uses linked selectors instead of manual IDs', async ({ page }) => {
    await openNewPortal(page, 'training/settings');
    await page.getByText('מעונות', { exact: true }).last().click();
    await page.getByRole('button', { name: 'עריכה' }).last().click();
    await expect(page.getByLabel('ישות משפטית')).toBeVisible();
    await expect(page.getByLabel('יחידת דיווח')).toBeVisible();
  });
  test('remains horizontally contained on mobile', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only');
    await openNewPortal(page, 'training/settings');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
});
