import { test, expect } from '@playwright/test';
import { mockNewPortalSupabase, openNewPortal } from './new-portal-test-data.mjs';

test.describe('new portal occupancy calculator', () => {
  test.beforeEach(async ({ page }) => {
    await mockNewPortalSupabase(page);
    await openNewPortal(page, 'calculators/occupancy');
    await expect(page.locator('#occupancy-calculator')).toBeVisible();
  });

  test('calculates children from area and always shows the required result sections', async ({ page }) => {
    await page.locator('[name="capacityAge"]').selectOption('INFANT');
    await page.locator('[name="area"]').fill('30');
    await expect(page.locator('#occupancy-results')).toBeVisible();
    await expect(page.locator('#occupancy-guidance')).toContainText('התחלת בשטח');
    await expect(page.locator('#occupancy-result-context')).toContainText('מ״ר ← ילדים');
    for (const label of ['תקינת ילדים','תקינת שטח','תקינת הרכב כיתה','צוות נדרש','הכנסה','יעילות','עלות שכר אופציונלית','יתרה משוערת']) await expect(page.locator('#occupancy-summary')).toContainText(label);
    await expect(page.locator('#occupancy-overall')).toContainText('סטטוס כללי');
    await expect(page.locator('#occupancy-recommendation')).toContainText('גורם מגביל');
    await expect(page.locator('#occupancy-alternatives')).toContainText('תינוקות');
  });

  test('calculates required area, validates both values, and keeps exports', async ({ page }) => {
    await page.locator('[name="age_INFANT"]').fill('7');
    await page.locator('[name="age_TODDLER"]').fill('10');
    await page.locator('[name="area"]').fill('40');
    await page.locator('[name="hourlyWage"]').fill('60');
    await expect(page.locator('#occupancy-result-context')).toContainText('בדיקת שטח ומספר ילדים');
    await expect(page.locator('#occupancy-summary')).toContainText('🔴 לא תקין');
    await expect(page.locator('#occupancy-summary')).toContainText('עלות שכר אופציונלית');
    await expect(page.locator('#occupancy-summary details').first()).toBeVisible();
    await page.locator('[name="area"]').fill('50');
    await expect(page.locator('#occupancy-summary')).not.toContainText('חסרים 5.6 מ״ר');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV' }).click();
    expect((await download).suggestedFilename()).toBe('occupancy-calculator.csv');
    await page.evaluate(() => { window.print = () => { document.body.dataset.printed = 'true'; }; });
    await page.getByRole('button', { name: 'הדפסה / PDF' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-printed', 'true');
  });

  test('stays within the viewport on focused responsive projects', async ({ page }) => {
    await page.locator('[name="area"]').fill('60');
    await expect(page.locator('#occupancy-results')).toBeVisible();
    const layout = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      offenders: [...document.querySelectorAll('body *')].filter((element) => { const rect = element.getBoundingClientRect(); return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1; }).map((element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.className && typeof element.className === 'string' ? `.${element.className.trim().replaceAll(' ', '.')}` : ''}`).slice(0, 10)
    }));
    expect(layout.overflow, layout.offenders.join(', ')).toBeLessThanOrEqual(1);
  });
});
