const API_ENDPOINTS = {
  budget: "/api/budget",
  payroll: "/api/payroll",
  allocations: "/api/allocations",
};

const moneyFormatter = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat("he-IL");
const state = { month: "all", department: "all", category: "all", search: "", expenseSort: "amount-desc", payrollSort: "cost-desc" };
const dashboardData = {
  budgetGroups: [],
  payrollGroups: [],
  payrollRows: [],
  allocationGroups: [],
  allocationRows: [],
  unmappedRows: [],
  errors: [],
};

const els = {
  monthFilter: document.querySelector("#month-filter"),
  departmentFilter: document.querySelector("#department-filter"),
  categoryFilter: document.querySelector("#category-filter"),
  selectedMonthLabel: document.querySelector("#selected-month-label"),
  cashflowKpiGrid: document.querySelector("#cashflow-kpi-grid"),
  daycareCountLabel: document.querySelector("#daycare-count-label"),
  daycareCardGrid: document.querySelector("#daycare-card-grid"),
  expenseCountLabel: document.querySelector("#expense-count-label"),
  payrollCountLabel: document.querySelector("#payroll-count-label"),
  departmentExpenseChart: document.querySelector("#department-expense-chart"),
  categoryExpenseChart: document.querySelector("#category-expense-chart"),
  detailExpenseChart: document.querySelector("#detail-expense-chart"),
  payrollDaycareChart: document.querySelector("#payroll-daycare-chart"),
  payrollClassChart: document.querySelector("#payroll-class-chart"),
  hoursDaycareChart: document.querySelector("#hours-daycare-chart"),
  executiveAlertGrid: document.querySelector("#executive-alert-grid"),
  warningGrid: document.querySelector("#warning-grid"),
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

function unique(values) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "he"));
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + safeNumber(row[key]), 0);
}

function groupSum(rows, key, valueKey) {
  return rows.reduce((map, row) => {
    const label = safeText(row[key]);
    map[label] = (map[label] || 0) + safeNumber(row[valueKey]);
    return map;
  }, {});
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function option(value, label) {
  const selected = state.month === value || state.department === value || state.category === value ? " selected" : "";
  return '<option value="' + escapeHtml(value) + '"' + selected + '>' + escapeHtml(label) + '</option>';
}

function topEntry(grouped) {
  return Object.entries(grouped).sort((a, b) => b[1] - a[1])[0] || null;
}

function normalizeBudget(payload) {
  const groups = payload?.budget?.byDaycareMonth || payload?.byDaycareMonth || [];
  return Array.isArray(groups) ? groups.map((group) => ({
    daycare: safeText(group.daycare),
    month: safeText(group.month, ""),
    children: safeNumber(group.children),
    requiredStaff: safeNumber(group.requiredStaff),
    requiredEmployeeHeadcount: safeNumber(group.requiredEmployeeHeadcount),
    expectedRevenue: safeNumber(group.expectedRevenue),
    totalBudgetCosts: safeNumber(group.totalBudgetCosts),
    projectedProfit: safeNumber(group.projectedProfit),
  })).filter((group) => group.daycare && group.month) : [];
}

function normalizePayroll(payload) {
  const payroll = payload?.payroll || payload || {};
  const groups = Array.isArray(payload?.byDaycareMonth) ? payload.byDaycareMonth : payroll.byDaycareMonth;
  const rows = Array.isArray(payroll.rows) ? payroll.rows : [];
  return {
    groups: (Array.isArray(groups) ? groups : []).map((group) => ({
      daycare: safeText(group.daycare),
      month: safeText(group.month, ""),
      totalPayrollCost: safeNumber(group.totalPayrollCost ?? group.total),
      totalPayrollHours: safeNumber(group.totalPayrollHours),
      employeeCount: safeNumber(group.employeeCount),
      rowCount: safeNumber(group.rowCount),
      byClass: Array.isArray(group.byClass) ? group.byClass : [],
    })).filter((group) => group.daycare && group.month),
    rows: rows.map((row) => ({
      employee: safeText(row.employee, "Unknown employee"),
      daycare: safeText(row.daycare),
      className: safeText(row.classroom, "Unmapped class"),
      month: safeText(row.month, ""),
      cost: safeNumber(row.totalPayrollCost ?? row.total),
      hours: safeNumber(row.totalPayrollHours),
    })).filter((row) => row.daycare && row.month),
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
      businessMonth: safeText(group.businessMonth, ""),
      debit: safeNumber(group.debit),
      credit: safeNumber(group.credit),
      netCash: safeNumber(group.netCash),
      rowCount: safeNumber(group.rowCount),
    })).filter((group) => group.unit && group.businessMonth),
    rows: (Array.isArray(rows) ? rows : []).map((row) => ({
      reference: safeText(row.reference, ""),
      cashDate: safeText(row.cashDate, ""),
      businessMonth: safeText(row.businessMonth, ""),
      unit: safeText(row.unit),
      debit: safeNumber(row.debit),
      credit: safeNumber(row.credit),
      netCash: safeNumber(row.netCash),
      definition: safeText(row.definition, "Unclassified"),
      accountingStatus: safeText(row.accountingStatus, ""),
      notes: safeText(row.notes, ""),
    })).filter((row) => row.unit && row.businessMonth),
    unmappedRows: Array.isArray(unmappedRows) ? unmappedRows : [],
  };
}

async function fetchJson(name, url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(name + " returned " + response.status);
  return response.json();
}

async function loadDashboardData() {
  renderLoadingState();
  const requests = await Promise.allSettled([
    fetchJson("Budget", API_ENDPOINTS.budget),
    fetchJson("Payroll", API_ENDPOINTS.payroll),
    fetchJson("Allocations", API_ENDPOINTS.allocations),
  ]);

  dashboardData.errors = [];

  if (requests[0].status === "fulfilled") {
    dashboardData.budgetGroups = normalizeBudget(requests[0].value);
  } else {
    dashboardData.budgetGroups = [];
    dashboardData.errors.push("Budget data is unavailable.");
  }

  if (requests[1].status === "fulfilled") {
    const payroll = normalizePayroll(requests[1].value);
    dashboardData.payrollGroups = payroll.groups;
    dashboardData.payrollRows = payroll.rows;
  } else {
    dashboardData.payrollGroups = [];
    dashboardData.payrollRows = [];
    dashboardData.errors.push("Payroll data is unavailable.");
  }

  if (requests[2].status === "fulfilled") {
    const allocations = normalizeAllocations(requests[2].value);
    dashboardData.allocationGroups = allocations.groups;
    dashboardData.allocationRows = allocations.rows;
    dashboardData.unmappedRows = allocations.unmappedRows;
  } else {
    dashboardData.allocationGroups = [];
    dashboardData.allocationRows = [];
    dashboardData.unmappedRows = [];
    dashboardData.errors.push("Allocation data is unavailable.");
  }

  renderFilterOptions();
  renderDashboard();
}

function renderLoadingState() {
  if (els.selectedMonthLabel) els.selectedMonthLabel.textContent = "Loading live data";
  if (els.cashflowKpiGrid) els.cashflowKpiGrid.innerHTML = '<p class="empty-state">Loading dashboard data...</p>';
  if (els.daycareCardGrid) els.daycareCardGrid.innerHTML = '<p class="empty-state">Loading live budget, payroll and allocation data...</p>';
  if (els.executiveAlertGrid) els.executiveAlertGrid.innerHTML = '<p class="empty-state">Loading checks...</p>';
  if (els.warningGrid) els.warningGrid.innerHTML = '<p class="empty-state">Loading data quality status...</p>';
}

function renderFilterOptions() {
  const months = unique([
    ...dashboardData.budgetGroups.map((row) => row.month),
    ...dashboardData.payrollGroups.map((row) => row.month),
    ...dashboardData.allocationGroups.map((row) => row.businessMonth),
  ]);
  const departments = unique([
    ...dashboardData.budgetGroups.map((row) => row.daycare),
    ...dashboardData.payrollGroups.map((row) => row.daycare),
    ...dashboardData.allocationGroups.map((row) => row.unit),
  ]);
  const categories = unique(dashboardData.allocationRows.map((row) => row.definition));

  if (!months.includes(state.month)) state.month = "all";
  if (!departments.includes(state.department)) state.department = "all";
  if (!categories.includes(state.category)) state.category = "all";

  els.monthFilter.innerHTML = '<option value="all">All months</option>' + months.map((month) => option(month, month)).join("");
  els.departmentFilter.innerHTML = '<option value="all">All units</option>' + departments.map((department) => option(department, department)).join("");
  els.categoryFilter.innerHTML = '<option value="all">All allocation definitions</option>' + categories.map((category) => option(category, category)).join("");
  els.monthFilter.value = state.month;
  els.departmentFilter.value = state.department;
  els.categoryFilter.value = state.category;
}

function getFilteredData() {
  const budgetGroups = dashboardData.budgetGroups.filter((row) => (state.month === "all" || row.month === state.month) && (state.department === "all" || row.daycare === state.department));
  const payrollGroups = dashboardData.payrollGroups.filter((row) => (state.month === "all" || row.month === state.month) && (state.department === "all" || row.daycare === state.department));
  const payrollRows = dashboardData.payrollRows.filter((row) => (state.month === "all" || row.month === state.month) && (state.department === "all" || row.daycare === state.department));
  const allocationGroups = dashboardData.allocationGroups.filter((row) => (state.month === "all" || row.businessMonth === state.month) && (state.department === "all" || row.unit === state.department));
  const allocationRows = dashboardData.allocationRows.filter((row) => (state.month === "all" || row.businessMonth === state.month) && (state.department === "all" || row.unit === state.department) && (state.category === "all" || row.definition === state.category));
  return { budgetGroups, payrollGroups, payrollRows, allocationGroups, allocationRows };
}

function getUnitRows(data) {
  const names = unique([
    ...data.budgetGroups.map((row) => row.daycare),
    ...data.payrollGroups.map((row) => row.daycare),
    ...data.allocationGroups.map((row) => row.unit),
  ]);

  return names.map((name) => {
    const budget = data.budgetGroups.filter((row) => row.daycare === name);
    const payroll = data.payrollGroups.filter((row) => row.daycare === name);
    const allocations = data.allocationGroups.filter((row) => row.unit === name);
    const budgetRevenue = sum(budget, "expectedRevenue");
    const budgetCosts = sum(budget, "totalBudgetCosts");
    const allocationIncome = sum(allocations, "credit");
    const allocationOutflow = sum(allocations, "debit");
    const payrollCost = sum(payroll, "totalPayrollCost");
    const payrollHours = sum(payroll, "totalPayrollHours");
    const employeeCount = sum(payroll, "employeeCount");
    const cashNet = allocationIncome - allocationOutflow;
    return { name, budgetRevenue, budgetCosts, allocationIncome, allocationOutflow, payrollCost, payrollHours, employeeCount, cashNet };
  }).sort((a, b) => Math.abs(b.cashNet) - Math.abs(a.cashNet));
}

function renderCashflowKpis(data, unitRows) {
  const budgetRevenue = sum(data.budgetGroups, "expectedRevenue");
  const budgetCosts = sum(data.budgetGroups, "totalBudgetCosts");
  const allocationIncome = sum(data.allocationGroups, "credit");
  const allocationOutflow = sum(data.allocationGroups, "debit");
  const payrollTotal = sum(data.payrollGroups, "totalPayrollCost");
  const payrollHours = sum(data.payrollGroups, "totalPayrollHours");
  const employeeCount = sum(data.payrollGroups, "employeeCount");
  const cashNet = allocationIncome - allocationOutflow;
  const cards = [
    { tone: "income", icon: "B", label: "Budget revenue", value: moneyFormatter.format(budgetRevenue), sub: "From /api/budget by daycare/month" },
    { tone: "expense", icon: "C", label: "Budget costs", value: moneyFormatter.format(budgetCosts), sub: "Calculated budget cost rules" },
    { tone: "income", icon: "I", label: "Allocation income", value: moneyFormatter.format(allocationIncome), sub: "Credits from /api/allocations" },
    { tone: "expense", icon: "O", label: "Allocation outflow", value: moneyFormatter.format(allocationOutflow), sub: "Debits from /api/allocations" },
    { tone: "payroll", icon: "P", label: "Payroll", value: moneyFormatter.format(payrollTotal), sub: "From /api/payroll by daycare/month" },
    { tone: cashNet >= 0 ? "balance" : "attention", icon: "N", label: "Cash net", value: moneyFormatter.format(cashNet), sub: "Allocation credits minus debits" },
    { tone: "secondary", icon: "U", label: "Units", value: numberFormatter.format(unitRows.length), sub: "Units with live data" },
    { tone: "secondary", icon: "H", label: "Payroll hours", value: numberFormatter.format(payrollHours), sub: numberFormatter.format(employeeCount) + " employee entries" },
  ];
  els.cashflowKpiGrid.innerHTML = cards.map((card) => '<article class="kpi-card cashflow-kpi ' + card.tone + '-kpi"><span class="kpi-icon" aria-hidden="true">' + escapeHtml(card.icon) + '</span><div><p>' + escapeHtml(card.label) + '</p><strong>' + escapeHtml(card.value) + '</strong><span>' + escapeHtml(card.sub) + '</span></div></article>').join("");
}

function renderUnitCards(unitRows) {
  els.daycareCountLabel.textContent = numberFormatter.format(unitRows.length) + " units";
  if (!unitRows.length) {
    els.daycareCardGrid.innerHTML = '<p class="empty-state">No budget, payroll or allocation groups match the current filters.</p>';
    return;
  }
  els.daycareCardGrid.innerHTML = unitRows.map((row) => {
    const attention = row.cashNet < 0 || row.budgetRevenue === 0 || row.payrollCost === 0;
    return '<article class="daycare-card financial-status-card ' + (attention ? 'attention-card' : '') + '"><div class="daycare-card-head"><div><h3>' + escapeHtml(row.name) + '</h3><span>' + (attention ? 'Needs review' : 'Live data') + '</span></div><strong>' + escapeHtml(moneyFormatter.format(row.cashNet)) + '</strong></div><div class="daycare-metrics financial-metrics"><div><span>Budget revenue</span><strong>' + escapeHtml(moneyFormatter.format(row.budgetRevenue)) + '</strong></div><div><span>Budget costs</span><strong>' + escapeHtml(moneyFormatter.format(row.budgetCosts)) + '</strong></div><div><span>Alloc. income</span><strong>' + escapeHtml(moneyFormatter.format(row.allocationIncome)) + '</strong></div><div><span>Alloc. outflow</span><strong>' + escapeHtml(moneyFormatter.format(row.allocationOutflow)) + '</strong></div><div><span>Payroll</span><strong>' + escapeHtml(moneyFormatter.format(row.payrollCost)) + '</strong></div><div><span>Employees</span><strong>' + escapeHtml(numberFormatter.format(row.employeeCount)) + '</strong></div></div><div class="budget-note">Cash net is allocation income minus allocation outflow.</div></article>';
  }).join("");
}

function renderBarChart(target, grouped, formatter = moneyFormatter) {
  const rows = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(...rows.map((row) => row[1]), 1);
  target.innerHTML = rows.length ? rows.map(([label, value]) => '<div class="bar-row"><div class="bar-row-text"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(formatter.format(value)) + '</strong></div><div class="bar-track"><span style="width:' + Math.max((value / max) * 100, 4) + '%"></span></div></div>').join("") : '<p class="empty-state">No matching data to show.</p>';
}

function renderExecutiveAlerts(data, unitRows) {
  const alerts = [];
  const budgetLeader = topEntry(groupSum(data.budgetGroups, "daycare", "expectedRevenue"));
  const payrollLeader = topEntry(groupSum(data.payrollGroups, "daycare", "totalPayrollCost"));
  const debitLeader = topEntry(groupSum(data.allocationRows, "unit", "debit"));
  const categoryLeader = topEntry(groupSum(data.allocationRows, "definition", "debit"));
  const lowestCash = [...unitRows].sort((a, b) => a.cashNet - b.cashNet)[0];

  if (lowestCash) alerts.push({ label: "Lowest cash net", title: lowestCash.name, detail: moneyFormatter.format(lowestCash.cashNet) });
  if (budgetLeader) alerts.push({ label: "Largest budget revenue", title: budgetLeader[0], detail: moneyFormatter.format(budgetLeader[1]) });
  if (payrollLeader) alerts.push({ label: "Largest payroll", title: payrollLeader[0], detail: moneyFormatter.format(payrollLeader[1]) });
  if (debitLeader) alerts.push({ label: "Largest allocation outflow", title: debitLeader[0], detail: moneyFormatter.format(debitLeader[1]) });
  if (categoryLeader) alerts.push({ label: "Largest allocation definition", title: categoryLeader[0], detail: moneyFormatter.format(categoryLeader[1]) });
  dashboardData.errors.forEach((message) => alerts.push({ label: "API status", title: "Unavailable", detail: message }));

  els.executiveAlertGrid.innerHTML = alerts.map((alert) => '<article class="executive-alert"><span>' + escapeHtml(alert.label) + '</span><strong>' + escapeHtml(alert.title) + '</strong><p>' + escapeHtml(alert.detail) + '</p></article>').join("") || '<p class="empty-state">No live alerts for the current filters.</p>';
}

function renderWarnings(data) {
  const warnings = [
    { label: "API issues", count: dashboardData.errors.length, detail: "Endpoints that could not be loaded." },
    { label: "Unmapped allocations", count: dashboardData.unmappedRows.length, detail: "Allocation rows missing unit or business month." },
    { label: "Budget groups", count: data.budgetGroups.length, detail: "Daycare/month budget groups loaded." },
    { label: "Payroll groups", count: data.payrollGroups.length, detail: "Daycare/month payroll groups loaded." },
    { label: "Allocation groups", count: data.allocationGroups.length, detail: "Unit/month allocation groups loaded." },
  ];
  els.warningGrid.innerHTML = warnings.map((warning) => '<article class="warning-card ' + (warning.count > 0 && (warning.label === "API issues" || warning.label === "Unmapped allocations") ? "needs-attention" : "") + '"><span>' + escapeHtml(warning.label) + '</span><strong>' + escapeHtml(numberFormatter.format(warning.count)) + '</strong><p>' + escapeHtml(warning.detail) + '</p></article>').join("");
}

function financialRows(allocationRows) {
  const rows = [];
  allocationRows.forEach((row) => {
    if (row.credit) rows.push({ type: "Income", amount: row.credit, category: row.definition, department: row.unit, month: row.businessMonth, details: row.notes || row.reference || row.cashDate });
    if (row.debit) rows.push({ type: "Outflow", amount: row.debit, category: row.definition, department: row.unit, month: row.businessMonth, details: row.notes || row.reference || row.cashDate });
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
  els.financialTableBody.innerHTML = finance.map((row) => '<tr><td>' + escapeHtml(row.type) + '</td><td>' + escapeHtml(moneyFormatter.format(row.amount)) + '</td><td>' + escapeHtml(row.category) + '</td><td>' + escapeHtml(row.department) + '</td><td>' + escapeHtml(row.month) + '</td><td>' + escapeHtml(row.details) + '</td></tr>').join("") || '<tr><td colspan="6">No allocation rows match the current filters.</td></tr>';
  els.payrollTableBody.innerHTML = payroll.map((row) => '<tr><td>' + escapeHtml(row.employee) + '</td><td>' + escapeHtml(row.daycare) + '</td><td>' + escapeHtml(row.className) + '</td><td>' + escapeHtml(numberFormatter.format(row.hours)) + '</td><td>' + escapeHtml(moneyFormatter.format(row.cost)) + '</td></tr>').join("") || '<tr><td colspan="5">No payroll rows match the current filters.</td></tr>';
}

function renderDashboard() {
  const data = getFilteredData();
  const unitRows = getUnitRows(data);
  els.selectedMonthLabel.textContent = state.month === "all" ? "All months" : state.month;
  els.expenseCountLabel.textContent = numberFormatter.format(data.allocationRows.length) + " allocation rows";
  els.payrollCountLabel.textContent = numberFormatter.format(data.payrollRows.length) + " payroll rows";
  renderCashflowKpis(data, unitRows);
  renderUnitCards(unitRows);
  renderBarChart(els.departmentExpenseChart, groupSum(data.allocationRows, "unit", "debit"));
  renderBarChart(els.categoryExpenseChart, groupSum(data.allocationRows, "definition", "debit"));
  renderBarChart(els.detailExpenseChart, groupSum(data.allocationRows, "notes", "debit"));
  renderBarChart(els.payrollDaycareChart, groupSum(data.payrollGroups, "daycare", "totalPayrollCost"));
  const classGroups = data.payrollGroups.flatMap((group) => (group.byClass || []).map((item) => ({ className: item.classroom || "Unmapped class", totalPayrollCost: safeNumber(item.totalPayrollCost) })));
  renderBarChart(els.payrollClassChart, groupSum(classGroups, "className", "totalPayrollCost"));
  renderBarChart(els.hoursDaycareChart, groupSum(data.payrollGroups, "daycare", "totalPayrollHours"), numberFormatter);
  renderExecutiveAlerts(data, unitRows);
  renderWarnings(data);
  renderTables(data);
}

function bindEvents() {
  els.monthFilter.addEventListener("change", (event) => { state.month = event.target.value; renderDashboard(); });
  els.departmentFilter.addEventListener("change", (event) => { state.department = event.target.value; renderDashboard(); });
  els.categoryFilter.addEventListener("change", (event) => { state.category = event.target.value; renderDashboard(); });
  els.tableSearch.addEventListener("input", (event) => { state.search = event.target.value.trim(); renderDashboard(); });
  els.expenseSort.addEventListener("change", (event) => { state.expenseSort = event.target.value; renderDashboard(); });
  els.payrollSort.addEventListener("change", (event) => { state.payrollSort = event.target.value; renderDashboard(); });
}

bindEvents();
loadDashboardData();
