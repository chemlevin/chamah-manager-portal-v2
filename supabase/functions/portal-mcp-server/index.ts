import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Isolated stateless, read-only MCP Streamable HTTP endpoint.
// No service-role credentials or unrestricted SQL are exposed to clients.
const VERSION = "2025-03-26";
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Access-Control-Allow-Origin": "https://chatgpt.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version, mcp-session-id, accept",
  "Access-Control-Expose-Headers": "mcp-session-id",
};
const response = (status: number, body: unknown, extra: Record<string,string> = {}) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } });
const error = (id: unknown, code: number, message: string) =>
  ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const success = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TOOLS = [
  {
    name: "list_my_daycares",
    description: "List daycare centers visible to the signed-in portal user. Requires the employees screen viewing permission.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: "list_staff_by_daycare",
    description: "List limited staff directory fields for a daycare the signed-in portal user may access.",
    inputSchema: {
      type: "object",
      properties: { daycare_id: { type: "string", format: "uuid", description: "Daycare UUID returned by list_my_daycares" } },
      required: ["daycare_id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return response(204, null);
  if (req.method !== "POST") return response(405, { error: "method_not_allowed" });
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(auth)) return response(401, { error: "authentication_required" });
  const base = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!base || !key) return response(503, { error: "service_unavailable" });
  try {
    // The Edge Function also requires JWT verification at the gateway.
    const user = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: key, Authorization: auth },
    });
    if (!user.ok) return response(401, { error: "invalid_session" });
    const input = await req.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) return response(400, error(null, -32600, "Invalid Request"));
    const { jsonrpc, method, id, params } = input;
    if (jsonrpc !== "2.0" || typeof method !== "string") return response(400, error(id, -32600, "Invalid Request"));
    // Notifications must not generate a JSON-RPC response.
    if (id === undefined) return response(202, null);
    if (method === "initialize") {
      return response(200, success(id, {
        protocolVersion: VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "chamah-portal-readonly", version: "0.1.0" },
      }));
    }
    if (method === "ping") return response(200, success(id, {}));
    if (method === "tools/list") return response(200, success(id, { tools: TOOLS }));
    if (method !== "tools/call") return response(200, error(id, -32601, "Method not found"));
    const name = params?.name;
    const args = params?.arguments ?? {};
    if (!args || typeof args !== "object" || Array.isArray(args)) return response(200, error(id, -32602, "Invalid params"));
    let rpc: string;
    let payload: Record<string,unknown>;
    if (name === "list_my_daycares" && Object.keys(args).length === 0) {
      rpc = "portal_mcp_list_daycares"; payload = {};
    } else if (name === "list_staff_by_daycare" && Object.keys(args).length === 1 && typeof args.daycare_id === "string" && uuid.test(args.daycare_id)) {
      rpc = "portal_mcp_staff_by_daycare"; payload = { requested_daycare_id: args.daycare_id };
    } else {
      return response(200, error(id, -32602, "Invalid tool or arguments"));
    }
    const result = await fetch(`${base}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      headers: { apikey: key, Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!result.ok) return response(200, success(id, { isError: true, content: [{ type: "text", text: "Access denied or data unavailable" }] }));
    const rows = await result.json();
    return response(200, success(id, { content: [{ type: "text", text: JSON.stringify(rows) }], structuredContent: { rows } }));
  } catch {
    return response(400, error(null, -32700, "Invalid JSON or request"));
  }
});
