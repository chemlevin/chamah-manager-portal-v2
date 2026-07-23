import { test, expect } from '@playwright/test';
import { mockNewPortalSupabase, openNewPortal } from './new-portal-test-data.mjs';

const screens = [
  { hash: 'training/tables/variables', title: 'משתנים', add: 'הוספת משתנה', empty: 'אין משתנים להצגה' },
  { hash: 'training/tables/calculation', title: 'טבלאות חישוב', add: 'הוספת טבלת חישוב', empty: 'אין טבלאות חישוב להצגה' },
  { hash: 'training/rules/calculation', title: 'כללי חישוב', add: 'הוספת כלל', empty: 'אין כללי חישוב להצגה' }
];

test.describe('production Administration empty states', () => {
  test.beforeEach(async ({ page }) => { await mockNewPortalSupabase(page); });

  for (const screen of screens) {
    test(`${screen.title} uses the shared production layout and empty state`, async ({ page }) => {
      await openNewPortal(page, screen.hash);
      await expect(page.getByRole('heading', { name: screen.title, exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: screen.add })).toBeVisible();
      await expect(page.getByLabel('חיפוש')).toBeVisible();
      await expect(page.locator('.admin-toolbar')).toBeVisible();
      await expect(page.getByText(screen.empty, { exact: true })).toBeVisible();
      await expect(page.locator('.admin-table tbody tr')).toHaveCount(0);
      await expect(page.getByText('0 תוצאות', { exact: true })).toBeVisible();
      await expect(page.getByText(/דמו|הדגמה|לדוגמה/)).toHaveCount(0);
      await page.getByRole('button', { name: screen.add }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('button', { name: 'שמירה' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'ביטול' })).toBeVisible();
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'ביטול' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    });
  }

  test('Calculation Tables preserves add, edit, duplicate, status and delete behavior from an empty state', async ({ page }) => {
    await openNewPortal(page, 'training/tables/calculation');
    await page.getByRole('button', { name: 'הוספת טבלת חישוב' }).click();
    await page.getByLabel('קוד טבלה *').fill('PRODUCTION_TABLE');
    await page.getByLabel('שם הטבלה *').fill('טבלת ייצור');
    await page.getByLabel('גרסה *').fill('1');
    await page.getByRole('button', { name: 'שמירה' }).click();
    await expect(page.locator('.admin-table tbody tr')).toHaveCount(1);
    await expect(page.getByText('טבלת ייצור', { exact: true })).toBeVisible();
    for (const action of ['עריכה', 'איפה בשימוש?', 'שכפול', 'השבתה', 'מחיקה']) {
      await expect(page.getByRole('button', { name: action })).toBeVisible();
    }
    await page.getByRole('button', { name: 'עריכה' }).click();
    await page.getByLabel('שם הטבלה *').fill('טבלת ייצור מעודכנת');
    await page.getByRole('button', { name: 'שמירה' }).click();
    await expect(page.getByText('טבלת ייצור מעודכנת', { exact: true })).toBeVisible();
  });

  test('variable and rule editors preserve production metadata controls without seeded records', async ({ page }) => {
    for (const route of ['training/tables/variables', 'training/rules/calculation']) {
      await openNewPortal(page, route);
      await page.getByRole('button', { name: /הוספת (משתנה|כלל)/ }).click();
      await expect(page.getByLabel('מקור נתונים *').locator('option')).toHaveCount(7);
      await expect(page.getByLabel('שדה מקור *')).toBeDisabled();
      await expect(page.getByRole('region', { name: 'זרימת נתונים' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'ניתוח השפעה' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'תצוגה מקדימה של החישוב' })).toBeVisible();
      await expect(page.getByLabel('ערך לבדיקה')).toHaveValue('0');
      await page.getByRole('button', { name: 'ביטול' }).click();
    }
  });

  test('Administration empty states remain horizontally contained on mobile', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only responsive assertion');
    for (const screen of screens) {
      await openNewPortal(page, screen.hash);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    }
  });
});
