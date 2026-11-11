-- TRACK119: approval-gated daycare ingestion for the isolated Preview Director MCP.
insert into public.portal_actions(action_code,resource_type,action_kind,requires_approval,display_name)
values
 ('DAYCARE.READ','DAYCARE','READ',false,'קריאת נתוני מעונות'),
 ('DAYCARE.IMPORT','DAYCARE','BULK',true,'ייבוא ועדכון נתוני מעונות')
on conflict(action_code) do update set resource_type=excluded.resource_type,action_kind=excluded.action_kind,
 requires_approval=excluded.requires_approval,display_name=excluded.display_name,is_active=true;
insert into public.portal_role_actions(role_code,action_code)
values('DIRECTOR','DAYCARE.READ'),('DIRECTOR','DAYCARE.IMPORT') on conflict do nothing;

create table public.mcp_ingestion_batches(
 batch_id uuid primary key default gen_random_uuid(), actor_user_id uuid not null references auth.users(id) on delete restrict,
 domain text not null check(domain in('DAYCARES')), idempotency_key text not null check(length(idempotency_key) between 8 and 160),
 source_name text not null default 'ChatGPT', rows jsonb not null check(jsonb_typeof(rows)='array'), preview jsonb not null,
 status text not null check(status in('READY','CONFLICTS','COMMITTED')), approval_id uuid references public.portal_action_approvals(approval_id) on delete restrict,
 created_at timestamptz not null default now(), committed_at timestamptz,
 unique(actor_user_id,domain,idempotency_key)
);
alter table public.mcp_ingestion_batches enable row level security;
revoke all on public.mcp_ingestion_batches from public,anon,authenticated;

create or replace function public.portal_mcp_search_daycares(p_search text default null,p_limit int default 25,p_offset int default 0)
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
 select jsonb_build_object('rows',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb),'limit',least(greatest(p_limit,1),100),'offset',greatest(p_offset,0))
 from (select d.daycare_id,d.daycare_code,d.display_name,d.license_number,d.address_text,d.opened_on,d.closed_on,d.lifecycle_status,d.display_order,d.row_version,d.updated_at,
              u.allocation_unit_code,e.legal_entity_code
       from public.daycares d join public.allocation_units u using(allocation_unit_id) join public.legal_entities e on e.legal_entity_id=d.legal_entity_id
       where private.portal_is_authorized(auth.uid(),'DAYCARE.READ') and (p_search is null or d.daycare_code ilike '%'||left(p_search,120)||'%' or d.display_name ilike '%'||left(p_search,120)||'%' or coalesce(d.license_number,'') ilike '%'||left(p_search,120)||'%')
       order by d.display_order,d.display_name limit least(greatest(p_limit,1),100) offset greatest(p_offset,0)) x;
$$;

create or replace function public.portal_mcp_preview_daycare_import(p_rows jsonb,p_source_name text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.mcp_ingestion_batches; report jsonb; conflicts int; invalid int; duplicates int;
begin
 perform private.portal_require_action('DAYCARE.IMPORT');
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 100 then raise exception 'daycare import requires 1-100 rows'; end if;
 if length(btrim(coalesce(p_idempotency_key,''))) not between 8 and 160 then raise exception 'invalid idempotency key'; end if;
 select * into b from public.mcp_ingestion_batches where actor_user_id=auth.uid() and domain='DAYCARES' and idempotency_key=p_idempotency_key;
 if found then return jsonb_build_object('status','IDEMPOTENT_REPLAY','batch_id',b.batch_id,'preview',b.preview); end if;
 with items as (select value r,ord from jsonb_array_elements(p_rows) with ordinality a(value,ord)),
 codes as (select upper(btrim(r->>'daycare_code')) code,count(*) n from items group by 1),
 analyzed as (
  select i.ord,i.r,d.daycare_id,d.row_version existing_version,
   array_remove(array[
    case when upper(btrim(i.r->>'daycare_code')) !~ '^[A-Z0-9_-]+$' then 'INVALID_DAYCARE_CODE' end,
    case when nullif(btrim(i.r->>'display_name'),'') is null then 'DISPLAY_NAME_REQUIRED' end,
    case when c.n>1 then 'DUPLICATE_IN_FILE' end,
    case when d.daycare_id is not null and nullif(i.r->>'expected_row_version','') is null then 'EXPECTED_ROW_VERSION_REQUIRED' end,
    case when d.daycare_id is not null and nullif(i.r->>'expected_row_version','') is not null and (i.r->>'expected_row_version')::int<>d.row_version then 'STALE_ROW_VERSION' end,
    case when nullif(btrim(i.r->>'license_number'),'') is not null and exists(select 1 from public.daycares q where q.license_number=btrim(i.r->>'license_number') and q.daycare_id is distinct from d.daycare_id) then 'LICENSE_NUMBER_CONFLICT' end
   ],null) issues
  from items i join codes c on c.code=upper(btrim(i.r->>'daycare_code')) left join public.daycares d on d.daycare_code=upper(btrim(i.r->>'daycare_code'))
 ), records as (select ord,upper(btrim(r->>'daycare_code')) daycare_code,coalesce((select 'CONFLICT' where cardinality(issues)>0),case when daycare_id is null then 'CREATE' else 'UPDATE' end) action,issues,existing_version from analyzed order by ord)
 select jsonb_build_object('records',coalesce(jsonb_agg(to_jsonb(records)),'[]'::jsonb),'create_count',count(*) filter(where action='CREATE'),'update_count',count(*) filter(where action='UPDATE'),'conflict_count',count(*) filter(where action='CONFLICT')),
        count(*) filter(where action='CONFLICT') into report,conflicts from records;
 insert into public.mcp_ingestion_batches(actor_user_id,domain,idempotency_key,source_name,rows,preview,status)
 values(auth.uid(),'DAYCARES',p_idempotency_key,left(coalesce(nullif(btrim(p_source_name),''),'ChatGPT'),120),p_rows,report,case when conflicts=0 then 'READY' else 'CONFLICTS' end) returning * into b;
 return jsonb_build_object('status',b.status,'batch_id',b.batch_id,'preview',report,'requires_director_approval',conflicts=0);
end$$;

create or replace function public.portal_mcp_request_daycare_import_approval(p_batch_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.mcp_ingestion_batches; result jsonb; payload jsonb;
begin
 select * into b from public.mcp_ingestion_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if not found or b.status<>'READY' then raise exception 'batch is not ready for approval'; end if;
 payload:=jsonb_build_object('batch_id',b.batch_id,'rows',b.rows);
 result:=public.portal_request_approval('DAYCARE.IMPORT','DAYCARE_IMPORT',b.batch_id,payload,p_reason);
 update public.mcp_ingestion_batches set approval_id=(result->>'approval_id')::uuid where batch_id=b.batch_id;
 return result||jsonb_build_object('batch_id',b.batch_id);
end$$;

create or replace function public.portal_mcp_commit_daycare_import(p_batch_id uuid,p_approval_id uuid)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.mcp_ingestion_batches; item jsonb; entity_id uuid; unit_id uuid; d public.daycares; created int:=0; updated int:=0; payload jsonb;
begin
 perform private.portal_require_action('DAYCARE.IMPORT');
 select * into b from public.mcp_ingestion_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if not found or b.status<>'READY' or b.approval_id is distinct from p_approval_id then raise exception 'approved ready batch required'; end if;
 payload:=jsonb_build_object('batch_id',b.batch_id,'rows',b.rows);
 perform private.portal_consume_approval(p_approval_id,'DAYCARE.IMPORT','DAYCARE_IMPORT',b.batch_id,payload);
 select legal_entity_id into entity_id from public.legal_entities where legal_entity_code='TRACK119_ORG' and lifecycle_status='ACTIVE';
 if entity_id is null then raise exception 'TRACK119 synthetic legal entity missing'; end if;
 for item in select value from jsonb_array_elements(b.rows) loop
  select * into d from public.daycares where daycare_code=upper(btrim(item->>'daycare_code')) for update;
  if d.daycare_id is null then
   insert into public.allocation_units(allocation_unit_code,display_name,allocation_unit_type,legal_entity_id,created_by_user_id,updated_by_user_id)
   values('DAYCARE_'||upper(btrim(item->>'daycare_code')),btrim(item->>'display_name'),'DAYCARE',entity_id,auth.uid(),auth.uid()) returning allocation_unit_id into unit_id;
   insert into public.daycares(daycare_code,display_name,license_number,legal_entity_id,allocation_unit_id,address_text,opened_on,closed_on,lifecycle_status,display_order,created_by_user_id,updated_by_user_id)
   values(upper(btrim(item->>'daycare_code')),btrim(item->>'display_name'),nullif(btrim(item->>'license_number'),''),entity_id,unit_id,nullif(btrim(item->>'address_text'),''),nullif(item->>'opened_on','')::date,nullif(item->>'closed_on','')::date,coalesce(nullif(item->>'lifecycle_status',''),'ACTIVE'),coalesce((item->>'display_order')::int,0),auth.uid(),auth.uid()) returning * into d;
   created:=created+1;
  else
   update public.daycares set display_name=btrim(item->>'display_name'),license_number=case when item?'license_number' then nullif(btrim(item->>'license_number'),'') else license_number end,address_text=case when item?'address_text' then nullif(btrim(item->>'address_text'),'') else address_text end,opened_on=case when item?'opened_on' then nullif(item->>'opened_on','')::date else opened_on end,closed_on=case when item?'closed_on' then nullif(item->>'closed_on','')::date else closed_on end,lifecycle_status=coalesce(nullif(item->>'lifecycle_status',''),lifecycle_status),display_order=coalesce((item->>'display_order')::int,display_order),updated_by_user_id=auth.uid()
   where daycare_id=d.daycare_id and row_version=(item->>'expected_row_version')::int returning * into d;
   if not found then raise exception 'daycare changed; refresh required'; end if; updated:=updated+1;
  end if;
  insert into public.audit_events(entity_type,entity_id,operation,new_values,source_type,actor_user_id) values('daycares',d.daycare_id,'MCP_IMPORT',to_jsonb(d),'MCP',auth.uid());
 end loop;
 update public.mcp_ingestion_batches set status='COMMITTED',committed_at=now() where batch_id=b.batch_id;
 return jsonb_build_object('status','COMMITTED','batch_id',b.batch_id,'created_count',created,'updated_count',updated,'verified_count',(select count(*) from public.daycares where daycare_code in(select upper(btrim(value->>'daycare_code')) from jsonb_array_elements(b.rows))));
end$$;

insert into public.legal_entity_types(legal_entity_type_code,display_name,display_order) values('NONPROFIT','עמותה',1) on conflict(legal_entity_type_code) do nothing;
insert into public.legal_entities(legal_entity_code,display_name,legal_name,legal_entity_type_id,registration_number,display_order)
select 'TRACK119_ORG','TRACK119 Synthetic Organization','TRACK119 Synthetic Organization',legal_entity_type_id,'SYNTHETIC-TRACK119',1 from public.legal_entity_types where legal_entity_type_code='NONPROFIT'
on conflict(legal_entity_code) do nothing;

grant execute on function public.portal_mcp_search_daycares(text,int,int),public.portal_mcp_preview_daycare_import(jsonb,text,text),public.portal_mcp_request_daycare_import_approval(uuid,text),public.portal_mcp_commit_daycare_import(uuid,uuid) to authenticated;
