import { test, expect } from '@playwright/test';

test.describe('BANK_TRANSACTIONS workspace prototype', () => {
  test.skip(({ browserName }) => browserName !== 'chromium');

  test('keeps the spreadsheet primary and supports fast review', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.startsWith('mobile'), 'TRACK 010 is desktop-first.');
    await page.goto('/accounting/');
    await expect(page.getByRole('heading', { name: 'תנועות בנק' })).toBeVisible();
    await expect(page.locator('.transaction-row')).toHaveCount(7);
    await expect(page.locator('.bank-details')).toBeVisible();
    await expect(page.locator('.split-row')).toHaveCount(3);
    await page.screenshot({ path: `screenshots/track010/bank-transactions-${testInfo.project.name}.png`, fullPage: true });

    await page.getByRole('button', { name: 'דורש טיפול' }).click();
    await expect(page.locator('.transaction-row')).toHaveCount(3);

    await page.getByPlaceholder('חיפוש תיאור, אסמכתא או סכום…').fill('סופר נקי');
    await expect(page.locator('.transaction-row')).toHaveCount(1);

    await page.screenshot({ path: `screenshots/track010/bank-transactions-filtered-${testInfo.project.name}.png`, fullPage: true });
  });
});
