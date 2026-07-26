-- TASK024C: reconcile the remaining clean-build drift against read-only Production.

create or replace function public.enforce_legacy_accounting_status_read_only()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if tg_op = 'INSERT' and new.accounting_status is not null then
    raise exception 'bank_allocations.accounting_status is read-only; write accounting_status_id';
  end if;
  if tg_op = 'UPDATE' and new.accounting_status is distinct from old.accounting_status then
    raise exception 'bank_allocations.accounting_status is read-only; write accounting_status_id';
  end if;
  return new;
end;
$function$;

create or replace function public.portal_effective_permission(target_user_id uuid, target_screen_code text)
returns public.portal_permission_level
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare result public.portal_permission_level;
begin
 if exists(select 1 from public.portal_user_profiles where user_id=target_user_id and is_active and is_super_admin) then return 'EDIT'; end if;
 if not exists(select 1 from public.portal_user_profiles where user_id=target_user_id and is_active) then return 'HIDDEN'; end if;
 if not exists(select 1 from public.portal_sections where screen_code=target_screen_code and is_active) then return 'HIDDEN'; end if;
 select permission.permission_level into result
 from public.portal_user_permissions permission
 join public.portal_user_profiles profile on profile.user_id=permission.user_id and profile.permission_configuration_id=permission.permission_configuration_id
 where permission.user_id=target_user_id and permission.screen_code=target_screen_code;
 return coalesce(result,'HIDDEN'::public.portal_permission_level);
end $function$;

create or replace function public.portal_has_permission(
  target_user_id uuid,
  target_screen_code text,
  required_level public.portal_permission_level default 'VIEW'::public.portal_permission_level
)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
 select case required_level
 when 'EDIT' then public.portal_effective_permission(target_user_id,target_screen_code)='EDIT'
 when 'VIEW' then public.portal_effective_permission(target_user_id,target_screen_code) in ('VIEW','EDIT')
 else public.portal_effective_permission(target_user_id,target_screen_code) in ('HIDDEN','VIEW','EDIT') end
$function$;

create or replace function public.portal_save_bank_allocations(
  target_bank_transaction_id uuid,
  allocation_rows jsonb,
  actor_id uuid
)
returns setof public.bank_allocations
language plpgsql
set search_path to 'public'
as $function$
declare
  transaction_amount numeric(14,2);
  allocation_total numeric(14,2);
begin
  select amount into transaction_amount from public.bank_transactions
  where bank_transaction_id = target_bank_transaction_id for update;
  if not found then raise exception 'Bank transaction not found'; end if;
  select coalesce(sum((row_value->>'allocation_amount')::numeric), 0)
  into allocation_total
  from jsonb_array_elements(coalesce(allocation_rows, '[]'::jsonb)) row_value;
  if abs(allocation_total - transaction_amount) > 0.01 then
    raise exception 'Bank allocations must reconcile to the parent amount';
  end if;
  delete from public.bank_allocations where bank_transaction_id = target_bank_transaction_id;
  return query
  insert into public.bank_allocations (
    bank_transaction_id, movement_type, allocation_unit_id, daycare_id,
    budget_category_id, budget_month, accounting_status_id,
    notes, allocation_amount, created_by_user_id, updated_by_user_id
  )
  select target_bank_transaction_id,
    nullif(row_value->>'movement_type', ''),
    nullif(row_value->>'allocation_unit_id', '')::uuid,
    nullif(row_value->>'daycare_id', '')::uuid,
    nullif(row_value->>'budget_category_id', '')::uuid,
    nullif(row_value->>'budget_month', '')::date,
    nullif(row_value->>'accounting_status_id', '')::uuid,
    nullif(btrim(row_value->>'notes'), ''),
    (row_value->>'allocation_amount')::numeric,
    actor_id, actor_id
  from jsonb_array_elements(coalesce(allocation_rows, '[]'::jsonb)) row_value
  returning *;
end;
$function$;

create or replace function public.portal_open_payroll_month(target_month date, opening_method text, actor_id uuid)
returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$ declare inserted_rows integer:=0; previous_month date:=(target_month-interval '1 month')::date; target_month_id uuid; begin
if actor_id is null or target_month is null or target_month<>date_trunc('month',target_month)::date then raise exception 'Valid actor and payroll month are required.'; end if;
if opening_method not in ('PREVIOUS_MONTH','ACTIVE_EMPLOYEES','EMPTY') then raise exception 'Unsupported payroll month opening method.'; end if;
if exists(select 1 from public.payroll_months where payroll_month=target_month) or exists(select 1 from public.payroll_records where payroll_month=target_month) then raise exception 'Payroll month already exists.'; end if;
insert into public.payroll_months(payroll_month,month_status,opening_method,opened_by_user_id) values(target_month,'CURRENT',opening_method,actor_id) returning payroll_month_id into target_month_id;
if opening_method='PREVIOUS_MONTH' then
insert into public.payroll_records(employment_id,payroll_month,source_employee_identifier,source_record_identifier,employer_cost,source_payload,import_batch_id,employee_match_status,record_origin,allocation_unit_id,daycare_id,role_id,employee_pay_term_id,created_by_user_id,updated_by_user_id)
select prior.employment_id,target_month,prior.source_employee_identifier,gen_random_uuid()::text,null,'{}'::jsonb,null,prior.employee_match_status,'MONTH_OPEN',prior.allocation_unit_id,prior.daycare_id,prior.role_id,(select term.employee_pay_term_id from public.employee_pay_terms term join public.employments employment on employment.employee_id=term.employee_id where employment.employment_id=prior.employment_id and term.valid_from<=target_month and(term.valid_to is null or term.valid_to>=target_month) order by term.valid_from desc limit 1),actor_id,actor_id from public.payroll_records prior where prior.payroll_month=(target_month-interval '1 month')::date;
get diagnostics inserted_rows=row_count;
elsif opening_method='ACTIVE_EMPLOYEES' then
insert into public.payroll_records(employment_id,payroll_month,source_employee_identifier,source_record_identifier,employer_cost,source_payload,import_batch_id,employee_match_status,record_origin,allocation_unit_id,daycare_id,role_id,employee_pay_term_id,created_by_user_id,updated_by_user_id)
select employment.employment_id,target_month,employee.employee_code,gen_random_uuid()::text,null,'{}'::jsonb,null,'LINKED','MONTH_OPEN',assignment.allocation_unit_id,assignment.daycare_id,assignment.role_id,pay_term.employee_pay_term_id,actor_id,actor_id
from public.employees employee join public.employments employment on employment.employee_id=employee.employee_id and employment.employment_status='ACTIVE' and employment.employment_start_date<=(target_month+interval '1 month - 1 day')::date and(employment.employment_end_date is null or employment.employment_end_date>=target_month)
left join lateral(select candidate.allocation_unit_id,candidate.daycare_id,candidate.role_id from public.employee_assignments candidate where candidate.employment_id=employment.employment_id and candidate.effective_from<=(target_month+interval '1 month - 1 day')::date and(candidate.effective_to is null or candidate.effective_to>=target_month) order by candidate.is_primary desc,candidate.effective_from desc limit 1) assignment on true
left join lateral(select candidate.employee_pay_term_id from public.employee_pay_terms candidate where candidate.employee_id=employee.employee_id and candidate.valid_from<=target_month and(candidate.valid_to is null or candidate.valid_to>=target_month) order by candidate.valid_from desc limit 1) pay_term on true where employee.lifecycle_status='ACTIVE';
get diagnostics inserted_rows=row_count; end if;
insert into public.audit_events(entity_type,entity_id,operation,previous_values,new_values,source_type,actor_user_id) values('payroll_months',target_month_id,'INSERT',null,jsonb_build_object('payroll_month',target_month,'opening_method',opening_method,'inserted_rows',inserted_rows),'PORTAL_ADMIN',actor_id);
return jsonb_build_object('payroll_month',target_month,'month_status','CURRENT','opening_method',opening_method,'inserted_rows',inserted_rows); end $function$;

create or replace function public.portal_close_payroll_month(target_month date, actor_id uuid, closing_notes text default null::text)
returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$ declare invalid_count integer; unresolved_count integer; target_month_id uuid; begin
select count(*) into invalid_count from public.payroll_records where payroll_month=target_month and(nullif(btrim(source_employee_identifier),'') is null or employer_cost is null or employer_cost<0 or allocation_unit_id is null or role_id is null or exists(select 1 from public.allocation_units unit where unit.allocation_unit_id=payroll_records.allocation_unit_id and unit.allocation_unit_type='DAYCARE' and payroll_records.daycare_id is null));
select count(*) into unresolved_count from public.payroll_records where payroll_month=target_month and employee_match_status in('MISSING','UNRESOLVED');
if invalid_count>0 or unresolved_count>0 then raise exception 'Month has % invalid rows and % unresolved employees.',invalid_count,unresolved_count; end if;
update public.payroll_allocations allocation set allocation_status='FINALIZED',updated_by_user_id=actor_id from public.payroll_records record where record.payroll_record_id=allocation.payroll_record_id and record.payroll_month=target_month;
update public.payroll_months set month_status='CLOSED',closed_by_user_id=actor_id,closed_at=timezone('utc',now()),close_notes=nullif(btrim(closing_notes),''),reopened_by_user_id=null,reopened_at=null where payroll_month=target_month and month_status='CURRENT' returning payroll_month_id into target_month_id;
if target_month_id is null then raise exception 'Current payroll month was not found.'; end if;
insert into public.audit_events(entity_type,entity_id,operation,previous_values,new_values,source_type,actor_user_id) values('payroll_months',target_month_id,'STATUS_CHANGE',jsonb_build_object('month_status','CURRENT'),jsonb_build_object('month_status','CLOSED'),'PORTAL_ADMIN',actor_id);
return jsonb_build_object('payroll_month',target_month,'month_status','CLOSED'); end $function$;

create or replace function public.portal_reopen_payroll_month(target_month date, actor_id uuid, reopening_notes text)
returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$ declare target_month_id uuid; begin
if nullif(btrim(reopening_notes),'') is null then raise exception 'Reopening notes are required.'; end if;
update public.payroll_months set month_status='CURRENT',closed_by_user_id=null,closed_at=null,reopened_by_user_id=actor_id,reopened_at=timezone('utc',now()),close_notes=reopening_notes where payroll_month=target_month and month_status='CLOSED' returning payroll_month_id into target_month_id;
if target_month_id is null then raise exception 'Closed payroll month was not found.'; end if;
update public.payroll_allocations allocation set allocation_status='DRAFT',updated_by_user_id=actor_id from public.payroll_records record where record.payroll_record_id=allocation.payroll_record_id and record.payroll_month=target_month;
insert into public.audit_events(entity_type,entity_id,operation,previous_values,new_values,source_type,actor_user_id) values('payroll_months',target_month_id,'STATUS_CHANGE',jsonb_build_object('month_status','CLOSED'),jsonb_build_object('month_status','CURRENT','notes',reopening_notes),'PORTAL_ADMIN',actor_id);
return jsonb_build_object('payroll_month',target_month,'month_status','CURRENT'); end $function$;

create or replace function public.portal_guard_closed_payroll_month()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$ declare affected_month date; begin
if tg_table_name='payroll_records' then affected_month:=case when tg_op='DELETE' then old.payroll_month else new.payroll_month end; else select record.payroll_month into affected_month from public.payroll_records record where record.payroll_record_id=case when tg_op='DELETE' then old.payroll_record_id else new.payroll_record_id end; end if;
if exists(select 1 from public.payroll_months where payroll_month=affected_month and month_status='CLOSED') then raise exception 'Closed payroll months are read-only.'; end if;
if tg_op='DELETE' then return old; end if; return new; end $function$;

create or replace function public.portal_version_employee_pay_term(target_employee_id uuid, effective_from date, term_values jsonb, actor_id uuid)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$ declare previous_term public.employee_pay_terms; next_term public.employee_pay_terms; saved_term public.employee_pay_terms; begin if target_employee_id is null or effective_from is null or actor_id is null or jsonb_typeof(term_values)<>'object' then raise exception 'Employee, effective date and pay terms are required'; end if; perform 1 from public.employees where employee_id=target_employee_id for update; if not found then raise exception 'Employee not found'; end if; select * into previous_term from public.employee_pay_terms where employee_id=target_employee_id and valid_from<=effective_from and (valid_to is null or valid_to>=effective_from) order by valid_from desc limit 1 for update; if previous_term.employee_pay_term_id is not null and previous_term.valid_from=effective_from then raise exception 'A pay-term version already starts on this date'; end if; if previous_term.employee_pay_term_id is not null then update public.employee_pay_terms set valid_to=effective_from-1,updated_by_user_id=actor_id where employee_pay_term_id=previous_term.employee_pay_term_id; end if; select * into next_term from public.employee_pay_terms where employee_id=target_employee_id and valid_from>effective_from order by valid_from limit 1 for update; if nullif(term_values->>'valid_to','')::date is not null and next_term.employee_pay_term_id is not null and nullif(term_values->>'valid_to','')::date>=next_term.valid_from then raise exception 'Pay-term version overlaps the next future version'; end if; insert into public.employee_pay_terms(employee_id,valid_from,valid_to,pay_type,base_pay,estimated_employment_percentage,notes,created_by_user_id,updated_by_user_id) values(target_employee_id,effective_from,coalesce(nullif(term_values->>'valid_to','')::date,next_term.valid_from-1),nullif(term_values->>'pay_type',''),nullif(term_values->>'base_pay','')::numeric,nullif(term_values->>'estimated_employment_percentage','')::numeric,nullif(term_values->>'notes',''),actor_id,actor_id) returning * into saved_term; insert into public.audit_events(entity_type,entity_id,operation,previous_values,new_values,source_type,actor_user_id) values('employee_pay_terms',saved_term.employee_pay_term_id,'VERSION',case when previous_term.employee_pay_term_id is null then null else to_jsonb(previous_term) end,to_jsonb(saved_term),'PORTAL_ADMIN',actor_id); return to_jsonb(saved_term); end; $function$;

drop index if exists public.payroll_records_employee_month_lookup_idx;
create index payroll_records_employee_month_lookup_idx
  on public.payroll_records using btree (payroll_month, source_employee_identifier);

insert into public.school_years (
  school_year_id, sheet_school_year_id, school_year_code, display_name,
  start_date, end_date, status, is_default, website_visibility,
  is_selectable, configuration_review_status, created_at, updated_at, row_version
) values (
  'c9ccbcd3-2810-43dd-9b9d-677e099ff4db',
  'SY-2026-2027', 'SY-2026-2027', 'תשפ״ז',
  date '2026-09-01', date '2027-08-31', 'ACTIVE', true, 'HIDDEN',
  true, 'NOT_REVIEWED',
  timestamptz '2026-07-15 04:04:57.268435+00',
  timestamptz '2026-07-15 04:04:57.268435+00', 1
)
on conflict (school_year_code) do nothing;

insert into public.accounting_statuses (
  accounting_status_id, sheet_accounting_status_id, accounting_status_code,
  display_name, display_order, is_final, lifecycle_status,
  created_at, updated_at, row_version
) values
  ('12a724aa-0268-47b4-a911-a5cc37a84be0','ACC-APPROVED','ACC-APPROVED','אושר ע״י הנה״ח',50,true,'ACTIVE','2026-07-15 04:05:30.779437+00','2026-07-25 19:36:30.040558+00',2),
  ('b09aadc9-52f9-496f-a994-18a58bfb22ad','ACC-MISSING-DOCS','ACC-MISSING-DOCS','חסרים מסמכים',10,false,'ACTIVE','2026-07-15 04:05:30.779437+00','2026-07-25 19:36:30.040558+00',2),
  ('7fff1ea8-10c8-4dac-8837-2734b3131dc8','ACC-NO-SEND','ACC-NO-SEND','אין צורך לשלוח',40,true,'ACTIVE','2026-07-15 04:05:30.779437+00','2026-07-25 19:36:30.040558+00',2),
  ('be1cdd76-2806-4a2e-a6c3-20fb0652eb6e','ACC-SENT','ACC-SENT','נשלח להנה״ח',30,false,'ACTIVE','2026-07-15 04:05:30.779437+00','2026-07-25 19:36:30.040558+00',2),
  ('42342399-335a-4215-a961-c4db0b6cab07','ACC-WAITING','ACC-WAITING','ממתין לשליחה',20,false,'ACTIVE','2026-07-15 04:05:30.779437+00','2026-07-25 19:36:30.040558+00',2)
on conflict (accounting_status_code) do nothing;

insert into public.staffing_rules (
  staffing_rule_id, sheet_staffing_rule_id, school_year_id, standard_type,
  age_group, children_per_staff, minimum_staff, rounding_method,
  lifecycle_status, notes, created_at, updated_at, row_version
) values
  ('128873dc-26ea-4322-b8ce-013c2488b892','SR-2026-BASIC-GRADUATE','c9ccbcd3-2810-43dd-9b9d-677e099ff4db','BASIC','GRADUATE',11,null,'CEIL_PER_AGE_GROUP','ACTIVE',null,'2026-07-16 18:55:55.960652+00','2026-07-16 18:55:55.960652+00',1),
  ('5b84a390-70bd-46c8-b427-f059c295a699','SR-2026-BASIC-INFANT','c9ccbcd3-2810-43dd-9b9d-677e099ff4db','BASIC','INFANT',6,null,'CEIL_PER_AGE_GROUP','ACTIVE',null,'2026-07-16 18:55:55.960652+00','2026-07-16 18:55:55.960652+00',1),
  ('b7f90398-70e7-449b-98b2-9310672091d1','SR-2026-BASIC-TODDLER','c9ccbcd3-2810-43dd-9b9d-677e099ff4db','BASIC','TODDLER',9,null,'CEIL_PER_AGE_GROUP','ACTIVE',null,'2026-07-16 18:55:55.960652+00','2026-07-16 18:55:55.960652+00',1),
  ('7a537caf-91f3-4650-87a1-961cef545291','SR-2026-EXT-GRADUATE','c9ccbcd3-2810-43dd-9b9d-677e099ff4db','EXTENDED','GRADUATE',10,null,'CEIL_PER_AGE_GROUP','ACTIVE',null,'2026-07-16 18:55:55.960652+00','2026-07-16 18:55:55.960652+00',1),
  ('437aa15d-2336-4a7f-b821-390b119fe6a6','SR-2026-EXT-INFANT','c9ccbcd3-2810-43dd-9b9d-677e099ff4db','EXTENDED','INFANT',5,null,'CEIL_PER_AGE_GROUP','ACTIVE',null,'2026-07-16 18:55:55.960652+00','2026-07-16 18:55:55.960652+00',1),
  ('435ec0bf-edc5-4d86-9cd8-fb253f2a3ac3','SR-2026-EXT-TODDLER','c9ccbcd3-2810-43dd-9b9d-677e099ff4db','EXTENDED','TODDLER',8,null,'CEIL_PER_AGE_GROUP','ACTIVE',null,'2026-07-16 18:55:55.960652+00','2026-07-16 18:55:55.960652+00',1)
on conflict (sheet_staffing_rule_id) do nothing;

insert into public.travel_rates (
  travel_rate_id, sheet_travel_rate_id, school_year_id,
  daily_travel_amount, maximum_monthly_travel_amount, lifecycle_status,
  notes, created_at, updated_at, row_version
) values (
  '441a61de-1ebf-4ce9-a80d-327726ac8c1a',
  'TRAVEL-2026-2027',
  'c9ccbcd3-2810-43dd-9b9d-677e099ff4db',
  16, 69.5, 'ACTIVE',
  'משלמים את הנמוך מבין ימי העבודה בפועל כפול התעריף היומי לבין הסכום החודשי המרבי.',
  '2026-07-22 10:38:56.492777+00',
  '2026-07-22 10:38:56.492777+00', 1
)
on conflict (school_year_id) do nothing;
