import { parseWorkbook } from "./bank-workbench.js";
import { createAutosave, readAutosaveDraft } from "./autosave.js";

const money = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" });
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" })[char]);
const isoDay = () => new Date().toISOString().slice(0, 10);

export function bankWorkbenchTemplateV2() {
  return `<section class="bank-new-heading"><div><p class="eyebrow">הנה"ח / קובץ בנקים</p><h1 id="bank-workbench-title">תנועות בנק</h1><p>טיפול שוטף בתנועות, שיוכים והכנה להנהלת חשבונות.</p></div><div class="bank-import-actions"><input id="bank-file" type="file" accept=".xlsx,.xls,.csv" hidden><button id="bank-export-open" class="button button-secondary" type="button">ייצוא</button><button id="bank-new-transaction" class="button button-secondary" type="button">תנועה חדשה</button><button id="bank-upload-history-open" class="button button-secondary" type="button">היסטוריית העלאות</button><button id="bank-import" class="button button-primary" type="button">ייבוא קובץ</button><span id="bank-message" role="status"></span></div></section>
  <section class="bank-workflow-cards" id="bank-workflow-cards" aria-label="שלבי טיפול"></section>
  <section class="bank-new-toolbar panel" aria-label="סינון וחיפוש"><div class="bank-search-group"><label class="bank-new-search">⌕ <input id="bank-new-search" type="search" placeholder="חיפוש בכל שדות התנועה והשיוך"><kbd>/</kbd></label><button id="bank-clear-search" class="button button-quiet" type="button">ניקוי חיפוש</button></div><label>שנה פעילה<select id="bank-year-filter"></select></label><label>חודש תנועה<select id="bank-month-filter" multiple></select></label><label>חודש שיוך<select id="bank-assignment-filter" multiple></select></label><label>מעון<select id="bank-daycare-filter" multiple></select></label><label>מחלקה<select id="bank-department-filter" multiple></select></label><label>חשבון<select id="bank-account-filter" multiple></select></label><label>סעיף תקציבי<select id="bank-category-filter" multiple></select></label><label>סטטוס הנה"ח<select id="bank-status-filter" multiple></select></label><label>פיצול<select id="bank-split-filter"><option value="any">הכול</option><option value="balanced">מאוזן</option><option value="unbalanced">לא מאוזן</option></select></label><label>תיאור<select id="bank-description-presence"><option value="">הכול</option><option value="nonblank">לא ריק</option><option value="blank">ריק</option></select></label><label>אסמכתא<select id="bank-reference-presence"><option value="">הכול</option><option value="nonblank">לא ריק</option><option value="blank">ריק</option></select></label><button id="bank-clear-all" class="button button-quiet bank-clear-compact" type="button">ניקוי הכול</button><span id="bank-new-count"></span><div id="bank-filter-chips" class="bank-filter-chips" aria-live="polite"></div></section>
  <section class="bank-sheet-layout"><div class="bank-new-sheet panel"><div class="bank-new-scroll" id="bank-scroll"><table class="bank-workbench-table"><thead><tr><th class="bank-sticky-number"><input id="bank-select-all" type="checkbox" aria-label="בחירת כל התנועות"><span>#</span></th><th class="bank-sticky-status"><button data-sort="status_asc" data-sort-column="row_status">סטטוס</button></th><th><button data-sort="account_asc">חשבון בנק</button></th><th><button data-sort="date_desc">תאריך ↕</button></th><th><button data-sort="description_asc">תיאור</button></th><th><button data-sort="reference_asc">אסמכתא</button></th><th><button data-sort="amount_desc">סכום ↕</button></th><th>סוג תנועה</th><th><button data-sort="department_asc">מחלקה</button></th><th><button data-sort="daycare_asc">מעון</button></th><th><button data-sort="category_asc">סעיף תקציבי</button></th><th>חודש שיוך</th><th><button data-sort="status_asc" data-sort-column="status">סטטוס הנה"ח</button></th><th>הערות</th><th>מסמך</th></tr></thead><tbody id="bank-new-rows"></tbody></table></div><footer><span id="bank-selection-count">לא נבחרו תנועות</span><button id="bank-delete-selected" class="button button-danger" type="button" hidden>מחיקת נבחרות</button><nav class="bank-pagination" aria-label="עמודים"><button id="bank-page-prev" type="button">הקודם</button><span id="bank-page-status"></span><button id="bank-page-next" type="button">הבא</button></nav><span>Tab מעבר בין שדות · Enter שמירה · ↑↓ מעבר בין תנועות</span></footer></div>
  <section class="bank-metadata-panel panel" id="bank-new-details" hidden></section></section>
  <dialog id="bank-import-dialog" class="bank-dialog"><form method="dialog"><button class="dialog-close" aria-label="סגירה">×</button></form><div id="bank-import-content"></div></dialog>
  <dialog id="bank-export-dialog" class="bank-dialog bank-export-dialog"><form method="dialog"><button class="dialog-close" aria-label="סגירה">×</button></form><div id="bank-export-content"></div></dialog>
  <dialog id="bank-upload-history-dialog" class="bank-dialog bank-history-dialog"><form method="dialog"><button class="dialog-close" aria-label="סגירה">×</button></form><div id="bank-upload-history-content"></div></dialog>
  <dialog id="bank-mapping-dialog" class="bank-dialog"><form method="dialog"><button class="dialog-close" aria-label="סגירה">×</button></form><div id="bank-mapping-content"></div></dialog>
  <dialog id="bank-manual-dialog" class="bank-dialog"><form method="dialog"><button class="dialog-close" aria-label="סגירה">×</button></form><div id="bank-manual-content"></div></dialog>`;
}

export async function mountBankWorkbenchV2(request) {
  const state = { data: null, selected: null, selectedRows: new Set(), expanded: new Set(), workflow: "all", query: "", year: String(new Date().getFullYear()), month: [], assignment: [], daycare: [], department: [], account: [], category: [], status: [], split: "any", descriptionPresence: "", referencePresence: "", sort: "date_desc", visualSortColumn: "date", page: 1, pageSize: 50, batch: "", manualDraft: false, drafts: new Map(), autosaves: new Map(), searchTimer: null };
  const $ = (selector) => document.querySelector(selector);
  const message = (text, tone = "") => { const node = $("#bank-message"); if (node) { node.textContent = text; node.className = tone; } };
  const movementTypes = [
    { value: "INCOME", label: "הכנסה" },
    { value: "EXPENSE", label: "הוצאה" },
    { value: "INTERNAL", label: "פנימי" },
    { value: "EXCLUDE", label: "לא לחישוב" },
  ];
  const lookupOptions = (name) => {
    if (!state.data) return [];
    if (name === "movementTypes") return movementTypes;
    if (name === "daycares") return state.data.daycares.map((row) => ({ value: row.daycare_id, label: row.display_name, active: row.lifecycle_status === "ACTIVE" }));
    if (name === "budgetCategories") return state.data.categories.map((row) => ({ value: row.budget_category_id, label: row.display_name, active: row.lifecycle_status === "ACTIVE" }));
    if (name === "budgetMonths") return state.data.assignmentMonths.map((row) => ({ value: row.start_date?.slice(0, 7), label: row.month_label }));
    if (name === "accountingStatuses") return state.data.accountingStatuses.map((row) => ({ value: row.accounting_status_id, label: row.display_name, active: row.lifecycle_status === "ACTIVE" }));
    return [];
  };
  const optionLabel = (name, value) => lookupOptions(name).find((item) => item.value === value)?.label || "לא הוגדר";
  const options = (name, value) => `<option value="">בחירה…</option>${lookupOptions(name).filter((item) => item.active !== false || item.value === value).map((item) => `<option value="${item.value}" ${item.value === value ? "selected" : ""}>${esc(item.label)}${item.active === false ? " (לא פעיל)" : ""}</option>`).join("")}`;
  const departmentOptions = () => {
    const referenced = new Set(state.data.allocations.map((row) => row.allocation_unit_id).filter(Boolean));
    const rows = state.data.units.filter((row) => row.lifecycle_status === "ACTIVE" || referenced.has(row.allocation_unit_id));
    const hasDaycares = rows.some((row) => row.allocation_unit_type === "DAYCARE");
    return [
      ...(hasDaycares ? [{ value: "DAYCARES", label: "מעונות" }] : []),
      ...rows.filter((row) => row.allocation_unit_type !== "DAYCARE").map((row) => ({ value: row.allocation_unit_id, label: row.display_name })),
    ];
  };
  const transactionNumber = (transaction) => state.data.transactions.findIndex((row) => row.bank_transaction_id === transaction.bank_transaction_id) + 1;
  const accountName = (id) => state.data.accounts.find((row) => row.bank_account_id === id)?.display_name || "לא משויך";
  const allocationsFor = (id) => state.drafts.get(id) || state.data.allocations.filter((row) => row.bank_transaction_id === id);
  const emptyAllocation = (transaction) => ({ bank_transaction_id: transaction.bank_transaction_id, movement_type: "", allocation_unit_id: "", daycare_id: "", budget_category_id: "", budget_month: "", accounting_status_id: "", notes: "", allocation_amount: transaction.amount });
  const unit = (id) => state.data.units.find((row) => row.allocation_unit_id === id);
  const departmentValue = (row) => {
    const selected = unit(row.allocation_unit_id);
    return selected?.allocation_unit_type === "DAYCARE" ? "DAYCARES" : selected?.allocation_unit_id || "";
  };
  const departmentSelect = (row) => `<select name="department" aria-label="מחלקה"><option value="">בחירה…</option>${departmentOptions().map((item) => `<option value="${item.value}" ${departmentValue(row) === item.value ? "selected" : ""}>${esc(item.label)}</option>`).join("")}</select>`;
  const accountingStatus = (row) => state.data.accountingStatuses.find((item) => item.accounting_status_id === row.accounting_status_id);
  const sourceName = (transaction) => transaction.source_payload?.source === "MANUAL" ? "MANUAL" : "BANK";
  const inspect = (transaction, rowsOverride) => {
    const rows = rowsOverride || allocationsFor(transaction.bank_transaction_id);
    const total = rows.reduce((sum, row) => sum + (Number(row.allocation_amount) || 0), 0);
    const remaining = Number(transaction.amount) - total;
    const missing = !rows.length || rows.some((row) => !row.movement_type || !row.allocation_unit_id || (departmentValue(row) === "DAYCARES" && !row.daycare_id) || !row.budget_month || !row.accounting_status_id || (row.movement_type !== "EXCLUDE" && !row.budget_category_id) || !Number(row.allocation_amount));
    const split = rows.length > 1;
    const balanced = rows.length > 0 && Math.abs(remaining) <= .01;
    const statuses = rows.map(accountingStatus).filter(Boolean);
    const statusCode = (value) => value.accounting_status_code || value.sheet_accounting_status_id || "";
    const ready = balanced && !missing && statuses.every((value) => statusCode(value) === "ACC-WAITING");
    const sent = balanced && !missing && statuses.every((value) => value.is_final);
    return { rows, total, remaining, missing, split, balanced, ready, sent, missingDocuments: statuses.some((value) => statusCode(value) === "ACC-MISSING-DOCS") };
  };
  const missingReason = (rows) => {
    if (!rows.length) return "טרם טופל — אין שורת שיוך";
    const missing = new Set();
    rows.forEach((row) => {
      if (!row.movement_type) missing.add("סוג תנועה");
      if (!row.allocation_unit_id) missing.add("מחלקה");
      if (departmentValue(row) === "DAYCARES" && !row.daycare_id) missing.add("מעון");
      if (!row.budget_month) missing.add("חודש שיוך");
      if (!row.accounting_status_id) missing.add("סטטוס הנה״ח");
      if (row.movement_type !== "EXCLUDE" && !row.budget_category_id) missing.add("סעיף תקציבי");
      if (!Number(row.allocation_amount)) missing.add("סכום הקצאה");
    });
    return `חסר: ${[...missing].join(", ")}`;
  };
  const statusInfo = (transaction, rowsOverride) => {
    const info = inspect(transaction, rowsOverride);
    if (info.missingDocuments) return { tone: "missing", text: "חסר מסמך — סטטוס הנה״ח ממתין למסמכים" };
    if (info.missing) return { tone: "missing", text: missingReason(info.rows) };
    if (!info.balanced) return { tone: "error", text: `שגיאת איזון — נותרו ${money.format(info.remaining)}` };
    if (info.sent) return { tone: "complete", text: "הושלם — נשלח להנה״ח או לא נדרש מסמך" };
    if (info.ready) return { tone: "complete", text: "מוכן להנה״ח — כל שדות החובה מלאים והסכום מאוזן" };
    return { tone: "complete", text: "הושלם — כל שדות החובה מלאים והסכום מאוזן" };
  };
  const workflowDefinitions = [["all","כל התנועות","כל הרשומות התואמות"],["unassigned","ללא שיוך","בדיוק אפס שורות שיוך"],["attention","דורש טיפול","טרם טופל, חסר מידע/מסמך או פיצול לא מאוזן"]];
  const workflowMatches = (transaction, workflow = state.workflow) => { const info=inspect(transaction); return workflow==="unassigned" ? !info.rows.length : workflow==="attention" ? !info.rows.length || info.missing || info.missingDocuments || (info.split && !info.balanced) : true; };
  const searchText = (transaction) => `${transaction.description} ${transaction.reference_number || ""} ${transaction.amount} ${transactionNumber(transaction)} ${allocationsFor(transaction.bank_transaction_id).map((row) => row.notes || "").join(" ")}`.toLowerCase();
  const baseFiltered = () => state.data.transactions;
  const filtered = () => state.data.transactions;
  const statusMarkup = (transaction, rowsOverride) => { const status = statusInfo(transaction, rowsOverride); const label=status.tone==="complete"?"תקין":status.tone==="error"?"בעייתי":"חסר מידע";return `<span class="bank-row-status ${status.tone}" title="${esc(status.text)}">${label}</span>`; };
  const allocationInputs = (row) => {
    const department = departmentValue(row);
    return `<td><select name="movement_type" aria-label="סוג תנועה">${options("movementTypes",row.movement_type)}</select></td><td>${departmentSelect(row)}<input name="allocation_unit_id" type="hidden" value="${esc(row.allocation_unit_id || "")}"></td><td><span data-daycare-field ${department === "DAYCARES" ? "" : "hidden"}><select name="daycare_id" aria-label="מעון">${options("daycares",row.daycare_id)}</select></span></td><td><select name="budget_category_id" aria-label="סעיף תקציבי">${options("budgetCategories",row.budget_category_id)}</select></td><td><select name="budget_month" aria-label="חודש שיוך">${options("budgetMonths",row.budget_month?.slice(0,7))}</select></td><td><select name="accounting_status_id" aria-label="סטטוס הנהלת חשבונות">${options("accountingStatuses",row.accounting_status_id)}</select></td><td><input name="notes" value="${esc(row.notes || "")}" aria-label="הערות"></td>`;
  };
  const amountSummary = (transaction, info) => `<div class="bank-amount-summary"><strong>${money.format(transaction.amount)}</strong><small>מקורי ${money.format(transaction.amount)}</small><small>מוקצה ${money.format(info.total)}</small><small class="${info.balanced ? "is-balanced" : "is-unbalanced"}">נותר ${money.format(info.remaining)} · ${info.balanced ? "מאוזן" : "לא מאוזן"}</small></div>`;
  const actionButtons = (transaction, isSplit) => `<div class="bank-row-actions"><span class="autosave-status" data-bank-autosave="${transaction.bank_transaction_id}" role="status">נשמר</span>${isSplit ? "" : `<button type="button" data-save-transaction="${transaction.bank_transaction_id}">שמירה</button>`}<button type="button" data-add-split="${transaction.bank_transaction_id}">＋ פיצול</button>${isSplit ? `<button type="button" data-toggle-split="${transaction.bank_transaction_id}" aria-expanded="${state.expanded.has(transaction.bank_transaction_id)}">${state.expanded.has(transaction.bank_transaction_id) ? "צמצום" : "הרחבה"}</button>` : ""}<button type="button" data-delete-transaction="${transaction.bank_transaction_id}">מחיקה</button></div>`;
  const rowNumberCell = (transaction, suffix = "") => `<td class="bank-sticky-number">${suffix ? '<span class="bank-tree-branch" aria-hidden="true">└─</span>' : ""}<span class="bank-tree-number">${transactionNumber(transaction)}${suffix}</span>${suffix ? "" : `<input type="checkbox" data-select-transaction="${transaction.bank_transaction_id}" ${state.selectedRows.has(transaction.bank_transaction_id) ? "checked" : ""} aria-label="בחירת תנועה ${transactionNumber(transaction)}">`}</td>`;
  const transactionRows = (transaction) => {
    const storedRows = allocationsFor(transaction.bank_transaction_id);
    const rows = storedRows.length ? storedRows : [emptyAllocation(transaction)];
    const info = inspect(transaction);
    const status = statusInfo(transaction);
    const common = `data-bank-row="${transaction.bank_transaction_id}"`;
    if (info.split) {
      const parent = `<tr class="bank-parent-row bank-row-${status.tone}" ${common} tabindex="0">${rowNumberCell(transaction)}<td class="bank-sticky-status">${statusMarkup(transaction)}${actionButtons(transaction,true)}</td><td>${esc(accountName(transaction.bank_account_id))}</td><td>${transaction.transaction_date}</td><td><button class="bank-tree-toggle" type="button" data-toggle-split="${transaction.bank_transaction_id}" aria-expanded="${state.expanded.has(transaction.bank_transaction_id)}">${state.expanded.has(transaction.bank_transaction_id) ? "▾" : "◂"}</button><strong>${esc(transaction.description)}</strong><small>פיצול ל־${rows.length} שורות</small></td><td>${esc(transaction.reference_number || "—")}</td><td>${amountSummary(transaction,info)}</td><td colspan="7" class="bank-parent-allocation-summary">סכום מקורי ${money.format(transaction.amount)} · הוקצה ${money.format(info.total)} · נותר ${money.format(info.remaining)}</td><td class="bank-attachment-cell"><button type="button" data-open-metadata="${transaction.bank_transaction_id}" title="מסמכים ופרטים">📎 <span>${transaction.attachment_count || 0}</span></button></td></tr>`;
      const children = state.expanded.has(transaction.bank_transaction_id) ? rows.map((row,index) => {
        return `<tr class="bank-child-row bank-row-${status.tone}" ${common} data-allocation-entry data-index="${index}">${rowNumberCell(transaction,`.${index+1}`)}<td class="bank-sticky-status">${statusMarkup(transaction)}<div class="bank-row-actions"><button type="button" data-save-transaction="${transaction.bank_transaction_id}">שמירה</button>${index ? `<button type="button" data-delete-split="${transaction.bank_transaction_id}" data-index="${index}">מחיקה</button>` : ""}</div></td><td>${esc(accountName(transaction.bank_account_id))}</td><td>${transaction.transaction_date}</td><td class="bank-child-description">↳ הקצאה ${index+1} מתוך ${rows.length}</td><td>${esc(transaction.reference_number || "—")}</td><td><input name="allocation_amount" type="number" step=".01" value="${esc(row.allocation_amount ?? "")}" aria-label="סכום הקצאה"></td>${allocationInputs(row)}<td class="bank-child-attachment" aria-label="מסמך שייך לתנועת האב"></td></tr>`;
      }).join("") : "";
      return parent + children;
    }
    const row = rows[0];
    return `<tr class="bank-parent-row bank-row-${status.tone}" ${common} data-allocation-entry data-index="0" tabindex="0">${rowNumberCell(transaction)}<td class="bank-sticky-status">${statusMarkup(transaction)}${actionButtons(transaction,false)}</td><td>${esc(accountName(transaction.bank_account_id))}</td><td>${transaction.transaction_date}</td><td><strong>${esc(transaction.description)}</strong><small>מקור: ${sourceName(transaction)}</small></td><td>${esc(transaction.reference_number || "—")}</td><td class="${transaction.amount < 0 ? "bank-debit" : "bank-credit"}"><input name="allocation_amount" type="number" step=".01" value="${esc(transaction.amount)}" aria-label="סכום" readonly><small>מקורי ${money.format(transaction.amount)}</small></td>${allocationInputs(row)}<td class="bank-attachment-cell"><button type="button" data-open-metadata="${transaction.bank_transaction_id}" title="מסמכים ופרטים">📎 <span>${transaction.attachment_count || 0}</span></button></td></tr>`;
  };
  const captureScroll = () => ({ top: $("#bank-scroll")?.scrollTop || 0, left: $("#bank-scroll")?.scrollLeft || 0 });
  const restoreScroll = ({ top, left }) => requestAnimationFrame(() => { if ($("#bank-scroll")) { $("#bank-scroll").scrollTop = top; $("#bank-scroll").scrollLeft = left; } });
  const updateSelection = () => {
    const count = state.selectedRows.size; $("#bank-selection-count").textContent = count ? `${count} תנועות נבחרו` : "לא נבחרו תנועות";
    $("#bank-delete-selected").hidden = count === 0;
    const visible = filtered(); $("#bank-select-all").checked = visible.length > 0 && visible.every((row) => state.selectedRows.has(row.bank_transaction_id));
    $("#bank-select-all").indeterminate = visible.some((row) => state.selectedRows.has(row.bank_transaction_id)) && !$("#bank-select-all").checked;
  };
  const renderWorkflowCards = () => {
    const counts=state.data.queueCounts||{};
    $("#bank-workflow-cards").innerHTML = workflowDefinitions.map(([id,title,description]) => `<button type="button" data-workflow="${id}" class="${state.workflow===id?"active":""}" aria-pressed="${state.workflow===id}"><span>${title}</span><strong>${counts[id]??0}</strong><small>${description}</small></button>`).join("");
  };
  const renderFilterChips = () => {
    const chips = [[null,`שנה: ${state.data.activeYear||state.year}`]];
    if (state.query) chips.push(["query",`חיפוש: ${state.query}`]);
    const labels={month:"חודש תנועה",assignment:"חודש שיוך",daycare:"מעון",department:"מחלקה",account:"חשבון",category:"סעיף",status:"סטטוס"};
    const valueLabel=(key,value)=>[...$(`#bank-${key}-filter`).options].find((option)=>option.value===value)?.textContent||value;
    ["month","assignment","daycare","department","account","category","status"].forEach((key)=>state[key].forEach((value)=>chips.push([`${key}:${value}`,`${labels[key]}: ${valueLabel(key,value)}`])));
    if(state.split!=="any")chips.push(["split",`פיצול: ${state.split==="balanced"?"מאוזן":"לא מאוזן"}`]);
    if(state.descriptionPresence)chips.push(["descriptionPresence",`תיאור: ${state.descriptionPresence==="blank"?"ריק":"לא ריק"}`]);
    if(state.referencePresence)chips.push(["referencePresence",`אסמכתא: ${state.referencePresence==="blank"?"ריקה":"לא ריקה"}`]);
    if (state.workflow !== "all") chips.push(["workflow",`תהליך: ${workflowDefinitions.find(([id])=>id===state.workflow)?.[1]}`]);
    if (state.batch) chips.push(["batch","אצוות הייבוא האחרונה"]);
    $("#bank-filter-chips").innerHTML = chips.map(([key,text])=>key?`<button type="button" data-clear-filter="${key}" title="הסרת סינון">${esc(text)} ×</button>`:`<span class="bank-filter-chip-fixed">${esc(text)}</span>`).join("");
  };
  const renderActiveControlStates = () => {
    ["month","assignment","daycare","department","account","category","status"].forEach((key)=>{
      const select=$(`#bank-${key}-filter`), count=state[key].length, label=select.closest("label");
      label.classList.add("bank-filter-control"); label.classList.toggle("active",count>0); label.dataset.selectionSummary=count?`נבחרו: ${count}`:"הכול";
    });
    document.querySelectorAll(".bank-workbench-table thead [data-sort]").forEach((button)=>{
      const column=button.dataset.sortColumn||button.dataset.sort.split("_")[0], active=column===state.visualSortColumn;
      button.classList.toggle("active-sort",active); button.setAttribute("aria-pressed",String(active)); button.dataset.direction=active&&state.sort.endsWith("_asc")?"עולה":active?"יורד":"";
      button.closest("th").setAttribute("aria-sort",active?(state.sort.endsWith("_asc")?"ascending":"descending"):"none");
    });
  };
  const renderMetadata = () => {
    const transaction = state.data.transactions.find((row) => row.bank_transaction_id === state.selected), root=$("#bank-new-details");
    if (!transaction) { root.hidden=true; return; }
    const batch=state.data.batches.find((row)=>row.import_batch_id===transaction.import_batch_id); root.hidden=false;
    root.innerHTML=`<header><div><p class="eyebrow">מידע על תנועת המקור</p><h2>${esc(transaction.description)}</h2></div><button type="button" data-close-metadata aria-label="סגירה">×</button></header><div class="bank-metadata-grid"><dl><div><dt>חשבון</dt><dd>${esc(accountName(transaction.bank_account_id))}</dd></div><div><dt>תאריך תנועה</dt><dd>${transaction.transaction_date}</dd></div><div><dt>אסמכתא</dt><dd>${esc(transaction.reference_number||"—")}</dd></div><div><dt>סכום מקור</dt><dd>${money.format(transaction.amount)}</dd></div><div><dt>מקור</dt><dd>${sourceName(transaction)}</dd></div></dl><section><h3>פרטי ייבוא וביקורת</h3><p>קובץ: ${esc(batch?.source_file_name||"לא זמין")}</p><p>אצווה: ${esc(transaction.import_batch_id||"—")}</p><p>נקלט: ${esc(transaction.created_at||batch?.started_at||"—")}</p></section><section><h3>מסמכים</h3><div class="attachment-placeholder"><button type="button" disabled title="העלאה תתווסף ב-TRACK015A">📎</button><span>מסמכים: ${transaction.attachment_count||0}</span></div><small>שמירת קבצים תתווסף ב־TRACK015A.</small></section></div>`;
  };
  const readInlineRow = (root) => Object.fromEntries([...root.querySelectorAll("[name]")].map((input)=>[input.name,input.value]));
  const refreshTransaction = (transactionId, persist = true) => {
    const transaction=state.data.transactions.find((row)=>row.bank_transaction_id===transactionId); if(!transaction)return;
    const roots=[...document.querySelectorAll(`[data-bank-row="${transactionId}"][data-allocation-entry]`)];
    if (!roots.length) return;
    const values=roots.map(readInlineRow); if(persist)state.drafts.set(transactionId,values);
    const status=statusInfo(transaction,values);
    document.querySelectorAll(`[data-bank-row="${transactionId}"]`).forEach((row)=>{row.classList.remove("bank-row-complete","bank-row-missing","bank-row-error");row.classList.add(`bank-row-${status.tone}`);});
    document.querySelectorAll(`[data-bank-row="${transactionId}"] .bank-sticky-status .bank-row-status`).forEach((node)=>{node.className=`bank-row-status ${status.tone}`;node.textContent=status.text;node.title=status.text;});
  };
  const visibleRows = (transactionId) => {
    const roots=[...document.querySelectorAll(`[data-bank-row="${transactionId}"][data-allocation-entry]`)];
    return roots.length ? roots.map(readInlineRow) : (state.drafts.get(transactionId) || []);
  };
  const autosaveFor = (transactionId) => {
    if (state.autosaves.has(transactionId)) return state.autosaves.get(transactionId);
    const transaction=state.data.transactions.find((row)=>row.bank_transaction_id===transactionId);
    const controller=createAutosave({
      key:`bank.allocations.${transactionId}`,
      read:()=>visibleRows(transactionId),
      validate:(rows)=>{const info=inspect(transaction,rows);return !info.missing&&info.balanced;},
      statusTargets:()=>document.querySelectorAll(`[data-bank-autosave="${transactionId}"]`),
      save:(rows)=>request("POST",{action:"save_allocations",bank_transaction_id:transactionId,allocations:rows}),
      onSaved:async(result)=>{const scroll=captureScroll();state.data.allocations=state.data.allocations.filter((row)=>row.bank_transaction_id!==transactionId).concat(result.allocations||[]);state.drafts.delete(transactionId);await reload();restoreScroll(scroll);message("השורה נשמרה.","success");},
    });
    state.autosaves.set(transactionId,controller);
    return controller;
  };
  const saveTransaction = async (transactionId) => {
    try { await autosaveFor(transactionId).saveNow({manual:true}); }
    catch(error) { message(error.details?.join(" · ")||error.message,"error"); refreshTransaction(transactionId); }
  };
  const render = (preserve = true) => {
    const scroll=preserve?captureScroll():null, rows=filtered(), pagination=state.data.pagination||{}; renderWorkflowCards(); renderFilterChips(); renderActiveControlStates(); $("#bank-new-count").textContent=`מציג ${rows.length} מתוך ${pagination.total??rows.length} תנועות`;
    $("#bank-workbench-title").textContent=`תנועות בנק — ${state.data.activeYear||state.year}`;
    $("#bank-page-status").textContent=`עמוד ${pagination.page||1} מתוך ${pagination.pageCount||1}`; $("#bank-page-prev").disabled=!pagination.hasPrevious; $("#bank-page-next").disabled=!pagination.hasNext;
    const manual = state.manualDraft ? `<tr class="bank-row-missing bank-manual-inline" data-manual-bank-row><td class="bank-sticky-number"><span>חדש</span></td><td class="bank-sticky-status"><span class="bank-row-status missing">חסר מידע</span></td><td><select name="bank_account_id"><option value="">חשבון…</option>${state.data.accounts.filter((row)=>row.lifecycle_status==="ACTIVE").map((row)=>`<option value="${row.bank_account_id}">${esc(row.display_name)}</option>`).join("")}</select></td><td><input name="transaction_date" type="date"></td><td><input name="description" placeholder="תיאור"></td><td><input name="reference_number" placeholder="אסמכתא"></td><td><input name="amount" type="number" step=".01" placeholder="סכום"></td><td colspan="7"><span class="muted">מספר שורה ומספר תנועה יוקצו אוטומטית בשמירה</span></td><td><button class="button button-primary" data-save-manual-inline type="button">שמירה</button><button class="button button-quiet" data-cancel-manual-inline type="button">ביטול</button></td></tr>` : "";
    $("#bank-new-rows").innerHTML=manual+(rows.map(transactionRows).join("")||(!state.manualDraft?'<tr><td colspan="15"><div class="admin-state admin-empty"><strong>אין תנועות בנק להצגה</strong><p>שנו את הסינון או ייבאו קובץ חדש.</p></div></td></tr>':""));
    updateSelection(); renderMetadata(); if(scroll)restoreScroll(scroll);
  };
  const renderToolbarFilters = () => {
    const optionRows=(rows,key)=>rows.map((row)=>`<option value="${row[key]}">${esc(row.display_name)}</option>`).join("");
    $("#bank-year-filter").innerHTML=state.data.calendarYears.map((row)=>`<option value="${row.year_number}">${esc(row.display_name||row.year_number)}</option>`).join(""); $("#bank-year-filter").value=state.year;
    $("#bank-month-filter").innerHTML=Array.from({length:12},(_,i)=>{const value=`${state.year}-${String(i+1).padStart(2,"0")}`;return `<option value="${value}">${value}</option>`;}).join("");
    $("#bank-assignment-filter").innerHTML=lookupOptions("budgetMonths").map((row)=>`<option value="${row.value}">${esc(row.label)}</option>`).join("");
    $("#bank-account-filter").innerHTML=optionRows(state.data.accounts,"bank_account_id"); $("#bank-daycare-filter").innerHTML=optionRows(state.data.daycares,"daycare_id"); $("#bank-department-filter").innerHTML=optionRows(state.data.units,"allocation_unit_id"); $("#bank-category-filter").innerHTML=optionRows(state.data.categories,"budget_category_id"); $("#bank-status-filter").innerHTML=optionRows(state.data.accountingStatuses,"accounting_status_id");
    ["month","assignment","daycare","department","account","category","status"].forEach((name)=>[...$(`#bank-${name}-filter`).options].forEach((option)=>option.selected=state[name].includes(option.value)));
  };
  const reload = async () => {
    const params=new URLSearchParams({year:state.year,page:String(state.page),page_size:String(state.pageSize),query:state.query,queue:state.workflow,split:state.split,sort:state.sort,description_presence:state.descriptionPresence,reference_presence:state.referencePresence});
    const paramNames={month:"transaction_month",assignment:"assignment_month",daycare:"daycare",department:"department",account:"account",category:"category",status:"status"}; Object.entries(paramNames).forEach(([key,name])=>state[key].forEach((value)=>params.append(name,value)));
    state.data={
      transactions: [], allocations: [], accounts: [], units: [], daycares: [],
      categories: [], accountingStatuses: [], assignmentMonths: [], calendarYears: [], batches: [],
      ...await request("GET",undefined,params.toString()),
    };
    state.drafts.clear(); state.data.transactions.forEach((row)=>{const draft=readAutosaveDraft(`bank.allocations.${row.bank_transaction_id}`);if(draft)state.drafts.set(row.bank_transaction_id,draft);if(allocationsFor(row.bank_transaction_id).length>1)state.expanded.add(row.bank_transaction_id);}); renderToolbarFilters(); render(false);
  };
  const exportColumns = ["#","סטטוס","חשבון בנק","תאריך","תיאור","אסמכתא","סכום","סוג תנועה","מחלקה","מעון","סעיף תקציבי","חודש שיוך","סטטוס הנה״ח","הערות","מסמכים","מקור"];
  const exportRowsFor = (transactions, exactView = false) => transactions.flatMap((transaction) => {
    const rows=allocationsFor(transaction.bank_transaction_id), info=inspect(transaction), base=[transactionNumber(transaction),statusInfo(transaction).text,accountName(transaction.bank_account_id),transaction.transaction_date,transaction.description,transaction.reference_number||"",Number(transaction.amount)];
    const parent=[...base,"","","","","","","",transaction.attachment_count||0,sourceName(transaction)];
    if (info.split) {
      const children=rows.map((row,index)=>[`${transactionNumber(transaction)}.${index+1}`,statusInfo(transaction,[row]).text,accountName(transaction.bank_account_id),transaction.transaction_date,`הקצאה ${index+1}: ${transaction.description}`,transaction.reference_number||"",Number(row.allocation_amount)||0,optionLabel("movementTypes",row.movement_type),departmentOptions().find((item)=>item.value===departmentValue(row))?.label||"",optionLabel("daycares",row.daycare_id),optionLabel("budgetCategories",row.budget_category_id),row.budget_month||"",optionLabel("accountingStatuses",row.accounting_status_id),row.notes||"","",sourceName(transaction)]);
      return exactView && !state.expanded.has(transaction.bank_transaction_id) ? [parent] : [parent,...children];
    }
    const row=rows[0]||{}; return [[...base,optionLabel("movementTypes",row.movement_type),departmentOptions().find((item)=>item.value===departmentValue(row))?.label||"",optionLabel("daycares",row.daycare_id),optionLabel("budgetCategories",row.budget_category_id),row.budget_month||"",optionLabel("accountingStatuses",row.accounting_status_id),row.notes||"",transaction.attachment_count||0,sourceName(transaction)]];
  });
  const ensureExcel = async () => {
    if (window.ExcelJS) return window.ExcelJS;
    await new Promise((resolve,reject)=>{const script=document.createElement("script");script.src="/vendor/exceljs.min.js";script.onload=resolve;script.onerror=()=>reject(new Error("רכיב Excel אינו זמין"));document.head.append(script);});
    return window.ExcelJS;
  };
  const downloadExcel = async (rows) => {
    const ExcelJS=await ensureExcel(), workbook=new ExcelJS.Workbook(), sheet=workbook.addWorksheet("תנועות בנק",{views:[{rightToLeft:true}]});
    sheet.addRow(exportColumns); rows.forEach((row)=>sheet.addRow(row)); sheet.getRow(1).font={bold:true}; sheet.columns.forEach((column)=>{column.width=18;});
    const buffer=await workbook.xlsx.writeBuffer(), link=document.createElement("a"); link.href=URL.createObjectURL(new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})); link.download=`bank-transactions-${isoDay()}.xlsx`; document.body.append(link); link.click(); setTimeout(()=>{URL.revokeObjectURL(link.href);link.remove();},0);
  };
  const exportPdf = (rows) => {
    const popup=window.open("","_blank","noopener,noreferrer"); if(!popup)throw new Error("יש לאפשר חלון קופץ לצורך ייצוא PDF");
    popup.document.write(`<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>תנועות בנק</title><style>body{font-family:Arial;padding:20px}table{border-collapse:collapse;width:100%;font-size:9px}th,td{border:1px solid #bbb;padding:4px;text-align:right}th{background:#eee}@page{size:A4 landscape;margin:8mm}</style></head><body><h1>תנועות בנק</h1><table><thead><tr>${exportColumns.map((value)=>`<th>${value}</th>`).join("")}</tr></thead><tbody>${rows.map((row)=>`<tr>${row.map((value)=>`<td>${esc(value)}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`); popup.document.close();
  };
  const selectionMatches = (filters) => state.data.transactions.filter((transaction) => {
    const rows=allocationsFor(transaction.bank_transaction_id), date=transaction.transaction_date||"";
    return (!filters.accountingMonth||rows.some((row)=>row.budget_month?.startsWith(filters.accountingMonth)))&&(!filters.calendarMonth||date.slice(5,7)===filters.calendarMonth)&&(!filters.year||date.startsWith(filters.year))&&(!filters.account||transaction.bank_account_id===filters.account)&&(!filters.daycare||rows.some((row)=>row.daycare_id===filters.daycare))&&(!filters.department||rows.some((row)=>departmentValue(row)===filters.department))&&(!filters.category||rows.some((row)=>row.budget_category_id===filters.category))&&(!filters.accountingStatus||rows.some((row)=>row.accounting_status_id===filters.accountingStatus))&&(!filters.workflow||workflowMatches(transaction,filters.workflow));
  });
  const exportFilters = (root) => Object.fromEntries([...root.querySelectorAll("[data-export-filter]")].map((input)=>[input.dataset.exportFilter,input.value]));
  const renderExportDialog = () => {
    const root=$("#bank-export-content"), allocationRows=state.data.allocations, values=(items)=>[...new Set(items.filter(Boolean))], optionSet=(items,labeler=(value)=>value)=>'<option value="">הכול</option>'+items.map((value)=>`<option value="${value}">${esc(labeler(value))}</option>`).join("");
    const months=values(state.data.transactions.map((row)=>row.transaction_date?.slice(5,7))).sort(), years=values(state.data.transactions.map((row)=>row.transaction_date?.slice(0,4))).sort().reverse(), assignmentMonths=values(allocationRows.map((row)=>row.budget_month?.slice(0,7))).sort().reverse();
    const accountIds=values(state.data.transactions.map((row)=>row.bank_account_id)), daycareIds=values(allocationRows.map((row)=>row.daycare_id)), departments=values(allocationRows.map(departmentValue)), categoryIds=values(allocationRows.map((row)=>row.budget_category_id)), statuses=values(allocationRows.map((row)=>row.accounting_status_id));
    root.innerHTML=`<h2>ייצוא תנועות בנק</h2><fieldset class="bank-export-scope"><legend>מה לייצא?</legend><label><input type="radio" name="export_scope" value="view" checked> התצוגה הנוכחית — בדיוק השורות המוצגות</label><label><input type="radio" name="export_scope" value="selection"> ייצוא לפי בחירה וסינונים</label></fieldset><div id="bank-export-filters" hidden><label>חודש שיוך<select data-export-filter="accountingMonth">${optionSet(assignmentMonths)}</select></label><label>חודש קלנדרי<select data-export-filter="calendarMonth">${optionSet(months)}</select></label><label>שנה<select data-export-filter="year">${optionSet(years)}</select></label><label>חשבון בנק<select data-export-filter="account">${optionSet(accountIds,accountName)}</select></label><label>מעון<select data-export-filter="daycare">${optionSet(daycareIds,(value)=>optionLabel("daycares",value))}</select></label><label>מחלקה<select data-export-filter="department">${optionSet(departments,(value)=>departmentOptions().find((item)=>item.value===value)?.label)}</select></label><label>סעיף תקציבי<select data-export-filter="category">${optionSet(categoryIds,(value)=>optionLabel("budgetCategories",value))}</select></label><label>סטטוס הנה״ח<select data-export-filter="accountingStatus">${optionSet(statuses,(value)=>optionLabel("accountingStatuses",value))}</select></label><label>סטטוס תהליך<select data-export-filter="workflow"><option value="">הכול</option>${workflowDefinitions.slice(1).map(([id,title])=>`<option value="${id}">${title}</option>`).join("")}</select></label></div><p class="bank-export-count"><strong id="bank-export-count">${filtered().length}</strong> תנועות תואמות</p><fieldset><legend>פורמט</legend><label><input type="radio" name="export_format" value="xlsx" checked> Excel (.xlsx)</label><label><input type="radio" name="export_format" value="pdf"> PDF</label></fieldset><div class="dialog-actions"><button id="bank-export-confirm" class="button button-primary" type="button">ייצוא</button><button class="button button-secondary" type="button" data-close-export>ביטול</button></div>`;
    const updateCount=()=>{const selection=root.querySelector('[name="export_scope"]:checked').value==="selection";root.querySelector("#bank-export-filters").hidden=!selection;$("#bank-export-count").textContent=selection?selectionMatches(exportFilters(root)).length:filtered().length;};
    root.addEventListener("change",updateCount); root.querySelector("[data-close-export]").addEventListener("click",()=>$("#bank-export-dialog").close());
    root.querySelector("#bank-export-confirm").addEventListener("click",async()=>{try{const selection=root.querySelector('[name="export_scope"]:checked').value==="selection", transactions=selection?selectionMatches(exportFilters(root)):filtered(), rows=exportRowsFor(transactions,!selection), format=root.querySelector('[name="export_format"]:checked').value;if(format==="xlsx")await downloadExcel(rows);else exportPdf(rows);$("#bank-export-dialog").close();message(`יוצאו ${transactions.length} תנועות.`,"success");}catch(error){message(error.message,"error");}});
  };
  const displayDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return "—";
    const [year,month,day]=String(value).split("-"); return `${day}/${month}/${year}`;
  };
  const displayTimestamp = (value) => value ? new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "לא הושלם";
  const historyStatus = (batch) => {
    const labels={COMPLETED:"הושלם",COMPLETED_WITH_ERRORS:"הושלם עם שגיאות",RUNNING:"בתהליך",PENDING:"ממתין",FAILED:"נכשל",CANCELLED:"בוטל"};
    if(batch.status==="RUNNING"&&!batch.completed_at&&!batch.accepted_rows)return "ייבוא ישן ללא השלמה";
    return labels[batch.status]||batch.status||"לא ידוע";
  };
  const renderUploadHistory = () => {
    const root=$("#bank-upload-history-content"), history=state.data.uploadHistory||{accounts:[],batches:[]};
    const accountCards=history.accounts.length?history.accounts.map((account)=>`<article><span>${esc(account.display_name||"חשבון לא מזוהה")}</span><strong>${account.latest_covered_transaction_date?displayDate(account.latest_covered_transaction_date):"אין תנועות שיובאו"}</strong><small>${account.latest_covered_transaction_date?"תאריך תנועה אחרון שנקלט":"אין כיסוי זמין"}</small></article>`).join(""):'<div class="bank-history-empty">אין חשבונות בנק להצגה.</div>';
    const rows=history.batches.length?history.batches.map((batch)=>`<tr><td data-label="חשבון">${esc(batch.account_name||"חשבון לא מזוהה")}</td><td data-label="קובץ">${esc(batch.source_file_name||"שם הקובץ לא נשמר")}</td><td data-label="טווח תנועות">${batch.transaction_date_min&&batch.transaction_date_max?`${displayDate(batch.transaction_date_min)}–${displayDate(batch.transaction_date_max)}`:'<span class="bank-history-legacy">טווח לא נשמר בייבוא הישן</span>'}</td><td data-label="מועד העלאה">${displayTimestamp(batch.started_at)}</td><td data-label="סה״כ">${Number(batch.total_rows)||0}</td><td data-label="יובאו">${Number(batch.accepted_rows)||0}</td><td data-label="כפילויות">${Number(batch.duplicate_rows)||0}</td><td data-label="נדחו">${Number(batch.rejected_rows)||0}</td><td data-label="סטטוס"><span class="bank-history-status bank-history-status-${esc(String(batch.status||"unknown").toLowerCase())}">${esc(historyStatus(batch))}</span>${batch.error_summary?`<small>${esc(batch.error_summary)}</small>`:""}</td></tr>`).join(""):'<tr><td colspan="9"><div class="bank-history-empty">עדיין לא נשמרה היסטוריית העלאות.</div></td></tr>';
    root.innerHTML=`<header class="bank-history-head"><div><p class="eyebrow">קובץ בנקים</p><h2>היסטוריית העלאות</h2><p>כיסוי התנועות הנוכחי ו־50 ההעלאות האחרונות.</p></div></header><section class="bank-history-coverage" aria-label="תאריך כיסוי אחרון לפי חשבון">${accountCards}</section><div class="bank-history-table-wrap"><table class="bank-history-table"><thead><tr><th>חשבון</th><th>קובץ</th><th>טווח תנועות</th><th>מועד העלאה</th><th>סה״כ</th><th>יובאו</th><th>כפילויות</th><th>נדחו</th><th>סטטוס</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  };
  const openPreview = (parsed, preview) => {
    const dialog=$("#bank-import-dialog"),root=$("#bank-import-content");
    root.innerHTML=`<h2>תצוגה מקדימה לפני ייבוא</h2><p><b>קובץ:</b> ${esc(parsed.fileName)} · <b>חשבון:</b> ${esc(preview.account.display_name)} (${esc(preview.account_number)})</p><div class="import-summary"><span>חדשות <b>${preview.summary.importable}</b></span><span>כפילויות <b>${preview.summary.duplicates}</b></span><span>שגיאות <b>${preview.summary.invalid}</b></span></div><div class="import-preview-scroll"><table><thead><tr><th>שורה</th><th>תאריך</th><th>תיאור</th><th>אסמכתא</th><th>סכום</th><th>מצב</th></tr></thead><tbody>${preview.rows.map((row)=>`<tr class="${row.importable?"":"import-skip"}"><td>${row.source_row_number}</td><td>${row.transaction_date||"—"}</td><td>${esc(row.description)}</td><td>${esc(row.reference_number||"—")}</td><td>${Number.isFinite(row.amount)?money.format(row.amount):"—"}</td><td>${row.duplicate?"כפילות":row.errors.length?esc(row.errors.join(", ")):"מוכן"}</td></tr>`).join("")}</tbody></table></div><div class="dialog-actions"><button id="confirm-bank-import" class="button button-primary" ${preview.summary.importable?"":"disabled"}>אישור וייבוא ${preview.summary.importable} תנועות</button><button class="button button-secondary" onclick="this.closest('dialog').close()">ביטול</button></div>`;
    dialog.showModal();
    $("#confirm-bank-import")?.addEventListener("click",async()=>{try{const result=await request("POST",{action:"confirm_import",preview_token:preview.preview_token,account_id:preview.account.bank_account_id,account_number:preview.account_number,file_name:parsed.fileName,total_rows:preview.summary.total,duplicate_rows:preview.summary.duplicates,invalid_rows:preview.summary.invalid,rows:preview.rows});dialog.close();state.batch=result.batch_id;await reload();state.selected=result.transactions[0]?.bank_transaction_id||null;render();message(`יובאו ${result.imported} תנועות. האצווה נפתחה.`,"success");}catch(error){message(error.message,"error");}});
  };
  const openMapping = (file, data, parsed) => {
    const dialog=$("#bank-mapping-dialog"),root=$("#bank-mapping-content");
    const columnOptions=(headers,selected=-1)=>'<option value="-1">לא קיימת</option>'+headers.map((header,index)=>`<option value="${index}" ${index===selected?"selected":""}>${esc(header||`עמודה ${index+1}`)}</option>`).join("");
    const field=(name,title,required=true)=>`<label>${title}${required?" *":""}<select data-map="${name}">${columnOptions(parsed.headers,parsed.indexes?.[name]??-1)}</select></label>`;
    root.innerHTML=`<h2>מיפוי עמודות ידני</h2><p>${esc(parsed.reason)} בחרו את העמודות וחשבון הבנק, ואז נציג תצוגה מקדימה.</p><div class="bank-mapping-grid"><label>שורת כותרות<select id="bank-map-header">${parsed.matrix.map((row,index)=>`<option value="${index}" ${index===parsed.headerIndex?"selected":""}>${index+1}: ${esc(row.filter(Boolean).slice(0,4).join(" | "))}</option>`).join("")}</select></label>${field("transaction_date","תאריך")}${field("description","תיאור")}${field("reference_number","אסמכתא",false)}${field("amount","סכום חתום",false)}${field("debit","חובה",false)}${field("credit","זכות",false)}${field("account","מספר חשבון בקובץ",false)}<label>חשבון בנק *<select id="bank-map-account"><option value="">בחירה…</option>${state.data.accounts.filter((row)=>row.lifecycle_status==="ACTIVE").map((row)=>`<option value="${esc(row.source_account_number||"")}">${esc(row.display_name)}</option>`).join("")}</select></label></div><div class="dialog-actions"><button id="bank-apply-mapping" class="button button-primary" type="button">המשך לתצוגה מקדימה</button><button class="button button-secondary" type="button" data-close-mapping>ביטול</button></div>`;
    dialog.showModal();
    $("#bank-map-header").addEventListener("change",(event)=>{
      const headers=parsed.matrix[Number(event.target.value)]||[];
      root.querySelectorAll("[data-map]").forEach((select)=>{select.innerHTML=columnOptions(headers,-1);});
    });
    root.querySelector("[data-close-mapping]").addEventListener("click",()=>dialog.close());
    root.querySelector("#bank-apply-mapping").addEventListener("click",async()=>{
      try {
        const manual={headerIndex:Number($("#bank-map-header").value),accountNumber:$("#bank-map-account").value};
        root.querySelectorAll("[data-map]").forEach((select)=>{manual[select.dataset.map]=Number(select.value);});
        const reparsed=await parseWorkbook(file,data,state.data.accounts,manual);
        if(reparsed.needsMapping)throw new Error("יש לבחור תאריך, תיאור, סכום חתום או עמודות חובה/זכות, וחשבון בנק.");
        const preview=await request("POST",{action:"preview",account_number:reparsed.accountNumber,rows:reparsed.rows});
        dialog.close();openPreview(reparsed,preview);message("");
      } catch(error) { message(error.message,"error"); }
    });
  };
  const deleteTransactions = async (ids) => {
    const unique=[...new Set(ids)].filter(Boolean); if(!unique.length)return;
    if(!confirm(unique.length===1?"למחוק את התנועה? כל שורות הפיצול שלה יימחקו.":`למחוק ${unique.length} תנועות? כל שורות הפיצול שלהן יימחקו.`))return;
    const scroll=captureScroll();
    try {
      await request("POST",{action:"delete_transactions",bank_transaction_ids:unique});
      state.data.transactions=state.data.transactions.filter((row)=>!unique.includes(row.bank_transaction_id));
      state.data.allocations=state.data.allocations.filter((row)=>!unique.includes(row.bank_transaction_id));
      unique.forEach((id)=>{state.selectedRows.delete(id);state.drafts.delete(id);state.expanded.delete(id);});
      if(unique.includes(state.selected))state.selected=null;
      render(false);restoreScroll(scroll);message(`נמחקו ${unique.length} תנועות.`,"success");
    } catch(error) { message(error.message,"error"); }
  };
  const openManualTransaction = () => {
    const dialog=$("#bank-manual-dialog"), root=$("#bank-manual-content");
    root.innerHTML=`<h2>תנועה חדשה</h2><p>תנועה ידנית נשמרת ומתנהגת כמו תנועה מיובאת, עם מקור MANUAL.</p><form id="bank-manual-form" class="bank-mapping-grid"><label>חשבון בנק *<select name="bank_account_id" required><option value="">בחירה…</option>${state.data.accounts.filter((row)=>row.lifecycle_status==="ACTIVE").map((row)=>`<option value="${row.bank_account_id}">${esc(row.display_name)}</option>`).join("")}</select></label><label>תאריך *<input name="transaction_date" type="date" required></label><label>תיאור *<input name="description" required></label><label>אסמכתא<input name="reference_number"></label><label>סכום *<input name="amount" type="number" step=".01" required></label><div class="dialog-actions"><button class="button button-primary" type="submit">שמירת תנועה</button><button class="button button-secondary" type="button" data-close-manual>ביטול</button></div></form>`;
    dialog.showModal();
    root.querySelector("[data-close-manual]").addEventListener("click",()=>dialog.close());
    root.querySelector("#bank-manual-form").addEventListener("submit",async(event)=>{
      event.preventDefault();
      const payload=Object.fromEntries(new FormData(event.currentTarget));
      try {
        const result=await request("POST",{action:"create_manual_transaction",...payload,amount:Number(payload.amount)});
        dialog.close(); await reload(); state.selected=result.transaction.bank_transaction_id; render(); message("התנועה הידנית נוספה.","success");
      } catch(error) { message(error.details?.join(" · ")||error.message,"error"); }
    });
  };
  const clearFilter = (key) => {
    if(key.includes(":")){const [name,value]=key.split(":");state[name]=state[name].filter((item)=>item!==value);} else if(key==="query"){$("#bank-new-search").value="";state.query="";} else if(key==="workflow")state.workflow="all"; else if(key==="batch")state.batch=""; else if(["split","descriptionPresence","referencePresence"].includes(key))state[key]=key==="split"?"any":""; state.page=1; reload();
  };
  $("#bank-import").addEventListener("click",()=>$("#bank-file").click());
  $("#bank-new-transaction").addEventListener("click",()=>{state.manualDraft=true;render();$("[data-manual-bank-row] select")?.focus();});
  $("#bank-file").addEventListener("change",async(event)=>{const file=event.target.files[0];if(!file)return;try{message("קורא את הקובץ…");const data=await file.arrayBuffer(),parsed=await parseWorkbook(file,data,state.data.accounts);if(parsed.needsMapping){openMapping(file,data,parsed);message("");return;}const preview=await request("POST",{action:"preview",account_number:parsed.accountNumber,rows:parsed.rows});openPreview(parsed,preview);message("");}catch(error){message(error.message,"error");}finally{event.target.value="";}});
  $("#bank-export-open").addEventListener("click",()=>{renderExportDialog();$("#bank-export-dialog").showModal();});
  $("#bank-upload-history-open").addEventListener("click",()=>{if(!state.data){message("הנתונים עדיין נטענים…");return;}renderUploadHistory();$("#bank-upload-history-dialog").showModal();});
  $("#bank-workflow-cards").addEventListener("click",(event)=>{const card=event.target.closest("[data-workflow]");if(card){state.workflow=card.dataset.workflow;state.page=1;reload();}});
  $("#bank-new-search").addEventListener("input",(event)=>{state.query=event.target.value;state.page=1;clearTimeout(state.searchTimer);state.searchTimer=setTimeout(reload,250);});
  $("#bank-clear-search").addEventListener("click",()=>clearFilter("query"));
  ["month","assignment","daycare","department","account","category","status"].forEach((name)=>$(`#bank-${name}-filter`).addEventListener("change",(event)=>{state[name]=[...event.target.selectedOptions].map((option)=>option.value);state.page=1;reload();}));
  $("#bank-year-filter").addEventListener("change",(event)=>{state.year=event.target.value;state.month=[];state.page=1;reload();});
  $("#bank-split-filter").addEventListener("change",(event)=>{state.split=event.target.value;state.page=1;reload();});
  $("#bank-description-presence").addEventListener("change",(event)=>{state.descriptionPresence=event.target.value;state.page=1;reload();});
  $("#bank-reference-presence").addEventListener("change",(event)=>{state.referencePresence=event.target.value;state.page=1;reload();});
  $(".bank-workbench-table thead").addEventListener("click",(event)=>{const button=event.target.closest("[data-sort]");if(!button)return;const next=button.dataset.sort;state.visualSortColumn=button.dataset.sortColumn||next.split("_")[0];if(next==="date_desc"&&state.sort==="date_desc")state.sort="date_asc";else if(next==="amount_desc"&&state.sort==="amount_desc")state.sort="amount_asc";else state.sort=next;state.page=1;reload();});
  $("#bank-page-prev").addEventListener("click",()=>{if(state.data.pagination?.hasPrevious){state.page-=1;reload();}}); $("#bank-page-next").addEventListener("click",()=>{if(state.data.pagination?.hasNext){state.page+=1;reload();}});
  $("#bank-clear-all").addEventListener("click",()=>{state.query=state.batch=state.descriptionPresence=state.referencePresence="";state.month=state.assignment=state.daycare=state.department=state.account=state.category=state.status=[];state.split="any";state.workflow="all";state.sort="date_desc";state.visualSortColumn="date";state.page=1;$("#bank-new-search").value="";reload();});
  $("#bank-filter-chips").addEventListener("click",(event)=>{const chip=event.target.closest("[data-clear-filter]");if(chip)clearFilter(chip.dataset.clearFilter);});
  $("#bank-select-all").addEventListener("change",(event)=>{filtered().forEach((row)=>event.target.checked?state.selectedRows.add(row.bank_transaction_id):state.selectedRows.delete(row.bank_transaction_id));render();});
  $("#bank-delete-selected").addEventListener("click",()=>deleteTransactions([...state.selectedRows]));
  $("#bank-new-rows").addEventListener("click",(event)=>{
    if(event.target.closest("[data-cancel-manual-inline]")){state.manualDraft=false;render();return;}
    if(event.target.closest("[data-save-manual-inline]")){
      const row=$("[data-manual-bank-row]"), value=(name)=>row.querySelector(`[name="${name}"]`)?.value||"";
      if(!value("bank_account_id")||!value("transaction_date")||!value("description")||!value("amount")){message("יש למלא חשבון, תאריך, תיאור וסכום.","error");return;}
      request("POST",{action:"create_manual_transaction",bank_account_id:value("bank_account_id"),transaction_date:value("transaction_date"),description:value("description"),reference_number:value("reference_number"),amount:Number(value("amount"))}).then(async(result)=>{state.manualDraft=false;await reload();state.selected=result.transaction.bank_transaction_id;render();message("התנועה נוספה ומספרי המערכת הוקצו.","success");}).catch((error)=>message(error.details?.join(" · ")||error.message,"error"));return;
    }
    const select=event.target.closest("[data-select-transaction]"); if(select){select.checked?state.selectedRows.add(select.dataset.selectTransaction):state.selectedRows.delete(select.dataset.selectTransaction);updateSelection();return;}
    const deleteTransaction=event.target.closest("[data-delete-transaction]");if(deleteTransaction){deleteTransactions([deleteTransaction.dataset.deleteTransaction]);return;}
    const toggle=event.target.closest("[data-toggle-split]");if(toggle){const id=toggle.dataset.toggleSplit;state.expanded.has(id)?state.expanded.delete(id):state.expanded.add(id);render();return;}
    const save=event.target.closest("[data-save-transaction]");if(save){saveTransaction(save.dataset.saveTransaction);return;}
    const metadata=event.target.closest("[data-open-metadata]");if(metadata){state.selected=metadata.dataset.openMetadata;renderMetadata();return;}
    const add=event.target.closest("[data-add-split]");if(add){const transaction=state.data.transactions.find((row)=>row.bank_transaction_id===add.dataset.addSplit),visible=[...document.querySelectorAll(`[data-bank-row="${transaction.bank_transaction_id}"][data-allocation-entry]`)],current=visible.length?visible.map(readInlineRow):allocationsFor(transaction.bank_transaction_id).map((row)=>({...row}));current.push({...emptyAllocation(transaction),allocation_amount:""});state.drafts.set(transaction.bank_transaction_id,current);state.expanded.add(transaction.bank_transaction_id);render();autosaveFor(transaction.bank_transaction_id).markDirty();return;}
    const remove=event.target.closest("[data-delete-split]");if(remove){const id=remove.dataset.deleteSplit,current=[...document.querySelectorAll(`[data-bank-row="${id}"][data-allocation-entry]`)].map(readInlineRow);current.splice(Number(remove.dataset.index),1);state.drafts.set(id,current);render();autosaveFor(id).markDirty();}
  });
  $("#bank-new-rows").addEventListener("change",(event)=>{
    const row=event.target.closest("[data-allocation-entry]");if(!row)return;
    if(event.target.name==="department"){
      const daycareField=row.querySelector("[data-daycare-field]"), daycare=row.querySelector('[name="daycare_id"]'), allocationUnit=row.querySelector('[name="allocation_unit_id"]');
      daycareField.hidden=event.target.value!=="DAYCARES";
      if(event.target.value==="DAYCARES"){daycare.value="";allocationUnit.value="";}
      else {
        daycare.value="";
        allocationUnit.value=event.target.value;
      }
    }
    if(event.target.name==="daycare_id"){
      const selected=state.data.daycares.find((item)=>item.daycare_id===event.target.value);
      row.querySelector('[name="allocation_unit_id"]').value=selected?.allocation_unit_id||"";
    }
    refreshTransaction(row.dataset.bankRow);autosaveFor(row.dataset.bankRow).markDirty({immediate:true});
  });
  $("#bank-new-rows").addEventListener("input",(event)=>{const row=event.target.closest("[data-allocation-entry]");if(row){refreshTransaction(row.dataset.bankRow);autosaveFor(row.dataset.bankRow).markDirty();}});
  $("#bank-new-rows").addEventListener("keydown",(event)=>{const row=event.target.closest("[data-bank-row]");if(!row)return;if(event.key==="Enter"&&!event.target.matches("textarea,button")){event.preventDefault();saveTransaction(row.dataset.bankRow);}if(["ArrowDown","ArrowUp"].includes(event.key)&&!event.target.matches("select,input,textarea")){event.preventDefault();const rows=filtered(),index=rows.findIndex((item)=>item.bank_transaction_id===row.dataset.bankRow),next=Math.max(0,Math.min(rows.length-1,index+(event.key==="ArrowDown"?1:-1)));document.querySelector(`[data-bank-row="${rows[next]?.bank_transaction_id}"]`)?.focus({preventScroll:true});}});
  $("#bank-new-details").addEventListener("click",(event)=>{if(event.target.closest("[data-close-metadata]")){state.selected=null;renderMetadata();}});
  document.addEventListener("keydown",(event)=>{if(event.key==="/"&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)){event.preventDefault();$("#bank-new-search").focus();}});
  try {
    await reload();
    render(false);
  } catch(error) { message(error.message,"error"); $("#bank-new-rows").innerHTML='<tr><td colspan="14">הנתונים אינם זמינים.</td></tr>'; }
}
