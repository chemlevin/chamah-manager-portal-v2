import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("TRACK026 adds scoped atomic monthly payroll lifecycle without changing engines", () => {
  const migration = read("supabase/migrations/20260727095329_track026_payroll_monthly_workflow.sql");
  expect(migration).toContain("payroll_months_month_scope_uq");
  expect(migration).toContain("portal_open_payroll_month_v2");
  expect(migration).toContain("copy_previous_employees boolean");
  expect(migration).toContain("load_active_employees boolean");
  expect(migration).toContain("portal_save_payroll_rows_v2");
  expect(migration).toContain("portal_close_payroll_month_v2");
  expect(migration).toContain("PAYROLL_MONTH_VALIDATION_FAILED");
  expect(migration).toContain("portal_reopen_payroll_month_v2");
  expect(migration).toContain("REOPEN_REASON_REQUIRED");
  expect(migration).toContain("row_kind in ('PARENT', 'SPLIT')");
  const hardening = read("supabase/migrations/20260727103035_track026_revoke_payroll_rpc_browser_execute.sql");
  expect(hardening).toContain("from public, anon, authenticated");
  expect(hardening).toContain("to service_role");

  expect(fs.statSync(path.join(root, "api/payroll-engine.js")).isFile()).toBeTruthy();
  expect(fs.statSync(path.join(root, "api/budget-engine.js")).isFile()).toBeTruthy();
});

test("TRACK026 workbench exposes scope, combined loading options, preparation and actual fields", () => {
  const ui = read("chamah-manager-portal/new/payroll-workbench.js");
  const edge = read("supabase/functions/portal-workforce-workbench/index.ts");
  const app = read("chamah-manager-portal/new/app.js");

  for (const contract of [
    'name="scope_type"',
    'name="copy_previous_employees"',
    'name="load_active_employees"',
    "שעות, היעדרויות, ברוטו ועלויות לעולם אינם מועתקים",
    "actual_hours",
    "actual_gross",
    "vacation_deduct",
    "sick_pay",
    "monthly_overrides",
    "actual_notes",
    'data-month-view="REPORTS"',
    "חודשים בעבודה",
    "חודשים סגורים",
    'option value="FILTERED"',
    'option value="XLSX"',
    'option value="XLS"',
    'option value="ACTUAL_COST"',
  ]) expect(ui).toContain(contract);

  expect(edge).toContain('rpc/portal_open_payroll_month_v2');
  expect(edge).toContain('body.action === "save_rows" || body.action === "commit_import"');
  expect(edge).toContain('rpc/portal_close_payroll_month_v2');
  expect(edge).toContain('rpc/portal_reopen_payroll_month_v2');
  expect(app).toContain("else if (route.section === 'payroll') {");
  expect(app).toContain("await mountPayrollWorkbench(portalWorkforceRequest)");
  expect(app).toContain("workforceHubTemplate(canView('dashboards.staffing.employees'), false)");
});

test("TRACK026A keeps the complete monthly workflow inline and details advanced-only", () => {
  const ui = read("chamah-manager-portal/new/payroll-workbench.js");
  const edge = read("supabase/functions/portal-workforce-workbench/index.ts");
  const calculationMigration = read("supabase/migrations/20260727120559_track026a_payroll_calculation_input_rules.sql");

  for (const contract of [
    "ימי עבודה", "שעות 100%", "שעות 125%", "שעות 150%",
    "ניכוי חופשה", "תשלום חופשה", "ימי מחלה לניכוי", "שעות מחלה לתשלום",
    "ברוטו מחושב", "שעות תקן", "שעות בפועל", "ברוטו בפועל",
    "actual_allocation_unit_id", "actual_daycare_id",
    "פירוט חישוב מתקדם · לקריאה בלבד", "payroll-sticky-employee",
    "componentColumns", "payroll_components", "data-payroll-component",
    "configured_rate_display", "effective_hourly_rate",
  ]) expect(ui).toContain(contract);

  expect(ui).not.toContain('id="payroll-monthly-form"');
  expect(ui).not.toContain("inlineEligibility");
  expect(ui).toContain("record.split_summary?.remaining_hours");
  expect(ui).toContain("record.seniority_months");
  expect(ui).not.toContain("minimum_seniority_months");
  expect(edge).toContain("projectPayrollRecords");
  expect(edge).not.toContain("factorKind");
  expect(edge).not.toContain("* 1.25");
  expect(edge).not.toContain("* 1.5");
  expect(edge).toContain("payroll_calculation_input_rules");
  expect(edge).toContain("payroll_components: payrollComponents");
  expect(edge).toContain("configured_rate_display");
  expect(edge).toContain("effective_hourly_rate");
  expect(edge).toContain("monthly_overrides:");
  expect(edge).toContain("split_summary:");
  expect(edge).toContain("פיצול לא מאוזן");
  expect(edge).toContain("PAYROLL_SPLIT_UNBALANCED");
  expect(edge).toContain("actual_allocation_unit_id: uuid(body.actual_allocation_unit_id) || null");
  expect(edge).toContain("actual_daycare_id: uuid(body.actual_daycare_id) || null");
  expect(calculationMigration).toContain("create table public.payroll_calculation_input_rules");
  expect(calculationMigration).toContain("'HOURS_125', 'hours_125'");
  expect(calculationMigration).toContain("'HOURS_150', 'hours_150'");
  expect(calculationMigration).toContain("enable row level security");
});
