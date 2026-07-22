import { test, expect } from '@playwright/test';

const rows = [
  { setting_id: '1', setting_code: 'ALPHA', display_name: 'אלפא', lifecycle_status: 'ACTIVE', notes: 'ראשון' },
  { setting_id: '2', setting_code: 'BETA', display_name: 'בטא', lifecycle_status: 'INACTIVE', notes: 'שני' },
  { setting_id: '3', setting_code: 'GAMMA', display_name: 'גמא', lifecycle_status: 'ACTIVE', notes: 'שלישי' },
  { setting_id: '4', setting_code: 'DELTA', display_name: 'דלתא', lifecycle_status: 'ACTIVE', notes: 'רביעי' },
  { setting_id: '5', setting_code: 'EPSILON', display_name: 'אפסילון', lifecycle_status: 'INACTIVE', notes: 'חמישי' },
  { setting_id: '6', setting_code: 'ZETA', display_name: 'זטא', lifecycle_status: 'ACTIVE', notes: 'שישי' }
];

async function mount(page, options = {}) {
  await page.goto('/admin-framework.js');
  await page.setContent('<!doctype html><html lang="he" dir="rtl"><head><link rel="stylesheet" href="/admin-framework.css"></head><body><main id="root"></main></body></html>');
  await page.evaluate(async ({ seed, repositoryMode }) => {
    const framework = await import('/admin-framework.js');
    const metadata = {
      entity: 'test_settings', label: 'הגדרה', pluralLabel: 'הגדרות מערכת', primaryKey: 'setting_id', pageSize: 5,
      description: 'מסך בדיקה הנוצר ממטא־דאטה בלבד.', searchFields: ['setting_code', 'display_name'], defaultSort: { field: 'display_name', direction: 'asc' },
      fields: [
        { name: 'setting_id', label: 'מזהה', form: false, table: false },
        { name: 'setting_code', label: 'קוד הגדרה', required: true, searchable: true, sortable: true, pattern: '^[A-Z]+$', patternMessage: 'יש להזין אותיות אנגליות גדולות בלבד' },
        { name: 'display_name', label: 'שם תצוגה', required: true, searchable: true, sortable: true },
        { name: 'lifecycle_status', label: 'סטטוס', type: 'select', required: true, filterable: true, options: [{ value: 'ACTIVE', label: 'פעיל' }, { value: 'INACTIVE', label: 'לא פעיל' }] },
        { name: 'notes', label: 'הערות', type: 'textarea', table: false }
      ]
    };
    let repository;
    if (repositoryMode === 'error') repository = { list: async () => { throw new Error('מקור הנתונים אינו זמין'); }, create() {}, update() {}, delete() {} };
    else if (repositoryMode === 'delayed') repository = { list: () => new Promise((resolve) => setTimeout(() => resolve([]), 250)), create() {}, update() {}, delete() {} };
    else repository = framework.createMemoryRepository(seed);
    window.admin = framework.createAdministration({ root: document.querySelector('#root'), metadata, repository });
  }, { seed: options.rows ?? rows, repositoryMode: options.repositoryMode || 'memory' });
}

test.describe('metadata-driven administration framework', () => {
  test('renders English database fields as Hebrew table and form labels', async ({ page }) => {
    await mount(page);
    await expect(page.getByRole('heading', { name: 'הגדרות מערכת' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /קוד הגדרה/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /שם תצוגה/ })).toBeVisible();
    await page.getByRole('button', { name: 'הוספת הגדרה' }).click();
    await expect(page.getByLabel('קוד הגדרה *')).toBeVisible();
    await expect(page.getByLabel('שם תצוגה *')).toBeVisible();
    await expect(page.getByLabel('סטטוס *')).toBeVisible();
  });

  test('supports search, filters, sorting and pagination', async ({ page }) => {
    await mount(page);
    await expect(page.locator('tbody tr')).toHaveCount(5);
    await page.getByRole('button', { name: 'הבא' }).click();
    await expect(page.getByText('עמוד 2 מתוך 2')).toBeVisible();
    await page.getByLabel('חיפוש').fill('BETA');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody')).toContainText('בטא');
    await page.getByLabel('חיפוש').fill('');
    await page.getByLabel('סטטוס').selectOption('INACTIVE');
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await page.getByRole('button', { name: /קוד הגדרה/ }).click();
    await expect(page.locator('tbody tr').first()).toContainText('BETA');
  });

  test('validates, saves, edits, cancels dirty changes and deletes', async ({ page }) => {
    await mount(page, { rows: rows.slice(0, 1) });
    await page.getByRole('button', { name: 'הוספת הגדרה' }).click();
    await page.getByRole('button', { name: 'שמירה' }).click();
    await expect(page.getByText('קוד הגדרה הוא שדה חובה')).toBeVisible();
    await page.getByLabel('קוד הגדרה *').fill('lowercase');
    await page.getByLabel('שם תצוגה *').fill('חדש');
    await page.getByLabel('סטטוס *').selectOption('ACTIVE');
    await page.getByRole('button', { name: 'שמירה' }).click();
    await expect(page.getByText('יש להזין אותיות אנגליות גדולות בלבד')).toBeVisible();
    await page.getByLabel('קוד הגדרה *').fill('NEW');
    await page.getByRole('button', { name: 'שמירה' }).click();
    await expect(page.getByText('השינויים נשמרו בהצלחה')).toBeVisible();
    await expect(page.locator('tbody')).toContainText('NEW');

    await page.getByRole('button', { name: 'עריכה' }).first().click();
    await page.getByLabel('שם תצוגה *').fill('שינוי שלא נשמר');
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'ביטול' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'ביטול' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'מחיקה' }).first().click();
    await expect(page.getByText('הרשומה נמחקה בהצלחה')).toBeVisible();
  });

  test('shows loading, empty and recoverable error states', async ({ page }) => {
    await mount(page, { repositoryMode: 'delayed' });
    await expect(page.getByText('טוען נתונים…')).toBeVisible();
    await expect(page.getByText('אין רשומות להצגה')).toBeVisible();
    await mount(page, { repositoryMode: 'error' });
    await expect(page.getByText('לא ניתן לטעון את הנתונים')).toBeVisible();
    await expect(page.getByText('מקור הנתונים אינו זמין')).toBeVisible();
    await expect(page.getByRole('button', { name: 'ניסיון נוסף' })).toBeVisible();
  });

  test('keeps the generated UI inside the viewport', async ({ page }) => {
    await mount(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test('PostgREST adapter writes audit_events after successful CRUD', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('desktop'), 'Request contract is viewport-independent.');
  const requests = [];
  await page.route('https://example.supabase.co/rest/v1/**', async (route) => {
    const request = route.request(); requests.push({ url: request.url(), method: request.method(), body: request.postDataJSON?.() });
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/audit_events')) return route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    if (request.method() === 'POST') return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([{ setting_id: 'created-id', display_name: 'חדש' }]) });
    if (request.method() === 'PATCH') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ setting_id: 'created-id', display_name: 'מעודכן' }]) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.goto('/admin-framework.js');
  await page.evaluate(async () => {
    const { createPostgrestRepository } = await import('/admin-framework.js');
    const repository = createPostgrestRepository({ baseUrl: 'https://example.supabase.co', apiKey: 'public-key', getAccessToken: async () => 'user-token', table: 'test_settings' });
    await repository.create({ display_name: 'חדש' }, { primaryKey: 'setting_id' });
    await repository.update('created-id', { display_name: 'מעודכן' }, { primaryKey: 'setting_id', previous: { setting_id: 'created-id', display_name: 'חדש' } });
  });
  const auditRequests = requests.filter((request) => request.url.includes('/audit_events'));
  expect(auditRequests).toHaveLength(2);
  expect(auditRequests[0].body).toMatchObject({ entity_type: 'test_settings', entity_id: 'created-id', operation: 'INSERT', source_type: 'PORTAL_ADMIN' });
  expect(auditRequests[1].body).toMatchObject({ entity_type: 'test_settings', entity_id: 'created-id', operation: 'UPDATE', source_type: 'PORTAL_ADMIN' });
});
