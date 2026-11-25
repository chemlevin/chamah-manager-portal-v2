import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const foundation = read("supabase/migrations/20261125161302_canonical_calculation_rules_and_contexts.sql");
const immutability = read("supabase/migrations/20261125161358_enforce_calculation_rule_immutability.sql");
const proposedAccessFix = read("supabase/proposals/calculation_rule_read_grants.sql");

test("foundation preserves canonical IDs, typed contexts, RLS, and an invoker view", () => {
  assert.match(foundation, /calculation_rule_id uuid primary key default gen_random_uuid\(\)/);
  assert.match(foundation, /calculation_rule_context_id uuid primary key default gen_random_uuid\(\)/);
  assert.match(foundation, /references public\.calculation_rules\(calculation_rule_id\) on delete restrict/);
  assert.match(foundation, /constraint calculation_rule_context_value_matches_kind check/);
  assert.match(foundation, /unique \(calculation_rule_id, context_kind\)/);
  assert.match(foundation, /alter table public\.calculation_rules enable row level security/);
  assert.match(foundation, /alter table public\.calculation_rule_contexts enable row level security/);
  assert.match(foundation, /for select to authenticated\s+using \(\(select private\.can_read_portal\(\)\)\)/);
  assert.match(foundation, /with \(security_invoker = true\)/);
});

test("active rules and their contexts are protected by immutable-version triggers", () => {
  assert.match(immutability, /An ACTIVE calculation rule must have at least one context/);
  assert.match(immutability, /An ACTIVE calculation rule is immutable; create a replacement rule/);
  assert.match(immutability, /Contexts of an ACTIVE calculation rule are immutable; create a replacement rule/);
  assert.match(immutability, /before insert or update on public\.calculation_rules/);
  assert.match(immutability, /before insert or update or delete on public\.calculation_rule_contexts/);
  assert.match(immutability, /revoke all on function private\.guard_calculation_rule_activation\(\) from public/);
  assert.match(immutability, /revoke all on function private\.guard_calculation_rule_context_mutation\(\) from public/);
});

test("deployed migration does not misrepresent stored JSON as verified approval", () => {
  assert.match(foundation, /approval_evidence <> '\{\}'::jsonb/);
  assert.doesNotMatch(foundation, /approval_id|approval_digest|approved_by|approval_expires/);
  assert.doesNotMatch(foundation, /exclude using gist|no overlap|conflict/i);
});

test("unapplied access repair is minimal and read-only", () => {
  const statements = proposedAccessFix
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("--"));
  assert.deepEqual(statements, [
    "grant select on table public.calculation_rules to authenticated, service_role;",
    "grant select on table public.calculation_rule_contexts to authenticated, service_role;",
    "grant select on table public.calculation_rule_context_readable to authenticated, service_role;",
  ]);
});
