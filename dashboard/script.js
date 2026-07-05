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
const dashboardData = { budgetGroups: [], budgetRules: [], payrollGroups: [], payrollRows: [], allocationGroups: [], allocationRows: [], unmappedRows: [], excludedAllocationRows: [], employees: [], errors: [] };

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
  budgetCategoryAuditCount: document.querySelector("#budget-category-audit-count"),
  budgetCategoryAuditBody: document.querySelector("#budget-category-audit-body"),
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

function formatCompactMoney(value, available = true) {
  if (!available) return NO_DATA;
  const number = safeNumber(value);
  const sign = number < 0 ? "-" : "";
  const absolute = Math.abs(number);
  if (absolute >= 1000) return sign + numberFormatter.format(Math.round(absolute / 1000)) + "K ₪";
  return formatMoney(number);
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

function truthyRuleValue(value, fallback = true) {
  const text = clean(value).toLowerCase();
  if (!text) return fallback;
  return ["כן", "yes", "true", "1", "y"].includes(text);
}

function ruleValue(row, names) {
  const keys = Object.keys(row || {});
  const normalizedNames = names.map((name) => clean(name).replace(/\s+/g, " ").toLowerCase());
  const key = keys.find((candidate) => normalizedNames.includes(clean(candidate).replace(/\s+/g, " ").toLowerCase()));
  return key ? safeText(row[key], "") : "";
}

function normalizeBudgetRules(payload) {
  const rules = payload?.tables?.COST_RULES || payload?.costRules || [];
  return (Array.isArray(rules) ? rules : []).map((rule) => {
    const category = ruleValue(rule, ["סעיף תקציבי", "category", "name", "סעיף", "קטגוריה"]);
    const requiresBudget = truthyRuleValue(ruleValue(rule, ["דורש תקציב", "requiresBudget"]), false);
    const showOnDashboard = truthyRuleValue(ruleValue(rule, ["להציג באתר", "showOnDashboard", "display"]), false);
    const budgetSource = ruleValue(rule, ["מקור חישוב התקציב", "מקור חישוב תקציב", "budgetSource"]).toUpperCase();
    const actualSource = ruleValue(rule, ["מקור הביצוע בפועל", "מקור הביצוע", "actualSource"]).toUpperCase();
    return {
      category,
      basis: ruleValue(rule, ["בסיס לחישוב", "basis"]),
      additionalBasis: ruleValue(rule, ["בסיס נוסף", "additionalBasis"]),
      amount: safeNumber(ruleValue(rule, ["ערך", "amount", "rate"])),
      period: ruleValue(rule, ["תקופה", "period"]),
      divisor: safeNumber(ruleValue(rule, ["חלוקה", "divisor"]) || 1) || 1,
      daycare: ruleValue(rule, ["מעון חריג", "daycare", "department"]),
      requiresBudget,
      showOnDashboard,
      budgetSource,
      actualSource,
    };
  }).filter((rule) => rule.category);
}

function normalizeBudget(payload) {
  const groups = payload?.budget?.byDaycareMonth || payload?.byDaycareMonth || [];
  const normalizedGroups = (Array.isArray(groups) ? groups : []).map((group) => {
    const capacityValue = group.capacity ?? group.childCapacity ?? group.childrenCapacity ?? group.maxChildren;
    const calculatedCosts = Array.isArray(group.calculatedCosts) ? group.calculatedCosts : [];
    return {
      unit: safeText(group.daycare),
      month: safeText(group.month, ""),
      children: safeNumber(group.children),
      hasChildren: valueExists(group.children),
      activeClasses: safeNumber(group.classroomCount ?? group.activeClasses ?? group.classrooms),
      hasActiveClasses: valueExists(group.classroomCount ?? group.activeClasses ?? group.classrooms),
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
        ruleAmount: safeNumber(cost.amount ?? cost.rate ?? cost.cost),
        basis: safeText(cost.basis, ""),
        additionalBasis: safeText(cost.additionalBasis, ""),
        period: safeText(cost.period, ""),
        quantity: safeNumber(cost.quantity),
        additionalQuantity: safeNumber(cost.additionalQuantity),
        divisor: safeNumber(cost.divisor || 1),
        sourceDaycare: safeText(cost.sourceDaycare, ""),
        sourceMonth: safeText(cost.sourceMonth, ""),
        month: safeText(group.month, ""),
        unit: safeText(group.daycare),
      })).filter((cost) => cost.category),
    };
  }).filter((group) => group.unit && group.month);
  return { groups: normalizedGroups, rules: normalizeBudgetRules(payload) };
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

function allDataMonths() {
  return unique([...dashboardData.budgetGroups.map((row) => row.month), ...dashboardData.payrollGroups.map((row) => row.month), ...dashboardData.allocationRows.map((row) => row.month)]).sort(compareMonths);
}

function currentMonthValue() {
  const now = new Date();
  return String(now.getMonth() + 1).padStart(2, "0") + "/" + now.getFullYear();
}

function selectedMonthlyValue() {
  if (!state.months.includes("all")) {
    return [...state.months].sort(compareMonths).at(-1) || "";
  }
  const current = currentMonthValue();
  const months = allDataMonths();
  return months.includes(current) ? current : current;
}

function monthlyDataForDisplay() {
  const month = selectedMonthlyValue();
  return {
    month,
    data: month ? filteredDataForMonthSet(new Set([month])) : filteredDataForMonthSet(new Set()),
  };
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
    budgetRules: dashboardData.budgetRules,
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
    budgetRules: base.budgetRules,
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
    const payrollRows = data.payrollRows.filter((row) => row.unit === unit);
    const allocations = data.allocationGroups.filter((row) => row.unit === unit);
    const allocationRows = data.allocationRows.filter((row) => row.unit === unit);
    const requiredHours = sum(budget, "requiredHours");
    const payrollHours = sum(payroll, "payrollHours");
    const budgetUse = budgetUtilization({ budgetGroups: budget, allocationRows, payrollGroups: payroll, payrollRows }, "all");
    const monthly = monthlyDataForDisplay().data;
    const monthlyBudget = monthly.budgetGroups.filter((row) => row.unit === unit);
    const monthlyPayroll = monthly.payrollGroups.filter((row) => row.unit === unit);
    const monthlyPayrollRows = monthly.payrollRows.filter((row) => row.unit === unit);
    const monthlyAllocations = monthly.allocationGroups.filter((row) => row.unit === unit);
    const monthlyAllocationRows = monthly.allocationRows.filter((row) => row.unit === unit);
    const monthlyChildren = monthlyBudget.reduce((value, row) => value + safeNumber(row.children), 0);
    const monthlyActiveClasses = sum(monthlyBudget, "activeClasses");
    const monthlyCapacity = monthlyBudget.some((item) => item.hasCapacity) ? sum(monthlyBudget.filter((item) => item.hasCapacity), "capacity") : null;
    const monthlyRequiredHours = sum(monthlyBudget, "requiredHours");
    const monthlyPayrollHours = sum(monthlyPayroll, "payrollHours");
    const monthlyBudgetUse = budgetUtilization({ budgetGroups: monthlyBudget, allocationRows: monthlyAllocationRows, payrollGroups: monthlyPayroll, payrollRows: monthlyPayrollRows }, "all");
    const row = {
      unit,
      type: unitType(unit, dashboardData),
      hasBudget: hasRows(budget),
      hasPayroll: hasRows(payroll),
      hasAllocations: hasRows(allocations),
      children: monthlyChildren,
      hasChildren: monthlyBudget.some((item) => item.hasChildren),
      activeClasses: monthlyActiveClasses,
      hasActiveClasses: monthlyBudget.some((item) => item.hasActiveClasses),
      capacity: monthlyCapacity,
      hasCapacity: monthlyBudget.some((item) => item.hasCapacity),
      monthlyRequiredHours,
      hasMonthlyRequiredHours: monthlyBudget.some((item) => item.hasRequiredHours),
      monthlyPayrollHours,
      hasMonthlyPayroll: hasRows(monthlyPayroll),
      monthlyStaffingCoverage: coveragePercent(monthlyPayrollHours, monthlyRequiredHours),
      monthlyIncome: sum(monthlyAllocations, "income"),
      monthlyExpenses: sum(monthlyAllocations, "expenses"),
      hasMonthlyAllocations: hasRows(monthlyAllocations),
      monthlyPayrollCost: sum(monthlyPayroll, "payrollCost"),
      monthlyBudgetUsePercent: monthlyBudgetUse.percent,
      monthlyBudgetUseActual: monthlyBudgetUse.actual,
      monthlyBudgetUseBudget: monthlyBudgetUse.budget,
      hasMonthlyBudgetUse: monthlyBudgetUse.hasBudget || monthlyBudgetUse.actual > 0,
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
    const hoursDiff = row.monthlyPayrollHours - row.monthlyRequiredHours;
    const employeeDiff = row.payrollEmployees - row.requiredEmployees;
    if (row.type === "daycare" && row.hasBudget && !row.hasCapacity && row.hasChildren) issues.push({ category: "operational", severity: "yellow", unit: row.unit, month: periodLabel, count: 1, label: "חסרה קיבולת" });
    if (row.type === "daycare" && row.hasCapacity && row.children > row.capacity) issues.push({ category: "operational", severity: "red", unit: row.unit, month: periodLabel, count: row.children - row.capacity, label: "ילדים מעל קיבולת" });
    if (row.hasMonthlyRequiredHours && row.hasMonthlyPayroll && hoursDiff < 0) issues.push({ category: "operational", severity: "red", unit: row.unit, month: periodLabel, count: Math.abs(Math.round(hoursDiff)), label: "שעות מטפלות נמוכות מהנדרש" });
    if (row.hasMonthlyRequiredHours && row.hasMonthlyPayroll && hoursDiff > 0) issues.push({ category: "operational", severity: "yellow", unit: row.unit, month: periodLabel, count: Math.round(hoursDiff), label: "שעות מטפלות גבוהות מהנדרש" });
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
  const hasRequired = row.hasMonthlyRequiredHours ?? row.hasRequiredHours;
  const hasPayroll = row.hasMonthlyPayroll ?? row.hasPayroll;
  const coverage = row.monthlyStaffingCoverage ?? row.staffingCoverage;
  if (!hasRequired || !hasPayroll || coverage === null) return "yellow";
  if (coverage >= STATUS_THRESHOLDS.hoursCoverageGreenAt) return "green";
  if (coverage >= STATUS_THRESHOLDS.hoursCoverageYellowAt) return "yellow";
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
  const categories = visibleBudgetCategories();
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
  if (category !== "all" && !budgetCategoryRequiresBudget(category)) return 0;
  return group.calculatedCosts
    .filter((cost) => category === "all" ? budgetCategoryVisible(cost.category) && budgetCategoryRequiresBudget(cost.category) : cost.category === category)
    .reduce((total, cost) => total + safeNumber(cost.amount), 0);
}

function ruleSourcesForCategory(category, sourceField) {
  return unique(dashboardData.budgetRules
    .filter((rule) => rule.showOnDashboard && (category === "all" || rule.category === category))
    .map((rule) => rule[sourceField]));
}

function budgetRulesForCategory(category = "all") {
  return dashboardData.budgetRules.filter((rule) => rule.showOnDashboard && (category === "all" || rule.category === category));
}

function budgetCategoryVisible(category) {
  return budgetRulesForCategory(category).length > 0;
}

function budgetCategoryRequiresBudget(category) {
  const rules = budgetRulesForCategory(category);
  return rules.some((rule) => rule.requiresBudget);
}

function visibleBudgetCategories() {
  return unique(dashboardData.budgetRules.filter((rule) => rule.showOnDashboard).map((rule) => rule.category));
}

function payrollActualForCategory(data, category = "all") {
  const categories = category === "all" ? visibleBudgetCategories().filter((item) => ruleSourcesForCategory(item, "actualSource").includes("PAYROLL")) : [category];
  return (data.payrollRows || [])
    .filter((row) => categories.includes(row.className))
    .reduce((total, row) => total + safeNumber(row.cost), 0);
}

function bankActualForCategory(data, category = "all") {
  const categories = category === "all" ? visibleBudgetCategories().filter((item) => ruleSourcesForCategory(item, "actualSource").includes("BANKS")) : [category];
  return data.allocationRows
    .filter((row) => !row.excludedFromCalculations && row.debit > 0 && categories.includes(row.accountingCategory))
    .reduce((total, row) => total + row.debit, 0);
}

function budgetUtilization(data, category = "all") {
  const budget = data.budgetGroups.reduce((total, group) => total + budgetAmountForGroup(group, category), 0);
  const actualSources = ruleSourcesForCategory(category, "actualSource");
  const bankExpenses = actualSources.includes("BANKS") ? bankActualForCategory(data, category) : 0;
  const payrollSalary = actualSources.includes("PAYROLL") ? payrollActualForCategory(data, category) : 0;
  const actual = bankExpenses + payrollSalary;
  const percent = budget > 0 ? actual / budget * 100 : null;
  const requiresBudget = category === "all" ? budgetRulesForCategory("all").some((rule) => rule.requiresBudget) : budgetCategoryRequiresBudget(category);
  return { budget, actual, percent, hasBudget: requiresBudget && budget > 0, requiresBudget };
}

function incomeBudget(data) {
  return sum(data.budgetGroups, "budgetRevenue");
}

function expenseBudget(data) {
  return data.budgetGroups.reduce((total, group) => total + budgetAmountForGroup(group, "all"), 0);
}

function trueFinancialResult(income, expenses, payrollCost) {
  return safeNumber(income) - safeNumber(expenses) - safeNumber(payrollCost);
}

function financialResultLabel(value) {
  return safeNumber(value) >= 0 ? "עודף" : "גרעון";
}

function actualIncomeUtilization(expenses, payrollCost, income) {
  const actualIncome = safeNumber(income);
  const actualCost = safeNumber(expenses) + safeNumber(payrollCost);
  return {
    actualIncome,
    actualCost,
    percent: actualIncome > 0 ? actualCost / actualIncome * 100 : null,
    hasIncome: actualIncome > 0,
  };
}

function actualBudgetLine(actual, budget, actualAvailable = true) {
  if (budget > 0) return formatMoney(actual, actualAvailable) + " / " + formatMoney(budget);
  return formatMoney(actual, actualAvailable) + " · לא הוגדר תקציב";
}

function staffingGapLine(actual, required, actualAvailable, requiredAvailable) {
  if (!actualAvailable || !requiredAvailable || safeNumber(required) <= 0) return "אין נתון להשוואת שעות";
  const diff = safeNumber(actual) - safeNumber(required);
  if (diff === 0) return "בדיוק לפי התקן";
  return (diff > 0 ? "עודף " : "חסר ") + numberFormatter.format(Math.abs(diff)) + " שעות";
}

function budgetScopeLabel(scope) {
  return scope === "year" ? "מתוך תקציב מצטבר" : "מתוך תקציב חודשי";
}

function filteredDataForMonthSet(monthSet) {
  const base = {
    budgetGroups: dashboardData.budgetGroups,
    budgetRules: dashboardData.budgetRules,
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
    budgetRules: base.budgetRules,
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
  const categories = visibleBudgetCategories();
  const rows = [];
  data.allowedUnits.forEach((unit) => {
    categories.forEach((category) => {
      const currentData = {
        budgetGroups: data.budgetGroups.filter((row) => row.unit === unit),
        allocationRows: data.allocationRows.filter((row) => row.unit === unit),
        payrollGroups: data.payrollGroups.filter((row) => row.unit === unit),
        payrollRows: data.payrollRows.filter((row) => row.unit === unit),
      };
      const ytdUnitData = {
        budgetGroups: ytd.budgetGroups.filter((row) => row.unit === unit),
        allocationRows: ytd.allocationRows.filter((row) => row.unit === unit),
        payrollGroups: ytd.payrollGroups.filter((row) => row.unit === unit),
        payrollRows: ytd.payrollRows.filter((row) => row.unit === unit),
      };
      const current = budgetUtilization(currentData, category);
      const sinceSeptember = budgetUtilization(ytdUnitData, category);
      if (!current.requiresBudget && !sinceSeptember.requiresBudget) return;
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

function actualFinancialSourceRows(data) {
  const incomeRows = bankSourceRows(data, "income").map((row) => ({ ...row, rowType: "הכנסה בפועל", source: "BANKS > זכות" }));
  const expenseRows = bankSourceRows(data, "expenses").map((row) => ({ ...row, rowType: "הוצאה בפועל", source: "BANKS > חובה" }));
  const payrollRows = payrollSourceRows(data, false).map((row) => ({ ...row, rowType: "שכר בפועל", source: "PAYROLL", category: "שכר" }));
  return [...incomeRows, ...expenseRows, ...payrollRows];
}

function budgetUtilizationRows(data, category = state.category) {
  const budgetRows = data.budgetGroups.flatMap((group) => group.calculatedCosts
    .filter((cost) => budgetCategoryVisible(cost.category) && budgetCategoryRequiresBudget(cost.category) && (category === "all" || cost.category === category))
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
    .filter((row) => !row.excludedFromCalculations && row.debit > 0 && ruleSourcesForCategory(row.accountingCategory, "actualSource").includes("BANKS") && (category === "all" || row.accountingCategory === category))
    .map((row) => ({
      rowType: "בפועל",
      month: row.month,
      unit: row.unit,
      category: row.accountingCategory,
      amount: moneyFormatter.format(row.debit),
      description: row.notes || row.reference || row.cashDate,
      rawAmount: row.debit,
    }));
  const payrollRows = data.payrollRows
    .filter((row) => ruleSourcesForCategory(row.className, "actualSource").includes("PAYROLL") && (category === "all" || row.className === category))
    .map((row) => ({
    rowType: "בפועל",
    month: row.month,
    unit: row.unit,
    category: row.className,
    amount: moneyFormatter.format(row.cost),
    description: row.employee || "PAYROLL salary cost",
    rawAmount: row.cost,
  }));
  return [...budgetRows, ...actualRows, ...payrollRows];
}

function calculationMethodFromCost(cost) {
  const basis = clean(cost.basis).toLowerCase();
  const additionalBasis = clean(cost.additionalBasis);
  const divisor = safeNumber(cost.divisor || 1);
  if (additionalBasis || divisor !== 1) return "formula";
  if (["fixed", "קבוע"].includes(basis)) return "fixed";
  if (["fixed/monthly", "monthly", "חודשי", "קבוע חודשי"].includes(basis)) return "monthly";
  if (["children", "child", "kids", "ילדים", "ילד", "כמות ילדים"].includes(basis)) return "per_child";
  if (["hourly", "hours", "hour", "שעות", "שעתי"].includes(basis)) return "per_hour";
  if (["staff", "team", "positions", "תקנים", "צוות", "משרות"].includes(basis)) return "staffing_standard";
  if (["classrooms", "classroom", "classes", "כיתות", "כיתה", "work days", "work_days", "days", "ימי עבודה", "ימי פעילות"].includes(basis)) return "quantity";
  return "unknown";
}

function problemForBudgetCategory(row) {
  if (!row.showOnDashboard) return "hidden";
  if (!row.requiresBudget) return "none";
  if (row.appearsInActual === "yes" && row.appearsInBudget === "no") return "missing_budget";
  if (row.appearsInBudget === "yes" && safeNumber(row.budgetAmountRaw) === 0) return "zero_budget";
  if (row.appearsInBudget === "yes" && row.appearsInActual === "no") return "missing_actual";
  if (row.appearsInBudget === "yes" && row.calculationMethod === "unknown") return "unknown_calculation";
  if (!row.budgetSource && !row.actualSource) return "source_mismatch";
  return "none";
}

function buildBudgetCategoryAuditRows(data) {
  const map = new Map();
  function ensure(categoryName, rule = null) {
    const key = clean(categoryName) || "ללא סעיף";
    if (!map.has(key)) {
      map.set(key, {
        categoryName: key,
        categoryType: "other",
        appearsInBudget: "no",
        appearsInActual: "no",
        budgetSource: "",
        actualSource: "",
        requiresBudget: false,
        showOnDashboard: true,
        budgetAmountRaw: 0,
        actualAmountRaw: 0,
        calculationMethod: "unknown",
        calculationFieldsUsed: "",
        monthLogic: "מסונן לפי month של קבוצת התקציב / עבור חודש בביצוע",
        departmentLogic: "מסונן לפי daycare בתקציב / עבור מחלקה בביצוע",
        problem: "none",
      });
    }
    const row = map.get(key);
    if (rule) {
      row.requiresBudget = row.requiresBudget || rule.requiresBudget;
      row.showOnDashboard = row.showOnDashboard && rule.showOnDashboard;
      row.budgetSource = unique([row.budgetSource, rule.budgetSource].filter(Boolean)).join(", ");
      row.actualSource = unique([row.actualSource, rule.actualSource].filter(Boolean)).join(", ");
      row.appearsInBudget = row.requiresBudget ? "yes" : "no";
      if (rule.actualSource === "PAYROLL") row.categoryType = "payroll";
      if (rule.actualSource === "BANKS" && row.categoryType === "other") row.categoryType = "expense";
    }
    return row;
  }

  budgetRulesForCategory("all").forEach((rule) => ensure(rule.category, rule));

  data.budgetGroups.forEach((group) => {
    group.calculatedCosts.forEach((cost) => {
      if (!budgetCategoryVisible(cost.category) || !budgetCategoryRequiresBudget(cost.category)) return;
      const row = ensure(cost.category);
      const method = calculationMethodFromCost(cost);
      row.budgetAmountRaw += safeNumber(cost.amount);
      if (row.calculationMethod === "unknown" || method === "formula") row.calculationMethod = method;
      row.calculationFieldsUsed = unique([
        row.calculationFieldsUsed,
        "basis=" + (cost.basis || "empty"),
        "additionalBasis=" + (cost.additionalBasis || "empty"),
        "quantity=" + safeNumber(cost.quantity),
        "additionalQuantity=" + safeNumber(cost.additionalQuantity),
        "amount=" + safeNumber(cost.ruleAmount),
        "divisor=" + safeNumber(cost.divisor || 1),
      ]).join(" | ");
      if (method === "staffing_standard") row.categoryType = "staff";
      if (row.categoryType === "other" && row.appearsInActual === "yes") row.categoryType = "expense";
    });
  });

  data.allocationRows
    .filter((row) => !row.excludedFromCalculations && row.debit > 0 && ruleSourcesForCategory(row.accountingCategory, "actualSource").includes("BANKS"))
    .forEach((item) => {
      const row = ensure(item.accountingCategory || "ללא סעיף");
      row.appearsInActual = "yes";
      row.actualAmountRaw += safeNumber(item.debit);
      if (row.categoryType === "other") row.categoryType = "expense";
    });

  data.payrollRows
    .filter((row) => ruleSourcesForCategory(row.className, "actualSource").includes("PAYROLL"))
    .forEach((item) => {
      const row = ensure(item.className);
      row.categoryType = "payroll";
      row.appearsInActual = "yes";
      row.actualAmountRaw += safeNumber(item.cost);
    });

  return [...map.values()].filter((row) => row.showOnDashboard).map((row) => {
    const problem = problemForBudgetCategory(row);
    return {
      ...row,
      budgetAmount: moneyFormatter.format(row.budgetAmountRaw),
      actualAmount: moneyFormatter.format(row.actualAmountRaw),
      problem,
    };
  }).sort((a, b) => {
    const rank = { missing_budget: 0, zero_budget: 1, unknown_calculation: 2, source_mismatch: 3, missing_actual: 4, none: 5, hidden: 6 };
    return rank[a.problem] - rank[b.problem] || a.categoryName.localeCompare(b.categoryName, "he", { numeric: true });
  });
}

function budgetDeviationRows(data, category = state.category) {
  const rowsByKey = new Map();
  const ensure = (unit, month, itemCategory) => {
    const key = unit + "|" + month + "|" + itemCategory;
    if (!rowsByKey.has(key)) {
      rowsByKey.set(key, {
        unit,
        month,
        category: itemCategory,
        actualRaw: 0,
        budgetRaw: 0,
        bankSources: [],
        budgetSources: [],
      });
    }
    return rowsByKey.get(key);
  };
  data.budgetGroups.forEach((group) => {
    group.calculatedCosts
      .filter((cost) => budgetCategoryVisible(cost.category) && budgetCategoryRequiresBudget(cost.category) && (category === "all" || cost.category === category))
      .forEach((cost) => {
        const row = ensure(group.unit, group.month, cost.category);
        row.budgetRaw += safeNumber(cost.amount);
        row.budgetSources.push("BUDGET calculatedCosts");
      });
  });
  data.allocationRows
    .filter((row) => !row.excludedFromCalculations && row.debit > 0 && ruleSourcesForCategory(row.accountingCategory, "actualSource").includes("BANKS") && (category === "all" || row.accountingCategory === category))
    .forEach((bankRow) => {
      const row = ensure(bankRow.unit, bankRow.month, bankRow.accountingCategory);
      row.actualRaw += safeNumber(bankRow.debit);
      row.bankSources.push(bankRow.reference || bankRow.cashDate || bankRow.notes || "BANKS row");
    });
  data.payrollRows
    .filter((row) => ruleSourcesForCategory(row.className, "actualSource").includes("PAYROLL") && (category === "all" || row.className === category))
    .forEach((payrollRow) => {
      const row = ensure(payrollRow.unit, payrollRow.month, payrollRow.className);
      row.actualRaw += safeNumber(payrollRow.cost);
      row.bankSources.push(payrollRow.employee || "PAYROLL salary cost");
    });
  return [...rowsByKey.values()].map((row) => {
    const difference = row.actualRaw - row.budgetRaw;
    const hasBudget = row.budgetRaw > 0;
    return {
      category: row.category,
      unit: row.unit,
      period: row.month,
      actual: formatMoney(row.actualRaw, row.actualRaw > 0 || hasBudget),
      budget: hasBudget ? formatMoney(row.budgetRaw) : "לא נמצא מקור תקציב ברור",
      difference: hasBudget ? formatMoney(difference) : "לא הוגדר",
      utilization: hasBudget ? formatPercent(row.actualRaw / row.budgetRaw * 100) : "אין אחוז ניצול",
      budgetRule: "existing BUDGET calculatedCosts",
      bankRows: row.bankSources.length ? row.bankSources.join(", ") : "אין שורות BANKS",
      budgetRows: row.budgetSources.length ? row.budgetSources.join(", ") : "לא נמצא מקור תקציב ברור",
      sortAmount: hasBudget ? Math.abs(difference) : row.actualRaw,
    };
  }).sort((a, b) => b.sortAmount - a.sortAmount);
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
  const budgetDeviationColumns = [
    { key: "category", label: "סעיף" }, { key: "unit", label: "יחידה" }, { key: "period", label: "תקופה" },
    { key: "actual", label: "בפועל" }, { key: "budget", label: "תקציב" }, { key: "difference", label: "פער" },
    { key: "utilization", label: "ניצול" }, { key: "budgetRule", label: "כלל תקציב" },
    { key: "bankRows", label: "שורות BANKS" }, { key: "budgetRows", label: "שורות BUDGET" },
  ];
  const actualFinancialColumns = [
    { key: "rowType", label: "סוג" }, { key: "source", label: "מקור" }, { key: "month", label: "חודש" },
    { key: "unit", label: "יחידה" }, { key: "category", label: "סעיף" }, { key: "amount", label: "סכום" },
    { key: "description", label: "פירוט" },
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
    const totals = periodTotals(data);
    const rows = actualFinancialSourceRows(data);
    const display = totals.incomeUtilization.hasIncome ? formatPercent(totals.incomeUtilization.percent) : "אין נתוני הכנסה";
    return baseExplanation(metricId, "ניצול תקציב", display, "BANKS + PAYROLL", "הוצאות בפועל ושכר בפועל מתוך הכנסות בפועל.", rows.length + " שורות הכנסה, הוצאה ושכר זמינות לבדיקה.", display, rows, actualFinancialColumns);
  }
  if (metricId === "true-financial-result") {
    const totals = periodTotals(data);
    const rows = actualFinancialSourceRows(data);
    return baseExplanation(metricId, "תוצאה כספית בפועל", formatMoney(totals.financialResult, totals.hasAllocations || totals.hasPayroll), "BANKS + PAYROLL", "הכנסות בפועל פחות הוצאות בפועל פחות עלות שכר בפועל.", rows.length + " שורות הכנסה, הוצאה ושכר זמינות לבדיקה.", financialResultLabel(totals.financialResult) + " · " + formatMoney(totals.financialResult, totals.hasAllocations || totals.hasPayroll), rows, actualFinancialColumns);
  }
  if (metricId === "financial-exceptions") {
    const exceptions = buildFinancialExceptions(data);
    const rows = budgetDeviationRows(data, "all");
    return baseExplanation(metricId, "חריגות תקציב וכספים", exceptions.length ? numberFormatter.format(exceptions.length) : "אין", "BUDGET + BANKS", "סעיפים שמגיעים ל-90% ניצול או עוברים תקציב, בתקופה הנבחרת או מתחילת שנת הלימודים.", exceptions.length + " חריגות נמצאו. ההסבר מציג סעיף, יחידה, תקופה, בפועל, תקציב, פער, ניצול ושורות מקור.", exceptions.length ? numberFormatter.format(exceptions.length) : "אין", rows, budgetDeviationColumns);
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
  if (els.selectedMonthLabel) els.selectedMonthLabel.textContent = selectedMonthsLabel() + " · " + selectedUnitsLabel();
  const financialExceptions = buildFinancialExceptions(data);
  const healthyUnits = unitRows.filter((row) => row.status === "green").length;
  const warningUnits = unitRows.filter((row) => row.status === "yellow").length;
  const criticalUnits = unitRows.filter((row) => row.status === "red").length;
  const staffingCritical = unitRows.filter((row) => hoursCoverageStatus(row) === "red").length;
  const staffingWarning = unitRows.filter((row) => hoursCoverageStatus(row) === "yellow").length;
  const staffingHealthy = unitRows.filter((row) => hoursCoverageStatus(row) === "green").length;
  const missingDocs = data.allocationRows.filter((row) => clean(row.accountingStatus).includes("חסר")).length;
  const waitingDocs = data.allocationRows.filter((row) => clean(row.accountingStatus).includes("מחכה")).length;
  const sentDocs = data.allocationRows.filter((row) => clean(row.accountingStatus).includes("נשלח")).length;
  const accountingIssues = waitingDocs + missingDocs;
  const cards = [
    { label: "תקינים", value: numberFormatter.format(healthyUnits), sub: "יחידות בריאות", tone: "balance", metricId: "" },
    { label: "דורשים טיפול", value: numberFormatter.format(warningUnits), sub: "יחידות באזהרה", tone: warningUnits ? "expense" : "balance", metricId: "" },
    { label: "קריטיים", value: numberFormatter.format(criticalUnits), sub: "יחידות קריטיות", tone: criticalUnits ? "attention" : "balance", metricId: "" },
    { label: "תקציב", value: financialExceptions.length ? numberFormatter.format(financialExceptions.length) + " חריגות" : "תקין", sub: financialExceptions.length ? "סעיפים דורשים בדיקה" : "אין חריגה בתקופה", tone: financialExceptions.some((item) => item.tone === "attention") ? "attention" : financialExceptions.length ? "expense" : "balance", metricId: "financial-exceptions" },
    { label: "הנה\"ח", value: accountingIssues ? numberFormatter.format(accountingIssues) + " לטיפול" : "תקין", sub: numberFormatter.format(sentDocs) + " נשלח · " + numberFormatter.format(waitingDocs) + " מחכה · " + numberFormatter.format(missingDocs) + " חסר", tone: missingDocs ? "attention" : waitingDocs ? "expense" : "balance", metricId: "" },
    { label: "שעות", value: (staffingWarning + staffingCritical) ? numberFormatter.format(staffingWarning + staffingCritical) + " לטיפול" : "תקין", sub: numberFormatter.format(staffingHealthy) + " תקינים · " + numberFormatter.format(staffingWarning) + " אזהרה · " + numberFormatter.format(staffingCritical) + " קריטי", tone: staffingCritical ? "attention" : staffingWarning ? "expense" : "balance", metricId: "staffing-coverage" },
  ];
  if (els.statusGrid) els.statusGrid.innerHTML = cards.map((card) => kpiCard(card.label, card.value, card.sub, card.tone, card.metricId)).join("");
  return cards;
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
    const currentBalance = row.monthlyIncome - row.monthlyExpenses;
    const ytdBalance = safeNumber(ytd.income) - safeNumber(ytd.expenses);
    const budgetStatus = row.hasMonthlyBudgetUse && row.monthlyBudgetUsePercent !== null ? formatPercent(row.monthlyBudgetUsePercent) : "לא הוגדר";
    const coverage = row.hasMonthlyRequiredHours && row.hasMonthlyPayroll ? formatPercent(row.monthlyStaffingCoverage) : "חסר";
    return '<article class="daycare-card management-unit-card compact-unit-card status-' + row.status + '"><div class="unit-status-ribbon">' + escapeHtml(statusLabel(row.status)) + '</div><div class="compact-unit-head"><h3>' + escapeHtml(row.unit) + '</h3><b>' + escapeHtml(coverage) + '</b><span>' + escapeHtml(row.issueCount ? numberFormatter.format(row.issueCount) + " לטיפול" : "תקין") + '</span></div><dl class="unit-status-list compressed"><div><dt>חודש</dt><dd>' + escapeHtml(formatCompactMoney(row.monthlyIncome, row.hasMonthlyAllocations)) + ' | ' + escapeHtml(formatCompactMoney(row.monthlyExpenses, row.hasMonthlyAllocations)) + ' | ' + escapeHtml(formatCompactMoney(currentBalance, row.hasMonthlyAllocations)) + '</dd></div><div><dt>שנה</dt><dd>' + escapeHtml(formatCompactMoney(ytd.income, ytd.hasAllocations)) + ' | ' + escapeHtml(formatCompactMoney(ytd.expenses, ytd.hasAllocations)) + ' | ' + escapeHtml(formatCompactMoney(ytdBalance, ytd.hasAllocations)) + '</dd></div><div><dt>שכר</dt><dd>' + escapeHtml(formatCompactMoney(row.monthlyPayrollCost, row.hasMonthlyPayroll)) + '</dd></div><div><dt>שעות</dt><dd>' + escapeHtml(formatNumber(row.monthlyPayrollHours, row.hasMonthlyPayroll)) + ' / ' + escapeHtml(formatNumber(row.monthlyRequiredHours, row.hasMonthlyRequiredHours)) + '</dd></div><div><dt>ילדים</dt><dd>' + escapeHtml(formatNumber(row.children, row.hasChildren)) + '</dd></div><div><dt>כיתות</dt><dd>' + escapeHtml(formatNumber(row.activeClasses, row.hasActiveClasses)) + '</dd></div><div><dt>תקציב</dt><dd>' + escapeHtml(budgetStatus) + '</dd></div></dl></article>';
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
  if (!utilization.requiresBudget) return formatMoney(utilization.actual, utilization.actual > 0) + " · לא נדרש תקציב";
  if (!utilization.hasBudget) return formatMoney(utilization.actual, utilization.actual > 0) + " · לא הוגדר תקציב";
  const percent = formatPercent(utilization.percent, utilization.percent !== null);
  return formatMoney(utilization.actual, utilization.actual > 0 || utilization.hasBudget) + " / " + formatMoney(utilization.budget, utilization.hasBudget) + " · " + percent;
}

function budgetCategorySummaryLabel(utilization) {
  if (!utilization.requiresBudget) return "ביצוע בלבד";
  return utilization.hasBudget ? formatPercent(utilization.percent) + " ניצול" : "לא הוגדר תקציב";
}

function budgetCategoryBudgetText(utilization) {
  if (!utilization.requiresBudget) return "לא נדרש תקציב";
  return utilization.hasBudget ? formatMoney(utilization.budget) : "לא הוגדר תקציב";
}

function budgetCategoryPercentText(utilization, periodLabel) {
  if (!utilization.requiresBudget) return "סעיף ביצוע בלבד";
  return utilization.hasBudget ? formatPercent(utilization.percent) + " מתוך " + periodLabel : "אין אחוז ניצול";
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
  const incomePlan = incomeBudget(data);
  const expensePlan = expenseBudget(data);
  const salary = sum(data.payrollGroups, "payrollCost");
  const requiredHours = sum(data.budgetGroups, "requiredHours");
  const payrollHours = sum(data.payrollGroups, "payrollHours");
  const actualStaff = staffCountForData(data);
  const requiredStaff = sum(data.budgetGroups, "requiredEmployees");
  const children = sum(data.budgetGroups, "children");
  const utilization = budgetUtilization(data, state.category);
  const financialResult = trueFinancialResult(income, expenses, salary);
  const incomeUtilization = actualIncomeUtilization(expenses, salary, income);
  return {
    income,
    expenses,
    incomePlan,
    expensePlan,
    balance: income - expenses,
    financialResult,
    incomeUtilization,
    salary,
    payrollHours,
    requiredHours,
    coverage: coveragePercent(payrollHours, requiredHours),
    actualStaff,
    requiredStaff,
    children,
    utilization,
    hasAllocations: hasRows(data.allocationGroups),
    hasPayroll: hasRows(data.payrollGroups),
    hasBudget: hasRows(data.budgetGroups),
    hasRequiredStaff: data.budgetGroups.some((item) => item.hasRequiredEmployees),
    hasChildren: data.budgetGroups.some((item) => item.hasChildren),
  };
}

function staffCountForData(data) {
  const employeeNames = unique((data.payrollRows || [])
    .map((row) => row.employee)
    .filter((employee) => clean(employee) && clean(employee) !== "לא צוין עובד"));
  if (employeeNames.length) return { count: employeeNames.length, hasActual: true, source: "payrollRows.employee" };
  const groupedCount = sum(data.payrollGroups, "employeeCount");
  return { count: groupedCount, hasActual: hasRows(data.payrollGroups) && groupedCount > 0, source: "payrollGroups.employeeCount" };
}

function staffCountLine(totals) {
  if (!totals.actualStaff.hasActual) return "אין נתון צוות בפועל";
  return formatNumber(totals.actualStaff.count) + " / " + formatNumber(totals.requiredStaff, totals.hasRequiredStaff);
}

function staffCountSub(totals) {
  if (!totals.actualStaff.hasActual && totals.hasRequiredStaff) return "תקן נדרש: " + formatNumber(totals.requiredStaff);
  if (!totals.actualStaff.hasActual) return "אין מזהה עובד אמין בנתוני PAYROLL";
  return totals.hasRequiredStaff ? "בפועל / תקן נדרש" : "בפועל · אין תקן נדרש";
}

function renderPeriodSummary(data, statusCards = []) {
  const totals = periodTotals(data);
  const monthly = monthlyDataForDisplay();
  const monthlyTotals = periodTotals(monthly.data);
  els.currentPeriodLabel.textContent = selectedMonthsLabel();
  const utilizationText = totals.incomeUtilization.hasIncome ? formatPercent(totals.incomeUtilization.percent) : "אין נתוני הכנסה";
  const cards = [
    { label: "הכנסות", value: actualBudgetLine(totals.income, totals.incomePlan, totals.hasAllocations), sub: budgetScopeLabel("month"), tone: "income", metricId: "income" },
    { label: "הוצאות", value: actualBudgetLine(totals.expenses, totals.expensePlan, totals.hasAllocations), sub: budgetScopeLabel("month"), tone: "expense", metricId: "expenses" },
    { label: "שכר", value: formatMoney(totals.salary, totals.hasPayroll), sub: "PAYROLL, לא BANKS", tone: "payroll", metricId: "salary-cost" },
    { label: "תוצאה כספית בפועל", value: formatMoney(totals.financialResult, totals.hasAllocations || totals.hasPayroll), sub: financialResultLabel(totals.financialResult) + " · הכנסות בפועל פחות הוצאות בפועל פחות עלות שכר בפועל", tone: balanceTone(totals.financialResult, totals.hasAllocations || totals.hasPayroll), metricId: "true-financial-result" },
    { label: "ניצול תקציב", value: utilizationText, sub: totals.incomeUtilization.hasIncome ? "הוצאות בפועל ושכר בפועל מתוך הכנסות בפועל" : "אין נתוני הכנסה", tone: utilizationTone(totals.incomeUtilization.percent, totals.incomeUtilization.hasIncome, totals.incomeUtilization.actualCost), metricId: "budget-utilization" },
    { label: "שעות מטפלות", value: formatNumber(monthlyTotals.payrollHours, monthlyTotals.hasPayroll) + " / " + formatNumber(monthlyTotals.requiredHours, monthlyTotals.hasBudget), sub: monthly.month + " · " + formatPercent(monthlyTotals.coverage, monthlyTotals.hasPayroll && monthlyTotals.hasBudget) + " · " + staffingGapLine(monthlyTotals.payrollHours, monthlyTotals.requiredHours, monthlyTotals.hasPayroll, monthlyTotals.hasBudget), tone: coverageTone(monthlyTotals.coverage, monthlyTotals.hasPayroll && monthlyTotals.hasBudget), metricId: "staffing-coverage" },
    { label: "כמות צוות", value: staffCountLine(totals), sub: staffCountSub(totals), tone: totals.actualStaff.hasActual ? "payroll" : "attention", metricId: "staff-count" },
    { label: "כמות ילדים", value: formatNumber(totals.children, totals.hasChildren), sub: totals.hasChildren ? "לפי נתוני BUDGET במסננים שנבחרו" : "אין נתוני ילדים", tone: "children", metricId: "children-count" },
  ];
  els.currentPeriodGrid.innerHTML = cards.map((card) => kpiCard(card.label, card.value, card.sub, card.tone, card.metricId)).join("");
}

function renderSchoolYearSummary() {
  const data = ytdData();
  const totals = periodTotals(data);
  const utilizationText = totals.incomeUtilization.hasIncome ? formatPercent(totals.incomeUtilization.percent) : "אין נתוני הכנסה";
  const cards = [
    { label: "הכנסות", value: actualBudgetLine(totals.income, totals.incomePlan, totals.hasAllocations), sub: budgetScopeLabel("year"), tone: "income", metricId: "income" },
    { label: "הוצאות", value: actualBudgetLine(totals.expenses, totals.expensePlan, totals.hasAllocations), sub: budgetScopeLabel("year"), tone: "expense", metricId: "expenses" },
    { label: "תוצאה כספית בפועל", value: formatMoney(totals.financialResult, totals.hasAllocations || totals.hasPayroll), sub: financialResultLabel(totals.financialResult) + " · הכנסות בפועל פחות הוצאות בפועל פחות עלות שכר בפועל", tone: balanceTone(totals.financialResult, totals.hasAllocations || totals.hasPayroll), metricId: "true-financial-result" },
    { label: "ניצול תקציב", value: utilizationText, sub: totals.incomeUtilization.hasIncome ? "הוצאות בפועל ושכר בפועל מתוך הכנסות בפועל" : "אין נתוני הכנסה", tone: utilizationTone(totals.incomeUtilization.percent, totals.incomeUtilization.hasIncome, totals.incomeUtilization.actualCost), metricId: "budget-utilization" },
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

function budgetAuditProblemLabel(problem) {
  const labels = {
    none: "אין",
    missing_budget: "חסר תקציב",
    missing_actual: "אין ביצוע",
    zero_budget: "תקציב אפס",
    unknown_calculation: "חישוב לא ידוע",
    source_mismatch: "פער מקור",
    hidden: "מוסתר",
  };
  return labels[problem] || problem;
}

function renderBudgetCategoryAudit(data) {
  if (!els.budgetCategoryAuditBody) return;
  const rows = buildBudgetCategoryAuditRows(data);
  window.dashboardBudgetCategoryAudit = rows;
  const problemCount = rows.filter((row) => row.problem !== "none").length;
  if (els.budgetCategoryAuditCount) {
    els.budgetCategoryAuditCount.textContent = rows.length ? numberFormatter.format(rows.length) + " סעיפים · " + numberFormatter.format(problemCount) + " לבדיקה" : "אין סעיפים";
  }
  els.budgetCategoryAuditBody.innerHTML = rows.length ? rows.map((row) => (
    '<tr class="budget-audit-problem-' + escapeHtml(row.problem) + '">' +
      '<td>' + escapeHtml(row.categoryName) + '</td>' +
      '<td>' + escapeHtml(row.appearsInBudget === "yes" ? "כן" : "לא") + '</td>' +
      '<td>' + escapeHtml(row.appearsInActual === "yes" ? "כן" : "לא") + '</td>' +
      '<td>' + escapeHtml(row.calculationMethod) + '</td>' +
      '<td>' + escapeHtml(budgetAuditProblemLabel(row.problem)) + '</td>' +
    '</tr>'
  )).join("") : '<tr><td colspan="5">אין סעיפי תקציב או ביצוע להצגה במסננים הנוכחיים.</td></tr>';
}

function renderBudgetExplorer(data) {
  const monthly = monthlyDataForDisplay().data;
  const ytd = ytdData();
  const allCategories = visibleBudgetCategories();
  const categories = state.category === "all" ? allCategories : allCategories.filter((category) => category === state.category);
  if (!categories.length) {
    els.budgetExplorerGrid.innerHTML = '<p class="empty-state">אין סעיפי תקציב להצגה במסננים הנוכחיים.</p>';
    return;
  }
  els.budgetExplorerGrid.innerHTML = categories.map((category) => {
    const current = budgetUtilization(monthly, category);
    const sinceSeptember = budgetUtilization(ytd, category);
    const units = data.allowedUnits.map((unit) => {
      const unitData = {
        budgetGroups: monthly.budgetGroups.filter((row) => row.unit === unit),
        allocationRows: monthly.allocationRows.filter((row) => row.unit === unit),
        payrollGroups: monthly.payrollGroups.filter((row) => row.unit === unit),
        payrollRows: monthly.payrollRows.filter((row) => row.unit === unit),
      };
      return { unit, utilization: budgetUtilization(unitData, category) };
    }).filter((row) => row.utilization.actual > 0 || row.utilization.budget > 0);
    const tone = utilizationTone(Math.max(current.percent ?? 0, sinceSeptember.percent ?? 0), current.hasBudget || sinceSeptember.hasBudget, current.actual + sinceSeptember.actual);
    return '<details class="budget-category-card ' + tone + '-budget-category"><summary><strong>' + escapeHtml(category) + '</strong><span class="budget-category-snapshot"><span class="budget-category-utilization-label">ניצול</span><span class="budget-category-utilization-value">' + escapeHtml(current.hasBudget ? formatPercent(current.percent) : "0%") + '</span><span class="budget-category-divider" aria-hidden="true"></span><span class="budget-category-amounts">' + escapeHtml(formatMoney(current.actual, true)) + ' / ' + escapeHtml(formatMoney(current.budget, true)) + '</span><span class="budget-category-amount-labels"><span>בפועל</span><span>תקציב</span></span></span></summary><div class="budget-category-metrics"><div><b>חודש</b><span>' + escapeHtml(formatMoney(current.actual, current.actual > 0 || current.hasBudget)) + ' / ' + escapeHtml(budgetCategoryBudgetText(current)) + '</span><span>' + escapeHtml(budgetCategoryPercentText(current, "תקציב")) + '</span></div><div><b>שנה</b><span>' + escapeHtml(formatMoney(sinceSeptember.actual, sinceSeptember.actual > 0 || sinceSeptember.hasBudget)) + ' / ' + escapeHtml(budgetCategoryBudgetText(sinceSeptember)) + '</span><span>' + escapeHtml(budgetCategoryPercentText(sinceSeptember, "תקציב מצטבר")) + '</span></div></div><div class="budget-breakdown-list">' +
      (units.length ? units.map((row) => '<div class="budget-breakdown-row"><strong>' + escapeHtml(row.unit) + '</strong><span>' + escapeHtml(utilizationLine(row.utilization)) + '</span></div>').join("") : '<p class="empty-state">אין נתוני יחידות לסעיף זה.</p>') +
      '</div></details>';
  }).join("");
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
  const statusCards = renderStatus(data, unitRows, issues);
  renderPeriodSummary(data, statusCards);
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
  renderBudgetCategoryAudit(data);
  renderIssues(issues);
  renderInsights(data, issues);
  renderTables(data);
}

function renderLoadingState() {
  els.overallStatusLabel.textContent = "נטען";
  if (els.statusGrid) els.statusGrid.innerHTML = '<p class="empty-state">לוח הניהול נטען...</p>';
  els.currentPeriodGrid.innerHTML = '<p class="empty-state">לוח הניהול נטען...</p>';
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
  if (els.budgetCategoryAuditBody) els.budgetCategoryAuditBody.innerHTML = '<tr><td colspan="5">בדיקת סעיפי התקציב נטענת...</td></tr>';
  if (els.budgetCategoryAuditCount) els.budgetCategoryAuditCount.textContent = "נטען";
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

  if (requests[0].status === "fulfilled") {
    const budget = normalizeBudget(requests[0].value);
    dashboardData.budgetGroups = budget.groups;
    dashboardData.budgetRules = budget.rules;
  } else { dashboardData.budgetGroups = []; dashboardData.budgetRules = []; dashboardData.errors.push("אין נתוני תקציב"); }

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
