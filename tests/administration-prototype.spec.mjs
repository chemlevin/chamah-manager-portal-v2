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

  for (const screen of [
    { hash: 'training/tables/variables', title: 'שיעור תפוסה חודשי' },
    { hash: 'training/rules/calculation', title: 'תקינת צוות לתינוקות' }
  ]) {
    test(`${screen.title} exposes its complete demo data flow and dependency graph`, async ({ page }) => {
      await openNewPortal(page, screen.hash);
      await page.getByRole('button', { name: 'עריכה' }).first().click();
      const flow = page.getByRole('region', { name: 'זרימת נתונים' });
      await expect(flow).toBeVisible();
      await expect(flow.locator('.metadata-flow li')).toHaveCount(6);
      await expect(flow.locator('.metadata-flow > li > small')).toHaveText(['מקור', 'שדה', 'מסננים', 'צבירה', 'משתנה תוצאה', 'בשימוש אצל']);
      await expect(flow.getByRole('heading', { name: 'תלוי ב־' })).toBeVisible();
      await expect(flow.getByRole('heading', { name: 'תלויים בו' })).toBeVisible();
      await expect(flow.locator('.metadata-reference-list a').first()).toBeVisible();
    });
  }

  test('impact analysis lists all five affected metadata categories before save', async ({ page }) => {
    await openNewPortal(page, 'training/tables/variables');
    await page.getByRole('button', { name: 'עריכה' }).first().click();
    const impact = page.getByRole('region', { name: 'ניתוח השפעה' });
    await expect(impact).toBeVisible();
    for (const label of ['משתנים מושפעים', 'כללים מושפעים', 'לוחות מחוונים מושפעים', 'דוחות מושפעים', 'חישובים מושפעים']) {
      await expect(impact.getByText(label, { exact: true })).toBeVisible();
    }
    const save = page.getByRole('button', { name: 'שמירה' });
    await expect(impact).toBeVisible();
    await expect(save).toBeVisible();
  });

  test('where-used inspector is available from variables, tables and rules', async ({ page }) => {
    for (const hash of ['training/tables/variables', 'training/tables/calculation', 'training/rules/calculation']) {
      await openNewPortal(page, hash);
      await page.getByRole('button', { name: 'איפה בשימוש?' }).first().click();
      const inspector = page.getByRole('dialog', { name: 'איפה זה נמצא בשימוש?' });
      await expect(inspector).toBeVisible();
      await expect(inspector.getByRole('heading', { name: 'תלוי ב־' })).toBeVisible();
      await expect(inspector.getByRole('heading', { name: 'תלויים בו' })).toBeVisible();
      await expect(inspector.getByRole('heading', { name: 'כל המקומות שמפנים לרשומה' })).toBeVisible();
      await expect(inspector.locator('.metadata-reference-list a').first()).toBeVisible();
      await inspector.getByRole('button', { name: 'סגירה' }).click();
    }
  });

  test('calculation preview updates its demo result step by step', async ({ page }) => {
    await openNewPortal(page, 'training/rules/calculation');
    await page.getByRole('button', { name: 'עריכה' }).first().click();
    const preview = page.getByRole('region', { name: 'תצוגה מקדימה של החישוב' });
    await expect(preview.locator('.metadata-preview-steps li')).toHaveCount(3);
    await expect(preview.locator('[data-preview-result]')).toContainText('זכאות');
    await preview.getByLabel('ערך לדוגמה').fill('2');
    await preview.getByLabel('סף להשוואה').fill('5');
    await expect(preview.locator('[data-preview-result]')).toContainText('ללא זכאות');
  });

  test('designer remains horizontally contained on narrow mobile', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only responsive assertion');
    await openNewPortal(page, 'training/tables/variables');
    await page.getByRole('button', { name: 'עריכה' }).first().click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await expect(page.locator('.metadata-flow')).toHaveCSS('overflow-x', 'auto');
  });
});
