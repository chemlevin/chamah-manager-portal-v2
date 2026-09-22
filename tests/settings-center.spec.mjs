import { test, expect } from '@playwright/test';
import { mockNewPortalSupabase, openNewPortal } from './new-portal-test-data.mjs';

test.describe('TRACK 013 Settings center', () => {
  test.beforeEach(async ({ page }) => { await mockNewPortalSupabase(page); });
  test('groups authoritative configuration by business subject', async ({ page }) => {
    await openNewPortal(page, 'training/settings');
    await expect(page.getByRole('heading', { name: 'הגדרות', exact: true })).toBeVisible();
    for (const name of ['תקופות ושנים', 'הארגון והמעונות', 'הפעלת מעונות וכיתות', 'כספים והנהלת חשבונות', 'צוות וכללים']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.getByText('Supabase', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'חזרה', exact: true })).toBeVisible();
    await expect(page.locator('.settings-card')).toHaveCount(22);
    await expect(page.locator('.settings-card[open]')).toHaveCount(0);
  });
  test('uses linked selectors instead of manual IDs', async ({ page }) => {
    await openNewPortal(page, 'training/settings');
    await page.getByText('מעונות', { exact: true }).last().click();
    await page.getByRole('button', { name: 'עריכה' }).last().click();
    await expect(page.getByLabel('ישות משפטית')).toBeVisible();
    await expect(page.getByLabel('יחידת דיווח')).toBeVisible();
  });
  test('remains horizontally contained on mobile', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile-only');
    await openNewPortal(page, 'training/settings');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });

  test('provides collapsed rule accordions and complete inline help for every rule group', async ({ page }) => {
    await openNewPortal(page, 'training/settings');
    const ruleSection = page.locator('#settings-rules');
    await expect(ruleSection.locator('.settings-card')).toHaveCount(9);
    await expect(ruleSection.locator('.settings-card[open]')).toHaveCount(0);
    for (const card of await ruleSection.locator('.settings-card').all()) {
      await card.locator('summary').click();
      await card.getByRole('button', { name: 'עזרה', exact: true }).click();
      const help = card.locator('.settings-help');
      for (const label of ['מטרה', 'לוגיקה עסקית', 'תלויות', 'מודולים מושפעים', 'שדות חובה', 'השפעת שינוי']) await expect(help.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('completes create, update and archive with validation', async ({ page }) => {
    await openNewPortal(page, 'training/settings');
    const roles = page.locator('.settings-card').filter({ has: page.getByText('תפקידים', { exact: true }) });
    await roles.locator('summary').click();
    await roles.getByRole('button', { name: 'הוספה' }).click();
    await page.getByRole('button', { name: 'שמירה' }).click();
    await expect(page.getByRole('alert')).toContainText('שם התפקיד הוא שדה חובה');
    await page.getByLabel('שם התפקיד *').fill('תפקיד בדיקה');
    await page.getByLabel('קוד קבוע *').fill('TEST_ROLE');
    await page.getByLabel('מצב *').selectOption('ACTIVE');
    await page.getByRole('button', { name: 'שמירה' }).click();
    await expect(page.getByRole('status')).toContainText('נשמרה בהצלחה');

    await roles.locator('summary').click();
    const created = roles.locator('article').filter({ hasText: 'תפקיד בדיקה' });
    await created.getByRole('button', { name: 'עריכה' }).click();
    await page.getByLabel('שם התפקיד *').fill('תפקיד מעודכן');
    await page.getByRole('button', { name: 'שמירה' }).click();
    await roles.locator('summary').click();
    await expect(roles).toContainText('תפקיד מעודכן');

    await roles.locator('article').filter({ hasText: 'תפקיד מעודכן' }).getByRole('button', { name: 'עריכה' }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'השבתה / העברה לארכיון' }).click();
    await expect(page.getByRole('status')).toContainText('הושבתה');
    await roles.locator('summary').click();
    await roles.locator('article').filter({ hasText: 'תפקיד מעודכן' }).getByRole('button', { name: 'עריכה' }).click();
    await expect(page.getByLabel('מצב *')).toHaveValue('ARCHIVED');
  });

  test('enforces rule ranges and dependent month dropdowns', async ({ page }) => {
    await openNewPortal(page, 'training/settings');
    const staffing = page.locator('.settings-card').filter({ has: page.getByText('פרמטרי תקציב צוות', { exact: true }) });
    await staffing.locator('summary').click();
    await staffing.getByRole('button', { name: 'הוספה' }).click();
    await page.getByLabel('שנת לימודים *').selectOption('year-1');
    await page.getByLabel('שעות חודשיות למשרה *').fill('160');
    await page.getByLabel('עלות שעתית לתקציב *').fill('60');
    await page.getByLabel('בתוקף מחודש *').selectOption('month-11');
    await page.getByLabel('עד חודש').selectOption('month-9');
    await page.getByLabel('מצב *').selectOption('ACTIVE');
    await page.getByRole('button', { name: 'שמירה' }).click();
    await expect(page.getByRole('alert')).toContainText('חודש הסיום אינו יכול להיות לפני חודש ההתחלה');
  });

  test('uses the frozen Budget category and rule contracts', async ({ page }) => {
    await openNewPortal(page, 'training/settings');
    const categories = page.locator('.settings-card').filter({ has: page.getByText('סעיפי תקציב', { exact: true }) });
    await categories.locator('summary').click();
    await categories.getByRole('button', { name: 'הוספה' }).click();
    await expect(page.getByLabel('סוג *').locator('option')).toHaveText(['בחירה…', 'הכנסה', 'הוצאה', 'קיזוז פנימי', 'ידני / לא מוגדר']);
    await page.getByRole('button', { name: 'ביטול' }).click();

    const rules = page.locator('.settings-card').filter({ has: page.getByText('כללי תקציב', { exact: true }) });
    await rules.locator('summary').click();
    await rules.getByRole('button', { name: 'הוספה' }).click();
    await page.getByLabel('סעיף תקציב *').selectOption('cat-income');
    await page.getByLabel('סוג כלל *').selectOption('FIXED_AMOUNT');
    await page.getByLabel('ערך מספרי').fill('100');
    await page.getByLabel('בתוקף מתאריך *').fill('2026-09-01');
    await page.getByLabel('מצב *').selectOption('ACTIVE');
    await page.getByRole('button', { name: 'שמירה' }).click();
    await expect(page.getByRole('alert')).toContainText('יש לבחור שנת לימודים או שנה קלנדרית');
  });
});
