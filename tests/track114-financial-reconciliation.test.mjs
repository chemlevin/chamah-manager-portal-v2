import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql=readFileSync(new URL('../supabase/migrations/20261110181058_track114_financial_approval_reconciliation.sql',import.meta.url),'utf8');
const mcp=readFileSync(new URL('../api/mcp.js',import.meta.url),'utf8');

test('bank changes are proposed, approval-bound and Director verified without erasing history',()=>{
 assert.match(sql,/SUPPLIER_BANK\.VERIFY','[^']+','SUPPLIER_BANK_DETAIL','UPDATE',true/);
 assert.match(sql,/private\.portal_consume_approval\(p_approval_id,'SUPPLIER_BANK\.VERIFY','SUPPLIER_BANK_DETAIL'/);
 assert.match(sql,/superseded_by_bank_detail_id uuid references public\.supplier_bank_details/);
 assert.match(sql,/supplier_bank_detail_events/);
 assert.match(sql,/proposal_idempotency_key text unique/);
 assert.match(sql,/update supplier_bank_details set is_primary=false,is_active=false/);
});

test('approval, execution evidence and reconciliation remain separate records and actions',()=>{
 for(const table of ['payment_executions','payment_execution_allocations','reconciliation_confirmations','payment_bank_reconciliations']) assert.match(sql,new RegExp(`create table public\\.${table}`));
 assert.match(sql,/separate payment execution evidence required/);
 assert.match(sql,/full bank reconciliation required before verification/);
 assert.match(sql,/PAYMENT_REQUEST\.APPROVE/);
 assert.match(sql,/PAYMENT_EXECUTION\.RECORD/);
 assert.match(sql,/RECONCILIATION\.CONFIRM/);
});

test('atomic match confirmation supports many-to-many partial allocation and blocks double allocation',()=>{
 assert.match(sql,/jsonb_array_length\(p_matches\) not between 1 and 100/);
 assert.match(sql,/payment request reconciliation over-allocation/);
 assert.match(sql,/payment execution reconciliation over-allocation/);
 assert.match(sql,/bank transaction double allocation/);
 assert.match(sql,/for update/);
 assert.match(sql,/confirmation_type.*INDIVIDUAL.*BULK/s);
});

test('automatic matching is suggestion-only and asynchronous imports are durable and idempotent',()=>{
 assert.match(sql,/financial_reconciliation_jobs/);
 assert.match(sql,/job_type in\('STATEMENT_IMPORT','MATCH_SUGGESTIONS'\)/);
 assert.match(sql,/unique\(job_type,idempotency_key\)/);
 assert.match(sql,/auto_confirmed',0/);
 assert.match(sql,/reconciliation_match_suggestions/);
 assert.match(sql,/on conflict\(bank_account_id,source_fingerprint\) do nothing/);
 assert.match(sql,/cron\.schedule\('portal-financial-reconciliation-jobs'/);
});

test('new financial tables default deny and worker functions are not client executable',()=>{
 for(const table of ['supplier_bank_detail_events','payment_executions','payment_execution_allocations','reconciliation_confirmations','payment_bank_reconciliations','reconciliation_match_suggestions','financial_reconciliation_jobs']) assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`));
 assert.match(sql,/revoke all on function private\.portal_process_financial_job\(uuid\),private\.portal_process_financial_jobs\(int\) from public,anon,authenticated/);
 assert.doesNotMatch(mcp,/SUPABASE_SERVICE_ROLE_KEY|execute_sql|raw_sql/i);
});

test('MCP exposes only semantic financial tools with bounded bulk operations',()=>{
 for(const tool of ['propose_supplier_bank_detail','request_supplier_bank_verification_approval','verify_supplier_bank_detail','record_payment_execution','search_bank_reconciliation','confirm_bank_reconciliation','enqueue_bank_statement_import','enqueue_reconciliation_suggestions','get_financial_job']) assert.match(mcp,new RegExp(`name:'${tool}'`));
 assert.match(mcp,/args\.matches\.length>100/);
 assert.match(mcp,/args\.statement\.rows\.length>5000/);
 assert.match(mcp,/enqueue_bank_statement_import'\]\.includes/);
});
