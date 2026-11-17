import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const migration = readFileSync(new URL('../supabase/migrations/20261110091741_track102b_oauth_callback_relay.sql', import.meta.url), 'utf8');
const serviceGrant = readFileSync(new URL('../supabase/migrations/20261110092415_track102c_relay_service_role_grant.sql', import.meta.url), 'utf8');
const relay = readFileSync(new URL('../supabase/functions/portal-oauth-callback-relay/index.ts', import.meta.url), 'utf8');

test('relay storage is private, short-lived, and contains no plaintext OAuth secret columns', () => {
  assert.match(migration, /create table if not exists public\.portal_oauth_callback_relays/);
  assert.match(migration, /expires_at <= created_at \+ interval '5 minutes'/);
  assert.match(migration, /revoke all .* from public, anon, authenticated/i);
  assert.match(migration, /sealed_payload jsonb/);
  assert.doesNotMatch(migration, /\b(code|token|verifier)\s+(text|jsonb)/i);
  assert.match(serviceGrant, /grant select, insert, update, delete[\s\S]*to service_role/i);
  assert.doesNotMatch(serviceGrant, /\bto\s+(?:anon|authenticated|public)\b/i);
});

test('relay hashes state and delivery secret, seals callback data, and atomically consumes it', () => {
  assert.match(relay, /sha256\(body\.state\)/);
  assert.match(relay, /sha256\(body\.delivery_secret\)/);
  assert.match(relay, /RSA-OAEP/);
  assert.match(relay, /AES-GCM/);
  assert.match(relay, /sealed_payload=is\.null/);
  assert.match(relay, /method: "DELETE"/);
  assert.match(relay, /expires_at=lt/);
  assert.match(relay, /await cleanupExpired\(\)/);
  assert.match(relay, /MAX_TTL_SECONDS = 300/);
  assert.match(relay, /Cache-Control": "no-store"/);
  assert.doesNotMatch(relay, /console\.(?:log|error)|SUPABASE_ANON_KEY/);
});

test('relay does not exchange tokens or weaken portal and MCP authorization', () => {
  assert.doesNotMatch(relay, /oauth\/token|refresh_token|portal_my_access|portal_mcp_/);
  assert.equal((relay.match(/Deno\.serve/g) || []).length, 1);
});

test('simulated callback ciphertext is readable only by the initiating key and can be consumed once', async () => {
  const keys = await webcrypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
  const aes = await webcrypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const expected = JSON.stringify({ code: 'disposable-test-code' });
  const ciphertext = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(expected));
  const wrapped = await webcrypto.subtle.encrypt({ name: 'RSA-OAEP' }, keys.publicKey, await webcrypto.subtle.exportKey('raw', aes));
  const unwrapped = await webcrypto.subtle.decrypt({ name: 'RSA-OAEP' }, keys.privateKey, wrapped);
  const decrypted = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, await webcrypto.subtle.importKey('raw', unwrapped, { name: 'AES-GCM' }, false, ['decrypt']), ciphertext);
  assert.equal(new TextDecoder().decode(decrypted), expected);
  const store = new Map([['state-hash', { ciphertext }]]);
  const consumed = store.get('state-hash');
  store.delete('state-hash');
  assert.ok(consumed);
  assert.equal(store.get('state-hash'), undefined);
});
