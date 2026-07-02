const { daycareMonthKey, unitMonthKey } = require('../config/business-rules');

const STATUS = Object.freeze({
  GREEN: 'green',
  YELLOW: 'yellow',
  RED: 'red',
  UNKNOWN: 'unknown',
});

const ACTIVE_EMPLOYEE_VALUES = new Set(['active', 'working', 'employed', 'עובדת', 'עובד', 'פעיל', 'פעילה']);
const EXCLUDED_ACCOUNTING_CATEGORY = 'חריג לא לחישוב';

function clean(value) {
  return String(value ?? '').trim();
}

function normalizeKey(value) {
  return clean(value).replace(/^\uFEFF/, '').replace(/\s+/g, ' ').toLowerCase();
}

function numberValue(value, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const text = clean(value).replace(/[\u20AA,\s]/g, '').replace(/%/g, '');
  if (!text) return fallback;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function modelValue(input, propertyName) {
  if (!input || typeof input !== 'object') return {};
  if (input[propertyName] && typeof input[propertyName] === 'object') return input[propertyName];
  return input;
}

function addMetric(target, key, value) {
  target[key] = numberValue(target[key]) + numberValue(value);
}

function getField(row, names) {
  if (!row || typeof row !== 'object') return undefined;
  const entries = Object.entries(row);
  const aliases = names.map(normalizeKey);
  const match = entries.find(([key]) => aliases.includes(normalizeKey(key)));
  return match ? match[1] : undefined;
}

function explicitCapacity(row) {
  return getField(row, ['capacity', 'childCapacity', 'childrenCapacity', 'maxChildren', 'maximumChildren', 'תקן ילדים', 'קיבולת']);
}

function hasExplicitCapacity(row) {
  const value = explicitCapacity(row);
  return clean(value) !== '' && Number.isFinite(numberValue(value, NaN));
}

function ensureMapItem(map, key, defaults) {
  if (!map.has(key)) map.set(key, { ...defaults });
  return map.get(key);
}

function addIssue(issues, issue) {
  issues.push({
    severity: issue.severity || STATUS.YELLOW,
    type: issue.type,
    scope: issue.scope || '',
    unit: issue.unit || issue.daycare || '',
    month: issue.month || issue.businessMonth || '',
    message: issue.message,
    count: numberValue(issue.count, 1),
  });
}

function accountingCategory(row) {
  return clean(
    row.accountingCategory
    || row.category
    || row.detail
    || row.details
    || getField(row.raw, ['פירוט'])
  );
}

function isExcludedAccountingCategory(row) {
  return normalizeKey(accountingCategory(row)) === normalizeKey(EXCLUDED_ACCOUNTING_CATEGORY);
}

function summarizeBudget(budgetInput, issues) {
  const budget = modelValue(budgetInput, 'budget');
  const byDaycareMonth = arrayValue(budget.byDaycareMonth);
  const classroomStaffing = arrayValue(budget.classroomStaffing);
  const byDaycare = new Map();
  const byMonth = new Map();
  const byClass = new Map();
  const byAgeGroup = new Map();
  const byDaycareMonthMap = new Map();
  const totals = {
    children: 0,
    capacity: 0,
    requiredHours: 0,
    requiredEmployees: 0,
    budgetRevenue: 0,
    budgetCosts: 0,
    budgetGroupCount: byDaycareMonth.length,
    capacityRows: 0,
  };

  for (const group of byDaycareMonth) {
    const daycare = clean(group.daycare);
    const month = clean(group.month);
    if (!daycare || !month) {
      addIssue(issues, {
        type: 'budget_missing_daycare_or_month',
        severity: STATUS.YELLOW,
        scope: 'budget',
        message: 'Budget group is missing daycare or month.',
      });
      continue;
    }

    const children = numberValue(group.children);
    const requiredHours = numberValue(group.totalRequiredHours || group.requiredHours);
    const requiredEmployees = numberValue(group.requiredEmployeeHeadcount);
    const revenue = numberValue(group.expectedRevenue);
    const costs = numberValue(group.totalBudgetCosts);
    const capacity = hasExplicitCapacity(group) ? numberValue(explicitCapacity(group)) : 0;
    const key = daycareMonthKey(daycare, month);

    totals.children += children;
    totals.requiredHours += requiredHours;
    totals.requiredEmployees += requiredEmployees;
    totals.budgetRevenue += revenue;
    totals.budgetCosts += costs;
    if (capacity > 0) {
      totals.capacity += capacity;
      totals.capacityRows += 1;
    }

    byDaycareMonthMap.set(key, {
      daycare,
      month,
      key,
      children,
      capacity: capacity || null,
      availableCapacity: capacity > 0 ? capacity - children : null,
      occupancyPercent: capacity > 0 ? (children / capacity) * 100 : null,
      requiredHours,
      requiredEmployees,
      budgetRevenue: revenue,
      budgetCosts: costs,
    });

    const daycareItem = ensureMapItem(byDaycare, daycare, {
      daycare,
      children: 0,
      capacity: 0,
      capacityRows: 0,
      requiredHours: 0,
      requiredEmployees: 0,
      budgetRevenue: 0,
      budgetCosts: 0,
      months: new Set(),
    });
    daycareItem.children += children;
    daycareItem.requiredHours += requiredHours;
    daycareItem.requiredEmployees += requiredEmployees;
    daycareItem.budgetRevenue += revenue;
    daycareItem.budgetCosts += costs;
    daycareItem.months.add(month);
    if (capacity > 0) {
      daycareItem.capacity += capacity;
      daycareItem.capacityRows += 1;
    }

    const monthItem = ensureMapItem(byMonth, month, {
      month,
      children: 0,
      capacity: 0,
      capacityRows: 0,
      requiredHours: 0,
      requiredEmployees: 0,
      budgetRevenue: 0,
      budgetCosts: 0,
    });
    monthItem.children += children;
    monthItem.requiredHours += requiredHours;
    monthItem.requiredEmployees += requiredEmployees;
    monthItem.budgetRevenue += revenue;
    monthItem.budgetCosts += costs;
    if (capacity > 0) {
      monthItem.capacity += capacity;
      monthItem.capacityRows += 1;
    }
  }

  for (const room of classroomStaffing) {
    const daycare = clean(room.daycare);
    const month = clean(room.month);
    const classroom = clean(room.classroom);
    const classKey = [daycare, month, classroom].map(clean).join('|');
    if (classroom) {
      const item = ensureMapItem(byClass, classKey, {
        daycare,
        month,
        classroom,
        children: 0,
        requiredStaff: 0,
        expectedRevenue: 0,
      });
      item.children += numberValue(room.children);
      item.requiredStaff += numberValue(room.requiredStaff);
      item.expectedRevenue += numberValue(room.expectedRevenue);
    }

    for (const age of arrayValue(room.ageGroups)) {
      const ageGroup = clean(age.ageGroup);
      if (!ageGroup) continue;
      const ageKey = [daycare, month, ageGroup].map(clean).join('|');
      const item = ensureMapItem(byAgeGroup, ageKey, {
        daycare,
        month,
        ageGroup,
        children: 0,
        requiredStaff: 0,
        expectedRevenue: 0,
      });
      item.children += numberValue(age.children);
      item.requiredStaff += numberValue(age.roundedStaff || age.rawStaff);
      item.expectedRevenue += numberValue(age.expectedRevenue);
    }
  }

  return {
    totals,
    byDaycareMonth: [...byDaycareMonthMap.values()],
    byDaycare: [...byDaycare.values()].map(finalizeCapacityItem),
    byMonth: [...byMonth.values()].map(finalizeCapacityItem),
    byClass: [...byClass.values()],
    byAgeGroup: [...byAgeGroup.values()],
  };
}

function finalizeCapacityItem(item) {
  const months = item.months instanceof Set ? [...item.months] : undefined;
  const capacity = item.capacityRows > 0 ? item.capacity : null;
  return {
    ...item,
    months,
    capacity,
    availableCapacity: capacity === null ? null : capacity - item.children,
    occupancyPercent: capacity ? (item.children / capacity) * 100 : null,
  };
}

function summarizePayroll(payrollInput, issues) {
  const payroll = modelValue(payrollInput, 'payroll');
  const byDaycareMonth = arrayValue(payroll.byDaycareMonth);
  const rows = arrayValue(payroll.rows);
  const byDaycareMonthMap = new Map();
  const byDaycare = new Map();
  const byClass = new Map();
  const totals = {
    payrollHours: 0,
    payrollOperationalCost: 0,
    employeeCount: 0,
    rowCount: rows.length,
  };

  const employeeNames = new Set();
  for (const row of rows) {
    if (row.employee) employeeNames.add(row.employee);
  }
  totals.employeeCount = employeeNames.size || byDaycareMonth.reduce((sum, group) => sum + numberValue(group.employeeCount), 0);

  for (const group of byDaycareMonth) {
    const daycare = clean(group.daycare);
    const month = clean(group.month);
    if (!daycare || !month) {
      addIssue(issues, {
        type: 'payroll_missing_daycare_or_month',
        severity: STATUS.YELLOW,
        scope: 'payroll',
        message: 'Payroll group is missing daycare or month.',
      });
      continue;
    }
    const payrollHours = group.staffingPayrollHours !== undefined && group.staffingPayrollHours !== null
      ? numberValue(group.staffingPayrollHours)
      : numberValue(group.totalPayrollHours);
    const payrollOperationalCost = numberValue(group.totalPayrollCost);
    const employeeCount = group.staffingEmployeeCount !== undefined && group.staffingEmployeeCount !== null
      ? numberValue(group.staffingEmployeeCount)
      : numberValue(group.employeeCount);
    const key = daycareMonthKey(daycare, month);
    totals.payrollHours += payrollHours;
    totals.payrollOperationalCost += payrollOperationalCost;

    byDaycareMonthMap.set(key, {
      daycare,
      month,
      key,
      payrollHours,
      payrollOperationalCost,
      employeeCount,
    });

    const daycareItem = ensureMapItem(byDaycare, daycare, {
      daycare,
      payrollHours: 0,
      payrollOperationalCost: 0,
      employeeCount: 0,
      months: new Set(),
    });
    daycareItem.payrollHours += payrollHours;
    daycareItem.payrollOperationalCost += payrollOperationalCost;
    daycareItem.employeeCount += employeeCount;
    daycareItem.months.add(month);

    for (const classGroup of arrayValue(group.byClass)) {
      const classroom = clean(classGroup.classroom);
      const classKey = [daycare, month, classroom].map(clean).join('|');
      const item = ensureMapItem(byClass, classKey, {
        daycare,
        month,
        classroom,
        payrollHours: 0,
        payrollOperationalCost: 0,
        employeeCount: 0,
      });
      item.payrollHours += numberValue(classGroup.totalPayrollHours);
      item.payrollOperationalCost += numberValue(classGroup.totalPayrollCost);
      item.employeeCount += numberValue(classGroup.employeeCount);
    }
  }

  return {
    totals,
    byDaycareMonth: [...byDaycareMonthMap.values()],
    byDaycare: [...byDaycare.values()].map((item) => ({ ...item, months: [...item.months] })),
    byClass: [...byClass.values()],
  };
}

function summarizeAllocations(allocationsInput, issues) {
  const allocations = modelValue(allocationsInput, 'allocations');
  const rows = arrayValue(allocations.rows);
  const unmappedRows = arrayValue(allocations.unmappedRows);
  const calculationRows = rows.filter((row) => !isExcludedAccountingCategory(row));
  const excludedRows = [...rows, ...unmappedRows].filter((row) => isExcludedAccountingCategory(row));
  const calculationUnmappedRows = unmappedRows.filter((row) => !isExcludedAccountingCategory(row));
  const byDepartment = new Map();
  const byMonth = new Map();
  const byUnitMonth = new Map();
  const byCategory = new Map();
  const totals = {
    totalRows: calculationRows.length + calculationUnmappedRows.length,
    mappedRows: calculationRows.length,
    unmappedRows: calculationUnmappedRows.length,
    excludedRows: excludedRows.length,
    debit: 0,
    credit: 0,
    netCash: 0,
    dataQualityPercent: calculationRows.length + calculationUnmappedRows.length > 0 ? (calculationRows.length / (calculationRows.length + calculationUnmappedRows.length)) * 100 : 100,
  };

  for (const row of calculationUnmappedRows) {
    addIssue(issues, {
      type: 'allocation_unmapped_row',
      severity: STATUS.YELLOW,
      scope: 'allocations',
      unit: row.unit,
      month: row.businessMonth,
      message: row.unmappedReason || 'Allocation row is missing unit or business month.',
    });
  }

  for (const row of calculationRows) {
    const unit = clean(row.unit);
    const month = clean(row.businessMonth || row.month);
    if (!unit || !month) continue;
    const debit = numberValue(row.debit);
    const credit = numberValue(row.credit);
    const netCash = clean(row.netCash) === '' ? credit - debit : numberValue(row.netCash);
    const category = accountingCategory(row) || 'Uncategorized';

    totals.debit += debit;
    totals.credit += credit;
    totals.netCash += netCash;

    const departmentItem = ensureMapItem(byDepartment, unit, {
      unit,
      debit: 0,
      credit: 0,
      netCash: 0,
      rowCount: 0,
      months: new Set(),
    });
    departmentItem.debit += debit;
    departmentItem.credit += credit;
    departmentItem.netCash += netCash;
    departmentItem.rowCount += 1;
    departmentItem.months.add(month);

    const monthItem = ensureMapItem(byMonth, month, {
      month,
      debit: 0,
      credit: 0,
      netCash: 0,
      rowCount: 0,
    });
    monthItem.debit += debit;
    monthItem.credit += credit;
    monthItem.netCash += netCash;
    monthItem.rowCount += 1;

    const unitMonthItem = ensureMapItem(byUnitMonth, unitMonthKey(unit, month), {
      unit,
      businessMonth: month,
      debit: 0,
      credit: 0,
      netCash: 0,
      rowCount: 0,
    });
    unitMonthItem.debit += debit;
    unitMonthItem.credit += credit;
    unitMonthItem.netCash += netCash;
    unitMonthItem.rowCount += 1;

    const categoryItem = ensureMapItem(byCategory, category, {
      category,
      debit: 0,
      credit: 0,
      netCash: 0,
      rowCount: 0,
    });
    categoryItem.debit += debit;
    categoryItem.credit += credit;
    categoryItem.netCash += netCash;
    categoryItem.rowCount += 1;
  }

  return {
    totals,
    byUnitMonth: [...byUnitMonth.values()].map((group) => ({
      unit: group.unit,
      businessMonth: group.businessMonth,
      key: unitMonthKey(group.unit, group.businessMonth),
      debit: numberValue(group.debit),
      credit: numberValue(group.credit),
      netCash: numberValue(group.netCash),
      rowCount: numberValue(group.rowCount),
    })),
    byDepartment: [...byDepartment.values()].map((item) => ({ ...item, months: [...item.months] })),
    byMonth: [...byMonth.values()],
    byCategory: [...byCategory.values()],
    excludedRows: excludedRows.map((row) => ({
      rowIndex: row.rowIndex,
      unit: row.unit || '',
      businessMonth: row.businessMonth || '',
      category: accountingCategory(row),
    })),
  };
}

function summarizeEmployees(employeesInput, issues) {
  const employees = Array.isArray(employeesInput) ? employeesInput : arrayValue(employeesInput?.employees);
  const byUnit = new Map();
  let rowsWithStatus = 0;
  let activeEmployees = 0;

  for (const employee of employees) {
    const status = getField(employee, ['status', 'employeeStatus', 'סטטוס', 'מצב']);
    const unit = clean(getField(employee, ['unit', 'organizationalUnit', 'department', 'daycare', 'מחלקה', 'מעון', 'סניף']));
    if (clean(status)) {
      rowsWithStatus += 1;
      if (ACTIVE_EMPLOYEE_VALUES.has(normalizeKey(status))) activeEmployees += 1;
    }
    if (unit) {
      const item = ensureMapItem(byUnit, unit, { unit, employeeRows: 0, activeEmployees: 0 });
      item.employeeRows += 1;
      if (ACTIVE_EMPLOYEE_VALUES.has(normalizeKey(status))) item.activeEmployees += 1;
    }
  }

  if (employees.length && rowsWithStatus === 0) {
    addIssue(issues, {
      type: 'employees_missing_status',
      severity: STATUS.YELLOW,
      scope: 'employees',
      message: 'Employees data is available, but no recognizable status field was found.',
    });
  }

  return {
    totals: {
      employeeRows: employees.length,
      activeEmployees: rowsWithStatus > 0 ? activeEmployees : null,
      rowsWithStatus,
    },
    byUnit: [...byUnit.values()],
  };
}

function compareDaycareMonth(budgetSummary, payrollSummary, issues) {
  const payrollByKey = new Map(payrollSummary.byDaycareMonth.map((group) => [group.key, group]));
  return budgetSummary.byDaycareMonth.map((budgetGroup) => {
    const payrollGroup = payrollByKey.get(budgetGroup.key) || {};
    const payrollHours = numberValue(payrollGroup.payrollHours);
    const payrollEmployees = numberValue(payrollGroup.employeeCount);
    const requiredHours = numberValue(budgetGroup.requiredHours);
    const requiredEmployees = numberValue(budgetGroup.requiredEmployees);
    const hoursDifference = payrollHours - requiredHours;
    const employeeDifference = payrollEmployees - requiredEmployees;

    if (payrollGroup.key && requiredHours > 0 && Math.abs(hoursDifference) > 0.1) {
      addIssue(issues, {
        type: hoursDifference < 0 ? 'payroll_hours_below_required' : 'payroll_hours_above_required',
        severity: Math.abs(hoursDifference) / requiredHours > 0.1 ? STATUS.RED : STATUS.YELLOW,
        scope: 'daycare_month',
        daycare: budgetGroup.daycare,
        month: budgetGroup.month,
        message: 'Payroll hours do not match required budget hours.',
      });
    }

    if (payrollGroup.key && requiredEmployees > 0 && Math.abs(employeeDifference) > 0.1) {
      addIssue(issues, {
        type: employeeDifference < 0 ? 'employees_below_required' : 'employees_above_required',
        severity: Math.abs(employeeDifference) >= 1 ? STATUS.RED : STATUS.YELLOW,
        scope: 'daycare_month',
        daycare: budgetGroup.daycare,
        month: budgetGroup.month,
        message: 'Payroll employee count does not match required employee headcount.',
      });
    }

    if (!payrollGroup.key) {
      addIssue(issues, {
        type: 'payroll_missing_for_budget_group',
        severity: STATUS.YELLOW,
        scope: 'daycare_month',
        daycare: budgetGroup.daycare,
        month: budgetGroup.month,
        message: 'Budget has a daycare/month group without matching payroll data.',
      });
    }

    return {
      daycare: budgetGroup.daycare,
      month: budgetGroup.month,
      key: budgetGroup.key,
      children: budgetGroup.children,
      capacity: budgetGroup.capacity,
      occupancyPercent: budgetGroup.occupancyPercent,
      requiredHours,
      payrollHours: payrollGroup.key ? payrollHours : null,
      hoursDifference: payrollGroup.key ? hoursDifference : null,
      requiredEmployees,
      payrollEmployees: payrollGroup.key ? payrollEmployees : null,
      employeeDifference: payrollGroup.key ? employeeDifference : null,
    };
  });
}

function buildDataAvailability(budgetSummary, payrollSummary, allocationsSummary, employeesSummary) {
  return {
    budget: {
      available: budgetSummary.totals.budgetGroupCount > 0,
      children: budgetSummary.totals.children > 0,
      classes: budgetSummary.byClass.length > 0,
      ageGroups: budgetSummary.byAgeGroup.length > 0,
      requiredHours: budgetSummary.totals.requiredHours > 0,
      requiredEmployeeHeadcount: budgetSummary.totals.requiredEmployees > 0,
      capacity: budgetSummary.totals.capacityRows > 0,
      capacityMissingReason: budgetSummary.totals.capacityRows > 0 ? '' : 'No explicit capacity field was exposed by the supplied budget data.',
    },
    payroll: {
      available: payrollSummary.byDaycareMonth.length > 0,
      payrollHours: payrollSummary.totals.payrollHours > 0,
      employeeCounts: payrollSummary.totals.employeeCount > 0,
      operationalCostOnly: true,
    },
    allocations: {
      available: allocationsSummary.totals.totalRows > 0,
      mappedRows: allocationsSummary.totals.mappedRows,
      unmappedRows: allocationsSummary.totals.unmappedRows,
      actualFinancialMovements: allocationsSummary.totals.mappedRows > 0,
    },
    employees: {
      available: employeesSummary.totals.employeeRows > 0,
      activeEmployees: employeesSummary.totals.activeEmployees !== null,
      activeEmployeesMissingReason: employeesSummary.totals.activeEmployees === null ? 'No recognizable employee status field was supplied.' : '',
    },
  };
}

function organizationTotals(budgetSummary, payrollSummary, allocationsSummary, employeesSummary) {
  return {
    children: budgetSummary.totals.children,
    capacity: budgetSummary.totals.capacityRows > 0 ? budgetSummary.totals.capacity : null,
    availableCapacity: budgetSummary.totals.capacityRows > 0 ? budgetSummary.totals.capacity - budgetSummary.totals.children : null,
    requiredHours: budgetSummary.totals.requiredHours,
    payrollHours: payrollSummary.totals.payrollHours,
    hoursDifference: payrollSummary.totals.payrollHours - budgetSummary.totals.requiredHours,
    requiredEmployees: budgetSummary.totals.requiredEmployees,
    payrollEmployees: payrollSummary.totals.employeeCount,
    activeEmployees: employeesSummary.totals.activeEmployees,
    budgetRevenue: budgetSummary.totals.budgetRevenue,
    budgetCosts: budgetSummary.totals.budgetCosts,
    allocationIncome: allocationsSummary.totals.credit,
    allocationExpenses: allocationsSummary.totals.debit,
    allocationNetCash: allocationsSummary.totals.netCash,
    payrollOperationalCost: payrollSummary.totals.payrollOperationalCost,
  };
}

function possibleReports(dataAvailability) {
  const reports = [];
  if (dataAvailability.budget.children) reports.push('Children by daycare, month, class, and age group when class/age data is present.');
  if (dataAvailability.budget.requiredHours && dataAvailability.payroll.payrollHours) reports.push('Required hours vs payroll hours by daycare/month.');
  if (dataAvailability.budget.requiredEmployeeHeadcount && dataAvailability.payroll.employeeCounts) reports.push('Required employee headcount vs payroll employee count by daycare/month.');
  if (dataAvailability.allocations.actualFinancialMovements) reports.push('Actual allocation income/expense by organizational unit and business month.');
  if (dataAvailability.allocations.unmappedRows > 0) reports.push('Missing allocation unit/month issue report.');
  if (dataAvailability.budget.capacity) reports.push('Capacity, available places, and occupancy percentage by daycare/month.');
  return reports;
}

function buildManagementIntelligence(input = {}) {
  const issues = [];
  const budget = summarizeBudget(input.budget, issues);
  const payroll = summarizePayroll(input.payroll, issues);
  const allocations = summarizeAllocations(input.allocations, issues);
  const employees = summarizeEmployees(input.employees, issues);
  const daycareComparisons = compareDaycareMonth(budget, payroll, issues);
  const dataAvailability = buildDataAvailability(budget, payroll, allocations, employees);

  return {
    organization: organizationTotals(budget, payroll, allocations, employees),
    byDaycare: budget.byDaycare,
    byDepartment: allocations.byDepartment,
    byAgeGroup: budget.byAgeGroup,
    byClass: budget.byClass,
    byMonth: {
      budget: budget.byMonth,
      allocations: allocations.byMonth,
    },
    comparisons: {
      daycareMonth: daycareComparisons,
    },
    financial: {
      budgetPlanned: {
        revenue: budget.totals.budgetRevenue,
        costs: budget.totals.budgetCosts,
      },
      allocationsActual: {
        income: allocations.totals.credit,
        expenses: allocations.totals.debit,
        netCash: allocations.totals.netCash,
        byCategory: allocations.byCategory,
        excludedRows: allocations.excludedRows,
      },
      payrollOperationalOnly: {
        cost: payroll.totals.payrollOperationalCost,
        note: 'Payroll is not counted as actual expense here. Actual financial movements come from allocations.',
      },
    },
    dataQuality: {
      allocations: {
        totalRows: allocations.totals.totalRows,
        mappedRows: allocations.totals.mappedRows,
        unmappedRows: allocations.totals.unmappedRows,
        excludedRows: allocations.totals.excludedRows,
        percentage: allocations.totals.dataQualityPercent,
      },
    },
    dataAvailability,
    issues,
    possibleReports: possibleReports(dataAvailability),
  };
}

module.exports = {
  STATUS,
  buildManagementIntelligence,
};
