import { workflowOptions } from "./workflow-configuration.js";

const money = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" });
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" })[char]);
const label = (name, value) => workflowOptions(name).find((item) => item.value === value)?.label || "לא הוגדר";
const options = (name, value, predicate) => `<option value="">בחירה…</option>${workflowOptions(name, predicate).map((item) => `<option value="${item.value}" ${item.value === value ? "selected" : ""}>${esc(item.label)}</option>`).join("")}`;
const isoDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") return new Date(Date.UTC(1899, 11, 30 + value)).toISOString().slice(0, 10);
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (match) return `${match[3].length === 2 ? `20${match[3]}` : match[3]}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
};
const amount = (value) => {
  const text = String(value ?? "").replace(/[₪,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  return Number(text);
};
const aliases = {
  transaction_date: ["תאריך","תאריך תנועה","transaction date","date"],
  description: ["תיאור","תיאור תנועה","פרטים","description"],
  reference_number: ["אסמכתא","מספר אסמכתא","reference","reference number"],
  amount: ["סכום","סכום בשח","סכום חתום","amount","signed amount"],
  account: ["חשבון","מספר חשבון","account","account number"],
};
const key = (value) => String(value ?? "").trim().toLowerCase().replace(/[\"'׳״:._-]/g,"").replace(/\s+/g," ");
const findColumn = (headers, name) => headers.findIndex((header) => aliases[name].some((alias) => key(header) === key(alias)));

function parseCsv(data) {
  const text = new TextDecoder("utf-8").decode(data).replace(/^\uFEFF/, "");
  const rows = []; let row = []; let cell = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); if (row.some((value) => value !== "")) rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  row.push(cell); if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

async function parseWorkbook(file, data, knownAccounts = []) {
  let matrix;
  if (file.name.toLowerCase().endsWith(".csv")) matrix = parseCsv(data);
  else {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data);
    const sheet = workbook.worksheets[0];
    matrix = sheet.getRows(1, sheet.rowCount)?.map((row) => row.values.slice(1).map((value) => value?.result ?? value?.text ?? value ?? "")) || [];
  }
  let headerIndex = matrix.findIndex((row) => findColumn(row, "transaction_date") >= 0 && findColumn(row, "amount") >= 0);
  if (headerIndex < 0) throw new Error("לא נמצאו עמודות תאריך וסכום חתום.");
  const headers = matrix[headerIndex];
  const indexes = Object.fromEntries(Object.keys(aliases).map((name) => [name, findColumn(headers, name)]));
  if (indexes.description < 0) throw new Error("לא נמצאה עמודת תיאור.");
  const accountCandidates = matrix.slice(0, headerIndex + 5).flat().map((cell) => String(cell).replace(/\D/g, "")).filter((cell) => cell.length >= 5);
  const rows = matrix.slice(headerIndex + 1).map((row, index) => ({
    source_row_number: headerIndex + index + 2,
    transaction_date: isoDate(row[indexes.transaction_date]),
    description: row[indexes.description],
    reference_number: indexes.reference_number >= 0 ? row[indexes.reference_number] : "",
    amount: amount(row[indexes.amount]),
    account_number: indexes.account >= 0 ? String(row[indexes.account]).replace(/\D/g, "") : "",
  })).filter((row) => row.transaction_date || row.description || Number.isFinite(row.amount));
  const knownNumbers = new Set(knownAccounts.map((row) => String(row.source_account_number || "").replace(/\D/g, "")).filter(Boolean));
  const accountNumber = [...rows.map((row) => row.account_number), ...accountCandidates].find((candidate) => knownNumbers.has(candidate)) || "";
  return { fileName: file.name, accountNumber, rows };
}

export function bankWorkbenchTemplate() {
  return `<section class="bank-new-heading"><div><p class="eyebrow">הנה״ח / קובץ בנקים</p><h1>קובץ בנקים</h1><p>טיפול שוטף בתנועות, שיוכים והכנה להנהלת חשבונות.</p></div><div class="bank-import-actions"><input id="bank-file" type="file" accept=".xlsx,.xls,.csv" hidden><button id="bank-import" class="button button-primary" type="button">ייבוא קובץ</button><span id="bank-message" role="status"></span></div></section>
  <section class="bank-workflow-cards" id="bank-workflow-cards" aria-label="שלבי טיפול"></section>
  <section class="bank-new-toolbar panel" aria-label="סינון וחיפוש"><label class="bank-new-search">⌕ <input id="bank-new-search" type="search" placeholder="חיפוש תיאור או אסמכתא…"><kbd>/</kbd></label><label>חשבון<select id="bank-account-filter"><option value="">כל החשבונות</option></select></label><label>חודש<select id="bank-month-filter"><option value="">כל החודשים</option></select></label><label>סטטוס<select id="bank-status-filter"><option value="">כל הסטטוסים</option>${options("accountingStatuses")}</select></label><button id="bank-clear" class="button button-quiet" type="button">ניקוי</button><span id="bank-new-count"></span></section>
  <section class="bank-sheet-layout"><div class="bank-new-sheet panel"><div class="bank-new-scroll" id="bank-scroll"><table class="bank-workbench-table"><thead><tr><th class="bank-sticky-select"><input id="bank-select-all" type="checkbox" aria-label="בחירת כל התנועות"></th><th class="bank-sticky-date">תאריך</th><th class="bank-sticky-description">תיאור תנועה</th><th>אסמכתא</th><th>חשבון</th><th>סכום אב</th><th>סוג תנועה</th><th>מחלקה</th><th>מעון</th><th>סעיף תקציבי</th><th>חודש תקציב</th><th>סטטוס הנה״ח</th><th>הערות</th><th>סכום הקצאה</th><th>מצב</th><th>פעולות</th></tr></thead><tbody id="bank-new-rows"></tbody></table></div><footer><span id="bank-selection-count">לא נבחרו תנועות</span><span>Tab מעבר בין שדות · Enter שמירה · ↑↓ מעבר בין תנועות</span></footer></div>
  <section class="bank-metadata-panel panel" id="bank-new-details" hidden></section></section>
  <dialog id="bank-import-dialog" class="bank-dialog"><form method="dialog"><button class="dialog-close" aria-label="סגירה">×</button></form><div id="bank-import-content"></div></dialog>`;
}

export async function mountBankWorkbench(request) {
  const state = { data: null, selected: null, selectedRows: new Set(), workflow: "all", query: "", account: "", month: "", status: "", batch: "", drafts: new Map(), saving: new Set() };
  const $ = (selector) => document.querySelector(selector);
  const message = (text, tone = "") => { const node = $("#bank-message"); if (node) { node.textContent = text; node.className = tone; } };
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
  const workflowDefinitions = [
    ["all","כל התנועות",() => true,"כל הרשומות בתצוגה"],
    ["untreated","טרם טופל",(row) => !inspect(row).rows.length,"ללא שורת שיוך"],
    ["missing","חסר מידע",(row) => inspect(row).missing,"שדות חובה חסרים"],
    ["split","פיצול ממתין",(row) => inspect(row).split && !inspect(row).balanced,"פיצול שעדיין לא מאוזן"],
    ["documents","חסרים מסמכים",(row) => inspect(row).missingDocuments,"ממתין למסמך"],
    ["ready","מוכן להנה״ח",(row) => inspect(row).ready,"מאוזן ומוכן לשליחה"],
    ["sent","הושלם",(row) => inspect(row).sent,"נשלח או לא נדרש מסמך"],
  ];
  const workflowMatches = (transaction) => workflowDefinitions.find(([id]) => id === state.workflow)?.[2](transaction) ?? true;
  const baseFiltered = () => state.data.transactions.filter((transaction) => {
    const info = inspect(transaction); const search = `${transaction.description} ${transaction.reference_number || ""} ${transaction.amount}`.toLowerCase();
    return (!state.query || search.includes(state.query.toLowerCase())) && (!state.account || transaction.bank_account_id === state.account) && (!state.month || transaction.transaction_date?.startsWith(state.month)) && (!state.status || info.rows.some((row) => row.accounting_status === state.status)) && (!state.batch || transaction.import_batch_id === state.batch);
  });
  const filtered = () => baseFiltered().filter(workflowMatches);
  const statusMarkup = (info) => {
    if (info.sent) return '<span class="bank-row-status complete">הושלם</span>';
    if (info.ready) return '<span class="bank-row-status ready">מוכן להנה״ח</span>';
    if (info.missingDocuments) return '<span class="bank-row-status documents">חסר מסמך</span>';
    if (info.split && !info.balanced) return `<span class="bank-row-status partial">פיצול · יתרה ${money.format(info.remaining)}</span>`;
    if (info.missing) return '<span class="bank-row-status missing">חסר מידע</span>';
    return `<span class="bank-row-status balanced">${info.balanced ? "מאוזן" : "דורש טיפול"}</span>`;
  };
  const allocationCells = (row, transactionId, index) => `<td><select name="movement_type" aria-label="סוג תנועה">${options("movementTypes",row.movement_type)}</select></td><td><select name="allocation_unit_id" aria-label="מחלקה">${options("departments",row.allocation_unit_id)}</select></td><td><select name="daycare_id" aria-label="מעון">${options("daycares",row.daycare_id,(item)=>!row.allocation_unit_id||item.extra===row.allocation_unit_id)}</select></td><td><select name="budget_category_id" aria-label="סעיף תקציבי">${options("budgetCategories",row.budget_category_id)}</select></td><td><select name="budget_month" aria-label="חודש תקציב">${options("budgetMonths",row.budget_month?.slice(0,7))}</select></td><td><select name="accounting_status" aria-label="סטטוס הנהלת חשבונות">${options("accountingStatuses",row.accounting_status)}</select></td><td><input name="notes" value="${esc(row.notes || "")}" aria-label="הערות"></td><td><input name="allocation_amount" type="number" step=".01" value="${esc(row.allocation_amount ?? "")}" aria-label="סכום הקצאה"></td><td class="bank-inline-status" data-inline-status></td><td class="bank-row-actions"><button type="button" data-save-transaction="${transactionId}" title="שמירה">שמירה</button><button type="button" data-add-split="${transactionId}" title="הוספת פיצול">＋ פיצול</button>${index ? `<button type="button" data-delete-split="${transactionId}" data-index="${index}" title="מחיקת שורת פיצול">מחיקה</button>` : ""}<button type="button" data-open-metadata="${transactionId}">פרטים</button></td>`;
  const transactionRows = (transaction) => {
    const savedRows = allocationsFor(transaction.bank_transaction_id);
    const rows = savedRows.length ? savedRows : [emptyAllocation(transaction)];
    const info = inspect(transaction); const rowspan = rows.length;
    return rows.map((row, index) => `<tr class="bank-allocation-line ${index ? "bank-split-line" : ""}" data-bank-row="${transaction.bank_transaction_id}" data-allocation-entry data-index="${index}" tabindex="${index ? "-1" : "0"}">${index ? "" : `<td class="bank-sticky-select" rowspan="${rowspan}"><input type="checkbox" data-select-transaction="${transaction.bank_transaction_id}" ${state.selectedRows.has(transaction.bank_transaction_id) ? "checked" : ""} aria-label="בחירת תנועה"></td><td class="bank-sticky-date" rowspan="${rowspan}">${transaction.transaction_date}</td><td class="bank-sticky-description" rowspan="${rowspan}"><strong>${esc(transaction.description)}</strong>${rows.length > 1 ? `<small>פיצול ל־${rows.length} שורות</small>` : ""}</td><td rowspan="${rowspan}">${esc(transaction.reference_number || "—")}</td><td rowspan="${rowspan}">${esc(accountName(transaction.bank_account_id))}</td><td rowspan="${rowspan}" class="${transaction.amount < 0 ? "bank-debit" : "bank-credit"}">${money.format(transaction.amount)}</td>`}${allocationCells(row,transaction.bank_transaction_id,index)}</tr>`).join("");
  };
  const updateSelection = () => {
    const count = state.selectedRows.size; $("#bank-selection-count").textContent = count ? `${count} תנועות נבחרו · פעולות מרובות יתווספו בהמשך` : "לא נבחרו תנועות";
    const visible = filtered(); $("#bank-select-all").checked = visible.length > 0 && visible.every((row) => state.selectedRows.has(row.bank_transaction_id));
    $("#bank-select-all").indeterminate = visible.some((row) => state.selectedRows.has(row.bank_transaction_id)) && !$("#bank-select-all").checked;
  };
  const renderWorkflowCards = () => {
    const source = baseFiltered();
    $("#bank-workflow-cards").innerHTML = workflowDefinitions.map(([id,title,predicate,description]) => { const count=source.filter(predicate).length; return `<button type="button" data-workflow="${id}" class="${state.workflow===id?"active":""}" aria-pressed="${state.workflow===id}"><span>${title}</span><strong>${count}</strong><small>${description}</small></button>`; }).join("");
  };
  const renderMetadata = () => {
    const transaction = state.data.transactions.find((row) => row.bank_transaction_id === state.selected); const root=$("#bank-new-details");
    if (!transaction) { root.hidden=true; return; }
    root.hidden=false; const batch=state.data.batches.find((row)=>row.import_batch_id===transaction.import_batch_id);
    root.innerHTML=`<header><div><p class="eyebrow">מידע על תנועת המקור</p><h2>${esc(transaction.description)}</h2></div><button type="button" data-close-metadata aria-label="סגירה">×</button></header><div class="bank-metadata-grid"><dl><div><dt>חשבון</dt><dd>${esc(accountName(transaction.bank_account_id))}</dd></div><div><dt>תאריך תנועה</dt><dd>${transaction.transaction_date}</dd></div><div><dt>אסמכתא</dt><dd>${esc(transaction.reference_number||"—")}</dd></div><div><dt>סכום מקור</dt><dd>${money.format(transaction.amount)}</dd></div></dl><section><h3>פרטי ייבוא וביקורת</h3><p>קובץ: ${esc(batch?.source_file_name||"לא זמין")}</p><p>אצווה: ${esc(transaction.import_batch_id||"—")}</p><p>נקלט: ${esc(transaction.created_at||batch?.started_at||"—")}</p></section><section><h3>מסמכים</h3><div class="attachment-placeholder"><button type="button" disabled title="העלאה תתווסף ב-TRACK015A">📎</button><span>מסמכים: ${transaction.attachment_count||0}</span></div><small>שמירת קבצים תתווסף ב־TRACK015A.</small></section></div>`;
  };
  const refreshInlineStatuses = (transactionId, persist = true) => {
    const transaction=state.data.transactions.find((row)=>row.bank_transaction_id===transactionId); if(!transaction)return;
    const rows=[...document.querySelectorAll(`[data-bank-row="${transactionId}"][data-allocation-entry]`)];
    const values=rows.map(readInlineRow); if(persist)state.drafts.set(transactionId,values); const info=inspect(transaction,values);
    rows.forEach((row,index)=>{row.querySelector("[data-inline-status]").innerHTML=index===0?statusMarkup(info):`<span class="split-index">פיצול ${index+1}</span>`;});
  };
  const readInlineRow = (root) => Object.fromEntries([...root.querySelectorAll("[name]")].map((input)=>[input.name,input.value]));
  const saveTransaction = async (transactionId) => {
    const scroll=$("#bank-scroll").scrollTop; const rows=[...document.querySelectorAll(`[data-bank-row="${transactionId}"][data-allocation-entry]`)].map(readInlineRow);
    if (state.saving.has(transactionId)) return; state.saving.add(transactionId); message("שומר…");
    try {
      const result=await request("POST",{action:"save_allocations",bank_transaction_id:transactionId,allocations:rows});
      state.data.allocations=state.data.allocations.filter((row)=>row.bank_transaction_id!==transactionId).concat(result.allocations||[]);
      state.drafts.delete(transactionId); render(); requestAnimationFrame(()=>{$("#bank-scroll").scrollTop=scroll;}); message("השורה נשמרה.","success");
    } catch(error) { message(error.details?.join(" · ")||error.message,"error"); refreshInlineStatuses(transactionId); } finally { state.saving.delete(transactionId); }
  };
  const render = () => {
    const rows=filtered(); renderWorkflowCards(); $("#bank-new-count").textContent=`${rows.length} תנועות`;
    $("#bank-new-rows").innerHTML=rows.map(transactionRows).join("")||'<tr><td colspan="16"><div class="admin-state admin-empty"><strong>אין תנועות בנק להצגה</strong><p>שנו את הסינון או ייבאו קובץ חדש.</p></div></td></tr>';
    rows.forEach((transaction)=>refreshInlineStatuses(transaction.bank_transaction_id,false)); updateSelection(); renderMetadata();
  };
  const reload = async () => { state.data=await request("GET"); state.drafts.clear(); render(); };
  const openPreview = (parsed, preview) => {
    const dialog=$("#bank-import-dialog"),root=$("#bank-import-content");
    root.innerHTML=`<h2>תצוגה מקדימה לפני ייבוא</h2><p><b>קובץ:</b> ${esc(parsed.fileName)} · <b>חשבון:</b> ${esc(preview.account.display_name)} (${esc(preview.account_number)})</p><div class="import-summary"><span>חדשות <b>${preview.summary.importable}</b></span><span>כפילויות <b>${preview.summary.duplicates}</b></span><span>שגויות <b>${preview.summary.invalid}</b></span></div><div class="import-preview-scroll"><table><thead><tr><th>שורה</th><th>תאריך</th><th>תיאור</th><th>אסמכתא</th><th>סכום</th><th>מצב</th></tr></thead><tbody>${preview.rows.map((row)=>`<tr class="${row.importable?"":"import-skip"}"><td>${row.source_row_number}</td><td>${row.transaction_date||"—"}</td><td>${esc(row.description)}</td><td>${esc(row.reference_number||"—")}</td><td>${Number.isFinite(row.amount)?money.format(row.amount):"—"}</td><td>${row.duplicate?"כפילות":row.errors.length?esc(row.errors.join(", ")):"מוכן"}</td></tr>`).join("")}</tbody></table></div><div class="dialog-actions"><button id="confirm-bank-import" class="button button-primary" ${preview.summary.importable?"":"disabled"}>אישור וייבוא ${preview.summary.importable} תנועות</button><button class="button button-secondary" onclick="this.closest('dialog').close()">ביטול</button></div>`;
    dialog.showModal();
    $("#confirm-bank-import")?.addEventListener("click",async()=>{try{const result=await request("POST",{action:"confirm_import",preview_token:preview.preview_token,account_id:preview.account.bank_account_id,account_number:preview.account_number,file_name:parsed.fileName,total_rows:preview.summary.total,duplicate_rows:preview.summary.duplicates,invalid_rows:preview.summary.invalid,rows:preview.rows});dialog.close();state.batch=result.batch_id;await reload();state.selected=result.transactions[0]?.bank_transaction_id||null;render();message(`יובאו ${result.imported} תנועות. האצווה נפתחה.`,"success");}catch(error){message(error.message,"error");}});
  };
  $("#bank-import").addEventListener("click",()=>$("#bank-file").click());
  $("#bank-file").addEventListener("change",async(event)=>{const file=event.target.files[0];if(!file)return;try{message("קורא את הקובץ…");const parsed=await parseWorkbook(file,await file.arrayBuffer(),state.data.accounts);const preview=await request("POST",{action:"preview",account_number:parsed.accountNumber,rows:parsed.rows});openPreview(parsed,preview);message("");}catch(error){message(error.message,"error");}finally{event.target.value="";}});
  $("#bank-workflow-cards").addEventListener("click",(event)=>{const card=event.target.closest("[data-workflow]");if(card){state.workflow=card.dataset.workflow;render();}});
  $("#bank-new-search").addEventListener("input",(event)=>{state.query=event.target.value;render();});
  ["account","month","status"].forEach((name)=>$(`#bank-${name}-filter`).addEventListener("change",(event)=>{state[name]=event.target.value;render();}));
  $("#bank-clear").addEventListener("click",()=>{state.query=state.account=state.month=state.status=state.batch="";state.workflow="all";$("#bank-new-search").value="";["account","month","status"].forEach((name)=>$(`#bank-${name}-filter`).value="");render();});
  $("#bank-select-all").addEventListener("change",(event)=>{filtered().forEach((row)=>event.target.checked?state.selectedRows.add(row.bank_transaction_id):state.selectedRows.delete(row.bank_transaction_id));render();});
  $("#bank-new-rows").addEventListener("click",(event)=>{
    const select=event.target.closest("[data-select-transaction]"); if(select){select.checked?state.selectedRows.add(select.dataset.selectTransaction):state.selectedRows.delete(select.dataset.selectTransaction);updateSelection();return;}
    const save=event.target.closest("[data-save-transaction]"); if(save){saveTransaction(save.dataset.saveTransaction);return;}
    const metadata=event.target.closest("[data-open-metadata]"); if(metadata){state.selected=metadata.dataset.openMetadata;renderMetadata();return;}
    const add=event.target.closest("[data-add-split]"); if(add){const transaction=state.data.transactions.find((row)=>row.bank_transaction_id===add.dataset.addSplit);const current=[...document.querySelectorAll(`[data-bank-row="${transaction.bank_transaction_id}"][data-allocation-entry]`)].map(readInlineRow);current.push(emptyAllocation(transaction));state.drafts.set(transaction.bank_transaction_id,current);render();return;}
    const remove=event.target.closest("[data-delete-split]");if(remove){const id=remove.dataset.deleteSplit,current=[...document.querySelectorAll(`[data-bank-row="${id}"][data-allocation-entry]`)].map(readInlineRow);current.splice(Number(remove.dataset.index),1);state.drafts.set(id,current);render();}
  });
  $("#bank-new-rows").addEventListener("change",(event)=>{const row=event.target.closest("[data-allocation-entry]");if(!row)return;if(event.target.name==="allocation_unit_id"){row.querySelector('[name="daycare_id"]').innerHTML=options("daycares","",(item)=>item.extra===event.target.value);}refreshInlineStatuses(row.dataset.bankRow);});
  $("#bank-new-rows").addEventListener("input",(event)=>{const row=event.target.closest("[data-allocation-entry]");if(row)refreshInlineStatuses(row.dataset.bankRow);});
  $("#bank-new-rows").addEventListener("keydown",(event)=>{const row=event.target.closest("[data-bank-row]");if(!row)return;if(event.key==="Enter"&&!event.target.matches("textarea,button")){event.preventDefault();saveTransaction(row.dataset.bankRow);}if(["ArrowDown","ArrowUp"].includes(event.key)&&!event.target.matches("select,input,textarea")){event.preventDefault();const rows=filtered(),index=rows.findIndex((item)=>item.bank_transaction_id===row.dataset.bankRow),next=Math.max(0,Math.min(rows.length-1,index+(event.key==="ArrowDown"?1:-1)));document.querySelector(`[data-bank-row="${rows[next]?.bank_transaction_id}"]`)?.focus({preventScroll:true});}});
  $("#bank-new-details").addEventListener("click",(event)=>{if(event.target.closest("[data-close-metadata]")){state.selected=null;renderMetadata();}});
  document.addEventListener("keydown",(event)=>{if(event.key==="/"&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)){event.preventDefault();$("#bank-new-search").focus();}});
  try {
    await reload();
    $("#bank-account-filter").innerHTML='<option value="">כל החשבונות</option>'+state.data.accounts.map((row)=>`<option value="${row.bank_account_id}">${esc(row.display_name)}</option>`).join("");
    $("#bank-month-filter").innerHTML='<option value="">כל החודשים</option>'+[...new Set(state.data.transactions.map((row)=>row.transaction_date?.slice(0,7)).filter(Boolean))].sort().reverse().map((value)=>`<option value="${value}">${value}</option>`).join("");
    render();
  } catch(error) { message(error.message,"error"); $("#bank-new-rows").innerHTML='<tr><td colspan="16">הנתונים אינם זמינים.</td></tr>'; }
}
