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

async function openEmployeeFiltersIfCollapsed(page) {
  const filterPanel = page.locator('#employee-filter-details');
  if (!(await filterPanel.count())) return;
  if (!(await filterPanel.evaluate((element) => element.open))) {
    await filterPanel.locator('summary').click();
  }
  await expect(page.locator('#employee-search')).toBeVisible();
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

  test('KPI cards reflect the current filtered employee list and act as filters', async ({ page }) => {
    await page.goto('/employees/');

    await expect(page.locator('#employee-management-kpis')).toContainText('1 עובדות פעילות');
    await expect(page.locator('#employee-management-kpis')).toContainText('0 תעודות מטפלת חסרות');
    await expect(page.locator('#employee-management-kpis')).toContainText('1 עזרה ראשונה פגה');
    await expect(page.locator('#employee-management-kpis')).toContainText('1 התנהלות בטוחה חסרה');

    await page.locator('[data-kpi-filter="expired-first-aid"]').click();
    await expect(page.locator('[data-kpi-filter="expired-first-aid"]')).toHaveClass(/active/);
    await expect(page.locator('#employee-result-summary')).toContainText('מציג 1');
    await expect(page.locator('.employee-card')).toHaveCount(1);
    await expect(page.locator('.employee-card')).toContainText('רבקה לוי');
    await expect(page.locator('[data-clear-kpi-filter]')).toBeVisible();

    await page.locator('[data-clear-kpi-filter]').click();
    await expect(page.locator('.employee-card')).toHaveCount(3);

    await openEmployeeFiltersIfCollapsed(page);
    await page.locator('#employee-search').fill('שרה');
    await page.locator('#employee-filter-apply').click();

    await expect(page.locator('#employee-management-kpis')).toContainText('1 עובדות פעילות');
    await expect(page.locator('#employee-management-kpis')).toContainText('0 עזרה ראשונה פגה');
    await expect(page.locator('#employee-management-kpis')).toContainText('0 התנהלות בטוחה חסרה');
  });
});
