import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});
const text = (value: unknown) => String(value ?? "").trim();
const uuid = (value: unknown) => /^[0-9a-f-]{36}$/i.test(text(value)) ? text(value) : "";
const monthDate = (value: unknown) => /^\d{4}-\d{2}$/.test(text(value))
  ? `${text(value)}-01`
  : /^\d{4}-\d{2}-01$/.test(text(value)) ? text(value) : "";

const activeOn = (row: Record<string, unknown>, date: string) =>
  text(row.effective_from) <= date && (!row.effective_to || text(row.effective_to) >= date);
const seniorityAt = (employment: Record<string, unknown> | undefined, date: string) => {
  if (!employment?.employment_start_date) return null;
  const start = new Date(`${employment.employment_start_date}T00:00:00Z`);
  const target = new Date(`${date}T00:00:00Z`);
  return Math.max(0, (target.getUTCFullYear() - start.getUTCFullYear()) * 12
    + target.getUTCMonth() - start.getUTCMonth()
    + Number(employment.recognized_prior_seniority_months || 0));
};
const fieldName = (value: unknown) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const comparable = (value: unknown) => {
  const normalized = text(value).toUpperCase();
  if (["TRUE", "YES", "ELIGIBLE", "1"].includes(normalized)) return true;
  if (["FALSE", "NO", "NOT_ELIGIBLE", "SUSPENDED", "0"].includes(normalized)) return false;
  const numeric = Number(value);
  return text(value) !== "" && Number.isFinite(numeric) ? numeric : normalized;
};
const conditionMatches = (condition: unknown, context: Record<string, unknown>) => {
  const clauses = text(condition).split(/\s+(?:AND|&&)\s+/i).filter(Boolean);
  return !clauses.length || clauses.every((clause) => {
    if (text(clause).toUpperCase() === "AUTOMATIC_BY_SENIORITY") return true;
    const inMatch = clause.match(/^\s*([A-Z0-9_-]+)\s+IN\s*\(?(.+?)\)?\s*$/i);
    if (inMatch) return inMatch[2].split(",").map((value) => comparable(value.replace(/["']/g, "").trim()))
      .includes(comparable(context[fieldName(inMatch[1])]));
    const match = clause.match(/^\s*([A-Z0-9_-]+)\s*(=|>=|<=|>|<)\s*(.+?)\s*$/i);
    if (!match) return false;
    const actual = comparable(context[fieldName(match[1])]);
    const expected = comparable(match[3].replace(/["']/g, ""));
    if (match[2] === "=") return actual === expected;
    return typeof actual === "number" && typeof expected === "number" && (
      match[2] === ">=" ? actual >= expected : match[2] === "<=" ? actual <= expected
        : match[2] === ">" ? actual > expected : actual < expected
    );
  });
};

function projectPayrollRecords(input: {
  records: Array<Record<string, unknown>>;
  allocations: Array<Record<string, unknown>>;
  employments: Array<Record<string, unknown>>;
  payTerms: Array<Record<string, unknown>>;
  eligibility: Array<Record<string, unknown>>;
  compensationRules: Array<Record<string, unknown>>;
  compensationFactors: Array<Record<string, unknown>>;
  travelRates: Array<Record<string, unknown>>;
  calculationInputRules: Array<Record<string, unknown>>;
  daycareSchoolYears: Array<Record<string, unknown>>;
  units: Array<Record<string, unknown>>;
}) {
  return input.records.map((record) => {
    const date = text(record.payroll_month);
    const employment = input.employments.find((row) => row.employment_id === record.employment_id);
    const payTerm = input.payTerms.find((row) => row.employee_pay_term_id === record.employee_pay_term_id);
    const manualEmployee = record.source_payload && typeof record.source_payload === "object"
      ? (record.source_payload as Record<string, unknown>).manual_employee as Record<string, unknown> | undefined : undefined;
    const seniorityMonths = seniorityAt(employment, date) ?? (Number.isFinite(Number(manualEmployee?.seniority_months))
      ? Number(manualEmployee?.seniority_months) : null);
    const explicitEligibility = new Map(input.eligibility
      .filter((row) => row.employment_id === record.employment_id && activeOn(row, date)
        && ["ELIGIBLE", "NOT_ELIGIBLE", "SUSPENDED"].includes(text(row.eligibility_status).toUpperCase()))
      .map((row) => [row.compensation_factor_id, comparable(row.eligibility_status) === true]));
    const monthlyOverrides = record.monthly_overrides && typeof record.monthly_overrides === "object"
      ? record.monthly_overrides as Record<string, unknown> : {};
    const monthlyInputs = record.monthly_inputs && typeof record.monthly_inputs === "object"
      ? record.monthly_inputs as Record<string, unknown> : {};
    const inputValue = (rule: Record<string, unknown>) => monthlyInputs[text(rule.source_field)] ?? record[text(rule.source_field)];
    const configuredInputValue = (sourceField: string) => {
      const rule = input.calculationInputRules.find((candidate) => text(candidate.source_field) === sourceField);
      return rule ? inputValue(rule) : record[sourceField];
    };
    const eligibilityContext = { ...(payTerm || {}), ...(manualEmployee || {}), ...record, ...monthlyInputs };
    const baseHourlyRate = Number(payTerm?.base_pay ?? manualEmployee?.base_hourly_rate ?? 0);
    const schoolYear = input.daycareSchoolYears.find((row) => row.daycare_id === record.daycare_id);
    const payrollComponents = input.compensationFactors.map((factor) => {
      const factorId = text(factor.compensation_factor_id);
      const rules = input.compensationRules.filter((row) => row.compensation_factor_id === factorId
        && activeOn(row, date)
        && (seniorityMonths == null || (Number(row.minimum_seniority_months || 0) <= seniorityMonths
          && (row.maximum_seniority_months == null || seniorityMonths <= Number(row.maximum_seniority_months)))));
      const rule = rules.find((row) => conditionMatches(row.eligibility_condition, eligibilityContext)) || rules[0];
      const override = monthlyOverrides[factorId];
      const eligible = override == null
        ? (explicitEligibility.has(factorId)
          ? explicitEligibility.get(factorId) === true
          : Boolean(rule && conditionMatches(rule.eligibility_condition, eligibilityContext)))
        : comparable(override) === true;
      let configuredRate: unknown = rule ? Number(rule.amount || 0) : null;
      let impact = 0;
      if (eligible && factor.value_type === "DAILY_CAPPED_MONTHLY") {
        const rate = input.travelRates.find((row) => !schoolYear || row.school_year_id === schoolYear.school_year_id);
        if (rate) {
          configuredRate = {
            daily_amount: Number(rate.daily_travel_amount || 0),
            monthly_cap: Number(rate.maximum_monthly_travel_amount || 0),
          };
          impact = Math.min(
            Number(configuredInputValue("work_days") || 0) * Number(rate.daily_travel_amount || 0),
            Number(rate.maximum_monthly_travel_amount || 0),
          );
        }
      } else if (eligible && rule && text(rule.proration_method).toUpperCase() !== "ELIGIBILITY_ONLY") {
        const amount = Number(rule.amount || 0);
        const proration = text(rule.proration_method).toUpperCase();
        impact = proration.includes("WORKDAY") ? amount * Number(configuredInputValue("work_days") || 0)
          : proration.includes("HOUR") || factor.value_type === "HOURLY" ? amount * Number(configuredInputValue("regular_hours") || 0)
          : amount;
      }
      const configuredRateDisplay = configuredRate && typeof configuredRate === "object"
        ? `${Number((configuredRate as Record<string, unknown>).daily_amount || 0)} / ${Number((configuredRate as Record<string, unknown>).monthly_cap || 0)}`
        : configuredRate == null ? null : String(configuredRate);
      return {
        compensation_factor_id: factorId,
        compensation_factor_code: factor.compensation_factor_code,
        display_name: factor.display_name,
        value_type: factor.value_type,
        eligible,
        eligibility_override: override ?? null,
        configured_rate: configuredRate,
        configured_rate_display: configuredRateDisplay,
        monthly_impact: Number(impact),
        has_active_rule: Boolean(rule),
      };
    });
    const baseGross = input.calculationInputRules.reduce((sum, rule) => {
      const value = Number(inputValue(rule) || 0);
      const rate = rule.uses_base_hourly_rate ? baseHourlyRate : 1;
      const sign = rule.operation === "SUBTRACT" ? -1 : 1;
      return sum + value * Number(rule.multiplier || 0) * rate * sign;
    }, 0);
    const effectiveHours = input.calculationInputRules
      .filter((rule) => rule.counts_for_effective_hours)
      .reduce((sum, rule) => sum + Number(inputValue(rule) || 0), 0);
    const calculatedGross = baseGross + payrollComponents.reduce((sum, component) => sum + component.monthly_impact, 0);
    const allocations = input.allocations.filter((row) => row.payroll_record_id === record.payroll_record_id);
    const allocatedCost = allocations.reduce((sum, row) => sum + Number(row.allocation_amount || 0), 0);
    const allocatedHours = allocations.reduce((sum, row) => sum + Number(row.allocated_hours || 0), 0);
    const allocatedStandardHours = allocations.reduce((sum, row) => sum + Number(row.allocated_standard_hours || 0), 0);
    const allocatedNet = allocations.reduce((sum, row) => sum + Number(row.allocated_net || 0), 0);
    const allocatedGross = allocations.reduce((sum, row) => sum + Number(row.allocated_gross || 0), 0);
    const remainingCost = Number(record.employer_cost || 0) - allocatedCost;
    const remainingHours = Number(record.actual_hours || 0) - allocatedHours;
    const remainingStandardHours = Number(record.standard_hours || 0) - allocatedStandardHours;
    const remainingNet = Number(record.actual_net || 0) - allocatedNet;
    const remainingGross = Number(record.actual_gross || 0) - allocatedGross;
    let rowStatus = "VALID";
    let rowHealthReason = "כל שדות החובה תקינים";
    const unit = input.units.find((row) => row.allocation_unit_id === record.allocation_unit_id);
    const actualUnit = input.units.find((row) => row.allocation_unit_id === record.actual_allocation_unit_id);
    const daycareMissing = (unit?.unit_type === "DAYCARE" || unit?.allocation_unit_type === "DAYCARE") && !record.daycare_id;
    const actualDaycareMissing = (actualUnit?.unit_type === "DAYCARE" || actualUnit?.allocation_unit_type === "DAYCARE") && !record.actual_daycare_id;
    const isManualDraft = text(record.record_origin).toUpperCase() === "MANUAL" && text(manualEmployee?.draft).toLowerCase() === "true";
    if (isManualDraft || (text(record.record_origin).toUpperCase() === "MANUAL" && record.employee_match_status !== "LINKED")) {
      rowStatus = "MISSING"; rowHealthReason = "שורת טיוטה דורשת השלמת פרטי עובד";
    } else if (!record.source_employee_identifier || record.employer_cost == null || !record.allocation_unit_id || !record.role_id
      || !record.actual_allocation_unit_id || daycareMissing || actualDaycareMissing) {
      rowStatus = "ERROR"; rowHealthReason = "חסרים שדות חובה";
    } else if (allocations.length && (Math.abs(remainingCost) > .01 || Math.abs(remainingHours) > .01
      || Math.abs(remainingStandardHours) > .01 || Math.abs(remainingNet) > .01 || Math.abs(remainingGross) > .01)) {
      rowStatus = "ERROR"; rowHealthReason = "פיצול לא מאוזן";
    } else if (allocations.length) {
      rowStatus = "SPLIT"; rowHealthReason = "ההקצאה מאוזנת";
    } else if (record.employee_match_status !== "LINKED") {
      rowStatus = "MISSING"; rowHealthReason = "עובד לא מקושר או באישור זמני";
    }
    return {
      ...record,
      seniority_months: seniorityMonths,
      base_hourly_rate: baseHourlyRate,
      manual_employee: manualEmployee || null,
      effective_hourly_rate: effectiveHours > 0 ? calculatedGross / effectiveHours : null,
      base_gross: baseGross,
      monthly_input_values: Object.fromEntries(input.calculationInputRules.map((rule) => [rule.source_field, inputValue(rule) ?? null])),
      payroll_components: payrollComponents,
      calculated_components: Object.fromEntries(payrollComponents.map((component) => [component.compensation_factor_id, component.monthly_impact])),
      calculated_gross: calculatedGross,
      row_status: rowStatus,
      row_health_reason: rowHealthReason,
      split_summary: {
        allocated_cost: allocatedCost, allocated_hours: allocatedHours,
        allocated_standard_hours: allocatedStandardHours, allocated_net: allocatedNet, allocated_gross: allocatedGross,
        remaining_cost: remainingCost, remaining_hours: remainingHours,
        remaining_standard_hours: remainingStandardHours, remaining_net: remainingNet, remaining_gross: remainingGross,
        has_split: allocations.length > 0,
      },
    };
  });
}

function payrollSummary(records: Array<Record<string, unknown>>, units: Array<Record<string, unknown>>, daycares: Array<Record<string, unknown>>) {
  type Totals = { employees: number; standard_hours: number; actual_hours: number; calculated_gross: number; actual_gross: number; employer_cost: number; errors: number };
  type Group = { allocation_unit_id: unknown; daycare_id: unknown; unit_name: unknown; daycare_name: unknown; employees: number; actual_gross: number; employer_cost: number };
  const totals = records.reduce<Totals>((result, row) => ({
    employees: result.employees + 1,
    standard_hours: result.standard_hours + Number(row.standard_hours || 0),
    actual_hours: result.actual_hours + Number(row.actual_hours || 0),
    calculated_gross: result.calculated_gross + Number(row.calculated_gross || 0),
    actual_gross: result.actual_gross + Number(row.actual_gross || 0),
    employer_cost: result.employer_cost + Number(row.employer_cost || 0),
    errors: result.errors + (row.row_status === "ERROR" ? 1 : 0),
  }), { employees: 0, standard_hours: 0, actual_hours: 0, calculated_gross: 0, actual_gross: 0, employer_cost: 0, errors: 0 });
  const groups = [...records.reduce<Map<string, Group>>((result, row) => {
    const key = `${row.allocation_unit_id || ""}|${row.daycare_id || ""}`;
    const current = result.get(key) || {
      allocation_unit_id: row.allocation_unit_id, daycare_id: row.daycare_id,
      unit_name: units.find((item) => item.allocation_unit_id === row.allocation_unit_id)?.display_name || "—",
      daycare_name: daycares.find((item) => item.daycare_id === row.daycare_id)?.display_name || "—",
      employees: 0, actual_gross: 0, employer_cost: 0,
    };
    current.employees += 1;
    current.actual_gross += Number(row.actual_gross || 0);
    current.employer_cost += Number(row.employer_cost || 0);
    result.set(key, current);
    return result;
  }, new Map<string, Group>()).values()];
  return {
    ...totals,
    gross_variance: totals.actual_gross - totals.calculated_gross,
    groups,
    counts: {
      all: records.length,
      linked: records.filter((row) => row.employee_match_status === "LINKED").length,
      missing: records.filter((row) => row.employee_match_status === "MISSING").length,
      approved_temporary: records.filter((row) => row.employee_match_status === "APPROVED_TEMPORARY").length,
      unresolved: records.filter((row) => row.employee_match_status === "UNRESOLVED").length,
      invalid: records.filter((row) => row.row_status === "ERROR").length,
    },
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authorization = request.headers.get("Authorization") || "";
  const serviceHeaders = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const read = async (path: string) => {
    const response = await fetch(`${url}/rest/v1/${path}`, { headers: serviceHeaders });
    const value = await response.json().catch(() => []);
    if (!response.ok) throw new Error(value.message || path);
    return value;
  };
  const write = async (path: string, method: string, body?: unknown, prefer = "return=representation") => {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      method, headers: { ...serviceHeaders, Prefer: prefer },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const value = await response.json().catch(() => []);
    if (!response.ok) throw new Error(value.message || "Database operation failed");
    return value;
  };
  const audit = (entityType: string, entityId: string, operation: string, previous: unknown, next: unknown, actorId: string) =>
    write("audit_events", "POST", {
      entity_type: entityType, entity_id: entityId, operation,
      previous_values: previous, new_values: next, source_type: "PORTAL_ADMIN", actor_user_id: actorId,
    }, "return=minimal");

  try {
    const auth = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: authorization } });
    if (!auth.ok) return json({ error: "נדרש חיבור תקף." }, 401);
    const actor = await auth.json();
    const page = new URL(request.url).searchParams.get("page") === "payroll" ? "payroll" : "employees";
    const screenCode = page === "payroll" ? "dashboards.staffing.actual-payroll" : "dashboards.staffing.employees";
    const permission = await fetch(`${url}/rest/v1/rpc/portal_has_permission`, {
      method: "POST", headers: serviceHeaders,
      body: JSON.stringify({ target_user_id: actor.id, target_screen_code: screenCode, required_level: request.method === "GET" ? "VIEW" : "EDIT" }),
    });
    if (!permission.ok || await permission.json() !== true) return json({ error: "אין הרשאה מתאימה." }, 403);

    const lookups = async () => {
      const [units, daycares, daycareSchoolYears, classrooms, roles, certificates, entities, compensationFactors] = await Promise.all([
        read("allocation_units?select=*&lifecycle_status=eq.ACTIVE&order=display_order,display_name"),
        read("daycares?select=*&lifecycle_status=eq.ACTIVE&order=display_order,display_name"),
        read("daycare_school_years?select=daycare_school_year_id,daycare_id,school_year_id,lifecycle_status&lifecycle_status=eq.ACTIVE"),
        read("classrooms?select=*&lifecycle_status=eq.ACTIVE&order=display_order,display_name"),
        read("roles?select=*&lifecycle_status=eq.ACTIVE&order=display_order,display_name"),
        read("certificate_types?select=*&lifecycle_status=eq.ACTIVE&order=display_order,display_name"),
        read("legal_entities?select=*&lifecycle_status=eq.ACTIVE&order=display_order,display_name"),
        read("compensation_factors?select=*&lifecycle_status=eq.ACTIVE&order=display_order,display_name"),
      ]);
      return { units, daycares, daycareSchoolYears, classrooms, roles, certificates, entities, compensationFactors };
    };

    if (request.method === "GET" && page === "employees") {
      const [employees, employments, assignments, payTerms, eligibility, employeeCertificates, leave, mappings, lookupData] = await Promise.all([
        read("employees?select=*&order=last_name,first_name,employee_code"),
        read("employments?select=*&order=employment_start_date.desc"),
        read("employee_assignments?select=*&order=effective_from.desc"),
        read("employee_pay_terms?select=*&order=valid_from.desc"),
        read("employee_compensation_eligibility?select=*&order=effective_from.desc"),
        read("employee_certificates?select=*&order=expires_on.asc.nullslast"),
        read("employee_leave_periods?select=*&order=starts_on.desc"),
        read(`portal_user_import_mappings?select=column_mapping&user_id=eq.${actor.id}&import_type=eq.EMPLOYEES&limit=1`),
        lookups(),
      ]);
      return json({ employees, employments, assignments, payTerms, eligibility, employeeCertificates, leave, importMapping:mappings[0]?.column_mapping || {}, ...lookupData });
    }
    if (request.method === "GET") {
      const requestedMonth = monthDate(new URL(request.url).searchParams.get("month"));
      const monthFilter = requestedMonth ? `&payroll_month=eq.${requestedMonth}` : "";
      const reopenPermission = await fetch(`${url}/rest/v1/rpc/portal_has_permission`, {
        method: "POST", headers: serviceHeaders,
        body: JSON.stringify({
          target_user_id: actor.id,
          target_screen_code: "dashboards.staffing.actual-payroll.reopen",
          required_level: "EDIT",
        }),
      });
      const [records, allocations, employees, employments, assignments, payTerms, eligibility, compensationRules, travelRates, calculationInputRules, months, lookupData] = await Promise.all([
        read(`payroll_records?select=*&order=payroll_month.desc,created_at.desc${monthFilter}&limit=3000`),
        read("payroll_allocations?select=*&limit=6000"),
        read("employees?select=employee_id,employee_code,first_name,last_name,lifecycle_status"),
        read("employments?select=employment_id,employee_id,employment_status,employment_start_date,employment_end_date,recognized_prior_seniority_months"),
        read("employee_assignments?select=*&order=effective_from.desc"),
        read("employee_pay_terms?select=*&order=valid_from.desc"),
        read("employee_compensation_eligibility?select=*&order=effective_from.desc"),
        read("compensation_rules?select=*&lifecycle_status=eq.ACTIVE&order=effective_from.desc"),
        read("travel_rates?select=*&lifecycle_status=eq.ACTIVE"),
        read("payroll_calculation_input_rules?select=*&lifecycle_status=eq.ACTIVE&order=display_order,input_code"),
        read("payroll_months?select=*&order=payroll_month.desc"),
        lookups(),
      ]);
      const projectedRecords = projectPayrollRecords({
        records, allocations, employments, payTerms, eligibility, compensationRules,
        compensationFactors: lookupData.compensationFactors,
        travelRates, calculationInputRules, daycareSchoolYears: lookupData.daycareSchoolYears, units: lookupData.units,
      });
      return json({
        records: projectedRecords, allocations, employees, employments, assignments, payTerms, eligibility,
        reportSummary: payrollSummary(projectedRecords, lookupData.units, lookupData.daycares),
        componentColumns: lookupData.compensationFactors.map((factor: Record<string, unknown>) => ({
          compensation_factor_id: factor.compensation_factor_id,
          compensation_factor_code: factor.compensation_factor_code,
          display_name: factor.display_name,
          value_type: factor.value_type,
        })),
        monthlyInputColumns: calculationInputRules.map((rule: Record<string, unknown>) => ({
          source_field: rule.source_field, display_name: rule.display_name,
          input_value_kind: rule.input_value_kind, display_order: rule.display_order,
        })),
        compensationRules, travelRates, calculationInputRules, months,
        canReopen: reopenPermission.ok && await reopenPermission.json() === true,
        ...lookupData,
      });
    }

    const body = await request.json();
    if (page === "employees") {
      if (body.action === "import_employees") {
        const importPermission = await fetch(`${url}/rest/v1/rpc/portal_has_permission`, {
          method: "POST", headers: serviceHeaders,
          body: JSON.stringify({
            target_user_id: actor.id,
            target_screen_code: "dashboards.staffing.employees.import",
            required_level: "EDIT",
          }),
        });
        if (!importPermission.ok || await importPermission.json() !== true) {
          return json({ error: "אין הרשאת עריכה לייבוא עובדים." }, 403);
        }
        const rows = Array.isArray(body.rows) ? body.rows : [];
        if (!rows.length || rows.length > 5000) return json({ error: "נדרשות 1–5,000 שורות תקינות לייבוא." }, 422);
        const result = await write("rpc/portal_import_employees", "POST", {
          target_rows: rows,
          actor_id: actor.id,
          source_file_name: text(body.file_name),
          column_mapping: body.column_mapping && typeof body.column_mapping === "object" ? body.column_mapping : {},
        });
        return json(result);
      }
      if (body.action === "save_employee") {
        const payload = {
          employee_code: text(body.employee_code), national_id: text(body.national_id) || null,
          first_name: text(body.first_name), last_name: text(body.last_name),
          phone: text(body.phone) || null, email: text(body.email) || null,
          birth_date: text(body.birth_date) || null, manager_employee_id: uuid(body.manager_employee_id) || null,
          lifecycle_status: text(body.lifecycle_status) || "ACTIVE",
          notes: text(body.notes) || null, updated_by_user_id: actor.id,
        };
        if (!payload.employee_code || !payload.first_name || !payload.last_name) return json({ error: "מספר עובד, שם פרטי ושם משפחה נדרשים." }, 422);
        const id = uuid(body.employee_id);
        const previous = id ? (await read(`employees?employee_id=eq.${id}&limit=1`))[0] : null;
        const saved = id
          ? await write(`employees?employee_id=eq.${id}`, "PATCH", payload)
          : await write("employees", "POST", { ...payload, created_by_user_id: actor.id });
        const row = saved[0];
        await audit("employees", row.employee_id, id ? "UPDATE" : "INSERT", previous, row, actor.id);
        return json({ employee: row }, id ? 200 : 201);
      }
      if (body.action === "deactivate_employee" || body.action === "delete_employee") {
        const id = uuid(body.employee_id);
        const previous = (await read(`employees?employee_id=eq.${id}&limit=1`))[0];
        if (!previous) return json({ error: "העובד לא נמצא." }, 404);
        const lifecycleStatus = body.action === "deactivate_employee" ? "INACTIVE" : "ARCHIVED";
        await write(`employees?employee_id=eq.${id}`, "PATCH", { lifecycle_status: lifecycleStatus, updated_by_user_id: actor.id });
        await audit("employees", id, "STATUS_CHANGE", previous, { ...previous, lifecycle_status: lifecycleStatus }, actor.id);
        return json({ employee_id: id, lifecycle_status: lifecycleStatus });
      }
      if (body.action === "version_pay_term") {
        const result = await write("rpc/portal_version_employee_pay_term", "POST", {
          target_employee_id: uuid(body.employee_id),
          effective_from: text(body.record?.valid_from),
          term_values: body.record || {},
          actor_id: actor.id,
        });
        return json({ record: result });
      }
      if (body.action === "close_pay_term") {
        const result = await write("rpc/portal_close_employee_pay_term", "POST", {
          target_pay_term_id: uuid(body.employee_pay_term_id),
          close_on: text(body.close_on),
          actor_id: actor.id,
        });
        return json({ record: result });
      }
      const childTables: Record<string, { table: string; key: string; parent: string }> = {
        save_employment: { table: "employments", key: "employment_id", parent: "employee_id" },
        save_assignment: { table: "employee_assignments", key: "assignment_id", parent: "employment_id" },
        save_eligibility: { table: "employee_compensation_eligibility", key: "employee_compensation_eligibility_id", parent: "employment_id" },
        save_certificate: { table: "employee_certificates", key: "employee_certificate_id", parent: "employee_id" },
        save_leave: { table: "employee_leave_periods", key: "employee_leave_period_id", parent: "employment_id" },
      };
      const child = childTables[body.action];
      if (child) {
        const payload = { ...(body.record || {}) };
        delete payload[child.key];
        for (const keyName of Object.keys(payload)) if (payload[keyName] === "") payload[keyName] = null;
        payload.updated_by_user_id = actor.id;
        if (!uuid(payload[child.parent])) return json({ error: "רשומת האב נדרשת." }, 422);
        const id = uuid(body.record?.[child.key]);
        const previous = id ? (await read(`${child.table}?${child.key}=eq.${id}&limit=1`))[0] : null;
        const saved = id
          ? await write(`${child.table}?${child.key}=eq.${id}`, "PATCH", payload)
          : await write(child.table, "POST", { ...payload, created_by_user_id: actor.id });
        await audit(child.table, saved[0][child.key], id ? "UPDATE" : "INSERT", previous, saved[0], actor.id);
        return json({ record: saved[0] }, id ? 200 : 201);
      }
    }

    if (page === "payroll") {
      const currentMonth = async (value: unknown) => {
        const normalized = monthDate(value);
        if (!normalized) return null;
        return (await read(`payroll_months?payroll_month=eq.${normalized}&limit=1`))[0] || null;
      };
      const requireCurrentMonth = async (value: unknown) => {
        const month = await currentMonth(value);
        if (!month) throw new Error("חודש השכר טרם נפתח.");
        if (month.month_status !== "CURRENT") throw new Error("חודש השכר סגור לעריכה.");
        return month;
      };
      const activeEmploymentForCode = async (employeeCode: string) => {
        const employee = (await read(`employees?select=employee_id,employee_code,first_name,last_name&employee_code=eq.${encodeURIComponent(employeeCode)}&limit=1`))[0];
        if (!employee) return null;
        const employment = (await read(`employments?select=*&employee_id=eq.${employee.employee_id}&employment_status=eq.ACTIVE&order=employment_start_date.desc&limit=1`))[0];
        return employment ? { employee, employment } : null;
      };
      if (body.action === "open_month") {
        const result = await write("rpc/portal_open_payroll_month_v2", "POST", {
          target_month: monthDate(body.payroll_month),
          target_scope_type: text(body.scope_type) || "ORGANIZATION",
          target_allocation_unit_id: uuid(body.allocation_unit_id) || null,
          target_daycare_id: uuid(body.daycare_id) || null,
          copy_previous_employees: Boolean(body.copy_previous_employees ?? body.opening_method === "PREVIOUS_MONTH"),
          load_active_employees: Boolean(body.load_active_employees ?? body.opening_method === "ACTIVE_EMPLOYEES"),
          actor_id: actor.id,
        });
        return json(result);
      }
      if (body.action === "close_month") {
        const selected = body.payroll_month_id
          ? { payroll_month_id: uuid(body.payroll_month_id) }
          : await currentMonth(body.payroll_month);
        const closingRows = await read(`payroll_records?select=*&payroll_month_id=eq.${selected?.payroll_month_id}&row_kind=eq.PARENT`);
        const closingIds = new Set(closingRows.map((row: Record<string, unknown>) => row.payroll_record_id));
        const closingAllocations = (await read("payroll_allocations?select=*&limit=6000"))
          .filter((row: Record<string, unknown>) => closingIds.has(row.payroll_record_id));
        const invalidRows = closingRows.filter((row: Record<string, unknown>) => {
          const splits = closingAllocations.filter((item: Record<string, unknown>) => item.payroll_record_id === row.payroll_record_id);
          const cost = splits.reduce((sum: number, item: Record<string, unknown>) => sum + Number(item.allocation_amount || 0), 0);
          const hours = splits.reduce((sum: number, item: Record<string, unknown>) => sum + Number(item.allocated_hours || 0), 0);
          const standardHours = splits.reduce((sum: number, item: Record<string, unknown>) => sum + Number(item.allocated_standard_hours || 0), 0);
          const net = splits.reduce((sum: number, item: Record<string, unknown>) => sum + Number(item.allocated_net || 0), 0);
          const gross = splits.reduce((sum: number, item: Record<string, unknown>) => sum + Number(item.allocated_gross || 0), 0);
          return !row.source_employee_identifier || !row.allocation_unit_id || !row.role_id || !row.actual_allocation_unit_id
            || ["MISSING", "UNRESOLVED"].includes(text(row.employee_match_status))
            || row.standard_hours == null || row.actual_hours == null || row.actual_net == null || row.actual_gross == null || row.employer_cost == null
            || (splits.length > 0 && (Math.abs(cost - Number(row.employer_cost || 0)) > .01
              || Math.abs(hours - Number(row.actual_hours || 0)) > .01
              || Math.abs(standardHours - Number(row.standard_hours || 0)) > .01
              || Math.abs(net - Number(row.actual_net || 0)) > .01
              || Math.abs(gross - Number(row.actual_gross || 0)) > .01));
        });
        if (invalidRows.length) {
          return json({ error: "PAYROLL_MONTH_VALIDATION_FAILED", invalid_record_ids: invalidRows.map((row: Record<string, unknown>) => row.payroll_record_id) }, 422);
        }
        const result = await write("rpc/portal_close_payroll_month_v2", "POST", {
          target_month_id: selected?.payroll_month_id,
          actor_id: actor.id,
          closing_notes: text(body.notes) || null,
        });
        return json(result);
      }
      if (body.action === "reopen_month") {
        const allowed = await fetch(`${url}/rest/v1/rpc/portal_has_permission`, {
          method: "POST", headers: serviceHeaders,
          body: JSON.stringify({
            target_user_id: actor.id,
            target_screen_code: "dashboards.staffing.actual-payroll.reopen",
            required_level: "EDIT",
          }),
        });
        if (!allowed.ok || await allowed.json() !== true) {
          return json({ error: "אין הרשאה לפתוח מחדש חודש שכר סגור." }, 403);
        }
        const selected = body.payroll_month_id
          ? { payroll_month_id: uuid(body.payroll_month_id) }
          : await currentMonth(body.payroll_month);
        const result = await write("rpc/portal_reopen_payroll_month_v2", "POST", {
          target_month_id: selected?.payroll_month_id,
          actor_id: actor.id,
          reopening_reason: text(body.notes),
        });
        return json(result);
      }
      if (body.action === "save_rows" || body.action === "commit_import") {
        const rows = Array.isArray(body.rows) ? body.rows : [];
        if (!rows.length || rows.length > 5000) return json({ error: "נדרשות 1–5,000 שורות תקינות." }, 422);
        const result = await write("rpc/portal_save_payroll_rows_v2", "POST", {
          target_month_id: uuid(body.payroll_month_id),
          target_rows: rows,
          actor_id: actor.id,
        });
        return json(result);
      }
      if (body.action === "preview_import") {
        const rows = Array.isArray(body.rows) ? body.rows : [];
        const prepared = [];
        for (const source of rows) {
          const code = text(source.employee_number);
          const linked = code ? await activeEmploymentForCode(code) : null;
          const employerCost = Number(source.employer_cost);
          prepared.push({
            ...source, employee_number: code, employment_id: linked?.employment.employment_id || null,
            employee_name: linked ? `${linked.employee.first_name} ${linked.employee.last_name}` : text(source.employee_name),
            employee_match_status: linked ? "LINKED" : "MISSING",
            importable: Boolean(monthDate(source.payroll_month) && code && Number.isFinite(employerCost) && employerCost >= 0),
          });
        }
        return json({ preview_token: crypto.randomUUID(), rows: prepared, summary: {
          total: prepared.length, importable: prepared.filter((row) => row.importable).length,
          linked: prepared.filter((row) => row.employee_match_status === "LINKED").length,
          missing: prepared.filter((row) => row.employee_match_status === "MISSING").length,
        } });
      }
      if (body.action === "save_record") {
        await requireCurrentMonth(body.payroll_month);
        const code = text(body.source_employee_identifier);
        const linked = code ? await activeEmploymentForCode(code) : null;
        const assignment = linked
          ? (await read(`employee_assignments?select=allocation_unit_id,daycare_id,role_id&employment_id=eq.${linked.employment.employment_id}&effective_from=lte.${monthDate(body.payroll_month)}&or=(effective_to.is.null,effective_to.gte.${monthDate(body.payroll_month)})&order=is_primary.desc,effective_from.desc&limit=1`))[0]
          : null;
        let id = uuid(body.payroll_record_id);
        if (!id) {
          id = (await read(`payroll_records?select=payroll_record_id&payroll_month=eq.${monthDate(body.payroll_month)}&source_employee_identifier=eq.${encodeURIComponent(code)}&order=created_at.asc&limit=1`))[0]?.payroll_record_id || "";
        }
        let importBatchId = uuid(body.import_batch_id);
        if (!importBatchId) {
          const batch = await write("import_batches", "POST", {
            source_type: "PAYROLL_FILE", source_name: body.record_origin === "MANUAL" ? "MANUAL" : "PORTAL",
            source_file_name: text(body.source_file_name) || null, triggered_by_user_id: actor.id,
            status: "COMPLETED", total_rows: 1, accepted_rows: 1,
            completed_at: new Date().toISOString(), metadata: { preview_token: body.preview_token || null },
          });
          importBatchId = batch[0].import_batch_id;
        }
        const payload = {
          employment_id: linked?.employment.employment_id || null,
          payroll_month: monthDate(body.payroll_month),
          source_employee_identifier: code, source_record_identifier: text(body.source_record_identifier) || crypto.randomUUID(),
          gross_pay: body.gross_pay === "" || body.gross_pay == null ? null : Number(body.gross_pay),
          employer_cost: body.employer_cost === "" || body.employer_cost == null ? null : Number(body.employer_cost),
          regular_hours: body.regular_hours === "" || body.regular_hours == null ? null : Number(body.regular_hours),
          overtime_hours: body.overtime_hours === "" ? null : Number(body.overtime_hours),
          hours_125: body.hours_125 === "" ? null : Number(body.hours_125),
          hours_150: body.hours_150 === "" ? null : Number(body.hours_150),
          vacation_hours: body.vacation_hours === "" ? null : Number(body.vacation_hours),
          sick_hours: body.sick_hours === "" ? null : Number(body.sick_hours),
          other_absence_hours: body.other_absence_hours === "" ? null : Number(body.other_absence_hours),
          unpaid_absence_hours: body.unpaid_absence_hours === "" ? null : Number(body.unpaid_absence_hours),
          standard_hours: body.standard_hours === "" ? null : Number(body.standard_hours),
          actual_hours: body.actual_hours === "" ? null : Number(body.actual_hours),
          actual_net: body.actual_net == null || body.actual_net === "" ? null : Number(body.actual_net),
          actual_gross: body.actual_gross === "" ? null : Number(body.actual_gross),
          actual_allocation_unit_id: uuid(body.actual_allocation_unit_id) || null,
          actual_daycare_id: uuid(body.actual_daycare_id) || null,
          vacation_deduct: body.vacation_deduct === "" ? null : Number(body.vacation_deduct),
          vacation_pay: body.vacation_pay === "" ? null : Number(body.vacation_pay),
          sick_deduct: body.sick_deduct === "" ? null : Number(body.sick_deduct),
          sick_pay: body.sick_pay === "" ? null : Number(body.sick_pay),
          work_days: body.work_days === "" ? null : Number(body.work_days),
          travel_reimbursement: body.travel_reimbursement === "" ? null : Number(body.travel_reimbursement),
          bonus_amount: body.bonus_amount === "" ? null : Number(body.bonus_amount),
          adjustment_amount: body.adjustment_amount === "" ? null : Number(body.adjustment_amount),
          no_absence_override: body.no_absence_override === "" ? null : body.no_absence_override === true || body.no_absence_override === "true",
          persistence_override: body.persistence_override === "" ? null : body.persistence_override === true || body.persistence_override === "true",
          transportation_override: body.transportation_override === "" ? null : body.transportation_override === true || body.transportation_override === "true",
          excellence_override: body.excellence_override === "" ? null : body.excellence_override === true || body.excellence_override === "true",
          class_manager_override: body.class_manager_override === "" ? null : body.class_manager_override === true || body.class_manager_override === "true",
          degree_override: body.degree_override === "" ? null : body.degree_override === true || body.degree_override === "true",
          certificate_override: text(body.certificate_override) || null,
          monthly_overrides: body.monthly_overrides && typeof body.monthly_overrides === "object" ? body.monthly_overrides : {},
          monthly_inputs: body.monthly_inputs && typeof body.monthly_inputs === "object" ? body.monthly_inputs : {},
          actual_status: text(body.actual_status) || null,
          actual_notes: text(body.actual_notes) || null,
          notes: text(body.notes) || null, import_batch_id: importBatchId,
          employee_match_status: linked ? "LINKED" : (text(body.employee_match_status) || "MISSING"),
          record_origin: text(body.record_origin) || "MANUAL", source_payload: body.source_payload || {},
          allocation_unit_id: uuid(body.allocation_unit_id) || assignment?.allocation_unit_id || null,
          daycare_id: uuid(body.daycare_id) || assignment?.daycare_id || null,
          role_id: uuid(body.role_id) || assignment?.role_id || null,
          employee_pay_term_id: linked
            ? (await read(`employee_pay_terms?select=employee_pay_term_id&employee_id=eq.${linked.employee.employee_id}&valid_from=lte.${monthDate(body.payroll_month)}&or=(valid_to.is.null,valid_to.gte.${monthDate(body.payroll_month)})&order=valid_from.desc&limit=1`))[0]?.employee_pay_term_id || null
            : null,
          updated_by_user_id: actor.id,
        };
        const completeActuals = payload.actual_hours !== null && payload.actual_net !== null && payload.actual_gross !== null && payload.employer_cost !== null;
        const completeAssignment = Boolean(payload.allocation_unit_id && payload.role_id && payload.actual_allocation_unit_id);
        const savedManualEmployee = payload.source_payload && typeof payload.source_payload === "object"
          ? (payload.source_payload as Record<string, unknown>).manual_employee as Record<string, unknown> | undefined
          : undefined;
        const manualDraft = payload.record_origin === "MANUAL" && text(savedManualEmployee?.draft).toLowerCase() === "true";
        const acceptedEmployee = ["LINKED", "APPROVED_TEMPORARY"].includes(payload.employee_match_status);
        Object.assign(payload, {
          row_status: manualDraft || (!acceptedEmployee && payload.record_origin === "MANUAL") ? "MISSING"
            : completeActuals && completeAssignment && acceptedEmployee ? "VALID"
              : acceptedEmployee ? "MISSING" : "ERROR",
          row_health_reason: manualDraft || (!acceptedEmployee && payload.record_origin === "MANUAL") ? "שורת טיוטה דורשת השלמת פרטי עובד"
            : !acceptedEmployee ? "עובד לא מקושר או באישור זמני"
            : !completeAssignment ? "חסרים שדות שיוך חובה"
            : !completeActuals ? "חסרים נתוני הנהלת חשבונות"
            : "כל שדות החובה תקינים",
        });
        if (!payload.payroll_month || !code || (payload.employer_cost !== null && (!Number.isFinite(payload.employer_cost) || payload.employer_cost < 0))) {
          return json({ error: "חודש, מספר עובד וערכי שכר תקינים נדרשים." }, 422);
        }
        const previous = id ? (await read(`payroll_records?payroll_record_id=eq.${id}&limit=1`))[0] : null;
        const saved = id
          ? await write(`payroll_records?payroll_record_id=eq.${id}`, "PATCH", payload)
          : await write("payroll_records", "POST", { ...payload, created_by_user_id: actor.id });
        await audit("payroll_records", saved[0].payroll_record_id, id ? "UPDATE" : "INSERT", previous, saved[0], actor.id);
        return json({ record: saved[0] }, id ? 200 : 201);
      }
      if (body.action === "approve_temporary") {
        const id = uuid(body.payroll_record_id);
        const existing = (await read(`payroll_records?payroll_record_id=eq.${id}&limit=1`))[0];
        await requireCurrentMonth(existing?.payroll_month);
        const rows = await write(`payroll_records?payroll_record_id=eq.${id}&employment_id=is.null`, "PATCH", {
          employee_match_status: "APPROVED_TEMPORARY", temporary_approved_by_user_id: actor.id,
          temporary_approved_at: new Date().toISOString(), temporary_approval_notes: text(body.notes) || null,
          updated_by_user_id: actor.id,
        });
        if (!rows.length) return json({ error: "רשומת השכר אינה זמינה לאישור זמני." }, 409);
        await audit("payroll_records", id, "STATUS_CHANGE", null, rows[0], actor.id);
        return json({ record: rows[0] });
      }
      if (body.action === "save_allocations") {
        const existing = (await read(`payroll_records?payroll_record_id=eq.${uuid(body.payroll_record_id)}&limit=1`))[0];
        await requireCurrentMonth(existing?.payroll_month);
        const allocationRows = Array.isArray(body.allocations) ? body.allocations : [];
        const allocatedCost = allocationRows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.allocation_amount || 0), 0);
        const allocatedHours = allocationRows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.allocated_hours || 0), 0);
        const allocatedStandardHours = allocationRows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.allocated_standard_hours || 0), 0);
        const allocatedNet = allocationRows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.allocated_net || 0), 0);
        const allocatedGross = allocationRows.reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.allocated_gross || 0), 0);
        if (!allocationRows.length
          || allocationRows.some((row: Record<string, unknown>) => !uuid(row.allocation_unit_id) || !uuid(row.role_id))
          || Math.abs(allocatedCost - Number(existing?.employer_cost || 0)) > .01
          || Math.abs(allocatedHours - Number(existing?.actual_hours || 0)) > .01
          || Math.abs(allocatedStandardHours - Number(existing?.standard_hours || 0)) > .01
          || Math.abs(allocatedNet - Number(existing?.actual_net || 0)) > .01
          || Math.abs(allocatedGross - Number(existing?.actual_gross || 0)) > .01) {
          return json({ error: "PAYROLL_SPLIT_UNBALANCED", details: {
            original_cost: Number(existing?.employer_cost || 0), allocated_cost: allocatedCost,
            original_hours: Number(existing?.actual_hours || 0), allocated_hours: allocatedHours,
            original_standard_hours: Number(existing?.standard_hours || 0), allocated_standard_hours: allocatedStandardHours,
            original_net: Number(existing?.actual_net || 0), allocated_net: allocatedNet,
            original_gross: Number(existing?.actual_gross || 0), allocated_gross: allocatedGross,
          } }, 422);
        }
        const result = await write("rpc/portal_save_payroll_allocations", "POST", {
          target_payroll_record_id: uuid(body.payroll_record_id),
          allocation_rows: allocationRows,
          actor_id: actor.id,
        });
        return json(result);
      }
      if (body.action === "preview_allocations") {
        const existing = (await read(`payroll_records?payroll_record_id=eq.${uuid(body.payroll_record_id)}&limit=1`))[0];
        await requireCurrentMonth(existing?.payroll_month);
        const rows = Array.isArray(body.allocations) ? body.allocations : [];
        const sum = (field: string) => rows.reduce((total: number, row: Record<string, unknown>) => total + Number(row[field] || 0), 0);
        const parent = {
          standard_hours: Number(existing?.standard_hours || 0), actual_hours: Number(existing?.actual_hours || 0),
          net: Number(existing?.actual_net || 0), gross: Number(existing?.actual_gross || 0), employer_cost: Number(existing?.employer_cost || 0),
        };
        const allocated = {
          standard_hours: sum("allocated_standard_hours"), actual_hours: sum("allocated_hours"),
          net: sum("allocated_net"), gross: sum("allocated_gross"), employer_cost: sum("allocation_amount"),
        };
        const remaining = Object.fromEntries(Object.entries(parent).map(([field, amount]) => [field, amount - allocated[field as keyof typeof allocated]]));
        const balanced = Object.values(remaining).every((amount) => Math.abs(Number(amount)) <= .01);
        return json({ parent, allocated, remaining, balanced, state: balanced ? "BALANCED" : Object.values(remaining).some((amount) => Number(amount) < -.01) ? "OVER" : "MISSING" });
      }
      if (body.action === "delete_record") {
        const id = uuid(body.payroll_record_id);
        const previous = (await read(`payroll_records?payroll_record_id=eq.${id}&limit=1`))[0];
        if (!previous) return json({ error: "רשומת השכר לא נמצאה." }, 404);
        await requireCurrentMonth(previous.payroll_month);
        await write(`payroll_allocations?payroll_record_id=eq.${id}`, "DELETE", undefined, "return=minimal");
        await write(`payroll_records?payroll_record_id=eq.${id}`, "DELETE", undefined, "return=minimal");
        await audit("payroll_records", id, "DELETE", previous, null, actor.id);
        return json({ deleted: id });
      }
    }
    return json({ error: "פעולה לא מוכרת." }, 400);
  } catch (error) {
    console.error("portal-workforce-workbench", error);
    return json({ error: error instanceof Error ? error.message : "שגיאת שרת בסביבת העבודה." }, 500);
  }
});
