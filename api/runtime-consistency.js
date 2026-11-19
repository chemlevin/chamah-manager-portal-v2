'use strict';

const APPROVED_SUPABASE_PROJECTS = new Set(['iwsbjudahtjyigecymzd', 'vyyfuaqmbxvfqgbfqooc']);
const CANONICAL_ORIGIN = 'https://chamah-portal.vercel.app';
const CANONICAL_MCP_RESOURCE = `${CANONICAL_ORIGIN}/api/mcp`;

function normalizeUrl(value) { return String(value || '').trim().replace(/\/$/, ''); }

function projectFromUrl(url) {
  const match = /^https:\/\/([a-z0-9]+)\.supabase\.co$/i.exec(normalizeUrl(url));
  return match ? match[1].toLowerCase() : '';
}

function issuerForUrl(url) {
  const normalized = normalizeUrl(url);
  return normalized ? `${normalized}/auth/v1` : '';
}

function validateRuntimeConsistency(env = process.env) {
  const configuredUrl = normalizeUrl(env.CHAMAH_SUPABASE_URL);
  const configuredIssuer = normalizeUrl(env.CHAMAH_OAUTH_ISSUER);
  const configuredProject = projectFromUrl(configuredUrl);
  const errors = [];
  if (!configuredUrl) errors.push('CHAMAH_SUPABASE_URL is required');
  if (!configuredIssuer) errors.push('CHAMAH_OAUTH_ISSUER is required');
  if (!env.CHAMAH_SUPABASE_PUBLISHABLE_KEY) errors.push('CHAMAH_SUPABASE_PUBLISHABLE_KEY is required');
  if (!APPROVED_SUPABASE_PROJECTS.has(configuredProject)) errors.push('CHAMAH_SUPABASE_URL must point to an approved Chamah Supabase project');
  if (configuredIssuer !== issuerForUrl(configuredUrl)) errors.push('CHAMAH_OAUTH_ISSUER must match CHAMAH_SUPABASE_URL/auth/v1');
  if (env.CHAMAH_SUPABASE_PUBLISHABLE_KEY && !String(env.CHAMAH_SUPABASE_PUBLISHABLE_KEY).startsWith('sb_publishable_')) errors.push('CHAMAH_SUPABASE_PUBLISHABLE_KEY must be a publishable key');
  return { ok: errors.length === 0, errors, project: configuredProject, supabaseUrl: configuredUrl, issuer: configuredIssuer, resource: CANONICAL_MCP_RESOURCE };
}

function assertRuntimeConsistency(env = process.env) {
  const result = validateRuntimeConsistency(env);
  if (!result.ok) throw new Error(`Environment consistency check failed: ${result.errors.join('; ')}`);
  return result;
}

module.exports = { APPROVED_SUPABASE_PROJECTS, CANONICAL_ORIGIN, CANONICAL_MCP_RESOURCE, projectFromUrl, issuerForUrl, validateRuntimeConsistency, assertRuntimeConsistency };