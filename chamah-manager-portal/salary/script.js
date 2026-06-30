const form = document.querySelector("#salary-form");
const hourlyWageInput = document.querySelector("#hourly-wage");
const seniorityInput = document.querySelector("#seniority");
const hoursInput = document.querySelector("#monthly-hours");
const componentList = document.querySelector("#component-list");
const emptyComponents = document.querySelector("#empty-components");
const estimatedGrossOutput = document.querySelector("#estimated-gross");
const effectiveHourlyOutput = document.querySelector("#effective-hourly");
const totalAdditionsOutput = document.querySelector("#total-additions");
const netRangeSummaryOutput = document.querySelector("#net-range-summary");
const printButton = document.querySelector("#print-estimate");

const currencyFormatter = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 2,
});

const wholeCurrencyFormatter = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 });

function money(value) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function wholeMoney(value) {
  return wholeCurrencyFormatter.format(Number.isFinite(value) ? value : 0);
}

function hourlyComponent(name, rate, hours, important = false) {
  return { name, type: "שעתי", hourlyValue: rate, monthlyAmount: rate * hours, important };
}

function globalComponent(name, amount, hours, important = false) {
  return { name, type: "גלובלי", hourlyValue: hours > 0 ? amount / hours : 0, monthlyAmount: amount, important };
}

function persistenceComponent(seniority, hours) {
  if (seniority <= 1) return hourlyComponent("מענק התמדה", 1, hours);
  if (seniority <= 4) return hourlyComponent("מענק התמדה", 2, hours);
  if (seniority <= 7) return hourlyComponent("מענק התמדה", 3, hours);
  if (seniority <= 10) return globalComponent("מענק התמדה", 550, hours);
  if (seniority <= 20) return globalComponent("מענק התמדה", 600, hours);
  return globalComponent("מענק התמדה", 700, hours);
}

function seniorityComponent(seniority, hours) {
  if (seniority <= 2) return hourlyComponent("תוספת ותק", 0, hours);
  if (seniority <= 4) return hourlyComponent("תוספת ותק", 0.5, hours);
  if (seniority <= 9) return hourlyComponent("תוספת ותק", 0.75, hours);
  if (seniority <= 15) return hourlyComponent("תוספת ותק", 1.1, hours);
  if (seniority <= 19) return hourlyComponent("תוספת ותק", 1.6, hours);
  if (seniority <= 24) return hourlyComponent("תוספת ותק", 2.5, hours);
  return hourlyComponent("תוספת ותק", 3, hours);
}

function managementComponent(isEligible, seniority, hours) {
  if (!isEligible) return hourlyComponent("ניהול כיתה", 0, hours);
  if (seniority >= 10) return globalComponent("ניהול כיתה", 250, hours);
  if (seniority >= 1) return hourlyComponent("ניהול כיתה", 1.5, hours);
  return hourlyComponent("ניהול כיתה", 0, hours);
}

function certificateComponent(value, hours) {
  return hourlyComponent("תוספת תעודה", value === "none" ? 0 : 2, hours);
}

function degreeComponent(value, hours) {
  return hourlyComponent("תוספת תואר", value === "yes" ? 1 : 0, hours);
}

function renderComponents(rows) {
  const visibleRows = rows.filter((row) => row.monthlyAmount !== 0);
  componentList.innerHTML = visibleRows.map((row) => {
    const className = row.important ? "component-card component-important" : "component-card";
    return '<div class="' + className + '"><span>' + row.name + '</span><strong>' + money(row.monthlyAmount) + '</strong></div>';
  }).join("");
  emptyComponents.hidden = visibleRows.length > 0;
}

function updateSummary(totalAdditions, grossTotal, effectiveHourly) {
  const netMinimum = grossTotal * 0.84;
  const netMaximum = grossTotal * 0.89;
  estimatedGrossOutput.textContent = money(grossTotal);
  effectiveHourlyOutput.textContent = money(effectiveHourly);
  totalAdditionsOutput.textContent = money(totalAdditions);
  netRangeSummaryOutput.textContent = money(netMinimum) + " - " + money(netMaximum);
}

function resetResults() {
  renderComponents([]);
  updateSummary(0, 0, 0);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const hourlyWage = Number(hourlyWageInput.value);
  const seniority = Math.floor(Number(seniorityInput.value));
  const hours = Number(hoursInput.value);
  const isEligibleForManagement = form.elements["class-management"].value === "yes";
  const certificateValue = form.elements.certificate.value;
  const degreeValue = form.elements["education-degree"].value;

  if (![hourlyWage, seniority, hours].every(Number.isFinite) || hourlyWage < 0 || seniority < 0 || hours <= 0) {
    resetResults();
    return;
  }

  const basePay = hourlyComponent("שכר בסיס", hourlyWage, hours, true);
  const components = [
    basePay,
    certificateComponent(certificateValue, hours),
    degreeComponent(degreeValue, hours),
    seniorityComponent(seniority, hours),
    persistenceComponent(seniority, hours),
    managementComponent(isEligibleForManagement, seniority, hours),
    globalComponent("מצוינות", 250, hours),
  ];
  const totalAdditions = components.slice(1).reduce((sum, item) => sum + item.monthlyAmount, 0);
  const grossTotal = basePay.monthlyAmount + totalAdditions;
  const effectiveHourly = grossTotal / hours;

  renderComponents(components);
  updateSummary(totalAdditions, grossTotal, effectiveHourly);
  if (window.matchMedia("(max-width: 768px)").matches) {
    document.querySelector(".salary-results").scrollIntoView({ block: "start", behavior: "smooth" });
  }
});

form.addEventListener("reset", () => {
  window.setTimeout(resetResults, 0);
});

printButton.addEventListener("click", () => {
  window.print();
});

const AGE_GROUPS = {
  infants: { label: "תינוק", sqmPerChild: 2.8, ratio: 5, tuition: 3936, staffCost: 9000 },
  toddlers: { label: "פעוט", sqmPerChild: 2.6, ratio: 8, tuition: 2917, staffCost: 9000 },
  older: { label: "בוגר", sqmPerChild: 2.2, ratio: 10, tuition: 2587, staffCost: 9000 },
};

const occupancyForm = document.querySelector("#occupancy-form");
const occupancyStatusCard = document.querySelector("#occupancy-status-card");
const occupancyStatus = document.querySelector("#occupancy-status");
const occupancyStatusDetail = document.querySelector("#occupancy-status-detail");
const occupancyClassLabel = document.querySelector("#occupancy-class-label");
const grossProfitOutput = document.querySelector("#gross-profit");
const occupancySummaryGrid = document.querySelector("#occupancy-summary-grid");
const ageBreakdownList = document.querySelector("#age-breakdown-list");
const totalRequiredStaffOutput = document.querySelector("#total-required-staff");
const scenarioGrid = document.querySelector("#scenario-grid");
const recommendationCard = document.querySelector("#occupancy-recommendation");

function roundStaff(value) {
  return Math.ceil(value * 2) / 2;
}

function calculateRequiredStaff(children, ratio) {
  if (!Number.isFinite(children) || children <= 0 || !Number.isFinite(ratio) || ratio <= 0) return 0;
  return roundStaff(children / ratio);
}

function calculateRequiredSqm(children, sqmPerChild) {
  if (!Number.isFinite(children) || children <= 0) return 0;
  return children * sqmPerChild;
}

function calculateIncome(children, tuition) {
  if (!Number.isFinite(children) || children <= 0) return 0;
  return children * tuition;
}

function getCompositionValidation(composition) {
  const active = Object.entries(composition).filter(([, count]) => Number(count) > 0).map(([key]) => key);
  if (active.length <= 1) return { valid: true, message: "הרכב חד-גילאי תקין" };
  if (active.length === 2 && active.includes("infants") && active.includes("older")) {
    return { valid: false, message: "כיתה מעורבת בין תינוק ובוגר אינה אפשרית." };
  }
  if (active.length > 2) {
    return { valid: false, message: "כיתה מעורבת יכולה להיות רק בין שתי שכבות גיל סמוכות." };
  }
  const validAdjacent = active.length === 2 && (
    (active.includes("infants") && active.includes("toddlers")) ||
    (active.includes("toddlers") && active.includes("older"))
  );
  return validAdjacent
    ? { valid: true, message: "הרכב מעורב תקין" }
    : { valid: false, message: "הרכב כיתה לא אפשרי." };
}

function calculateScenarioProfit(composition, options) {
  const staffCostPerPerson = options.staffCostPerPerson;
  const validation = getCompositionValidation(composition);
  const rows = Object.entries(AGE_GROUPS).map(([key, config]) => {
    const children = Math.max(Number(composition[key] || 0), 0);
    const tuition = options.tuition[key];
    const requiredSqm = calculateRequiredSqm(children, config.sqmPerChild);
    const requiredStaff = calculateRequiredStaff(children, config.ratio);
    const income = calculateIncome(children, tuition);
    return { key, ...config, children, tuition, requiredSqm, requiredStaff, income };
  });
  const totalChildren = rows.reduce((sum, row) => sum + row.children, 0);
  const requiredSqm = rows.reduce((sum, row) => sum + row.requiredSqm, 0);
  const requiredStaff = rows.reduce((sum, row) => sum + row.requiredStaff, 0);
  const income = rows.reduce((sum, row) => sum + row.income, 0);
  const staffCost = requiredStaff * staffCostPerPerson;
  const grossProfit = income - staffCost;
  const actualSqm = Number(options.actualSqm || 0);
  const sqmStatus = getSqmStatus(actualSqm, requiredSqm);
  const areaCompliant = requiredSqm > 0 && actualSqm >= requiredSqm;
  return {
    rows,
    totalChildren,
    requiredSqm,
    actualSqm,
    requiredStaff,
    staffingCompliant: requiredStaff > 0,
    validComposition: validation.valid,
    compositionMessage: validation.message,
    areaCompliant,
    compliant: totalChildren > 0 && areaCompliant && validation.valid,
    sqmStatus,
    income,
    staffCost,
    grossProfit,
    profitPerChild: totalChildren > 0 ? grossProfit / totalChildren : 0,
    profitPerSqm: actualSqm > 0 ? grossProfit / actualSqm : 0,
  };
}

function inputNumber(id, fallback = 0) {
  const value = Number(document.querySelector("#" + id).value);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function getOccupancyInput() {
  const staffCostOverride = inputNumber("staff-cost-override", 0);
  return {
    className: document.querySelector("#classroom-name").value.trim() || "כיתה ללא שם",
    actualSqm: inputNumber("actual-sqm", 0),
    composition: {
      infants: inputNumber("infant-count", 0),
      toddlers: inputNumber("toddler-count", 0),
      older: inputNumber("older-count", 0),
    },
    tuition: {
      infants: inputNumber("infant-tuition", AGE_GROUPS.infants.tuition) || AGE_GROUPS.infants.tuition,
      toddlers: inputNumber("toddler-tuition", AGE_GROUPS.toddlers.tuition) || AGE_GROUPS.toddlers.tuition,
      older: inputNumber("older-tuition", AGE_GROUPS.older.tuition) || AGE_GROUPS.older.tuition,
    },
    staffCostPerPerson: staffCostOverride > 0 ? staffCostOverride : 9000,
  };
}

function getSqmStatus(actualSqm, requiredSqm) {
  if (requiredSqm <= 0) return { label: "תקין", detail: "אין ילדים לחישוב שטח", tone: "ok" };
  if (actualSqm >= requiredSqm) return { label: "תקין", detail: "הכיתה תקינה מבחינת שטח: כן", tone: "ok" };
  if (actualSqm >= requiredSqm * 0.95) return { label: "גבולי", detail: "הכיתה קרובה לדרישת השטח", tone: "warning" };
  return { label: "חסר שטח", detail: "הכיתה תקינה מבחינת שטח: לא", tone: "danger" };
}

function summaryItem(label, value, note, tone = "") {
  return '<article class="occupancy-summary-item ' + tone + '"><span>' + label + '</span><strong>' + value + '</strong><small>' + note + '</small></article>';
}

function renderOccupancySummary(result, input, status) {
  occupancyClassLabel.textContent = input.className;
  grossProfitOutput.textContent = wholeMoney(result.grossProfit);
  occupancyStatus.textContent = status.label;
  occupancyStatusDetail.textContent = status.detail;
  occupancyStatusCard.className = "occupancy-status-card " + status.tone;
  totalRequiredStaffOutput.textContent = numberFormatter.format(result.requiredStaff) + " אנשי צוות";

  occupancySummaryGrid.innerHTML = [
    summaryItem("סה״כ ילדים", numberFormatter.format(result.totalChildren), "בכל קבוצות הגיל"),
    summaryItem("שטח נדרש", numberFormatter.format(result.requiredSqm) + " מ״ר", "לפי גיל והרכב כיתה", status.tone),
    summaryItem("שטח בפועל", numberFormatter.format(input.actualSqm) + " מ״ר", status.detail, status.tone),
    summaryItem("תקינה נדרשת", numberFormatter.format(result.requiredStaff), "אנשי צוות"),
    summaryItem("הכנסה חודשית", wholeMoney(result.income), "לפני הוצאות צוות"),
    summaryItem("עלות צוות", wholeMoney(result.staffCost), "לפי " + wholeMoney(input.staffCostPerPerson) + " לאיש צוות"),
    summaryItem("רווח לילד", wholeMoney(result.profitPerChild), "רווח גולמי משוער"),
    summaryItem("רווח למ״ר", wholeMoney(result.profitPerSqm), "לפי שטח בפועל"),
  ].join("");

  ageBreakdownList.innerHTML = result.rows.filter((row) => row.children > 0).map((row) => (
    '<article class="age-breakdown-card"><div><h3>' + row.label + '</h3><span>' + numberFormatter.format(row.children) + ' ילדים</span></div><dl><dt>שטח</dt><dd>' + numberFormatter.format(row.requiredSqm) + ' מ״ר</dd><dt>תקינה</dt><dd>' + numberFormatter.format(row.requiredStaff) + '</dd><dt>הכנסה</dt><dd>' + wholeMoney(row.income) + '</dd></dl></article>'
  )).join("") || '<p class="empty-state">אין ילדים בכיתה לחישוב.</p>';
}

function compositionLabel(composition) {
  const parts = [
    composition.infants > 0 ? numberFormatter.format(composition.infants) + " תינוקות" : "",
    composition.toddlers > 0 ? numberFormatter.format(composition.toddlers) + " פעוטות" : "",
    composition.older > 0 ? numberFormatter.format(composition.older) + " בוגרים" : "",
  ].filter(Boolean);
  return parts.join(" + ") || "ללא ילדים";
}

function rebalanceComposition(composition, targetKey, amount) {
  const next = { infants: composition.infants, toddlers: composition.toddlers, older: composition.older };
  const donors = ["older", "toddlers", "infants"].filter((key) => key !== targetKey);
  let remaining = amount;
  donors.forEach((key) => {
    if (remaining <= 0) return;
    const moved = Math.min(next[key], remaining);
    next[key] -= moved;
    next[targetKey] += moved;
    remaining -= moved;
  });
  return next;
}

function scenarioCard(scenario) {
  const result = scenario.result;
  const status = result.validComposition ? result.sqmStatus : { label: "לא אפשרי", tone: "danger" };
  const recommendationClass = result.compliant ? " compliant" : " not-compliant";
  const statusText = result.compliant ? "עומד בדרישות" : result.validComposition ? status.label : result.compositionMessage;
  return '<article class="scenario-card ' + status.tone + recommendationClass + '"><div class="scenario-head"><span>' + scenario.title + '</span><strong>' + wholeMoney(result.grossProfit) + '</strong></div><p class="scenario-composition">' + compositionLabel(scenario.composition) + '</p><div class="scenario-metrics"><span>ילדים: <b>' + numberFormatter.format(result.totalChildren) + '</b></span><span>שטח נדרש: <b>' + numberFormatter.format(result.requiredSqm) + ' מ״ר</b></span><span>שטח בפועל: <b>' + numberFormatter.format(result.actualSqm) + ' מ״ר</b></span><span>תקינה: <b>' + numberFormatter.format(result.requiredStaff) + '</b></span><span>הכנסה: <b>' + wholeMoney(result.income) + '</b></span><span>צוות: <b>' + wholeMoney(result.staffCost) + '</b></span><span>רווח לילד: <b>' + wholeMoney(result.profitPerChild) + '</b></span><span>רווח למ״ר: <b>' + wholeMoney(result.profitPerSqm) + '</b></span></div><p>' + statusText + '</p></article>';
}

function splitAdjacent(totalChildren, firstKey, secondKey) {
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
  const composition = input.composition;
  const totalChildren = composition.infants + composition.toddlers + composition.older;
  const scenarios = [
    { title: "הרכב נוכחי", composition },
    { title: "רק תינוקות", composition: { infants: totalChildren, toddlers: 0, older: 0 } },
    { title: "רק פעוטים", composition: { infants: 0, toddlers: totalChildren, older: 0 } },
    { title: "רק בוגרים", composition: { infants: 0, toddlers: 0, older: totalChildren } },
    { title: "פעוטים + תינוקות", composition: splitAdjacent(totalChildren, "toddlers", "infants") },
    { title: "בוגרים + פעוטים", composition: splitAdjacent(totalChildren, "older", "toddlers") },
  ];
  return scenarios.filter((scenario, index, list) => {
    const key = JSON.stringify(scenario.composition);
    return list.findIndex((item) => JSON.stringify(item.composition) === key) === index;
  });
}

function getRecommendation(scenarios) {
  const current = scenarios[0];
  const compliant = scenarios.filter((scenario) => scenario.result.compliant);
  if (!current.result.validComposition) {
    const bestCompliant = compliant.sort((a, b) => b.result.grossProfit - a.result.grossProfit)[0];
    if (bestCompliant) {
      return { tone: "danger", title: current.result.compositionMessage, detail: bestCompliant.title + " היא החלופה התקינה והרווחית ביותר: " + wholeMoney(bestCompliant.result.grossProfit) + "." };
    }
    return { tone: "danger", title: current.result.compositionMessage, detail: "לא נמצאה חלופה תקינה בשטח הכיתה הנוכחי. מומלץ להפחית ילדים או להגדיל שטח." };
  }
  if (!current.result.compliant) {
    const bestCompliant = compliant.sort((a, b) => b.result.grossProfit - a.result.grossProfit)[0];
    if (bestCompliant) {
      return { tone: "warning", title: "ההרכב הנוכחי אינו עומד בדרישות", detail: bestCompliant.title + " היא החלופה התקינה והרווחית ביותר: " + wholeMoney(bestCompliant.result.grossProfit) + "." };
    }
    return { tone: "danger", title: "אין חלופה תקינה בשטח הכיתה הנוכחי", detail: "כל ההרכבים שנבדקו חורגים מדרישת השטח. מומלץ להפחית ילדים או להגדיל שטח." };
  }
  const best = compliant.sort((a, b) => b.result.grossProfit - a.result.grossProfit)[0];
  const delta = best ? best.result.grossProfit - current.result.grossProfit : 0;
  if (best && best.title !== current.title && delta > 0) {
    return { tone: "ok", title: best.title + " מגדילה רווח חודשי ב-" + wholeMoney(delta), detail: "החלופה עומדת בדרישות שטח ותקינה ומציגה רווח של " + wholeMoney(best.result.grossProfit) + "." };
  }
  const rejectedByStaff = scenarios.find((scenario) => scenario.title !== current.title && scenario.result.areaCompliant && scenario.result.staffCost > current.result.staffCost && scenario.result.grossProfit < current.result.grossProfit);
  if (rejectedByStaff) {
    return { tone: "warning", title: "ההרכב הנוכחי הוא הבחירה המומלצת כרגע", detail: rejectedByStaff.title + " פחות מומלצת בגלל תוספת תקינה ועלות צוות גבוהה יותר." };
  }
  return { tone: "ok", title: "ההרכב הנוכחי תקין ומומלץ כרגע", detail: "לא נמצאה חלופה תקינה שמגדילה את הרווח החודשי לפי הנתונים הנוכחיים." };
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
  const visibleScenarios = scenarios.filter((scenario) => scenario.result.validComposition);
  scenarioGrid.innerHTML = visibleScenarios.map(scenarioCard).join("") || '<p class="empty-state">אין חלופות תקינות להצגה.</p>';
}

function updateOccupancyCalculator() {
  const input = getOccupancyInput();
  const result = calculateScenarioProfit(input.composition, input);
  const status = result.validComposition ? getSqmStatus(input.actualSqm, result.requiredSqm) : { label: "לא אפשרי", detail: result.compositionMessage, tone: "danger" };
  renderOccupancySummary(result, input, status);
  renderScenarios(input);
}

occupancyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateOccupancyCalculator();
  if (window.matchMedia("(max-width: 768px)").matches) {
    document.querySelector(".occupancy-results").scrollIntoView({ block: "start", behavior: "smooth" });
  }
});

occupancyForm.addEventListener("input", updateOccupancyCalculator);
occupancyForm.addEventListener("reset", () => {
  window.setTimeout(updateOccupancyCalculator, 0);
});

resetResults();
updateOccupancyCalculator();
