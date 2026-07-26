import { bindFormAutosave } from "./autosave.js";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" })[char]);
const money = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);
const statusLabels = { ACTIVE:"פעיל", INACTIVE:"לא פעיל", ARCHIVED:"בארכיון" };
const payTypeLabels = { HOURLY:"שעתי", SALARY:"חודשי", MONTHLY:"חודשי" };
const employmentStatusLabels = { ACTIVE:"פעילה", SUSPENDED:"מושהית", ENDED:"הסתיימה" };
const optionRows = (rows, key, selected = "", filter = () => true) =>
  `<option value="">בחירה…</option>${rows.filter(filter).map((row) => `<option value="${row[key]}" ${row[key] === selected ? "selected" : ""}>${esc(row.display_name)}</option>`).join("")}`;
const rowLabel = (rows, id, key) => rows.find((row) => row[key] === id)?.display_name || "—";

export async function mountEmployeesWorkbench(request) {
  const state = { data:await request("employees"), selected:"", selectedRows:new Set(), newRow:false, query:"", status:"", unit:"", daycare:"", sort:"name", direction:1, attention:false };
  const $ = (selector) => document.querySelector(selector);
  const message = (text, tone="") => { $("#wf-message").textContent=text; $("#wf-message").className=tone; };
  const employmentFor = (employeeId) => state.data.employments.filter((row) => row.employee_id === employeeId)
    .sort((a,b) => Number(b.employment_status === "ACTIVE") - Number(a.employment_status === "ACTIVE") || String(b.employment_start_date).localeCompare(String(a.employment_start_date)))[0];
  const assignmentFor = (employeeId) => {
    const employment = employmentFor(employeeId);
    return state.data.assignments.filter((row) => row.employment_id === employment?.employment_id)
      .sort((a,b) => Number(b.is_primary) - Number(a.is_primary) || String(b.effective_from).localeCompare(String(a.effective_from)))[0];
  };
  const classroomDaycare = (classroom) => state.data.daycareSchoolYears.find((row) => row.daycare_school_year_id === classroom?.daycare_school_year_id)?.daycare_id;
  const classroomsFor = (daycareId) => state.data.classrooms.filter((row) => classroomDaycare(row) === daycareId);
  const issuesFor = (employee) => {
    const employment=employmentFor(employee.employee_id), assignment=assignmentFor(employee.employee_id);
    const pay=state.data.payTerms.find((row)=>row.employee_id===employee.employee_id && row.valid_from<=today() && (!row.valid_to || row.valid_to>=today()));
    return [!employment&&"ללא העסקה",!assignment&&"ללא שיבוץ",!pay&&"ללא תנאי שכר",!employee.phone&&"חסר טלפון"].filter(Boolean);
  };
  const valueForSort = (employee) => {
    const employment=employmentFor(employee.employee_id), assignment=assignmentFor(employee.employee_id);
    return {
      code:employee.employee_code, name:`${employee.last_name} ${employee.first_name}`,
      role:rowLabel(state.data.roles,assignment?.role_id,"role_id"),
      daycare:rowLabel(state.data.daycares,assignment?.daycare_id,"daycare_id"),
      classroom:rowLabel(state.data.classrooms,assignment?.classroom_id,"classroom_id"),
      phone:employee.phone||"", status:employee.lifecycle_status,
      seniority:Number(employment?.recognized_prior_seniority_months||0),
      start:employment?.employment_start_date||"",
    }[state.sort];
  };
  const filtered = () => state.data.employees.filter((employee) => {
    const assignment=assignmentFor(employee.employee_id);
    const haystack=`${employee.employee_code} ${employee.first_name} ${employee.last_name} ${employee.phone||""} ${rowLabel(state.data.roles,assignment?.role_id,"role_id")} ${rowLabel(state.data.daycares,assignment?.daycare_id,"daycare_id")}`.toLowerCase();
    return (!state.query || haystack.includes(state.query.toLowerCase()))
      && (!state.status || employee.lifecycle_status===state.status)
      && (!state.unit || assignment?.allocation_unit_id===state.unit)
      && (!state.daycare || assignment?.daycare_id===state.daycare)
      && (!state.attention || issuesFor(employee).length);
  }).sort((a,b)=>String(valueForSort(a)).localeCompare(String(valueForSort(b)),"he",{numeric:true})*state.direction);
  const reload = async () => { state.data=await request("employees"); render(); };
  const saveInline = async (employee, field, value) => {
    employee[field] = value;
    message("שומר…");
    try {
      await request("employees","POST",{action:"save_employee",employee_id:employee.employee_id,...employee});
      message("השינויים נשמרו אוטומטית.","success");
    } catch (error) {
      message(`השמירה נכשלה: ${error.message}`,"error");
      await reload();
    }
  };
  const archiveRows = async (ids) => {
    if (!ids.length || !confirm(`להעביר ${ids.length} עובדים לארכיון? ההיסטוריה תישמר.`)) return;
    message("מעביר לארכיון…");
    for (const id of ids) {
      const employee=state.data.employees.find((row)=>row.employee_id===id);
      if (employee) await request("employees","POST",{action:"save_employee",employee_id:id,...employee,lifecycle_status:"ARCHIVED"});
    }
    state.selectedRows.clear();
    await reload();
    message("העובדים הועברו לארכיון.","success");
  };
  const showDialog = (title, fields, onSubmit, key) => {
    $("#wf-dialog-content").innerHTML=`<h2>${title}</h2><form id="wf-form" class="workforce-form">${fields}<div class="dialog-actions wide"><button class="button button-primary">שמירה</button></div></form>`;
    $("#wf-dialog").showModal();
    bindFormAutosave({ form:$("#wf-form"), key, save:onSubmit, onSaved:reload, closeOnManual:true });
  };
  const employeeDialog = (employee={}) => showDialog(employee.employee_id?"עריכת עובד":"עובד חדש",`
    <label>מספר עובד<input name="employee_code" required value="${esc(employee.employee_code||"")}"></label>
    <label>שם פרטי<input name="first_name" required value="${esc(employee.first_name||"")}"></label>
    <label>שם משפחה<input name="last_name" required value="${esc(employee.last_name||"")}"></label>
    <label>תעודת זהות<input name="national_id" value="${esc(employee.national_id||"")}"></label>
    <label>טלפון<input name="phone" value="${esc(employee.phone||"")}"></label>
    <label>דוא״ל<input name="email" type="email" value="${esc(employee.email||"")}"></label>
    <label>תאריך לידה<input name="birth_date" type="date" value="${esc(employee.birth_date||"")}"></label>
    <label>מנהל/ת<select name="manager_employee_id">${optionRows(state.data.employees.map((row)=>({...row,display_name:`${row.first_name} ${row.last_name} · ${row.employee_code}`})),"employee_id",employee.manager_employee_id,(row)=>row.lifecycle_status==="ACTIVE"&&row.employee_id!==employee.employee_id)}</select></label>
    <label>סטטוס<select name="lifecycle_status">${Object.entries(statusLabels).map(([value,label])=>`<option value="${value}" ${value===(employee.lifecycle_status||"ACTIVE")?"selected":""}>${label}</option>`).join("")}</select></label>
    <label class="wide">הערות<textarea name="notes">${esc(employee.notes||"")}</textarea></label>`,
    (body)=>request("employees","POST",{action:"save_employee",employee_id:employee.employee_id,...body}),`workforce.employee.${employee.employee_id||"new"}`);
  const employmentDialog = (employee,employment={}) => showDialog(employment.employment_id?"עריכת העסקה":"העסקה חדשה",`
    <input type="hidden" name="employee_id" value="${employee.employee_id}">
    <label>ישות מעסיקה<select name="legal_entity_id" required>${optionRows(state.data.entities,"legal_entity_id",employment.legal_entity_id)}</select></label>
    <label>תחילת העסקה<input name="employment_start_date" type="date" required value="${esc(employment.employment_start_date||"")}"></label>
    <label>סיום העסקה<input name="employment_end_date" type="date" value="${esc(employment.employment_end_date||"")}"></label>
    <label>וותק קודם מוכר בחודשים<input name="recognized_prior_seniority_months" type="number" min="0" required value="${esc(employment.recognized_prior_seniority_months??0)}"></label>
    <label>סטטוס<select name="employment_status">${Object.entries(employmentStatusLabels).map(([value,label])=>`<option value="${value}" ${value===(employment.employment_status||"ACTIVE")?"selected":""}>${label}</option>`).join("")}</select></label>
    <label>סוג העסקה<input name="employment_type_code" value="${esc(employment.employment_type_code||"")}"></label>
    <label>שעות חודשיות ברירת מחדל<input name="default_monthly_hours" type="number" min="0" step=".01" value="${esc(employment.default_monthly_hours??"")}"></label>
    <label class="wide">הערות<textarea name="notes">${esc(employment.notes||"")}</textarea></label>`,
    (record)=>request("employees","POST",{action:"save_employment",record:{...record,employment_id:employment.employment_id}}),`workforce.employment.${employment.employment_id||employee.employee_id}`);
  const assignmentDialog = (employee,assignment={}) => {
    const employment=employmentFor(employee.employee_id);
    showDialog(assignment.assignment_id?"עריכת שיבוץ":"שיבוץ חדש",`
      <input type="hidden" name="employment_id" value="${employment?.employment_id||""}">
      <label>מחלקה<select name="allocation_unit_id" required>${optionRows(state.data.units,"allocation_unit_id",assignment.allocation_unit_id)}</select></label>
      <label>מעון<select name="daycare_id">${optionRows(state.data.daycares,"daycare_id",assignment.daycare_id)}</select></label>
      <label>כיתה<select name="classroom_id">${optionRows(classroomsFor(assignment.daycare_id),"classroom_id",assignment.classroom_id)}</select></label>
      <label>תפקיד<select name="role_id" required>${optionRows(state.data.roles,"role_id",assignment.role_id)}</select></label>
      <label>מתאריך<input name="effective_from" type="date" required value="${esc(assignment.effective_from||today())}"></label>
      <label>עד תאריך<input name="effective_to" type="date" value="${esc(assignment.effective_to||"")}"></label>
      <label><input name="is_primary" type="checkbox" ${assignment.is_primary!==false?"checked":""}> שיבוץ ראשי</label>
      <label class="wide">הערות<textarea name="notes">${esc(assignment.notes||"")}</textarea></label>`,
      (record)=>request("employees","POST",{action:"save_assignment",record:{...record,is_primary:record.is_primary==="on",assignment_id:assignment.assignment_id}}),`workforce.assignment.${assignment.assignment_id||employee.employee_id}`);
    const daycare=$("#wf-form [name=daycare_id]"), classroom=$("#wf-form [name=classroom_id]");
    daycare.onchange=()=>{ classroom.innerHTML=optionRows(classroomsFor(daycare.value),"classroom_id"); };
  };
  const payTermDialog = (employee,term={}) => showDialog(term.employee_pay_term_id?"גרסה חדשה על בסיס תנאים קיימים":"גרסת תנאי שכר חדשה",`
    <label>מתאריך<input name="valid_from" type="date" required value="${term.employee_pay_term_id?"":esc(term.valid_from||today())}"></label>
    <label>עד תאריך<input name="valid_to" type="date" value="${esc(term.valid_to||"")}"></label>
    <label>סוג שכר<select name="pay_type"><option value="HOURLY" ${term.pay_type==="HOURLY"?"selected":""}>שעתי</option><option value="SALARY" ${term.pay_type!=="HOURLY"?"selected":""}>חודשי</option></select></label>
    <label>שכר בסיס<input name="base_pay" type="number" min="0" step=".01" required value="${esc(term.base_pay??"")}"></label>
    <label>אחוז משרה<input name="estimated_employment_percentage" type="number" min="0" step=".01" value="${esc(term.estimated_employment_percentage??"")}"></label>
    <label class="wide">הערות<textarea name="notes">${esc(term.notes||"")}</textarea></label>`,
    (record)=>request("employees","POST",{action:"version_pay_term",employee_id:employee.employee_id,record}),`workforce.pay-term.${employee.employee_id}.new`);
  const childDialog = (employee,type) => {
    const employment=employmentFor(employee.employee_id);
    const definitions={
      eligibility:["זכאות/בונוס",`<input type="hidden" name="employment_id" value="${employment?.employment_id||""}"><label>גורם פיצוי<select name="compensation_factor_id" required>${optionRows(state.data.compensationFactors,"compensation_factor_id")}</select></label><label>מתאריך<input name="effective_from" type="date" required></label><label>עד תאריך<input name="effective_to" type="date"></label><label>סטטוס<select name="eligibility_status"><option value="ELIGIBLE">זכאי</option><option value="NOT_ELIGIBLE">לא זכאי</option><option value="SUSPENDED">מושהה</option></select></label><label class="wide">הערות<textarea name="notes"></textarea></label>`,"save_eligibility","employee_compensation_eligibility_id"],
      certificate:["רישוי/הכשרה",`<input type="hidden" name="employee_id" value="${employee.employee_id}"><label>סוג<select name="certificate_type_id" required>${optionRows(state.data.certificates,"certificate_type_id")}</select></label><label>סטטוס<select name="status"><option value="VALID">תקף</option><option value="REVIEW">לבדיקה</option><option value="MISSING">חסר</option><option value="EXPIRED">פג תוקף</option></select></label><label>הונפק<input name="issued_on" type="date"></label><label>בתוקף עד<input name="expires_on" type="date"></label><label class="wide">הערות<textarea name="notes"></textarea></label>`,"save_certificate","employee_certificate_id"],
      leave:["חופשה/היעדרות",`<input type="hidden" name="employment_id" value="${employment?.employment_id||""}"><label>סוג<select name="leave_type"><option value="MATERNITY">לידה</option><option value="SICK_OR_ACCIDENT">מחלה/תאונה</option><option value="UNPAID">חל״ת</option><option value="OTHER">אחר</option></select></label><label>מתאריך<input name="starts_on" type="date" required></label><label>עד תאריך<input name="ends_on" type="date"></label><label class="wide">הערות<textarea name="notes"></textarea></label>`,"save_leave","employee_leave_period_id"],
    };
    const [title,fields,action,idField]=definitions[type];
    showDialog(title,fields,(record)=>request("employees","POST",{action,record:{...record,[idField]:""}}),`workforce.${type}.${employee.employee_id}.new`);
  };
  const renderDetails = () => {
    const employee=state.data.employees.find((row)=>row.employee_id===state.selected);
    if(!employee){$("#wf-details").hidden=true;return;}
    const employment=employmentFor(employee.employee_id), assignment=assignmentFor(employee.employee_id);
    const employmentIds=new Set(state.data.employments.filter((row)=>row.employee_id===employee.employee_id).map((row)=>row.employment_id));
    const payTerms=state.data.payTerms.filter((row)=>row.employee_id===employee.employee_id);
    const payStatus=(row)=>row.valid_from>today()?"עתידי":row.valid_to&&row.valid_to<today()?"פג תוקף":"נוכחי";
    $("#wf-details").hidden=false;
    $("#wf-details").innerHTML=`<header><div><p class="eyebrow">כרטיס עובד</p><h2>${esc(employee.first_name)} ${esc(employee.last_name)}</h2></div><button data-close-details>×</button></header>
      <div class="workforce-detail-grid">
        <section><h3>פרטים אישיים</h3><dl><div><dt>מספר עובד</dt><dd>${esc(employee.employee_code)}</dd></div><div><dt>טלפון</dt><dd>${esc(employee.phone||"—")}</dd></div><div><dt>דוא״ל</dt><dd>${esc(employee.email||"—")}</dd></div><div><dt>מנהל/ת</dt><dd>${esc(state.data.employees.find((row)=>row.employee_id===employee.manager_employee_id)?.first_name||"—")}</dd></div></dl><button class="button button-secondary" data-edit-employee>עריכת פרטים</button></section>
        <section><h3>העסקה ושיבוץ</h3><dl><div><dt>תחילת העסקה</dt><dd>${employment?.employment_start_date||"—"}</dd></div><div><dt>וותק מוכר</dt><dd>${employment?.recognized_prior_seniority_months??"—"} חודשים</dd></div><div><dt>תפקיד</dt><dd>${esc(rowLabel(state.data.roles,assignment?.role_id,"role_id"))}</dd></div><div><dt>מעון / כיתה</dt><dd>${esc(rowLabel(state.data.daycares,assignment?.daycare_id,"daycare_id"))} · ${esc(rowLabel(state.data.classrooms,assignment?.classroom_id,"classroom_id"))}</dd></div></dl><button class="button button-secondary" data-edit-employment>${employment?"עריכת העסקה":"הוספת העסקה"}</button> <button class="button button-secondary" data-edit-assignment ${employment?"":"disabled"}>${assignment?"עריכת שיבוץ":"הוספת שיבוץ"}</button></section>
        <section><h3>היסטוריית תנאי שכר</h3>${payTerms.map((row)=>`<article class="workforce-history-row"><strong>${money.format(row.base_pay)} · ${payTypeLabels[row.pay_type]||esc(row.pay_type)}</strong><span>${payStatus(row)} · ${row.valid_from} – ${row.valid_to||"ללא מועד סיום"}</span><div><button class="button button-quiet" data-version-term="${row.employee_pay_term_id}">גרסה חדשה</button>${payStatus(row)!=="פג תוקף"?`<button class="button button-quiet" data-close-term="${row.employee_pay_term_id}">סגירה</button>`:""}</div></article>`).join("")||"<p>אין תנאי שכר.</p>"}<button class="button button-secondary" data-new-term>הוספת גרסה</button></section>
        <section><h3>בונוסים וזכאויות</h3>${state.data.eligibility.filter((row)=>employmentIds.has(row.employment_id)).map((row)=>`<p>${esc(rowLabel(state.data.compensationFactors,row.compensation_factor_id,"compensation_factor_id"))} · ${row.effective_from}</p>`).join("")||"<p>אין זכאויות.</p>"}<button class="button button-secondary" data-child="eligibility">הוספה</button></section>
        <section><h3>רישוי והכשרות</h3>${state.data.employeeCertificates.filter((row)=>row.employee_id===employee.employee_id).map((row)=>`<p>${esc(rowLabel(state.data.certificates,row.certificate_type_id,"certificate_type_id"))} · ${esc(row.status)}</p>`).join("")||"<p>אין רשומות.</p>"}<button class="button button-secondary" data-child="certificate">הוספה</button></section>
        <section><h3>חופשות והיעדרויות</h3>${state.data.leave.filter((row)=>employmentIds.has(row.employment_id)).map((row)=>`<p>${esc(row.leave_type)} · ${row.starts_on} – ${row.ends_on||"פתוח"}</p>`).join("")||"<p>אין תקופות היעדרות.</p>"}<button class="button button-secondary" data-child="leave">הוספה</button></section>
        <section><h3>מסמכים</h3><div class="attachment-placeholder"><span>📎</span><div><strong>מסמכי עובד</strong><small>Placeholder בלבד — טרם אושר חוזה Storage.</small></div></div></section>
      </div><div class="dialog-actions"><button class="button button-danger" data-deactivate ${employee.lifecycle_status!=="ACTIVE"?"disabled":""}>השבתת עובד</button></div>`;
    $("[data-close-details]").onclick=()=>{state.selected="";renderDetails();};
    $("[data-edit-employee]").onclick=()=>employeeDialog(employee);
    $("[data-edit-employment]").onclick=()=>employmentDialog(employee,employment);
    $("[data-edit-assignment]").onclick=()=>assignmentDialog(employee,assignment);
    $("[data-new-term]").onclick=()=>payTermDialog(employee);
    document.querySelectorAll("[data-version-term]").forEach((button)=>button.onclick=()=>payTermDialog(employee,payTerms.find((row)=>row.employee_pay_term_id===button.dataset.versionTerm)));
    document.querySelectorAll("[data-close-term]").forEach((button)=>button.onclick=async()=>{const closeOn=prompt("תאריך סיום (YYYY-MM-DD)",today());if(!closeOn)return;await request("employees","POST",{action:"close_pay_term",employee_pay_term_id:button.dataset.closeTerm,close_on:closeOn});await reload();});
    document.querySelectorAll("[data-child]").forEach((button)=>button.onclick=()=>childDialog(employee,button.dataset.child));
    $("[data-deactivate]").onclick=async()=>{if(confirm("להשבית את העובד? ההיסטוריה תישמר.")){await request("employees","POST",{action:"deactivate_employee",employee_id:employee.employee_id});await reload();}};
  };
  const render = () => {
    const all=state.data.employees, rows=filtered();
    const kpis=[["all","כל העובדים",all.length],["ACTIVE","פעילים",all.filter((row)=>row.lifecycle_status==="ACTIVE").length],["attention","דורש טיפול",all.filter((row)=>issuesFor(row).length).length],["INACTIVE","לא פעילים",all.filter((row)=>row.lifecycle_status==="INACTIVE").length]];
    $("#wf-kpis").innerHTML=kpis.map(([id,title,value])=>`<button data-kpi="${id}"><strong>${value}</strong><span>${title}</span><small>פתיחת מסנן</small></button>`).join("");
    const heads=[["code","מס׳ עובד"],["name","שם מלא"],["role","תפקיד ראשי"],["daycare","מעון ראשי"],["classroom","כיתה ראשית"],["phone","טלפון"],["status","סטטוס"],["seniority","וותק מוכר"],["start","תחילת העסקה"]];
    $("#wf-head").innerHTML=`<tr><th><input type="checkbox" data-select-all aria-label="בחירת כל השורות"></th>${heads.map(([key,label],index)=>`<th class="${index===0?"bank-sticky-number":""}"><button class="table-sort" data-sort="${key}">${label}${state.sort===key?(state.direction===1?" ↑":" ↓"):""}</button></th>`).join("")}<th>מצב שורה</th><th>פעולות</th></tr>`;
    $("#wf-count").textContent=`${rows.length} עובדים`;
    const draft=state.newRow?`<tr class="bank-row-missing" data-new-employee><td></td><td><input class="workforce-inline" name="employee_code" placeholder="מס׳ עובד"></td><td><span class="inline-name"><input class="workforce-inline" name="first_name" placeholder="שם פרטי"><input class="workforce-inline" name="last_name" placeholder="שם משפחה"></span></td><td>—</td><td>—</td><td>—</td><td><input class="workforce-inline" name="phone" placeholder="טלפון"></td><td>פעיל</td><td>—</td><td>—</td><td><span class="bank-row-status missing">חסר מידע</span></td><td><button class="button button-primary" data-save-new>שמירה</button><button class="button button-quiet" data-cancel-new>ביטול</button></td></tr>`:"";
    $("#wf-rows").innerHTML=draft+rows.map((employee)=>{const employment=employmentFor(employee.employee_id),assignment=assignmentFor(employee.employee_id),issues=issuesFor(employee);const problematic=!employee.employee_code?.trim()||!employee.first_name?.trim()||!employee.last_name?.trim();const health=problematic?"error":issues.length?"missing":"complete";const healthLabel=problematic?"בעייתי":issues.length?"חסר מידע":"תקין";return`<tr class="bank-row-${health}"><td><input type="checkbox" data-select-row="${employee.employee_id}" ${state.selectedRows.has(employee.employee_id)?"checked":""}></td><td class="bank-sticky-number"><input class="workforce-inline" data-inline="${employee.employee_id}" name="employee_code" value="${esc(employee.employee_code)}"></td><td><span class="inline-name"><input class="workforce-inline" data-inline="${employee.employee_id}" name="first_name" value="${esc(employee.first_name)}"><input class="workforce-inline" data-inline="${employee.employee_id}" name="last_name" value="${esc(employee.last_name)}"></span></td><td>${esc(rowLabel(state.data.roles,assignment?.role_id,"role_id"))}</td><td>${esc(rowLabel(state.data.daycares,assignment?.daycare_id,"daycare_id"))}</td><td>${esc(rowLabel(state.data.classrooms,assignment?.classroom_id,"classroom_id"))}</td><td><input class="workforce-inline" data-inline="${employee.employee_id}" name="phone" value="${esc(employee.phone||"")}"></td><td><select class="workforce-inline" data-inline="${employee.employee_id}" name="lifecycle_status">${Object.entries(statusLabels).map(([value,label])=>`<option value="${value}" ${value===employee.lifecycle_status?"selected":""}>${label}</option>`).join("")}</select></td><td>${employment?.recognized_prior_seniority_months??"—"}</td><td>${employment?.employment_start_date||"—"}</td><td><span class="bank-row-status ${health}">${healthLabel}</span>${issues.length?`<small>${esc(issues.join(", "))}</small>`:""}</td><td><button class="button button-quiet" data-open="${employee.employee_id}">פרטים מתקדמים</button><button class="button button-quiet" data-archive="${employee.employee_id}">ארכוב</button></td></tr>`;}).join("");
    let bulk=$("#wf-bulk");
    if(!bulk){bulk=document.createElement("div");bulk.id="wf-bulk";bulk.className="workbench-bulk-bar";$("#wf-count").parentElement.after(bulk);}
    bulk.hidden=!state.selectedRows.size;bulk.innerHTML=`<strong>${state.selectedRows.size} נבחרו</strong><button class="button button-danger" data-bulk-archive>העברה לארכיון</button>`;
    document.querySelectorAll("[data-open]").forEach((button)=>button.onclick=()=>{state.selected=button.dataset.open;renderDetails();});
    document.querySelectorAll("[data-inline]").forEach((field)=>field.onchange=()=>saveInline(state.data.employees.find((row)=>row.employee_id===field.dataset.inline),field.name,field.value));
    document.querySelectorAll("[data-select-row]").forEach((field)=>field.onchange=()=>{field.checked?state.selectedRows.add(field.dataset.selectRow):state.selectedRows.delete(field.dataset.selectRow);render();});
    $("[data-select-all]")?.addEventListener("change",(event)=>{rows.forEach((row)=>event.target.checked?state.selectedRows.add(row.employee_id):state.selectedRows.delete(row.employee_id));render();});
    document.querySelectorAll("[data-archive]").forEach((button)=>button.onclick=()=>archiveRows([button.dataset.archive]));
    $("[data-bulk-archive]")?.addEventListener("click",()=>archiveRows([...state.selectedRows]));
    $("[data-cancel-new]")?.addEventListener("click",()=>{state.newRow=false;render();});
    $("[data-save-new]")?.addEventListener("click",async()=>{const inputs=[...$("[data-new-employee]").querySelectorAll("input")];const body=Object.fromEntries(inputs.map((input)=>[input.name,input.value.trim()]));if(!body.employee_code||!body.first_name||!body.last_name){message("יש למלא מספר עובד, שם פרטי ושם משפחה.","error");return;}await request("employees","POST",{action:"save_employee",lifecycle_status:"ACTIVE",...body});state.newRow=false;await reload();message("העובד נוסף ונשמר.","success");});
    document.querySelectorAll("[data-sort]").forEach((button)=>button.onclick=()=>{state.direction=state.sort===button.dataset.sort?state.direction*-1:1;state.sort=button.dataset.sort;render();});
    document.querySelectorAll("[data-kpi]").forEach((button)=>button.onclick=()=>{state.attention=button.dataset.kpi==="attention";state.status=["ACTIVE","INACTIVE","ARCHIVED"].includes(button.dataset.kpi)?button.dataset.kpi:"";$("#wf-status").value=state.status;render();});
    renderDetails();
  };
  $("#wf-status").innerHTML='<option value="">כל הסטטוסים</option>'+Object.entries(statusLabels).map(([value,label])=>`<option value="${value}">${label}</option>`).join("");
  $("#wf-unit").innerHTML='<option value="">כל המחלקות</option>'+optionRows(state.data.units,"allocation_unit_id").replace('<option value="">בחירה…</option>',"");
  $("#wf-daycare").innerHTML='<option value="">כל המעונות</option>'+optionRows(state.data.daycares,"daycare_id").replace('<option value="">בחירה…</option>',"");
  $("#wf-search").oninput=(event)=>{state.query=event.target.value;render();};
  $("#wf-status").onchange=(event)=>{state.status=event.target.value;state.attention=false;render();};
  $("#wf-unit").onchange=(event)=>{state.unit=event.target.value;state.daycare="";$("#wf-daycare").innerHTML='<option value="">כל המעונות</option>'+optionRows(state.data.daycares,"daycare_id","",(row)=>!state.unit||row.allocation_unit_id===state.unit).replace('<option value="">בחירה…</option>',"");render();};
  $("#wf-daycare").onchange=(event)=>{state.daycare=event.target.value;render();};
  $("#wf-clear").onclick=()=>{state.query=state.status=state.unit=state.daycare="";state.attention=false;["#wf-search","#wf-status","#wf-unit","#wf-daycare"].forEach((selector)=>$(selector).value="");render();};
  $("#wf-add").onclick=()=>{state.newRow=true;render();$("[data-new-employee] input")?.focus();};
  $("#wf-export").onclick=()=>{const lines=[["מספר עובד","שם פרטי","שם משפחה","טלפון","סטטוס"],...filtered().map((row)=>[row.employee_code,row.first_name,row.last_name,row.phone||"",statusLabels[row.lifecycle_status]||row.lifecycle_status])];const blob=new Blob(["\ufeff"+lines.map((line)=>line.map((value)=>`"${String(value).replaceAll('"','""')}"`).join(",")).join("\n")],{type:"text/csv;charset=utf-8"});const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="עובדים.csv";link.click();URL.revokeObjectURL(link.href);message("קובץ העובדים יוצא בהצלחה.","success");};
  render();
  message("הנתונים נטענו מ־Supabase בלבד.","success");
}
