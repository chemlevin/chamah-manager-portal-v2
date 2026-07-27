import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("TRACK026D keeps the payroll worksheet and split validation backend-driven", () => {
  const ui = read("chamah-manager-portal/new/payroll-workbench.js");
  const shell = read("chamah-manager-portal/new/workforce-workbench.js");
  const edge = read("supabase/functions/portal-workforce-workbench/index.ts");
  const migration = read("supabase/migrations/20260727141324_track026d_accounting_split_fields.sql");

  for (const contract of [
    "visibleMonthlyInputFields", "visibleComponents", "inlineSplitRows",
    "data-add-inline-split", "payroll-split-summary", "preview_allocations",
    "actual_net", "allocated_standard_hours", "allocated_net", "allocated_gross",
    "data-new-payroll-row", "data-save-new-payroll", "data-cancel-new-payroll",
  ]) expect(ui).toContain(contract);

  expect(shell).toContain("? '<section class=\"bank-sheet-layout\"");
  expect(shell).toContain("payroll ? \"ביצוע שכר\"");
  expect(edge).toContain('body.action === "preview_allocations"');
  expect(edge).toContain("remaining_standard_hours");
  expect(edge).toContain("remaining_net");
  expect(edge).toContain("remaining_gross");
  expect(migration).toContain("actual_net numeric(14,2)");
  expect(migration).toContain("allocated_standard_hours numeric(10,2)");
  expect(migration).toContain("portal_save_payroll_allocations");
});
