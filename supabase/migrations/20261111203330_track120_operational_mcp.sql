-- TRACK120: approval-bound, mixed-domain MCP administration and scoped read-back.
-- Canonical tables remain authoritative; this adds no parallel business records.

insert into public.portal_actions(action_code,resource_type,action_kind,requires_approval,display_name) values
 ('OPERATIONS.READ','OPERATIONAL_RECORD','READ',false,'קריאת נתונים תפעוליים'),
 ('OPERATIONS.WRITE','OPERATIONAL_CHANGESET','BULK',true,'שינויים תפעוליים מאושרים')
on conflict(action_code) do update set resource_type=excluded.resource_type,action_kind=excluded.action_kind,
 requires_approval=excluded.requires_approval,display_name=excluded.display_name,is_active=true;
insert into public.portal_role_actions(role_code,action_code) values
 ('DIRECTOR','OPERATIONS.READ'),('DIRECTOR','OPERATIONS.WRITE') on conflict do nothing;

alter table public.mcp_ingestion_batches
  add column if not exists row_version integer not null default 1,
  add column if not exists preview_digest text,
  add column if not exists commit_result jsonb;

create or replace function public.portal_mcp_operational_catalog()
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
 select jsonb_build_object(
  'entities',jsonb_build_array(
   jsonb_build_object('entity','employees','id','employee_id','stable_keys',jsonb_build_array('employee_code','national_id'),'writable',jsonb_build_array('employee_code','national_id','first_name','last_name','phone','email','birth_date','lifecycle_status','notes','manager_employee_id')),
   jsonb_build_object('entity','employments','id','employment_id','stable_keys',jsonb_build_array('employee_id','employment_start_date'),'writable',jsonb_build_array('employee_id','legal_entity_id','employment_start_date','employment_end_date','recognized_prior_seniority_months','employment_status','employment_type_code','default_monthly_hours','notes')),
   jsonb_build_object('entity','employee_assignments','id','assignment_id','stable_keys',jsonb_build_array('employment_id','effective_from','daycare_id','role_id'),'writable',jsonb_build_array('employment_id','allocation_unit_id','daycare_id','classroom_id','role_id','effective_from','effective_to','is_primary','notes')),
   jsonb_build_object('entity','employee_certificates','id','employee_certificate_id','stable_keys',jsonb_build_array('employee_id','certificate_type_id','issued_on'),'writable',jsonb_build_array('employee_id','certificate_type_id','issued_on','expires_on','status','notes')),
   jsonb_build_object('entity','employee_pay_terms','id','employee_pay_term_id','stable_keys',jsonb_build_array('employee_id','valid_from'),'writable',jsonb_build_array('employee_id','valid_from','valid_to','pay_type','base_pay','estimated_employment_percentage','caregiver_certificate_status','studies_end_date','has_degree','is_class_manager','excellence_eligible','first_aid_valid_until','safe_conduct_valid_until','weekly_schedule','notes','travel_eligible')),
   jsonb_build_object('entity','employee_compensation_eligibility','id','employee_compensation_eligibility_id','stable_keys',jsonb_build_array('employment_id','compensation_factor_id','effective_from'),'writable',jsonb_build_array('employment_id','compensation_factor_id','effective_from','effective_to','eligibility_status','manual_override','notes')),
   jsonb_build_object('entity','employee_leave_periods','id','employee_leave_period_id','stable_keys',jsonb_build_array('employment_id','leave_type','starts_on'),'writable',jsonb_build_array('employment_id','leave_type','starts_on','ends_on','notes')),
   jsonb_build_object('entity','payroll_records','id','payroll_record_id','stable_keys',jsonb_build_array('source_record_identifier','sheet_payroll_row_id'),'writable',jsonb_build_array('employment_id','payroll_month','source_employee_identifier','source_record_identifier','gross_pay','employer_cost','regular_hours','overtime_hours','hours_125','hours_150','vacation_hours','sick_hours','other_absence_hours','notes','sheet_payroll_row_id','allocation_unit_id','daycare_id','role_id','work_days','unpaid_absence_hours','travel_reimbursement','bonus_amount','adjustment_amount','actual_hours','actual_gross','actual_net','actual_status','actual_notes','monthly_overrides','monthly_inputs')),
   jsonb_build_object('entity','payroll_allocations','id','payroll_allocation_id','stable_keys',jsonb_build_array('payroll_record_id','allocation_unit_id','role_id'),'writable',jsonb_build_array('payroll_record_id','allocation_unit_id','daycare_id','role_id','budget_category_id','allocation_amount','allocation_percent','allocated_hours','allocated_standard_hours','allocated_net','allocated_gross','effective_note','allocation_status')),
   jsonb_build_object('entity','bank_allocations','id','bank_allocation_id','stable_keys',jsonb_build_array('bank_transaction_id','allocation_unit_id','budget_month'),'writable',jsonb_build_array('bank_transaction_id','allocation_unit_id','daycare_id','budget_category_id','budget_month','allocation_amount','accounting_status_id','notes','document_url','movement_type')),
   jsonb_build_object('entity','suppliers','id','supplier_id','stable_keys',jsonb_build_array('supplier_code','registration_number'),'writable',jsonb_build_array('supplier_code','legal_name','display_name','registration_number','email','phone','notes','lifecycle_status','legacy_reference')),
   jsonb_build_object('entity','payment_requests','id','payment_request_id','stable_keys',jsonb_build_array('idempotency_key','invoice_number'),'writable',jsonb_build_array('supplier_id','supplier_bank_detail_id','invoice_number','invoice_date','requested_payment_date','amount','currency','description','idempotency_key'))
  ),
  'row_contract',jsonb_build_object('entity','catalog entity','record_id','UUID for corrections','expected_row_version','required for corrections','values','canonical field/value object'),
  'limits',jsonb_build_object('rows_per_batch',100,'approval_minutes',10)
 ) where private.portal_is_authorized(auth.uid(),'OPERATIONS.READ');
$$;

create or replace function private.portal_mcp_entity_meta(p_entity text)
returns jsonb language sql immutable set search_path=public,private,pg_temp as $$
 select case p_entity
  when 'employees' then '{"id":"employee_id","stable":["employee_code","national_id"]}'::jsonb
  when 'employments' then '{"id":"employment_id","stable":["employee_id","employment_start_date"]}'::jsonb
  when 'employee_assignments' then '{"id":"assignment_id","stable":["employment_id","effective_from","daycare_id","role_id"]}'::jsonb
  when 'employee_certificates' then '{"id":"employee_certificate_id","stable":["employee_id","certificate_type_id","issued_on"]}'::jsonb
  when 'employee_pay_terms' then '{"id":"employee_pay_term_id","stable":["employee_id","valid_from"]}'::jsonb
  when 'employee_compensation_eligibility' then '{"id":"employee_compensation_eligibility_id","stable":["employment_id","compensation_factor_id","effective_from"]}'::jsonb
  when 'employee_leave_periods' then '{"id":"employee_leave_period_id","stable":["employment_id","leave_type","starts_on"]}'::jsonb
  when 'payroll_records' then '{"id":"payroll_record_id","stable":["source_record_identifier","sheet_payroll_row_id"]}'::jsonb
  when 'payroll_allocations' then '{"id":"payroll_allocation_id","stable":["payroll_record_id","allocation_unit_id","role_id"]}'::jsonb
  when 'bank_allocations' then '{"id":"bank_allocation_id","stable":["bank_transaction_id","allocation_unit_id","budget_month"]}'::jsonb
  when 'suppliers' then '{"id":"supplier_id","stable":["supplier_code","registration_number"]}'::jsonb
  when 'payment_requests' then '{"id":"payment_request_id","stable":["idempotency_key","invoice_number"]}'::jsonb
 end;
$$;
revoke all on function private.portal_mcp_entity_meta(text) from public,anon,authenticated;

create or replace function private.portal_mcp_match_operational_row(p_row jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare e text:=p_row->>'entity'; v jsonb:=p_row->'values'; found jsonb; matches integer:=0;
begin
 if nullif(p_row->>'record_id','') is not null then
  return p_row;
 end if;
 if e='employees' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.employees t where (nullif(v->>'employee_code','') is not null and t.employee_code=v->>'employee_code') or (nullif(v->>'national_id','') is not null and t.national_id=v->>'national_id');
 elsif e='employments' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.employments t where t.employee_id=(v->>'employee_id')::uuid and t.employment_start_date=(v->>'employment_start_date')::date;
 elsif e='employee_assignments' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.employee_assignments t where t.employment_id=(v->>'employment_id')::uuid and t.effective_from=(v->>'effective_from')::date and t.daycare_id is not distinct from nullif(v->>'daycare_id','')::uuid and t.role_id=(v->>'role_id')::uuid;
 elsif e='employee_certificates' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.employee_certificates t where t.employee_id=(v->>'employee_id')::uuid and t.certificate_type_id=(v->>'certificate_type_id')::uuid and t.issued_on is not distinct from nullif(v->>'issued_on','')::date;
 elsif e='employee_pay_terms' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.employee_pay_terms t where t.employee_id=(v->>'employee_id')::uuid and t.valid_from=(v->>'valid_from')::date;
 elsif e='employee_compensation_eligibility' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.employee_compensation_eligibility t where t.employment_id=(v->>'employment_id')::uuid and t.compensation_factor_id=(v->>'compensation_factor_id')::uuid and t.effective_from=(v->>'effective_from')::date;
 elsif e='employee_leave_periods' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.employee_leave_periods t where t.employment_id=(v->>'employment_id')::uuid and t.leave_type=v->>'leave_type' and t.starts_on=(v->>'starts_on')::date;
 elsif e='payroll_records' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.payroll_records t where (nullif(v->>'source_record_identifier','') is not null and t.source_record_identifier=v->>'source_record_identifier') or (nullif(v->>'sheet_payroll_row_id','') is not null and t.sheet_payroll_row_id=v->>'sheet_payroll_row_id');
 elsif e='payroll_allocations' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.payroll_allocations t where t.payroll_record_id=(v->>'payroll_record_id')::uuid and t.allocation_unit_id=(v->>'allocation_unit_id')::uuid and t.role_id is not distinct from nullif(v->>'role_id','')::uuid;
 elsif e='bank_allocations' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.bank_allocations t where t.bank_transaction_id=(v->>'bank_transaction_id')::uuid and t.allocation_unit_id=(v->>'allocation_unit_id')::uuid and t.budget_month=(v->>'budget_month')::date;
 elsif e='suppliers' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.suppliers t where (nullif(v->>'supplier_code','') is not null and t.supplier_code=v->>'supplier_code') or (nullif(v->>'registration_number','') is not null and t.registration_number=v->>'registration_number');
 elsif e='payment_requests' then select count(*),(jsonb_agg(to_jsonb(t))->0) into matches,found from public.payment_requests t where (nullif(v->>'idempotency_key','') is not null and t.idempotency_key=v->>'idempotency_key') or (nullif(v->>'invoice_number','') is not null and t.invoice_number=v->>'invoice_number' and t.supplier_id=(v->>'supplier_id')::uuid);
 end if;
 if matches>1 then return p_row||jsonb_build_object('_match_conflict','AMBIGUOUS_STABLE_IDENTIFIERS'); end if;
 if matches=1 then return p_row||jsonb_build_object('record_id',found->>(private.portal_mcp_entity_meta(e)->>'id'),'expected_row_version',found->'row_version','_matched_record',found); end if;
 return p_row;
end $$;
revoke all on function private.portal_mcp_match_operational_row(jsonb) from public,anon,authenticated;

create or replace function public.portal_mcp_preview_operational_changes(
 p_rows jsonb,p_source_name text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare actor uuid:=auth.uid(); b public.mcp_ingestion_batches; preview jsonb; digest_value text; staged_rows jsonb;
begin
 if not private.portal_is_authorized(actor,'OPERATIONS.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 100 then raise exception 'Rows must contain 1..100 records' using errcode='22023'; end if;
 if length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'Invalid idempotency key' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where jsonb_typeof(r)<>'object' or private.portal_mcp_entity_meta(r->>'entity') is null or jsonb_typeof(r->'values')<>'object') then
  raise exception 'Unsupported entity or invalid row' using errcode='22023';
 end if;
 select jsonb_agg(private.portal_mcp_match_operational_row(r) order by n) into staged_rows from jsonb_array_elements(p_rows) with ordinality x(r,n);
 select jsonb_agg(jsonb_build_object(
   'source_row',n,'entity',r->>'entity','record_id',r->>'record_id','expected_row_version',r->'expected_row_version',
   'operation',case when r?'_match_conflict' then 'CONFLICT' when nullif(r->>'record_id','') is null then 'CREATE' when (r->'_matched_record') @> (r->'values') then 'SKIP' else 'UPDATE' end,
   'status',case when r?'_match_conflict' or (nullif(r->>'record_id','') is not null and (r->>'expected_row_version') is null) then 'CONFLICT' else 'READY' end,
   'conflicts',case when r?'_match_conflict' then jsonb_build_array(r->>'_match_conflict') when nullif(r->>'record_id','') is not null and (r->>'expected_row_version') is null then jsonb_build_array('EXPECTED_ROW_VERSION_REQUIRED') else '[]'::jsonb end
  ) order by n) into preview from jsonb_array_elements(staged_rows) with ordinality x(r,n);
 if exists(select 1 from jsonb_array_elements(preview) x where x->>'status'='CONFLICT') then null; end if;
 digest_value:=encode(digest(staged_rows::text,'sha256'),'hex');
 insert into public.mcp_ingestion_batches(actor_user_id,domain,idempotency_key,source_name,rows,preview,status,preview_digest)
 values(actor,'OPERATIONS',trim(p_idempotency_key),left(coalesce(nullif(trim(p_source_name),''),'ChatGPT'),120),staged_rows,preview,
  case when exists(select 1 from jsonb_array_elements(preview) x where x->>'status'='CONFLICT') then 'CONFLICTS' else 'READY' end,digest_value)
 on conflict(actor_user_id,domain,idempotency_key) do update set source_name=excluded.source_name
 where public.mcp_ingestion_batches.rows=excluded.rows
 returning * into b;
 if b.batch_id is null then raise exception 'Idempotency key already used with different rows' using errcode='23505'; end if;
 return jsonb_build_object('batch_id',b.batch_id,'status',b.status,'row_version',b.row_version,'preview_digest',b.preview_digest,'preview',b.preview,'canonical_writes',false);
end $$;

create or replace function public.portal_mcp_request_operational_approval(p_batch_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.mcp_ingestion_batches; a jsonb;
begin
 select * into b from public.mcp_ingestion_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.batch_id is null or b.domain<>'OPERATIONS' or b.status<>'READY' then raise exception 'Batch is not ready' using errcode='22023'; end if;
 a:=public.portal_request_approval('OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,
  jsonb_build_object('batch_id',b.batch_id,'row_version',b.row_version,'preview_digest',b.preview_digest),p_reason);
 update public.mcp_ingestion_batches set approval_id=(a->>'approval_id')::uuid where batch_id=b.batch_id;
 return a||jsonb_build_object('batch_id',b.batch_id);
end $$;

create or replace function private.portal_mcp_apply_operational_row(p_row jsonb)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare e text:=p_row->>'entity'; rid uuid:=nullif(p_row->>'record_id','')::uuid; v jsonb:=p_row->'values'; expected integer:=nullif(p_row->>'expected_row_version','')::integer; result jsonb;
begin
 if e='employees' then
  if rid is null then
   insert into public.employees(employee_code,national_id,first_name,last_name,phone,email,birth_date,lifecycle_status,notes,manager_employee_id,created_by_user_id,updated_by_user_id)
   values(v->>'employee_code',nullif(v->>'national_id',''),v->>'first_name',v->>'last_name',nullif(v->>'phone',''),nullif(v->>'email',''),nullif(v->>'birth_date','')::date,coalesce(nullif(v->>'lifecycle_status',''),'ACTIVE'),nullif(v->>'notes',''),nullif(v->>'manager_employee_id','')::uuid,auth.uid(),auth.uid()) returning to_jsonb(employees.*) into result;
  else
   update public.employees t set first_name=coalesce(v->>'first_name',t.first_name),last_name=coalesce(v->>'last_name',t.last_name),phone=case when v?'phone' then nullif(v->>'phone','') else t.phone end,email=case when v?'email' then nullif(v->>'email','') else t.email end,birth_date=case when v?'birth_date' then nullif(v->>'birth_date','')::date else t.birth_date end,lifecycle_status=coalesce(v->>'lifecycle_status',t.lifecycle_status),notes=case when v?'notes' then nullif(v->>'notes','') else t.notes end,manager_employee_id=case when v?'manager_employee_id' then nullif(v->>'manager_employee_id','')::uuid else t.manager_employee_id end,updated_by_user_id=auth.uid() where employee_id=rid and row_version=expected returning to_jsonb(t.*) into result;
  end if;
 elsif e='employments' then
  if rid is null then insert into public.employments(employee_id,legal_entity_id,employment_start_date,employment_end_date,recognized_prior_seniority_months,employment_status,employment_type_code,default_monthly_hours,notes,created_by_user_id,updated_by_user_id) values((v->>'employee_id')::uuid,(v->>'legal_entity_id')::uuid,(v->>'employment_start_date')::date,nullif(v->>'employment_end_date','')::date,coalesce((v->>'recognized_prior_seniority_months')::int,0),coalesce(v->>'employment_status','ACTIVE'),nullif(v->>'employment_type_code',''),nullif(v->>'default_monthly_hours','')::numeric,nullif(v->>'notes',''),auth.uid(),auth.uid()) returning to_jsonb(employments.*) into result;
  else update public.employments t set employment_end_date=case when v?'employment_end_date' then nullif(v->>'employment_end_date','')::date else t.employment_end_date end,recognized_prior_seniority_months=coalesce((v->>'recognized_prior_seniority_months')::int,t.recognized_prior_seniority_months),employment_status=coalesce(v->>'employment_status',t.employment_status),employment_type_code=coalesce(v->>'employment_type_code',t.employment_type_code),default_monthly_hours=coalesce((v->>'default_monthly_hours')::numeric,t.default_monthly_hours),notes=case when v?'notes' then nullif(v->>'notes','') else t.notes end,updated_by_user_id=auth.uid() where employment_id=rid and row_version=expected returning to_jsonb(t.*) into result; end if;
 elsif e='employee_assignments' then
  if rid is null then insert into public.employee_assignments(employment_id,allocation_unit_id,daycare_id,classroom_id,role_id,effective_from,effective_to,is_primary,notes,created_by_user_id,updated_by_user_id) values((v->>'employment_id')::uuid,(v->>'allocation_unit_id')::uuid,nullif(v->>'daycare_id','')::uuid,nullif(v->>'classroom_id','')::uuid,(v->>'role_id')::uuid,(v->>'effective_from')::date,nullif(v->>'effective_to','')::date,coalesce((v->>'is_primary')::boolean,false),nullif(v->>'notes',''),auth.uid(),auth.uid()) returning to_jsonb(employee_assignments.*) into result;
  else update public.employee_assignments t set effective_to=case when v?'effective_to' then nullif(v->>'effective_to','')::date else t.effective_to end,is_primary=coalesce((v->>'is_primary')::boolean,t.is_primary),notes=case when v?'notes' then nullif(v->>'notes','') else t.notes end,updated_by_user_id=auth.uid() where assignment_id=rid and row_version=expected returning to_jsonb(t.*) into result; end if;
 elsif e='employee_certificates' then
  if rid is null then insert into public.employee_certificates(employee_id,certificate_type_id,issued_on,expires_on,status,notes,created_by_user_id,updated_by_user_id) values((v->>'employee_id')::uuid,(v->>'certificate_type_id')::uuid,nullif(v->>'issued_on','')::date,nullif(v->>'expires_on','')::date,coalesce(v->>'status','VALID'),nullif(v->>'notes',''),auth.uid(),auth.uid()) returning to_jsonb(employee_certificates.*) into result;
  else update public.employee_certificates t set issued_on=coalesce((v->>'issued_on')::date,t.issued_on),expires_on=case when v?'expires_on' then nullif(v->>'expires_on','')::date else t.expires_on end,status=coalesce(v->>'status',t.status),notes=case when v?'notes' then nullif(v->>'notes','') else t.notes end,updated_by_user_id=auth.uid() where employee_certificate_id=rid and row_version=expected returning to_jsonb(t.*) into result; end if;
 elsif e='employee_pay_terms' then
  if rid is null then insert into public.employee_pay_terms(employee_id,valid_from,valid_to,pay_type,base_pay,estimated_employment_percentage,caregiver_certificate_status,studies_end_date,has_degree,is_class_manager,excellence_eligible,first_aid_valid_until,safe_conduct_valid_until,weekly_schedule,notes,travel_eligible) values((v->>'employee_id')::uuid,(v->>'valid_from')::date,nullif(v->>'valid_to','')::date,v->>'pay_type',(v->>'base_pay')::numeric,nullif(v->>'estimated_employment_percentage','')::numeric,nullif(v->>'caregiver_certificate_status',''),nullif(v->>'studies_end_date','')::date,coalesce((v->>'has_degree')::boolean,false),coalesce((v->>'is_class_manager')::boolean,false),coalesce((v->>'excellence_eligible')::boolean,false),nullif(v->>'first_aid_valid_until','')::date,nullif(v->>'safe_conduct_valid_until','')::date,coalesce(v->'weekly_schedule','{}'::jsonb),nullif(v->>'notes',''),coalesce((v->>'travel_eligible')::boolean,false)) returning to_jsonb(employee_pay_terms.*) into result;
  else update public.employee_pay_terms t set valid_to=case when v?'valid_to' then nullif(v->>'valid_to','')::date else t.valid_to end,pay_type=coalesce(v->>'pay_type',t.pay_type),base_pay=coalesce((v->>'base_pay')::numeric,t.base_pay),estimated_employment_percentage=coalesce((v->>'estimated_employment_percentage')::numeric,t.estimated_employment_percentage),notes=case when v?'notes' then nullif(v->>'notes','') else t.notes end,updated_at=clock_timestamp() where employee_pay_term_id=rid and row_version=expected returning to_jsonb(t.*) into result; end if;
 elsif e='employee_compensation_eligibility' then
  if rid is null then insert into public.employee_compensation_eligibility(employment_id,compensation_factor_id,effective_from,effective_to,eligibility_status,manual_override,notes,created_by_user_id,updated_by_user_id) values((v->>'employment_id')::uuid,(v->>'compensation_factor_id')::uuid,(v->>'effective_from')::date,nullif(v->>'effective_to','')::date,coalesce(v->>'eligibility_status','ELIGIBLE'),coalesce((v->>'manual_override')::boolean,false),nullif(v->>'notes',''),auth.uid(),auth.uid()) returning to_jsonb(employee_compensation_eligibility.*) into result;
  else update public.employee_compensation_eligibility t set effective_to=case when v?'effective_to' then nullif(v->>'effective_to','')::date else t.effective_to end,eligibility_status=coalesce(v->>'eligibility_status',t.eligibility_status),manual_override=coalesce((v->>'manual_override')::boolean,t.manual_override),notes=case when v?'notes' then nullif(v->>'notes','') else t.notes end,updated_by_user_id=auth.uid() where employee_compensation_eligibility_id=rid and row_version=expected returning to_jsonb(t.*) into result; end if;
 elsif e='employee_leave_periods' then
  if rid is null then insert into public.employee_leave_periods(employment_id,leave_type,starts_on,ends_on,notes,created_by_user_id,updated_by_user_id) values((v->>'employment_id')::uuid,v->>'leave_type',(v->>'starts_on')::date,nullif(v->>'ends_on','')::date,nullif(v->>'notes',''),auth.uid(),auth.uid()) returning to_jsonb(employee_leave_periods.*) into result;
  else update public.employee_leave_periods t set ends_on=case when v?'ends_on' then nullif(v->>'ends_on','')::date else t.ends_on end,notes=case when v?'notes' then nullif(v->>'notes','') else t.notes end,updated_by_user_id=auth.uid() where employee_leave_period_id=rid and row_version=expected returning to_jsonb(t.*) into result; end if;
 elsif e='payroll_records' then
  if rid is null then insert into public.payroll_records(employment_id,payroll_month,source_employee_identifier,source_record_identifier,gross_pay,employer_cost,regular_hours,overtime_hours,hours_125,hours_150,vacation_hours,sick_hours,other_absence_hours,notes,sheet_payroll_row_id,employee_match_status,record_origin,allocation_unit_id,daycare_id,role_id,work_days,unpaid_absence_hours,travel_reimbursement,bonus_amount,adjustment_amount,actual_hours,actual_gross,actual_net,actual_status,actual_notes,monthly_overrides,monthly_inputs,created_by_user_id,updated_by_user_id)
   values(nullif(v->>'employment_id','')::uuid,(v->>'payroll_month')::date,v->>'source_employee_identifier',v->>'source_record_identifier',nullif(v->>'gross_pay','')::numeric,nullif(v->>'employer_cost','')::numeric,nullif(v->>'regular_hours','')::numeric,nullif(v->>'overtime_hours','')::numeric,nullif(v->>'hours_125','')::numeric,nullif(v->>'hours_150','')::numeric,nullif(v->>'vacation_hours','')::numeric,nullif(v->>'sick_hours','')::numeric,nullif(v->>'other_absence_hours','')::numeric,nullif(v->>'notes',''),nullif(v->>'sheet_payroll_row_id',''),coalesce(v->>'employee_match_status','MATCHED'),coalesce(v->>'record_origin','MCP'),nullif(v->>'allocation_unit_id','')::uuid,nullif(v->>'daycare_id','')::uuid,nullif(v->>'role_id','')::uuid,nullif(v->>'work_days','')::numeric,nullif(v->>'unpaid_absence_hours','')::numeric,nullif(v->>'travel_reimbursement','')::numeric,nullif(v->>'bonus_amount','')::numeric,nullif(v->>'adjustment_amount','')::numeric,nullif(v->>'actual_hours','')::numeric,nullif(v->>'actual_gross','')::numeric,nullif(v->>'actual_net','')::numeric,nullif(v->>'actual_status',''),nullif(v->>'actual_notes',''),coalesce(v->'monthly_overrides','{}'::jsonb),coalesce(v->'monthly_inputs','{}'::jsonb),auth.uid(),auth.uid()) returning to_jsonb(payroll_records.*) into result;
  else update public.payroll_records t set gross_pay=coalesce((v->>'gross_pay')::numeric,t.gross_pay),employer_cost=coalesce((v->>'employer_cost')::numeric,t.employer_cost),regular_hours=coalesce((v->>'regular_hours')::numeric,t.regular_hours),overtime_hours=coalesce((v->>'overtime_hours')::numeric,t.overtime_hours),notes=case when v?'notes' then nullif(v->>'notes','') else t.notes end,actual_hours=coalesce((v->>'actual_hours')::numeric,t.actual_hours),actual_gross=coalesce((v->>'actual_gross')::numeric,t.actual_gross),actual_net=coalesce((v->>'actual_net')::numeric,t.actual_net),actual_status=coalesce(v->>'actual_status',t.actual_status),actual_notes=case when v?'actual_notes' then nullif(v->>'actual_notes','') else t.actual_notes end,monthly_overrides=coalesce(v->'monthly_overrides',t.monthly_overrides),monthly_inputs=coalesce(v->'monthly_inputs',t.monthly_inputs),updated_by_user_id=auth.uid() where payroll_record_id=rid and row_version=expected returning to_jsonb(t.*) into result; end if;
 elsif e='payroll_allocations' then
  if rid is null then insert into public.payroll_allocations(payroll_record_id,allocation_unit_id,daycare_id,role_id,budget_category_id,allocation_amount,allocation_percent,allocated_hours,allocated_standard_hours,allocated_net,allocated_gross,effective_note,allocation_status,created_by_user_id,updated_by_user_id) values((v->>'payroll_record_id')::uuid,(v->>'allocation_unit_id')::uuid,nullif(v->>'daycare_id','')::uuid,nullif(v->>'role_id','')::uuid,nullif(v->>'budget_category_id','')::uuid,nullif(v->>'allocation_amount','')::numeric,nullif(v->>'allocation_percent','')::numeric,nullif(v->>'allocated_hours','')::numeric,nullif(v->>'allocated_standard_hours','')::numeric,nullif(v->>'allocated_net','')::numeric,nullif(v->>'allocated_gross','')::numeric,nullif(v->>'effective_note',''),coalesce(v->>'allocation_status','DRAFT'),auth.uid(),auth.uid()) returning to_jsonb(payroll_allocations.*) into result;
  else update public.payroll_allocations t set allocation_unit_id=coalesce((v->>'allocation_unit_id')::uuid,t.allocation_unit_id),daycare_id=case when v?'daycare_id' then nullif(v->>'daycare_id','')::uuid else t.daycare_id end,role_id=case when v?'role_id' then nullif(v->>'role_id','')::uuid else t.role_id end,budget_category_id=case when v?'budget_category_id' then nullif(v->>'budget_category_id','')::uuid else t.budget_category_id end,allocation_amount=coalesce((v->>'allocation_amount')::numeric,t.allocation_amount),allocation_percent=coalesce((v->>'allocation_percent')::numeric,t.allocation_percent),allocated_hours=coalesce((v->>'allocated_hours')::numeric,t.allocated_hours),allocated_standard_hours=coalesce((v->>'allocated_standard_hours')::numeric,t.allocated_standard_hours),allocated_net=coalesce((v->>'allocated_net')::numeric,t.allocated_net),allocated_gross=coalesce((v->>'allocated_gross')::numeric,t.allocated_gross),effective_note=case when v?'effective_note' then nullif(v->>'effective_note','') else t.effective_note end,updated_by_user_id=auth.uid() where payroll_allocation_id=rid and row_version=expected and allocation_status='DRAFT' returning to_jsonb(t.*) into result; end if;
 elsif e='bank_allocations' then
  if rid is null then insert into public.bank_allocations(bank_transaction_id,allocation_unit_id,daycare_id,budget_category_id,budget_month,allocation_amount,accounting_status_id,notes,document_url,movement_type,created_by_user_id,updated_by_user_id) values((v->>'bank_transaction_id')::uuid,(v->>'allocation_unit_id')::uuid,nullif(v->>'daycare_id','')::uuid,nullif(v->>'budget_category_id','')::uuid,(v->>'budget_month')::date,(v->>'allocation_amount')::numeric,nullif(v->>'accounting_status_id','')::uuid,nullif(v->>'notes',''),nullif(v->>'document_url',''),nullif(v->>'movement_type',''),auth.uid(),auth.uid()) returning to_jsonb(bank_allocations.*) into result;
  else update public.bank_allocations t set allocation_unit_id=coalesce((v->>'allocation_unit_id')::uuid,t.allocation_unit_id),daycare_id=case when v?'daycare_id' then nullif(v->>'daycare_id','')::uuid else t.daycare_id end,budget_category_id=case when v?'budget_category_id' then nullif(v->>'budget_category_id','')::uuid else t.budget_category_id end,budget_month=coalesce((v->>'budget_month')::date,t.budget_month),allocation_amount=coalesce((v->>'allocation_amount')::numeric,t.allocation_amount),accounting_status_id=case when v?'accounting_status_id' then nullif(v->>'accounting_status_id','')::uuid else t.accounting_status_id end,notes=case when v?'notes' then nullif(v->>'notes','') else t.notes end,updated_by_user_id=auth.uid() where bank_allocation_id=rid and row_version=expected returning to_jsonb(t.*) into result; end if;
 elsif e='suppliers' then
  if rid is null then insert into public.suppliers(supplier_code,legal_name,display_name,registration_number,email,phone,notes,lifecycle_status,legacy_reference,created_by_user_id,updated_by_user_id) values(v->>'supplier_code',v->>'legal_name',v->>'display_name',nullif(v->>'registration_number',''),nullif(v->>'email',''),nullif(v->>'phone',''),nullif(v->>'notes',''),coalesce(v->>'lifecycle_status','ACTIVE'),nullif(v->>'legacy_reference',''),auth.uid(),auth.uid()) returning to_jsonb(suppliers.*) into result;
  else update public.suppliers t set legal_name=coalesce(v->>'legal_name',t.legal_name),display_name=coalesce(v->>'display_name',t.display_name),email=case when v?'email' then nullif(v->>'email','') else t.email end,phone=case when v?'phone' then nullif(v->>'phone','') else t.phone end,notes=case when v?'notes' then nullif(v->>'notes','') else t.notes end,lifecycle_status=coalesce(v->>'lifecycle_status',t.lifecycle_status),updated_by_user_id=auth.uid() where supplier_id=rid and row_version=expected returning to_jsonb(t.*) into result; end if;
 elsif e='payment_requests' then
  if rid is null then insert into public.payment_requests(supplier_id,supplier_bank_detail_id,invoice_number,invoice_date,requested_payment_date,amount,currency,status,description,idempotency_key,created_by_user_id,updated_by_user_id) values((v->>'supplier_id')::uuid,nullif(v->>'supplier_bank_detail_id','')::uuid,nullif(v->>'invoice_number',''),nullif(v->>'invoice_date','')::date,nullif(v->>'requested_payment_date','')::date,(v->>'amount')::numeric,coalesce(v->>'currency','ILS'),'DRAFT',nullif(v->>'description',''),v->>'idempotency_key',auth.uid(),auth.uid()) returning to_jsonb(payment_requests.*) into result;
  else update public.payment_requests t set supplier_bank_detail_id=case when v?'supplier_bank_detail_id' then nullif(v->>'supplier_bank_detail_id','')::uuid else t.supplier_bank_detail_id end,invoice_number=coalesce(v->>'invoice_number',t.invoice_number),invoice_date=coalesce((v->>'invoice_date')::date,t.invoice_date),requested_payment_date=coalesce((v->>'requested_payment_date')::date,t.requested_payment_date),amount=coalesce((v->>'amount')::numeric,t.amount),currency=coalesce(v->>'currency',t.currency),description=case when v?'description' then nullif(v->>'description','') else t.description end,updated_by_user_id=auth.uid() where payment_request_id=rid and row_version=expected and status='DRAFT' returning to_jsonb(t.*) into result; end if;
 else raise exception 'Entity write not implemented: %',e using errcode='0A000';
 end if;
 if result is null then raise exception 'Record missing, immutable, or changed concurrently' using errcode='40001'; end if;
 return result;
end $$;
revoke all on function private.portal_mcp_apply_operational_row(jsonb) from public,anon,authenticated;

create or replace function public.portal_mcp_commit_operational_changes(p_batch_id uuid,p_approval_id uuid)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.mcp_ingestion_batches; r jsonb; item jsonb; results jsonb:='[]'::jsonb; before_row jsonb; entity_id uuid;
begin
 if not private.portal_is_authorized(auth.uid(),'OPERATIONS.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into b from public.mcp_ingestion_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.status='COMMITTED' then return b.commit_result||jsonb_build_object('idempotent_replay',true); end if;
 if b.batch_id is null or b.status<>'READY' or b.preview_digest<>encode(digest(b.rows::text,'sha256'),'hex') then raise exception 'Batch missing, changed, or not ready' using errcode='40001'; end if;
 perform private.portal_consume_approval(p_approval_id,'OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,jsonb_build_object('batch_id',b.batch_id,'row_version',b.row_version,'preview_digest',b.preview_digest));
 for r in select value from jsonb_array_elements(b.rows) loop
  if (r->'_matched_record') @> (r->'values') then
   results:=results||jsonb_build_array(jsonb_build_object('entity',r->>'entity','operation','SKIP','record',r->'_matched_record'));
   continue;
  end if;
  item:=private.portal_mcp_apply_operational_row(r); results:=results||jsonb_build_array(jsonb_build_object('entity',r->>'entity','record',item));
  entity_id:=nullif(coalesce(item->>coalesce(private.portal_mcp_entity_meta(r->>'entity')->>'id','id'),r->>'record_id'),'')::uuid;
  insert into public.audit_events(entity_type,entity_id,operation,previous_values,new_values,source_type,actor_user_id,import_batch_id)
  values(r->>'entity',entity_id,case when nullif(r->>'record_id','') is null then 'MCP_CREATE' else 'MCP_UPDATE' end,null,item,'MCP',auth.uid(),b.batch_id);
 end loop;
 update public.mcp_ingestion_batches set status='COMMITTED',approval_id=p_approval_id,committed_at=now(),commit_result=jsonb_build_object('batch_id',b.batch_id,'status','COMMITTED','records',results,'verified',true,'atomic',true) where batch_id=b.batch_id returning commit_result into item;
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id,detail) values(auth.uid(),'MCP','OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,'SUCCESS',p_approval_id,jsonb_build_object('records',jsonb_array_length(results)));
 return item;
end $$;

create or replace function public.portal_mcp_get_operational_batch(p_batch_id uuid)
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
 select jsonb_build_object('batch_id',b.batch_id,'domain',b.domain,'source_name',b.source_name,'status',b.status,'row_version',b.row_version,'preview_digest',b.preview_digest,'preview',b.preview,'approval_id',b.approval_id,'created_at',b.created_at,'committed_at',b.committed_at,'commit_result',b.commit_result)
 from public.mcp_ingestion_batches b where b.batch_id=p_batch_id and b.actor_user_id=auth.uid() and private.portal_is_authorized(auth.uid(),'OPERATIONS.READ');
$$;

create or replace function public.portal_mcp_employee_profile(p_employee_id uuid)
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
 select jsonb_build_object('employee',to_jsonb(e),'employments',coalesce((select jsonb_agg(to_jsonb(x) order by x.employment_start_date) from public.employments x where x.employee_id=e.employee_id),'[]'::jsonb),'assignments',coalesce((select jsonb_agg(to_jsonb(a) order by a.effective_from) from public.employee_assignments a join public.employments x on x.employment_id=a.employment_id where x.employee_id=e.employee_id),'[]'::jsonb),'pay_terms',coalesce((select jsonb_agg(to_jsonb(t) order by t.valid_from) from public.employee_pay_terms t where t.employee_id=e.employee_id),'[]'::jsonb),'certificates',coalesce((select jsonb_agg(to_jsonb(c) order by c.issued_on) from public.employee_certificates c where c.employee_id=e.employee_id),'[]'::jsonb),'eligibility',coalesce((select jsonb_agg(to_jsonb(q) order by q.effective_from) from public.employee_compensation_eligibility q join public.employments x on x.employment_id=q.employment_id where x.employee_id=e.employee_id),'[]'::jsonb),'leave_periods',coalesce((select jsonb_agg(to_jsonb(l) order by l.starts_on) from public.employee_leave_periods l join public.employments x on x.employment_id=l.employment_id where x.employee_id=e.employee_id),'[]'::jsonb))
 from public.employees e where e.employee_id=p_employee_id and private.portal_is_authorized(auth.uid(),'OPERATIONS.READ');
$$;

revoke all on function public.portal_mcp_operational_catalog(),public.portal_mcp_preview_operational_changes(jsonb,text,text),public.portal_mcp_request_operational_approval(uuid,text),public.portal_mcp_commit_operational_changes(uuid,uuid),public.portal_mcp_get_operational_batch(uuid),public.portal_mcp_employee_profile(uuid) from public,anon;
grant execute on function public.portal_mcp_operational_catalog(),public.portal_mcp_preview_operational_changes(jsonb,text,text),public.portal_mcp_request_operational_approval(uuid,text),public.portal_mcp_commit_operational_changes(uuid,uuid),public.portal_mcp_get_operational_batch(uuid),public.portal_mcp_employee_profile(uuid) to authenticated;
