import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildTamaPreviewRequest } from '../lib/tama-report-files.js';
import fsSync from 'node:fs';

const files = ['September-2026.pdf', 'October-2026-1.pdf', 'October-2026-2.pdf'];

test('MCP manifest registers the TAMA operation as a read-only callable', async () => {
  const api = await fsSync.promises.readFile(new URL('../api/mcp.js', import.meta.url), 'utf8');
  assert.match(api, /const SERVER_VERSION = '1\.7\.0'/);
  assert.match(api, /name:'preview_tama_funding_reports'/);
  assert.match(api, /'preview_tama_funding_reports'/);
  assert.match(api, /preview_tama_funding_reports:'PREVIEW'/);
  assert.match(api, /enum:\['September-2026\.pdf','October-2026-1\.pdf','October-2026-2\.pdf'\]/);
});

test('server-side TAMA operation parses the allowlisted reports and reconciles 720 rows', async () => {
  const built = await buildTamaPreviewRequest(files);
  assert.equal(built.expected_child_rows, 720);
  assert.equal(built.expected_total, 541409);
  assert.deepEqual(built.reports.map(report => report.reconciliation.child_count), [205, 245, 270]);
  assert.deepEqual(built.reports.map(report => report.reconciliation.movement_total), [191302, 262867, 87240]);
  assert.equal(built.request.canonical_writes, false);
  assert.equal(built.request.rows.length, 720);
  assert.ok(built.request.preview_digest);
  assert.ok(built.request.idempotency_key);
  assert.ok(built.request.rows.every(row => row.values?.national_id && row.values?.source_payload?.filename && row.values?.original_values));
});

test('the deployed function bundles exactly the three server-side report files', async () => {
  for (const file of files) {
    const stat = await fs.stat(new URL(`../documents/tama-2026/${file}`, import.meta.url));
    assert.ok(stat.size > 1000);
  }
});
