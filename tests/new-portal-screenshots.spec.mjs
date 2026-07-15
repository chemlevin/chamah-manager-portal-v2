import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { activeDaycareId, mockNewPortalSupabase, openNewPortal } from './new-portal-test-data.mjs';

const screenshots = [
  { name: 'desktop-organizational-units', width: 1440, height: 900, route: 'dashboards', ready: '.unit-card' },
  { name: 'tablet-financial-dashboard', width: 820, height: 1180, route: `dashboards/unit/${activeDaycareId}/finance`, ready: '#general-dashboard' },
  { name: 'desktop-organization-finance', width: 1440, height: 900, route: 'dashboards/unit/organization/finance', ready: '#general-dashboard' },
  { name: 'mobile-organizational-units', width: 390, height: 844, route: 'dashboards', ready: '.unit-card' },
  { name: 'mobile-financial-dashboard', width: 390, height: 844, route: `dashboards/unit/${activeDaycareId}/finance`, ready: '#general-dashboard' }
];

test('captures the new portal foundation at required viewport sizes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440', 'A single browser project produces the canonical screenshots.');
  await mkdir('screenshots/new-portal-dashboards', { recursive: true });
  await mockNewPortalSupabase(page);

  for (const target of screenshots) {
    await page.setViewportSize({ width: target.width, height: target.height });
    await openNewPortal(page, target.route);
    await expect.poll(() => page.locator(target.ready).count()).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `screenshots/new-portal-dashboards/${target.name}.png` });
  }
});
