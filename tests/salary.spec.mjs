import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, expectCoreLayoutInsideViewport } from './qa-helpers.mjs';

test.describe('salary calculator QA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/salary/');
  });

  test('before calculation shows empty salary details', async ({ page }) => {
    await expect(page.locator('#empty-components')).toBeVisible();
    await expect(page.locator('#component-list .component-card')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test('after calculation shows salary result', async ({ page }) => {
    await page.locator('#hourly-wage').fill('40');
    await page.locator('#seniority').fill('5');
    await page.locator('#monthly-hours').fill('145');
    await page.locator('#role').selectOption('מובילה');
    await page.locator('#salary-form button[type="submit"]').click();
    await expect(page.locator('#estimated-gross')).not.toHaveText('₪0');
    await expect(page.locator('#net-range-summary')).not.toHaveText('₪0 - ₪0');
    await expect(page.locator('#component-list .component-card').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectCoreLayoutInsideViewport(page);
  });

  test('certificate tooltip opens compactly without overlapping nearby fields', async ({ page }) => {
    await page.locator('.info-tooltip-trigger').focus();
    await expect(page.locator('.info-tooltip-content')).toBeVisible();

    const layout = await page.evaluate(() => {
      const tooltip = document.querySelector('.info-tooltip-content').getBoundingClientRect();
      const certificateField = document.querySelector('.certificate-choice').getBoundingClientRect();
      const nextField = document.querySelector('.certificate-choice + .choice-group').getBoundingClientRect();

      return {
        noViewportOverflow: tooltip.left >= 0 && tooltip.right <= window.innerWidth,
        insideCertificateField: tooltip.top >= certificateField.top && tooltip.bottom <= certificateField.bottom + 1,
        noNextFieldOverlap: tooltip.bottom <= nextField.top + 1,
      };
    });

    expect(layout.noViewportOverflow).toBe(true);
    expect(layout.insideCertificateField).toBe(true);
    expect(layout.noNextFieldOverlap).toBe(true);
    await expectNoHorizontalOverflow(page);
  });

  test('print layout presents input details before calculation results', async ({ page }) => {
    await page.locator('#hourly-wage').fill('38');
    await page.locator('#seniority').fill('5');
    await page.locator('#monthly-hours').fill('145');
    await page.locator('#role').selectOption('מובילה');
    await page.locator('#salary-form button[type="submit"]').click();
    await page.emulateMedia({ media: 'print' });

    const printLayout = await page.evaluate(() => {
      const form = document.querySelector('.salary-form-panel').getBoundingClientRect();
      const results = document.querySelector('.salary-results').getBoundingClientRect();
      const visibleCertificateOptions = [...document.querySelectorAll('.certificate-choice label')]
        .filter((label) => getComputedStyle(label).display !== 'none')
        .map((label) => label.textContent.trim());

      return {
        formVisible: getComputedStyle(document.querySelector('.salary-form-panel')).display !== 'none',
        resultsVisible: getComputedStyle(document.querySelector('.salary-results')).display !== 'none',
        formBeforeResults: form.top < results.top,
        grossText: document.querySelector('#estimated-gross').textContent.trim(),
        tooltipHidden: getComputedStyle(document.querySelector('.info-tooltip-content')).display === 'none',
        visibleCertificateOptions,
      };
    });

    expect(printLayout.formVisible).toBe(true);
    expect(printLayout.resultsVisible).toBe(true);
    expect(printLayout.formBeforeResults).toBe(true);
    expect(printLayout.grossText).not.toBe('₪0');
    expect(printLayout.tooltipHidden).toBe(true);
    expect(printLayout.visibleCertificateOptions).toEqual(['יש תעודה']);
  });
});
