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
    "transportation_override",
    "certificate_override",
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
