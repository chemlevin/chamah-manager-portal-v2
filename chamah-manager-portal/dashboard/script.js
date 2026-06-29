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
  monthFilter: document.querySelector("#month-filter"), departmentFilter: document.querySelector("#department-filter"), categoryFilter: document.querySelector("#category-filter"),
  selectedMonthLabel: document.querySelector("#selected-month-label"), kpiGrid: document.querySelector("#kpi-grid"), expenseCountLabel: document.querySelector("#expense-count-label"), payrollCountLabel: document.querySelector("#payroll-count-label"),
  departmentExpenseChart: document.querySelector("#department-expense-chart"), categoryExpenseChart: document.querySelector("#category-expense-chart"), payrollDaycareChart: document.querySelector("#payroll-daycare-chart"), payrollClassChart: document.querySelector("#payroll-class-chart"),
  topExpenses: document.querySelector("#top-expenses"), insightList: document.querySelector("#insight-list"), warningGrid: document.querySelector("#warning-grid"), tableSearch: document.querySelector("#table-search"), expenseSort: document.querySelector("#expense-sort"), payrollSort: document.querySelector("#payroll-sort"),
  financialTableBody: document.querySelector("#financial-table-body"), payrollTableBody: document.querySelector("#payroll-table-body"), financialTableCount: document.querySelector("#financial-table-count"), payrollTableCount: document.querySelector("#payroll-table-count"),
};
function unique(values) { return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "he")); }
function sum(rows, key) { return rows.reduce((total, row) => total + Number(row[key] || 0), 0); }
function groupSum(rows, key, valueKey) { return rows.reduce((map, row) => { const label = row[key] || "ללא שיוך"; map[label] = (map[label] || 0) + Number(row[valueKey] || 0); return map; }, {}); }
function option(value, label) { return '<option value="' + value + '">' + label + '</option>'; }
function renderFilterOptions() {
  const months = unique([...expenses.map((row) => row.month), ...payroll.map((row) => row.month)]);
  const departments = unique([...expenses.map((row) => row.department), ...payroll.map((row) => row.daycare)]);
  const categories = unique(expenses.map((row) => row.category));
  els.monthFilter.innerHTML = option("all", "כל החודשים") + months.map((month) => option(month, monthLabels[month] || month)).join("");
  els.departmentFilter.innerHTML = option("all", "כל המחלקות והמעונות") + departments.map((department) => option(department, department)).join("");
  els.categoryFilter.innerHTML = option("all", "כל ההגדרות") + categories.map((category) => option(category, category)).join("");
}
function getFilteredData() {
  const filteredExpenses = expenses.filter((row) => (state.month === "all" || row.month === state.month) && (state.department === "all" || row.department === state.department) && (state.category === "all" || row.category === state.category));
  const filteredPayroll = payroll.filter((row) => (state.month === "all" || row.month === state.month) && (state.department === "all" || row.daycare === state.department));
  return { filteredExpenses, filteredPayroll };
}
function renderKpis(filteredExpenses, filteredPayroll) {
  const departments = unique([...filteredExpenses.map((row) => row.department), ...filteredPayroll.map((row) => row.daycare)]);
  const cards = [
    { icon: "ש", label: "עלות שכר", value: moneyFormatter.format(sum(filteredPayroll, "cost")), sub: "סך עלויות העובדים" },
    { icon: "ז", label: "שעות עובדים", value: numberFormatter.format(sum(filteredPayroll, "hours")), sub: "שעות עבודה מדווחות" },
    { icon: "כ", label: "סך הוצאות", value: moneyFormatter.format(sum(filteredExpenses, "amount")), sub: "פעילות כספית נבחרת" },
    { icon: "ע", label: "מספר עובדים", value: numberFormatter.format(new Set(filteredPayroll.map((row) => row.employee)).size), sub: "עובדים בטווח המסונן" },
    { icon: "מ", label: "מחלקות / מעונות", value: numberFormatter.format(departments.length), sub: "יחידות פעילות" },
    { icon: "ח", label: "חודש נבחר", value: state.month === "all" ? "הכול" : monthLabels[state.month], sub: "משפיע על כל הדשבורד" },
  ];
  els.kpiGrid.innerHTML = cards.map((card) => '<article class="kpi-card"><span class="kpi-icon" aria-hidden="true">' + card.icon + '</span><div><p>' + card.label + '</p><strong>' + card.value + '</strong><span>' + card.sub + '</span></div></article>').join("");
}
function renderBarChart(target, grouped) {
  const rows = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(...rows.map((row) => row[1]), 1);
  target.innerHTML = rows.length ? rows.map(([label, value]) => '<div class="bar-row"><div class="bar-row-text"><span>' + label + '</span><strong>' + moneyFormatter.format(value) + '</strong></div><div class="bar-track"><span style="width:' + Math.max((value / max) * 100, 4) + '%"></span></div></div>').join("") : '<p class="empty-state">אין נתונים להצגה במסנן הנוכחי.</p>';
}
function renderTopExpenses(filteredExpenses) {
  const rows = [...filteredExpenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
  els.topExpenses.innerHTML = rows.length ? rows.map((row, index) => '<div class="rank-item"><span>' + (index + 1) + '</span><div><strong>' + row.details + '</strong><small>' + (row.department || "ללא מחלקה") + ' · ' + (row.category || "ללא הגדרה") + '</small></div><b>' + moneyFormatter.format(row.amount) + '</b></div>').join("") : '<p class="empty-state">אין הוצאות להצגה.</p>';
}
function renderInsights(filteredExpenses, filteredPayroll) {
  const payrollByDaycare = Object.entries(groupSum(filteredPayroll, "daycare", "cost")).sort((a, b) => b[1] - a[1]);
  const expensesByCategory = Object.entries(groupSum(filteredExpenses, "category", "amount")).sort((a, b) => b[1] - a[1]);
  const expensesByDepartment = Object.entries(groupSum(filteredExpenses, "department", "amount")).sort((a, b) => b[1] - a[1]);
  const insights = [];
  if (payrollByDaycare[0]) insights.push(payrollByDaycare[0][0] + " הוא בעל עלות השכר הגבוהה ביותר.");
  if (expensesByCategory[0]) insights.push(expensesByCategory[0][0] + " היא הגדרת ההוצאה הגדולה ביותר.");
  if (expensesByDepartment[0]) insights.push(expensesByDepartment[0][0] + " היא המחלקה עם ההוצאה הגבוהה ביותר.");
  if (!insights.length) insights.push("אין מספיק נתונים ליצירת תובנות במסנן הנוכחי.");
  els.insightList.innerHTML = insights.map((text) => '<article class="insight-card"><strong>' + text + '</strong><span>מבוסס על נתוני הדמה המסוננים</span></article>').join("");
}
function renderWarnings(filteredExpenses) {
  const warnings = [
    { label: "ללא מחלקה", count: filteredExpenses.filter((row) => !row.department).length, detail: "שורות הוצאה ללא שיוך מחלקתי" },
    { label: "ללא הגדרה", count: filteredExpenses.filter((row) => !row.category).length, detail: "שורות הוצאה שממתינות לסיווג" },
    { label: "ללא חודש", count: filteredExpenses.filter((row) => !row.month).length, detail: "שורות ללא שיוך לחודש" },
  ];
  els.warningGrid.innerHTML = warnings.map((warning) => '<article class="warning-card ' + (warning.count > 0 ? "needs-attention" : "") + '"><span>' + warning.label + '</span><strong>' + numberFormatter.format(warning.count) + '</strong><p>' + warning.detail + '</p></article>').join("");
}
function matchesSearch(row) { return !state.search || Object.values(row).join(" ").toLowerCase().includes(state.search.toLowerCase()); }
function sortedExpenses(rows) {
  return [...rows].filter(matchesSearch).sort((a, b) => { if (state.expenseSort === "amount-asc") return a.amount - b.amount; if (state.expenseSort === "month-desc") return String(b.month).localeCompare(String(a.month)); return b.amount - a.amount; });
}
function sortedPayroll(rows) {
  return [...rows].filter(matchesSearch).sort((a, b) => { if (state.payrollSort === "cost-asc") return a.cost - b.cost; if (state.payrollSort === "hours-desc") return b.hours - a.hours; return b.cost - a.cost; });
}
function renderTables(filteredExpenses, filteredPayroll) {
  const expenseRows = sortedExpenses(filteredExpenses);
  const payrollRows = sortedPayroll(filteredPayroll);
  els.financialTableCount.textContent = numberFormatter.format(expenseRows.length) + " שורות";
  els.payrollTableCount.textContent = numberFormatter.format(payrollRows.length) + " שורות";
  els.financialTableBody.innerHTML = expenseRows.map((row) => '<tr><td>' + moneyFormatter.format(row.amount) + '</td><td>' + (row.category || "ללא הגדרה") + '</td><td>' + (row.department || "ללא מחלקה") + '</td><td>' + (monthLabels[row.month] || row.month || "ללא חודש") + '</td><td>' + row.details + '</td></tr>').join("") || '<tr><td colspan="5">אין נתונים להצגה.</td></tr>';
  els.payrollTableBody.innerHTML = payrollRows.map((row) => '<tr><td>' + row.employee + '</td><td>' + row.daycare + '</td><td>' + row.className + '</td><td>' + numberFormatter.format(row.hours) + '</td><td>' + moneyFormatter.format(row.cost) + '</td></tr>').join("") || '<tr><td colspan="5">אין נתונים להצגה.</td></tr>';
}
function renderDashboard() {
  const data = getFilteredData();
  els.selectedMonthLabel.textContent = state.month === "all" ? "כל החודשים" : monthLabels[state.month];
  els.expenseCountLabel.textContent = numberFormatter.format(data.filteredExpenses.length) + " תנועות";
  els.payrollCountLabel.textContent = numberFormatter.format(data.filteredPayroll.length) + " רשומות שכר";
  renderKpis(data.filteredExpenses, data.filteredPayroll);
  renderBarChart(els.departmentExpenseChart, groupSum(data.filteredExpenses, "department", "amount"));
  renderBarChart(els.categoryExpenseChart, groupSum(data.filteredExpenses, "category", "amount"));
  renderBarChart(els.payrollDaycareChart, groupSum(data.filteredPayroll, "daycare", "cost"));
  renderBarChart(els.payrollClassChart, groupSum(data.filteredPayroll, "className", "cost"));
  renderTopExpenses(data.filteredExpenses);
  renderInsights(data.filteredExpenses, data.filteredPayroll);
  renderWarnings(data.filteredExpenses);
  renderTables(data.filteredExpenses, data.filteredPayroll);
}
renderFilterOptions();
renderDashboard();
els.monthFilter.addEventListener("change", (event) => { state.month = event.target.value; renderDashboard(); });
els.departmentFilter.addEventListener("change", (event) => { state.department = event.target.value; renderDashboard(); });
els.categoryFilter.addEventListener("change", (event) => { state.category = event.target.value; renderDashboard(); });
els.tableSearch.addEventListener("input", (event) => { state.search = event.target.value.trim(); renderDashboard(); });
els.expenseSort.addEventListener("change", (event) => { state.expenseSort = event.target.value; renderDashboard(); });
els.payrollSort.addEventListener("change", (event) => { state.payrollSort = event.target.value; renderDashboard(); });
