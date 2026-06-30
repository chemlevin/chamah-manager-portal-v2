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
today.setHours(0, 0, 0, 0);
const soonMs = 90 * 24 * 60 * 60 * 1000;

const dayFields = [
  ['יום ראשון', 'sunday'],
  ['יום שני', 'monday'],
  ['יום שלישי', 'tuesday'],
  ['יום רביעי', 'wednesday'],
  ['יום חמישי', 'thursday'],
  ['יום שישי', 'friday'],
];

const extraFilterFields = [
  { value: 'manager', label: 'מנהלת ישירה', type: 'values' },
  { value: 'classroom', label: 'כיתה', type: 'values' },
  { value: 'role', label: 'תפקיד', type: 'values' },
  { value: 'status', label: 'סטטוס', type: 'values' },
  { value: 'caregiverCertificate', label: 'תעודת מטפלת', type: 'certificate' },
  { value: 'classroomLead', label: 'אחראית כיתה', type: 'values' },
  { value: 'sunday', label: 'יום ראשון', type: 'values' },
  { value: 'monday', label: 'יום שני', type: 'values' },
  { value: 'tuesday', label: 'יום שלישי', type: 'values' },
  { value: 'wednesday', label: 'יום רביעי', type: 'values' },
  { value: 'thursday', label: 'יום חמישי', type: 'values' },
  { value: 'friday', label: 'יום שישי', type: 'values' },
  { value: 'firstAidUntil', label: 'עזרה ראשונה', type: 'dateStatus' },
  { value: 'safeConductUntil', label: 'התנהלות בטוחה', type: 'dateStatus' },
  { value: 'expiringSoon', label: 'הכשרות שפגות בקרוב', type: 'yesNo' },
  { value: 'missingCertificates', label: 'תעודות חסרות', type: 'yesNo' },
];

const state = {
  selectedDaycares: [],
  extraField: '',
  extraValue: '',
  search: '',
  selectedId: '',
};

const fields = {
  daycareChips: document.querySelector('#daycare-chip-list'),
  extraField: document.querySelector('#extra-filter-field'),
  extraValue: document.querySelector('#extra-filter-value'),
  search: document.querySelector('#employee-search'),
  apply: document.querySelector('#employee-filter-apply'),
  reset: document.querySelector('#employee-filter-reset'),
  exportButton: document.querySelector('#employee-export-button'),
  activeFilters: document.querySelector('#active-filter-chips'),
  resultSummary: document.querySelector('#employee-result-summary'),
  insightScope: document.querySelector('#employee-insight-scope'),
  insightTotal: document.querySelector('#insight-total'),
  insightActive: document.querySelector('#insight-active'),
  insightMissingCert: document.querySelector('#insight-missing-cert'),
  insightExpiring: document.querySelector('#insight-expiring'),
  list: document.querySelector('#employee-card-list'),
  empty: document.querySelector('#employee-empty'),
  count: document.querySelector('#employee-count-label'),
  detailEmpty: document.querySelector('#employee-detail-empty'),
  detail: document.querySelector('#employee-detail-content'),
};

function value(employee, key) {
  return String(employee?.[FIELD_KEYS[key]] || '').trim();
}

function clean(valueToClean) {
  const text = String(valueToClean || '').trim();
  if (!text || ['-', 'undefined', 'null', 'לא ידוע', 'חסר'].includes(text)) return '';
  return text;
}

function unique(key) {
  return [...new Set(employees.map((item) => clean(value(item, key))).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he'));
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseDate(dateValue) {
  if (!dateValue) return null;
  const text = String(dateValue).trim();
  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct;
  const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!match) return null;
  const year = match[3].length === 2 ? '20' + match[3] : match[3];
  const date = new Date(Number(year), Number(match[2]) - 1, Number(match[1]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateStatus(dateValue) {
  const date = parseDate(dateValue);
  if (!date) return 'missing';
  date.setHours(0, 0, 0, 0);
  if (date < today) return 'expired';
  if (date.getTime() - today.getTime() <= soonMs) return 'soon';
  return 'valid';
}

function statusText(status) {
  return status === 'valid' ? 'תקף' : status === 'soon' ? 'פג בקרוב' : status === 'expired' ? 'פג תוקף' : 'חסר';
}

function statusTone(status) {
  return status === 'valid' ? 'ok' : status === 'soon' ? 'warning' : 'danger';
}

function formatDate(dateValue) {
  const cleaned = clean(dateValue);
  if (!cleaned) return '';
  const date = parseDate(cleaned);
  if (!date) return cleaned;
  return date.toLocaleDateString('he-IL');
}

function employeeStatusValue(employee) {
  return value(employee, 'status');
}

function isLeftEmployee(employee) {
  return employeeStatusValue(employee) === 'עזבה';
}

function isActive(employee) {
  return employeeStatusValue(employee) === 'עובדת';
}

function statsEmployees(list = filteredEmployees()) {
  return list.filter((employee) => !isLeftEmployee(employee));
}

function employeeStatusTone(employee) {
  const status = employeeStatusValue(employee);
  if (status === 'עובדת') return 'ok';
  if (status === 'עזבה') return 'danger';
  return status ? 'orange' : 'muted';
}

function employeeStatusBadge(employee) {
  const status = employeeStatusValue(employee);
  if (!status) return '';
  return '<span class="employee-card-status ' + employeeStatusTone(employee) + '">' + escapeHtml(status) + '</span>';
}

function certificateStatus(employee) {
  const certificate = value(employee, 'caregiverCertificate');
  if (!certificate) return { tone: 'hidden', label: '', missing: true };
  if (certificate === 'יש') return { tone: 'ok', label: 'תעודת מטפלת: יש', missing: false };
  if (certificate === 'אין') return { tone: 'danger', label: 'תעודת מטפלת: אין', missing: true };
  if (certificate === 'בלימודים') return { tone: 'orange', label: 'תעודת מטפלת: בלימודים', missing: true };
  if (certificate === 'מחכה לקורס') return { tone: 'pink', label: 'תעודת מטפלת: מחכה לקורס', missing: true };
  if (/אין|חסר|לא|בתהליך|בלימוד|מחכה/.test(certificate)) {
    return { tone: 'danger', label: 'תעודת מטפלת: ' + certificate, missing: true };
  }
  return { tone: 'ok', label: 'תעודת מטפלת: ' + certificate, missing: false };
}

function isInvalidCertificate(employee) {
  return certificateStatus(employee).missing;
}

function graduationStatus(employee) {
  const graduation = value(employee, 'graduationDate');
  if (!graduation) return null;
  const status = dateStatus(graduation);
  const date = formatDate(graduation);
  if (status === 'expired') return { tone: 'danger', label: 'סיום לימודים עבר: ' + date, status };
  if (status === 'soon') return { tone: 'pink-light', label: 'סיום לימודים בקרוב: ' + date, status };
  return { tone: 'orange', label: 'סיום לימודים: ' + date, status };
}

function firstAidStatus(employee) {
  const firstAid = value(employee, 'firstAidUntil');
  const status = dateStatus(firstAid);
  const date = formatDate(firstAid);
  if (status === 'missing') return { tone: 'danger', label: 'עזרה ראשונה חסרה', status };
  if (status === 'expired') return { tone: 'danger', label: 'עזרה ראשונה פגה: ' + date, status };
  if (status === 'soon') return { tone: 'pink-light', label: 'עזרה ראשונה פגה בקרוב: ' + date, status };
  return { tone: 'ok', label: 'עזרה ראשונה בתוקף עד: ' + date, status };
}

function safeConductStatus(employee) {
  const safe = value(employee, 'safeConductUntil');
  if (!safe || safe === 'אין') return { tone: 'danger', label: 'התנהלות בטוחה חסרה', status: 'missing' };
  if (safe === 'בלימודים') return { tone: 'orange', label: 'התנהלות בטוחה בלימודים', status: 'study' };
  const status = dateStatus(safe);
  const date = formatDate(safe);
  if (status === 'missing') return { tone: 'danger', label: 'התנהלות בטוחה חסרה', status };
  if (status === 'expired') return { tone: 'danger', label: 'התנהלות בטוחה פגה: ' + date, status };
  if (status === 'soon') return { tone: 'pink-light', label: 'התנהלות בטוחה פגה בקרוב: ' + date, status };
  return { tone: 'ok', label: 'התנהלות בטוחה בתוקף עד: ' + date, status };
}

function employeeStatusBadges(employee) {
  return [
    certificateStatus(employee),
    graduationStatus(employee),
    firstAidStatus(employee),
    safeConductStatus(employee),
  ].filter((badge) => badge && badge.tone !== 'hidden');
}

function hasExpiringTraining(employee) {
  return [graduationStatus(employee), firstAidStatus(employee), safeConductStatus(employee)]
    .some((badge) => badge && ['soon'].includes(badge.status));
}

function hasExpiredTraining(employee) {
  return [firstAidStatus(employee), safeConductStatus(employee)]
    .some((badge) => badge && badge.status === 'expired');
}

function findFreeDay(employee) {
  const free = dayFields.find(([, key]) => {
    const dayValue = value(employee, key);
    return !dayValue || /חופש|חופשי|לא|ריק|-/.test(dayValue);
  });
  return free ? free[0] : '';
}

function employeeMatchesSearch(employee, search) {
  if (!search) return true;
  const haystack = ['name', 'daycare', 'classroom', 'role', 'position', 'manager', 'notes']
    .map((key) => value(employee, key))
    .join(' ');
  return haystack.includes(search);
}

function employeeMatchesExtra(employee) {
  if (!state.extraField || !state.extraValue) return true;
  if (state.extraField === 'expiringSoon') return hasExpiringTraining(employee);
  if (state.extraField === 'missingCertificates') return isInvalidCertificate(employee);
  if (state.extraField === 'caregiverCertificate') {
    const certificate = value(employee, 'caregiverCertificate');
    if (state.extraValue === '__empty__') return !certificate;
    if (state.extraValue === '__exists__') return Boolean(certificate) && !isInvalidCertificate(employee);
    if (state.extraValue === '__invalid__') return isInvalidCertificate(employee);
    return certificate === state.extraValue;
  }
  if (['firstAidUntil', 'safeConductUntil'].includes(state.extraField)) {
    return dateStatus(value(employee, state.extraField)) === state.extraValue;
  }
  return value(employee, state.extraField) === state.extraValue;
}

function filteredEmployees() {
  return employees.filter((employee) => {
    const daycareMatch = state.selectedDaycares.length === 0 || state.selectedDaycares.includes(value(employee, 'daycare'));
    return daycareMatch && employeeMatchesExtra(employee) && employeeMatchesSearch(employee, state.search);
  });
}

function scopeTitle() {
  if (state.selectedDaycares.length === 1) return 'נתוני מעון ' + state.selectedDaycares[0];
  if (state.selectedDaycares.length > 1) return 'נתוני מעונות נבחרים';
  if (state.extraField === 'manager' && state.extraValue) return 'נתוני מנהלת: ' + state.extraValue;
  return 'נתוני צוות כלליים';
}

function renderDaycareChips() {
  const daycares = unique('daycare');
  fields.daycareChips.innerHTML = daycares.map((daycare) => {
    const selected = state.selectedDaycares.includes(daycare);
    return '<button class="filter-chip-button' + (selected ? ' selected' : '') + '" type="button" data-daycare="' + escapeHtml(daycare) + '">' + escapeHtml(daycare) + '</button>';
  }).join('');
}

function setSelectOptions(select, label, options) {
  select.innerHTML = '<option value="">' + escapeHtml(label) + '</option>' + options.map((option) => '<option value="' + escapeHtml(option.value) + '">' + escapeHtml(option.label) + '</option>').join('');
}

function updateExtraValueOptions() {
  const config = extraFilterFields.find((item) => item.value === fields.extraField.value);
  fields.extraValue.disabled = !config;
  state.extraField = fields.extraField.value;
  state.extraValue = config ? state.extraValue : '';
  if (!config) {
    setSelectOptions(fields.extraValue, 'בחרי ערך', []);
    return;
  }

  let options = [];
  if (config.type === 'values') {
    options = unique(config.value).map((item) => ({ value: item, label: item }));
  } else if (config.type === 'certificate') {
    options = [
      { value: '__empty__', label: 'ריק' },
      { value: '__exists__', label: 'יש תעודה תקינה' },
      { value: '__invalid__', label: 'חסר / לא תקין' },
      ...unique('caregiverCertificate').map((item) => ({ value: item, label: item })),
    ];
  } else if (config.type === 'dateStatus') {
    options = [
      { value: 'valid', label: 'תקף' },
      { value: 'soon', label: 'פג בקרוב' },
      { value: 'expired', label: 'פג תוקף' },
      { value: 'missing', label: 'חסר' },
    ];
  } else if (config.type === 'yesNo') {
    options = [{ value: 'yes', label: 'כן' }];
  }
  setSelectOptions(fields.extraValue, 'בחרי ערך', options);
  if (state.extraValue) fields.extraValue.value = state.extraValue;
}

function renderActiveFilterChips(list) {
  const statsList = statsEmployees(list);
  const chips = [];
  state.selectedDaycares.forEach((daycare) => chips.push(daycare));
  const config = extraFilterFields.find((item) => item.value === state.extraField);
  if (config && state.extraValue) {
    const selectedOption = [...fields.extraValue.options].find((option) => option.value === state.extraValue);
    chips.push(config.label + ': ' + (selectedOption?.textContent || state.extraValue));
  }
  if (state.search) chips.push('חיפוש: ' + state.search);
  fields.activeFilters.innerHTML = chips.map((chip) => '<span>' + escapeHtml(chip) + '</span>').join('');
  fields.activeFilters.hidden = chips.length === 0;
  fields.resultSummary.textContent = 'מציג ' + statsList.length + ' עובדות מתוך ' + statsEmployees(employees).length;
}

function renderInsights() {
  const list = statsEmployees(filteredEmployees());
  fields.insightScope.textContent = scopeTitle();
  fields.insightTotal.textContent = list.length;
  fields.insightActive.textContent = list.filter(isActive).length;
  fields.insightMissingCert.textContent = list.filter(isInvalidCertificate).length;
  fields.insightExpiring.textContent = list.filter(hasExpiringTraining).length;
  renderActiveFilterChips(filteredEmployees());
}

function warningBadges(employee) {
  return employeeStatusBadges(employee)
    .map((badge) => '<span class="employee-warning-badge ' + badge.tone + '">' + escapeHtml(badge.label) + '</span>')
    .join('');
}

function inlineMeta(items) {
  return items.filter(Boolean).map(escapeHtml).join(' · ');
}

function card(employee) {
  const selected = state.selectedId && value(employee, 'id') === state.selectedId ? ' selected' : '';
  const freeDay = findFreeDay(employee);
  const meta = inlineMeta([value(employee, 'daycare'), value(employee, 'classroom')]);
  const roleLine = inlineMeta([value(employee, 'role'), value(employee, 'position')]);
  return '<button class="employee-card' + selected + '" type="button" data-id="' + escapeHtml(value(employee, 'id')) + '">' +
    '<div class="employee-card-main"><div class="employee-card-title"><strong>' + escapeHtml(value(employee, 'name')) + '</strong>' + employeeStatusBadge(employee) + '</div>' + (meta ? '<span>' + meta + '</span>' : '') + '</div>' +
    (roleLine ? '<p class="employee-card-line">' + roleLine + '</p>' : '') +
    (freeDay ? '<p class="employee-free-day">יום חופשי: ' + escapeHtml(freeDay) + '</p>' : '') +
    '<div class="employee-warning-list">' + warningBadges(employee) + '</div>' +
    '</button>';
}

function detailItem(label, itemValue, extra = '') {
  const cleaned = clean(itemValue);
  if (!cleaned) return '';
  return '<div class="employee-detail-item ' + extra + '"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(cleaned) + '</strong></div>';
}

function statusItem(label, itemValue) {
  const status = dateStatus(itemValue);
  const displayValue = formatDate(itemValue);
  return '<div class="training-status ' + statusTone(status) + '"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(displayValue || statusText(status)) + '</strong><small>' + statusText(status) + '</small></div>';
}

function badgeStatusItem(title, badge, fallbackValue = '') {
  if (!badge) return '';
  const valueText = fallbackValue || badge.label.replace(title + ': ', '').replace(title + ' ', '');
  return '<div class="training-status ' + badge.tone + '"><span>' + escapeHtml(title) + '</span><strong>' + escapeHtml(valueText) + '</strong><small>' + escapeHtml(badge.label) + '</small></div>';
}

function graduationStatusItem(employee) {
  const graduation = value(employee, 'graduationDate');
  if (!graduation) return '';
  return badgeStatusItem('סיום לימודים', graduationStatus(employee), formatDate(graduation));
}

function firstAidStatusItem(employee) {
  return badgeStatusItem('עזרה ראשונה', firstAidStatus(employee), formatDate(value(employee, 'firstAidUntil')));
}

function safeConductStatusItem(employee) {
  const safe = value(employee, 'safeConductUntil');
  const badge = safeConductStatus(employee);
  return badgeStatusItem('התנהלות בטוחה', badge, parseDate(safe) ? formatDate(safe) : safe);
}

function certificateStatusItem(employee) {
  const badge = certificateStatus(employee);
  const label = badge.label || 'תעודת מטפלת חסרה';
  return '<div class="training-status ' + (badge.tone === 'hidden' ? 'danger' : badge.tone) + '"><span>תעודת מטפלת</span><strong>' + escapeHtml(label.replace('תעודת מטפלת: ', '')) + '</strong><small>' + (badge.missing ? 'חסר / לא תקין' : 'תקף') + '</small></div>';
}

function closeEmployeeDetail() {
  state.selectedId = '';
  renderList();
}

function detailSection(title, html, extra = '') {
  if (!html.trim()) return '';
  return '<section class="employee-detail-section ' + extra + '"><h3>' + escapeHtml(title) + '</h3><div>' + html + '</div></section>';
}

function renderDetail(employee) {
  if (!employee) {
    fields.detail.hidden = true;
    fields.detailEmpty.hidden = false;
    return;
  }

  const freeDay = findFreeDay(employee);
  fields.detailEmpty.hidden = true;
  fields.detail.hidden = false;

  const summary = detailItem('שם', value(employee, 'name')) +
    detailItem('מעון', value(employee, 'daycare')) +
    detailItem('כיתה', value(employee, 'classroom')) +
    detailItem('תפקיד', value(employee, 'role')) +
    detailItem('יום חופשי', freeDay) +
    detailItem('משרה', value(employee, 'position'));

  const compliance = certificateStatusItem(employee) +
    graduationStatusItem(employee) +
    firstAidStatusItem(employee) +
    safeConductStatusItem(employee) +
    detailItem('אחראית כיתה', value(employee, 'classroomLead'));

  const workDays = dayFields.map(([label, key]) => detailItem(label, value(employee, key))).join('');

  const employment = detailItem('תאריך תחילת עבודה', formatDate(value(employee, 'startDate'))) +
    detailItem('ותק לשכר', value(employee, 'salarySeniority')) +
    detailItem('שנים במערכת', value(employee, 'systemYears')) +
    detailItem('סטטוס', value(employee, 'status')) +
    detailItem('סוג העסקה', value(employee, 'employmentType'));

  const additional = detailItem('מנהלת ישירה', value(employee, 'manager')) +
    detailItem('מסמכים חסרים', value(employee, 'missingDocuments')) +
    detailItem('הערות', value(employee, 'notes')) +
    detailItem('עדכון אחרון', formatDate(value(employee, 'lastUpdate')));

  const sensitive = detailItem('תעודת זהות', value(employee, 'nationalId'), 'sensitive') +
    detailItem('טלפון', value(employee, 'phone'), 'sensitive') +
    detailItem('שכר בסיס', value(employee, 'baseSalary'), 'sensitive') +
    detailItem('תאריך לידה לועזי', formatDate(value(employee, 'birthDate')), 'sensitive') +
    detailItem('תאריך לידה עברי', value(employee, 'hebrewBirthDate'), 'sensitive');

  fields.detail.innerHTML = '<div class="employee-profile-head"><div><span>תקציר עובדת</span><strong>' + escapeHtml(value(employee, 'name')) + '</strong><p>' + escapeHtml(inlineMeta([value(employee, 'role'), value(employee, 'daycare'), value(employee, 'classroom')])) + '</p></div><button class="employee-detail-close" type="button" data-close-detail>סגור</button><span class="employee-status-chip">' + escapeHtml(value(employee, 'status')) + '</span></div>' +
    detailSection('תקציר עובדת', summary, 'manager-summary') +
    detailSection('הכשרות ורישוי', '<div class="training-grid">' + compliance + '</div>') +
    detailSection('ימי עבודה', workDays) +
    detailSection('ותק והעסקה', employment) +
    detailSection('מידע נוסף', additional) +
    (sensitive.trim() ? '<details class="employee-detail-section sensitive-section"><summary>מידע רגיש</summary><div>' + sensitive + '</div></details>' : '');
}

function renderList() {
  const list = filteredEmployees();
  fields.count.textContent = list.length + ' עובדות';
  fields.empty.hidden = list.length > 0;
  fields.list.innerHTML = list.map(card).join('');
  if (!list.some((item) => value(item, 'id') === state.selectedId)) state.selectedId = '';
  renderInsights();
  renderDetail(state.selectedId ? list.find((item) => value(item, 'id') === state.selectedId) : null);
}

const EXPORT_FIELDS = [
  { label: 'שם עובדת', key: 'name' },
  { label: 'מעון', key: 'daycare' },
  { label: 'כיתה', key: 'classroom' },
  { label: 'תפקיד', key: 'role' },
  { label: 'משרה', key: 'position' },
  { label: 'יום חופשי', get: findFreeDay },
  { label: 'סטטוס', key: 'status' },
  { label: 'תעודת מטפלת', key: 'caregiverCertificate' },
  { label: 'עזרה ראשונה עד', get: (employee) => formatDate(value(employee, 'firstAidUntil')) },
  { label: 'התנהלות בטוחה עד', get: (employee) => formatDate(value(employee, 'safeConductUntil')) },
];

function activeFilters() {
  const filters = [];
  if (state.selectedDaycares.length) filters.push(['מעונות', state.selectedDaycares.join(', ')]);
  const config = extraFilterFields.find((item) => item.value === state.extraField);
  if (config && state.extraValue) {
    const selectedOption = [...fields.extraValue.options].find((option) => option.value === state.extraValue);
    filters.push([config.label, selectedOption?.textContent || state.extraValue]);
  }
  if (state.search) filters.push(['חיפוש', state.search]);
  return filters;
}

function exportKpis(list) {
  const statsList = statsEmployees(list);
  return [
    ['סהכ עובדות בתוצאה', statsList.length],
    ['עובדות בתוצאה', statsList.filter(isActive).length],
    ['תעודות חסרות / לא תקינות', statsList.filter(isInvalidCertificate).length],
    ['הכשרות שפגות בקרוב', statsList.filter(hasExpiringTraining).length],
  ];
}

function buildReportRows(list) {
  const filters = activeFilters();
  const rows = [
    ['דוח עובדים'],
    [],
    ['תאריך הפקה', new Date().toLocaleDateString('he-IL')],
    ['מספר עובדים בתוצאה', statsEmployees(list).length],
    ['סהכ עובדים במערכת', statsEmployees(employees).length],
    [],
    ['מסננים פעילים'],
  ];
  if (filters.length) filters.forEach((row) => rows.push(row));
  else rows.push(['ללא מסננים', 'כל העובדות']);
  rows.push([], ['מדדי דוח']);
  exportKpis(list).forEach((row) => rows.push(row));
  rows.push([], EXPORT_FIELDS.map((field) => field.label));
  list.forEach((employee) => rows.push(EXPORT_FIELDS.map((field) => field.get ? field.get(employee) : value(employee, field.key))));
  return rows;
}

function xmlEscape(text) {
  return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function columnName(index) {
  let name = '';
  let number = index + 1;
  while (number > 0) {
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }
  return name;
}

function sheetXml(rows) {
  const body = rows.map((row, rowIndex) => '<row r="' + (rowIndex + 1) + '">' + row.map((cell, columnIndex) => {
    const ref = columnName(columnIndex) + (rowIndex + 1);
    return '<c r="' + ref + '" t="inlineStr"><is><t>' + xmlEscape(cell) + '</t></is></c>';
  }).join('') + '</row>').join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" rightToLeft="1"><sheetViews><sheetView workbookViewId="0" rightToLeft="1"/></sheetViews><sheetData>' + body + '</sheetData></worksheet>';
}

function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}

function writeUint16(array, offset, value) {
  array[offset] = value & 255;
  array[offset + 1] = (value >>> 8) & 255;
}

function writeUint32(array, offset, value) {
  array[offset] = value & 255;
  array[offset + 1] = (value >>> 8) & 255;
  array[offset + 2] = (value >>> 16) & 255;
  array[offset + 3] = (value >>> 24) & 255;
}

function createZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);
    const local = new Uint8Array(30 + nameBytes.length + contentBytes.length);
    writeUint32(local, 0, 0x04034b50);
    writeUint16(local, 4, 20);
    writeUint32(local, 14, crc);
    writeUint32(local, 18, contentBytes.length);
    writeUint32(local, 22, contentBytes.length);
    writeUint16(local, 26, nameBytes.length);
    local.set(nameBytes, 30);
    local.set(contentBytes, 30 + nameBytes.length);
    localParts.push(local);
    const central = new Uint8Array(46 + nameBytes.length);
    writeUint32(central, 0, 0x02014b50);
    writeUint16(central, 4, 20);
    writeUint16(central, 6, 20);
    writeUint32(central, 16, crc);
    writeUint32(central, 20, contentBytes.length);
    writeUint32(central, 24, contentBytes.length);
    writeUint16(central, 28, nameBytes.length);
    writeUint32(central, 42, offset);
    central.set(nameBytes, 46);
    centralParts.push(central);
    offset += local.length;
  });
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 8, files.length);
  writeUint16(end, 10, files.length);
  writeUint32(end, 12, centralSize);
  writeUint32(end, 16, offset);
  return new Blob([...localParts, ...centralParts, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function createWorkbookBlob(rows) {
  return createZip([
    { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="דוח עובדים" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
    { name: 'xl/worksheets/sheet1.xml', content: sheetXml(rows) },
  ]);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportEmployeesReport() {
  const list = filteredEmployees();
  const rows = buildReportRows(list);
  const datePart = new Date().toISOString().slice(0, 10);
  downloadBlob(createWorkbookBlob(rows), 'דוח-עובדים-' + datePart + '.xlsx');
}

function applyFilters() {
  state.extraField = fields.extraField.value;
  state.extraValue = fields.extraValue.value;
  state.search = fields.search.value.trim();
  renderList();
}

function resetFilters() {
  state.selectedDaycares = [];
  state.extraField = '';
  state.extraValue = '';
  state.search = '';
  fields.extraField.value = '';
  fields.search.value = '';
  updateExtraValueOptions();
  renderDaycareChips();
  renderList();
}

function applyKpiFilter(type) {
  if (type === 'all') {
    fields.extraField.value = '';
    state.extraField = '';
    state.extraValue = '';
    updateExtraValueOptions();
    renderList();
    return;
  }
  if (type === 'active') {
    fields.extraField.value = 'status';
    state.extraField = 'status';
    state.extraValue = 'עובדת';
    updateExtraValueOptions();
    fields.extraValue.value = 'עובדת';
  }
  if (type === 'missing-cert') {
    fields.extraField.value = 'missingCertificates';
    state.extraField = 'missingCertificates';
    state.extraValue = 'yes';
    updateExtraValueOptions();
    fields.extraValue.value = 'yes';
  }
  if (type === 'expiring') {
    fields.extraField.value = 'expiringSoon';
    state.extraField = 'expiringSoon';
    state.extraValue = 'yes';
    updateExtraValueOptions();
    fields.extraValue.value = 'yes';
  }
  state.search = fields.search.value.trim();
  renderList();
}

function setLoading() {
  fields.list.innerHTML = '';
  fields.empty.hidden = false;
  fields.empty.textContent = 'טוען נתוני צוות...';
  fields.count.textContent = '0 עובדות';
  fields.detail.hidden = true;
  fields.detailEmpty.hidden = false;
  fields.insightTotal.textContent = '0';
  fields.insightActive.textContent = '0';
  fields.insightMissingCert.textContent = '0';
  fields.insightExpiring.textContent = '0';
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
  fields.daycareChips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-daycare]');
    if (!button) return;
    const daycare = button.dataset.daycare;
    state.selectedDaycares = state.selectedDaycares.includes(daycare)
      ? state.selectedDaycares.filter((item) => item !== daycare)
      : [...state.selectedDaycares, daycare];
    renderDaycareChips();
  });
  fields.extraField.addEventListener('change', () => {
    state.extraField = fields.extraField.value;
    state.extraValue = '';
    updateExtraValueOptions();
  });
  fields.apply.addEventListener('click', applyFilters);
  fields.reset.addEventListener('click', resetFilters);
  fields.exportButton.addEventListener('click', exportEmployeesReport);
  document.querySelectorAll('[data-kpi-filter]').forEach((button) => {
    button.addEventListener('click', () => applyKpiFilter(button.dataset.kpiFilter));
  });
  fields.search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') applyFilters();
  });
  fields.list.addEventListener('click', (event) => {
    const button = event.target.closest('.employee-card');
    if (!button) return;
    state.selectedId = button.dataset.id;
    renderList();
    document.querySelector('#employee-detail-panel').scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  document.querySelector('#employee-detail-panel').addEventListener('click', (event) => {
    if (!event.target.closest('[data-close-detail]')) return;
    closeEmployeeDetail();
  });
}

async function loadEmployees() {
  setLoading();
  try {
    const response = await fetch('/api/employees');
    if (!response.ok) throw new Error('Failed to load employees');
    const data = await response.json();
    employees = Array.isArray(data.employees) ? data.employees : [];
    state.selectedId = '';
    setSelectOptions(fields.extraField, 'בחרי שדה', extraFilterFields.map((item) => ({ value: item.value, label: item.label })));
    updateExtraValueOptions();
    renderDaycareChips();
    renderList();
  } catch (error) {
    console.error(error);
    setError();
  }
}

bind();
loadEmployees();
