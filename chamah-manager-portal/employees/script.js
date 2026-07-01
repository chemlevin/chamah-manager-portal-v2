let employees = [];
const numberFormatter = new Intl.NumberFormat('he-IL');

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

const today = window.ChamahDates.startOfLocalDay(new Date());
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
  kpiFilter: '',
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
  managementKpis: document.querySelector('#employee-management-kpis'),
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
  return window.ChamahDates.parseIsraeliSheetDate(dateValue);
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
  return window.ChamahDates.formatIsraeliSheetDate(cleaned) || cleaned;
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

function normalizedEmployeeStatus(employee) {
  const status = employeeStatusValue(employee);
  if (status === 'עובדת') return 'active';
  if (status === 'עזבה') return 'left';
  if (/חל["׳']?ד|חופשת לידה|לידה/.test(status)) return 'maternity';
  if (/מחלה|תאונת עבודה|תאונה/.test(status)) return 'sick';
  if (/חל["׳']?ת|חופשה ללא תשלום|ללא תשלום/.test(status)) return 'unpaid';
  return status ? 'temporary' : 'temporary';
}

function caregiverCertificateCategory(employee) {
  const certificate = value(employee, 'caregiverCertificate');
  if (certificate === 'יש') return 'valid';
  if (/בלימוד|בתהליך|מחכה|קורס|לומד/.test(certificate)) return 'study';
  return 'missing';
}

function dateKpiCategory(employee, key) {
  const status = dateStatus(value(employee, key));
  if (status === 'expired') return 'expired';
  if (status === 'soon') return 'soon';
  if (status === 'missing') return 'missing';
  return 'valid';
}

function countWhere(list, predicate) {
  return list.filter(predicate).length;
}

function employeeMatchesKpiFilter(employee) {
  if (!state.kpiFilter) return true;
  if (state.kpiFilter === 'active') return normalizedEmployeeStatus(employee) === 'active';
  if (state.kpiFilter === 'missing-caregiver') return !isLeftEmployee(employee) && caregiverCertificateCategory(employee) === 'missing';
  if (state.kpiFilter === 'expired-first-aid') return !isLeftEmployee(employee) && dateKpiCategory(employee, 'firstAidUntil') === 'expired';
  if (state.kpiFilter === 'soon-first-aid') return !isLeftEmployee(employee) && dateKpiCategory(employee, 'firstAidUntil') === 'soon';
  if (state.kpiFilter === 'missing-safe-conduct') return !isLeftEmployee(employee) && dateKpiCategory(employee, 'safeConductUntil') === 'missing';
  if (state.kpiFilter === 'needs-attention') return !isLeftEmployee(employee) && attentionSummary(employee).count > 0;
  if (state.kpiFilter === 'maternity') return normalizedEmployeeStatus(employee) === 'maternity';
  if (state.kpiFilter === 'sick') return normalizedEmployeeStatus(employee) === 'sick';
  if (state.kpiFilter === 'left') return normalizedEmployeeStatus(employee) === 'left';
  if (state.kpiFilter === 'valid-caregiver') return !isLeftEmployee(employee) && caregiverCertificateCategory(employee) === 'valid';
  if (state.kpiFilter === 'study-caregiver') return !isLeftEmployee(employee) && caregiverCertificateCategory(employee) === 'study';
  if (state.kpiFilter === 'missing-first-aid') return !isLeftEmployee(employee) && dateKpiCategory(employee, 'firstAidUntil') === 'missing';
  if (state.kpiFilter === 'expired-safe-conduct') return !isLeftEmployee(employee) && dateKpiCategory(employee, 'safeConductUntil') === 'expired';
  if (state.kpiFilter === 'soon-safe-conduct') return !isLeftEmployee(employee) && dateKpiCategory(employee, 'safeConductUntil') === 'soon';
  return true;
}

function kpiFilterLabel(type) {
  const item = managementKpiItems(employees).find((entry) => entry.filter === type);
  return item ? item.text : '';
}

function kpiFilterField(type) {
  const map = {
    active: ['status', 'עובדת'],
    maternity: ['status', 'חופשת לידה'],
    sick: ['status', 'מחלה / תאונת עבודה'],
    left: ['status', 'עזבה'],
    'missing-caregiver': ['caregiverCertificate', '__invalid__'],
    'valid-caregiver': ['caregiverCertificate', '__exists__'],
    'study-caregiver': ['caregiverCertificate', 'בלימודים'],
    'expired-first-aid': ['firstAidUntil', 'expired'],
    'soon-first-aid': ['firstAidUntil', 'soon'],
    'missing-first-aid': ['firstAidUntil', 'missing'],
    'expired-safe-conduct': ['safeConductUntil', 'expired'],
    'soon-safe-conduct': ['safeConductUntil', 'soon'],
    'missing-safe-conduct': ['safeConductUntil', 'missing'],
  };
  return map[type] || null;
}

function syncKpiFilterControls(type) {
  const mapped = kpiFilterField(type);
  if (!mapped) return;
  fields.extraField.value = mapped[0];
  state.extraField = mapped[0];
  state.extraValue = mapped[1];
  updateExtraValueOptions();
  fields.extraValue.value = mapped[1];
}

function clearSyncedKpiFilterControls(type) {
  const mapped = kpiFilterField(type);
  if (!mapped) return;
  if (state.extraField !== mapped[0] || state.extraValue !== mapped[1]) return;
  fields.extraField.value = '';
  state.extraField = '';
  state.extraValue = '';
  updateExtraValueOptions();
}



function kpiCard(item) {
  const active = state.kpiFilter === item.filter;
  return '<button class="employee-kpi-card ' + item.tone + (item.primary ? ' primary' : '') + (active ? ' active' : '') + '" type="button" data-kpi-filter="' + escapeHtml(item.filter) + '"><strong>' + numberFormatter.format(item.value) + ' ' + escapeHtml(item.text) + '</strong></button>';
}

function managementKpiItems(list) {
  const currentEmployees = list.filter((employee) => !isLeftEmployee(employee));
  return [
    { text: 'עובדות פעילות', value: countWhere(list, (employee) => normalizedEmployeeStatus(employee) === 'active'), tone: 'ok', primary: true, filter: 'active' },
    { text: 'תעודות מטפלת חסרות', value: countWhere(currentEmployees, (employee) => caregiverCertificateCategory(employee) === 'missing'), tone: 'danger', primary: true, filter: 'missing-caregiver' },
    { text: 'עזרה ראשונה פגה', value: countWhere(currentEmployees, (employee) => dateKpiCategory(employee, 'firstAidUntil') === 'expired'), tone: 'danger', primary: true, filter: 'expired-first-aid' },
    { text: 'עזרה ראשונה תפוג בקרוב', value: countWhere(currentEmployees, (employee) => dateKpiCategory(employee, 'firstAidUntil') === 'soon'), tone: 'warning', primary: true, filter: 'soon-first-aid' },
    { text: 'התנהלות בטוחה חסרה', value: countWhere(currentEmployees, (employee) => dateKpiCategory(employee, 'safeConductUntil') === 'missing'), tone: 'danger', primary: true, filter: 'missing-safe-conduct' },
    { text: 'עובדות דורשות טיפול', value: countWhere(currentEmployees, (employee) => attentionSummary(employee).count > 0), tone: 'danger', primary: true, filter: 'needs-attention' },
    { text: 'חופשת לידה', value: countWhere(list, (employee) => normalizedEmployeeStatus(employee) === 'maternity'), tone: 'orange', filter: 'maternity' },
    { text: 'מחלה / תאונת עבודה', value: countWhere(list, (employee) => normalizedEmployeeStatus(employee) === 'sick'), tone: 'orange', filter: 'sick' },
    { text: 'עזבו', value: countWhere(list, (employee) => normalizedEmployeeStatus(employee) === 'left'), tone: 'danger', filter: 'left' },
    { text: 'תעודת מטפלת תקפה', value: countWhere(currentEmployees, (employee) => caregiverCertificateCategory(employee) === 'valid'), tone: 'ok', filter: 'valid-caregiver' },
    { text: 'תעודת מטפלת בלימודים / בתהליך', value: countWhere(currentEmployees, (employee) => caregiverCertificateCategory(employee) === 'study'), tone: 'orange', filter: 'study-caregiver' },
    { text: 'עזרה ראשונה חסרה', value: countWhere(currentEmployees, (employee) => dateKpiCategory(employee, 'firstAidUntil') === 'missing'), tone: 'danger', filter: 'missing-first-aid' },
    { text: 'התנהלות בטוחה פגה', value: countWhere(currentEmployees, (employee) => dateKpiCategory(employee, 'safeConductUntil') === 'expired'), tone: 'danger', filter: 'expired-safe-conduct' },
    { text: 'התנהלות בטוחה תפוג בקרוב', value: countWhere(currentEmployees, (employee) => dateKpiCategory(employee, 'safeConductUntil') === 'soon'), tone: 'warning', filter: 'soon-safe-conduct' },
  ];
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

function attentionBadges(employee) {
  return employeeStatusBadges(employee).filter((badge) => ['danger', 'warning', 'pink', 'pink-light', 'orange'].includes(badge.tone) || ['expired', 'missing', 'soon', 'study'].includes(badge.status));
}

function attentionSummary(employee) {
  const status = normalizedEmployeeStatus(employee);
  const badges = attentionBadges(employee);
  if (status === 'left') return { tone: 'danger', label: 'עזבה', detail: 'לא פעילה במערכת', count: Math.max(1, badges.length) };
  const dangerCount = badges.filter((badge) => badge.tone === 'danger' || ['expired', 'missing'].includes(badge.status)).length;
  const soonCount = badges.filter((badge) => ['warning', 'pink', 'pink-light', 'orange'].includes(badge.tone) || ['soon', 'study'].includes(badge.status)).length;
  if (dangerCount > 0) return { tone: 'danger', label: 'דורשת טיפול', detail: dangerCount + ' נושאים דחופים', count: badges.length };
  if (soonCount > 0) return { tone: 'warning', label: 'למעקב', detail: soonCount + ' נושאים למעקב', count: badges.length };
  return { tone: 'ok', label: 'תקין', detail: 'אין התראות פתוחות', count: 0 };
}

function shortBadgeLabel(label) {
  return String(label || '')
    .replace('תעודת מטפלת: ', 'תעודה: ')
    .replace('עזרה ראשונה ', 'עזרה ראשונה ')
    .replace('התנהלות בטוחה ', 'בטוחה ')
    .replace('בתוקף עד: ', 'עד ')
    .replace('פגה בקרוב: ', 'בקרוב ')
    .replace('פגה: ', 'פג ')
    .replace('חסרה', 'חסר');
}

function compactWarningBadges(employee) {
  const badges = attentionBadges(employee);
  const visible = badges.slice(0, 2).map((badge) => '<span class="employee-warning-badge ' + badge.tone + '">' + escapeHtml(shortBadgeLabel(badge.label)) + '</span>');
  if (badges.length > 2) visible.push('<span class="employee-warning-badge more">+' + (badges.length - 2) + ' נושאים</span>');
  return visible.join('');
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
    return daycareMatch && employeeMatchesExtra(employee) && employeeMatchesKpiFilter(employee) && employeeMatchesSearch(employee, state.search);
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
  const mappedKpi = kpiFilterField(state.kpiFilter);
  const extraIsSyncedKpi = mappedKpi && state.extraField === mappedKpi[0] && state.extraValue === mappedKpi[1];
  if (config && state.extraValue && !extraIsSyncedKpi) {
    const selectedOption = [...fields.extraValue.options].find((option) => option.value === state.extraValue);
    chips.push(config.label + ': ' + (selectedOption?.textContent || state.extraValue));
  }
  if (state.kpiFilter) chips.push('KPI: ' + kpiFilterLabel(state.kpiFilter));
  if (state.search) chips.push('חיפוש: ' + state.search);
  fields.activeFilters.innerHTML = chips.map((chip) => '<span>' + escapeHtml(chip) + '</span>').join('');
  fields.activeFilters.hidden = chips.length === 0;
  fields.resultSummary.textContent = 'מציג ' + statsList.length + ' עובדות מתוך ' + statsEmployees(employees).length;
}

function renderInsights() {
  const list = filteredEmployees();
  const statsList = statsEmployees(list);
  const baseList = employees.filter((employee) => {
    const daycareMatch = state.selectedDaycares.length === 0 || state.selectedDaycares.includes(value(employee, 'daycare'));
    return daycareMatch && employeeMatchesExtra(employee) && employeeMatchesSearch(employee, state.search);
  });
  const items = managementKpiItems(baseList);
  const primary = items.filter((item) => item.primary);
  const secondary = items.filter((item) => !item.primary);
  const clearButton = state.kpiFilter ? '<button class="employee-clear-kpi-filter" type="button" data-clear-kpi-filter>נקה סינון KPI</button>' : '';
  fields.insightScope.textContent = state.kpiFilter ? 'מסנן KPI: ' + kpiFilterLabel(state.kpiFilter) : scopeTitle();
  fields.resultSummary.textContent = 'מציג ' + statsList.length + ' עובדות מתוך ' + statsEmployees(employees).length;
  fields.managementKpis.innerHTML = primary.map(kpiCard).join('') + clearButton + '<details class="management-kpi-details"><summary>פירוט מדדים</summary><div class="employee-management-kpi-more">' + secondary.map(kpiCard).join('') + '</div></details>';
  renderActiveFilterChips(list);
}

function warningBadges(employee) {
  return compactWarningBadges(employee);
}

function inlineMeta(items) {
  return items.filter(Boolean).map(escapeHtml).join(' · ');
}

function card(employee) {
  const selected = state.selectedId && value(employee, 'id') === state.selectedId ? ' selected' : '';
  const freeDay = findFreeDay(employee);
  const meta = inlineMeta([value(employee, 'daycare'), value(employee, 'classroom')]);
  const roleLine = inlineMeta([value(employee, 'role'), value(employee, 'position')]);
  const attention = attentionSummary(employee);
  const warnings = warningBadges(employee);
  return '<button class="employee-card' + selected + ' attention-' + attention.tone + '" type="button" data-id="' + escapeHtml(value(employee, 'id')) + '">' +
    '<div class="employee-card-level employee-card-level-1"><div class="employee-card-main"><div class="employee-card-title"><strong>' + escapeHtml(value(employee, 'name')) + '</strong>' + employeeStatusBadge(employee) + '</div>' + (meta ? '<span>' + meta + '</span>' : '') + '</div><span class="employee-attention-indicator ' + attention.tone + '"><b>' + escapeHtml(attention.label) + '</b><small>' + escapeHtml(attention.detail) + '</small></span></div>' +
    '<div class="employee-card-level employee-card-level-2">' + (warnings ? '<div class="employee-warning-list">' + warnings + '</div>' : '<div class="employee-warning-list"><span class="employee-warning-badge ok">אין התראות</span></div>') + (attention.count ? '<span class="employee-issue-count">' + attention.count + ' נושאים</span>' : '') + '</div>' +
    '<div class="employee-card-level employee-card-level-3">' + (roleLine ? '<p class="employee-card-line">' + roleLine + '</p>' : '') + (freeDay ? '<p class="employee-free-day">יום חופשי: ' + escapeHtml(freeDay) + '</p>' : '') + '</div>' +
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
    ['תאריך הפקה', window.ChamahDates.formatIsraeliDate(new Date())],
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
  const datePart = window.ChamahDates.formatIsraeliDate(new Date()).replaceAll('/', '-');
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
  state.kpiFilter = '';
  fields.extraField.value = '';
  fields.search.value = '';
  updateExtraValueOptions();
  renderDaycareChips();
  renderList();
}

function applyKpiFilter(type) {
  if (state.kpiFilter === type) {
    clearSyncedKpiFilterControls(type);
    state.kpiFilter = '';
  } else {
    state.kpiFilter = type;
    syncKpiFilterControls(type);
  }
  renderList();
}

function setLoading() {
  employees = [];
  fields.list.innerHTML = '';
  fields.empty.hidden = false;
  fields.empty.textContent = 'טוען נתוני צוות...';
  fields.count.textContent = '0 עובדות';
  fields.detail.hidden = true;
  fields.detailEmpty.hidden = false;
  if (fields.managementKpis) fields.managementKpis.innerHTML = managementKpiItems([]).map(kpiCard).join('');
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

function initResponsiveEmployeeFilters() {
  const details = document.querySelector('#employee-filter-details');
  if (!details) return;
  const sync = () => {
    if (window.matchMedia('(max-width: 768px)').matches) details.removeAttribute('open');
    else details.setAttribute('open', '');
  };
  sync();
  window.addEventListener('resize', sync);
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
  fields.managementKpis.addEventListener('click', (event) => {
    const clear = event.target.closest('[data-clear-kpi-filter]');
    if (clear) {
      clearSyncedKpiFilterControls(state.kpiFilter);
      state.kpiFilter = '';
      renderList();
      return;
    }
    const button = event.target.closest('[data-kpi-filter]');
    if (!button) return;
    applyKpiFilter(button.dataset.kpiFilter);
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

initResponsiveEmployeeFilters();
bind();
loadEmployees();
