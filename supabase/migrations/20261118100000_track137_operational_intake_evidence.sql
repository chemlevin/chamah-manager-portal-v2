-- TRACK137: additive operational intake evidence and read-back.
-- Preserve the 1.0.0 MCP contract while making the exact staged values,
-- stable source keys, current values, changed fields and match evidence readable.

create or replace function private.portal_mcp_intake_evidence(p_row jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare
  meta jsonb:=private.portal_mcp_entity_meta(p_row->>'entity');
  values_json jsonb:=coalesce(p_row->'values','{}'::jsonb);
  current_json jsonb:=coalesce(p_row->'_matched_record','null'::jsonb);
  stable_keys jsonb:=coalesce(meta->'stable','[]'::jsonb);
  source_keys jsonb:='{}'::jsonb;
  changed_fields jsonb:='[]'::jsonb;
  key_name text;
  field_name text;
begin
  for key_name in select jsonb_array_elements_text(stable_keys) loop
    if values_json ? key_name and nullif(values_json->>key_name,'') is not null then
      source_keys:=source_keys||jsonb_build_object(key_name,values_json->key_name);
    end if;
  end loop;
  if jsonb_typeof(current_json)='object' then
    for field_name in select jsonb_object_keys(values_json) loop
      if current_json->field_name is distinct from values_json->field_name then
        changed_fields:=changed_fields||jsonb_build_array(field_name);
      end if;
    end loop;
  end if;
  return jsonb_build_object(
    'source_values',values_json,
    'source_keys',source_keys,
    'current_values',case when jsonb_typeof(current_json)='object' then current_json else null end,
    'changed_fields',changed_fields,
    'matching_evidence',jsonb_build_object(
      'stable_keys',stable_keys,
      'matched_record_id',nullif(p_row->>'record_id',''),
      'match_conflict',p_row->>'_match_conflict',
      'strategy','STABLE_KEYS'
    )
  );
end
$$;

revoke all on function private.portal_mcp_intake_evidence(jsonb) from public,anon,authenticated;

create or replace function private.portal_mcp_preview_evidence(p_rows jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare out_rows jsonb:='[]'::jsonb; r jsonb; conflicts jsonb; n int:=0; operation text;
begin
  for r in select value from jsonb_array_elements(p_rows) loop
    n:=n+1;
    conflicts:=private.portal_mcp_row_conflicts(r,p_rows);
    operation:=case when jsonb_array_length(conflicts)>0 then 'CONFLICT' when nullif(r->>'record_id','') is null then 'CREATE' when (r->'_matched_record') @> (r->'values') then 'SKIP' else 'UPDATE' end;
    out_rows:=out_rows||jsonb_build_array(jsonb_build_object(
      'source_row',n,'entity',r->>'entity','record_id',r->>'record_id',
      'expected_row_version',r->'expected_row_version','operation',operation,
      'classification',operation,
      'status',case when jsonb_array_length(conflicts)>0 then 'CONFLICT' else 'READY' end,
      'conflicts',conflicts
    )||private.portal_mcp_intake_evidence(r));
  end loop;
  return out_rows;
end
$$;
revoke all on function private.portal_mcp_preview_evidence(jsonb) from public,anon,authenticated;

create or replace function public.portal_mcp_preview_operational_changes(p_rows jsonb,p_source_name text,p_source_provenance jsonb,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare actor uuid:=auth.uid(); b public.mcp_ingestion_batches; preview jsonb; digest_value text; staged_rows jsonb;
begin
 if not private.portal_is_authorized(actor,'OPERATIONS.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 1000 then raise exception 'Rows must contain 1..1000 records' using errcode='22023'; end if;
 if jsonb_typeof(p_source_provenance)<>'object' or p_source_provenance='{}'::jsonb then raise exception 'Source provenance is required' using errcode='22023'; end if;
 if length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'Invalid idempotency key' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r0 where jsonb_typeof(r0)<>'object' or private.portal_mcp_entity_meta(r0->>'entity') is null or jsonb_typeof(r0->'values')<>'object') then raise exception 'Unsupported entity or invalid row' using errcode='22023'; end if;
 perform private.portal_mcp_reject_synthetic(p_source_name,p_source_provenance,p_rows);
 select jsonb_agg(private.portal_mcp_match_operational_row_v2(r0) order by ord) into staged_rows from jsonb_array_elements(p_rows) with ordinality x(r0,ord);
 preview:=private.portal_mcp_preview_evidence(staged_rows);
 digest_value:=encode(digest(staged_rows::text,'sha256'),'hex');
 select * into b from public.mcp_ingestion_batches where actor_user_id=actor and domain='OPERATIONS' and idempotency_key=trim(p_idempotency_key);
 if b.batch_id is not null then
  if b.preview_digest<>digest_value or b.source_provenance is distinct from p_source_provenance then raise exception 'Idempotency key reused with different payload' using errcode='23505'; end if;
  return jsonb_build_object('batch_id',b.batch_id,'status',b.status,'preview',b.preview,'preview_digest',b.preview_digest,'idempotent_replay',true,'verification_status',b.verification_status,'source_provenance',b.source_provenance);
 end if;
 insert into public.mcp_ingestion_batches(actor_user_id,domain,source_name,idempotency_key,rows,preview,preview_digest,status,source_provenance,verification_status)
 values(actor,'OPERATIONS',coalesce(nullif(trim(p_source_name),''),'ChatGPT'),trim(p_idempotency_key),staged_rows,preview,digest_value,
  case when exists(select 1 from jsonb_array_elements(preview) p where p->>'status'='CONFLICT') then 'CONFLICTS' else 'READY' end,
  p_source_provenance,'PENDING_VERIFICATION') returning * into b;
 return jsonb_build_object('batch_id',b.batch_id,'status',b.status,'preview',b.preview,'preview_digest',b.preview_digest,'verification_status',b.verification_status,'source_provenance',b.source_provenance);
end
$$;
revoke all on function public.portal_mcp_preview_operational_changes(jsonb,text,jsonb,text) from public,anon;
grant execute on function public.portal_mcp_preview_operational_changes(jsonb,text,jsonb,text) to authenticated;

create or replace function public.portal_mcp_get_operational_batch(p_batch_id uuid)
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
 select jsonb_build_object(
  'batch_id',b.batch_id,'domain',b.domain,'source_name',b.source_name,'status',b.status,
  'row_version',b.row_version,'preview_digest',b.preview_digest,'preview',b.preview,
  'staged_rows',b.rows,'source_provenance',b.source_provenance,'verification_status',b.verification_status,
  'approval_id',b.approval_id,'created_at',b.created_at,'committed_at',b.committed_at,'commit_result',b.commit_result,
  'record_audit',coalesce((select jsonb_agg(jsonb_build_object('audit_event_id',a.audit_event_id,'entity_type',a.entity_type,'entity_id',a.entity_id,'operation',a.operation,'source_type',a.source_type,'actor_user_id',a.actor_user_id,'occurred_at',a.occurred_at,'row_version',a.new_values->'row_version') order by a.occurred_at) from public.audit_events a where a.new_values->>'_mcp_batch_id'=b.batch_id::text),'[]'::jsonb),
  'authorization_audit',coalesce((select jsonb_agg(jsonb_build_object('event_id',a.event_id,'action_code',a.action_code,'decision',a.decision,'approval_id',a.approval_id,'actor_user_id',a.actor_user_id,'occurred_at',a.occurred_at,'detail',a.detail) order by a.occurred_at) from public.portal_authorization_audit a where a.resource_type='OPERATIONAL_CHANGESET' and a.resource_id=b.batch_id),'[]'::jsonb)
 )
 from public.mcp_ingestion_batches b
 where b.batch_id=p_batch_id and b.actor_user_id=auth.uid() and private.portal_is_authorized(auth.uid(),'OPERATIONS.READ');
$$;
revoke all on function public.portal_mcp_get_operational_batch(uuid) from public,anon;
grant execute on function public.portal_mcp_get_operational_batch(uuid) to authenticated;
