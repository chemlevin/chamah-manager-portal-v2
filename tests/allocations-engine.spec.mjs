import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const engine = require('../api/allocations-engine.js');
const businessRules = require('../config/business-rules.js');
const organizationalUnits = require('../config/organizational-units.js');

test.describe('allocations calculation engine', () => {
  test('uses centralized unit-month keys and defines organizational unit examples outside parsing logic', () => {
    expect(engine.unitMonthKey('מחנה', '09/2026')).toBe('מחנה|09/2026');
    expect(engine.unitMonthKey).toBe(businessRules.unitMonthKey);
    expect(organizationalUnits.UNIT_TYPES).toEqual(expect.objectContaining({ daycare: 'daycare', overhead: 'overhead', project: 'project' }));
    expect(organizationalUnits.CURRENT_KNOWN_UNITS.map((unit) => unit.name)).toEqual(expect.arrayContaining(['מחנה', 'נאות', 'אשקלון', 'מרכזי', 'סניף', 'גנון', 'משרד', 'פיתוח']));
  });

  test('treats each row as an allocation row and does not deduplicate by reference', () => {
    const model = engine.calculateAllocationsModel([
      ['אסמכתא', 'תאריך', 'עבור חודש', 'עבור מחלקה', 'חובה', 'זכות', 'הגדרה', 'הנה"ח', 'הערות'],
      ['A-1', '01/09/2026', '09/2026', 'מחנה', '\u20AA1,200.50', '', 'הוצאה', 'פתוח', 'food split'],
      ['A-1', '01/09/2026', '09/2026', 'אשקלון', '300', '', 'הוצאה', 'פתוח', 'same transaction split'],
      ['A-2', '02/09/2026', '09/2026', 'מחנה', '', '2,000', 'הכנסה', 'סגור', 'parent payment'],
    ]);

    expect(model.rows).toHaveLength(3);
    expect(model.byUnitMonth).toHaveLength(2);
    expect(model.byUnitMonthKey['מחנה|09/2026']).toEqual(expect.objectContaining({ unit: 'מחנה', businessMonth: '09/2026', rowCount: 2, debit: 1200.5, credit: 2000, netCash: 799.5 }));
    expect(model.byUnitMonthKey['אשקלון|09/2026']).toEqual(expect.objectContaining({ rowCount: 1, debit: 300, credit: 0, netCash: -300 }));
    expect(model.totals).toEqual({ debit: 1500.5, credit: 2000, netCash: 499.5, rowCount: 3 });
  });

  test('uses business allocation month separately from actual cash date', () => {
    const model = engine.calculateAllocationsModel([
      ['אסמכתא', 'תאריך', 'עבור חודש', 'עבור מחלקה', 'חובה', 'זכות', 'הגדרה'],
      ['B-1', '31/10/2026', '09/2026', 'מרכזי', '\u20AA500', '', 'שכר'],
    ]);

    expect(model.rows[0]).toEqual(expect.objectContaining({ cashDate: '31/10/2026', businessMonth: '09/2026', unit: 'מרכזי', definition: 'שכר' }));
    expect(Object.keys(model.byUnitMonthKey)).toEqual(['מרכזי|09/2026']);
  });

  test('keeps unknown unit names as data and groups them safely', () => {
    const model = engine.calculateAllocationsModel([
      ['עבור חודש', 'עבור מחלקה', 'חובה', 'זכות'],
      ['10/2026', 'יחידה חדשה', '100', ''],
    ]);

    expect(model.byUnitMonthKey['יחידה חדשה|10/2026']).toEqual(expect.objectContaining({ unit: 'יחידה חדשה', businessMonth: '10/2026', debit: 100 }));
    expect(model.unmappedRows).toHaveLength(0);
  });

  test('skips empty rows and reports rows missing unit or business month as unmapped', () => {
    const model = engine.calculateAllocationsModel([
      ['עבור חודש', 'עבור מחלקה', 'חובה', 'זכות', 'הערות'],
      ['', '', '', '', ''],
      ['09/2026', '', '100', '', 'missing unit'],
      ['', 'מחנה', '', '200', 'missing month'],
      ['09/2026', 'מחנה', '50', '', 'valid'],
    ]);

    expect(model.rows).toHaveLength(1);
    expect(model.unmappedRows).toHaveLength(2);
    expect(model.byUnitMonthKey['מחנה|09/2026']).toEqual(expect.objectContaining({ debit: 50, credit: 0, rowCount: 1 }));
    expect(model.totals).toEqual({ debit: 50, credit: 0, netCash: -50, rowCount: 1 });
  });

  test('normalizes debit and credit values with shekel signs, commas, decimals, blanks and parentheses', () => {
    expect(engine.numberValue('\u20AA12,345.67')).toBe(12345.67);
    expect(engine.numberValue('')).toBe(0);
    expect(engine.numberValue('(1,250)')).toBe(-1250);
  });
});
