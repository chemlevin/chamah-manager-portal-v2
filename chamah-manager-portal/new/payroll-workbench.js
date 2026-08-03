import { createAutosave, readAutosaveDraft } from "./autosave.js";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]
));
const money = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 });
const statuses = {
  LINKED: "מקושר",
  MISSING: "חסר",
  APPROVED_TEMPORARY: "זמני מאושר",
  UNRESOLVED: "לא פתור",
};
const monthlyFields = [
  ["work_days", "ימי עבודה"],
  ["standard_hours", "שעות תקן"],
  ["regular_hours", "שעות רגילות"],
  ["hours_125", "שעות 125%"],
  ["hours_150", "שעות 150%"],
  ["overtime_hours", "שעות נוספות"],
  ["vacation_hours", "שעות חופשה"],
  ["sick_hours", "שעות מחלה"],
  ["other_absence_hours", "היעדרות אחרת"],
  ["unpaid_absence_hours", "היעדרות ללא תשלום"],
  ["vacation_deduct", "ניכוי חופשה"],
  ["vacation_pay", "תשלום חופשה"],
  ["sick_deduct", "ניכוי מחלה"],
  ["sick_pay", "תשלום מחלה"],
  ["gross_pay", "ברוטו"],
  ["actual_hours", "שעות בפועל מהנה״ח"],
  ["actual_gross", "ברוטו בפועל מהנה״ח"],
  ["employer_cost", "עלות מעסיק"],
  ["travel_reimbursement", "נסיעות"],
  ["bonus_amount", "בונוסים"],
  ["adjustment_amount", "התאמות"],
];
const sumHours = (row) => [
  "regular_hours", "overtime_hours", "hours_125", "hours_150",
  "vacation_hours", "sick_hours", "other_absence_hours",
].reduce((sum, key) => sum + Number(row[key] || 0), 0);
const options = (rows, idField, selected = "", filter = () => true) =>
  `<option value="">בחירה…</option>${rows.filter(filter).map((row) =>
    `<option value="${row[idField]}" ${row[idField] === selected ? "selected" : ""}>${esc(row.display_name)}</option>`
  ).join("")}`;
const lookup = (rows, id, idField) => rows.find((row) => row[idField] === id)?.display_name || "—";

function downloadCsv(rows, columns, name) {
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const content = "\uFEFF" + [
    columns.map(([title]) => quote(title)).join(","),
    ...rows.map((row) => columns.map(([, getter]) => quote(
      typeof getter === "function" ? getter(row) : row[getter]
    )).join(",")),
  ].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportPayrollFile(rows, columns, name, format) {
  if (format === "CSV") {
    downloadCsv(rows, columns, `${name}.csv`);
    return;
  }
  const matrix = [
    columns.map(([title]) => title),
    ...rows.map((row) => columns.map(([, getter]) => (
      typeof getter === "function" ? getter(row) : row[getter]
    ))),
  ];
  const sheet = window.XLSX.utils.aoa_to_sheet(matrix);
  sheet["!dir"] = "rtl";
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, sheet, "Payroll");
  window.XLSX.writeFile(workbook, `${name}.${format.toLowerCase()}`, {
    bookType: format === "XLS" ? "biff8" : "xlsx",
  });
}

export async function mountPayrollWorkbench(request, { selectedMonthId = "", selectedMonth = "", listRoute = "#payroll/working" } = {}) {
  const $ = (selector) => document.querySelector(selector);
  const state = {
    data: null,
    month: selectedMonth,
    monthId: selectedMonthId,
    selected: "",
    query: "",
    status: "",
    unit: "",
    daycare: "",
    sort: "employee",
    direction: 1,
    workflowView: "CURRENT",
    selectedRows: new Set(),
    newRow: false,
    inlineSplit: null,
    allocationDrafts: new Map(),
    splitPreviews: new Map(),
    monthlyInputTimers: new Map(),
    manualInputTimers: new Map(),
    monthlyAutosave: null,
    allocationAutosave: null,
  };
  const message = (value, tone = "") => {
    $("#wf-message").textContent = value;
    $("#wf-message").className = tone;
  };

  document.querySelector(".bank-import-actions").insertAdjacentHTML(
    "afterbegin",
    `<a class="button button-secondary" href="${esc(listRoute)}">חזרה לרשימת החודשים</a><button id="wf-close-month" class="button button-primary">סגירת חודש</button>`
  );
  $("#payroll-month-workflow").hidden = true;

  const monthKey = (row) => row?.payroll_month?.slice(0, 7) || "";
  const sortedMonths = (rows) => [...rows].sort((a, b) => monthKey(b).localeCompare(monthKey(a)));
  const month = () => state.data.months.find((row) => row.payroll_month_id === state.monthId)
    || state.data.months.find((row) => row.payroll_month.slice(0, 7) === state.month);
  const isClosed = () => month()?.month_status === "CLOSED";
  const monthStatus = (row) => row?.month_status === "CLOSED" ? "סגור" : "פתוח";
  const selectMonth = async (value, view, monthId = "") => {
    state.month = value;
    state.monthId = monthId;
    state.selected = "";
    state.workflowView = view;
    $("#wf-month").value = value;
    await reload();
  };
  const renderMonthWorkflow = () => {
    const opened = sortedMonths(state.data.months.filter((row) => row.month_status !== "CLOSED"));
    const closed = sortedMonths(state.data.months.filter((row) => row.month_status === "CLOSED"));
    const current = month();
    const monthButtons = (rows, view, emptyText) => rows.length
      ? rows.map((row) => `<button class="payroll-month-link ${row.payroll_month_id === state.monthId ? "active" : ""}" data-month="${monthKey(row)}" data-month-id="${row.payroll_month_id}" data-month-target="${view}">
          <strong>${monthKey(row)}</strong><span>${row.scope_type === "DAYCARE" ? lookup(state.data.daycares, row.daycare_id, "daycare_id") : row.scope_type === "ALLOCATION_UNIT" ? lookup(state.data.units, row.allocation_unit_id, "allocation_unit_id") : "כל הארגון"} · ${monthStatus(row)}</span>
        </button>`).join("")
      : `<p class="payroll-month-empty">${emptyText}</p>`;
    const reportTotals = state.data.reportSummary;
    const reportGroups = reportTotals.groups;
    const reports = `<div class="payroll-month-view payroll-reports">
      <p class="payroll-month-view-title">דוחות חודש ${esc(state.month || "—")}</p>
      <div class="import-summary">
        <span>${reportTotals.employees} עובדים</span><span>${number.format(reportTotals.standard_hours)} שעות תקן</span>
        <span>${number.format(reportTotals.actual_hours)} שעות בפועל</span><span>${money.format(reportTotals.actual_gross)} ברוטו בפועל</span>
        <span>${money.format(reportTotals.employer_cost)} עלות מעסיק</span>
        <span>${money.format(reportTotals.gross_variance)} שונות ברוטו מחושב/בפועל</span>
        <span>${reportTotals.errors} שגיאות</span>
      </div>
      <div class="import-preview-scroll"><table><thead><tr><th>מחלקה</th><th>מעון</th><th>עובדים</th><th>ברוטו בפועל</th><th>עלות מעסיק</th></tr></thead>
      <tbody>${reportGroups.map((row) => `<tr><td>${esc(row.unit_name)}</td><td>${esc(row.daycare_name)}</td><td>${row.employees}</td><td>${money.format(row.actual_gross)}</td><td>${money.format(row.employer_cost)}</td></tr>`).join("") || '<tr><td colspan="5">אין נתונים לחודש זה.</td></tr>'}</tbody></table></div>
    </div>`;
    const content = state.workflowView === "REPORTS"
      ? reports
      : state.workflowView === "NEW"
      ? `<div class="payroll-month-view payroll-month-new"><div><strong>פתיחת חודש שכר</strong><p>בחירת עובדים בלבד; ערכי השכר החודשיים אינם מועתקים.</p></div><button class="button button-primary" data-open-month-primary>פתיחת חודש חדש</button></div>`
      : state.workflowView === "HISTORY"
        ? `<div class="payroll-month-view"><p class="payroll-month-view-title">חודשים סגורים</p><div class="payroll-month-list">${monthButtons(closed, "HISTORY", "אין עדיין חודשי עבר סגורים.")}</div></div>`
        : `<div class="payroll-month-view"><p class="payroll-month-view-title">חודשים פתוחים לעבודה</p><div class="payroll-month-list">${monthButtons(opened, "CURRENT", "אין כרגע חודש פתוח.")}</div></div>`;
    $("#payroll-month-workflow").innerHTML = `<div class="payroll-active-month">
        <div><p class="eyebrow">חודש פעיל</p><h2>${state.month || "לא נבחר חודש"}</h2></div>
        <span class="payroll-month-badge ${current?.month_status === "CLOSED" ? "closed" : current ? "open" : "empty"}">${current ? monthStatus(current) : state.month ? "טרם נפתח" : "ללא בחירה"}</span>
      </div>
      <nav class="payroll-month-tabs" aria-label="שלבי עבודה חודשיים">
        <button data-month-view="REPORTS" class="${state.workflowView === "REPORTS" ? "active" : ""}">דוחות</button>
        <button data-month-view="NEW" class="${state.workflowView === "NEW" ? "active" : ""}">פתיחת חודש</button>
        <button data-month-view="CURRENT" class="${state.workflowView === "CURRENT" ? "active" : ""}">חודשים בעבודה <span>${opened.length}</span></button>
        <button data-month-view="HISTORY" class="${state.workflowView === "HISTORY" ? "active" : ""}">חודשים סגורים <span>${closed.length}</span></button>
      </nav>${content}`;
    document.querySelectorAll("[data-month-view]").forEach((button) => {
      button.onclick = () => {
        state.workflowView = button.dataset.monthView;
        renderMonthWorkflow();
      };
    });
    document.querySelectorAll("[data-month-target]").forEach((button) => {
      button.onclick = () => selectMonth(button.dataset.month, button.dataset.monthTarget, button.dataset.monthId);
    });
    $("[data-open-month-primary]")?.addEventListener("click", openMonthDialog);
  };
  const employeeFor = (record) => {
    const employment = state.data.employments.find((row) => row.employment_id === record.employment_id);
    return state.data.employees.find((row) => row.employee_id === employment?.employee_id);
  };
  const payTermFor = (record) =>
    state.data.payTerms.find((row) => row.employee_pay_term_id === record.employee_pay_term_id);
  const allocationsFor = (record) => state.allocationDrafts.get(record.payroll_record_id)
    || state.data.allocations.filter((row) => row.payroll_record_id === record.payroll_record_id);
  const invalid = (record) => record.row_status === "ERROR";
  const healthFor = (record) => {
    const code = { VALID: "complete", MISSING: "missing", ERROR: "error", SPLIT: "split" }[record.row_status] || "missing";
    return {
      code,
      label: { complete: "תקין", missing: "חסר", error: "שגיאה", split: "מפוצל" }[code],
      reason: record.row_health_reason || "ממתין לאימות Supabase",
    };
  };
  const manualEmployeeFor = (record) => record.manual_employee || record.source_payload?.manual_employee || {};
  const isManualRecord = (record) => record.record_origin === "MANUAL" && !employeeFor(record);
  const employeeName = (record) => {
    const employee = employeeFor(record);
    if (employee) return `${employee.first_name} ${employee.last_name}`;
    const manual = manualEmployeeFor(record);
    return manual.name || manual.employee_name || "עובד זמני";
  };
  const filtered = () => state.data.records.filter((record) => {
    const employee = employeeFor(record);
    const search = `${record.source_employee_identifier} ${employee?.first_name || ""} ${employee?.last_name || ""}`.toLowerCase();
    return (!state.monthId || !record.payroll_month_id || record.payroll_month_id === state.monthId)
      && (!state.query || search.includes(state.query.toLowerCase()))
      && (!state.status || record.employee_match_status === state.status)
      && (!state.unit || record.allocation_unit_id === state.unit)
      && (!state.daycare || record.daycare_id === state.daycare);
  }).sort((a, b) => {
    const employeeA = employeeFor(a);
    const employeeB = employeeFor(b);
    const pair = {
      employee: [`${employeeA?.last_name || ""}${employeeA?.first_name || ""}`, `${employeeB?.last_name || ""}${employeeB?.first_name || ""}`],
      code: [a.source_employee_identifier, b.source_employee_identifier],
      cost: [Number(a.employer_cost || 0), Number(b.employer_cost || 0)],
      hours: [sumHours(a), sumHours(b)],
    }[state.sort];
    return state.direction * (typeof pair[0] === "number"
      ? pair[0] - pair[1]
      : String(pair[0]).localeCompare(String(pair[1]), "he"));
  });

  const reload = async () => {
    state.data = await request("payroll", "GET", null, state.month);
    render();
  };
  const saveInline = async (record, field, value) => {
    const numericFields = new Set([
      "work_days", "standard_hours", "regular_hours", "hours_125", "hours_150",
      "vacation_deduct", "vacation_pay", "sick_deduct", "sick_pay",
      "actual_hours", "actual_net", "actual_gross", "employer_cost",
    ]);
    record[field] = numericFields.has(field) ? (value === "" ? null : Number(value)) : value;
    message("שומר…");
    try {
      await request("payroll", "POST", {
        action: "save_record",
        payroll_record_id: record.payroll_record_id,
        import_batch_id: record.import_batch_id,
        record_origin: record.record_origin,
        payroll_month: state.month,
        ...record,
      });
      await reload();
      message("השינויים נשמרו אוטומטית.", "success");
    } catch (error) {
      message(error.message, "error");
      await reload();
    }
  };
  const deleteRecords = async (ids) => {
    const unique = [...new Set(ids)].filter(Boolean);
    if (!unique.length || !confirm(`למחוק ${unique.length} שורות שכר?`)) return;
    for (const payroll_record_id of unique) {
      await request("payroll", "POST", { action: "delete_record", payroll_record_id });
    }
    state.selectedRows.clear();
    await reload();
    message("שורות השכר נמחקו.", "success");
  };
  const createPayrollDraft = async () => {
    if (isClosed() || !month()) return;
    const draftCode = `DRAFT-${crypto.randomUUID()}`;
    try {
      await request("payroll", "POST", {
        action:"save_record", payroll_month:state.month, source_employee_identifier:draftCode,
        employee_match_status:"MISSING", record_origin:"MANUAL", source_payload:{ manual_employee:{ draft:true, name:"" } },
      });
      await reload();
      message("נוספה טיוטת שכר. הזינו מספר או שם עובד.", "success");
    } catch (error) { message(error.message || "לא ניתן להוסיף טיוטת שכר.", "error"); }
  };

  const openMonthDialog = () => {
    $("#wf-dialog-content").innerHTML = `<h2>פתיחת חודש שכר</h2>
      <form id="wf-form" class="workforce-form">
        <label>חודש<input name="payroll_month" type="month" required value="${esc(state.month)}"></label>
        <label>היקף<select name="scope_type"><option value="ORGANIZATION">כל המעונות והמחלקות</option><option value="ALLOCATION_UNIT">מחלקה</option><option value="DAYCARE">מעון מסוים</option></select></label>
        <label>מחלקה<select name="allocation_unit_id">${options(state.data.units, "allocation_unit_id")}</select></label>
        <label>מעון<select name="daycare_id">${options(state.data.daycares, "daycare_id")}</select></label>
        <fieldset class="wide payroll-opening-options">
          <legend>טעינת עובדים (אפשר לבחור בשתי האפשרויות)</legend>
          <label><input type="checkbox" name="copy_previous_employees" value="true"> העתקת רשימת העובדים מהחודש הקודם</label>
          <label><input type="checkbox" name="load_active_employees" value="true" checked> טעינת עובדים פעילים</label>
          <small>שעות, היעדרויות, ברוטו ועלויות לעולם אינם מועתקים.</small>
        </fieldset>
        <div class="dialog-actions wide"><button class="button button-primary">פתיחה ומעבר לחודש</button></div>
      </form>`;
    $("#wf-dialog").showModal();
    $("#wf-form").onsubmit = async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const payload = Object.fromEntries(formData);
      payload.copy_previous_employees = formData.has("copy_previous_employees");
      payload.load_active_employees = formData.has("load_active_employees");
      if (payload.scope_type === "ORGANIZATION") {
        payload.allocation_unit_id = "";
        payload.daycare_id = "";
      } else if (payload.scope_type === "ALLOCATION_UNIT") {
        payload.daycare_id = "";
      }
      await request("payroll", "POST", { action: "open_month", ...payload });
      state.month = payload.payroll_month;
      state.monthId = "";
      state.workflowView = "CURRENT";
      $("#wf-month").value = state.month;
      $("#wf-dialog").close();
      await reload();
      message("החודש נפתח לעריכה.", "success");
    };
  };

  const closeOrReopen = async () => {
    if (!month()) return openMonthDialog();
    if (isClosed()) {
      if (!state.data.canReopen) return message("נדרשת הרשאה ייעודית לפתיחה מחדש.", "error");
      $("#wf-dialog-content").innerHTML = `<h2>פתיחת חודש מחדש</h2>
        <form id="wf-reopen-form" class="workforce-form">
          <label class="wide">סיבת פתיחה מחדש<textarea name="notes" required minlength="3"></textarea></label>
          <div class="dialog-actions wide"><button class="button button-primary" type="submit">אישור פתיחה מחדש</button></div>
        </form>`;
      $("#wf-dialog").showModal();
      $("#wf-reopen-form").onsubmit = async (event) => {
        event.preventDefault();
        const notes = new FormData(event.currentTarget).get("notes")?.toString().trim();
        if (!notes) return;
        await request("payroll", "POST", { action: "reopen_month", payroll_month_id: month()?.payroll_month_id, payroll_month: state.month, notes });
        $("#wf-dialog").close();
        location.hash = "#payroll/working";
      };
      return;
    }
    if (!confirm(`לסגור את חודש ${state.month} ולנעול עריכה?`)) return;
    try {
      await request("payroll", "POST", { action: "close_month", payroll_month_id: month()?.payroll_month_id, payroll_month: state.month });
    } catch (error) {
      return message(error.message, "error");
    }
    location.hash = "#payroll/closed";
  };

  const allocationEditor = (record) => {
    const rows = allocationsFor(record);
    const shown = rows.length ? rows : [{
      allocation_unit_id: "", daycare_id: "", allocation_amount: "", allocated_hours: "",
    }];
    return shown.map((row, index) => `<div class="allocation-editor-row" data-allocation-index="${index}">
      <label>מחלקה<select name="allocation_unit_id" ${isClosed() ? "disabled" : ""}>${options(state.data.units, "allocation_unit_id", row.allocation_unit_id)}</select></label>
      <label>מעון<select name="daycare_id" ${isClosed() ? "disabled" : ""}>${options(state.data.daycares, "daycare_id", row.daycare_id, (item) => !row.allocation_unit_id || item.allocation_unit_id === row.allocation_unit_id)}</select></label>
      <label>עלות<input name="allocation_amount" type="number" step=".01" value="${esc(row.allocation_amount)}" ${isClosed() ? "disabled" : ""}></label>
      <label>שעות<input name="allocated_hours" type="number" step=".01" value="${esc(row.allocated_hours)}" ${isClosed() ? "disabled" : ""}></label>
      ${!isClosed() && index ? '<button type="button" class="allocation-delete" data-delete-allocation>מחיקה</button>' : ""}
    </div>`).join("");
  };

  const renderDetails = () => {
    state.monthlyAutosave?.destroy();
    state.allocationAutosave?.destroy();
    state.monthlyAutosave = state.allocationAutosave = null;
    const record = state.data.records.find((row) => row.payroll_record_id === state.selected);
    if (!record) {
      $("#wf-details").hidden = true;
      return;
    }
    const employee = employeeFor(record);
    const payTerm = payTermFor(record);
    const allocations = allocationsFor(record);
    const allocatedCost = Number(record.split_summary?.allocated_cost || 0);
    const allocatedHours = Number(record.split_summary?.allocated_hours || 0);
    $("#wf-details").hidden = false;
    $("#wf-details").innerHTML = `<header><div><p class="eyebrow">הכנת שכר חודשית</p>
      <h2>${esc(employee ? `${employee.first_name} ${employee.last_name}` : record.source_employee_identifier)}</h2>
      <p>${statuses[record.employee_match_status]} · ${isClosed() ? "חודש סגור" : "שמירה אוטומטית פעילה"}</p></div>
      <button data-close-details>×</button></header>
      <section class="payroll-persistent-card"><h3>נתוני עובד קבועים · לקריאה בלבד</h3>
        <dl><div><dt>מספר עובד</dt><dd>${esc(record.source_employee_identifier)}</dd></div>
        <div><dt>סוג שכר</dt><dd>${esc(payTerm?.pay_type || "—")}</dd></div>
        <div><dt>תעריף שעתי בסיסי</dt><dd>${record.base_hourly_rate == null ? "—" : money.format(record.base_hourly_rate)}</dd></div>
        <div><dt>תעריף שעתי אפקטיבי</dt><dd>${record.effective_hourly_rate == null ? "—" : money.format(record.effective_hourly_rate)}</dd></div>
        <div><dt>אחוז משרה</dt><dd>${payTerm?.estimated_employment_percentage ?? "—"}</dd></div></dl>
      </section>
      <section class="payroll-persistent-card"><h3>פירוט חישוב מתקדם · לקריאה בלבד</h3>
        <dl>${(record.payroll_components || []).map((component) =>
          `<div><dt>${esc(component.display_name)}</dt><dd>${component.eligible ? "זכאי" : "לא זכאי"} · ${esc(component.configured_rate_display ?? "ללא תעריף")} · ${money.format(Number(component.monthly_impact || 0))}</dd></div>`).join("") || "<div><dt>רכיבים</dt><dd>אין רכיבים פעילים ב-Supabase</dd></div>"}
        <div><dt>ברוטו בסיס</dt><dd>${record.base_gross == null ? "—" : money.format(record.base_gross)}</dd></div>
        <div><dt>ברוטו מחושב</dt><dd>${record.calculated_gross == null ? "—" : money.format(record.calculated_gross)}</dd></div>
        </dl>
      </section>
      <div class="payroll-balance"><span>עלות מקור <strong>${money.format(record.employer_cost || 0)}</strong></span>
        <span>פוצל <strong>${money.format(allocatedCost)}</strong></span>
        <span>פער <strong>${money.format(record.split_summary?.remaining_cost || 0)}</strong></span>
        <span>שעות בפועל מקור <strong>${number.format(record.actual_hours || 0)}</strong></span>
        <span>פער שעות <strong>${number.format(record.split_summary?.remaining_hours || 0)}</strong></span></div>
      <h3>פיצולים פנימיים לדיווח ולתקציב</h3>
      <div id="payroll-allocation-editor">${allocationEditor(record)}</div>
      <div class="dialog-actions">${isClosed() ? "" : '<button class="button button-secondary" data-add-allocation>+ פיצול</button><button class="button button-primary" data-save-allocations>שמירת פיצולים</button>'}
        ${!isClosed() && record.employee_match_status !== "LINKED" ? '<button class="button button-secondary" data-approve-temporary>אישור עובד זמני</button>' : ""}
        ${isClosed() ? "" : '<button class="button button-danger" data-delete-record>מחיקת שורה</button>'}</div>`;

    $("[data-close-details]").onclick = () => {
      state.selected = "";
      renderDetails();
    };
    const collectAllocations = () => [...document.querySelectorAll("[data-allocation-index]")].map((node) => ({
      ...Object.fromEntries([...node.querySelectorAll("input,select")].map((input) => [input.name, input.value])),
      role_id: record.role_id,
    }));
    if (!isClosed()) {
      const allocationKey = `workforce.payroll.allocations.${record.payroll_record_id}`;
      const restored = readAutosaveDraft(allocationKey);
      if (restored && !state.allocationDrafts.has(record.payroll_record_id)) {
        state.allocationDrafts.set(record.payroll_record_id, restored);
        renderDetails();
        return;
      }
      $("#payroll-allocation-editor").insertAdjacentHTML("afterend", '<span class="autosave-status" data-allocation-autosave role="status">נשמר</span>');
      state.allocationAutosave = createAutosave({
        key: allocationKey,
        read: collectAllocations,
        validate: () => true,
        statusTargets: () => document.querySelectorAll("[data-allocation-autosave]"),
        save: (allocations) => request("payroll", "POST", { action: "save_allocations", payroll_record_id: record.payroll_record_id, allocations }),
        onSaved: async () => { state.allocationDrafts.delete(record.payroll_record_id); await reload(); state.selected = record.payroll_record_id; },
      });
      document.querySelectorAll("#payroll-allocation-editor input").forEach((input) =>
        input.addEventListener("input", () => { state.allocationDrafts.set(record.payroll_record_id, collectAllocations()); state.allocationAutosave.markDirty(); })
      );
      document.querySelectorAll("#payroll-allocation-editor select").forEach((input) =>
        input.addEventListener("change", () => { state.allocationDrafts.set(record.payroll_record_id, collectAllocations()); state.allocationAutosave.markDirty({ immediate: true }); })
      );
    }
    $("[data-add-allocation]")?.addEventListener("click", () => {
      state.allocationDrafts.set(record.payroll_record_id, [...collectAllocations(), {
        allocation_unit_id: "", daycare_id: "", role_id: "", allocation_amount: "",
        allocated_hours: "", effective_note: "",
      }]);
      renderDetails();
      state.allocationAutosave?.markDirty();
    });
    document.querySelectorAll("[data-delete-allocation]").forEach((button) => {
      button.onclick = () => {
        const rows = collectAllocations();
        rows.splice(Number(button.closest("[data-allocation-index]").dataset.allocationIndex), 1);
        state.allocationDrafts.set(record.payroll_record_id, rows);
        renderDetails();
        state.allocationAutosave?.markDirty();
      };
    });
    $("[data-save-allocations]")?.addEventListener("click", async () => {
      try {
        await state.allocationAutosave.saveNow({ manual: true });
        message("הפיצולים נשמרו.", "success");
      } catch (error) {
        message(error.message, "error");
      }
    });
    $("[data-approve-temporary]")?.addEventListener("click", async () => {
      const notes = prompt("הערות לאישור הזמני:") || "";
      await request("payroll", "POST", {
        action: "approve_temporary", payroll_record_id: record.payroll_record_id, notes,
      });
      await reload();
      state.selected = record.payroll_record_id;
      renderDetails();
    });
    $("[data-delete-record]")?.addEventListener("click", async () => {
      if (!confirm("למחוק את שורת השכר?")) return;
      await request("payroll", "POST", { action: "delete_record", payroll_record_id: record.payroll_record_id });
      state.selected = "";
      await reload();
    });
  };

  const addEmployeeDialog = () => {
    const active = state.data.employees.filter((employee) => employee.lifecycle_status === "ACTIVE")
      .map((employee) => ({ ...employee, display_name: `${employee.first_name} ${employee.last_name} · ${employee.employee_code}` }));
    $("#wf-dialog-content").innerHTML = `<h2>הוספת עובד לחודש</h2>
      <form id="wf-form" class="workforce-form">
        <label class="wide">עובד קיים<select name="employee_code">${options(active, "employee_code")}</select></label>
        <p class="wide">או עובד זמני — ללא יצירת רשומת עובד:</p>
        <label>מספר עובד זמני<input name="temporary_code"></label>
        <label>סטטוס<select name="employee_match_status"><option value="MISSING">חסר</option><option value="UNRESOLVED">לא פתור</option></select></label>
        <div class="dialog-actions wide"><button class="button button-primary">הוספה</button></div>
      </form>`;
    $("#wf-dialog").showModal();
    $("#wf-form").onsubmit = async (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.target));
      const code = values.employee_code || values.temporary_code;
      if (!code) return;
      await request("payroll", "POST", {
        action: "save_record",
        payroll_month: state.month,
        source_employee_identifier: code,
        employee_match_status: values.employee_match_status,
        record_origin: "MANUAL",
        employer_cost: "",
      });
      $("#wf-dialog").close();
      await reload();
    };
  };

  const exportDialog = () => {
    $("#wf-dialog-content").innerHTML = `<h2>ייצוא שכר</h2>
      <form id="wf-form" class="workforce-form">
        <label>דוח<select name="report"><option value="ALL">כל נתוני השכר</option><option value="ACCOUNTANT">קובץ לרואה חשבון</option><option value="ACTUAL_COST">דוח עלות בפועל</option></select></label>
        <label>היקף<select name="scope"><option value="ALL">כל הארגון</option><option value="FILTERED">התצוגה המסוננת</option><option value="DAYCARE">מעון נבחר</option><option value="UNIT">מחלקה נבחרת</option></select></label>
        <label>פורמט<select name="format"><option value="XLSX">XLSX</option><option value="XLS">XLS</option><option value="CSV">CSV</option></select></label>
        <label>מחלקה<select name="unit">${options(state.data.units, "allocation_unit_id", state.unit)}</select></label>
        <label>מעון<select name="daycare">${options(state.data.daycares, "daycare_id", state.daycare)}</select></label>
        <p class="wide">הקובץ כולל שורה אחת לעובד ואינו כולל פיצולים פנימיים.</p>
        <div class="dialog-actions wide"><button class="button button-primary">הורדת קובץ</button></div>
      </form>`;
    $("#wf-dialog").showModal();
    $("#wf-form").onsubmit = (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.target));
      const scopedRows = (values.scope === "FILTERED" ? filtered() : state.data.records).filter((row) => values.scope === "ALL"
        || values.scope === "FILTERED"
        || (values.scope === "DAYCARE" && row.daycare_id === values.daycare)
        || (values.scope === "UNIT" && row.allocation_unit_id === values.unit));
      const rows = scopedRows;
      const allColumns = [
        ["חודש", (row) => row.payroll_month.slice(0, 7)],
        ["מספר עובד", "source_employee_identifier"],
        ["שם עובד", (row) => {
          const employee = employeeFor(row);
          return employee ? `${employee.first_name} ${employee.last_name}` : "";
        }],
        ["מחלקה", (row) => lookup(state.data.units, row.allocation_unit_id, "allocation_unit_id")],
        ["מעון", (row) => lookup(state.data.daycares, row.daycare_id, "daycare_id")],
        ["תפקיד", (row) => lookup(state.data.roles, row.role_id, "role_id")],
        ...monthlyFields.map(([field, title]) => [title, field]),
      ];
      const actualCostColumns = allColumns.filter(([, getter]) => ![
        "vacation_deduct", "vacation_pay", "sick_deduct", "sick_pay",
        "travel_reimbursement", "bonus_amount", "adjustment_amount",
      ].includes(getter));
      exportPayrollFile(
        rows,
        values.report === "ACTUAL_COST" ? actualCostColumns : allColumns,
        values.report === "ACCOUNTANT" ? `שכר-לרואה-חשבון-${state.month}` : values.report === "ACTUAL_COST" ? `דוח-עלות-בפועל-${state.month}` : `שכר-${state.month}`,
        values.format,
      );
      $("#wf-dialog").close();
    };
  };

  const inlineNumber = (record, field, label) =>
    `<input class="workforce-inline payroll-cell-input" aria-label="${label}" data-payroll-inline="${record.payroll_record_id}" name="${field}" type="number" min="0" step=".01" value="${esc(record[field] ?? "")}" ${isClosed() ? "disabled" : ""}>`;
  const inlineMonthlyInput = (record, column) => {
    const value = record.monthly_input_values?.[column.source_field] ?? "";
    const control = column.input_value_kind === "BOOLEAN"
      ? `<input class="payroll-check" type="checkbox" aria-label="${esc(column.display_name)}" data-payroll-monthly-input="${record.payroll_record_id}" data-input-field="${column.source_field}" ${value === true ? "checked" : ""} ${isClosed() ? "disabled" : ""}>`
      : `<input class="workforce-inline payroll-cell-input" data-payroll-monthly-input="${record.payroll_record_id}" data-input-field="${column.source_field}" type="${column.input_value_kind === "TEXT" ? "text" : "number"}" step=".01" value="${esc(value)}" ${isClosed() ? "disabled" : ""}>`;
    return control;
  };
  const inlineText = (record, field, label) =>
    `<input class="workforce-inline payroll-cell-input" aria-label="${label}" data-payroll-inline="${record.payroll_record_id}" name="${field}" value="${esc(record[field] ?? "")}" ${isClosed() ? "disabled" : ""}>`;
  const componentKey = (column) => String(column.compensation_factor_code || column.display_name || "").toUpperCase();
  const configuredMonthlyInput = (columns, sourceField) => columns.find((column) => column.source_field === sourceField);
  const entryInputFields = ["work_days", "regular_hours", "hours_125", "hours_150"];
  const absenceInputFields = ["vacation_deduct", "vacation_pay", "sick_deduct", "sick_pay"];
  const visibleComponentMatchers = [["SENIOR"], ["CERT"], ["DEGREE"], ["EXCELL"], ["CLASS"], ["PERSIST"], ["TRAVEL"], ["HAVRAA", "RECOVERY"]];
  const componentHeader = (column) => ({
    SENIOR: "וותק", CERT: "תעודה", DEGREE: "תואר", EXCELL: "מצוינות",
    CLASS: "אחראית כיתה", PERSIST: "התמדה", TRAVEL: "נסיעות", HAVRAA: "הבראה", RECOVERY: "הבראה",
  })[visibleComponentMatchers.flat().find((matcher) => componentKey(column).includes(matcher))] || column.display_name;
  const visibleComponents = (columns) => visibleComponentMatchers.map((matchers) =>
    columns.find((column) => matchers.some((matcher) => componentKey(column).includes(matcher)))).filter(Boolean);
  const inlineComponent = (record, column, inputColumns) => {
    const component = (record.payroll_components || []).find((item) =>
      item.compensation_factor_id === column.compensation_factor_id);
    const key = componentKey(column);
    const persistenceInput = key.includes("PERSIST") ? configuredMonthlyInput(inputColumns, "no_absence") : null;
    const automatic = !isManualRecord(record) && (key.includes("SENIOR") || key.includes("HAVRAA") || key.includes("RECOVERY"));
    const checked = persistenceInput
      ? record.monthly_input_values?.[persistenceInput.source_field] === true
      : component?.eligible;
    return `<div class="payroll-component-cell">
      <input class="payroll-check" type="checkbox" aria-label="${esc(componentHeader(column))}" ${persistenceInput ? `data-payroll-monthly-input="${record.payroll_record_id}" data-input-field="${persistenceInput.source_field}"` : automatic ? "disabled" : `data-payroll-component="${record.payroll_record_id}" data-component-id="${column.compensation_factor_id}"`} ${checked ? "checked" : ""} ${isClosed() ? "disabled" : ""}>
      <strong>${money.format(checked ? Number(component?.monthly_impact || 0) : 0)}</strong>
    </div>`;
  };
  const inlineLookup = (record, field, rows, idField, label) =>
    `<select class="workforce-inline payroll-cell-select" aria-label="${label}" data-payroll-inline="${record.payroll_record_id}" name="${field}" ${isClosed() ? "disabled" : ""}>${options(rows, idField, record[field])}</select>`;
  const splitSummary = (record) => {
    const preview = state.splitPreviews.get(record.payroll_record_id);
    if (preview) return preview;
    const values = record.split_summary || {};
    return {
      parent: { standard_hours: Number(record.standard_hours || 0), net: Number(record.actual_net || 0), gross: Number(record.actual_gross || 0), employer_cost: Number(record.employer_cost || 0) },
      allocated: { standard_hours: Number(values.allocated_standard_hours || 0), net: Number(values.allocated_net || 0), gross: Number(values.allocated_gross || 0), employer_cost: Number(values.allocated_cost || 0) },
      remaining: { standard_hours: Number(values.remaining_standard_hours || 0), net: Number(values.remaining_net || 0), gross: Number(values.remaining_gross || 0), employer_cost: Number(values.remaining_cost || 0) },
      balanced: record.row_status === "SPLIT", state: record.row_status === "SPLIT" ? "BALANCED" : "MISSING",
    };
  };
  const splitLine = (label, values) => `${label}: שעות ${number.format(values.standard_hours || 0)} · נטו ${money.format(values.net || 0)} · ברוטו ${money.format(values.gross || 0)} · עלות ${money.format(values.employer_cost || 0)}`;
  const inlineSplitRows = (record, leadingColumns) => {
    const rows = allocationsFor(record).length ? allocationsFor(record) : [{ allocation_unit_id: "", daycare_id: "", allocated_hours: "", allocated_standard_hours: "", allocated_net: "", allocated_gross: "", allocation_amount: "" }];
    const summary = splitSummary(record);
    const summaryLabel = summary.state === "BALANCED" ? "תקין" : summary.state === "OVER" ? "בעייתי" : "חסר";
    const summaryClass = summary.state === "BALANCED" ? "complete" : summary.state === "OVER" ? "error" : "missing";
    return rows.map((split, index) => `<tr class="bank-split-line payroll-inline-split" data-inline-allocation="${record.payroll_record_id}" data-inline-allocation-index="${index}"><td></td><td colspan="${leadingColumns - 1}"><span class="payroll-split-parent">↳ ${index + 1}</span></td><td><select name="allocation_unit_id">${options(state.data.units, "allocation_unit_id", split.allocation_unit_id)}</select></td><td><select name="daycare_id">${options(state.data.daycares, "daycare_id", split.daycare_id)}</select></td><td><input name="allocated_standard_hours" type="number" step=".01" value="${esc(split.allocated_standard_hours ?? split.allocated_hours ?? "")}"></td><td><input name="allocated_net" type="number" step=".01" value="${esc(split.allocated_net ?? "")}"></td><td><input name="allocated_gross" type="number" step=".01" value="${esc(split.allocated_gross ?? "")}"></td><td><input name="allocation_amount" type="number" step=".01" value="${esc(split.allocation_amount ?? "")}"><input name="allocated_hours" type="hidden" value="${esc(split.allocated_hours ?? split.allocated_standard_hours ?? "")}"></td><td colspan="3"><button class="button button-quiet" data-delete-inline-split="${record.payroll_record_id}" data-split-index="${index}">מחיקה</button></td></tr>`).join("")
      + `<tr class="split-summary-row payroll-split-summary ${summaryClass}" data-split-summary="${record.payroll_record_id}"><td colspan="${leadingColumns + 9}"><span>${splitLine("אב", summary.parent)}</span><span>${splitLine("הוקצה", summary.allocated)}</span><span>${splitLine("נותר", summary.remaining)}</span><strong class="split-badge">${summaryLabel}</strong></td></tr>`
      + `<tr class="transfer-add-child payroll-split-add-row"><td colspan="${leadingColumns + 9}"><button class="button button-secondary" data-add-inline-split="${record.payroll_record_id}" type="button">+ הוספת פיצול</button></td></tr>`;
  };

  function render() {
    const rows = filtered();
    const records = state.data.records;
    const current = month();
    const counts = state.data.reportSummary.counts;
    const kpis = [
      ["", "כל העובדים", counts.all],
      ["LINKED", "מקושרים", counts.linked],
      ["MISSING", "חסרים", counts.missing],
      ["APPROVED_TEMPORARY", "זמניים מאושרים", counts.approved_temporary],
      ["UNRESOLVED", "לא פתורים", counts.unresolved],
      ["INVALID", "שורות לא תקינות", counts.invalid],
    ];
    $("#wf-kpis").hidden = true;
    $("#payroll-month-workflow").hidden = true;
    $("#wf-kpis").innerHTML = `<div class="payroll-month-state ${isClosed() ? "closed" : "current"}">
      <strong>${current ? (isClosed() ? "חודש סגור" : "חודש נוכחי") : "חודש טרם נפתח"}</strong><span>${state.month}</span></div>`
      + kpis.map(([id, title, value]) => `<button data-kpi="${id}"><strong>${value}</strong><span>${title}</span><small>פתיחת מסנן</small></button>`).join("");
    const allInputColumns = state.data.monthlyInputColumns || [];
    const entryInputColumns = entryInputFields.map((field) => configuredMonthlyInput(allInputColumns, field)).filter(Boolean);
    const absenceInputColumns = absenceInputFields.map((field) => configuredMonthlyInput(allInputColumns, field)).filter(Boolean);
    const componentColumns = visibleComponents(state.data.componentColumns || []);
    const employeeColumns = 8;
    const leadingColumns = employeeColumns + entryInputColumns.length + componentColumns.length + absenceInputColumns.length + 1;
    $("#wf-head").innerHTML = `<tr class="payroll-group-head"><th colspan="${employeeColumns}">עובד</th><th colspan="${entryInputColumns.length}">שעות</th><th colspan="${componentColumns.length}">רכיבי שכר</th><th colspan="${absenceInputColumns.length + 1}">היעדרויות והערות</th><th colspan="9">הנה״ח</th></tr><tr>
      <th><button class="payroll-split-add" data-add-payroll-row aria-label="הוספת שורת שכר" title="הוספת שורת שכר">+</button></th><th class="bank-sticky-number"><button data-sort="code">מס׳ עובד</button></th><th class="payroll-sticky-employee"><button data-sort="employee">שם עובד</button></th><th>תפקיד</th><th>מחלקה</th><th>מעון</th><th>וותק</th><th>תעריף בסיס</th>
      ${entryInputColumns.map((column) => `<th>${esc(column.display_name)}</th>`).join("")}
      ${componentColumns.map((column) => `<th>${esc(componentHeader(column))}</th>`).join("")}
      ${absenceInputColumns.map((column) => `<th>${esc(column.display_name)}</th>`).join("")}<th>הערות</th>
      <th>מחלקה</th><th>מעון</th><th>שעות תקן</th><th>נטו</th><th>ברוטו</th><th><button data-sort="cost">עלות מעסיק</button></th><th>פיצול</th><th>מחיקה</th><th>שמירה</th></tr>`;
    $("#wf-count").textContent = `${rows.length} עובדים`;
    const activeEmployees = state.data.employees.filter((employee) => employee.lifecycle_status === "ACTIVE")
      .map((employee) => ({ ...employee, display_name: `${employee.first_name} ${employee.last_name} · ${employee.employee_code}` }));
    const employeeChoices = activeEmployees.map((employee) => `<option value="${esc(employee.display_name)}"></option>`).join("");
    $("#wf-rows").innerHTML = rows.map((record, rowIndex) => {
      const employee = employeeFor(record);
      const payTerm = payTermFor(record);
      const health = healthFor(record);
      const manual = manualEmployeeFor(record);
      const manualRow = isManualRecord(record);
      const months = record.seniority_months;
      return `<tr class="bank-row-${health.code}">
        <td class="payroll-row-number"><span>${rowIndex + 1}</span><input type="checkbox" data-payroll-select="${record.payroll_record_id}" ${state.selectedRows.has(record.payroll_record_id) ? "checked" : ""} aria-label="בחירת שורה ${rowIndex + 1}"></td>
        <td class="bank-sticky-number">${manualRow ? `<input class="workforce-inline payroll-cell-input" list="payroll-employee-search" data-payroll-manual="${record.payroll_record_id}" data-manual-field="employee_identifier" value="${esc(manual.employee_identifier || (String(record.source_employee_identifier || "").startsWith("DRAFT-") ? "" : record.source_employee_identifier))}" placeholder="מס׳ או שם">` : esc(record.source_employee_identifier)}</td>
        <td class="payroll-sticky-employee">${manualRow ? `<input class="workforce-inline payroll-cell-input" data-payroll-manual="${record.payroll_record_id}" data-manual-field="name" value="${esc(manual.name || manual.employee_name || "")}" placeholder="שם עובד">` : esc(employeeName(record))}</td>
        <td>${manualRow ? `<select class="workforce-inline payroll-cell-select" data-payroll-manual="${record.payroll_record_id}" data-manual-field="role_id">${options(state.data.roles, "role_id", record.role_id)}</select>` : esc(lookup(state.data.roles, record.role_id, "role_id"))}</td><td>${manualRow ? `<select class="workforce-inline payroll-cell-select" data-payroll-manual="${record.payroll_record_id}" data-manual-field="allocation_unit_id">${options(state.data.units, "allocation_unit_id", record.allocation_unit_id)}</select>` : esc(lookup(state.data.units, record.allocation_unit_id, "allocation_unit_id"))}</td><td>${manualRow ? `<select class="workforce-inline payroll-cell-select" data-payroll-manual="${record.payroll_record_id}" data-manual-field="daycare_id">${options(state.data.daycares, "daycare_id", record.daycare_id)}</select>` : esc(lookup(state.data.daycares, record.daycare_id, "daycare_id"))}</td><td>${manualRow ? `<input class="workforce-inline payroll-cell-input" type="number" min="0" data-payroll-manual="${record.payroll_record_id}" data-manual-field="seniority_months" value="${esc(months ?? "")}">` : (months == null ? "—" : number.format(months))}</td><td>${manualRow ? `<input class="workforce-inline payroll-cell-input" type="number" min="0" step=".01" data-payroll-manual="${record.payroll_record_id}" data-manual-field="base_hourly_rate" value="${esc(record.base_hourly_rate ?? "")}">` : (record.base_hourly_rate == null ? "—" : money.format(record.base_hourly_rate))}</td>
        ${entryInputColumns.map((column) => `<td>${inlineMonthlyInput(record, column)}</td>`).join("")}
        ${componentColumns.map((column) => `<td>${inlineComponent(record, column, allInputColumns)}</td>`).join("")}
        ${absenceInputColumns.map((column) => `<td>${inlineMonthlyInput(record, column)}</td>`).join("")}<td>${inlineText(record, "notes", "הערות חודשיות")}</td>
        <td>${inlineLookup(record, "actual_allocation_unit_id", state.data.units, "allocation_unit_id", "מחלקה")}</td>
        <td>${inlineLookup(record, "actual_daycare_id", state.data.daycares, "daycare_id", "מעון")}</td>
        <td>${inlineNumber(record, "standard_hours", "שעות תקן")}</td><td>${inlineNumber(record, "actual_net", "נטו")}</td><td>${inlineNumber(record, "actual_gross", "ברוטו")}</td><td>${inlineNumber(record, "employer_cost", "עלות מעסיק")}</td>
        <td><button class="payroll-split-add" title="פיצול" aria-label="פיצול" data-inline-split="${record.payroll_record_id}">+</button></td><td><button class="button button-quiet" data-delete-payroll="${record.payroll_record_id}" ${isClosed() ? "disabled" : ""}>מחיקה</button></td><td><span class="bank-row-status ${health.code}">${esc(health.label || health.reason || "נשמר")}</span></td></tr>`
        + (state.inlineSplit === record.payroll_record_id ? inlineSplitRows(record, leadingColumns) : "");
    }).join("") + `<datalist id="payroll-employee-search">${employeeChoices}</datalist>`;
    let bulk = $("#wf-payroll-bulk");
    if (!bulk) {
      bulk = document.createElement("div");
      bulk.id = "wf-payroll-bulk";
      bulk.className = "workbench-bulk-bar";
      $("#wf-count").parentElement.after(bulk);
    }
    bulk.hidden = !state.selectedRows.size;
    bulk.innerHTML = `<strong>${state.selectedRows.size} נבחרו</strong><button class="button button-danger" data-delete-selected-payroll ${isClosed() ? "disabled" : ""}>מחיקת נבחרות</button>`;
    document.querySelectorAll("[data-open]").forEach((button) => {
      button.onclick = () => {
        state.selected = button.dataset.open;
        renderDetails();
      };
    });
    document.querySelectorAll("[data-payroll-inline]").forEach((field) => {
      field.onchange = () => saveInline(
        state.data.records.find((record) => record.payroll_record_id === field.dataset.payrollInline),
        field.name,
        field.value
      );
    });
    document.querySelectorAll("[data-inline-split]").forEach((button) => {
      button.onclick = () => {
        const record = state.data.records.find((row) => row.payroll_record_id === button.dataset.inlineSplit);
        if (state.inlineSplit !== button.dataset.inlineSplit && !allocationsFor(record).length) state.allocationDrafts.set(record.payroll_record_id, [
          { allocation_unit_id:record.actual_allocation_unit_id || record.allocation_unit_id || "", daycare_id:record.actual_daycare_id || record.daycare_id || "", allocated_hours:record.actual_hours ?? record.standard_hours ?? "", allocated_standard_hours:record.standard_hours ?? "", allocated_net:record.actual_net ?? "", allocated_gross:record.actual_gross ?? "", allocation_amount:record.employer_cost ?? "" },
          { allocation_unit_id:"", daycare_id:"", allocated_hours:"", allocated_standard_hours:"", allocated_net:"", allocated_gross:"", allocation_amount:"" },
        ]);
        state.inlineSplit = state.inlineSplit === button.dataset.inlineSplit ? null : button.dataset.inlineSplit; render();
      };
    });
    const collectInlineAllocations = (recordId) => [...document.querySelectorAll(`[data-inline-allocation="${recordId}"]`)].map((row) => {
      const values = Object.fromEntries([...row.querySelectorAll("input,select")].map((input) => [input.name, input.value]));
      values.allocated_hours = values.allocated_standard_hours;
      values.role_id = state.data.records.find((record) => record.payroll_record_id === recordId)?.role_id;
      return values;
    });
    const updateSplitSummary = (recordId, preview) => {
      const cell = document.querySelector(`[data-split-summary="${recordId}"] td:last-child`);
      if (!cell) return;
      const label = preview.state === "BALANCED" ? "תקין" : preview.state === "OVER" ? "בעייתי" : "חסר";
      cell.parentElement.className = `payroll-split-summary ${preview.state === "BALANCED" ? "complete" : preview.state === "OVER" ? "error" : "missing"}`;
      cell.innerHTML = `<span>${splitLine("אב", preview.parent)}</span><span>${splitLine("הוקצה", preview.allocated)}</span><span>${splitLine("נותר", preview.remaining)}</span><strong>${label}</strong>`;
    };
    const previewInlineAllocations = async (recordId) => {
      const rows = collectInlineAllocations(recordId);
      state.allocationDrafts.set(recordId, rows);
      const preview = await request("payroll", "POST", { action: "preview_allocations", payroll_record_id: recordId, allocations: rows });
      state.splitPreviews.set(recordId, preview);
      updateSplitSummary(recordId, preview);
      return preview;
    };
    const saveInlineAllocations = async (recordId) => {
      const rows = collectInlineAllocations(recordId);
      state.allocationDrafts.set(recordId, rows);
      await request("payroll", "POST", { action:"save_allocations", payroll_record_id:recordId, allocations:rows });
      state.splitPreviews.delete(recordId); await reload(); state.inlineSplit = recordId;
    };
    document.querySelectorAll("[data-inline-allocation] input,[data-inline-allocation] select").forEach((field) => {
      field.oninput = async () => {
        const recordId = field.closest("[data-inline-allocation]").dataset.inlineAllocation;
        try { await previewInlineAllocations(recordId); } catch (error) { message(error.message || "לא ניתן לאמת את הפיצול.", "error"); }
      };
      field.onchange = async () => {
        const recordId = field.closest("[data-inline-allocation]").dataset.inlineAllocation;
        try { if ((await previewInlineAllocations(recordId)).balanced) await saveInlineAllocations(recordId); } catch (error) { message(error.message || "לא ניתן לשמור את הפיצול.", "error"); }
      };
    });
    document.querySelectorAll("[data-add-inline-split]").forEach((button) => button.onclick = () => {
      const record = state.data.records.find((item) => item.payroll_record_id === button.dataset.addInlineSplit);
      state.allocationDrafts.set(record.payroll_record_id, [...allocationsFor(record), { allocation_unit_id:"", daycare_id:"", allocated_hours:"", allocated_standard_hours:"", allocated_net:"", allocated_gross:"", allocation_amount:"" }]);
      state.splitPreviews.delete(record.payroll_record_id); state.inlineSplit = record.payroll_record_id; render();
    });
    document.querySelectorAll("[data-delete-inline-split]").forEach((button) => button.onclick = () => {
      const rows = [...allocationsFor(state.data.records.find((row) => row.payroll_record_id === button.dataset.deleteInlineSplit))];
      rows.splice(Number(button.dataset.splitIndex), 1); state.allocationDrafts.set(button.dataset.deleteInlineSplit, rows);
      state.splitPreviews.delete(button.dataset.deleteInlineSplit); state.inlineSplit = button.dataset.deleteInlineSplit; render();
    });
    document.querySelectorAll("[data-payroll-component]").forEach((field) => {
      field.onchange = () => {
        const record = state.data.records.find((row) => row.payroll_record_id === field.dataset.payrollComponent);
        const overrides = { ...(record.monthly_overrides || {}) };
        overrides[field.dataset.componentId] = field.checked;
        return saveInline(record, "monthly_overrides", overrides);
      };
    });
    document.querySelectorAll("[data-payroll-monthly-input]").forEach((field) => {
      field.oninput = () => {
        const record = state.data.records.find((row) => row.payroll_record_id === field.dataset.payrollMonthlyInput);
        const inputs = { ...(record.monthly_inputs || {}) };
        inputs[field.dataset.inputField] = field.type === "checkbox" ? field.checked : field.value;
        const key = `${record.payroll_record_id}:${field.dataset.inputField}`;
        clearTimeout(state.monthlyInputTimers.get(key));
        state.monthlyInputTimers.set(key, setTimeout(() => saveInline(record, "monthly_inputs", inputs), 250));
      };
      field.onchange = field.oninput;
    });
    document.querySelectorAll("[data-payroll-select]").forEach((field) => {
      field.onchange = () => {
        field.checked ? state.selectedRows.add(field.dataset.payrollSelect) : state.selectedRows.delete(field.dataset.payrollSelect);
        render();
      };
    });
    $("[data-payroll-select-all]")?.addEventListener("change", (event) => {
      rows.forEach((record) => event.target.checked
        ? state.selectedRows.add(record.payroll_record_id)
        : state.selectedRows.delete(record.payroll_record_id));
      render();
    });
    document.querySelectorAll("[data-delete-payroll]").forEach((button) => {
      button.onclick = () => deleteRecords([button.dataset.deletePayroll]);
    });
    $("[data-delete-selected-payroll]")?.addEventListener("click", () => deleteRecords([...state.selectedRows]));
    document.querySelectorAll("[data-payroll-manual]").forEach((field) => {
      const saveManual = async () => {
        const record = state.data.records.find((row) => row.payroll_record_id === field.dataset.payrollManual);
        if (!record) return;
        const manual = { ...manualEmployeeFor(record), draft: false };
        const fieldName = field.dataset.manualField;
        const selectedEmployee = fieldName === "employee_identifier"
          ? state.data.employees.find((employee) => `${employee.first_name} ${employee.last_name} · ${employee.employee_code}` === field.value || employee.employee_code === field.value)
          : null;
        const changes = { source_payload: { ...(record.source_payload || {}), manual_employee: manual } };
        if (fieldName === "employee_identifier") {
          changes.source_employee_identifier = selectedEmployee?.employee_code || field.value || record.source_employee_identifier;
          manual.employee_identifier = changes.source_employee_identifier;
          manual.name = selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : manual.name || "";
        } else if (["role_id", "allocation_unit_id", "daycare_id"].includes(fieldName)) {
          changes[fieldName] = field.value || null;
        } else if (fieldName === "name") {
          manual.name = field.value;
        } else {
          manual[fieldName] = field.value === "" ? null : Number(field.value);
        }
        try {
          Object.assign(record, changes);
          const saved = await request("payroll", "POST", { action:"save_record", payroll_record_id:record.payroll_record_id, import_batch_id:record.import_batch_id, record_origin:"MANUAL", payroll_month:state.month, ...record });
          Object.assign(record, saved.record || {}, { manual_employee: manual, source_payload: changes.source_payload });
          if (selectedEmployee) await reload();
          message(selectedEmployee ? "פרטי העובד נטענו." : "טיוטת השכר נשמרה.", "success");
        } catch (error) {
          message(error.message || "לא ניתן לשמור את הטיוטה.", "error");
          await reload();
        }
      };
      field.onchange = saveManual;
      if (field.tagName === "INPUT") {
        field.oninput = () => {
          const key = `${field.dataset.payrollManual}:${field.dataset.manualField}`;
          clearTimeout(state.manualInputTimers.get(key));
          state.manualInputTimers.set(key, setTimeout(saveManual, 250));
        };
      }
    });
    $("[data-add-payroll-row]")?.addEventListener("click", createPayrollDraft);
    document.querySelectorAll("[data-sort]").forEach((button) => {
      button.onclick = () => {
        state.direction = state.sort === button.dataset.sort ? -state.direction : 1;
        state.sort = button.dataset.sort;
        render();
      };
    });
    document.querySelectorAll("[data-kpi]").forEach((button) => {
      button.onclick = () => {
        state.status = button.dataset.kpi === "INVALID" ? "" : button.dataset.kpi;
        $("#wf-status").value = state.status;
        render();
      };
    });
    $("#wf-add").disabled = isClosed() || !current;
    $("#wf-import").disabled = isClosed() || !current;
    $("#wf-export").disabled = !current;
    $("#wf-search").disabled = !current;
    $("#wf-status").disabled = !current;
    $("#wf-unit").disabled = !current;
    $("#wf-daycare").disabled = !current;
    $("#wf-clear").disabled = !current;
    $("#wf-close-month").disabled = !current || (isClosed() && !state.data.canReopen);
    $("#wf-close-month").textContent = isClosed() ? "פתיחה מחדש" : "סגירת חודש";
  }

  state.data = await request("payroll", "GET", null, state.month);
  const initialMonth = state.data.months.find((row) => row.payroll_month_id === state.monthId && monthKey(row) === state.month);
  if (!initialMonth) throw new Error("חודש השכר שנבחר לא נמצא.");
  $("#wf-status").innerHTML = '<option value="">כל הסטטוסים</option>'
    + Object.entries(statuses).map(([key, value]) => `<option value="${key}">${value}</option>`).join("");
  $("#wf-unit").innerHTML = '<option value="">כל המחלקות</option>'
    + options(state.data.units, "allocation_unit_id").replace('<option value="">בחירה…</option>', "");
  $("#wf-daycare").innerHTML = '<option value="">כל המעונות</option>'
    + options(state.data.daycares, "daycare_id").replace('<option value="">בחירה…</option>', "");
  $("#wf-month").value = state.month;
  $("#wf-month").disabled = true;
  $("#wf-search").oninput = (event) => {
    state.query = event.target.value;
    render();
  };
  $("#wf-status").onchange = (event) => {
    state.status = event.target.value;
    render();
  };
  $("#wf-unit").onchange = (event) => {
    state.unit = event.target.value;
    render();
  };
  $("#wf-daycare").onchange = (event) => {
    state.daycare = event.target.value;
    render();
  };
  $("#wf-clear").onclick = () => {
    state.query = state.status = state.unit = state.daycare = "";
    ["#wf-search", "#wf-status", "#wf-unit", "#wf-daycare"].forEach((selector) => {
      $(selector).value = "";
    });
    render();
  };
  $("#wf-close-month").onclick = closeOrReopen;
  $("#wf-add").onclick = createPayrollDraft;
  $("#wf-export").onclick = exportDialog;
  $("#wf-import").onclick = () => $("#wf-file").click();
  $("#wf-file").onchange = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      message("קורא את הקובץ…");
      const sourceRows = (await window.parsePayrollWorkbookForWorkbench(file))
        .map((row) => ({ ...row, payroll_month: state.month }));
      const preview = await request("payroll", "POST", { action: "preview_import", rows: sourceRows });
      $("#wf-dialog-content").innerHTML = `<h2>תצוגה מקדימה לייבוא</h2>
        <div class="import-summary"><span>${preview.summary.total} שורות</span><span>${preview.summary.linked} מקושרות</span><span>${preview.summary.missing} חסרות</span></div>
        <div class="import-preview-scroll"><table><thead><tr><th>שורה</th><th>מס׳ עובד</th><th>עובד</th><th>עלות</th><th>מצב</th></tr></thead>
        <tbody>${preview.rows.map((row) => `<tr class="${row.importable ? "" : "import-skip"}"><td>${row.source_row_number}</td><td>${esc(row.employee_number)}</td><td>${esc(row.employee_name || "—")}</td><td>${Number.isFinite(row.employer_cost) ? money.format(row.employer_cost) : "לא תקין"}</td><td>${statuses[row.employee_match_status]}${row.importable ? "" : " · דילוג"}</td></tr>`).join("")}</tbody></table></div>
        <div class="dialog-actions"><button id="wf-confirm-import" class="button button-primary">אישור ייבוא</button></div>`;
      $("#wf-dialog").showModal();
      $("#wf-confirm-import").onclick = async () => {
        for (const row of preview.rows.filter((item) => item.importable)) {
          await request("payroll", "POST", {
            action: "save_record",
            record_origin: "IMPORT",
            source_file_name: file.name,
            preview_token: preview.preview_token,
            source_payload: { source_row_number: row.source_row_number },
            source_employee_identifier: row.employee_number,
            ...row,
          });
        }
        $("#wf-dialog").close();
        await reload();
        message("הייבוא הושלם.", "success");
      };
    } catch (error) {
      message(error.message, "error");
    }
  };
  render();
  message("הנתונים נטענו מ-Supabase בלבד.", "success");
}
