import { test, expect } from '@playwright/test';
import { portalAccessFixture } from './new-portal-test-data.mjs';

const base = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const snapshot = {
  users: [{ id: userId, email: 'manager@example.test', email_confirmed_at: '2026-07-22T00:00:00Z' }],
  profiles: [{ user_id: userId, display_name: 'מנהלת בדיקה', is_active: true, is_super_admin: false, scope_mode: 'SELECTED', permission_configuration_id: 'config-1' }],
  permissions: [{ permission_configuration_id: 'config-1', user_id: userId, screen_code: 'home', permission_level: 'VIEW' }],
  unit_scopes: [], daycare_scopes: [], sections: portalAccessFixture.sections,
  allocation_units: [{ allocation_unit_id: 'unit-1', display_name: 'יחידה א', allocation_unit_type: 'OFFICE' }],
  daycares: [{ daycare_id: 'daycare-1', allocation_unit_id: 'unit-1', display_name: 'מעון א' }], audit_events: []
};

async function openWithAccess(page, access, route = 'home') {
  await page.addInitScript(() => localStorage.setItem('chamah.portal.session', JSON.stringify({ access_token: 'permission-access', refresh_token: 'permission-refresh', expires_at: 4102444800 })));
  await page.route(`${base}/auth/v1/user`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: userId }) }));
  await page.route(`${base}/rest/v1/rpc/portal_my_access**`, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(access) }));
  await page.goto(`/new/#${route}`);
}

test('permission management renders real controls and saves through the secured endpoint', async ({ page }) => {
  let saved;
  await page.route(`${base}/functions/v1/portal-users`, async (route) => {
    if (route.request().method() === 'PATCH') saved = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) });
  });
  await openWithAccess(page, portalAccessFixture, 'training/permissions/users');
  await expect(page.getByRole('heading', { name: 'רשימת משתמשים והרשאות' })).toBeVisible();
  await expect(page.locator('[data-screen]')).toHaveCount(portalAccessFixture.sections.length);
  await expect(page.locator('[data-screen="home"] .permission-screen-name')).toHaveText('עמוד הבית');
  await expect(page.getByText('home', { exact: true })).toHaveCount(0);
  await expect(page.locator('.permission-group')).toHaveCount(0);
  await expect(page.locator('#permissions-form select')).toHaveCount(0);
  await expect(page.locator('.permission-table thead th')).toHaveText(['שם העמוד', 'מוסתר', 'צפייה', 'עריכה']);
  await expect(page.getByText('בירושה', { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-screen="home"] [data-permission]')).toHaveCount(3);
  await expect(page.locator('[data-screen="home"] [data-permission]:checked')).toHaveValue('VIEW');
  await expect(page.locator('[data-screen="dashboards"] [data-permission]:checked')).toHaveValue('HIDDEN');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.locator('[data-screen="dashboards"] [data-permission][value="EDIT"]').check();
  await page.locator('#permissions-form button[type="submit"]').click();
  await expect.poll(() => saved?.permissions?.length).toBe(portalAccessFixture.sections.length);
  expect(saved.permissions.find((item) => item.screen_code === 'home')?.permission_level).toBe('VIEW');
  expect(saved.permissions[1].permission_level).toBe('EDIT');
  expect(saved.permissions.every((item) => ['HIDDEN', 'VIEW', 'EDIT'].includes(item.permission_level))).toBe(true);
  await expect(page.locator('#permissions-feedback')).toContainText('נשמרו בהצלחה');
});

test('registered screens are de-duplicated and new screens default to HIDDEN', async ({ page }) => {
  const registeredSections = [...snapshot.sections, { ...snapshot.sections[0], display_order: 999 }, { screen_code: 'future.reports', parent_screen_code: 'future', display_name: 'דוחות חדשים', display_order: 1000 }];
  const registeredSnapshot = { ...snapshot, sections: registeredSections };
  await page.route(`${base}/functions/v1/portal-users`, (route) => route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(registeredSnapshot) }));
  await openWithAccess(page, portalAccessFixture, 'training/permissions/users');
  await expect(page.locator('[data-screen="home"]')).toHaveCount(1);
  await expect(page.locator('[data-screen="future.reports"]')).toHaveCount(1);
  await expect(page.locator('[data-screen="future.reports"] .permission-screen-name')).toHaveText('דוחות חדשים');
  await expect(page.locator('[data-screen="future.reports"] [data-permission]:checked')).toHaveValue('HIDDEN');
  await expect(page.getByText('future.reports', { exact: true })).toHaveCount(0);
});

test('SUPER_ADMIN stays collapsed and requires confirmed explicit change', async ({ page }) => {
  let saved;
  await page.route(`${base}/functions/v1/portal-users`, async (route) => {
    if (route.request().method() === 'PATCH') saved = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) });
  });
  await openWithAccess(page, portalAccessFixture, 'training/permissions/users');
  await expect(page.getByText('רמת הרשאה', { exact: true })).toBeVisible();
  await expect(page.locator('#super-admin-control')).toBeHidden();
  await expect(page.locator('input[name="is_super_admin"]')).toHaveAttribute('type', 'hidden');
  await page.locator('input[name="is_super_admin"]').evaluate((input) => { input.value = 'true'; });
  await page.locator('#permissions-form button[type="submit"]').click();
  await expect(page.locator('#permissions-feedback')).toContainText('יש לאשר במפורש');
  expect(saved).toBeUndefined();
  await page.getByRole('button', { name: 'הצג הרשאת משתמש־על' }).click();
  await expect(page.locator('#super-admin-control')).toBeVisible();
  await expect(page.locator('#super-admin-control')).toContainText('גישה מלאה לכל המסכים, ההגדרות וכלי הניהול');
  await page.locator('input[name="is_super_admin"]').evaluate((input) => { input.value = 'false'; });
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'הענקת הרשאת משתמש־על' }).click();
  await expect(page.locator('#access-level-value')).toHaveText('מנהלת־על');
  await page.locator('#permissions-form button[type="submit"]').click();
  await expect.poll(() => saved?.profile?.is_super_admin).toBe(true);
});

test('removing SUPER_ADMIN also requires confirmation', async ({ page }) => {
  let saved;
  const superSnapshot = { ...snapshot, profiles: snapshot.profiles.map((profile) => ({ ...profile, is_super_admin: true, scope_mode: 'ORGANIZATION' })) };
  await page.route(`${base}/functions/v1/portal-users`, async (route) => {
    if (route.request().method() === 'PATCH') saved = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(superSnapshot) });
  });
  await openWithAccess(page, portalAccessFixture, 'training/permissions/users');
  await page.getByRole('button', { name: 'הצג הרשאת משתמש־על' }).click();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'הסרת הרשאת משתמש־על' }).click();
  await expect(page.locator('#access-level-value')).toHaveText('מנהלת־על');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'הסרת הרשאת משתמש־על' }).click();
  await expect(page.locator('#access-level-value')).toHaveText('משתמשת פורטל');
  await expect(page.locator('[data-screen="home"] [data-permission]:checked')).toHaveValue('VIEW');
  await expect(page.locator('[data-screen="dashboards"] [data-permission]:checked')).toHaveValue('HIDDEN');
  await expect(page.locator('[data-permission]:disabled')).toHaveCount(0);
  await page.locator('#permissions-form button[type="submit"]').click();
  await expect.poll(() => saved?.profile?.is_super_admin).toBe(false);
  expect(saved.permissions.find((item) => item.screen_code === 'home')?.permission_level).toBe('VIEW');
  expect(saved.permissions.find((item) => item.screen_code === 'dashboards')?.permission_level).toBe('HIDDEN');
});

test('HIDDEN removes navigation and blocks the route', async ({ page }) => {
  const access = { ...portalAccessFixture, profile: { ...portalAccessFixture.profile, is_super_admin: false }, sections: portalAccessFixture.sections.map((item) => ({ ...item, permission_level: item.screen_code === 'home' ? 'VIEW' : 'HIDDEN' })) };
  await openWithAccess(page, access, 'training/permissions/users');
  await expect(page.locator('#primary-nav [data-route="training"]')).toBeHidden();
  await expect(page.getByText('אין הרשאה לצפות במסך זה')).toBeVisible();
});

test('stable screen codes render canonical Hebrew labels when remote metadata is corrupted', async ({ page }) => {
  const access = { ...portalAccessFixture, sections: portalAccessFixture.sections.map((item) => ({ ...item, display_name: `×¤×גום-${item.screen_code}` })) };
  const corruptedSnapshot = { ...snapshot, sections: snapshot.sections.map((item) => ({ ...item, display_name: `×¤×גום-${item.screen_code}` })) };
  await page.route(`${base}/functions/v1/portal-users`, (route) => route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body: JSON.stringify(corruptedSnapshot) }));
  await openWithAccess(page, access, 'training/permissions/users');
  await expect(page.locator('#primary-nav [data-route="home"] span:last-child')).toHaveText('עמוד הבית');
  await expect(page.locator('#primary-nav [data-route="training"] span:last-child')).toHaveText('הרשאות וטבלאות');
  await expect(page.locator('#breadcrumbs')).toContainText('עמוד הבית/הרשאות וטבלאות/הרשאות/רשימת משתמשים והרשאות');
  await expect(page.getByText(/×¤×גום/)).toHaveCount(0);
  await expect(page).toHaveTitle(/רשימת משתמשים והרשאות/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
