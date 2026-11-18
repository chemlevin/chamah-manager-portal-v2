import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRuntimeConsistency } from '../api/runtime-consistency.js';

test('accepts the active iws environment and issuer', () => {
  const result = validateRuntimeConsistency({ CHAMAH_SUPABASE_URL: 'https://iwsbjudahtjyigecymzd.supabase.co', CHAMAH_OAUTH_ISSUER: 'https://iwsbjudahtjyigecymzd.supabase.co/auth/v1', CHAMAH_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' });
  assert.equal(result.ok, true);
});

test('blocks the legacy Supabase project and issuer', () => {
  const result = validateRuntimeConsistency({ CHAMAH_SUPABASE_URL: 'https://vyyfuaqmbxvfqgbfqooc.supabase.co', CHAMAH_OAUTH_ISSUER: 'https://vyyfuaqmbxvfqgbfqooc.supabase.co/auth/v1', CHAMAH_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /legacy|must be/);
});

test('blocks partial or non-publishable runtime credentials', () => {
  assert.equal(validateRuntimeConsistency({ CHAMAH_SUPABASE_URL: 'https://iwsbjudahtjyigecymzd.supabase.co' }).ok, false);
  assert.equal(validateRuntimeConsistency({ CHAMAH_SUPABASE_URL: 'https://iwsbjudahtjyigecymzd.supabase.co', CHAMAH_SUPABASE_PUBLISHABLE_KEY: 'anon-key' }).ok, false);
});
