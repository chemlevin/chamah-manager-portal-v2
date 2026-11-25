-- CHAMAH-RULES-AND-CONTEXTS-END-TO-END-001
-- One Director-governed registry for rule definitions, applicability, resolution,
-- implementation truth and traceable calculation results.

alter table public.calculation_rules
  add column rule_key uuid not null default gen_random_uuid(),
  add column instruction text,
  add column handler_code text,
  add column implementation_status text not null default 'STORED_ONLY',
  add column enforcement_status text not null default 'NOT_ENFORCED',
  add column previous_version_id uuid references public.calculation_rules(calculation_rule_id) on delete restrict,
  add column approval_id uuid references public.portal_action_approvals(approval_id) on delete restrict,
  add column approved_at timestamptz;

update public.calculation_rules set instruction=display_name where instruction is null;
alter table public.calculation_rules alter column instruction set not null;
alter table public.calculation_rules
  add constraint calculation_rules_instruction_nonempty check (length(trim(instruction)) > 0),
  add constraint calculation_rules_implementation_status_check check (implementation_status in ('STORED_ONLY','IMPLEMENTED')),
  add constraint calculation_rules_enforcement_status_check check (enforcement_status in ('NOT_ENFORCED','ENFORCED')),
  add constraint calculation_rules_implementation_truth_check check (
    (implementation_status='STORED_ONLY' and enforcement_status='NOT_ENFORCED' and handler_code is null)
    or (implementation_status='IMPLEMENTED' and handler_code is not null)
  ),
  add constraint calculation_rules_approval_binding_check check (
    lifecycle_status <> 'ACTIVE' or (approval_id is not null and approved_at is not null)
  ),
  add constraint calculation_rules_previous_not_self check (previous_version_id is null or previous_version_id <> calculation_rule_id),
  add constraint calculation_rules_rule_key_version_uq unique (rule_key,version);

alter table public.calculation_rules drop constraint calculation_rules_rule_type_check;
alter table public.calculation_rules add constraint calculation_rules_rule_type_check check (rule_type in (
  'OPERATIONAL_PROCEDURE','VALIDATION','CLASSIFICATION','DEPENDENCY',
  'STAFFING_RATIO','STAFFING_ROUNDING','FIXED_ROLE','BUDGET_FORMULA','BUDGET_PARAMETER'
));

alter table public.calculation_rule_contexts
  drop constraint calculation_rule_contexts_calculation_rule_id_context_kind_key,
  add column applicability_group integer not null default 1 check (applicability_group > 0);

create unique index calculation_rule_contexts_group_kind_uq
  on public.calculation_rule_contexts(calculation_rule_id,applicability_group,context_kind);
create index calculation_rule_contexts_resolution_idx
  on public.calculation_rule_contexts(calculation_rule_id,applicability_group,context_kind);

create table public.calculation_rule_handlers (
  handler_code text primary key check (handler_code ~ '^[A-Z][A-Z0-9_]*_V[0-9]+$'),
  rule_type text not null,
  contract_version integer not null check (contract_version > 0),
  implementation_status text not null check (implementation_status in ('IMPLEMENTED','RETIRED')),
  enforcement_status text not null check (enforcement_status in ('ENFORCED','NOT_ENFORCED')),
  operation_code text not null,
  input_contract jsonb not null check (jsonb_typeof(input_contract)='object'),
  output_contract jsonb not null check (jsonb_typeof(output_contract)='object'),
  created_at timestamptz not null default now(),
  check (implementation_status='IMPLEMENTED' or enforcement_status='NOT_ENFORCED')
);

insert into public.calculation_rule_handlers(
  handler_code,rule_type,contract_version,implementation_status,enforcement_status,operation_code,input_contract,output_contract
) values
 ('STAFFING_RATIO_V1','STAFFING_RATIO',1,'IMPLEMENTED','ENFORCED','CALCULATE_STAFFING',
  '{"required":["children_count"],"source_evidence_required":true}'::jsonb,
  '{"fields":["required_staff"]}'::jsonb),
 ('BUDGET_PARAMETER_V1','BUDGET_PARAMETER',1,'IMPLEMENTED','ENFORCED','CALCULATE_BUDGET',
  '{"required":["quantity"],"source_evidence_required":true}'::jsonb,
  '{"fields":["budget_amount"]}'::jsonb)
on conflict (handler_code) do update set
 rule_type=excluded.rule_type,contract_version=excluded.contract_version,
 implementation_status=excluded.implementation_status,enforcement_status=excluded.enforcement_status,
 operation_code=excluded.operation_code,input_contract=excluded.input_contract,output_contract=excluded.output_contract;

create table public.calculation_rule_change_batches (
  batch_id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null check (length(idempotency_key) between 8 and 160),
  operation text not null check (operation in ('CREATE','REPLACE')),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  payload_digest text not null check (payload_digest ~ '^[0-9a-f]{64}$'),
  expected_version integer,
  status text not null default 'PREVIEWED' check (status in ('PREVIEWED','APPROVED','COMMITTED','CONFLICT')),
  conflict_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(conflict_evidence)='array'),
  approval_id uuid references public.portal_action_approvals(approval_id) on delete restrict,
  committed_rule_id uuid references public.calculation_rules(calculation_rule_id) on delete restrict,
  row_version integer not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  committed_at timestamptz,
  unique(actor_user_id,idempotency_key)
);

create table public.calculation_rule_results (
  calculation_result_id uuid primary key default gen_random_uuid(),
  calculation_rule_id uuid not null references public.calculation_rules(calculation_rule_id) on delete restrict,
  rule_key uuid not null,
  rule_version integer not null,
  applicability_group integer not null,
  handler_code text not null references public.calculation_rule_handlers(handler_code) on delete restrict,
  runtime_context jsonb not null check (jsonb_typeof(runtime_context)='object'),
  inputs jsonb not null check (jsonb_typeof(inputs)='object'),
  input_source_evidence jsonb not null check (jsonb_typeof(input_source_evidence)='object' and input_source_evidence <> '{}'::jsonb),
  output jsonb not null check (jsonb_typeof(output)='object'),
  method_version integer not null,
  calculation_timestamp timestamptz not null default now(),
  result_mode text not null default 'CURRENT_RECALCULATION' check (result_mode in ('CURRENT_RECALCULATION','HISTORICAL_LOCKED')),
  created_by_user_id uuid not null references auth.users(id) on delete restrict
);

create index calculation_rules_resolution_idx
  on public.calculation_rules(rule_type,lifecycle_status,effective_from,effective_to,rule_priority,rule_key,version);
create index calculation_rule_results_rule_idx
  on public.calculation_rule_results(rule_key,rule_version,calculation_timestamp desc);

alter table public.calculation_rule_handlers enable row level security;
alter table public.calculation_rule_change_batches enable row level security;
alter table public.calculation_rule_results enable row level security;
revoke all on public.calculation_rules,public.calculation_rule_contexts,
 public.calculation_rule_handlers,public.calculation_rule_change_batches,public.calculation_rule_results
 from public,anon,authenticated,service_role;
grant select on public.calculation_rules,public.calculation_rule_contexts,
 public.calculation_rule_handlers,public.calculation_rule_results to authenticated,service_role;
grant select on public.calculation_rule_context_readable to authenticated,service_role;

create policy calculation_rule_handlers_authorized_read on public.calculation_rule_handlers
 for select to authenticated using ((select private.portal_is_authorized(auth.uid(),'POLICY.READ')));
create policy calculation_rule_results_authorized_read on public.calculation_rule_results
 for select to authenticated using ((select private.portal_is_authorized(auth.uid(),'POLICY.READ')));

drop policy calculation_rules_authorized_read on public.calculation_rules;
drop policy calculation_rule_contexts_authorized_read on public.calculation_rule_contexts;
create policy calculation_rules_director_read on public.calculation_rules
 for select to authenticated using ((select private.portal_is_authorized(auth.uid(),'POLICY.READ')));
create policy calculation_rule_contexts_director_read on public.calculation_rule_contexts
 for select to authenticated using ((select private.portal_is_authorized(auth.uid(),'POLICY.READ')));

insert into public.portal_actions(action_code,resource_type,action_kind,requires_approval,display_name)
values ('RULES.WRITE','CALCULATION_RULE','UPDATE',true,'אישור גרסה והקשר של כלל')
on conflict(action_code) do update set resource_type=excluded.resource_type,action_kind=excluded.action_kind,
 requires_approval=true,display_name=excluded.display_name,is_active=true;
insert into public.portal_role_actions(role_code,action_code)
values ('DIRECTOR','RULES.WRITE') on conflict do nothing;

create or replace function private.calculation_context_value(
 p_kind text,p_school_year uuid,p_calendar_year uuid,p_daycare uuid,p_classroom uuid,
 p_age_group uuid,p_budget_category uuid,p_allocation_unit uuid,p_code text
) returns text language sql immutable set search_path=public,pg_temp as $$
 select case p_kind
  when 'SCHOOL_YEAR' then p_school_year::text when 'CALENDAR_YEAR' then p_calendar_year::text
  when 'DAYCARE' then p_daycare::text when 'CLASSROOM' then p_classroom::text
  when 'AGE_GROUP' then p_age_group::text when 'BUDGET_CATEGORY' then p_budget_category::text
  when 'ALLOCATION_UNIT' then p_allocation_unit::text when 'FRAMEWORK_TYPE' then p_code end;
$$;

create or replace function private.validate_calculation_rule_payload(p_payload jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,extensions,pg_temp as $$
declare r jsonb:=p_payload->'rule'; a jsonb:=p_payload->'applicability'; item jsonb; kind text; value text; handler public.calculation_rule_handlers; errors jsonb:='[]'::jsonb;
begin
 if p_payload->>'operation' not in ('CREATE','REPLACE') then errors:=errors||'"INVALID_OPERATION"'::jsonb; end if;
 if jsonb_typeof(r)<>'object' or length(trim(coalesce(r->>'display_name','')))=0 or length(trim(coalesce(r->>'instruction','')))=0 then errors:=errors||'"INVALID_RULE_TEXT"'::jsonb; end if;
 if coalesce(r->>'rule_type','') not in ('OPERATIONAL_PROCEDURE','VALIDATION','CLASSIFICATION','DEPENDENCY','STAFFING_RATIO','STAFFING_ROUNDING','FIXED_ROLE','BUDGET_FORMULA','BUDGET_PARAMETER') then errors:=errors||'"INVALID_RULE_TYPE"'::jsonb; end if;
 begin perform (r->>'effective_from')::date; exception when others then errors:=errors||'"INVALID_EFFECTIVE_FROM"'::jsonb; end;
 if r ? 'effective_to' and r->>'effective_to' is not null and (r->>'effective_to')::date < (r->>'effective_from')::date then errors:=errors||'"INVALID_EFFECTIVE_PERIOD"'::jsonb; end if;
 if jsonb_typeof(r->'definition')<>'object' or jsonb_typeof(r->'source_evidence')<>'object' or r->'source_evidence'='{}'::jsonb then errors:=errors||'"SOURCE_OR_DEFINITION_REQUIRED"'::jsonb; end if;
 if jsonb_typeof(a)<>'array' or jsonb_array_length(a)=0 then errors:=errors||'"APPLICABILITY_REQUIRED"'::jsonb; else
  for item in select * from jsonb_array_elements(a) loop
   kind:=item->>'context_kind'; value:=coalesce(item->>'context_id',item->>'context_code');
   if coalesce((item->>'applicability_group')::int,0)<1 or kind not in ('SCHOOL_YEAR','CALENDAR_YEAR','DAYCARE','CLASSROOM','AGE_GROUP','BUDGET_CATEGORY','ALLOCATION_UNIT','FRAMEWORK_TYPE') or value is null then errors:=errors||jsonb_build_array('INVALID_APPLICABILITY'); continue; end if;
   if kind='FRAMEWORK_TYPE' and value not in ('BASIC','EXTENDED') then errors:=errors||jsonb_build_array('INVALID_FRAMEWORK_TYPE');
   elsif kind='SCHOOL_YEAR' and not exists(select 1 from public.school_years where school_year_id=value::uuid) then errors:=errors||jsonb_build_array('UNKNOWN_SCHOOL_YEAR');
   elsif kind='CALENDAR_YEAR' and not exists(select 1 from public.calendar_years where calendar_year_id=value::uuid) then errors:=errors||jsonb_build_array('UNKNOWN_CALENDAR_YEAR');
   elsif kind='DAYCARE' and not exists(select 1 from public.daycares where daycare_id=value::uuid) then errors:=errors||jsonb_build_array('UNKNOWN_DAYCARE');
   elsif kind='CLASSROOM' and not exists(select 1 from public.classrooms where classroom_id=value::uuid) then errors:=errors||jsonb_build_array('UNKNOWN_CLASSROOM');
   elsif kind='AGE_GROUP' and not exists(select 1 from public.age_groups where age_group_id=value::uuid) then errors:=errors||jsonb_build_array('UNKNOWN_AGE_GROUP');
   elsif kind='BUDGET_CATEGORY' and not exists(select 1 from public.budget_categories where budget_category_id=value::uuid) then errors:=errors||jsonb_build_array('UNKNOWN_BUDGET_CATEGORY');
   elsif kind='ALLOCATION_UNIT' and not exists(select 1 from public.allocation_units where allocation_unit_id=value::uuid) then errors:=errors||jsonb_build_array('UNKNOWN_ALLOCATION_UNIT'); end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(a) x group by (x->>'applicability_group')::int,x->>'context_kind' having count(*)>1) then errors:=errors||jsonb_build_array('DUPLICATE_CONTEXT_KIND_IN_GROUP'); end if;
 end if;
 if nullif(r->>'handler_code','') is not null then
  select * into handler from public.calculation_rule_handlers where handler_code=r->>'handler_code' and implementation_status='IMPLEMENTED';
  if handler.handler_code is null or handler.rule_type<>r->>'rule_type' then errors:=errors||jsonb_build_array('UNSUPPORTED_HANDLER');
  elsif handler.handler_code='STAFFING_RATIO_V1' and (coalesce((r->'definition'->>'children_per_staff')::numeric,0)<=0 or coalesce(r->'definition'->>'rounding_method','') not in ('CEIL_HALF','CEIL_WHOLE')) then errors:=errors||jsonb_build_array('INVALID_STAFFING_RATIO_DEFINITION');
  elsif handler.handler_code='BUDGET_PARAMETER_V1' and (coalesce((r->'definition'->>'amount')::numeric,0)<0 or coalesce(r->'definition'->>'calculation_method','') not in ('FIXED','PER_UNIT')) then errors:=errors||jsonb_build_array('INVALID_BUDGET_PARAMETER_DEFINITION'); end if;
 end if;
 return jsonb_build_object('valid',jsonb_array_length(errors)=0,'errors',errors,'stored',true,'applicable',jsonb_array_length(a)>0,
  'implemented',nullif(r->>'handler_code','') is not null,'enforced',nullif(r->>'handler_code','') is not null);
exception when invalid_text_representation or numeric_value_out_of_range then
 return jsonb_build_object('valid',false,'errors',jsonb_build_array('INVALID_TYPED_VALUE'),'stored',true,'applicable',false,'implemented',false,'enforced',false);
end $$;

create or replace function private.calculation_rule_conflicts(p_payload jsonb)
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
 with candidate as (select p_payload->'rule' r,p_payload->'applicability' a),
 cg as (select (x->>'applicability_group')::int g,count(*) specificity from candidate,jsonb_array_elements(a) x group by 1),
 eg as (select c.calculation_rule_id,c.applicability_group,count(*) specificity from public.calculation_rule_contexts c group by 1,2),
 conflicts as (
  select distinct r.calculation_rule_id,r.rule_key,r.version,eg.applicability_group
  from public.calculation_rules r join eg on eg.calculation_rule_id=r.calculation_rule_id cross join candidate cross join cg
  where r.lifecycle_status='ACTIVE' and r.rule_type=candidate.r->>'rule_type'
   and r.rule_priority=coalesce((candidate.r->>'rule_priority')::smallint,100)
   and daterange(r.effective_from,coalesce(r.effective_to,'infinity'::date),'[]') && daterange((candidate.r->>'effective_from')::date,coalesce((candidate.r->>'effective_to')::date,'infinity'::date),'[]')
   and eg.specificity=cg.specificity
   and (candidate.r->>'rule_key' is null or r.rule_key<>(candidate.r->>'rule_key')::uuid)
   and not exists(
    select 1 from public.calculation_rule_contexts ec
    join jsonb_array_elements(candidate.a) cc on (cc->>'applicability_group')::int=cg.g and cc->>'context_kind'=ec.context_kind
    where ec.calculation_rule_id=r.calculation_rule_id and ec.applicability_group=eg.applicability_group
      and coalesce(cc->>'context_id',cc->>'context_code')<>private.calculation_context_value(ec.context_kind,ec.school_year_id,ec.calendar_year_id,ec.daycare_id,ec.classroom_id,ec.age_group_id,ec.budget_category_id,ec.allocation_unit_id,ec.context_code)
   )
 ) select coalesce(jsonb_agg(to_jsonb(conflicts)),'[]'::jsonb) from conflicts;
$$;

create or replace function public.portal_mcp_preview_calculation_rule(p_payload jsonb,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare validation jsonb; conflicts jsonb; digest_value text; b public.calculation_rule_change_batches;
begin
 if not private.portal_is_authorized(auth.uid(),'RULES.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
 if length(coalesce(p_idempotency_key,'')) not between 8 and 160 then raise exception 'Invalid idempotency key' using errcode='22023'; end if;
 validation:=private.validate_calculation_rule_payload(p_payload);
 conflicts:=case when (validation->>'valid')::boolean then private.calculation_rule_conflicts(p_payload) else '[]'::jsonb end;
 digest_value:=encode(extensions.digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex');
 insert into public.calculation_rule_change_batches(actor_user_id,idempotency_key,operation,payload,payload_digest,expected_version,status,conflict_evidence)
 values(auth.uid(),p_idempotency_key,p_payload->>'operation',p_payload,digest_value,(p_payload->>'expected_version')::int,
  case when jsonb_array_length(conflicts)>0 then 'CONFLICT' else 'PREVIEWED' end,conflicts)
 on conflict(actor_user_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key
 returning * into b;
 if b.payload_digest<>digest_value then raise exception 'Idempotency key reused with different payload' using errcode='23505'; end if;
 return jsonb_build_object('batch_id',b.batch_id,'status',b.status,'payload_digest',b.payload_digest,'row_version',b.row_version,
  'validation',validation,'conflicts',b.conflict_evidence,'payload',b.payload);
end $$;

create or replace function public.portal_mcp_request_calculation_rule_approval(p_batch_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare b public.calculation_rule_change_batches; approval jsonb; approval_payload jsonb;
begin
 if not private.portal_is_authorized(auth.uid(),'RULES.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into b from public.calculation_rule_change_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.batch_id is null or b.status<>'PREVIEWED' or jsonb_array_length(b.conflict_evidence)>0 then raise exception 'Batch is not approval-ready' using errcode='22023'; end if;
 approval_payload:=jsonb_build_object('batch_id',b.batch_id,'payload_digest',b.payload_digest,'operation',b.operation,'expected_version',b.expected_version,'row_version',b.row_version);
 approval:=public.portal_request_approval('RULES.WRITE','CALCULATION_RULE_BATCH',b.batch_id,approval_payload,p_reason);
 update public.calculation_rule_change_batches set status='APPROVED',approval_id=(approval->>'approval_id')::uuid,approved_at=now(),row_version=row_version+1 where batch_id=b.batch_id;
 return approval||jsonb_build_object('batch_id',b.batch_id,'approved_payload',approval_payload);
end $$;

create or replace function public.portal_mcp_commit_calculation_rule(p_batch_id uuid,p_approval_id uuid,p_expected_batch_version integer)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare b public.calculation_rule_change_batches; r jsonb; item jsonb; old_rule public.calculation_rules; new_rule public.calculation_rules; approval_payload jsonb; conflicts jsonb; new_key uuid; new_version int; handler public.calculation_rule_handlers;
begin
 if not private.portal_is_authorized(auth.uid(),'RULES.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into b from public.calculation_rule_change_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.batch_id is null then raise exception 'Batch not found' using errcode='P0002'; end if;
 if b.status='COMMITTED' and b.approval_id=p_approval_id then return public.portal_mcp_get_calculation_rule_batch(b.batch_id); end if;
 if b.status<>'APPROVED' or b.approval_id<>p_approval_id or b.row_version<>p_expected_batch_version then raise exception 'Stale, unapproved or mismatched batch' using errcode='40001'; end if;
 approval_payload:=jsonb_build_object('batch_id',b.batch_id,'payload_digest',b.payload_digest,'operation',b.operation,'expected_version',b.expected_version,'row_version',b.row_version-1);
 perform private.portal_consume_approval(p_approval_id,'RULES.WRITE','CALCULATION_RULE_BATCH',b.batch_id,approval_payload);
 r:=b.payload->'rule'; perform pg_advisory_xact_lock(hashtextextended(r->>'rule_type'||':'||coalesce(r->>'handler_code','STORED_ONLY'),0));
 conflicts:=private.calculation_rule_conflicts(b.payload); if jsonb_array_length(conflicts)>0 then raise exception 'Applicable rule conflict detected' using errcode='23P01'; end if;
 if b.operation='REPLACE' then
  select * into old_rule from public.calculation_rules where rule_key=(r->>'rule_key')::uuid and lifecycle_status='ACTIVE' order by version desc limit 1 for update;
  if old_rule.calculation_rule_id is null or old_rule.version<>b.expected_version then raise exception 'Rule version changed' using errcode='40001'; end if;
  new_key:=old_rule.rule_key; new_version:=old_rule.version+1;
 else new_key:=coalesce((r->>'rule_key')::uuid,gen_random_uuid()); new_version:=1; end if;
 if nullif(r->>'handler_code','') is not null then select * into handler from public.calculation_rule_handlers where handler_code=r->>'handler_code' and implementation_status='IMPLEMENTED'; end if;
 insert into public.calculation_rules(rule_key,rule_type,display_name,instruction,definition,effective_from,effective_to,rule_priority,lifecycle_status,source_evidence,approval_evidence,supersedes_rule_id,previous_version_id,version,created_by_user_id,updated_by_user_id,handler_code,implementation_status,enforcement_status,approval_id,approved_at)
 values(new_key,r->>'rule_type',r->>'display_name',r->>'instruction',r->'definition',(r->>'effective_from')::date,(r->>'effective_to')::date,coalesce((r->>'rule_priority')::smallint,100),'DRAFT',r->'source_evidence',jsonb_build_object('approval_id',p_approval_id,'payload_digest',b.payload_digest,'batch_id',b.batch_id),old_rule.calculation_rule_id,old_rule.calculation_rule_id,new_version,auth.uid(),auth.uid(),handler.handler_code,case when handler.handler_code is null then 'STORED_ONLY' else 'IMPLEMENTED' end,case when handler.enforcement_status='ENFORCED' then 'ENFORCED' else 'NOT_ENFORCED' end,p_approval_id,now()) returning * into new_rule;
 for item in select * from jsonb_array_elements(b.payload->'applicability') loop
  insert into public.calculation_rule_contexts(calculation_rule_id,applicability_group,context_kind,school_year_id,calendar_year_id,daycare_id,classroom_id,age_group_id,budget_category_id,allocation_unit_id,context_code,created_by_user_id)
  values(new_rule.calculation_rule_id,(item->>'applicability_group')::int,item->>'context_kind',
   case when item->>'context_kind'='SCHOOL_YEAR' then (item->>'context_id')::uuid end,case when item->>'context_kind'='CALENDAR_YEAR' then (item->>'context_id')::uuid end,
   case when item->>'context_kind'='DAYCARE' then (item->>'context_id')::uuid end,case when item->>'context_kind'='CLASSROOM' then (item->>'context_id')::uuid end,
   case when item->>'context_kind'='AGE_GROUP' then (item->>'context_id')::uuid end,case when item->>'context_kind'='BUDGET_CATEGORY' then (item->>'context_id')::uuid end,
   case when item->>'context_kind'='ALLOCATION_UNIT' then (item->>'context_id')::uuid end,case when item->>'context_kind'='FRAMEWORK_TYPE' then item->>'context_code' end,auth.uid());
 end loop;
 update public.calculation_rules set lifecycle_status='ACTIVE',updated_at=now(),row_version=row_version+1 where calculation_rule_id=new_rule.calculation_rule_id returning * into new_rule;
 if old_rule.calculation_rule_id is not null then update public.calculation_rules set lifecycle_status='REPLACED',updated_at=now(),updated_by_user_id=auth.uid(),row_version=row_version+1 where calculation_rule_id=old_rule.calculation_rule_id; end if;
 update public.calculation_rule_change_batches set status='COMMITTED',committed_rule_id=new_rule.calculation_rule_id,committed_at=now(),row_version=row_version+1 where batch_id=b.batch_id;
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id,detail)
 values(auth.uid(),'MCP','RULES.WRITE','CALCULATION_RULE',new_rule.calculation_rule_id,'SUCCESS',p_approval_id,jsonb_build_object('batch_id',b.batch_id,'payload_digest',b.payload_digest,'rule_key',new_rule.rule_key,'version',new_rule.version));
 return public.portal_mcp_get_calculation_rule_batch(b.batch_id);
end $$;

create or replace function public.portal_mcp_get_calculation_rule_batch(p_batch_id uuid)
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
 select jsonb_build_object('batch_id',b.batch_id,'status',b.status,'payload_digest',b.payload_digest,'row_version',b.row_version,
  'approval_id',b.approval_id,'committed_rule_id',b.committed_rule_id,'created_at',b.created_at,'approved_at',b.approved_at,'committed_at',b.committed_at,
  'rule',case when r.calculation_rule_id is null then null else to_jsonb(r) end,
  'applicability',coalesce((select jsonb_agg(to_jsonb(c) order by c.applicability_group,c.context_kind) from public.calculation_rule_contexts c where c.calculation_rule_id=r.calculation_rule_id),'[]'::jsonb),
  'approval',case when a.approval_id is null then null else jsonb_build_object('approval_id',a.approval_id,'payload_digest',a.payload_digest,'actor_user_id',a.actor_user_id,'created_at',a.created_at,'consumed_at',a.consumed_at) end)
 from public.calculation_rule_change_batches b left join public.calculation_rules r on r.calculation_rule_id=b.committed_rule_id left join public.portal_action_approvals a on a.approval_id=b.approval_id
 where b.batch_id=p_batch_id and b.actor_user_id=auth.uid() and private.portal_is_authorized(auth.uid(),'RULES.WRITE');
$$;

create or replace function public.portal_mcp_list_calculation_rules(p_rule_type text default null,p_lifecycle_status text default null)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare result jsonb;
begin
 if not private.portal_is_authorized(auth.uid(),'POLICY.READ') then raise exception 'Not authorized' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('rule_key',r.rule_key,'calculation_rule_id',r.calculation_rule_id,'rule_number',r.rule_number,'version',r.version,'rule_type',r.rule_type,'display_name',r.display_name,'instruction',r.instruction,'effective_from',r.effective_from,'effective_to',r.effective_to,'lifecycle_status',r.lifecycle_status,'stored',true,'applicable',exists(select 1 from public.calculation_rule_contexts c where c.calculation_rule_id=r.calculation_rule_id),'implemented',r.implementation_status='IMPLEMENTED','enforced',r.enforcement_status='ENFORCED','handler_code',r.handler_code) order by r.rule_number,r.version),'[]'::jsonb) into result
 from public.calculation_rules r where (p_rule_type is null or r.rule_type=p_rule_type) and (p_lifecycle_status is null or r.lifecycle_status=p_lifecycle_status);
 return result;
end;
$$;

create or replace function public.portal_mcp_read_calculation_rule(p_rule_key uuid,p_version integer default null)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare result jsonb;
begin
 if not private.portal_is_authorized(auth.uid(),'POLICY.READ') then raise exception 'Not authorized' using errcode='42501'; end if;
 select jsonb_build_object('rule',to_jsonb(r),'applicability',coalesce((select jsonb_agg(to_jsonb(c) order by c.applicability_group,c.context_kind) from public.calculation_rule_contexts c where c.calculation_rule_id=r.calculation_rule_id),'[]'::jsonb),'handler',to_jsonb(h)) into result
 from public.calculation_rules r left join public.calculation_rule_handlers h on h.handler_code=r.handler_code
 where r.rule_key=p_rule_key and (p_version is null or r.version=p_version)
 order by r.version desc limit 1;
 return result;
end;
$$;

create or replace function public.portal_mcp_resolve_calculation_rule(p_rule_type text,p_effective_date date,p_runtime_context jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare selected record; ties int; best_specificity int; best_priority int;
begin
 if not private.portal_is_authorized(auth.uid(),'POLICY.READ') then raise exception 'Not authorized' using errcode='42501'; end if;
 with matching as (
  select r.*,g.applicability_group,g.specificity
  from public.calculation_rules r
  join (select calculation_rule_id,applicability_group,count(*) specificity from public.calculation_rule_contexts c
        where private.calculation_context_value(c.context_kind,c.school_year_id,c.calendar_year_id,c.daycare_id,c.classroom_id,c.age_group_id,c.budget_category_id,c.allocation_unit_id,c.context_code)
          = case c.context_kind when 'FRAMEWORK_TYPE' then p_runtime_context->>'framework_type' else p_runtime_context->>(lower(c.context_kind)||'_id') end
        group by calculation_rule_id,applicability_group
        having count(*)=(select count(*) from public.calculation_rule_contexts x where x.calculation_rule_id=c.calculation_rule_id and x.applicability_group=c.applicability_group)) g on g.calculation_rule_id=r.calculation_rule_id
  where r.rule_type=p_rule_type and r.lifecycle_status='ACTIVE' and p_effective_date between r.effective_from and coalesce(r.effective_to,'infinity'::date)
 ), ranked as (select *,max(specificity) over() max_spec from matching), ranked2 as (select *,min(rule_priority) over() min_priority from ranked where specificity=max_spec)
 select * into selected from ranked2 where rule_priority=min_priority order by rule_number limit 1;
 if selected.calculation_rule_id is null then return jsonb_build_object('status','MISSING_RULE','stored',false,'applicable',false,'implemented',false,'enforced',false); end if;
 with matching as (
  select r.calculation_rule_id,g.applicability_group,g.specificity,r.rule_priority from public.calculation_rules r join
   (select calculation_rule_id,applicability_group,count(*) specificity from public.calculation_rule_contexts c where private.calculation_context_value(c.context_kind,c.school_year_id,c.calendar_year_id,c.daycare_id,c.classroom_id,c.age_group_id,c.budget_category_id,c.allocation_unit_id,c.context_code)=case c.context_kind when 'FRAMEWORK_TYPE' then p_runtime_context->>'framework_type' else p_runtime_context->>(lower(c.context_kind)||'_id') end group by calculation_rule_id,applicability_group having count(*)=(select count(*) from public.calculation_rule_contexts x where x.calculation_rule_id=c.calculation_rule_id and x.applicability_group=c.applicability_group)) g on g.calculation_rule_id=r.calculation_rule_id
   where r.rule_type=p_rule_type and r.lifecycle_status='ACTIVE' and p_effective_date between r.effective_from and coalesce(r.effective_to,'infinity'::date))
 select count(*) into ties from matching where specificity=selected.specificity and rule_priority=selected.rule_priority;
 if ties>1 then return jsonb_build_object('status','AMBIGUOUS_RULE','stored',true,'applicable',true,'implemented',false,'enforced',false,'candidate_count',ties); end if;
 return jsonb_build_object('status',case when selected.implementation_status='IMPLEMENTED' then 'READY' else 'UNSUPPORTED_HANDLER' end,
  'stored',true,'applicable',true,'implemented',selected.implementation_status='IMPLEMENTED','enforced',selected.enforcement_status='ENFORCED',
  'calculation_rule_id',selected.calculation_rule_id,'rule_key',selected.rule_key,'version',selected.version,'applicability_group',selected.applicability_group,
  'handler_code',selected.handler_code,'definition',selected.definition,'instruction',selected.instruction,'effective_from',selected.effective_from,'effective_to',selected.effective_to);
end $$;

create or replace function public.portal_mcp_execute_calculation_rule(p_rule_type text,p_effective_date date,p_runtime_context jsonb,p_inputs jsonb,p_input_source_evidence jsonb,p_result_mode text default 'CURRENT_RECALCULATION')
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare resolved jsonb; output jsonb; result_id uuid; handler public.calculation_rule_handlers; n numeric; ratio numeric; minimum_value numeric;
begin
 resolved:=public.portal_mcp_resolve_calculation_rule(p_rule_type,p_effective_date,p_runtime_context);
 if resolved->>'status'<>'READY' then return resolved; end if;
 if jsonb_typeof(p_input_source_evidence)<>'object' or p_input_source_evidence='{}'::jsonb then raise exception 'Input source evidence required' using errcode='22023'; end if;
 select * into handler from public.calculation_rule_handlers where handler_code=resolved->>'handler_code' and implementation_status='IMPLEMENTED' and enforcement_status='ENFORCED';
 if handler.handler_code='STAFFING_RATIO_V1' then
  n:=(p_inputs->>'children_count')::numeric; ratio:=(resolved->'definition'->>'children_per_staff')::numeric; minimum_value:=coalesce((resolved->'definition'->>'minimum_staff')::numeric,0);
  output:=jsonb_build_object('required_staff',greatest(minimum_value,case resolved->'definition'->>'rounding_method' when 'CEIL_HALF' then ceil((n/ratio)*2)/2 else ceil(n/ratio) end));
 elsif handler.handler_code='BUDGET_PARAMETER_V1' then
  n:=coalesce((p_inputs->>'quantity')::numeric,0); output:=jsonb_build_object('budget_amount',case resolved->'definition'->>'calculation_method' when 'FIXED' then (resolved->'definition'->>'amount')::numeric else n*(resolved->'definition'->>'amount')::numeric end);
 else return resolved||jsonb_build_object('status','UNSUPPORTED_HANDLER','implemented',false,'enforced',false); end if;
 insert into public.calculation_rule_results(calculation_rule_id,rule_key,rule_version,applicability_group,handler_code,runtime_context,inputs,input_source_evidence,output,method_version,result_mode,created_by_user_id)
 values((resolved->>'calculation_rule_id')::uuid,(resolved->>'rule_key')::uuid,(resolved->>'version')::int,(resolved->>'applicability_group')::int,handler.handler_code,p_runtime_context,p_inputs,p_input_source_evidence,output,handler.contract_version,p_result_mode,auth.uid()) returning calculation_result_id into result_id;
 return resolved||jsonb_build_object('status','CALCULATED','calculation_result_id',result_id,'runtime_context',p_runtime_context,'inputs',p_inputs,'input_source_evidence',p_input_source_evidence,'output',output,'calculated_at',now(),'result_mode',p_result_mode);
end $$;

drop view public.calculation_rule_context_readable;
create view public.calculation_rule_context_readable
with (security_invoker=true) as
select r.rule_key,r.rule_number,r.calculation_rule_id,r.version,r.rule_type,r.display_name,r.instruction,r.definition,
 r.effective_from,r.effective_to,r.rule_priority,r.lifecycle_status,r.implementation_status,r.enforcement_status,r.handler_code,
 c.calculation_rule_context_id,c.applicability_group,c.context_kind,
 coalesce(d.display_name,cl.display_name,ag.display_name,bc.display_name,au.display_name,sy.display_name,cy.display_name,c.context_code) context_name,
 coalesce(d.daycare_id,cl.classroom_id,ag.age_group_id,bc.budget_category_id,au.allocation_unit_id,sy.school_year_id,cy.calendar_year_id) context_entity_id
from public.calculation_rules r join public.calculation_rule_contexts c on c.calculation_rule_id=r.calculation_rule_id
left join public.daycares d on d.daycare_id=c.daycare_id left join public.classrooms cl on cl.classroom_id=c.classroom_id
left join public.age_groups ag on ag.age_group_id=c.age_group_id left join public.budget_categories bc on bc.budget_category_id=c.budget_category_id
left join public.allocation_units au on au.allocation_unit_id=c.allocation_unit_id left join public.school_years sy on sy.school_year_id=c.school_year_id
left join public.calendar_years cy on cy.calendar_year_id=c.calendar_year_id;
grant select on public.calculation_rule_context_readable to authenticated,service_role;

create or replace function private.guard_calculation_rule_activation()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.lifecycle_status='ACTIVE' and not exists(select 1 from public.calculation_rule_contexts c where c.calculation_rule_id=new.calculation_rule_id) then raise exception 'An ACTIVE calculation rule must have at least one context'; end if;
 if old.lifecycle_status='ACTIVE' and (
  new.rule_key is distinct from old.rule_key or new.rule_type is distinct from old.rule_type or new.display_name is distinct from old.display_name
  or new.instruction is distinct from old.instruction or new.definition is distinct from old.definition or new.effective_from is distinct from old.effective_from
  or new.effective_to is distinct from old.effective_to or new.rule_priority is distinct from old.rule_priority or new.source_evidence is distinct from old.source_evidence
  or new.approval_evidence is distinct from old.approval_evidence or new.supersedes_rule_id is distinct from old.supersedes_rule_id
  or new.version is distinct from old.version or new.handler_code is distinct from old.handler_code or new.implementation_status is distinct from old.implementation_status
  or new.enforcement_status is distinct from old.enforcement_status or new.approval_id is distinct from old.approval_id or new.approved_at is distinct from old.approved_at
  or new.lifecycle_status not in ('ACTIVE','REPLACED','RETIRED')) then raise exception 'An ACTIVE calculation rule is immutable; create a replacement rule'; end if;
 new.updated_at:=case when tg_op='UPDATE' then clock_timestamp() else new.updated_at end;
 new.row_version:=case when tg_op='UPDATE' then old.row_version+1 else new.row_version end;
 return new;
end $$;

revoke all on function private.calculation_context_value(text,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text),private.validate_calculation_rule_payload(jsonb),private.calculation_rule_conflicts(jsonb) from public,anon,authenticated;
revoke all on function public.portal_mcp_preview_calculation_rule(jsonb,text),public.portal_mcp_request_calculation_rule_approval(uuid,text),public.portal_mcp_commit_calculation_rule(uuid,uuid,integer),public.portal_mcp_get_calculation_rule_batch(uuid),public.portal_mcp_list_calculation_rules(text,text),public.portal_mcp_read_calculation_rule(uuid,integer),public.portal_mcp_resolve_calculation_rule(text,date,jsonb),public.portal_mcp_execute_calculation_rule(text,date,jsonb,jsonb,jsonb,text) from public,anon;
grant execute on function public.portal_mcp_preview_calculation_rule(jsonb,text),public.portal_mcp_request_calculation_rule_approval(uuid,text),public.portal_mcp_commit_calculation_rule(uuid,uuid,integer),public.portal_mcp_get_calculation_rule_batch(uuid),public.portal_mcp_list_calculation_rules(text,text),public.portal_mcp_read_calculation_rule(uuid,integer),public.portal_mcp_resolve_calculation_rule(text,date,jsonb),public.portal_mcp_execute_calculation_rule(text,date,jsonb,jsonb,jsonb,text) to authenticated;

comment on table public.calculation_rules is 'Stable rule identity and immutable approved versions. Operational facts and calculation results are stored separately.';
comment on table public.calculation_rule_contexts is 'Applicability predicates grouped as OR groups; contexts within one group are AND predicates over canonical IDs.';
comment on table public.calculation_rule_results is 'Traceable outputs linking exact rule version, applicability group, runtime context, source-backed inputs and handler version.';
