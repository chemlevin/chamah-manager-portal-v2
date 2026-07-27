const FIELDS = [
  ["employee_number","מספר עובד",["מספר עובד","קוד עובד","employee number","employee code","employee_number"]],
  ["identity_number","תעודת זהות",["תעודת זהות","מספר זהות","identity number","national id","identity_number"]],
  ["first_name","שם פרטי",["שם פרטי","first name","first_name"]],
  ["last_name","שם משפחה",["שם משפחה","last name","surname","last_name"]],
  ["phone","טלפון",["טלפון","נייד","phone","mobile"]],
  ["email","דוא״ל",["דואל","דוא״ל","אימייל","email","e-mail"]],
  ["birth_date","תאריך לידה",["תאריך לידה","birth date","date of birth","birth_date"]],
  ["notes","הערות",["הערות","notes","comments"]],
];
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" })[char]);
const norm = (value) => String(value ?? "").trim().toLowerCase().replace(/[_\-״"'’]/g," ").replace(/\s+/g," ");
const cell = (value) => value?.result ?? value?.text ?? value ?? "";

export async function parseEmployeeWorkbook(file) {
  const extension=file.name.split(".").pop()?.toLowerCase();
  if(!["xls","xlsx"].includes(extension)) throw new Error("יש לבחור קובץ XLS או XLSX.");
  const data=await file.arrayBuffer(); let matrix;
  if(extension==="xlsx"){const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(data);const sheet=workbook.worksheets[0];matrix=sheet?.getRows(1,sheet.rowCount)?.map((row)=>row.values.slice(1).map(cell))||[];}
  else{if(!window.XLSX)throw new Error("קורא קובצי XLS אינו זמין.");const workbook=window.XLSX.read(data,{type:"array",cellDates:true});matrix=window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{header:1,raw:true,defval:""});}
  const headerIndex=matrix.findIndex((row)=>row.filter((value)=>String(value).trim()).length>=2);
  if(headerIndex<0)throw new Error("הקובץ ריק או שלא נמצאה שורת כותרות.");
  const headers=matrix[headerIndex].map((value,index)=>String(value||`עמודה ${index+1}`).trim());
  const rows=matrix.slice(headerIndex+1).map((values,index)=>({source_row_number:headerIndex+index+2,values:Object.fromEntries(headers.map((header,column)=>[header,cell(values[column])]))})).filter((row)=>Object.values(row.values).some((value)=>String(value??"").trim()));
  if(!rows.length)throw new Error("לא נמצאו שורות נתונים בקובץ.");
  return {headers,rows,fileName:file.name};
}
export function suggestEmployeeMapping(headers,saved={}){
  return Object.fromEntries(FIELDS.map(([field,,aliases])=>[field,saved[field]&&headers.includes(saved[field])?saved[field]:headers.find((header)=>aliases.map(norm).includes(norm(header)))||""]));
}
const normalizeDate=(value)=>{
  if(!value)return "";
  if(value instanceof Date&&!Number.isNaN(value.valueOf()))return value.toISOString().slice(0,10);
  if(typeof value==="number"&&window.XLSX?.SSF){const parsed=window.XLSX.SSF.parse_date_code(value);if(parsed)return `${parsed.y}-${String(parsed.m).padStart(2,"0")}-${String(parsed.d).padStart(2,"0")}`;}
  const text=String(value).trim(),match=text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  const iso=match?`${match[3]}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}`:/^\d{4}-\d{2}-\d{2}$/.test(text)?text:"";
  if(!iso)return "";const date=new Date(`${iso}T00:00:00Z`);return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===iso?iso:"";
};
export function validateEmployeeImport(parsed,mapping,employees=[]){
  const byCode=new Map(employees.filter((row)=>row.employee_code).map((row)=>[norm(row.employee_code),row]));
  const byIdentity=new Map(employees.filter((row)=>row.national_id).map((row)=>[norm(row.national_id),row]));const seen=new Map();
  return parsed.rows.map((source)=>{
    const value=(field)=>mapping[field]?String(source.values[mapping[field]]??"").trim():"";
    const row=Object.fromEntries(FIELDS.map(([field])=>[field,value(field)]));row.birth_date=row.birth_date?normalizeDate(source.values[mapping.birth_date]):"";
    const errors=[];if(!row.employee_number&&!row.identity_number)errors.push("נדרש מספר עובד או מספר זהות");if(!row.first_name)errors.push("חסר שם פרטי");if(!row.last_name)errors.push("חסר שם משפחה");if(value("birth_date")&&!row.birth_date)errors.push("תאריך לידה אינו תקין");if(row.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email))errors.push("כתובת דוא״ל אינה תקינה");
    const existingByCode=row.employee_number?byCode.get(norm(row.employee_number)):null,existingByIdentity=row.identity_number?byIdentity.get(norm(row.identity_number)):null;
    if(existingByCode&&existingByIdentity&&existingByCode.employee_id!==existingByIdentity.employee_id)errors.push("מספר העובד ומספר הזהות שייכים לעובדים שונים");
    const key=row.employee_number?`code:${norm(row.employee_number)}`:`identity:${norm(row.identity_number)}`;if(seen.has(key))errors.push(`כפילות בקובץ עם שורה ${seen.get(key)}`);else if(row.employee_number||row.identity_number)seen.set(key,source.source_row_number);
    const existing=existingByCode||(!row.employee_number?existingByIdentity:null);
    return {...row,source_row_number:source.source_row_number,errors,valid:!errors.length,action:existing?"UPDATE":"NEW",archived:existing?.lifecycle_status==="ARCHIVED"};
  });
}
async function downloadWorkbook(name,rows,headers){
  const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet("עובדים",{views:[{rightToLeft:true}]});sheet.addRow(headers);rows.forEach((row)=>sheet.addRow(row));sheet.getRow(1).font={bold:true};sheet.columns.forEach((column)=>column.width=20);
  const blob=new Blob([await workbook.xlsx.writeBuffer()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=name;link.click();URL.revokeObjectURL(link.href);
}
export const downloadEmployeeTemplate=()=>downloadWorkbook("תבנית-ייבוא-עובדים.xlsx",[],FIELDS.map(([,label])=>label));
export function mountEmployeeImport({request,getData,onImported,message}){
  const dialog=document.querySelector("#employee-import-dialog"),content=document.querySelector("#employee-import-content"),input=document.querySelector("#employee-import-file");let parsed=null,mapping={},validated=[];
  const close=()=>{dialog.close();input.value="";parsed=null;validated=[];};
  const bindCancel=()=>content.querySelectorAll("[data-cancel]").forEach((button)=>button.onclick=close);
  const renderUpload=()=>{content.innerHTML=`<header class="import-heading"><div><p class="eyebrow">ייבוא עובדים</p><h2>קליטת קובץ Excel</h2></div><button class="dialog-close" data-cancel>×</button></header><div class="employee-drop-zone" tabindex="0"><strong>גררו לכאן קובץ XLS או XLSX</strong><span>או לחצו לבחירת קובץ</span></div><p class="import-note">הנתונים יוצגו לבדיקה ולמיפוי לפני שמירה. תנאי שכר, שכר והיסטוריה אינם משתנים.</p><div class="dialog-actions"><button class="button button-quiet" data-cancel>ביטול</button></div>`;bindCancel();const zone=content.querySelector(".employee-drop-zone");zone.onclick=()=>input.click();zone.onkeydown=(event)=>{if(["Enter"," "].includes(event.key)){event.preventDefault();input.click();}};["dragenter","dragover"].forEach((name)=>zone.addEventListener(name,(event)=>{event.preventDefault();zone.classList.add("dragging");}));["dragleave","drop"].forEach((name)=>zone.addEventListener(name,()=>zone.classList.remove("dragging")));zone.ondrop=(event)=>{event.preventDefault();load(event.dataTransfer.files[0]);};};
  const mappingWarning=()=>!mapping.first_name||!mapping.last_name||(!mapping.employee_number&&!mapping.identity_number);
  const renderMapping=()=>{content.innerHTML=`<header class="import-heading"><div><p class="eyebrow">שלב 1 מתוך 2</p><h2>מיפוי עמודות</h2><p>${esc(parsed.fileName)} · ${parsed.rows.length} שורות</p></div><button class="dialog-close" data-cancel>×</button></header><div class="employee-mapping-grid">${FIELDS.map(([field,label])=>`<label>${label}${["first_name","last_name"].includes(field)?" *":""}<select data-map="${field}"><option value="">לא למפות</option>${parsed.headers.map((header)=>`<option value="${esc(header)}" ${mapping[field]===header?"selected":""}>${esc(header)}</option>`).join("")}</select></label>`).join("")}</div><p class="import-warning" ${mappingWarning()?"":"hidden"}>יש למפות שם פרטי, שם משפחה, ולפחות מספר עובד או מספר זהות.</p><div class="dialog-actions"><button class="button button-primary" data-preview ${mappingWarning()?"disabled":""}>המשך לתצוגה מקדימה</button><button class="button button-quiet" data-cancel>ביטול</button></div>`;bindCancel();content.querySelectorAll("[data-map]").forEach((select)=>select.onchange=()=>{mapping[select.dataset.map]=select.value;renderMapping();});content.querySelector("[data-preview]").onclick=()=>{validated=validateEmployeeImport(parsed,mapping,getData().employees);renderPreview();};};
  const renderPreview=()=>{const valid=validated.filter((row)=>row.valid),invalid=validated.filter((row)=>!row.valid);content.innerHTML=`<header class="import-heading"><div><p class="eyebrow">שלב 2 מתוך 2</p><h2>תצוגה מקדימה ואימות</h2><p>${valid.length} תקינות · ${invalid.length} עם שגיאות</p></div><button class="dialog-close" data-cancel>×</button></header><div class="employee-import-table"><table><thead><tr><th>שורה</th><th>מצב</th><th>מספר עובד</th><th>ת״ז</th><th>שם</th><th>פעולה</th><th>שגיאות</th></tr></thead><tbody>${validated.map((row)=>`<tr class="${row.valid?"valid":"invalid"}"><td>${row.source_row_number}</td><td>${row.valid?"תקין":"בעייתי"}</td><td>${esc(row.employee_number)}</td><td>${esc(row.identity_number)}</td><td>${esc(`${row.first_name} ${row.last_name}`)}</td><td>${row.action==="NEW"?"חדש":"עדכון"}${row.archived?" · ארכיון נשמר":""}</td><td>${esc(row.errors.join(" · ")||"—")}</td></tr>`).join("")}</tbody></table></div><div class="dialog-actions"><button class="button button-primary" data-import ${valid.length?"":"disabled"}>ייבוא ${valid.length} שורות תקינות</button>${invalid.length?'<button class="button button-secondary" data-errors>ייצוא שגיאות ל־Excel</button>':""}<button class="button button-quiet" data-back>חזרה למיפוי</button><button class="button button-quiet" data-cancel>ביטול</button></div>`;bindCancel();content.querySelector("[data-back]").onclick=renderMapping;content.querySelector("[data-errors]")?.addEventListener("click",()=>downloadWorkbook("שגיאות-ייבוא-עובדים.xlsx",invalid.map((row)=>[row.source_row_number,row.employee_number,row.identity_number,row.first_name,row.last_name,row.errors.join(" | ")]),["שורה","מספר עובד","תעודת זהות","שם פרטי","שם משפחה","שגיאות"]));content.querySelector("[data-import]").onclick=async()=>{const button=content.querySelector("[data-import]");button.disabled=true;button.textContent="מייבא…";try{const result=await request("employees","POST",{action:"import_employees",file_name:parsed.fileName,column_mapping:mapping,rows:valid.map(({errors,valid:ok,action,archived,...row})=>row)});await onImported();renderSummary(result,invalid.length);}catch(error){button.disabled=false;button.textContent="ניסיון נוסף";message(`הייבוא נכשל: ${error.message}`,"error");}};};
  const renderSummary=(result,skipped)=>{content.innerHTML=`<header class="import-heading"><div><p class="eyebrow">הייבוא הושלם</p><h2>סיכום ייבוא עובדים</h2></div><button class="dialog-close" data-cancel>×</button></header><div class="employee-import-summary"><article><strong>${result.new_employees||0}</strong><span>עובדים חדשים</span></article><article><strong>${result.updated_employees||0}</strong><span>עובדים עודכנו</span></article><article><strong>${skipped+(result.skipped_employees||0)}</strong><span>עובדים דולגו</span></article><article><strong>${result.failed_employees||0}</strong><span>עובדים נכשלו</span></article></div><p>רק השורות שעברו אימות נשמרו ב־Supabase.</p><div class="dialog-actions"><button class="button button-primary" data-cancel>סיום</button></div>`;bindCancel();message("ייבוא העובדים הושלם.","success");};
  const load=async(file)=>{if(!file)return;try{parsed=await parseEmployeeWorkbook(file);mapping=suggestEmployeeMapping(parsed.headers,getData().importMapping||{});renderMapping();}catch(error){message(error.message,"error");}};
  document.querySelector("#employee-template").onclick=()=>downloadEmployeeTemplate();document.querySelector("#employee-import").onclick=()=>{renderUpload();dialog.showModal();};input.onchange=()=>load(input.files[0]);
}
