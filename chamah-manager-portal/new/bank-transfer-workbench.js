import { createAutosave } from "./autosave.js";

const money = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" });
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" })[char]);
const statusLabels = { PENDING: "ממתין", COMPLETED: "בוצע", PROBLEM: "בעיה" };
const statusClasses = { PENDING: "pending", COMPLETED: "completed", PROBLEM: "problem" };
const excelHeaders = {
  name: ["שם", "name"],
  amount: ["סכום", "amount"],
  bank: ["בנק", "bank"],
  branch: ["סניף", "branch"],
  account_number: ["חשבון", "מספר חשבון", "account"],
  account_holder: ["בעל החשבון", "account holder"],
  budget_category: ["סעיף תקציבי", "קטגוריית תקציב", "budget category"],
  notes: ["הערות", "notes"],
  department: ["מחלקה", "department"],
  daycare: ["מעון", "daycare"],
  status: ["סטטוס", "status"],
  execution_date: ["תאריך ביצוע", "execution date"],
};
const normalized = (value) => String(value ?? "").trim().toLocaleLowerCase("he-IL");
const isoDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") return new Date(Date.UTC(1899, 11, 30 + value)).toISOString().slice(0, 10);
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
};

export function bankTransferWorkbenchTemplate() {
  return `<section class="transfer-heading">
    <div><p class="eyebrow">הנה״ח / העברות בנקאיות</p><h1>העברות בנקאיות</h1><p>סביבת עבודה להכנת העברות, פיצול ומעקב אחר ביצוע.</p></div>
    <span id="transfer-message" class="workbench-message" role="status"></span>
  </section>
  <section id="transfer-kpis" class="transfer-kpis" aria-label="מדדי העברות"></section>
  <section class="transfer-toolbar panel">
    <label class="transfer-search">⌕ <input id="transfer-search" type="search" placeholder="חיפוש בכל השדות…"></label>
    <label>תצוגה<select id="transfer-view"><option value="open">ממתין + בעיה</option><option value="all">כל ההעברות</option><option value="COMPLETED">בוצע / היסטוריה</option><option value="PENDING">ממתין</option><option value="PROBLEM">בעיה</option><option value="split">פיצולים</option></select></label>
    <label>מחלקה<select id="transfer-unit-filter"><option value="">כל המחלקות</option></select></label>
    <label>מיון<select id="transfer-sort"><option value="row_number:asc">מספר שורה</option><option value="amount:desc">סכום — גבוה לנמוך</option><option value="amount:asc">סכום — נמוך לגבוה</option><option value="name:asc">שם</option><option value="status:asc">סטטוס</option><option value="execution_date:desc">תאריך ביצוע</option></select></label>
    <div class="transfer-actions"><button id="transfer-add" class="button button-primary" type="button">+ הוספת שורה</button><button id="transfer-import" class="button button-secondary" type="button">ייבוא Excel</button><button id="transfer-export" class="button button-secondary" type="button">ייצוא Excel</button><input id="transfer-file" type="file" accept=".xlsx,.xls,.csv" hidden></div>
    <span id="transfer-count"></span>
  </section>
  <section class="transfer-sheet panel">
    <div class="transfer-scroll"><table class="transfer-table"><thead><tr>
      <th>מס׳ שורה</th><th>מס׳ העברה</th><th>שם</th><th>סכום</th><th>בנק</th><th>סניף</th><th>חשבון</th><th>בעל החשבון</th><th>סעיף תקציבי</th><th>הערות</th><th>מחלקה</th><th>מעון</th><th>סטטוס</th><th>תאריך ביצוע</th><th>קובץ</th><th>פעולות</th>
    </tr></thead><tbody id="transfer-rows"></tbody></table></div>
    <footer>השמירה מתבצעת אוטומטית · תאריך ביצוע מוזן ידנית בלבד · העברות שבוצעו נשמרות בהיסטוריה</footer>
  </section>`;
}

export async function mountBankTransferWorkbench(request) {
  const state = {
    data: { transfers: [], categories: [], units: [], daycares: [] },
    query: "", view: "open", unit: "", sort: "row_number:asc",
    drafts: new Map(), controllers: new Map(), expanded: new Set(),
  };
  const $ = (selector) => document.querySelector(selector);
  const message = (value, tone = "") => {
    const node = $("#transfer-message");
    if (!node) return;
    node.textContent = value;
    node.dataset.tone = tone;
  };
  const childrenFor = (id) => state.data.transfers.filter((row) => row.parent_transfer_id === id);
  const roots = () => state.data.transfers.filter((row) => !row.parent_transfer_id);
  const draft = (row) => state.drafts.get(row.bank_transfer_id) || row;
  const label = (rows, id, key = "display_name", idKey) => rows.find((row) => row[idKey] === id)?.[key] || "";
  const unitLabel = (id) => label(state.data.units, id, "display_name", "allocation_unit_id");
  const daycareLabel = (id) => label(state.data.daycares, id, "display_name", "daycare_id");
  const categoryLabel = (id) => label(state.data.categories, id, "display_name", "budget_category_id");
  const splitSummary = (parent) => {
    const children = childrenFor(parent.bank_transfer_id);
    const parts = children.reduce((sum, row) => sum + Number(draft(row).amount || 0), 0);
    const paid = children.filter((row) => draft(row).status === "COMPLETED").reduce((sum, row) => sum + Number(draft(row).amount || 0), 0);
    const remaining = Number(draft(parent).amount || 0) - parts;
    return { children, parts, paid, remaining };
  };
  const rootOpen = (row) => {
    const summary = splitSummary(row);
    if (!summary.children.length) return draft(row).status !== "COMPLETED";
    return Math.abs(summary.remaining) > 0.005 || summary.children.some((child) => draft(child).status !== "COMPLETED");
  };
  const searchText = (row) => normalized([
    row.row_number, row.transfer_number, row.name, row.amount, row.bank, row.branch,
    row.account_number, row.account_holder, row.notes, unitLabel(row.allocation_unit_id),
    daycareLabel(row.daycare_id), categoryLabel(row.budget_category_id), statusLabels[row.status],
  ].join(" "));
  const visibleRoots = () => {
    const query = normalized(state.query);
    const [sortKey, direction] = state.sort.split(":");
    return roots().filter((source) => {
      const row = draft(source);
      const summary = splitSummary(source);
      const family = [row, ...summary.children.map(draft)];
      const matchesSearch = !query || family.some((item) => searchText(item).includes(query));
      const matchesUnit = !state.unit || family.some((item) => item.allocation_unit_id === state.unit);
      const matchesView = state.view === "all"
        || (state.view === "open" && rootOpen(source))
        || (state.view === "split" && summary.children.length)
        || (state.view === "COMPLETED" && !rootOpen(source))
        || (["PENDING", "PROBLEM"].includes(state.view) && family.some((item) => item.status === state.view));
      return matchesSearch && matchesUnit && matchesView;
    }).sort((leftSource, rightSource) => {
      const left = draft(leftSource), right = draft(rightSource);
      const a = left[sortKey] ?? "", b = right[sortKey] ?? "";
      const compared = typeof a === "number" || typeof b === "number"
        ? Number(a || 0) - Number(b || 0)
        : String(a).localeCompare(String(b), "he");
      return direction === "desc" ? -compared : compared;
    });
  };
  const options = (rows, selected, idKey, labelKey = "display_name") =>
    `<option value=""></option>${rows.map((item) => `<option value="${item[idKey]}" ${item[idKey] === selected ? "selected" : ""}>${esc(item[labelKey])}</option>`).join("")}`;
  const daycareOptions = (selected, unitId) => options(
    state.data.daycares.filter((item) => !unitId || item.allocation_unit_id === unitId),
    selected, "daycare_id"
  );
  const rowTemplate = (source, { child = false, index = 0 } = {}) => {
    const row = draft(source);
    const summary = child ? null : splitSummary(source);
    const isSplit = Boolean(summary?.children.length);
    const temp = source.bank_transfer_id.startsWith("temp-");
    const classes = [child || isSplit ? "split" : statusClasses[row.status], child ? "transfer-child-row" : ""].join(" ");
    return `<tr class="${classes}" data-transfer-row="${source.bank_transfer_id}" data-parent-id="${row.parent_transfer_id || ""}">
      <td class="system-cell">${child ? `↳ ${index + 1}` : row.row_number || "חדש"}</td>
      <td class="system-cell">${child ? `חלק ${index + 1}` : row.transfer_number ? `BT-${String(row.transfer_number).padStart(6, "0")}` : "יוקצה בשמירה"}</td>
      <td><input name="name" value="${esc(row.name)}" aria-label="שם"></td>
      <td><input name="amount" type="number" min="0" step=".01" value="${esc(row.amount)}" aria-label="סכום"></td>
      <td><input name="bank" value="${esc(row.bank)}" aria-label="בנק"></td>
      <td><input name="branch" value="${esc(row.branch)}" aria-label="סניף"></td>
      <td><input name="account_number" value="${esc(row.account_number)}" aria-label="חשבון"></td>
      <td><input name="account_holder" value="${esc(row.account_holder)}" aria-label="בעל החשבון"></td>
      <td><select name="budget_category_id" aria-label="סעיף תקציבי">${options(state.data.categories, row.budget_category_id, "budget_category_id")}</select></td>
      <td><input name="notes" value="${esc(row.notes)}" aria-label="הערות"></td>
      <td><select name="allocation_unit_id" aria-label="מחלקה">${options(state.data.units, row.allocation_unit_id, "allocation_unit_id")}</select></td>
      <td><select name="daycare_id" aria-label="מעון">${daycareOptions(row.daycare_id, row.allocation_unit_id)}</select></td>
      <td><select name="status" aria-label="סטטוס">${Object.entries(statusLabels).map(([value, title]) => `<option value="${value}" ${row.status === value ? "selected" : ""}>${title}</option>`).join("")}</select></td>
      <td><input name="execution_date" type="date" value="${esc(row.execution_date)}" aria-label="תאריך ביצוע"></td>
      <td class="attachment-cell">${row.attachment_path ? `<button class="icon-button" data-open-attachment type="button" title="${esc(row.attachment_name)}">📎</button>` : ""}<button class="icon-button" data-upload-attachment type="button" ${temp ? "disabled" : ""} aria-label="העלאת קובץ">＋</button><input data-attachment-file type="file" hidden></td>
      <td class="row-actions"><span class="autosave-status" data-save-status></span><button class="button button-quiet transfer-done" data-mark-completed type="button" ${row.status === "COMPLETED" || temp ? "disabled" : ""}>בוצע</button>${!child ? `<button class="button button-quiet" data-toggle-split type="button" ${temp ? "disabled" : ""}>${isSplit && state.expanded.has(source.bank_transfer_id) ? "סגירה" : "פיצול"}</button>` : ""}<button class="icon-button danger" data-delete-transfer type="button" aria-label="מחיקה">×</button></td>
    </tr>${!child && isSplit ? `<tr class="split-summary-row"><td colspan="16"><button type="button" data-toggle-split="${source.bank_transfer_id}"><strong>פיצול:</strong> סכום מקורי ${money.format(Number(row.amount || 0))} · חלקים ${money.format(summary.parts)} · חלקים שבוצעו ${money.format(summary.paid)} · יתרה ${money.format(summary.remaining)} · <span class="split-badge">${Math.abs(summary.remaining) < .005 ? "מאוזן" : summary.remaining > 0 ? "נותרה יתרה" : "חריגה מהסכום"}</span></button></td></tr>${state.expanded.has(source.bank_transfer_id) ? summary.children.map((item, childIndex) => rowTemplate(item, { child: true, index: childIndex })).join("") + `<tr class="transfer-add-child"><td colspan="16"><button class="button button-secondary" data-add-split="${source.bank_transfer_id}" type="button">+ הוספת חלק</button></td></tr>` : ""}` : ""}`;
  };
  const readRow = (id) => {
    const source = state.data.transfers.find((row) => row.bank_transfer_id === id);
    const node = document.querySelector(`[data-transfer-row="${id}"]`);
    if (!source || !node) return draft(source);
    const value = { ...draft(source) };
    node.querySelectorAll("[name]").forEach((field) => {
      value[field.name] = field.name === "amount" ? Number(field.value || 0) : field.value || null;
    });
    return value;
  };
  const valid = (row) => Number.isFinite(Number(row.amount)) && Number(row.amount) >= 0
    && (row.status !== "COMPLETED" || /^\d{4}-\d{2}-\d{2}$/.test(row.execution_date || ""));
  const destroyControllers = () => {
    state.controllers.forEach((controller) => controller.destroy());
    state.controllers.clear();
  };
  const bindAutosave = () => {
    document.querySelectorAll("[data-transfer-row]").forEach((node) => {
      const id = node.dataset.transferRow;
      const controller = createAutosave({
        key: `bank-transfer.${id}`,
        read: () => readRow(id),
        validate: valid,
        statusTargets: () => node.querySelectorAll("[data-save-status]"),
        save: (row) => request("POST", { action: "save", ...row, bank_transfer_id: id.startsWith("temp-") ? null : id }),
        onSaved: (result) => {
          const index = state.data.transfers.findIndex((row) => row.bank_transfer_id === id);
          state.data.transfers[index] = result.transfer;
          state.drafts.delete(id);
          if (id.startsWith("temp-")) render();
          else {
            state.drafts.set(id, result.transfer);
            updateKpis();
          }
        },
      });
      state.controllers.set(id, controller);
    });
  };
  const updateKpis = () => {
    const splitParents = roots().filter((row) => childrenFor(row.bank_transfer_id).length);
    const remaining = splitParents.reduce((sum, row) => sum + Math.max(0, splitSummary(row).remaining), 0);
    const unsplitPending = roots().filter((row) => !childrenFor(row.bank_transfer_id).length && draft(row).status === "PENDING").map(draft);
    const pendingCount = unsplitPending.length + splitParents.filter((row) => splitSummary(row).remaining > .005).length;
    const pendingAmount = unsplitPending.reduce((sum, row) => sum + Number(row.amount || 0), 0) + remaining;
    $("#transfer-kpis").innerHTML = [
      ["ממתינות", pendingCount, "pending"],
      ["סכום ממתין", money.format(pendingAmount), "pending"],
      ["מפוצלות", splitParents.length, "split"],
      ["יתרה בפיצולים", money.format(remaining), "split"],
    ].map(([title, value, tone]) => `<article class="panel ${tone}"><span>${title}</span><strong>${value}</strong></article>`).join("");
  };
  const render = () => {
    destroyControllers();
    const rows = visibleRoots();
    $("#transfer-rows").innerHTML = rows.map((row) => rowTemplate(row)).join("") || `<tr><td colspan="16"><div class="admin-state admin-empty"><strong>אין העברות בתצוגה</strong><p>אפשר להוסיף שורה חדשה או לשנות את המסננים.</p></div></td></tr>`;
    $("#transfer-count").textContent = `${rows.length} העברות`;
    updateKpis();
    bindAutosave();
  };
  const reload = async () => {
    const data = await request("GET");
    state.data = data;
    $("#transfer-unit-filter").innerHTML = `<option value="">כל המחלקות</option>${data.units.map((row) => `<option value="${row.allocation_unit_id}">${esc(row.display_name)}</option>`).join("")}`;
  };
  const add = (parentId = null) => {
    const parent = parentId ? state.data.transfers.find((row) => row.bank_transfer_id === parentId) : null;
    const id = `temp-${crypto.randomUUID()}`;
    state.data.transfers.push({
      bank_transfer_id: id, row_number: null, transfer_number: null, parent_transfer_id: parentId,
      name: parent?.name || "", amount: 0, bank: parent?.bank || "", branch: parent?.branch || "",
      account_number: parent?.account_number || "", account_holder: parent?.account_holder || "",
      budget_category_id: null, notes: "", allocation_unit_id: null, daycare_id: null,
      status: "PENDING", execution_date: null, attachment_path: null,
    });
    if (parentId) state.expanded.add(parentId);
    render();
    document.querySelector(`[data-transfer-row="${id}"] [name="name"]`)?.focus();
  };
  const deleteRow = async (id) => {
    if (!confirm("למחוק את השורה? הפיצולים שלה יוסרו מהתצוגה ויישמרו ביומן הביקורת.")) return;
    if (id.startsWith("temp-")) {
      state.data.transfers = state.data.transfers.filter((row) => row.bank_transfer_id !== id);
    } else {
      await request("POST", { action: "delete", bank_transfer_id: id });
      state.data.transfers = state.data.transfers.filter((row) => row.bank_transfer_id !== id && row.parent_transfer_id !== id);
    }
    render();
    message("השורה נמחקה.", "success");
  };
  const upload = async (id, file) => {
    if (file.size > 10 * 1024 * 1024) throw new Error("הקובץ חייב להיות בגודל של עד 10MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    const result = await request("POST", { action: "upload_attachment", bank_transfer_id: id, file_name: file.name, content_type: file.type, base64: btoa(binary) });
    const index = state.data.transfers.findIndex((row) => row.bank_transfer_id === id);
    state.data.transfers[index] = result.transfer;
    render();
    message("הקובץ הועלה.", "success");
  };
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("העברות בנקאיות", { views: [{ rightToLeft: true }] });
    const headers = ["מספר שורה","מספר העברה","שורת אב","שם","סכום","בנק","סניף","חשבון","בעל החשבון","סעיף תקציבי","הערות","מחלקה","מעון","סטטוס","תאריך ביצוע","קובץ"];
    sheet.addRow(headers);
    const families = visibleRoots().flatMap((parent) => [parent, ...childrenFor(parent.bank_transfer_id)]);
    families.forEach((source) => {
      const row = draft(source);
      sheet.addRow([row.row_number, row.transfer_number, row.parent_transfer_id ? state.data.transfers.find((item) => item.bank_transfer_id === row.parent_transfer_id)?.transfer_number : "", row.name, Number(row.amount || 0), row.bank, row.branch, row.account_number, row.account_holder, categoryLabel(row.budget_category_id), row.notes, unitLabel(row.allocation_unit_id), daycareLabel(row.daycare_id), statusLabels[row.status], row.execution_date, row.attachment_name]);
    });
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((column) => { column.width = 18; });
    const blob = new Blob([await workbook.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = `העברות-בנקאיות-${new Date().toISOString().slice(0, 10)}.xlsx`; link.click(); URL.revokeObjectURL(url);
  };
  const importExcel = async (file) => {
    if (!window.XLSX) throw new Error("רכיב קריאת Excel אינו זמין.");
    const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("לא נמצא גיליון בקובץ.");
    const matrix = window.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
    const headers = matrix[0]?.map(normalized) || [];
    const index = Object.fromEntries(Object.entries(excelHeaders).map(([field, aliases]) => [field, headers.findIndex((header) => aliases.map(normalized).includes(header))]));
    if (index.name < 0 || index.amount < 0) throw new Error("נדרשות לפחות עמודות שם וסכום.");
    const lookup = (rows, idKey, value, field, rowNumber) => {
      if (!normalized(value)) return null;
      const matches = rows.filter((item) => [item.display_name, item[Object.keys(item).find((key) => key.endsWith("_code"))]].some((candidate) => normalized(candidate) === normalized(value)));
      if (matches.length !== 1) throw new Error(`שורה ${rowNumber}: ${field} אינו ערך Supabase פעיל וחד-משמעי.`);
      return matches[0][idKey];
    };
    const rows = matrix.slice(1).filter((row) => row.some((value) => normalized(value))).map((row, offset) => {
      const unitId = lookup(state.data.units, "allocation_unit_id", row[index.department], "מחלקה", offset + 2);
      const daycareId = lookup(state.data.daycares, "daycare_id", row[index.daycare], "מעון", offset + 2);
      const categoryId = lookup(state.data.categories, "budget_category_id", row[index.budget_category], "סעיף תקציבי", offset + 2);
      const statusValue = normalized(row[index.status]);
      const mappedStatus = Object.entries(statusLabels).find(([, value]) => normalized(value) === statusValue)?.[0] || (statusValue ? null : "PENDING");
      if (!mappedStatus) throw new Error(`שורה ${offset + 2}: סטטוס אינו ממתין, בוצע או בעיה.`);
      if (daycareId && state.data.daycares.find((item) => item.daycare_id === daycareId)?.allocation_unit_id !== unitId) throw new Error(`שורה ${offset + 2}: המעון אינו שייך למחלקה.`);
      return {
        name: row[index.name], amount: Number(row[index.amount]), bank: row[index.bank], branch: row[index.branch],
        account_number: row[index.account_number], account_holder: row[index.account_holder],
        budget_category_id: categoryId, notes: row[index.notes], allocation_unit_id: unitId,
        daycare_id: daycareId, status: mappedStatus, execution_date: isoDate(row[index.execution_date]),
      };
    });
    if (!confirm(`לייבא ${rows.length} שורות? ערכי סעיף, מחלקה ומעון נבדקו מול Supabase בלבד.`)) return;
    const result = await request("POST", { action: "import", rows });
    await reload(); render(); message(`יובאו ${result.imported} שורות.`, "success");
  };

  $("#transfer-search").addEventListener("input", (event) => { state.query = event.target.value; render(); });
  $("#transfer-view").addEventListener("change", (event) => { state.view = event.target.value; render(); });
  $("#transfer-unit-filter").addEventListener("change", (event) => { state.unit = event.target.value; render(); });
  $("#transfer-sort").addEventListener("change", (event) => { state.sort = event.target.value; render(); });
  $("#transfer-add").addEventListener("click", () => add());
  $("#transfer-import").addEventListener("click", () => $("#transfer-file").click());
  $("#transfer-export").addEventListener("click", () => exportExcel().catch((error) => message(error.message, "error")));
  $("#transfer-file").addEventListener("change", async (event) => {
    const file = event.target.files[0]; event.target.value = "";
    if (!file) return;
    try { await importExcel(file); } catch (error) { message(error.message, "error"); }
  });
  $("#transfer-rows").addEventListener("input", (event) => {
    const node = event.target.closest("[data-transfer-row]"); if (!node) return;
    const id = node.dataset.transferRow; state.drafts.set(id, readRow(id)); state.controllers.get(id)?.markDirty();
    updateKpis();
  });
  $("#transfer-rows").addEventListener("change", (event) => {
    const node = event.target.closest("[data-transfer-row]"); if (!node) return;
    const id = node.dataset.transferRow;
    if (event.target.name === "allocation_unit_id") {
      const daycare = node.querySelector('[name="daycare_id"]');
      daycare.innerHTML = daycareOptions("", event.target.value);
      daycare.value = "";
    }
    if (event.target.name === "status" && !node.classList.contains("split")) {
      node.classList.remove("pending", "completed", "problem");
      node.classList.add(statusClasses[event.target.value]);
    }
    state.drafts.set(id, readRow(id)); state.controllers.get(id)?.markDirty({ immediate: true }); updateKpis();
  });
  $("#transfer-rows").addEventListener("click", async (event) => {
    const row = event.target.closest("[data-transfer-row]");
    const id = row?.dataset.transferRow;
    try {
      if (event.target.closest("[data-toggle-split]")) {
        const target = id || event.target.closest("[data-toggle-split]").dataset.toggleSplit;
        if (!childrenFor(target).length) add(target);
        else { state.expanded.has(target) ? state.expanded.delete(target) : state.expanded.add(target); render(); }
      } else if (event.target.closest("[data-add-split]")) {
        add(event.target.closest("[data-add-split]").dataset.addSplit);
      } else if (event.target.closest("[data-delete-transfer]")) await deleteRow(id);
      else if (event.target.closest("[data-mark-completed]")) {
        const current = readRow(id);
        state.drafts.set(id, current);
        if (!current.execution_date) {
          row.querySelector('[name="execution_date"]').focus();
          throw new Error("יש להזין תאריך ביצוע ידנית לפני סימון בוצע.");
        }
        await state.controllers.get(id)?.saveNow({ manual: true });
        const result = await request("POST", { action: "mark_completed", bank_transfer_id: id });
        const index = state.data.transfers.findIndex((item) => item.bank_transfer_id === id);
        state.data.transfers[index] = result.transfer; state.drafts.delete(id); render(); message("ההעברה סומנה בוצע.", "success");
      } else if (event.target.closest("[data-upload-attachment]")) row.querySelector("[data-attachment-file]").click();
      else if (event.target.closest("[data-open-attachment]")) {
        const result = await request("POST", { action: "attachment_url", bank_transfer_id: id });
        window.open(result.url, "_blank", "noopener");
      }
    } catch (error) { message(error.message, "error"); }
  });
  $("#transfer-rows").addEventListener("change", async (event) => {
    if (!event.target.matches("[data-attachment-file]") || !event.target.files[0]) return;
    const id = event.target.closest("[data-transfer-row]").dataset.transferRow;
    try { await upload(id, event.target.files[0]); } catch (error) { message(error.message, "error"); }
  });

  try {
    await reload();
    render();
  } catch (error) {
    message(error.message, "error");
    $("#transfer-rows").innerHTML = `<tr><td colspan="16">הנתונים אינם זמינים.</td></tr>`;
  }
}
