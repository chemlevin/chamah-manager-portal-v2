-- CHAMAH-RULE-VERSIONING-2026-11-26-001
-- Preserve stable rule identity/number while committing immutable, auditable versions.

alter table public.calculation_rules
  drop constraint if exists calculation_rules_rule_number_key;
alter table public.calculation_rules
  add constraint calculation_rules_rule_number_version_uq unique(rule_number, version),
  add column if not exists change_reason text,
  add column if not exists change_summary text,
  add column if not exists structured_diff jsonb not null default '{}'::jsonb,
  add column if not exists preview_reference uuid references public.calculation_rule_change_batches(batch_id) on delete restrict,
  add column if not exists approval_reference uuid references public.portal_action_approvals(approval_id) on delete restrict,
  add column if not exists commit_reference uuid references public.calculation_rule_change_batches(batch_id) on delete restrict,
  add column if not exists approved_by_user_id uuid,
  add column if not exists versioning_contract_version smallint not null default 1;

alter table public.calculation_rules
  add constraint calculation_rules_structured_diff_object_check
    check(jsonb_typeof(structured_diff)='object'),
  add constraint calculation_rules_amendment_metadata_check check(
    versioning_contract_version<2 or (
      length(trim(coalesce(change_reason,'')))>0 and
      length(trim(coalesce(change_summary,'')))>0 and
      structured_diff<>'{}'::jsonb and
      preview_reference is not null and approval_reference is not null and
      commit_reference is not null and approved_by_user_id is not null
    )
  );

create index calculation_rules_number_version_idx
  on public.calculation_rules(rule_number, version desc);
create index calculation_rules_preview_reference_idx
  on public.calculation_rules(preview_reference) where preview_reference is not null;
create index calculation_rules_commit_reference_idx
  on public.calculation_rules(commit_reference) where commit_reference is not null;

alter table public.calculation_rule_change_batches
  drop constraint if exists calculation_rule_change_batches_status_check;
alter table public.calculation_rule_change_batches
  add constraint calculation_rule_change_batches_status_check
  check(status in('PREVIEWED','APPROVED','COMMITTED','CONFLICT','VALIDATION_FAILED'));

create or replace function private.rule_validation_error(
  p_stage text, p_field text, p_received jsonb, p_expected text, p_code text
) returns jsonb language sql immutable set search_path=pg_temp as $$
  select jsonb_build_object('stage',p_stage,'field',p_field,'received_value',p_received,
    'expected_value',p_expected,'code',p_code);
$$;

create or replace function private.calculation_rule_structured_diff(p_old jsonb,p_new jsonb)
returns jsonb language plpgsql immutable set search_path=pg_temp as $$
declare d jsonb:='{}'::jsonb; k text;
begin
  foreach k in array array['rule_type','display_name','instruction','definition','effective_from',
    'effective_to','rule_priority','handler_code'] loop
    if (p_old->k) is distinct from (p_new->k) then
      d:=d||jsonb_build_object(k,jsonb_build_object('prior',p_old->k,'new',p_new->k));
    end if;
  end loop;
  return d;
end $$;

revoke all on function private.rule_validation_error(text,text,jsonb,text,text),
  private.calculation_rule_structured_diff(jsonb,jsonb) from public,anon,authenticated;

create or replace function private.validate_calculation_rule_payload(p_payload jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,extensions,pg_temp as $$
declare r jsonb:=p_payload->'rule'; errors jsonb:='[]'::jsonb; handler public.calculation_rule_handlers;
  op text:=p_payload->>'operation'; prior public.calculation_rules; received jsonb;
begin
 if op not in ('CREATE','REPLACE') then
  errors:=errors||jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','operation',to_jsonb(op),'CREATE or REPLACE','INVALID_OPERATION'));
 end if;
 if jsonb_typeof(r)<>'object' then
  errors:=errors||jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','rule',coalesce(r,'null'::jsonb),'object','INVALID_RULE'));
  return jsonb_build_object('valid',false,'errors',errors);
 end if;
 if length(trim(coalesce(r->>'display_name','')))=0 then errors:=errors||jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','rule.display_name',r->'display_name','non-empty text','REQUIRED')); end if;
 if length(trim(coalesce(r->>'instruction','')))=0 then errors:=errors||jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','rule.instruction',r->'instruction','non-empty text','REQUIRED')); end if;
 if coalesce(r->>'rule_type','') not in ('OPERATIONAL_PROCEDURE','VALIDATION','CLASSIFICATION','DEPENDENCY','STAFFING_RATIO','STAFFING_ROUNDING','FIXED_ROLE','BUDGET_FORMULA','BUDGET_PARAMETER') then
  errors:=errors||jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','rule.rule_type',r->'rule_type','supported calculation rule type','INVALID_ENUM'));
 end if;
 begin perform (r->>'effective_from')::date; exception when others then errors:=errors||jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','rule.effective_from',r->'effective_from','ISO date YYYY-MM-DD','INVALID_DATE')); end;
 if jsonb_typeof(r->'definition')<>'object' then errors:=errors||jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','rule.definition',r->'definition','object','INVALID_TYPE')); end if;
 if jsonb_typeof(r->'source_evidence')<>'object' or r->'source_evidence'='{}'::jsonb then errors:=errors||jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','rule.source_evidence',r->'source_evidence','non-empty provenance object','PROVENANCE_REQUIRED')); end if;
 if op='REPLACE' then
  begin select * into prior from public.calculation_rules where rule_key=(r->>'rule_key')::uuid order by version desc limit 1;
  exception when others then prior.calculation_rule_id:=null; end;
  if prior.calculation_rule_id is null then errors:=errors||jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','rule.rule_key',r->'rule_key','existing stable rule_key','RULE_NOT_FOUND'));
  elsif coalesce((p_payload->>'expected_version')::int,0)<>prior.version then errors:=errors||jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','expected_version',p_payload->'expected_version',prior.version::text,'STALE_VERSION'));
  end if;
  if length(trim(coalesce(p_payload#>>'{amendment,change_reason}','')))=0 then errors:=errors||jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','amendment.change_reason',p_payload#>'{amendment,change_reason}','non-empty text','REQUIRED')); end if;
  if length(trim(coalesce(p_payload#>>'{amendment,change_summary}','')))=0 then errors:=errors||jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','amendment.change_summary',p_payload#>'{amendment,change_summary}','non-empty text','REQUIRED')); end if;
 end if;
 if nullif(r->>'handler_code','') is not null then
  select * into handler from public.calculation_rule_handlers where handler_code=r->>'handler_code' and implementation_status='IMPLEMENTED';
  if handler.handler_code is null or handler.rule_type<>r->>'rule_type' then errors:=errors||jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','rule.handler_code',r->'handler_code','implemented handler for the same rule_type','UNSUPPORTED_HANDLER')); end if;
 end if;
 return jsonb_build_object('valid',jsonb_array_length(errors)=0,'errors',errors,'stage','PREVIEW_VALIDATION',
  'stored',true,'implemented',nullif(r->>'handler_code','') is not null,'enforced',false);
exception when others then
 received:=jsonb_build_object('sqlstate',sqlstate,'message',sqlerrm);
 return jsonb_build_object('valid',false,'errors',jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','payload',received,'well-typed governed rule payload','INVALID_TYPED_VALUE')),'stage','PREVIEW_VALIDATION');
end $$;

create or replace function public.portal_mcp_preview_calculation_rule(p_payload jsonb,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare validation jsonb; digest_value text; b public.calculation_rule_change_batches; enriched jsonb:=p_payload;
 prior public.calculation_rules; diff jsonb:='{}'::jsonb;
begin
 if not private.portal_is_authorized(auth.uid(),'RULES.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
 if length(coalesce(p_idempotency_key,'')) not between 8 and 160 then
  return jsonb_build_object('status','VALIDATION_FAILED','validation',jsonb_build_object('valid',false,'errors',jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','idempotency_key',to_jsonb(p_idempotency_key),'8-160 characters','INVALID_LENGTH'))));
 end if;
 validation:=private.validate_calculation_rule_payload(p_payload);
 if p_payload->>'operation'='REPLACE' and (validation->>'valid')::boolean then
  select * into prior from public.calculation_rules where rule_key=(p_payload#>>'{rule,rule_key}')::uuid order by version desc limit 1;
  diff:=private.calculation_rule_structured_diff(to_jsonb(prior),p_payload->'rule');
  if diff='{}'::jsonb then validation:=jsonb_set(validation,'{valid}','false'::jsonb)||jsonb_build_object('errors',(validation->'errors')||jsonb_build_array(private.rule_validation_error('PREVIEW_VALIDATION','rule',p_payload->'rule','at least one changed governed field','NO_CHANGE'))); end if;
  enriched:=jsonb_set(enriched,'{amendment,structured_diff}',diff,true);
 end if;
 digest_value:=encode(extensions.digest(convert_to(enriched::text,'UTF8'),'sha256'),'hex');
 insert into public.calculation_rule_change_batches(actor_user_id,idempotency_key,operation,payload,payload_digest,expected_version,status,conflict_evidence)
 values(auth.uid(),p_idempotency_key,enriched->>'operation',enriched,digest_value,(enriched->>'expected_version')::int,
  case when (validation->>'valid')::boolean then 'PREVIEWED' else 'VALIDATION_FAILED' end,'[]'::jsonb)
 on conflict(actor_user_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key returning * into b;
 if b.payload_digest<>digest_value then raise exception 'Idempotency key reused with different payload' using errcode='23505'; end if;
 return jsonb_build_object('batch_id',b.batch_id,'preview_reference',b.batch_id,'status',b.status,'payload_digest',b.payload_digest,'row_version',b.row_version,'validation',validation,'structured_diff',diff,'payload',b.payload);
end $$;

create or replace function public.portal_mcp_commit_rule_instruction(p_batch_id uuid,p_approval_id uuid,p_expected_batch_version integer)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare b public.calculation_rule_change_batches; r jsonb; old_rule public.calculation_rules; new_rule public.calculation_rules; approval_payload jsonb; new_key uuid; new_version int; new_number bigint; handler public.calculation_rule_handlers; old_set public.calculation_rule_applicability_sets; new_set public.calculation_rule_applicability_sets; approver uuid;
begin
 if not private.portal_is_authorized(auth.uid(),'RULES.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into b from public.calculation_rule_change_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.status='COMMITTED' and b.approval_id=p_approval_id then return public.portal_mcp_get_calculation_rule_batch(b.batch_id); end if;
 if b.status<>'APPROVED' or b.approval_id<>p_approval_id or b.row_version<>p_expected_batch_version then raise exception 'COMMIT_VALIDATION|field=batch|received=%|expected=APPROVED exact approval and row_version',coalesce(b.status,'NOT_FOUND') using errcode='40001'; end if;
 approval_payload:=jsonb_build_object('batch_id',b.batch_id,'payload_digest',b.payload_digest,'operation',b.operation,'expected_version',b.expected_version,'row_version',b.row_version-1);
 perform private.portal_consume_approval(p_approval_id,'RULES.WRITE','CALCULATION_RULE_BATCH',b.batch_id,approval_payload);
 select actor_user_id into approver from public.portal_action_approvals where approval_id=p_approval_id;
 r:=b.payload->'rule'; perform pg_advisory_xact_lock(hashtextextended('rule:'||coalesce(r->>'rule_key',r->>'rule_type'),0));
 if b.operation='REPLACE' then
  select * into old_rule from public.calculation_rules where rule_key=(r->>'rule_key')::uuid and lifecycle_status in('APPROVED','ACTIVE') order by version desc limit 1 for update;
  if old_rule.calculation_rule_id is null or old_rule.version<>b.expected_version then raise exception 'COMMIT_VALIDATION|field=expected_version|received=%|expected=%',b.expected_version,coalesce(old_rule.version,0) using errcode='40001'; end if;
  new_key:=old_rule.rule_key; new_version:=old_rule.version+1; new_number:=old_rule.rule_number;
 else new_key:=coalesce((r->>'rule_key')::uuid,gen_random_uuid()); new_version:=1; new_number:=null; end if;
 if nullif(r->>'handler_code','') is not null then select * into handler from public.calculation_rule_handlers where handler_code=r->>'handler_code' and implementation_status='IMPLEMENTED'; end if;
 insert into public.calculation_rules(rule_number,rule_key,rule_type,display_name,instruction,definition,effective_from,effective_to,rule_priority,lifecycle_status,source_evidence,approval_evidence,supersedes_rule_id,previous_version_id,version,created_by_user_id,updated_by_user_id,handler_code,implementation_status,enforcement_status,approval_id,approved_at,change_reason,change_summary,structured_diff,preview_reference,approval_reference,commit_reference,approved_by_user_id,versioning_contract_version)
 overriding system value
 values(coalesce(new_number,nextval(pg_get_serial_sequence('public.calculation_rules','rule_number'))),new_key,r->>'rule_type',r->>'display_name',r->>'instruction',r->'definition',(r->>'effective_from')::date,(r->>'effective_to')::date,coalesce((r->>'rule_priority')::smallint,100),'APPROVED',r->'source_evidence',jsonb_build_object('approval_id',p_approval_id,'payload_digest',b.payload_digest,'batch_id',b.batch_id),old_rule.calculation_rule_id,old_rule.calculation_rule_id,new_version,auth.uid(),auth.uid(),handler.handler_code,case when handler.handler_code is null then 'STORED_ONLY' else 'IMPLEMENTED' end,'NOT_ENFORCED',p_approval_id,now(),b.payload#>>'{amendment,change_reason}',b.payload#>>'{amendment,change_summary}',coalesce(b.payload#>'{amendment,structured_diff}','{}'::jsonb),b.batch_id,p_approval_id,b.batch_id,approver,2) returning * into new_rule;
 if old_rule.calculation_rule_id is not null then
  for old_set in select * from public.calculation_rule_applicability_sets where calculation_rule_id=old_rule.calculation_rule_id and lifecycle_status='ACTIVE' order by applicability_version loop
   insert into public.calculation_rule_applicability_sets(calculation_rule_id,applicability_version,effective_from,effective_to,rule_priority,lifecycle_status,source_evidence,approval_id,payload_digest,previous_applicability_set_id,created_by_user_id)
   values(new_rule.calculation_rule_id,old_set.applicability_version,old_set.effective_from,old_set.effective_to,old_set.rule_priority,'ACTIVE',old_set.source_evidence,old_set.approval_id,old_set.payload_digest,old_set.applicability_set_id,auth.uid()) returning * into new_set;
   insert into public.calculation_rule_contexts(calculation_rule_id,applicability_set_id,applicability_group,context_kind,school_year_id,calendar_year_id,daycare_id,classroom_id,age_group_id,budget_category_id,allocation_unit_id,context_code,created_by_user_id)
   select new_rule.calculation_rule_id,new_set.applicability_set_id,applicability_group,context_kind,school_year_id,calendar_year_id,daycare_id,classroom_id,age_group_id,budget_category_id,allocation_unit_id,context_code,auth.uid() from public.calculation_rule_contexts where applicability_set_id=old_set.applicability_set_id;
  end loop;
  update public.calculation_rules set lifecycle_status='REPLACED' where calculation_rule_id=old_rule.calculation_rule_id;
  update public.calculation_rules set enforcement_status=case when implementation_status='IMPLEMENTED' and exists(select 1 from public.calculation_rule_applicability_sets s where s.calculation_rule_id=new_rule.calculation_rule_id and s.lifecycle_status='ACTIVE') then 'ENFORCED' else 'NOT_ENFORCED' end where calculation_rule_id=new_rule.calculation_rule_id returning * into new_rule;
 end if;
 update public.calculation_rule_change_batches set status='COMMITTED',committed_rule_id=new_rule.calculation_rule_id,committed_at=now(),row_version=row_version+1 where batch_id=b.batch_id;
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id,detail) values(auth.uid(),'MCP','RULES.WRITE','CALCULATION_RULE',new_rule.calculation_rule_id,'SUCCESS',p_approval_id,jsonb_build_object('rule_key',new_key,'rule_number',new_rule.rule_number,'version',new_version,'previous_version_id',old_rule.calculation_rule_id,'structured_diff',new_rule.structured_diff,'preview_reference',b.batch_id,'approval_reference',p_approval_id,'commit_reference',b.batch_id));
 return public.portal_mcp_get_calculation_rule_batch(b.batch_id);
end $$;

create or replace function public.portal_mcp_get_calculation_rule_batch(p_batch_id uuid)
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
 select jsonb_build_object('batch_id',b.batch_id,'preview_reference',b.batch_id,'status',b.status,'payload_digest',b.payload_digest,'row_version',b.row_version,'approval_reference',b.approval_id,'commit_reference',case when b.committed_at is null then null else b.batch_id end,'committed_rule_id',b.committed_rule_id,'created_at',b.created_at,'approved_at',b.approved_at,'committed_at',b.committed_at,'rule',case when r.calculation_rule_id is null then null else to_jsonb(r) end,'version_chain',coalesce((select jsonb_agg(to_jsonb(v) order by v.version) from public.calculation_rules v where v.rule_key=r.rule_key),'[]'::jsonb),'approval',case when a.approval_id is null then null else jsonb_build_object('approval_id',a.approval_id,'payload_digest',a.payload_digest,'approver_user_id',a.actor_user_id,'created_at',a.created_at,'consumed_at',a.consumed_at) end)
 from public.calculation_rule_change_batches b left join public.calculation_rules r on r.calculation_rule_id=b.committed_rule_id left join public.portal_action_approvals a on a.approval_id=b.approval_id
 where b.batch_id=p_batch_id and b.actor_user_id=auth.uid() and private.portal_is_authorized(auth.uid(),'RULES.WRITE');
$$;

create or replace function public.portal_mcp_read_calculation_rule(p_rule_key uuid,p_version integer default null)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare result jsonb; begin
 if not private.portal_is_authorized(auth.uid(),'POLICY.READ') then raise exception 'Not authorized' using errcode='42501'; end if;
 select jsonb_build_object('rule_key',p_rule_key,'requested_version',p_version,'latest_version',(select max(version) from public.calculation_rules where rule_key=p_rule_key),'versions',coalesce(jsonb_agg(jsonb_build_object('rule',to_jsonb(r),'relationship',jsonb_build_object('previous_version_id',r.previous_version_id,'supersedes_rule_id',r.supersedes_rule_id),'workflow_references',jsonb_build_object('preview',r.preview_reference,'approval',coalesce(r.approval_reference,r.approval_id),'commit',r.commit_reference),'applicability',coalesce((select jsonb_agg(jsonb_build_object('set',to_jsonb(s),'conditions',coalesce((select jsonb_agg(to_jsonb(c) order by c.applicability_group,c.context_kind) from public.calculation_rule_contexts c where c.applicability_set_id=s.applicability_set_id),'[]'::jsonb)) order by s.applicability_version) from public.calculation_rule_applicability_sets s where s.calculation_rule_id=r.calculation_rule_id),'[]'::jsonb),'implemented',r.implementation_status='IMPLEMENTED','enforced',r.enforcement_status='ENFORCED') order by r.version),'[]'::jsonb)) into result from public.calculation_rules r where r.rule_key=p_rule_key and (p_version is null or r.version=p_version);
 return result;
end $$;

-- Effective-date resolution keeps replaced versions eligible for dates before a later version.
-- For versions sharing an effective date, the greatest immutable version is authoritative.
create or replace function public.portal_mcp_resolve_calculation_rule(p_rule_type text,p_effective_date date,p_runtime_context jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare selected record; ties int;
begin
 if not private.portal_is_authorized(auth.uid(),'POLICY.READ') then raise exception 'Not authorized' using errcode='42501'; end if;
 with groups as (
  select s.applicability_set_id,s.calculation_rule_id,coalesce(c.applicability_group,1) applicability_group,count(c.calculation_rule_context_id) specificity
  from public.calculation_rule_applicability_sets s left join public.calculation_rule_contexts c on c.applicability_set_id=s.applicability_set_id
  where s.lifecycle_status in('ACTIVE','REPLACED') and p_effective_date between s.effective_from and coalesce(s.effective_to,'infinity') group by 1,2,3
 ), raw as (
  select r.*,s.applicability_set_id,s.applicability_version,s.rule_priority applicability_priority,g.applicability_group,g.specificity
  from groups g join public.calculation_rule_applicability_sets s on s.applicability_set_id=g.applicability_set_id join public.calculation_rules r on r.calculation_rule_id=s.calculation_rule_id
  where r.rule_type=p_rule_type and r.lifecycle_status in('APPROVED','REPLACED') and p_effective_date between r.effective_from and coalesce(r.effective_to,'infinity')
   and not exists(select 1 from public.calculation_rule_contexts c where c.applicability_set_id=s.applicability_set_id and c.applicability_group=g.applicability_group and private.calculation_context_value(c.context_kind,c.school_year_id,c.calendar_year_id,c.daycare_id,c.classroom_id,c.age_group_id,c.budget_category_id,c.allocation_unit_id,c.context_code) is distinct from case c.context_kind when 'FRAMEWORK_TYPE' then p_runtime_context->>'framework_type' else p_runtime_context->>(lower(c.context_kind)||'_id') end)
 ), current_versions as (
  select *,row_number() over(partition by rule_key order by effective_from desc,version desc,applicability_version desc) version_rank from raw
 ), ranked as(select *,max(specificity) over() max_spec from current_versions where version_rank=1), ranked2 as(select *,min(applicability_priority) over() min_priority from ranked where specificity=max_spec), candidates as(select *,count(*) over() candidate_count from ranked2 where applicability_priority=min_priority)
 select * into selected from candidates order by rule_number limit 1;
 if selected.calculation_rule_id is null then return jsonb_build_object('status','MISSING_RULE','stored',exists(select 1 from public.calculation_rules where rule_type=p_rule_type),'applicability_defined',false,'implemented',false,'enforced',false,'effective_date',p_effective_date); end if;
 ties:=selected.candidate_count;
 if ties>1 then return jsonb_build_object('status','AMBIGUOUS_RULE','candidate_count',ties,'effective_date',p_effective_date); end if;
 return jsonb_build_object('status',case when selected.implementation_status='IMPLEMENTED' then 'READY' else 'UNSUPPORTED_HANDLER' end,'stored',true,'applicability_defined',true,'implemented',selected.implementation_status='IMPLEMENTED','enforced',selected.enforcement_status='ENFORCED','calculation_rule_id',selected.calculation_rule_id,'rule_key',selected.rule_key,'rule_number',selected.rule_number,'version',selected.version,'effective_date',p_effective_date,'applicability_set_id',selected.applicability_set_id,'applicability_version',selected.applicability_version,'applicability_group',selected.applicability_group,'handler_code',selected.handler_code,'definition',selected.definition,'instruction',selected.instruction);
end $$;

revoke all on function public.portal_mcp_preview_calculation_rule(jsonb,text),public.portal_mcp_commit_rule_instruction(uuid,uuid,integer),public.portal_mcp_get_calculation_rule_batch(uuid),public.portal_mcp_read_calculation_rule(uuid,integer),public.portal_mcp_resolve_calculation_rule(text,date,jsonb) from public,anon;
grant execute on function public.portal_mcp_preview_calculation_rule(jsonb,text),public.portal_mcp_commit_rule_instruction(uuid,uuid,integer),public.portal_mcp_get_calculation_rule_batch(uuid),public.portal_mcp_read_calculation_rule(uuid,integer),public.portal_mcp_resolve_calculation_rule(text,date,jsonb) to authenticated,service_role;
