CREATE OR REPLACE FUNCTION public.portal_mcp_commit_rule_instruction(p_batch_id uuid, p_approval_id uuid, p_expected_batch_version integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'extensions', 'pg_temp'
AS $function$
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
 values(coalesce(new_number,nextval(pg_get_serial_sequence('public.calculation_rules','rule_number'))),new_key,r->>'rule_type',r->>'display_name',r->>'instruction',r->'definition',coalesce(r->>'effective_from',r->>'effective_date')::date,(r->>'effective_to')::date,coalesce((r->>'rule_priority')::smallint,100),'APPROVED',coalesce(r->'source_evidence',jsonb_build_object('source','GOVERNED_RULE_PREVIEW','batch_id',b.batch_id,'payload_digest',b.payload_digest)),jsonb_build_object('approval_id',p_approval_id,'payload_digest',b.payload_digest,'batch_id',b.batch_id),old_rule.calculation_rule_id,old_rule.calculation_rule_id,new_version,auth.uid(),auth.uid(),handler.handler_code,case when handler.handler_code is null then 'STORED_ONLY' else 'IMPLEMENTED' end,'NOT_ENFORCED',p_approval_id,now(),coalesce(b.payload#>>'{amendment,change_reason}',r->>'change_reason','Initial governed rule instruction'),coalesce(b.payload#>>'{amendment,change_summary}',r->>'change_summary','First approved version'),coalesce(b.payload#>'{amendment,structured_diff}','{}'::jsonb),b.batch_id,p_approval_id,b.batch_id,approver,2) returning * into new_rule;
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
end $function$
