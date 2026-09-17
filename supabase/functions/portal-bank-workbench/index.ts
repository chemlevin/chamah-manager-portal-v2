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
  const readAll = async (path: string) => {
    const rows: Record<string, unknown>[] = [];
    const separator = path.includes("?") ? "&" : "?";
    for (let offset = 0; ; offset += 1000) {
      const page = await read(`${path}${separator}offset=${offset}&limit=1000`);
      rows.push(...page);
      if (page.length < 1000) return rows;
    }
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
      const requestUrl = new URL(request.url);
      const values = (name: string) => requestUrl.searchParams.getAll(name).flatMap((value) => value.split(",")).filter(Boolean);
      const page = Math.max(1, Number(requestUrl.searchParams.get("page")) || 1);
      const pageSize = Math.min(200, Math.max(10, Number(requestUrl.searchParams.get("page_size")) || 50));
      const activeYear = Number(requestUrl.searchParams.get("year")) || new Date().getFullYear();
      const query = normalizeText(requestUrl.searchParams.get("query")).toLocaleLowerCase("he");
      const queue = normalizeText(requestUrl.searchParams.get("queue")) || "all";
      const splitFilter = normalizeText(requestUrl.searchParams.get("split")) || "any";
      const sort = normalizeText(requestUrl.searchParams.get("sort")) || "date_desc";
      const transactionMonths = values("transaction_month");
      const assignmentMonthsFilter = values("assignment_month");
      const accountIds = values("account");
      const unitIds = values("department");
      const daycareIds = values("daycare");
      const categoryIds = values("category");
      const statusIds = values("status");
      const descriptionPresence = normalizeText(requestUrl.searchParams.get("description_presence"));
      const referencePresence = normalizeText(requestUrl.searchParams.get("reference_presence"));
      const [transactions, allocations, accounts, units, daycares, categories, accountingStatuses, assignmentMonths, calendarYears, batches, historyTransactions] = await Promise.all([
        readAll(`bank_transactions?select=*&transaction_date=gte.${activeYear}-01-01&transaction_date=lte.${activeYear}-12-31`),
        readAll(`bank_allocations?select=*,bank_transactions!inner(transaction_date)&bank_transactions.transaction_date=gte.${activeYear}-01-01&bank_transactions.transaction_date=lte.${activeYear}-12-31`),
        read("bank_accounts?select=*&order=display_order,display_name"),
        read("allocation_units?select=*&order=display_order,display_name"),
        read("daycares?select=*&order=display_order,display_name"),
        read("budget_categories?select=*&order=display_order,display_name"),
        read("accounting_statuses?select=*&order=display_order,display_name"),
        read("school_year_months?select=*&order=start_date"),
        read("calendar_years?select=*&is_selectable=eq.true&order=start_date.desc"),
        read("import_batches?select=*&source_type=eq.BANK_FILE&order=started_at.desc&limit=50"),
        readAll("bank_transactions?select=import_batch_id,bank_account_id,transaction_date"),
      ]);
      const allocationsByTransaction = new Map<string, Record<string, unknown>[]>();
      allocations.forEach((row: Record<string, unknown>) => {
        const id = String(row.bank_transaction_id);
        if (!allocationsByTransaction.has(id)) allocationsByTransaction.set(id, []);
        allocationsByTransaction.get(id)!.push(row);
      });
      const byId = (rows: Record<string, unknown>[], key: string, label = "display_name") => new Map(rows.map((row) => [String(row[key]), normalizeText(row[label])]));
      const accountNames = byId(accounts, "bank_account_id");
      const unitNames = byId(units, "allocation_unit_id");
      const daycareNames = byId(daycares, "daycare_id");
      const categoryNames = byId(categories, "budget_category_id");
      const statusNames = byId(accountingStatuses, "accounting_status_id");
      const statusById = new Map(accountingStatuses.map((row: Record<string, unknown>) => [String(row.accounting_status_id), row]));
      const classify = (transaction: Record<string, unknown>) => {
        const rows = allocationsByTransaction.get(String(transaction.bank_transaction_id)) || [];
        const total = rows.reduce((sum, row) => sum + (Number(row.allocation_amount) || 0), 0);
        const remaining = Number(transaction.amount) - total;
        const missing = !rows.length || rows.some((row) => {
          const selectedUnit = units.find((unit: Record<string, unknown>) => unit.allocation_unit_id === row.allocation_unit_id);
          return !row.movement_type || !row.allocation_unit_id || (selectedUnit?.allocation_unit_type === "DAYCARE" && !row.daycare_id) || !row.budget_month || !row.accounting_status_id || (row.movement_type !== "EXCLUDE" && !row.budget_category_id) || !Number(row.allocation_amount);
        });
        const statuses = rows.map((row) => statusById.get(String(row.accounting_status_id))).filter(Boolean) as Record<string, unknown>[];
        const statusCode = (value: Record<string, unknown>) => value.accounting_status_code || value.sheet_accounting_status_id || "";
        const balanced = rows.length > 0 && Math.abs(remaining) <= .01;
        return { rows, total, remaining, missing, untreated: rows.length === 0, split: rows.length > 1, balanced,
          missingDocuments: statuses.some((value) => statusCode(value) === "ACC-MISSING-DOCS"),
          ready: balanced && !missing && statuses.every((value) => statusCode(value) === "ACC-WAITING"),
          sent: balanced && !missing && statuses.every((value) => value.is_final) };
      };
      const matchesBase = (transaction: Record<string, unknown>) => {
        const info = classify(transaction); const rows = info.rows;
        const haystack = [transaction.description, transaction.reference_number, transaction.amount, accountNames.get(String(transaction.bank_account_id)), transaction.transaction_date,
          ...rows.flatMap((row) => [row.budget_month, row.notes, unitNames.get(String(row.allocation_unit_id)), daycareNames.get(String(row.daycare_id)), categoryNames.get(String(row.budget_category_id)), statusNames.get(String(row.accounting_status_id))])].map(normalizeText).join(" ").toLocaleLowerCase("he");
        return (!query || haystack.includes(query))
          && (!transactionMonths.length || transactionMonths.includes(String(transaction.transaction_date).slice(0, 7)))
          && (!accountIds.length || accountIds.includes(String(transaction.bank_account_id)))
          && (!unitIds.length || rows.some((row) => unitIds.includes(String(row.allocation_unit_id))))
          && (!daycareIds.length || rows.some((row) => daycareIds.includes(String(row.daycare_id))))
          && (!categoryIds.length || rows.some((row) => categoryIds.includes(String(row.budget_category_id))))
          && (!statusIds.length || rows.some((row) => statusIds.includes(String(row.accounting_status_id))))
          && (!assignmentMonthsFilter.length || rows.some((row) => assignmentMonthsFilter.includes(String(row.budget_month).slice(0, 7))))
          && (!descriptionPresence || (descriptionPresence === "blank" ? !normalizeText(transaction.description) : !!normalizeText(transaction.description)))
          && (!referencePresence || (referencePresence === "blank" ? !normalizeText(transaction.reference_number) : !!normalizeText(transaction.reference_number)));
      };
      const base = transactions.filter(matchesBase);
      const queueMatch = (transaction: Record<string, unknown>) => { const info = classify(transaction); if (queue === "unassigned") return info.untreated; if (queue === "attention") return info.untreated || info.missing || info.missingDocuments || (info.split && !info.balanced); return true; };
      const splitMatch = (transaction: Record<string, unknown>) => { const info = classify(transaction); return splitFilter === "balanced" ? info.split && info.balanced : splitFilter === "unbalanced" ? info.split && !info.balanced : true; };
      const matching = base.filter(queueMatch).filter(splitMatch);
      const compareText = (a: unknown, b: unknown) => normalizeText(a).localeCompare(normalizeText(b), "he");
      const firstAllocationValue = (transaction: Record<string, unknown>, key: string, names: Map<string,string>) => names.get(String(classify(transaction).rows[0]?.[key])) || "";
      matching.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        if (sort === "date_asc") return compareText(a.transaction_date, b.transaction_date);
        if (sort === "amount_desc") return Number(b.amount) - Number(a.amount);
        if (sort === "amount_asc") return Number(a.amount) - Number(b.amount);
        if (sort === "account_asc") return compareText(accountNames.get(String(a.bank_account_id)), accountNames.get(String(b.bank_account_id)));
        if (sort === "description_asc") return compareText(a.description, b.description);
        if (sort === "reference_asc") return compareText(a.reference_number, b.reference_number);
        if (sort === "department_asc") return compareText(firstAllocationValue(a,"allocation_unit_id",unitNames), firstAllocationValue(b,"allocation_unit_id",unitNames));
        if (sort === "daycare_asc") return compareText(firstAllocationValue(a,"daycare_id",daycareNames), firstAllocationValue(b,"daycare_id",daycareNames));
        if (sort === "category_asc") return compareText(firstAllocationValue(a,"budget_category_id",categoryNames), firstAllocationValue(b,"budget_category_id",categoryNames));
        if (sort === "status_asc") return compareText(firstAllocationValue(a,"accounting_status_id",statusNames), firstAllocationValue(b,"accounting_status_id",statusNames));
        return compareText(b.transaction_date, a.transaction_date) || compareText(b.created_at, a.created_at);
      });
      const total = matching.length; const pageCount = Math.max(1, Math.ceil(total / pageSize)); const safePage = Math.min(page, pageCount);
      const pageTransactions = matching.slice((safePage - 1) * pageSize, safePage * pageSize);
      const pageIds = new Set(pageTransactions.map((row: Record<string, unknown>) => row.bank_transaction_id));
      const queueCounts = { all: base.length, unassigned: base.filter((row: Record<string, unknown>) => classify(row).untreated).length, attention: base.filter((row: Record<string, unknown>) => { const info=classify(row); return info.untreated || info.missing || info.missingDocuments || (info.split && !info.balanced); }).length };
      const accountBySourceNumber = new Map(accounts.map((row: Record<string, unknown>) => [normalizeAccount(row.source_account_number), row]));
      const transactionHistoryByBatch = new Map<string, { accountId: string; minDate: string; maxDate: string }>();
      const latestCoveredByAccount = new Map<string, string>();
      historyTransactions.forEach((row: Record<string, unknown>) => {
        const batchId = String(row.import_batch_id || "");
        const accountId = String(row.bank_account_id || "");
        const transactionDate = normalizeText(row.transaction_date);
        const existing = transactionHistoryByBatch.get(batchId);
        if (!existing) transactionHistoryByBatch.set(batchId, { accountId, minDate: transactionDate, maxDate: transactionDate });
        else {
          if (transactionDate < existing.minDate) existing.minDate = transactionDate;
          if (transactionDate > existing.maxDate) existing.maxDate = transactionDate;
        }
        if (transactionDate > (latestCoveredByAccount.get(accountId) || "")) latestCoveredByAccount.set(accountId, transactionDate);
      });
      const historyBatches = batches.map((batch: Record<string, unknown>) => {
        const metadata = (batch.metadata || {}) as Record<string, unknown>;
        const retained = transactionHistoryByBatch.get(String(batch.import_batch_id));
        const account = accountBySourceNumber.get(normalizeAccount(metadata.source_account_number))
          || accounts.find((row: Record<string, unknown>) => row.bank_account_id === retained?.accountId);
        return {
          import_batch_id: batch.import_batch_id,
          bank_account_id: account?.bank_account_id || retained?.accountId || null,
          account_name: account?.display_name || null,
          source_file_name: batch.source_file_name,
          transaction_date_min: normalizeText(metadata.source_transaction_min_date) || retained?.minDate || null,
          transaction_date_max: normalizeText(metadata.source_transaction_max_date) || retained?.maxDate || null,
          date_range_source: metadata.source_transaction_min_date && metadata.source_transaction_max_date ? "PERSISTED" : retained ? "DERIVED" : "UNAVAILABLE",
          started_at: batch.started_at,
          completed_at: batch.completed_at,
          total_rows: batch.total_rows,
          accepted_rows: batch.accepted_rows,
          duplicate_rows: batch.warning_rows,
          rejected_rows: batch.rejected_rows,
          status: batch.status,
          error_summary: batch.error_summary,
        };
      });
      const historyAccounts = accounts.map((account: Record<string, unknown>) => ({
        bank_account_id: account.bank_account_id,
        display_name: account.display_name,
        account_identifier_masked: account.account_identifier_masked,
        latest_covered_transaction_date: latestCoveredByAccount.get(String(account.bank_account_id)) || null,
      }));
      return json({ transactions: pageTransactions, allocations: allocations.filter((row: Record<string, unknown>) => pageIds.has(row.bank_transaction_id)), accounts, units, daycares, categories, accountingStatuses, assignmentMonths, calendarYears, batches,
        uploadHistory: { accounts: historyAccounts, batches: historyBatches },
        pagination: { page: safePage, pageSize, total, pageCount, hasPrevious: safePage > 1, hasNext: safePage < pageCount }, queueCounts, activeYear, complete: true });
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
      return json(await write("rpc/portal_confirm_bank_import", "POST", {
        target_bank_account_id: body.account_id,
        import_rows: rows.map((row) => ({
          source_row_number: Number(row.source_row_number),
          transaction_date: normalizeText(row.transaction_date),
          description: normalizeText(row.description),
          reference_number: normalizeText(row.reference_number) || null,
          amount: Number(row.amount),
          source_fingerprint: normalizeText(row.source_fingerprint),
        })),
        actor_id: actor.id,
        source_file_name: normalizeText(body.file_name),
        preview_token: body.preview_token,
        source_account_number: normalizeAccount(body.account_number),
        total_rows: Number(body.total_rows || rows.length),
        duplicate_rows: Number(body.duplicate_rows || 0),
        invalid_rows: Number(body.invalid_rows || 0),
      }));
    }

    if (body.action === "create_manual_transaction") {
      const accountId = normalizeText(body.bank_account_id);
      const transactionDate = normalizeText(body.transaction_date);
      const description = normalizeText(body.description);
      const referenceNumber = normalizeText(body.reference_number);
      const amount = Number(body.amount);
      const errors = [];
      if (!(await read(`bank_accounts?select=bank_account_id&bank_account_id=eq.${accountId}&lifecycle_status=eq.ACTIVE&limit=1`)).length) errors.push("חשבון בנק פעיל נדרש");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) errors.push("תאריך תקין נדרש");
      if (!description) errors.push("תיאור נדרש");
      if (!Number.isFinite(amount) || amount === 0) errors.push("סכום שאינו אפס נדרש");
      if (errors.length) return json({ error: "הנתונים אינם תקינים.", errors }, 422);
      const sourceFingerprint = await fingerprint(accountId, {
        transaction_date: transactionDate,
        reference_number: `MANUAL:${crypto.randomUUID()}`,
        amount,
      });
      return json(await write("rpc/portal_create_manual_bank_transaction", "POST", {
        target_bank_account_id: accountId,
        target_transaction_date: transactionDate,
        target_description: description,
        target_reference_number: referenceNumber || null,
        target_amount: amount,
        target_source_fingerprint: sourceFingerprint,
        actor_id: actor.id,
      }), 201);
    }

    if (body.action === "save_allocations") {
      const transactionId = normalizeText(body.bank_transaction_id);
      const transaction = (await read(`bank_transactions?select=bank_transaction_id,amount&bank_transaction_id=eq.${transactionId}&limit=1`))[0];
      if (!transaction) return json({ error: "תנועת הבנק לא נמצאה." }, 404);
      const allocations = Array.isArray(body.allocations) ? body.allocations : [];
      const unitsForValidation = await read("allocation_units?select=allocation_unit_id,allocation_unit_type&lifecycle_status=eq.ACTIVE");
      const normalized = allocations.map((row) => ({
        bank_transaction_id: transactionId,
        movement_type: row.movement_type || null,
        allocation_unit_id: row.allocation_unit_id || null,
        daycare_id: row.daycare_id || null,
        budget_category_id: row.budget_category_id || null,
        budget_month: row.budget_month ? `${row.budget_month.slice(0, 7)}-01` : null,
        accounting_status_id: row.accounting_status_id || null,
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
        const selectedUnit = row.allocation_unit_id ? unitsForValidation.find((unit: Record<string, unknown>) => unit.allocation_unit_id === row.allocation_unit_id) : null;
        if (selectedUnit?.allocation_unit_type === "DAYCARE" && !row.daycare_id) errors.push(`שורה ${index + 1}: מעון נדרש למחלקת מעונות`);
        if (selectedUnit?.allocation_unit_type !== "DAYCARE" && row.daycare_id) errors.push(`שורה ${index + 1}: ניתן לבחור מעון רק במחלקת מעונות`);
        if (!row.budget_month) errors.push(`שורה ${index + 1}: חודש תקציב נדרש`);
        if (!row.accounting_status_id) errors.push(`שורה ${index + 1}: סטטוס הנה"ח נדרש`);
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
    if (body.action === "delete_transactions") {
      const ids = [...new Set((Array.isArray(body.bank_transaction_ids) ? body.bank_transaction_ids : [])
        .map(normalizeText).filter((value) => /^[0-9a-f-]{36}$/i.test(value)))];
      if (!ids.length) return json({ error: "לא נבחרו תנועות למחיקה." }, 400);
      return json(await write("rpc/portal_delete_bank_transactions", "POST", {
        target_bank_transaction_ids: ids,
      }));
    }
    return json({ error: "פעולה לא מוכרת." }, 400);
  } catch (error) {
    console.error("portal-bank-workbench", error);
    return json({ error: error instanceof Error ? error.message : "שגיאת שרת בקובץ הבנקים." }, 500);
  }
});
