import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { errorResponse } from "../_shared/error-contract.ts";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const reply = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers });
const failure = (code: string, status: number, message: string, overrides: Record<string, unknown> = {}) => reply(status, errorResponse(code, status, message, overrides));

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return failure("INVALID_FORMAT", 405, "Method not allowed");
  const auth = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(auth)) return failure("PERMISSION_DENIED", 401, "Authentication required", { next_action: "Authenticate before retrying." });
  const base = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!base || !anon) return failure("WRONG_ENVIRONMENT", 503, "Preview runtime configuration is unavailable", { next_action: "Confirm the Preview runtime configuration." });

  try {
    const userResponse = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: auth },
    });
    if (!userResponse.ok) return failure("PERMISSION_DENIED", 401, "Session is invalid", { next_action: "Authenticate again before retrying." });

    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return failure("INVALID_FORMAT", 400, "Request format is invalid");
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
        return failure("MISSING_IDENTIFIER", 400, "A valid daycare identifier is required");
      }
      endpoint = "portal_mcp_staff_by_daycare";
      payload = { requested_daycare_id: input.daycare_id };
    } else {
      return failure("INVALID_FORMAT", 400, "The requested action is not supported");
    }
    // Forward the caller's JWT, never a service-role key: RPCs enforce auth.uid() and permissions.
    const result = await fetch(`${base}/rest/v1/rpc/${endpoint}`, {
      method: "POST",
      headers: { apikey: anon, Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!result.ok) return failure(result.status === 401 ? "PERMISSION_DENIED" : "RETRY_REQUIRED", result.status === 401 ? 401 : 503, "The read request was not completed", { current_stage: "RPC", retry_safe: result.status !== 401, next_action: result.status === 401 ? "Confirm authorization before retrying." : "Retry after checking request status." });
    return reply(200, { data: await result.json() });
  } catch {
    return failure("PARSE_FAILED", 400, "The request could not be parsed");
  }
});
