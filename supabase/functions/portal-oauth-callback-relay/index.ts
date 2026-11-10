import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TABLE = "portal_oauth_callback_relays";
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/portal-oauth-callback-relay/callback`;
const MAX_TTL_SECONDS = 180;
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
const sha256 = async (value: string) => b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
const validRandom = (value: unknown) => typeof value === "string" && /^[A-Za-z0-9_-]{43,128}$/.test(value);
const requestTooLarge = (req: Request) => Number(req.headers.get("content-length") || 0) > 16_384;

async function rest(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, ...(init.headers || {}) } });
}

async function cleanupExpired() {
  await rest(`${TABLE}?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

async function seal(publicJwk: JsonWebKey, payload: unknown) {
  const rsaKey = await crypto.subtle.importKey("jwk", publicJwk, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, new TextEncoder().encode(JSON.stringify(payload)));
  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);
  const wrappedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, rsaKey, rawAesKey);
  return { alg: "RSA-OAEP-256+A256GCM", wrapped_key: b64url(new Uint8Array(wrappedKey)), iv: b64url(iv), ciphertext: b64url(new Uint8Array(ciphertext)) };
}

async function createRelay(req: Request) {
  if (requestTooLarge(req)) return json({ error: "request_too_large" }, 413);
  const body = await req.json().catch(() => null);
  if (!validRandom(body?.state) || !validRandom(body?.delivery_secret) || body.state === body.delivery_secret) return json({ error: "invalid_request" }, 400);
  if (body?.client_public_key?.kty !== "RSA" || body.client_public_key?.alg !== "RSA-OAEP-256" || typeof body.client_public_key?.n !== "string" || body.client_public_key.n.length < 342 || body.client_public_key.n.length > 700 || body.client_public_key?.e !== "AQAB" || body.client_public_key?.d) return json({ error: "invalid_public_key" }, 400);
  const expiresAt = new Date(Date.now() + MAX_TTL_SECONDS * 1000).toISOString();
  const response = await rest(TABLE, { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ state_hash: await sha256(body.state), delivery_secret_hash: await sha256(body.delivery_secret), client_public_key: body.client_public_key, expires_at: expiresAt }) });
  if (!response.ok) return json({ error: response.status === 409 ? "state_already_exists" : "relay_unavailable" }, response.status === 409 ? 409 : 503);
  return json({ callback_uri: CALLBACK_URL, expires_at: expiresAt }, 201);
}

async function receiveCallback(url: URL) {
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  if (!validRandom(state) || (!code && !oauthError) || (code?.length || 0) > 2048 || (oauthError?.length || 0) > 120) return new Response("Invalid callback", { status: 400, headers: JSON_HEADERS });
  const stateHash = await sha256(state);
  const lookup = await rest(`${TABLE}?state_hash=eq.${encodeURIComponent(stateHash)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&sealed_payload=is.null&select=client_public_key`);
  const rows = lookup.ok ? await lookup.json() : [];
  if (rows.length !== 1) return new Response("Expired or already used", { status: 410, headers: JSON_HEADERS });
  const sealed = await seal(rows[0].client_public_key, code ? { code } : { error: oauthError, error_description: url.searchParams.get("error_description") });
  const update = await rest(`${TABLE}?state_hash=eq.${encodeURIComponent(stateHash)}&sealed_payload=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ sealed_payload: sealed }) });
  const updated = update.ok ? await update.json() : [];
  if (updated.length !== 1) return new Response("Expired or already used", { status: 410, headers: JSON_HEADERS });
  return new Response("Authorization received. Return to the requesting application.", { status: 200, headers: { ...JSON_HEADERS, "Content-Type": "text/plain; charset=utf-8" } });
}

async function consumeRelay(req: Request) {
  if (requestTooLarge(req)) return json({ error: "request_too_large" }, 413);
  const body = await req.json().catch(() => null);
  if (!validRandom(body?.state) || !validRandom(body?.delivery_secret)) return json({ error: "invalid_request" }, 400);
  const query = `${TABLE}?state_hash=eq.${encodeURIComponent(await sha256(body.state))}&delivery_secret_hash=eq.${encodeURIComponent(await sha256(body.delivery_secret))}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&sealed_payload=not.is.null`;
  const response = await rest(query, { method: "DELETE", headers: { Prefer: "return=representation" } });
  const rows = response.ok ? await response.json() : [];
  if (rows.length !== 1) return json({ status: "pending_or_expired" }, 404);
  return json({ sealed_payload: rows[0].sealed_payload });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  await cleanupExpired();
  if (req.method === "POST" && url.pathname.endsWith("/session")) return createRelay(req);
  if (req.method === "GET" && url.pathname.endsWith("/callback")) return receiveCallback(url);
  if (req.method === "POST" && url.pathname.endsWith("/consume")) return consumeRelay(req);
  return json({ error: "not_found" }, 404);
});
