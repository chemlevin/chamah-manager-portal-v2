const REQUIRED_TABLES = ['OCCUPANCY', 'STAFFING', 'MONTH_HOURS', 'FIXED_STAFF', 'COST_RULES'];
const { DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS } = require('../config/business-rules');

const FIELD_ALIASES = {
  daycare: ['daycare', 'department', 'branch', 'site', 'מעון', 'מעון חריג', 'מחלקה', 'סניף', 'עבור מחלקה'],
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
  category: ['category', 'name', 'סעיף', 'קטגוריה', 'שם', 'סעיף תקציבי', 'הגדרה', 'קטגוריית הוצאה'],
  basis: ['basis', 'calculationBasis', 'בסיס חישוב', 'בסיס לחישוב', 'לפי'],
  additionalBasis: ['additionalBasis', 'secondaryBasis', 'בסיס נוסף', 'בסיס משני'],
  amount: ['amount', 'rate', 'cost', 'עלות', 'סכום', 'תעריף', 'ערך', 'עלות 1'],
  detail: ['detail', 'description', 'פירוט', 'תיאור'],
  period: ['period', 'תקופה'],
  mixedClassroom: ['mixedClassroom', 'mixed', 'כיתה מעורבת', 'מעורבת', 'סוג כיתה'],
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

function normalizeHeaders(headers = []) {
  const seen = new Map();
  let numberedSlot = 0;
  return headers.map((header) => {
    const text = clean(header);
    const numbered = text.match(new RegExp('^(כיתה|כמות ילדים|מספר ילדים|ילדים|שכבת גיל|גיל|קבוצת גיל)\\s*\\d+$'));
    if (numbered) {
      numberedSlot += numbered[1] === 'כיתה' || numbered[1] === 'שכבת גיל' || numbered[1] === 'גיל' || numbered[1] === 'קבוצת גיל' ? 1 : 0;
      const slot = numbered[1] === 'כיתה' || numbered[1] === 'שכבת גיל' || numbered[1] === 'גיל' || numbered[1] === 'קבוצת גיל' ? numberedSlot : numberedSlot;
      return numbered[1] + ' ' + slot;
    }
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

function isTruthyMarker(value) {
  const text = normalizeKey(value);
  return ['true', 'yes', '1', 'כן', 'מעורב', 'מעורבת', 'כיתה מעורבת', 'mixed'].includes(text);
}

function isMixedClassroomRow(row) {
  const headers = Object.keys(row || {});
  const values = Object.values(row || {});
  return isTruthyMarker(valueByAliases(values, headers, FIELD_ALIASES.mixedClassroom));
}

function classroomLabel(base, rowIndex, ageIndex, mixed) {
  const cleanBase = clean(base);
  if (mixed && cleanBase) return cleanBase;
  if (mixed) return 'כיתה ' + (rowIndex + 1);
  if (cleanBase) return cleanBase + ' ' + ageIndex;
  return 'כיתה ' + (rowIndex + 1) + '.' + ageIndex;
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
      headers = normalizeHeaders(row);
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

function expandOccupancyRows(rows = []) {
  return rows.flatMap((row, rowIndex) => {
    const ageIndexes = numberedIndexes(row, ['כיתה', 'שכבת גיל', 'גיל', 'קבוצת גיל']);
    if (!ageIndexes.length) return [row];

    const headers = Object.keys(row);
    const values = Object.values(row);
    const daycare = valueByAliases(values, headers, FIELD_ALIASES.daycare);
    const month = valueByAliases(values, headers, FIELD_ALIASES.month);
    const classroomBase = valueByExactHeader(row, 'שם כיתה') || valueByExactHeader(row, 'חדר') || valueByExactHeader(row, 'classroom') || valueByExactHeader(row, 'class');
    const mixedClassroom = isMixedClassroomRow(row);

    return ageIndexes.map((index) => {
      const ageGroup = numberedHeaderValue(row, ['כיתה', 'שכבת גיל', 'גיל', 'קבוצת גיל'], index);
      const children = numberedHeaderValue(row, ['כמות ילדים', 'מספר ילדים', 'ילדים'], index)
        || (index === 1 ? valueByAliases(values, headers, FIELD_ALIASES.children) : '');
      if (!ageGroup || numberValue(children) <= 0) return null;
      return { ...row, daycare, month, classroom: classroomLabel(classroomBase, rowIndex, index, mixedClassroom), ageGroup, children };
    }).filter(Boolean);
  });
}

function normalizeOccupancyRow(row) {
  const headers = Object.keys(row);
  const values = Object.values(row);
  return {
    daycare: valueByAliases(values, headers, FIELD_ALIASES.daycare),
    month: valueByAliases(values, headers, FIELD_ALIASES.month),
    classroom: valueByAliases(values, headers, FIELD_ALIASES.classroom),
    ageGroup: valueByAliases(values, headers, FIELD_ALIASES.ageGroup),
    children: numberValue(valueByAliases(values, headers, FIELD_ALIASES.children)),
    ratio: parseRatio(valueByAliases(values, headers, FIELD_ALIASES.ratio)),
    tuition: numberValue(valueByAliases(values, headers, FIELD_ALIASES.tuition)),
  };
}

function normalizeStaffingRows(rows = []) {
  const map = new Map();
  for (const row of rows) {
    const headers = Object.keys(row);
    const values = Object.values(row);
    const ageGroup = valueByAliases(values, headers, FIELD_ALIASES.ageGroup);
    const ratio = parseRatio(valueByAliases(values, headers, FIELD_ALIASES.ratio));
    const tuition = numberValue(valueByAliases(values, headers, FIELD_ALIASES.tuition));
    const minimumStaff = numberValue(valueByAliases(values, headers, FIELD_ALIASES.minimumStaff));
    if (ageGroup) map.set(ageGroup, { ageGroup, ratio, tuition, minimumStaff });
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
  }).filter((row) => row.daycare || row.month || row.role || row.positions || row.hours || row.amount);
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
      additionalBasis: normalizeKey(valueByAliases(values, headers, FIELD_ALIASES.additionalBasis)),
      period: normalizeKey(valueByAliases(values, headers, FIELD_ALIASES.period)),
      amount: numberValue(valueByAliases(values, headers, FIELD_ALIASES.amount)),
      divisor: numberValue(valueByAliases(values, headers, FIELD_ALIASES.divisor), 1) || 1,
    };
  }).filter((row) => row.category || row.basis || row.amount);
}

function normalizeActualExpenseRows(rows = []) {
  return rows.map((row) => {
    const headers = Object.keys(row);
    const values = Object.values(row);
    const amount = numberValue(valueByAliases(values, headers, FIELD_ALIASES.amount));
    return {
      category: valueByAliases(values, headers, FIELD_ALIASES.category),
      daycare: valueByAliases(values, headers, FIELD_ALIASES.daycare),
      month: valueByAliases(values, headers, FIELD_ALIASES.month),
      detail: valueByAliases(values, headers, FIELD_ALIASES.detail),
      amount,
      expenseAmount: Math.abs(amount),
    };
  }).filter((row) => row.category || row.amount || row.detail);
}

function optionalActualExpenseRows(tables = {}) {
  return tables.ACTUAL_EXPENSES
    || tables.BANK_TRANSACTIONS
    || tables.BANKS
    || tables.BANK
    || tables.TRANSACTIONS
    || [];
}

function roundStaff(value) {
  return Math.ceil(Number(value || 0) * 2) / 2;
}

function roundEmployeeHeadcount(value) {
  return Math.ceil(Number(value || 0) * 2) / 2;
}

function normalizeBudgetOptions(options = {}) {
  const averageEmployeeMonthlyHours = numberValue(options.averageEmployeeMonthlyHours, DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS) || DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS;
  return { averageEmployeeMonthlyHours };
}

function groupKey(parts) {
  return parts.map((part) => clean(part)).join('||');
}

function rowMatchesDaycareMonth(row, daycare, month) {
  if (row.daycare && row.daycare !== daycare) return false;
  if (row.month && row.month !== month) return false;
  return true;
}

function rowMatchesRule(row, rule) {
  if (rule.daycare && row.daycare !== rule.daycare) return false;
  if (rule.month && row.month !== rule.month) return false;
  return true;
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
    const tuition = row.tuition || rule?.tuition || 0;
    const rawStaff = row.children / ratio;
    const roundedStaff = Math.max(roundStaff(rawStaff), rule?.minimumStaff || 0);
    const expectedRevenue = row.children * tuition;
    const key = groupKey([row.daycare, row.month, row.classroom]);
    if (!classroomMap.has(key)) {
      classroomMap.set(key, { daycare: row.daycare, month: row.month, classroom: row.classroom, ageGroups: [], requiredStaff: 0, children: 0, expectedRevenue: 0 });
    }
    const classroom = classroomMap.get(key);
    classroom.ageGroups.push({ ageGroup: row.ageGroup, children: row.children, ratio, tuition, rawStaff, roundedStaff, expectedRevenue });
    classroom.requiredStaff += roundedStaff;
    classroom.children += row.children;
    classroom.expectedRevenue += expectedRevenue;
  }
  return [...classroomMap.values()];
}

function aggregateStaffingByDaycare(classrooms = []) {
  const map = new Map();
  for (const room of classrooms) {
    const key = groupKey([room.daycare, room.month]);
    if (!map.has(key)) map.set(key, { daycare: room.daycare, month: room.month, classroomCount: 0, children: 0, requiredStaff: 0, expectedRevenue: 0 });
    const item = map.get(key);
    item.classroomCount += 1;
    item.children += room.children;
    item.requiredStaff += room.requiredStaff;
    item.expectedRevenue += room.expectedRevenue || 0;
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

function buildDaycareMonthContexts(classroomStaffing = [], fixedStaff = [], monthHoursRows = [], options = {}) {
  const budgetOptions = normalizeBudgetOptions(options);
  const monthHours = normalizeMonthHoursRows(monthHoursRows);
  const map = new Map();

  function ensure(daycare, month) {
    const key = groupKey([daycare, month]);
    if (!map.has(key)) {
      const monthRule = monthHours.get(month) || {};
      map.set(key, {
        daycare,
        month,
        children: 0,
        classroomCount: 0,
        requiredStaff: 0,
        requiredHours: 0,
        averageEmployeeMonthlyHours: budgetOptions.averageEmployeeMonthlyHours,
        requiredEmployeeHeadcount: 0,
        fixedStaffPositions: 0,
        fixedStaffHours: 0,
        totalRequiredHours: 0,
        workDays: monthRule.workDays || 0,
        standardHours: monthRule.standardHours || 0,
        expectedRevenue: 0,
      });
    }
    return map.get(key);
  }

  for (const classroom of classroomStaffing) {
    const item = ensure(classroom.daycare, classroom.month);
    item.children += classroom.children;
    item.classroomCount += 1;
    item.requiredStaff += classroom.requiredStaff;
    item.expectedRevenue += classroom.expectedRevenue || 0;
  }

  for (const item of map.values()) {
    item.requiredHours = item.requiredStaff * item.standardHours;
    item.requiredEmployeeHeadcount = roundEmployeeHeadcount(item.requiredHours / budgetOptions.averageEmployeeMonthlyHours);
    item.totalRequiredHours = item.requiredHours;
  }

  for (const staff of fixedStaff) {
    if (!staff.daycare || !staff.month) continue;
    const item = ensure(staff.daycare, staff.month);
    item.fixedStaffPositions += staff.positions || 0;
    item.fixedStaffHours += staff.requiredHours || 0;
    item.totalRequiredHours = item.requiredHours + item.fixedStaffHours;
  }

  return [...map.values()].sort((a, b) => groupKey([a.daycare, a.month]).localeCompare(groupKey([b.daycare, b.month])));
}

function isChildrenBasis(basis) {
  return ['children', 'child', 'kids', 'ילדים', 'ילד', 'כמות ילדים'].includes(basis);
}

function isClassroomsBasis(basis) {
  return ['classrooms', 'classroom', 'classes', 'כיתות', 'כיתה'].includes(basis);
}

function isStaffBasis(basis) {
  return ['staff', 'team', 'positions', 'תקנים', 'צוות', 'משרות'].includes(basis);
}

function isWorkDaysBasis(basis) {
  return ['work days', 'work_days', 'days', 'ימי עבודה', 'ימי פעילות'].includes(basis);
}

function isHourlyBasis(basis) {
  return ['hourly', 'hours', 'hour', 'שעות', 'שעתי'].includes(basis);
}

function isFixedBasis(basis) {
  return ['fixed/monthly', 'fixed', 'monthly', 'קבוע', 'חודשי', 'קבוע חודשי'].includes(basis);
}

function basisQuantityForContext(basis, context) {
  if (isChildrenBasis(basis)) return context.children;
  if (isClassroomsBasis(basis)) return context.classroomCount;
  if (isStaffBasis(basis)) return context.requiredStaff + context.fixedStaffPositions;
  if (isWorkDaysBasis(basis)) return context.workDays;
  if (isHourlyBasis(basis)) return context.requiredHours;
  if (isFixedBasis(basis)) return 1;
  return 0;
}

function basisQuantity(rule, context) {
  const occupancy = expandOccupancyRows(context.occupancyRows || []).map(normalizeOccupancyRow).filter((row) => rowMatchesRule(row, rule));
  const classrooms = (context.classroomStaffing || []).filter((row) => rowMatchesRule(row, rule));
  const daycareStaffing = aggregateStaffingByDaycare(classrooms);
  const fixedStaff = (context.fixedStaff || []).filter((row) => rowMatchesRule(row, rule));
  const monthHours = normalizeMonthHoursRows(context.monthHoursRows || []);
  const basis = rule.basis;
  if (isChildrenBasis(basis)) return occupancy.reduce((sum, row) => sum + row.children, 0);
  if (isClassroomsBasis(basis)) return classrooms.length;
  if (isStaffBasis(basis)) return daycareStaffing.reduce((sum, row) => sum + row.requiredStaff, 0) + fixedStaff.reduce((sum, row) => sum + row.positions, 0);
  if (isWorkDaysBasis(basis)) {
    const months = new Set([...occupancy.map((row) => row.month), ...fixedStaff.map((row) => row.month)].filter(Boolean));
    return [...months].reduce((sum, month) => sum + (monthHours.get(month)?.workDays || 0), 0);
  }
  if (isHourlyBasis(basis)) {
    const daycareHours = calculateMonthlyRequiredHours(classrooms, context.monthHoursRows || []).reduce((sum, row) => sum + row.requiredHours, 0);
    const fixedHours = fixedStaff.reduce((sum, row) => sum + row.requiredHours, 0);
    return daycareHours + fixedHours;
  }
  if (isFixedBasis(basis)) return 1;
  return 0;
}

function ruleAppliesToContext(rule, context) {
  return rowMatchesDaycareMonth(rule, context.daycare, context.month);
}

function ruleSpecificity(rule) {
  return (rule.daycare ? 2 : 0) + (rule.month ? 1 : 0);
}

function selectedRulesForContext(rules, context) {
  const applicable = rules.filter((rule) => rule.category && ruleAppliesToContext(rule, context));
  const specificKeys = new Set(applicable.filter((rule) => rule.daycare).map((rule) => normalizeKey(rule.category)));
  const byCategory = new Map();

  for (const rule of applicable) {
    const categoryKey = normalizeKey(rule.category);
    if (!rule.daycare && specificKeys.has(categoryKey)) continue;
    const existing = byCategory.get(categoryKey);
    if (!existing || ruleSpecificity(rule) > ruleSpecificity(existing)) byCategory.set(categoryKey, rule);
  }

  return [...byCategory.values()];
}

function calculateCostRulesForDaycareMonth(costRuleRows = [], contexts = []) {
  const rules = normalizeCostRuleRows(costRuleRows);
  const costs = [];

  for (const context of contexts) {
    for (const rule of selectedRulesForContext(rules, context)) {
      const quantity = basisQuantityForContext(rule.basis, context);
      const additionalQuantity = rule.additionalBasis ? basisQuantityForContext(rule.additionalBasis, context) : 1;
      const total = (quantity * additionalQuantity * rule.amount) / rule.divisor;
      costs.push({
        ...rule,
        daycare: context.daycare,
        month: context.month,
        sourceDaycare: rule.daycare,
        sourceMonth: rule.month,
        quantity,
        additionalQuantity,
        total,
      });
    }
  }

  return costs;
}

function calculateCostRules(costRuleRows = [], context) {
  if (Array.isArray(context?.daycareMonthContexts)) return calculateCostRulesForDaycareMonth(costRuleRows, context.daycareMonthContexts);
  const rules = normalizeCostRuleRows(costRuleRows);
  return rules.map((rule) => {
    const quantity = basisQuantity(rule, context || {});
    const additionalQuantity = rule.additionalBasis ? basisQuantity({ ...(rule || {}), basis: rule.additionalBasis }, context || {}) : 1;
    const total = (quantity * additionalQuantity * rule.amount) / rule.divisor;
    return { ...rule, quantity, additionalQuantity, total };
  });
}

function sumByCategory(rows = []) {
  const map = new Map();
  for (const row of rows) {
    const category = clean(row.category) || 'ללא הגדרה';
    if (!map.has(category)) map.set(category, { category, total: 0, rows: 0 });
    const item = map.get(category);
    item.total += row.expenseAmount;
    item.rows += 1;
  }
  return [...map.values()];
}

function calculateBudgetCoverage(actualRows = [], costRuleRows = []) {
  const actualExpenses = normalizeActualExpenseRows(actualRows);
  const budgetRules = normalizeCostRuleRows(costRuleRows).filter((rule) => clean(rule.category));
  const budgetCategories = new Set(budgetRules.map((rule) => normalizeKey(rule.category)));
  const actualCategories = new Set(actualExpenses.map((row) => normalizeKey(row.category || 'ללא הגדרה')));
  const budgetedExpenses = actualExpenses.filter((row) => budgetCategories.has(normalizeKey(row.category)));
  const unbudgetedExpenses = actualExpenses.filter((row) => !budgetCategories.has(normalizeKey(row.category)));
  const budgetCategoriesWithoutActual = [...new Set(budgetRules
    .filter((rule) => !actualCategories.has(normalizeKey(rule.category)))
    .map((rule) => rule.category))];
  const actualExpenseTotal = actualExpenses.reduce((sum, row) => sum + row.expenseAmount, 0);
  const budgetedActualExpenseTotal = budgetedExpenses.reduce((sum, row) => sum + row.expenseAmount, 0);
  const coveragePercentage = actualExpenseTotal > 0 ? (budgetedActualExpenseTotal / actualExpenseTotal) * 100 : 0;

  return {
    actualExpenseTotal,
    budgetedActualExpenseTotal,
    coveragePercentage,
    budgetedCategories: sumByCategory(budgetedExpenses),
    actualExpensesWithoutBudget: sumByCategory(unbudgetedExpenses),
    budgetCategoriesWithoutActual,
    unmappedExpenseCategories: [...new Set(unbudgetedExpenses.map((row) => row.category || 'ללא הגדרה'))],
    label: 'Unmapped expense categories',
  };
}

function attachCostsToDaycareMonth(contexts = [], costs = []) {
  return contexts.map((context) => {
    const calculatedCosts = costs.filter((cost) => cost.daycare === context.daycare && cost.month === context.month);
    const totalBudgetCosts = calculatedCosts.reduce((sum, cost) => sum + cost.total, 0);
    return {
      ...context,
      calculatedCosts,
      totalBudgetCosts,
      projectedProfit: context.expectedRevenue - totalBudgetCosts,
    };
  });
}

function calculateBudgetModel(tables, options = {}) {
  assertBudgetTables(tables);
  const occupancyRows = tables.OCCUPANCY || [];
  const staffingRows = tables.STAFFING || [];
  const monthHoursRows = tables.MONTH_HOURS || [];
  const fixedStaffRows = tables.FIXED_STAFF || [];
  const costRuleRows = tables.COST_RULES || [];
  const actualExpenseRows = optionalActualExpenseRows(tables);
  const classroomStaffing = calculateClassroomStaffing(occupancyRows, staffingRows);
  const monthlyRequiredHours = calculateMonthlyRequiredHours(classroomStaffing, monthHoursRows);
  const fixedStaff = fixedStaffWithHours(fixedStaffRows, monthHoursRows);
  const daycareMonthContexts = buildDaycareMonthContexts(classroomStaffing, fixedStaff, monthHoursRows, options);
  const costs = calculateCostRulesForDaycareMonth(costRuleRows, daycareMonthContexts);
  const byDaycareMonth = attachCostsToDaycareMonth(daycareMonthContexts, costs);
  const budgetCoverage = calculateBudgetCoverage(actualExpenseRows, costRuleRows);
  return {
    classroomStaffing,
    daycareStaffing: aggregateStaffingByDaycare(classroomStaffing),
    monthlyRequiredHours,
    fixedStaff,
    costs,
    byDaycareMonth,
    budgetCoverage,
  };
}

module.exports = {
  REQUIRED_TABLES,
  DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS,
  parseBudgetTables,
  assertBudgetTables,
  roundStaff,
  roundEmployeeHeadcount,
  calculateClassroomStaffing,
  aggregateStaffingByDaycare,
  calculateMonthlyRequiredHours,
  normalizeFixedStaffRows,
  fixedStaffWithHours,
  normalizeCostRuleRows,
  normalizeActualExpenseRows,
  calculateBudgetCoverage,
  calculateCostRules,
  calculateBudgetModel,
};
