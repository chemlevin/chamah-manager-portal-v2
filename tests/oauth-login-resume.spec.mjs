import { test, expect } from '@playwright/test';

const previewOrigin = 'http://127.0.0.1:4176';
const supabaseOrigin = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const authorizationId = 'pending-OAuth.Authorization_123';

async function mockPortalShell(page) {
  await page.route(`${supabaseOrigin}/auth/v1/user`, async (route) => {
    const authorization = route.request().headers().authorization;
    await route.fulfill({ status: authorization === 'Bearer portal-token' ? 200 : 401, contentType: 'application/json', body: JSON.stringify({ id: 'director-user' }) });
  });
  await page.route(`${supabaseOrigin}/rest/v1/rpc/portal_my_access`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ profile: { is_active: true, is_super_admin: true }, sections: [], allocation_unit_ids: [], daycare_ids: [] }) }));
  await page.route('**/management-catalog.generated.js*', (route) => route.continue());
}

test('unauthenticated authorization opens Preview login and resumes the same consent request after login', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await mockPortalShell(page);
  await page.goto(`${previewOrigin}/oauth/consent?authorization_id=${authorizationId}`);

  await expect(page).toHaveURL(new RegExp(`${previewOrigin.replaceAll('.', '\\.')}\\/?\\?oauth_resume=`));
  const resume = new URL(page.url()).searchParams.get('oauth_resume');
  expect(resume).toBe(`${previewOrigin}/oauth/consent?authorization_id=${authorizationId}`);
  await expect(page.locator('#login-view')).toBeVisible();

  await page.route(`${supabaseOrigin}/auth/v1/token?grant_type=password`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'portal-token', refresh_token: 'refresh-token', expires_in: 3600, token_type: 'bearer' }) });
  });
  await page.route(`${supabaseOrigin}/auth/v1/token?grant_type=refresh_token`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'portal-token', refresh_token: 'refresh-token', expires_in: 3600, token_type: 'bearer' }) });
  });
  await page.route(`${supabaseOrigin}/auth/v1/user`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'director-user', email: 'director@example.org' }) });
  });

  await page.locator('#email').fill('director@example.org');
  await page.locator('#password').fill('Valid-password-123');
  await page.locator('#login-submit').click();
  await expect(page).toHaveURL(`${previewOrigin}/oauth/consent?authorization_id=${authorizationId}`);
});

test('authenticated consent continues through the existing OAuth approval flow', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('chamah.portal.session', JSON.stringify({ access_token: 'portal-token', refresh_token: 'refresh-token', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600 })));
  await page.goto(`${previewOrigin}/oauth/consent?authorization_id=${authorizationId}`);
  await page.route(`${supabaseOrigin}/rest/v1/rpc/portal_my_access`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ profile: { is_active: true, is_super_admin: true } }) }));
  await page.route(`${supabaseOrigin}/auth/v1/oauth/authorization?authorization_id=${authorizationId}`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authorization_id: authorizationId, client: { name: 'ChatGPT Preview' }, redirect_uri: 'https://chatgpt.com/connector/oauth/test', scope: '' }) }));
  await expect(page.locator('#approve')).toBeVisible();
  await expect(page.locator('#client')).toHaveText('ChatGPT Preview');
});

test('malicious OAuth resume URL is rejected after a valid portal login', async ({ page }) => {
  await mockPortalShell(page);
  await page.goto(`${previewOrigin}/?oauth_resume=${encodeURIComponent(`https://attacker.example/oauth/consent?authorization_id=${authorizationId}`)}`);
  await expect(page.locator('#login-view')).toBeVisible();
  await expect(page).toHaveURL(`${previewOrigin}/?oauth_resume=${encodeURIComponent(`https://attacker.example/oauth/consent?authorization_id=${authorizationId}`)}`);
});
