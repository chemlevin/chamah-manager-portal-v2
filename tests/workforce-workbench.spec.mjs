import { test, expect } from '@playwright/test';
import { mockNewPortalSupabase, openNewPortal } from './new-portal-test-data.mjs';

test.beforeEach(async ({ page }) => {
  await mockNewPortalSupabase(page);
});

test('Employees Workbench renders KPI, toolbar, master table and lower detail card', async ({ page }, testInfo) => {
  await openNewPortal(page, 'dashboards/unit/organization/staffing/employees');
  await expect(page.getByRole('heading', { name: 'עובדים', exact: true })).toBeVisible();
  await expect(page.locator('#wf-kpis button')).toHaveCount(4);
  await expect(page.locator('#wf-search')).toBeVisible();
  await expect(page.locator('#wf-rows tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'פרטים' }).click();
  await expect(page.locator('#wf-details')).toContainText('היסטוריית תנאי שכר');
  await expect(page.locator('#wf-details')).toContainText('בונוסים וזכאויות');
  await expect(page.locator('#wf-details')).toContainText('רישוי והכשרות');
  await expect(page.locator('#wf-details')).toContainText('חופשות והיעדרויות');
  await expect(page.locator('#wf-details')).toContainText('placeholder בלבד');
  if (testInfo.project.name === 'desktop-1440') await page.screenshot({ path: 'test-results/track020-employees.png', fullPage: true });
});

test('Actual Payroll Workbench shows month, matching KPIs and cost-hours split editor', async ({ page }, testInfo) => {
  await openNewPortal(page, 'dashboards/unit/organization/staffing/actual-payroll');
  await expect(page.getByRole('heading', { name: 'ביצוע שכר', exact: true })).toBeVisible();
  await expect(page.locator('#wf-month')).toBeVisible();
  await expect(page.locator('#wf-kpis button')).toHaveCount(5);
  await expect(page.locator('#wf-rows .bank-row-status').first()).toHaveText('מקושר');
  await page.getByRole('button', { name: 'פרטים' }).first().click();
  await expect(page.locator('#wf-details')).toContainText('פער עלות');
  await expect(page.locator('#wf-details')).toContainText('פער שעות');
  await expect(page.locator('[name="allocation_unit_id"]').first()).toBeVisible();
  await expect(page.locator('[name="daycare_id"]').first()).toBeVisible();
  await expect(page.locator('[name="allocation_amount"]').first()).toBeVisible();
  await expect(page.locator('[name="allocated_hours"]').first()).toBeVisible();
  if (testInfo.project.name === 'desktop-1440') await page.screenshot({ path: 'test-results/track020-actual-payroll.png', fullPage: true });
});

test('workforce pages stay RTL and avoid viewport overflow on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openNewPortal(page, 'dashboards/unit/organization/staffing/employees');
  expect(await page.evaluate(() => document.documentElement.dir)).toBe('rtl');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
