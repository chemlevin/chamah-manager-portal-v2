-- Preview-only compatibility fix: staging may contain synthetic fixtures.
-- Production promotion remains protected by portal_mcp_reject_synthetic in commit.
create or replace function public.portal_mcp_preview_operational_changes(
  p_rows jsonb, p_source_name text, p_source_provenance jsonb, p_idempotency_key text
) returns jsonb
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare
  actor uuid:=auth.uid(); b public.mcp_ingestion_batches;
  preview jsonb; digest_value text; staged_rows jsonb;
begin
  if not private.portal_is_authorized(actor,'OPERATIONS.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 1000 then raise exception 'Rows must contain 1..1000 records' using errcode='22023'; end if;
  if jsonb_typeof(p_source_provenance)<>'object' or p_source_provenance='{}'::jsonb then raise exception 'Source provenance is required' using errcode='22023'; end if;
  if length(trim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'Invalid idempotency key' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_rows) r0 where jsonb_typeof(r0)<>'object' or private.portal_mcp_entity_meta(r0->>'entity') is null or jsonb_typeof(r0->'values')<>'object') then raise exception 'Unsupported entity or invalid row' using errcode='22023'; end if;
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
