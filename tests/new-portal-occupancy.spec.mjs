import { test, expect } from '@playwright/test';
import { mockNewPortalSupabase, openNewPortal } from './new-portal-test-data.mjs';

test.describe('new portal occupancy calculator', () => {
  test.beforeEach(async ({ page }) => {
    await mockNewPortalSupabase(page);
    await openNewPortal(page, 'calculators/occupancy');
    await expect(page.locator('#occupancy-calculator')).toBeVisible();
  });

  test('loads an existing classroom and shows unified efficiency results without wage', async ({ page }) => {
    await expect(page.locator('[name="age_INFANT"]')).toHaveValue('18');
    await page.locator('[name="area"]').fill('60');
    await page.getByRole('button', { name: 'חישוב' }).click();
    await expect(page.locator('#occupancy-results')).toBeVisible();
    await expect(page.locator('#occupancy-summary')).toContainText('תקינת ילדים');
    await expect(page.locator('#occupancy-summary')).toContainText('תקינת שטח');
    await expect(page.locator('#occupancy-summary')).toContainText('צוות נדרש');
    await expect(page.locator('#occupancy-summary')).toContainText('הכנסה');
    await expect(page.locator('#occupancy-summary')).toContainText('יעילות');
    await expect(page.locator('#occupancy-financial')).toContainText('לא הוזן שכר שעתי');
    await expect(page.locator('#occupancy-alternatives')).toContainText('תינוקות');
  });

  test('supports planning composition, optional wage, print and CSV', async ({ page }) => {
    await page.getByLabel('כיתה חדשה / תכנון').check();
    await expect(page.locator('#occupancy-existing-fields')).toBeHidden();
    await page.locator('[name="age_INFANT"]').fill('7');
    await page.locator('[name="age_TODDLER"]').fill('10');
    await page.locator('[name="area"]').fill('50');
    await page.locator('[name="hourlyWage"]').fill('60');
    await page.getByRole('button', { name: 'חישוב' }).click();
    await expect(page.locator('#occupancy-financial')).toContainText('עלות שכר');
    await expect(page.locator('#occupancy-financial')).toContainText('עודף');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV' }).click();
    expect((await download).suggestedFilename()).toBe('occupancy-calculator.csv');
    await page.evaluate(() => { window.print = () => { document.body.dataset.printed = 'true'; }; });
    await page.getByRole('button', { name: 'הדפסה / PDF' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-printed', 'true');
  });

  test('stays within the viewport on focused responsive projects', async ({ page }) => {
    await page.locator('[name="area"]').fill('60');
    await page.getByRole('button', { name: 'חישוב' }).click();
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      offenders: [...document.querySelectorAll('body *')].filter((element) => { const rect = element.getBoundingClientRect(); return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1; }).map((element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.className && typeof element.className === 'string' ? `.${element.className.trim().replaceAll(' ', '.')}` : ''}`).slice(0, 10)
    }));
    expect(layout.overflow, layout.offenders.join(', ')).toBeLessThanOrEqual(1);
  });
});
