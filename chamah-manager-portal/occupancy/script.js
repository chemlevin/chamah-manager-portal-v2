const DEFAULT_RULES = {
  infants: { label: "תינוק", plural: "תינוקות", sqmPerChild: 2.8, ratio: 5, tuition: 3936, staffCost: 9000, maxChildren: 20 },
  toddlers: { label: "פעוט", plural: "פעוטים", sqmPerChild: 2.6, ratio: 8, tuition: 2917, staffCost: 9000, maxChildren: 27 },
  older: { label: "בוגר", plural: "בוגרים", sqmPerChild: 2.2, ratio: 10, tuition: 2587, staffCost: 9000, maxChildren: 33 },
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
  toddlers: { infants: 0, toddlers: 24, older: 0 },
  older: { infants: 0, toddlers: 0, older: 32 },
  "infants-toddlers": { infants: 10, toddlers: 12, older: 0 },
  "toddlers-older": { infants: 0, toddlers: 5, older: 26 },
};

const form = document.querySelector("#occupancy-form");
const workspace = document.querySelector("#occupancy-workspace");
const emptyState = document.querySelector("#occupancy-empty-state");
const resultsPanel = document.querySelector("#occupancy-results");
const modeInputs = document.querySelectorAll('input[name="calculator-mode"]');
const modeCards = document.querySelectorAll("[data-mode-choice]");
const classroomTypeInput = document.querySelector("#classroom-type");
const advancedPanel = document.querySelector("#advanced-assumptions");
const modeLabel = document.querySelector("#mode-label");
const classLabel = document.querySelector("#occupancy-class-label");
const healthCard = document.querySelector("#health-status-card");
const statusIcon = document.querySelector("#occupancy-status-icon");
const statusTitle = document.querySelector("#occupancy-status-title");
const statusDetail = document.querySelector("#occupancy-status-detail");
const kpiChildren = document.querySelector("#kpi-children");
const kpiStaff = document.querySelector("#kpi-staff");
const kpiSqm = document.querySelector("#kpi-sqm");
const kpiBalance = document.querySelector("#kpi-balance");
const microInsights = document.querySelector("#micro-insights");
const utilizationBars = document.querySelector("#utilization-bars");
const limitingFactorOutput = document.querySelector("#limiting-factor");
const summaryGrid = document.querySelector("#occupancy-summary-grid");
const ageBreakdownList = document.querySelector("#age-breakdown-list");
const scenarioGrid = document.querySelector("#scenario-grid");
const recommendationCard = document.querySelector("#occupancy-recommendation");
const copySummaryButton = document.querySelector("#copy-summary");
const copyFeedback = document.querySelector("#copy-feedback");

const numberFormatter = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 });
const currencyFormatter = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
let lastSummaryText = "";
let hasCalculated = false;

function money(value) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function percent(value) {
  return Math.max(0, Math.min(100, Math.round(value || 0)));
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

function calculateSqmCapacity(actualSqm, sqmPerChild) {
  if (!Number.isFinite(actualSqm) || actualSqm <= 0 || !Number.isFinite(sqmPerChild) || sqmPerChild <= 0) return 0;
  return Math.ceil(actualSqm / sqmPerChild);
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
  return document.querySelector('input[name="calculator-mode"]:checked')?.value || "";
}

function getRules() {
  const isFull = getMode() === "full";
  return {
    infants: { ...DEFAULT_RULES.infants, tuition: isFull ? valueOf("infant-tuition", 3936) : 3936, sqmPerChild: isFull ? valueOf("infant-sqm", 2.8) : 2.8, ratio: isFull ? valueOf("infant-ratio", 5) : 5 },
    toddlers: { ...DEFAULT_RULES.toddlers, tuition: isFull ? valueOf("toddler-tuition", 2917) : 2917, sqmPerChild: isFull ? valueOf("toddler-sqm", 2.6) : 2.6, ratio: isFull ? valueOf("toddler-ratio", 8) : 8 },
    older: { ...DEFAULT_RULES.older, tuition: isFull ? valueOf("older-tuition", 2587) : 2587, sqmPerChild: isFull ? valueOf("older-sqm", 2.2) : 2.2, ratio: isFull ? valueOf("older-ratio", 10) : 10 },
  };
}

function getCapacityViolations(composition, rules = DEFAULT_RULES) {
  return Object.entries(composition)
    .filter(([key, count]) => Number(count) > Number(rules[key]?.maxChildren || 0))
    .map(([key, count]) => ({ key, count: Number(count), max: rules[key].maxChildren, label: rules[key].label }));
}

function formatCapacityViolations(violations) {
  if (!violations.length) return "";
  return "חריגה מכמות הילדים המותרת לכיתה. המקסימום המותר: " + violations.map((item) => item.label + " " + item.max).join(", ") + ".";
}

function getCompositionValidation(composition, rules = DEFAULT_RULES) {
  const active = Object.entries(composition).filter(([, count]) => Number(count) > 0).map(([key]) => key);
  if (active.length > 2) return { valid: false, message: "כיתה מעורבת יכולה להיות רק בין שתי שכבות גיל סמוכות.", invalidMix: true, capacityViolations: [] };
  if (active.includes("infants") && active.includes("older")) return { valid: false, message: "כיתה מעורבת בין תינוק ובוגר אינה אפשרית.", invalidMix: true, capacityViolations: [] };
  const capacityViolations = getCapacityViolations(composition, rules);
  if (capacityViolations.length) return { valid: false, message: formatCapacityViolations(capacityViolations), invalidMix: false, capacityViolations };
  if (active.length <= 1) return { valid: true, message: "הרכב חד-גילאי תקין.", invalidMix: false, capacityViolations: [] };
  const adjacent = (active.includes("infants") && active.includes("toddlers")) || (active.includes("toddlers") && active.includes("older"));
  return adjacent ? { valid: true, message: "הרכב מעורב תקין.", invalidMix: false, capacityViolations: [] } : { valid: false, message: "הרכב הכיתה אינו אפשרי.", invalidMix: true, capacityViolations: [] };
}

function getSqmStatus(actualSqm, requiredSqm) {
  const roundedRequiredSqm = Math.floor(requiredSqm);
  if (requiredSqm <= 0) return { label: "לא חושב", detail: "אין ילדים בכיתה לחישוב שטח.", tone: "warning", roundedRequiredSqm };
  if (actualSqm >= roundedRequiredSqm) return { label: "תקין", detail: "הכיתה תקינה מבחינת שטח: כן", tone: "ok", roundedRequiredSqm };
  if (actualSqm >= roundedRequiredSqm * 0.95) return { label: "גבולי", detail: "הכיתה קרובה לדרישת השטח אך חסר שטח.", tone: "warning", roundedRequiredSqm };
  return { label: "לא תקין", detail: "הכיתה תקינה מבחינת שטח: לא", tone: "danger", roundedRequiredSqm };
}

function calculateScenarioBalance(composition, options) {
  const validation = getCompositionValidation(composition, options.rules);
  const rows = Object.entries(options.rules).map(([key, rule]) => {
    const children = Math.max(Number(composition[key] || 0), 0);
    const requiredSqm = calculateRequiredSqm(children, rule.sqmPerChild);
    const requiredStaff = calculateRequiredStaff(children, rule.ratio);
    const income = calculateIncome(children, rule.tuition);
    const sqmCapacity = calculateSqmCapacity(options.actualSqm, rule.sqmPerChild);
    return { key, ...rule, children, requiredSqm, requiredStaff, income, sqmCapacity };
  });
  const totalChildren = rows.reduce((sum, row) => sum + row.children, 0);
  const requiredSqm = rows.reduce((sum, row) => sum + row.requiredSqm, 0);
  const requiredStaff = rows.reduce((sum, row) => sum + row.requiredStaff, 0);
  const income = rows.reduce((sum, row) => sum + row.income, 0);
  const staffCost = requiredStaff * options.staffCostPerPerson;
  const monthlyBalance = income - staffCost;
  const sqmStatus = getSqmStatus(options.actualSqm, requiredSqm);
  const areaCompliant = requiredSqm > 0 && options.actualSqm >= sqmStatus.roundedRequiredSqm;
  const activeRows = rows.filter((row) => row.children > 0);
  const minCapacity = activeRows.length ? Math.min(...activeRows.map((row) => row.maxChildren)) : 0;
  return {
    rows,
    totalChildren,
    requiredSqm,
    roundedRequiredSqm: sqmStatus.roundedRequiredSqm,
    actualSqm: options.actualSqm,
    requiredStaff,
    income,
    staffCost,
    monthlyBalance,
    balancePerChild: totalChildren > 0 ? monthlyBalance / totalChildren : 0,
    balancePerSqm: options.actualSqm > 0 ? monthlyBalance / options.actualSqm : 0,
    areaCompliant,
    validComposition: validation.valid,
    invalidMix: validation.invalidMix,
    compositionMessage: validation.message,
    capacityViolations: validation.capacityViolations || [],
    sqmStatus,
    compliant: totalChildren > 0 && validation.valid && areaCompliant,
    capacityLimit: minCapacity,
  };
}

function getInput() {
  const isFull = getMode() === "full";
  return {
    className: document.querySelector("#classroom-name").value.trim() || "כיתה ללא שם",
    mode: getMode(),
    actualSqm: valueOf("actual-sqm", 0),
    composition: { infants: valueOf("infant-count", 0), toddlers: valueOf("toddler-count", 0), older: valueOf("older-count", 0) },
    rules: getRules(),
    staffCostPerPerson: isFull ? valueOf("staff-cost-override", 9000) : 9000,
  };
}

function compositionLabel(composition, separator = " + ") {
  return Object.entries(DEFAULT_RULES)
    .map(([key, rule]) => composition[key] > 0 ? numberFormatter.format(composition[key]) + " " + rule.plural : "")
    .filter(Boolean)
    .join(separator) || "ללא ילדים";
}

function centralReason(result, input) {
  if (result.compliant) return "הכיתה עומדת בדרישות.";
  if (!result.validComposition) return result.compositionMessage;
  const missingSqm = Math.max(result.roundedRequiredSqm - input.actualSqm, 0);
  if (!result.areaCompliant) return "חסרים " + numberFormatter.format(missingSqm) + " מ״ר.";
  return "הכיתה אינה תקינה לפי הנתונים שהוזנו.";
}

function summaryItem(label, value, note, tone = "") {
  return '<article class="occupancy-summary-item ' + tone + '"><span>' + label + '</span><strong>' + value + '</strong><small>' + note + '</small></article>';
}

function getUtilization(result) {
  const areaUse = result.actualSqm > 0 ? (result.requiredSqm / result.actualSqm) * 100 : 0;
  const staffingBase = Math.max(Math.ceil(result.requiredStaff), 1);
  const staffUse = staffingBase > 0 ? (result.requiredStaff / staffingBase) * 100 : 0;
  const activeRows = result.rows.filter((row) => row.children > 0);
  const capacityUses = activeRows.map((row) => row.maxChildren > 0 ? (row.children / row.maxChildren) * 100 : 0);
  const capacityUse = capacityUses.length ? Math.max(...capacityUses) : 0;
  return { areaUse, staffUse, capacityUse };
}

function limitingFactor(result) {
  const use = getUtilization(result);
  const factors = [
    { key: "שטח", icon: "▦", value: use.areaUse },
    { key: "תקינה", icon: "צ", value: use.staffUse },
    { key: "מקסימום ילדים", icon: "י", value: use.capacityUse },
  ].sort((a, b) => b.value - a.value);
  return factors[0];
}

function utilizationBar(label, value) {
  const safeValue = percent(value);
  return '<div class="utilization-row"><div><span>' + label + '</span><strong>' + safeValue + '%</strong></div><div class="utilization-track"><span style="width:' + safeValue + '%"></span></div></div>';
}

function getMicroInsights(result, input, bestInfo) {
  const insights = [];
  const factor = limitingFactor(result);
  const use = getUtilization(result);
  const activeRows = result.rows.filter((row) => row.children > 0);
  const remainingByCapacity = activeRows.map((row) => row.maxChildren - row.children);
  const remainingChildren = remainingByCapacity.length ? Math.min(...remainingByCapacity) : 0;
  if (remainingChildren > 0 && result.compliant) insights.push("נותר מקום לעוד " + numberFormatter.format(remainingChildren) + " ילדים לפי מגבלת הכמות.");
  if (result.requiredStaff % 1 === 0.5) insights.push("נדרש חצי תקן נוסף לפי התקינה.");
  if (use.areaUse > 0) insights.push("הכיתה מנצלת " + percent(use.areaUse) + "% מהשטח.");
  if (bestInfo?.better) insights.push("ניתן לשפר את היתרה החודשית.");
  insights.push("הגורם המגביל: " + factor.key + ".");
  return insights.slice(0, 4);
}

function renderResult(result, input, bestInfo) {
  const tone = result.compliant ? "ok" : "danger";
  classLabel.textContent = input.className;
  statusIcon.textContent = result.compliant ? "●" : "●";
  statusTitle.textContent = result.compliant ? "תקין" : "לא תקין";
  statusDetail.textContent = centralReason(result, input);
  healthCard.className = "health-status-card " + tone;
  kpiChildren.textContent = numberFormatter.format(result.totalChildren);
  kpiStaff.textContent = numberFormatter.format(result.requiredStaff);
  kpiSqm.textContent = numberFormatter.format(result.actualSqm) + "/" + numberFormatter.format(result.roundedRequiredSqm);
  kpiBalance.textContent = money(result.monthlyBalance);

  const use = getUtilization(result);
  utilizationBars.innerHTML = [
    utilizationBar("שטח", use.areaUse),
    utilizationBar("תקינה", use.staffUse),
    utilizationBar("קיבולת", use.capacityUse),
  ].join("");
  const factor = limitingFactor(result);
  limitingFactorOutput.textContent = "הגורם המגביל: " + factor.icon + " " + factor.key;
  microInsights.innerHTML = getMicroInsights(result, input, bestInfo).map((text) => '<span>' + text + '</span>').join("");

  const activeRows = result.rows.filter((row) => row.children > 0);
  const missingSqm = Math.max(result.roundedRequiredSqm - input.actualSqm, 0);
  const childBreakdown = compositionLabel(input.composition, ", ");
  const capacityNote = result.capacityViolations.length ? formatCapacityViolations(result.capacityViolations) : activeRows.map((row) => row.label + " עד " + row.maxChildren).join(", ");
  summaryGrid.innerHTML = [
    summaryItem("סטטוס", result.compliant ? "תקין" : "לא תקין", centralReason(result, input), tone),
    summaryItem("פירוט ילדים", childBreakdown, "הרכב כיתה"),
    summaryItem("שטח נדרש", numberFormatter.format(result.requiredSqm) + " מ״ר", "בדיקה לפי " + numberFormatter.format(result.roundedRequiredSqm) + " מ״ר", result.areaCompliant ? "ok" : "danger"),
    summaryItem("שטח בפועל", numberFormatter.format(input.actualSqm) + " מ״ר", missingSqm > 0 ? "חסר " + numberFormatter.format(missingSqm) + " מ״ר" : "מספיק", result.areaCompliant ? "ok" : "danger"),
    summaryItem("מקסימום ילדים", result.capacityViolations.length ? "חריגה" : "תקין", capacityNote, result.capacityViolations.length ? "danger" : "ok"),
    summaryItem("צוות נדרש", numberFormatter.format(result.requiredStaff), "אנשי צוות"),
    summaryItem("הכנסה חודשית", money(result.income), "לפי שכר לימוד"),
    summaryItem("עלות צוות חודשית", money(result.staffCost), money(input.staffCostPerPerson) + " לאיש צוות"),
    summaryItem("יתרה חודשית", money(result.monthlyBalance), "הכנסה פחות עלות צוות"),
  ].join("");
  ageBreakdownList.innerHTML = activeRows.map((row) => '<article class="age-breakdown-card"><div><h3>' + row.label + '</h3><span>' + numberFormatter.format(row.children) + ' ילדים</span></div><dl><dt>שטח</dt><dd>' + numberFormatter.format(row.requiredSqm) + ' מ״ר</dd><dt>תקינה</dt><dd>' + numberFormatter.format(row.requiredStaff) + '</dd><dt>תקרה</dt><dd>' + row.maxChildren + '</dd><dt>קיבולת שטח</dt><dd>' + numberFormatter.format(row.sqmCapacity) + '</dd><dt>הכנסה</dt><dd>' + money(row.income) + '</dd></dl></article>').join("");
}

function splitComposition(totalChildren, firstKey, secondKey) {
  const secondCount = Math.min(5, Math.max(totalChildren - 1, 0));
  return { infants: 0, toddlers: 0, older: 0, [firstKey]: Math.max(totalChildren - secondCount, 0), [secondKey]: secondCount };
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
    const validation = getCompositionValidation(scenario.composition, input.rules);
    if (!validation.valid && scenario.title !== "הרכב נוכחי") return false;
    const key = JSON.stringify(scenario.composition);
    return list.findIndex((item) => JSON.stringify(item.composition) === key) === index;
  });
}

function scenarioCard(scenario) {
  const result = scenario.result;
  const tone = result.compliant ? "ok" : result.validComposition ? result.sqmStatus.tone : "danger";
  const status = result.compliant ? "עומד בדרישות" : result.validComposition ? result.sqmStatus.label : result.compositionMessage;
  return '<article class="scenario-card ' + tone + (result.compliant ? ' compliant' : ' not-compliant') + '"><div class="scenario-head"><span>' + scenario.title + '</span><strong>' + money(result.monthlyBalance) + '</strong></div><p class="scenario-composition">' + compositionLabel(scenario.composition) + '</p><div class="scenario-metrics"><span>ילדים: <b>' + numberFormatter.format(result.totalChildren) + '</b></span><span>שטח: <b>' + numberFormatter.format(result.requiredSqm) + ' מ״ר</b></span><span>צוות: <b>' + numberFormatter.format(result.requiredStaff) + '</b></span><span>הכנסה: <b>' + money(result.income) + '</b></span><span>עלות צוות: <b>' + money(result.staffCost) + '</b></span><span>יתרה: <b>' + money(result.monthlyBalance) + '</b></span></div><p>' + status + '</p></article>';
}

function getBestRecommendation(scenarios) {
  const current = scenarios[0];
  const compliant = scenarios.filter((scenario) => scenario.result.compliant).sort((a, b) => b.result.monthlyBalance - a.result.monthlyBalance);
  const best = compliant[0];
  const currentIsBest = !best || best.title === "הרכב נוכחי" || best.result.monthlyBalance <= current.result.monthlyBalance;
  if (currentIsBest) return { scenario: current, delta: 0, better: false };
  return { scenario: best, delta: best.result.monthlyBalance - current.result.monthlyBalance, better: true };
}

function renderRecommendation(bestInfo) {
  const scenario = bestInfo.scenario;
  const result = scenario.result;
  const tone = bestInfo.better ? "ok" : result.compliant ? "ok" : "warning";
  recommendationCard.className = "recommendation-card management-insight-card " + tone;
  if (bestInfo.better) {
    recommendationCard.innerHTML = '<span>המלצת המערכת</span><strong>כדאי לשקול ' + compositionLabel(scenario.composition) + '.</strong><p>החלופה מגדילה את היתרה ב-' + money(bestInfo.delta) + ' ועומדת בתקינה.</p>';
    return;
  }
  recommendationCard.innerHTML = '<span>המלצת המערכת</span><strong>ההרכב הנוכחי הוא האפשרות המומלצת לפי הנתונים שהוזנו.</strong><p>' + (result.compliant ? 'ההרכב הנוכחי תקין.' : 'לא נמצאה חלופה תקינה טובה יותר בשטח ובנתונים הנוכחיים.') + '</p>';
}

function createSummaryText(input, current, bestInfo) {
  const recommended = bestInfo.scenario;
  const deltaLine = bestInfo.better ? "החלופה משאירה יתרה חודשית גבוהה יותר ב-" + money(bestInfo.delta) + " ועומדת בתקינה." : "ההרכב הנוכחי הוא האפשרות המומלצת לפי הנתונים שהוזנו.";
  return [
    "מחשבון תפוסה ותקינה - סיכום כיתה",
    "",
    "סטטוס: " + (current.compliant ? "תקין" : "לא תקין"),
    "סיבה מרכזית: " + centralReason(current, input),
    "הרכב כיתה: " + compositionLabel(input.composition, ", "),
    "סה״כ ילדים: " + numberFormatter.format(current.totalChildren),
    "שטח בפועל: " + numberFormatter.format(current.actualSqm) + " מ״ר",
    "שטח נדרש: " + numberFormatter.format(current.requiredSqm) + " מ״ר",
    "צוות נדרש: " + numberFormatter.format(current.requiredStaff),
    "",
    "הכנסה חודשית: " + money(current.income),
    "עלות צוות חודשית: " + money(current.staffCost),
    "יתרה חודשית משוערת: " + money(current.monthlyBalance),
    "",
    "חלופה מומלצת:",
    compositionLabel(recommended.composition, " ו-"),
    "",
    deltaLine,
  ].join("\\n");
}

function renderScenarios(input, currentResult) {
  const scenarios = buildAlternativeScenarios(input).map((scenario) => ({ ...scenario, result: calculateScenarioBalance(scenario.composition, input) }));
  const bestInfo = getBestRecommendation(scenarios);
  renderResult(currentResult, input, bestInfo);
  renderRecommendation(bestInfo);
  lastSummaryText = createSummaryText(input, currentResult, bestInfo);
  scenarioGrid.innerHTML = scenarios.filter((scenario) => scenario.result.validComposition || scenario.title === "הרכב נוכחי").map(scenarioCard).join("") || '<p class="empty-state">אין חלופות להצגה.</p>';
}

function updateValidationHints() {
  const input = getInput();
  Object.entries(input.composition).forEach(([key, count]) => {
    const hint = document.querySelector('[data-validation="' + key + '"]');
    if (!hint) return;
    const max = input.rules[key].maxChildren;
    const remaining = max - count;
    hint.className = remaining < 0 ? "validation-danger" : "validation-ok";
    if (remaining < 0) hint.textContent = "חריגה מהמקסימום. מקסימום " + max + " ילדים.";
    else if (remaining === 0) hint.textContent = "הכיתה מלאה לפי מקסימום " + max + " ילדים.";
    else hint.textContent = "נותר מקום לעוד " + numberFormatter.format(remaining) + " ילדים. מקסימום " + max + ".";
  });
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
  updateValidationHints();
}

function chooseMode(mode) {
  modeInputs.forEach((input) => { input.checked = input.value === mode; });
  modeCards.forEach((card) => {
    const active = card.dataset.modeChoice === mode;
    card.classList.toggle("selected", active);
    card.setAttribute("aria-pressed", active ? "true" : "false");
  });
  workspace.hidden = false;
  resultsPanel.hidden = true;
  emptyState.hidden = false;
  hasCalculated = false;
  updateMode();
  form.scrollIntoView({ block: "start", behavior: "smooth" });
}

function updateMode() {
  const mode = getMode();
  advancedPanel.hidden = mode !== "full";
  modeLabel.textContent = mode === "quick" ? "בדיקה מהירה" : "חישוב מלא";
  document.querySelectorAll(".quick-only").forEach((element) => { element.hidden = mode !== "quick"; });
  document.querySelectorAll(".full-only").forEach((element) => { element.hidden = mode !== "full"; });
  applyQuickClassType(false);
}

function updateCalculator() {
  updateValidationHints();
  if (!hasCalculated) return;
  const input = getInput();
  const result = calculateScenarioBalance(input.composition, input);
  renderScenarios(input, result);
}

async function copySummary() {
  updateCalculator();
  try {
    await navigator.clipboard.writeText(lastSummaryText);
    copyFeedback.textContent = "הסיכום הועתק.";
  } catch {
    copyFeedback.textContent = "לא ניתן להעתיק אוטומטית בדפדפן הזה.";
  }
}

modeCards.forEach((card) => card.addEventListener("click", () => chooseMode(card.dataset.modeChoice)));
classroomTypeInput.addEventListener("change", () => {
  applyQuickClassType(true);
  updateCalculator();
});
form.addEventListener("input", updateCalculator);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  hasCalculated = true;
  emptyState.hidden = true;
  resultsPanel.hidden = false;
  updateCalculator();
  resultsPanel.scrollIntoView({ block: "start", behavior: "smooth" });
});
form.addEventListener("reset", () => {
  window.setTimeout(() => {
    classroomTypeInput.value = "older";
    hasCalculated = false;
    resultsPanel.hidden = true;
    emptyState.hidden = false;
    applyQuickClassType(true);
    updateValidationHints();
  }, 0);
});
copySummaryButton.addEventListener("click", copySummary);

updateValidationHints();
