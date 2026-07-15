import { test, expect } from '@playwright/test';

const supabaseUrl = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const canonicalUrl = 'https://chamah-manager-portal-v2-preview.vercel.app/new/';
const sessionKey = 'chamah.portal.session';

const validSession = { access_token: 'valid-access', refresh_token: 'valid-refresh', expires_at: 4102444800 };

async function installSession(page, value = validSession) {
  await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: sessionKey, session: value });
}

async function mockUser(page, expectedToken = 'valid-access') {
  await page.route(`${supabaseUrl}/auth/v1/user`, async (route) => {
    expect(route.request().headers().authorization).toBe(`Bearer ${expectedToken}`);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'authorized-user' }) });
  });
}

test.describe('new portal Supabase authentication', () => {
  test('shows login and performs no protected reads without a session', async ({ page }) => {
    let protectedReads = 0;
    await page.route(`${supabaseUrl}/rest/v1/**`, (route) => { protectedReads += 1; return route.abort(); });
    await page.goto('/new/');
    await expect(page.locator('#login-view')).toBeVisible();
    await expect(page.locator('#app-view')).toBeHidden();
    expect(protectedReads).toBe(0);
  });

  test('requests a Magic Link for an existing user with only the canonical redirect', async ({ page }) => {
    let requestDetails;
    await page.route(`${supabaseUrl}/auth/v1/otp**`, async (route) => {
      requestDetails = { url: route.request().url(), body: route.request().postDataJSON() };
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/new/');
    await page.locator('#email').fill('existing@example.org');
    await page.locator('#login-form button[type="submit"]').click();
    await expect(page.locator('#login-message')).toContainText('הקישור נשלח');
    expect(new URL(requestDetails.url).searchParams.get('redirect_to')).toBe(canonicalUrl);
    expect(requestDetails.body).toEqual({ email: 'existing@example.org', create_user: false });
    expect(JSON.stringify(requestDetails)).not.toContain('localhost');
  });

  test('processes callback tokens, cleans the URL, and persists the session across reload', async ({ page }) => {
    await page.route(`${supabaseUrl}/auth/v1/user`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'callback-user' }) }));
    await page.goto('/new/#access_token=callback-access&refresh_token=callback-refresh&expires_in=3600&token_type=bearer');
    await expect(page.locator('#app-view')).toBeVisible();
    await expect(page).toHaveURL(/\/new\/#home$/);
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), sessionKey);
    expect(stored.access_token).toBe('callback-access');
    expect(stored.refresh_token).toBe('callback-refresh');
    expect(page.url()).not.toContain('access_token');
    await page.reload();
    await expect(page.locator('#app-view')).toBeVisible();
  });

  test('refreshes an expired access token before validation and protected reads', async ({ page }) => {
    await installSession(page, { access_token: 'expired-access', refresh_token: 'refresh-me', expires_at: 1 });
    await page.route(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, async (route) => {
      expect(route.request().postDataJSON()).toEqual({ refresh_token: 'refresh-me' });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'fresh-access', refresh_token: 'fresh-refresh', expires_in: 3600, token_type: 'bearer' }) });
    });
    await mockUser(page, 'fresh-access');
    let authorization;
    await page.route(`${supabaseUrl}/rest/v1/allocation_units**`, async (route) => {
      authorization = route.request().headers().authorization;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.goto('/new/#dashboards');
    await expect(page.locator('#app-view')).toBeVisible();
    await expect.poll(() => authorization).toBe('Bearer fresh-access');
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), sessionKey);
    expect(stored.refresh_token).toBe('fresh-refresh');
  });

  test('signs out remotely, clears local state, and returns to login', async ({ page }) => {
    await installSession(page);
    await mockUser(page);
    let logoutAuthorization;
    await page.route(`${supabaseUrl}/auth/v1/logout`, async (route) => {
      logoutAuthorization = route.request().headers().authorization;
      await route.fulfill({ status: 204, body: '' });
    });
    await page.goto('/new/');
    await expect(page.locator('#app-view')).toBeVisible();
    await page.locator('#logout').click();
    await expect(page.locator('#login-view')).toBeVisible();
    await expect(page.locator('#app-view')).toBeHidden();
    await expect.poll(() => logoutAuthorization).toBe('Bearer valid-access');
    expect(await page.evaluate((key) => localStorage.getItem(key), sessionKey)).toBeNull();
  });
});
