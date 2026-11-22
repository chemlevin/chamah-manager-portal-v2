import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const agents = read('../AGENTS.md');
const rules = read('../docs/architecture/CHAMAH_SYSTEM_RULES.md');
const control = read('../docs/architecture/CHANGE_CONTROL.md');
const registry = read('../docs/architecture/CHAMAH_RUNTIME_REGISTRY.md');
const architecture = read('../docs/architecture/README.md');
const operating = read('../docs/operating-system/README.md');
const sourceTruth = read('../docs/data/source-of-truth-model.md');
const sourceMap = read('../docs/data/source-map.md');

test('permanent governance hierarchy is explicit and cross-referenced', () => {
  for (const marker of ['CHAMAH_SYSTEM_RULES.md', 'CHANGE_CONTROL.md', 'CHAMAH_RUNTIME_REGISTRY.md']) assert.match(agents, new RegExp(marker.replaceAll('.', '\\.'), 'i'));
  assert.match(rules, /AGENTS\.md/);
  assert.match(rules, /CHANGE_CONTROL\.md/);
  assert.match(rules, /CHAMAH_RUNTIME_REGISTRY\.md/);
  assert.match(control, /subordinate to `AGENTS\.md` and `CHAMAH_SYSTEM_RULES\.md`/i);
  assert.match(registry, /only current runtime-identity authority/i);
  assert.match(architecture, /(?:cannot override|must not override)/i);
  assert.match(operating, /(?:cannot override|must not override)/i);
  assert.match(sourceTruth, /Governance precedence/i);
  assert.match(sourceMap, /subordinate domain detail/i);
});

test('permanent rules define separated environments and prohibit cross-environment writes', () => {
  assert.match(rules, /Production is the authoritative live business-data environment/);
  assert.match(rules, /business-data Preview batch/);
  assert.match(rules, /cross-environment database read\/write.*prohibited/i);
  assert.match(rules, /exact Vercel and Supabase project IDs/);
});

test('identity, ingestion, provenance, and safety rules are enforceable text', () => {
  for (const marker of ['national ID', 'employee code', 'Row position is never', 'cannot silently create', 'PROPOSED → PREVIEWED → RECONCILED → APPROVED → COMMITTED → VERIFIED', 'source filename', 'source row', 'content digest', 'Failed read-back cannot trigger blind recommit', 'unknown commit result']) assert.match(rules, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), marker);
  assert.match(rules, /Legacy direct-write paths are read-only or fail closed/);
  assert.match(rules, /Physical deletion of authoritative payroll, bank, audit, or lineage history is prohibited/);
});

test('future MCP surfaces are documented without implementation claims', () => {
  assert.match(rules, /Business MCP/);
  assert.match(rules, /Analytical MCP.*future separate surface/i);
  assert.match(rules, /Manager MCP.*future separate authenticated read-only surface/i);
  assert.match(rules, /not implemented, deployed, or implied/i);
});

test('common error envelope and change classifications are present', () => {
  for (const field of ['status', 'technical_code', 'correlation_id', 'batch_id', 'current_stage', 'processed_count', 'unprocessed_count', 'data_written', 'retry_safe', 'resume_available', 'next_action']) assert.match(rules, new RegExp('`' + field + '`'));
  for (const classification of ['LOCAL_SAFE_CHANGE', 'SHARED_CHANGE', 'REQUIRES_EXPLICIT_AUTHORIZATION', 'PROHIBITED_WITHOUT_BUSINESS_DECISION']) assert.match(rules, new RegExp(classification));
  assert.match(control, /Production deployment or mutation is implied by Preview work/);
  assert.match(control, /Every TRACK or equivalent work item reports/);
});
