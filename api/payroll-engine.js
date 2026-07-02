const IDENTITY_ALIASES = {
  daycare: ['daycare', 'department', 'branch', 'site', 'maon', 'מעון', 'מחלקה', 'סניף', 'עבור מחלקה'],
  month: ['month', 'payrollMonth', 'salaryMonth', 'חודש', 'חודש שכר', 'עבור חודש'],
  employee: ['employee', 'employeeName', 'name', 'worker', 'staff', 'שם עובד', 'עובד', 'עובדת', 'שם'],
  classroom: ['classroom', 'class', 'room', 'כיתה', 'שם כיתה', 'חדר'],
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
    .replace(/[₪,\s]/g, '')
    .replace(/ש"ח|שח|nis|ils/gi, '')
    .replace(/%/g, '');

  if (!text) return fallback;

  const negative = /^\((.*)\)$/.exec(text);
  if (negative) text = '-' + negative[1];

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isNumericLike(value) {
  const text = clean(value);
  if (!text) return false;
  return Number.isFinite(numberValue(text, NaN));
}

function identityValues(row) {
  const headers = Object.keys(row);
  const values = Object.values(row);
  return {
    daycare: valueByAliases(values, headers, IDENTITY_ALIASES.daycare),
    month: valueByAliases(values, headers, IDENTITY_ALIASES.month),
    employee: valueByAliases(values, headers, IDENTITY_ALIASES.employee),
    classroom: valueByAliases(values, headers, IDENTITY_ALIASES.classroom),
  };
}

function isIdentityHeader(header) {
  const key = normalizeKey(header);
  return Object.values(IDENTITY_ALIASES).some((aliases) => aliases.some((alias) => normalizeKey(alias) === key));
}

function normalizePayrollRow(row) {
  const identity = identityValues(row);
  const numericFields = {};

  for (const [header, value] of Object.entries(row)) {
    if (isIdentityHeader(header) || !isNumericLike(value)) continue;
    numericFields[header] = numberValue(value);
  }

  const total = Object.values(numericFields).reduce((sum, value) => sum + value, 0);

  return {
    ...identity,
    numericFields,
    total,
    raw: row,
  };
}

function groupKey(daycare, month) {
  return clean(daycare) + '||' + clean(month);
}

function calculatePayrollModel(values = []) {
  const rows = rowsToObjects(values)
    .map(normalizePayrollRow)
    .filter((row) => row.daycare && row.month);

  const map = new Map();

  for (const row of rows) {
    const key = groupKey(row.daycare, row.month);
    if (!map.has(key)) {
      map.set(key, {
        daycare: row.daycare,
        month: row.month,
        employeeCount: 0,
        rowCount: 0,
        total: 0,
        numericFields: {},
        rows: [],
      });
    }

    const group = map.get(key);
    group.rowCount += 1;
    group.total += row.total;
    group.rows.push(row);

    for (const [field, value] of Object.entries(row.numericFields)) {
      group.numericFields[field] = (group.numericFields[field] || 0) + value;
    }
  }

  for (const group of map.values()) {
    const employees = new Set(group.rows.map((row) => row.employee).filter(Boolean));
    group.employeeCount = employees.size || group.rowCount;
  }

  return {
    rows,
    byDaycareMonth: [...map.values()].sort((a, b) => groupKey(a.daycare, a.month).localeCompare(groupKey(b.daycare, b.month))),
  };
}

module.exports = {
  rowsToObjects,
  numberValue,
  calculatePayrollModel,
};
