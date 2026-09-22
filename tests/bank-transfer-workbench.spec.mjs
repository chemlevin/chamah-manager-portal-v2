import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';
import { mockNewPortalSupabase, activeDaycareId, activeOfficeId } from './new-portal-test-data.mjs';

const parentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const childId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const pendingId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const completedId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const categoryId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const daycareId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

function fixture() {
  return {
    transfers: [
      { bank_transfer_id: parentId, row_number: 1, transfer_number: 1001, parent_transfer_id: null, name: 'ספק מפוצל', amount: 1000, bank: 'לאומי', branch: '10', account_number: '123', account_holder: 'ספק', budget_category_id: categoryId, notes: '', allocation_unit_id: activeOfficeId, daycare_id: null, status: 'PENDING', execution_date: null, attachment_path: null },
      { bank_transfer_id: childId, row_number: 2, transfer_number: 1002, parent_transfer_id: parentId, name: 'חלק ראשון', amount: 400, bank: 'לאומי', branch: '10', account_number: '123', account_holder: 'ספק', budget_category_id: categoryId, notes: '', allocation_unit_id: activeOfficeId, daycare_id: null, status: 'COMPLETED', execution_date: '2026-07-25', attachment_path: null },
      { bank_transfer_id: pendingId, row_number: 3, transfer_number: 1003, parent_transfer_id: null, name: 'תשלום ממתין', amount: 250, bank: 'הפועלים', branch: '20', account_number: '456', account_holder: 'מוטב', budget_category_id: categoryId, notes: 'דחוף', allocation_unit_id: activeDaycareId, daycare_id: daycareId, status: 'PENDING', execution_date: null, attachment_path: null },
      { bank_transfer_id: completedId, row_number: 4, transfer_number: 1004, parent_transfer_id: null, name: 'תשלום היסטורי', amount: 800, bank: 'מזרחי', branch: '30', account_number: '789', account_holder: 'עבר', budget_category_id: categoryId, notes: '', allocation_unit_id: activeOfficeId, daycare_id: null, status: 'COMPLETED', execution_date: '2026-07-20', attachment_path: null },
    ],
    categories: [{ budget_category_id: categoryId, budget_category_code: 'SUPPLIERS', display_name: 'ספקים', lifecycle_status: 'ACTIVE', display_order: 1 }],
    units: [
      { allocation_unit_id: activeOfficeId, allocation_unit_code: 'OFFICE', display_name: 'משרד', allocation_unit_type: 'OFFICE', lifecycle_status: 'ACTIVE', display_order: 1 },
      { allocation_unit_id: activeDaycareId, allocation_unit_code: 'DC', display_name: 'מעונות', allocation_unit_type: 'DAYCARE', lifecycle_status: 'ACTIVE', display_order: 2 },
    ],
    daycares: [{ daycare_id: daycareId, daycare_code: 'DC-1', display_name: 'מעון א', allocation_unit_id: activeDaycareId, lifecycle_status: 'ACTIVE', display_order: 1 }],
  };
}

async function openWorkbench(page, actions = []) {
  await mockNewPortalSupabase(page);
  const data = fixture();
  await page.route('**/functions/v1/portal-bank-transfer-workbench', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    const body = request.postDataJSON();
    actions.push(body);
    if (body.action === 'save') {
      const transfer = {
        ...body,
        bank_transfer_id: body.bank_transfer_id || crypto.randomUUID(),
        row_number: body.row_number || data.transfers.length + 1,
        transfer_number: body.transfer_number || 1100 + data.transfers.length,
        created_at: data.transfers.find((row) => row.bank_transfer_id === body.bank_transfer_id)?.created_at || '2026-07-26T08:00:00Z',
      };
      const index = data.transfers.findIndex((row) => row.bank_transfer_id === body.bank_transfer_id);
      if (index >= 0) data.transfers[index] = transfer; else data.transfers.push(transfer);
      return route.fulfill({ status: body.bank_transfer_id ? 200 : 201, contentType: 'application/json', body: JSON.stringify({ transfer }) });
    }
    if (body.action === 'mark_completed') {
      const row = data.transfers.find((item) => item.bank_transfer_id === body.bank_transfer_id);
      Object.assign(row, { status: 'COMPLETED' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transfer: row }) });
    }
    if (body.action === 'delete') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ archived: [body.bank_transfer_id] }) });
    if (body.action === 'upload_attachment') {
      const row = data.transfers.find((item) => item.bank_transfer_id === body.bank_transfer_id);
      Object.assign(row, { attachment_path: `${row.bank_transfer_id}/receipt.pdf`, attachment_name: body.file_name });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transfer: row }) });
    }
    if (body.action === 'import') return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ imported: body.rows.length, transfers: [] }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/new/#dashboards/unit/organization/accounting/bank-transfers');
  if (await page.locator('#email').isVisible()) {
    await page.locator('#email').fill('qa@example.test');
    await page.locator('#password').fill('בדיקה12345');
    await page.locator('#login-submit').click();
  }
  await expect(page.locator('#transfer-rows')).toBeVisible();
  return data;
}

test('default view, KPIs and split summary follow TRACK023 rules', async ({ page }, testInfo) => {
  await openWorkbench(page);
  await expect(page.getByRole('heading', { name: 'העברות בנקאיות' })).toBeVisible();
  await expect(page.locator('#transfer-kpis article').nth(0)).toContainText('2');
  await expect(page.locator('#transfer-kpis article').nth(1)).toContainText('850.00');
  await expect(page.locator(`[data-transfer-row="${pendingId}"] [name="name"]`)).toHaveValue('תשלום ממתין');
  await expect(page.locator('#transfer-rows')).toContainText('סכום מקורי');
  await expect(page.locator('#transfer-rows')).toContainText('600.00');
  await expect(page.locator(`[data-transfer-row="${completedId}"]`)).toHaveCount(0);
  await page.locator('#transfer-view').selectOption('COMPLETED');
  await expect(page.locator(`[data-transfer-row="${completedId}"] [name="name"]`)).toHaveValue('תשלום היסטורי');
  if (testInfo.project.name === 'desktop-1440') await page.screenshot({ path: 'screenshots/track025a/bank-transfers-desktop.png', fullPage: true });
});

test('multi-select deletes selected transfer rows', async ({ page }) => {
  const actions = [];
  await openWorkbench(page, actions);
  await page.locator(`[data-select-transfer="${pendingId}"]`).check();
  await expect(page.locator('#transfer-delete-selected')).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#transfer-delete-selected').click();
  await expect.poll(() => actions.some((body) => body.action === 'delete' && body.bank_transfer_id === pendingId)).toBeTruthy();
});

test('inline autosave and direct completed action require a manual execution date', async ({ page }) => {
  const actions = [];
  await openWorkbench(page, actions);
  const row = page.locator(`[data-transfer-row="${pendingId}"]`);
  await row.locator('[data-mark-completed]').click();
  await expect(page.locator('#transfer-message')).toContainText('יש להזין תאריך ביצוע ידנית');
  await expect.poll(() => actions.some((body) => body.action === 'mark_completed')).toBeFalsy();
  await row.locator('[name="execution_date"]').fill('2026-07-26');
  await expect.poll(() => actions.some((body) => body.action === 'save' && body.execution_date === '2026-07-26')).toBeTruthy();
  await row.locator('[data-mark-completed]').click();
  await expect.poll(() => actions.some((body) => body.action === 'mark_completed' && body.bank_transfer_id === pendingId)).toBeTruthy();
});

test('partial edits persist after refresh without execution date and retain entry date', async ({ page }) => {
  const actions = [];
  await openWorkbench(page, actions);
  await page.locator('#transfer-add').click();
  const row = page.locator('[data-transfer-row^="temp-"]');
  await row.locator('[name="name"]').fill('טיוטה חלקית');
  await expect.poll(() => actions.find((body) => body.action === 'save' && body.name === 'טיוטה חלקית')).toBeTruthy();
  await expect(page.locator('[data-transfer-row^="temp-"]')).toHaveCount(0);
  await page.reload();
  const saved = page.locator('#transfer-rows tr[data-transfer-row]').filter({ has: page.locator('[name="name"][value="טיוטה חלקית"]') });
  await expect(saved.locator('[name="name"]')).toHaveValue('טיוטה חלקית');
  await expect(saved).toContainText('26.7.2026');
  await expect(saved).toContainText('ממתין לתאריך ביצוע');
  await saved.locator('[name="bank"]').fill('לאומי');
  await expect.poll(() => actions.filter((body) => body.action === 'save' && body.name === 'טיוטה חלקית').length).toBeGreaterThan(1);
  await page.reload();
  await expect(page.locator('#transfer-rows')).toContainText('26.7.2026');
});

test('split rows save without dates, copy applicable fields, and reopen after collapse', async ({ page }) => {
  const actions = [];
  const data = await openWorkbench(page, actions);
  await page.locator(`[data-toggle-split="${parentId}"]`).click();
  await page.locator(`[data-add-split="${parentId}"]`).click();
  const child = page.locator('[data-transfer-row^="temp-"]');
  await child.locator('[data-copy-split]').click();
  await expect.poll(() => actions.some((body) => body.action === 'save' && body.parent_transfer_id === parentId && !body.execution_date && body.bank === 'לאומי' && body.allocation_unit_id === activeOfficeId)).toBeTruthy();
  await page.locator(`[data-toggle-split="${parentId}"]`).click();
  await expect(page.locator('[data-transfer-row^="temp-"]')).toHaveCount(0);
  await page.locator(`[data-toggle-split="${parentId}"]`).click();
  await expect(page.locator(`[data-transfer-row="${childId}"]`)).toBeVisible();
  const copied = data.transfers.find((row) => row.parent_transfer_id === parentId && row.bank_transfer_id !== childId);
  await expect(page.locator(`[data-transfer-row="${copied.bank_transfer_id}"] [name="bank"]`)).toHaveValue('לאומי');
});

test('missing attachment count and filter include hidden completed and split rows', async ({ page }) => {
  await openWorkbench(page);
  await expect(page.locator('[data-filter-missing]')).toContainText('4');
  await page.locator('[data-filter-missing]').click();
  await expect(page.locator('#transfer-view')).toHaveValue('missing-attachment');
  await expect(page.locator(`[data-transfer-row="${completedId}"]`)).toBeVisible();
  await expect(page.locator('#transfer-count')).toContainText('3');
});

test('Excel import resolves Supabase lookups and attachment upload uses the row action', async ({ page }) => {
  const actions = [];
  await openWorkbench(page, actions);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('העברות');
  sheet.addRow(['שם','סכום','בנק','סעיף תקציבי','מחלקה','סטטוס']);
  sheet.addRow(['ייבוא תקין',500,'לאומי','ספקים','משרד','ממתין']);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#transfer-file').setInputFiles({ name: 'transfers.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from(await workbook.xlsx.writeBuffer()) });
  await expect.poll(() => actions.some((body) => body.action === 'import' && body.rows[0].budget_category_id === categoryId && body.rows[0].allocation_unit_id === activeOfficeId)).toBeTruthy();
  const row = page.locator(`[data-transfer-row="${pendingId}"]`);
  await row.locator('[data-attachment-file]').setInputFiles({ name: 'receipt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-test') });
  await expect.poll(() => actions.some((body) => body.action === 'upload_attachment' && body.file_name === 'receipt.pdf')).toBeTruthy();
});
