import { test, expect } from '@playwright/test';
import { mockNewPortalSupabase, openNewPortal } from './new-portal-test-data.mjs';

test.describe('guided occupancy calculator', () => {
  test.beforeEach(async ({ page }) => {
    await mockNewPortalSupabase(page);
    await openNewPortal(page, 'calculators/occupancy');
    await expect(page.locator('#occupancy-calculator')).toBeVisible();
    await expect(page.getByText('כיתה קיימת')).toHaveCount(0);
    await expect(page.getByText('מצב חישוב')).toHaveCount(0);
  });

  async function choose(page, classroom, known) {
    await page.locator(`[name="classroomType"][value="${classroom}"]`).check();
    await page.locator(`[name="knownType"][value="${known}"]`).check();
    await expect(page.locator('#occupancy-data-step')).toBeVisible();
  }

  for (const classroom of ['INFANT', 'TODDLER', 'GRADUATE']) {
    test(`calculates area-only capacity for ${classroom}`, async ({ page }) => {
      await choose(page, classroom, 'AREA');
      await page.locator('[name="area"]').fill('30');
      await expect(page.locator('#occupancy-results')).toBeVisible();
      await expect(page.locator('[name="calculatedCapacity"]')).not.toHaveValue('');
      await expect(page.locator('[name="calculatedCapacity"]')).toHaveAttribute('readonly', '');
      await expect(page.locator('#occupancy-result-context')).toContainText('שטח ← קיבולת ילדים');
    });
  }

  test('calculates required area from children and validates both values live', async ({ page }) => {
    await choose(page, 'TODDLER', 'CHILDREN');
    await page.locator('[name="age_TODDLER"]').fill('10');
    await expect(page.locator('[name="calculatedArea"]')).toHaveValue(/26/);
    await page.locator('[name="knownType"][value="BOTH"]').check();
    await page.locator('[name="area"]').fill('20');
    await page.locator('[name="age_TODDLER"]').fill('10');
    await expect(page.locator('#occupancy-summary')).toContainText('חסרים 6 מ״ר');
    await page.locator('[name="area"]').fill('30');
    await expect(page.locator('#occupancy-overall')).toContainText('🟢 תקין');
  });

  test('requires complete and legal mixed composition even when area is known', async ({ page }) => {
    await choose(page, 'MIXED', 'AREA');
    await page.getByRole('button', { name: 'חשבי תוצאה' }).click();
    await expect(page.locator('#occupancy-validation')).toContainText('בדיוק שתי קבוצות');
    await page.locator('[name="mixedAge"][value="INFANT"]').check();
    await page.locator('[name="mixedAge"][value="GRADUATE"]').check();
    await expect(page.locator('#occupancy-validation')).toContainText('אינו מותר');
    await page.locator('[name="mixedAge"][value="GRADUATE"]').uncheck();
    await page.locator('[name="mixedAge"][value="TODDLER"]').check();
    await page.locator('[name="area"]').fill('50');
    await page.locator('[name="age_INFANT"]').fill('7');
    await page.locator('[name="age_TODDLER"]').fill('10');
    await expect(page.locator('#occupancy-results')).toBeVisible();
    await expect(page.locator('#occupancy-summary')).toContainText('הרכב כיתה מעורבת');
  });

  for (const known of ['CHILDREN', 'BOTH']) {
    test(`calculates a complete mixed classroom for ${known}`, async ({ page }) => {
      await choose(page, 'MIXED', known);
      await page.locator('[name="mixedAge"][value="INFANT"]').check();
      await page.locator('[name="mixedAge"][value="TODDLER"]').check();
      if (known === 'BOTH') await page.locator('[name="area"]').fill('50');
      await page.locator('[name="age_INFANT"]').fill('7');
      await page.locator('[name="age_TODDLER"]').fill('10');
      await expect(page.locator('#occupancy-results')).toBeVisible();
      await expect(page.locator('#occupancy-overall')).toContainText('🟢 תקין');
    });
  }

  test('shows calculation explanations, payroll, legal cards, and exports', async ({ page }) => {
    await choose(page, 'INFANT', 'BOTH');
    await page.locator('[name="area"]').fill('40');
    await page.locator('[name="age_INFANT"]').fill('10');
    await page.locator('[name="hourlyWage"]').fill('60');
    for (const label of ['קיבולת ילדים','שטח נדרש','הרכב כיתה מעורבת','צוות נדרש','הכנסה משוערת','יעילות תפוסה','עלות שכר משוערת','יתרה משוערת']) await expect(page.locator('#occupancy-summary')).toContainText(label);
    await expect(page.locator('#occupancy-summary details')).toHaveCount(8);
    await expect(page.locator('.occupancy-alternative-card').first()).toContainText('מומלצת');
    await expect(page.locator('#occupancy-alternatives')).not.toContainText('תינוקות: 22');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV' }).click();
    expect((await download).suggestedFilename()).toBe('occupancy-calculator.csv');
  });

  test('stays within the viewport', async ({ page }) => {
    await choose(page, 'GRADUATE', 'AREA');
    await page.locator('[name="area"]').fill('60');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
