-- Separate approved rule instructions, governed applicability, runtime facts,
-- results, and one-result Director overrides. No business rows are seeded.

alter table public.calculation_rules drop constraint if exists calculation_rules_lifecycle_status_check;
alter table public.calculation_rules add constraint calculation_rules_lifecycle_status_check
  check (lifecycle_status in ('DRAFT','APPROVED','ACTIVE','REPLACED','RETIRED'));

create table public.calculation_rule_applicability_sets (
  applicability_set_id uuid primary key default gen_random_uuid(),
  calculation_rule_id uuid not null references public.calculation_rules(calculation_rule_id) on delete restrict,
  applicability_version integer not null default 1 check (applicability_version > 0),
  effective_from date not null,
  effective_to date,
  rule_priority smallint not null default 100 check (rule_priority between 1 and 1000),
  lifecycle_status text not null default 'ACTIVE' check (lifecycle_status in ('ACTIVE','REPLACED','RETIRED')),
  source_evidence jsonb not null check (jsonb_typeof(source_evidence)='object' and source_evidence<>'{}'::jsonb),
  approval_id uuid not null references public.portal_action_approvals(approval_id) on delete restrict,
  payload_digest text not null check (payload_digest ~ '^[0-9a-f]{64}$'),
  previous_applicability_set_id uuid references public.calculation_rule_applicability_sets(applicability_set_id) on delete restrict,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  row_version integer not null default 1 check (row_version>0),
  check (effective_to is null or effective_to>=effective_from),
  unique(calculation_rule_id,applicability_version)
);

alter table public.calculation_rule_contexts
  add column applicability_set_id uuid references public.calculation_rule_applicability_sets(applicability_set_id) on delete restrict;
alter table public.calculation_rule_results
  add column applicability_set_id uuid references public.calculation_rule_applicability_sets(applicability_set_id) on delete restrict,
  add column row_version integer not null default 1 check(row_version>0);
alter table public.calculation_rule_contexts drop constraint if exists calculation_rule_contexts_rule_group_kind_uq;
create unique index calculation_rule_contexts_set_group_kind_uq
  on public.calculation_rule_contexts(applicability_set_id,applicability_group,context_kind)
  where applicability_set_id is not null;

create table public.calculation_rule_applicability_batches (
  batch_id uuid primary key default gen_random_uuid(), actor_user_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null, payload jsonb not null, payload_digest text not null check(payload_digest~'^[0-9a-f]{64}$'),
  status text not null default 'PREVIEWED' check(status in('PREVIEWED','APPROVED','COMMITTED','CONFLICT')),
  expected_rule_version integer not null, expected_applicability_version integer,
  approval_id uuid references public.portal_action_approvals(approval_id) on delete restrict,
  committed_applicability_set_id uuid references public.calculation_rule_applicability_sets(applicability_set_id) on delete restrict,
  conflict_evidence jsonb not null default '[]'::jsonb, row_version integer not null default 1,
  created_at timestamptz not null default now(), approved_at timestamptz, committed_at timestamptz,
  unique(actor_user_id,idempotency_key)
);

create table public.calculation_rule_override_batches (
  batch_id uuid primary key default gen_random_uuid(), actor_user_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null, payload jsonb not null, payload_digest text not null check(payload_digest~'^[0-9a-f]{64}$'),
  status text not null default 'PREVIEWED' check(status in('PREVIEWED','APPROVED','COMMITTED')),
  expected_result_version integer not null, approval_id uuid references public.portal_action_approvals(approval_id) on delete restrict,
  committed_override_id uuid, row_version integer not null default 1,
  created_at timestamptz not null default now(), approved_at timestamptz, committed_at timestamptz,
  unique(actor_user_id,idempotency_key)
);

create table public.calculation_rule_overrides (
  override_id uuid primary key default gen_random_uuid(), calculation_result_id uuid not null references public.calculation_rule_results(calculation_result_id) on delete restrict,
  rule_key uuid not null, rule_version integer not null, original_output jsonb not null, adjusted_output jsonb not null,
  justification text not null check(length(trim(justification)) between 10 and 1000), scope jsonb not null,
  effective_from date not null, effective_to date not null, source_evidence jsonb not null check(source_evidence<>'{}'::jsonb),
  approval_id uuid not null references public.portal_action_approvals(approval_id) on delete restrict,
  payload_digest text not null check(payload_digest~'^[0-9a-f]{64}$'), director_user_id uuid not null references auth.users(id) on delete restrict,
  lifecycle_status text not null default 'ACTIVE' check(lifecycle_status in('ACTIVE','REPLACED','RETIRED')),
  created_at timestamptz not null default now(), row_version integer not null default 1,
  check(effective_to>=effective_from)
);
alter table public.calculation_rule_override_batches add constraint calculation_rule_override_batches_committed_fk
  foreign key(committed_override_id) references public.calculation_rule_overrides(override_id) on delete restrict;
create unique index calculation_rule_one_active_override on public.calculation_rule_overrides(calculation_result_id) where lifecycle_status='ACTIVE';
create index calculation_rule_app_sets_rule_idx on public.calculation_rule_applicability_sets(calculation_rule_id);
create index calculation_rule_app_sets_approval_idx on public.calculation_rule_applicability_sets(approval_id);
create index calculation_rule_app_sets_previous_idx on public.calculation_rule_applicability_sets(previous_applicability_set_id);
create index calculation_rule_contexts_app_set_idx on public.calculation_rule_contexts(applicability_set_id);
create index calculation_rule_results_app_set_idx on public.calculation_rule_results(applicability_set_id);
create index calculation_rule_app_batches_approval_idx on public.calculation_rule_applicability_batches(approval_id);
create index calculation_rule_app_batches_committed_idx on public.calculation_rule_applicability_batches(committed_applicability_set_id);
create index calculation_rule_override_batches_approval_idx on public.calculation_rule_override_batches(approval_id);
create index calculation_rule_override_batches_committed_idx on public.calculation_rule_override_batches(committed_override_id);
create index calculation_rule_overrides_approval_idx on public.calculation_rule_overrides(approval_id);
create index calculation_rule_overrides_director_idx on public.calculation_rule_overrides(director_user_id);

alter table public.calculation_rule_applicability_sets enable row level security;
alter table public.calculation_rule_applicability_batches enable row level security;
alter table public.calculation_rule_override_batches enable row level security;
alter table public.calculation_rule_overrides enable row level security;
revoke all on public.calculation_rule_applicability_sets,public.calculation_rule_applicability_batches,public.calculation_rule_override_batches,public.calculation_rule_overrides from public,anon,authenticated;
grant select on public.calculation_rule_applicability_sets,public.calculation_rule_overrides to authenticated,service_role;
create policy calculation_rule_applicability_director_read on public.calculation_rule_applicability_sets for select to authenticated using(private.portal_is_authorized((select auth.uid()),'POLICY.READ'));
create policy calculation_rule_overrides_director_read on public.calculation_rule_overrides for select to authenticated using(private.portal_is_authorized((select auth.uid()),'POLICY.READ'));

insert into public.portal_actions(action_code,resource_type,action_kind,requires_approval,display_name) values
 ('RULES.APPLICABILITY_WRITE','CALCULATION_RULE_APPLICABILITY','UPDATE',true,'אישור תחולת כלל'),
 ('RULES.OVERRIDE','CALCULATION_RULE_OVERRIDE','UPDATE',true,'אישור חריגה מתוצאת כלל')
on conflict(action_code) do update set requires_approval=true,is_active=true,display_name=excluded.display_name;
insert into public.portal_role_actions(role_code,action_code) values
 ('DIRECTOR','RULES.APPLICABILITY_WRITE'),('DIRECTOR','RULES.OVERRIDE') on conflict do nothing;

-- A rule instruction may be approved with an empty applicability array.
create or replace function private.validate_calculation_rule_payload(p_payload jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,extensions,pg_temp as $$
declare r jsonb:=p_payload->'rule'; a jsonb:=coalesce(p_payload->'applicability','[]'::jsonb); errors jsonb:='[]'::jsonb; handler public.calculation_rule_handlers;
begin
 if p_payload->>'operation' not in ('CREATE','REPLACE') then errors:=errors||'"INVALID_OPERATION"'::jsonb; end if;
 if jsonb_typeof(r)<>'object' or length(trim(coalesce(r->>'display_name','')))=0 or length(trim(coalesce(r->>'instruction','')))=0 then errors:=errors||'"INVALID_RULE_TEXT"'::jsonb; end if;
 if coalesce(r->>'rule_type','') not in ('OPERATIONAL_PROCEDURE','VALIDATION','CLASSIFICATION','DEPENDENCY','STAFFING_RATIO','STAFFING_ROUNDING','FIXED_ROLE','BUDGET_FORMULA','BUDGET_PARAMETER') then errors:=errors||'"INVALID_RULE_TYPE"'::jsonb; end if;
 begin perform (r->>'effective_from')::date; exception when others then errors:=errors||'"INVALID_EFFECTIVE_FROM"'::jsonb; end;
 if jsonb_typeof(r->'definition')<>'object' or jsonb_typeof(r->'source_evidence')<>'object' or r->'source_evidence'='{}'::jsonb then errors:=errors||'"SOURCE_OR_DEFINITION_REQUIRED"'::jsonb; end if;
 if jsonb_typeof(a)<>'array' then errors:=errors||'"INVALID_APPLICABILITY"'::jsonb; end if;
 if nullif(r->>'handler_code','') is not null then
  select * into handler from public.calculation_rule_handlers where handler_code=r->>'handler_code' and implementation_status='IMPLEMENTED';
  if handler.handler_code is null or handler.rule_type<>r->>'rule_type' then errors:=errors||jsonb_build_array('UNSUPPORTED_HANDLER');
  elsif handler.handler_code='STAFFING_RATIO_V1' and (coalesce((r->'definition'->>'children_per_staff')::numeric,0)<=0 or coalesce(r->'definition'->>'rounding_method','') not in('CEIL_HALF','CEIL_WHOLE')) then errors:=errors||jsonb_build_array('INVALID_STAFFING_RATIO_DEFINITION');
  elsif handler.handler_code='BUDGET_PARAMETER_V1' and (coalesce((r->'definition'->>'amount')::numeric,0)<0 or coalesce(r->'definition'->>'calculation_method','') not in('FIXED','PER_UNIT')) then errors:=errors||jsonb_build_array('INVALID_BUDGET_PARAMETER_DEFINITION'); end if;
 end if;
 return jsonb_build_object('valid',jsonb_array_length(errors)=0,'errors',errors,'stored',true,'applicability_defined',jsonb_array_length(a)>0,'implemented',nullif(r->>'handler_code','') is not null,'enforced',false);
exception when others then return jsonb_build_object('valid',false,'errors',jsonb_build_array('INVALID_TYPED_VALUE'),'stored',true,'applicability_defined',false,'implemented',false,'enforced',false); end $$;

create or replace function public.portal_mcp_commit_rule_instruction(p_batch_id uuid,p_approval_id uuid,p_expected_batch_version integer)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare b public.calculation_rule_change_batches; r jsonb; old_rule public.calculation_rules; new_rule public.calculation_rules; approval_payload jsonb; new_key uuid; new_version int; handler public.calculation_rule_handlers;
begin
 if not private.portal_is_authorized(auth.uid(),'RULES.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into b from public.calculation_rule_change_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.status='COMMITTED' and b.approval_id=p_approval_id then return public.portal_mcp_get_calculation_rule_batch(b.batch_id); end if;
 if b.status<>'APPROVED' or b.approval_id<>p_approval_id or b.row_version<>p_expected_batch_version then raise exception 'Stale, unapproved or mismatched batch' using errcode='40001'; end if;
 approval_payload:=jsonb_build_object('batch_id',b.batch_id,'payload_digest',b.payload_digest,'operation',b.operation,'expected_version',b.expected_version,'row_version',b.row_version-1);
 perform private.portal_consume_approval(p_approval_id,'RULES.WRITE','CALCULATION_RULE_BATCH',b.batch_id,approval_payload);
 r:=b.payload->'rule'; perform pg_advisory_xact_lock(hashtextextended('rule:'||coalesce(r->>'rule_key',r->>'rule_type'),0));
 if b.operation='REPLACE' then select * into old_rule from public.calculation_rules where rule_key=(r->>'rule_key')::uuid and lifecycle_status in('APPROVED','ACTIVE') order by version desc limit 1 for update;
  if old_rule.calculation_rule_id is null or old_rule.version<>b.expected_version then raise exception 'Rule version changed' using errcode='40001'; end if; new_key:=old_rule.rule_key;new_version:=old_rule.version+1;
 else new_key:=coalesce((r->>'rule_key')::uuid,gen_random_uuid());new_version:=1;end if;
 if nullif(r->>'handler_code','') is not null then select * into handler from public.calculation_rule_handlers where handler_code=r->>'handler_code' and implementation_status='IMPLEMENTED';end if;
 insert into public.calculation_rules(rule_key,rule_type,display_name,instruction,definition,effective_from,effective_to,rule_priority,lifecycle_status,source_evidence,approval_evidence,supersedes_rule_id,previous_version_id,version,created_by_user_id,updated_by_user_id,handler_code,implementation_status,enforcement_status,approval_id,approved_at)
 values(new_key,r->>'rule_type',r->>'display_name',r->>'instruction',r->'definition',(r->>'effective_from')::date,(r->>'effective_to')::date,coalesce((r->>'rule_priority')::smallint,100),'APPROVED',r->'source_evidence',jsonb_build_object('approval_id',p_approval_id,'payload_digest',b.payload_digest,'batch_id',b.batch_id),old_rule.calculation_rule_id,old_rule.calculation_rule_id,new_version,auth.uid(),auth.uid(),handler.handler_code,case when handler.handler_code is null then 'STORED_ONLY' else 'IMPLEMENTED' end,'NOT_ENFORCED',p_approval_id,now()) returning * into new_rule;
 if old_rule.calculation_rule_id is not null then update public.calculation_rules set lifecycle_status='REPLACED' where calculation_rule_id=old_rule.calculation_rule_id;end if;
 update public.calculation_rule_change_batches set status='COMMITTED',committed_rule_id=new_rule.calculation_rule_id,committed_at=now(),row_version=row_version+1 where batch_id=b.batch_id;
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id,detail) values(auth.uid(),'MCP','RULES.WRITE','CALCULATION_RULE',new_rule.calculation_rule_id,'SUCCESS',p_approval_id,jsonb_build_object('stored',true,'applicability_defined',false,'rule_key',new_key,'version',new_version));
 return public.portal_mcp_get_calculation_rule_batch(b.batch_id);
end $$;

create or replace function private.validate_rule_context_item(item jsonb)
returns boolean language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare k text:=item->>'context_kind';v text:=coalesce(item->>'context_id',item->>'context_code');begin
 if coalesce((item->>'applicability_group')::int,0)<1 or v is null then return false;end if;
 return case k when 'FRAMEWORK_TYPE' then v in('BASIC','EXTENDED') when 'SCHOOL_YEAR' then exists(select 1 from public.school_years where school_year_id=v::uuid) when 'CALENDAR_YEAR' then exists(select 1 from public.calendar_years where calendar_year_id=v::uuid) when 'DAYCARE' then exists(select 1 from public.daycares where daycare_id=v::uuid) when 'CLASSROOM' then exists(select 1 from public.classrooms where classroom_id=v::uuid) when 'AGE_GROUP' then exists(select 1 from public.age_groups where age_group_id=v::uuid) when 'BUDGET_CATEGORY' then exists(select 1 from public.budget_categories where budget_category_id=v::uuid) when 'ALLOCATION_UNIT' then exists(select 1 from public.allocation_units where allocation_unit_id=v::uuid) else false end;
exception when others then return false;end $$;

create or replace function public.portal_mcp_preview_rule_applicability(p_payload jsonb,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare d text;it jsonb;b public.calculation_rule_applicability_batches;invalid boolean:=false;conflicts jsonb:='[]'::jsonb;rid uuid;
begin
 if not private.portal_is_authorized(auth.uid(),'RULES.APPLICABILITY_WRITE') then raise exception 'Not authorized' using errcode='42501';end if;
 rid:=(p_payload->>'calculation_rule_id')::uuid;
 if not exists(select 1 from public.calculation_rules where calculation_rule_id=rid and version=(p_payload->>'expected_rule_version')::int and lifecycle_status='APPROVED') then raise exception 'Rule missing, stale or not approved' using errcode='40001';end if;
 if jsonb_typeof(coalesce(p_payload->'conditions','[]'::jsonb))<>'array' or jsonb_typeof(p_payload->'source_evidence')<>'object' or p_payload->'source_evidence'='{}'::jsonb then raise exception 'Invalid applicability payload' using errcode='22023';end if;
 for it in select * from jsonb_array_elements(coalesce(p_payload->'conditions','[]'::jsonb)) loop if not private.validate_rule_context_item(it) then invalid:=true;end if;end loop;
 if invalid then raise exception 'Unknown or invalid canonical context' using errcode='22023';end if;
 d:=encode(extensions.digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex');
 insert into public.calculation_rule_applicability_batches(actor_user_id,idempotency_key,payload,payload_digest,expected_rule_version,expected_applicability_version)
 values(auth.uid(),p_idempotency_key,p_payload,d,(p_payload->>'expected_rule_version')::int,(p_payload->>'expected_applicability_version')::int)
 on conflict(actor_user_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key returning * into b;
 if b.payload_digest<>d then raise exception 'Idempotency key reused with different payload' using errcode='23505';end if;
 return jsonb_build_object('batch_id',b.batch_id,'status',b.status,'payload_digest',b.payload_digest,'row_version',b.row_version,'conditions',coalesce(p_payload->'conditions','[]'::jsonb),'broad',jsonb_array_length(coalesce(p_payload->'conditions','[]'::jsonb))=0);
end $$;

create or replace function public.portal_mcp_request_rule_applicability_approval(p_batch_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.calculation_rule_applicability_batches;a jsonb;p jsonb;begin
 select * into b from public.calculation_rule_applicability_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.status<>'PREVIEWED' then raise exception 'Batch is not approval-ready';end if;p:=jsonb_build_object('batch_id',b.batch_id,'payload_digest',b.payload_digest,'expected_rule_version',b.expected_rule_version,'expected_applicability_version',b.expected_applicability_version,'row_version',b.row_version);
 a:=public.portal_request_approval('RULES.APPLICABILITY_WRITE','CALCULATION_RULE_APPLICABILITY_BATCH',b.batch_id,p,p_reason);
 update public.calculation_rule_applicability_batches set status='APPROVED',approval_id=(a->>'approval_id')::uuid,approved_at=now(),row_version=row_version+1 where batch_id=b.batch_id;return a||jsonb_build_object('batch_id',b.batch_id);
end $$;

create or replace function public.portal_mcp_commit_rule_applicability(p_batch_id uuid,p_approval_id uuid,p_expected_batch_version integer)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.calculation_rule_applicability_batches;s public.calculation_rule_applicability_sets;it jsonb;p jsonb;rid uuid;ver int;spec int;begin
 if not private.portal_is_authorized(auth.uid(),'RULES.APPLICABILITY_WRITE') then raise exception 'Not authorized' using errcode='42501';end if;
 select * into b from public.calculation_rule_applicability_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.status='COMMITTED' and b.approval_id=p_approval_id then return jsonb_build_object('batch_id',b.batch_id,'status',b.status,'applicability_set_id',b.committed_applicability_set_id);end if;
 if b.status<>'APPROVED' or b.approval_id<>p_approval_id or b.row_version<>p_expected_batch_version then raise exception 'Stale, unapproved or mismatched batch' using errcode='40001';end if;
 p:=jsonb_build_object('batch_id',b.batch_id,'payload_digest',b.payload_digest,'expected_rule_version',b.expected_rule_version,'expected_applicability_version',b.expected_applicability_version,'row_version',b.row_version-1);
 perform private.portal_consume_approval(p_approval_id,'RULES.APPLICABILITY_WRITE','CALCULATION_RULE_APPLICABILITY_BATCH',b.batch_id,p);rid:=(b.payload->>'calculation_rule_id')::uuid;
 perform pg_advisory_xact_lock(hashtextextended('applicability:'||rid::text,0));
 if not exists(select 1 from public.calculation_rules where calculation_rule_id=rid and version=b.expected_rule_version and lifecycle_status='APPROVED') then raise exception 'Rule version changed' using errcode='40001';end if;
 select coalesce(max(applicability_version),0)+1 into ver from public.calculation_rule_applicability_sets where calculation_rule_id=rid;
 if b.expected_applicability_version is not null and ver-1<>b.expected_applicability_version then raise exception 'Applicability version changed' using errcode='40001';end if;
 spec:=jsonb_array_length(coalesce(b.payload->'conditions','[]'::jsonb));
 if exists(
  select 1 from public.calculation_rule_applicability_sets x join public.calculation_rules r on r.calculation_rule_id=x.calculation_rule_id
  join (select applicability_set_id,applicability_group,count(*) specificity from public.calculation_rule_contexts group by 1,2
        union all select applicability_set_id,1,0 from public.calculation_rule_applicability_sets z where not exists(select 1 from public.calculation_rule_contexts c where c.applicability_set_id=z.applicability_set_id)) g on g.applicability_set_id=x.applicability_set_id
  where x.lifecycle_status='ACTIVE' and r.rule_type=(select rule_type from public.calculation_rules where calculation_rule_id=rid)
   and x.rule_priority=coalesce((b.payload->>'rule_priority')::smallint,100)
   and daterange(x.effective_from,coalesce(x.effective_to,'infinity'),'[]')&&daterange((b.payload->>'effective_from')::date,coalesce((b.payload->>'effective_to')::date,'infinity'),'[]')
   and g.specificity=spec
   and not exists(select 1 from public.calculation_rule_contexts ec join jsonb_array_elements(coalesce(b.payload->'conditions','[]'::jsonb)) cc on (cc->>'applicability_group')::int=1 and cc->>'context_kind'=ec.context_kind
    where ec.applicability_set_id=x.applicability_set_id and ec.applicability_group=g.applicability_group
      and coalesce(cc->>'context_id',cc->>'context_code')<>private.calculation_context_value(ec.context_kind,ec.school_year_id,ec.calendar_year_id,ec.daycare_id,ec.classroom_id,ec.age_group_id,ec.budget_category_id,ec.allocation_unit_id,ec.context_code))
 ) then raise exception 'Ambiguous overlapping applicability' using errcode='23P01';end if;
 insert into public.calculation_rule_applicability_sets(calculation_rule_id,applicability_version,effective_from,effective_to,rule_priority,source_evidence,approval_id,payload_digest,created_by_user_id)
 values(rid,ver,(b.payload->>'effective_from')::date,(b.payload->>'effective_to')::date,coalesce((b.payload->>'rule_priority')::smallint,100),b.payload->'source_evidence',p_approval_id,b.payload_digest,auth.uid()) returning * into s;
 for it in select * from jsonb_array_elements(coalesce(b.payload->'conditions','[]'::jsonb)) loop insert into public.calculation_rule_contexts(calculation_rule_id,applicability_set_id,applicability_group,context_kind,school_year_id,calendar_year_id,daycare_id,classroom_id,age_group_id,budget_category_id,allocation_unit_id,context_code,created_by_user_id) values(rid,s.applicability_set_id,(it->>'applicability_group')::int,it->>'context_kind',case when it->>'context_kind'='SCHOOL_YEAR' then (it->>'context_id')::uuid end,case when it->>'context_kind'='CALENDAR_YEAR' then (it->>'context_id')::uuid end,case when it->>'context_kind'='DAYCARE' then (it->>'context_id')::uuid end,case when it->>'context_kind'='CLASSROOM' then (it->>'context_id')::uuid end,case when it->>'context_kind'='AGE_GROUP' then (it->>'context_id')::uuid end,case when it->>'context_kind'='BUDGET_CATEGORY' then (it->>'context_id')::uuid end,case when it->>'context_kind'='ALLOCATION_UNIT' then (it->>'context_id')::uuid end,case when it->>'context_kind'='FRAMEWORK_TYPE' then it->>'context_code' end,auth.uid());end loop;
 update public.calculation_rules set enforcement_status=case when implementation_status='IMPLEMENTED' then 'ENFORCED' else 'NOT_ENFORCED' end where calculation_rule_id=rid;
 update public.calculation_rule_applicability_batches set status='COMMITTED',committed_applicability_set_id=s.applicability_set_id,committed_at=now(),row_version=row_version+1 where batch_id=b.batch_id;
 return jsonb_build_object('batch_id',b.batch_id,'status','COMMITTED','applicability_set',to_jsonb(s),'conditions',coalesce(b.payload->'conditions','[]'::jsonb));end $$;

create or replace function public.portal_mcp_preview_rule_override(p_payload jsonb,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare r public.calculation_rule_results;b public.calculation_rule_override_batches;d text;begin
 if not private.portal_is_authorized(auth.uid(),'RULES.OVERRIDE') then raise exception 'Not authorized' using errcode='42501';end if;
 select * into r from public.calculation_rule_results where calculation_result_id=(p_payload->>'calculation_result_id')::uuid;
 if r.calculation_result_id is null or r.row_version<>(p_payload->>'expected_result_version')::int then raise exception 'Result missing or stale' using errcode='40001';end if;
 if length(trim(coalesce(p_payload->>'justification','')))<10 or jsonb_typeof(p_payload->'adjusted_output')<>'object' or jsonb_typeof(p_payload->'source_evidence')<>'object' or p_payload->'source_evidence'='{}'::jsonb or p_payload->'scope'<>r.runtime_context then raise exception 'Invalid or out-of-scope override' using errcode='22023';end if;
 d:=encode(extensions.digest(convert_to(p_payload::text,'UTF8'),'sha256'),'hex');insert into public.calculation_rule_override_batches(actor_user_id,idempotency_key,payload,payload_digest,expected_result_version) values(auth.uid(),p_idempotency_key,p_payload,d,(p_payload->>'expected_result_version')::int) on conflict(actor_user_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key returning * into b;if b.payload_digest<>d then raise exception 'Idempotency key reused with different payload' using errcode='23505';end if;return jsonb_build_object('batch_id',b.batch_id,'status',b.status,'payload_digest',b.payload_digest,'row_version',b.row_version,'original_output',r.output,'adjusted_output',p_payload->'adjusted_output');end $$;

create or replace function public.portal_mcp_request_rule_override_approval(p_batch_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$ declare b public.calculation_rule_override_batches;a jsonb;p jsonb;begin select * into b from public.calculation_rule_override_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;if b.status<>'PREVIEWED' then raise exception 'Batch is not approval-ready';end if;p:=jsonb_build_object('batch_id',b.batch_id,'payload_digest',b.payload_digest,'expected_result_version',b.expected_result_version,'row_version',b.row_version);a:=public.portal_request_approval('RULES.OVERRIDE','CALCULATION_RULE_OVERRIDE_BATCH',b.batch_id,p,p_reason);update public.calculation_rule_override_batches set status='APPROVED',approval_id=(a->>'approval_id')::uuid,approved_at=now(),row_version=row_version+1 where batch_id=b.batch_id;return a||jsonb_build_object('batch_id',b.batch_id);end $$;

create or replace function public.portal_mcp_commit_rule_override(p_batch_id uuid,p_approval_id uuid,p_expected_batch_version integer)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.calculation_rule_override_batches;r public.calculation_rule_results;o public.calculation_rule_overrides;p jsonb;begin
 if not private.portal_is_authorized(auth.uid(),'RULES.OVERRIDE') then raise exception 'Not authorized' using errcode='42501';end if;select * into b from public.calculation_rule_override_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.status='COMMITTED' and b.approval_id=p_approval_id then return jsonb_build_object('batch_id',b.batch_id,'status',b.status,'override_id',b.committed_override_id);end if;if b.status<>'APPROVED' or b.approval_id<>p_approval_id or b.row_version<>p_expected_batch_version then raise exception 'Stale, unapproved or mismatched override' using errcode='40001';end if;
 p:=jsonb_build_object('batch_id',b.batch_id,'payload_digest',b.payload_digest,'expected_result_version',b.expected_result_version,'row_version',b.row_version-1);perform private.portal_consume_approval(p_approval_id,'RULES.OVERRIDE','CALCULATION_RULE_OVERRIDE_BATCH',b.batch_id,p);
 select * into r from public.calculation_rule_results where calculation_result_id=(b.payload->>'calculation_result_id')::uuid for update;if r.row_version<>b.expected_result_version or b.payload->'scope'<>r.runtime_context then raise exception 'Result changed or override scope mismatch' using errcode='40001';end if;
 insert into public.calculation_rule_overrides(calculation_result_id,rule_key,rule_version,original_output,adjusted_output,justification,scope,effective_from,effective_to,source_evidence,approval_id,payload_digest,director_user_id) values(r.calculation_result_id,r.rule_key,r.rule_version,r.output,b.payload->'adjusted_output',trim(b.payload->>'justification'),b.payload->'scope',(b.payload->>'effective_from')::date,(b.payload->>'effective_to')::date,b.payload->'source_evidence',p_approval_id,b.payload_digest,auth.uid()) returning * into o;
 update public.calculation_rule_override_batches set status='COMMITTED',committed_override_id=o.override_id,committed_at=now(),row_version=row_version+1 where batch_id=b.batch_id;insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id,detail) values(auth.uid(),'MCP','RULES.OVERRIDE','CALCULATION_RULE_RESULT',r.calculation_result_id,'SUCCESS',p_approval_id,jsonb_build_object('override_id',o.override_id,'original_output',r.output,'adjusted_output',o.adjusted_output,'scope',o.scope));return jsonb_build_object('batch_id',b.batch_id,'status','COMMITTED','override',to_jsonb(o),'original_output',r.output,'adjusted_output',o.adjusted_output,'final_output',o.adjusted_output);end $$;

create or replace function public.portal_mcp_read_calculation_result(p_result_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$ declare r public.calculation_rule_results;o public.calculation_rule_overrides;begin if not private.portal_is_authorized(auth.uid(),'POLICY.READ') then raise exception 'Not authorized' using errcode='42501';end if;select * into r from public.calculation_rule_results where calculation_result_id=p_result_id;if r.calculation_result_id is null then return null;end if;select * into o from public.calculation_rule_overrides where calculation_result_id=p_result_id and lifecycle_status='ACTIVE' order by created_at desc limit 1;return jsonb_build_object('result',to_jsonb(r),'override',case when o.override_id is null then null else to_jsonb(o) end,'original_output',r.output,'adjusted_output',o.adjusted_output,'final_output',coalesce(o.adjusted_output,r.output));end $$;

create or replace function public.portal_mcp_resolve_calculation_rule(p_rule_type text,p_effective_date date,p_runtime_context jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare selected record;ties int;begin
 if not private.portal_is_authorized(auth.uid(),'POLICY.READ') then raise exception 'Not authorized' using errcode='42501';end if;
 with groups as (
  select s.applicability_set_id,s.calculation_rule_id,coalesce(c.applicability_group,1) applicability_group,count(c.calculation_rule_context_id) specificity
  from public.calculation_rule_applicability_sets s left join public.calculation_rule_contexts c on c.applicability_set_id=s.applicability_set_id
  where s.lifecycle_status='ACTIVE' and p_effective_date between s.effective_from and coalesce(s.effective_to,'infinity')
  group by s.applicability_set_id,s.calculation_rule_id,coalesce(c.applicability_group,1)
 ), matching as (
  select r.*,s.applicability_set_id,s.applicability_version,s.rule_priority applicability_priority,g.applicability_group,g.specificity
  from groups g join public.calculation_rule_applicability_sets s on s.applicability_set_id=g.applicability_set_id join public.calculation_rules r on r.calculation_rule_id=s.calculation_rule_id
  where r.rule_type=p_rule_type and r.lifecycle_status='APPROVED' and not exists(
   select 1 from public.calculation_rule_contexts c where c.applicability_set_id=s.applicability_set_id and c.applicability_group=g.applicability_group
    and private.calculation_context_value(c.context_kind,c.school_year_id,c.calendar_year_id,c.daycare_id,c.classroom_id,c.age_group_id,c.budget_category_id,c.allocation_unit_id,c.context_code)
      is distinct from case c.context_kind when 'FRAMEWORK_TYPE' then p_runtime_context->>'framework_type' else p_runtime_context->>(lower(c.context_kind)||'_id') end)
 ), ranked as(select *,max(specificity) over() max_spec from matching), ranked2 as(select *,min(applicability_priority) over() min_priority from ranked where specificity=max_spec)
 select * into selected from ranked2 where applicability_priority=min_priority order by rule_number limit 1;
 if selected.calculation_rule_id is null then return jsonb_build_object('status','MISSING_RULE','stored',exists(select 1 from public.calculation_rules where rule_type=p_rule_type and lifecycle_status='APPROVED'),'applicability_defined',false,'implemented',false,'enforced',false);end if;
 with candidates as (
  select r.calculation_rule_id,s.applicability_set_id from public.calculation_rules r join public.calculation_rule_applicability_sets s on s.calculation_rule_id=r.calculation_rule_id
  where r.rule_type=p_rule_type and r.lifecycle_status='APPROVED' and s.lifecycle_status='ACTIVE' and p_effective_date between s.effective_from and coalesce(s.effective_to,'infinity') and s.rule_priority=selected.applicability_priority
   and (select count(*) from public.calculation_rule_contexts c where c.applicability_set_id=s.applicability_set_id)=selected.specificity
   and not exists(select 1 from public.calculation_rule_contexts c where c.applicability_set_id=s.applicability_set_id and private.calculation_context_value(c.context_kind,c.school_year_id,c.calendar_year_id,c.daycare_id,c.classroom_id,c.age_group_id,c.budget_category_id,c.allocation_unit_id,c.context_code) is distinct from case c.context_kind when 'FRAMEWORK_TYPE' then p_runtime_context->>'framework_type' else p_runtime_context->>(lower(c.context_kind)||'_id') end))
 select count(*) into ties from candidates;
 if ties>1 then return jsonb_build_object('status','AMBIGUOUS_RULE','stored',true,'applicability_defined',true,'implemented',false,'enforced',false,'candidate_count',ties);end if;
 return jsonb_build_object('status',case when selected.implementation_status='IMPLEMENTED' then 'READY' else 'UNSUPPORTED_HANDLER' end,'stored',true,'applicability_defined',true,'implemented',selected.implementation_status='IMPLEMENTED','enforced',selected.implementation_status='IMPLEMENTED','calculation_rule_id',selected.calculation_rule_id,'rule_key',selected.rule_key,'version',selected.version,'applicability_set_id',selected.applicability_set_id,'applicability_version',selected.applicability_version,'applicability_group',selected.applicability_group,'handler_code',selected.handler_code,'definition',selected.definition,'instruction',selected.instruction);
end $$;

create or replace function public.portal_mcp_execute_calculation_rule(p_rule_type text,p_effective_date date,p_runtime_context jsonb,p_inputs jsonb,p_input_source_evidence jsonb,p_result_mode text default 'CURRENT_RECALCULATION')
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare x jsonb;out jsonb;rid uuid;h public.calculation_rule_handlers;n numeric;ratio numeric;minimum_value numeric;begin
 x:=public.portal_mcp_resolve_calculation_rule(p_rule_type,p_effective_date,p_runtime_context);if x->>'status'<>'READY' then return x;end if;
 if jsonb_typeof(p_input_source_evidence)<>'object' or p_input_source_evidence='{}'::jsonb then raise exception 'Input source evidence required' using errcode='22023';end if;
 select * into h from public.calculation_rule_handlers where handler_code=x->>'handler_code' and implementation_status='IMPLEMENTED' and enforcement_status='ENFORCED';
 if h.handler_code='STAFFING_RATIO_V1' then n:=(p_inputs->>'children_count')::numeric;ratio:=(x->'definition'->>'children_per_staff')::numeric;minimum_value:=coalesce((x->'definition'->>'minimum_staff')::numeric,0);out:=jsonb_build_object('required_staff',greatest(minimum_value,case x->'definition'->>'rounding_method' when 'CEIL_HALF' then ceil((n/ratio)*2)/2 else ceil(n/ratio) end));
 elsif h.handler_code='BUDGET_PARAMETER_V1' then n:=coalesce((p_inputs->>'quantity')::numeric,0);out:=jsonb_build_object('budget_amount',case x->'definition'->>'calculation_method' when 'FIXED' then (x->'definition'->>'amount')::numeric else n*(x->'definition'->>'amount')::numeric end);else return x||jsonb_build_object('status','UNSUPPORTED_HANDLER','implemented',false,'enforced',false);end if;
 insert into public.calculation_rule_results(calculation_rule_id,rule_key,rule_version,applicability_set_id,applicability_group,handler_code,runtime_context,inputs,input_source_evidence,output,method_version,result_mode,created_by_user_id)
 values((x->>'calculation_rule_id')::uuid,(x->>'rule_key')::uuid,(x->>'version')::int,(x->>'applicability_set_id')::uuid,(x->>'applicability_group')::int,h.handler_code,p_runtime_context,p_inputs,p_input_source_evidence,out,h.contract_version,p_result_mode,auth.uid()) returning calculation_result_id into rid;
 return x||jsonb_build_object('status','CALCULATED','calculation_result_id',rid,'runtime_context',p_runtime_context,'inputs',p_inputs,'input_source_evidence',p_input_source_evidence,'original_output',out,'adjusted_output',null,'final_output',out,'calculated_at',now(),'result_mode',p_result_mode);
end $$;

create or replace function public.portal_mcp_list_calculation_rules(p_rule_type text default null,p_lifecycle_status text default null)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$ declare result jsonb;begin
 if not private.portal_is_authorized(auth.uid(),'POLICY.READ') then raise exception 'Not authorized' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('rule_key',r.rule_key,'calculation_rule_id',r.calculation_rule_id,'rule_number',r.rule_number,'version',r.version,'rule_type',r.rule_type,'display_name',r.display_name,'instruction',r.instruction,'lifecycle_status',r.lifecycle_status,'stored',true,'applicability_defined',exists(select 1 from public.calculation_rule_applicability_sets s where s.calculation_rule_id=r.calculation_rule_id and s.lifecycle_status='ACTIVE'),'implemented',r.implementation_status='IMPLEMENTED','enforced',r.implementation_status='IMPLEMENTED' and exists(select 1 from public.calculation_rule_applicability_sets s where s.calculation_rule_id=r.calculation_rule_id and s.lifecycle_status='ACTIVE'),'handler_code',r.handler_code) order by r.rule_number,r.version),'[]'::jsonb) into result from public.calculation_rules r where (p_rule_type is null or r.rule_type=p_rule_type) and (p_lifecycle_status is null or r.lifecycle_status=p_lifecycle_status);return result;end $$;

create or replace function public.portal_mcp_read_calculation_rule(p_rule_key uuid,p_version integer default null)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$ declare result jsonb;begin
 if not private.portal_is_authorized(auth.uid(),'POLICY.READ') then raise exception 'Not authorized' using errcode='42501';end if;
 select jsonb_build_object('rule',to_jsonb(r),'applicability',coalesce((select jsonb_agg(jsonb_build_object('set',to_jsonb(s),'conditions',coalesce((select jsonb_agg(to_jsonb(c) order by c.applicability_group,c.context_kind) from public.calculation_rule_contexts c where c.applicability_set_id=s.applicability_set_id),'[]'::jsonb)) order by s.applicability_version) from public.calculation_rule_applicability_sets s where s.calculation_rule_id=r.calculation_rule_id),'[]'::jsonb),'handler',to_jsonb(h),'stored',true,'applicability_defined',exists(select 1 from public.calculation_rule_applicability_sets s where s.calculation_rule_id=r.calculation_rule_id and s.lifecycle_status='ACTIVE'),'implemented',r.implementation_status='IMPLEMENTED','enforced',r.implementation_status='IMPLEMENTED' and exists(select 1 from public.calculation_rule_applicability_sets s where s.calculation_rule_id=r.calculation_rule_id and s.lifecycle_status='ACTIVE')) into result from public.calculation_rules r left join public.calculation_rule_handlers h on h.handler_code=r.handler_code where r.rule_key=p_rule_key and (p_version is null or r.version=p_version) order by r.version desc limit 1;return result;end $$;

revoke all on function private.validate_rule_context_item(jsonb) from public,anon,authenticated;
revoke all on function public.portal_mcp_commit_rule_instruction(uuid,uuid,integer),public.portal_mcp_preview_rule_applicability(jsonb,text),public.portal_mcp_request_rule_applicability_approval(uuid,text),public.portal_mcp_commit_rule_applicability(uuid,uuid,integer),public.portal_mcp_preview_rule_override(jsonb,text),public.portal_mcp_request_rule_override_approval(uuid,text),public.portal_mcp_commit_rule_override(uuid,uuid,integer),public.portal_mcp_read_calculation_result(uuid) from public,anon;
grant execute on function public.portal_mcp_commit_rule_instruction(uuid,uuid,integer),public.portal_mcp_preview_rule_applicability(jsonb,text),public.portal_mcp_request_rule_applicability_approval(uuid,text),public.portal_mcp_commit_rule_applicability(uuid,uuid,integer),public.portal_mcp_preview_rule_override(jsonb,text),public.portal_mcp_request_rule_override_approval(uuid,text),public.portal_mcp_commit_rule_override(uuid,uuid,integer),public.portal_mcp_read_calculation_result(uuid) to authenticated;
