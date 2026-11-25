import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Preview Operational Workspace dependency graph resolves', () => {
  const script = "require('./api/mcp-operational-workspace.js'); process.stdout.write('resolved')";
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      CHAMAH_ENVIRONMENT: 'preview',
      CHAMAH_SUPABASE_URL: 'https://iwsbjudahtjyigecymzd.supabase.co',
      CHAMAH_SUPABASE_PROJECT_ID: 'iwsbjudahtjyigecymzd',
      CHAMAH_OAUTH_ISSUER: 'https://iwsbjudahtjyigecymzd.supabase.co/auth/v1',
      CHAMAH_PORTAL_ORIGIN: 'https://chamah-director-preview.vercel.app',
      CHAMAH_MCP_ORIGIN: 'https://chamah-director-preview.vercel.app',
      CHAMAH_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_dependency_test',
      CHAMAH_BUILD_COMMIT: 'dependency-test',
    },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'resolved');
});
