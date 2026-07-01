import { test, expect } from '@playwright/test';

const headers = {
  id: 'מספר עובד',
  name: 'שם עובדת',
  daycare: 'מעון',
  classroom: 'כיתה',
  role: 'תפקיד',
  position: 'משרה',
  status: 'סטטוס',
  certificate: 'תעודת מטפלת',
  firstAid: 'עזרה ראשונה עד',
  safeConduct: 'התנהלות בטוחה עד'
};

function employee(data) {
  return {
    [headers.id]: data.id,
    [headers.name]: data.name,
    [headers.daycare]: data.daycare || 'מחנה',
    [headers.classroom]: data.classroom || 'בוגרים',
    [headers.role]: data.role || 'מטפלת',
    [headers.position]: data.position || 'מלאה',
    [headers.status]: data.status,
    [headers.certificate]: data.certificate,
    [headers.firstAid]: data.firstAid,
    [headers.safeConduct]: data.safeConduct,
  };
}

test.describe('employees management KPIs', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/employees', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          employees: [
            employee({ id: '1', name: 'שרה כהן', status: 'עובדת', certificate: 'יש', firstAid: '01/05/2027', safeConduct: '01/05/2027' }),
            employee({ id: '2', name: 'רבקה לוי', status: 'חופשת לידה', certificate: 'בלימודים', firstAid: '01/05/2020', safeConduct: '' }),
            employee({ id: '3', name: 'לאה ישראלי', status: 'עזבה', certificate: 'אין', firstAid: '', safeConduct: '' }),
          ]
        })
      });
    });
  });

  test('KPI cards reflect the current filtered employee list', async ({ page }) => {
    await page.goto('/employees/');

    await expect(page.locator('#employee-management-kpis')).toContainText('פעילות');
    await expect(page.locator('.employee-kpi-card').filter({ hasText: 'פעילות' }).locator('strong')).toHaveText('1');
    await expect(page.locator('.employee-kpi-card').filter({ hasText: 'חופשת לידה' }).locator('strong')).toHaveText('1');
    await expect(page.locator('.employee-kpi-card').filter({ hasText: 'עזבו' }).locator('strong')).toHaveText('1');
    await expect(page.locator('.employee-kpi-card').filter({ hasText: 'תעודת מטפלת' }).filter({ hasText: 'תקפה' }).locator('strong')).toHaveText('1');
    await expect(page.locator('.employee-kpi-card').filter({ hasText: 'עזרה ראשונה' }).filter({ hasText: 'פג תוקף' }).locator('strong')).toHaveText('1');
    await expect(page.locator('.employee-kpi-card').filter({ hasText: 'התנהלות בטוחה' }).filter({ hasText: 'חסר' }).locator('strong')).toHaveText('1');

    await page.locator('#employee-search').fill('שרה');
    await page.locator('#employee-filter-apply').click();

    await expect(page.locator('.employee-kpi-card').filter({ hasText: 'פעילות' }).locator('strong')).toHaveText('1');
    await expect(page.locator('.employee-kpi-card').filter({ hasText: 'חופשת לידה' }).locator('strong')).toHaveText('0');
    await expect(page.locator('.employee-kpi-card').filter({ hasText: 'עזבו' }).locator('strong')).toHaveText('0');
  });
});
