const API_ENDPOINTS = {
  budget: "/api/budget",
  payroll: "/api/payroll",
  allocations: "/api/allocations",
  employees: "/api/employees",
};

const STATUS_THRESHOLDS = {
  dataQualityRedBelow: 90,
  dataQualityYellowBelow: 98,
  hoursCoverageGreenAt: 95,
  hoursCoverageYellowAt: 75,
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
const state = { months: ["all"], units: ["all"], unitType: "all", category: "all", search: "", expenseSort: "amount-desc", payrollSort: "cost-desc" };
const dashboardData = { budgetGroups: [], payrollGroups: [], payrollRows: [], allocationGroups: [], allocationRows: [], unmappedRows: [], excludedAllocationRows: [], employees: [], errors: [] };

const els = {
  monthFilter: document.querySelector("#month-filter"),
  unitFilter: document.querySelector("#unit-filter"),
  monthPillList: document.querySelector("#month-pill-list"),
  unitPillList: document.querySelector("#unit-pill-list"),
  monthFilterSummary: document.querySelector("#month-filter-summary"),
  unitFilterSummary: document.querySelector("#unit-filter-summary"),
  unitTypeFilter: document.querySelector("#unit-type-filter"),
  currentPeriodLabel: document.querySelector("#current-period-label"),
  currentPeriodGrid: document.querySelector("#current-period-grid"),
  schoolYearGrid: document.querySelector("#school-year-grid"),
  bankControlLabel: document.querySelector("#bank-control-label"),
  bankControlGrid: document.querySelector("#bank-control-grid"),
  budgetCategoryLabel: document.querySelector("#budget-category-label"),
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
  categoryFilter: document.querySelector("#category-filter"),
  financialExceptionCountLabel: document.querySelector("#financial-exception-count-label"),
  financialExceptionGrid: document.querySelector("#financial-exception-grid"),
  budgetExplorerGrid: document.querySelector("#budget-explorer-grid"),
  explainOverlay: document.querySelector("#explain-overlay"),
  explainTitle: document.querySelector("#explain-title"),
  explainValue: document.querySelector("#explain-value"),
  explainScope: document.querySelector("#explain-scope"),
  explainSource: document.querySelector("#explain-source"),
  explainTotal: document.querySelector("#explain-total"),
  explainRule: document.querySelector("#explain-rule"),
  explainText: document.querySelector("#explain-text"),
  showSourceRows: document.querySelector("#show-source-rows"),
  copyExplainSummary: document.querySelector("#copy-explain-summary"),
  exportExplainCsv: document.querySelector("#export-explain-csv"),
  sourceDrawer: document.querySelector("#source-drawer"),
  sourceDrawerTitle: document.querySelector("#source-drawer-title"),
  sourceDrawerMeta: document.querySelector("#source-drawer-meta"),
  sourceTableHead: document.querySelector("#source-table-head"),
  sourceTableBody: document.querySelector("#source-table-body"),
  copySourceTable: document.querySelector("#copy-source-table"),
  exportSourceCsv: document.querySelector("#export-source-csv"),
  financialTableBody: document.querySelector("#financial-table-body"),
  payrollTableBody: document.querySelector("#payroll-table-body"),
  financialTableCount: document.querySelector("#financial-table-count"),
  payrollTableCount: document.querySelector("#payroll-table-count"),
};

let currentExplanation = null;

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

function coveragePercent(actual, required) {
  const target = safeNumber(required);
  if (target <= 0) return null;
  return safeNumber(actual) / target * 100;
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

function formatPercent(value, available = true) {
  return available && value !== null ? Math.round(safeNumber(value)) + "%" : NO_DATA;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function rowsToCsv(explanation) {
  const lines = [
    ["metric", explanation.title],
    ["scope", explanation.scope],
    ["source", explanation.source],
    ["rule", explanation.rule],
    ["generated", new Date().toISOString()],
    ["total", explanation.total],
    [],
    explanation.exportColumns.map((column) => column.label),
    ...explanation.rows.map((row) => explanation.exportColumns.map((column) => row[column.key] ?? "")),
  ];
  return lines.map((line) => line.map(csvEscape).join(",")).join("\n");
}

function downloadCsv(explanation) {
  const blob = new Blob([rowsToCsv(explanation)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = explanation.filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function scopeLabel() {
  return selectedUnitsLabel() + " · " + selectedMonthsLabel();
}

function filenamePart(value) {
  return String(value || "all").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase() || "all";
}

function exportFilename(metricId) {
  return [metricId, filenamePart(selectedUnitsLabel()), filenamePart(selectedMonthsLabel())].join("_") + ".csv";
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

function isBankSalaryRow(row) {
  return clean(row.definition).includes("שכר") || accountingCategory(row).includes("שכר");
}

function normalizeBudget(payload) {
  const groups = payload?.budget?.byDaycareMonth || payload?.byDaycareMonth || [];
  return (Array.isArray(groups) ? groups : []).map((group) => {
    const capacityValue = group.capacity ?? group.childCapacity ?? group.childrenCapacity ?? group.maxChildren;
    const calculatedCosts = Array.isArray(group.calculatedCosts) ? group.calculatedCosts : [];
    return {
      unit: safeText(group.daycare),
      month: safeText(group.month, ""),
      children: safeNumber(group.children),
      hasChildren: valueExists(group.children),
      capacity: valueExists(capacityValue) ? safeNumber(capacityValue) : null,
      hasCapacity: valueExists(capacityValue),
      requiredHours: safeNumber(group.requiredHours),
      hasRequiredHours: valueExists(group.requiredHours),
      requiredEmployees: safeNumber(group.requiredEmployeeHeadcount),
      hasRequiredEmployees: valueExists(group.requiredEmployeeHeadcount),
      requiredStaff: safeNumber(group.requiredStaff),
      budgetRevenue: safeNumber(group.expectedRevenue),
      hasBudgetRevenue: valueExists(group.expectedRevenue),
      budgetCosts: safeNumber(group.totalBudgetCosts),
      hasBudgetCosts: valueExists(group.totalBudgetCosts),
      calculatedCosts: calculatedCosts.map((cost) => ({
        category: safeText(cost.category || cost.detail || cost.name, "ללא סעיף"),
        amount: safeNumber(cost.total ?? cost.amount ?? cost.cost),
        month: safeText(group.month, ""),
        unit: safeText(group.daycare),
      })).filter((cost) => cost.category),
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
      payrollHours: safeNumber(group.staffingPayrollHours ?? group.totalPayrollHours),
      totalPayrollHours: safeNumber(group.totalPayrollHours),
      employeeCount: safeNumber(group.employeeCount),
      staffingEmployeeCount: safeNumber(group.staffingEmployeeCount ?? group.employeeCount),
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
      notes: safeText(row.notes || row.comment || row.raw?.["הערות"], ""),
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
    accountingStatus: safeText(row.accountingStatus || row.bookkeeping || row.raw?.["הנה\"ח"] || row.raw?.["הנהח"], ""),
    notes: safeText(row.notes, ""),
    excludedFromCalculations: isExcludedAllocation(row),
    salaryBankRow: isBankSalaryRow(row),
  })).filter((row) => row.unit && row.month);
}

function groupAllocationRows(rows) {
  const map = new Map();
  rows.filter((row) => !row.excludedFromCalculations).forEach((row) => {
    const key = row.unit + "|" + row.month;
    if (!map.has(key)) map.set(key, { unit: row.unit, month: row.month, expenses: 0, income: 0, rowCount: 0 });
    const group = map.get(key);
    group.expenses += row.debit;
    group.income += row.salaryBankRow ? 0 : row.credit;
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

function parseMonth(value) {
  const text = clean(value);
  const match = text.match(/^(\d{1,2})[./-](\d{4})$/);
  if (match) return { month: Number(match[1]), year: Number(match[2]), hasYear: true, index: Number(match[2]) * 12 + Number(match[1]) };
  const number = Number(text);
  if (Number.isFinite(number) && number >= 1 && number <= 12) return { month: number, year: 0, hasYear: false, index: number };
  return null;
}

function compareMonths(a, b) {
  const parsedA = parseMonth(a);
  const parsedB = parseMonth(b);
  if (parsedA && parsedB) return parsedA.index - parsedB.index;
  return String(a).localeCompare(String(b), "he", { numeric: true });
}

function selectedMonthsLabel() {
  if (state.months.includes("all")) return "כל החודשים";
  if (state.months.length === 1) return state.months[0];
  return numberFormatter.format(state.months.length) + " חודשים";
}

function selectedUnitsLabel() {
  if (state.units.includes("all")) return "כל היחידות";
  if (state.units.length === 1) return state.units[0];
  return numberFormatter.format(state.units.length) + " יחידות";
}

function schoolYearRangeMonths(allMonths) {
  const months = state.months.includes("all") ? allMonths : state.months;
  const parsed = months.map(parseMonth).filter(Boolean).sort((a, b) => a.index - b.index);
  const end = parsed[parsed.length - 1];
  if (!end) return new Set(months);
  return new Set(allMonths.filter((month) => {
    const parsedMonth = parseMonth(month);
    if (!parsedMonth) return months.includes(month);
    if (end.hasYear && parsedMonth.hasYear) {
      const startYear = end.month >= 9 ? end.year : end.year - 1;
      const start = startYear * 12 + 9;
      return parsedMonth.index >= start && parsedMonth.index <= end.index;
    }
    if (end.month >= 9) return parsedMonth.month >= 9 && parsedMonth.month <= end.month;
    return parsedMonth.month >= 9 || parsedMonth.month <= end.month;
  }));
}

function selectedValues(select) {
  const values = Array.from(select.selectedOptions || []).map((item) => item.value);
  return values.length ? values : ["all"];
}

function toggleSelection(values, value) {
  if (value === "all") return ["all"];
  const current = values.includes("all") ? [] : [...values];
  const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  return next.length ? next : ["all"];
}

function filterPill(value, label, selected, group) {
  return '<button class="filter-pill' + (selected ? ' selected' : '') + '" type="button" data-filter-group="' + group + '" data-value="' + escapeHtml(value) + '" aria-pressed="' + (selected ? 'true' : 'false') + '">' + escapeHtml(label) + '</button>';
}

function renderFilterPills(months, units) {
  els.monthFilterSummary.textContent = selectedMonthsLabel();
  els.unitFilterSummary.textContent = selectedUnitsLabel();
  els.monthPillList.innerHTML = filterPill("all", "כל החודשים", state.months.includes("all"), "months") + months.map((month) => filterPill(month, month, state.months.includes(month), "months")).join("");
  els.unitPillList.innerHTML = filterPill("all", "כל היחידות", state.units.includes("all"), "units") + units.map((unit) => filterPill(unit, unit, state.units.includes(unit), "units")).join("");
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
  const allowedUnits = allUnits.filter((unit) => (state.units.includes("all") || state.units.includes(unit)) && (state.unitType === "all" || unitType(unit, base) === state.unitType));
  const hasUnit = (row) => allowedUnits.includes(row.unit);
  const hasMonth = (row) => state.months.includes("all") || state.months.includes(row.month);
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
    const allocationRows = data.allocationRows.filter((row) => row.unit === unit);
    const requiredHours = sum(budget, "requiredHours");
    const payrollHours = sum(payroll, "payrollHours");
    const budgetUse = budgetUtilization({ budgetGroups: budget, allocationRows }, "all");
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
      requiredHours,
      hasRequiredHours: budget.some((item) => item.hasRequiredHours),
      payrollHours,
      staffingCoverage: coveragePercent(payrollHours, requiredHours),
      requiredEmployees: sum(budget, "requiredEmployees"),
      hasRequiredEmployees: budget.some((item) => item.hasRequiredEmployees),
      payrollEmployees: sum(payroll, "staffingEmployeeCount"),
      totalPayrollEmployees: sum(payroll, "employeeCount"),
      payrollCost: sum(payroll, "payrollCost"),
      expenses: sum(allocations, "expenses"),
      income: sum(allocations, "income"),
      budgetRevenue: sum(budget, "budgetRevenue"),
      budgetUsePercent: budgetUse.percent,
      budgetUseActual: budgetUse.actual,
      budgetUseBudget: budgetUse.budget,
      hasBudgetUse: budgetUse.hasBudget || budgetUse.actual > 0,
      issueCount: 0,
      status: "green",
    };
    return row;
  });
}

function buildIssues(data, unitRows) {
  const issues = [];
  const periodLabel = selectedMonthsLabel();
  dashboardData.errors.forEach((message) => issues.push({ category: "data", severity: "yellow", unit: "מערכת", month: periodLabel, count: 1, label: message }));
  const missingUnitRows = dashboardData.unmappedRows.filter((row) => String(row.unmappedReason || "").includes("unit"));
  const missingMonthRows = dashboardData.unmappedRows.filter((row) => String(row.unmappedReason || "").includes("businessMonth"));
  if (missingUnitRows.length) issues.push({ category: "data", severity: "yellow", unit: "לא משויך", month: "כל החודשים", count: missingUnitRows.length, label: "חסר שיוך יחידה" });
  if (missingMonthRows.length) issues.push({ category: "data", severity: "yellow", unit: "לא משויך", month: "כל החודשים", count: missingMonthRows.length, label: "חסר חודש שיוך" });
  if (dashboardData.unmappedRows.length) issues.push({ category: "data", severity: "yellow", unit: "לא משויך", month: "כל החודשים", count: dashboardData.unmappedRows.length, label: "שורות בנק ללא יחידה או חודש" });
  const missingRefs = data.allocationRows.filter((row) => !row.reference && !row.excludedFromCalculations).length;
  if (missingRefs) issues.push({ category: "data", severity: "yellow", unit: "מספר יחידות", month: periodLabel, count: missingRefs, label: "חסרה אסמכתא" });

  unitRows.forEach((row) => {
    const hoursDiff = row.payrollHours - row.requiredHours;
    const employeeDiff = row.payrollEmployees - row.requiredEmployees;
    if (row.type === "daycare" && row.hasBudget && !row.hasCapacity && row.hasChildren) issues.push({ category: "operational", severity: "yellow", unit: row.unit, month: periodLabel, count: 1, label: "חסרה קיבולת" });
    if (row.type === "daycare" && row.hasCapacity && row.children > row.capacity) issues.push({ category: "operational", severity: "red", unit: row.unit, month: periodLabel, count: row.children - row.capacity, label: "ילדים מעל קיבולת" });
    if (row.hasRequiredHours && row.hasPayroll && hoursDiff < 0) issues.push({ category: "operational", severity: "red", unit: row.unit, month: periodLabel, count: Math.abs(Math.round(hoursDiff)), label: "שעות מטפלות נמוכות מהנדרש" });
    if (row.hasRequiredHours && row.hasPayroll && hoursDiff > 0) issues.push({ category: "operational", severity: "yellow", unit: row.unit, month: periodLabel, count: Math.round(hoursDiff), label: "שעות מטפלות גבוהות מהנדרש" });
    if (row.hasRequiredEmployees && row.hasPayroll && employeeDiff < 0) issues.push({ category: "operational", severity: "red", unit: row.unit, month: periodLabel, count: Math.abs(Math.round(employeeDiff)), label: "מספר מטפלות נמוך מהנדרש" });
    if (row.hasRequiredEmployees && row.hasPayroll && employeeDiff > 0) issues.push({ category: "operational", severity: "yellow", unit: row.unit, month: periodLabel, count: Math.round(employeeDiff), label: "מספר מטפלות גבוה מהנדרש" });
    if (row.hasBudget && !row.hasPayroll) issues.push({ category: "operational", severity: "yellow", unit: row.unit, month: periodLabel, count: 1, label: "אין נתוני שכר" });
    if ((row.hasBudget || row.hasPayroll) && !row.hasAllocations) issues.push({ category: "financial", severity: "yellow", unit: row.unit, month: periodLabel, count: 1, label: "אין נתוני בנק" });
    if (row.expenses > 0 && row.type === "other") issues.push({ category: "financial", severity: "yellow", unit: row.unit, month: periodLabel, count: 1, label: "הוצאות במחלקה שאינה מעון דורשות בדיקה" });
  });

  unitRows.forEach((row) => {
    row.issueCount = issues.filter((issue) => issue.unit === row.unit).length;
    row.status = unitStatus(row, issues);
  });
  return issues;
}

function hoursCoverageStatus(row) {
  if (!row.hasRequiredHours || !row.hasPayroll || row.staffingCoverage === null) return "yellow";
  if (row.staffingCoverage >= STATUS_THRESHOLDS.hoursCoverageGreenAt) return "green";
  if (row.staffingCoverage >= STATUS_THRESHOLDS.hoursCoverageYellowAt) return "yellow";
  return "red";
}

function isEmployeeCountIssue(issue) {
  return String(issue.label || "").includes("מטפלות") || String(issue.label || "").includes("עובדים");
}

function unitStatus(row, issues) {
  const unitIssues = issues.filter((issue) => issue.unit === row.unit);
  const primary = row.type === "daycare" ? hoursCoverageStatus(row) : "green";
  const nonEmployeeIssues = unitIssues.filter((issue) => !isEmployeeCountIssue(issue));
  if (nonEmployeeIssues.some((issue) => issue.severity === "red")) return "red";
  if (primary === "red") return "red";
  if (primary === "yellow" || nonEmployeeIssues.length) return "yellow";
  return "green";
}

function statusFromIssues(issues) {
  if (issues.some((issue) => issue.severity === "red")) return "red";
  if (issues.length) return "yellow";
  return "green";
}

function statusFromUnits(unitRows, issues) {
  if (unitRows.some((row) => row.status === "red")) return "red";
  if (issues.some((issue) => issue.severity === "red" && !isEmployeeCountIssue(issue))) return "red";
  if (unitRows.some((row) => row.status === "yellow") || issues.length) return "yellow";
  return "green";
}

function statusLabel(status) {
  return status === "red" ? "דורש טיפול" : status === "yellow" ? "דורש בדיקה" : "תקין";
}

function severityLabel(severity) {
  return severity === "red" ? "דחוף" : severity === "yellow" ? "בדיקה" : "תקין";
}

function renderFilterOptions() {
  const months = unique([...dashboardData.budgetGroups.map((row) => row.month), ...dashboardData.payrollGroups.map((row) => row.month), ...dashboardData.allocationGroups.map((row) => row.month)]).sort(compareMonths);
  const units = unique([...dashboardData.budgetGroups.map((row) => row.unit), ...dashboardData.payrollGroups.map((row) => row.unit), ...dashboardData.allocationGroups.map((row) => row.unit)]);
  const categories = unique([
    ...dashboardData.budgetGroups.flatMap((row) => row.calculatedCosts.map((cost) => cost.category)),
    ...dashboardData.allocationRows.map((row) => row.accountingCategory),
  ]);
  state.months = state.months.filter((month) => month === "all" || months.includes(month));
  state.units = state.units.filter((unit) => unit === "all" || units.includes(unit));
  if (!state.months.length) state.months = ["all"];
  if (!state.units.length) state.units = ["all"];
  if (state.category !== "all" && !categories.includes(state.category)) state.category = "all";
  els.monthFilter.innerHTML = option("all", "כל החודשים") + months.map((month) => option(month, month)).join("");
  els.unitFilter.innerHTML = option("all", "כל היחידות") + units.map((unit) => option(unit, unit)).join("");
  if (els.unitTypeFilter) els.unitTypeFilter.innerHTML = option("all", "כל הסוגים") + option("daycare", "מעונות") + option("other", "מחלקות / אחר");
  Array.from(els.monthFilter.options).forEach((item) => { item.selected = state.months.includes(item.value); });
  Array.from(els.unitFilter.options).forEach((item) => { item.selected = state.units.includes(item.value); });
  if (els.unitTypeFilter) els.unitTypeFilter.value = state.unitType;
  els.categoryFilter.innerHTML = option("all", "כל הסעיפים") + categories.map((category) => option(category, category)).join("");
  els.categoryFilter.value = state.category;
  if (els.budgetCategoryLabel) els.budgetCategoryLabel.textContent = state.category === "all" ? "כל הסעיפים" : state.category;
  renderFilterPills(months, units);
}

function explainButton(metricId) {
  return metricId ? '<button class="explain-trigger" type="button" data-explain="' + escapeHtml(metricId) + '">הסבר</button>' : "";
}

function kpiCard(label, value, sub, tone = "secondary", metricId = "") {
  return '<article class="kpi-card cashflow-kpi management-kpi ' + tone + '-kpi"><span class="kpi-icon" aria-hidden="true">' + escapeHtml(label.slice(0, 1)) + '</span><div><p>' + escapeHtml(label) + '</p><strong>' + escapeHtml(value) + '</strong><span>' + escapeHtml(sub) + '</span></div>' + explainButton(metricId) + '</article>';
}

function coverageTone(coverage, available) {
  if (!available || coverage === null) return "attention";
  if (coverage >= STATUS_THRESHOLDS.hoursCoverageGreenAt) return "balance";
  if (coverage >= STATUS_THRESHOLDS.hoursCoverageYellowAt) return "expense";
  return "attention";
}

function utilizationTone(percent, hasBudget, actual) {
  if (!hasBudget && actual > 0) return "attention";
  if (!hasBudget || percent === null) return "secondary";
  if (percent > 100) return "attention";
  if (percent >= 90) return "expense";
  return "balance";
}

function utilizationLabel(percent, hasBudget, actual) {
  if (!hasBudget && actual > 0) return "אין תקציב מול הוצאה";
  if (!hasBudget) return "אין תקציב";
  if (percent > 100) return "חריגה מהתקציב";
  if (percent >= 90) return "קרוב לתקציב";
  return "בתוך התקציב";
}

function budgetAmountForGroup(group, category = "all") {
  return group.calculatedCosts
    .filter((cost) => category === "all" || cost.category === category)
    .reduce((total, cost) => total + safeNumber(cost.amount), 0);
}

function budgetUtilization(data, category = "all") {
  const budget = data.budgetGroups.reduce((total, group) => total + budgetAmountForGroup(group, category), 0);
  const actual = data.allocationRows
    .filter((row) => !row.excludedFromCalculations && row.debit > 0 && (category === "all" || row.accountingCategory === category))
    .reduce((total, row) => total + row.debit, 0);
  const percent = budget > 0 ? actual / budget * 100 : null;
  return { budget, actual, percent, hasBudget: budget > 0 };
}

function filteredDataForMonthSet(monthSet) {
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
  const allowedUnits = allUnits.filter((unit) => (state.units.includes("all") || state.units.includes(unit)) && (state.unitType === "all" || unitType(unit, base) === state.unitType));
  const hasUnit = (row) => allowedUnits.includes(row.unit);
  const hasMonth = (row) => monthSet.has(row.month);
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

function ytdData() {
  const allMonths = unique([...dashboardData.budgetGroups.map((row) => row.month), ...dashboardData.payrollGroups.map((row) => row.month), ...dashboardData.allocationRows.map((row) => row.month)]).sort(compareMonths);
  return filteredDataForMonthSet(schoolYearRangeMonths(allMonths));
}

function buildFinancialExceptions(data) {
  const ytd = ytdData();
  const categories = unique([
    ...data.budgetGroups.flatMap((row) => row.calculatedCosts.map((cost) => cost.category)),
    ...data.allocationRows.filter((row) => !row.excludedFromCalculations && row.debit > 0).map((row) => row.accountingCategory),
  ]);
  const rows = [];
  data.allowedUnits.forEach((unit) => {
    categories.forEach((category) => {
      const currentData = {
        budgetGroups: data.budgetGroups.filter((row) => row.unit === unit),
        allocationRows: data.allocationRows.filter((row) => row.unit === unit),
      };
      const ytdUnitData = {
        budgetGroups: ytd.budgetGroups.filter((row) => row.unit === unit),
        allocationRows: ytd.allocationRows.filter((row) => row.unit === unit),
      };
      const current = budgetUtilization(currentData, category);
      const sinceSeptember = budgetUtilization(ytdUnitData, category);
      const tone = utilizationTone(Math.max(current.percent ?? 0, sinceSeptember.percent ?? 0), current.hasBudget || sinceSeptember.hasBudget, current.actual + sinceSeptember.actual);
      if (tone === "attention" || tone === "expense") rows.push({ unit, category, current, sinceSeptember, tone });
    });
  });
  return rows.sort((a, b) => {
    const rank = { attention: 0, expense: 1, balance: 2, secondary: 3 };
    return rank[a.tone] - rank[b.tone] || safeNumber(b.sinceSeptember.percent) - safeNumber(a.sinceSeptember.percent);
  });
}

function payrollSourceRows(data, staffingOnly = false) {
  return data.payrollRows
    .filter((row) => !staffingOnly || row.className === "מטפלת")
    .map((row) => ({
      month: row.month,
      unit: row.unit,
      employee: row.employee,
      className: row.className,
      hours: numberFormatter.format(row.hours),
      amount: moneyFormatter.format(row.cost),
      notes: row.notes,
      rawHours: row.hours,
      rawAmount: row.cost,
    }));
}

function budgetSourceRows(data, field) {
  return data.budgetGroups.map((row) => ({
    month: row.month,
    unit: row.unit,
    value: field === "requiredEmployees" ? numberFormatter.format(row.requiredEmployees) : field === "children" ? numberFormatter.format(row.children) : numberFormatter.format(row.requiredHours),
    source: field,
    rawValue: row[field],
  }));
}

function bankSourceRows(data, type) {
  return data.allocationRows
    .filter((row) => !row.excludedFromCalculations)
    .filter((row) => type === "income" ? row.credit > 0 && !row.salaryBankRow : row.debit > 0)
    .map((row) => ({
      date: row.cashDate,
      month: row.month,
      unit: row.unit,
      description: row.notes || row.reference,
      category: row.accountingCategory,
      amount: moneyFormatter.format(type === "income" ? row.credit : row.debit),
      status: row.reference ? "משויך" : "חסרה אסמכתא",
      rawAmount: type === "income" ? row.credit : row.debit,
    }));
}

function budgetUtilizationRows(data, category = state.category) {
  const budgetRows = data.budgetGroups.flatMap((group) => group.calculatedCosts
    .filter((cost) => category === "all" || cost.category === category)
    .map((cost) => ({
      rowType: "תקציב",
      month: group.month,
      unit: group.unit,
      category: cost.category,
      amount: moneyFormatter.format(cost.amount),
      description: "BUDGET calculatedCosts",
      rawAmount: cost.amount,
    })));
  const actualRows = data.allocationRows
    .filter((row) => !row.excludedFromCalculations && row.debit > 0 && (category === "all" || row.accountingCategory === category))
    .map((row) => ({
      rowType: "בפועל",
      month: row.month,
      unit: row.unit,
      category: row.accountingCategory,
      amount: moneyFormatter.format(row.debit),
      description: row.notes || row.reference || row.cashDate,
      rawAmount: row.debit,
    }));
  return [...budgetRows, ...actualRows];
}

function baseExplanation(metricId, title, displayedValue, source, rule, summary, total, rows, exportColumns) {
  return { metricId, title, displayedValue, scope: scopeLabel(), source, rule, summary, total, rows, exportColumns, filename: exportFilename(metricId) };
}

function buildExplanation(metricId) {
  const data = filteredData();
  const requiredHours = sum(data.budgetGroups, "requiredHours");
  const payrollHours = sum(data.payrollGroups, "payrollHours");
  const coverage = coveragePercent(payrollHours, requiredHours);
  const budgetUse = budgetUtilization(data, state.category);
  const selectedCategory = state.category === "all" ? "כל הסעיפים" : state.category;
  const payrollColumns = [
    { key: "month", label: "חודש" }, { key: "unit", label: "יחידה" }, { key: "employee", label: "עובד" },
    { key: "className", label: "כיתה" }, { key: "hours", label: "שעות" }, { key: "amount", label: "עלות" }, { key: "notes", label: "הערות" },
  ];
  const bankColumns = [
    { key: "date", label: "תאריך" }, { key: "month", label: "חודש" }, { key: "unit", label: "יחידה" },
    { key: "description", label: "תיאור" }, { key: "category", label: "פירוט" }, { key: "amount", label: "סכום" }, { key: "status", label: "סטטוס" },
  ];
  const budgetColumns = [
    { key: "month", label: "חודש" }, { key: "unit", label: "יחידה" }, { key: "source", label: "שדה" }, { key: "value", label: "ערך" },
  ];
  const budgetUtilColumns = [
    { key: "rowType", label: "סוג" }, { key: "month", label: "חודש" }, { key: "unit", label: "יחידה" },
    { key: "category", label: "סעיף" }, { key: "amount", label: "סכום" }, { key: "description", label: "מקור/תיאור" },
  ];

  if (metricId === "staffing-coverage") {
    const rows = payrollSourceRows(data, true);
    return baseExplanation(metricId, "כיסוי שעות מטפלות", formatPercent(coverage, coverage !== null), "PAYROLL + BUDGET", "שעות מטפלות בפועל מתוך PAYROLL, רק שורות שבהן כיתה = מטפלת, חלקי requiredHours מתוך BUDGET.", rows.length + " שורות מטפלות נכללו. שעות נדרשות מגיעות מתקציב.", formatNumber(payrollHours) + " / " + formatNumber(requiredHours), rows, payrollColumns);
  }
  if (metricId === "staffing-hours") {
    const rows = payrollSourceRows(data, true);
    return baseExplanation(metricId, "שעות מטפלות בפועל", formatNumber(payrollHours, hasRows(data.payrollGroups)), "PAYROLL", "רק שורות PAYROLL שבהן כיתה = מטפלת.", rows.length + " שורות מטפלות נכללו.", formatNumber(payrollHours), rows, payrollColumns);
  }
  if (metricId === "required-hours") {
    const rows = budgetSourceRows(data, "requiredHours");
    return baseExplanation(metricId, "שעות נדרשות", formatNumber(requiredHours, hasRows(data.budgetGroups)), "BUDGET", "סיכום requiredHours למסננים שנבחרו.", rows.length + " קבוצות תקציב נכללו.", formatNumber(requiredHours), rows, budgetColumns);
  }
  if (metricId === "salary-cost") {
    const rows = payrollSourceRows(data, false);
    const total = sum(data.payrollGroups, "payrollCost");
    return baseExplanation(metricId, "עלות שכר", formatMoney(total, hasRows(data.payrollGroups)), "PAYROLL", "כל שורות PAYROLL עבור היחידות והחודשים שנבחרו.", rows.length + " שורות שכר נכללו. מטפלות, מנהלות, מטבח ומשרד נכללים בעלות שכר.", formatMoney(total), rows, payrollColumns);
  }
  if (metricId === "children-count") {
    const rows = budgetSourceRows(data, "children");
    const total = sum(data.budgetGroups, "children");
    return baseExplanation(metricId, "ילדים", formatNumber(total, hasRows(data.budgetGroups)), "BUDGET", "סיכום children מתוך קבוצות תקציב.", rows.length + " קבוצות תקציב נכללו.", formatNumber(total), rows, budgetColumns);
  }
  if (metricId === "income" || metricId === "expenses") {
    const type = metricId === "income" ? "income" : "expenses";
    const rows = bankSourceRows(data, type === "income" ? "income" : "expenses");
    const total = rows.reduce((value, row) => value + safeNumber(row.rawAmount), 0);
    return baseExplanation(metricId, type === "income" ? "הכנסות" : "הוצאות", formatMoney(total, rows.length > 0), "BANKS", type === "income" ? "שורות BANKS עם זכות עבור המסננים שנבחרו." : "שורות BANKS עם חובה עבור המסננים שנבחרו. חריג לא לחישוב לא נכלל.", rows.length + " שורות בנק נכללו.", formatMoney(total, rows.length > 0), rows, bankColumns);
  }
  if (metricId === "budget-utilization") {
    const rows = budgetUtilizationRows(data, state.category);
    return baseExplanation(metricId, "ניצול תקציב - " + selectedCategory, utilizationLine(budgetUse), "BUDGET + BANKS", "BUDGET calculatedCosts מושווה מול הוצאות BANKS לפי פירוט/accountingCategory. מתחילת שנת הלימודים מחושב מספטמבר עד החודש שנבחר.", rows.length + " שורות תקציב ובפועל זמינות לסעיף.", utilizationLine(budgetUse), rows, budgetUtilColumns);
  }
  if (metricId === "financial-exceptions") {
    const exceptions = buildFinancialExceptions(data);
    const rows = budgetUtilizationRows(data, "all");
    return baseExplanation(metricId, "חריגות תקציב וכספים", exceptions.length ? numberFormatter.format(exceptions.length) : "אין", "BUDGET + BANKS", "סעיפים שמגיעים ל-90% ניצול או עוברים תקציב, בתקופה הנבחרת או מתחילת שנת הלימודים.", exceptions.length + " חריגות נמצאו. YTD הוא ספטמבר עד החודש שנבחר.", exceptions.length ? numberFormatter.format(exceptions.length) : "אין", rows, budgetUtilColumns);
  }
  if (metricId === "required-employees") {
    const rows = budgetSourceRows(data, "requiredEmployees");
    const total = sum(data.budgetGroups, "requiredEmployees");
    return baseExplanation(metricId, "תקן נדרש", formatNumber(total, hasRows(data.budgetGroups)), "BUDGET", "סיכום requiredEmployeeHeadcount מתוך BUDGET.", rows.length + " קבוצות תקציב נכללו.", formatNumber(total), rows, budgetColumns);
  }
  if (metricId === "staffing-employees") {
    const rows = payrollSourceRows(data, true);
    const employees = unique(rows.map((row) => row.employee)).length;
    return baseExplanation(metricId, "מטפלות בפועל", formatNumber(employees, rows.length > 0), "PAYROLL", "ספירת עובדים מתוך שורות PAYROLL שבהן כיתה = מטפלת.", rows.length + " שורות מטפלות נכללו.", formatNumber(employees, rows.length > 0), rows, payrollColumns);
  }
  return null;
}

function renderStatus(data, unitRows, issues) {
  const status = statusFromUnits(unitRows, issues);
  els.overallStatusLabel.textContent = statusLabel(status);
  els.overallStatusLabel.className = "status-pill " + status;
  els.lastUpdateLabel.textContent = "עדכון בנק אחרון: " + latestCashDate(dashboardData.allocationRows);
  els.selectedMonthLabel.textContent = selectedMonthsLabel() + " · " + selectedUnitsLabel();
  const hasBudget = hasRows(data.budgetGroups);
  const hasPayroll = hasRows(data.payrollGroups);
  const hasAllocations = hasRows(data.allocationGroups);
  const requiredHours = sum(data.budgetGroups, "requiredHours");
  const payrollHours = sum(data.payrollGroups, "payrollHours");
  const staffingCoverage = coveragePercent(payrollHours, requiredHours);
  const hasStaffingCoverage = hasBudget && hasPayroll && staffingCoverage !== null;
  const financialExceptions = buildFinancialExceptions(data);
  const cards = [
    { label: "כיסוי שעות מטפלות", value: formatPercent(staffingCoverage, hasStaffingCoverage), sub: hasStaffingCoverage ? formatNumber(payrollHours) + " / " + formatNumber(requiredHours) + " שעות" : "אין מספיק נתוני תקציב ושכר", tone: coverageTone(staffingCoverage, hasStaffingCoverage), metricId: "staffing-coverage" },
    { label: "עלות שכר", value: formatMoney(sum(data.payrollGroups, "payrollCost"), hasPayroll), sub: hasPayroll ? "כל שורות השכר במעון ובחודש" : "אין נתוני שכר", tone: "payroll", metricId: "salary-cost" },
    { label: "חריגות תקציב", value: financialExceptions.length ? numberFormatter.format(financialExceptions.length) : "אין", sub: financialExceptions.length ? "סעיפים קרובים או מעל תקציב" : "אין חריגה בתקופה", tone: financialExceptions.some((item) => item.tone === "attention") ? "attention" : financialExceptions.length ? "expense" : "balance", metricId: "financial-exceptions" },
    { label: "ילדים", value: formatNumber(sum(data.budgetGroups, "children"), hasBudget), sub: hasBudget ? "לפי נתוני תקציב" : "אין נתוני תקציב", tone: "secondary", metricId: "children-count" },
    { label: "הכנסות", value: formatMoney(sum(data.allocationGroups, "income"), hasAllocations), sub: hasAllocations ? "תנועות זכות בבנק" : "אין נתוני בנק", tone: "income", metricId: "income" },
    { label: "הוצאות", value: formatMoney(sum(data.allocationGroups, "expenses"), hasAllocations), sub: hasAllocations ? "תנועות חובה בבנק" : "אין נתוני בנק", tone: "expense", metricId: "expenses" },
  ];
  els.statusGrid.innerHTML = cards.map((card) => kpiCard(card.label, card.value, card.sub, card.tone, card.metricId)).join("");
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

function comparisonCard(label, actual, expected, actualAvailable, expectedAvailable, unitLabel, metricId = "") {
  const actualText = formatNumber(actual, actualAvailable);
  const expectedText = formatNumber(expected, expectedAvailable);
  let diffText = "אין מספיק נתונים להשוואה";
  if (actualAvailable && expectedAvailable) {
    const diff = safeNumber(actual) - safeNumber(expected);
    diffText = diff === 0 ? "ללא פער" : (diff > 0 ? "+" : "") + numberFormatter.format(diff) + " " + unitLabel;
  }
  const buttons = metricId === "staffing-employees" ? '<div class="explain-button-row">' + explainButton("staffing-employees") + explainButton("required-employees") + '</div>' : explainButton(metricId);
  return '<article class="dashboard-panel comparison-card"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(actualText) + ' / ' + escapeHtml(expectedText) + '</strong><p>' + escapeHtml(diffText) + '</p>' + buttons + '</article>';
}

function staffingCoverageCard(actual, required, hasPayroll, hasBudget) {
  const coverage = coveragePercent(actual, required);
  const actualText = formatNumber(actual, hasPayroll);
  const requiredText = formatNumber(required, hasBudget);
  const coverageText = formatPercent(coverage, hasPayroll && hasBudget);
  const detail = hasPayroll && hasBudget ? coverageText + " כיסוי שעות מטפלות" : "אין מספיק נתונים להשוואה";
  return '<article class="dashboard-panel comparison-card primary-comparison"><span>שעות מטפלות / שעות נדרשות</span><strong>' + escapeHtml(actualText) + ' / ' + escapeHtml(requiredText) + '</strong><p>' + escapeHtml(detail) + '</p><div class="explain-button-row">' + explainButton("staffing-coverage") + explainButton("staffing-hours") + explainButton("required-hours") + '</div></article>';
}

function renderOperations(data, issues) {
  const hasBudget = hasRows(data.budgetGroups);
  const hasPayroll = hasRows(data.payrollGroups);
  const children = sum(data.budgetGroups, "children");
  const requiredHours = sum(data.budgetGroups, "requiredHours");
  const payrollHours = sum(data.payrollGroups, "payrollHours");
  const hoursCoverage = coveragePercent(payrollHours, requiredHours);
  const requiredEmployees = sum(data.budgetGroups, "requiredEmployees");
  const payrollEmployees = sum(data.payrollGroups, "staffingEmployeeCount");
  const operationalIssues = issues.filter((issue) => issue.category === "operational");
  els.operationalStatusChip.textContent = operationalIssues.length ? numberFormatter.format(operationalIssues.length) + " פריטים" : "אין פריטים פתוחים";
  els.operationalGrid.innerHTML = [
    staffingCoverageCard(payrollHours, requiredHours, hasPayroll, hasBudget),
    comparisonCard("ילדים בפועל", children, children, hasBudget, hasBudget, "ילדים", "children-count"),
    comparisonCard("מטפלות בפועל מול תקן נדרש", payrollEmployees, requiredEmployees, hasPayroll, hasBudget, "מטפלות", "staffing-employees"),
  ].join("");
}

function renderUnits(unitRows) {
  if (!state.units.includes("all") && state.units.length === 1) {
    els.unitCountLabel.textContent = "יחידה אחת נבחרה";
    els.unitCardGrid.innerHTML = '<p class="empty-state">נבחרה יחידה אחת. פרטי היחידה מוצגים בסיכומי התקופה, התקציב והבקרה.</p>';
    return;
  }
  const sortedRows = [...unitRows].sort((a, b) => {
    const rank = { red: 0, yellow: 1, green: 2 };
    return rank[a.status] - rank[b.status] || b.issueCount - a.issueCount || a.unit.localeCompare(b.unit, "he");
  });
  const ytdRows = buildUnitRows(ytdData());
  const ytdByUnit = new Map(ytdRows.map((row) => [row.unit, row]));
  const attentionCount = sortedRows.filter((row) => row.status !== "green").length;
  els.unitCountLabel.textContent = unitRows.length ? (attentionCount ? numberFormatter.format(attentionCount) + " דורשות תשומת לב" : "הכל תקין") : NO_DATA;
  if (!sortedRows.length) {
    els.unitCardGrid.innerHTML = '<p class="empty-state">אין יחידות להצגה במסננים הנוכחיים.</p>';
    return;
  }
  els.unitCardGrid.innerHTML = sortedRows.map((row) => {
    const ytd = ytdByUnit.get(row.unit) || {};
    const currentBalance = row.income - row.expenses;
    const ytdBalance = safeNumber(ytd.income) - safeNumber(ytd.expenses);
    return '<article class="daycare-card management-unit-card status-' + row.status + '"><div class="unit-status-ribbon">' + escapeHtml(statusLabel(row.status)) + '</div><div class="daycare-card-head"><div><h3>' + escapeHtml(row.unit) + '</h3><span>' + escapeHtml(row.type === "daycare" ? "מעון" : "מחלקה / אחר") + '</span></div><strong aria-label="מספר חריגות">' + escapeHtml(row.issueCount ? numberFormatter.format(row.issueCount) : "אין") + '</strong></div><div class="unit-primary-line"><span>' + escapeHtml(row.issueCount ? "דורש טיפול" : "ללא טיפול פתוח") + '</span><b>' + escapeHtml(row.hasRequiredHours && row.hasPayroll ? formatPercent(row.staffingCoverage) + " כיסוי שעות" : "חסר כיסוי שעות") + '</b></div><div class="unit-card-block-title">תקופה נבחרת</div><div class="daycare-metrics financial-metrics"><div><span>הכנסות</span><strong>' + escapeHtml(formatMoney(row.income, row.hasAllocations)) + '</strong></div><div><span>הוצאות</span><strong>' + escapeHtml(formatMoney(row.expenses, row.hasAllocations)) + '</strong></div><div><span>יתרה</span><strong>' + escapeHtml(formatMoney(currentBalance, row.hasAllocations)) + '</strong></div></div><div class="unit-card-block-title">שנת לימודים</div><div class="daycare-metrics financial-metrics"><div><span>הכנסות</span><strong>' + escapeHtml(formatMoney(ytd.income, ytd.hasAllocations)) + '</strong></div><div><span>הוצאות</span><strong>' + escapeHtml(formatMoney(ytd.expenses, ytd.hasAllocations)) + '</strong></div><div><span>יתרה</span><strong>' + escapeHtml(formatMoney(ytdBalance, ytd.hasAllocations)) + '</strong></div></div><div class="unit-card-block-title">תפעול</div><div class="daycare-metrics financial-metrics"><div><span>שעות</span><strong>' + escapeHtml(formatNumber(row.payrollHours, row.hasPayroll)) + ' / ' + escapeHtml(formatNumber(row.requiredHours, row.hasRequiredHours)) + '</strong></div><div><span>שכר</span><strong>' + escapeHtml(formatMoney(row.payrollCost, row.hasPayroll)) + '</strong></div><div><span>ילדים</span><strong>' + escapeHtml(formatNumber(row.children, row.hasBudget)) + '</strong></div><div><span>ניצול תקציב</span><strong>' + escapeHtml(row.hasBudgetUse && row.budgetUsePercent !== null ? formatPercent(row.budgetUsePercent) : "לא הוגדר") + '</strong></div></div><div class="budget-note">' + escapeHtml(row.issueCount ? "פתחו את הפעולות והשלימו את הנתון החסר" : "אין חריגות פתוחות ליחידה") + '</div></article>';
  }).join("");
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
  const hoursCoverage = coveragePercent(payrollHours, requiredHours);
  const requiredEmployees = sum(data.budgetGroups, "requiredEmployees");
  const payrollEmployees = sum(data.payrollGroups, "staffingEmployeeCount");
  if (!hasBudget) insights.push(["אין נתוני תקציב", "לא ניתן להשוות ילדים, שעות נדרשות או תקן עובדים."]);
  if (!hasPayroll) insights.push(["אין נתוני שכר", "לא ניתן להשוות שעות מטפלות או כמות מטפלות בפועל."]);
  if (!hasRows(data.allocationGroups)) insights.push(["אין נתוני בנק", "לא ניתן להציג הוצאות והכנסות בפועל."]);
  if (hasBudget && hasPayroll && payrollHours > requiredHours) insights.push(["כיסוי שעות מטפלות מעל הנדרש", formatPercent(hoursCoverage) + " כיסוי | " + numberFormatter.format(payrollHours - requiredHours) + " שעות מעל התקן"]);
  if (hasBudget && hasPayroll && payrollHours < requiredHours) insights.push(["כיסוי שעות מטפלות חסר", formatPercent(hoursCoverage) + " כיסוי | " + numberFormatter.format(requiredHours - payrollHours) + " שעות חסרות"]);
  if (hasBudget && hasPayroll && payrollEmployees > requiredEmployees) insights.push(["כמות מטפלות מעל הנדרש", numberFormatter.format(payrollEmployees - requiredEmployees) + " מטפלות מעל התקן"]);
  if (hasBudget && hasPayroll && payrollEmployees < requiredEmployees) insights.push(["כמות מטפלות מתחת לנדרש", numberFormatter.format(requiredEmployees - payrollEmployees) + " מטפלות חסרות"]);
  if (dashboardData.unmappedRows.length) insights.push(["תנועות בנק לא משויכות", numberFormatter.format(dashboardData.unmappedRows.length) + " שורות דורשות יחידה או חודש"]);
  if (!insights.length && issues.length) insights.push(["יש חריגות לבדיקה", numberFormatter.format(issues.length) + " פריטים מופיעים במרכז החריגות."]);
  if (!insights.length && !issues.length) insights.push(["אין פעולה מיידית", "המסננים הנוכחיים לא מציגים חריגות פתוחות."]);
  els.insightGrid.innerHTML = insights.slice(0, 5).map(([title, detail], index) => '<article class="executive-alert management-insight ' + (index === 0 ? 'primary-insight' : '') + '"><span>תובנה ניהולית</span><strong>' + escapeHtml(title) + '</strong><p>' + escapeHtml(detail) + '</p></article>').join("");
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
    const coverage = coveragePercent(actual, required);
    if (coverage >= STATUS_THRESHOLDS.hoursCoverageGreenAt) return { severity: "green", label: "כיסוי תקין", diff, coverage };
    if (coverage >= STATUS_THRESHOLDS.hoursCoverageYellowAt) return { severity: "yellow", label: "כיסוי חלקי", diff, coverage };
    return { severity: "red", label: "כיסוי נמוך", diff, coverage };
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
  const coverageText = status.coverage === undefined ? "" : formatPercent(status.coverage) + " כיסוי | ";
  const diffText = status.diff === null ? "אין מספיק נתונים" : coverageText + (status.diff > 0 ? "+" : "") + numberFormatter.format(status.diff) + " " + unitLabel;
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
      comparisonTile("שעות מטפלות מול נדרש", row.payrollHours, row.requiredHours, hours, row.hasPayroll, row.hasRequiredHours, "שעות") +
      comparisonTile("ילדים מול קיבולת", row.children, row.capacity, cap, row.hasChildren, row.hasCapacity, "ילדים") +
      comparisonTile("מטפלות בפועל מול תקן נדרש", row.payrollEmployees, row.requiredEmployees, employees, row.hasPayroll, row.hasRequiredEmployees, "מטפלות") +
      '</div></article>';
  }).join("");
}

function actionText(issue) {
  if (issue.label.includes("יחידה")) return "לשייך יחידה חסרה";
  if (issue.label.includes("חודש")) return "לשייך חודש חסר";
  if (issue.label.includes("בנק")) return "לבדוק תנועות בנק";
  if (issue.label.includes("שעות")) return "לבדוק שעות מטפלות";
  if (issue.label.includes("מטפלות") || issue.label.includes("עובדים")) return "לבדוק תקינת מטפלות";
  if (issue.label.includes("קיבולת")) return "לעדכן או לבדוק קיבולת";
  return issue.label;
}

function renderActionCenter(issues) {
  const severityRank = { red: 0, yellow: 1, green: 2 };
  const actions = issues
    .filter((issue) => ["data", "operational"].includes(issue.category))
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || String(a.unit).localeCompare(String(b.unit), "he"));
  els.actionCountLabel.textContent = actions.length ? numberFormatter.format(actions.length) + " פעולות" : "אין פעולות פתוחות";
  els.actionList.innerHTML = actions.length ? actions.slice(0, 6).map((issue) => '<article class="action-row severity-' + issue.severity + '"><span>' + escapeHtml(severityLabel(issue.severity)) + '</span><strong>' + escapeHtml(actionText(issue)) + '</strong><p><b>' + escapeHtml(issue.unit) + '</b><small>' + escapeHtml(issue.month || "כל החודשים") + ' · ' + escapeHtml(numberFormatter.format(issue.count)) + '</small></p></article>').join("") : '<p class="empty-state">אין פעולות ניהול פתוחות במסננים הנוכחיים.</p>';
}

function utilizationLine(utilization) {
  if (!utilization.hasBudget) return formatMoney(utilization.actual, utilization.actual > 0) + " · לא הוגדר תקציב";
  const percent = formatPercent(utilization.percent, utilization.percent !== null);
  return formatMoney(utilization.actual, utilization.actual > 0 || utilization.hasBudget) + " / " + formatMoney(utilization.budget, utilization.hasBudget) + " · " + percent;
}

function balanceTone(balance, available) {
  if (!available) return "secondary";
  if (balance < 0) return "attention";
  if (balance === 0) return "expense";
  return "balance";
}

function periodTotals(data) {
  const income = sum(data.allocationGroups, "income");
  const expenses = sum(data.allocationGroups, "expenses");
  const salary = sum(data.payrollGroups, "payrollCost");
  const requiredHours = sum(data.budgetGroups, "requiredHours");
  const payrollHours = sum(data.payrollGroups, "payrollHours");
  const utilization = budgetUtilization(data, state.category);
  return {
    income,
    expenses,
    balance: income - expenses,
    salary,
    payrollHours,
    requiredHours,
    coverage: coveragePercent(payrollHours, requiredHours),
    utilization,
    hasAllocations: hasRows(data.allocationGroups),
    hasPayroll: hasRows(data.payrollGroups),
    hasBudget: hasRows(data.budgetGroups),
  };
}

function renderPeriodSummary(data) {
  const totals = periodTotals(data);
  els.currentPeriodLabel.textContent = selectedMonthsLabel();
  const budgetText = totals.utilization.hasBudget ? formatPercent(totals.utilization.percent) : "לא הוגדר תקציב";
  const cards = [
    { label: "הכנסות", value: formatMoney(totals.income, totals.hasAllocations), sub: "תנועות זכות בבנק", tone: "income", metricId: "income" },
    { label: "הוצאות", value: formatMoney(totals.expenses, totals.hasAllocations), sub: "תנועות חובה בבנק", tone: "expense", metricId: "expenses" },
    { label: "יתרה", value: formatMoney(totals.balance, totals.hasAllocations), sub: "הכנסות פחות הוצאות", tone: balanceTone(totals.balance, totals.hasAllocations) },
    { label: "שכר", value: formatMoney(totals.salary, totals.hasPayroll), sub: "PAYROLL, לא BANKS", tone: "payroll", metricId: "salary-cost" },
    { label: "כיסוי שעות", value: formatPercent(totals.coverage, totals.hasPayroll && totals.hasBudget), sub: formatNumber(totals.payrollHours, totals.hasPayroll) + " / " + formatNumber(totals.requiredHours, totals.hasBudget), tone: coverageTone(totals.coverage, totals.hasPayroll && totals.hasBudget), metricId: "staffing-coverage" },
    { label: "תקציב", value: budgetText, sub: totals.utilization.hasBudget ? utilizationLine(totals.utilization) : "לא הוגדר תקציב", tone: utilizationTone(totals.utilization.percent, totals.utilization.hasBudget, totals.utilization.actual), metricId: "budget-utilization" },
  ];
  els.currentPeriodGrid.innerHTML = cards.map((card) => kpiCard(card.label, card.value, card.sub, card.tone, card.metricId)).join("");
}

function renderSchoolYearSummary() {
  const data = ytdData();
  const totals = periodTotals(data);
  const budgetText = totals.utilization.hasBudget ? formatPercent(totals.utilization.percent) : "לא הוגדר תקציב";
  const cards = [
    { label: "הכנסות", value: formatMoney(totals.income, totals.hasAllocations), sub: "מתחילת שנת הלימודים", tone: "income", metricId: "income" },
    { label: "הוצאות", value: formatMoney(totals.expenses, totals.hasAllocations), sub: "מתחילת שנת הלימודים", tone: "expense", metricId: "expenses" },
    { label: "יתרה", value: formatMoney(totals.balance, totals.hasAllocations), sub: "הכנסות פחות הוצאות", tone: balanceTone(totals.balance, totals.hasAllocations) },
    { label: "שכר", value: formatMoney(totals.salary, totals.hasPayroll), sub: "PAYROLL מתחילת השנה", tone: "payroll", metricId: "salary-cost" },
    { label: "תקציב", value: budgetText, sub: totals.utilization.hasBudget ? utilizationLine(totals.utilization) : "לא הוגדר תקציב", tone: utilizationTone(totals.utilization.percent, totals.utilization.hasBudget, totals.utilization.actual), metricId: "budget-utilization" },
  ];
  els.schoolYearGrid.innerHTML = cards.map((card) => kpiCard(card.label, card.value, card.sub, card.tone, card.metricId)).join("");
}

function renderBankControl(data) {
  const unmapped = dashboardData.unmappedRows.length;
  const statuses = { "נשלח": 0, "מחכה לשליחה": 0, "חסר מסמכים": 0, "ללא אסמכתא": 0 };
  data.allocationRows.forEach((row) => {
    const status = clean(row.accountingStatus);
    if (status.includes("נשלח")) statuses["נשלח"] += 1;
    else if (status.includes("מחכה")) statuses["מחכה לשליחה"] += 1;
    else if (status.includes("חסר")) statuses["חסר מסמכים"] += 1;
    if (!row.reference) statuses["ללא אסמכתא"] += 1;
  });
  els.bankControlLabel.textContent = unmapped ? numberFormatter.format(unmapped) + " לא משויכות" : "אין תנועות לא משויכות";
  els.bankControlGrid.innerHTML = '<button class="bank-control-card warning" type="button" data-scroll-target="supporting-details"><span>תנועות לא משויכות</span><strong>' + escapeHtml(unmapped ? numberFormatter.format(unmapped) : "אין") + '</strong><small>לחיצה פותחת את אזור הבקרה</small></button>' +
    Object.entries(statuses).map(([label, value]) => '<article class="bank-control-card"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(numberFormatter.format(value)) + '</strong><small>הנהלת חשבונות</small></article>').join("");
}

function renderFinancialExceptions(data) {
  const exceptions = buildFinancialExceptions(data);
  els.financialExceptionCountLabel.textContent = exceptions.length ? numberFormatter.format(exceptions.length) + " חריגות" : "אין חריגות תקציב";
  els.financialExceptionGrid.innerHTML = exceptions.length ? exceptions.slice(0, 6).map((item) => {
    const currentLabel = utilizationLabel(item.current.percent, item.current.hasBudget, item.current.actual);
    const ytdLabel = utilizationLabel(item.sinceSeptember.percent, item.sinceSeptember.hasBudget, item.sinceSeptember.actual);
    return '<article class="financial-exception-card ' + item.tone + '-exception"><div><span>' + escapeHtml(item.category) + '</span><strong>' + escapeHtml(item.unit) + '</strong>' + explainButton("financial-exceptions") + '</div><dl><div><dt>תקופה נבחרת</dt><dd>' + escapeHtml(utilizationLine(item.current)) + '</dd><small>' + escapeHtml(currentLabel) + '</small></div><div><dt>מתחילת שנת הלימודים</dt><dd>' + escapeHtml(utilizationLine(item.sinceSeptember)) + '</dd><small>' + escapeHtml(ytdLabel) + '</small></div></dl></article>';
  }).join("") : '<p class="empty-state">אין סעיפי תקציב קרובים לחריגה או מעל התקציב במסננים הנוכחיים.</p>';
}

function renderBudgetExplorer(data) {
  const category = state.category;
  const current = budgetUtilization(data, category);
  const sinceSeptember = budgetUtilization(ytdData(), category);
  const selectedCategoryLabel = category === "all" ? "כל הסעיפים" : category;
  const breakdown = data.allowedUnits.map((unit) => {
    const unitData = {
      budgetGroups: data.budgetGroups.filter((row) => row.unit === unit),
      allocationRows: data.allocationRows.filter((row) => row.unit === unit),
    };
    return { unit, utilization: budgetUtilization(unitData, category) };
  }).filter((row) => row.utilization.actual > 0 || row.utilization.budget > 0).sort((a, b) => safeNumber(b.utilization.percent) - safeNumber(a.utilization.percent));
  els.budgetExplorerGrid.innerHTML = '<article class="dashboard-panel budget-utilization-summary"><div class="panel-heading"><h3>' + escapeHtml(selectedCategoryLabel) + '</h3><span>תקופה נבחרת</span></div><div class="budget-utilization-kpis">' +
    kpiCard("ניצול בתקופה", utilizationLine(current), utilizationLabel(current.percent, current.hasBudget, current.actual), utilizationTone(current.percent, current.hasBudget, current.actual), "budget-utilization") +
    kpiCard("מתחילת שנת הלימודים", utilizationLine(sinceSeptember), utilizationLabel(sinceSeptember.percent, sinceSeptember.hasBudget, sinceSeptember.actual), utilizationTone(sinceSeptember.percent, sinceSeptember.hasBudget, sinceSeptember.actual), "budget-utilization") +
    '</div></article><article class="dashboard-panel budget-breakdown-panel"><div class="panel-heading"><h3>פירוט לפי יחידה</h3><span>' + escapeHtml(breakdown.length ? numberFormatter.format(breakdown.length) + " יחידות" : NO_DATA) + '</span></div><div class="budget-breakdown-list">' +
    (breakdown.length ? breakdown.map((row) => '<div class="budget-breakdown-row"><strong>' + escapeHtml(row.unit) + '</strong><span>' + escapeHtml(utilizationLine(row.utilization)) + '</span></div>').join("") : '<p class="empty-state">אין נתוני תקציב או הוצאה לסעיף שנבחר.</p>') +
    '</div></article>';
}

function renderSourceRows(explanation) {
  els.sourceDrawerTitle.textContent = explanation.title;
  els.sourceDrawerMeta.textContent = explanation.rows.length ? numberFormatter.format(explanation.rows.length) + " שורות · " + explanation.total : "לא נמצאו שורות מקור זמינות למספר זה";
  els.sourceTableHead.innerHTML = '<tr>' + explanation.exportColumns.map((column) => '<th>' + escapeHtml(column.label) + '</th>').join("") + '</tr>';
  els.sourceTableBody.innerHTML = explanation.rows.length ? explanation.rows.map((row) => '<tr>' + explanation.exportColumns.map((column) => '<td data-label="' + escapeHtml(column.label) + '">' + escapeHtml(row[column.key] ?? "") + '</td>').join("") + '</tr>').join("") : '<tr><td colspan="' + explanation.exportColumns.length + '">לא נמצאו שורות מקור זמינות למספר זה.</td></tr>';
}

function openExplanation(metricId) {
  const explanation = buildExplanation(metricId);
  if (!explanation) return;
  currentExplanation = explanation;
  els.explainTitle.textContent = explanation.title;
  els.explainValue.textContent = explanation.displayedValue;
  els.explainScope.textContent = explanation.scope;
  els.explainSource.textContent = explanation.source;
  els.explainTotal.textContent = explanation.total;
  els.explainRule.textContent = explanation.rule;
  els.explainText.textContent = explanation.summary + (explanation.rows.length ? "" : " לא נמצאו שורות מקור זמינות למספר זה.");
  els.explainOverlay.hidden = false;
}

function closeExplanation() {
  els.explainOverlay.hidden = true;
}

function openSourceDrawer() {
  if (!currentExplanation) return;
  renderSourceRows(currentExplanation);
  els.sourceDrawer.hidden = false;
}

function closeSourceDrawer() {
  els.sourceDrawer.hidden = true;
}

function renderDashboard() {
  renderFilterOptions();
  const data = filteredData();
  const unitRows = buildUnitRows(data);
  const issues = buildIssues(data, unitRows);
  renderStatus(data, unitRows, issues);
  renderPeriodSummary(data);
  renderSchoolYearSummary();
  renderBankControl(data);
  renderDataFreshness();
  renderDataQuality(data);
  renderSummary(data);
  renderOperations(data, issues);
  renderManagementComparisons(unitRows);
  renderActionCenter(issues);
  renderFinancialExceptions(data);
  renderUnits(unitRows);
  renderBudgetExplorer(data);
  renderIssues(issues);
  renderInsights(data, issues);
  renderTables(data);
}

function renderLoadingState() {
  els.overallStatusLabel.textContent = "נטען";
  els.statusGrid.innerHTML = '<p class="empty-state">לוח הניהול נטען...</p>';
  els.currentPeriodGrid.innerHTML = "";
  els.schoolYearGrid.innerHTML = "";
  els.bankControlGrid.innerHTML = "";
  els.summaryGrid.innerHTML = "";
  els.freshnessGrid.innerHTML = "";
  els.dataQualityGrid.innerHTML = "";
  els.operationalGrid.innerHTML = "";
  els.daycareComparisonGrid.innerHTML = "";
  els.actionList.innerHTML = "";
  els.financialExceptionGrid.innerHTML = "";
  els.budgetExplorerGrid.innerHTML = "";
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
  document.addEventListener("click", (event) => {
    const explain = event.target.closest("[data-explain]");
    if (explain) openExplanation(explain.dataset.explain);
    if (event.target.closest("[data-close-explain]")) closeExplanation();
    if (event.target.closest("[data-close-source]")) closeSourceDrawer();
    if (event.target === els.explainOverlay) closeExplanation();
    const scrollTarget = event.target.closest("[data-scroll-target]");
    if (scrollTarget) document.querySelector(".supporting-details-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  els.showSourceRows.addEventListener("click", openSourceDrawer);
  els.copyExplainSummary.addEventListener("click", () => {
    if (!currentExplanation) return;
    copyText([currentExplanation.title, currentExplanation.displayedValue, currentExplanation.scope, currentExplanation.source, currentExplanation.rule, currentExplanation.summary, currentExplanation.total].join("\n"));
  });
  els.exportExplainCsv.addEventListener("click", () => { if (currentExplanation) downloadCsv(currentExplanation); });
  els.copySourceTable.addEventListener("click", () => { if (currentExplanation) copyText(rowsToCsv(currentExplanation)); });
  els.exportSourceCsv.addEventListener("click", () => { if (currentExplanation) downloadCsv(currentExplanation); });
  els.monthFilter.addEventListener("change", (event) => { state.months = selectedValues(event.target); if (state.months.includes("all") && state.months.length > 1) state.months = ["all"]; renderDashboard(); });
  els.unitFilter.addEventListener("change", (event) => { state.units = selectedValues(event.target); if (state.units.includes("all") && state.units.length > 1) state.units = ["all"]; renderDashboard(); });
  els.monthPillList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter-group]");
    if (!button) return;
    state.months = toggleSelection(state.months, button.dataset.value);
    renderDashboard();
  });
  els.unitPillList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter-group]");
    if (!button) return;
    state.units = toggleSelection(state.units, button.dataset.value);
    renderDashboard();
  });
  if (els.unitTypeFilter) els.unitTypeFilter.addEventListener("change", (event) => { state.unitType = event.target.value; renderDashboard(); });
  els.categoryFilter.addEventListener("change", (event) => { state.category = event.target.value; renderDashboard(); });
  els.tableSearch.addEventListener("input", (event) => { state.search = event.target.value.trim(); renderDashboard(); });
  els.expenseSort.addEventListener("change", (event) => { state.expenseSort = event.target.value; renderDashboard(); });
  els.payrollSort.addEventListener("change", (event) => { state.payrollSort = event.target.value; renderDashboard(); });
}

bindEvents();
loadDashboardData();
