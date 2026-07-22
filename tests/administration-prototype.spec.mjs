import { test, expect } from '@playwright/test';
import { mockNewPortalSupabase, openNewPortal } from './new-portal-test-data.mjs';

test.describe('TRACK 009 administration prototype', () => {
  test.beforeEach(async ({ page }) => { await mockNewPortalSupabase(page); });

  for (const screen of [
    { hash: 'training/tables/variables', title: 'משתנים', example: 'הוצאות בנק חודשיות' },
    { hash: 'training/tables/calculation', title: 'טבלאות חישוב', example: 'יחסי תקינה לפי גיל' },
    { hash: 'training/rules/calculation', title: 'כללי חישוב', example: 'תקינת צוות לתינוקות' }
  ]) {
    test(`${screen.title} supports prototype CRUD controls`, async ({ page }) => {
      await openNewPortal(page, screen.hash);
      await expect(page.getByRole('heading', { name: screen.title, exact: true })).toBeVisible();
      await expect(page.getByText(screen.example, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'עריכה' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'שכפול' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /השבתה|הפעלה/ }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'מחיקה' }).first()).toBeVisible();
      await page.getByLabel('חיפוש').fill(screen.example);
      await expect(page.locator('.admin-table tbody tr')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    });
  }

  test('variables expose required metadata while keeping the English code advanced', async ({ page }) => {
    await openNewPortal(page, 'training/tables/variables');
    await page.getByRole('button', { name: 'עריכה' }).first().click();
    await expect(page.getByLabel('כותרת *')).toBeVisible();
    await expect(page.getByLabel('תיאור *')).toBeVisible();
    await expect(page.getByLabel('סוג נתון *')).toBeVisible();
    await expect(page.getByLabel('יחידת מידה *')).toBeVisible();
    await expect(page.getByText('פרטים טכניים מתקדמים')).toBeVisible();
    await expect(page.getByLabel('קוד משתנה *')).not.toBeVisible();
    await page.getByText('פרטים טכניים מתקדמים').click();
    await expect(page.getByLabel('קוד משתנה *')).toHaveValue('MONTHLY_BANK_EXPENSES');
  });

  test('source and field selections drive valid dependent options', async ({ page }) => {
    await openNewPortal(page, 'training/rules/calculation');
    await page.getByRole('button', { name: 'עריכה' }).first().click();
    const source = page.getByLabel('מקור נתונים *');
    await expect(source.locator('option')).toHaveCount(7);
    await source.selectOption('PAYROLL');
    const field = page.getByLabel('שדה מקור *');
    await expect(field.locator('option')).toHaveCount(5);
    await expect(field.locator('option')).toContainText(['בחירה', 'עלות מעסיק', 'שעות רגילות', 'חודש שכר', 'עובדת']);
    await field.selectOption('payroll_month');
    const operation = page.getByLabel('סינון או תנאי *');
    await expect(operation.locator('option')).toHaveCount(3);
    await expect(operation.locator('option')).toContainText(['בחירה', 'בתקופה', 'שווה ל־']);
    await expect(page.locator('input[name="source_code"], input[name="source_field"]')).toHaveCount(0);
  });
});
