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
  return `<section class="bank-new-heading"><div><p class="eyebrow">הנה״ח / קובץ בנקים</p><h1>קובץ בנקים</h1><p>ייבוא תנועות בנק וסביבת העבודה היומית של המזכירות.</p></div><div class="bank-import-actions"><input id="bank-file" type="file" accept=".xlsx,.xls,.csv" hidden><button id="bank-import" class="button button-primary" type="button">ייבוא קובץ</button><span id="bank-message" role="status"></span></div></section>
  <section class="bank-new-summary" id="bank-summary"></section>
  <section class="bank-new-toolbar panel" aria-label="סינון וחיפוש"><label class="bank-new-search">⌕ <input id="bank-new-search" type="search" placeholder="חיפוש תיאור או אסמכתא…"><kbd>/</kbd></label><label>חשבון<select id="bank-account-filter"><option value="">כל החשבונות</option></select></label><label>חודש<select id="bank-month-filter"><option value="">כל החודשים</option></select></label><label>סטטוס<select id="bank-status-filter"><option value="">כל הסטטוסים</option>${options("accountingStatuses")}</select></label><button id="bank-clear" class="button button-quiet" type="button">ניקוי</button><span id="bank-new-count"></span></section>
  <section class="bank-new-main"><div class="bank-new-sheet panel"><div class="bank-new-scroll" id="bank-scroll"><table><thead><tr><th>תאריך</th><th>תיאור תנועה</th><th>אסמכתא</th><th>חשבון</th><th>סכום</th><th>מצב שיוך</th><th>סטטוס</th><th>מסמך</th></tr></thead><tbody id="bank-new-rows"></tbody></table></div><footer>↑↓ מעבר בין שורות · Enter עריכת הקצאות · / חיפוש</footer></div><aside class="bank-new-details panel" id="bank-new-details" hidden></aside></section>
  <dialog id="bank-import-dialog" class="bank-dialog"><form method="dialog"><button class="dialog-close" aria-label="סגירה">×</button></form><div id="bank-import-content"></div></dialog>`;
}

export async function mountBankWorkbench(request) {
  const state = { data: null, selected: null, query: "", account: "", month: "", status: "", batch: "", saving: false };
  const $ = (selector) => document.querySelector(selector);
  const message = (text, tone = "") => { const node = $("#bank-message"); if (node) { node.textContent = text; node.className = tone; } };
  const reload = async () => { state.data = await request("GET"); render(); };
  const allocationsFor = (id) => state.data.allocations.filter((row) => row.bank_transaction_id === id);
  const accountName = (id) => state.data.accounts.find((row) => row.bank_account_id === id)?.display_name || "לא משויך";
  const analysis = (transaction) => {
    const rows = allocationsFor(transaction.bank_transaction_id);
    const total = rows.reduce((sum, row) => sum + Number(row.allocation_amount || 0), 0);
    const remaining = Number(transaction.amount) - total;
    const status = rows.find((row) => row.accounting_status)?.accounting_status || "";
    return { rows, total, remaining, status, balanced: rows.length > 0 && Math.abs(remaining) <= .01, partial: rows.length > 0 && Math.abs(remaining) > .01 };
  };
  const filtered = () => state.data.transactions.filter((transaction) => {
    const info = analysis(transaction);
    const month = transaction.transaction_date?.slice(0,7);
    const search = `${transaction.description} ${transaction.reference_number || ""} ${transaction.amount}`.toLowerCase();
    return (!state.query || search.includes(state.query.toLowerCase())) && (!state.account || transaction.bank_account_id === state.account) && (!state.month || month === state.month) && (!state.status || info.status === state.status) && (!state.batch || transaction.import_batch_id === state.batch);
  });
  const renderSummary = () => {
    const rows = filtered(); const complete = rows.filter((row) => analysis(row).balanced).length; const attention = rows.length - complete;
    $("#bank-summary").innerHTML = `<article><span>כל התנועות</span><strong>${rows.length}</strong><small>בתצוגה הפעילה</small></article><article><span>מאוזנות</span><strong>${complete}</strong><small>הקצאה מלאה</small></article><article><span>דורש טיפול</span><strong>${attention}</strong><small>חסר או חלקי</small></article><article><span>זכות</span><strong>${money.format(rows.filter((r)=>r.amount>0).reduce((s,r)=>s+Number(r.amount),0))}</strong></article><article><span>חובה</span><strong>${money.format(rows.filter((r)=>r.amount<0).reduce((s,r)=>s+Math.abs(Number(r.amount)),0))}</strong></article>`;
  };
  const renderDetails = () => {
    const transaction = state.data.transactions.find((row) => row.bank_transaction_id === state.selected);
    const root = $("#bank-new-details"); if (!transaction) { root.hidden = true; return; }
    root.hidden = false; const info = analysis(transaction);
    root.innerHTML = `<div class="bank-detail-head"><div><p class="eyebrow">תנועת אב</p><h2>${esc(transaction.description)}</h2></div><span class="bank-balance ${info.balanced ? "balanced" : info.partial ? "partial" : "empty"}">${info.balanced ? "מאוזן" : info.partial ? "חלקי" : "ללא הקצאה"}</span></div><div class="bank-detail-amount"><strong>${money.format(transaction.amount)}</strong><span>${transaction.transaction_date} · ${esc(accountName(transaction.bank_account_id))}</span></div><div class="attachment-placeholder"><button type="button" disabled title="העלאה תתווסף ב-TRACK015A">📎</button><span>מסמכים: ${transaction.attachment_count || 0}</span></div><form id="allocation-form"><div id="allocation-rows">${info.rows.length ? info.rows.map((row,index)=>allocationRow(row,index)).join("") : allocationRow({},0)}</div><button class="button button-secondary" type="button" id="allocation-add">הוספת שורה</button><div class="allocation-totals"><span>סכום תנועה <b>${money.format(transaction.amount)}</b></span><span>הוקצה <b id="allocated-total">${money.format(info.total)}</b></span><span>יתרה <b id="allocation-remaining">${money.format(info.remaining)}</b></span></div><p id="allocation-errors" class="form-message" role="alert"></p><button class="button button-primary" type="submit">שמירת הקצאות</button></form>`;
    bindAllocationEditor(transaction);
  };
  const allocationRow = (row, index) => `<fieldset class="allocation-editor-row" data-allocation-row><legend>הקצאה ${index + 1}</legend><label>סוג תנועה<select name="movement_type" required>${options("movementTypes",row.movement_type)}</select></label><label>מחלקה<select name="allocation_unit_id" required>${options("departments",row.allocation_unit_id)}</select></label><label>מעון<select name="daycare_id">${options("daycares",row.daycare_id,(item)=>!row.allocation_unit_id||item.extra===row.allocation_unit_id)}</select></label><label>סעיף תקציבי<select name="budget_category_id">${options("budgetCategories",row.budget_category_id)}</select></label><label>חודש תקציב<select name="budget_month" required>${options("budgetMonths",row.budget_month?.slice(0,7))}</select></label><label>סטטוס הנה״ח<select name="accounting_status" required>${options("accountingStatuses",row.accounting_status)}</select></label><label>סכום<input name="allocation_amount" type="number" step=".01" value="${esc(row.allocation_amount ?? "")}" required></label><label class="allocation-notes">הערות<textarea name="notes">${esc(row.notes || "")}</textarea></label><button class="allocation-delete" type="button" data-delete-allocation aria-label="מחיקת הקצאה">מחיקה</button></fieldset>`;
  const bindAllocationEditor = (transaction) => {
    const form = $("#allocation-form"); const rowsRoot = $("#allocation-rows");
    const update = () => { const total = [...rowsRoot.querySelectorAll('[name="allocation_amount"]')].reduce((sum,input)=>sum+(Number(input.value)||0),0); $("#allocated-total").textContent=money.format(total); $("#allocation-remaining").textContent=money.format(Number(transaction.amount)-total); };
    $("#allocation-add").addEventListener("click",()=>{ rowsRoot.insertAdjacentHTML("beforeend",allocationRow({},rowsRoot.children.length)); update(); });
    rowsRoot.addEventListener("click",(event)=>{ if(event.target.closest("[data-delete-allocation]")){ event.target.closest("[data-allocation-row]").remove(); update(); } });
    rowsRoot.addEventListener("input",update);
    rowsRoot.addEventListener("change",(event)=>{ if(event.target.name==="allocation_unit_id"){ const row=event.target.closest("[data-allocation-row]"); row.querySelector('[name="daycare_id"]').innerHTML=options("daycares","",(item)=>item.extra===event.target.value); } });
    rowsRoot.addEventListener("keydown",(event)=>{ if(event.key==="Enter"&&!event.target.matches("textarea,button")){event.preventDefault();const fields=[...rowsRoot.querySelectorAll("select,input,textarea")];fields[fields.indexOf(event.target)+1]?.focus();} });
    form.addEventListener("submit",async(event)=>{ event.preventDefault(); const scroll=$("#bank-scroll").scrollTop;
      // FormData cannot include detached fieldsets reliably; read named controls directly.
      const payload=[...rowsRoot.querySelectorAll("[data-allocation-row]")].map((root)=>Object.fromEntries([...root.querySelectorAll("[name]")].map((input)=>[input.name,input.value])));
      try { state.saving=true; await request("POST",{action:"save_allocations",bank_transaction_id:transaction.bank_transaction_id,allocations:payload}); await reload(); state.selected=transaction.bank_transaction_id; render(); requestAnimationFrame(()=>{$("#bank-scroll").scrollTop=scroll;}); message("ההקצאות נשמרו.","success"); } catch(error){ $("#allocation-errors").textContent=error.details?.join(" · ")||error.message; } finally {state.saving=false;}
    });
  };
  const render = () => {
    const rows = filtered(); renderSummary(); $("#bank-new-count").textContent=`${rows.length} תנועות`;
    $("#bank-new-rows").innerHTML=rows.map((transaction)=>{const info=analysis(transaction);return `<tr tabindex="0" data-bank-row="${transaction.bank_transaction_id}" class="${state.selected===transaction.bank_transaction_id?"selected":""}"><td>${transaction.transaction_date}</td><td><strong>${esc(transaction.description)}</strong></td><td>${esc(transaction.reference_number||"—")}</td><td>${esc(accountName(transaction.bank_account_id))}</td><td class="${transaction.amount<0?"bank-debit":"bank-credit"}">${money.format(transaction.amount)}</td><td><span class="status-badge status-${info.balanced?"success":info.partial?"warning":"danger"}">${info.balanced?"מאוזן":info.partial?`חלקי · ${money.format(info.remaining)}`:"ללא הקצאה"}</span></td><td>${esc(label("accountingStatuses",info.status))}</td><td class="bank-document"><button type="button" disabled title="העלאה תתווסף ב-TRACK015A">📎 ${transaction.attachment_count||0}</button></td></tr>`;}).join("")||'<tr><td colspan="8"><div class="admin-state admin-empty"><strong>אין תנועות בנק להצגה</strong><p>ייבאו XLSX או CSV כדי להתחיל.</p></div></td></tr>';
    renderDetails();
  };
  const openPreview = (parsed, preview) => {
    const dialog=$("#bank-import-dialog"); const root=$("#bank-import-content");
    root.innerHTML=`<h2>תצוגה מקדימה לפני ייבוא</h2><p><b>קובץ:</b> ${esc(parsed.fileName)} · <b>חשבון:</b> ${esc(preview.account.display_name)} (${esc(preview.account_number)})</p><div class="import-summary"><span>חדשות <b>${preview.summary.importable}</b></span><span>כפילויות <b>${preview.summary.duplicates}</b></span><span>שגויות <b>${preview.summary.invalid}</b></span></div><div class="import-preview-scroll"><table><thead><tr><th>שורה</th><th>תאריך</th><th>תיאור</th><th>אסמכתא</th><th>סכום</th><th>מצב</th></tr></thead><tbody>${preview.rows.map((row)=>`<tr class="${row.importable?"":"import-skip"}"><td>${row.source_row_number}</td><td>${row.transaction_date||"—"}</td><td>${esc(row.description)}</td><td>${esc(row.reference_number||"—")}</td><td>${Number.isFinite(row.amount)?money.format(row.amount):"—"}</td><td>${row.duplicate?"כפילות":row.errors.length?esc(row.errors.join(", ")):"מוכן"}</td></tr>`).join("")}</tbody></table></div><div class="dialog-actions"><button id="confirm-bank-import" class="button button-primary" ${preview.summary.importable?"":"disabled"}>אישור וייבוא ${preview.summary.importable} תנועות</button><button class="button button-secondary" onclick="this.closest('dialog').close()">ביטול</button></div>`;
    dialog.showModal();
    $("#confirm-bank-import")?.addEventListener("click",async()=>{ try{ const result=await request("POST",{action:"confirm_import",preview_token:preview.preview_token,account_id:preview.account.bank_account_id,account_number:preview.account_number,file_name:parsed.fileName,total_rows:preview.summary.total,duplicate_rows:preview.summary.duplicates,invalid_rows:preview.summary.invalid,rows:preview.rows}); dialog.close(); state.batch=result.batch_id; await reload(); state.selected=result.transactions[0]?.bank_transaction_id||null; render(); message(`יובאו ${result.imported} תנועות. האצווה נפתחה.`,"success"); }catch(error){message(error.message,"error");}});
  };
  $("#bank-import").addEventListener("click",()=>$("#bank-file").click());
  $("#bank-file").addEventListener("change",async(event)=>{const file=event.target.files[0];if(!file)return;try{message("קורא את הקובץ…");const parsed=await parseWorkbook(file,await file.arrayBuffer(),state.data.accounts);const preview=await request("POST",{action:"preview",account_number:parsed.accountNumber,rows:parsed.rows});openPreview(parsed,preview);message("");}catch(error){message(error.message,"error");}finally{event.target.value="";}});
  $("#bank-new-search").addEventListener("input",(event)=>{state.query=event.target.value;render();});
  ["account","month","status"].forEach((name)=>$(`#bank-${name}-filter`).addEventListener("change",(event)=>{state[name]=event.target.value;render();}));
  $("#bank-clear").addEventListener("click",()=>{state.query=state.account=state.month=state.status=state.batch="";$("#bank-new-search").value="";["account","month","status"].forEach((name)=>$(`#bank-${name}-filter`).value="");render();});
  $("#bank-new-rows").addEventListener("click",(event)=>{const row=event.target.closest("[data-bank-row]");if(row){state.selected=row.dataset.bankRow;render();}});
  $("#bank-new-rows").addEventListener("keydown",(event)=>{const rows=filtered(),index=rows.findIndex((row)=>row.bank_transaction_id===state.selected);if(event.key==="Enter"){event.preventDefault();renderDetails();$("#bank-new-details select")?.focus();}if(["ArrowDown","ArrowUp"].includes(event.key)){event.preventDefault();const next=Math.max(0,Math.min(rows.length-1,index+(event.key==="ArrowDown"?1:-1)));state.selected=rows[next]?.bank_transaction_id;render();document.querySelector(`[data-bank-row="${state.selected}"]`)?.focus({preventScroll:true});}});
  document.addEventListener("keydown",(event)=>{if(event.key==="/"&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)){event.preventDefault();$("#bank-new-search").focus();}});
  try { await reload(); $("#bank-account-filter").innerHTML='<option value="">כל החשבונות</option>'+state.data.accounts.map((row)=>`<option value="${row.bank_account_id}">${esc(row.display_name)}</option>`).join(""); $("#bank-month-filter").innerHTML='<option value="">כל החודשים</option>'+[...new Set(state.data.transactions.map((row)=>row.transaction_date?.slice(0,7)).filter(Boolean))].sort().reverse().map((value)=>`<option value="${value}">${value}</option>`).join(""); render(); } catch(error) { message(error.message,"error"); $("#bank-new-rows").innerHTML='<tr><td colspan="8">הנתונים אינם זמינים.</td></tr>'; }
}
