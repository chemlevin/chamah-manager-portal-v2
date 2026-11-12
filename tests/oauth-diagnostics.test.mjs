import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync(new URL('../api/oauth-diagnostics.js',import.meta.url),'utf8');
const consent=fs.readFileSync(new URL('../chamah-manager-portal/new/oauth-consent.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../chamah-manager-portal/new/app.js',import.meta.url),'utf8');

test('OAuth diagnostics are Preview-only and non-secret',()=>{
  assert.match(api,/PRODUCTION_HOST/);
  assert.match(api,/host === PRODUCTION_HOST/);
  assert.match(api,/console\.log\('\[oauth-diagnostic\]'/);
  assert.match(consent,/queryNames/);
  assert.match(consent,/delete payload\.state/);
  assert.match(consent,/delete payload\.code/);
  assert.match(app,/oauthDiagnostic\('login_resume'/);
  assert.doesNotMatch(api,/authorization_code|access_token|refresh_token/);
});
