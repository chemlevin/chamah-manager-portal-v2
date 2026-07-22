import { test, expect } from '@playwright/test';
import { mockNewPortalSupabase, openNewPortal } from './new-portal-test-data.mjs';

test.describe('TRACK 009 administration prototype', () => {
  test.beforeEach(async ({ page }) => { await mockNewPortalSupabase(page); });

  for (const screen of [
    { hash: 'training/tables/variables', title: 'משתנים', example: 'עלות מזון לילד' },
    { hash: 'training/tables/calculation', title: 'טבלאות חישוב', example: 'יחסי תקינה לפי גיל' },
    { hash: 'training/rules/calculation', title: 'כללי חישוב', example: 'תקינת תינוקות' }
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
});
