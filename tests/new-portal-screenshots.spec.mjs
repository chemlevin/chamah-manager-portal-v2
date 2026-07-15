import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const screenshots = [
  { name: 'desktop-home', width: 1440, height: 900 },
  { name: 'tablet-home', width: 820, height: 1180 },
  { name: 'mobile-home', width: 390, height: 844 }
];

test('captures the new portal foundation at required viewport sizes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440', 'A single browser project produces the canonical screenshots.');
  await mkdir('screenshots/new-portal-foundation', { recursive: true });
  await page.addInitScript(() => localStorage.setItem('chamah.portal.session', JSON.stringify({ access_token: 'visual-test-session', expires_at: 4102444800 })));

  for (const target of screenshots) {
    await page.setViewportSize({ width: target.width, height: target.height });
    await page.goto('/new/#home');
    await expect(page.locator('.module-card')).toHaveCount(5);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `screenshots/new-portal-foundation/${target.name}.png` });
  }
});
