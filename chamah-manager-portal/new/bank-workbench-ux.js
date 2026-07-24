import { workflowOptions } from "./workflow-configuration.js";
import { parseWorkbook } from "./bank-workbench.js";

const money = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" });
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" })[char]);
const optionLabel = (name, value) => workflowOptions(name).find((item) => item.value === value)?.label || "לא הוגדר";
const options = (name, value, predicate) => `<option value="">בחירה…</option>${workflowOptions(name, predicate).map((item) => `<option value="${item.value}" ${item.value === value ? "selected" : ""}>${esc(item.label)}</option>`).join("")}`;
const isoDay = () => new Date().toISOString().slice(0, 10);

export function bankWorkbenchTemplateV2() {
  return `<section class="bank-new-heading"><div><p class="eyebrow">הנה"ח / קובץ בנקים</p><h1>קובץ בנקים</h1><p>טיפול שוטף בתנועות, שיוכים והכנה להנהלת חשבונות.</p></div><div class="bank-import-actions"><input id="bank-file" type="file" accept=".xlsx,.xls,.csv" hidden><button id="bank-export-open" class="button button-secondary" type="button">ייצוא</button><button id="bank-import" class="button button-primary" type="button">ייבוא קובץ</button><span id="bank-message" role="status"></span></div></section>
  <section class="bank-workflow-cards" id="bank-workflow-cards" aria-label="שלבי טיפול"></section>
  <section class="bank-new-toolbar panel" aria-label="סינון וחיפוש"><div class="bank-search-group"><label class="bank-new-search">⌕ <input id="bank-new-search" type="search" placeholder="חיפוש לפי תיאור, אסמכתא, סכום, הערה או מספר שורה"><kbd>/</kbd></label><button id="bank-clear-search" class="button button-quiet" type="button">ניקוי חיפוש</button></div><label>חשבון<select id="bank-account-filter"><option value="">כל החשבונות</option></select></label><label>חודש<select id="bank-month-filter"><option value="">כל החודשים</option></select></label><label>סטטוס הנה"ח<select id="bank-status-filter"><option value="">כל הסטטוסים</option>${options("accountingStatuses")}</select></label><button id="bank-clear-all" class="button button-quiet" type="button">ניקוי כל הסינונים</button><span id="bank-new-count"></span><div id="bank-filter-chips" class="bank-filter-chips" aria-live="polite"></div></section>
  <section class="bank-sheet-layout"><div class="bank-new-sheet panel"><div class="bank-new-scroll" id="bank-scroll"><table class="bank-workbench-table"><thead><tr><th class="bank-sticky-number"><input id="bank-select-all" type="checkbox" aria-label="בחירת כל התנועות"><span>#</span></th><th class="bank-sticky-status">סטטוס</th><th>תאריך</th><th>תיאור</th><th>אסמכתא</th><th>סכום</th><th>סוג תנועה</th><th>מחלקה</th><th>מעון</th><th>סעיף תקציבי</th><th>חודש הנה"ח</th><th>סטטוס הנה"ח</th><th>הערות</th><th>מסמך</th></tr></thead><tbody id="bank-new-rows"></tbody></table></div><footer><span id="bank-selection-count">לא נבחרו תנועות</span><span>Tab מעבר בין שדות · Enter שמירה · ↑↓ מעבר בין תנועות</span></footer></div>
  <section class="bank-metadata-panel panel" id="bank-new-details" hidden></section></section>
  <dialog id="bank-import-dialog" class="bank-dialog"><form method="dialog"><button class="dialog-close" aria-label="סגירה">×</button></form><div id="bank-import-content"></div></dialog>
  <dialog id="bank-export-dialog" class="bank-dialog bank-export-dialog"><form method="dialog"><button class="dialog-close" aria-label="סגירה">×</button></form><div id="bank-export-content"></div></dialog>`;
}

export async function mountBankWorkbenchV2(request) {
  const state = { data: null, selected: null, selectedRows: new Set(), expanded: new Set(), workflow: "all", query: "", account: "", month: "", status: "", batch: "", drafts: new Map(), saving: new Set() };
  const $ = (selector) => document.querySelector(selector);
  const message = (text, tone = "") => { const node = $("#bank-message"); if (node) { node.textContent = text; node.className = tone; } };
  const transactionNumber = (transaction) => state.data.transactions.findIndex((row) => row.bank_transaction_id === transaction.bank_transaction_id) + 1;
  const accountName = (id) => state.data.accounts.find((row) => row.bank_account_id === id)?.display_name || "לא משויך";
  const allocationsFor = (id) => state.drafts.get(id) || state.data.allocations.filter((row) => row.bank_transaction_id === id);
  const emptyAllocation = (transaction) => ({ bank_transaction_id: transaction.bank_transaction_id, movement_type: "", allocation_unit_id: "", daycare_id: "", budget_category_id: "", budget_month: "", accounting_status: "", notes: "", allocation_amount: "" });
  const inspect = (transaction, rowsOverride) => {
    const rows = rowsOverride || allocationsFor(transaction.bank_transaction_id);
    const total = rows.reduce((sum, row) => sum + (Number(row.allocation_amount) || 0), 0);
    const remaining = Number(transaction.amount) - total;
    const missing = !rows.length || rows.some((row) => !row.movement_type || !row.allocation_unit_id || !row.budget_month || !row.accounting_status || (row.movement_type !== "EXCLUDE" && !row.budget_category_id) || !Number(row.allocation_amount));
    const split = rows.length > 1;
    const balanced = rows.length > 0 && Math.abs(remaining) <= .01;
    const statuses = rows.map((row) => row.accounting_status).filter(Boolean);
    const ready = balanced && !missing && statuses.every((value) => value === "PENDING_SUBMISSION");
    const sent = balanced && !missing && statuses.every((value) => ["SENT_TO_ACCOUNTING","NO_SUPPORTING_DOCUMENT_REQUIRED"].includes(value));
    return { rows, total, remaining, missing, split, balanced, ready, sent, missingDocuments: statuses.includes("MISSING_DOCUMENTS") };
  };
  const missingReason = (rows) => {
    if (!rows.length) return "טרם טופל — אין שורת שיוך";
    const missing = new Set();
    rows.forEach((row) => {
      if (!row.movement_type) missing.add("סוג תנועה");
      if (!row.allocation_unit_id) missing.add("מחלקה");
      if (!row.budget_month) missing.add("חודש הנה״ח");
      if (!row.accounting_status) missing.add("סטטוס הנה״ח");
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
  const workflowDefinitions = [
    ["all","כל התנועות",() => true,"כל הרשומות בתצוגה"],
    ["untreated","טרם טופל",(row) => !inspect(row).rows.length,"ללא שורת שיוך"],
    ["missing","חסר מידע",(row) => inspect(row).missing,"שדות חובה חסרים"],
    ["split","פיצול ממתין",(row) => inspect(row).split && !inspect(row).balanced,"פיצול שעדיין לא מאוזן"],
    ["documents","חסרים מסמכים",(row) => inspect(row).missingDocuments,"ממתין למסמך"],
    ["ready","מוכן להנה״ח",(row) => inspect(row).ready,"מאוזן ומוכן לשליחה"],
    ["sent","הושלם",(row) => inspect(row).sent,"נשלח או לא נדרש מסמך"],
  ];
  const workflowMatches = (transaction, workflow = state.workflow) => workflowDefinitions.find(([id]) => id === workflow)?.[2](transaction) ?? true;
  const searchText = (transaction) => `${transaction.description} ${transaction.reference_number || ""} ${transaction.amount} ${transactionNumber(transaction)} ${allocationsFor(transaction.bank_transaction_id).map((row) => row.notes || "").join(" ")}`.toLowerCase();
  const baseFiltered = () => state.data.transactions.filter((transaction) => {
    const info = inspect(transaction);
    return (!state.query || searchText(transaction).includes(state.query.toLowerCase())) && (!state.account || transaction.bank_account_id === state.account) && (!state.month || transaction.transaction_date?.startsWith(state.month)) && (!state.status || info.rows.some((row) => row.accounting_status === state.status)) && (!state.batch || transaction.import_batch_id === state.batch);
  });
  const filtered = () => baseFiltered().filter((transaction) => workflowMatches(transaction));
  const statusMarkup = (transaction, rowsOverride) => { const status = statusInfo(transaction, rowsOverride); return `<span class="bank-row-status ${status.tone}" title="${esc(status.text)}">${esc(status.text)}</span>`; };
  const allocationInputs = (row) => `<td><select name="movement_type" aria-label="סוג תנועה">${options("movementTypes",row.movement_type)}</select></td><td><select name="allocation_unit_id" aria-label="מחלקה">${options("departments",row.allocation_unit_id)}</select></td><td><select name="daycare_id" aria-label="מעון">${options("daycares",row.daycare_id,(item)=>!row.allocation_unit_id||item.extra===row.allocation_unit_id)}</select></td><td><select name="budget_category_id" aria-label="סעיף תקציבי">${options("budgetCategories",row.budget_category_id)}</select></td><td><select name="budget_month" aria-label="חודש הנה״ח">${options("budgetMonths",row.budget_month?.slice(0,7))}</select></td><td><select name="accounting_status" aria-label="סטטוס הנהלת חשבונות">${options("accountingStatuses",row.accounting_status)}</select></td><td><input name="notes" value="${esc(row.notes || "")}" aria-label="הערות"></td>`;
  const amountSummary = (transaction, info) => `<div class="bank-amount-summary"><strong>${money.format(transaction.amount)}</strong><small>מקורי ${money.format(transaction.amount)}</small><small>מוקצה ${money.format(info.total)}</small><small class="${info.balanced ? "is-balanced" : "is-unbalanced"}">נותר ${money.format(info.remaining)} · ${info.balanced ? "מאוזן" : "לא מאוזן"}</small></div>`;
  const actionButtons = (transaction, isSplit) => `<div class="bank-row-actions">${isSplit ? "" : `<button type="button" data-save-transaction="${transaction.bank_transaction_id}">שמירה</button>`}<button type="button" data-add-split="${transaction.bank_transaction_id}">＋ פיצול</button>${isSplit ? `<button type="button" data-toggle-split="${transaction.bank_transaction_id}" aria-expanded="${state.expanded.has(transaction.bank_transaction_id)}">${state.expanded.has(transaction.bank_transaction_id) ? "צמצום" : "הרחבה"}</button>` : ""}</div>`;
  const rowNumberCell = (transaction, suffix = "") => `<td class="bank-sticky-number">${suffix ? '<span class="bank-tree-branch" aria-hidden="true">└─</span>' : ""}<span class="bank-tree-number">${transactionNumber(transaction)}${suffix}</span>${suffix ? "" : `<input type="checkbox" data-select-transaction="${transaction.bank_transaction_id}" ${state.selectedRows.has(transaction.bank_transaction_id) ? "checked" : ""} aria-label="בחירת תנועה ${transactionNumber(transaction)}">`}</td>`;
  const transactionRows = (transaction) => {
    const storedRows = allocationsFor(transaction.bank_transaction_id);
    const rows = storedRows.length ? storedRows : [emptyAllocation(transaction)];
    const info = inspect(transaction);
    const status = statusInfo(transaction);
    const common = `data-bank-row="${transaction.bank_transaction_id}"`;
    if (info.split) {
      const parent = `<tr class="bank-parent-row bank-row-${status.tone}" ${common} tabindex="0">${rowNumberCell(transaction)}<td class="bank-sticky-status">${statusMarkup(transaction)}${actionButtons(transaction,true)}</td><td>${transaction.transaction_date}</td><td><button class="bank-tree-toggle" type="button" data-toggle-split="${transaction.bank_transaction_id}" aria-expanded="${state.expanded.has(transaction.bank_transaction_id)}">${state.expanded.has(transaction.bank_transaction_id) ? "▾" : "◂"}</button><strong>${esc(transaction.description)}</strong><small>פיצול ל־${rows.length} שורות</small></td><td>${esc(transaction.reference_number || "—")}</td><td>${amountSummary(transaction,info)}</td><td colspan="7" class="bank-parent-allocation-summary">סכום מקורי ${money.format(transaction.amount)} · הוקצה ${money.format(info.total)} · נותר ${money.format(info.remaining)}</td><td class="bank-attachment-cell"><button type="button" data-open-metadata="${transaction.bank_transaction_id}" title="מסמכים ופרטים">📎 <span>${transaction.attachment_count || 0}</span></button></td></tr>`;
      const children = state.expanded.has(transaction.bank_transaction_id) ? rows.map((row,index) => {
        return `<tr class="bank-child-row bank-row-${status.tone}" ${common} data-allocation-entry data-index="${index}">${rowNumberCell(transaction,`.${index+1}`)}<td class="bank-sticky-status">${statusMarkup(transaction)}<div class="bank-row-actions"><button type="button" data-save-transaction="${transaction.bank_transaction_id}">שמירה</button>${index ? `<button type="button" data-delete-split="${transaction.bank_transaction_id}" data-index="${index}">מחיקה</button>` : ""}</div></td><td>${transaction.transaction_date}</td><td class="bank-child-description">↳ הקצאה ${index+1} מתוך ${rows.length}</td><td>${esc(transaction.reference_number || "—")}</td><td><input name="allocation_amount" type="number" step=".01" value="${esc(row.allocation_amount ?? "")}" aria-label="סכום הקצאה"></td>${allocationInputs(row)}<td class="bank-child-attachment" aria-label="מסמך שייך לתנועת האב"></td></tr>`;
      }).join("") : "";
      return parent + children;
    }
    const row = rows[0];
    return `<tr class="bank-parent-row bank-row-${status.tone}" ${common} data-allocation-entry data-index="0" tabindex="0">${rowNumberCell(transaction)}<td class="bank-sticky-status">${statusMarkup(transaction)}${actionButtons(transaction,false)}</td><td>${transaction.transaction_date}</td><td><strong>${esc(transaction.description)}</strong></td><td>${esc(transaction.reference_number || "—")}</td><td class="${transaction.amount < 0 ? "bank-debit" : "bank-credit"}"><input name="allocation_amount" type="number" step=".01" value="${esc(row.allocation_amount ?? "")}" aria-label="סכום הקצאה"><small>מקורי ${money.format(transaction.amount)}</small></td>${allocationInputs(row)}<td class="bank-attachment-cell"><button type="button" data-open-metadata="${transaction.bank_transaction_id}" title="מסמכים ופרטים">📎 <span>${transaction.attachment_count || 0}</span></button></td></tr>`;
  };
  const captureScroll = () => ({ top: $("#bank-scroll")?.scrollTop || 0, left: $("#bank-scroll")?.scrollLeft || 0 });
  const restoreScroll = ({ top, left }) => requestAnimationFrame(() => { if ($("#bank-scroll")) { $("#bank-scroll").scrollTop = top; $("#bank-scroll").scrollLeft = left; } });
  const updateSelection = () => {
    const count = state.selectedRows.size; $("#bank-selection-count").textContent = count ? `${count} תנועות נבחרו · פעולות מרובות יתווספו בהמשך` : "לא נבחרו תנועות";
    const visible = filtered(); $("#bank-select-all").checked = visible.length > 0 && visible.every((row) => state.selectedRows.has(row.bank_transaction_id));
    $("#bank-select-all").indeterminate = visible.some((row) => state.selectedRows.has(row.bank_transaction_id)) && !$("#bank-select-all").checked;
  };
  const renderWorkflowCards = () => {
    const source = baseFiltered();
    $("#bank-workflow-cards").innerHTML = workflowDefinitions.map(([id,title,predicate,description]) => `<button type="button" data-workflow="${id}" class="${state.workflow===id?"active":""}" aria-pressed="${state.workflow===id}"><span>${title}</span><strong>${source.filter(predicate).length}</strong><small>${description}</small></button>`).join("");
  };
  const renderFilterChips = () => {
    const chips = [];
    if (state.query) chips.push(["query",`חיפוש: ${state.query}`]);
    if (state.account) chips.push(["account",`חשבון: ${accountName(state.account)}`]);
    if (state.month) chips.push(["month",`חודש: ${state.month}`]);
    if (state.status) chips.push(["status",`סטטוס: ${optionLabel("accountingStatuses",state.status)}`]);
    if (state.workflow !== "all") chips.push(["workflow",`תהליך: ${workflowDefinitions.find(([id])=>id===state.workflow)?.[1]}`]);
    if (state.batch) chips.push(["batch","אצוות הייבוא האחרונה"]);
    $("#bank-filter-chips").innerHTML = chips.map(([key,text])=>`<button type="button" data-clear-filter="${key}" title="הסרת סינון">${esc(text)} ×</button>`).join("");
  };
  const renderMetadata = () => {
    const transaction = state.data.transactions.find((row) => row.bank_transaction_id === state.selected), root=$("#bank-new-details");
    if (!transaction) { root.hidden=true; return; }
    const batch=state.data.batches.find((row)=>row.import_batch_id===transaction.import_batch_id); root.hidden=false;
    root.innerHTML=`<header><div><p class="eyebrow">מידע על תנועת המקור</p><h2>${esc(transaction.description)}</h2></div><button type="button" data-close-metadata aria-label="סגירה">×</button></header><div class="bank-metadata-grid"><dl><div><dt>חשבון</dt><dd>${esc(accountName(transaction.bank_account_id))}</dd></div><div><dt>תאריך תנועה</dt><dd>${transaction.transaction_date}</dd></div><div><dt>אסמכתא</dt><dd>${esc(transaction.reference_number||"—")}</dd></div><div><dt>סכום מקור</dt><dd>${money.format(transaction.amount)}</dd></div></dl><section><h3>פרטי ייבוא וביקורת</h3><p>קובץ: ${esc(batch?.source_file_name||"לא זמין")}</p><p>אצווה: ${esc(transaction.import_batch_id||"—")}</p><p>נקלט: ${esc(transaction.created_at||batch?.started_at||"—")}</p></section><section><h3>מסמכים</h3><div class="attachment-placeholder"><button type="button" disabled title="העלאה תתווסף ב-TRACK015A">📎</button><span>מסמכים: ${transaction.attachment_count||0}</span></div><small>שמירת קבצים תתווסף ב־TRACK015A.</small></section></div>`;
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
  const saveTransaction = async (transactionId) => {
    const scroll=captureScroll(), rows=[...document.querySelectorAll(`[data-bank-row="${transactionId}"][data-allocation-entry]`)].map(readInlineRow);
    if (state.saving.has(transactionId)) return; state.saving.add(transactionId); message("שומר…");
    try {
      const result=await request("POST",{action:"save_allocations",bank_transaction_id:transactionId,allocations:rows});
      state.data.allocations=state.data.allocations.filter((row)=>row.bank_transaction_id!==transactionId).concat(result.allocations||[]);
      state.drafts.delete(transactionId); render(false); restoreScroll(scroll); message("השורה נשמרה.","success");
    } catch(error) { message(error.details?.join(" · ")||error.message,"error"); refreshTransaction(transactionId); } finally { state.saving.delete(transactionId); }
  };
  const render = (preserve = true) => {
    const scroll=preserve?captureScroll():null, rows=filtered(); renderWorkflowCards(); renderFilterChips(); $("#bank-new-count").textContent=`${rows.length} תנועות`;
    $("#bank-new-rows").innerHTML=rows.map(transactionRows).join("")||'<tr><td colspan="14"><div class="admin-state admin-empty"><strong>אין תנועות בנק להצגה</strong><p>שנו את הסינון או ייבאו קובץ חדש.</p></div></td></tr>';
    updateSelection(); renderMetadata(); if(scroll)restoreScroll(scroll);
  };
  const reload = async () => { state.data=await request("GET"); state.drafts.clear(); state.data.transactions.forEach((row)=>{if(allocationsFor(row.bank_transaction_id).length>1)state.expanded.add(row.bank_transaction_id);}); render(false); };
  const exportColumns = ["#","סטטוס","תאריך","תיאור","אסמכתא","סכום","סוג תנועה","מחלקה","מעון","סעיף תקציבי","חודש הנה״ח","סטטוס הנה״ח","הערות","מסמכים"];
  const exportRowsFor = (transactions, exactView = false) => transactions.flatMap((transaction) => {
    const rows=allocationsFor(transaction.bank_transaction_id), info=inspect(transaction), base=[transactionNumber(transaction),statusInfo(transaction).text,transaction.transaction_date,transaction.description,transaction.reference_number||"",Number(transaction.amount)];
    const parent=[...base,"","","","","","","",transaction.attachment_count||0];
    if (info.split) {
      const children=rows.map((row,index)=>[`${transactionNumber(transaction)}.${index+1}`,statusInfo(transaction,[row]).text,transaction.transaction_date,`הקצאה ${index+1}: ${transaction.description}`,transaction.reference_number||"",Number(row.allocation_amount)||0,optionLabel("movementTypes",row.movement_type),optionLabel("departments",row.allocation_unit_id),optionLabel("daycares",row.daycare_id),optionLabel("budgetCategories",row.budget_category_id),row.budget_month||"",optionLabel("accountingStatuses",row.accounting_status),row.notes||"",""]);
      return exactView && !state.expanded.has(transaction.bank_transaction_id) ? [parent] : [parent,...children];
    }
    const row=rows[0]||{}; return [[...base,optionLabel("movementTypes",row.movement_type),optionLabel("departments",row.allocation_unit_id),optionLabel("daycares",row.daycare_id),optionLabel("budgetCategories",row.budget_category_id),row.budget_month||"",optionLabel("accountingStatuses",row.accounting_status),row.notes||"",transaction.attachment_count||0]];
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
    return (!filters.accountingMonth||rows.some((row)=>row.budget_month?.startsWith(filters.accountingMonth)))&&(!filters.calendarMonth||date.slice(5,7)===filters.calendarMonth)&&(!filters.year||date.startsWith(filters.year))&&(!filters.account||transaction.bank_account_id===filters.account)&&(!filters.daycare||rows.some((row)=>row.daycare_id===filters.daycare))&&(!filters.department||rows.some((row)=>row.allocation_unit_id===filters.department))&&(!filters.category||rows.some((row)=>row.budget_category_id===filters.category))&&(!filters.accountingStatus||rows.some((row)=>row.accounting_status===filters.accountingStatus))&&(!filters.workflow||workflowMatches(transaction,filters.workflow));
  });
  const exportFilters = (root) => Object.fromEntries([...root.querySelectorAll("[data-export-filter]")].map((input)=>[input.dataset.exportFilter,input.value]));
  const renderExportDialog = () => {
    const root=$("#bank-export-content"), months=[...new Set(state.data.transactions.map((row)=>row.transaction_date?.slice(5,7)).filter(Boolean))].sort(), years=[...new Set(state.data.transactions.map((row)=>row.transaction_date?.slice(0,4)).filter(Boolean))].sort().reverse();
    root.innerHTML=`<h2>ייצוא תנועות בנק</h2><fieldset class="bank-export-scope"><legend>מה לייצא?</legend><label><input type="radio" name="export_scope" value="view" checked> התצוגה הנוכחית — בדיוק השורות המוצגות</label><label><input type="radio" name="export_scope" value="selection"> ייצוא לפי בחירה וסינונים</label></fieldset><div id="bank-export-filters" hidden><label>חודש הנה״ח<select data-export-filter="accountingMonth">${options("budgetMonths")}</select></label><label>חודש קלנדרי<select data-export-filter="calendarMonth"><option value="">הכול</option>${months.map((value)=>`<option value="${value}">${value}</option>`).join("")}</select></label><label>שנה<select data-export-filter="year"><option value="">הכול</option>${years.map((value)=>`<option>${value}</option>`).join("")}</select></label><label>חשבון בנק<select data-export-filter="account"><option value="">הכול</option>${state.data.accounts.map((row)=>`<option value="${row.bank_account_id}">${esc(row.display_name)}</option>`).join("")}</select></label><label>מעון<select data-export-filter="daycare">${options("daycares")}</select></label><label>מחלקה<select data-export-filter="department">${options("departments")}</select></label><label>סעיף תקציבי<select data-export-filter="category">${options("budgetCategories")}</select></label><label>סטטוס הנה״ח<select data-export-filter="accountingStatus">${options("accountingStatuses")}</select></label><label>סטטוס תהליך<select data-export-filter="workflow"><option value="">הכול</option>${workflowDefinitions.slice(1).map(([id,title])=>`<option value="${id}">${title}</option>`).join("")}</select></label></div><p class="bank-export-count"><strong id="bank-export-count">${filtered().length}</strong> תנועות תואמות</p><fieldset><legend>פורמט</legend><label><input type="radio" name="export_format" value="xlsx" checked> Excel (.xlsx)</label><label><input type="radio" name="export_format" value="pdf"> PDF</label></fieldset><div class="dialog-actions"><button id="bank-export-confirm" class="button button-primary" type="button">ייצוא</button><button class="button button-secondary" type="button" data-close-export>ביטול</button></div>`;
    const updateCount=()=>{const selection=root.querySelector('[name="export_scope"]:checked').value==="selection";root.querySelector("#bank-export-filters").hidden=!selection;$("#bank-export-count").textContent=selection?selectionMatches(exportFilters(root)).length:filtered().length;};
    root.addEventListener("change",updateCount); root.querySelector("[data-close-export]").addEventListener("click",()=>$("#bank-export-dialog").close());
    root.querySelector("#bank-export-confirm").addEventListener("click",async()=>{try{const selection=root.querySelector('[name="export_scope"]:checked').value==="selection", transactions=selection?selectionMatches(exportFilters(root)):filtered(), rows=exportRowsFor(transactions,!selection), format=root.querySelector('[name="export_format"]:checked').value;if(format==="xlsx")await downloadExcel(rows);else exportPdf(rows);$("#bank-export-dialog").close();message(`יוצאו ${transactions.length} תנועות.`,"success");}catch(error){message(error.message,"error");}});
  };
  const openPreview = (parsed, preview) => {
    const dialog=$("#bank-import-dialog"),root=$("#bank-import-content");
    root.innerHTML=`<h2>תצוגה מקדימה לפני ייבוא</h2><p><b>קובץ:</b> ${esc(parsed.fileName)} · <b>חשבון:</b> ${esc(preview.account.display_name)} (${esc(preview.account_number)})</p><div class="import-summary"><span>חדשות <b>${preview.summary.importable}</b></span><span>כפילויות <b>${preview.summary.duplicates}</b></span><span>שגיאות <b>${preview.summary.invalid}</b></span></div><div class="import-preview-scroll"><table><thead><tr><th>שורה</th><th>תאריך</th><th>תיאור</th><th>אסמכתא</th><th>סכום</th><th>מצב</th></tr></thead><tbody>${preview.rows.map((row)=>`<tr class="${row.importable?"":"import-skip"}"><td>${row.source_row_number}</td><td>${row.transaction_date||"—"}</td><td>${esc(row.description)}</td><td>${esc(row.reference_number||"—")}</td><td>${Number.isFinite(row.amount)?money.format(row.amount):"—"}</td><td>${row.duplicate?"כפילות":row.errors.length?esc(row.errors.join(", ")):"מוכן"}</td></tr>`).join("")}</tbody></table></div><div class="dialog-actions"><button id="confirm-bank-import" class="button button-primary" ${preview.summary.importable?"":"disabled"}>אישור וייבוא ${preview.summary.importable} תנועות</button><button class="button button-secondary" onclick="this.closest('dialog').close()">ביטול</button></div>`;
    dialog.showModal();
    $("#confirm-bank-import")?.addEventListener("click",async()=>{try{const result=await request("POST",{action:"confirm_import",preview_token:preview.preview_token,account_id:preview.account.bank_account_id,account_number:preview.account_number,file_name:parsed.fileName,total_rows:preview.summary.total,duplicate_rows:preview.summary.duplicates,invalid_rows:preview.summary.invalid,rows:preview.rows});dialog.close();state.batch=result.batch_id;await reload();state.selected=result.transactions[0]?.bank_transaction_id||null;render();message(`יובאו ${result.imported} תנועות. האצווה נפתחה.`,"success");}catch(error){message(error.message,"error");}});
  };
  const clearFilter = (key) => {
    if(key==="query"){$("#bank-new-search").value="";state.query="";} else if(key==="workflow")state.workflow="all"; else if(key==="batch")state.batch=""; else {state[key]="";$(`#bank-${key}-filter`).value="";} render();
  };
  $("#bank-import").addEventListener("click",()=>$("#bank-file").click());
  $("#bank-file").addEventListener("change",async(event)=>{const file=event.target.files[0];if(!file)return;try{message("קורא את הקובץ…");const parsed=await parseWorkbook(file,await file.arrayBuffer(),state.data.accounts);const preview=await request("POST",{action:"preview",account_number:parsed.accountNumber,rows:parsed.rows});openPreview(parsed,preview);message("");}catch(error){message(error.message,"error");}finally{event.target.value="";}});
  $("#bank-export-open").addEventListener("click",()=>{renderExportDialog();$("#bank-export-dialog").showModal();});
  $("#bank-workflow-cards").addEventListener("click",(event)=>{const card=event.target.closest("[data-workflow]");if(card){state.workflow=card.dataset.workflow;render();}});
  $("#bank-new-search").addEventListener("input",(event)=>{state.query=event.target.value;render();});
  $("#bank-clear-search").addEventListener("click",()=>clearFilter("query"));
  ["account","month","status"].forEach((name)=>$(`#bank-${name}-filter`).addEventListener("change",(event)=>{state[name]=event.target.value;render();}));
  $("#bank-clear-all").addEventListener("click",()=>{state.query=state.account=state.month=state.status=state.batch="";state.workflow="all";$("#bank-new-search").value="";["account","month","status"].forEach((name)=>$(`#bank-${name}-filter`).value="");render();});
  $("#bank-filter-chips").addEventListener("click",(event)=>{const chip=event.target.closest("[data-clear-filter]");if(chip)clearFilter(chip.dataset.clearFilter);});
  $("#bank-select-all").addEventListener("change",(event)=>{filtered().forEach((row)=>event.target.checked?state.selectedRows.add(row.bank_transaction_id):state.selectedRows.delete(row.bank_transaction_id));render();});
  $("#bank-new-rows").addEventListener("click",(event)=>{
    const select=event.target.closest("[data-select-transaction]"); if(select){select.checked?state.selectedRows.add(select.dataset.selectTransaction):state.selectedRows.delete(select.dataset.selectTransaction);updateSelection();return;}
    const toggle=event.target.closest("[data-toggle-split]");if(toggle){const id=toggle.dataset.toggleSplit;state.expanded.has(id)?state.expanded.delete(id):state.expanded.add(id);render();return;}
    const save=event.target.closest("[data-save-transaction]");if(save){saveTransaction(save.dataset.saveTransaction);return;}
    const metadata=event.target.closest("[data-open-metadata]");if(metadata){state.selected=metadata.dataset.openMetadata;renderMetadata();return;}
    const add=event.target.closest("[data-add-split]");if(add){const transaction=state.data.transactions.find((row)=>row.bank_transaction_id===add.dataset.addSplit),visible=[...document.querySelectorAll(`[data-bank-row="${transaction.bank_transaction_id}"][data-allocation-entry]`)],current=visible.length?visible.map(readInlineRow):allocationsFor(transaction.bank_transaction_id).map((row)=>({...row}));current.push(emptyAllocation(transaction));state.drafts.set(transaction.bank_transaction_id,current);state.expanded.add(transaction.bank_transaction_id);render();return;}
    const remove=event.target.closest("[data-delete-split]");if(remove){const id=remove.dataset.deleteSplit,current=[...document.querySelectorAll(`[data-bank-row="${id}"][data-allocation-entry]`)].map(readInlineRow);current.splice(Number(remove.dataset.index),1);state.drafts.set(id,current);render();}
  });
  $("#bank-new-rows").addEventListener("change",(event)=>{const row=event.target.closest("[data-allocation-entry]");if(!row)return;if(event.target.name==="allocation_unit_id"){row.querySelector('[name="daycare_id"]').innerHTML=options("daycares","",(item)=>item.extra===event.target.value);}refreshTransaction(row.dataset.bankRow);});
  $("#bank-new-rows").addEventListener("input",(event)=>{const row=event.target.closest("[data-allocation-entry]");if(row)refreshTransaction(row.dataset.bankRow);});
  $("#bank-new-rows").addEventListener("keydown",(event)=>{const row=event.target.closest("[data-bank-row]");if(!row)return;if(event.key==="Enter"&&!event.target.matches("textarea,button")){event.preventDefault();saveTransaction(row.dataset.bankRow);}if(["ArrowDown","ArrowUp"].includes(event.key)&&!event.target.matches("select,input,textarea")){event.preventDefault();const rows=filtered(),index=rows.findIndex((item)=>item.bank_transaction_id===row.dataset.bankRow),next=Math.max(0,Math.min(rows.length-1,index+(event.key==="ArrowDown"?1:-1)));document.querySelector(`[data-bank-row="${rows[next]?.bank_transaction_id}"]`)?.focus({preventScroll:true});}});
  $("#bank-new-details").addEventListener("click",(event)=>{if(event.target.closest("[data-close-metadata]")){state.selected=null;renderMetadata();}});
  document.addEventListener("keydown",(event)=>{if(event.key==="/"&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)){event.preventDefault();$("#bank-new-search").focus();}});
  try {
    await reload();
    $("#bank-account-filter").innerHTML='<option value="">כל החשבונות</option>'+state.data.accounts.map((row)=>`<option value="${row.bank_account_id}">${esc(row.display_name)}</option>`).join("");
    $("#bank-month-filter").innerHTML='<option value="">כל החודשים</option>'+[...new Set(state.data.transactions.map((row)=>row.transaction_date?.slice(0,7)).filter(Boolean))].sort().reverse().map((value)=>`<option value="${value}">${value}</option>`).join("");
    render(false);
  } catch(error) { message(error.message,"error"); $("#bank-new-rows").innerHTML='<tr><td colspan="14">הנתונים אינם זמינים.</td></tr>'; }
}
