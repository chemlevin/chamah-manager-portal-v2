-- TRACK137: additive, read-only operational batch discovery.
create or replace function public.portal_mcp_list_operational_batches(
  p_entity text default null,
  p_month date default null,
  p_status text default null,
  p_source text default null,
  p_limit int default 25,
  p_offset int default 0
)
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
  with visible as (
    select b.*, a.expires_at, a.consumed_at, a.action_code,
      coalesce(nullif(b.preview->>'conflict_count','')::int,0) as preview_conflicts,
      jsonb_array_length(b.rows) as row_count,
      nullif(coalesce(
        b.rows->0->>'reporting_month', b.rows->0->>'billing_month', b.rows->0->>'funding_month',
        b.rows->0->>'revenue_month', b.rows->0->>'discrepancy_month', b.rows->0->>'payroll_month'
      ),'')::date as batch_month,
      coalesce((select string_agg(distinct x->>'entity', ',' order by x->>'entity') from jsonb_array_elements(b.rows) x where x ? 'entity'),'') as entities
    from public.mcp_ingestion_batches b
    left join public.portal_action_approvals a on a.approval_id=b.approval_id and a.actor_user_id=auth.uid()
    where b.actor_user_id=auth.uid()
      and private.portal_is_authorized(auth.uid(),'OPERATIONS.READ')
  ), filtered as (
    select * from visible
    where (p_entity is null or entities ilike '%'||p_entity||'%')
      and (p_month is null or batch_month=p_month)
      and (p_status is null or status=p_status)
      and (p_source is null or source_name ilike '%'||left(p_source,120)||'%')
  )
  select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(jsonb_build_object(
      'batch_id',batch_id,
      'entity',case when entities='' then domain else entities end,
      'source',source_name,
      'month',batch_month,
      'row_count',row_count,
      'status',status,
      'approval_id',approval_id,
      'approval_valid',approval_id is not null and expires_at>now() and consumed_at is null,
      'committed_at',committed_at,
      'duplicate_conflict_indicators',jsonb_build_object(
        'preview_conflict_count',preview_conflicts,
        'has_conflicts',preview_conflicts>0 or status='CONFLICTS',
        'preview',coalesce(preview,'{}'::jsonb)
      )
    ) order by created_at desc) from filtered offset greatest(p_offset,0) limit least(greatest(p_limit,1),100)),'[]'::jsonb),
    'limit',least(greatest(p_limit,1),100),'offset',greatest(p_offset,0),
    'total_count',(select count(*) from filtered)
  );
$$;

revoke all on function public.portal_mcp_list_operational_batches(text,date,text,text,int,int) from public,anon;
grant execute on function public.portal_mcp_list_operational_batches(text,date,text,text,int,int) to authenticated;
