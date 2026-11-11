import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql=readFileSync(new URL('../supabase/migrations/20261110170000_track113_suppliers_payments.sql',import.meta.url),'utf8');
const mcp=readFileSync(new URL('../api/mcp.js',import.meta.url),'utf8');
const atomicSql=readFileSync(new URL('../supabase/migrations/20261111053632_track116_atomic_payment_attachments.sql',import.meta.url),'utf8');

test('canonical additive supplier and payment aggregate is Director action-gated',()=>{
 for(const table of ['suppliers','supplier_bank_details','payment_requests','payment_request_allocations','payment_request_documents','payment_request_events']) assert.match(sql,new RegExp(`create table public\\.${table}`));
 for(const action of ['SUPPLIER.READ','SUPPLIER.CREATE','SUPPLIER.UPDATE','SUPPLIER.IMPORT','PAYMENT_REQUEST.APPROVE','PAYMENT_REQUEST.PAY','PAYMENT_REQUEST.VERIFY','PAYMENT_REQUEST.CANCEL']) assert.match(sql,new RegExp(action.replace('.','\\.')));
 assert.match(sql,/alter table public\.suppliers enable row level security/);
 assert.match(sql,/legacy_bank_transfer_id uuid references public\.bank_transfers/);
});

test('lifecycle, approval, idempotency, allocation and audit contracts are explicit',()=>{
 assert.match(sql,/DRAFT','PENDING','APPROVED','PAID','VERIFIED','CANCELLED/);
 assert.match(sql,/private\.portal_consume_approval/);
 assert.match(sql,/idempotency_key text not null unique/);
 assert.match(sql,/allocation sum must equal request amount/);
 assert.match(sql,/payment_request_events/);
 assert.match(sql,/row_version<>p_expected_row_version/);
});

test('MCP exposes closed supplier and payment tools without privileged credentials',()=>{
 for(const tool of ['search_suppliers','find_supplier_duplicates','create_supplier','update_supplier','import_suppliers','search_payment_requests','create_payment_request','update_payment_request','import_payment_requests','request_payment_transition_approval','transition_payment_request','upload_payment_document','analyze_suppliers_payments']) assert.match(mcp,new RegExp(`name:'${tool}'`));
 assert.doesNotMatch(mcp,/SUPABASE_SERVICE_ROLE_KEY|execute_sql|raw_sql/i);
 assert.match(mcp,/require\('node:crypto'\)/);
 assert.match(mcp,/crypto\.createHash\('sha256'\)/);
});

test('TRACK116 payment attachment retries use guarded compensation and immutable payload identity',()=>{
 assert.match(mcp,/required:\['payment_request_id','document_type','filename','content_type','base64','idempotency_key'\]/);
 assert.match(mcp,/portal_mcp_prepare_payment_attachment/);
 assert.match(mcp,/portal_mcp_finalize_payment_attachment/);
 assert.match(mcp,/portal_mcp_begin_payment_attachment_cleanup/);
 assert.match(mcp,/portal_mcp_complete_payment_attachment_cleanup/);
 assert.match(mcp,/if\(e\.status!==400\)throw e/);
 assert.match(mcp,/removeStorageObject\('payment-request-attachments'/);
 assert.match(atomicSql,/unique \(actor_user_id, idempotency_key\)/);
 assert.match(atomicSql,/idempotency key payload mismatch/);
 assert.match(atomicSql,/for update/);
 assert.match(atomicSql,/status in \('PENDING','FINALIZED','CLEANUP_PENDING','CLEANED'\)/);
 assert.match(atomicSql,/op\.status='CLEANUP_PENDING' and op\.payment_request_document_id is null/);
 assert.match(atomicSql,/not exists\(select 1 from storage\.objects/);
 assert.match(atomicSql,/'phase','PREPARED'/);
 assert.match(atomicSql,/'phase','FINALIZED'/);
 assert.match(atomicSql,/'phase','CLEANED'/);
});
