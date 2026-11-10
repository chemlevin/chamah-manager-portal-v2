import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const uniqueById = <T extends Record<string, unknown>>(rows: T[], field: keyof T) => {
  const unique = new Map<string, T>();
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = String(row?.[field] || "").trim();
    if (id && !unique.has(id)) unique.set(id, row);
  }
  return [...unique.values()];
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authorization = request.headers.get("Authorization") || "";
  const serviceHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  try {
    const authResponse = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: authorization } });
    if (!authResponse.ok) return json({ error: "נדרש חיבור תקף." }, 401);
    const actor = await authResponse.json();
    const permissionResponse = await fetch(`${url}/rest/v1/rpc/portal_has_permission`, { method: "POST", headers: serviceHeaders, body: JSON.stringify({ target_user_id: actor.id, target_screen_code: "management.permissions.users", required_level: "EDIT" }) });
    if (!permissionResponse.ok || await permissionResponse.json() !== true) return json({ error: "אין הרשאת עריכה לניהול משתמשים." }, 403);

    if (request.method !== "GET") return json({ error: "ניהול זהויות הוקפא ב-TRACK110; שינויים מחייבים פעולה מאושרת." }, 405);

    const [authUsers, profiles, permissions, unitScopes, daycareScopes, sections, units, daycares, audit, roles, actions, assignments, roleActions, authorizationAudit] = await Promise.all([
      fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/portal_user_profiles?select=*`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/portal_user_permissions?select=*`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/portal_user_allocation_units?select=*`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/portal_user_daycares?select=*`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/portal_sections?select=*&is_active=eq.true&order=display_order`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/allocation_units?select=allocation_unit_id,display_name,allocation_unit_type,lifecycle_status&lifecycle_status=eq.ACTIVE&order=display_order`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/daycares?select=daycare_id,allocation_unit_id,display_name,lifecycle_status&lifecycle_status=eq.ACTIVE&order=display_order`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/audit_events?select=*&entity_type=eq.PORTAL_USER&order=occurred_at.desc&limit=500`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/portal_roles?select=*`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/portal_actions?select=*&order=action_code`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/portal_role_assignments?select=*`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/portal_role_actions?select=*`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/portal_authorization_audit?select=*&order=occurred_at.desc&limit=500`, { headers: serviceHeaders }).then(r => r.json())
    ]);
    return json({ users: authUsers.users || authUsers, profiles, permissions, unit_scopes: unitScopes, daycare_scopes: daycareScopes, sections: uniqueById(sections, "screen_code"), allocation_units: uniqueById(units, "allocation_unit_id"), daycares: uniqueById(daycares, "daycare_id"), audit_events: audit, roles, actions, role_assignments: assignments, role_actions: roleActions, authorization_audit: authorizationAudit, authorization_mode: "DIRECTOR_ONLY" });
  } catch (error) {
    console.error("portal-users", error);
    return json({ error: "שגיאת שרת בניהול המשתמשים." }, 500);
  }
});
