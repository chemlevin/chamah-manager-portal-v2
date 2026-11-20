'use strict';

const contracts = require('../config/runtime-contracts.json');
function normalizeUrl(value) { return String(value || '').trim().replace(/\/$/, ''); }
function configuredOrigin(env = process.env) { return normalizeUrl(env.CHAMAH_MCP_ORIGIN); }
function required(env, name, errors) { const value = String(env[name] || '').trim(); if (!value) errors.push(`${name} is required`); return value; }

function validateRuntimeConsistency(env = process.env) {
  const errors = [];
  const environment = required(env, 'CHAMAH_ENVIRONMENT', errors).toLowerCase();
  const contract = contracts[environment];
  if (!contract) errors.push('CHAMAH_ENVIRONMENT must be production or preview');
  const supabaseUrl = normalizeUrl(required(env, 'CHAMAH_SUPABASE_URL', errors));
  const projectId = required(env, 'CHAMAH_SUPABASE_PROJECT_ID', errors);
  const issuer = normalizeUrl(required(env, 'CHAMAH_OAUTH_ISSUER', errors));
  const portalOrigin = normalizeUrl(required(env, 'CHAMAH_PORTAL_ORIGIN', errors));
  const mcpOrigin = normalizeUrl(required(env, 'CHAMAH_MCP_ORIGIN', errors));
  const publishableKey = required(env, 'CHAMAH_SUPABASE_PUBLISHABLE_KEY', errors);
  const buildCommit = String(env.CHAMAH_BUILD_COMMIT || env.VERCEL_GIT_COMMIT_SHA || '').trim();
  if (!buildCommit) errors.push('CHAMAH_BUILD_COMMIT or VERCEL_GIT_COMMIT_SHA is required');
  const deploymentId = String(env.CHAMAH_DEPLOYMENT_ID || env.VERCEL_DEPLOYMENT_ID || '').trim();
  if (contract) {
    for (const [name, actual, expected] of [
      ['CHAMAH_SUPABASE_URL', supabaseUrl, contract.supabaseUrl],
      ['CHAMAH_SUPABASE_PROJECT_ID', projectId, contract.supabaseProjectId],
      ['CHAMAH_OAUTH_ISSUER', issuer, contract.oauthIssuer],
      ['CHAMAH_PORTAL_ORIGIN', portalOrigin, contract.portalOrigin],
      ['CHAMAH_MCP_ORIGIN', mcpOrigin, contract.mcpOrigin]
    ]) if (actual && actual !== expected) errors.push(`${name} must be ${expected} for ${environment}`);
    if (supabaseUrl && projectId && !supabaseUrl.includes(projectId)) errors.push('CHAMAH_SUPABASE_URL and CHAMAH_SUPABASE_PROJECT_ID do not match');
    if (issuer && supabaseUrl && issuer !== `${supabaseUrl}/auth/v1`) errors.push('CHAMAH_OAUTH_ISSUER does not match CHAMAH_SUPABASE_URL');
    if (portalOrigin && mcpOrigin && new URL(portalOrigin).origin !== new URL(mcpOrigin).origin) errors.push('CHAMAH_PORTAL_ORIGIN and CHAMAH_MCP_ORIGIN belong to different environments');
  }
  if (publishableKey && !publishableKey.startsWith('sb_publishable_')) errors.push('CHAMAH_SUPABASE_PUBLISHABLE_KEY must be a publishable key');
  return { ok: errors.length === 0, errors, environment, supabaseProjectId: projectId, supabaseUrl, issuer, portalOrigin, mcpOrigin, origin: mcpOrigin, resource: mcpOrigin ? `${mcpOrigin}/api/mcp` : '', buildCommit, deploymentId };
}
function assertRuntimeConsistency(env = process.env) { const result = validateRuntimeConsistency(env); if (!result.ok) throw new Error(`Environment consistency check failed: ${result.errors.join('; ')}`); return result; }
module.exports = { contracts, configuredOrigin, validateRuntimeConsistency, assertRuntimeConsistency };
