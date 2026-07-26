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
  ["regular_hours", "שעות רגילות"],
  ["hours_125", "שעות 125%"],
  ["hours_150", "שעות 150%"],
  ["overtime_hours", "שעות נוספות"],
  ["vacation_hours", "שעות חופשה"],
  ["sick_hours", "שעות מחלה"],
  ["other_absence_hours", "היעדרות אחרת"],
  ["unpaid_absence_hours", "היעדרות ללא תשלום"],
  ["gross_pay", "ברוטו"],
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

export async function mountPayrollWorkbench(request) {
  const $ = (selector) => document.querySelector(selector);
  const state = {
    data: null,
    month: new Date().toISOString().slice(0, 7),
    selected: "",
    query: "",
    status: "",
    unit: "",
    daycare: "",
    sort: "employee",
    direction: 1,
    allocationDrafts: new Map(),
    monthlyAutosave: null,
    allocationAutosave: null,
  };
  const message = (value, tone = "") => {
    $("#wf-message").textContent = value;
    $("#wf-message").className = tone;
  };

  document.querySelector(".bank-import-actions").insertAdjacentHTML(
    "afterbegin",
    '<button id="wf-open-month" class="button button-secondary">חודש חדש</button><button id="wf-close-month" class="button button-primary">סגירת חודש</button>'
  );

  const month = () => state.data.months.find((row) => row.payroll_month.slice(0, 7) === state.month);
  const isClosed = () => month()?.month_status === "CLOSED";
  const employeeFor = (record) => {
    const employment = state.data.employments.find((row) => row.employment_id === record.employment_id);
    return state.data.employees.find((row) => row.employee_id === employment?.employee_id);
  };
  const payTermFor = (record) =>
    state.data.payTerms.find((row) => row.employee_pay_term_id === record.employee_pay_term_id);
  const allocationsFor = (record) => state.allocationDrafts.get(record.payroll_record_id)
    || state.data.allocations.filter((row) => row.payroll_record_id === record.payroll_record_id);
  const invalid = (record) => !record.source_employee_identifier
    || record.employer_cost == null
    || !record.allocation_unit_id
    || !record.role_id
    || ((state.data.units.find((row) => row.allocation_unit_id === record.allocation_unit_id)?.unit_type
      || state.data.units.find((row) => row.allocation_unit_id === record.allocation_unit_id)?.allocation_unit_type) === "DAYCARE"
      && !record.daycare_id);
  const filtered = () => state.data.records.filter((record) => {
    const employee = employeeFor(record);
    const search = `${record.source_employee_identifier} ${employee?.first_name || ""} ${employee?.last_name || ""}`.toLowerCase();
    return (!state.query || search.includes(state.query.toLowerCase()))
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

  const openMonthDialog = () => {
    $("#wf-dialog-content").innerHTML = `<h2>פתיחת חודש שכר</h2>
      <form id="wf-form" class="workforce-form">
        <label>חודש<input name="payroll_month" type="month" required value="${esc(state.month)}"></label>
        <fieldset class="wide payroll-opening-options">
          <legend>מקור רשימת העובדים</legend>
          <label><input type="radio" name="opening_method" value="PREVIOUS_MONTH" checked> העתקת עובדי החודש הקודם</label>
          <label><input type="radio" name="opening_method" value="ACTIVE_EMPLOYEES"> כל העובדים הפעילים</label>
          <label><input type="radio" name="opening_method" value="EMPTY"> חודש ריק</label>
          <small>מועתקים רק העובדים והשיבוץ הבסיסי. ערכי שכר חודשיים אינם מועתקים.</small>
        </fieldset>
        <div class="dialog-actions wide"><button class="button button-primary">פתיחה ומעבר לחודש</button></div>
      </form>`;
    $("#wf-dialog").showModal();
    $("#wf-form").onsubmit = async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(event.target));
      await request("payroll", "POST", { action: "open_month", ...payload });
      state.month = payload.payroll_month;
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
      const notes = prompt("סיבת פתיחת החודש מחדש:");
      if (!notes) return;
      await request("payroll", "POST", { action: "reopen_month", payroll_month: state.month, notes });
      await reload();
      return message("החודש נפתח מחדש.", "success");
    }
    const invalidRows = state.data.records.filter(invalid);
    const unresolved = state.data.records.filter((row) => ["MISSING", "UNRESOLVED"].includes(row.employee_match_status));
    if (invalidRows.length || unresolved.length) {
      return message(`לא ניתן לסגור: ${invalidRows.length} שורות לא תקינות, ${unresolved.length} עובדים לא פתורים.`, "error");
    }
    if (!confirm(`לסגור את חודש ${state.month} ולנעול עריכה?`)) return;
    await request("payroll", "POST", { action: "close_month", payroll_month: state.month });
    await reload();
    message("החודש נסגר וננעל.", "success");
  };

  const allocationEditor = (record) => {
    const rows = allocationsFor(record);
    const shown = rows.length ? rows : [{
      allocation_unit_id: "", daycare_id: "", role_id: "", allocation_amount: "",
      allocated_hours: "", effective_note: "",
    }];
    return shown.map((row, index) => `<div class="allocation-editor-row" data-allocation-index="${index}">
      <label>מחלקה<select name="allocation_unit_id" ${isClosed() ? "disabled" : ""}>${options(state.data.units, "allocation_unit_id", row.allocation_unit_id)}</select></label>
      <label>מעון<select name="daycare_id" ${isClosed() ? "disabled" : ""}>${options(state.data.daycares, "daycare_id", row.daycare_id, (item) => !row.allocation_unit_id || item.allocation_unit_id === row.allocation_unit_id)}</select></label>
      <label>תפקיד<select name="role_id" ${isClosed() ? "disabled" : ""}>${options(state.data.roles, "role_id", row.role_id)}</select></label>
      <label>עלות<input name="allocation_amount" type="number" step=".01" value="${esc(row.allocation_amount)}" ${isClosed() ? "disabled" : ""}></label>
      <label>שעות<input name="allocated_hours" type="number" step=".01" value="${esc(row.allocated_hours)}" ${isClosed() ? "disabled" : ""}></label>
      <label>הערה<input name="effective_note" value="${esc(row.effective_note || "")}" ${isClosed() ? "disabled" : ""}></label>
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
    const allocatedCost = allocations.reduce((sum, row) => sum + Number(row.allocation_amount || 0), 0);
    const allocatedHours = allocations.reduce((sum, row) => sum + Number(row.allocated_hours || 0), 0);
    $("#wf-details").hidden = false;
    $("#wf-details").innerHTML = `<header><div><p class="eyebrow">הכנת שכר חודשית</p>
      <h2>${esc(employee ? `${employee.first_name} ${employee.last_name}` : record.source_employee_identifier)}</h2>
      <p>${statuses[record.employee_match_status]} · ${isClosed() ? "חודש סגור" : "שמירה אוטומטית פעילה"}</p></div>
      <button data-close-details>×</button></header>
      <section class="payroll-persistent-card"><h3>נתוני עובד קבועים · לקריאה בלבד</h3>
        <dl><div><dt>מספר עובד</dt><dd>${esc(record.source_employee_identifier)}</dd></div>
        <div><dt>סוג שכר</dt><dd>${esc(payTerm?.pay_type || "—")}</dd></div>
        <div><dt>שכר בסיס</dt><dd>${payTerm ? money.format(payTerm.base_pay) : "—"}</dd></div>
        <div><dt>אחוז משרה</dt><dd>${payTerm?.estimated_employment_percentage ?? "—"}</dd></div></dl>
      </section>
      <form id="payroll-monthly-form" class="workforce-form">
        <input type="hidden" name="source_employee_identifier" value="${esc(record.source_employee_identifier)}">
        <label>מחלקה<select name="allocation_unit_id" ${isClosed() ? "disabled" : ""}>${options(state.data.units, "allocation_unit_id", record.allocation_unit_id)}</select></label>
        <label>מעון<select name="daycare_id" ${isClosed() ? "disabled" : ""}>${options(state.data.daycares, "daycare_id", record.daycare_id, (row) => !record.allocation_unit_id || row.allocation_unit_id === record.allocation_unit_id)}</select></label>
        <label>תפקיד<select name="role_id" ${isClosed() ? "disabled" : ""}>${options(state.data.roles, "role_id", record.role_id)}</select></label>
        ${monthlyFields.map(([name, title]) => `<label>${title}<input name="${name}" type="number" step=".01" value="${esc(record[name] ?? "")}" ${isClosed() ? "disabled" : ""}></label>`).join("")}
        <label class="wide">הערות חודשיות<textarea name="notes" ${isClosed() ? "disabled" : ""}>${esc(record.notes || "")}</textarea></label>
        <div class="dialog-actions wide"><p id="payroll-autosave" class="autosave-status" role="status">${isClosed() ? "העריכה נעולה." : "נשמר"}</p>
          ${isClosed() ? "" : '<button class="button button-primary" type="submit">שמירה</button>'}</div>
      </form>
      <div class="payroll-balance"><span>עלות מקור <strong>${money.format(record.employer_cost || 0)}</strong></span>
        <span>פוצל <strong>${money.format(allocatedCost)}</strong></span>
        <span>פער <strong>${money.format(Number(record.employer_cost || 0) - allocatedCost)}</strong></span>
        <span>שעות מקור <strong>${number.format(sumHours(record))}</strong></span>
        <span>פער שעות <strong>${number.format(sumHours(record) - allocatedHours)}</strong></span></div>
      <h3>פיצולים פנימיים לדיווח ולתקציב</h3>
      <div id="payroll-allocation-editor">${allocationEditor(record)}</div>
      <div class="dialog-actions">${isClosed() ? "" : '<button class="button button-secondary" data-add-allocation>+ פיצול</button><button class="button button-primary" data-save-allocations>שמירת פיצולים</button>'}
        ${!isClosed() && record.employee_match_status !== "LINKED" ? '<button class="button button-secondary" data-approve-temporary>אישור עובד זמני</button>' : ""}
        ${isClosed() ? "" : '<button class="button button-danger" data-delete-record>מחיקת שורה</button>'}</div>`;

    $("[data-close-details]").onclick = () => {
      state.selected = "";
      renderDetails();
    };
    const form = $("#payroll-monthly-form");
    if (form && !isClosed()) {
      const draftKey = `workforce.payroll.monthly.${record.payroll_record_id}`;
      const restored = readAutosaveDraft(draftKey);
      if (restored) Object.entries(restored).forEach(([name, value]) => {
        const field = form.elements.namedItem(name);
        if (field && typeof field.value === "string") field.value = value ?? "";
      });
      const readMonthly = () => Object.fromEntries(new FormData(form));
      state.monthlyAutosave = createAutosave({
        key: draftKey,
        read: readMonthly,
        validate: (values) => !invalid({ ...record, ...values }),
        statusTargets: () => document.querySelectorAll("#payroll-autosave"),
        save: (values) => request("payroll", "POST", {
          action: "save_record",
          payroll_record_id: record.payroll_record_id,
          import_batch_id: record.import_batch_id,
          record_origin: record.record_origin,
          payroll_month: state.month,
          ...values,
        }),
        onSaved: async () => { await reload(); state.selected = record.payroll_record_id; },
      });
      form.querySelectorAll("input,textarea").forEach((input) =>
        input.addEventListener("input", () => state.monthlyAutosave.markDirty())
      );
      form.querySelectorAll("select,input[type=date],input[type=month]").forEach((input) =>
        input.addEventListener("change", () => state.monthlyAutosave.markDirty({ immediate: true }))
      );
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try { await state.monthlyAutosave.saveNow({ manual: true }); }
        catch (error) { message(error.message, "error"); }
      });
    }
    const collectAllocations = () => [...document.querySelectorAll("[data-allocation-index]")].map((node) =>
      Object.fromEntries([...node.querySelectorAll("input,select")].map((input) => [input.name, input.value]))
    );
    if (!isClosed()) {
      const allocationKey = `workforce.payroll.allocations.${record.payroll_record_id}`;
      const restored = readAutosaveDraft(allocationKey);
      if (restored && !state.allocationDrafts.has(record.payroll_record_id)) {
        state.allocationDrafts.set(record.payroll_record_id, restored);
        renderDetails();
        return;
      }
      const validSplit = (rows) => rows.length > 0
        && rows.every((row) => row.allocation_unit_id && row.role_id && row.allocation_amount !== "" && row.allocated_hours !== "")
        && Math.abs(rows.reduce((sum, row) => sum + Number(row.allocation_amount), 0) - Number(record.employer_cost || 0)) <= .01
        && Math.abs(rows.reduce((sum, row) => sum + Number(row.allocated_hours), 0) - sumHours(record)) <= .01;
      $("#payroll-allocation-editor").insertAdjacentHTML("afterend", '<span class="autosave-status" data-allocation-autosave role="status">נשמר</span>');
      state.allocationAutosave = createAutosave({
        key: allocationKey,
        read: collectAllocations,
        validate: validSplit,
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
    $("#wf-dialog-content").innerHTML = `<h2>ייצוא לרואה החשבון</h2>
      <form id="wf-form" class="workforce-form">
        <label>היקף<select name="scope"><option value="ALL">כל הארגון</option><option value="DAYCARE">מעון נבחר</option><option value="UNIT">מחלקה נבחרת</option></select></label>
        <label>מחלקה<select name="unit">${options(state.data.units, "allocation_unit_id", state.unit)}</select></label>
        <label>מעון<select name="daycare">${options(state.data.daycares, "daycare_id", state.daycare)}</select></label>
        <p class="wide">הקובץ כולל שורה אחת לעובד ואינו כולל פיצולים פנימיים.</p>
        <div class="dialog-actions wide"><button class="button button-primary">הורדת CSV</button></div>
      </form>`;
    $("#wf-dialog").showModal();
    $("#wf-form").onsubmit = (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.target));
      const scopedRows = state.data.records.filter((row) => values.scope === "ALL"
        || (values.scope === "DAYCARE" && row.daycare_id === values.daycare)
        || (values.scope === "UNIT" && row.allocation_unit_id === values.unit));
      const rows = [...scopedRows.reduce((grouped, row) => {
        const existing = grouped.get(row.source_employee_identifier);
        if (!existing) {
          grouped.set(row.source_employee_identifier, { ...row });
          return grouped;
        }
        for (const [field] of monthlyFields) {
          existing[field] = Number(existing[field] || 0) + Number(row[field] || 0);
        }
        return grouped;
      }, new Map()).values()];
      downloadCsv(rows, [
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
      ], `שכר-לרואה-חשבון-${state.month}.csv`);
      $("#wf-dialog").close();
    };
  };

  function render() {
    const rows = filtered();
    const records = state.data.records;
    const current = month();
    const kpis = [
      ["", "כל העובדים", records.length],
      ["LINKED", "מקושרים", records.filter((row) => row.employee_match_status === "LINKED").length],
      ["MISSING", "חסרים", records.filter((row) => row.employee_match_status === "MISSING").length],
      ["APPROVED_TEMPORARY", "זמניים מאושרים", records.filter((row) => row.employee_match_status === "APPROVED_TEMPORARY").length],
      ["UNRESOLVED", "לא פתורים", records.filter((row) => row.employee_match_status === "UNRESOLVED").length],
      ["INVALID", "שורות לא תקינות", records.filter(invalid).length],
    ];
    $("#wf-kpis").innerHTML = `<div class="payroll-month-state ${isClosed() ? "closed" : "current"}">
      <strong>${current ? (isClosed() ? "חודש סגור" : "חודש נוכחי") : "חודש טרם נפתח"}</strong><span>${state.month}</span></div>`
      + kpis.map(([id, title, value]) => `<button data-kpi="${id}"><strong>${value}</strong><span>${title}</span><small>פתיחת מסנן</small></button>`).join("");
    $("#wf-head").innerHTML = `<tr><th class="bank-sticky-number"><button data-sort="code">מס׳ עובד</button></th>
      <th><button data-sort="employee">עובד</button></th><th>מחלקה</th><th>מעון</th><th>תנאי שכר</th>
      <th><button data-sort="cost">עלות מעסיק</button></th><th><button data-sort="hours">שעות</button></th>
      <th>התאמה</th><th>מצב</th><th>פעולות</th></tr>`;
    $("#wf-count").textContent = `${rows.length} עובדים`;
    $("#wf-rows").innerHTML = rows.map((record) => {
      const employee = employeeFor(record);
      const payTerm = payTermFor(record);
      return `<tr class="${invalid(record) ? "bank-row-error" : record.employee_match_status === "LINKED" ? "bank-row-complete" : "bank-row-missing"}">
        <td class="bank-sticky-number">${esc(record.source_employee_identifier)}</td>
        <td>${esc(employee ? `${employee.first_name} ${employee.last_name}` : "לא נמצא")}</td>
        <td>${esc(lookup(state.data.units, record.allocation_unit_id, "allocation_unit_id"))}</td>
        <td>${esc(lookup(state.data.daycares, record.daycare_id, "daycare_id"))}</td>
        <td>${payTerm ? `${esc(payTerm.pay_type)} · ${money.format(payTerm.base_pay)}` : "—"}</td>
        <td>${record.employer_cost == null ? "—" : money.format(record.employer_cost)}</td>
        <td>${number.format(sumHours(record))}</td>
        <td><span class="bank-row-status ${record.employee_match_status === "LINKED" ? "complete" : record.employee_match_status === "MISSING" ? "error" : "missing"}">${statuses[record.employee_match_status]}</span></td>
        <td>${invalid(record) ? "חסרים שדות" : "תקין"}</td>
        <td><button class="button button-quiet" data-open="${record.payroll_record_id}">פרטים</button></td></tr>`;
    }).join("");
    document.querySelectorAll("[data-open]").forEach((button) => {
      button.onclick = () => {
        state.selected = button.dataset.open;
        renderDetails();
      };
    });
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
    $("#wf-close-month").textContent = isClosed() ? "פתיחה מחדש" : "סגירת חודש";
    renderDetails();
  }

  state.data = await request("payroll", "GET", null, state.month);
  $("#wf-status").innerHTML = '<option value="">כל הסטטוסים</option>'
    + Object.entries(statuses).map(([key, value]) => `<option value="${key}">${value}</option>`).join("");
  $("#wf-unit").innerHTML = '<option value="">כל המחלקות</option>'
    + options(state.data.units, "allocation_unit_id").replace('<option value="">בחירה…</option>', "");
  $("#wf-daycare").innerHTML = '<option value="">כל המעונות</option>'
    + options(state.data.daycares, "daycare_id").replace('<option value="">בחירה…</option>', "");
  $("#wf-month").value = state.month;
  $("#wf-month").onchange = async (event) => {
    state.month = event.target.value;
    state.selected = "";
    await reload();
  };
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
  $("#wf-open-month").onclick = openMonthDialog;
  $("#wf-close-month").onclick = closeOrReopen;
  $("#wf-add").onclick = addEmployeeDialog;
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
