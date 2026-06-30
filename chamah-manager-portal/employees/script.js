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
const state = { search: '', daycare: 'all', manager: 'all', role: 'all', status: 'all', certificate: 'all', tuesday: 'all', selectedId: '' };

const fields = {
  search: document.querySelector('#employee-search'),
  daycare: document.querySelector('#daycare-filter'),
  manager: document.querySelector('#manager-filter'),
  role: document.querySelector('#role-filter'),
  status: document.querySelector('#status-filter'),
  certificate: document.querySelector('#certificate-filter'),
  tuesday: document.querySelector('#tuesday-filter'),
  exportButton: document.querySelector('#employee-export-button'),
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

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fillSelect(select, label, values, extraOptions = []) {
  const options = [
    '<option value="all">' + escapeHtml(label) + '</option>',
    ...extraOptions.map((item) => '<option value="' + escapeHtml(item.value) + '">' + escapeHtml(item.label) + '</option>'),
    ...values.map((item) => '<option value="' + escapeHtml(item) + '">' + escapeHtml(item) + '</option>'),
  ];
  select.innerHTML = options.join('');
}

function resetFilters() {
  fillSelect(fields.daycare, 'כל המעונות', unique('daycare'));
  fillSelect(fields.manager, 'כל המנהלות', unique('manager'));
  fillSelect(fields.role, 'כל התפקידים', unique('role'));
  fillSelect(fields.status, 'כל הסטטוסים', unique('status'));
  fillSelect(fields.certificate, 'כל מצבי התעודה', unique('caregiverCertificate'), [{ value: '__empty__', label: 'ריק' }]);
  fillSelect(fields.tuesday, 'כל יום שלישי', unique('tuesday'));
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
    const matchManager = state.manager === 'all' || value(employee, 'manager') === state.manager;
    const matchRole = state.role === 'all' || value(employee, 'role') === state.role;
    const matchStatus = state.status === 'all' || value(employee, 'status') === state.status;
    const certificateValue = value(employee, 'caregiverCertificate');
    const matchCertificate = state.certificate === 'all' || (state.certificate === '__empty__' ? !certificateValue : certificateValue === state.certificate);
    const matchTuesday = state.tuesday === 'all' || value(employee, 'tuesday') === state.tuesday;
    return matchSearch && matchDaycare && matchManager && matchRole && matchStatus && matchCertificate && matchTuesday;
  });
}

const EXPORT_FIELDS = [
  { label: 'שם עובדת', key: 'name' },
  { label: 'מעון', key: 'daycare' },
  { label: 'כיתה', key: 'classroom' },
  { label: 'תפקיד', key: 'role' },
  { label: 'משרה', key: 'position' },
  { label: 'יום חופשי', get: findFreeDay },
  { label: 'ותק לשכר', key: 'salarySeniority' },
  { label: 'סטטוס', key: 'status' },
];

const FILTER_LABELS = {
  search: 'חיפוש',
  daycare: 'מעון',
  manager: 'מנהלת ישירה',
  role: 'תפקיד',
  status: 'סטטוס',
  certificate: 'תעודת מטפלת',
  tuesday: 'יום שלישי',
};

function findFreeDay(employee) {
  const days = [
    ['יום ראשון', 'sunday'],
    ['יום שני', 'monday'],
    ['יום שלישי', 'tuesday'],
    ['יום רביעי', 'wednesday'],
    ['יום חמישי', 'thursday'],
    ['יום שישי', 'friday'],
  ];
  const free = days.find(([, key]) => {
    const dayValue = value(employee, key).trim();
    return !dayValue || /חופש|חופשי|לא|ריק|-/.test(dayValue);
  });
  return free ? free[0] : '';
}

function activeFilters() {
  const filters = [];
  if (state.search) filters.push([FILTER_LABELS.search, state.search]);
  ['daycare', 'manager', 'role', 'status', 'certificate', 'tuesday'].forEach((key) => {
    if (state[key] === 'all') return;
    filters.push([FILTER_LABELS[key], state[key] === '__empty__' ? 'ריק' : state[key]]);
  });
  return filters;
}

function exportKpis(list) {
  return [
    ['סהכ עובדות בתוצאה', list.length],
    ['פעילות בתוצאה', list.filter((item) => value(item, 'status') === 'פעילה').length],
    ['חסרות תעודת מטפלת', list.filter(isMissingCert).length],
    ['הכשרות שפגות בקרוב', list.filter(hasExpiringTraining).length],
  ];
}

function buildReportRows(list) {
  const filters = activeFilters();
  const producedAt = new Date().toLocaleDateString('he-IL');
  const rows = [
    ['דוח עובדים'],
    [],
    ['תאריך הפקה', producedAt],
    ['מספר עובדים בתוצאה', list.length],
    ['סהכ עובדים במערכת', employees.length],
    [],
    ['מסננים פעילים'],
  ];

  if (filters.length) {
    filters.forEach(([label, filterValue]) => rows.push([label, filterValue]));
  } else {
    rows.push(['ללא מסננים', 'כל העובדות']);
  }

  rows.push([], ['מדדי דוח']);
  exportKpis(list).forEach((row) => rows.push(row));
  rows.push([], EXPORT_FIELDS.map((field) => field.label));
  list.forEach((employee) => {
    rows.push(EXPORT_FIELDS.map((field) => field.get ? field.get(employee) : value(employee, field.key)));
  });

  return rows;
}

function xmlEscape(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
  const body = rows.map((row, rowIndex) => {
    const cells = row.map((cell, columnIndex) => {
      const ref = columnName(columnIndex) + (rowIndex + 1);
      return '<c r="' + ref + '" t="inlineStr"><is><t>' + xmlEscape(cell) + '</t></is></c>';
    }).join('');
    return '<row r="' + (rowIndex + 1) + '">' + cells + '</row>';
  }).join('');
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
    writeUint16(local, 6, 0);
    writeUint16(local, 8, 0);
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
    writeUint16(central, 8, 0);
    writeUint16(central, 10, 0);
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
  fields.manager.addEventListener('change', (event) => { state.manager = event.target.value; renderList(); });
  fields.role.addEventListener('change', (event) => { state.role = event.target.value; renderList(); });
  fields.status.addEventListener('change', (event) => { state.status = event.target.value; renderList(); });
  fields.certificate.addEventListener('change', (event) => { state.certificate = event.target.value; renderList(); });
  fields.tuesday.addEventListener('change', (event) => { state.tuesday = event.target.value; renderList(); });
  fields.exportButton.addEventListener('click', exportEmployeesReport);
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
