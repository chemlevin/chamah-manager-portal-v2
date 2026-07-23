import { test, expect } from '@playwright/test';

test.describe('BANK_TRANSACTIONS workspace prototype', () => {
  test.skip(({ browserName }) => browserName !== 'chromium');

  test('keeps the production spreadsheet controls with an empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.startsWith('mobile'), 'TRACK 010 is desktop-first.');
    await page.goto('/accounting/');
    await expect(page.getByRole('heading', { name: 'תנועות בנק' })).toBeVisible();
    await expect(page.locator('.transaction-row')).toHaveCount(0);
    await expect(page.locator('.bank-details')).toBeHidden();
    await expect(page.getByText('אין תנועות בנק להצגה')).toBeVisible();
    await expect(page.getByPlaceholder('חיפוש תיאור, אסמכתא או סכום…')).toBeVisible();
    await expect(page.getByLabel('סינון וחיפוש')).toBeVisible();
    await expect(page.getByText(/דמו|הדגמה|נתוני הדגמה/)).toHaveCount(0);
    await page.screenshot({ path: `screenshots/track010/bank-transactions-${testInfo.project.name}.png`, fullPage: true });

    await page.getByRole('button', { name: 'דורש טיפול' }).click();
    await expect(page.locator('.transaction-row')).toHaveCount(0);

    await page.getByPlaceholder('חיפוש תיאור, אסמכתא או סכום…').fill('חיפוש ללא תוצאות');
    await expect(page.locator('.transaction-row')).toHaveCount(0);

    await page.screenshot({ path: `screenshots/track010/bank-transactions-filtered-${testInfo.project.name}.png`, fullPage: true });
  });
});
