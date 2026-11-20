'use strict';

const ACTIVE_SUPABASE_PROJECT = 'iwsbjudahtjyigecymzd';
const ACTIVE_SUPABASE_URL = `https://${ACTIVE_SUPABASE_PROJECT}.supabase.co`;
const CANONICAL_ORIGIN = 'https://chamah-portal.vercel.app';
const ACTIVE_OAUTH_ISSUER = `${ACTIVE_SUPABASE_URL}/auth/v1`;

function normalizeUrl(value) { return String(value || '').trim().replace(/\/$/, ''); }
function configuredOrigin(env = process.env) { return normalizeUrl(env.CHAMAH_MCP_ORIGIN) || CANONICAL_ORIGIN; }

function validateRuntimeConsistency(env = process.env) {
  const configuredUrl = normalizeUrl(env.CHAMAH_SUPABASE_URL);
  const configuredIssuer = normalizeUrl(env.CHAMAH_OAUTH_ISSUER);
  const errors = [];
  if (!configuredUrl) errors.push('CHAMAH_SUPABASE_URL is required');
  if (!configuredIssuer) errors.push('CHAMAH_OAUTH_ISSUER is required');
  if (!env.CHAMAH_SUPABASE_PUBLISHABLE_KEY) errors.push('CHAMAH_SUPABASE_PUBLISHABLE_KEY is required');
  if (configuredUrl !== ACTIVE_SUPABASE_URL) errors.push(`CHAMAH_SUPABASE_URL must be ${ACTIVE_SUPABASE_URL}`);
  if (configuredIssuer !== ACTIVE_OAUTH_ISSUER) errors.push(`CHAMAH_OAUTH_ISSUER must be ${ACTIVE_OAUTH_ISSUER}`);
  if (configuredUrl.includes('vyyfuaqmbxvfqgbfqooc') || configuredIssuer.includes('vyyfuaqmbxvfqgbfqooc')) errors.push('legacy Supabase project is blocked');
  if (env.CHAMAH_SUPABASE_PUBLISHABLE_KEY && !String(env.CHAMAH_SUPABASE_PUBLISHABLE_KEY).startsWith('sb_publishable_')) errors.push('CHAMAH_SUPABASE_PUBLISHABLE_KEY must be a publishable key');
  return { ok: errors.length === 0, errors, project: ACTIVE_SUPABASE_PROJECT, supabaseUrl: configuredUrl, issuer: configuredIssuer, origin: configuredOrigin(env), resource: `${configuredOrigin(env)}/api/mcp` };
}

function assertRuntimeConsistency(env = process.env) {
  const result = validateRuntimeConsistency(env);
  if (!result.ok) throw new Error(`Environment consistency check failed: ${result.errors.join('; ')}`);
  return result;
}

module.exports = { ACTIVE_SUPABASE_PROJECT, ACTIVE_SUPABASE_URL, CANONICAL_ORIGIN, configuredOrigin, ACTIVE_OAUTH_ISSUER, validateRuntimeConsistency, assertRuntimeConsistency };
