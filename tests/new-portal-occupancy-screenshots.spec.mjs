import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { mockNewPortalSupabase, openNewPortal } from './new-portal-test-data.mjs';

const viewports = [
  { name: 'desktop-occupancy', width: 1440, height: 900 },
  { name: 'tablet-occupancy', width: 820, height: 1180 },
  { name: 'mobile-occupancy', width: 390, height: 844 }
];

test('captures occupancy calculator at desktop, tablet, and mobile sizes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440', 'A single browser project produces the canonical screenshots.');
  await mkdir('screenshots/new-portal-occupancy', { recursive: true });
  await mockNewPortalSupabase(page);

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openNewPortal(page, 'calculators/occupancy');
    await expect(page.locator('#occupancy-calculator')).toBeVisible();
    await page.locator('[name="area"]').fill('60');
    await page.getByRole('button', { name: 'חישוב' }).click();
    await expect(page.locator('#occupancy-results')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.evaluate(() => { scrollTo(0, 0); document.querySelector('#mobile-nav').style.position = 'absolute'; });
    await page.screenshot({ path: `screenshots/new-portal-occupancy/${viewport.name}.png`, fullPage: true });
  }
});
