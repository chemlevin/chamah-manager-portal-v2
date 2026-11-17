import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const build = (buildId) => execFileSync(process.execPath, ['scripts/build.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORTAL_BUILD_ID: buildId },
  stdio: 'pipe'
});

test.describe('saved-app build updates', () => {
  test.beforeAll(() => build('track050-old'));
  test.afterAll(() => build('track050-current'));

  test('activates a new build, reloads versioned assets, and retains an offline shell', async ({ page, context, browserName }) => {
    await page.goto('/');
    await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.ready).active));
    await page.reload();

    await expect(page.locator('script[src="app.js?v=track050-old"]')).toHaveCount(1);
    expect(await page.evaluate(() => [...performance.getEntriesByType('resource')].some((entry) => entry.name.includes('app.js?v=track050-old')))).toBe(true);

    build('track050-new');
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration.update();
    });
    await expect(page.locator('script[src="app.js?v=track050-new"]')).toHaveCount(1, { timeout: 15_000 });
    expect(await page.evaluate(() => [...performance.getEntriesByType('resource')].some((entry) => entry.name.includes('app.js?v=track050-new')))).toBe(true);
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter((name) => name.startsWith('chamah-portal-')))).toEqual(['chamah-portal-track050-new']);

    // Playwright WebKit cannot reliably emulate a disconnected iOS process reload.
    // The WebKit project still verifies the complete installed old-to-new controller handoff above.
    if (browserName === 'webkit') return;
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#login-view')).toBeAttached();
    await expect(page.locator('script[src="app.js?v=track050-new"]')).toHaveCount(1);
    await context.setOffline(false);
  });
});
