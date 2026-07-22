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

async function generatedStrongPassword(page) {
  return page.evaluate(() => `${String.fromCharCode(65)}${Array.from(crypto.getRandomValues(new Uint8Array(18)), (value) => value.toString(16).padStart(2, '0')).join('')}${String.fromCharCode(55)}`);
}

test.describe('new portal Supabase authentication', () => {
  test('shows login and performs no protected reads without a session', async ({ page }) => {
    let protectedReads = 0;
    await page.route(`${supabaseUrl}/rest/v1/**`, (route) => { protectedReads += 1; return route.abort(); });
    await page.goto('/');
    await expect(page.locator('#login-view')).toBeVisible();
    await expect(page.locator('#app-view')).toBeHidden();
    await expect(page.getByLabel('כתובת מייל')).toBeVisible();
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    expect(protectedReads).toBe(0);
  });

  test('signs in with email and password, persists the session, and restores it on reload', async ({ page }) => {
    const generatedSecret = await page.evaluate(() => Array.from(crypto.getRandomValues(new Uint8Array(18)), (value) => value.toString(16).padStart(2, '0')).join(''));
    let loginBody;
    await page.route(`${supabaseUrl}/auth/v1/token?grant_type=password`, async (route) => {
      loginBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'password-access', refresh_token: 'password-refresh', expires_in: 3600, token_type: 'bearer' }) });
    });
    await page.route(`${supabaseUrl}/auth/v1/user`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'password-user' }) }));
    await page.goto('/');
    await page.locator('#email').fill('existing@example.org');
    await page.locator('#password').fill(generatedSecret);
    await page.locator('#login-submit').click();
    await expect(page.locator('#app-view')).toBeVisible();
    expect(loginBody.email).toBe('existing@example.org');
    expect(typeof loginBody.password).toBe('string');
    expect(loginBody.password.length).toBeGreaterThan(0);
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), sessionKey);
    expect(stored.access_token).toBe('password-access');
    expect(stored.refresh_token).toBe('password-refresh');
    await page.reload();
    await expect(page.locator('#app-view')).toBeVisible();
  });

  test('toggles password visibility and shows a clear Hebrew invalid-credentials error', async ({ page }) => {
    const generatedSecret = await page.evaluate(() => Array.from(crypto.getRandomValues(new Uint8Array(18)), (value) => value.toString(16).padStart(2, '0')).join(''));
    await page.route(`${supabaseUrl}/auth/v1/token?grant_type=password`, (route) => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }) }));
    await page.goto('/');
    await page.locator('#email').fill('existing@example.org');
    await page.locator('#password').fill(generatedSecret);
    await page.locator('#toggle-password').click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
    await expect(page.locator('#toggle-password')).toHaveText('הסתר');
    await page.locator('#login-submit').click();
    await expect(page.locator('#login-message')).toContainText('כתובת המייל או הסיסמה אינם נכונים');
    await expect(page.locator('#app-view')).toBeHidden();
  });

  test('prevents duplicate password submissions while a request is pending', async ({ page }) => {
    const generatedSecret = await page.evaluate(() => Array.from(crypto.getRandomValues(new Uint8Array(18)), (value) => value.toString(16).padStart(2, '0')).join(''));
    let requests = 0;
    await page.route(`${supabaseUrl}/auth/v1/token?grant_type=password`, async (route) => {
      requests += 1;
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error_code: 'invalid_credentials' }) });
    });
    await page.goto('/');
    await page.locator('#email').fill('existing@example.org');
    await page.locator('#password').fill(generatedSecret);
    await page.locator('#login-submit').dblclick();
    await expect(page.locator('#login-message')).toContainText('אינם נכונים');
    expect(requests).toBe(1);
  });

  test('requests password recovery to the canonical portal without changing the login flow', async ({ page }) => {
    let recoveryUrl;
    let recoveryBody;
    await page.route(`${supabaseUrl}/auth/v1/recover**`, async (route) => {
      recoveryUrl = route.request().url();
      recoveryBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/');
    await page.locator('#email').fill('existing@example.org');
    await page.locator('#forgot-password').click();
    await page.locator('#request-recovery').click();
    await expect(page.locator('#recovery-request-message')).toContainText('אם הכתובת מורשית במערכת');
    expect(recoveryBody).toEqual({ email: 'existing@example.org' });
    expect(new URL(recoveryUrl).searchParams.get('redirect_to')).toBe('https://chamah-portal.vercel.app/');
    await expect(page.locator('#login-submit')).toBeVisible();
  });

  test('completes a recovery session, persists it, and loads active units under RLS', async ({ page }) => {
    const generatedSecret = await generatedStrongPassword(page);
    await mockUser(page, 'recovery-access');
    let updateBody;
    await page.route(`${supabaseUrl}/auth/v1/user`, async (route) => {
      if (route.request().method() === 'PUT') {
        expect(route.request().headers().authorization).toBe('Bearer recovery-access');
        updateBody = route.request().postDataJSON();
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'recovery-user' }) });
        return;
      }
      expect(route.request().headers().authorization).toBe('Bearer recovery-access');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'recovery-user' }) });
    });
    let unitsAuthorization;
    await page.route(`${supabaseUrl}/rest/v1/allocation_units**`, async (route) => {
      unitsAuthorization = route.request().headers().authorization;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.goto('/#access_token=recovery-access&refresh_token=recovery-refresh&expires_in=3600&token_type=bearer&type=recovery');
    await expect(page.locator('#recovery-view')).toBeVisible();
    await expect(page).toHaveURL(/\/#reset-password$/);
    await page.locator('#new-password').fill(generatedSecret);
    await page.locator('#confirm-password').fill(generatedSecret);
    await page.locator('#save-password').click();
    await expect(page.locator('#app-view')).toBeVisible();
    await expect(page).toHaveURL(/\/#home$/);
    expect(typeof updateBody.password).toBe('string');
    expect(updateBody.password.length).toBeGreaterThanOrEqual(10);
    await page.goto('/#dashboards');
    await expect.poll(() => unitsAuthorization).toBe('Bearer recovery-access');
    await page.reload();
    await expect(page.locator('#app-view')).toBeVisible();
  });

  test('accepts an invitation callback at the Production root and establishes a password', async ({ page }) => {
    const generatedSecret = await generatedStrongPassword(page);
    let updateBody;
    await page.route(`${supabaseUrl}/auth/v1/user`, async (route) => {
      if (route.request().method() === 'PUT') {
        updateBody = route.request().postDataJSON();
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'invited-user' }) });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'invited-user' }) });
    });
    await page.goto('/#access_token=invite-access&refresh_token=invite-refresh&expires_in=3600&token_type=bearer&type=invite');
    await expect(page.locator('#recovery-view')).toBeVisible();
    await expect(page.locator('#recovery-title')).toHaveText('השלמת ההזמנה');
    await page.locator('#new-password').fill(generatedSecret);
    await page.locator('#confirm-password').fill(generatedSecret);
    await page.locator('#save-password').click();
    await expect(page.locator('#app-view')).toBeVisible();
    await expect(page).toHaveURL(/\/#home$/);
    expect(updateBody).toEqual({ password: generatedSecret });
  });

  test('redirects the temporary /new/ path to the Production root', async ({ page }) => {
    await page.goto('/new/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('#login-view')).toBeVisible();
  });

  test('preserves an invitation callback while moving /new/ to the root', async ({ page }) => {
    await page.route(`${supabaseUrl}/auth/v1/user`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'invited-user' }) });
    });
    await page.goto('/new/#access_token=invite-access&refresh_token=invite-refresh&expires_in=3600&token_type=bearer&type=invite');
    await expect(page).toHaveURL(/\/#reset-password$/);
    await expect(page.locator('#recovery-view')).toBeVisible();
    await expect(page.locator('#recovery-title')).toHaveText('השלמת ההזמנה');
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), sessionKey);
    expect(stored.access_token).toBe('invite-access');
    expect(stored.refresh_token).toBe('invite-refresh');
  });

  test('validates recovery password strength and confirmation before updating', async ({ page }) => {
    const generatedSecret = await generatedStrongPassword(page);
    const differentSecret = await generatedStrongPassword(page);
    await mockUser(page, 'recovery-access');
    let updates = 0;
    await page.route(`${supabaseUrl}/auth/v1/user`, async (route) => {
      if (route.request().method() === 'PUT') updates += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'recovery-user' }) });
    });
    await page.goto('/#access_token=recovery-access&refresh_token=recovery-refresh&expires_in=3600&type=recovery');
    await page.locator('#new-password').fill(await page.evaluate(() => String.fromCharCode(65)));
    await page.locator('#confirm-password').fill(await page.evaluate(() => String.fromCharCode(65)));
    await page.locator('#save-password').click();
    await expect(page.locator('#recovery-message')).toContainText('לפחות 10 תווים');
    await page.locator('#new-password').fill(generatedSecret);
    await page.locator('#confirm-password').fill(differentSecret);
    await page.locator('#save-password').click();
    await expect(page.locator('#recovery-message')).toContainText('אינן תואמות');
    expect(updates).toBe(0);
  });

  test('shows a clear Hebrew error for an expired or already-used recovery link', async ({ page }) => {
    await page.goto('/#error=access_denied&error_code=expired&error_description=Recovery+link+has+expired');
    await expect(page.locator('#recovery-view')).toBeVisible();
    await expect(page.locator('#recovery-fields')).toBeHidden();
    await expect(page.locator('#recovery-message')).toContainText('תוקף הקישור פג');
    await expect(page).toHaveURL(/\/#reset-password$/);
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
    await page.goto('/#dashboards');
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
    await page.goto('/');
    await expect(page.locator('#app-view')).toBeVisible();
    await page.locator('#logout').click();
    await expect(page.locator('#login-view')).toBeVisible();
    await expect(page.locator('#app-view')).toBeHidden();
    await expect.poll(() => logoutAuthorization).toBe('Bearer valid-access');
    expect(await page.evaluate((key) => localStorage.getItem(key), sessionKey)).toBeNull();
  });
});
