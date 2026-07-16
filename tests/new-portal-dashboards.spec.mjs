import { test, expect } from '@playwright/test';
import { activeDaycareId, activeOfficeId, inactiveUnitId, allocationUnits, mockNewPortalSupabase, openNewPortal } from './new-portal-test-data.mjs';

test.describe('new portal organizational dashboards', () => {
  test('loads active units from Supabase and keeps units without dashboard data visible', async ({ page }) => {
    const requests = await mockNewPortalSupabase(page);
    await openNewPortal(page, 'dashboards');
    await expect(page.getByRole('heading', { level: 1, name: 'איזו יחידה ארגונית ברצונך לבדוק?' })).toBeVisible();
    await expect(page.locator(`.unit-card[data-unit-id="${activeDaycareId}"]`)).toBeVisible();
    await expect(page.locator(`.unit-card[data-unit-id="${activeOfficeId}"]`)).toBeVisible();
    await expect(page.locator(`.unit-card[data-unit-id="${inactiveUnitId}"]`)).toHaveCount(0);
    await expect(page.locator(`.unit-card[data-unit-id="${activeDaycareId}"] .unit-status`)).toHaveText('אין נתונים זמינים');
    expect(requests.some((request) => request.table === 'allocation_units' && request.search.includes('lifecycle_status=eq.ACTIVE'))).toBeTruthy();
  });

  test('defensively filters an inactive row even if Supabase returns it', async ({ page }) => {
    await mockNewPortalSupabase(page, allocationUnits);
    await openNewPortal(page, 'dashboards');
    await expect(page.locator('.unit-card[data-unit-id]')).toHaveCount(3);
    await expect(page.getByText('יחידה לא פעילה', { exact: true })).toHaveCount(0);
  });

  test('opens a unit hub with exactly four dashboard destinations and supports back navigation', async ({ page }) => {
    await mockNewPortalSupabase(page);
    await openNewPortal(page, 'dashboards');
    const unitCard = page.locator(`.unit-card[data-unit-id="${activeDaycareId}"]`);
    await expect(unitCard).toBeVisible();
    await unitCard.click();
    await expect(page).toHaveURL(new RegExp(`#dashboards/unit/${activeDaycareId}$`));
    await expect(page.locator('.dashboard-type-card')).toHaveCount(4);
    await expect(page.locator('#breadcrumbs')).toContainText('עמוד הבית/דשבורדים/יחידה פעילה א');
    await page.goBack();
    await expect(page).toHaveURL(/#dashboards$/);
    await expect(page.getByRole('heading', { level: 1, name: 'איזו יחידה ארגונית ברצונך לבדוק?' })).toBeVisible();
  });

  test('opens the Accounting Dashboard in a direct stable destination', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    await mockNewPortalSupabase(page);
    await openNewPortal(page, `dashboards/unit/${activeOfficeId}/accounting`);
    await expect(page.getByRole('heading', { level: 1, name: 'דשבורד הנהלת חשבונות · יחידה פעילה ב' })).toBeVisible();
    await expect(page.locator('[data-kpi-card="parents"]')).toBeVisible();
    await expect(page.locator('[data-kpi-card="missing-type"]')).toBeVisible();
    await expect(page.locator('[data-kpi-card="parents"] .kpi-open')).toContainText('1');
    await expect(page.locator('#detail-split')).toContainText('בתצוגת מעון מוצגות הקצאות בלבד');
    await page.locator('[data-kpi-card="parents"] .kpi-info-button').click();
    await expect(page.locator('#kpi-panel')).toBeVisible();
    await expect(page.locator('#kpi-source')).toContainText('תנועות בנק מקור');
    expect(consoleErrors).toEqual([]);
  });

  test('opens the reusable financial dashboard for the organization', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    const requests = await mockNewPortalSupabase(page);
    await openNewPortal(page, 'dashboards/unit/organization/finance');
    await expect(page.getByRole('heading', { level: 1, name: 'דשבורד כספים' })).toBeVisible();
    await expect(page.locator('#general-dashboard')).toBeVisible();
    await expect(page.locator('#kpis .financial-kpi')).toHaveCount(7);
    await expect(page.locator('#kpis .kpi-primary')).toHaveCount(4);
    await expect(page.locator('#kpis .kpi-secondary')).toHaveCount(3);
    await expect(page.getByRole('heading', { level: 2, name: 'מתחילת שנת הלימודים' })).toBeVisible();
    await expect(page.getByRole('button', { name: /רענון נתונים/ })).toBeVisible();
    await expect(page.locator('.dashboard-detail')).toHaveCount(6);
    for (const table of ['school_years', 'school_year_months', 'daycares', 'daycare_school_years', 'classrooms', 'monthly_enrollment', 'payroll_records', 'payroll_allocations', 'bank_transactions', 'bank_allocations', 'data_quality_issues', 'budget_categories', 'budget_rules', 'monthly_work_calendars', 'staffing_budget_parameters', 'age_groups', 'roles', 'employments', 'employees', 'employee_assignments']) {
      expect(requests.some((request) => request.table === table)).toBeTruthy();
    }
    await expect(page.locator('[data-kpi-card="payroll"] .kpi-open')).toContainText('80,000');
    await expect(page.locator('[data-kpi-card="payroll"] .kpi-open')).toContainText('59,700');
    await expect(page.locator('[data-kpi-card="payroll"]')).toHaveClass(/status-exception/);
    await expect(page.locator('[data-kpi-card="revenue"]')).not.toContainText('תוצאה תקציבית');
    await expect(page.locator('#school-year-metrics')).toContainText('הכנסות');
    await page.locator('#detail-budget').evaluate((element) => element.closest('details').setAttribute('open', ''));
    await expect(page.locator('.budget-matrix')).toBeVisible();
    await page.locator('[data-budget-cell]').first().click();
    await expect(page.locator('#kpi-panel')).toBeVisible();
    await page.locator('#detail-bank').evaluate((element) => element.closest('details').setAttribute('open', ''));
    await expect(page.locator('#detail-bank')).toContainText('יחידה פעילה א');
    await expect(page.locator('#detail-bank')).toContainText('יחידה פעילה ב');
    expect(consoleErrors).toEqual([]);
  });

  test('uses the same financial dashboard for an allocation unit and exposes KPI drill-down', async ({ page }) => {
    await mockNewPortalSupabase(page);
    await openNewPortal(page, `dashboards/unit/${activeDaycareId}/finance`);
    await expect(page.getByRole('heading', { level: 1, name: 'דשבורד כספים · יחידה פעילה א' })).toBeVisible();
    await expect(page.locator('#context-period')).toContainText('ספטמבר 2026');
    await expect(page.locator('[data-kpi-card="expenses"]')).toHaveClass(/status-exception/);
    await expect(page.locator('[data-kpi-card="revenue"]')).toHaveClass(/status-exception/);
    await page.locator('[data-kpi-card="expenses"] .kpi-open').click();
    await expect(page.locator('#kpi-panel')).toBeVisible();
    await expect(page.locator('#kpi-panel-title')).toHaveText('הוצאות');
    await expect(page.locator('#kpi-source')).toContainText('כללי תקציב');
    await expect(page.locator('#kpi-filters')).toContainText('יחידה פעילה א');
    await expect(page.locator('#kpi-records tbody tr')).toHaveCount(2);
  });

  test('supports responsive month chips, multiple months, and latest-month children without changing the school-year summary', async ({ page }) => {
    await mockNewPortalSupabase(page);
    await openNewPortal(page, `dashboards/unit/${activeDaycareId}/finance`);
    const summaryBefore = await page.locator('#summary-month').textContent();
    await expect(page.locator('[data-kpi-card="children"] .kpi-open')).toContainText('18');
    await page.locator('[data-month="2026-10"]').click();
    await expect(page.locator('[data-month="2026-09"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-month="2026-10"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#context-period')).toContainText('ספטמבר 2026, אוקטובר 2026');
    await expect(page.locator('[data-kpi-card="children"] .kpi-open')).toContainText('20');
    await expect(page.locator('[data-kpi-card="children"] .kpi-open')).toContainText('אוקטובר 2026');
    await expect(page.locator('#summary-month')).toHaveText(summaryBefore);
  });

  test('opens the shared Information Center with five tabs and export actions', async ({ page }) => {
    await mockNewPortalSupabase(page);
    await openNewPortal(page, 'dashboards/unit/organization/finance');
    await page.locator('[data-kpi-card="payroll"] .kpi-info-button').click();
    await expect(page.locator('#kpi-panel')).toBeVisible();
    for (const tab of ['הסבר', 'חישוב עסקי', 'פירוט', 'נתוני מקור', 'פעולות']) await expect(page.getByRole('tab', { name: tab, exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'פעולות', exact: true }).click();
    const actions = page.locator('[data-info-panel="actions"]');
    for (const action of ['הדפסה', 'ייצוא PDF', 'ייצוא Excel']) await expect(actions.getByRole('button', { name: action, exact: true })).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await actions.getByRole('button', { name: 'ייצוא Excel', exact: true }).click();
    expect((await downloadPromise).suggestedFilename()).toMatch(/שכר-\d{4}-\d{2}-\d{2}\.csv/);
  });

  test('shows complete children and payroll operational detail without raw IDs', async ({ page }) => {
    await mockNewPortalSupabase(page);
    await openNewPortal(page, `dashboards/unit/${activeDaycareId}/finance`);
    await page.locator('#detail-children').evaluate((element) => element.closest('details').setAttribute('open', ''));
    await expect(page.locator('#detail-children')).toContainText('מעון א');
    await expect(page.locator('#detail-children')).toContainText('כיתה א');
    await expect(page.locator('#detail-children')).toContainText('תינוקות');
    await page.locator('#detail-payroll').evaluate((element) => element.closest('details').setAttribute('open', ''));
    await expect(page.locator('#detail-payroll')).toContainText('שרה כהן');
    await expect(page.locator('#detail-payroll')).toContainText('מטפלת');
    await expect(page.locator('#detail-payroll')).toContainText('כיתה א');
    await expect(page.locator('#detail-payroll')).not.toContainText('employment-1');
  });

  test('refreshes dashboard data without reloading the browser', async ({ page }) => {
    const requests = await mockNewPortalSupabase(page);
    await openNewPortal(page, `dashboards/unit/${activeDaycareId}/finance`);
    const urlBefore = page.url();
    const initialLoads = requests.filter((request) => request.table === 'budget_snapshots').length;
    await page.locator('#refresh-dashboard').click();
    await expect.poll(() => requests.filter((request) => request.table === 'budget_snapshots').length).toBe(initialLoads + 1);
    await expect(page).toHaveURL(urlBefore);
    await expect(page.locator('#general-dashboard')).toBeVisible();
  });

  test('has no horizontal overflow across configured responsive projects', async ({ page }) => {
    await mockNewPortalSupabase(page);
    await openNewPortal(page, 'dashboards');
    await expect(page.locator('.unit-card')).toHaveCount(3);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('keeps unit navigation usable in tablet and mobile landscape viewports', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'Explicit viewport coverage runs once.');
    await mockNewPortalSupabase(page);

    for (const viewport of [
      { width: 1180, height: 820 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await openNewPortal(page, 'dashboards');
      await expect(page.locator('.unit-card[data-unit-id]')).toHaveCount(3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

      await page.locator(`.unit-card[data-unit-id="${activeDaycareId}"]`).click();
      await expect(page.locator('.dashboard-type-card')).toHaveCount(4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    }
  });
});
