import { test, expect } from '@playwright/test';
import { pages, screenshotFolder, screenshotSuffix, screenshotTargets, expectNoHorizontalOverflow, expectCoreLayoutInsideViewport, expectNoObviousOverlap, expectNavigation, expectClickableControls } from './qa-helpers.mjs';

test.describe('portal responsive visual QA', () => {
  for (const target of pages) {
    test(target.name + ' layout, navigation and screenshots', async ({ page }, testInfo) => {
      await page.goto(target.path);
      await expect(page.locator('body')).toBeVisible();
      const isMobile = testInfo.project.name.startsWith('mobile');
      await expectNavigation(page, isMobile);
      await expectNoHorizontalOverflow(page);
      await expectCoreLayoutInsideViewport(page);
      await expectNoObviousOverlap(page);
      await expectClickableControls(page);
      if (screenshotTargets.has(testInfo.project.name)) {
        await page.screenshot({ path: screenshotFolder(testInfo.project.name) + '/' + target.name + '-' + screenshotSuffix(testInfo.project.name) + '.png', fullPage: true });
      }
    });
  }
});
