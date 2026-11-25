-- Generic fail-closed source lineage resolution across registered source batches.
-- Metadata only: no canonical business facts are changed.

create table if not exists public.canonical_source_lineage_resolutions (
  resolution_id uuid primary key default gen_random_uuid(),
  operation_id uuid not null,
  task_id text not null,
  target_batch_id uuid not null,
  target_source_record_id text,
  target_row_key text not null,
  status text not null check (status = any (array['RESOLVED'::text,'UNRESOLVED'::text,'CONFLICT'::text,'DUPLICATE'::text,'INVALID_SOURCE'::text])),
  source_row_id uuid,
  source_batch_id uuid,
  source_row_number integer,
  candidate_count integer not null default 0,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists canonical_source_lineage_resolutions_key
  on public.canonical_source_lineage_resolutions(operation_id,target_row_key);
create index if not exists canonical_source_lineage_resolutions_target_idx
  on public.canonical_source_lineage_resolutions(target_batch_id,status);
alter table public.canonical_source_lineage_resolutions enable row level security;
revoke all on public.canonical_source_lineage_resolutions from public,anon,authenticated;

create or replace function public.portal_mcp_resolve_source_lineage(
  p_task_id text,
  p_operation_id uuid,
  p_idempotency_key text,
  p_target_batch_id uuid,
  p_source_system text default null,
  p_source_file text default null
) returns jsonb
language plpgsql security definer
set search_path=public,private,pg_temp
as $$
declare
  v_batch public.mcp_ingestion_batches;
  v_row jsonb;
  v_rid text;
  v_key text;
  v_matches jsonb;
  v_count integer;
  v_status text;
  v_source_row_id uuid;
  v_source_batch_id uuid;
  v_source_row_number integer;
  v_rows integer:=0;
  v_resolved integer:=0;
  v_unresolved integer:=0;
  v_conflict integer:=0;
  v_duplicate integer:=0;
  v_invalid integer:=0;
  v_digest text;
  v_existing_count integer;
begin
  if not private.portal_is_authorized(auth.uid(),'OPERATIONS.WRITE') then
    raise exception using errcode='42501', message='Director authorization required';
  end if;
  if p_operation_id is null or nullif(trim(p_task_id),'') is null or nullif(trim(p_idempotency_key),'') is null then
    raise exception using errcode='22023', message='Invalid lineage resolution identity';
  end if;
  select * into v_batch from public.mcp_ingestion_batches where batch_id=p_target_batch_id;
  if not found then
    raise exception using errcode='22023', message='Target operational batch not found';
  end if;
  select count(*) into v_existing_count from public.canonical_source_lineage_resolutions where operation_id=p_operation_id;
  if v_existing_count>0 then
    select count(*) filter(where status='RESOLVED'),count(*) filter(where status='UNRESOLVED'),
           count(*) filter(where status='CONFLICT'),count(*) filter(where status='DUPLICATE'),
           count(*) filter(where status='INVALID_SOURCE')
      into v_resolved,v_unresolved,v_conflict,v_duplicate,v_invalid
      from public.canonical_source_lineage_resolutions where operation_id=p_operation_id;
    select encode(digest(jsonb_agg(to_jsonb(r) order by target_row_key)::text,'sha256'),'hex')
      into v_digest from public.canonical_source_lineage_resolutions r where operation_id=p_operation_id;
    return jsonb_build_object('operation_id',p_operation_id,'task_id',p_task_id,'status','REPLAYED','row_count',v_existing_count,'resolved',v_resolved,'unresolved',v_unresolved,'conflict',v_conflict,'duplicate',v_duplicate,'invalid_source',v_invalid,'digest',v_digest,'data_written',false);
  end if;

  for v_row in select * from jsonb_array_elements(coalesce(v_batch.rows,'[]'::jsonb)) loop
    v_rows:=v_rows+1;
    v_rid:=nullif(v_row->>'source_record_id','');
    v_key:=coalesce(v_rid,'ROW-'||v_rows::text)||'|'||coalesce(v_row->>'reporting_month',v_row->>'month','');
    if v_rid is null then
      v_status:='INVALID_SOURCE'; v_invalid:=v_invalid+1; v_count:=0;
    else
      select count(*),jsonb_agg(jsonb_build_object('source_row_id',s.source_row_id,'source_batch_id',s.source_batch_id,'source_row_number',s.source_row_number,'source_file',s.source_file,'source_system',s.source_system,'row_fingerprint',s.row_fingerprint))
        into v_count,v_matches
      from public.canonical_source_rows s
      where s.source_record_id=v_rid
        and (p_source_system is null or s.source_system=p_source_system)
        and (p_source_file is null or s.source_file=p_source_file);
      if v_count=1 then
        v_status:='RESOLVED'; v_resolved:=v_resolved+1;
        v_source_row_id:=(v_matches->0->>'source_row_id')::uuid;
        v_source_batch_id:=(v_matches->0->>'source_batch_id')::uuid;
        v_source_row_number:=(v_matches->0->>'source_row_number')::integer;
      elsif v_count=0 then
        v_status:='UNRESOLVED'; v_unresolved:=v_unresolved+1;
      else
        v_status:='CONFLICT'; v_conflict:=v_conflict+1;
      end if;
    end if;
    insert into public.canonical_source_lineage_resolutions(operation_id,task_id,target_batch_id,target_source_record_id,target_row_key,status,source_row_id,source_batch_id,source_row_number,candidate_count,evidence)
    values(p_operation_id,p_task_id,p_target_batch_id,v_rid,v_key,v_status,v_source_row_id,v_source_batch_id,v_source_row_number,coalesce(v_count,0),jsonb_build_object('source_system',p_source_system,'source_file',p_source_file,'candidates',coalesce(v_matches,'[]'::jsonb)));
    v_source_row_id:=null;v_source_batch_id:=null;v_source_row_number:=null;v_matches:=null;
  end loop;
  select encode(digest(jsonb_agg(to_jsonb(r) order by target_row_key)::text,'sha256'),'hex') into v_digest from public.canonical_source_lineage_resolutions r where operation_id=p_operation_id;
  return jsonb_build_object('operation_id',p_operation_id,'task_id',p_task_id,'status','PREVIEWED','target_batch_id',p_target_batch_id,'row_count',v_rows,'resolved',v_resolved,'unresolved',v_unresolved,'conflict',v_conflict,'duplicate',v_duplicate,'invalid_source',v_invalid,'digest',v_digest,'data_written',false,'metadata_written',true);
end;
$$;
revoke all on function public.portal_mcp_resolve_source_lineage(text,uuid,text,uuid,text,text) from public,anon;
grant execute on function public.portal_mcp_resolve_source_lineage(text,uuid,text,uuid,text,text) to authenticated;
