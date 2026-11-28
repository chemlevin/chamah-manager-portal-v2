-- Allow safe re-approval of an unchanged calculation-rule batch when its prior approval expired unconsumed.
create or replace function public.portal_mcp_request_calculation_rule_approval(p_batch_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','extensions','pg_temp'
as $function$
declare
  b public.calculation_rule_change_batches;
  prior public.portal_action_approvals;
  approval jsonb;
  approval_payload jsonb;
begin
  if not private.portal_is_authorized(auth.uid(),'RULES.WRITE') then
    raise exception 'Not authorized' using errcode='42501';
  end if;

  select * into b
  from public.calculation_rule_change_batches
  where batch_id=p_batch_id and actor_user_id=auth.uid()
  for update;

  if b.batch_id is null or jsonb_array_length(b.conflict_evidence)>0 then
    raise exception 'Batch is not approval-ready' using errcode='22023';
  end if;

  if b.status='APPROVED' then
    select * into prior
    from public.portal_action_approvals
    where approval_id=b.approval_id
      and action_code='RULES.WRITE'
      and resource_type='CALCULATION_RULE_BATCH'
      and resource_id=b.batch_id;

    if prior.approval_id is null
       or prior.consumed_at is not null
       or prior.expires_at >= now() then
      raise exception 'Batch is not approval-ready' using errcode='22023';
    end if;
  elsif b.status<>'PREVIEWED' then
    raise exception 'Batch is not approval-ready' using errcode='22023';
  end if;

  approval_payload:=jsonb_build_object(
    'batch_id',b.batch_id,
    'payload_digest',b.payload_digest,
    'operation',b.operation,
    'expected_version',b.expected_version,
    'row_version',b.row_version
  );

  approval:=public.portal_request_approval(
    'RULES.WRITE','CALCULATION_RULE_BATCH',b.batch_id,approval_payload,p_reason
  );

  update public.calculation_rule_change_batches
  set status='APPROVED',
      approval_id=(approval->>'approval_id')::uuid,
      approved_at=now(),
      row_version=row_version+1
  where batch_id=b.batch_id;

  return approval||jsonb_build_object('batch_id',b.batch_id,'approved_payload',approval_payload);
end
$function$;
