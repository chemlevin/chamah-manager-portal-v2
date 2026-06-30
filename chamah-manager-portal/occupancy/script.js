const DEFAULT_RULES = {
  infants: { label: "תינוק", plural: "תינוקות", sqmPerChild: 2.8, ratio: 5, tuition: 3936, staffCost: 9000 },
  toddlers: { label: "פעוט", plural: "פעוטים", sqmPerChild: 2.6, ratio: 8, tuition: 2917, staffCost: 9000 },
  older: { label: "בוגר", plural: "בוגרים", sqmPerChild: 2.2, ratio: 10, tuition: 2587, staffCost: 9000 },
};

const CLASS_TYPE_AGES = {
  infants: ["infants"],
  toddlers: ["toddlers"],
  older: ["older"],
  "infants-toddlers": ["infants", "toddlers"],
  "toddlers-older": ["toddlers", "older"],
};

const DEFAULT_QUICK_COUNTS = {
  infants: { infants: 18, toddlers: 0, older: 0 },
  toddlers: { infants: 0, toddlers: 28, older: 0 },
  older: { infants: 0, toddlers: 0, older: 32 },
  "infants-toddlers": { infants: 10, toddlers: 12, older: 0 },
  "toddlers-older": { infants: 0, toddlers: 5, older: 26 },
};

const form = document.querySelector("#occupancy-form");
const modeInputs = document.querySelectorAll('input[name="calculator-mode"]');
const classroomTypeInput = document.querySelector("#classroom-type");
const advancedPanel = document.querySelector("#advanced-assumptions");
const modeLabel = document.querySelector("#mode-label");
const classLabel = document.querySelector("#occupancy-class-label");
const statusTitle = document.querySelector("#occupancy-status-title");
const statusDetail = document.querySelector("#occupancy-status-detail");
const grossProfitOutput = document.querySelector("#gross-profit");
const totalRequiredStaffOutput = document.querySelector("#total-required-staff");
const summaryGrid = document.querySelector("#occupancy-summary-grid");
const ageBreakdownList = document.querySelector("#age-breakdown-list");
const scenarioGrid = document.querySelector("#scenario-grid");
const recommendationCard = document.querySelector("#occupancy-recommendation");

const numberFormatter = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 });
const currencyFormatter = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });

function money(value) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function roundStaff(value) {
  return Math.ceil(value * 2) / 2;
}

function calculateRequiredStaff(children, ratio) {
  if (!Number.isFinite(children) || children <= 0 || !Number.isFinite(ratio) || ratio <= 0) return 0;
  return roundStaff(children / ratio);
}

function calculateRequiredSqm(children, sqmPerChild) {
  if (!Number.isFinite(children) || children <= 0 || !Number.isFinite(sqmPerChild) || sqmPerChild <= 0) return 0;
  return children * sqmPerChild;
}

function calculateIncome(children, tuition) {
  if (!Number.isFinite(children) || children <= 0 || !Number.isFinite(tuition) || tuition <= 0) return 0;
  return children * tuition;
}

function valueOf(id, fallback = 0) {
  const element = document.querySelector("#" + id);
  const value = Number(element?.value);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function getMode() {
  return document.querySelector('input[name="calculator-mode"]:checked')?.value || "quick";
}

function getRules() {
  const isFull = getMode() === "full";
  return {
    infants: {
      ...DEFAULT_RULES.infants,
      tuition: isFull ? valueOf("infant-tuition", DEFAULT_RULES.infants.tuition) : DEFAULT_RULES.infants.tuition,
      sqmPerChild: isFull ? valueOf("infant-sqm", DEFAULT_RULES.infants.sqmPerChild) : DEFAULT_RULES.infants.sqmPerChild,
      ratio: isFull ? valueOf("infant-ratio", DEFAULT_RULES.infants.ratio) : DEFAULT_RULES.infants.ratio,
    },
    toddlers: {
      ...DEFAULT_RULES.toddlers,
      tuition: isFull ? valueOf("toddler-tuition", DEFAULT_RULES.toddlers.tuition) : DEFAULT_RULES.toddlers.tuition,
      sqmPerChild: isFull ? valueOf("toddler-sqm", DEFAULT_RULES.toddlers.sqmPerChild) : DEFAULT_RULES.toddlers.sqmPerChild,
      ratio: isFull ? valueOf("toddler-ratio", DEFAULT_RULES.toddlers.ratio) : DEFAULT_RULES.toddlers.ratio,
    },
    older: {
      ...DEFAULT_RULES.older,
      tuition: isFull ? valueOf("older-tuition", DEFAULT_RULES.older.tuition) : DEFAULT_RULES.older.tuition,
      sqmPerChild: isFull ? valueOf("older-sqm", DEFAULT_RULES.older.sqmPerChild) : DEFAULT_RULES.older.sqmPerChild,
      ratio: isFull ? valueOf("older-ratio", DEFAULT_RULES.older.ratio) : DEFAULT_RULES.older.ratio,
    },
  };
}

function getCompositionValidation(composition) {
  const active = Object.entries(composition).filter(([, count]) => Number(count) > 0).map(([key]) => key);
  if (active.length <= 1) return { valid: true, message: "הרכב חד-גילאי תקין." };
  if (active.length > 2) return { valid: false, message: "כיתה מעורבת יכולה להיות רק בין שתי שכבות גיל סמוכות." };
  if (active.includes("infants") && active.includes("older")) {
    return { valid: false, message: "כיתה מעורבת בין תינוק ובוגר אינה אפשרית." };
  }
  const adjacent = (active.includes("infants") && active.includes("toddlers")) || (active.includes("toddlers") && active.includes("older"));
  return adjacent ? { valid: true, message: "הרכב מעורב תקין." } : { valid: false, message: "הרכב הכיתה אינו אפשרי." };
}

function getSqmStatus(actualSqm, requiredSqm) {
  if (requiredSqm <= 0) return { label: "לא חושב", detail: "אין ילדים בכיתה לחישוב שטח.", tone: "warning" };
  if (actualSqm >= requiredSqm) return { label: "תקין", detail: "הכיתה תקינה מבחינת שטח: כן", tone: "ok" };
  if (actualSqm >= requiredSqm * 0.95) return { label: "גבולי", detail: "הכיתה קרובה לדרישת השטח אך חסר שטח.", tone: "warning" };
  return { label: "לא תקין", detail: "הכיתה תקינה מבחינת שטח: לא", tone: "danger" };
}

function calculateScenarioProfit(composition, options) {
  const validation = getCompositionValidation(composition);
  const rows = Object.entries(options.rules).map(([key, rule]) => {
    const children = Math.max(Number(composition[key] || 0), 0);
    const requiredSqm = calculateRequiredSqm(children, rule.sqmPerChild);
    const requiredStaff = calculateRequiredStaff(children, rule.ratio);
    const income = calculateIncome(children, rule.tuition);
    return { key, ...rule, children, requiredSqm, requiredStaff, income };
  });
  const totalChildren = rows.reduce((sum, row) => sum + row.children, 0);
  const requiredSqm = rows.reduce((sum, row) => sum + row.requiredSqm, 0);
  const requiredStaff = rows.reduce((sum, row) => sum + row.requiredStaff, 0);
  const income = rows.reduce((sum, row) => sum + row.income, 0);
  const staffCost = requiredStaff * options.staffCostPerPerson;
  const grossProfit = income - staffCost;
  const sqmStatus = getSqmStatus(options.actualSqm, requiredSqm);
  const areaCompliant = requiredSqm > 0 && options.actualSqm >= requiredSqm;
  return {
    rows,
    totalChildren,
    requiredSqm,
    actualSqm: options.actualSqm,
    requiredStaff,
    income,
    staffCost,
    grossProfit,
    profitPerChild: totalChildren > 0 ? grossProfit / totalChildren : 0,
    profitPerSqm: options.actualSqm > 0 ? grossProfit / options.actualSqm : 0,
    areaCompliant,
    validComposition: validation.valid,
    compositionMessage: validation.message,
    sqmStatus,
    compliant: totalChildren > 0 && validation.valid && areaCompliant,
  };
}

function getInput() {
  const isFull = getMode() === "full";
  const staffCostDefault = DEFAULT_RULES.infants.staffCost;
  return {
    className: document.querySelector("#classroom-name").value.trim() || "כיתה ללא שם",
    mode: getMode(),
    actualSqm: valueOf("actual-sqm", 0),
    composition: {
      infants: valueOf("infant-count", 0),
      toddlers: valueOf("toddler-count", 0),
      older: valueOf("older-count", 0),
    },
    rules: getRules(),
    staffCostPerPerson: isFull ? valueOf("staff-cost-override", staffCostDefault) : staffCostDefault,
  };
}

function compositionLabel(composition) {
  return Object.entries(DEFAULT_RULES)
    .map(([key, rule]) => composition[key] > 0 ? numberFormatter.format(composition[key]) + " " + rule.plural : "")
    .filter(Boolean)
    .join(" + ") || "ללא ילדים";
}

function summaryItem(label, value, note, tone = "") {
  return '<article class="occupancy-summary-item ' + tone + '"><span>' + label + '</span><strong>' + value + '</strong><small>' + note + '</small></article>';
}

function renderResult(result, input) {
  const status = result.validComposition ? result.sqmStatus : { label: "לא תקין", detail: result.compositionMessage, tone: "danger" };
  const missingSqm = Math.max(result.requiredSqm - input.actualSqm, 0);
  classLabel.textContent = input.className;
  statusTitle.textContent = status.label;
  statusTitle.className = "status-title " + status.tone;
  statusDetail.textContent = result.validComposition && result.areaCompliant
    ? "הכיתה עומדת בדרישות השטח והתקינה."
    : result.validComposition
      ? "חסרים " + numberFormatter.format(missingSqm) + " מ״ר."
      : result.compositionMessage;
  grossProfitOutput.textContent = money(result.grossProfit);
  totalRequiredStaffOutput.textContent = numberFormatter.format(result.requiredStaff) + " אנשי צוות";

  summaryGrid.innerHTML = [
    summaryItem("סה״כ ילדים", numberFormatter.format(result.totalChildren), compositionLabel(input.composition)),
    summaryItem("שטח נדרש", numberFormatter.format(result.requiredSqm) + " מ״ר", "לפי שכבות הגיל", status.tone),
    summaryItem("שטח בפועל", numberFormatter.format(input.actualSqm) + " מ״ר", status.detail, status.tone),
    summaryItem("תקינה נדרשת", numberFormatter.format(result.requiredStaff), "אנשי צוות"),
    summaryItem("הכנסה חודשית", money(result.income), "לפי שכר לימוד"),
    summaryItem("עלות צוות", money(result.staffCost), money(input.staffCostPerPerson) + " לאיש צוות"),
    summaryItem("רווח לילד", money(result.profitPerChild), "רווח גולמי משוער"),
    summaryItem("רווח למ״ר", money(result.profitPerSqm), "לפי שטח הכיתה בפועל"),
  ].join("");

  ageBreakdownList.innerHTML = result.rows.filter((row) => row.children > 0).map((row) => (
    '<article class="age-breakdown-card"><div><h3>' + row.label + '</h3><span>' + numberFormatter.format(row.children) + ' ילדים</span></div><dl><dt>שטח</dt><dd>' + numberFormatter.format(row.requiredSqm) + ' מ״ר</dd><dt>תקינה</dt><dd>' + numberFormatter.format(row.requiredStaff) + '</dd><dt>הכנסה</dt><dd>' + money(row.income) + '</dd></dl></article>'
  )).join("") || '<p class="empty-state">אין ילדים בכיתה לחישוב.</p>';
}

function splitComposition(totalChildren, firstKey, secondKey) {
  const secondCount = Math.min(5, Math.max(totalChildren - 1, 0));
  return {
    infants: 0,
    toddlers: 0,
    older: 0,
    [firstKey]: Math.max(totalChildren - secondCount, 0),
    [secondKey]: secondCount,
  };
}

function buildAlternativeScenarios(input) {
  const totalChildren = input.composition.infants + input.composition.toddlers + input.composition.older;
  const candidates = [
    { title: "הרכב נוכחי", composition: input.composition },
    { title: "רק תינוקות", composition: { infants: totalChildren, toddlers: 0, older: 0 } },
    { title: "רק פעוטים", composition: { infants: 0, toddlers: totalChildren, older: 0 } },
    { title: "רק בוגרים", composition: { infants: 0, toddlers: 0, older: totalChildren } },
    { title: "תינוקות + פעוטים", composition: splitComposition(totalChildren, "infants", "toddlers") },
    { title: "פעוטים + בוגרים", composition: splitComposition(totalChildren, "older", "toddlers") },
  ];
  return candidates.filter((scenario, index, list) => {
    if (totalChildren <= 0) return scenario.title === "הרכב נוכחי";
    const validation = getCompositionValidation(scenario.composition);
    if (!validation.valid && scenario.title !== "הרכב נוכחי") return false;
    const key = JSON.stringify(scenario.composition);
    return list.findIndex((item) => JSON.stringify(item.composition) === key) === index;
  });
}

function scenarioCard(scenario) {
  const result = scenario.result;
  const tone = result.validComposition ? result.sqmStatus.tone : "danger";
  const status = result.compliant ? "עומד בדרישות" : result.validComposition ? result.sqmStatus.label : result.compositionMessage;
  return '<article class="scenario-card ' + tone + (result.compliant ? ' compliant' : ' not-compliant') + '"><div class="scenario-head"><span>' + scenario.title + '</span><strong>' + money(result.grossProfit) + '</strong></div><p class="scenario-composition">' + compositionLabel(scenario.composition) + '</p><div class="scenario-metrics"><span>ילדים: <b>' + numberFormatter.format(result.totalChildren) + '</b></span><span>שטח נדרש: <b>' + numberFormatter.format(result.requiredSqm) + ' מ״ר</b></span><span>שטח בפועל: <b>' + numberFormatter.format(result.actualSqm) + ' מ״ר</b></span><span>תקינה: <b>' + numberFormatter.format(result.requiredStaff) + '</b></span><span>הכנסה: <b>' + money(result.income) + '</b></span><span>עלות צוות: <b>' + money(result.staffCost) + '</b></span><span>רווח לילד: <b>' + money(result.profitPerChild) + '</b></span><span>רווח למ״ר: <b>' + money(result.profitPerSqm) + '</b></span></div><p>' + status + '</p></article>';
}

function getRecommendation(scenarios) {
  const current = scenarios[0];
  const compliant = scenarios.filter((scenario) => scenario.result.compliant).sort((a, b) => b.result.grossProfit - a.result.grossProfit);
  const best = compliant[0];

  if (!current.result.validComposition) {
    return best
      ? { tone: "danger", title: current.result.compositionMessage, detail: best.title + " היא החלופה התקינה והרווחית ביותר שנמצאה: " + money(best.result.grossProfit) + "." }
      : { tone: "danger", title: current.result.compositionMessage, detail: "לא נמצאה חלופה תקינה בשטח הכיתה הנוכחי." };
  }

  if (!current.result.areaCompliant) {
    return best
      ? { tone: "warning", title: "ההרכב הנוכחי חורג מדרישת השטח", detail: best.title + " עומדת בדרישות ומציגה רווח של " + money(best.result.grossProfit) + "." }
      : { tone: "danger", title: "אין חלופה תקינה בשטח הנוכחי", detail: "מומלץ להפחית ילדים או להגדיל שטח לפני קבלת החלטה." };
  }

  if (best && best.title !== "הרכב נוכחי") {
    const delta = best.result.grossProfit - current.result.grossProfit;
    if (delta > 0) {
      return { tone: "ok", title: best.title + " מגדילה רווח חודשי ב-" + money(delta), detail: "החלופה תקינה מבחינת שטח ותקינה ומציגה רווח של " + money(best.result.grossProfit) + "." };
    }
  }

  const costlyAlternative = scenarios.find((scenario) => scenario.title !== "הרכב נוכחי" && scenario.result.areaCompliant && scenario.result.staffCost > current.result.staffCost && scenario.result.grossProfit < current.result.grossProfit);
  if (costlyAlternative) {
    return { tone: "warning", title: "ההרכב הנוכחי תקין ומומלץ כרגע", detail: costlyAlternative.title + " אינה מומלצת כעת בגלל תוספת תקינה ועלות צוות גבוהה יותר." };
  }

  return { tone: "ok", title: "ההרכב הנוכחי תקין", detail: "לא נמצאה חלופה תקינה שמגדילה את הרווח החודשי לפי הנתונים הנוכחיים." };
}

function renderRecommendation(recommendation) {
  recommendationCard.className = "recommendation-card " + recommendation.tone;
  recommendationCard.innerHTML = '<span>המלצת מערכת</span><strong>' + recommendation.title + '</strong><p>' + recommendation.detail + '</p>';
}

function renderScenarios(input) {
  const scenarios = buildAlternativeScenarios(input).map((scenario) => ({
    ...scenario,
    result: calculateScenarioProfit(scenario.composition, input),
  }));
  renderRecommendation(getRecommendation(scenarios));
  scenarioGrid.innerHTML = scenarios.filter((scenario) => scenario.result.validComposition || scenario.title === "הרכב נוכחי").map(scenarioCard).join("") || '<p class="empty-state">אין חלופות להצגה.</p>';
}

function applyQuickClassType(syncCounts = false) {
  const mode = getMode();
  const selectedType = classroomTypeInput.value;
  const activeAges = mode === "quick" ? CLASS_TYPE_AGES[selectedType] : ["infants", "toddlers", "older"];
  document.querySelectorAll("[data-age-card]").forEach((card) => {
    const key = card.getAttribute("data-age-card");
    card.hidden = !activeAges.includes(key);
  });
  if (mode === "quick" && syncCounts) {
    const defaults = DEFAULT_QUICK_COUNTS[selectedType];
    document.querySelector("#infant-count").value = defaults.infants;
    document.querySelector("#toddler-count").value = defaults.toddlers;
    document.querySelector("#older-count").value = defaults.older;
  }
}

function updateMode() {
  const mode = getMode();
  advancedPanel.hidden = mode !== "full";
  modeLabel.textContent = mode === "quick" ? "בדיקה מהירה" : "חישוב מלא";
  document.querySelectorAll(".quick-only").forEach((element) => { element.hidden = mode !== "quick"; });
  document.querySelectorAll(".full-only").forEach((element) => { element.hidden = mode !== "full"; });
  applyQuickClassType(false);
  updateCalculator();
}

function updateCalculator() {
  const input = getInput();
  const result = calculateScenarioProfit(input.composition, input);
  renderResult(result, input);
  renderScenarios(input);
}

classroomTypeInput.addEventListener("change", () => {
  applyQuickClassType(true);
  updateCalculator();
});

modeInputs.forEach((input) => input.addEventListener("change", updateMode));
form.addEventListener("input", updateCalculator);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  updateCalculator();
  document.querySelector(".result-priority").scrollIntoView({ block: "start", behavior: "smooth" });
});
form.addEventListener("reset", () => {
  window.setTimeout(() => {
    document.querySelector('input[name="calculator-mode"][value="quick"]').checked = true;
    classroomTypeInput.value = "older";
    applyQuickClassType(true);
    updateMode();
  }, 0);
});

applyQuickClassType(false);
updateCalculator();
