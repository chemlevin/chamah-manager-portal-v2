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

test("TRACK026D hourly components use the saved configured Hours 100% input", () => {
  const edge = read("supabase/functions/portal-workforce-workbench/index.ts");
  const ui = read("chamah-manager-portal/new/payroll-workbench.js");
  expect(edge).toContain('configuredInputValue("regular_hours")');
  expect(edge).toContain('configuredInputValue("work_days")');
  expect(edge).not.toContain("amount * Number(record.regular_hours || 0)");
  expect(edge).not.toContain("Number(record.work_days || 0) * Number(rate.daily_travel_amount || 0)");
  expect(ui).toContain("field.oninput");
  expect(ui).toContain("monthlyInputTimers");
});

test("TRACK026E reuses the portal worksheet row and inline-split patterns", () => {
  const ui = read("chamah-manager-portal/new/payroll-workbench.js");
  const employees = read("chamah-manager-portal/new/employees-workbench.js");
  const bankFiles = read("chamah-manager-portal/new/bank-workbench.js");
  const transfers = read("chamah-manager-portal/new/bank-transfer-workbench.js");

  for (const contract of [
    "data-new-payroll-row", "data-save-new-payroll", "data-cancel-new-payroll",
    "workbench-bulk-bar", "bank-split-line", "split-summary-row", "transfer-add-child",
    "data-add-inline-split", "data-delete-inline-split", '$("#wf-kpis").hidden = true',
    '$("#payroll-month-workflow").hidden = true',
  ]) expect(ui).toContain(contract);

  expect(employees).toContain("data-new-employee");
  expect(employees).toContain("workbench-bulk-bar");
  expect(bankFiles).toContain("bank-split-line");
  expect(transfers).toContain("split-summary-row");
  expect(transfers).toContain("transfer-add-child");
});

test("TRACK026F persists manual payroll drafts and uses Bank-style split children", () => {
  const ui = read("chamah-manager-portal/new/payroll-workbench.js");
  const styles = read("chamah-manager-portal/new/styles.css");
  const edge = read("supabase/functions/portal-workforce-workbench/index.ts");

  for (const contract of [
    "data-add-payroll-row", "createPayrollDraft", "DRAFT-", "payroll-employee-search",
    "data-payroll-manual", "employee_identifier", "entryInputFields", "absenceInputFields",
    "payroll-row-number", "manual_employee", "allocated_standard_hours",
  ]) expect(ui).toContain(contract);
  expect(edge).toContain("manualEmployee");
  expect(edge).toContain("manualDraft");
  expect(styles).toContain(".payroll-inline-split input[type=number]{appearance:textfield");
  expect(styles).toContain(".payroll-inline-split input[type=number]::-webkit-inner-spin-button");
  expect(styles).toContain(".payroll-inline-split input[type=number]::-webkit-outer-spin-button");
  expect(edge).toContain("שורת טיוטה דורשת השלמת פרטי עובד");
});
