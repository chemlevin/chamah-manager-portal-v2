const clean = (value) => String(value ?? '').trim();
const present = (value) => value !== null && value !== undefined && clean(value) !== '';

export function parseSettingsTables(rows = []) {
  const tables = {};
  let current = null;
  for (let index = 0; index < rows.length; index += 1) {
    const marker = clean(rows[index]?.[0]);
    if (marker.startsWith('TABLE: ')) {
      const name = marker.slice(7);
      const headers = (rows[index + 1] || []).map(clean);
      current = { name, headerRow: index + 2, headers, rows: [] };
      tables[name] = current;
      index += 1;
      continue;
    }
    if (marker === 'END TABLE') {
      current = null;
      continue;
    }
    if (!current || !(rows[index] || []).some(present)) continue;
    const values = rows[index] || [];
    current.rows.push({
      sourceRow: index + 1,
      values,
      record: Object.fromEntries(current.headers.filter(Boolean).map((header, column) => [header, values[column] ?? ''])),
    });
  }
  return tables;
}

export function unfoldMonthlyOccupancy(rows = [], monthIds = []) {
  const output = [];
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index] || [];
    const classroomId = clean(row[2]);
    const ageGroup = clean(row[4]);
    if (!classroomId || !ageGroup) continue;
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const raw = row[5 + monthIndex];
      if (!present(raw)) continue;
      const count = Number(raw);
      output.push({
        sourceRow: index + 1,
        sourceId: `${classroomId}|${ageGroup}|${monthIds[monthIndex] || monthIndex + 1}`,
        destinationTable: 'monthly_enrollment',
        classroomId,
        ageGroup,
        monthId: monthIds[monthIndex],
        childrenCount: count,
        errors: Number.isInteger(count) && count >= 0 ? [] : ['INVALID_CHILDREN_COUNT'],
      });
    }
  }
  return output;
}

export function mapPayrollRows(rows = []) {
  return rows.slice(1).map((row, offset) => ({ row, sourceRow: offset + 2 }))
    .filter(({ row }) => present(row?.[1]) || present(row?.[2]) || present(row?.[6]))
    .map(({ row, sourceRow }, sequence) => ({
      sourceRow,
      sourceId: `${clean(row[1])}|${clean(row[2])}|${clean(row[4])}|${clean(row[5])}|${sequence + 1}`,
      destinationTables: ['payroll_records', 'payroll_allocations'],
      month: clean(row[1]), employeeNumber: clean(row[2]), role: clean(row[4]), department: clean(row[5]),
      employerCost: Number(row[6]), totalHours: Number(row[7]),
      errors: [!clean(row[1]) && 'MISSING_MONTH', !clean(row[2]) && 'MISSING_EMPLOYEE',
        !clean(row[4]) && 'MISSING_ROLE', !clean(row[5]) && 'MISSING_DEPARTMENT',
        !Number.isFinite(Number(row[6])) && 'INVALID_EMPLOYER_COST'].filter(Boolean),
    }));
}

export function mapBankRows(rows = []) {
  const sourceIds = new Set(rows.slice(1).map((row) => clean(row?.[0])).filter(Boolean));
  return rows.slice(1).map((row, offset) => ({ row, sourceRow: offset + 2 }))
    .filter(({ row }) => present(row?.[0]) || present(row?.[1]) || present(row?.[2]))
    .map(({ row, sourceRow }) => {
      const id = clean(row[0]); const parentId = clean(row[1]); const allocation = Boolean(parentId);
      const errors = [];
      if (!id) errors.push('MISSING_TRANSACTION_ID');
      if (allocation && !sourceIds.has(parentId)) errors.push('PARENT_TRANSACTION_NOT_FOUND');
      if (!allocation && !clean(row[2])) errors.push('MISSING_BANK_ACCOUNT');
      if (!allocation && !present(row[3])) errors.push('MISSING_TRANSACTION_DATE');
      if (allocation && !present(row[12])) errors.push('MISSING_ALLOCATION_AMOUNT');
      if (!clean(row[14])) errors.push('MISSING_DEPARTMENT');
      if (clean(row[14]) === 'מעונות' && !clean(row[15])) errors.push('MISSING_TARGET_DAYCARE');
      if (!clean(row[16])) errors.push('MISSING_BUDGET_CATEGORY');
      if (!clean(row[17])) errors.push('MISSING_ACCOUNTING_STATUS');
      return { sourceRow, sourceId: id, parentId, destinationTable: allocation ? 'bank_allocations' : 'bank_transactions', errors };
    });
}

const tableTargets = {
  SCHOOL_YEARS: 'school_years', MONTHS: 'school_year_months', MONTHLY_WORK_CALENDAR: 'monthly_work_calendars',
  ORGANIZATION_UNITS: 'allocation_units', DAYCARES: 'daycares', CLASSROOMS: 'classrooms',
  CLASSROOM_CAPACITY_BREAKDOWN: 'classroom_capacity_breakdowns', BANK_ACCOUNTS: 'bank_accounts',
  BUDGET_CATEGORIES: 'budget_categories', BUDGET_CATEGORY_SETTINGS: 'budget_rules', TUITION_RULES: 'budget_rules',
  STAFFING_RULES: 'budget_rules', FIXED_STAFF_RULES: 'budget_rules', PAY_ADDITION_RULES: 'compensation_rules',
  ACCOUNTING_STATUSES: 'accounting_statuses', DAYCARE_YEAR_SETTINGS: 'daycare_school_years', PAYROLL_ROLES: 'roles',
  PAYROLL_DEPARTMENTS: 'allocation_units', STAFFING_BUDGET_PARAMETERS: 'staffing_budget_parameters',
};

export function analyzeWorkbook(workbook, existingIds = {}) {
  const tables = parseSettingsTables(workbook['הגדרות'] || []);
  const items = [];
  for (const [name, table] of Object.entries(tables)) {
    if (!tableTargets[name] || name === 'DATA_DICTIONARY') continue;
    for (const row of table.rows) {
      const sourceId = clean(row.values[0]);
      const errors = sourceId ? [] : ['MISSING_SOURCE_ID'];
      if (name === 'CLASSROOM_CAPACITY_BREAKDOWN' && !present(row.record.licensed_capacity)) continue;
      items.push({ sourceSheet: `הגדרות:${name}`, sourceRow: row.sourceRow, sourceId,
        destinationTable: tableTargets[name], operation: errors.length ? 'ERROR' : existingIds[tableTargets[name]]?.has(sourceId) ? 'UPDATE' : 'INSERT', errors });
    }
  }
  const monthIds = tables.MONTHS?.rows.map((row) => clean(row.record.month_id)) || [];
  for (const row of unfoldMonthlyOccupancy(workbook.MONTHLY_OCCUPANCY || [], monthIds)) items.push({
    sourceSheet: 'MONTHLY_OCCUPANCY', ...row, operation: row.errors.length ? 'ERROR' : 'INSERT',
  });
  for (const row of mapPayrollRows(workbook.PAYROLL || [])) items.push({
    sourceSheet: 'PAYROLL', ...row, destinationTable: row.destinationTables.join(' + '), operation: row.errors.length ? 'ERROR' : 'INSERT',
  });
  for (const row of mapBankRows(workbook.BANK_TRANSACTIONS || [])) items.push({
    sourceSheet: 'BANK_TRANSACTIONS', ...row, operation: row.errors.length ? 'ERROR' : 'INSERT',
  });
  const counts = items.reduce((acc, item) => { acc[item.operation] = (acc[item.operation] || 0) + 1; return acc; }, {});
  return { generatedAt: new Date().toISOString(), mode: 'DRY_RUN_READ_ONLY', counts, items };
}

