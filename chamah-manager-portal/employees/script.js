const employees = [
  {
    "מספר עובד": "1001", "תעודת זהות": "028456789", "שם עובדת": "שרה לוי", "תאריך לידה לועזי": "1988-03-14", "תאריך לידה עברי": "כ״ה אדר תשמ״ח", "טלפון": "050-4123456", "מעון": "מעון גפן", "מנהלת ישירה": "רחל כהן", "כיתה": "בוגרים א׳", "תפקיד": "מובילת כיתה", "משרה": "מלאה", "היקף שעות": "42", "יום ראשון": "07:30-16:00", "יום שני": "07:30-16:00", "יום שלישי": "07:30-16:00", "יום רביעי": "07:30-16:00", "יום חמישי": "07:30-16:00", "יום שישי": "חופשי", "תאריך תחילת עבודה": "2017-09-01", "ותק לשכר": "8", "שנים במערכת": "9", "תעודת מטפלת": "קיימת", "סיום לימודים": "2027-08-30", "שכר בסיס": "₪8,900", "עזרה ראשונה עד": "2026-08-12", "התנהלות בטוחה עד": "2027-02-01", "אחראית כיתה": "כן", "סטטוס": "פעילה", "סוג העסקה": "חודשית", "מסמכים חסרים": "אין", "הערות": "מובילה ותיקה, אחראית קליטה לעובדות חדשות.", "עדכון אחרון": "2026-06-21"
  },
  {
    "מספר עובד": "1002", "תעודת זהות": "031234567", "שם עובדת": "מיכל אברהם", "תאריך לידה לועזי": "1994-11-02", "תאריך לידה עברי": "כ״ט חשוון תשנ״ה", "טלפון": "052-6234567", "מעון": "מעון גפן", "מנהלת ישירה": "רחל כהן", "כיתה": "פעוטים ב׳", "תפקיד": "מטפלת", "משרה": "חלקית", "היקף שעות": "31", "יום ראשון": "08:00-15:00", "יום שני": "08:00-15:00", "יום שלישי": "08:00-15:00", "יום רביעי": "08:00-15:00", "יום חמישי": "08:00-14:00", "יום שישי": "חופשי", "תאריך תחילת עבודה": "2022-01-10", "ותק לשכר": "4", "שנים במערכת": "4", "תעודת מטפלת": "בתהליך", "סיום לימודים": "2026-07-25", "שכר בסיס": "₪6,850", "עזרה ראשונה עד": "2026-07-18", "התנהלות בטוחה עד": "2025-12-15", "אחראית כיתה": "לא", "סטטוס": "פעילה", "סוג העסקה": "שעתית", "מסמכים חסרים": "אישור לימודים", "הערות": "נדרשת השלמת אישור לימודים מעודכן.", "עדכון אחרון": "2026-06-18"
  },
  {
    "מספר עובד": "1003", "תעודת זהות": "039876543", "שם עובדת": "דינה פרץ", "תאריך לידה לועזי": "1979-07-21", "תאריך לידה עברי": "כ״ו תמוז תשל״ט", "טלפון": "054-7345678", "מעון": "מעון רימון", "מנהלת ישירה": "לאה מזרחי", "כיתה": "תינוקות", "תפקיד": "מטפלת", "משרה": "מלאה", "היקף שעות": "40", "יום ראשון": "07:00-15:30", "יום שני": "07:00-15:30", "יום שלישי": "07:00-15:30", "יום רביעי": "07:00-15:30", "יום חמישי": "07:00-15:30", "יום שישי": "חופשי", "תאריך תחילת עבודה": "2014-09-01", "ותק לשכר": "12", "שנים במערכת": "12", "תעודת מטפלת": "חסרה", "סיום לימודים": "", "שכר בסיס": "₪8,200", "עזרה ראשונה עד": "2025-11-30", "התנהלות בטוחה עד": "2026-09-08", "אחראית כיתה": "לא", "סטטוס": "פעילה", "סוג העסקה": "חודשית", "מסמכים חסרים": "תעודת מטפלת, הצהרת בריאות", "הערות": "יש לתאם מסלול השלמה לתעודה.", "עדכון אחרון": "2026-06-10"
  },
  {
    "מספר עובד": "1004", "תעודת זהות": "025551234", "שם עובדת": "נועה ישראלי", "תאריך לידה לועזי": "1991-02-08", "תאריך לידה עברי": "כ״ד שבט תשנ״א", "טלפון": "053-8456789", "מעון": "מעון תמר", "מנהלת ישירה": "אסתר ביטון", "כיתה": "בוגרים ב׳", "תפקיד": "סייעת", "משרה": "חלקית", "היקף שעות": "28", "יום ראשון": "08:30-14:30", "יום שני": "08:30-14:30", "יום שלישי": "08:30-14:30", "יום רביעי": "08:30-14:30", "יום חמישי": "08:30-12:30", "יום שישי": "חופשי", "תאריך תחילת עבודה": "2024-09-01", "ותק לשכר": "2", "שנים במערכת": "2", "תעודת מטפלת": "לא נדרש", "סיום לימודים": "", "שכר בסיס": "₪5,900", "עזרה ראשונה עד": "2027-04-03", "התנהלות בטוחה עד": "2026-08-20", "אחראית כיתה": "לא", "סטטוס": "פעילה", "סוג העסקה": "שעתית", "מסמכים חסרים": "אין", "הערות": "זמינות גבוהה להחלפות בוקר.", "עדכון אחרון": "2026-06-22"
  },
  {
    "מספר עובד": "1005", "תעודת זהות": "022229999", "שם עובדת": "חנה בן דוד", "תאריך לידה לועזי": "1982-05-17", "תאריך לידה עברי": "כ״ד אייר תשמ״ב", "טלפון": "050-9567890", "מעון": "מעון רימון", "מנהלת ישירה": "לאה מזרחי", "כיתה": "פעוטים א׳", "תפקיד": "מובילת כיתה", "משרה": "מלאה", "היקף שעות": "42", "יום ראשון": "07:30-16:00", "יום שני": "07:30-16:00", "יום שלישי": "07:30-16:00", "יום רביעי": "07:30-16:00", "יום חמישי": "07:30-16:00", "יום שישי": "חופשי", "תאריך תחילת עבודה": "2019-03-01", "ותק לשכר": "7", "שנים במערכת": "7", "תעודת מטפלת": "קיימת", "סיום לימודים": "2028-02-01", "שכר בסיס": "₪9,200", "עזרה ראשונה עד": "2026-12-10", "התנהלות בטוחה עד": "2026-07-09", "אחראית כיתה": "כן", "סטטוס": "בחופשה", "סוג העסקה": "חודשית", "מסמכים חסרים": "אישור חזרה מחופשה", "הערות": "צפויה לחזור בתחילת אוגוסט.", "עדכון אחרון": "2026-06-12"
  },
  {
    "מספר עובד": "1006", "תעודת זהות": "034445678", "שם עובדת": "רבקה שלום", "תאריך לידה לועזי": "1997-10-30", "תאריך לידה עברי": "כ״ט תשרי תשנ״ח", "טלפון": "052-1678901", "מעון": "מעון תמר", "מנהלת ישירה": "אסתר ביטון", "כיתה": "תינוקות", "תפקיד": "מטפלת", "משרה": "מלאה", "היקף שעות": "39", "יום ראשון": "07:30-15:30", "יום שני": "07:30-15:30", "יום שלישי": "07:30-15:30", "יום רביעי": "07:30-15:30", "יום חמישי": "07:30-15:30", "יום שישי": "חופשי", "תאריך תחילת עבודה": "2025-09-01", "ותק לשכר": "1", "שנים במערכת": "1", "תעודת מטפלת": "בתהליך", "סיום לימודים": "2026-10-15", "שכר בסיס": "₪7,100", "עזרה ראשונה עד": "", "התנהלות בטוחה עד": "2027-01-15", "אחראית כיתה": "לא", "סטטוס": "פעילה", "סוג העסקה": "חודשית", "מסמכים חסרים": "עזרה ראשונה", "הערות": "חסרה הכשרת עזרה ראשונה בתיק.", "עדכון אחרון": "2026-06-24"
  }
];

const today = new Date();
const soonMs = 60 * 24 * 60 * 60 * 1000;
const state = { search: '', daycare: 'all', role: 'all', status: 'all', certificate: 'all', selectedId: employees[0]["מספר עובד"] };

const fields = {
  search: document.querySelector('#employee-search'), daycare: document.querySelector('#daycare-filter'), role: document.querySelector('#role-filter'), status: document.querySelector('#status-filter'), certificate: document.querySelector('#certificate-filter'), list: document.querySelector('#employee-card-list'), empty: document.querySelector('#employee-empty'), count: document.querySelector('#employee-count-label'), detailEmpty: document.querySelector('#employee-detail-empty'), detail: document.querySelector('#employee-detail-content')
};

function unique(key) { return [...new Set(employees.map(item => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he')); }
function fillSelect(select, label, values) { select.innerHTML = '<option value="all">' + label + '</option>' + values.map(value => '<option value="' + value + '">' + value + '</option>').join(''); }
function licenseTone(value) { if (!value || value === 'חסרה') return 'danger'; if (value === 'בתהליך') return 'warning'; return 'ok'; }
function dateTone(value) { if (!value) return 'danger'; const date = new Date(value); if (Number.isNaN(date.getTime())) return 'danger'; if (date < today) return 'danger'; if (date.getTime() - today.getTime() <= soonMs) return 'warning'; return 'ok'; }
function toneText(tone) { return tone === 'ok' ? 'בתוקף' : tone === 'warning' ? 'פג בקרוב' : 'חסר / פג'; }
function formatDate(value) { if (!value) return 'חסר'; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return date.toLocaleDateString('he-IL'); }
function isMissingCert(employee) { return ['חסרה', 'בתהליך', ''].includes(employee['תעודת מטפלת']); }
function hasExpiringTraining(employee) { return ['עזרה ראשונה עד', 'התנהלות בטוחה עד', 'סיום לימודים'].some(key => dateTone(employee[key]) === 'warning'); }

function filteredEmployees() {
  return employees.filter(employee => {
    const matchSearch = employee['שם עובדת'].includes(state.search);
    const matchDaycare = state.daycare === 'all' || employee['מעון'] === state.daycare;
    const matchRole = state.role === 'all' || employee['תפקיד'] === state.role;
    const matchStatus = state.status === 'all' || employee['סטטוס'] === state.status;
    const matchCertificate = state.certificate === 'all' || employee['תעודת מטפלת'] === state.certificate;
    return matchSearch && matchDaycare && matchRole && matchStatus && matchCertificate;
  });
}

function renderInsights() {
  document.querySelector('#insight-total').textContent = employees.length;
  document.querySelector('#insight-active').textContent = employees.filter(item => item['סטטוס'] === 'פעילה').length;
  document.querySelector('#insight-missing-cert').textContent = employees.filter(isMissingCert).length;
  document.querySelector('#insight-expiring').textContent = employees.filter(hasExpiringTraining).length;
}

function card(employee) {
  const selected = employee['מספר עובד'] === state.selectedId ? ' selected' : '';
  return '<button class="employee-card' + selected + '" type="button" data-id="' + employee['מספר עובד'] + '">' +
    '<div class="employee-card-main"><strong>' + employee['שם עובדת'] + '</strong><span>' + employee['מעון'] + ' · ' + employee['כיתה'] + '</span></div>' +
    '<dl><div><dt>תפקיד</dt><dd>' + employee['תפקיד'] + '</dd></div><div><dt>משרה</dt><dd>' + employee['משרה'] + '</dd></div><div><dt>סטטוס</dt><dd>' + employee['סטטוס'] + '</dd></div></dl>' +
    '</button>';
}

function detailItem(label, value, extra = '') { return '<div class="employee-detail-item ' + extra + '"><span>' + label + '</span><strong>' + (value || 'חסר') + '</strong></div>'; }
function statusItem(label, value) { const tone = dateTone(value); return '<div class="training-status ' + tone + '"><span>' + label + '</span><strong>' + formatDate(value) + '</strong><small>' + toneText(tone) + '</small></div>'; }
function detailSection(title, html, extra = '') { return '<section class="employee-detail-section ' + extra + '"><h3>' + title + '</h3><div>' + html + '</div></section>'; }

function renderDetail(employee) {
  if (!employee) { fields.detail.hidden = true; fields.detailEmpty.hidden = false; return; }
  fields.detailEmpty.hidden = true;
  fields.detail.hidden = false;
  fields.detail.innerHTML = '<div class="employee-profile-head"><div><span>פרופיל עובדת</span><strong>' + employee['שם עובדת'] + '</strong><p>' + employee['תפקיד'] + ' · ' + employee['מעון'] + '</p></div><span class="employee-status-chip">' + employee['סטטוס'] + '</span></div>' +
    detailSection('פרטים כלליים', detailItem('מספר עובד', employee['מספר עובד']) + detailItem('שם עובדת', employee['שם עובדת']) + detailItem('תאריך לידה לועזי', formatDate(employee['תאריך לידה לועזי'])) + detailItem('תאריך לידה עברי', employee['תאריך לידה עברי']) + detailItem('עדכון אחרון', formatDate(employee['עדכון אחרון']))) +
    detailSection('מידע רגיש', detailItem('תעודת זהות', employee['תעודת זהות'], 'sensitive') + detailItem('טלפון', employee['טלפון'], 'sensitive') + detailItem('שכר בסיס', employee['שכר בסיס'], 'sensitive'), 'sensitive-section') +
    detailSection('שיבוץ ותפקיד', detailItem('מעון', employee['מעון']) + detailItem('מנהלת ישירה', employee['מנהלת ישירה']) + detailItem('כיתה', employee['כיתה']) + detailItem('תפקיד', employee['תפקיד']) + detailItem('אחראית כיתה', employee['אחראית כיתה']) + detailItem('סטטוס', employee['סטטוס']) + detailItem('סוג העסקה', employee['סוג העסקה'])) +
    detailSection('ימי עבודה ומשרה', detailItem('משרה', employee['משרה']) + detailItem('היקף שעות', employee['היקף שעות']) + detailItem('יום ראשון', employee['יום ראשון']) + detailItem('יום שני', employee['יום שני']) + detailItem('יום שלישי', employee['יום שלישי']) + detailItem('יום רביעי', employee['יום רביעי']) + detailItem('יום חמישי', employee['יום חמישי']) + detailItem('יום שישי', employee['יום שישי'])) +
    detailSection('ותק ושכר', detailItem('תאריך תחילת עבודה', formatDate(employee['תאריך תחילת עבודה'])) + detailItem('ותק לשכר', employee['ותק לשכר']) + detailItem('שנים במערכת', employee['שנים במערכת'])) +
    detailSection('הכשרות ורישוי', '<div class="training-grid">' + statusItem('עזרה ראשונה עד', employee['עזרה ראשונה עד']) + statusItem('התנהלות בטוחה עד', employee['התנהלות בטוחה עד']) + statusItem('סיום לימודים', employee['סיום לימודים']) + '</div>' + detailItem('תעודת מטפלת', employee['תעודת מטפלת'], licenseTone(employee['תעודת מטפלת']))) +
    detailSection('מסמכים והערות', detailItem('מסמכים חסרים', employee['מסמכים חסרים']) + detailItem('הערות', employee['הערות']));
}

function renderList() {
  const list = filteredEmployees();
  fields.count.textContent = list.length + ' עובדות';
  fields.empty.hidden = list.length > 0;
  fields.list.innerHTML = list.map(card).join('');
  if (!list.some(item => item['מספר עובד'] === state.selectedId)) state.selectedId = list[0]?.['מספר עובד'] || '';
  renderDetail(employees.find(item => item['מספר עובד'] === state.selectedId));
}

function bind() {
  fillSelect(fields.daycare, 'כל המעונות', unique('מעון'));
  fillSelect(fields.role, 'כל התפקידים', unique('תפקיד'));
  fillSelect(fields.status, 'כל הסטטוסים', unique('סטטוס'));
  fillSelect(fields.certificate, 'כל מצבי התעודה', unique('תעודת מטפלת'));
  fields.search.addEventListener('input', event => { state.search = event.target.value.trim(); renderList(); });
  fields.daycare.addEventListener('change', event => { state.daycare = event.target.value; renderList(); });
  fields.role.addEventListener('change', event => { state.role = event.target.value; renderList(); });
  fields.status.addEventListener('change', event => { state.status = event.target.value; renderList(); });
  fields.certificate.addEventListener('change', event => { state.certificate = event.target.value; renderList(); });
  fields.list.addEventListener('click', event => { const button = event.target.closest('.employee-card'); if (!button) return; state.selectedId = button.dataset.id; renderList(); document.querySelector('#employee-detail-panel').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
}

renderInsights();
bind();
renderList();
