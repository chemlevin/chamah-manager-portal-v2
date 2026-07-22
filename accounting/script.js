const transactions = [
  { id: 1, date: '21.07.2026', description: 'ארנונה עיריית ירושלים', reference: '782941', account: 'בנק הפועלים • 1842', debit: 8420, credit: 0, allocation: 'מפוצל ל־3', month: '07/2026', status: 'open', statusLabel: 'דורש השלמה', attachment: true, note: 'יש להשלים שיוך של היתרה למשרד.', history: ['היום, 09:42 · נפתח לבדיקה על ידי מרים', '20.07.2026 · נקלט מקובץ הבנק'], splits: [{ allocation: 'מעון נאות', category: 'ארנונה', amount: 4200 }, { allocation: 'מעון מחנה', category: 'ארנונה', amount: 3000 }, { allocation: 'טרם שויך', category: '—', amount: 1220 }] },
  { id: 2, date: '20.07.2026', description: 'העברה — משרד העבודה', reference: '601128', account: 'בנק לאומי • 7731', debit: 0, credit: 48600, allocation: 'מעון נאות', month: '07/2026', status: 'sent', statusLabel: 'נשלח להנה״ח', attachment: true, note: 'תמיכה חודשית עבור חודש יולי.', history: ['היום, 08:15 · נשלח להנה״ח', '20.07.2026 · שויך למעון נאות'] },
  { id: 3, date: '19.07.2026', description: 'סופר נקי בע״מ', reference: '88402', account: 'בנק הפועלים • 1842', debit: 1280, credit: 0, allocation: 'מעון מחנה', month: '07/2026', status: 'missing', statusLabel: 'חסר מסמך', attachment: false, note: 'ממתינים לחשבונית מהספק.', history: ['19.07.2026 · סומן כחסר מסמך'] },
  { id: 4, date: '18.07.2026', description: 'משכורות יולי', reference: 'PAY-0726', account: 'בנק הפועלים • 1842', debit: 72140, credit: 0, allocation: 'מפוצל ל־4', month: '07/2026', status: 'sent', statusLabel: 'נשלח להנה״ח', attachment: true, note: 'קובץ השכר מצורף.', history: ['18.07.2026 · נשלח להנה״ח'], splits: [{ allocation: 'מעון נאות', category: 'שכר', amount: 24600 }, { allocation: 'מעון מחנה', category: 'שכר', amount: 22140 }, { allocation: 'מעון אשקלון', category: 'שכר', amount: 17400 }, { allocation: 'משרד', category: 'שכר', amount: 8000 }] },
  { id: 5, date: '17.07.2026', description: 'עמלות בנק', reference: '4419', account: 'בנק לאומי • 7731', debit: 185, credit: 0, allocation: 'משרד', month: '07/2026', status: 'sent', statusLabel: 'נשלח להנה״ח', attachment: false, note: '', history: ['17.07.2026 · שויך אוטומטית למשרד'] },
  { id: 6, date: '16.07.2026', description: 'תרומה — קרן ירושלים', reference: 'DON-2184', account: 'בנק לאומי • 7731', debit: 0, credit: 25000, allocation: 'פיתוח', month: '07/2026', status: 'open', statusLabel: 'ממתין לשליחה', attachment: true, note: 'יש לאשר את קטגוריית ההכנסה.', history: ['16.07.2026 · נקלט מקובץ הבנק'] },
  { id: 7, date: '15.07.2026', description: 'חשמל — חברת החשמל', reference: '992774', account: 'בנק הפועלים • 1842', debit: 3940, credit: 0, allocation: 'מעון אשקלון', month: '07/2026', status: 'sent', statusLabel: 'נשלח להנה״ח', attachment: true, note: '', history: ['15.07.2026 · נשלח להנה״ח'] }
];

const state = { selected: 1, expanded: new Set([1]), quick: 'all', query: '', account: 'all', status: 'all' };
const money = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
const rowsEl = document.querySelector('#bank-rows');
const detailsEl = document.querySelector('#bank-details');

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
function filteredRows() {
  const q = state.query.trim().toLowerCase();
  return transactions.filter(row => (state.quick !== 'open' || ['open', 'missing'].includes(row.status)) && (state.quick !== 'split' || row.splits) && (state.status === 'all' || (state.status === 'open' ? ['open', 'missing'].includes(row.status) : row.status === state.status)) && (state.account === 'all' || row.account === state.account) && (!q || [row.description, row.reference, row.allocation, row.debit, row.credit].some(v => String(v).toLowerCase().includes(q))));
}
function statusClass(status) { return status === 'sent' ? 'done' : status === 'missing' ? 'danger' : 'pending'; }
function renderRows() {
  const rows = filteredRows();
  document.querySelector('#visible-count').textContent = `${rows.length} תנועות`;
  rowsEl.innerHTML = rows.map(row => {
    const expandable = Boolean(row.splits);
    const expanded = state.expanded.has(row.id);
    const parent = `<tr tabindex="0" data-id="${row.id}" class="transaction-row ${state.selected === row.id ? 'selected' : ''}"><td class="check-col"><input type="checkbox" aria-label="בחירת תנועה" /></td><td>${row.date}</td><td class="description-cell">${expandable ? `<button class="expand-button" data-expand="${row.id}" aria-label="${expanded ? 'סגירה' : 'פתיחה'}">${expanded ? '⌄' : '‹'}</button>` : '<span class="expand-spacer"></span>'}<span class="merchant-mark">${escapeHtml(row.description.slice(0, 1))}</span><strong>${escapeHtml(row.description)}</strong></td><td class="mono">${escapeHtml(row.reference)}</td><td>${escapeHtml(row.account)}</td><td class="amount debit">${row.debit ? money.format(row.debit) : '—'}</td><td class="amount credit">${row.credit ? money.format(row.credit) : '—'}</td><td><span class="allocation ${expandable ? 'split' : ''}">${escapeHtml(row.allocation)}</span></td><td>${row.month}</td><td><span class="status ${statusClass(row.status)}"><i></i>${escapeHtml(row.statusLabel)}</span></td><td class="attach-col"><span class="attachment ${row.attachment ? 'has-file' : ''}" title="${row.attachment ? 'יש מסמך' : 'אין מסמך'}">⌕</span></td></tr>`;
    const children = expanded ? row.splits.map((split, index) => `<tr class="split-row"><td></td><td></td><td><span class="split-line"></span><small>פיצול ${index + 1}</small></td><td></td><td></td><td class="amount debit">${money.format(split.amount)}</td><td>—</td><td><span class="allocation">${escapeHtml(split.allocation)}</span><small class="category">${escapeHtml(split.category)}</small></td><td>${row.month}</td><td></td><td></td></tr>`).join('') : '';
    return parent + children;
  }).join('') || '<tr><td colspan="11" class="empty-row">לא נמצאו תנועות במסננים הנוכחיים.</td></tr>';
  renderDetails();
}
function renderDetails() {
  const row = transactions.find(item => item.id === state.selected) || filteredRows()[0];
  if (!row) { detailsEl.hidden = true; return; }
  detailsEl.hidden = false;
  document.querySelector('#detail-title').textContent = row.description;
  document.querySelector('#detail-content').innerHTML = `<div class="detail-amount"><span>${row.debit ? 'חובה' : 'זכות'}</span><strong class="${row.debit ? 'debit' : 'credit'}">${money.format(row.debit || row.credit)}</strong><small>${row.date} · ${escapeHtml(row.account)}</small></div><dl class="detail-grid"><div><dt>אסמכתא</dt><dd>${escapeHtml(row.reference)}</dd></div><div><dt>חודש דיווח</dt><dd>${row.month}</dd></div><div><dt>שיוך</dt><dd>${escapeHtml(row.allocation)}</dd></div><div><dt>סטטוס</dt><dd><span class="status ${statusClass(row.status)}"><i></i>${escapeHtml(row.statusLabel)}</span></dd></div></dl><section class="detail-section"><div class="detail-section-title"><h3>מסמכים</h3><button disabled>＋ הוספה</button></div>${row.attachment ? '<div class="document-row"><span>▱</span><div><strong>אסמכתא סרוקה.pdf</strong><small>Google Drive · מסמך הדגמה</small></div><button disabled>↗</button></div>' : '<div class="document-empty"><span>⌕</span><p>טרם צורף מסמך</p><small>בעתיד יוצגו כאן מסמכי Google Drive</small></div>'}</section><section class="detail-section"><h3>הערות</h3><p class="note-box">${escapeHtml(row.note || 'אין הערות לתנועה זו.')}</p></section><section class="detail-section"><h3>היסטוריה</h3><ul class="history-list">${row.history.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section><details class="technical-info"><summary>מידע טכני</summary><p>מזהה פנימי, מקור יבוא ושדות בקרה יוצגו כאן בהרשאה מתאימה.</p></details>`;
}
function selectRow(id) { state.selected = id; renderRows(); document.querySelector(`[data-id="${id}"]`)?.focus({ preventScroll: true }); }
document.addEventListener('click', event => {
  const expand = event.target.closest('[data-expand]');
  if (expand) { event.stopPropagation(); const id = Number(expand.dataset.expand); state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id); state.selected = id; renderRows(); return; }
  const row = event.target.closest('.transaction-row'); if (row) selectRow(Number(row.dataset.id));
  const quick = event.target.closest('[data-quick]'); if (quick) { state.quick = quick.dataset.quick; document.querySelectorAll('[data-quick]').forEach(el => el.classList.toggle('active', el === quick)); renderRows(); }
});
document.addEventListener('keydown', event => {
  if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') { event.preventDefault(); document.querySelector('#bank-search').focus(); return; }
  if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key) || ['INPUT', 'SELECT'].includes(document.activeElement?.tagName)) return;
  const rows = filteredRows(); const index = rows.findIndex(row => row.id === state.selected);
  if (event.key === 'Enter') { const row = rows[index]; if (row?.splits) { state.expanded.has(row.id) ? state.expanded.delete(row.id) : state.expanded.add(row.id); renderRows(); } return; }
  event.preventDefault(); const next = event.key === 'ArrowDown' ? Math.min(index + 1, rows.length - 1) : Math.max(index - 1, 0); if (rows[next]) selectRow(rows[next].id);
});
document.querySelector('#bank-search').addEventListener('input', event => { state.query = event.target.value; renderRows(); });
document.querySelector('#account-filter').addEventListener('change', event => { state.account = event.target.value; renderRows(); });
document.querySelector('#status-filter').addEventListener('change', event => { state.status = event.target.value; renderRows(); });
document.querySelector('#clear-filters').addEventListener('click', () => { state.query = ''; state.account = 'all'; state.status = 'all'; state.quick = 'all'; document.querySelector('#bank-search').value = ''; document.querySelector('#account-filter').value = 'all'; document.querySelector('#status-filter').value = 'all'; document.querySelectorAll('[data-quick]').forEach(el => el.classList.toggle('active', el.dataset.quick === 'all')); renderRows(); });
document.querySelector('#close-details').addEventListener('click', () => { detailsEl.hidden = true; });
renderRows();
