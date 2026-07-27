import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(root, 'chamah-manager-portal/new/app.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'supabase/functions/portal-runtime-config/index.ts'), 'utf8');

test.describe('TRACK027 runtime configuration contract', () => {
  test('frontend configuration consumers use the runtime endpoint', () => {
    for (const table of [
      'school_years', 'calendar_years', 'school_year_months', 'allocation_units',
      'daycares', 'daycare_school_years', 'classrooms', 'age_groups', 'roles',
      'budget_categories', 'budget_rules', 'staffing_budget_parameters',
      'compensation_factors', 'compensation_rules', 'classroom_licensing_rules',
      'monthly_work_calendars',
    ]) {
      expect(app).not.toContain(`rest('${table}'`);
    }
    expect(app).toContain('/functions/v1/portal-runtime-config?screen=');
  });

  test('server validates VIEW permission and returns only a screen whitelist', () => {
    expect(runtime).toContain('target_screen_code: screenCode');
    expect(runtime).toContain('required_level: "VIEW"');
    expect(runtime).toContain('PERMISSION_DENIED');
    expect(runtime).toContain('const datasets = screens[screenCode]');
    expect(runtime).toContain('UNKNOWN_SCREEN');
  });

  test('missing configuration is distinct from permission denial', () => {
    expect(runtime).toContain('status: missing.length ? "CONFIGURATION_MISSING" : "READY"');
    expect(runtime).toContain('return json({ error: "PERMISSION_DENIED", screen: screenCode }, 403)');
    expect(app).toContain("$('#salary-state').textContent = salaryModel.error");
    expect(app).toContain("$('#occupancy-state').textContent = occupancyModel.error");
  });

  test('scope filtering happens before configuration reaches the browser', () => {
    expect(runtime).toContain('access.profile?.scope_mode === "SELECTED"');
    expect(runtime).toContain('unitIds.has(row.allocation_unit_id)');
    expect(runtime).toContain('daycareIds.has(row.daycare_id)');
  });

  test('VIEW workbenches suppress every primary mutation entry point', () => {
    for (const selector of ['#wf-add', '#wf-import', '#employee-import', '#bank-new-transaction', '#bank-import', '#transfer-add', '#transfer-import']) {
      expect(app).toContain(`'${selector}'`);
    }
    expect(app).toContain('control.hidden = true; control.disabled = true;');
  });
});
