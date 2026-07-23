import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const migrationPath = new URL('../supabase/migrations/20260723060133_track_011a_fail_closed_permissions.sql', import.meta.url);
const edgeFunctionPath = new URL('../supabase/functions/portal-users/index.ts', import.meta.url);

test.describe('portal permission server contract', () => {
  test('missing and unknown screen permissions resolve directly to HIDDEN without parent traversal', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    expect(sql).toContain("return coalesce(result, 'HIDDEN'::public.portal_permission_level)");
    expect(sql).toContain('where permission.user_id = target_user_id');
    expect(sql).toContain('and permission.screen_code = target_screen_code');
    expect(sql).not.toContain('while current_code is not null');
    expect(sql).not.toContain('parent_screen_code into');
  });

  test('the generic server predicate is service-only and recognizes VIEW and EDIT separately', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    expect(sql).toContain("when 'EDIT' then public.portal_effective_permission(target_user_id, target_screen_code) = 'EDIT'");
    expect(sql).toContain("when 'VIEW' then public.portal_effective_permission(target_user_id, target_screen_code) in ('VIEW', 'EDIT')");
    expect(sql).toContain('revoke all on function public.portal_has_permission');
    expect(sql).toContain('grant execute on function public.portal_has_permission');
    expect(sql).toContain('to service_role');
  });

  test('the administration Edge Function requires explicit EDIT through the generic predicate', async () => {
    const source = await readFile(edgeFunctionPath, 'utf8');
    expect(source).toContain('/rest/v1/rpc/portal_has_permission');
    expect(source).toContain('target_screen_code: "management.permissions.users"');
    expect(source).toContain('required_level: "EDIT"');
  });
});
