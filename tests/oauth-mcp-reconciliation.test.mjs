import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CANONICAL_ORIGIN = 'https://chamah-portal.vercel.app';
const LEGACY_ORIGIN = 'https://chamah-portal-chamah.vercel.app';
const mcpSource = readFileSync(new URL('../api/mcp.js', import.meta.url), 'utf8');
const metadataSource = readFileSync(new URL('../api/mcp-oauth-metadata.js', import.meta.url), 'utf8');
const consentSource = readFileSync(new URL('../chamah-manager-portal/new/oauth-consent.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../chamah-manager-portal/new/app.js', import.meta.url), 'utf8');
const portalHtml = readFileSync(new URL('../chamah-manager-portal/new/index.html', import.meta.url), 'utf8');
const buildSource = readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('OAuth protected-resource discovery and bearer challenge use the canonical production origin', () => {
  for (const source of [mcpSource, metadataSource, appSource]) {
    assert.match(source, new RegExp(CANONICAL_ORIGIN.replaceAll('.', '\\.')));
    assert.doesNotMatch(source, new RegExp(LEGACY_ORIGIN.replaceAll('.', '\\.')));
  }
  assert.match(mcpSource, /requestOrigin/);
  assert.match(mcpSource, /resource_metadata=/);
  assert.match(mcpSource, /WWW-Authenticate/);
  assert.match(mcpSource, /securitySchemes:\[\{type:'oauth2',scopes:\[\]\}\]/);
  assert.match(mcpSource, /readOnlyHint:READ_ONLY_TOOLS/);
  assert.match(mcpSource, /destructiveHint:DESTRUCTIVE_TOOLS/);
  assert.match(mcpSource, /name:'get_profile'/);
  assert.match(mcpSource, /'openai\/profile':true/);
  assert.doesNotMatch(metadataSource, /const RESOURCE='https:\/\/chamah-portal\.vercel\.app\/api\/mcp'/);
  assert.match(metadataSource, /authorization_servers/);
  assert.match(metadataSource, /bearer_methods_supported/);
});

test('Vercel exposes consent, protected-resource metadata, and MCP routes independently', () => {
  const routes = new Map(vercel.routes.filter((route) => route.src).map((route) => [route.src, route.dest]));
  assert.equal(routes.get('/oauth/consent'), '/oauth-consent.html');
  assert.equal(routes.get('/.well-known/oauth-protected-resource'), '/api/mcp-oauth-metadata.js');
  assert.equal(routes.get('/api/mcp'), '/api/mcp.js');
});

test('Consent reuses and refreshes the portal session before OAuth approval or denial', () => {
  assert.match(consentSource, /sessionKey='chamah\.portal\.session'/);
  assert.match(consentSource, /autoRefreshToken:true/);
  assert.match(consentSource, /await sb\.auth\.getSession\(\)/);
  assert.match(consentSource, /await sb\.auth\.getUser\(\)/);
  assert.match(consentSource, /access\?\.profile\?\.is_active/);
  assert.match(consentSource, /getAuthorizationDetails\(id\)/);
  assert.match(consentSource, /!\('authorization_id' in data\)/);
  assert.match(consentSource, /location\.replace\(data\.redirect_url\)/);
  assert.doesNotMatch(consentSource, /בקשה זו כבר אושרה/);
  assert.match(consentSource, /approveAuthorization\(id\)/);
  assert.match(consentSource, /denyAuthorization\(id\)/);
  assert.match(consentSource, /function navigateToOAuthCallback\(redirectUrl\)/);
  assert.match(consentSource, /finalUrl\.searchParams\.has\('code'\)/);
  assert.match(consentSource, /finalUrl\.searchParams\.has\('state'\)/);
  assert.match(consentSource, /finalUrl\.host!==\'chatgpt\.com\'/);
  assert.match(consentSource, /location\.replace\(finalUrl\.href\)/);
  assert.doesNotMatch(consentSource, /service_role|SUPABASE_SERVICE_ROLE_KEY/i);
});

test('Unauthenticated OAuth resumes through the Preview portal login using only the authorization ID', () => {
  assert.match(consentSource, /if\(sessionError\|\|!session\)return redirectToPortalLogin\(\)/);
  assert.match(consentSource, /if\(authError\|\|!user\)return redirectToPortalLogin\(\)/);
  assert.match(consentSource, /searchParams\.set\('authorization_id',id\)/);
  assert.match(consentSource, /searchParams\.set\('oauth_resume',resume\.href\)/);
  assert.match(buildSource, /javascriptFiles\.push\(join\('dist', 'oauth-consent\.js'\)\)/);
  assert.match(appSource, /function validatedOAuthResumeUrl\(\)/);
  assert.match(appSource, /resume\.origin !== portal\.origin/);
  assert.match(appSource, /resume\.pathname !== '\/oauth\/consent'/);
  assert.match(appSource, /resume\.searchParams\.size !== 1/);
  assert.match(appSource, /if \(resumeOAuthAfterLogin\(\)\) return/);
  assert.match(appSource, /validateSession\(\)/);
  assert.match(portalHtml, /id="login-form"/);
  assert.doesNotMatch(appSource, /localStorage\.setItem\([^\n]*oauth_resume/i);
});

test('MCP validates active portal access and delegates data authorization to scoped RPCs', () => {
  assert.match(mcpSource, /auth\/v1\/user/);
  assert.match(mcpSource, /rest\/v1\/rpc\/portal_my_access/);
  assert.match(mcpSource, /access\?\.profile\?\.is_active/);
  assert.match(mcpSource, /portal_access_denied/);
  for (const rpc of ['portal_mcp_list_policies', 'portal_mcp_read_policy', 'portal_mcp_list_daycares', 'portal_mcp_staff_by_daycare']) {
    assert.match(mcpSource, new RegExp(rpc));
  }
  assert.doesNotMatch(mcpSource, /service_role|SUPABASE_SERVICE_ROLE_KEY/i);
});

test('Stateless MCP discovery supports initialize, tools and notification semantics', () => {
  assert.match(mcpSource, /method==='initialize'/);
  assert.match(mcpSource, /method==='tools\/list'/);
  assert.match(mcpSource, /method!=='tools\/call'/);
  assert.match(mcpSource, /m\.id===undefined/);
  assert.match(mcpSource, /status\(202\)\.end\(\)/);
});
