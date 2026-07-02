const { unitMonthKey } = require('../config/business-rules');

const FIELD_ALIASES = {
  reference: ['reference', 'asmachta', 'אסמכתא', 'מספר אסמכתא'],
  cashDate: ['date', 'cashDate', 'bankDate', 'תאריך', 'תאריך בנק', 'תאריך פעולה'],
  businessMonth: ['businessMonth', 'allocationMonth', 'month', 'עבור חודש', 'חודש', 'חודש שיוך'],
  unit: ['unit', 'organizationalUnit', 'department', 'daycare', 'עבור מחלקה', 'מחלקה', 'מעון', 'יחידה'],
  debit: ['debit', 'moneyOut', 'expense', 'חובה', 'יציאה', 'הוצאה'],
  credit: ['credit', 'moneyIn', 'income', 'זכות', 'כניסה', 'הכנסה'],
  definition: ['definition', 'category', 'type', 'הגדרה', 'סוג', 'קטגוריה'],
  accountingStatus: ['accountingStatus', 'bookkeeping', 'הנה"ח', 'הנהח', 'סטטוס הנהח', 'סטטוס הנה"ח'],
  notes: ['notes', 'comment', 'description', 'הערות', 'פירוט', 'תיאור'],
};

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeKey(value) {
  return clean(value).replace(/^\uFEFF/, '').replace(/\s+/g, ' ').toLowerCase();
}

function isEmptyRow(row) {
  return !Array.isArray(row) || row.every((cell) => !clean(cell));
}

function normalizeHeaders(headers = []) {
  const seen = new Map();
  return headers.map((header) => {
    const text = clean(header);
    const key = normalizeKey(text);
    const count = (seen.get(key) || 0) + 1;
    seen.set(key, count);
    return count === 1 ? text : text + ' ' + count;
  });
}

function headerIndex(headers, aliases) {
  const normalized = headers.map(normalizeKey);
  for (const alias of aliases) {
    const index = normalized.indexOf(normalizeKey(alias));
    if (index !== -1) return index;
  }
  return -1;
}

function valueByAliases(row, headers, aliases) {
  const index = headerIndex(headers, aliases);
  return index === -1 ? '' : clean(row[index]);
}

function rowsToObjects(values = []) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const meaningfulRows = values.filter((row) => !isEmptyRow(row));
  if (!meaningfulRows.length) return [];
  const [headerRow, ...dataRows] = meaningfulRows;
  const headers = normalizeHeaders(headerRow);
  return dataRows
    .filter((row) => !isEmptyRow(row))
    .map((row) => headers.reduce((object, header, index) => {
      if (header) object[header] = clean(row[index]);
      return object;
    }, {}));
}

function numberValue(value, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  let text = clean(value)
    .replace(/[\u20AA,\s]/g, '')
    .replace(/\u05E9"\u05D7|\u05E9\u05D7|nis|ils/gi, '')
    .replace(/%/g, '');
  if (!text) return fallback;
  const negative = /^\((.*)\)$/.exec(text);
  if (negative) text = '-' + negative[1];
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeAllocationRow(raw, index) {
  const headers = Object.keys(raw);
  const values = Object.values(raw);
  const debit = Math.abs(numberValue(valueByAliases(values, headers, FIELD_ALIASES.debit)));
  const credit = Math.abs(numberValue(valueByAliases(values, headers, FIELD_ALIASES.credit)));
  const unit = valueByAliases(values, headers, FIELD_ALIASES.unit);
  const businessMonth = valueByAliases(values, headers, FIELD_ALIASES.businessMonth);
  const row = {
    rowIndex: index + 2,
    reference: valueByAliases(values, headers, FIELD_ALIASES.reference),
    cashDate: valueByAliases(values, headers, FIELD_ALIASES.cashDate),
    businessMonth,
    unit,
    debit,
    credit,
    netCash: credit - debit,
    definition: valueByAliases(values, headers, FIELD_ALIASES.definition),
    accountingStatus: valueByAliases(values, headers, FIELD_ALIASES.accountingStatus),
    notes: valueByAliases(values, headers, FIELD_ALIASES.notes),
    raw,
  };
  const missing = [];
  if (!unit) missing.push('unit');
  if (!businessMonth) missing.push('businessMonth');
  if (missing.length) row.unmappedReason = 'Missing ' + missing.join(' and ');
  return row;
}

function emptyTotals() {
  return { debit: 0, credit: 0, netCash: 0, rowCount: 0 };
}

function addTotals(target, row) {
  target.debit += row.debit;
  target.credit += row.credit;
  target.netCash += row.netCash;
  target.rowCount += 1;
}

function calculateAllocationsModel(values = []) {
  const normalizedRows = rowsToObjects(values).map(normalizeAllocationRow);
  const rows = normalizedRows.filter((row) => !row.unmappedReason);
  const unmappedRows = normalizedRows.filter((row) => row.unmappedReason);
  const totals = emptyTotals();
  const map = new Map();

  for (const row of rows) {
    addTotals(totals, row);
    const key = unitMonthKey(row.unit, row.businessMonth);
    if (!map.has(key)) {
      map.set(key, { unit: row.unit, businessMonth: row.businessMonth, rowCount: 0, debit: 0, credit: 0, netCash: 0, rows: [] });
    }
    const group = map.get(key);
    addTotals(group, row);
    group.rows.push(row);
  }

  const byUnitMonth = [...map.values()].sort((a, b) => unitMonthKey(a.unit, a.businessMonth).localeCompare(unitMonthKey(b.unit, b.businessMonth)));
  const byUnitMonthKey = Object.fromEntries(byUnitMonth.map((group) => [unitMonthKey(group.unit, group.businessMonth), group]));
  return { rows, byUnitMonth, byUnitMonthKey, unmappedRows, totals };
}

module.exports = {
  FIELD_ALIASES,
  rowsToObjects,
  numberValue,
  unitMonthKey,
  calculateAllocationsModel,
};
