import { bindFormAutosave, createAutosave, readAutosaveDraft } from "./autosave.js";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" })[char]);
const money = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 });
const label = (rows, id, idField) => rows.find((row) => row[idField] === id)?.display_name || "—";
const optionRows = (rows, idField, selected = "", filter = () => true) =>
  `<option value="">בחירה…</option>${rows.filter(filter).map((row) => `<option value="${row[idField]}" ${row[idField] === selected ? "selected" : ""}>${esc(row.display_name)}</option>`).join("")}`;
const statusLabel = { ACTIVE:"פעיל", INACTIVE:"לא פעיל", ARCHIVED:"בארכיון", LINKED:"מקושר", MISSING:"חסר עובד", APPROVED_TEMPORARY:"מאושר זמנית", UNRESOLVED:"לא פתור" };
const today = () => new Date().toISOString().slice(0, 10);
const sumHours = (row) => ["regular_hours","overtime_hours","hours_125","hours_150","vacation_hours","sick_hours","other_absence_hours"].reduce((sum, key) => sum + Number(row[key] || 0), 0);

export function workforceHubTemplate(canEmployees = true, canPayroll = true) {
  return `<section class="page-heading"><div><p class="eyebrow">צוות ורישוי</p><h1>צוות ורישוי</h1><p>ניהול נתוני עובדים וביצוע השכר בפועל ממקור Supabase בלבד.</p></div></section>
  <section class="accounting-choice-grid">
    ${canEmployees ? '<a class="panel accounting-choice" href="#dashboards/unit/organization/staffing/employees"><span>👥</span><h2>עובדים</h2><p>פרטים, תנאי שכר, זכאויות, רישוי והיעדרויות.</p><strong>פתיחת סביבת העבודה ←</strong></a>' : ""}
    ${canPayroll ? '<a class="panel accounting-choice" href="#dashboards/unit/organization/staffing/actual-payroll"><span>₪</span><h2>ביצוע שכר</h2><p>קליטה חודשית, התאמת עובדים ופיצול עלות ושעות.</p><strong>פתיחת סביבת העבודה ←</strong></a>' : ""}
  </section>`;
}

const shell = (kind, canImportEmployees = true) => {
  const payroll = kind === "payroll";
  return `<section class="bank-new-heading"><div><p class="eyebrow">צוות ורישוי / ${payroll ? "ביצוע שכר" : "עובדים"}</p><h1>${payroll ? "ביצוע שכר" : "עובדים"}</h1><p>${payroll ? "רשומות שכר חודשיות, התאמת עובדים והקצאות עלות ושעות." : "ניהול מלא של נתוני עובדים והיסטוריה תעסוקתית."}</p></div><div class="bank-import-actions">${payroll ? '<input id="wf-file" type="file" accept=".xlsx,.xls,.csv" hidden><button id="wf-import" class="button button-secondary">ייבוא Excel</button>' : canImportEmployees ? '<input id="employee-import-file" type="file" accept=".xlsx,.xls" hidden><button id="employee-template" class="button button-secondary">הורדת תבנית</button><button id="employee-import" class="button button-secondary">ייבוא Excel</button>' : ''}<button id="wf-add" class="button button-primary">הוספה</button><button id="wf-export" class="button button-secondary">ייצוא</button><span id="wf-message" role="status"></span></div></section>
  ${payroll ? '<section id="payroll-month-workflow" class="payroll-month-workflow panel" aria-label="ניהול חודשי שכר"></section>' : ""}
  <section id="wf-kpis" class="bank-workflow-cards workforce-kpis"></section>
  <section class="bank-new-toolbar panel"><label class="bank-new-search">⌕ <input id="wf-search" type="search" placeholder="חיפוש…"><kbd>/</kbd></label>${payroll ? '<label>חודש<input id="wf-month" type="month"></label>' : ""}<label>סטטוס<select id="wf-status"><option value="">כל הסטטוסים</option></select></label><label>מחלקה<select id="wf-unit"><option value="">כל המחלקות</option></select></label><label>מעון<select id="wf-daycare"><option value="">כל המעונות</option></select></label><button id="wf-clear" class="button button-quiet">ניקוי</button><span id="wf-count"></span></section>
  ${payroll
    ? '<section class="bank-sheet-layout"><div class="bank-new-sheet panel"><div class="bank-new-scroll"><table class="bank-workbench-table workforce-table"><thead id="wf-head"></thead><tbody id="wf-rows"></tbody></table></div></div></section>'
    : '<section class="bank-sheet-layout"><div class="bank-new-sheet panel"><div class="bank-new-scroll"><table class="bank-workbench-table workforce-table"><thead id="wf-head"></thead><tbody id="wf-rows"></tbody></table></div><footer><span>בחירה בשורה פותחת את כרטיס הפרטים</span><span>Supabase הוא מקור הנתונים התפעולי היחיד</span></footer></div><section id="wf-details" class="bank-metadata-panel panel" hidden></section></section>'}
  <dialog id="wf-dialog" class="bank-dialog"><form method="dialog"><button class="dialog-close" aria-label="סגירה">×</button></form><div id="wf-dialog-content"></div></dialog>
  ${payroll ? "" : '<dialog id="employee-import-dialog" class="bank-dialog employee-import-dialog"><div id="employee-import-content"></div></dialog>'}`;
};
export const employeesWorkbenchTemplate = (canImportEmployees = true) => shell("employees", canImportEmployees);
export const payrollWorkbenchTemplate = () => shell("payroll");

function csv(rows, columns, fileName) {
  const quote = (value) => `"${String(value ?? "").replaceAll('"','""')}"`;
  const content = "\uFEFF" + [columns.map(([title]) => quote(title)).join(","), ...rows.map((row) => columns.map(([,field]) => quote(typeof field === "function" ? field(row) : row[field])).join(","))].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type:"text/csv;charset=utf-8" }));
  link.download = fileName; link.click(); URL.revokeObjectURL(link.href);
}

export async function parsePayrollWorkbook(file) {
  const data = await file.arrayBuffer();
  let matrix = [];
  if (new Uint8Array(data)[0] === 0x50) {
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(data);
    const sheet = workbook.worksheets[0];
    matrix = sheet?.getRows(1, sheet.rowCount)?.map((row) => row.values.slice(1).map((value) => value?.result ?? value?.text ?? value ?? "")) || [];
  } else if (window.XLSX && [0xd0,0xcf].every((v,i) => new Uint8Array(data)[i] === v)) {
    const workbook = window.XLSX.read(data, { type:"array", cellDates:true });
    matrix = window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header:1, raw:true, defval:"" });
  } else {
    const text = new TextDecoder().decode(data).replace(/^\uFEFF/,"");
    matrix = text.split(/\r?\n/).filter(Boolean).map((line) => line.split(",").map((cell) => cell.replace(/^"|"$/g,"").replaceAll('""','"')));
  }
  const aliases = {
    employee_number:["מספר עובד","employee number","employee_number","employee code"],
    employee_name:["שם עובד","שם עובדת","employee name"],
    payroll_month:["חודש","חודש שכר","payroll month","payroll_month"],
    employer_cost:["עלות מעסיק","employer cost","employer_cost"],
    gross_pay:["ברוטו","gross pay","gross_pay"],
    regular_hours:["שעות רגילות","שעות","regular hours","regular_hours"],
    overtime_hours:["שעות נוספות","overtime hours","overtime_hours"],
  };
  const norm = (v) => String(v ?? "").trim().toLowerCase().replace(/[_-]/g," ");
  const headerIndex = matrix.findIndex((row) => Object.values(aliases).filter((list) => row.some((cell) => list.map(norm).includes(norm(cell)))).length >= 3);
  if (headerIndex < 0) throw new Error("לא נמצאה שורת כותרות מתאימה בקובץ.");
  const headers = matrix[headerIndex];
  const indexes = Object.fromEntries(Object.entries(aliases).map(([name,list]) => [name, headers.findIndex((cell) => list.map(norm).includes(norm(cell)))]));
  const month = (value) => {
    if (value instanceof Date) return value.toISOString().slice(0,7);
    const text = String(value ?? "").trim();
    const match = text.match(/^(\d{1,2})[./-](\d{4})$/);
    return match ? `${match[2]}-${match[1].padStart(2,"0")}` : /^\d{4}-\d{2}/.test(text) ? text.slice(0,7) : "";
  };
  return matrix.slice(headerIndex + 1).map((row,index) => ({
    source_row_number: headerIndex + index + 2,
    employee_number: indexes.employee_number >= 0 ? String(row[indexes.employee_number] ?? "").trim() : "",
    employee_name: indexes.employee_name >= 0 ? String(row[indexes.employee_name] ?? "").trim() : "",
    payroll_month: indexes.payroll_month >= 0 ? month(row[indexes.payroll_month]) : "",
    employer_cost: Number(String(row[indexes.employer_cost] ?? "").replace(/[₪,\s]/g,"")),
    gross_pay: indexes.gross_pay >= 0 ? Number(String(row[indexes.gross_pay] ?? "").replace(/[₪,\s]/g,"")) : "",
    regular_hours: indexes.regular_hours >= 0 ? Number(row[indexes.regular_hours] || 0) : "",
    overtime_hours: indexes.overtime_hours >= 0 ? Number(row[indexes.overtime_hours] || 0) : "",
  })).filter((row) => row.employee_number || row.employee_name || Number.isFinite(row.employer_cost));
}

export async function mountEmployeesWorkbench(request) {
  const state = { data: await request("employees"), selected:"", query:"", status:"", unit:"", daycare:"", sort:"name" };
  const $ = (selector) => document.querySelector(selector);
  const message = (text, tone="") => { $("#wf-message").textContent = text; $("#wf-message").className = tone; };
  const employmentFor = (id) => state.data.employments.filter((row) => row.employee_id === id).sort((a,b) => String(b.employment_start_date).localeCompare(a.employment_start_date))[0];
  const assignmentFor = (id) => {
    const employment = employmentFor(id);
    return state.data.assignments.filter((row) => row.employment_id === employment?.employment_id && !row.effective_to).sort((a,b) => Number(b.is_primary)-Number(a.is_primary))[0];
  };
  const issuesFor = (employee) => {
    const employment = employmentFor(employee.employee_id); const assignment = assignmentFor(employee.employee_id);
    const pay = state.data.payTerms.find((row) => row.employee_id === employee.employee_id && row.valid_from <= today() && (!row.valid_to || row.valid_to >= today()));
    return [!employment && "ללא העסקה", !assignment && "ללא שיבוץ", !pay && "ללא תנאי שכר"].filter(Boolean);
  };
  const filtered = () => state.data.employees.filter((employee) => {
    const employment = employmentFor(employee.employee_id); const assignment = assignmentFor(employee.employee_id);
    const search = `${employee.employee_code} ${employee.first_name} ${employee.last_name} ${employee.phone || ""} ${employee.email || ""}`.toLowerCase();
    return (!state.query || search.includes(state.query.toLowerCase())) && (!state.status || employee.lifecycle_status === state.status)
      && (!state.unit || assignment?.allocation_unit_id === state.unit) && (!state.daycare || assignment?.daycare_id === state.daycare);
  }).sort((a,b) => state.sort === "code" ? a.employee_code.localeCompare(b.employee_code,"he") : `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`,"he"));
  const kpis = () => {
    const rows = state.data.employees;
    return [["all","כל העובדים",rows.length],["ACTIVE","פעילים",rows.filter((r)=>r.lifecycle_status==="ACTIVE").length],["attention","דורש טיפול",rows.filter((r)=>issuesFor(r).length).length],["certificates","רישוי לבדיקה",rows.filter((r)=>state.data.employeeCertificates.some((c)=>c.employee_id===r.employee_id && ["MISSING","EXPIRED","REVIEW"].includes(c.status))).length]];
  };
  const renderDetails = () => {
    const employee = state.data.employees.find((row) => row.employee_id === state.selected);
    if (!employee) { $("#wf-details").hidden = true; return; }
    const employments = state.data.employments.filter((row)=>row.employee_id===employee.employee_id);
    const employmentIds = new Set(employments.map((row)=>row.employment_id));
    const payTerms = state.data.payTerms.filter((row)=>row.employee_id===employee.employee_id);
    const payStatus = (row) => row.valid_from > today() ? "עתידי" : row.valid_to && row.valid_to < today() ? "פג תוקף" : "נוכחי";
    const cards = [
      ["פרטים אישיים",`<dl><div><dt>מספר עובד</dt><dd>${esc(employee.employee_code)}</dd></div><div><dt>תעודת זהות</dt><dd>${esc(employee.national_id||"—")}</dd></div><div><dt>טלפון</dt><dd>${esc(employee.phone||"—")}</dd></div><div><dt>דוא״ל</dt><dd>${esc(employee.email||"—")}</dd></div></dl><button class="button button-secondary" data-edit-employee>עריכת פרטים</button>`],
      ["היסטוריית תנאי שכר",`${payTerms.map((row)=>`<p><strong>${money.format(row.base_pay)}</strong> · ${esc(row.pay_type)} · ${payStatus(row)}<br><small>${row.valid_from} – ${row.valid_to||"ללא מועד סיום"}</small></p>`).join("")||"<p>אין תנאי שכר.</p>"}<button class="button button-secondary" data-add-child="pay_term">הוספת גרסה</button>`],
      ["בונוסים וזכאויות",`${state.data.eligibility.filter((row)=>employmentIds.has(row.employment_id)).map((row)=>`<p>${esc(label(state.data.compensationFactors,row.compensation_factor_id,"compensation_factor_id"))} · ${row.effective_from}${row.effective_to?` – ${row.effective_to}`:""}</p>`).join("")||"<p>אין זכאויות.</p>"}<button class="button button-secondary" data-add-child="eligibility">הוספה</button>`],
      ["רישוי והכשרות",`${state.data.employeeCertificates.filter((row)=>row.employee_id===employee.employee_id).map((row)=>`<p>${esc(label(state.data.certificates,row.certificate_type_id,"certificate_type_id"))} · ${esc(row.status)}${row.expires_on?` · עד ${row.expires_on}`:""}</p>`).join("")||"<p>אין רשומות רישוי.</p>"}<button class="button button-secondary" data-add-child="certificate">הוספה</button>`],
      ["חופשות והיעדרויות",`${state.data.leave.filter((row)=>employmentIds.has(row.employment_id)).map((row)=>`<p>${esc(row.leave_type)} · ${row.starts_on}${row.ends_on?` – ${row.ends_on}`:""}</p>`).join("")||"<p>אין תקופות היעדרות.</p>"}<button class="button button-secondary" data-add-child="leave">הוספה</button>`],
      ["מסמכים",'<div class="attachment-placeholder"><span>📎</span><div><strong>מסמכי עובד</strong><small>placeholder בלבד — טרם אושר חוזה Storage.</small></div></div>'],
    ];
    $("#wf-details").hidden = false;
    $("#wf-details").innerHTML = `<header><div><p class="eyebrow">כרטיס עובד</p><h2>${esc(employee.first_name)} ${esc(employee.last_name)}</h2></div><button data-close-details>×</button></header><div class="workforce-detail-grid">${cards.map(([title,body])=>`<section><h3>${title}</h3>${body}</section>`).join("")}</div><div class="dialog-actions"><button class="button button-danger" data-archive-employee>העברה לארכיון</button></div>`;
    $("[data-close-details]").onclick = () => { state.selected=""; renderDetails(); };
    $("[data-edit-employee]").onclick = () => employeeDialog(employee);
    $("[data-archive-employee]").onclick = async () => { if (!confirm("להעביר את העובד לארכיון?")) return; await request("employees","POST",{action:"delete_employee",employee_id:employee.employee_id}); await reload(); };
    document.querySelectorAll("[data-add-child]").forEach((button)=>button.onclick=()=>childDialog(employee,button.dataset.addChild));
  };
  const employeeDialog = (employee={}) => {
    $("#wf-dialog-content").innerHTML = `<h2>${employee.employee_id?"עריכת עובד":"עובד חדש"}</h2><form id="wf-form" class="workforce-form"><label>מספר עובד<input name="employee_code" required value="${esc(employee.employee_code||"")}"></label><label>שם פרטי<input name="first_name" required value="${esc(employee.first_name||"")}"></label><label>שם משפחה<input name="last_name" required value="${esc(employee.last_name||"")}"></label><label>תעודת זהות<input name="national_id" value="${esc(employee.national_id||"")}"></label><label>טלפון<input name="phone" value="${esc(employee.phone||"")}"></label><label>דוא״ל<input name="email" type="email" value="${esc(employee.email||"")}"></label><label>תאריך לידה<input name="birth_date" type="date" value="${esc(employee.birth_date||"")}"></label><label>סטטוס<select name="lifecycle_status"><option value="ACTIVE">פעיל</option><option value="INACTIVE">לא פעיל</option><option value="ARCHIVED">בארכיון</option></select></label><label class="wide">הערות<textarea name="notes">${esc(employee.notes||"")}</textarea></label><div class="dialog-actions wide"><button class="button button-primary">שמירה</button></div></form>`;
    $("#wf-form").lifecycle_status.value=employee.lifecycle_status||"ACTIVE"; $("#wf-dialog").showModal();
    bindFormAutosave({
      form: $("#wf-form"),
      key: `workforce.employee.${employee.employee_id || "new"}`,
      save: async (body) => request("employees","POST",{action:"save_employee",employee_id:employee.employee_id,...body}),
      onSaved: async (result) => { if (result?.employee?.employee_id) employee.employee_id=result.employee.employee_id; await reload(); },
      closeOnManual: true,
    });
  };
  const childDialog = (employee,type) => {
    const employment=employmentFor(employee.employee_id);
    const definitions = {
      pay_term:["תנאי שכר חדשים",`<input type="hidden" name="employee_id" value="${employee.employee_id}"><label>מתאריך<input name="valid_from" type="date" required></label><label>עד תאריך<input name="valid_to" type="date"></label><label>סוג שכר<select name="pay_type"><option value="HOURLY">שעתי</option><option value="SALARY">חודשי</option></select></label><label>שכר בסיס<input name="base_pay" type="number" step=".01" required></label><label>אחוז משרה<input name="estimated_employment_percentage" type="number" step=".01"></label><label class="wide">הערות<textarea name="notes"></textarea></label>`,"save_pay_term"],
      eligibility:["זכאות/בונוס",`<input type="hidden" name="employment_id" value="${employment?.employment_id||""}"><label>גורם פיצוי<select name="compensation_factor_id" required>${optionRows(state.data.compensationFactors,"compensation_factor_id")}</select></label><label>מתאריך<input name="effective_from" type="date" required></label><label>עד תאריך<input name="effective_to" type="date"></label><label>סטטוס<select name="eligibility_status"><option value="ELIGIBLE">זכאי</option><option value="NOT_ELIGIBLE">לא זכאי</option><option value="SUSPENDED">מושהה</option></select></label><label class="wide">הערות<textarea name="notes"></textarea></label>`,"save_eligibility"],
      certificate:["רישוי/הכשרה",`<input type="hidden" name="employee_id" value="${employee.employee_id}"><label>סוג<select name="certificate_type_id" required>${optionRows(state.data.certificates,"certificate_type_id")}</select></label><label>סטטוס<select name="status"><option value="VALID">תקף</option><option value="REVIEW">לבדיקה</option><option value="MISSING">חסר</option><option value="EXPIRED">פג תוקף</option></select></label><label>הונפק<input name="issued_on" type="date"></label><label>בתוקף עד<input name="expires_on" type="date"></label><label class="wide">הערות<textarea name="notes"></textarea></label>`,"save_certificate"],
      leave:["חופשה/היעדרות",`<input type="hidden" name="employment_id" value="${employment?.employment_id||""}"><label>סוג<select name="leave_type"><option value="MATERNITY">לידה</option><option value="SICK_OR_ACCIDENT">מחלה/תאונה</option><option value="UNPAID">חל״ת</option><option value="OTHER">אחר</option></select></label><label>מתאריך<input name="starts_on" type="date" required></label><label>עד תאריך<input name="ends_on" type="date"></label><label class="wide">הערות<textarea name="notes"></textarea></label>`,"save_leave"],
    };
    const [title,fields,action]=definitions[type]; $("#wf-dialog-content").innerHTML=`<h2>${title}</h2><form id="wf-child-form" class="workforce-form">${fields}<div class="dialog-actions wide"><button class="button button-primary">שמירה</button></div></form>`;$("#wf-dialog").showModal();
    const childIdFields={pay_term:"employee_pay_term_id",eligibility:"employee_compensation_eligibility_id",certificate:"employee_certificate_id",leave:"employee_leave_period_id"};
    let recordId="";
    bindFormAutosave({
      form: $("#wf-child-form"),
      key: `workforce.${type}.${employee.employee_id}.new`,
      save: async (record) => request("employees","POST",{action,record:{...record,[childIdFields[type]]:recordId}}),
      onSaved: async (result) => { recordId=result?.record?.[childIdFields[type]] || recordId; await reload(); },
      closeOnManual: true,
    });
  };
  const render = () => {
    $("#wf-kpis").innerHTML=kpis().map(([id,title,value])=>`<button data-kpi="${id}"><strong>${value}</strong><span>${title}</span><small>פתיחת מסנן</small></button>`).join("");
    $("#wf-head").innerHTML='<tr><th class="bank-sticky-number">מס׳ עובד</th><th>שם</th><th>סטטוס</th><th>מחלקה</th><th>מעון</th><th>תפקיד</th><th>טלפון</th><th>מצב נתונים</th><th>פעולות</th></tr>';
    const rows=filtered(); $("#wf-count").textContent=`${rows.length} עובדים`;
    $("#wf-rows").innerHTML=rows.map((employee)=>{const assignment=assignmentFor(employee.employee_id);const issues=issuesFor(employee);return `<tr data-id="${employee.employee_id}" class="${issues.length?"bank-row-missing":"bank-row-complete"}"><td class="bank-sticky-number"><strong>${esc(employee.employee_code)}</strong></td><td>${esc(employee.first_name)} ${esc(employee.last_name)}</td><td>${statusLabel[employee.lifecycle_status]||employee.lifecycle_status}</td><td>${esc(label(state.data.units,assignment?.allocation_unit_id,"allocation_unit_id"))}</td><td>${esc(label(state.data.daycares,assignment?.daycare_id,"daycare_id"))}</td><td>${esc(label(state.data.roles,assignment?.role_id,"role_id"))}</td><td>${esc(employee.phone||"—")}</td><td><span class="bank-row-status ${issues.length?"missing":"complete"}">${issues.join(", ")||"תקין"}</span></td><td><button class="button button-quiet" data-open="${employee.employee_id}">פרטים</button></td></tr>`;}).join("");
    document.querySelectorAll("[data-open]").forEach((button)=>button.onclick=()=>{state.selected=button.dataset.open;renderDetails();});
    document.querySelectorAll("[data-kpi]").forEach((button)=>button.onclick=()=>{const id=button.dataset.kpi;if(["ACTIVE","INACTIVE","ARCHIVED"].includes(id))state.status=id;else if(id==="all")state.status="";render();});
    renderDetails();
  };
  const reload=async()=>{state.data=await request("employees");render();};
  $("#wf-status").innerHTML='<option value="">כל הסטטוסים</option><option value="ACTIVE">פעילים</option><option value="INACTIVE">לא פעילים</option><option value="ARCHIVED">ארכיון</option>';
  $("#wf-unit").innerHTML='<option value="">כל המחלקות</option>'+optionRows(state.data.units,"allocation_unit_id").replace('<option value="">בחירה…</option>','');
  $("#wf-daycare").innerHTML='<option value="">כל המעונות</option>'+optionRows(state.data.daycares,"daycare_id").replace('<option value="">בחירה…</option>','');
  $("#wf-search").oninput=(e)=>{state.query=e.target.value;render();};$("#wf-status").onchange=(e)=>{state.status=e.target.value;render();};$("#wf-unit").onchange=(e)=>{state.unit=e.target.value;$("#wf-daycare").innerHTML='<option value="">כל המעונות</option>'+optionRows(state.data.daycares,"daycare_id","",(d)=>!state.unit||d.allocation_unit_id===state.unit).replace('<option value="">בחירה…</option>','');render();};$("#wf-daycare").onchange=(e)=>{state.daycare=e.target.value;render();};
  $("#wf-clear").onclick=()=>{state.query=state.status=state.unit=state.daycare="";document.querySelectorAll("#wf-search,#wf-status,#wf-unit,#wf-daycare").forEach((node)=>node.value="");render();};
  $("#wf-add").onclick=()=>employeeDialog(); $("#wf-export").onclick=()=>csv(filtered(),[["מספר עובד","employee_code"],["שם",r=>`${r.first_name} ${r.last_name}`],["סטטוס","lifecycle_status"],["טלפון","phone"],["דוא״ל","email"]],`עובדים-${today()}.csv`);
  render(); message("הנתונים נטענו מ-Supabase בלבד.","success");
}

export async function mountPayrollWorkbench(request) {
  const state={data:null,selected:"",query:"",status:"",unit:"",daycare:"",month:new Date().toISOString().slice(0,7),drafts:new Map(),allocationAutosave:null};
  const $=(selector)=>document.querySelector(selector); const message=(text,tone="")=>{$("#wf-message").textContent=text;$("#wf-message").className=tone;};
  const reload=async()=>{state.data=await request("payroll","GET",null,state.month);render();};
  const employeeFor=(record)=>{const employment=state.data.employments.find((row)=>row.employment_id===record.employment_id);return state.data.employees.find((row)=>row.employee_id===employment?.employee_id);};
  const allocationsFor=(id)=>state.drafts.get(id)||state.data.allocations.filter((row)=>row.payroll_record_id===id);
  const inspect=(record)=>{const rows=allocationsFor(record.payroll_record_id);const cost=rows.reduce((s,r)=>s+Number(r.allocation_amount||0),0);const hours=rows.reduce((s,r)=>s+Number(r.allocated_hours||0),0);const sourceHours=sumHours(record);return{rows,cost,hours,costGap:Number(record.employer_cost)-cost,hoursGap:sourceHours-hours,balanced:rows.length>0&&Math.abs(Number(record.employer_cost)-cost)<=.01&&Math.abs(sourceHours-hours)<=.01};};
  const filtered=()=>state.data.records.filter((record)=>{const employee=employeeFor(record);const rows=allocationsFor(record.payroll_record_id);const search=`${record.source_employee_identifier} ${employee?.first_name||""} ${employee?.last_name||""}`.toLowerCase();return(!state.query||search.includes(state.query.toLowerCase()))&&(!state.status||record.employee_match_status===state.status)&&(!state.unit||rows.some((r)=>r.allocation_unit_id===state.unit))&&(!state.daycare||rows.some((r)=>r.daycare_id===state.daycare));});
  const emptyAllocation=()=>({allocation_unit_id:"",daycare_id:"",role_id:"",allocation_amount:"",allocated_hours:"",effective_note:"",allocation_status:"DRAFT"});
  const detail=()=>{state.allocationAutosave?.destroy();state.allocationAutosave=null;const record=state.data.records.find((row)=>row.payroll_record_id===state.selected);if(!record){$("#wf-details").hidden=true;return;}const restored=readAutosaveDraft(`workforce.payroll.allocations.${record.payroll_record_id}`);if(restored&&!state.drafts.has(record.payroll_record_id))state.drafts.set(record.payroll_record_id,restored);const employee=employeeFor(record);const info=inspect(record);const rows=info.rows.length?info.rows:[emptyAllocation()];$("#wf-details").hidden=false;$("#wf-details").innerHTML=`<header><div><p class="eyebrow">רשומת אב</p><h2>${esc(employee?`${employee.first_name} ${employee.last_name}`:record.source_employee_identifier)}</h2><p>${record.payroll_month.slice(0,7)} · ${statusLabel[record.employee_match_status]}</p></div><button data-close-details>×</button></header><div class="payroll-balance"><span>עלות אב <strong>${money.format(record.employer_cost)}</strong></span><span>פוצל <strong>${money.format(info.cost)}</strong></span><span>פער עלות <strong>${money.format(info.costGap)}</strong></span><span>שעות אב <strong>${number.format(sumHours(record))}</strong></span><span>פער שעות <strong>${number.format(info.hoursGap)}</strong></span></div><h3>פיצול למחלקה / מעון</h3><div id="payroll-allocation-editor">${rows.map((row,index)=>`<div class="allocation-editor-row" data-index="${index}"><label>מחלקה<select name="allocation_unit_id">${optionRows(state.data.units,"allocation_unit_id",row.allocation_unit_id)}</select></label><label>מעון<select name="daycare_id">${optionRows(state.data.daycares,"daycare_id",row.daycare_id,(d)=>!row.allocation_unit_id||d.allocation_unit_id===row.allocation_unit_id)}</select></label><label>תפקיד<select name="role_id">${optionRows(state.data.roles,"role_id",row.role_id)}</select></label><label>עלות שכר<input name="allocation_amount" type="number" step=".01" value="${esc(row.allocation_amount)}"></label><label>שעות<input name="allocated_hours" type="number" step=".01" value="${esc(row.allocated_hours)}"></label><label class="allocation-notes">הערה<input name="effective_note" value="${esc(row.effective_note||"")}"></label>${index?'<button class="allocation-delete" data-delete-allocation>מחיקת פיצול</button>':""}</div>`).join("")}</div><div class="dialog-actions"><span class="autosave-status" data-payroll-autosave role="status"></span><button class="button button-secondary" data-add-allocation>+ פיצול</button><button class="button button-primary" data-save-allocations>שמירת פיצולים</button>${record.employee_match_status!=="LINKED"?'<button class="button button-secondary" data-approve-temporary>אישור עובד זמני</button>':""}<button class="button button-danger" data-delete-record>מחיקת רשומה</button></div><section><h3>אישור זמני</h3><p>${record.temporary_approved_at?`אושר ב-${new Date(record.temporary_approved_at).toLocaleString("he-IL")} · ${esc(record.temporary_approval_notes||"ללא הערה")}`:"לא אושר זמנית."}</p></section>`;
    const collect=()=>[...document.querySelectorAll("[data-index]")].map((node)=>Object.fromEntries([...node.querySelectorAll("input,select")].map((input)=>[input.name,input.value])));
    const validAllocations=(values)=>values.length>0&&values.every((row)=>row.allocation_unit_id&&row.role_id&&row.allocation_amount!==""&&row.allocated_hours!=="")&&Math.abs(values.reduce((sum,row)=>sum+Number(row.allocation_amount),0)-Number(record.employer_cost))<=.01&&Math.abs(values.reduce((sum,row)=>sum+Number(row.allocated_hours),0)-sumHours(record))<=.01;
    state.allocationAutosave=createAutosave({key:`workforce.payroll.allocations.${record.payroll_record_id}`,read:collect,validate:validAllocations,statusTargets:()=>document.querySelectorAll("[data-payroll-autosave]"),save:(allocations)=>request("payroll","POST",{action:"save_allocations",payroll_record_id:record.payroll_record_id,allocations}),onSaved:async()=>{state.drafts.delete(record.payroll_record_id);await reload();state.selected=record.payroll_record_id;}});
    document.querySelectorAll("#payroll-allocation-editor input").forEach((input)=>input.oninput=()=>{state.drafts.set(record.payroll_record_id,collect());state.allocationAutosave.markDirty();});
    document.querySelectorAll("#payroll-allocation-editor select").forEach((select)=>select.onchange=()=>{if(select.name==="allocation_unit_id"){const daycare=select.closest("[data-index]").querySelector('[name="daycare_id"]');daycare.innerHTML=optionRows(state.data.daycares,"daycare_id","",(d)=>!select.value||d.allocation_unit_id===select.value);}state.drafts.set(record.payroll_record_id,collect());state.allocationAutosave.markDirty({immediate:true});});
    $("[data-close-details]").onclick=()=>{state.selected="";detail();};$("[data-add-allocation]").onclick=()=>{const values=[...collect(),emptyAllocation()];state.drafts.set(record.payroll_record_id,values);detail();state.allocationAutosave.markDirty();};document.querySelectorAll("[data-delete-allocation]").forEach((button)=>button.onclick=()=>{const rows=collect();rows.splice(Number(button.closest("[data-index]").dataset.index),1);state.drafts.set(record.payroll_record_id,rows);detail();state.allocationAutosave.markDirty();});
    $("[data-save-allocations]").onclick=async()=>{try{await state.allocationAutosave.saveNow({manual:true});message("הפיצול נשמר.","success");}catch(error){message(error.message,"error");}};
    $("[data-approve-temporary]")?.addEventListener("click",async()=>{const notes=prompt("הערות לאישור הזמני:")||"";await request("payroll","POST",{action:"approve_temporary",payroll_record_id:record.payroll_record_id,notes});await reload();state.selected=record.payroll_record_id;detail();});
    $("[data-delete-record]").onclick=async()=>{if(!confirm("למחוק את רשומת השכר והפיצולים?"))return;await request("payroll","POST",{action:"delete_record",payroll_record_id:record.payroll_record_id});state.selected="";await reload();};
  };
  function recordDialog(record={}){$("#wf-dialog-content").innerHTML=`<h2>${record.payroll_record_id?"עריכת רשומה":"רשומת שכר ידנית"}</h2><form id="wf-form" class="workforce-form"><label>חודש<input name="payroll_month" type="month" required value="${esc(record.payroll_month?.slice(0,7)||state.month)}"></label><label>מספר עובד<input name="source_employee_identifier" required value="${esc(record.source_employee_identifier||"")}"></label><label>עלות מעסיק<input name="employer_cost" type="number" min="0" step=".01" required value="${esc(record.employer_cost??"")}"></label><label>ברוטו<input name="gross_pay" type="number" step=".01" value="${esc(record.gross_pay??"")}"></label><label>שעות רגילות<input name="regular_hours" type="number" step=".01" value="${esc(record.regular_hours??"")}"></label><label>שעות נוספות<input name="overtime_hours" type="number" step=".01" value="${esc(record.overtime_hours??"")}"></label><label class="wide">הערות<textarea name="notes">${esc(record.notes||"")}</textarea></label><div class="dialog-actions wide"><button class="button button-primary">שמירה</button></div></form>`;$("#wf-dialog").showModal();bindFormAutosave({form:$("#wf-form"),key:`workforce.payroll.record.${record.payroll_record_id||"new"}`,save:async(body)=>request("payroll","POST",{action:"save_record",payroll_record_id:record.payroll_record_id,import_batch_id:record.import_batch_id,record_origin:"MANUAL",...body}),onSaved:async(result,body)=>{if(result?.record){record.payroll_record_id=result.record.payroll_record_id;record.import_batch_id=result.record.import_batch_id;}state.month=body.payroll_month;$("#wf-month").value=state.month;await reload();},closeOnManual:true});}
  function render(){const rows=filtered();const all=state.data.records;const kpis=[["","כל הרשומות",all.length],["LINKED","מקושרים",all.filter((r)=>r.employee_match_status==="LINKED").length],["MISSING","עובדים חסרים",all.filter((r)=>r.employee_match_status==="MISSING").length],["APPROVED_TEMPORARY","זמניים מאושרים",all.filter((r)=>r.employee_match_status==="APPROVED_TEMPORARY").length],["UNRESOLVED","לא פתורים",all.filter((r)=>r.employee_match_status==="UNRESOLVED").length]];$("#wf-kpis").innerHTML=kpis.map(([id,title,value])=>`<button data-kpi="${id}"><strong>${value}</strong><span>${title}</span><small>פתיחת מסנן</small></button>`).join("");$("#wf-head").innerHTML='<tr><th class="bank-sticky-number">מס׳ עובד</th><th>עובד</th><th>חודש</th><th>עלות מעסיק</th><th>שעות</th><th>סטטוס התאמה</th><th>מחלקה</th><th>מעון</th><th>פיצול</th><th>פעולות</th></tr>';$("#wf-count").textContent=`${rows.length} רשומות`;$("#wf-rows").innerHTML=rows.map((record)=>{const employee=employeeFor(record);const info=inspect(record);return`<tr class="${info.balanced?"bank-row-complete":record.employee_match_status==="MISSING"?"bank-row-error":"bank-row-missing"}"><td class="bank-sticky-number">${esc(record.source_employee_identifier)}</td><td>${esc(employee?`${employee.first_name} ${employee.last_name}`:"לא נמצא")}</td><td>${record.payroll_month.slice(0,7)}</td><td>${money.format(record.employer_cost)}</td><td>${number.format(sumHours(record))}</td><td><span class="bank-row-status ${record.employee_match_status==="LINKED"?"complete":record.employee_match_status==="MISSING"?"error":"missing"}">${statusLabel[record.employee_match_status]}</span></td><td>${esc(label(state.data.units,info.rows[0]?.allocation_unit_id,"allocation_unit_id"))}</td><td>${esc(label(state.data.daycares,info.rows[0]?.daycare_id,"daycare_id"))}</td><td>${info.rows.length} · ${info.balanced?"מאוזן":"פער"}</td><td><button class="button button-quiet" data-open="${record.payroll_record_id}">פרטים</button><button class="button button-quiet" data-edit="${record.payroll_record_id}">עריכה</button></td></tr>`;}).join("");document.querySelectorAll("[data-open]").forEach((b)=>b.onclick=()=>{state.selected=b.dataset.open;detail();});document.querySelectorAll("[data-edit]").forEach((b)=>b.onclick=()=>recordDialog(state.data.records.find((r)=>r.payroll_record_id===b.dataset.edit)));document.querySelectorAll("[data-kpi]").forEach((b)=>b.onclick=()=>{state.status=b.dataset.kpi;$("#wf-status").value=state.status;render();});detail();}
  state.data=await request("payroll","GET",null,state.month);
  $("#wf-status").innerHTML='<option value="">כל הסטטוסים</option>'+Object.entries(statusLabel).filter(([k])=>["LINKED","MISSING","APPROVED_TEMPORARY","UNRESOLVED"].includes(k)).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");$("#wf-unit").innerHTML='<option value="">כל המחלקות</option>'+optionRows(state.data.units,"allocation_unit_id").replace('<option value="">בחירה…</option>','');$("#wf-daycare").innerHTML='<option value="">כל המעונות</option>'+optionRows(state.data.daycares,"daycare_id").replace('<option value="">בחירה…</option>','');$("#wf-month").value=state.month;$("#wf-month").onchange=async(e)=>{state.month=e.target.value;await reload();};$("#wf-search").oninput=e=>{state.query=e.target.value;render();};$("#wf-status").onchange=e=>{state.status=e.target.value;render();};$("#wf-unit").onchange=e=>{state.unit=e.target.value;render();};$("#wf-daycare").onchange=e=>{state.daycare=e.target.value;render();};$("#wf-clear").onclick=()=>{state.query=state.status=state.unit=state.daycare="";["#wf-search","#wf-status","#wf-unit","#wf-daycare"].forEach((s)=>$(s).value="");render();};$("#wf-add").onclick=()=>recordDialog();$("#wf-export").onclick=()=>csv(filtered(),[["חודש","payroll_month"],["מספר עובד","source_employee_identifier"],["עלות מעסיק","employer_cost"],["שעות",sumHours],["סטטוס","employee_match_status"]],`ביצוע-שכר-${state.month}.csv`);
  $("#wf-import").onclick=()=>$("#wf-file").click();$("#wf-file").onchange=async(e)=>{try{const file=e.target.files[0];if(!file)return;message("קורא את הקובץ…");const rows=await parsePayrollWorkbook(file);const preview=await request("payroll","POST",{action:"preview_import",rows});$("#wf-dialog-content").innerHTML=`<h2>תצוגה מקדימה לייבוא</h2><div class="import-summary"><span>${preview.summary.total} שורות</span><span>${preview.summary.linked} מקושרות</span><span>${preview.summary.missing} חסרות</span></div><div class="import-preview-scroll"><table><thead><tr><th>שורה</th><th>מס׳ עובד</th><th>עובד</th><th>חודש</th><th>עלות</th><th>מצב</th></tr></thead><tbody>${preview.rows.map((r)=>`<tr class="${r.importable?"":"import-skip"}"><td>${r.source_row_number}</td><td>${esc(r.employee_number)}</td><td>${esc(r.employee_name||"—")}</td><td>${esc(r.payroll_month)}</td><td>${Number.isFinite(r.employer_cost)?money.format(r.employer_cost):"לא תקין"}</td><td>${statusLabel[r.employee_match_status]}${r.importable?"":" · דילוג"}</td></tr>`).join("")}</tbody></table></div><div class="dialog-actions"><button id="wf-confirm-import" class="button button-primary">אישור ייבוא</button></div>`;$("#wf-dialog").showModal();$("#wf-confirm-import").onclick=async()=>{for(const row of preview.rows.filter((r)=>r.importable))await request("payroll","POST",{action:"save_record",record_origin:"IMPORT",source_file_name:file.name,preview_token:preview.preview_token,source_payload:{source_row_number:row.source_row_number},...row});$("#wf-dialog").close();await reload();message("הייבוא הושלם.","success");};}catch(error){message(error.message,"error");}};
  render();message("הנתונים נטענו מ-Supabase בלבד.","success");
}
