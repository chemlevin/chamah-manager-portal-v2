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

  test('preserves unit and dashboard type in a direct stable destination', async ({ page }) => {
    await mockNewPortalSupabase(page);
    await openNewPortal(page, `dashboards/unit/${activeOfficeId}/accounting`);
    await expect(page.getByRole('heading', { level: 1, name: 'דשבורד הנה״ח' })).toBeVisible();
    await expect(page.getByText('דשבורד הנה״ח עבור יחידה פעילה ב', { exact: true })).toBeVisible();
    await expect(page.locator('#breadcrumbs')).toContainText('עמוד הבית/דשבורדים/יחידה פעילה ב/דשבורד הנה״ח');
    await expect(page.getByText('בקרוב', { exact: true })).toBeVisible();
  });

  test('opens the reusable financial dashboard for the organization', async ({ page }) => {
    const requests = await mockNewPortalSupabase(page);
    await openNewPortal(page, 'dashboards/unit/organization/finance');
    await expect(page.getByRole('heading', { level: 1, name: 'דשבורד כספים' })).toBeVisible();
    await expect(page.locator('#general-dashboard')).toBeVisible();
    await expect(page.locator('#kpis .financial-kpi')).toHaveCount(12);
    await expect(page.getByRole('heading', { level: 2, name: 'מתחילת שנת הלימודים' })).toBeVisible();
    await expect(page.getByRole('button', { name: /רענון נתונים/ })).toBeVisible();
    await expect(page.locator('.dashboard-detail')).toHaveCount(6);
    for (const table of ['school_years', 'school_year_months', 'daycares', 'daycare_school_years', 'classrooms', 'monthly_enrollment', 'payroll_records', 'payroll_allocations', 'bank_transactions', 'bank_allocations', 'data_quality_issues']) {
      expect(requests.some((request) => request.table === table)).toBeTruthy();
    }
  });

  test('uses the same financial dashboard for an allocation unit and exposes KPI drill-down', async ({ page }) => {
    await mockNewPortalSupabase(page);
    await openNewPortal(page, `dashboards/unit/${activeDaycareId}/finance`);
    await expect(page.getByRole('heading', { level: 1, name: 'דשבורד כספים · יחידה פעילה א' })).toBeVisible();
    await expect(page.locator('#context-period')).toContainText('ספטמבר 2026');
    await page.locator('[data-kpi="budget"]').click();
    await expect(page.locator('#kpi-panel')).toBeVisible();
    await expect(page.locator('#kpi-panel-title')).toHaveText('תקציב');
    await expect(page.locator('#kpi-source')).toHaveText('אין מקור זמין');
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
