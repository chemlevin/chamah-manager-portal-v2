const IDENTITY_ALIASES = {
  daycare: ['daycare', 'department', 'branch', 'site', 'maon', 'מעון', 'מחלקה', 'סניף', 'עבור מחלקה'],
  month: ['month', 'payrollMonth', 'salaryMonth', 'חודש', 'חודש שכר', 'עבור חודש'],
  employee: ['employee', 'employeeName', 'name', 'worker', 'staff', 'שם עובד', 'עובד', 'עובדת', 'שם'],
  classroom: ['classroom', 'class', 'room', 'כיתה', 'שם כיתה', 'חדר'],
};

const HOURS_ALIASES = ['hours', 'payrollHours', 'workHours', 'actualHours', 'standardHours', 'שעות', 'שעות עבודה', 'שעות שכר', 'שעות בפועל'];
const COST_ALIASES = ['salary', 'payroll', 'pay', 'cost', 'amount', 'gross', 'net', 'base pay', 'bonus', 'deductions', 'reimbursement', 'wage', 'שכר', 'עלות', 'סכום', 'ברוטו', 'נטו', 'בסיס', 'בונוס', 'ניכוי', 'ניכויים', 'החזר', 'תשלום'];

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

function headerMatches(header, aliases) {
  const key = normalizeKey(header);
  return aliases.some((alias) => {
    const normalizedAlias = normalizeKey(alias);
    return key === normalizedAlias || key.includes(normalizedAlias);
  });
}

function normalizePayrollRow(row) {
  const identity = identityValues(row);
  const numericFields = {};
  const costFields = {};
  const hourFields = {};

  for (const [header, value] of Object.entries(row)) {
    if (isIdentityHeader(header) || !isNumericLike(value)) continue;
    const number = numberValue(value);
    numericFields[header] = number;
    if (headerMatches(header, HOURS_ALIASES)) hourFields[header] = number;
    if (headerMatches(header, COST_ALIASES)) costFields[header] = number;
  }

  const totalPayrollCost = Object.values(costFields).reduce((sum, value) => sum + value, 0);
  const totalPayrollHours = Object.values(hourFields).reduce((sum, value) => sum + value, 0);

  return {
    ...identity,
    numericFields,
    costFields,
    hourFields,
    totalPayrollCost,
    totalPayrollHours,
    total: totalPayrollCost,
    raw: row,
  };
}

function groupKey(...parts) {
  return parts.map((part) => clean(part)).join('||');
}

function daycareMonthKey(daycare, month) {
  return [clean(daycare), clean(month)].join('|');
}

function addFieldTotals(target, fields) {
  for (const [field, value] of Object.entries(fields)) {
    target[field] = (target[field] || 0) + value;
  }
}

function employeeCount(rows = []) {
  const employees = new Set(rows.map((row) => row.employee).filter(Boolean));
  return employees.size || rows.length;
}

function buildClassGroups(rows = []) {
  const map = new Map();
  for (const row of rows) {
    const classroom = row.classroom || 'Unmapped';
    const key = groupKey(classroom);
    if (!map.has(key)) {
      map.set(key, {
        classroom,
        employeeCount: 0,
        rowCount: 0,
        totalPayrollCost: 0,
        totalPayrollHours: 0,
        costFields: {},
        hourFields: {},
        numericFields: {},
        rows: [],
      });
    }
    const group = map.get(key);
    group.rowCount += 1;
    group.totalPayrollCost += row.totalPayrollCost;
    group.totalPayrollHours += row.totalPayrollHours;
    group.rows.push(row);
    addFieldTotals(group.costFields, row.costFields);
    addFieldTotals(group.hourFields, row.hourFields);
    addFieldTotals(group.numericFields, row.numericFields);
  }

  return [...map.values()].map((group) => ({
    ...group,
    employeeCount: employeeCount(group.rows),
    total: group.totalPayrollCost,
  })).sort((a, b) => groupKey(a.classroom).localeCompare(groupKey(b.classroom)));
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
        totalPayrollCost: 0,
        totalPayrollHours: 0,
        total: 0,
        costFields: {},
        hourFields: {},
        numericFields: {},
        rows: [],
        byClass: [],
      });
    }

    const group = map.get(key);
    group.rowCount += 1;
    group.totalPayrollCost += row.totalPayrollCost;
    group.totalPayrollHours += row.totalPayrollHours;
    group.total = group.totalPayrollCost;
    group.rows.push(row);
    addFieldTotals(group.costFields, row.costFields);
    addFieldTotals(group.hourFields, row.hourFields);
    addFieldTotals(group.numericFields, row.numericFields);
  }

  const byDaycareMonth = [...map.values()].map((group) => ({
    ...group,
    employeeCount: employeeCount(group.rows),
    byClass: buildClassGroups(group.rows),
  })).sort((a, b) => groupKey(a.daycare, a.month).localeCompare(groupKey(b.daycare, b.month)));
  const byDaycareMonthKey = Object.fromEntries(byDaycareMonth.map((group) => [daycareMonthKey(group.daycare, group.month), group]));

  return { rows, byDaycareMonth, byDaycareMonthKey };
}

module.exports = {
  rowsToObjects,
  numberValue,
  daycareMonthKey,
  calculatePayrollModel,
};
