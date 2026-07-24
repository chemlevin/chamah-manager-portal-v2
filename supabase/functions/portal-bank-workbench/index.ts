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
const normalizeAccount = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const normalizeText = (value: unknown) => String(value ?? "").trim();
const fingerprint = async (accountId: string, row: Record<string, unknown>) => {
  const input = [accountId, row.transaction_date, normalizeText(row.reference_number), Number(row.amount).toFixed(2)].join("|");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
};

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

  try {
    const auth = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: authorization } });
    if (!auth.ok) return json({ error: "נדרש חיבור תקף." }, 401);
    const actor = await auth.json();
    const required = request.method === "GET" ? "VIEW" : "EDIT";
    const permission = await fetch(`${url}/rest/v1/rpc/portal_has_permission`, {
      method: "POST",
      headers: serviceHeaders,
      body: JSON.stringify({ target_user_id: actor.id, target_screen_code: "dashboards.accounting.banks", required_level: required }),
    });
    if (!permission.ok || await permission.json() !== true) return json({ error: "אין הרשאה מתאימה לקובץ הבנקים." }, 403);

    if (request.method === "GET") {
      const [transactions, allocations, accounts, units, daycares, categories, batches] = await Promise.all([
        read("bank_transactions?select=*&order=transaction_date.desc,created_at.desc&limit=2000"),
        read("bank_allocations?select=*&limit=5000"),
        read("bank_accounts?select=*&lifecycle_status=eq.ACTIVE&order=display_order,display_name"),
        read("allocation_units?select=*&lifecycle_status=eq.ACTIVE&order=display_order,display_name"),
        read("daycares?select=*&lifecycle_status=eq.ACTIVE&order=display_order,display_name"),
        read("budget_categories?select=*&lifecycle_status=eq.ACTIVE&order=display_order,display_name"),
        read("import_batches?select=*&source_type=eq.BANK_FILE&order=started_at.desc&limit=50"),
      ]);
      return json({ transactions, allocations, accounts, units, daycares, categories, batches });
    }

    const body = await request.json();
    if (body.action === "preview") {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      const accountNumber = normalizeAccount(body.account_number);
      const accounts = await read(`bank_accounts?select=bank_account_id,display_name,source_account_number&source_account_number=eq.${encodeURIComponent(accountNumber)}&lifecycle_status=eq.ACTIVE`);
      if (!accountNumber || accounts.length !== 1) return json({ error: "לא נמצא חשבון בנק פעיל התואם למספר החשבון בקובץ." }, 422);
      const account = accounts[0];
      const prepared = [];
      for (let index = 0; index < rows.length; index += 1) {
        const source = rows[index] || {};
        const amount = Number(source.amount);
        const row = {
          source_row_number: Number(source.source_row_number || index + 2),
          transaction_date: normalizeText(source.transaction_date),
          description: normalizeText(source.description),
          reference_number: normalizeText(source.reference_number) || null,
          amount,
        };
        const errors = [];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(row.transaction_date)) errors.push("תאריך לא תקין");
        if (!row.description) errors.push("חסר תיאור");
        if (!Number.isFinite(amount)) errors.push("סכום חתום לא תקין");
        const sourceFingerprint = errors.length ? "" : await fingerprint(account.bank_account_id, row);
        let duplicate = false;
        if (sourceFingerprint) {
          const existing = await read(`bank_transactions?select=bank_transaction_id&bank_account_id=eq.${account.bank_account_id}&source_fingerprint=eq.${sourceFingerprint}&limit=1`);
          duplicate = existing.length > 0;
        }
        prepared.push({ ...row, source_fingerprint: sourceFingerprint, duplicate, errors, importable: !duplicate && !errors.length });
      }
      return json({
        preview_token: crypto.randomUUID(),
        account,
        account_number: accountNumber,
        rows: prepared,
        summary: {
          total: prepared.length,
          importable: prepared.filter((row) => row.importable).length,
          duplicates: prepared.filter((row) => row.duplicate).length,
          invalid: prepared.filter((row) => row.errors.length).length,
        },
      });
    }

    if (body.action === "confirm_import") {
      const rows = (Array.isArray(body.rows) ? body.rows : []).filter((row) => row.importable);
      if (!body.preview_token || !body.account_id || !rows.length) return json({ error: "אין שורות מאושרות לייבוא." }, 400);
      const batchRows = await write("import_batches", "POST", {
        source_type: "BANK_FILE",
        source_name: "PORTAL",
        source_file_name: normalizeText(body.file_name),
        triggered_by_user_id: actor.id,
        status: "RUNNING",
        total_rows: Number(body.total_rows || rows.length),
        warning_rows: Number(body.duplicate_rows || 0),
        rejected_rows: Number(body.invalid_rows || 0),
        metadata: { preview_token: body.preview_token, source_account_number: normalizeAccount(body.account_number) },
      });
      const batch = batchRows[0];
      const inserted = [];
      for (const row of rows) {
        const transaction = await write("bank_transactions", "POST", {
          bank_account_id: body.account_id,
          transaction_date: row.transaction_date,
          description: normalizeText(row.description),
          reference_number: normalizeText(row.reference_number) || null,
          amount: Number(row.amount),
          debit_amount: Number(row.amount) < 0 ? Math.abs(Number(row.amount)) : 0,
          credit_amount: Number(row.amount) > 0 ? Number(row.amount) : 0,
          source_fingerprint: row.source_fingerprint,
          source_payload: { source_row_number: row.source_row_number, signed_amount: Number(row.amount) },
          import_batch_id: batch.import_batch_id,
          created_by_user_id: actor.id,
        });
        inserted.push(transaction[0]);
      }
      await write(`import_batches?import_batch_id=eq.${batch.import_batch_id}`, "PATCH", {
        status: "COMPLETED",
        accepted_rows: inserted.length,
        completed_at: new Date().toISOString(),
      });
      return json({ batch_id: batch.import_batch_id, imported: inserted.length, transactions: inserted });
    }

    if (body.action === "save_allocations") {
      const transactionId = normalizeText(body.bank_transaction_id);
      const transaction = (await read(`bank_transactions?select=bank_transaction_id,amount&bank_transaction_id=eq.${transactionId}&limit=1`))[0];
      if (!transaction) return json({ error: "תנועת הבנק לא נמצאה." }, 404);
      const allocations = Array.isArray(body.allocations) ? body.allocations : [];
      const normalized = allocations.map((row) => ({
        bank_transaction_id: transactionId,
        movement_type: row.movement_type || null,
        allocation_unit_id: row.allocation_unit_id || null,
        daycare_id: row.daycare_id || null,
        budget_category_id: row.budget_category_id || null,
        budget_month: row.budget_month ? `${row.budget_month.slice(0, 7)}-01` : null,
        accounting_status: row.accounting_status || null,
        notes: normalizeText(row.notes) || null,
        allocation_amount: Number(row.allocation_amount),
        created_by_user_id: actor.id,
        updated_by_user_id: actor.id,
      }));
      const errors = [];
      normalized.forEach((row, index) => {
        if (!Number.isFinite(row.allocation_amount) || row.allocation_amount === 0) errors.push(`שורה ${index + 1}: סכום הקצאה נדרש`);
        if (!row.movement_type) errors.push(`שורה ${index + 1}: סוג תנועה נדרש`);
        if (!row.allocation_unit_id) errors.push(`שורה ${index + 1}: מחלקה נדרשת`);
        if (!row.budget_month) errors.push(`שורה ${index + 1}: חודש תקציב נדרש`);
        if (!row.accounting_status) errors.push(`שורה ${index + 1}: סטטוס הנה"ח נדרש`);
        if (!["EXCLUDE"].includes(row.movement_type || "") && !row.budget_category_id) errors.push(`שורה ${index + 1}: סעיף תקציבי נדרש`);
      });
      const total = normalized.reduce((sum, row) => sum + Number(row.allocation_amount || 0), 0);
      if (Math.abs(total - Number(transaction.amount)) > 0.01) errors.push("סכום ההקצאות חייב להיות שווה לסכום תנועת האב");
      if (errors.length) return json({ error: "הנתונים אינם תקינים.", errors }, 422);
      const saved = await write("rpc/portal_save_bank_allocations", "POST", {
        target_bank_transaction_id: transactionId,
        allocation_rows: normalized,
        actor_id: actor.id,
      });
      return json({ allocations: saved, total, remaining: Number(transaction.amount) - total });
    }
    return json({ error: "פעולה לא מוכרת." }, 400);
  } catch (error) {
    console.error("portal-bank-workbench", error);
    return json({ error: error instanceof Error ? error.message : "שגיאת שרת בקובץ הבנקים." }, 500);
  }
});
