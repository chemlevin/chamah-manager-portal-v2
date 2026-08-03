const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]
));
const money = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 });
const monthLabel = (value) => String(value || "").slice(0, 7).split("-").reverse().join("/");
let payrollFlash = "";

const pageHeading = (eyebrow, title, description) => `<section class="page-heading payroll-module-heading">
  <div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${description}</p></div>
  <a class="button button-secondary" href="#payroll">חזרה למודול השכר</a>
</section><p id="payroll-module-message" class="workbench-message" role="status"></p>`;

export function payrollLandingTemplate(access) {
  const cards = [
    ["open", "פתיחת חודש חדש", "פתיחת חודש שכר והכנת רשימת העובדים.", "+"],
    ["working", "חודשים בעבודה", "חודשי השכר הפתוחים לעריכה ובקרה.", "◷"],
    ["closed", "חודשים סגורים", "צפייה בחודשים נעולים ופתיחה מחדש בהרשאה.", "✓"],
    ["reports", "דוחות שכר", "סיכומים ודוחות לפי חודש והיקף.", "▦"],
  ].filter(([route]) => access[route]);
  return `<section class="page-heading payroll-module-heading"><div><p class="eyebrow">שכר</p><h1>מודול שכר</h1>
    <p>פתיחת חודשים, עבודה שוטפת, חודשים סגורים ודוחות שכר.</p></div></section>
    <section class="accounting-choice-grid payroll-module-grid" aria-label="פעולות מודול שכר">
      ${cards.map(([route, title, description, icon]) => `<a class="panel accounting-choice payroll-module-card" href="#payroll/${route}">
        <span aria-hidden="true">${icon}</span><h2>${title}</h2><p>${description}</p><strong>פתיחה ←</strong>
      </a>`).join("") || '<div class="empty-state panel">אין דפי שכר זמינים בהרשאות הנוכחיות.</div>'}
    </section>`;
}

export const payrollOpenTemplate = () => `${pageHeading("שכר / פתיחת חודש", "פתיחת חודש חדש", "הגדירי חודש, היקף ואופן טעינת עובדים.")}
  <form id="payroll-open-form" class="panel payroll-module-form">
    <label>חודש שכר<input name="payroll_month" type="month" required></label>
    <label>היקף<select name="scope_type">
      <option value="ORGANIZATION">כל המעונות</option>
      <option value="ALLOCATION_UNIT">מחלקה נבחרת</option>
      <option value="DAYCARE">מעון נבחר</option>
    </select></label>
    <label id="payroll-open-unit-wrap" hidden>מחלקה<select name="allocation_unit_id"></select></label>
    <label id="payroll-open-daycare-wrap" hidden>מעון<select name="daycare_id"></select></label>
    <fieldset class="wide payroll-opening-options"><legend>טעינת עובדים</legend>
      <label><input type="checkbox" name="copy_previous_employees"> העתקת עובדים מהחודש הקודם</label>
      <label><input type="checkbox" name="load_active_employees" checked> טעינת עובדים פעילים ממסך עובדים</label>
      <small>נתוני השכר החודשיים אינם מועתקים. ניתן לבחור בשתי האפשרויות ללא יצירת כפילויות.</small>
    </fieldset>
    <div class="dialog-actions wide"><button class="button button-primary" type="submit">פתיחת חודש</button></div>
  </form>`;

const optionRows = (rows, idField) => `<option value="">בחירה…</option>${rows.map((row) =>
  `<option value="${esc(row[idField])}">${esc(row.display_name)}</option>`).join("")}`;

export async function mountPayrollOpen(request, { canEdit = false } = {}) {
  const data = await request("payroll", "GET", null, "", "open");
  const form = document.querySelector("#payroll-open-form");
  const message = document.querySelector("#payroll-module-message");
  const scope = form.elements.scope_type;
  const unit = form.elements.allocation_unit_id;
  const daycare = form.elements.daycare_id;
  unit.innerHTML = optionRows(data.units || [], "allocation_unit_id");
  const refreshScope = () => {
    const unitWrap = document.querySelector("#payroll-open-unit-wrap");
    const daycareWrap = document.querySelector("#payroll-open-daycare-wrap");
    unitWrap.hidden = scope.value === "ORGANIZATION";
    daycareWrap.hidden = scope.value !== "DAYCARE";
    daycare.innerHTML = optionRows((data.daycares || []).filter((row) => !unit.value || row.allocation_unit_id === unit.value), "daycare_id");
    unit.required = scope.value !== "ORGANIZATION";
    daycare.required = scope.value === "DAYCARE";
  };
  scope.onchange = refreshScope;
  unit.onchange = refreshScope;
  refreshScope();
  if (!canEdit) Array.from(form.elements).forEach((field) => { field.disabled = true; });
  form.onsubmit = async (event) => {
    event.preventDefault();
    message.dataset.tone = "";
    const values = Object.fromEntries(new FormData(form));
    const duplicate = (data.months || []).some((row) => String(row.payroll_month).slice(0, 7) === values.payroll_month
      && row.scope_type === values.scope_type
      && String(row.allocation_unit_id || "") === (values.scope_type === "ORGANIZATION" ? "" : values.allocation_unit_id || "")
      && String(row.daycare_id || "") === (values.scope_type === "DAYCARE" ? values.daycare_id || "" : ""));
    if (duplicate) {
      message.textContent = "חודש שכר זה כבר קיים בהיקף שנבחר.";
      message.dataset.tone = "error";
      return;
    }
    const payload = {
      action: "open_month",
      payroll_month: values.payroll_month,
      scope_type: values.scope_type,
      allocation_unit_id: values.scope_type === "ORGANIZATION" ? "" : values.allocation_unit_id,
      daycare_id: values.scope_type === "DAYCARE" ? values.daycare_id : "",
      copy_previous_employees: form.elements.copy_previous_employees.checked,
      load_active_employees: form.elements.load_active_employees.checked,
    };
    try {
      await request("payroll", "POST", payload, "", "open");
      payrollFlash = `חודש ${monthLabel(values.payroll_month)} נפתח בהצלחה.`;
      location.hash = "#payroll/working";
    } catch (error) {
      message.textContent = String(error.message || "פתיחת החודש נכשלה.").includes("PAYROLL_MONTH_SCOPE_DUPLICATE")
        ? "חודש שכר זה כבר קיים בהיקף שנבחר."
        : error.message;
      message.dataset.tone = "error";
    }
  };
}

export const payrollMonthsTemplate = (view) => `${pageHeading(`שכר / ${view === "working" ? "חודשים בעבודה" : "חודשים סגורים"}`,
  view === "working" ? "חודשים בעבודה" : "חודשים סגורים",
  view === "working" ? "בחרי חודש כדי לפתוח את סביבת העבודה שלו." : "חודשים סגורים זמינים לצפייה בלבד; פתיחה מחדש דורשת הרשאת עריכה וסיבה.")}
  <section id="payroll-month-list" class="payroll-month-list-page" aria-live="polite"></section>`;

const scopeLabel = (month, data) => month.scope_type === "ORGANIZATION" ? "כל המעונות"
  : month.scope_type === "ALLOCATION_UNIT" ? data.units.find((row) => row.allocation_unit_id === month.allocation_unit_id)?.display_name || "מחלקה"
  : data.daycares.find((row) => row.daycare_id === month.daycare_id)?.display_name || "מעון";

export async function mountPayrollMonths(request, view) {
  const status = view === "working" ? "CURRENT" : "CLOSED";
  const data = await request("payroll", "GET", null, "", view);
  const rows = (data.months || []).filter((row) => row.month_status === status);
  const message = document.querySelector("#payroll-module-message");
  if (payrollFlash) { message.textContent = payrollFlash; message.dataset.tone = "success"; payrollFlash = ""; }
  document.querySelector("#payroll-month-list").innerHTML = rows.length ? rows.map((row) => {
    const records = (data.records || []).filter((record) => record.payroll_month_id === row.payroll_month_id && record.row_kind !== "SPLIT");
    return `<article class="panel payroll-month-card ${status === "CLOSED" ? "closed" : "current"}">
      <div><span class="status-badge ${status === "CLOSED" ? "status-neutral" : "status-success"}">${status === "CLOSED" ? "סגור" : "בעבודה"}</span>
      <h2>${monthLabel(row.payroll_month)}</h2><p>${esc(scopeLabel(row, data))}</p></div>
      <dl><div><dt>עובדים</dt><dd>${number.format(records.length)}</dd></div><div><dt>עודכן</dt><dd>${esc(String(row.updated_at || row.opened_at || "").slice(0, 10))}</dd></div></dl>
      <a class="button ${status === "CLOSED" ? "button-secondary" : "button-primary"}" href="#payroll/${view}/${encodeURIComponent(row.payroll_month_id)}">${status === "CLOSED" ? "צפייה בחודש" : "פתיחת סביבת העבודה"}</a>
    </article>`;
  }).join("") : `<div class="empty-state panel">${status === "CLOSED" ? "אין חודשים סגורים." : "אין חודשים פתוחים לעבודה."}</div>`;
}

export const payrollReportsTemplate = () => `${pageHeading("שכר / דוחות", "דוחות שכר", "סיכומי שכר חודשיים נפרדים מסביבת העבודה.")}
  <section id="payroll-report-summary" class="panel payroll-report-summary"></section>`;

export async function mountPayrollReports(request) {
  const data = await request("payroll", "GET", null, "", "reports");
  const groups = (data.months || []).map((month) => {
    const rows = (data.records || []).filter((record) => record.payroll_month_id === month.payroll_month_id && record.row_kind !== "SPLIT");
    return { month, rows, gross: rows.reduce((sum, row) => sum + Number(row.actual_gross || 0), 0), cost: rows.reduce((sum, row) => sum + Number(row.employer_cost || 0), 0), hours: rows.reduce((sum, row) => sum + Number(row.actual_hours || 0), 0) };
  });
  document.querySelector("#payroll-report-summary").innerHTML = `<div class="payroll-report-kpis">
    <article><span>חודשים</span><strong>${number.format(groups.length)}</strong></article>
    <article><span>עובדים בחודשים</span><strong>${number.format(groups.reduce((sum, row) => sum + row.rows.length, 0))}</strong></article>
    <article><span>ברוטו בפועל</span><strong>${money.format(groups.reduce((sum, row) => sum + row.gross, 0))}</strong></article>
    <article><span>עלות מעסיק</span><strong>${money.format(groups.reduce((sum, row) => sum + row.cost, 0))}</strong></article>
  </div><div class="payroll-report-table-wrap"><table><thead><tr><th>חודש</th><th>מצב</th><th>היקף</th><th>עובדים</th><th>שעות</th><th>ברוטו</th><th>עלות מעסיק</th></tr></thead><tbody>
    ${groups.map(({ month, rows, gross, cost, hours }) => `<tr><td>${monthLabel(month.payroll_month)}</td><td>${month.month_status === "CLOSED" ? "סגור" : "בעבודה"}</td><td>${esc(scopeLabel(month, data))}</td><td>${number.format(rows.length)}</td><td>${number.format(hours)}</td><td>${money.format(gross)}</td><td>${money.format(cost)}</td></tr>`).join("") || '<tr><td colspan="7">אין נתוני שכר לדיווח.</td></tr>'}
  </tbody></table></div>`;
}
