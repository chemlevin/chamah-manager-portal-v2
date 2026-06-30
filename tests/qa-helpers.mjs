import { expect } from '@playwright/test';

export const pages = [
  { path: '/', name: 'home' },
  { path: '/calculators/', name: 'calculators' },
  { path: '/occupancy/', name: 'occupancy' },
  { path: '/salary/', name: 'salary' },
  { path: '/dashboard/', name: 'dashboard' },
  { path: '/employees/', name: 'employees' }
];

export const screenshotTargets = new Set(['desktop-1440', 'mobile-390']);

export function screenshotFolder(projectName) {
  return projectName.startsWith('mobile') ? 'screenshots/mobile' : 'screenshots/desktop';
}

export function screenshotSuffix(projectName) {
  return projectName.startsWith('mobile') ? 'mobile' : 'desktop';
}

export async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      clientWidth: doc.clientWidth,
      documentScrollWidth: doc.scrollWidth,
      bodyScrollWidth: body.scrollWidth,
      maxScrollWidth: Math.max(doc.scrollWidth, body.scrollWidth)
    };
  });
  expect(overflow.maxScrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

export async function expectCoreLayoutInsideViewport(page) {
  const problems = await page.evaluate(() => {
    const selectors = [
      '.portal-shell', '.global-nav', '.app-home-hero', '.app-module-card',
      '.calculator-hub-hero', '.calculator-card', '.occupancy-form',
      '.result-card', '.salary-form-panel', '.dashboard-section', '.filter-bar', '.employees-hero', '.employee-card', '.employee-detail-panel'
    ];
    const width = document.documentElement.clientWidth;
    const items = [];
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (rect.left < -1 || rect.right > width + 1) {
          items.push({ selector, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), viewport: width });
        }
      }
    }
    return items;
  });
  expect(problems, JSON.stringify(problems, null, 2)).toEqual([]);
}

export async function expectNoObviousOverlap(page) {
  const overlaps = await page.evaluate(() => {
    const selectors = ['.global-brand', '.desktop-nav', '.app-module-card', '.calculator-card', '.health-status-card', '.management-kpi-grid article'];
    const visible = [...document.querySelectorAll(selectors.join(','))]
      .map((el, index) => ({ index, selector: selectors.find(s => el.matches(s)), rect: el.getBoundingClientRect() }))
      .filter(item => item.rect.width > 0 && item.rect.height > 0)
      .map(item => ({ ...item, rect: { left: item.rect.left, right: item.rect.right, top: item.rect.top, bottom: item.rect.bottom } }));
    const found = [];
    for (let i = 0; i < visible.length; i += 1) {
      for (let j = i + 1; j < visible.length; j += 1) {
        const a = visible[i];
        const b = visible[j];
        const horizontal = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left));
        const vertical = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top));
        const area = horizontal * vertical;
        const minArea = Math.min((a.rect.right - a.rect.left) * (a.rect.bottom - a.rect.top), (b.rect.right - b.rect.left) * (b.rect.bottom - b.rect.top));
        if (area > 80 && area / minArea > 0.35) found.push({ a: a.selector, b: b.selector, area: Math.round(area) });
      }
    }
    return found.slice(0, 10);
  });
  expect(overlaps, JSON.stringify(overlaps, null, 2)).toEqual([]);
}

export async function expectNavigation(page, isMobile) {
  await expect(page.locator('.global-nav')).toBeVisible();
  await expect(page.locator('.global-brand')).toBeVisible();
  await expect(page.locator('.global-brand img')).toBeVisible();
  if (isMobile) {
    await expect(page.locator('.hamburger-button')).toBeVisible();
    await page.locator('.hamburger-button').click();
    await expect(page.locator('#nav-toggle')).toBeChecked();
    await expect(page.locator('.mobile-drawer')).toBeVisible();
    await page.locator('.nav-backdrop').click({ force: true });
    await expect(page.locator('#nav-toggle')).not.toBeChecked();
  } else {
    await expect(page.locator('.desktop-nav')).toBeVisible();
  }
}

export async function expectClickableControls(page) {
  const badControls = await page.evaluate(() => {
    const controls = [...document.querySelectorAll('a, button, input, select')]
      .filter(el => !el.disabled && el.getAttribute('aria-hidden') !== 'true');
    return controls.map(el => {
      const rect = el.getBoundingClientRect();
      const styles = getComputedStyle(el);
      const visible = rect.width > 0 && rect.height > 0 && styles.visibility !== 'hidden' && styles.display !== 'none';
      return { tag: el.tagName, text: (el.textContent || el.getAttribute('aria-label') || el.id || '').trim().slice(0, 50), visible, width: Math.round(rect.width), height: Math.round(rect.height) };
    }).filter(item => item.visible && (item.width < 1 || item.height < 1));
  });
  expect(badControls).toEqual([]);
}
