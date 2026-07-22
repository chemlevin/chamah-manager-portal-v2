const DEFAULT_PAGE_SIZE = 10;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const normalize = (value) => String(value ?? '').trim().toLocaleLowerCase('he-IL');
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

function assertMetadata(metadata) {
  if (!metadata?.entity || !metadata?.primaryKey || !Array.isArray(metadata.fields) || !metadata.fields.length) {
    throw new Error('Administration metadata requires entity, primaryKey and fields.');
  }
  const names = new Set();
  metadata.fields.forEach((field) => {
    if (!field.name || !field.label) throw new Error('Every administration field requires an English name and a UI label.');
    if (names.has(field.name)) throw new Error(`Duplicate administration field: ${field.name}`);
    names.add(field.name);
  });
}

function fieldValue(field, row) {
  const value = row?.[field.name];
  if (field.format) return field.format(value, row);
  if (field.type === 'boolean') return value ? (field.trueLabel || 'כן') : (field.falseLabel || 'לא');
  if (field.type === 'date' && value) return new Intl.DateTimeFormat('he-IL').format(new Date(`${value}T00:00:00`));
  if (field.options) return field.options.find((option) => String(option.value) === String(value))?.label ?? value;
  return value ?? '—';
}

function validateRecord(metadata, record) {
  const errors = {};
  metadata.fields.forEach((field) => {
    if (field.readOnly) return;
    const value = record[field.name];
    if (field.required && (value == null || String(value).trim() === '')) errors[field.name] = field.requiredMessage || `${field.label} הוא שדה חובה`;
    if (!errors[field.name] && field.minLength && String(value || '').length < field.minLength) errors[field.name] = field.minLengthMessage || `${field.label} קצר מדי`;
    if (!errors[field.name] && field.pattern && value && !new RegExp(field.pattern).test(String(value))) errors[field.name] = field.patternMessage || `${field.label} אינו תקין`;
    if (!errors[field.name] && field.validate) {
      const result = field.validate(value, record);
      if (result !== true && result) errors[field.name] = result;
    }
  });
  (metadata.validate ? metadata.validate(record) : []).forEach?.((issue) => { errors[issue.field] = issue.message; });
  return errors;
}

function inputTemplate(field, value, error) {
  const id = `admin-field-${field.name}`;
  const describedBy = error ? `${id}-error` : undefined;
  const common = `id="${id}" name="${escapeHtml(field.name)}" ${field.required ? 'required' : ''} ${field.readOnly ? 'disabled' : ''} ${describedBy ? `aria-describedby="${describedBy}" aria-invalid="true"` : ''}`;
  let input;
  if (field.type === 'textarea') input = `<textarea ${common} rows="${field.rows || 4}">${escapeHtml(value)}</textarea>`;
  else if (field.type === 'select') input = `<select ${common}><option value="">${escapeHtml(field.placeholder || 'בחירה')}</option>${(field.options || []).map((option) => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(value ?? '') ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select>`;
  else if (field.type === 'boolean') input = `<label class="admin-switch"><input ${common} type="checkbox" ${value ? 'checked' : ''}><span>${escapeHtml(field.checkboxLabel || field.label)}</span></label>`;
  else input = `<input ${common} type="${field.type || 'text'}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || '')}" ${field.min != null ? `min="${field.min}"` : ''} ${field.max != null ? `max="${field.max}"` : ''}>`;
  return `<div class="admin-field ${error ? 'has-error' : ''}" data-admin-field="${escapeHtml(field.name)}"><label for="${id}">${escapeHtml(field.label)}${field.required ? '<span aria-hidden="true"> *</span>' : ''}</label>${field.help ? `<small>${escapeHtml(field.help)}</small>` : ''}${input}${error ? `<p id="${id}-error" class="admin-field-error" role="alert">${escapeHtml(error)}</p>` : ''}</div>`;
}

export function createMemoryRepository(initialRows = []) {
  let rows = clone(initialRows);
  return {
    async list() { return clone(rows); },
    async create(record, { primaryKey = 'id' } = {}) { const created = { ...clone(record), [primaryKey]: record[primaryKey] || crypto.randomUUID() }; rows.push(created); return created; },
    async update(id, record, { primaryKey = 'id' } = {}) { const index = rows.findIndex((row) => String(row[primaryKey]) === String(id)); if (index < 0) throw new Error('הרשומה לא נמצאה'); rows[index] = { ...rows[index], ...clone(record) }; return clone(rows[index]); },
    async delete(id, { primaryKey = 'id' } = {}) { const index = rows.findIndex((row) => String(row[primaryKey]) === String(id)); if (index < 0) throw new Error('הרשומה לא נמצאה'); return clone(rows.splice(index, 1)[0]); }
  };
}

export function createPostgrestRepository({ baseUrl, apiKey, getAccessToken, table, select = '*', audit = {} }) {
  if (!baseUrl || !apiKey || !getAccessToken || !table) throw new Error('PostgREST repository requires baseUrl, apiKey, getAccessToken and table.');
  const request = async (path, options = {}) => {
    const token = await getAccessToken();
    if (!token) throw new Error('החיבור פג. יש להתחבר מחדש.');
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/v1/${path}`, { ...options, headers: { apikey: apiKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(options.headers || {}) } });
    if (!response.ok) { const problem = await response.json().catch(() => ({})); throw new Error(problem.message || 'הפעולה נכשלה.'); }
    if (response.status === 204) return null;
    return response.json();
  };
  const writeAudit = async ({ operation, id, previousValues, newValues }) => {
    if (audit.enabled === false) return;
    const payload = { entity_type: audit.entityType || table, entity_id: id, operation, previous_values: previousValues, new_values: newValues, source_type: 'PORTAL_ADMIN', ...(audit.actorUserId ? { actor_user_id: await audit.actorUserId() } : {}) };
    await request('audit_events', { method: 'POST', body: JSON.stringify(payload) });
  };
  return {
    async list() { return request(`${table}?select=${encodeURIComponent(select)}`); },
    async create(record, context) { const [created] = await request(table, { method: 'POST', body: JSON.stringify(record) }); await writeAudit({ operation: audit.operations?.create || 'INSERT', id: created[context.primaryKey], previousValues: null, newValues: created }); return created; },
    async update(id, record, context) { const [updated] = await request(`${table}?${context.primaryKey}=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(record) }); await writeAudit({ operation: audit.operations?.update || 'UPDATE', id, previousValues: context.previous, newValues: updated }); return updated; },
    async delete(id, context) { const [deleted] = await request(`${table}?${context.primaryKey}=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }); await writeAudit({ operation: audit.operations?.delete || 'MANUAL_CORRECTION', id, previousValues: context.previous, newValues: null }); return deleted; }
  };
}

export function createAdministration({ root, metadata, repository, confirm = window.confirm.bind(window), onError = () => {} }) {
  assertMetadata(metadata);
  if (!(root instanceof Element)) throw new Error('Administration root must be a DOM element.');
  if (!repository?.list || !repository?.create || !repository?.update || !repository?.delete) throw new Error('Administration repository must implement list, create, update and delete.');
  const state = { status: 'loading', rows: [], query: '', filters: {}, sort: metadata.defaultSort || { field: metadata.primaryKey, direction: 'asc' }, page: 1, pageSize: metadata.pageSize || DEFAULT_PAGE_SIZE, editing: null, original: null, errors: {}, saving: false, message: '' };
  const editableFields = metadata.fields.filter((field) => field.form !== false && field.name !== metadata.primaryKey);
  const tableFields = metadata.fields.filter((field) => field.table !== false);
  const searchableFields = metadata.searchFields || metadata.fields.filter((field) => field.searchable).map((field) => field.name);
  const filterFields = metadata.fields.filter((field) => field.filterable);
  const statusField = metadata.statusField || metadata.fields.find((field) => field.name === 'is_active' || field.name === 'lifecycle_status')?.name;
  let destroyed = false;

  const isDirty = () => Boolean(state.editing && JSON.stringify(state.editing) !== JSON.stringify(state.original));
  const beforeUnload = (event) => { if (!isDirty()) return; event.preventDefault(); event.returnValue = ''; };
  window.addEventListener('beforeunload', beforeUnload);

  function viewRows() {
    let rows = state.rows.filter((row) => !state.query || searchableFields.some((name) => normalize(row[name]).includes(normalize(state.query))));
    Object.entries(state.filters).forEach(([name, value]) => { if (value !== '') rows = rows.filter((row) => String(row[name] ?? '') === value); });
    const field = metadata.fields.find((item) => item.name === state.sort.field);
    rows = [...rows].sort((a, b) => {
      const left = field?.sortValue ? field.sortValue(a[field.name], a) : a[state.sort.field];
      const right = field?.sortValue ? field.sortValue(b[field.name], b) : b[state.sort.field];
      return (left ?? '') < (right ?? '') ? -1 * (state.sort.direction === 'asc' ? 1 : -1) : (left ?? '') > (right ?? '') ? 1 * (state.sort.direction === 'asc' ? 1 : -1) : 0;
    });
    return rows;
  }

  function render() {
    if (destroyed) return;
    if (state.status === 'loading') { root.innerHTML = '<section class="admin-state admin-loading" role="status"><span class="admin-spinner" aria-hidden="true"></span><strong>טוען נתונים…</strong></section>'; return; }
    if (state.status === 'error') { root.innerHTML = `<section class="admin-state admin-error" role="alert"><strong>לא ניתן לטעון את הנתונים</strong><p>${escapeHtml(state.message)}</p><button class="admin-button secondary" type="button" data-admin-retry>ניסיון נוסף</button></section>`; bind(); return; }
    const visible = viewRows(); const pages = Math.max(1, Math.ceil(visible.length / state.pageSize)); state.page = Math.min(state.page, pages);
    const pageRows = visible.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    root.innerHTML = `<section class="admin-shell" dir="rtl" aria-label="${escapeHtml(metadata.pluralLabel || metadata.label)}">
      <header class="admin-header"><div><p class="admin-eyebrow">${escapeHtml(metadata.eyebrow || 'ניהול מערכת')}</p><h1>${escapeHtml(metadata.pluralLabel || metadata.label)}</h1>${metadata.description ? `<p>${escapeHtml(metadata.description)}</p>` : ''}</div><button class="admin-button primary" type="button" data-admin-create>${escapeHtml(metadata.createLabel || `הוספת ${metadata.label}`)}</button></header>
      ${state.message ? `<p class="admin-feedback" role="status">${escapeHtml(state.message)}</p>` : ''}
      <div class="admin-toolbar"><label class="admin-search"><span>${escapeHtml(metadata.searchLabel || 'חיפוש')}</span><input type="search" value="${escapeHtml(state.query)}" placeholder="${escapeHtml(metadata.searchPlaceholder || 'חיפוש ברשומות')}" data-admin-search></label>${filterFields.map((field) => `<label><span>${escapeHtml(field.filterLabel || field.label)}</span><select data-admin-filter="${escapeHtml(field.name)}"><option value="">הכול</option>${(field.options || [...new Set(state.rows.map((row) => row[field.name]).filter((value) => value != null))].map((value) => ({ value, label: value }))).map((option) => `<option value="${escapeHtml(option.value)}" ${String(state.filters[field.name] ?? '') === String(option.value) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select></label>`).join('')}</div>
      ${state.rows.length === 0 ? `<section class="admin-state admin-empty"><strong>${escapeHtml(metadata.emptyTitle || 'אין רשומות להצגה')}</strong><p>${escapeHtml(metadata.emptyMessage || 'אפשר להוסיף את הרשומה הראשונה.')}</p></section>` : visible.length === 0 ? '<section class="admin-state admin-empty"><strong>לא נמצאו תוצאות</strong><p>נסו לשנות את החיפוש או המסננים.</p></section>' : `<div class="admin-table-wrap"><table class="admin-table"><thead><tr>${tableFields.map((field) => `<th scope="col">${field.sortable === false ? escapeHtml(field.label) : `<button type="button" data-admin-sort="${escapeHtml(field.name)}">${escapeHtml(field.label)}${state.sort.field === field.name ? `<span aria-label="${state.sort.direction === 'asc' ? 'סדר עולה' : 'סדר יורד'}">${state.sort.direction === 'asc' ? ' ▲' : ' ▼'}</span>` : ''}</button>`}</th>`).join('')}<th scope="col">פעולות</th></tr></thead><tbody>${pageRows.map((row) => `<tr>${tableFields.map((field) => `<td data-label="${escapeHtml(field.label)}">${escapeHtml(fieldValue(field, row))}</td>`).join('')}<td data-label="פעולות"><div class="admin-row-actions"><button type="button" data-admin-edit="${escapeHtml(row[metadata.primaryKey])}">עריכה</button><button type="button" data-admin-duplicate="${escapeHtml(row[metadata.primaryKey])}">שכפול</button>${statusField ? `<button type="button" data-admin-toggle="${escapeHtml(row[metadata.primaryKey])}">${row[statusField] === false || row[statusField] === 'INACTIVE' ? 'הפעלה' : 'השבתה'}</button>` : ''}<button type="button" class="danger" data-admin-delete="${escapeHtml(row[metadata.primaryKey])}">מחיקה</button></div></td></tr>`).join('')}</tbody></table></div>`}
      <footer class="admin-pagination"><span>${visible.length ? `${(state.page - 1) * state.pageSize + 1}–${Math.min(state.page * state.pageSize, visible.length)} מתוך ${visible.length}` : '0 תוצאות'}</span><label>שורות בעמוד<select data-admin-page-size>${[5, 10, 25, 50].map((size) => `<option value="${size}" ${state.pageSize === size ? 'selected' : ''}>${size}</option>`).join('')}</select></label><div><button type="button" data-admin-page="prev" ${state.page === 1 ? 'disabled' : ''}>הקודם</button><span>עמוד ${state.page} מתוך ${pages}</span><button type="button" data-admin-page="next" ${state.page === pages ? 'disabled' : ''}>הבא</button></div></footer>
      ${state.editing ? `<div class="admin-dialog-backdrop" data-admin-backdrop><section class="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-form-title"><header><div><p class="admin-eyebrow">${state.original?.[metadata.primaryKey] == null ? 'רשומה חדשה' : 'עריכת רשומה'}</p><h2 id="admin-form-title">${escapeHtml(metadata.formTitle || metadata.label)}</h2></div><button type="button" data-admin-cancel aria-label="סגירה">×</button></header><form data-admin-form novalidate><div class="admin-form-grid">${editableFields.map((field) => inputTemplate(field, state.editing[field.name] ?? field.defaultValue ?? '', state.errors[field.name])).join('')}</div><footer><button class="admin-button secondary" type="button" data-admin-cancel>ביטול</button><button class="admin-button primary" type="submit" ${state.saving ? 'disabled' : ''}>${state.saving ? 'שומר…' : 'שמירה'}</button></footer></form></section></div>` : ''}
    </section>`;
    bind();
  }

  function readForm(form) {
    const data = new FormData(form); const record = { ...state.editing };
    editableFields.forEach((field) => {
      const control = form.elements[field.name];
      if (field.type === 'boolean') record[field.name] = control.checked;
      else if (field.type === 'number') record[field.name] = data.get(field.name) === '' ? null : Number(data.get(field.name));
      else record[field.name] = data.get(field.name);
      if (field.transform) record[field.name] = field.transform(record[field.name], record);
    });
    return record;
  }

  function closeEditor() { if (isDirty() && !confirm(metadata.unsavedMessage || 'יש שינויים שלא נשמרו. לבטל אותם?')) return; state.editing = null; state.original = null; state.errors = {}; render(); }

  function bind() {
    root.querySelector('[data-admin-retry]')?.addEventListener('click', load);
    root.querySelector('[data-admin-create]')?.addEventListener('click', () => { state.original = {}; state.editing = Object.fromEntries(editableFields.map((field) => [field.name, clone(field.defaultValue ?? (field.type === 'boolean' ? false : ''))])); state.errors = {}; render(); });
    root.querySelector('[data-admin-search]')?.addEventListener('input', (event) => { state.query = event.target.value; state.page = 1; render(); root.querySelector('[data-admin-search]')?.focus(); });
    root.querySelectorAll('[data-admin-filter]').forEach((control) => control.addEventListener('change', () => { state.filters[control.dataset.adminFilter] = control.value; state.page = 1; render(); }));
    root.querySelectorAll('[data-admin-sort]').forEach((button) => button.addEventListener('click', () => { state.sort = { field: button.dataset.adminSort, direction: state.sort.field === button.dataset.adminSort && state.sort.direction === 'asc' ? 'desc' : 'asc' }; render(); }));
    root.querySelector('[data-admin-page-size]')?.addEventListener('change', (event) => { state.pageSize = Number(event.target.value); state.page = 1; render(); });
    root.querySelectorAll('[data-admin-page]').forEach((button) => button.addEventListener('click', () => { state.page += button.dataset.adminPage === 'next' ? 1 : -1; render(); }));
    root.querySelectorAll('[data-admin-edit]').forEach((button) => button.addEventListener('click', () => { const row = state.rows.find((item) => String(item[metadata.primaryKey]) === button.dataset.adminEdit); state.original = clone(row); state.editing = clone(row); state.errors = {}; render(); }));
    root.querySelectorAll('[data-admin-duplicate]').forEach((button) => button.addEventListener('click', () => { const row = state.rows.find((item) => String(item[metadata.primaryKey]) === button.dataset.adminDuplicate); state.original = {}; state.editing = clone(row); delete state.editing[metadata.primaryKey]; if (metadata.duplicate) state.editing = metadata.duplicate(state.editing, row); state.errors = {}; render(); }));
    root.querySelectorAll('[data-admin-toggle]').forEach((button) => button.addEventListener('click', async () => { const row = state.rows.find((item) => String(item[metadata.primaryKey]) === button.dataset.adminToggle); const next = { ...row, [statusField]: typeof row[statusField] === 'boolean' ? !row[statusField] : row[statusField] === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE' }; try { const saved = await repository.update(row[metadata.primaryKey], next, { primaryKey: metadata.primaryKey, previous: clone(row), metadata }); state.rows = state.rows.map((item) => String(item[metadata.primaryKey]) === String(row[metadata.primaryKey]) ? saved : item); state.message = next[statusField] === false || next[statusField] === 'INACTIVE' ? 'הרשומה הושבתה' : 'הרשומה הופעלה'; render(); } catch (error) { state.message = error.message; onError(error); render(); } }));
    root.querySelectorAll('[data-admin-delete]').forEach((button) => button.addEventListener('click', async () => { const row = state.rows.find((item) => String(item[metadata.primaryKey]) === button.dataset.adminDelete); if (!confirm(metadata.deleteMessage?.(row) || `למחוק את ${metadata.label}?`)) return; try { await repository.delete(row[metadata.primaryKey], { primaryKey: metadata.primaryKey, previous: clone(row), metadata }); state.rows = state.rows.filter((item) => String(item[metadata.primaryKey]) !== String(row[metadata.primaryKey])); state.message = 'הרשומה נמחקה בהצלחה'; render(); } catch (error) { state.message = error.message; onError(error); render(); } }));
    root.querySelectorAll('[data-admin-cancel]').forEach((button) => button.addEventListener('click', closeEditor));
    root.querySelector('[data-admin-backdrop]')?.addEventListener('click', (event) => { if (event.target === event.currentTarget) closeEditor(); });
    root.querySelector('[data-admin-form]')?.addEventListener('input', (event) => { if (!event.target.name) return; const field = editableFields.find((item) => item.name === event.target.name); state.editing[event.target.name] = field.type === 'boolean' ? event.target.checked : field.type === 'number' ? (event.target.value === '' ? null : Number(event.target.value)) : event.target.value; });
    root.querySelector('[data-admin-form]')?.addEventListener('submit', async (event) => {
      event.preventDefault(); const record = readForm(event.currentTarget); state.errors = validateRecord(metadata, record);
      if (Object.keys(state.errors).length) { state.editing = record; render(); root.querySelector('[aria-invalid="true"]')?.focus(); return; }
      state.saving = true; state.editing = record; render();
      try {
        const id = state.original?.[metadata.primaryKey]; const context = { primaryKey: metadata.primaryKey, previous: clone(state.original), metadata };
        const saved = id == null ? await repository.create(record, context) : await repository.update(id, record, context);
        state.rows = id == null ? [...state.rows, saved] : state.rows.map((row) => String(row[metadata.primaryKey]) === String(id) ? saved : row);
        state.editing = null; state.original = null; state.errors = {}; state.message = 'השינויים נשמרו בהצלחה';
      } catch (error) { state.errors._form = error.message; state.message = error.message; onError(error); }
      finally { state.saving = false; render(); }
    });
  }

  async function load() { state.status = 'loading'; render(); try { state.rows = await repository.list({ metadata }); state.status = 'ready'; state.message = ''; } catch (error) { state.status = 'error'; state.message = error.message; onError(error); } render(); }
  function destroy() { destroyed = true; window.removeEventListener('beforeunload', beforeUnload); root.innerHTML = ''; }
  load();
  return { reload: load, destroy, isDirty, getState: () => clone(state) };
}

export { validateRecord };
