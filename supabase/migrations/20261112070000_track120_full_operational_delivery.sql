-- TRACK120 final operational delivery: extend the existing approval-bound
-- changeset to canonical configuration, enrollment, and banking tables.

create or replace function private.portal_mcp_entity_meta(p_entity text)
returns jsonb language sql immutable set search_path=public,private,pg_temp as $$
 select case p_entity
  when 'employees' then '{"table":"employees","id":"employee_id","stable":["employee_code","national_id"],"stable_mode":"ANY"}'::jsonb
  when 'employments' then '{"table":"employments","id":"employment_id","stable":["employee_id","employment_start_date"]}'::jsonb
  when 'employee_assignments' then '{"table":"employee_assignments","id":"assignment_id","stable":["employment_id","effective_from","daycare_id","role_id"]}'::jsonb
  when 'employee_certificates' then '{"table":"employee_certificates","id":"employee_certificate_id","stable":["employee_id","certificate_type_id","issued_on"]}'::jsonb
  when 'employee_pay_terms' then '{"table":"employee_pay_terms","id":"employee_pay_term_id","stable":["employee_id","valid_from"]}'::jsonb
  when 'employee_compensation_eligibility' then '{"table":"employee_compensation_eligibility","id":"employee_compensation_eligibility_id","stable":["employment_id","compensation_factor_id","effective_from"]}'::jsonb
  when 'employee_leave_periods' then '{"table":"employee_leave_periods","id":"employee_leave_period_id","stable":["employment_id","leave_type","starts_on"]}'::jsonb
  when 'payroll_records' then '{"table":"payroll_records","id":"payroll_record_id","stable":["source_record_identifier","sheet_payroll_row_id"],"stable_mode":"ANY"}'::jsonb
  when 'payroll_allocations' then '{"table":"payroll_allocations","id":"payroll_allocation_id","stable":["payroll_record_id","allocation_unit_id","role_id"]}'::jsonb
  when 'bank_allocations' then '{"table":"bank_allocations","id":"bank_allocation_id","stable":["bank_transaction_id","allocation_unit_id","budget_month"]}'::jsonb
  when 'suppliers' then '{"table":"suppliers","id":"supplier_id","stable":["supplier_code","registration_number"],"stable_mode":"ANY"}'::jsonb
  when 'payment_requests' then '{"table":"payment_requests","id":"payment_request_id","stable":["idempotency_key","invoice_number"],"stable_mode":"ANY"}'::jsonb
  when 'allocation_units' then '{"table":"allocation_units","id":"allocation_unit_id","stable":["allocation_unit_code"],"generic":true,"required":["allocation_unit_code","display_name","allocation_unit_type"],"writable":["allocation_unit_code","display_name","allocation_unit_type","legal_entity_id","lifecycle_status","display_order","notes"]}'::jsonb
  when 'roles' then '{"table":"roles","id":"role_id","stable":["role_code"],"generic":true,"required":["role_code","display_name","role_group"],"writable":["role_code","display_name","role_group","daycare_relevant","lifecycle_status","display_order","notes"]}'::jsonb
  when 'compensation_factors' then '{"table":"compensation_factors","id":"compensation_factor_id","stable":["compensation_factor_code"],"generic":true,"required":["compensation_factor_code","display_name","value_type"],"writable":["compensation_factor_code","display_name","value_type","lifecycle_status","display_order"]}'::jsonb
  when 'budget_categories' then '{"table":"budget_categories","id":"budget_category_id","stable":["budget_category_code"],"generic":true,"required":["budget_category_code","display_name","category_type"],"writable":["budget_category_code","display_name","category_type","lifecycle_status","display_order","requires_budget","budget_source","parent_budget_category_id","notes"]}'::jsonb
  when 'budget_rules' then '{"table":"budget_rules","id":"budget_rule_id","stable":["budget_category_id","effective_from","rule_type","daycare_id","allocation_unit_id"],"generic":true,"required":["budget_category_id","effective_from","rule_type"],"writable":["budget_category_id","school_year_id","calendar_year_id","daycare_id","allocation_unit_id","age_group_id","effective_from","effective_to","rule_type","numeric_value","text_value","lifecycle_status","calculation_source","actual_performance_source","contract_notes","calculation_method","parameter_1","parameter_2","show_budget","display_scope","effective_from_month_id","effective_to_month_id","standard_type","minimum_staff","rounding_method"]}'::jsonb
  when 'classrooms' then '{"table":"classrooms","id":"classroom_id","stable":["daycare_id","classroom_code","effective_from"],"generic":true,"required":["daycare_id","classroom_code","display_name","effective_from"],"writable":["daycare_id","classroom_code","display_name","is_mixed","effective_from","effective_to","lifecycle_status","display_order","licensed_capacity","notes"]}'::jsonb
  when 'monthly_enrollment' then '{"table":"monthly_enrollment","id":"monthly_enrollment_id","stable":["classroom_id","reporting_month","age_group_id"],"generic":true,"required":["classroom_id","reporting_month","age_group_id","children_count"],"writable":["classroom_id","reporting_month","age_group_id","children_count","notes"]}'::jsonb
  when 'bank_accounts' then '{"table":"bank_accounts","id":"bank_account_id","stable":["bank_account_code"],"generic":true,"required":["bank_account_code","display_name","legal_entity_id"],"writable":["bank_account_code","display_name","legal_entity_id","account_identifier_masked","lifecycle_status","display_order","source_account_number","notes"]}'::jsonb
  when 'bank_transactions' then '{"table":"bank_transactions","id":"bank_transaction_id","stable":["source_fingerprint"],"generic":true,"required":["bank_account_id","transaction_date","description","amount","source_fingerprint","import_batch_id"],"writable":["bank_account_id","transaction_date","description","reference_number","amount","source_fingerprint","source_payload","import_batch_id","debit_amount","credit_amount","sheet_transaction_id","movement_type"]}'::jsonb
  when 'accounting_statuses' then '{"table":"accounting_statuses","id":"accounting_status_id","stable":["accounting_status_code"],"generic":true,"required":["accounting_status_code","display_name"],"writable":["accounting_status_code","display_name","display_order","is_final","lifecycle_status"]}'::jsonb
 end;
$$;
revoke all on function private.portal_mcp_entity_meta(text) from public,anon,authenticated;

create or replace function private.portal_mcp_get_record_json(p_entity text,p_record_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare m jsonb:=private.portal_mcp_entity_meta(p_entity); result jsonb;
begin
 if m is null then return null; end if;
 execute format('select to_jsonb(t) from public.%I t where t.%I=$1',m->>'table',m->>'id') into result using p_record_id;
 return result;
end $$;
revoke all on function private.portal_mcp_get_record_json(text,uuid) from public,anon,authenticated;

create or replace function private.portal_mcp_match_operational_row_v2(p_row jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare e text:=p_row->>'entity'; v jsonb:=p_row->'values'; m jsonb:=private.portal_mcp_entity_meta(e); rid uuid:=nullif(p_row->>'record_id','')::uuid; found jsonb; predicate text; k text; parts text[]:='{}'; matches int;
begin
 if m is null then return p_row||jsonb_build_object('_match_conflict','UNSUPPORTED_ENTITY'); end if;
 if rid is not null then
  found:=private.portal_mcp_get_record_json(e,rid);
  if found is null then return p_row||jsonb_build_object('_match_conflict','RECORD_NOT_FOUND'); end if;
  if nullif(p_row->>'expected_row_version','') is null then return p_row||jsonb_build_object('_matched_record',found,'_match_conflict','EXPECTED_ROW_VERSION_REQUIRED'); end if;
  if (p_row->>'expected_row_version')::int<>coalesce((found->>'row_version')::int,1) then return p_row||jsonb_build_object('_matched_record',found,'_match_conflict','STALE_ROW_VERSION'); end if;
  return p_row||jsonb_build_object('_matched_record',found);
 end if;
 if coalesce((m->>'generic')::boolean,false) then
  if m->>'stable_mode'='ANY' then
   for k in select jsonb_array_elements_text(m->'stable') loop if nullif(v->>k,'') is not null then parts:=parts||format('t.%I=%L',k,v->>k); end if; end loop;
   if cardinality(parts)=0 then return p_row; end if;
   predicate:=array_to_string(parts,' or ');
  else
   for k in select jsonb_array_elements_text(m->'stable') loop
    if nullif(v->>k,'') is null then return p_row; end if;
    parts:=parts||format('t.%I is not distinct from (jsonb_populate_record(null::public.%I,$1)).%I',k,m->>'table',k);
   end loop;
   predicate:=array_to_string(parts,' and ');
  end if;
  execute format('select count(*),(jsonb_agg(to_jsonb(t))->0) from public.%I t where %s',m->>'table',predicate) into matches,found using v;
  if matches>1 then return p_row||jsonb_build_object('_match_conflict','AMBIGUOUS_STABLE_IDENTIFIERS'); end if;
  if matches=1 then return p_row||jsonb_build_object('record_id',found->>(m->>'id'),'expected_row_version',coalesce(found->'row_version','1'::jsonb),'_matched_record',found); end if;
  return p_row;
 end if;
 return private.portal_mcp_match_operational_row(p_row);
end $$;
revoke all on function private.portal_mcp_match_operational_row_v2(jsonb) from public,anon,authenticated;

create or replace function private.portal_mcp_stable_tokens(p_row jsonb)
returns text[] language plpgsql immutable set search_path=public,private,pg_temp as $$
declare m jsonb:=private.portal_mcp_entity_meta(p_row->>'entity'); v jsonb:=p_row->'values'; k text; tokens text[]:='{}'; composite text:='';
begin
 if m is null then return tokens; end if;
 if m->>'stable_mode'='ANY' then
  for k in select jsonb_array_elements_text(m->'stable') loop if nullif(v->>k,'') is not null then tokens:=tokens||format('%s|%s=%s',p_row->>'entity',k,lower(trim(v->>k))); end if; end loop;
 else
  for k in select jsonb_array_elements_text(m->'stable') loop if nullif(v->>k,'') is null then return tokens; end if; composite:=composite||'|'||k||'='||lower(trim(v->>k)); end loop;
  if composite<>'' then tokens:=tokens||((p_row->>'entity')||composite); end if;
 end if;
 return tokens;
end $$;
revoke all on function private.portal_mcp_stable_tokens(jsonb) from public,anon,authenticated;

create or replace function private.portal_mcp_row_conflicts(p_row jsonb,p_all_rows jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare m jsonb:=private.portal_mcp_entity_meta(p_row->>'entity'); v jsonb:=p_row->'values'; conflicts jsonb:='[]'::jsonb; k text; token text; duplicate_count int;
begin
 if p_row?'_match_conflict' then conflicts:=conflicts||jsonb_build_array(p_row->>'_match_conflict'); end if;
 if nullif(p_row->>'record_id','') is null and m?'required' then
  for k in select jsonb_array_elements_text(m->'required') loop if not(v?k) or v->k='null'::jsonb or (jsonb_typeof(v->k)='string' and trim(v->>k)='') then conflicts:=conflicts||jsonb_build_array('REQUIRED_FIELD:'||k); end if; end loop;
 end if;
 for token in select unnest(private.portal_mcp_stable_tokens(p_row)) loop
  select count(*) into duplicate_count from jsonb_array_elements(p_all_rows) x where token=any(private.portal_mcp_stable_tokens(x));
  if duplicate_count>1 then conflicts:=conflicts||jsonb_build_array('DUPLICATE_IN_BATCH:'||token); end if;
 end loop;
 return (select coalesce(jsonb_agg(distinct value),'[]'::jsonb) from jsonb_array_elements(conflicts));
end $$;
revoke all on function private.portal_mcp_row_conflicts(jsonb,jsonb) from public,anon,authenticated;

create or replace function public.portal_mcp_preview_operational_changes(p_rows jsonb,p_source_name text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare actor uuid:=auth.uid(); b public.mcp_ingestion_batches; preview jsonb:='[]'::jsonb; digest_value text; staged_rows jsonb; r jsonb; conflicts jsonb; n int:=0; operation text;
begin
 if not private.portal_is_authorized(actor,'OPERATIONS.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 100 then raise exception 'Rows must contain 1..100 records' using errcode='22023'; end if;
 if length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'Invalid idempotency key' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r0 where jsonb_typeof(r0)<>'object' or private.portal_mcp_entity_meta(r0->>'entity') is null or jsonb_typeof(r0->'values')<>'object') then raise exception 'Unsupported entity or invalid row' using errcode='22023'; end if;
 select jsonb_agg(private.portal_mcp_match_operational_row_v2(r0) order by ord) into staged_rows from jsonb_array_elements(p_rows) with ordinality x(r0,ord);
 for r in select value from jsonb_array_elements(staged_rows) loop
  n:=n+1; conflicts:=private.portal_mcp_row_conflicts(r,staged_rows);
  operation:=case when jsonb_array_length(conflicts)>0 then 'CONFLICT' when nullif(r->>'record_id','') is null then 'CREATE' when (r->'_matched_record') @> (r->'values') then 'SKIP' else 'UPDATE' end;
  preview:=preview||jsonb_build_array(jsonb_build_object('source_row',n,'entity',r->>'entity','record_id',r->>'record_id','expected_row_version',r->'expected_row_version','operation',operation,'status',case when jsonb_array_length(conflicts)>0 then 'CONFLICT' else 'READY' end,'conflicts',conflicts));
 end loop;
 digest_value:=encode(digest(staged_rows::text,'sha256'),'hex');
 insert into public.mcp_ingestion_batches(actor_user_id,domain,idempotency_key,source_name,rows,preview,status,preview_digest)
 values(actor,'OPERATIONS',trim(p_idempotency_key),left(coalesce(nullif(trim(p_source_name),''),'ChatGPT'),120),staged_rows,preview,case when exists(select 1 from jsonb_array_elements(preview) x where x->>'status'='CONFLICT') then 'CONFLICTS' else 'READY' end,digest_value)
 on conflict(actor_user_id,domain,idempotency_key) do update set source_name=excluded.source_name where public.mcp_ingestion_batches.rows=excluded.rows returning * into b;
 if b.batch_id is null then raise exception 'Idempotency key already used with different rows' using errcode='23505'; end if;
 return jsonb_build_object('batch_id',b.batch_id,'status',b.status,'row_version',b.row_version,'preview_digest',b.preview_digest,'preview',b.preview,'canonical_writes',false);
end $$;

create or replace function private.portal_mcp_apply_generic_row(p_row jsonb)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare m jsonb:=private.portal_mcp_entity_meta(p_row->>'entity'); v jsonb:=p_row->'values'; rid uuid:=nullif(p_row->>'record_id','')::uuid; expected int:=nullif(p_row->>'expected_row_version','')::int; cols text[]; col text; col_list text; select_list text; set_list text; result jsonb; has_created boolean; has_updated boolean;
begin
 if m is null or not coalesce((m->>'generic')::boolean,false) then raise exception 'Unsupported generic entity'; end if;
 select array_agg(key order by key) into cols from jsonb_object_keys(v) key where key in(select jsonb_array_elements_text(m->'writable'));
 if cols is null or exists(select 1 from jsonb_object_keys(v) key where key not in(select jsonb_array_elements_text(m->'writable'))) then raise exception 'Unsupported or empty field set' using errcode='22023'; end if;
 select exists(select 1 from information_schema.columns where table_schema='public' and table_name=m->>'table' and column_name='created_by_user_id'),exists(select 1 from information_schema.columns where table_schema='public' and table_name=m->>'table' and column_name='updated_by_user_id') into has_created,has_updated;
 select string_agg(format('%I',c),','),string_agg(format('x.%I',c),','),string_agg(format('%I=x.%I',c,c),',') into col_list,select_list,set_list from unnest(cols)c;
 if rid is null then
  if has_created then col_list:=col_list||',created_by_user_id';select_list:=select_list||',auth.uid()';end if;
  if has_updated then col_list:=col_list||',updated_by_user_id';select_list:=select_list||',auth.uid()';end if;
  execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1) x returning to_jsonb(%I.*)',m->>'table',col_list,select_list,m->>'table',m->>'table') into result using v;
 else
  if has_updated then set_list:=set_list||',updated_by_user_id=auth.uid()';end if;
  execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) x where t.%I=$2 and t.row_version=$3 returning to_jsonb(t.*)',m->>'table',set_list,m->>'table',m->>'id') into result using v,rid,expected;
 end if;
 if result is null then raise exception 'Concurrent update or missing record' using errcode='40001'; end if;
 return result;
end $$;
revoke all on function private.portal_mcp_apply_generic_row(jsonb) from public,anon,authenticated;

create or replace function private.portal_mcp_apply_operational_row_v2(p_row jsonb)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
begin
 if coalesce((private.portal_mcp_entity_meta(p_row->>'entity')->>'generic')::boolean,false) then return private.portal_mcp_apply_generic_row(p_row); end if;
 return private.portal_mcp_apply_operational_row(p_row);
end $$;
revoke all on function private.portal_mcp_apply_operational_row_v2(jsonb) from public,anon,authenticated;

create or replace function public.portal_mcp_commit_operational_changes(p_batch_id uuid,p_approval_id uuid)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.mcp_ingestion_batches; r jsonb; current_row jsonb; item jsonb; results jsonb:='[]'::jsonb; approval jsonb; entity_id uuid; record_version int;
begin
 select * into b from public.mcp_ingestion_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.batch_id is null or b.domain<>'OPERATIONS' or b.status<>'READY' or b.approval_id is distinct from p_approval_id then raise exception 'Batch approval mismatch' using errcode='22023'; end if;
 approval:=public.portal_consume_approval(p_approval_id,'OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,jsonb_build_object('batch_id',b.batch_id,'row_version',b.row_version,'preview_digest',b.preview_digest));
 for r in select value from jsonb_array_elements(b.rows) loop
  if nullif(r->>'record_id','') is not null then
   current_row:=private.portal_mcp_get_record_json(r->>'entity',(r->>'record_id')::uuid);
   if current_row is null or (current_row->>'row_version')::int<>(r->>'expected_row_version')::int then raise exception 'Concurrent update rejected for %',r->>'entity' using errcode='40001'; end if;
  end if;
  item:=private.portal_mcp_apply_operational_row_v2(r); results:=results||jsonb_build_array(jsonb_build_object('entity',r->>'entity','record',item));
  entity_id:=nullif(coalesce(item->>coalesce(private.portal_mcp_entity_meta(r->>'entity')->>'id','id'),r->>'record_id'),'')::uuid;
  record_version:=coalesce((item->>'row_version')::int,1);
  insert into public.audit_events(entity_type,entity_id,operation,actor_user_id,old_values,new_values,source_type,occurred_at)
  values(upper(r->>'entity'),entity_id,case when nullif(r->>'record_id','') is null then 'MCP_CREATE' else 'MCP_UPDATE' end,auth.uid(),r->'_matched_record',(item-'created_by_user_id'-'updated_by_user_id')||jsonb_build_object('_mcp_batch_id',b.batch_id,'row_version',record_version),'MCP',now());
 end loop;
 update public.mcp_ingestion_batches set status='COMMITTED',committed_at=now(),commit_result=jsonb_build_object('atomic',true,'verified',true,'records',results,'approval',approval),row_version=row_version+1 where batch_id=b.batch_id;
 insert into public.portal_authorization_audit(actor_user_id,action_code,resource_type,resource_id,decision,approval_id,detail) values(auth.uid(),'OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,'SUCCESS',p_approval_id,jsonb_build_object('records',jsonb_array_length(results)));
 return jsonb_build_object('batch_id',b.batch_id,'status','COMMITTED','atomic',true,'verified',true,'records',results,'approval',approval);
end $$;

create or replace function public.portal_mcp_search_records(p_entity text,p_search text default null,p_limit int default 25,p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare m jsonb:=private.portal_mcp_entity_meta(p_entity); rows jsonb; total int;
begin
 if not private.portal_is_authorized(auth.uid(),'OPERATIONS.READ') then raise exception 'Not authorized' using errcode='42501'; end if;
 if m is null or p_limit not between 1 and 100 or p_offset<0 then raise exception 'Invalid search' using errcode='22023'; end if;
 execute format('select count(*) from public.%I t where $1 is null or to_jsonb(t)::text ilike ''%%''||$1||''%%''',m->>'table') into total using nullif(trim(p_search),'');
 execute format('select coalesce(jsonb_agg(to_jsonb(q)),''[]''::jsonb) from (select t.* from public.%I t where $1 is null or to_jsonb(t)::text ilike ''%%''||$1||''%%'' order by t.%I limit $2 offset $3) q',m->>'table',m->>'id') into rows using nullif(trim(p_search),''),p_limit,p_offset;
 return jsonb_build_object('entity',p_entity,'total',total,'limit',p_limit,'offset',p_offset,'rows',rows);
end $$;

create or replace function public.portal_mcp_get_record(p_entity text,p_record_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare result jsonb;
begin
 if not private.portal_is_authorized(auth.uid(),'OPERATIONS.READ') then raise exception 'Not authorized' using errcode='42501'; end if;
 result:=private.portal_mcp_get_record_json(p_entity,p_record_id);
 if result is null then raise exception 'Record not found' using errcode='P0002'; end if;
 return jsonb_build_object('entity',p_entity,'record',result);
end $$;

create or replace function public.portal_mcp_operational_report()
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare e text; m jsonb; n bigint; counts jsonb='{}'::jsonb;
begin
 if not private.portal_is_authorized(auth.uid(),'OPERATIONS.READ') then raise exception 'Not authorized' using errcode='42501'; end if;
 for e in select unnest(array['employees','employments','employee_assignments','employee_certificates','employee_pay_terms','employee_compensation_eligibility','employee_leave_periods','payroll_records','payroll_allocations','bank_accounts','bank_transactions','bank_allocations','suppliers','payment_requests','allocation_units','roles','compensation_factors','budget_categories','budget_rules','classrooms','monthly_enrollment','accounting_statuses']) loop
  m:=private.portal_mcp_entity_meta(e); execute format('select count(*) from public.%I',m->>'table') into n; counts:=counts||jsonb_build_object(e,n);
 end loop;
 return jsonb_build_object('counts',counts,'generated_at',now(),'unsupported',jsonb_build_array('person_level_children','parent_billing','collection_receipts'));
end $$;

create or replace function public.portal_mcp_operational_catalog()
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare e text; m jsonb; entities jsonb='[]'::jsonb;
begin
 if not private.portal_is_authorized(auth.uid(),'OPERATIONS.READ') then return null; end if;
 for e in select unnest(array['employees','employments','employee_assignments','employee_certificates','employee_pay_terms','employee_compensation_eligibility','employee_leave_periods','payroll_records','payroll_allocations','bank_allocations','suppliers','payment_requests','allocation_units','roles','compensation_factors','budget_categories','budget_rules','classrooms','monthly_enrollment','bank_accounts','bank_transactions','accounting_statuses']) loop
  m:=private.portal_mcp_entity_meta(e); entities:=entities||jsonb_build_array(jsonb_build_object('entity',e,'id',m->>'id','stable_keys',coalesce(m->'stable','[]'::jsonb),'writable',coalesce(m->'writable',to_jsonb('specialized'::text)),'required_on_create',coalesce(m->'required','[]'::jsonb),'approval_required',true));
 end loop;
 return jsonb_build_object('entities',entities,'row_contract',jsonb_build_object('entity','catalog entity','record_id','UUID for corrections','expected_row_version','required for corrections','values','canonical field/value object'),'limits',jsonb_build_object('rows_per_batch',100,'approval_minutes',10),'unsupported',jsonb_build_array('person_level_children','parent_billing','collection_receipts'));
end $$;

revoke all on function public.portal_mcp_search_records(text,text,int,int),public.portal_mcp_get_record(text,uuid),public.portal_mcp_operational_report() from public,anon;
grant execute on function public.portal_mcp_search_records(text,text,int,int),public.portal_mcp_get_record(text,uuid),public.portal_mcp_operational_report() to authenticated;

revoke all on function public.portal_mcp_preview_operational_changes(jsonb,text,text),public.portal_mcp_commit_operational_changes(uuid,uuid),public.portal_mcp_operational_catalog() from public,anon;
grant execute on function public.portal_mcp_preview_operational_changes(jsonb,text,text),public.portal_mcp_commit_operational_changes(uuid,uuid),public.portal_mcp_operational_catalog() to authenticated;
