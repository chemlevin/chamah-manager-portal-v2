import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const reply = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers });

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return reply(405, { error: "method_not_allowed" });
  const auth = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(auth)) return reply(401, { error: "authentication_required" });
  const base = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!base || !anon) return reply(503, { error: "service_unavailable" });

  try {
    const userResponse = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: auth },
    });
    if (!userResponse.ok) return reply(401, { error: "invalid_session" });

    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return reply(400, { error: "invalid_request" });
    }
    const action = input.action;
    let endpoint: string;
    let payload: Record<string, unknown>;
    if (action === "list_daycares") {
      endpoint = "portal_mcp_list_daycares";
      payload = {};
    } else if (action === "staff_by_daycare") {
      if (typeof input.daycare_id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.daycare_id)) {
        return reply(400, { error: "invalid_daycare_id" });
      }
      endpoint = "portal_mcp_staff_by_daycare";
      payload = { requested_daycare_id: input.daycare_id };
    } else {
      return reply(400, { error: "unknown_action" });
    }
    // Forward the caller's JWT, never a service-role key: RPCs enforce auth.uid() and permissions.
    const result = await fetch(`${base}/rest/v1/rpc/${endpoint}`, {
      method: "POST",
      headers: { apikey: anon, Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!result.ok) return reply(result.status === 401 ? 401 : 403, { error: "request_denied" });
    return reply(200, { data: await result.json() });
  } catch {
    return reply(400, { error: "invalid_request" });
  }
});
