import test from 'node:test';
import assert from 'node:assert/strict';
import { contracts, validateRuntimeConsistency } from '../api/runtime-consistency.js';

const base = (environment) => ({ CHAMAH_ENVIRONMENT: environment, CHAMAH_SUPABASE_PROJECT_ID: contracts[environment].supabaseProjectId, CHAMAH_SUPABASE_URL: contracts[environment].supabaseUrl, CHAMAH_OAUTH_ISSUER: contracts[environment].oauthIssuer, CHAMAH_PORTAL_ORIGIN: contracts[environment].portalOrigin, CHAMAH_MCP_ORIGIN: contracts[environment].mcpOrigin, CHAMAH_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', CHAMAH_BUILD_COMMIT: 'test-commit', CHAMAH_DEPLOYMENT_ID: 'dpl_test' });
const fails = (env) => { const result = validateRuntimeConsistency(env); assert.equal(result.ok, false); return result.errors.join(' '); };

test('accepts valid Production and Preview contracts', () => { assert.equal(validateRuntimeConsistency(base('production')).ok, true); assert.equal(validateRuntimeConsistency(base('preview')).ok, true); });

test('rejects Production with Preview URL or issuer', () => { const env = base('production'); env.CHAMAH_SUPABASE_URL = contracts.preview.supabaseUrl; env.CHAMAH_OAUTH_ISSUER = contracts.preview.oauthIssuer; assert.match(fails(env), /must be|do not match/); });

test('rejects Preview with Production URL or issuer', () => { const env = base('preview'); env.CHAMAH_SUPABASE_URL = contracts.production.supabaseUrl; env.CHAMAH_OAUTH_ISSUER = contracts.production.oauthIssuer; assert.match(fails(env), /must be|do not match/); });

test('rejects missing issuer, project ID, and build commit', () => { const env = base('preview'); delete env.CHAMAH_OAUTH_ISSUER; delete env.CHAMAH_SUPABASE_PROJECT_ID; delete env.CHAMAH_BUILD_COMMIT; const errors = fails(env); assert.match(errors, /CHAMAH_OAUTH_ISSUER is required/); assert.match(errors, /CHAMAH_SUPABASE_PROJECT_ID is required/); assert.match(errors, /CHAMAH_BUILD_COMMIT or VERCEL_GIT_COMMIT_SHA is required/); });

test('rejects mismatched URL/project ID and wrong MCP origin', () => { const env = base('preview'); env.CHAMAH_SUPABASE_PROJECT_ID = contracts.production.supabaseProjectId; env.CHAMAH_MCP_ORIGIN = contracts.production.mcpOrigin; assert.match(fails(env), /must be|do not match/); });

test('rejects missing required values and non-publishable keys', () => { assert.equal(validateRuntimeConsistency({}).ok, false); const env = base('preview'); env.CHAMAH_SUPABASE_PUBLISHABLE_KEY = 'anon-key'; assert.match(fails(env), /publishable key/); });
