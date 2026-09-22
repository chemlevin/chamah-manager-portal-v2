import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" },
});

type Dataset = { key: string; path: string; required?: boolean; scoped?: "unit" | "daycare" };
const screens: Record<string, Dataset[]> = {
  home: [
    { key: "units", path: "allocation_units?select=allocation_unit_id,display_name,allocation_unit_type,lifecycle_status,display_order,notes&lifecycle_status=eq.ACTIVE&order=display_order.asc,display_name.asc,allocation_unit_id.asc", scoped: "unit" },
  ],
  "calculators.occupancy": [
    { key: "ages", path: "age_groups?select=age_group_id,age_group_code,display_name,display_order,lifecycle_status&lifecycle_status=eq.ACTIVE&order=display_order", required: true },
    { key: "licensing", path: "classroom_licensing_rules?select=classroom_licensing_rule_id,age_group,sqm_per_child,max_children,allowed_mixed_with,valid_from,valid_to,rounding_method,lifecycle_status&lifecycle_status=eq.ACTIVE", required: true },
    { key: "rules", path: "budget_rules?select=budget_rule_id,budget_category_id,school_year_id,age_group_id,effective_from,effective_to,numeric_value,lifecycle_status,calculation_method,parameter_1,standard_type,minimum_staff,rounding_method&lifecycle_status=eq.ACTIVE", required: true },
    { key: "categories", path: "budget_categories?select=budget_category_id,budget_category_code,category_type,lifecycle_status&lifecycle_status=eq.ACTIVE", required: true },
    { key: "parameters", path: "staffing_budget_parameters?select=staffing_budget_parameter_id,school_year_id,monthly_hours_per_fte,lifecycle_status&lifecycle_status=eq.ACTIVE", required: true },
    { key: "years", path: "school_years?select=school_year_id,display_name,start_date,end_date,is_default,is_selectable&is_selectable=eq.true", required: true },
  ],
  "calculators.salary": [
    { key: "factors", path: "compensation_factors?select=compensation_factor_id,compensation_factor_code,display_name,value_type,lifecycle_status,display_order&lifecycle_status=eq.ACTIVE&order=display_order", required: true },
    { key: "rules", path: "compensation_rules?select=compensation_rule_id,compensation_factor_id,school_year_id,effective_from,effective_to,minimum_seniority_months,maximum_seniority_months,amount,eligibility_condition,proration_method,lifecycle_status&lifecycle_status=eq.ACTIVE", required: true },
    { key: "years", path: "school_years?select=school_year_id,school_year_code,display_name,start_date,end_date,is_default,is_selectable&is_selectable=eq.true", required: true },
  ],
  "dashboards.staffing": [
    { key: "roles", path: "roles?select=role_id,display_name,daycare_relevant,lifecycle_status" },
    { key: "daycares", path: "daycares?select=daycare_id,allocation_unit_id,display_name,lifecycle_status", scoped: "daycare" },
    { key: "classrooms", path: "classrooms?select=classroom_id,daycare_school_year_id,display_name,lifecycle_status" },
    { key: "units", path: "allocation_units?select=allocation_unit_id,display_name,allocation_unit_type,lifecycle_status", scoped: "unit" },
  ],
  "dashboards.finance": [
    { key: "years", path: "school_years?select=school_year_id,display_name,start_date,end_date,is_default,is_selectable&is_selectable=eq.true&order=start_date.desc", required: true },
    { key: "months", path: "school_year_months?select=school_year_month_id,school_year_id,month_label,start_date,school_year_sequence&order=school_year_sequence", required: true },
    { key: "daycares", path: "daycares?select=daycare_id,daycare_code,allocation_unit_id,display_name,lifecycle_status,display_order&order=display_order", scoped: "daycare" },
    { key: "dsy", path: "daycare_school_years?select=daycare_school_year_id,daycare_id,school_year_id,is_operating,tuition_calculation_mode,tuition_standard_type,staffing_calculation_mode,staffing_standard_type" },
    { key: "classrooms", path: "classrooms?select=classroom_id,daycare_school_year_id,display_name,lifecycle_status,effective_from,effective_to" },
    { key: "units", path: "allocation_units?select=allocation_unit_id,display_name,allocation_unit_type,lifecycle_status,display_order&lifecycle_status=eq.ACTIVE&order=display_order.asc,display_name.asc", scoped: "unit" },
    { key: "budgetCategories", path: "budget_categories?select=budget_category_id,budget_category_code,display_name,category_type,lifecycle_status,requires_budget,budget_source&lifecycle_status=eq.ACTIVE", required: true },
    { key: "budgetRules", path: "budget_rules?select=budget_rule_id,budget_category_id,school_year_id,daycare_id,allocation_unit_id,age_group_id,effective_from,effective_to,rule_type,numeric_value,text_value,lifecycle_status,sheet_rule_id,calculation_method,parameter_1,parameter_2,show_budget,display_scope,effective_from_month_id,effective_to_month_id,standard_type,minimum_staff,rounding_method", required: true },
    { key: "workCalendars", path: "monthly_work_calendars?select=monthly_work_calendar_id,school_year_month_id,sun_thu_hours_per_day,friday_hours_per_day,sun_thu_workdays,friday_workdays", required: true },
    { key: "staffingParameters", path: "staffing_budget_parameters?select=staffing_budget_parameter_id,school_year_id,monthly_hours_per_fte,hourly_budget_cost,budget_formula,effective_from_month_id,effective_to_month_id,lifecycle_status", required: true },
    { key: "ageGroups", path: "age_groups?select=age_group_id,age_group_code,display_name,lifecycle_status", required: true },
    { key: "roles", path: "roles?select=role_id,role_code,display_name,role_group" },
  ],
  "management.tables.calculation": [
    ...["school_years", "calendar_years", "school_year_months", "legal_entity_types", "legal_entities", "allocation_units", "daycares", "age_groups", "classrooms", "roles", "certificate_types", "budget_categories", "bank_accounts"]
      .map((table) => ({ key: table, path: `${table}?select=*&limit=500` })),
  ],
  "management.tables.variables": [
    ...["classroom_licensing_rules", "budget_rules", "staffing_budget_parameters", "compensation_factors", "compensation_rules"]
      .map((table) => ({ key: table, path: `${table}?select=*&limit=500` })),
  ],
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "GET") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authorization = request.headers.get("Authorization") || "";
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  try {
    const auth = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: authorization } });
    if (!auth.ok) return json({ error: "AUTHENTICATION_REQUIRED" }, 401);
    const actor = await auth.json();
    const screenCode = new URL(request.url).searchParams.get("screen") || "";
    const datasets = screens[screenCode];
    if (!datasets) return json({ error: "UNKNOWN_SCREEN" }, 400);
    const allowed = await fetch(`${url}/rest/v1/rpc/portal_has_permission`, {
      method: "POST", headers,
      body: JSON.stringify({ target_user_id: actor.id, target_screen_code: screenCode, required_level: "VIEW" }),
    });
    if (!allowed.ok || await allowed.json() !== true) return json({ error: "PERMISSION_DENIED", screen: screenCode }, 403);
    const accessResponse = await fetch(`${url}/rest/v1/rpc/portal_my_access`, {
      method: "POST", headers: { apikey: key, Authorization: authorization, "Content-Type": "application/json" }, body: "{}",
    });
    if (!accessResponse.ok) throw new Error("portal_my_access");
    const access = await accessResponse.json();
    const selectedScope = access.profile?.scope_mode === "SELECTED" && !access.profile?.is_super_admin;
    const unitIds = new Set(access.allocation_unit_ids || []);
    const daycareIds = new Set(access.daycare_ids || []);
    const entries = await Promise.all(datasets.map(async (dataset) => {
      const response = await fetch(`${url}/rest/v1/${dataset.path}`, { headers });
      const rows = await response.json().catch(() => []);
      if (!response.ok) throw new Error(dataset.key);
      const scopedRows = !selectedScope ? rows : dataset.scoped === "unit"
        ? rows.filter((row: Record<string, unknown>) => unitIds.has(row.allocation_unit_id))
        : dataset.scoped === "daycare"
          ? rows.filter((row: Record<string, unknown>) => daycareIds.has(row.daycare_id) || unitIds.has(row.allocation_unit_id))
          : rows;
      return [dataset.key, scopedRows] as const;
    }));
    const configuration = Object.fromEntries(entries);
    const missing = datasets.filter((dataset) => dataset.required && !configuration[dataset.key]?.length).map((dataset) => dataset.key);
    return json({ screen: screenCode, permission: access.profile?.is_super_admin ? "SUPER_ADMIN" : "AUTHORIZED", status: missing.length ? "CONFIGURATION_MISSING" : "READY", missing, configuration });
  } catch (error) {
    console.error("portal-runtime-config", error);
    return json({ error: "RUNTIME_CONFIGURATION_FAILED" }, 500);
  }
});
