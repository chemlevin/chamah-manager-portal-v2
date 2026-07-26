import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test.describe('TRACK021 workforce legacy retirement', () => {
  test('legacy Workforce routes forward to canonical Supabase screens', async ({ page }) => {
    await page.goto('/employees/');
    await expect(page).toHaveURL(/#dashboards\/unit\/organization\/staffing\/employees$/);

    await page.goto('/dashboard/');
    await expect(page).toHaveURL(/#dashboards$/);
  });

  test('production configuration excludes retired Google Workforce handlers', async () => {
    const [vercel, app, workforce] = await Promise.all([
      read('vercel.json'),
      read('chamah-manager-portal/new/app.js'),
      read('chamah-manager-portal/new/workforce-workbench.js'),
    ]);

    expect(vercel).not.toContain('api/employees.js');
    expect(vercel).not.toContain('api/payroll.js');
    expect(app).not.toContain('/api/employees');
    expect(app).not.toContain('/api/payroll');
    expect(workforce).not.toContain('/api/employees');
    expect(workforce).not.toContain('/api/payroll');
    expect(app).toContain("rest('payroll_records'");
    expect(app).toContain("rest('payroll_allocations'");
    expect(app).toContain("rest('employees'");
    expect(app).toContain("rest('employee_pay_terms'");
    expect(app).toContain('portal-workforce-workbench');
  });
});
