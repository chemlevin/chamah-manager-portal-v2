import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql=readFileSync(new URL('../supabase/migrations/20261110170000_track113_suppliers_payments.sql',import.meta.url),'utf8');
const mcp=readFileSync(new URL('../api/mcp.js',import.meta.url),'utf8');

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
});
