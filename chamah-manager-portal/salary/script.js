const form = document.querySelector("#salary-form");
const hourlyWageInput = document.querySelector("#hourly-wage");
const seniorityInput = document.querySelector("#seniority");
const hoursInput = document.querySelector("#monthly-hours");
const tableBody = document.querySelector("#pay-table-body");
const estimatedGrossOutput = document.querySelector("#estimated-gross");
const effectiveHourlyOutput = document.querySelector("#effective-hourly");
const totalAdditionsOutput = document.querySelector("#total-additions");
const grossSummaryOutput = document.querySelector("#gross-summary");
const hourlySummaryOutput = document.querySelector("#hourly-summary");
const printButton = document.querySelector("#print-estimate");
const currencyFormatter = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 });
function money(value) { return currencyFormatter.format(Number.isFinite(value) ? value : 0); }
function hourlyComponent(name, rate, hours) { return { name: name, type: "שעתי", hourlyValue: rate, monthlyAmount: rate * hours }; }
function globalComponent(name, amount, hours) { return { name: name, type: "גלובלי", hourlyValue: hours > 0 ? amount / hours : 0, monthlyAmount: amount }; }
function persistenceComponent(seniority, hours) { if (seniority <= 1) return hourlyComponent("מענק התמדה", 1, hours); if (seniority <= 4) return hourlyComponent("מענק התמדה", 2, hours); if (seniority <= 7) return hourlyComponent("מענק התמדה", 3, hours); if (seniority <= 10) return globalComponent("מענק התמדה", 550, hours); if (seniority <= 20) return globalComponent("מענק התמדה", 600, hours); return globalComponent("מענק התמדה", 700, hours); }
function seniorityComponent(seniority, hours) { if (seniority <= 2) return hourlyComponent("תוספת ותק", 0, hours); if (seniority <= 4) return hourlyComponent("תוספת ותק", 0.5, hours); if (seniority <= 9) return hourlyComponent("תוספת ותק", 0.75, hours); if (seniority <= 15) return hourlyComponent("תוספת ותק", 1.1, hours); if (seniority <= 19) return hourlyComponent("תוספת ותק", 1.6, hours); if (seniority <= 24) return hourlyComponent("תוספת ותק", 2.5, hours); return hourlyComponent("תוספת ותק", 3, hours); }
function managementComponent(isEligible, seniority, hours) { if (!isEligible) return hourlyComponent("ניהול כיתה", 0, hours); if (seniority >= 1 && seniority <= 9) return hourlyComponent("ניהול כיתה", 1.5, hours); if (seniority >= 10) return globalComponent("ניהול כיתה", 250, hours); return hourlyComponent("ניהול כיתה", 0, hours); }
function certificateComponent(value, hours) { return hourlyComponent("תוספת תעודה", value === "none" ? 0 : 2, hours); }
function degreeComponent(value, hours) { return hourlyComponent("תוספת תואר", value === "yes" ? 1 : 0, hours); }
function renderRows(rows) { tableBody.innerHTML = rows.map(function(row) { return '<tr><td data-label="רכיב">' + row.name + '</td><td data-label="סוג">' + row.type + '</td><td data-label="שווי לשעה">' + money(row.hourlyValue) + '</td><td data-label="סכום חודשי">' + money(row.monthlyAmount) + '</td></tr>'; }).join(""); }
function updateSummary(totalAdditions, grossTotal, effectiveHourly) { estimatedGrossOutput.textContent = money(grossTotal); effectiveHourlyOutput.textContent = money(effectiveHourly); totalAdditionsOutput.textContent = money(totalAdditions); grossSummaryOutput.textContent = money(grossTotal); hourlySummaryOutput.textContent = money(effectiveHourly); }
function resetResults() { renderRows([hourlyComponent("שכר בסיס", 0, 0), hourlyComponent("תוספת תעודה", 0, 0), hourlyComponent("תוספת תואר", 0, 0), hourlyComponent("תוספת ותק", 0, 0), hourlyComponent("מענק התמדה", 0, 0), hourlyComponent("ניהול כיתה", 0, 0), globalComponent("מצוינות", 0, 1)]); updateSummary(0, 0, 0); }
form.addEventListener("submit", function(event) { event.preventDefault(); var hourlyWage = Number(hourlyWageInput.value); var seniority = Math.floor(Number(seniorityInput.value)); var hours = Number(hoursInput.value); var isEligibleForManagement = form.elements["class-management"].value === "yes"; var certificateValue = form.elements.certificate.value; var degreeValue = form.elements["education-degree"].value; if (![hourlyWage, seniority, hours].every(Number.isFinite) || hourlyWage < 0 || seniority < 0 || hours <= 0) { resetResults(); return; } var basePay = hourlyComponent("שכר בסיס", hourlyWage, hours); var certificate = certificateComponent(certificateValue, hours); var degree = degreeComponent(degreeValue, hours); var seniorityAddition = seniorityComponent(seniority, hours); var persistence = persistenceComponent(seniority, hours); var management = managementComponent(isEligibleForManagement, seniority, hours); var excellence = globalComponent("מצוינות", 250, hours); var additions = [certificate, degree, seniorityAddition, persistence, management, excellence]; var totalAdditions = additions.reduce(function(sum, item) { return sum + item.monthlyAmount; }, 0); var grossTotal = basePay.monthlyAmount + totalAdditions; var effectiveHourly = grossTotal / hours; renderRows([basePay].concat(additions)); updateSummary(totalAdditions, grossTotal, effectiveHourly); });
form.addEventListener("reset", function() { window.setTimeout(resetResults, 0); });
printButton.addEventListener("click", function() { window.print(); });
resetResults();
