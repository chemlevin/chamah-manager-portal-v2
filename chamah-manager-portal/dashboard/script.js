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

const moneyFormatter = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat("he-IL");
const state = { month: "all", unit: "all", unitType: "all", search: "", expenseSort: "amount-desc", payrollSort: "cost-desc" };
const dashboardData = { budgetGroups: [], payrollGroups: [], payrollRows: [], allocationGroups: [], allocationRows: [], unmappedRows: [], employees: [], errors: [] };

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

function safeText(value, fallback = "Unmapped") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function unique(values) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "he"));
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + safeNumber(row[key]), 0);
}

function option(value, label) {
  return '<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + '</option>';
}

async function fetchJson(name, url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(name + " returned " + response.status);
  return response.json();
}

function normalizeBudget(payload) {
  const groups = payload?.budget?.byDaycareMonth || payload?.byDaycareMonth || [];
  return (Array.isArray(groups) ? groups : []).map((group) => ({
    unit: safeText(group.daycare),
    month: safeText(group.month, ""),
    children: safeNumber(group.children),
    capacity: safeNumber(group.capacity ?? group.childCapacity ?? group.childrenCapacity ?? group.maxChildren),
    requiredHours: safeNumber(group.requiredHours || group.totalRequiredHours),
    requiredEmployees: safeNumber(group.requiredEmployeeHeadcount),
    requiredStaff: safeNumber(group.requiredStaff),
    budgetRevenue: safeNumber(group.expectedRevenue),
    budgetCosts: safeNumber(group.totalBudgetCosts),
  })).filter((group) => group.unit && group.month);
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
      employee: safeText(row.employee, "Unknown employee"),
      unit: safeText(row.daycare),
      className: safeText(row.classroom, "Unmapped class"),
      month: safeText(row.month, ""),
      cost: safeNumber(row.totalPayrollCost ?? row.total),
      hours: safeNumber(row.totalPayrollHours),
    })).filter((row) => row.unit && row.month),
  };
}

function normalizeAllocations(payload) {
  const allocations = payload?.allocations || payload || {};
  const groups = Array.isArray(payload?.byUnitMonth) ? payload.byUnitMonth : allocations.byUnitMonth;
  const rows = Array.isArray(payload?.rows) ? payload.rows : allocations.rows;
  const unmappedRows = Array.isArray(payload?.unmappedRows) ? payload.unmappedRows : allocations.unmappedRows;
  return {
    groups: (Array.isArray(groups) ? groups : []).map((group) => ({
      unit: safeText(group.unit),
      month: safeText(group.businessMonth, ""),
      expenses: safeNumber(group.debit),
      income: safeNumber(group.credit),
      rowCount: safeNumber(group.rowCount),
    })).filter((group) => group.unit && group.month),
    rows: (Array.isArray(rows) ? rows : []).map((row) => ({
      reference: safeText(row.reference, ""),
      cashDate: safeText(row.cashDate, ""),
      month: safeText(row.businessMonth, ""),
      unit: safeText(row.unit),
      debit: safeNumber(row.debit),
      credit: safeNumber(row.credit),
      definition: safeText(row.definition, "Unclassified"),
      notes: safeText(row.notes, ""),
    })).filter((row) => row.unit && row.month),
    unmappedRows: Array.isArray(unmappedRows) ? unmappedRows : [],
  };
}

function normalizeEmployees(payload) {
  return Array.isArray(payload?.employees) ? payload.employees : [];
}

function parseDateValue(value) {
  const text = String(value || "").trim();
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
  return dates[0] ? dates[0].toLocaleDateString("he-IL") : "No bank date";
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
      children: sum(budget, "children"),
      capacity: sum(budget, "capacity"),
      requiredHours: sum(budget, "requiredHours"),
      payrollHours: sum(payroll, "payrollHours"),
      requiredEmployees: sum(budget, "requiredEmployees"),
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
  dashboardData.errors.forEach((message) => issues.push({ category: "data", severity: "red", unit: "System", month: state.month, count: 1, label: message }));
  const missingUnitRows = dashboardData.unmappedRows.filter((row) => String(row.unmappedReason || "").includes("unit"));
  const missingMonthRows = dashboardData.unmappedRows.filter((row) => String(row.unmappedReason || "").includes("businessMonth"));
  if (missingUnitRows.length) issues.push({ category: "data", severity: "red", unit: "Unmapped", month: "All", count: missingUnitRows.length, label: "Missing unit" });
  if (missingMonthRows.length) issues.push({ category: "data", severity: "red", unit: "Unmapped", month: "All", count: missingMonthRows.length, label: "Missing month" });
  if (dashboardData.unmappedRows.length) issues.push({ category: "data", severity: "yellow", unit: "Unmapped", month: "All", count: dashboardData.unmappedRows.length, label: "Rows missing unit or month" });
  const missingRefs = data.allocationRows.filter((row) => !row.reference).length;
  if (missingRefs) issues.push({ category: "data", severity: "yellow", unit: "Multiple", month: state.month, count: missingRefs, label: "Missing references" });

  unitRows.forEach((row) => {
    const hoursDiff = row.payrollHours - row.requiredHours;
    const employeeDiff = row.payrollEmployees - row.requiredEmployees;
    if (row.type === "daycare" && !row.capacity && row.children > 0) issues.push({ category: "operational", severity: "yellow", unit: row.unit, month: state.month, count: 1, label: "Capacity missing" });
    if (row.type === "daycare" && row.capacity > 0 && row.children > row.capacity) issues.push({ category: "operational", severity: "red", unit: row.unit, month: state.month, count: row.children - row.capacity, label: "Children over capacity" });
    if (row.requiredHours > 0 && hoursDiff < 0) issues.push({ category: "operational", severity: "red", unit: row.unit, month: state.month, count: Math.abs(Math.round(hoursDiff)), label: "Payroll hours below required hours" });
    if (row.requiredHours > 0 && hoursDiff > 0) issues.push({ category: "operational", severity: "yellow", unit: row.unit, month: state.month, count: Math.round(hoursDiff), label: "Payroll hours above required hours" });
    if (row.requiredEmployees > 0 && employeeDiff < 0) issues.push({ category: "operational", severity: "red", unit: row.unit, month: state.month, count: Math.abs(Math.round(employeeDiff)), label: "Employee count below required" });
    if (row.requiredEmployees > 0 && employeeDiff > 0) issues.push({ category: "operational", severity: "yellow", unit: row.unit, month: state.month, count: Math.round(employeeDiff), label: "Employee count above required" });
    if (row.children === 0 && (row.requiredHours > 0 || row.payrollCost > 0)) issues.push({ category: "operational", severity: "yellow", unit: row.unit, month: state.month, count: 1, label: "Child count missing for active unit" });
    if ((row.budgetRevenue > 0 || row.payrollCost > 0) && row.expenses === 0 && row.income === 0) issues.push({ category: "financial", severity: "yellow", unit: row.unit, month: state.month, count: 1, label: "No allocations found" });
    if (row.expenses > 0 && row.type === "other") issues.push({ category: "financial", severity: "yellow", unit: row.unit, month: state.month, count: 1, label: "Non-daycare expenses require review" });
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
  return status === "red" ? "Needs action" : status === "yellow" ? "Review needed" : "Healthy";
}

function renderFilterOptions() {
  const months = unique([...dashboardData.budgetGroups.map((row) => row.month), ...dashboardData.payrollGroups.map((row) => row.month), ...dashboardData.allocationGroups.map((row) => row.month)]);
  const units = unique([...dashboardData.budgetGroups.map((row) => row.unit), ...dashboardData.payrollGroups.map((row) => row.unit), ...dashboardData.allocationGroups.map((row) => row.unit)]);
  if (!months.includes(state.month)) state.month = "all";
  if (!units.includes(state.unit)) state.unit = "all";
  els.monthFilter.innerHTML = option("all", "All months") + months.map((month) => option(month, month)).join("");
  els.unitFilter.innerHTML = option("all", "All units") + units.map((unit) => option(unit, unit)).join("");
  els.unitTypeFilter.innerHTML = option("all", "All types") + option("daycare", "Daycare") + option("other", "Other / unclassified");
  els.monthFilter.value = state.month;
  els.unitFilter.value = state.unit;
  els.unitTypeFilter.value = state.unitType;
}

function kpiCard(label, value, sub, tone = "secondary") {
  return '<article class="kpi-card cashflow-kpi ' + tone + '-kpi"><span class="kpi-icon" aria-hidden="true">' + escapeHtml(label.slice(0, 1)) + '</span><div><p>' + escapeHtml(label) + '</p><strong>' + escapeHtml(value) + '</strong><span>' + escapeHtml(sub) + '</span></div></article>';
}

function renderStatus(data, unitRows, issues) {
  const status = statusFromIssues(issues);
  els.overallStatusLabel.textContent = statusLabel(status);
  els.overallStatusLabel.className = "status-pill " + status;
  els.lastUpdateLabel.textContent = "Last bank update: " + latestCashDate(dashboardData.allocationRows);
  els.selectedMonthLabel.textContent = state.month === "all" ? "All months" : state.month;
  const cards = [
    { label: "Selected month", value: state.month === "all" ? "All" : state.month, sub: "Current management view", tone: "secondary" },
    { label: "Last update", value: latestCashDate(dashboardData.allocationRows), sub: "Latest bank movement date", tone: "secondary" },
    { label: "Active units", value: numberFormatter.format(unitRows.length), sub: "Units in current filters", tone: "income" },
    { label: "Open issues", value: numberFormatter.format(issues.length), sub: "Data, operations and finance", tone: issues.length ? "attention" : "balance" },
    { label: "Status", value: statusLabel(status), sub: "Based on current open issues", tone: status === "red" ? "attention" : status === "yellow" ? "expense" : "balance" },
  ];
  els.statusGrid.innerHTML = cards.map((card) => kpiCard(card.label, card.value, card.sub, card.tone)).join("");
}

function renderSummary(data) {
  const employeeCount = dashboardData.employees.length || sum(data.payrollGroups, "employeeCount");
  const cards = [
    { label: "Budget revenue", value: moneyFormatter.format(sum(data.budgetGroups, "budgetRevenue")), sub: "Budget by daycare and month", tone: "income" },
    { label: "Payroll costs", value: moneyFormatter.format(sum(data.payrollGroups, "payrollCost")), sub: "Payroll by daycare and month", tone: "payroll" },
    { label: "Allocation expenses", value: moneyFormatter.format(sum(data.allocationGroups, "expenses")), sub: "Bank debit allocations", tone: "expense" },
    { label: "Allocation income", value: moneyFormatter.format(sum(data.allocationGroups, "income")), sub: "Bank credit allocations", tone: "income" },
    { label: "Employees", value: numberFormatter.format(employeeCount), sub: dashboardData.employees.length ? "Employees API" : "Payroll groups", tone: "secondary" },
    { label: "Children", value: numberFormatter.format(sum(data.budgetGroups, "children")), sub: "Budget children count", tone: "secondary" },
  ];
  els.summaryGrid.innerHTML = cards.map((card) => kpiCard(card.label, card.value, card.sub, card.tone)).join("");
}

function comparisonCard(label, actual, expected, unitLabel) {
  const diff = safeNumber(actual) - safeNumber(expected);
  const diffText = diff === 0 ? "No difference" : (diff > 0 ? "+" : "") + numberFormatter.format(diff) + " " + unitLabel;
  return '<article class="dashboard-panel comparison-card"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(numberFormatter.format(actual)) + ' / ' + escapeHtml(numberFormatter.format(expected)) + '</strong><p>' + escapeHtml(diffText) + '</p></article>';
}

function renderOperations(data, issues) {
  const children = sum(data.budgetGroups, "children");
  const requiredHours = sum(data.budgetGroups, "requiredHours");
  const payrollHours = sum(data.payrollGroups, "payrollHours");
  const requiredEmployees = sum(data.budgetGroups, "requiredEmployees");
  const payrollEmployees = sum(data.payrollGroups, "employeeCount");
  const operationalIssues = issues.filter((issue) => issue.category === "operational");
  els.operationalStatusChip.textContent = operationalIssues.length ? numberFormatter.format(operationalIssues.length) + " items" : "No open items";
  els.operationalGrid.innerHTML = [
    comparisonCard("Children counted", children, children, "children"),
    comparisonCard("Payroll hours vs required", payrollHours, requiredHours, "hours"),
    comparisonCard("Employees vs required", payrollEmployees, requiredEmployees, "employees"),
  ].join("");
}

function renderUnits(unitRows) {
  els.unitCountLabel.textContent = numberFormatter.format(unitRows.length) + " units";
  if (!unitRows.length) {
    els.unitCardGrid.innerHTML = '<p class="empty-state">No units match the current filters.</p>';
    return;
  }
  els.unitCardGrid.innerHTML = unitRows.map((row) => '<article class="daycare-card management-unit-card status-' + row.status + '"><div class="daycare-card-head"><div><h3>' + escapeHtml(row.unit) + '</h3><span>' + escapeHtml(row.type) + ' / ' + escapeHtml(statusLabel(row.status)) + '</span></div><strong>' + escapeHtml(numberFormatter.format(row.issueCount)) + '</strong></div><div class="daycare-metrics financial-metrics"><div><span>Children</span><strong>' + escapeHtml(numberFormatter.format(row.children)) + '</strong></div><div><span>Payroll</span><strong>' + escapeHtml(moneyFormatter.format(row.payrollCost)) + '</strong></div><div><span>Expenses</span><strong>' + escapeHtml(moneyFormatter.format(row.expenses)) + '</strong></div><div><span>Hours</span><strong>' + escapeHtml(numberFormatter.format(row.payrollHours)) + '</strong></div><div><span>Employees</span><strong>' + escapeHtml(numberFormatter.format(row.payrollEmployees)) + '</strong></div><div><span>Required</span><strong>' + escapeHtml(numberFormatter.format(row.requiredEmployees)) + '</strong></div></div><div class="budget-note">Prepared for future alerts and comparisons.</div></article>').join("");
}

function renderIssueList(target, countTarget, issues) {
  countTarget.textContent = numberFormatter.format(issues.length);
  target.innerHTML = issues.length ? issues.map((issue) => '<article class="issue-row severity-' + issue.severity + '"><span>' + escapeHtml(issue.severity) + '</span><strong>' + escapeHtml(issue.label) + '</strong><p>' + escapeHtml(issue.unit) + ' | ' + escapeHtml(issue.month || "All") + ' | ' + escapeHtml(numberFormatter.format(issue.count)) + '</p></article>').join("") : '<p class="empty-state">No issues in this category.</p>';
}

function renderIssues(issues) {
  const dataIssues = issues.filter((issue) => issue.category === "data");
  const operationalIssues = issues.filter((issue) => issue.category === "operational");
  const financialIssues = issues.filter((issue) => issue.category === "financial");
  els.issueCountLabel.textContent = numberFormatter.format(issues.length) + " open issues";
  renderIssueList(els.dataIssueList, els.dataIssueCount, dataIssues);
  renderIssueList(els.operationalIssueList, els.operationalIssueCount, operationalIssues);
  renderIssueList(els.financialIssueList, els.financialIssueCount, financialIssues);
}

function renderInsights(data, issues) {
  const insights = [];
  const requiredHours = sum(data.budgetGroups, "requiredHours");
  const payrollHours = sum(data.payrollGroups, "payrollHours");
  const requiredEmployees = sum(data.budgetGroups, "requiredEmployees");
  const payrollEmployees = sum(data.payrollGroups, "employeeCount");
  if (requiredHours > 0 && payrollHours > requiredHours) insights.push(["Payroll hours exceed required hours", numberFormatter.format(payrollHours - requiredHours) + " hours above required"]);
  if (requiredHours > 0 && payrollHours < requiredHours) insights.push(["Payroll hours below required hours", numberFormatter.format(requiredHours - payrollHours) + " hours missing"]);
  if (requiredEmployees > 0 && payrollEmployees > requiredEmployees) insights.push(["Staffing exceeds requirement", numberFormatter.format(payrollEmployees - requiredEmployees) + " employees above required"]);
  if (requiredEmployees > 0 && payrollEmployees < requiredEmployees) insights.push(["Staffing below requirement", numberFormatter.format(requiredEmployees - payrollEmployees) + " employees missing"]);
  if (dashboardData.unmappedRows.length) insights.push(["Missing allocations detected", numberFormatter.format(dashboardData.unmappedRows.length) + " rows need unit or month"]);
  if (!insights.length && issues.length) insights.push(["Open issues require review", numberFormatter.format(issues.length) + " items are listed in the issues center."]);
  if (!insights.length && !issues.length) insights.push(["No immediate action detected", "Current filters show no open issues."]);
  els.insightGrid.innerHTML = insights.map(([title, detail]) => '<article class="executive-alert"><span>Insight</span><strong>' + escapeHtml(title) + '</strong><p>' + escapeHtml(detail) + '</p></article>').join("");
}

function financialRows(allocationRows) {
  const rows = [];
  allocationRows.forEach((row) => {
    if (row.credit) rows.push({ type: "Income", amount: row.credit, category: row.definition, unit: row.unit, month: row.month, details: row.notes || row.reference || row.cashDate });
    if (row.debit) rows.push({ type: "Expense", amount: row.debit, category: row.definition, unit: row.unit, month: row.month, details: row.notes || row.reference || row.cashDate });
  });
  return rows;
}

function matchesSearch(row) {
  return !state.search || Object.values(row).join(" ").toLowerCase().includes(state.search.toLowerCase());
}

function sortedFinancial(rows) {
  return [...rows].filter(matchesSearch).sort((a, b) => {
    if (state.expenseSort === "amount-asc") return a.amount - b.amount;
    if (state.expenseSort === "month-desc") return String(b.month).localeCompare(String(a.month));
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
  els.financialTableCount.textContent = numberFormatter.format(finance.length) + " rows";
  els.payrollTableCount.textContent = numberFormatter.format(payroll.length) + " rows";
  els.financialTableBody.innerHTML = finance.map((row) => '<tr><td>' + escapeHtml(row.type) + '</td><td>' + escapeHtml(moneyFormatter.format(row.amount)) + '</td><td>' + escapeHtml(row.category) + '</td><td>' + escapeHtml(row.unit) + '</td><td>' + escapeHtml(row.month) + '</td><td>' + escapeHtml(row.details) + '</td></tr>').join("") || '<tr><td colspan="6">No bank movement rows match the current filters.</td></tr>';
  els.payrollTableBody.innerHTML = payroll.map((row) => '<tr><td>' + escapeHtml(row.employee) + '</td><td>' + escapeHtml(row.unit) + '</td><td>' + escapeHtml(row.className) + '</td><td>' + escapeHtml(numberFormatter.format(row.hours)) + '</td><td>' + escapeHtml(moneyFormatter.format(row.cost)) + '</td></tr>').join("") || '<tr><td colspan="5">No payroll rows match the current filters.</td></tr>';
}


function latestMonthValue(rows, key = "month") {
  const values = unique(rows.map((row) => row[key]));
  if (!values.length) return "No data";
  return values.sort((a, b) => {
    const aNum = Number(a);
    const bNum = Number(b);
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) return bNum - aNum;
    return String(b).localeCompare(String(a), "he", { numeric: true });
  })[0];
}

function allocationQuality(data) {
  const mapped = dashboardData.allocationRows.length;
  const unmapped = dashboardData.unmappedRows.length;
  const total = mapped + unmapped;
  const percentage = total ? Math.round((mapped / total) * 100) : 0;
  return { total, mapped, unmapped, percentage };
}

function toneForDataQuality(percentage, total) {
  if (!total) return "attention";
  if (percentage < STATUS_THRESHOLDS.dataQualityRedBelow) return "attention";
  if (percentage < STATUS_THRESHOLDS.dataQualityYellowBelow) return "expense";
  return "balance";
}

function gapStatus(actual, required, type) {
  if (!required) return { severity: "yellow", label: "Missing target", diff: 0 };
  const diff = actual - required;
  if (type === "hours") {
    const percent = Math.abs(diff) / required * 100;
    if (percent >= STATUS_THRESHOLDS.hoursRedPercent) return { severity: "red", label: diff < 0 ? "Shortage" : "Excess", diff };
    if (percent >= STATUS_THRESHOLDS.hoursYellowPercent) return { severity: "yellow", label: diff < 0 ? "Low" : "High", diff };
    return { severity: "green", label: "Aligned", diff };
  }
  const gap = Math.abs(diff);
  if (gap >= STATUS_THRESHOLDS.employeeRedGap) return { severity: "red", label: diff < 0 ? "Shortage" : "Excess", diff };
  if (gap >= STATUS_THRESHOLDS.employeeYellowGap) return { severity: "yellow", label: diff < 0 ? "Low" : "High", diff };
  return { severity: "green", label: "Aligned", diff };
}

function capacityStatus(children, capacity) {
  if (!capacity) return { severity: "yellow", label: "Capacity missing", diff: 0 };
  const diff = children - capacity;
  if (diff > 0) return { severity: "red", label: "Over capacity", diff };
  return { severity: "green", label: "Within capacity", diff };
}

function renderDataFreshness() {
  const banksDate = latestCashDate(dashboardData.allocationRows);
  const payrollMonth = latestMonthValue(dashboardData.payrollGroups);
  const budgetMonth = latestMonthValue(dashboardData.budgetGroups);
  const hasAll = banksDate !== "No bank date" && payrollMonth !== "No data" && budgetMonth !== "No data";
  els.freshnessStatusChip.textContent = hasAll ? "Current data loaded" : "Missing data";
  els.freshnessGrid.innerHTML = [
    { label: "Last BANKS date", value: banksDate, sub: "Latest bank movement date", tone: banksDate === "No bank date" ? "attention" : "balance" },
    { label: "Last PAYROLL month", value: payrollMonth, sub: "Latest payroll group month", tone: payrollMonth === "No data" ? "attention" : "balance" },
    { label: "Last BUDGET month", value: budgetMonth, sub: "Latest budget group month", tone: budgetMonth === "No data" ? "attention" : "balance" },
  ].map((card) => kpiCard(card.label, card.value, card.sub, card.tone)).join("");
}

function renderDataQuality(data) {
  const quality = allocationQuality(data);
  const tone = toneForDataQuality(quality.percentage, quality.total);
  els.dataQualityStatusChip.textContent = quality.total ? quality.percentage + "% mapped" : "No allocation rows";
  els.dataQualityGrid.innerHTML = [
    { label: "Allocation rows", value: numberFormatter.format(quality.total), sub: "Mapped plus unmapped", tone: "secondary" },
    { label: "Mapped rows", value: numberFormatter.format(quality.mapped), sub: "Rows with unit and month", tone: "balance" },
    { label: "Unmapped rows", value: numberFormatter.format(quality.unmapped), sub: "Rows missing unit or month", tone: quality.unmapped ? "attention" : "balance" },
    { label: "Data quality", value: quality.percentage + "%", sub: "Mapped allocation rows", tone },
  ].map((card) => kpiCard(card.label, card.value, card.sub, card.tone)).join("");
}

function comparisonTile(label, actual, target, status, unitLabel) {
  const targetText = target ? numberFormatter.format(target) : "Missing";
  const diffText = target ? ((status.diff > 0 ? "+" : "") + numberFormatter.format(status.diff) + " " + unitLabel) : "Target not configured";
  return '<div class="comparison-tile severity-' + status.severity + '"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(numberFormatter.format(actual)) + ' / ' + escapeHtml(targetText) + '</strong><small>' + escapeHtml(status.label + ' | ' + diffText) + '</small></div>';
}

function renderManagementComparisons(unitRows) {
  const daycareRows = unitRows.filter((row) => row.type === "daycare");
  els.comparisonCountLabel.textContent = numberFormatter.format(daycareRows.length) + " daycares";
  if (!daycareRows.length) {
    els.daycareComparisonGrid.innerHTML = '<p class="empty-state">No daycare comparison data matches the current filters.</p>';
    return;
  }
  els.daycareComparisonGrid.innerHTML = daycareRows.map((row) => {
    const cap = capacityStatus(row.children, row.capacity);
    const hours = gapStatus(row.payrollHours, row.requiredHours, "hours");
    const employees = gapStatus(row.payrollEmployees, row.requiredEmployees, "employees");
    return '<article class="dashboard-panel daycare-comparison-card"><div class="panel-heading"><h3>' + escapeHtml(row.unit) + '</h3><span>' + escapeHtml(statusLabel(row.status)) + '</span></div><div class="comparison-tile-grid">' +
      comparisonTile("Children vs capacity", row.children, row.capacity, cap, "children") +
      comparisonTile("Payroll hours", row.payrollHours, row.requiredHours, hours, "hours") +
      comparisonTile("Employees", row.payrollEmployees, row.requiredEmployees, employees, "employees") +
      '</div></article>';
  }).join("");
}

function actionText(issue) {
  if (issue.label.includes("Missing unit")) return "Assign missing unit";
  if (issue.label.includes("Missing month")) return "Assign missing month";
  if (issue.label.includes("Rows missing")) return "Map unmapped transactions";
  if (issue.label.includes("hours")) return "Review staffing hours";
  if (issue.label.includes("Employee")) return "Review employee staffing";
  if (issue.label.includes("Capacity")) return "Add or review capacity";
  return issue.label;
}

function renderActionCenter(issues) {
  const actions = issues.filter((issue) => ["data", "operational"].includes(issue.category));
  els.actionCountLabel.textContent = numberFormatter.format(actions.length) + " actions";
  els.actionList.innerHTML = actions.length ? actions.map((issue) => '<article class="action-row severity-' + issue.severity + '"><span>' + escapeHtml(issue.severity) + '</span><strong>' + escapeHtml(actionText(issue)) + '</strong><p>' + escapeHtml(issue.unit) + ' | ' + escapeHtml(issue.month || "All") + ' | ' + escapeHtml(numberFormatter.format(issue.count)) + '</p></article>').join("") : '<p class="empty-state">No management actions in the current filters.</p>';
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
  els.statusGrid.innerHTML = '<p class="empty-state">Loading management dashboard...</p>';
  els.summaryGrid.innerHTML = '';
  els.freshnessGrid.innerHTML = '';
  els.dataQualityGrid.innerHTML = '';
  els.operationalGrid.innerHTML = '';
  els.daycareComparisonGrid.innerHTML = '';
  els.actionList.innerHTML = '';
  els.unitCardGrid.innerHTML = '<p class="empty-state">Loading units...</p>';
  els.dataIssueList.innerHTML = '<p class="empty-state">Loading issues...</p>';
  els.operationalIssueList.innerHTML = '<p class="empty-state">Loading issues...</p>';
  els.financialIssueList.innerHTML = '<p class="empty-state">Loading issues...</p>';
  els.insightGrid.innerHTML = '<p class="empty-state">Loading insights...</p>';
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
  else { dashboardData.budgetGroups = []; dashboardData.errors.push("Budget data unavailable"); }

  if (requests[1].status === "fulfilled") {
    const payroll = normalizePayroll(requests[1].value);
    dashboardData.payrollGroups = payroll.groups;
    dashboardData.payrollRows = payroll.rows;
  } else { dashboardData.payrollGroups = []; dashboardData.payrollRows = []; dashboardData.errors.push("Payroll data unavailable"); }

  if (requests[2].status === "fulfilled") {
    const allocations = normalizeAllocations(requests[2].value);
    dashboardData.allocationGroups = allocations.groups;
    dashboardData.allocationRows = allocations.rows;
    dashboardData.unmappedRows = allocations.unmappedRows;
  } else { dashboardData.allocationGroups = []; dashboardData.allocationRows = []; dashboardData.unmappedRows = []; dashboardData.errors.push("Allocation data unavailable"); }

  if (requests[3].status === "fulfilled") dashboardData.employees = normalizeEmployees(requests[3].value);
  else { dashboardData.employees = []; dashboardData.errors.push("Employee data unavailable"); }

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











