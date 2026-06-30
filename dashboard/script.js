const income = [
  { amount: 62000, category: "שכר לימוד", department: "מעון אשקלון", month: "2026-06", details: "גבייה חודשית מהורים" },
  { amount: 38800, category: "סבסוד", department: "מעון אשקלון", month: "2026-06", details: "תקבול משרד" },
  { amount: 54000, category: "שכר לימוד", department: "מעון ירושלים", month: "2026-06", details: "גבייה חודשית מהורים" },
  { amount: 31600, category: "סבסוד", department: "מעון ירושלים", month: "2026-06", details: "תקבול משרד" },
  { amount: 47200, category: "שכר לימוד", department: "מעון נתיבות", month: "2026-06", details: "גבייה חודשית מהורים" },
  { amount: 29400, category: "סבסוד", department: "מעון נתיבות", month: "2026-06", details: "תקבול משרד" },
  { amount: 43200, category: "שכר לימוד", department: "מעון באר שבע", month: "2026-06", details: "גבייה חודשית מהורים" },
  { amount: 25800, category: "סבסוד", department: "מעון באר שבע", month: "2026-06", details: "תקבול משרד" },
  { amount: 50800, category: "שכר לימוד", department: "מעון מרכזי", month: "2026-05", details: "גבייה חודשית מהורים" },
  { amount: 30100, category: "סבסוד", department: "מעון מרכזי", month: "2026-05", details: "תקבול משרד" },
  { amount: 41800, category: "שכר לימוד", department: "מעון באר שבע", month: "2026-04", details: "גבייה חודשית מהורים" },
  { amount: 45200, category: "שכר לימוד", department: "מעון נתיבות", month: "2026-04", details: "גבייה חודשית מהורים" },
];

const expenses = [
  { amount: 18420, category: "מזון", department: "מעון אשקלון", month: "2026-06", details: "ספק מזון חודשי" },
  { amount: 12600, category: "תחזוקה", department: "מעון ירושלים", month: "2026-06", details: "תיקוני בטיחות בחצר" },
  { amount: 9800, category: "ציוד", department: "מעון נתיבות", month: "2026-06", details: "ריהוט כיתה חדשה" },
  { amount: 7200, category: "מזון", department: "מעון מרכזי", month: "2026-05", details: "השלמת הזמנת מזון" },
  { amount: 6400, category: "הדרכה", department: "מעון אשקלון", month: "2026-05", details: "השתלמות צוות מובילות" },
  { amount: 5300, category: "תחבורה", department: "מעון באר שבע", month: "2026-06", details: "הסעות פעילות קיץ" },
  { amount: 4100, category: "ציוד", department: "", month: "2026-06", details: "ציוד מתכלה ללא שיוך" },
  { amount: 3900, category: "", department: "מעון מרכזי", month: "2026-06", details: "הוצאה ממתינה לסיווג" },
  { amount: 3100, category: "ניקיון", department: "מעון ירושלים", month: "", details: "חומרי ניקיון" },
  { amount: 2800, category: "מזון", department: "מעון באר שבע", month: "2026-04", details: "הזמנת ירקות ופירות" },
  { amount: 2500, category: "משרד", department: "מרכזי", month: "2026-06", details: "ציוד משרדי הנהלה" },
  { amount: 1700, category: "ניקיון", department: "מעון נתיבות", month: "2026-05", details: "חברת ניקיון" },
];

const payroll = [
  { employee: "שרה כהן", month: "2026-06", daycare: "מעון אשקלון", className: "תינוקות", cost: 11320, hours: 182 },
  { employee: "רבקה לוי", month: "2026-06", daycare: "מעון אשקלון", className: "פעוטות", cost: 9800, hours: 168 },
  { employee: "דינה מזרחי", month: "2026-06", daycare: "מעון ירושלים", className: "בוגרים", cost: 10450, hours: 174 },
  { employee: "חנה ביטון", month: "2026-06", daycare: "מעון נתיבות", className: "תינוקות", cost: 9200, hours: 160 },
  { employee: "לאה אוחנה", month: "2026-06", daycare: "מעון באר שבע", className: "פעוטות", cost: 8870, hours: 154 },
  { employee: "מיכל פרץ", month: "2026-05", daycare: "מעון מרכזי", className: "בוגרים", cost: 10120, hours: 171 },
  { employee: "אסתר מלכה", month: "2026-05", daycare: "מעון ירושלים", className: "תינוקות", cost: 9560, hours: 165 },
  { employee: "מרים בן דוד", month: "2026-05", daycare: "מעון אשקלון", className: "בוגרים", cost: 10880, hours: 176 },
  { employee: "יעל סבג", month: "2026-04", daycare: "מעון באר שבע", className: "תינוקות", cost: 8300, hours: 150 },
  { employee: "נעמי אזולאי", month: "2026-04", daycare: "מעון נתיבות", className: "פעוטות", cost: 8740, hours: 158 },
];

const moneyFormatter = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat("he-IL");
const monthLabels = { "2026-06": "יוני 2026", "2026-05": "מאי 2026", "2026-04": "אפריל 2026" };
const state = { month: "all", department: "all", category: "all", search: "", expenseSort: "amount-desc", payrollSort: "cost-desc" };
const els = {
  monthFilter: document.querySelector("#month-filter"), departmentFilter: document.querySelector("#department-filter"), categoryFilter: document.querySelector("#category-filter"), selectedMonthLabel: document.querySelector("#selected-month-label"),
  cashflowKpiGrid: document.querySelector("#cashflow-kpi-grid"), daycareCountLabel: document.querySelector("#daycare-count-label"), daycareCardGrid: document.querySelector("#daycare-card-grid"), expenseCountLabel: document.querySelector("#expense-count-label"), payrollCountLabel: document.querySelector("#payroll-count-label"),
  departmentExpenseChart: document.querySelector("#department-expense-chart"), categoryExpenseChart: document.querySelector("#category-expense-chart"), detailExpenseChart: document.querySelector("#detail-expense-chart"), payrollDaycareChart: document.querySelector("#payroll-daycare-chart"), payrollClassChart: document.querySelector("#payroll-class-chart"), hoursDaycareChart: document.querySelector("#hours-daycare-chart"),
  topExpenses: null, executiveAlertGrid: document.querySelector("#executive-alert-grid"), warningGrid: document.querySelector("#warning-grid"), tableSearch: document.querySelector("#table-search"), expenseSort: document.querySelector("#expense-sort"), payrollSort: document.querySelector("#payroll-sort"), financialTableBody: document.querySelector("#financial-table-body"), payrollTableBody: document.querySelector("#payroll-table-body"), financialTableCount: document.querySelector("#financial-table-count"), payrollTableCount: document.querySelector("#payroll-table-count"),
};

function unique(values) { return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "he")); }
function sum(rows, key) { return rows.reduce((total, row) => total + Number(row[key] || 0), 0); }
function groupSum(rows, key, valueKey) { return rows.reduce((map, row) => { const label = row[key] || "ללא שיוך"; map[label] = (map[label] || 0) + Number(row[valueKey] || 0); return map; }, {}); }
function option(value, label) { return '<option value="' + value + '">' + label + '</option>'; }
function firstSorted(grouped) { return Object.entries(grouped).sort((a, b) => b[1] - a[1])[0]; }
function average(values) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; }

function renderFilterOptions() {
  const months = unique([...income.map((row) => row.month), ...expenses.map((row) => row.month), ...payroll.map((row) => row.month)]);
  const departments = unique([...income.map((row) => row.department), ...expenses.map((row) => row.department), ...payroll.map((row) => row.daycare)]);
  const categories = unique(expenses.map((row) => row.category));
  els.monthFilter.innerHTML = option("all", "כל החודשים") + months.map((month) => option(month, monthLabels[month] || month)).join("");
  els.departmentFilter.innerHTML = option("all", "כל המחלקות והמעונות") + departments.map((department) => option(department, department)).join("");
  els.categoryFilter.innerHTML = option("all", "כל ההגדרות") + categories.map((category) => option(category, category)).join("");
}

function getFilteredData() {
  const filteredIncome = income.filter((row) => (state.month === "all" || row.month === state.month) && (state.department === "all" || row.department === state.department));
  const filteredExpenses = expenses.filter((row) => (state.month === "all" || row.month === state.month) && (state.department === "all" || row.department === state.department) && (state.category === "all" || row.category === state.category));
  const filteredPayroll = payroll.filter((row) => (state.month === "all" || row.month === state.month) && (state.department === "all" || row.daycare === state.department));
  return { filteredIncome, filteredExpenses, filteredPayroll };
}

function getDaycareRows(filteredIncome, filteredExpenses, filteredPayroll) {
  const names = unique([...filteredIncome.map((row) => row.department), ...filteredExpenses.map((row) => row.department), ...filteredPayroll.map((row) => row.daycare)]);
  return names.map((name) => {
    const daycareIncome = filteredIncome.filter((row) => row.department === name);
    const daycareExpenses = filteredExpenses.filter((row) => row.department === name);
    const daycarePayroll = filteredPayroll.filter((row) => row.daycare === name);
    const incomeTotal = sum(daycareIncome, "amount");
    const expenseCost = sum(daycareExpenses, "amount");
    const payrollCost = sum(daycarePayroll, "cost");
    const outflow = expenseCost + payrollCost;
    const balance = incomeTotal - outflow;
    const employeeCount = new Set(daycarePayroll.map((row) => row.employee)).size;
    const missingData = daycareExpenses.filter((row) => !row.category || !row.month).length + daycarePayroll.filter((row) => !row.daycare).length;
    return { name, incomeTotal, expenseCost, payrollCost, outflow, balance, employeeCount, missingData };
  }).sort((a, b) => b.outflow - a.outflow);
}

function renderCashflowKpis(filteredIncome, filteredExpenses, filteredPayroll, daycareRows) {
  const incomeTotal = sum(filteredIncome, "amount");
  const expenseTotal = sum(filteredExpenses, "amount");
  const payrollTotal = sum(filteredPayroll, "cost");
  const outflow = expenseTotal + payrollTotal;
  const balance = incomeTotal - outflow;
  const cards = [
    { tone: "income", icon: "כ", label: "הכנסות החודש", value: moneyFormatter.format(incomeTotal), sub: "כל הכניסות המסוננות" },
    { tone: "expense", icon: "ה", label: "הוצאות החודש", value: moneyFormatter.format(expenseTotal), sub: "ללא שכר" },
    { tone: balance >= 0 ? "balance" : "attention", icon: "י", label: "יתרה חודשית", value: moneyFormatter.format(balance), sub: "הכנסות פחות יציאות" },
    { tone: "payroll", icon: "ש", label: "שכר החודש", value: moneyFormatter.format(payrollTotal), sub: "עלות עובדים" },
    { tone: "secondary", icon: "ס", label: "סה״כ יציאות", value: moneyFormatter.format(outflow), sub: "הוצאות + שכר" },
    { tone: "secondary", icon: "מ", label: "מעונות פעילים", value: numberFormatter.format(daycareRows.length), sub: "עם פעילות כספית" },
    { tone: "secondary", icon: "ע", label: "עובדים", value: numberFormatter.format(new Set(filteredPayroll.map((row) => row.employee)).size), sub: "עובדים בטווח" },
    { tone: "secondary", icon: "ז", label: "שעות", value: numberFormatter.format(sum(filteredPayroll, "hours")), sub: "שעות עבודה" },
  ];
  els.cashflowKpiGrid.innerHTML = cards.map((card) => '<article class="kpi-card cashflow-kpi ' + card.tone + '-kpi"><span class="kpi-icon" aria-hidden="true">' + card.icon + '</span><div><p>' + card.label + '</p><strong>' + card.value + '</strong><span>' + card.sub + '</span></div></article>').join("");
}

function renderDaycareCards(daycareRows) {
  els.daycareCountLabel.textContent = numberFormatter.format(daycareRows.length) + " מעונות";
  if (!daycareRows.length) { els.daycareCardGrid.innerHTML = '<p class="empty-state">אין מעונות להצגה במסנן הנוכחי.</p>'; return; }
  const avgOutflow = average(daycareRows.map((row) => row.outflow));
  const lowestBalance = Math.min(...daycareRows.map((row) => row.balance));
  els.daycareCardGrid.innerHTML = daycareRows.map((row) => {
    const attention = row.missingData > 0 || row.balance === lowestBalance || (avgOutflow > 0 && row.outflow > avgOutflow * 1.35);
    return '<article class="daycare-card financial-status-card ' + (attention ? 'attention-card' : '') + '"><div class="daycare-card-head"><div><h3>' + row.name + '</h3><span>' + (attention ? 'דורש תשומת לב' : 'במעקב') + '</span></div><strong>' + moneyFormatter.format(row.balance) + '</strong></div><div class="daycare-metrics financial-metrics"><div><span>הכנסות</span><strong>' + moneyFormatter.format(row.incomeTotal) + '</strong></div><div><span>הוצאות</span><strong>' + moneyFormatter.format(row.expenseCost) + '</strong></div><div><span>שכר</span><strong>' + moneyFormatter.format(row.payrollCost) + '</strong></div><div><span>סה״כ יציאות</span><strong>' + moneyFormatter.format(row.outflow) + '</strong></div><div><span>יתרה</span><strong>' + moneyFormatter.format(row.balance) + '</strong></div><div><span>עובדים</span><strong>' + numberFormatter.format(row.employeeCount) + '</strong></div></div><div class="budget-note">תקציב לא הוגדר</div></article>';
  }).join("");
}

function renderBarChart(target, grouped, formatter = moneyFormatter) {
  const rows = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(...rows.map((row) => row[1]), 1);
  target.innerHTML = rows.length ? rows.map(([label, value]) => '<div class="bar-row"><div class="bar-row-text"><span>' + label + '</span><strong>' + formatter.format(value) + '</strong></div><div class="bar-track"><span style="width:' + Math.max((value / max) * 100, 4) + '%"></span></div></div>').join("") : '<p class="empty-state">אין נתונים להצגה במסנן הנוכחי.</p>';
}

function renderExecutiveAlerts(filteredIncome, filteredExpenses, filteredPayroll, daycareRows) {
  const expenseLeader = firstSorted(groupSum(filteredExpenses, "department", "amount"));
  const payrollLeader = firstSorted(groupSum(filteredPayroll, "daycare", "cost"));
  const detailLeader = firstSorted(groupSum(filteredExpenses, "details", "amount"));
  const lowestBalance = [...daycareRows].sort((a, b) => a.balance - b.balance)[0];
  const missingClassifications = filteredExpenses.filter((row) => !row.category).length;
  const missingAssignments = filteredExpenses.filter((row) => !row.department || !row.month).length;
  const missingEmployees = filteredPayroll.filter((row) => !row.daycare || !row.className).length;
  const alerts = [];
  if (lowestBalance) alerts.push({ label: "יתרה נמוכה", title: lowestBalance.name, detail: "היתרה הנמוכה ביותר: " + moneyFormatter.format(lowestBalance.balance) });
  if (payrollLeader) alerts.push({ label: "שכר בולט", title: payrollLeader[0], detail: "עלות השכר הגבוהה ביותר: " + moneyFormatter.format(payrollLeader[1]) });
  if (expenseLeader) alerts.push({ label: "הוצאות בולטות", title: expenseLeader[0], detail: "סך ההוצאות הגבוה ביותר: " + moneyFormatter.format(expenseLeader[1]) });
  if (detailLeader) alerts.push({ label: "סעיף בולט", title: detailLeader[0], detail: "פירוט ההוצאה הגבוה ביותר: " + moneyFormatter.format(detailLeader[1]) });
  if (missingClassifications) alerts.push({ label: "סיווג חסר", title: numberFormatter.format(missingClassifications) + " שורות", detail: "קיימות הוצאות ללא הגדרה." });
  if (missingAssignments) alerts.push({ label: "שיוך חסר", title: numberFormatter.format(missingAssignments) + " שורות", detail: "קיימות שורות ללא מחלקה או חודש." });
  if (missingEmployees) alerts.push({ label: "שכר חסר שיוך", title: numberFormatter.format(missingEmployees) + " עובדים", detail: "קיימות רשומות שכר ללא מעון או כיתה." });
  els.executiveAlertGrid.innerHTML = alerts.map((alert) => '<article class="executive-alert"><span>' + alert.label + '</span><strong>' + alert.title + '</strong><p>' + alert.detail + '</p></article>').join("") || '<p class="empty-state">אין תובנות חריגות לפי הנתונים הנוכחיים.</p>';
}

function renderWarnings(filteredExpenses, filteredPayroll) {
  const warnings = [
    { label: "ללא מחלקה", count: filteredExpenses.filter((row) => !row.department).length, detail: "שורות כספים ללא שיוך מעון או מחלקה" },
    { label: "ללא חודש", count: filteredExpenses.filter((row) => !row.month).length, detail: "שורות כספים ללא שיוך לחודש" },
    { label: "ללא הגדרה", count: filteredExpenses.filter((row) => !row.category).length, detail: "שורות הוצאה שממתינות לסיווג" },
    { label: "עובדים ללא שיוך", count: filteredPayroll.filter((row) => !row.daycare || !row.className).length, detail: "רשומות שכר ללא מעון או כיתה" },
  ];
  els.warningGrid.innerHTML = warnings.map((warning) => '<article class="warning-card ' + (warning.count > 0 ? "needs-attention" : "") + '"><span>' + warning.label + '</span><strong>' + numberFormatter.format(warning.count) + '</strong><p>' + warning.detail + '</p></article>').join("");
}

function matchesSearch(row) { return !state.search || Object.values(row).join(" ").toLowerCase().includes(state.search.toLowerCase()); }
function sortedFinancial(rows) { return [...rows].filter(matchesSearch).sort((a, b) => { if (state.expenseSort === "amount-asc") return a.amount - b.amount; if (state.expenseSort === "month-desc") return String(b.month).localeCompare(String(a.month)); return b.amount - a.amount; }); }
function sortedPayroll(rows) { return [...rows].filter(matchesSearch).sort((a, b) => { if (state.payrollSort === "cost-asc") return a.cost - b.cost; if (state.payrollSort === "hours-desc") return b.hours - a.hours; return b.cost - a.cost; }); }

function renderTables(filteredIncome, filteredExpenses, filteredPayroll) {
  const financialRows = sortedFinancial([...filteredIncome.map((row) => ({ ...row, type: "הכנסה" })), ...filteredExpenses.map((row) => ({ ...row, type: "הוצאה" }))]);
  const payrollRows = sortedPayroll(filteredPayroll);
  els.financialTableCount.textContent = numberFormatter.format(financialRows.length) + " שורות";
  els.payrollTableCount.textContent = numberFormatter.format(payrollRows.length) + " שורות";
  els.financialTableBody.innerHTML = financialRows.map((row) => '<tr><td>' + row.type + '</td><td>' + moneyFormatter.format(row.amount) + '</td><td>' + (row.category || "ללא הגדרה") + '</td><td>' + (row.department || "ללא מחלקה") + '</td><td>' + (monthLabels[row.month] || row.month || "ללא חודש") + '</td><td>' + row.details + '</td></tr>').join("") || '<tr><td colspan="6">אין נתונים להצגה.</td></tr>';
  els.payrollTableBody.innerHTML = payrollRows.map((row) => '<tr><td>' + row.employee + '</td><td>' + row.daycare + '</td><td>' + row.className + '</td><td>' + numberFormatter.format(row.hours) + '</td><td>' + moneyFormatter.format(row.cost) + '</td></tr>').join("") || '<tr><td colspan="5">אין נתונים להצגה.</td></tr>';
}

function renderDashboard() {
  const data = getFilteredData();
  const daycareRows = getDaycareRows(data.filteredIncome, data.filteredExpenses, data.filteredPayroll);
  els.selectedMonthLabel.textContent = state.month === "all" ? "כל החודשים" : monthLabels[state.month];
  els.expenseCountLabel.textContent = numberFormatter.format(data.filteredExpenses.length) + " שורות הוצאה";
  els.payrollCountLabel.textContent = numberFormatter.format(data.filteredPayroll.length) + " רשומות שכר";
  renderCashflowKpis(data.filteredIncome, data.filteredExpenses, data.filteredPayroll, daycareRows);
  renderDaycareCards(daycareRows);
  renderBarChart(els.departmentExpenseChart, groupSum(data.filteredExpenses, "department", "amount"));
  renderBarChart(els.categoryExpenseChart, groupSum(data.filteredExpenses, "category", "amount"));
  renderBarChart(els.detailExpenseChart, groupSum(data.filteredExpenses, "details", "amount"));
  renderBarChart(els.payrollDaycareChart, groupSum(data.filteredPayroll, "daycare", "cost"));
  renderBarChart(els.payrollClassChart, groupSum(data.filteredPayroll, "className", "cost"));
  renderBarChart(els.hoursDaycareChart, groupSum(data.filteredPayroll, "daycare", "hours"), numberFormatter);
  renderExecutiveAlerts(data.filteredIncome, data.filteredExpenses, data.filteredPayroll, daycareRows);
  renderWarnings(data.filteredExpenses, data.filteredPayroll);
  renderTables(data.filteredIncome, data.filteredExpenses, data.filteredPayroll);
}

renderFilterOptions();
renderDashboard();
els.monthFilter.addEventListener("change", (event) => { state.month = event.target.value; renderDashboard(); });
els.departmentFilter.addEventListener("change", (event) => { state.department = event.target.value; renderDashboard(); });
els.categoryFilter.addEventListener("change", (event) => { state.category = event.target.value; renderDashboard(); });
els.tableSearch.addEventListener("input", (event) => { state.search = event.target.value.trim(); renderDashboard(); });
els.expenseSort.addEventListener("change", (event) => { state.expenseSort = event.target.value; renderDashboard(); });
els.payrollSort.addEventListener("change", (event) => { state.payrollSort = event.target.value; renderDashboard(); });
