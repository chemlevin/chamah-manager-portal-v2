import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, expectCoreLayoutInsideViewport } from './qa-helpers.mjs';

test.describe('salary calculator QA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/salary/');
  });

  test('before calculation shows empty salary details', async ({ page }) => {
    await expect(page.locator('#empty-components')).toBeVisible();
    await expect(page.locator('#component-list .component-card')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test('after calculation shows salary result', async ({ page }) => {
    await page.locator('#hourly-wage').fill('40');
    await page.locator('#seniority').fill('5');
    await page.locator('#monthly-hours').fill('145');
    await page.locator('#role').selectOption('מובילה');
    await page.locator('#salary-form button[type="submit"]').click();
    await expect(page.locator('#estimated-gross')).not.toHaveText('₪0');
    await expect(page.locator('#net-range-summary')).not.toHaveText('₪0 - ₪0');
    await expect(page.locator('#component-list .component-card').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectCoreLayoutInsideViewport(page);
  });
});
