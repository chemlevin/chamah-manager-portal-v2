import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, expectCoreLayoutInsideViewport } from './qa-helpers.mjs';

test.describe('occupancy calculator QA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/occupancy/');
  });

  test('before calculation shows only the empty result state', async ({ page }) => {
    await expect(page.locator('#occupancy-empty-state')).toBeVisible();
    await expect(page.locator('#occupancy-results')).toBeHidden();
    await expect(page.locator('#occupancy-recommendation')).toBeHidden();
    await expect(page.locator('#kpi-children')).toBeHidden();
    await expectNoHorizontalOverflow(page);
  });

  test('single-age classroom calculation shows status, KPI and recommendation', async ({ page }) => {
    await page.locator('#classroom-type').selectOption('older');
    await page.locator('#older-count').fill('30');
    await page.locator('#actual-sqm').fill('72');
    await page.locator('#occupancy-form button[type="submit"]').click();
    await expect(page.locator('#occupancy-results')).toBeVisible();
    await expect(page.locator('#health-status-card')).toBeVisible();
    await expect(page.locator('#kpi-children')).toContainText('30');
    await expect(page.locator('#occupancy-recommendation')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectCoreLayoutInsideViewport(page);
  });

  test('mixed classroom calculation shows status, KPI and recommendation', async ({ page }) => {
    await page.locator('#classroom-type').selectOption('toddlers-older');
    await page.locator('#actual-sqm').fill('70');
    await page.locator('#toddler-count').fill('5');
    await page.locator('#older-count').fill('26');
    await page.locator('#occupancy-form button[type="submit"]').click();
    await expect(page.locator('#occupancy-results')).toBeVisible();
    await expect(page.locator('#health-status-card')).toBeVisible();
    await expect(page.locator('#kpi-children')).toContainText('31');
    await expect(page.locator('#occupancy-recommendation')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectCoreLayoutInsideViewport(page);
  });

  test('alternatives ranking searches profitable valid compositions', async ({ page }) => {
    await page.locator('#classroom-type').selectOption('older');
    await page.locator('#older-count').fill('20');
    await page.locator('#actual-sqm').fill('72');
    await page.locator('#occupancy-form button[type="submit"]').click();
    await page.locator('#alternatives-details').click();

    const cards = page.locator('#scenario-grid .scenario-card');
    await expect(cards).toHaveCount(6);
    await expect(cards.nth(0)).toContainText('20');
    await expect(cards.nth(1)).toContainText('33');
    await expect(cards.nth(1)).toContainText('בוגרים');
  });

  test('alternatives ranking does not recommend invalid non-adjacent mixed classes', async ({ page }) => {
    await page.locator('#classroom-type').selectOption('older');
    await page.locator('#older-count').fill('20');
    await page.locator('#actual-sqm').fill('72');
    await page.locator('#occupancy-form button[type="submit"]').click();
    await page.locator('#alternatives-details').click();

    await expect(page.locator('#scenario-grid')).not.toContainText('תינוקות + בוגרים');
  });
});
