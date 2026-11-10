import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { unlinkSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const endpoint = process.env.TRACK115_DEPLOYMENT;
const email = process.env.TRACK115_EMAIL;
const password = process.env.TRACK115_PASSWORD;
const expectedUserId = process.env.TRACK115_USER_ID;
const daycareId = process.env.TRACK115_DAYCARE_ID;
const bankAccountId = process.env.TRACK115_BANK_ACCOUNT_ID;
assert.ok(endpoint && email && password && expectedUserId && daycareId && bankAccountId, 'TRACK115 live environment is incomplete');

const supabase = 'https://vyyfuaqmbxvfqgbfqooc.supabase.co';
const apiKey = 'sb_publishable_4MKSdjf7O1oVS4SWhQ36Qw_QUKW8dyW';
const auth = await fetch(`${supabase}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: apiKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const authBody = await auth.json();
assert.equal(auth.status, 200, `Director fixture sign-in failed: ${JSON.stringify(authBody)}`);
const session = authBody;
assert.equal(session.user.id, expectedUserId);

function vercelPost(body, token) {
  const configPath = `tmp/track115-curl-${randomUUID()}.cfg`;
  const escapedBody = JSON.stringify(body).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  const lines = ['silent', 'show-error', 'request = "POST"', 'header = "Content-Type: application/json"', 'header = "Accept: application/json, text/event-stream"'];
  if (token) lines.push(`header = "Authorization: Bearer ${token}"`);
  lines.push(`data-binary = "${escapedBody}"`);
  writeFileSync(configPath, `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
  try {
    const args = ['--yes', 'vercel@50.28.0', 'curl', '/api/mcp', '--deployment', endpoint, '--', '--config', configPath];
    const result = spawnSync('npx.cmd', args, { encoding: 'utf8', timeout: 45_000, windowsHide: true, shell: true });
    assert.equal(result.status, 0, `vercel curl failed: ${result.error?.message || result.stderr || result.stdout}`);
    return result.stdout.trim();
  } finally {
    unlinkSync(configPath);
  }
}

const anonymousBody = vercelPost({ jsonrpc: '2.0', id: 0, method: 'tools/list' });
assert.match(anonymousBody, /authentication_required/, 'anonymous MCP request must be denied');

const directTable = await fetch(`${supabase}/rest/v1/suppliers?select=supplier_id&limit=1`, {
  headers: { apikey: apiKey, Authorization: `Bearer ${session.access_token}` },
});
assert.ok([401, 403].includes(directTable.status), 'authenticated users must not receive direct table access');

let sequence = 0;
async function invoke(method, params) {
  const output = vercelPost({ jsonrpc: '2.0', id: ++sequence, method, ...(params ? { params } : {}) }, session.access_token);
  return JSON.parse(output);
}
async function tool(name, args) {
  const response = await invoke('tools/call', { name, arguments: args });
  assert.equal(response.jsonrpc, '2.0');
  return response.result;
}
async function ok(name, args) {
  const result = await tool(name, args);
  assert.equal(result.isError, false, `${name}: ${result.content?.[0]?.text}`);
  return result.structuredContent;
}
async function denied(name, args) {
  const result = await tool(name, args);
  assert.equal(result.isError, true, `${name} unexpectedly succeeded`);
}
async function pollJob(jobId) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const job = await ok('get_financial_job', { job_id: jobId });
    if (job.status === 'COMPLETED') return job;
    assert.notEqual(job.status, 'FAILED', `financial job failed: ${job.last_error}`);
    await new Promise(resolve => setTimeout(resolve, 3_000));
  }
  assert.fail(`financial job ${jobId} did not complete in time`);
}
async function approveTransition(paymentRequestId, targetStatus, rowVersion, detail) {
  const approval = await ok('request_payment_transition_approval', {
    payment_request_id: paymentRequestId,
    target_status: targetStatus,
    expected_row_version: rowVersion,
    detail,
    reason: `TRACK115 ${targetStatus}`,
  });
  return ok('transition_payment_request', {
    payment_request_id: paymentRequestId,
    target_status: targetStatus,
    expected_row_version: rowVersion,
    approval_id: approval.approval_id,
    detail,
  });
}

const listed = (await invoke('tools/list')).result.tools.map(tool => tool.name);
for (const name of [
  'create_supplier', 'propose_supplier_bank_detail', 'request_supplier_bank_verification_approval',
  'verify_supplier_bank_detail', 'create_payment_request', 'upload_payment_document',
  'request_payment_transition_approval', 'transition_payment_request', 'record_payment_execution',
  'enqueue_bank_statement_import', 'get_financial_job', 'search_operational_data',
  'confirm_bank_reconciliation', 'search_bank_reconciliation',
]) assert.ok(listed.includes(name), `missing MCP tool ${name}`);

const marker = `TRACK115-${Date.now()}-${randomUUID().slice(0, 8)}`;
const amount = 115.15;
const supplier = await ok('create_supplier', {
  supplier: {
    supplier_code: marker,
    legal_name: `${marker} Supplier`,
    display_name: `${marker} Supplier`,
    registration_number: marker.replaceAll('-', '').slice(-20),
    notes: 'Disposable authenticated MCP acceptance fixture',
  },
});
assert.equal(supplier.status, 'CREATED');

const bankProposalArgs = {
  supplier_id: supplier.supplier_id,
  bank_detail: { bank_code: '115', branch_code: '115', account_number: marker.replace(/\D/g, '').padEnd(9, '5').slice(0, 9), account_holder: `${marker} Supplier` },
  idempotency_key: `${marker}-bank`,
};
const bankProposal = await ok('propose_supplier_bank_detail', bankProposalArgs);
const bankReplay = await ok('propose_supplier_bank_detail', bankProposalArgs);
assert.equal(bankReplay.status, 'IDEMPOTENT_REPLAY');
assert.equal(bankReplay.supplier_bank_detail_id, bankProposal.supplier_bank_detail_id);

const bankNote = 'TRACK115 verified disposable destination';
const bankApproval = await ok('request_supplier_bank_verification_approval', {
  supplier_bank_detail_id: bankProposal.supplier_bank_detail_id,
  decision: 'VERIFIED',
  expected_row_version: bankProposal.row_version,
  note: bankNote,
  reason: 'TRACK115 bank verification',
});
await denied('verify_supplier_bank_detail', {
  supplier_bank_detail_id: bankProposal.supplier_bank_detail_id,
  decision: 'VERIFIED',
  expected_row_version: bankProposal.row_version,
  approval_id: bankApproval.approval_id,
  note: `${bankNote} tampered`,
});
const bankVerified = await ok('verify_supplier_bank_detail', {
  supplier_bank_detail_id: bankProposal.supplier_bank_detail_id,
  decision: 'VERIFIED',
  expected_row_version: bankProposal.row_version,
  approval_id: bankApproval.approval_id,
  note: bankNote,
});
assert.equal(bankVerified.status, 'VERIFIED');
await denied('verify_supplier_bank_detail', {
  supplier_bank_detail_id: bankProposal.supplier_bank_detail_id,
  decision: 'VERIFIED',
  expected_row_version: bankProposal.row_version,
  approval_id: bankApproval.approval_id,
  note: bankNote,
});

const paymentArgs = {
  request: {
    supplier_id: supplier.supplier_id,
    supplier_bank_detail_id: bankProposal.supplier_bank_detail_id,
    invoice_number: `${marker}-INV`,
    invoice_date: '2026-11-10',
    requested_payment_date: '2026-11-10',
    amount,
    description: `${marker} payment`,
    idempotency_key: `${marker}-payment`,
    allocations: [{ daycare_id: daycareId, amount, business_month: '2026-11-01', notes: marker }],
  },
};
const payment = await ok('create_payment_request', paymentArgs);
const paymentReplay = await ok('create_payment_request', paymentArgs);
assert.equal(paymentReplay.status, 'IDEMPOTENT_REPLAY');
assert.equal(paymentReplay.payment_request_id, payment.payment_request_id);

const invoice = await ok('upload_payment_document', {
  payment_request_id: payment.payment_request_id,
  document_type: 'INVOICE',
  filename: `${marker}.pdf`,
  content_type: 'application/pdf',
  base64: Buffer.from(`%PDF-1.4\n${marker}\n%%EOF`, 'utf8').toString('base64'),
});
assert.equal(invoice.verified, true);

const pending = await ok('transition_payment_request', {
  payment_request_id: payment.payment_request_id,
  target_status: 'PENDING',
  expected_row_version: payment.row_version,
  detail: { marker },
});
assert.equal(pending.status, 'PENDING');
await denied('transition_payment_request', {
  payment_request_id: payment.payment_request_id,
  target_status: 'APPROVED',
  expected_row_version: payment.row_version,
  approval_id: randomUUID(),
  detail: { marker },
});
const approved = await approveTransition(payment.payment_request_id, 'APPROVED', pending.row_version, { marker });
assert.equal(approved.status, 'APPROVED');

const executionArgs = {
  execution: {
    execution_date: '2026-11-10',
    amount,
    bank_reference: marker,
    idempotency_key: `${marker}-execution`,
    note: 'Disposable execution evidence; no transfer performed',
    allocations: [{ payment_request_id: payment.payment_request_id, amount }],
  },
};
const execution = await ok('record_payment_execution', executionArgs);
const executionReplay = await ok('record_payment_execution', executionArgs);
assert.equal(executionReplay.status, 'IDEMPOTENT_REPLAY');
assert.equal(executionReplay.payment_execution_id, execution.payment_execution_id);

const paidDetail = { payment_execution_id: execution.payment_execution_id, payment_reference: marker };
const paid = await approveTransition(payment.payment_request_id, 'PAID', approved.row_version, paidDetail);
assert.equal(paid.status, 'PAID');

const statementArgs = {
  statement: {
    bank_account_id: bankAccountId,
    source_name: marker,
    source_file_name: `${marker}.csv`,
    rows: [{ transaction_date: '2026-11-10', description: `${marker} statement`, reference_number: marker, amount: -amount, source_fingerprint: `${marker}-fingerprint` }],
  },
  idempotency_key: `${marker}-statement-job`,
};
const statementJob = await ok('enqueue_bank_statement_import', statementArgs);
const statementResult = await pollJob(statementJob.job_id);
assert.deepEqual({ accepted_rows: statementResult.result.accepted_rows, duplicate_rows: statementResult.result.duplicate_rows, rejected_rows: statementResult.result.rejected_rows }, { accepted_rows: 1, duplicate_rows: 0, rejected_rows: 0 });
const statementReplay = await ok('enqueue_bank_statement_import', statementArgs);
assert.equal(statementReplay.status, 'IDEMPOTENT_REPLAY');
assert.equal(statementReplay.job_id, statementJob.job_id);

const banking = await ok('search_operational_data', { domain: 'banking', search: marker, limit: 10, offset: 0 });
assert.equal(banking.total, 1);
assert.equal(banking.rows[0].amount, -amount);
const bankTransactionId = banking.rows[0].bank_transaction_id;

await denied('confirm_bank_reconciliation', {
  matches: [{ payment_request_id: payment.payment_request_id, payment_execution_id: execution.payment_execution_id, bank_transaction_id: bankTransactionId, amount: amount + 0.01 }],
  idempotency_key: `${marker}-over-allocation`,
  note: marker,
});
const reconciliationArgs = {
  matches: [{ payment_request_id: payment.payment_request_id, payment_execution_id: execution.payment_execution_id, bank_transaction_id: bankTransactionId, amount }],
  idempotency_key: `${marker}-reconciliation`,
  note: marker,
};
const reconciliation = await ok('confirm_bank_reconciliation', reconciliationArgs);
assert.equal(reconciliation.match_count, 1);
const reconciliationReplay = await ok('confirm_bank_reconciliation', reconciliationArgs);
assert.equal(reconciliationReplay.status, 'IDEMPOTENT_REPLAY');
assert.equal(reconciliationReplay.reconciliation_confirmation_id, reconciliation.reconciliation_confirmation_id);

const verified = await approveTransition(payment.payment_request_id, 'VERIFIED', paid.row_version, { reconciliation_confirmation_id: reconciliation.reconciliation_confirmation_id, marker });
assert.equal(verified.status, 'VERIFIED');
const reconciliationSearch = await ok('search_bank_reconciliation', { status: 'VERIFIED', limit: 100, offset: 0 });
const acceptedRow = reconciliationSearch.rows.find(row => row.payment_request_id === payment.payment_request_id);
assert.deepEqual({ amount: acceptedRow.amount, executed_amount: acceptedRow.executed_amount, reconciled_amount: acceptedRow.reconciled_amount, remaining_amount: acceptedRow.remaining_amount }, { amount, executed_amount: amount, reconciled_amount: amount, remaining_amount: 0 });

console.log(`RESULT_JSON=${JSON.stringify({ marker, userId: expectedUserId, supplierId: supplier.supplier_id, bankDetailId: bankProposal.supplier_bank_detail_id, paymentRequestId: payment.payment_request_id, paymentDocumentId: invoice.payment_request_document_id, paymentObjectPath: invoice.object_path, paymentExecutionId: execution.payment_execution_id, financialJobId: statementJob.job_id, importBatchId: statementResult.result.import_batch_id, bankTransactionId, reconciliationConfirmationId: reconciliation.reconciliation_confirmation_id, amount, toolCount: listed.length, passed: true })}`);
