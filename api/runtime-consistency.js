'use strict';

const ACTIVE_SUPABASE_PROJECT = 'iwsbjudahtjyigecymzd';
const ACTIVE_SUPABASE_URL = `https://${ACTIVE_SUPABASE_PROJECT}.supabase.co`;
const CANONICAL_ORIGIN = 'https://chamah-portal.vercel.app';
const CANONICAL_MCP_RESOURCE = `${CANONICAL_ORIGIN}/api/mcp`;
const ACTIVE_OAUTH_ISSUER = `${ACTIVE_SUPABASE_URL}/auth/v1`;

function normalizeUrl(value) { return String(value || '').trim().replace(/\/$/, ''); }

function validateRuntimeConsistency(env = process.env) {
  const configuredUrl = normalizeUrl(env.CHAMAH_SUPABASE_URL || ACTIVE_SUPABASE_URL);
  const configuredIssuer = normalizeUrl(env.CHAMAH_OAUTH_ISSUER || ACTIVE_OAUTH_ISSUER);
  const errors = [];
  if (configuredUrl !== ACTIVE_SUPABASE_URL) errors.push(`CHAMAH_SUPABASE_URL must be ${ACTIVE_SUPABASE_URL}`);
  if (configuredIssuer !== ACTIVE_OAUTH_ISSUER) errors.push(`CHAMAH_OAUTH_ISSUER must be ${ACTIVE_OAUTH_ISSUER}`);
  if (env.CHAMAH_SUPABASE_URL && configuredUrl.includes('vyyfuaqmbxvfqgbfqooc')) errors.push('legacy Supabase project is blocked');
  if (env.CHAMAH_OAUTH_ISSUER && configuredIssuer.includes('vyyfuaqmbxvfqgbfqooc')) errors.push('legacy OAuth issuer is blocked');
  if (env.CHAMAH_SUPABASE_URL && !env.CHAMAH_SUPABASE_PUBLISHABLE_KEY) errors.push('CHAMAH_SUPABASE_PUBLISHABLE_KEY is required with CHAMAH_SUPABASE_URL');
  if (env.CHAMAH_SUPABASE_PUBLISHABLE_KEY && !String(env.CHAMAH_SUPABASE_PUBLISHABLE_KEY).startsWith('sb_publishable_')) errors.push('CHAMAH_SUPABASE_PUBLISHABLE_KEY must be a publishable key');
  return { ok: errors.length === 0, errors, project: ACTIVE_SUPABASE_PROJECT, supabaseUrl: configuredUrl, issuer: configuredIssuer, resource: CANONICAL_MCP_RESOURCE };
}

function assertRuntimeConsistency(env = process.env) {
  const result = validateRuntimeConsistency(env);
  if (!result.ok) throw new Error(`Environment consistency check failed: ${result.errors.join('; ')}`);
  return result;
}

module.exports = { ACTIVE_SUPABASE_PROJECT, ACTIVE_SUPABASE_URL, CANONICAL_ORIGIN, CANONICAL_MCP_RESOURCE, ACTIVE_OAUTH_ISSUER, validateRuntimeConsistency, assertRuntimeConsistency };
