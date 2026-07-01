const REQUIRED_TABLES = ['OCCUPANCY', 'STAFFING', 'MONTH_HOURS', 'FIXED_STAFF', 'COST_RULES'];

const FIELD_ALIASES = {
  daycare: ['daycare', 'department', 'branch', 'site', 'מעון', 'מחלקה', 'סניף', 'עבור מחלקה'],
  month: ['month', 'חודש', 'עבור חודש'],
  classroom: ['classroom', 'class', 'כיתה', 'שם כיתה', 'מספר כיתה', 'חדר', 'כיתה בפועל'],
  ageGroup: ['ageGroup', 'age_group', 'age', 'שכבת גיל', 'גיל', 'קבוצת גיל', 'כיתה'],
  children: ['children', 'childCount', 'count', 'ילדים', 'מספר ילדים', 'כמות ילדים', 'כמות ילדים 1'],
  ratio: ['ratio', 'staffRatio', 'תקינה', 'יחס', 'כמות צוות לילד'],
  tuition: ['tuition', 'monthlyTuition', 'שכר לימוד'],
  minimumStaff: ['minimumStaff', 'minStaff', 'מינימום צוות'],
  standardHours: ['standardHours', 'hours', 'monthlyHours', 'שעות חודשיות', 'תקן שעות', 'שעות', 'שעות תקן'],
  workDays: ['workDays', 'days', 'ימי עבודה', 'ימי פעילות'],
  positions: ['positions', 'staff', 'count', 'תקנים', 'משרות', 'כמות', 'כמות 1'],
  role: ['role', 'תפקיד', 'תפקיד 1'],
  category: ['category', 'name', 'סעיף', 'קטגוריה', 'שם', 'סעיף תקציבי'],
  basis: ['basis', 'calculationBasis', 'בסיס חישוב', 'בסיס לחישוב', 'לפי'],
  amount: ['amount', 'rate', 'cost', 'עלות', 'סכום', 'תעריף', 'ערך', 'עלות 1'],
  period: ['period', 'תקופה'],
  divisor: ['divisor', 'divider', 'מחלק', 'חלוקה'],
};

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeKey(value) {
  return clean(value).replace(/^\uFEFF/, '').replace(/\s+/g, ' ').toLowerCase();
}

function normalizeMarker(value) {
  const text = clean(value);
  const match = text.match(/^TABLE:\s*([A-Z_]+)\s*$/i);
  return match ? match[1].toUpperCase() : '';
}

function isEmptyRow(row) {
  return !Array.isArray(row) || row.every((cell) => !clean(cell));
}

function rowMarker(row) {
  if (!Array.isArray(row)) return '';
  for (const cell of row) {
    const marker = normalizeMarker(cell);
    if (marker) return marker;
  }
  return '';
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

function valueByExactHeader(object, header) {
  const key = Object.keys(object || {}).find((candidate) => normalizeKey(candidate) === normalizeKey(header));
  return key ? clean(object[key]) : '';
}

function numberedHeaderValue(object, bases, index) {
  for (const base of bases) {
    const candidates = [base + ' ' + index, base + index];
    for (const candidate of candidates) {
      const value = valueByExactHeader(object, candidate);
      if (value) return value;
    }
  }
  return '';
}

function numberedIndexes(object, bases) {
  const indexes = new Set();
  const normalizedBases = bases.map(normalizeKey);
  for (const header of Object.keys(object || {})) {
    const normalized = normalizeKey(header);
    for (const base of normalizedBases) {
      if (!normalized.startsWith(base)) continue;
      const suffix = normalized.slice(base.length).trim();
      if (/^\d+$/.test(suffix)) indexes.add(Number(suffix));
    }
  }
  return [...indexes].sort((a, b) => a - b);
}

function expandOccupancyRows(rows = []) {
  return rows.flatMap((row, rowIndex) => {
    const ageIndexes = numberedIndexes(row, ['כיתה', 'שכבת גיל', 'גיל', 'קבוצת גיל']);
    if (!ageIndexes.length) return [row];

    const headers = Object.keys(row);
    const values = Object.values(row);
    const daycare = valueByAliases(values, headers, FIELD_ALIASES.daycare);
    const month = valueByAliases(values, headers, FIELD_ALIASES.month);
    const classroom = valueByAliases(values, headers, FIELD_ALIASES.classroom) || valueByExactHeader(row, 'שם כיתה') || 'כיתה ' + (rowIndex + 1);

    return ageIndexes.map((index) => {
      const ageGroup = numberedHeaderValue(row, ['כיתה', 'שכבת גיל', 'גיל', 'קבוצת גיל'], index);
      const children = numberedHeaderValue(row, ['כמות ילדים', 'מספר ילדים', 'ילדים'], index)
        || (index === 1 ? valueByAliases(values, headers, FIELD_ALIASES.children) : '');
      if (!ageGroup || numberValue(children) <= 0) return null;
      return { ...row, daycare, month, classroom, ageGroup, children };
    }).filter(Boolean);
  });
}

function expandFixedStaffRows(rows = []) {
  return rows.flatMap((row) => {
    const roleIndexes = numberedIndexes(row, ['תפקיד', 'role']);
    if (!roleIndexes.length) return [row];

    const headers = Object.keys(row);
    const values = Object.values(row);
    const daycare = valueByAliases(values, headers, FIELD_ALIASES.daycare);
    const month = valueByAliases(values, headers, FIELD_ALIASES.month);

    return roleIndexes.map((index) => {
      const role = numberedHeaderValue(row, ['תפקיד', 'role'], index);
      const positions = numberedHeaderValue(row, ['כמות', 'תקנים', 'משרות', 'positions'], index);
      const amount = numberedHeaderValue(row, ['עלות', 'cost', 'amount'], index);
      if (!role && numberValue(positions) <= 0 && numberValue(amount) <= 0) return null;
      return { ...row, daycare, month, role, positions, amount };
    }).filter(Boolean);
  });
}

function numberValue(value, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const text = clean(value).replace(/,/g, '').replace(/₪/g, '').replace(/%/g, '');
  if (!text) return fallback;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseRatio(value) {
  if (typeof value === 'number') return value > 0 && value < 1 ? 1 / value : value;
  const text = clean(value);
  if (!text) return 0;
  const slash = text.match(/^(?:1\s*\/\s*)?(\d+(?:\.\d+)?)$/);
  if (slash) {
    const parsed = Number(slash[1]);
    return parsed > 0 && parsed < 1 ? 1 / parsed : parsed;
  }
  const ratio = text.match(/1\s*[:/]\s*(\d+(?:\.\d+)?)/);
  if (ratio) return Number(ratio[1]);
  const parsed = numberValue(text, 0);
  return parsed > 0 && parsed < 1 ? 1 / parsed : parsed;
}

function parseBudgetTables(rows) {
  const tables = {};
  let current = null;
  let headers = null;
  for (const row of rows || []) {
    const marker = rowMarker(row);
    if (marker) {
      current = marker;
      headers = null;
      if (!tables[current]) tables[current] = [];
      continue;
    }
    if (!current || isEmptyRow(row)) continue;
    if (!headers) {
      headers = row.map(clean);
      continue;
    }
    const object = headers.reduce((acc, header, index) => {
      if (header) acc[header] = clean(row[index]);
      return acc;
    }, {});
    if (Object.values(object).some(Boolean)) tables[current].push(object);
  }
  return tables;
}

function assertBudgetTables(tables) {
  const missing = REQUIRED_TABLES.filter((name) => !Array.isArray(tables[name]));
  if (missing.length) throw new Error('Missing BUDGET tables: ' + missing.join(', '));
}

function normalizeOccupancyRow(row) {
  const headers = Object.keys(row);
  return {
    daycare: valueByAliases(Object.values(row), headers, FIELD_ALIASES.daycare),
    month: valueByAliases(Object.values(row), headers, FIELD_ALIASES.month),
    classroom: valueByAliases(Object.values(row), headers, FIELD_ALIASES.classroom),
    ageGroup: valueByAliases(Object.values(row), headers, FIELD_ALIASES.ageGroup),
    children: numberValue(valueByAliases(Object.values(row), headers, FIELD_ALIASES.children)),
    ratio: parseRatio(valueByAliases(Object.values(row), headers, FIELD_ALIASES.ratio)),
  };
}

function normalizeStaffingRows(rows = []) {
  const map = new Map();
  for (const row of rows) {
    const headers = Object.keys(row);
    const values = Object.values(row);
    const ageGroup = valueByAliases(values, headers, FIELD_ALIASES.ageGroup);
    const ratio = parseRatio(valueByAliases(values, headers, FIELD_ALIASES.ratio));
    if (ageGroup && ratio > 0) map.set(ageGroup, { ageGroup, ratio });
  }
  return map;
}

function normalizeMonthHoursRows(rows = []) {
  const map = new Map();
  for (const row of rows) {
    const headers = Object.keys(row);
    const values = Object.values(row);
    const month = valueByAliases(values, headers, FIELD_ALIASES.month);
    if (!month) continue;
    map.set(month, {
      month,
      standardHours: numberValue(valueByAliases(values, headers, FIELD_ALIASES.standardHours)),
      workDays: numberValue(valueByAliases(values, headers, FIELD_ALIASES.workDays)),
    });
  }
  return map;
}

function normalizeFixedStaffRows(rows = []) {
  return expandFixedStaffRows(rows).map((row) => {
    const headers = Object.keys(row);
    const values = Object.values(row);
    return {
      daycare: valueByAliases(values, headers, FIELD_ALIASES.daycare),
      month: valueByAliases(values, headers, FIELD_ALIASES.month),
      role: valueByAliases(values, headers, FIELD_ALIASES.role),
      positions: numberValue(valueByAliases(values, headers, FIELD_ALIASES.positions)),
      hours: numberValue(valueByAliases(values, headers, FIELD_ALIASES.standardHours)),
      amount: numberValue(valueByAliases(values, headers, FIELD_ALIASES.amount)),
    };
  }).filter((row) => row.daycare || row.month || row.role || row.positions || row.hours);
}

function normalizeCostRuleRows(rows = []) {
  return rows.map((row) => {
    const headers = Object.keys(row);
    const values = Object.values(row);
    return {
      category: valueByAliases(values, headers, FIELD_ALIASES.category),
      daycare: valueByAliases(values, headers, FIELD_ALIASES.daycare),
      month: valueByAliases(values, headers, FIELD_ALIASES.month),
      basis: normalizeKey(valueByAliases(values, headers, FIELD_ALIASES.basis)),
      period: normalizeKey(valueByAliases(values, headers, FIELD_ALIASES.period)),
      amount: numberValue(valueByAliases(values, headers, FIELD_ALIASES.amount)),
      divisor: numberValue(valueByAliases(values, headers, FIELD_ALIASES.divisor), 1) || 1,
    };
  }).filter((row) => row.category || row.basis || row.amount);
}

function roundStaff(value) {
  return Math.ceil(Number(value || 0) * 2) / 2;
}

function groupKey(parts) {
  return parts.map((part) => clean(part)).join('||');
}

function calculateClassroomStaffing(occupancyRows = [], staffingRows = []) {
  const staffingRules = normalizeStaffingRows(staffingRows);
  const classroomMap = new Map();
  for (const rawRow of expandOccupancyRows(occupancyRows)) {
    const row = normalizeOccupancyRow(rawRow);
    if (!row.daycare || !row.month || !row.classroom || !row.ageGroup || row.children <= 0) continue;
    const rule = staffingRules.get(row.ageGroup);
    const ratio = row.ratio || rule?.ratio || 0;
    if (ratio <= 0) throw new Error('Missing staffing ratio for age group: ' + row.ageGroup);
    const rawStaff = row.children / ratio;
    const roundedStaff = roundStaff(rawStaff);
    const key = groupKey([row.daycare, row.month, row.classroom]);
    if (!classroomMap.has(key)) {
      classroomMap.set(key, { daycare: row.daycare, month: row.month, classroom: row.classroom, ageGroups: [], requiredStaff: 0, children: 0 });
    }
    const classroom = classroomMap.get(key);
    classroom.ageGroups.push({ ageGroup: row.ageGroup, children: row.children, ratio, rawStaff, roundedStaff });
    classroom.requiredStaff += roundedStaff;
    classroom.children += row.children;
  }
  return [...classroomMap.values()];
}

function aggregateStaffingByDaycare(classrooms = []) {
  const map = new Map();
  for (const room of classrooms) {
    const key = groupKey([room.daycare, room.month]);
    if (!map.has(key)) map.set(key, { daycare: room.daycare, month: room.month, classroomCount: 0, children: 0, requiredStaff: 0 });
    const item = map.get(key);
    item.classroomCount += 1;
    item.children += room.children;
    item.requiredStaff += room.requiredStaff;
  }
  return [...map.values()];
}

function calculateMonthlyRequiredHours(classrooms = [], monthHoursRows = []) {
  const monthHours = normalizeMonthHoursRows(monthHoursRows);
  return aggregateStaffingByDaycare(classrooms).map((row) => {
    const standardHours = monthHours.get(row.month)?.standardHours || 0;
    return { ...row, standardHours, requiredHours: row.requiredStaff * standardHours };
  });
}

function fixedStaffWithHours(fixedStaffRows = [], monthHoursRows = []) {
  const monthHours = normalizeMonthHoursRows(monthHoursRows);
  return normalizeFixedStaffRows(fixedStaffRows).map((row) => {
    const standardHours = monthHours.get(row.month)?.standardHours || 0;
    return { ...row, standardHours, requiredHours: row.hours || row.positions * standardHours };
  });
}

function rowMatchesRule(row, rule) {
  if (rule.daycare && row.daycare !== rule.daycare) return false;
  if (rule.month && row.month !== rule.month) return false;
  return true;
}

function basisQuantity(rule, context) {
  const basis = rule.basis;
  const occupancy = expandOccupancyRows(context.occupancyRows).map(normalizeOccupancyRow).filter((row) => rowMatchesRule(row, rule));
  const classrooms = context.classroomStaffing.filter((row) => rowMatchesRule(row, rule));
  const daycareStaffing = aggregateStaffingByDaycare(classrooms);
  const fixedStaff = context.fixedStaff.filter((row) => rowMatchesRule(row, rule));
  const monthHours = normalizeMonthHoursRows(context.monthHoursRows);
  if (basis === 'children' || basis === 'ילדים' || basis === 'ילד' || basis === 'כמות ילדים') return occupancy.reduce((sum, row) => sum + row.children, 0);
  if (basis === 'classrooms' || basis === 'כיתות' || basis === 'כיתה') return classrooms.length;
  if (basis === 'staff' || basis === 'תקנים' || basis === 'צוות' || basis === 'משרות') return daycareStaffing.reduce((sum, row) => sum + row.requiredStaff, 0) + fixedStaff.reduce((sum, row) => sum + row.positions, 0);
  if (basis === 'work days' || basis === 'work_days' || basis === 'ימי עבודה' || basis === 'ימי פעילות') {
    const months = new Set([...occupancy.map((row) => row.month), ...fixedStaff.map((row) => row.month)].filter(Boolean));
    return [...months].reduce((sum, month) => sum + (monthHours.get(month)?.workDays || 0), 0);
  }
  if (basis === 'hourly' || basis === 'hours' || basis === 'שעות' || basis === 'שעתי') {
    const daycareHours = calculateMonthlyRequiredHours(classrooms, context.monthHoursRows).reduce((sum, row) => sum + row.requiredHours, 0);
    const fixedHours = fixedStaff.reduce((sum, row) => sum + row.requiredHours, 0);
    return daycareHours + fixedHours;
  }
  if (basis === 'fixed/monthly' || basis === 'fixed' || basis === 'monthly' || basis === 'קבוע' || basis === 'חודשי' || basis === 'קבוע חודשי') return 1;
  return 0;
}

function calculateCostRules(costRuleRows = [], context) {
  const rules = normalizeCostRuleRows(costRuleRows);
  return rules.map((rule) => {
    const quantity = basisQuantity(rule, context);
    const total = (quantity * rule.amount) / rule.divisor;
    return { ...rule, quantity, total };
  });
}

function calculateBudgetModel(tables) {
  assertBudgetTables(tables);
  const occupancyRows = tables.OCCUPANCY || [];
  const staffingRows = tables.STAFFING || [];
  const monthHoursRows = tables.MONTH_HOURS || [];
  const fixedStaffRows = tables.FIXED_STAFF || [];
  const costRuleRows = tables.COST_RULES || [];
  const classroomStaffing = calculateClassroomStaffing(occupancyRows, staffingRows);
  const monthlyRequiredHours = calculateMonthlyRequiredHours(classroomStaffing, monthHoursRows);
  const fixedStaff = fixedStaffWithHours(fixedStaffRows, monthHoursRows);
  const costs = calculateCostRules(costRuleRows, { occupancyRows, classroomStaffing, monthHoursRows, fixedStaff });
  return { classroomStaffing, daycareStaffing: aggregateStaffingByDaycare(classroomStaffing), monthlyRequiredHours, fixedStaff, costs };
}

module.exports = {
  REQUIRED_TABLES,
  parseBudgetTables,
  assertBudgetTables,
  roundStaff,
  calculateClassroomStaffing,
  aggregateStaffingByDaycare,
  calculateMonthlyRequiredHours,
  normalizeFixedStaffRows,
  fixedStaffWithHours,
  normalizeCostRuleRows,
  calculateCostRules,
  calculateBudgetModel,
};
