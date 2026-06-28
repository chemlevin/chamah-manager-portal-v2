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

function money(value) {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
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

resetResults();
