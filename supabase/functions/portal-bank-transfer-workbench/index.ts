import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SCREEN_CODE = "dashboards.accounting.bank-transfers";
const BUCKET = "bank-transfer-attachments";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
});
const text = (value: unknown) => String(value ?? "").trim();
const nullable = (value: unknown) => text(value) || null;
const uuid = (value: unknown) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(value))
  ? text(value)
  : "";
const status = (value: unknown) => ["PENDING", "COMPLETED", "PROBLEM"].includes(text(value))
  ? text(value)
  : "PENDING";
const storagePath = (value: string) => value.split("/").map(encodeURIComponent).join("/");

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
      method,
      headers: { ...serviceHeaders, Prefer: prefer },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const value = await response.json().catch(() => []);
    if (!response.ok) throw new Error(value.message || "Database operation failed");
    return value;
  };
  const audit = (entityId: string, operation: string, previous: unknown, next: unknown, actorId: string) =>
    write("audit_events", "POST", {
      entity_type: "bank_transfers",
      entity_id: entityId,
      operation,
      previous_values: previous,
      new_values: next,
      source_type: "PORTAL_ADMIN",
      actor_user_id: actorId,
    }, "return=minimal");

  try {
    const auth = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: authorization } });
    if (!auth.ok) return json({ error: "נדרש חיבור תקף." }, 401);
    const actor = await auth.json();
    const required = request.method === "GET" ? "VIEW" : "EDIT";
    const permission = await fetch(`${url}/rest/v1/rpc/portal_has_permission`, {
      method: "POST",
      headers: serviceHeaders,
      body: JSON.stringify({ target_user_id: actor.id, target_screen_code: SCREEN_CODE, required_level: required }),
    });
    if (!permission.ok || await permission.json() !== true) {
      return json({ error: "אין הרשאה מתאימה להעברות בנקאיות." }, 403);
    }

    if (request.method === "GET") {
      const [transfers, categories, units, daycares] = await Promise.all([
        read("bank_transfers?select=*&lifecycle_status=eq.ACTIVE&order=row_number.asc&limit=5000"),
        read("budget_categories?select=budget_category_id,budget_category_code,display_name,category_type,lifecycle_status,display_order&lifecycle_status=eq.ACTIVE&order=display_order,display_name"),
        read("allocation_units?select=allocation_unit_id,allocation_unit_code,display_name,allocation_unit_type,lifecycle_status,display_order&lifecycle_status=eq.ACTIVE&order=display_order,display_name"),
        read("daycares?select=daycare_id,daycare_code,display_name,allocation_unit_id,lifecycle_status,display_order&lifecycle_status=eq.ACTIVE&order=display_order,display_name"),
      ]);
      return json({ transfers, categories, units, daycares });
    }

    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const body = await request.json();

    if (body.action === "save") {
      const id = uuid(body.bank_transfer_id);
      const parentId = uuid(body.parent_transfer_id) || null;
      const executionDate = nullable(body.execution_date);
      const nextStatus = status(body.status);
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 0) return json({ error: "הסכום חייב להיות מספר שאינו שלילי." }, 422);
      if (nextStatus === "COMPLETED" && !/^\d{4}-\d{2}-\d{2}$/.test(executionDate || "")) {
        return json({ error: "השלמת העברה מחייבת תאריך ביצוע שהוזן ידנית." }, 422);
      }
      const categoryId = uuid(body.budget_category_id) || null;
      const unitId = uuid(body.allocation_unit_id) || null;
      const daycareId = uuid(body.daycare_id) || null;
      const [categories, units, daycares] = await Promise.all([
        categoryId ? read(`budget_categories?select=budget_category_id&budget_category_id=eq.${categoryId}&lifecycle_status=eq.ACTIVE`) : [],
        unitId ? read(`allocation_units?select=allocation_unit_id&allocation_unit_id=eq.${unitId}&lifecycle_status=eq.ACTIVE`) : [],
        daycareId ? read(`daycares?select=daycare_id,allocation_unit_id&daycare_id=eq.${daycareId}&lifecycle_status=eq.ACTIVE`) : [],
      ]);
      if (categoryId && categories.length !== 1) return json({ error: "סעיף התקציב אינו פעיל ב-Supabase." }, 422);
      if (unitId && units.length !== 1) return json({ error: "המחלקה אינה פעילה ב-Supabase." }, 422);
      if (daycareId && (daycares.length !== 1 || daycares[0].allocation_unit_id !== unitId)) {
        return json({ error: "המעון חייב להשתייך למחלקה שנבחרה." }, 422);
      }
      const payload = {
        parent_transfer_id: parentId,
        name: text(body.name),
        amount,
        bank: nullable(body.bank),
        branch: nullable(body.branch),
        account_number: nullable(body.account_number),
        account_holder: nullable(body.account_holder),
        budget_category_id: categoryId,
        notes: nullable(body.notes),
        allocation_unit_id: unitId,
        daycare_id: daycareId,
        status: nextStatus,
        execution_date: executionDate,
        updated_by_user_id: actor.id,
      };
      const previous = id ? (await read(`bank_transfers?bank_transfer_id=eq.${id}&lifecycle_status=eq.ACTIVE&limit=1`))[0] : null;
      if (id && !previous) return json({ error: "ההעברה לא נמצאה." }, 404);
      const saved = id
        ? (await write(`bank_transfers?bank_transfer_id=eq.${id}`, "PATCH", payload))[0]
        : (await write("bank_transfers", "POST", { ...payload, created_by_user_id: actor.id }))[0];
      await audit(saved.bank_transfer_id, id ? "UPDATE" : "INSERT", previous, saved, actor.id);
      return json({ transfer: saved }, id ? 200 : 201);
    }

    if (body.action === "mark_completed") {
      const id = uuid(body.bank_transfer_id);
      const previous = (await read(`bank_transfers?bank_transfer_id=eq.${id}&lifecycle_status=eq.ACTIVE&limit=1`))[0];
      if (!previous) return json({ error: "ההעברה לא נמצאה." }, 404);
      if (!previous.execution_date) {
        return json({ error: "יש להזין תאריך ביצוע ידנית לפני סימון בוצע." }, 422);
      }
      const saved = (await write(`bank_transfers?bank_transfer_id=eq.${id}`, "PATCH", {
        status: "COMPLETED",
        updated_by_user_id: actor.id,
      }))[0];
      await audit(id, "STATUS_CHANGE", previous, saved, actor.id);
      return json({ transfer: saved });
    }

    if (body.action === "delete") {
      const id = uuid(body.bank_transfer_id);
      const previous = (await read(`bank_transfers?bank_transfer_id=eq.${id}&lifecycle_status=eq.ACTIVE&limit=1`))[0];
      if (!previous) return json({ error: "ההעברה לא נמצאה." }, 404);
      const children = await read(`bank_transfers?parent_transfer_id=eq.${id}&lifecycle_status=eq.ACTIVE`);
      const ids = [id, ...children.map((row: Record<string, unknown>) => row.bank_transfer_id)];
      await write(`bank_transfers?bank_transfer_id=in.(${ids.join(",")})`, "PATCH", {
        lifecycle_status: "ARCHIVED",
        updated_by_user_id: actor.id,
      });
      await audit(id, "ARCHIVE", { parent: previous, children }, { lifecycle_status: "ARCHIVED" }, actor.id);
      return json({ archived: ids });
    }

    if (body.action === "import") {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      if (!rows.length || rows.length > 2000) return json({ error: "לא נמצאו שורות תקינות לייבוא." }, 422);
      const active = await Promise.all([
        read("budget_categories?select=budget_category_id&lifecycle_status=eq.ACTIVE"),
        read("allocation_units?select=allocation_unit_id&lifecycle_status=eq.ACTIVE"),
        read("daycares?select=daycare_id,allocation_unit_id&lifecycle_status=eq.ACTIVE"),
      ]);
      const categoryIds = new Set(active[0].map((row: Record<string, string>) => row.budget_category_id));
      const unitIds = new Set(active[1].map((row: Record<string, string>) => row.allocation_unit_id));
      const daycareUnits = new Map(active[2].map((row: Record<string, string>) => [row.daycare_id, row.allocation_unit_id]));
      const prepared = rows.map((row: Record<string, unknown>, index: number) => {
        const amount = Number(row.amount);
        const nextStatus = status(row.status);
        const executionDate = nullable(row.execution_date);
        const categoryId = uuid(row.budget_category_id) || null;
        const unitId = uuid(row.allocation_unit_id) || null;
        const daycareId = uuid(row.daycare_id) || null;
        const errors = [];
        if (!Number.isFinite(amount) || amount < 0) errors.push("סכום");
        if (nextStatus === "COMPLETED" && !/^\d{4}-\d{2}-\d{2}$/.test(executionDate || "")) errors.push("תאריך ביצוע");
        if (categoryId && !categoryIds.has(categoryId)) errors.push("סעיף תקציבי");
        if (unitId && !unitIds.has(unitId)) errors.push("מחלקה");
        if (daycareId && daycareUnits.get(daycareId) !== unitId) errors.push("מעון");
        if (errors.length) throw new Error(`שורה ${index + 2}: ${errors.join(", ")} לא תקין.`);
        return {
          name: text(row.name),
          amount,
          bank: nullable(row.bank),
          branch: nullable(row.branch),
          account_number: nullable(row.account_number),
          account_holder: nullable(row.account_holder),
          budget_category_id: categoryId,
          notes: nullable(row.notes),
          allocation_unit_id: unitId,
          daycare_id: daycareId,
          status: nextStatus,
          execution_date: executionDate,
          created_by_user_id: actor.id,
          updated_by_user_id: actor.id,
        };
      });
      const saved = await write("bank_transfers", "POST", prepared);
      await Promise.all(saved.map((row: Record<string, unknown>) =>
        audit(String(row.bank_transfer_id), "IMPORT", null, row, actor.id)
      ));
      return json({ imported: saved.length, transfers: saved }, 201);
    }

    if (body.action === "upload_attachment") {
      const id = uuid(body.bank_transfer_id);
      const transfer = (await read(`bank_transfers?bank_transfer_id=eq.${id}&lifecycle_status=eq.ACTIVE&limit=1`))[0];
      if (!transfer) return json({ error: "ההעברה לא נמצאה." }, 404);
      const fileName = text(body.file_name).replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 160) || "attachment";
      const contentType = text(body.content_type) || "application/octet-stream";
      const encoded = text(body.base64);
      const binary = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
      if (!binary.length || binary.length > MAX_ATTACHMENT_BYTES) {
        return json({ error: "הקובץ חייב להיות בגודל של עד 10MB." }, 422);
      }
      const path = `${id}/${Date.now()}-${fileName}`;
      const upload = await fetch(`${url}/storage/v1/object/${BUCKET}/${storagePath(path)}`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": contentType, "x-upsert": "false" },
        body: binary,
      });
      if (!upload.ok) return json({ error: "העלאת הקובץ נכשלה." }, 502);
      const saved = (await write(`bank_transfers?bank_transfer_id=eq.${id}`, "PATCH", {
        attachment_path: path,
        attachment_name: fileName,
        attachment_content_type: contentType,
        attachment_size_bytes: binary.length,
        updated_by_user_id: actor.id,
      }))[0];
      await audit(id, "ATTACHMENT_UPLOAD", transfer, saved, actor.id);
      return json({ transfer: saved });
    }

    if (body.action === "attachment_url") {
      const id = uuid(body.bank_transfer_id);
      const transfer = (await read(`bank_transfers?bank_transfer_id=eq.${id}&lifecycle_status=eq.ACTIVE&limit=1`))[0];
      if (!transfer?.attachment_path) return json({ error: "לא נמצא קובץ מצורף." }, 404);
      const signed = await fetch(`${url}/storage/v1/object/sign/${BUCKET}/${storagePath(transfer.attachment_path)}`, {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({ expiresIn: 300 }),
      });
      const value = await signed.json().catch(() => ({}));
      if (!signed.ok || !value.signedURL) return json({ error: "לא ניתן לפתוח את הקובץ." }, 502);
      return json({ url: `${url}/storage/v1${value.signedURL}` });
    }

    return json({ error: "פעולה לא נתמכת." }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "שגיאת שרת." }, 500);
  }
});
