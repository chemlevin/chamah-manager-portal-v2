import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');

test('documentation/governance contract tests: authoritative documents exist', () => {
  for (const file of [
    'AGENTS.md',
    'docs/architecture/CHAMAH_SYSTEM_RULES.md',
    'docs/architecture/CHANGE_CONTROL.md',
    'docs/architecture/CHAMAH_RUNTIME_REGISTRY.md',
  ]) assert.equal(fs.existsSync(file), true, `missing ${file}`);
});

test('documentation/governance contract tests: statuses are authoritative', () => {
  assert.match(read('docs/architecture/CHAMAH_SYSTEM_RULES.md'), /Status: Authoritative/);
  assert.match(read('docs/architecture/CHANGE_CONTROL.md'), /Status: Authoritative/);
  assert.match(read('docs/architecture/CHAMAH_RUNTIME_REGISTRY.md'), /Status: Authoritative/);
});

test('documentation/governance contract tests: registry is the runtime authority', () => {
  const registry = read('docs/architecture/CHAMAH_RUNTIME_REGISTRY.md');
  assert.match(registry, /only authoritative current-runtime identity registry/i);
  assert.match(registry, /iwsbjudahtjyigecymzd[\s\S]*BLOCKED/i);
  assert.match(registry, /Business-data ingestion[\s\S]*BLOCKED/i);
  assert.match(registry, /prj_6IND7ee2E9s3KispBh6iBDWwQo6X/);
  assert.match(registry, /dpl_AJRcm7soRUiqmU8FDrV3xCW4dTSy/);
});

test('documentation/governance contract tests: root rules link the hierarchy', () => {
  const agents = read('AGENTS.md');
  for (const reference of [
    'docs/architecture/CHAMAH_SYSTEM_RULES.md',
    'docs/architecture/CHANGE_CONTROL.md',
    'docs/architecture/CHAMAH_RUNTIME_REGISTRY.md',
  ]) assert.match(agents, new RegExp(reference.replaceAll('.', '\\.') ));
  assert.match(agents, /archive.*absent|absent.*archive/i);
  assert.match(agents, /must not be.*recreated|not.*recreated/i);
});

test('documentation/governance contract tests: environment and write boundaries are documented', () => {
  const rules = read('docs/architecture/CHAMAH_SYSTEM_RULES.md');
  assert.match(rules, /Code Preview/);
  assert.match(rules, /Business-data Preview/);
  assert.match(rules, /Production/);
  assert.match(rules, /No business-data write may occur through MCP, API, Edge Function, browser, SQL, Supabase client/i);
  assert.match(rules, /must not automatically create Git branches, Git worktrees, commits, merges, releases/i);
  assert.match(rules, /No reset, clear, truncate, bulk delete, or broad archive/i);
});

test('documentation/governance contract tests: older documents refer to the registry', () => {
  for (const file of [
    'PROJECT_STATE.md',
    'PROJECT_LOG.md',
    'docs/SYSTEM_MAPPING_AND_INGESTION_SOURCE_OF_TRUTH.md',
    'docs/architecture/TRACK104-unified-ingestion-contract.md',
    'docs/operating-system/README.md',
    'docs/business-rules.md',
    'docs/data/source-of-truth-model.md',
    'docs/data/source-map.md',
    'docs/database/source-to-db-map.md',
    'docs/handbook/import-rules.md',
  ]) assert.match(read(file), /CHAMAH_RUNTIME_REGISTRY\.md/);
});

test('documentation/governance contract tests: runtime enforcement remains future work', () => {
  assert.ok(true, 'These tests verify governance contract and document structure only.');
});
