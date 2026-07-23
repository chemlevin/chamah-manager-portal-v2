import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

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
    const permissionResponse = await fetch(`${url}/rest/v1/rpc/portal_can_manage_users`, { method: "POST", headers: serviceHeaders, body: JSON.stringify({ actor_id: actor.id }) });
    if (!permissionResponse.ok || await permissionResponse.json() !== true) return json({ error: "אין הרשאת עריכה לניהול משתמשים." }, 403);

    if (request.method === "POST") {
      const body = await request.json();
      const email = String(body.email || "").trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "כתובת הדוא״ל אינה תקינה." }, 400);
      const origin = request.headers.get("origin") || "";
      const redirectTo = /^https:\/\/[-a-z0-9.]+\.vercel\.app$/i.test(origin) || /^https?:\/\/localhost(?::\d+)?$/i.test(origin) ? `${origin}/` : undefined;
      const invite = await fetch(`${url}/auth/v1/invite${redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ""}`, { method: "POST", headers: serviceHeaders, body: JSON.stringify({ email, data: { full_name: String(body.display_name || "").trim() } }) });
      const invited = await invite.json();
      if (!invite.ok) return json({ error: invited.msg || invited.message || "שליחת ההזמנה נכשלה." }, invite.status);
      await fetch(`${url}/rest/v1/portal_user_profiles?on_conflict=user_id`, { method: "POST", headers: { ...serviceHeaders, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: invited.id, display_name: String(body.display_name || "").trim() || null, is_active: true, is_super_admin: false, scope_mode: "SELECTED" }) });
      await fetch(`${url}/rest/v1/audit_events`, { method: "POST", headers: serviceHeaders, body: JSON.stringify({ entity_type: "PORTAL_USER", entity_id: invited.id, operation: "INSERT", new_values: { invited: true }, source_type: "PORTAL_ADMIN", actor_user_id: actor.id }) });
    } else if (request.method === "PATCH") {
      const body = await request.json();
      const saved = await fetch(`${url}/rest/v1/rpc/portal_admin_save_user`, { method: "POST", headers: serviceHeaders, body: JSON.stringify({ actor_id: actor.id, target_user_id: body.user_id, profile_values: body.profile, permission_values: body.permissions || [], allocation_unit_ids: body.allocation_unit_ids || [], daycare_ids: body.daycare_ids || [] }) });
      if (!saved.ok) { const detail = await saved.json(); return json({ error: String(detail.message || "שמירת המשתמש נכשלה.").replace("FINAL_SUPER_ADMIN_PROTECTED", "לא ניתן לנטרל או להסיר את מנהל־העל האחרון.") }, saved.status); }
    } else if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

    const [authUsers, profiles, permissions, unitScopes, daycareScopes, sections, units, daycares, audit] = await Promise.all([
      fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/portal_user_profiles?select=*`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/portal_user_permissions?select=*`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/portal_user_allocation_units?select=*`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/portal_user_daycares?select=*`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/portal_sections?select=*&is_active=eq.true&order=display_order`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/allocation_units?select=allocation_unit_id,display_name,allocation_unit_type,lifecycle_status&lifecycle_status=eq.ACTIVE&order=display_order`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/daycares?select=daycare_id,allocation_unit_id,display_name,lifecycle_status&lifecycle_status=eq.ACTIVE&order=display_order`, { headers: serviceHeaders }).then(r => r.json()),
      fetch(`${url}/rest/v1/audit_events?select=*&entity_type=eq.PORTAL_USER&order=occurred_at.desc&limit=500`, { headers: serviceHeaders }).then(r => r.json())
    ]);
    return json({ users: authUsers.users || authUsers, profiles, permissions, unit_scopes: unitScopes, daycare_scopes: daycareScopes, sections, allocation_units: units, daycares, audit_events: audit });
  } catch (error) {
    console.error("portal-users", error);
    return json({ error: "שגיאת שרת בניהול המשתמשים." }, 500);
  }
});
