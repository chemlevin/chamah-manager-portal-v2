const formatTime = (value = new Date()) => new Intl.DateTimeFormat("he-IL", {
  dateStyle: "short",
  timeStyle: "short",
}).format(value);

export function mountWorkbenchPolish({
  title,
  module,
  organization = "כל הארגון",
  department = "כל המחלקות",
  daycare = "כל המעונות",
  schoolYear = "שנת לימודים פעילה",
  month = "לא נדרש",
  onRefresh,
}) {
  const marker = document.querySelector("#wf-rows, #bank-new-rows, #transfer-rows");
  const root = marker?.closest("#page-content") || document.querySelector("#page-content");
  if (!root || root.querySelector("[data-workbench-polish]")) return;
  const status = document.createElement("section");
  status.className = "workbench-product-bar panel";
  status.dataset.workbenchPolish = "";
  status.innerHTML = `
    <div class="workbench-location" aria-label="הקשר עבודה">
      <span><small>מודול</small><strong>${module}</strong></span>
      <span><small>עמוד</small><strong>${title}</strong></span>
      <span><small>ארגון</small><strong>${organization}</strong></span>
      <span><small>מחלקה</small><strong data-context-department>${department}</strong></span>
      <span><small>מעון</small><strong data-context-daycare>${daycare}</strong></span>
      <span><small>שנת לימודים</small><strong>${schoolYear}</strong></span>
      <span><small>חודש</small><strong data-context-month>${month}</strong></span>
    </div>
    <div class="workbench-data-status" aria-label="מצב נתונים">
      <span><small>מקור נתונים</small><strong>Supabase</strong></span>
      <span><small>רענון אחרון</small><strong data-last-refresh>${formatTime()}</strong></span>
      <span><small>שמירה אחרונה</small><strong data-last-save>טרם נשמר שינוי</strong></span>
      <span><small>מצב שמירה</small><strong data-save-state class="save-state-saved">כל השינויים שמורים</strong></span>
      <button class="button button-secondary" type="button" data-polish-refresh>↻ רענון</button>
    </div>`;
  root.prepend(status);

  const refresh = status.querySelector("[data-polish-refresh]");
  refresh.addEventListener("click", async () => {
    refresh.disabled = true;
    refresh.textContent = "מרענן…";
    try {
      await onRefresh?.();
      status.querySelector("[data-last-refresh]").textContent = formatTime();
    } finally {
      refresh.disabled = false;
      refresh.textContent = "↻ רענון";
    }
  });

  const updateContext = () => {
    const unit = document.querySelector("#wf-unit option:checked");
    const daycareOption = document.querySelector("#wf-daycare option:checked");
    const monthInput = document.querySelector("#wf-month, #bank-month-filter");
    if (unit) status.querySelector("[data-context-department]").textContent = unit.textContent;
    if (daycareOption) status.querySelector("[data-context-daycare]").textContent = daycareOption.textContent;
    if (monthInput) status.querySelector("[data-context-month]").textContent = monthInput.value || "כל החודשים";
  };
  updateContext();

  const messageNode = root.querySelector("#wf-message, #bank-message, #transfer-message");
  const syncSaveState = () => {
    const text = messageNode?.textContent || "";
    const state = status.querySelector("[data-save-state]");
    let label = "כל השינויים שמורים";
    let className = "save-state-saved";
    if (/שומר|ממתין לשמירה|לא נשמר/.test(text)) {
      label = "שומר…";
      className = "save-state-saving";
    } else if (/נכשל|שגיאה|לא תקין/.test(text)) {
      label = "נדרשת תשומת לב";
      className = "save-state-error";
    }
    if (state.textContent === label && state.className === className) return;
    state.textContent = label;
    state.className = className;
    if (label === "כל השינויים שמורים" && /נשמר|הושלם|נטענו/.test(text)) {
      status.querySelector("[data-last-save]").textContent = formatTime();
    }
  };
  if (messageNode) {
    new MutationObserver(syncSaveState).observe(messageNode, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  root.addEventListener("change", (event) => {
    if (event.target.matches("#wf-unit, #wf-daycare, #wf-month, #bank-month-filter")) updateContext();
  });
}
