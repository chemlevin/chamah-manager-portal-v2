import { test, expect } from '@playwright/test';

const supabaseUrl = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
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

  test('requests a six-digit OTP for an existing user without redirect parameters', async ({ page }) => {
    let requestDetails;
    await page.route(`${supabaseUrl}/auth/v1/otp`, async (route) => {
      requestDetails = { url: route.request().url(), body: route.request().postDataJSON() };
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/new/');
    await page.locator('#email').fill('existing@example.org');
    await page.locator('#request-code').click();
    await expect(page.locator('#login-message')).toContainText('הקוד נשלח');
    await expect(page.locator('#code-step')).toBeVisible();
    await expect(page.locator('#resend-code')).toBeDisabled();
    await expect(page.locator('#resend-code')).toContainText('60');
    expect(new URL(requestDetails.url).search).toBe('');
    expect(requestDetails.body).toEqual({ email: 'existing@example.org', create_user: false });
    expect(JSON.stringify(requestDetails)).not.toContain('redirect');
  });

  test('verifies the OTP, persists the returned session, and restores it on reload', async ({ page }) => {
    await page.route(`${supabaseUrl}/auth/v1/otp`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    let verificationBody;
    await page.route(`${supabaseUrl}/auth/v1/verify`, async (route) => {
      verificationBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'otp-access', refresh_token: 'otp-refresh', expires_in: 3600, token_type: 'bearer' }) });
    });
    await page.route(`${supabaseUrl}/auth/v1/user`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'otp-user' }) }));
    await page.goto('/new/');
    await page.locator('#email').fill('existing@example.org');
    await page.locator('#request-code').click();
    await page.locator('#otp-code').fill('123456');
    await page.locator('#verify-code').click();
    await expect(page.locator('#app-view')).toBeVisible();
    expect(verificationBody).toEqual({ email: 'existing@example.org', token: '123456', type: 'email' });
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), sessionKey);
    expect(stored.access_token).toBe('otp-access');
    expect(stored.refresh_token).toBe('otp-refresh');
    await page.reload();
    await expect(page.locator('#app-view')).toBeVisible();
  });

  test('shows Hebrew invalid-code and rate-limit states', async ({ page }) => {
    await page.route(`${supabaseUrl}/auth/v1/otp`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.route(`${supabaseUrl}/auth/v1/verify`, (route) => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error_code: 'otp_expired', msg: 'Token has expired or is invalid' }) }));
    await page.goto('/new/');
    await page.locator('#email').fill('existing@example.org');
    await page.locator('#request-code').click();
    await page.locator('#otp-code').fill('654321');
    await page.locator('#verify-code').click();
    await expect(page.locator('#login-message')).toContainText('תוקף הקוד פג');
    await page.locator('#change-email').click();
    await page.unroute(`${supabaseUrl}/auth/v1/otp`);
    await page.route(`${supabaseUrl}/auth/v1/otp`, (route) => route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ message: 'email rate limit exceeded' }) }));
    await page.locator('#request-code').click();
    await expect(page.locator('#login-message')).toContainText('בקשות רבות מדי');
  });

  test('prevents duplicate OTP requests while a request is pending', async ({ page }) => {
    let requests = 0;
    await page.route(`${supabaseUrl}/auth/v1/otp`, async (route) => {
      requests += 1;
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/new/');
    await page.locator('#email').fill('existing@example.org');
    await page.locator('#request-code').dblclick();
    await expect(page.locator('#code-step')).toBeVisible();
    expect(requests).toBe(1);
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
