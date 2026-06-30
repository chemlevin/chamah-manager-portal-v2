let employees = [];

const FIELD_KEYS = {
  id: "מספר עובד",
  nationalId: "תעודת זהות",
  name: "שם עובדת",
  birthDate: "תאריך לידה לועזי",
  hebrewBirthDate: "תאריך לידה עברי",
  phone: "טלפון",
  daycare: "מעון",
  manager: "מנהלת ישירה",
  classroom: "כיתה",
  role: "תפקיד",
  position: "משרה",
  hours: "היקף שעות",
  sunday: "יום ראשון",
  monday: "יום שני",
  tuesday: "יום שלישי",
  wednesday: "יום רביעי",
  thursday: "יום חמישי",
  friday: "יום שישי",
  startDate: "תאריך תחילת עבודה",
  salarySeniority: "ותק לשכר",
  systemYears: "שנים במערכת",
  caregiverCertificate: "תעודת מטפלת",
  graduationDate: "סיום לימודים",
  baseSalary: "שכר בסיס",
  firstAidUntil: "עזרה ראשונה עד",
  safeConductUntil: "התנהלות בטוחה עד",
  classroomLead: "אחראית כיתה",
  status: "סטטוס",
  employmentType: "סוג העסקה",
  missingDocuments: "מסמכים חסרים",
  notes: "הערות",
  lastUpdate: "עדכון אחרון",
};

const today = new Date();
const soonMs = 60 * 24 * 60 * 60 * 1000;
const state = { search: '', daycare: 'all', role: 'all', status: 'all', certificate: 'all', selectedId: '' };

const fields = {
  search: document.querySelector('#employee-search'),
  daycare: document.querySelector('#daycare-filter'),
  role: document.querySelector('#role-filter'),
  status: document.querySelector('#status-filter'),
  certificate: document.querySelector('#certificate-filter'),
  list: document.querySelector('#employee-card-list'),
  empty: document.querySelector('#employee-empty'),
  count: document.querySelector('#employee-count-label'),
  detailEmpty: document.querySelector('#employee-detail-empty'),
  detail: document.querySelector('#employee-detail-content'),
};

function value(employee, key) {
  return employee?.[FIELD_KEYS[key]] || '';
}

function unique(key) {
  return [...new Set(employees.map((item) => value(item, key)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he'));
}

function fillSelect(select, label, values) {
  select.innerHTML = '<option value="all">' + label + '</option>' + values.map((item) => '<option value="' + item + '">' + item + '</option>').join('');
}

function resetFilters() {
  fillSelect(fields.daycare, 'כל המעונות', unique('daycare'));
  fillSelect(fields.role, 'כל התפקידים', unique('role'));
  fillSelect(fields.status, 'כל הסטטוסים', unique('status'));
  fillSelect(fields.certificate, 'כל מצבי התעודה', unique('caregiverCertificate'));
}

function licenseTone(certificate) {
  if (!certificate || certificate === 'חסרה') return 'danger';
  if (certificate === 'בתהליך') return 'warning';
  return 'ok';
}

function parseDate(value) {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  const match = String(value).match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!match) return null;
  const year = match[3].length === 2 ? '20' + match[3] : match[3];
  const date = new Date(Number(year), Number(match[2]) - 1, Number(match[1]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateTone(dateValue) {
  const date = parseDate(dateValue);
  if (!date) return 'danger';
  if (date < today) return 'danger';
  if (date.getTime() - today.getTime() <= soonMs) return 'warning';
  return 'ok';
}

function toneText(tone) {
  return tone === 'ok' ? 'בתוקף' : tone === 'warning' ? 'פג בקרוב' : 'חסר / פג';
}

function formatDate(dateValue) {
  if (!dateValue) return 'חסר';
  const date = parseDate(dateValue);
  if (!date) return dateValue;
  return date.toLocaleDateString('he-IL');
}

function isMissingCert(employee) {
  return ['חסרה', 'בתהליך', ''].includes(value(employee, 'caregiverCertificate'));
}

function hasExpiringTraining(employee) {
  return ['firstAidUntil', 'safeConductUntil', 'graduationDate'].some((key) => dateTone(value(employee, key)) === 'warning');
}

function filteredEmployees() {
  return employees.filter((employee) => {
    const matchSearch = value(employee, 'name').includes(state.search);
    const matchDaycare = state.daycare === 'all' || value(employee, 'daycare') === state.daycare;
    const matchRole = state.role === 'all' || value(employee, 'role') === state.role;
    const matchStatus = state.status === 'all' || value(employee, 'status') === state.status;
    const matchCertificate = state.certificate === 'all' || value(employee, 'caregiverCertificate') === state.certificate;
    return matchSearch && matchDaycare && matchRole && matchStatus && matchCertificate;
  });
}

function renderInsights() {
  document.querySelector('#insight-total').textContent = employees.length;
  document.querySelector('#insight-active').textContent = employees.filter((item) => value(item, 'status') === 'פעילה').length;
  document.querySelector('#insight-missing-cert').textContent = employees.filter(isMissingCert).length;
  document.querySelector('#insight-expiring').textContent = employees.filter(hasExpiringTraining).length;
}

function card(employee) {
  const selected = value(employee, 'id') === state.selectedId ? ' selected' : '';
  return '<button class="employee-card' + selected + '" type="button" data-id="' + value(employee, 'id') + '">' +
    '<div class="employee-card-main"><strong>' + value(employee, 'name') + '</strong><span>' + value(employee, 'daycare') + ' · ' + value(employee, 'classroom') + '</span></div>' +
    '<dl><div><dt>תפקיד</dt><dd>' + value(employee, 'role') + '</dd></div><div><dt>משרה</dt><dd>' + value(employee, 'position') + '</dd></div><div><dt>סטטוס</dt><dd>' + value(employee, 'status') + '</dd></div></dl>' +
    '</button>';
}

function detailItem(label, itemValue, extra = '') {
  return '<div class="employee-detail-item ' + extra + '"><span>' + label + '</span><strong>' + (itemValue || 'חסר') + '</strong></div>';
}

function statusItem(label, itemValue) {
  const tone = dateTone(itemValue);
  return '<div class="training-status ' + tone + '"><span>' + label + '</span><strong>' + formatDate(itemValue) + '</strong><small>' + toneText(tone) + '</small></div>';
}

function detailSection(title, html, extra = '') {
  return '<section class="employee-detail-section ' + extra + '"><h3>' + title + '</h3><div>' + html + '</div></section>';
}

function renderDetail(employee) {
  if (!employee) {
    fields.detail.hidden = true;
    fields.detailEmpty.hidden = false;
    return;
  }

  fields.detailEmpty.hidden = true;
  fields.detail.hidden = false;
  fields.detail.innerHTML = '<div class="employee-profile-head"><div><span>פרופיל עובדת</span><strong>' + value(employee, 'name') + '</strong><p>' + value(employee, 'role') + ' · ' + value(employee, 'daycare') + '</p></div><span class="employee-status-chip">' + value(employee, 'status') + '</span></div>' +
    detailSection('פרטים כלליים', detailItem('מספר עובד', value(employee, 'id')) + detailItem('שם עובדת', value(employee, 'name')) + detailItem('תאריך לידה לועזי', formatDate(value(employee, 'birthDate'))) + detailItem('תאריך לידה עברי', value(employee, 'hebrewBirthDate')) + detailItem('עדכון אחרון', formatDate(value(employee, 'lastUpdate')))) +
    detailSection('מידע רגיש', detailItem('תעודת זהות', value(employee, 'nationalId'), 'sensitive') + detailItem('טלפון', value(employee, 'phone'), 'sensitive') + detailItem('שכר בסיס', value(employee, 'baseSalary'), 'sensitive'), 'sensitive-section') +
    detailSection('שיבוץ ותפקיד', detailItem('מעון', value(employee, 'daycare')) + detailItem('מנהלת ישירה', value(employee, 'manager')) + detailItem('כיתה', value(employee, 'classroom')) + detailItem('תפקיד', value(employee, 'role')) + detailItem('אחראית כיתה', value(employee, 'classroomLead')) + detailItem('סטטוס', value(employee, 'status')) + detailItem('סוג העסקה', value(employee, 'employmentType'))) +
    detailSection('ימי עבודה ומשרה', detailItem('משרה', value(employee, 'position')) + detailItem('היקף שעות', value(employee, 'hours')) + detailItem('יום ראשון', value(employee, 'sunday')) + detailItem('יום שני', value(employee, 'monday')) + detailItem('יום שלישי', value(employee, 'tuesday')) + detailItem('יום רביעי', value(employee, 'wednesday')) + detailItem('יום חמישי', value(employee, 'thursday')) + detailItem('יום שישי', value(employee, 'friday'))) +
    detailSection('ותק ושכר', detailItem('תאריך תחילת עבודה', formatDate(value(employee, 'startDate'))) + detailItem('ותק לשכר', value(employee, 'salarySeniority')) + detailItem('שנים במערכת', value(employee, 'systemYears'))) +
    detailSection('הכשרות ורישוי', '<div class="training-grid">' + statusItem('עזרה ראשונה עד', value(employee, 'firstAidUntil')) + statusItem('התנהלות בטוחה עד', value(employee, 'safeConductUntil')) + statusItem('סיום לימודים', value(employee, 'graduationDate')) + '</div>' + detailItem('תעודת מטפלת', value(employee, 'caregiverCertificate'), licenseTone(value(employee, 'caregiverCertificate')))) +
    detailSection('מסמכים והערות', detailItem('מסמכים חסרים', value(employee, 'missingDocuments')) + detailItem('הערות', value(employee, 'notes')));
}

function renderList() {
  const list = filteredEmployees();
  fields.count.textContent = list.length + ' עובדות';
  fields.empty.hidden = list.length > 0;
  fields.list.innerHTML = list.map(card).join('');
  if (!list.some((item) => value(item, 'id') === state.selectedId)) state.selectedId = value(list[0], 'id') || '';
  renderDetail(employees.find((item) => value(item, 'id') === state.selectedId));
}

function setLoading() {
  fields.list.innerHTML = '';
  fields.empty.hidden = false;
  fields.empty.textContent = 'טוען נתוני צוות...';
  fields.count.textContent = '0 עובדות';
  fields.detail.hidden = true;
  fields.detailEmpty.hidden = false;
  renderInsights();
}

function setError() {
  employees = [];
  fields.list.innerHTML = '';
  fields.empty.hidden = false;
  fields.empty.textContent = 'לא ניתן לטעון את נתוני הצוות כרגע.';
  fields.count.textContent = '0 עובדות';
  fields.detail.hidden = true;
  fields.detailEmpty.hidden = false;
  renderInsights();
}

function bind() {
  fields.search.addEventListener('input', (event) => { state.search = event.target.value.trim(); renderList(); });
  fields.daycare.addEventListener('change', (event) => { state.daycare = event.target.value; renderList(); });
  fields.role.addEventListener('change', (event) => { state.role = event.target.value; renderList(); });
  fields.status.addEventListener('change', (event) => { state.status = event.target.value; renderList(); });
  fields.certificate.addEventListener('change', (event) => { state.certificate = event.target.value; renderList(); });
  fields.list.addEventListener('click', (event) => {
    const button = event.target.closest('.employee-card');
    if (!button) return;
    state.selectedId = button.dataset.id;
    renderList();
    document.querySelector('#employee-detail-panel').scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
}

async function loadEmployees() {
  setLoading();
  try {
    const response = await fetch('/api/employees');
    if (!response.ok) throw new Error('Failed to load employees');
    const data = await response.json();
    employees = Array.isArray(data.employees) ? data.employees : [];
    state.selectedId = value(employees[0], 'id') || '';
    resetFilters();
    renderInsights();
    renderList();
  } catch (error) {
    console.error(error);
    setError();
  }
}

resetFilters();
bind();
loadEmployees();
