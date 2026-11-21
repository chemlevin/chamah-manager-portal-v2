import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mcp = readFileSync(new URL('../api/mcp.js', import.meta.url), 'utf8');
const workforce = readFileSync(new URL('../supabase/functions/portal-workforce-workbench/index.ts', import.meta.url), 'utf8');
const daycarePreview = readFileSync(new URL('../supabase/migrations/20261111195638_track119b_daycare_matching_and_audit_fix.sql', import.meta.url), 'utf8');
const operationalPreview = readFileSync(new URL('../supabase/migrations/20261111203330_track120_operational_mcp.sql', import.meta.url), 'utf8');

test('all remaining preview paths are classified explicitly', () => {
  assert.match(workforce, /body\.action === "preview_import"/);
  assert.match(workforce, /return json\(\{ preview_token: crypto\.randomUUID\(\)/);
  assert.doesNotMatch(workforce.slice(workforce.indexOf('if (body.action === "preview_import")'), workforce.indexOf('if (body.action === "save_record")')), /write\(/);
  assert.match(daycarePreview, /insert into public\.mcp_ingestion_batches/);
  assert.match(operationalPreview, /insert into public\.mcp_ingestion_batches/);
});

test('durable canonical previews are approval-bound and do not commit during preview', () => {
  for (const source of [daycarePreview, operationalPreview]) {
    assert.match(source, /insert into public\.mcp_ingestion_batches/);
    const start = source.indexOf('create or replace function public.portal_mcp_preview');
    const end = source.indexOf('\ncreate or replace function public.', start + 1);
    const previewFunction = source.slice(start, end > start ? end : source.length);
    assert.doesNotMatch(previewFunction, /insert into public\.(daycares|children|employees|suppliers|payment_requests|bank_transactions)/);
    assert.match(source, /requires_director_approval|status.*READY/);
  }
});

test('MCP error responses expose the unified recovery envelope', () => {
  for (const field of ['status', 'technical_code', 'correlation_id', 'batch_id', 'current_stage', 'data_written', 'retry_safe', 'resume_available', 'next_action']) assert.match(mcp, new RegExp(field));
  assert.match(mcp, /Request failed safely/);
  assert.match(mcp, /Retry with the same idempotency key/);
});
