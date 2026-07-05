const API_ENDPOINT = '/api/allocations';
const CALENDAR_MONTHS = ['01/2026', '02/2026', '03/2026', '04/2026', '05/2026', '06/2026', '07/2026', '08/2026', '09/2026', '10/2026', '11/2026', '12/2026', '01/2027', '02/2027', '03/2027', '04/2027', '05/2027', '06/2027', '07/2027', '08/2027', '09/2027', '10/2027', '11/2027', '12/2027'];
const BANKS = [
  { account: '3328007', unit: 'מחנה' },
  { account: '25990063', unit: 'מרכזי' },
  { account: '3903880', unit: 'אשקלון' },
  { account: '902331', unit: 'סניף' },
  { account: '912327', unit: 'נאות' },
];
const SENT_STATUS = 'נשלח להנה"ח';
const STATUS_VALUES = ['ממתין לשליחה', SENT_STATUS, 'חסר מסמכים', 'פעולה ללא אסמכתא'];
const EXPLANATIONS = {
  total: 'כל שורות הבנק שנמצאות במערכת לפי הבחירה.',
  assigned: 'שורות שיש בהן סטטוס הנה"ח.',
  unassigned: 'שורות ללא סטטוס הנה"ח.',
  waiting: 'שורות שסומנו כממתינות לשליחה להנה"ח.',
  missing: 'שורות שחסר עבורן מסמך.',
  sent: 'שורות שסומנו כנשלחו להנה"ח.',
  noReference: 'פעולה שסומנה ללא אסמכתא.',
};
const moneyFormatter = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat('he-IL');
const state = { bank: 'all', month: 'all', status: 'all', rows: [] };
const els = {
  bankFilter: document.querySelector('#bank-filter'),
  monthFilter: document.querySelector('#month-filter'),
  statusFilter: document.querySelector('#status-filter'),
  lastUpdate: document.querySelector('#accounting-last-update'),
  monthlyLabel: document.querySelector('#monthly-label'),
  monthlyGrid: document.querySelector('#monthly-grid'),
  amountGrid: document.querySelector('#amount-grid'),
  ytdLabel: document.querySelector('#ytd-label'),
  ytdGrid: document.querySelector('#ytd-grid'),
  daycareCountLabel: document.querySelector('#daycare-count-label'),
  daycareGrid: document.querySelector('#daycare-grid'),
  sourceCountLabel: document.querySelector('#source-count-label'),
  sourceTableBody: document.querySelector('#source-table-body'),
  copySourceTable: document.querySelector('#copy-source-table'),
  exportSourceCsv: document.querySelector('#export-source-csv'),
  explainOverlay: document.querySelector('#explain-overlay'),
  explainTitle: document.querySelector('#explain-title'),
  explainValue: document.querySelector('#explain-value'),
  explainScope: document.querySelector('#explain-scope'),
  explainSource: document.querySelector('#explain-source'),
  explainTotal: document.querySelector('#explain-total'),
  explainRule: document.querySelector('#explain-rule'),
  explainText: document.querySelector('#explain-text'),
};
function clean(value) { return String(value ?? '').trim(); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }
function safeNumber(value) { const number = Number(value); return Number.isFinite(number) ? number : 0; }
function formatMoney(value) { return moneyFormatter.format(safeNumber(value)); }
function option(value, label) { return '<option value="' + escapeHtml(value) + '">' + escapeHtml(label) + '</option>'; }
function rawValue(raw, names) {
  const keys = Object.keys(raw || {});
  const normalized = names.map((name) => clean(name).replace(/\s+/g, ' ').toLowerCase());
  const key = keys.find((candidate) => normalized.includes(clean(candidate).replace(/\s+/g, ' ').toLowerCase()));
  return key ? clean(raw[key]) : '';
}
function bankByAccount(account) { return BANKS.find((bank) => bank.account === clean(account)); }
function parseIsraeliBankDate(value) {
  const text = clean(value);
  if (!text) return null;
  const match = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}
function normalizeRow(row, fallbackIndex) {
  const raw = row.raw || {};
  const account = rawValue(raw, ['חשבון', 'מספר חשבון', 'account', 'bank account']);
  const mapped = bankByAccount(account);
  const debit = safeNumber(row.debit);
  const credit = safeNumber(row.credit);
  const amountRaw = rawValue(raw, ['סכום', 'amount']);
  return {
    rowIndex: row.rowIndex || fallbackIndex + 2,
    account,
    unit: mapped?.unit || clean(row.unit) || 'לא משויך',
    cashDate: clean(row.cashDate || rawValue(raw, ['תאריך', 'תאריך בנק', 'תאריך פעולה'])),
    description: rawValue(raw, ['תיאור תנועה', 'תיאור', 'description']) || clean(row.accountingCategory),
    reference: clean(row.reference || rawValue(raw, ['אסמכתא', 'מספר אסמכתא'])),
    amount: amountRaw || String(credit || debit || row.netCash || ''),
    amountNumber: amountRaw ? safeNumber(String(amountRaw).replace(/[₪,\s]/g, '')) : safeNumber(row.netCash || credit - debit),
    debit,
    credit,
    definition: clean(row.definition || rawValue(raw, ['הגדרה'])),
    businessMonth: clean(row.businessMonth || rawValue(raw, ['עבור חודש', 'חודש', 'חודש שיוך'])),
    accountingStatus: clean(row.accountingStatus || rawValue(raw, ['הנה"ח', 'הנהח', 'סטטוס הנה"ח'])),
    notes: clean(row.notes || rawValue(raw, ['הערות'])),
  };
}
function normalizePayload(payload) {
  const rows = [...(Array.isArray(payload.rows) ? payload.rows : []), ...(Array.isArray(payload.unmappedRows) ? payload.unmappedRows : [])];
  return rows.map(normalizeRow).filter((row) => row.businessMonth || row.cashDate || row.account || row.reference);
}
function rowsForBankAndMonth(month) {
  return state.rows.filter((row) => (state.bank === 'all' || row.unit === state.bank) && (month === 'all' || row.businessMonth === month));
}
function parseMonthValue(month) {
  const match = clean(month).match(/^(\d{2})\/(\d{4})$/);
  return match ? { month: Number(match[1]), year: Number(match[2]) } : null;
}
function ytdMonths() {
  if (state.month === 'all') return CALENDAR_MONTHS;
  const selected = parseMonthValue(state.month);
  if (!selected) return [];
  return CALENDAR_MONTHS.filter((month) => {
    const parsed = parseMonthValue(month);
    return parsed && parsed.year === selected.year && parsed.month <= selected.month;
  });
}
function ytdRows() {
  if (state.month === 'all') return state.rows.filter((row) => state.bank === 'all' || row.unit === state.bank);
  const months = new Set(ytdMonths());
  return state.rows.filter((row) => (state.bank === 'all' || row.unit === state.bank) && months.has(row.businessMonth));
}
function bankDateTime(value) { return parseIsraeliBankDate(value)?.getTime() ?? Number.NEGATIVE_INFINITY; }
function sourceRows() {
  return rowsForBankAndMonth(state.month).filter((row) => state.status === 'all' || (state.status === '__empty' ? !row.accountingStatus : row.accountingStatus === state.status)).sort((a, b) => bankDateTime(b.cashDate) - bankDateTime(a.cashDate));
}
function metrics(rows) {
  const countStatus = (status) => rows.filter((row) => row.accountingStatus === status).length;
  const assigned = rows.filter((row) => row.accountingStatus).length;
  return { total: rows.length, assigned, unassigned: rows.length - assigned, waiting: countStatus('ממתין לשליחה'), missing: countStatus('חסר מסמכים'), sent: countStatus(SENT_STATUS), noReference: countStatus('פעולה ללא אסמכתא') };
}
function amountMetrics(rows) {
  const income = rows.reduce((total, row) => total + row.credit, 0);
  const expenses = rows.reduce((total, row) => total + row.debit, 0);
  const open = rows.filter((row) => row.accountingStatus !== SENT_STATUS).reduce((total, row) => total + row.credit - row.debit, 0);
  return { income, expenses, open };
}
function explainButton(metricId) { return '<button class="explain-trigger" type="button" data-explain="' + escapeHtml(metricId) + '">הסבר</button>'; }
function kpiCard(label, value, sub, tone, metricId) { return '<article class="kpi-card cashflow-kpi management-kpi ' + tone + '-kpi"><span class="kpi-icon" aria-hidden="true">' + escapeHtml(label.slice(0, 1)) + '</span><div><p>' + escapeHtml(label) + '</p><strong>' + escapeHtml(value) + '</strong><span>' + escapeHtml(sub) + '</span></div>' + (metricId ? explainButton(metricId) : '') + '</article>'; }
function kpiCards(metric, scope) {
  return [
    ['שורות במערכת', metric.total, 'כל שורות BANKS', 'secondary', 'total'],
    ['שורות משובצות', metric.assigned, 'סטטוס הנה"ח קיים', 'balance', 'assigned'],
    ['שורות לא משובצות', metric.unassigned, 'ללא סטטוס הנה"ח', metric.unassigned ? 'expense' : 'balance', 'unassigned'],
    ['ממתין לשליחה', metric.waiting, 'טרם נשלח', metric.waiting ? 'expense' : 'secondary', 'waiting'],
    ['חסר מסמכים', metric.missing, 'דורש השלמה', metric.missing ? 'attention' : 'balance', 'missing'],
    [SENT_STATUS, metric.sent, 'טופל', 'balance', 'sent'],
    ['פעולה ללא אסמכתא', metric.noReference, 'סומן ב-BANKS', metric.noReference ? 'attention' : 'secondary', 'noReference'],
  ].map(([label, value, sub, tone, id]) => kpiCard(label, numberFormatter.format(value), scope + ' · ' + sub, tone, id)).join('');
}
function renderKpis() {
  const monthlyRows = rowsForBankAndMonth(state.month);
  const ytd = ytdRows();
  els.monthlyLabel.textContent = (state.bank === 'all' ? 'כל הבנקים' : state.bank) + ' · ' + (state.month === 'all' ? 'כל החודשים' : state.month);
  els.monthlyGrid.innerHTML = kpiCards(metrics(monthlyRows), 'חודש');
  const amounts = amountMetrics(monthlyRows);
  els.amountGrid.innerHTML = [
    kpiCard('סה"כ הכנסות', formatMoney(amounts.income), 'לפי שדות BANKS הקיימים', 'balance', ''),
    kpiCard('סה"כ הוצאות', formatMoney(amounts.expenses), 'לפי שדות BANKS הקיימים', 'expense', ''),
    kpiCard('סכום פתוח', formatMoney(amounts.open), 'שורות שטרם נשלחו להנה"ח', amounts.open ? 'attention' : 'balance', ''),
  ].join('');
  els.ytdLabel.textContent = state.month === 'all' ? 'כל חודשי 2026-2027' : ytdMonths()[0] + ' עד ' + state.month;
  els.ytdGrid.innerHTML = kpiCards(metrics(ytd), 'שנה');
}
function renderDaycareOverview() {
  const rows = ytdRows();
  const units = state.bank === 'all' ? BANKS.map((bank) => bank.unit) : [state.bank];
  els.daycareCountLabel.textContent = numberFormatter.format(units.length) + ' מעונות';
  els.daycareGrid.innerHTML = units.map((unit) => {
    const unitRows = rows.filter((row) => row.unit === unit);
    const metric = metrics(unitRows);
    const treatment = metric.total ? Math.round(metric.assigned / metric.total * 100) : 0;
    return '<article class="management-unit-card compact-unit-card accounting-daycare-card"><div class="compact-unit-head"><h3>' + escapeHtml(unit) + '</h3><b>' + escapeHtml(numberFormatter.format(treatment)) + '%</b><span>טיפול</span></div><dl class="unit-status-list compressed">' +
      '<div><dt>סה"כ</dt><dd>' + numberFormatter.format(metric.total) + '</dd></div>' +
      '<div><dt>משובץ</dt><dd>' + numberFormatter.format(metric.assigned) + '</dd></div>' +
      '<div><dt>פתוח</dt><dd>' + numberFormatter.format(metric.unassigned) + '</dd></div>' +
      '<div><dt>ממתין</dt><dd>' + numberFormatter.format(metric.waiting) + '</dd></div>' +
      '<div><dt>חסר</dt><dd>' + numberFormatter.format(metric.missing) + '</dd></div>' +
      '<div><dt>נשלח</dt><dd>' + numberFormatter.format(metric.sent) + '</dd></div>' +
      '<div><dt>ללא אסמכתא</dt><dd>' + numberFormatter.format(metric.noReference) + '</dd></div>' +
      '</dl></article>';
  }).join('');
}
function renderSourceTable() {
  const rows = sourceRows();
  els.sourceCountLabel.textContent = rows.length ? numberFormatter.format(rows.length) + ' שורות' : 'אין שורות';
  els.sourceTableBody.innerHTML = rows.length ? rows.map((row) => '<tr><td data-label="חשבון">' + escapeHtml(row.account) + '</td><td data-label="מעון">' + escapeHtml(row.unit) + '</td><td data-label="תאריך">' + escapeHtml(row.cashDate) + '</td><td data-label="תיאור תנועה">' + escapeHtml(row.description) + '</td><td data-label="אסמכתא">' + escapeHtml(row.reference) + '</td><td data-label="סכום">' + escapeHtml(row.amount) + '</td><td data-label="הגדרה">' + escapeHtml(row.definition) + '</td><td data-label="עבור חודש">' + escapeHtml(displayBusinessMonth(row)) + '</td><td data-label="הנה&quot;ח">' + escapeHtml(row.accountingStatus) + '</td><td data-label="הערות">' + escapeHtml(row.notes) + '</td></tr>').join('') : '<tr><td colspan="10">אין שורות BANKS להצגה במסננים הנוכחיים.</td></tr>';
}
function renderFilters() {
  els.bankFilter.innerHTML = option('all', 'הכל') + BANKS.map((bank) => option(bank.unit, bank.unit)).join('');
  els.monthFilter.innerHTML = option('all', 'הכל') + CALENDAR_MONTHS.map((month) => option(month, month)).join('');
  els.statusFilter.innerHTML = option('all', 'הכל') + option('__empty', 'ללא סטטוס') + STATUS_VALUES.map((status) => option(status, status)).join('');
  els.bankFilter.value = state.bank;
  els.monthFilter.value = state.month;
  els.statusFilter.value = state.status;
}
function displayBusinessMonth(row) { return row.businessMonth || 'לא שויך לחודש'; }
function renderAll() { renderFilters(); renderKpis(); renderDaycareOverview(); renderSourceTable(); }
function csvEscape(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text; }
function sourceCsv() {
  const columns = ['חשבון', 'מעון', 'תאריך', 'תיאור תנועה', 'אסמכתא', 'סכום', 'הגדרה', 'עבור חודש', 'הנה"ח', 'הערות'];
  const rows = sourceRows().map((row) => [row.account, row.unit, row.cashDate, row.description, row.reference, row.amount, row.definition, displayBusinessMonth(row), row.accountingStatus, row.notes]);
  return [columns, ...rows].map((line) => line.map(csvEscape).join(',')).join('\n');
}
async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement('textarea'); textarea.value = text; document.body.append(textarea); textarea.select(); document.execCommand('copy'); textarea.remove();
}
function downloadCsv() {
  const blob = new Blob([sourceCsv()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'accounting-banks-' + state.month.replace('/', '-') + '.csv'; link.click(); URL.revokeObjectURL(url);
}
function openExplanation(metricId) {
  const monthly = metrics(rowsForBankAndMonth(state.month));
  const labels = { total: 'שורות במערכת', assigned: 'שורות משובצות', unassigned: 'שורות לא משובצות', waiting: 'ממתין לשליחה', missing: 'חסר מסמכים', sent: SENT_STATUS, noReference: 'פעולה ללא אסמכתא' };
  els.explainTitle.textContent = labels[metricId] || 'הסבר';
  els.explainValue.textContent = numberFormatter.format(monthly[metricId] || 0);
  els.explainScope.textContent = els.monthlyLabel.textContent;
  els.explainSource.textContent = 'BANKS';
  els.explainTotal.textContent = numberFormatter.format(rowsForBankAndMonth(state.month).length) + ' שורות';
  els.explainRule.textContent = EXPLANATIONS[metricId] || 'לפי שורות BANKS במסננים הנוכחיים.';
  els.explainText.textContent = EXPLANATIONS[metricId] || '';
  els.explainOverlay.hidden = false;
}
async function loadAccountingData() {
  renderFilters();
  const response = await fetch(API_ENDPOINT, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Allocations returned ' + response.status);
  const payload = await response.json();
  state.rows = normalizePayload(payload);
  const latest = state.rows.map((row) => parseIsraeliBankDate(row.cashDate)).filter(Boolean).sort((a, b) => b - a)[0];
  els.lastUpdate.textContent = 'עדכון אחרון: ' + (latest ? latest.toLocaleDateString('he-IL') : 'אין תאריך');
  renderAll();
}
function bindEvents() {
  els.bankFilter.addEventListener('change', (event) => { state.bank = event.target.value; renderAll(); });
  els.monthFilter.addEventListener('change', (event) => { state.month = event.target.value; renderAll(); });
  els.statusFilter.addEventListener('change', (event) => { state.status = event.target.value; renderAll(); });
  els.copySourceTable.addEventListener('click', () => copyText(sourceCsv()));
  els.exportSourceCsv.addEventListener('click', downloadCsv);
  document.addEventListener('click', (event) => {
    const explain = event.target.closest('[data-explain]');
    if (explain) openExplanation(explain.dataset.explain);
    if (event.target.closest('[data-close-explain]') || event.target === els.explainOverlay) els.explainOverlay.hidden = true;
  });
}
bindEvents();
loadAccountingData().catch((error) => {
  els.lastUpdate.textContent = 'עדכון אחרון: שגיאה';
  els.monthlyGrid.innerHTML = '<p class="empty-state">לא ניתן לטעון כרגע את נתוני BANKS.</p>';
  console.error(error);
});
