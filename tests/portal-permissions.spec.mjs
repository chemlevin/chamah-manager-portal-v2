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
  await page.locator('#permission-search').fill('home');
  await expect(page.locator('[data-screen]:visible')).toHaveCount(1);
  await page.locator('#permission-search').fill('');
  await page.locator('#hide-all-permissions').click();
  await page.locator('#permissions-form button[type="submit"]').click();
  await expect.poll(() => saved?.permissions?.length).toBe(portalAccessFixture.sections.length);
  expect(saved.permissions.every((item) => item.permission_level === 'HIDDEN')).toBe(true);
  await expect(page.locator('#permissions-feedback')).toContainText('נשמרו בהצלחה');
});

test('HIDDEN removes navigation and blocks the route', async ({ page }) => {
  const access = { ...portalAccessFixture, profile: { ...portalAccessFixture.profile, is_super_admin: false }, sections: portalAccessFixture.sections.map((item) => ({ ...item, permission_level: item.screen_code === 'home' ? 'VIEW' : 'HIDDEN' })) };
  await openWithAccess(page, access, 'training/permissions/users');
  await expect(page.locator('#primary-nav [data-route="training"]')).toBeHidden();
  await expect(page.getByText('אין הרשאה לצפות במסך זה')).toBeVisible();
});

test('section catalog supplies navigation and breadcrumb labels', async ({ page }) => {
  const labels = new Map([
    ['home', 'בית מהקטלוג'],
    ['management', 'ניהול מהקטלוג'],
    ['management.permissions', 'הרשאות מהקטלוג'],
    ['management.permissions.users', 'משתמשים מהקטלוג']
  ]);
  const access = { ...portalAccessFixture, sections: portalAccessFixture.sections.map((item) => ({ ...item, display_name: labels.get(item.screen_code) || item.display_name })) };
  await page.route(`${base}/functions/v1/portal-users`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) }));
  await openWithAccess(page, access, 'training/permissions/users');
  await expect(page.locator('#primary-nav [data-route="home"] span:last-child')).toHaveText('בית מהקטלוג');
  await expect(page.locator('#primary-nav [data-route="training"] span:last-child')).toHaveText('ניהול מהקטלוג');
  await expect(page.locator('#breadcrumbs')).toContainText('בית מהקטלוג/ניהול מהקטלוג/הרשאות מהקטלוג/משתמשים מהקטלוג');
  await expect(page).toHaveTitle(/משתמשים מהקטלוג/);
});
