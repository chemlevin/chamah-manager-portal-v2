const API_ENDPOINTS = {
  budget: "/api/budget",
  payroll: "/api/payroll",
  allocations: "/api/allocations",
  employees: "/api/employees",
};

const STATUS_THRESHOLDS = {
  dataQualityRedBelow: 90,
  dataQualityYellowBelow: 98,
  hoursYellowPercent: 5,
  hoursRedPercent: 15,
  employeeYellowGap: 1,
  employeeRedGap: 2,
};

const EXCLUDED_ACCOUNTING_CATEGORY = "חריג לא לחישוב";
const NOT_UPDATED = "טרם עודכן";
const NO_DATA = "אין נתונים";

const moneyFormatter = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat("he-IL");
const state = { month: "all", unit: "all", unitType: "all", search: "", expenseSort: "amount-desc", payrollSort: "cost-desc" };
const dashboardData = { budgetGroups: [], payrollGroups: [], payrollRows: [], allocationGroups: [], allocationRows: [], unmappedRows: [], excludedAllocationRows: [], employees: [], errors: [] };

const els = {
  monthFilter: document.querySelector("#month-filter"),
  unitFilter: document.querySelector("#unit-filter"),
  unitTypeFilter: document.querySelector("#unit-type-filter"),
  selectedMonthLabel: document.querySelector("#selected-month-label"),
  overallStatusLabel: document.querySelector("#overall-status-label"),
  lastUpdateLabel: document.querySelector("#last-update-label"),
  statusGrid: document.querySelector("#organization-status-grid"),
  freshnessGrid: document.querySelector("#data-freshness-grid"),
  freshnessStatusChip: document.querySelector("#freshness-status-chip"),
  dataQualityGrid: document.querySelector("#data-quality-grid"),
  dataQualityStatusChip: document.querySelector("#data-quality-status-chip"),
  summaryGrid: document.querySelector("#organization-summary-grid"),
  operationalStatusChip: document.querySelector("#operational-status-chip"),
  operationalGrid: document.querySelector("#operational-comparison-grid"),
  daycareComparisonGrid: document.querySelector("#daycare-comparison-grid"),
  comparisonCountLabel: document.querySelector("#comparison-count-label"),
  actionCountLabel: document.querySelector("#action-count-label"),
  actionList: document.querySelector("#action-list"),
  unitCountLabel: document.querySelector("#unit-count-label"),
  unitCardGrid: document.querySelector("#unit-card-grid"),
  issueCountLabel: document.querySelector("#issue-count-label"),
  dataIssueCount: document.querySelector("#data-issue-count"),
  operationalIssueCount: document.querySelector("#operational-issue-count"),
  financialIssueCount: document.querySelector("#financial-issue-count"),
  dataIssueList: document.querySelector("#data-issue-list"),
  operationalIssueList: document.querySelector("#operational-issue-list"),
  financialIssueList: document.querySelector("#financial-issue-list"),
  insightGrid: document.querySelector("#insight-grid"),
  tableSearch: document.querySelector("#table-search"),
  expenseSort: document.querySelector("#expense-sort"),
  payrollSort: document.querySelector("#payroll-sort"),
  financialTableBody: document.querySelector("#financial-table-body"),
  payrollTableBody: document.querySelector("#payroll-table-body"),
  financialTableCount: document.querySelector("#financial-table-count"),
  payrollTableCount: document.querySelector("#payroll-table-count"),
};

function safeText(value, fallback = "לא משויך") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clean(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function unique(values) {
  return [...new Set(values.map((value) => clean(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "he", { numeric: true }));
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + safeNumber(row[key]), 0);
}

function hasRows(rows) {
  return Array.isArray(rows) && rows.length > 0;
}

function formatNumber(value, available = true) {
  return available ? numberFormatter.format(safeNumber(value)) : NO_DATA;
}

function formatMoney(value, available = true) {
  return available ? moneyFormatter.format(safeNumber(value)) : NO_DATA;
}

function option(value, label) {
  return '<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + '</option>';
}

async function fetchJson(name, url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(name + " returned " + response.status);
  return response.json();
}

function valueExists(value) {
  return value !== undefined && value !== null && clean(value) !== "";
}

function accountingCategory(row) {
  return safeText(row.accountingCategory || row.category || row.detail || row.details || row.raw?.["פירוט"], "");
}

function isExcludedAllocation(row) {
  return accountingCategory(row) === EXCLUDED_ACCOUNTING_CATEGORY;
}

function normalizeBudget(payload) {
  const groups = payload?.budget?.byDaycareMonth || payload?.byDaycareMonth || [];
  return (Array.isArray(groups) ? groups : []).map((group) => {
    const capacityValue = group.capacity ?? group.childCapacity ?? group.childrenCapacity ?? group.maxChildren;
    return {
      unit: safeText(group.daycare),
      month: safeText(group.month, ""),
      children: safeNumber(group.children),
      hasChildren: valueExists(group.children),
      capacity: valueExists(capacityValue) ? safeNumber(capacityValue) : null,
      hasCapacity: valueExists(capacityValue),
      requiredHours: safeNumber(group.requiredHours || group.totalRequiredHours),
      hasRequiredHours: valueExists(group.requiredHours || group.totalRequiredHours),
      requiredEmployees: safeNumber(group.requiredEmployeeHeadcount),
      hasRequiredEmployees: valueExists(group.requiredEmployeeHeadcount),
      requiredStaff: safeNumber(group.requiredStaff),
      budgetRevenue: safeNumber(group.expectedRevenue),
      hasBudgetRevenue: valueExists(group.expectedRevenue),
      budgetCosts: safeNumber(group.totalBudgetCosts),
      hasBudgetCosts: valueExists(group.totalBudgetCosts),
    };
  }).filter((group) => group.unit && group.month);
}

function normalizePayroll(payload) {
  const payroll = payload?.payroll || payload || {};
  const groups = Array.isArray(payload?.byDaycareMonth) ? payload.byDaycareMonth : payroll.byDaycareMonth;
  const rows = Array.isArray(payroll.rows) ? payroll.rows : [];
  return {
    groups: (Array.isArray(groups) ? groups : []).map((group) => ({
      unit: safeText(group.daycare),
      month: safeText(group.month, ""),
      payrollCost: safeNumber(group.totalPayrollCost ?? group.total),
      payrollHours: safeNumber(group.totalPayrollHours),
      employeeCount: safeNumber(group.employeeCount),
      rowCount: safeNumber(group.rowCount),
      byClass: Array.isArray(group.byClass) ? group.byClass : [],
    })).filter((group) => group.unit && group.month),
    rows: rows.map((row) => ({
      employee: safeText(row.employee, "לא צוין עובד"),
      unit: safeText(row.daycare),
      className: safeText(row.classroom, "לא שויך לכיתה"),
      month: safeText(row.month, ""),
      cost: safeNumber(row.totalPayrollCost ?? row.total),
      hours: safeNumber(row.totalPayrollHours),
    })).filter((row) => row.unit && row.month),
  };
}

function normalizeAllocationRows(payload) {
  const allocations = payload?.allocations || payload || {};
  const rows = Array.isArray(payload?.rows) ? payload.rows : allocations.rows;
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    reference: safeText(row.reference, ""),
    cashDate: safeText(row.cashDate, ""),
    month: safeText(row.businessMonth, ""),
    unit: safeText(row.unit),
    debit: safeNumber(row.debit),
    credit: safeNumber(row.credit),
    definition: safeText(row.definition, "לא סווג"),
    accountingCategory: accountingCategory(row),
    notes: safeText(row.notes, ""),
    excludedFromCalculations: isExcludedAllocation(row),
  })).filter((row) => row.unit && row.month);
}

function groupAllocationRows(rows) {
  const map = new Map();
  rows.filter((row) => !row.excludedFromCalculations).forEach((row) => {
    const key = row.unit + "|" + row.month;
    if (!map.has(key)) map.set(key, { unit: row.unit, month: row.month, expenses: 0, income: 0, rowCount: 0 });
    const group = map.get(key);
    group.expenses += row.debit;
    group.income += row.credit;
    group.rowCount += 1;
  });
  return [...map.values()].sort((a, b) => (a.unit + a.month).localeCompare(b.unit + b.month, "he", { numeric: true }));
}

function normalizeAllocations(payload) {
  const allocations = payload?.allocations || payload || {};
  const rows = normalizeAllocationRows(payload);
  const unmappedRows = Array.isArray(payload?.unmappedRows) ? payload.unmappedRows : allocations.unmappedRows;
  const visibleUnmappedRows = (Array.isArray(unmappedRows) ? unmappedRows : []).filter((row) => !isExcludedAllocation(row));
  return {
    groups: groupAllocationRows(rows),
    rows,
    excludedRows: rows.filter((row) => row.excludedFromCalculations),
    unmappedRows: visibleUnmappedRows,
  };
}

function normalizeEmployees(payload) {
  return Array.isArray(payload?.employees) ? payload.employees : [];
}

function parseDateValue(value) {
  const text = clean(value);
  if (!text) return null;
  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct;
  const match = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  if (!match) return null;
  const year = Number(match[3].length === 2 ? "20" + match[3] : match[3]);
  const date = new Date(year, Number(match[2]) - 1, Number(match[1]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function latestCashDate(rows) {
  const dates = rows.map((row) => parseDateValue(row.cashDate)).filter(Boolean).sort((a, b) => b - a);
  return dates[0] ? dates[0].toLocaleDateString("he-IL") : NOT_UPDATED;
}

function latestMonthValue(rows, key = "month") {
  const values = unique(rows.map((row) => row[key]));
  if (!values.length) return NOT_UPDATED;
  return values.sort((a, b) => {
    const aNum = Number(a);
    const bNum = Number(b);
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) return bNum - aNum;
    return String(b).localeCompare(String(a), "he", { numeric: true });
  })[0];
}

function unitType(unit, data) {
  const inBudgetOrPayroll = data.budgetGroups.some((row) => row.unit === unit) || data.payrollGroups.some((row) => row.unit === unit);
  return inBudgetOrPayroll ? "daycare" : "other";
}

function filteredData() {
  const base = {
    budgetGroups: dashboardData.budgetGroups,
    payrollGroups: dashboardData.payrollGroups,
    payrollRows: dashboardData.payrollRows,
    allocationGroups: dashboardData.allocationGroups,
    allocationRows: dashboardData.allocationRows,
    unmappedRows: dashboardData.unmappedRows,
    employees: dashboardData.employees,
  };
  const allUnits = unique([...base.budgetGroups.map((row) => row.unit), ...base.payrollGroups.map((row) => row.unit), ...base.allocationGroups.map((row) => row.unit)]);
  const allowedUnits = allUnits.filter((unit) => (state.unit === "all" || unit === state.unit) && (state.unitType === "all" || unitType(unit, base) === state.unitType));
  const hasUnit = (row) => allowedUnits.includes(row.unit);
  const hasMonth = (row) => state.month === "all" || row.month === state.month;
  return {
    budgetGroups: base.budgetGroups.filter((row) => hasUnit(row) && hasMonth(row)),
    payrollGroups: base.payrollGroups.filter((row) => hasUnit(row) && hasMonth(row)),
    payrollRows: base.payrollRows.filter((row) => hasUnit(row) && hasMonth(row)),
    allocationGroups: base.allocationGroups.filter((row) => hasUnit(row) && hasMonth(row)),
    allocationRows: base.allocationRows.filter((row) => hasUnit(row) && hasMonth(row)),
    unmappedRows: base.unmappedRows,
    employees: base.employees,
    allowedUnits,
  };
}

function buildUnitRows(data) {
  return data.allowedUnits.map((unit) => {
    const budget = data.budgetGroups.filter((row) => row.unit === unit);
    const payroll = data.payrollGroups.filter((row) => row.unit === unit);
    const allocations = data.allocationGroups.filter((row) => row.unit === unit);
    const row = {
      unit,
      type: unitType(unit, dashboardData),
      hasBudget: hasRows(budget),
      hasPayroll: hasRows(payroll),
      hasAllocations: hasRows(allocations),
      children: sum(budget, "children"),
      hasChildren: budget.some((item) => item.hasChildren),
      capacity: budget.some((item) => item.hasCapacity) ? sum(budget.filter((item) => item.hasCapacity), "capacity") : null,
      hasCapacity: budget.some((item) => item.hasCapacity),
      requiredHours: sum(budget, "requiredHours"),
      hasRequiredHours: budget.some((item) => item.hasRequiredHours),
      payrollHours: sum(payroll, "payrollHours"),
      requiredEmployees: sum(budget, "requiredEmployees"),
      hasRequiredEmployees: budget.some((item) => item.hasRequiredEmployees),
      payrollEmployees: sum(payroll, "employeeCount"),
      payrollCost: sum(payroll, "payrollCost"),
      expenses: sum(allocations, "expenses"),
      income: sum(allocations, "income"),
      budgetRevenue: sum(budget, "budgetRevenue"),
      issueCount: 0,
      status: "green",
    };
    return row;
  });
}

function buildIssues(data, unitRows) {
  const issues = [];
  dashboardData.errors.forEach((message) => issues.push({ category: "data", severity: "yellow", unit: "מערכת", month: state.month, count: 1, label: message }));
  const missingUnitRows = dashboardData.unmappedRows.filter((row) => String(row.unmappedReason || "").includes("unit"));
  const missingMonthRows = dashboardData.unmappedRows.filter((row) => String(row.unmappedReason || "").includes("businessMonth"));
  if (missingUnitRows.length) issues.push({ category: "data", severity: "yellow", unit: "לא משויך", month: "כל החודשים", count: missingUnitRows.length, label: "חסר שיוך יחידה" });
  if (missingMonthRows.length) issues.push({ category: "data", severity: "yellow", unit: "לא משויך", month: "כל החודשים", count: missingMonthRows.length, label: "חסר חודש שיוך" });
  if (dashboardData.unmappedRows.length) issues.push({ category: "data", severity: "yellow", unit: "לא משויך", month: "כל החודשים", count: dashboardData.unmappedRows.length, label: "שורות בנק ללא יחידה או חודש" });
  const missingRefs = data.allocationRows.filter((row) => !row.reference && !row.excludedFromCalculations).length;
  if (missingRefs) issues.push({ category: "data", severity: "yellow", unit: "מספר יחידות", month: state.month, count: missingRefs, label: "חסרה אסמכתא" });

  unitRows.forEach((row) => {
    const hoursDiff = row.payrollHours - row.requiredHours;
    const employeeDiff = row.payrollEmployees - row.requiredEmployees;
    if (row.type === "daycare" && row.hasBudget && !row.hasCapacity && row.hasChildren) issues.push({ category: "operational", severity: "yellow", unit: row.unit, month: state.month, count: 1, label: "חסרה קיבולת" });
    if (row.type === "daycare" && row.hasCapacity && row.children > row.capacity) issues.push({ category: "operational", severity: "red", unit: row.unit, month: state.month, count: row.children - row.capacity, label: "ילדים מעל קיבולת" });
    if (row.hasRequiredHours && row.hasPayroll && hoursDiff < 0) issues.push({ category: "operational", severity: "red", unit: row.unit, month: state.month, count: Math.abs(Math.round(hoursDiff)), label: "שעות שכר נמוכות מהנדרש" });
    if (row.hasRequiredHours && row.hasPayroll && hoursDiff > 0) issues.push({ category: "operational", severity: "yellow", unit: row.unit, month: state.month, count: Math.round(hoursDiff), label: "שעות שכר גבוהות מהנדרש" });
    if (row.hasRequiredEmployees && row.hasPayroll && employeeDiff < 0) issues.push({ category: "operational", severity: "red", unit: row.unit, month: state.month, count: Math.abs(Math.round(employeeDiff)), label: "מספר עובדים נמוך מהנדרש" });
    if (row.hasRequiredEmployees && row.hasPayroll && employeeDiff > 0) issues.push({ category: "operational", severity: "yellow", unit: row.unit, month: state.month, count: Math.round(employeeDiff), label: "מספר עובדים גבוה מהנדרש" });
    if (row.hasBudget && !row.hasPayroll) issues.push({ category: "operational", severity: "yellow", unit: row.unit, month: state.month, count: 1, label: "אין נתוני שכר" });
    if ((row.hasBudget || row.hasPayroll) && !row.hasAllocations) issues.push({ category: "financial", severity: "yellow", unit: row.unit, month: state.month, count: 1, label: "אין נתוני בנק" });
    if (row.expenses > 0 && row.type === "other") issues.push({ category: "financial", severity: "yellow", unit: row.unit, month: state.month, count: 1, label: "הוצאות במחלקה שאינה מעון דורשות בדיקה" });
  });

  unitRows.forEach((row) => {
    row.issueCount = issues.filter((issue) => issue.unit === row.unit).length;
    row.status = issues.some((issue) => issue.unit === row.unit && issue.severity === "red") ? "red" : row.issueCount ? "yellow" : "green";
  });
  return issues;
}

function statusFromIssues(issues) {
  if (issues.some((issue) => issue.severity === "red")) return "red";
  if (issues.length) return "yellow";
  return "green";
}

function statusLabel(status) {
  return status === "red" ? "דורש טיפול" : status === "yellow" ? "דורש בדיקה" : "תקין";
}

function severityLabel(severity) {
  return severity === "red" ? "דחוף" : severity === "yellow" ? "בדיקה" : "תקין";
}

function renderFilterOptions() {
  const months = unique([...dashboardData.budgetGroups.map((row) => row.month), ...dashboardData.payrollGroups.map((row) => row.month), ...dashboardData.allocationGroups.map((row) => row.month)]);
  const units = unique([...dashboardData.budgetGroups.map((row) => row.unit), ...dashboardData.payrollGroups.map((row) => row.unit), ...dashboardData.allocationGroups.map((row) => row.unit)]);
  if (!months.includes(state.month)) state.month = "all";
  if (!units.includes(state.unit)) state.unit = "all";
  els.monthFilter.innerHTML = option("all", "כל החודשים") + months.map((month) => option(month, month)).join("");
  els.unitFilter.innerHTML = option("all", "כל היחידות") + units.map((unit) => option(unit, unit)).join("");
  els.unitTypeFilter.innerHTML = option("all", "כל הסוגים") + option("daycare", "מעונות") + option("other", "מחלקות / אחר");
  els.monthFilter.value = state.month;
  els.unitFilter.value = state.unit;
  els.unitTypeFilter.value = state.unitType;
}

function kpiCard(label, value, sub, tone = "secondary") {
  return '<article class="kpi-card cashflow-kpi management-kpi ' + tone + '-kpi"><span class="kpi-icon" aria-hidden="true">' + escapeHtml(label.slice(0, 1)) + '</span><div><p>' + escapeHtml(label) + '</p><strong>' + escapeHtml(value) + '</strong><span>' + escapeHtml(sub) + '</span></div></article>';
}

function renderStatus(data, unitRows, issues) {
  const status = statusFromIssues(issues);
  els.overallStatusLabel.textContent = statusLabel(status);
  els.overallStatusLabel.className = "status-pill " + status;
  els.lastUpdateLabel.textContent = "עדכון בנק אחרון: " + latestCashDate(dashboardData.allocationRows);
  els.selectedMonthLabel.textContent = state.month === "all" ? "כל החודשים" : state.month;
  const cards = [
    { label: "חודש מוצג", value: state.month === "all" ? "כל החודשים" : state.month, sub: "תצוגה ניהולית נוכחית", tone: "secondary" },
    { label: "עדכון בנק אחרון", value: latestCashDate(dashboardData.allocationRows), sub: "לפי תאריך תנועת בנק", tone: latestCashDate(dashboardData.allocationRows) === NOT_UPDATED ? "attention" : "balance" },
    { label: "יחידות פעילות", value: formatNumber(unitRows.length, unitRows.length > 0), sub: "יחידות במסננים הנוכחיים", tone: "income" },
    { label: "חריגות פתוחות", value: issues.length ? numberFormatter.format(issues.length) : "אין", sub: issues.length ? "נתונים, תפעול וכספים" : "אין חריגות פתוחות", tone: issues.length ? "attention" : "balance" },
    { label: "מצב", value: statusLabel(status), sub: "לפי החריגות הפתוחות", tone: status === "red" ? "attention" : status === "yellow" ? "expense" : "balance" },
  ];
  els.statusGrid.innerHTML = cards.map((card) => kpiCard(card.label, card.value, card.sub, card.tone)).join("");
}

function renderSummary(data) {
  const hasBudget = hasRows(data.budgetGroups);
  const hasPayroll = hasRows(data.payrollGroups);
  const hasAllocations = hasRows(data.allocationGroups);
  const employeeCount = dashboardData.employees.length || sum(data.payrollGroups, "employeeCount");
  const hasEmployees = dashboardData.employees.length > 0 || hasPayroll;
  const cards = [
    { label: "תקציב מתוכנן", value: formatMoney(sum(data.budgetGroups, "budgetRevenue"), hasBudget), sub: hasBudget ? "לפי תקציב מעון וחודש" : "אין נתוני תקציב", tone: "income" },
    { label: "שכר", value: formatMoney(sum(data.payrollGroups, "payrollCost"), hasPayroll), sub: hasPayroll ? "נתוני שכר תפעוליים" : "אין נתוני שכר", tone: "payroll" },
    { label: "הוצאות", value: formatMoney(sum(data.allocationGroups, "expenses"), hasAllocations), sub: hasAllocations ? "תנועות חובה בבנק" : "אין נתוני בנק", tone: "expense" },
    { label: "הכנסות", value: formatMoney(sum(data.allocationGroups, "income"), hasAllocations), sub: hasAllocations ? "תנועות זכות בבנק" : "אין נתוני בנק", tone: "income" },
    { label: "עובדים", value: formatNumber(employeeCount, hasEmployees), sub: dashboardData.employees.length ? "מתוך נתוני עובדים" : hasPayroll ? "מתוך נתוני שכר" : "אין נתוני עובדים", tone: "secondary" },
    { label: "ילדים", value: formatNumber(sum(data.budgetGroups, "children"), hasBudget), sub: hasBudget ? "מתוך נתוני תקציב" : "אין נתוני תקציב", tone: "secondary" },
  ];
  els.summaryGrid.innerHTML = cards.map((card) => kpiCard(card.label, card.value, card.sub, card.tone)).join("");
}

function comparisonCard(label, actual, expected, actualAvailable, expectedAvailable, unitLabel) {
  const actualText = formatNumber(actual, actualAvailable);
  const expectedText = formatNumber(expected, expectedAvailable);
  let diffText = "אין מספיק נתונים להשוואה";
  if (actualAvailable && expectedAvailable) {
    const diff = safeNumber(actual) - safeNumber(expected);
    diffText = diff === 0 ? "ללא פער" : (diff > 0 ? "+" : "") + numberFormatter.format(diff) + " " + unitLabel;
  }
  return '<article class="dashboard-panel comparison-card"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(actualText) + ' / ' + escapeHtml(expectedText) + '</strong><p>' + escapeHtml(diffText) + '</p></article>';
}

function renderOperations(data, issues) {
  const hasBudget = hasRows(data.budgetGroups);
  const hasPayroll = hasRows(data.payrollGroups);
  const children = sum(data.budgetGroups, "children");
  const requiredHours = sum(data.budgetGroups, "requiredHours");
  const payrollHours = sum(data.payrollGroups, "payrollHours");
  const requiredEmployees = sum(data.budgetGroups, "requiredEmployees");
  const payrollEmployees = sum(data.payrollGroups, "employeeCount");
  const operationalIssues = issues.filter((issue) => issue.category === "operational");
  els.operationalStatusChip.textContent = operationalIssues.length ? numberFormatter.format(operationalIssues.length) + " פריטים" : "אין פריטים פתוחים";
  els.operationalGrid.innerHTML = [
    comparisonCard("ילדים בפועל", children, children, hasBudget, hasBudget, "ילדים"),
    comparisonCard("שעות שכר מול נדרש", payrollHours, requiredHours, hasPayroll, hasBudget, "שעות"),
    comparisonCard("עובדים מול נדרש", payrollEmployees, requiredEmployees, hasPayroll, hasBudget, "עובדים"),
  ].join("");
}

function renderUnits(unitRows) {
  const sortedRows = [...unitRows].sort((a, b) => {
    const rank = { red: 0, yellow: 1, green: 2 };
    return rank[a.status] - rank[b.status] || b.issueCount - a.issueCount || a.unit.localeCompare(b.unit, "he");
  });
  const attentionCount = sortedRows.filter((row) => row.status !== "green").length;
  els.unitCountLabel.textContent = unitRows.length ? (attentionCount ? numberFormatter.format(attentionCount) + " דורשות תשומת לב" : "הכל תקין") : NO_DATA;
  if (!sortedRows.length) {
    els.unitCardGrid.innerHTML = '<p class="empty-state">אין יחידות להצגה במסננים הנוכחיים.</p>';
    return;
  }
  els.unitCardGrid.innerHTML = sortedRows.map((row) => '<article class="daycare-card management-unit-card status-' + row.status + '"><div class="unit-status-ribbon">' + escapeHtml(statusLabel(row.status)) + '</div><div class="daycare-card-head"><div><h3>' + escapeHtml(row.unit) + '</h3><span>' + escapeHtml(row.type === "daycare" ? "מעון" : "מחלקה / אחר") + '</span></div><strong aria-label="מספר חריגות">' + escapeHtml(row.issueCount ? numberFormatter.format(row.issueCount) : "אין") + '</strong></div><div class="unit-primary-line"><span>' + escapeHtml(row.issueCount ? "דורש טיפול" : "ללא טיפול פתוח") + '</span><b>' + escapeHtml(row.hasAllocations ? "בנק מעודכן" : "אין נתוני בנק") + '</b></div><div class="daycare-metrics financial-metrics"><div><span>ילדים</span><strong>' + escapeHtml(formatNumber(row.children, row.hasBudget)) + '</strong></div><div><span>שכר</span><strong>' + escapeHtml(formatMoney(row.payrollCost, row.hasPayroll)) + '</strong></div><div><span>הוצאות</span><strong>' + escapeHtml(formatMoney(row.expenses, row.hasAllocations)) + '</strong></div><div><span>שעות</span><strong>' + escapeHtml(formatNumber(row.payrollHours, row.hasPayroll)) + '</strong></div><div><span>עובדים</span><strong>' + escapeHtml(formatNumber(row.payrollEmployees, row.hasPayroll)) + '</strong></div><div><span>נדרש</span><strong>' + escapeHtml(formatNumber(row.requiredEmployees, row.hasRequiredEmployees)) + '</strong></div></div><div class="budget-note">' + escapeHtml(row.issueCount ? "פתחו את הפעולות והשלימו את הנתון החסר" : "אין חריגות פתוחות ליחידה") + '</div></article>').join("");
}

function renderIssueList(target, countTarget, issues) {
  countTarget.textContent = issues.length ? numberFormatter.format(issues.length) : "אין";
  target.innerHTML = issues.length ? issues.map((issue) => '<article class="issue-row severity-' + issue.severity + '"><span>' + escapeHtml(severityLabel(issue.severity)) + '</span><strong>' + escapeHtml(actionText(issue)) + '</strong><p>' + escapeHtml(issue.label) + ' · ' + escapeHtml(issue.unit) + ' · ' + escapeHtml(issue.month || "כל החודשים") + ' · ' + escapeHtml(numberFormatter.format(issue.count)) + '</p></article>').join("") : '<p class="empty-state">אין חריגות בקטגוריה זו.</p>';
}

function renderIssues(issues) {
  const dataIssues = issues.filter((issue) => issue.category === "data");
  const operationalIssues = issues.filter((issue) => issue.category === "operational");
  const financialIssues = issues.filter((issue) => issue.category === "financial");
  els.issueCountLabel.textContent = issues.length ? numberFormatter.format(issues.length) + " חריגות פתוחות" : "אין חריגות פתוחות";
  renderIssueList(els.dataIssueList, els.dataIssueCount, dataIssues);
  renderIssueList(els.operationalIssueList, els.operationalIssueCount, operationalIssues);
  renderIssueList(els.financialIssueList, els.financialIssueCount, financialIssues);
}

function renderInsights(data, issues) {
  const insights = [];
  const hasBudget = hasRows(data.budgetGroups);
  const hasPayroll = hasRows(data.payrollGroups);
  const requiredHours = sum(data.budgetGroups, "requiredHours");
  const payrollHours = sum(data.payrollGroups, "payrollHours");
  const requiredEmployees = sum(data.budgetGroups, "requiredEmployees");
  const payrollEmployees = sum(data.payrollGroups, "employeeCount");
  if (!hasBudget) insights.push(["אין נתוני תקציב", "לא ניתן להשוות ילדים, שעות נדרשות או תקן עובדים."]);
  if (!hasPayroll) insights.push(["אין נתוני שכר", "לא ניתן להשוות שעות שכר או כמות עובדים בפועל."]);
  if (!hasRows(data.allocationGroups)) insights.push(["אין נתוני בנק", "לא ניתן להציג הוצאות והכנסות בפועל."]);
  if (hasBudget && hasPayroll && payrollHours > requiredHours) insights.push(["שעות שכר מעל הנדרש", numberFormatter.format(payrollHours - requiredHours) + " שעות מעל התקן"]);
  if (hasBudget && hasPayroll && payrollHours < requiredHours) insights.push(["שעות שכר מתחת לנדרש", numberFormatter.format(requiredHours - payrollHours) + " שעות חסרות"]);
  if (hasBudget && hasPayroll && payrollEmployees > requiredEmployees) insights.push(["כמות עובדים מעל הנדרש", numberFormatter.format(payrollEmployees - requiredEmployees) + " עובדים מעל התקן"]);
  if (hasBudget && hasPayroll && payrollEmployees < requiredEmployees) insights.push(["כמות עובדים מתחת לנדרש", numberFormatter.format(requiredEmployees - payrollEmployees) + " עובדים חסרים"]);
  if (dashboardData.unmappedRows.length) insights.push(["תנועות בנק לא משויכות", numberFormatter.format(dashboardData.unmappedRows.length) + " שורות דורשות יחידה או חודש"]);
  if (!insights.length && issues.length) insights.push(["יש חריגות לבדיקה", numberFormatter.format(issues.length) + " פריטים מופיעים במרכז החריגות."]);
  if (!insights.length && !issues.length) insights.push(["אין פעולה מיידית", "המסננים הנוכחיים לא מציגים חריגות פתוחות."]);
  els.insightGrid.innerHTML = insights.map(([title, detail], index) => '<article class="executive-alert management-insight ' + (index === 0 ? 'primary-insight' : '') + '"><span>תובנה ניהולית</span><strong>' + escapeHtml(title) + '</strong><p>' + escapeHtml(detail) + '</p></article>').join("");
}

function financialRows(allocationRows) {
  const rows = [];
  allocationRows.forEach((row) => {
    const details = row.notes || row.reference || row.cashDate;
    const category = row.accountingCategory || row.definition;
    if (row.credit) rows.push({ type: "הכנסה", amount: row.credit, category, unit: row.unit, month: row.month, details, excluded: row.excludedFromCalculations });
    if (row.debit) rows.push({ type: "הוצאה", amount: row.debit, category, unit: row.unit, month: row.month, details, excluded: row.excludedFromCalculations });
  });
  return rows;
}

function matchesSearch(row) {
  return !state.search || Object.values(row).join(" ").toLowerCase().includes(state.search.toLowerCase());
}

function sortedFinancial(rows) {
  return [...rows].filter(matchesSearch).sort((a, b) => {
    if (state.expenseSort === "amount-asc") return a.amount - b.amount;
    if (state.expenseSort === "month-desc") return String(b.month).localeCompare(String(a.month), "he", { numeric: true });
    return b.amount - a.amount;
  });
}

function sortedPayroll(rows) {
  return [...rows].filter(matchesSearch).sort((a, b) => {
    if (state.payrollSort === "cost-asc") return a.cost - b.cost;
    if (state.payrollSort === "hours-desc") return b.hours - a.hours;
    return b.cost - a.cost;
  });
}

function renderTables(data) {
  const finance = sortedFinancial(financialRows(data.allocationRows));
  const payroll = sortedPayroll(data.payrollRows);
  els.financialTableCount.textContent = finance.length ? numberFormatter.format(finance.length) + " שורות" : "אין נתוני בנק";
  els.payrollTableCount.textContent = payroll.length ? numberFormatter.format(payroll.length) + " שורות" : "אין נתוני שכר";
  els.financialTableBody.innerHTML = finance.map((row) => '<tr class="' + (row.excluded ? 'excluded-row' : '') + '"><td>' + escapeHtml(row.excluded ? row.type + " - לא לחישוב" : row.type) + '</td><td>' + escapeHtml(moneyFormatter.format(row.amount)) + '</td><td>' + escapeHtml(row.category || NO_DATA) + '</td><td>' + escapeHtml(row.unit) + '</td><td>' + escapeHtml(row.month) + '</td><td>' + escapeHtml(row.details) + '</td></tr>').join("") || '<tr><td colspan="6">אין נתוני בנק להצגה במסננים הנוכחיים.</td></tr>';
  els.payrollTableBody.innerHTML = payroll.map((row) => '<tr><td>' + escapeHtml(row.employee) + '</td><td>' + escapeHtml(row.unit) + '</td><td>' + escapeHtml(row.className) + '</td><td>' + escapeHtml(numberFormatter.format(row.hours)) + '</td><td>' + escapeHtml(moneyFormatter.format(row.cost)) + '</td></tr>').join("") || '<tr><td colspan="5">אין נתוני שכר להצגה במסננים הנוכחיים.</td></tr>';
}

function allocationQuality() {
  const mapped = dashboardData.allocationRows.filter((row) => !row.excludedFromCalculations).length;
  const unmapped = dashboardData.unmappedRows.length;
  const total = mapped + unmapped;
  const percentage = total ? Math.round((mapped / total) * 100) : null;
  return { total, mapped, unmapped, percentage };
}

function toneForDataQuality(percentage, total) {
  if (!total || percentage === null) return "attention";
  if (percentage < STATUS_THRESHOLDS.dataQualityRedBelow) return "attention";
  if (percentage < STATUS_THRESHOLDS.dataQualityYellowBelow) return "expense";
  return "balance";
}

function gapStatus(actual, required, actualAvailable, requiredAvailable, type) {
  if (!actualAvailable || !requiredAvailable) return { severity: "yellow", label: "חסר נתון", diff: null };
  const diff = actual - required;
  if (type === "hours") {
    if (!required) return { severity: "yellow", label: "אין יעד שעות", diff: null };
    const percent = Math.abs(diff) / required * 100;
    if (percent >= STATUS_THRESHOLDS.hoursRedPercent) return { severity: "red", label: diff < 0 ? "חוסר" : "עודף", diff };
    if (percent >= STATUS_THRESHOLDS.hoursYellowPercent) return { severity: "yellow", label: diff < 0 ? "נמוך" : "גבוה", diff };
    return { severity: "green", label: "תואם", diff };
  }
  if (!required) return { severity: "yellow", label: "אין יעד עובדים", diff: null };
  const gap = Math.abs(diff);
  if (gap >= STATUS_THRESHOLDS.employeeRedGap) return { severity: "red", label: diff < 0 ? "חוסר" : "עודף", diff };
  if (gap >= STATUS_THRESHOLDS.employeeYellowGap) return { severity: "yellow", label: diff < 0 ? "נמוך" : "גבוה", diff };
  return { severity: "green", label: "תואם", diff };
}

function capacityStatus(children, capacity, hasChildren, hasCapacity) {
  if (!hasChildren || !hasCapacity) return { severity: "yellow", label: "חסר נתון", diff: null };
  const diff = children - capacity;
  if (diff > 0) return { severity: "red", label: "מעל קיבולת", diff };
  return { severity: "green", label: "בתוך קיבולת", diff };
}

function renderDataFreshness() {
  const banksDate = latestCashDate(dashboardData.allocationRows);
  const payrollMonth = latestMonthValue(dashboardData.payrollGroups);
  const budgetMonth = latestMonthValue(dashboardData.budgetGroups);
  const hasAll = banksDate !== NOT_UPDATED && payrollMonth !== NOT_UPDATED && budgetMonth !== NOT_UPDATED;
  els.freshnessStatusChip.textContent = hasAll ? "נתונים קיימים" : "חסרים נתונים";
  els.freshnessGrid.innerHTML = [
    { label: "תאריך בנק אחרון", value: banksDate, sub: banksDate === NOT_UPDATED ? "אין נתוני בנק" : "לפי תאריך תנועת בנק", tone: banksDate === NOT_UPDATED ? "attention" : "balance" },
    { label: "חודש שכר אחרון", value: payrollMonth, sub: payrollMonth === NOT_UPDATED ? "אין נתוני שכר" : "לפי קבוצות שכר", tone: payrollMonth === NOT_UPDATED ? "attention" : "balance" },
    { label: "חודש תקציב אחרון", value: budgetMonth, sub: budgetMonth === NOT_UPDATED ? "אין נתוני תקציב" : "לפי קבוצות תקציב", tone: budgetMonth === NOT_UPDATED ? "attention" : "balance" },
  ].map((card) => kpiCard(card.label, card.value, card.sub, card.tone)).join("");
}

function renderDataQuality() {
  const quality = allocationQuality();
  const tone = toneForDataQuality(quality.percentage, quality.total);
  els.dataQualityStatusChip.textContent = quality.total ? quality.percentage + "% משויך" : "אין נתוני בנק";
  els.dataQualityGrid.innerHTML = [
    { label: "שורות בנק", value: formatNumber(quality.total, quality.total > 0), sub: quality.total ? "משויכות ולא משויכות" : "אין נתוני בנק", tone: "secondary" },
    { label: "שורות משויכות", value: formatNumber(quality.mapped, quality.total > 0), sub: "עם יחידה וחודש", tone: "balance" },
    { label: "שורות לא משויכות", value: quality.total ? (quality.unmapped ? numberFormatter.format(quality.unmapped) : "אין") : NO_DATA, sub: quality.unmapped ? "חסר יחידה או חודש" : "אין שורות לא משויכות", tone: quality.unmapped ? "attention" : "balance" },
    { label: "איכות נתונים", value: quality.percentage === null ? NO_DATA : quality.percentage + "%", sub: "שורות בנק משויכות", tone },
  ].map((card) => kpiCard(card.label, card.value, card.sub, card.tone)).join("");
}

function comparisonTile(label, actual, target, status, actualAvailable, targetAvailable, unitLabel) {
  const targetText = formatNumber(target, targetAvailable);
  const actualText = formatNumber(actual, actualAvailable);
  const diffText = status.diff === null ? "אין מספיק נתונים" : (status.diff > 0 ? "+" : "") + numberFormatter.format(status.diff) + " " + unitLabel;
  return '<div class="comparison-tile severity-' + status.severity + '"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(actualText) + ' / ' + escapeHtml(targetText) + '</strong><small>' + escapeHtml(status.label + ' | ' + diffText) + '</small></div>';
}

function renderManagementComparisons(unitRows) {
  const daycareRows = unitRows.filter((row) => row.type === "daycare");
  els.comparisonCountLabel.textContent = daycareRows.length ? numberFormatter.format(daycareRows.length) + " מעונות" : NO_DATA;
  if (!daycareRows.length) {
    els.daycareComparisonGrid.innerHTML = '<p class="empty-state">אין נתוני מעונות להשוואה במסננים הנוכחיים.</p>';
    return;
  }
  els.daycareComparisonGrid.innerHTML = daycareRows.map((row) => {
    const cap = capacityStatus(row.children, row.capacity, row.hasChildren, row.hasCapacity);
    const hours = gapStatus(row.payrollHours, row.requiredHours, row.hasPayroll, row.hasRequiredHours, "hours");
    const employees = gapStatus(row.payrollEmployees, row.requiredEmployees, row.hasPayroll, row.hasRequiredEmployees, "employees");
    return '<article class="dashboard-panel daycare-comparison-card"><div class="panel-heading"><h3>' + escapeHtml(row.unit) + '</h3><span>' + escapeHtml(statusLabel(row.status)) + '</span></div><div class="comparison-tile-grid">' +
      comparisonTile("ילדים מול קיבולת", row.children, row.capacity, cap, row.hasChildren, row.hasCapacity, "ילדים") +
      comparisonTile("שעות שכר מול נדרש", row.payrollHours, row.requiredHours, hours, row.hasPayroll, row.hasRequiredHours, "שעות") +
      comparisonTile("עובדים מול נדרש", row.payrollEmployees, row.requiredEmployees, employees, row.hasPayroll, row.hasRequiredEmployees, "עובדים") +
      '</div></article>';
  }).join("");
}

function actionText(issue) {
  if (issue.label.includes("יחידה")) return "לשייך יחידה חסרה";
  if (issue.label.includes("חודש")) return "לשייך חודש חסר";
  if (issue.label.includes("בנק")) return "לבדוק תנועות בנק";
  if (issue.label.includes("שעות")) return "לבדוק שעות שכר";
  if (issue.label.includes("עובדים")) return "לבדוק תקינת עובדים";
  if (issue.label.includes("קיבולת")) return "לעדכן או לבדוק קיבולת";
  return issue.label;
}

function renderActionCenter(issues) {
  const severityRank = { red: 0, yellow: 1, green: 2 };
  const actions = issues
    .filter((issue) => ["data", "operational"].includes(issue.category))
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || String(a.unit).localeCompare(String(b.unit), "he"));
  els.actionCountLabel.textContent = actions.length ? numberFormatter.format(actions.length) + " פעולות" : "אין פעולות פתוחות";
  els.actionList.innerHTML = actions.length ? actions.map((issue) => '<article class="action-row severity-' + issue.severity + '"><span>' + escapeHtml(severityLabel(issue.severity)) + '</span><strong>' + escapeHtml(actionText(issue)) + '</strong><p><b>' + escapeHtml(issue.unit) + '</b><small>' + escapeHtml(issue.month || "כל החודשים") + ' · ' + escapeHtml(numberFormatter.format(issue.count)) + '</small></p></article>').join("") : '<p class="empty-state">אין פעולות ניהול פתוחות במסננים הנוכחיים.</p>';
}

function renderDashboard() {
  const data = filteredData();
  const unitRows = buildUnitRows(data);
  const issues = buildIssues(data, unitRows);
  renderStatus(data, unitRows, issues);
  renderDataFreshness();
  renderDataQuality(data);
  renderSummary(data);
  renderOperations(data, issues);
  renderManagementComparisons(unitRows);
  renderActionCenter(issues);
  renderUnits(unitRows);
  renderIssues(issues);
  renderInsights(data, issues);
  renderTables(data);
}

function renderLoadingState() {
  els.overallStatusLabel.textContent = "נטען";
  els.statusGrid.innerHTML = '<p class="empty-state">לוח הניהול נטען...</p>';
  els.summaryGrid.innerHTML = "";
  els.freshnessGrid.innerHTML = "";
  els.dataQualityGrid.innerHTML = "";
  els.operationalGrid.innerHTML = "";
  els.daycareComparisonGrid.innerHTML = "";
  els.actionList.innerHTML = "";
  els.unitCardGrid.innerHTML = '<p class="empty-state">היחידות נטענות...</p>';
  els.dataIssueList.innerHTML = '<p class="empty-state">החריגות נטענות...</p>';
  els.operationalIssueList.innerHTML = '<p class="empty-state">החריגות נטענות...</p>';
  els.financialIssueList.innerHTML = '<p class="empty-state">החריגות נטענות...</p>';
  els.insightGrid.innerHTML = '<p class="empty-state">התובנות נטענות...</p>';
}

async function loadDashboardData() {
  renderLoadingState();
  const requests = await Promise.allSettled([
    fetchJson("Budget", API_ENDPOINTS.budget),
    fetchJson("Payroll", API_ENDPOINTS.payroll),
    fetchJson("Allocations", API_ENDPOINTS.allocations),
    fetchJson("Employees", API_ENDPOINTS.employees),
  ]);
  dashboardData.errors = [];

  if (requests[0].status === "fulfilled") dashboardData.budgetGroups = normalizeBudget(requests[0].value);
  else { dashboardData.budgetGroups = []; dashboardData.errors.push("אין נתוני תקציב"); }

  if (requests[1].status === "fulfilled") {
    const payroll = normalizePayroll(requests[1].value);
    dashboardData.payrollGroups = payroll.groups;
    dashboardData.payrollRows = payroll.rows;
  } else { dashboardData.payrollGroups = []; dashboardData.payrollRows = []; dashboardData.errors.push("אין נתוני שכר"); }

  if (requests[2].status === "fulfilled") {
    const allocations = normalizeAllocations(requests[2].value);
    dashboardData.allocationGroups = allocations.groups;
    dashboardData.allocationRows = allocations.rows;
    dashboardData.unmappedRows = allocations.unmappedRows;
    dashboardData.excludedAllocationRows = allocations.excludedRows;
  } else { dashboardData.allocationGroups = []; dashboardData.allocationRows = []; dashboardData.unmappedRows = []; dashboardData.excludedAllocationRows = []; dashboardData.errors.push("אין נתוני בנק"); }

  if (requests[3].status === "fulfilled") dashboardData.employees = normalizeEmployees(requests[3].value);
  else { dashboardData.employees = []; dashboardData.errors.push("אין נתוני עובדים"); }

  renderFilterOptions();
  renderDashboard();
}

function bindEvents() {
  els.monthFilter.addEventListener("change", (event) => { state.month = event.target.value; renderDashboard(); });
  els.unitFilter.addEventListener("change", (event) => { state.unit = event.target.value; renderDashboard(); });
  els.unitTypeFilter.addEventListener("change", (event) => { state.unitType = event.target.value; renderDashboard(); });
  els.tableSearch.addEventListener("input", (event) => { state.search = event.target.value.trim(); renderDashboard(); });
  els.expenseSort.addEventListener("change", (event) => { state.expenseSort = event.target.value; renderDashboard(); });
  els.payrollSort.addEventListener("change", (event) => { state.payrollSort = event.target.value; renderDashboard(); });
}

bindEvents();
loadDashboardData();
