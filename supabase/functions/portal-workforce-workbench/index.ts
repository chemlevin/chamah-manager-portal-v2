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
      const [employees, employments, assignments, payTerms, eligibility, employeeCertificates, leave, lookupData] = await Promise.all([
        read("employees?select=*&order=last_name,first_name,employee_code"),
        read("employments?select=*&order=employment_start_date.desc"),
        read("employee_assignments?select=*&order=effective_from.desc"),
        read("employee_pay_terms?select=*&order=valid_from.desc"),
        read("employee_compensation_eligibility?select=*&order=effective_from.desc"),
        read("employee_certificates?select=*&order=expires_on.asc.nullslast"),
        read("employee_leave_periods?select=*&order=starts_on.desc"),
        lookups(),
      ]);
      return json({ employees, employments, assignments, payTerms, eligibility, employeeCertificates, leave, ...lookupData });
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
      const [records, allocations, employees, employments, assignments, payTerms, months, lookupData] = await Promise.all([
        read(`payroll_records?select=*&order=payroll_month.desc,created_at.desc${monthFilter}&limit=3000`),
        read("payroll_allocations?select=*&limit=6000"),
        read("employees?select=employee_id,employee_code,first_name,last_name,lifecycle_status"),
        read("employments?select=employment_id,employee_id,employment_status,employment_start_date,employment_end_date"),
        read("employee_assignments?select=*&order=effective_from.desc"),
        read("employee_pay_terms?select=*&order=valid_from.desc"),
        read("payroll_months?select=*&order=payroll_month.desc"),
        lookups(),
      ]);
      return json({
        records, allocations, employees, employments, assignments, payTerms, months,
        canReopen: reopenPermission.ok && await reopenPermission.json() === true,
        ...lookupData,
      });
    }

    const body = await request.json();
    if (page === "employees") {
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
        const result = await write("rpc/portal_open_payroll_month", "POST", {
          target_month: monthDate(body.payroll_month),
          opening_method: text(body.opening_method),
          actor_id: actor.id,
        });
        return json(result);
      }
      if (body.action === "close_month") {
        const result = await write("rpc/portal_close_payroll_month", "POST", {
          target_month: monthDate(body.payroll_month),
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
        const result = await write("rpc/portal_reopen_payroll_month", "POST", {
          target_month: monthDate(body.payroll_month),
          actor_id: actor.id,
          reopening_notes: text(body.notes),
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
          work_days: body.work_days === "" ? null : Number(body.work_days),
          travel_reimbursement: body.travel_reimbursement === "" ? null : Number(body.travel_reimbursement),
          bonus_amount: body.bonus_amount === "" ? null : Number(body.bonus_amount),
          adjustment_amount: body.adjustment_amount === "" ? null : Number(body.adjustment_amount),
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
        const result = await write("rpc/portal_save_payroll_allocations", "POST", {
          target_payroll_record_id: uuid(body.payroll_record_id),
          allocation_rows: Array.isArray(body.allocations) ? body.allocations : [],
          actor_id: actor.id,
        });
        return json(result);
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
