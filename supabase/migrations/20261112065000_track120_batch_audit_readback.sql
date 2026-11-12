create or replace function public.portal_mcp_get_operational_batch(p_batch_id uuid)
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
 select jsonb_build_object(
  'batch_id',b.batch_id,
  'domain',b.domain,
  'source_name',b.source_name,
  'status',b.status,
  'row_version',b.row_version,
  'preview_digest',b.preview_digest,
  'preview',b.preview,
  'approval_id',b.approval_id,
  'created_at',b.created_at,
  'committed_at',b.committed_at,
  'commit_result',b.commit_result,
  'record_audit',coalesce((
   select jsonb_agg(jsonb_build_object(
    'audit_event_id',a.audit_event_id,
    'entity_type',a.entity_type,
    'entity_id',a.entity_id,
    'operation',a.operation,
    'source_type',a.source_type,
    'actor_user_id',a.actor_user_id,
    'occurred_at',a.occurred_at,
    'row_version',a.new_values->'row_version'
   ) order by a.occurred_at)
   from public.audit_events a
   where a.new_values->>'_mcp_batch_id'=b.batch_id::text
  ),'[]'::jsonb),
  'authorization_audit',coalesce((
   select jsonb_agg(jsonb_build_object(
    'event_id',a.event_id,
    'action_code',a.action_code,
    'decision',a.decision,
    'approval_id',a.approval_id,
    'actor_user_id',a.actor_user_id,
    'occurred_at',a.occurred_at,
    'detail',a.detail
   ) order by a.occurred_at)
   from public.portal_authorization_audit a
   where a.resource_type='OPERATIONAL_CHANGESET' and a.resource_id=b.batch_id
  ),'[]'::jsonb)
 )
 from public.mcp_ingestion_batches b
 where b.batch_id=p_batch_id
   and b.actor_user_id=auth.uid()
   and private.portal_is_authorized(auth.uid(),'OPERATIONS.READ');
$$;

revoke all on function public.portal_mcp_get_operational_batch(uuid) from public,anon;
grant execute on function public.portal_mcp_get_operational_batch(uuid) to authenticated;
