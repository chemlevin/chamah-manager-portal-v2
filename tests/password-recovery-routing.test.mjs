import assert from 'node:assert/strict';
import test from 'node:test';
import { getPasswordRecoveryRedirect } from '../chamah-manager-portal/new/auth-routing.js';
import contracts from '../config/runtime-contracts.json' with { type: 'json' };

const redirects = {
  [contracts.preview.portalOrigin]: contracts.preview.portalOrigin,
  [contracts.production.portalOrigin]: contracts.production.portalOrigin
};
const redirect = (origin) => getPasswordRecoveryRedirect(origin, redirects);

test('Preview maps only to the Preview origin', () => {
  assert.equal(
    redirect('https://chamah-director-preview.vercel.app'),
    'https://chamah-director-preview.vercel.app'
  );
});

test('Production maps only to the Production origin', () => {
  assert.equal(
    redirect('https://chamah-portal.vercel.app'),
    'https://chamah-portal.vercel.app'
  );
});

test('Preview and Production never cross-route', () => {
  assert.notEqual(
    redirect('https://chamah-director-preview.vercel.app'),
    'https://chamah-portal.vercel.app'
  );
  assert.notEqual(
    redirect('https://chamah-portal.vercel.app'),
    'https://chamah-director-preview.vercel.app'
  );
});

test('Unknown, path-bearing, and legacy origins are rejected', () => {
  for (const origin of [
    'https://chamah-portal-chemlevin-chamah.vercel.app',
    'http://localhost:4176',
    'https://chamah-director-preview.vercel.app/extra',
    'not-a-url'
  ]) {
    assert.throws(() => redirect(origin), /unavailable/);
  }
});
