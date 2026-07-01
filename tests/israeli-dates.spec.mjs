import { test, expect } from '@playwright/test';

test.describe('Israeli Google Sheets date parsing', () => {
  test('parses sheet dates as DD/MM/YYYY without browser date parsing', async ({ page }) => {
    await page.goto('/employees/');

    const result = await page.evaluate(() => {
      const date = window.ChamahDates.parseIsraeliSheetDate('01/05/2026');
      return {
        year: date?.getFullYear(),
        month: date ? date.getMonth() + 1 : null,
        day: date?.getDate(),
        formatted: window.ChamahDates.formatIsraeliSheetDate('01/05/2026'),
        invalid: window.ChamahDates.parseIsraeliSheetDate('31/02/2026') === null,
      };
    });

    expect(result).toEqual({
      year: 2026,
      month: 5,
      day: 1,
      formatted: '01/05/2026',
      invalid: true,
    });
  });
});
