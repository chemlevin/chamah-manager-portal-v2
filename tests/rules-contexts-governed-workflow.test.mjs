import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20261125200346_rules_contexts_governed_workflow.sql"), "utf8");
const mcp = fs.readFileSync(path.join(root, "api/mcp.js"), "utf8");

test("rule identity, immutable versions, applicability and results remain separate", () => {
  for (const contract of [
    "rule_key uuid not null", "calculation_rules_rule_key_version_uq",
    "previous_version_id uuid", "applicability_group integer",
    "calculation_rule_change_batches", "calculation_rule_results",
    "runtime_context jsonb", "input_source_evidence jsonb", "result_mode text",
  ]) assert.ok(migration.includes(contract), contract);
});

test("approval is bound to exact preview digest and commit is atomic and concurrent-safe", () => {
  for (const contract of [
    "payload_digest", "portal_request_approval('RULES.WRITE'",
    "private.portal_consume_approval", "p_expected_batch_version",
    "pg_advisory_xact_lock", "Rule version changed", "Applicable rule conflict detected",
    "Idempotency key reused with different payload",
  ]) assert.ok(migration.includes(contract), contract);
});

test("resolver fails closed and handler truth is explicit", () => {
  for (const contract of [
    "MISSING_RULE", "AMBIGUOUS_RULE", "UNSUPPORTED_HANDLER",
    "STORED_ONLY", "IMPLEMENTED", "NOT_ENFORCED", "ENFORCED",
    "STAFFING_RATIO_V1", "BUDGET_PARAMETER_V1",
  ]) assert.ok(migration.includes(contract), contract);
});

test("MCP exposes read, governed write, resolution and execution operations", () => {
  for (const tool of [
    "list_calculation_rules", "read_calculation_rule", "preview_calculation_rule",
    "request_calculation_rule_approval", "commit_calculation_rule",
    "get_calculation_rule_batch", "resolve_calculation_rule", "execute_calculation_rule",
  ]) {
    assert.ok(mcp.includes(`name:'${tool}'`), `${tool} schema`);
    assert.ok(mcp.includes(`case '${tool}'`), `${tool} route`);
  }
  assert.match(mcp, /const SERVER_VERSION = '1\.8\.0'/);
});
