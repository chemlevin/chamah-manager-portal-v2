-- TRACK152: bounded, read-only operational batch recovery read-back.
-- Additive only. Existing get_operational_batch and all write semantics remain unchanged.

create or replace function public.portal_mcp_get_operational_batch_status(p_batch_id uuid)
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
with b as (
  select b.*, a.expires_at, a.consumed_at
  from public.mcp_ingestion_batches b
  left join public.portal_action_approvals a on a.approval_id=b.approval_id and a.actor_user_id=auth.uid()
  where b.batch_id=p_batch_id
    and b.actor_user_id=auth.uid()
    and private.portal_is_authorized(auth.uid(),'OPERATIONS.READ')
), counts as (
  select b.*,
    jsonb_array_length(coalesce(b.rows,'[]'::jsonb)) staged_count,
    case when jsonb_typeof(b.commit_result->'records')='array' then jsonb_array_length(b.commit_result->'records') else 0 end committed_count,
    (select count(*) from public.audit_events a where a.new_values->>'_mcp_batch_id'=b.batch_id::text) record_audit_count,
    (select count(*) from public.portal_authorization_audit a where a.resource_type='OPERATIONAL_CHANGESET' and a.resource_id=b.batch_id) authorization_audit_count,
    case when jsonb_typeof(b.source_provenance)='object' and b.source_provenance<>'{}'::jsonb then 1 else 0 end lineage_count
  from b
)
select jsonb_build_object(
  'batch_id',batch_id,
  'status',status,
  'row_version',row_version,
  'preview_digest',preview_digest,
  'approval_id',approval_id,
  'approval_state',case when approval_id is null then 'NONE' when consumed_at is not null then 'CONSUMED' when expires_at is not null and expires_at<=now() then 'EXPIRED' else 'UNCONSUMED' end,
  'committed_at',committed_at,
  'commit_result_digest',case when commit_result is null then null else md5(commit_result::text) end,
  'counts',jsonb_build_object('staged',staged_count,'committed',committed_count,'eligible',coalesce(nullif(preview->>'eligible_count','')::int,0),'unresolved',coalesce(nullif(preview->>'unresolved_count','')::int,0),'record_audit',record_audit_count,'authorization_audit',authorization_audit_count,'lineage',lineage_count),
  'integrity_flags',jsonb_build_object(
    'status_commit_evidence_mismatch',status='READY' and (committed_at is not null or commit_result is not null or committed_count>0),
    'committed_without_timestamp',status='COMMITTED' and committed_at is null,
    'committed_without_result',status='COMMITTED' and commit_result is null,
    'approval_consumption_mismatch',status='COMMITTED' and consumed_at is null,
    'commit_result_count_mismatch',status='COMMITTED' and committed_count<>staged_count
  ),
  'next_action',case
    when status='COMMITTED' and (committed_at is null or commit_result is null or consumed_at is null) then 'INVESTIGATE_INTEGRITY'
    when status='COMMITTED' then 'READ_COMMITTED_DETAILS'
    when status='READY' and approval_id is null then 'REQUEST_APPROVAL'
    when status='READY' and consumed_at is not null then 'INVESTIGATE_APPROVAL'
    when status='READY' and expires_at is not null and expires_at<=now() then 'REQUEST_NEW_APPROVAL'
    when status='READY' then 'CHECK_STATUS_BEFORE_COMMIT_RETRY'
    when status='CONFLICTS' then 'RESOLVE_CONFLICTS'
    else 'INVESTIGATE_INTEGRITY'
  end
)
from counts;
$$;

create or replace function public.portal_mcp_get_operational_batch_page(
  p_batch_id uuid,
  p_detail_type text,
  p_limit int default 25,
  p_cursor text default null
)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare
  b public.mcp_ingestion_batches;
  safe_limit int:=least(greatest(coalesce(p_limit,25),1),100);
  cursor_index int:=0;
  cursor_time timestamptz;
  cursor_id uuid;
  items jsonb:='[]'::jsonb;
  total_count int:=0;
  next_cursor text:=null;
  returned_count int:=0;
begin
  if p_detail_type not in ('staged_rows','committed_records','record_audit','authorization_audit','source_lineage','discrepancies') then raise exception 'invalid operational batch detail type' using errcode='22023'; end if;
  if p_limit is not null and (p_limit<1 or p_limit>100) then raise exception 'invalid operational batch page limit' using errcode='22023'; end if;
  select * into b from public.mcp_ingestion_batches x
    where x.batch_id=p_batch_id and x.actor_user_id=auth.uid() and private.portal_is_authorized(auth.uid(),'OPERATIONS.READ');
  if not found then return jsonb_build_object('detail_type',p_detail_type,'limit',safe_limit,'max_limit',100,'items','[]'::jsonb,'returned_count',0,'total_count',0,'next_cursor',null,'complete',true,'response_size_bytes',0); end if;
  if p_cursor is not null then
    begin
      cursor_index:=(convert_from(decode(replace(replace(p_cursor,'-','+'),'_','/')||repeat('=',(4-length(p_cursor)%4)%4,'='),'base64'),'utf8')::jsonb->>'index')::int;
      cursor_time:=(convert_from(decode(replace(replace(p_cursor,'-','+'),'_','/')||repeat('=',(4-length(p_cursor)%4)%4,'='),'base64'),'utf8')::jsonb->>'occurred_at')::timestamptz;
      cursor_id:=(convert_from(decode(replace(replace(p_cursor,'-','+'),'_','/')||repeat('=',(4-length(p_cursor)%4)%4,'='),'base64'),'utf8')::jsonb->>'event_id')::uuid;
    exception when others then raise exception 'invalid operational batch cursor' using errcode='22023'; end;
  end if;
  if p_detail_type='staged_rows' then
    select count(*) into total_count from jsonb_array_elements(coalesce(b.rows,'[]'::jsonb));
    select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into items from (select value,ord from jsonb_array_elements(coalesce(b.rows,'[]'::jsonb)) with ordinality q(value,ord) where ord>cursor_index and ord<=cursor_index+safe_limit) s;
  elsif p_detail_type='committed_records' then
    select count(*) into total_count from jsonb_array_elements(case when jsonb_typeof(b.commit_result->'records')='array' then b.commit_result->'records' else '[]'::jsonb end);
    select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into items from (select value,ord from jsonb_array_elements(case when jsonb_typeof(b.commit_result->'records')='array' then b.commit_result->'records' else '[]'::jsonb end) with ordinality q(value,ord) where ord>cursor_index and ord<=cursor_index+safe_limit) s;
  elsif p_detail_type='source_lineage' then
    select count(*) into total_count from jsonb_array_elements(coalesce(b.rows,'[]'::jsonb));
    select coalesce(jsonb_agg(jsonb_build_object('row_index',ord-1,'source_provenance',b.source_provenance,'row_lineage',value) order by ord),'[]'::jsonb) into items from (select value,ord from jsonb_array_elements(coalesce(b.rows,'[]'::jsonb)) with ordinality q(value,ord) where ord>cursor_index and ord<=cursor_index+safe_limit) s;
  elsif p_detail_type='discrepancies' then
    select count(*) into total_count from jsonb_array_elements(coalesce(b.preview->'records','[]'::jsonb)) q where q.value->>'status' in ('CONFLICT','UNRESOLVED','DISCREPANCY');
    select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into items from (select value,ord from jsonb_array_elements(coalesce(b.preview->'records','[]'::jsonb)) with ordinality q(value,ord) where value->>'status' in ('CONFLICT','UNRESOLVED','DISCREPANCY') and ord>cursor_index and ord<=cursor_index+safe_limit) s;
  elsif p_detail_type='record_audit' then
    select count(*) into total_count from public.audit_events a where a.new_values->>'_mcp_batch_id'=b.batch_id::text;
    select coalesce(jsonb_agg(jsonb_build_object('audit_event_id',audit_event_id,'entity_type',entity_type,'entity_id',entity_id,'operation',operation,'source_type',source_type,'actor_user_id',actor_user_id,'occurred_at',occurred_at,'row_version',new_values->'row_version') order by occurred_at,audit_event_id),'[]'::jsonb) into items from (select a.* from public.audit_events a where a.new_values->>'_mcp_batch_id'=b.batch_id::text and (cursor_time is null or (a.occurred_at,a.audit_event_id)>(cursor_time,cursor_id)) order by a.occurred_at,a.audit_event_id limit safe_limit) a;
  else
    select count(*) into total_count from public.portal_authorization_audit a where a.resource_type='OPERATIONAL_CHANGESET' and a.resource_id=b.batch_id;
    select coalesce(jsonb_agg(jsonb_build_object('event_id',event_id,'action_code',action_code,'resource_type',resource_type,'resource_id',resource_id,'decision',decision,'approval_id',approval_id,'detail',detail,'occurred_at',occurred_at) order by occurred_at,event_id),'[]'::jsonb) into items from (select a.* from public.portal_authorization_audit a where a.resource_type='OPERATIONAL_CHANGESET' and a.resource_id=b.batch_id and (cursor_time is null or (a.occurred_at,a.event_id)>(cursor_time,cursor_id)) order by a.occurred_at,a.event_id limit safe_limit) a;
  end if;
  returned_count:=jsonb_array_length(items);
  if returned_count>0 and returned_count+cursor_index<total_count then
    if p_detail_type in ('staged_rows','committed_records','source_lineage','discrepancies') then next_cursor:=encode(convert_to(jsonb_build_object('index',cursor_index+returned_count)::text,'utf8'),'base64'); else next_cursor:=encode(convert_to(jsonb_build_object('occurred_at',items->(returned_count-1)->>'occurred_at','event_id',coalesce(items->(returned_count-1)->>'audit_event_id',items->(returned_count-1)->>'event_id'))::text,'utf8'),'base64'); end if;
  end if;
  return jsonb_build_object('detail_type',p_detail_type,'limit',safe_limit,'max_limit',100,'items',items,'returned_count',returned_count,'total_count',total_count,'next_cursor',next_cursor,'complete',next_cursor is null,'response_size_bytes',octet_length(items::text));
end;
$$;

revoke all on function public.portal_mcp_get_operational_batch_status(uuid),public.portal_mcp_get_operational_batch_page(uuid,text,int,text) from public,anon;
grant execute on function public.portal_mcp_get_operational_batch_status(uuid),public.portal_mcp_get_operational_batch_page(uuid,text,int,text) to authenticated;
