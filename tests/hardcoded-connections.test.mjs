import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['api', 'chamah-manager-portal', 'scripts'];
const files = [];
function collect(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) collect(path); else if (/\.(?:js|mjs|html|json)$/.test(name)) files.push(path);
  }
}
for (const root of roots) collect(root);

test('source has no duplicate Supabase connection definitions', () => {
  const source = files.map((path) => readFileSync(path, 'utf8')).join('\n');
  assert.doesNotMatch(source, /https:\/\/(?:vyyfuaqmbxvfqgbfqooc|iwsbjudahtjyigecymzd)\.supabase\.co/);
  assert.doesNotMatch(source, /(?:vyyfuaqmbxvfqgbfqooc|iwsbjudahtjyigecymzd)\.supabase\.co\/auth\/v1/);
  assert.doesNotMatch(source, /location\.hostname|location\.host\s*===|\|\|\s*(?:CANONICAL|ACTIVE|PRODUCTION|PREVIEW)/);
});

test('browser source uses build placeholders and has no server credentials', () => {
  const browserFiles = files.filter((path) => path.startsWith('chamah-manager-portal'));
  const source = browserFiles.map((path) => readFileSync(path, 'utf8')).join('\n');
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|service_role|sb_secret_/i);
  assert.match(source, /__CHAMAH_SUPABASE_URL__|__CHAMAH_PUBLISHABLE_KEY__|__CHAMAH_PORTAL_ORIGIN__|__CHAMAH_MCP_ORIGIN__/);
});

test('built browser assets contain no server credentials or unresolved contract tokens', () => {
  let distFiles = [];
  try { distFiles = readdirSync('dist', { recursive: true }).filter((path) => /\.(?:js|html|json)$/.test(path)); } catch { return; }
  const bundle = distFiles.map((path) => readFileSync(join('dist', path), 'utf8')).join('\n');
  assert.doesNotMatch(bundle, /SUPABASE_SERVICE_ROLE_KEY|service_role|sb_secret_/i);
  assert.doesNotMatch(bundle, /__CHAMAH_[A-Z_]+__/);
});
