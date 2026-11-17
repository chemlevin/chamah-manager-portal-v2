-- TRACK110: canonical Director-only authorization for Portal, API and MCP.
create schema if not exists private;

create table public.portal_roles (
  role_code text primary key check (role_code ~ '^[A-Z][A-Z0-9_]*$'),
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.portal_actions (
  action_code text primary key check (action_code ~ '^[A-Z][A-Z0-9_.]*$'),
  resource_type text not null,
  action_kind text not null check (action_kind in ('READ','CREATE','UPDATE','DELETE','BULK','FILE_UPLOAD','ADMIN')),
  requires_approval boolean not null default false,
  display_name text not null,
  is_active boolean not null default true
);
create table public.portal_role_actions (
  role_code text not null references public.portal_roles(role_code) on delete restrict,
  action_code text not null references public.portal_actions(action_code) on delete restrict,
  primary key (role_code, action_code)
);
create table public.portal_role_assignments (
  user_id uuid not null references auth.users(id) on delete restrict,
  role_code text not null references public.portal_roles(role_code) on delete restrict,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  assigned_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role_code, valid_from),
  check (valid_until is null or valid_until > valid_from)
);
create unique index portal_one_active_director
  on public.portal_role_assignments(role_code)
  where role_code='DIRECTOR' and revoked_at is null and valid_until is null;

create table public.portal_action_approvals (
  approval_id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action_code text not null references public.portal_actions(action_code) on delete restrict,
  resource_type text not null,
  resource_id uuid,
  payload_digest text not null check (payload_digest ~ '^[0-9a-f]{64}$'),
  reason text not null check (length(trim(reason)) between 3 and 500),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create table public.portal_authorization_audit (
  event_id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete restrict,
  channel text not null check (channel in ('PORTAL','API','MCP','SYSTEM')),
  action_code text not null,
  resource_type text,
  resource_id uuid,
  decision text not null check (decision in ('ALLOW','DENY','SUCCESS','FAILURE','APPROVAL_CREATED','APPROVAL_CONSUMED')),
  correlation_id uuid not null default gen_random_uuid(),
  approval_id uuid references public.portal_action_approvals(approval_id) on delete restrict,
  detail jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index portal_authorization_audit_actor_time on public.portal_authorization_audit(actor_user_id, occurred_at desc);

alter table public.portal_roles enable row level security;
alter table public.portal_actions enable row level security;
alter table public.portal_role_actions enable row level security;
alter table public.portal_role_assignments enable row level security;
alter table public.portal_action_approvals enable row level security;
alter table public.portal_authorization_audit enable row level security;
revoke all on public.portal_roles, public.portal_actions, public.portal_role_actions,
  public.portal_role_assignments, public.portal_action_approvals, public.portal_authorization_audit
  from public, anon, authenticated;

insert into public.portal_roles(role_code,display_name) values ('DIRECTOR','מנהלת')
on conflict (role_code) do update set display_name=excluded.display_name,is_active=true;
insert into public.portal_actions(action_code,resource_type,action_kind,requires_approval,display_name) values
 ('POLICY.READ','POLICY','READ',false,'קריאת נהלים'),
 ('POLICY.CREATE','POLICY','CREATE',false,'יצירת נוהל'),
 ('POLICY.UPDATE','POLICY','UPDATE',false,'עדכון טיוטת נוהל'),
 ('POLICY.DELETE','POLICY','DELETE',true,'ארכוב נוהל'),
 ('POLICY.BULK','POLICY','BULK',true,'פעולה מרוכזת על נהלים'),
 ('POLICY.FILE_UPLOAD','POLICY_FILE','FILE_UPLOAD',false,'העלאת קובץ לנוהל'),
 ('AUTH.MANAGE','AUTHORIZATION','ADMIN',true,'ניהול הרשאות')
on conflict (action_code) do update set resource_type=excluded.resource_type,action_kind=excluded.action_kind,
 requires_approval=excluded.requires_approval,display_name=excluded.display_name,is_active=true;
insert into public.portal_role_actions(role_code,action_code)
select 'DIRECTOR',action_code from public.portal_actions on conflict do nothing;

-- TRACK108 verified this is the sole active technical super-admin/Director candidate.
insert into public.portal_role_assignments(user_id,role_code,assigned_by)
select '3af86c7f-6ba4-41f4-8d7c-1db262cf3e79'::uuid,'DIRECTOR','3af86c7f-6ba4-41f4-8d7c-1db262cf3e79'::uuid
where exists(select 1 from auth.users where id='3af86c7f-6ba4-41f4-8d7c-1db262cf3e79'::uuid)
and not exists(select 1 from public.portal_role_assignments where role_code='DIRECTOR' and revoked_at is null and (valid_until is null or valid_until>now()));

update public.portal_user_profiles
set is_active=(user_id='3af86c7f-6ba4-41f4-8d7c-1db262cf3e79'::uuid),
    is_super_admin=(user_id='3af86c7f-6ba4-41f4-8d7c-1db262cf3e79'::uuid),
    scope_mode=case when user_id='3af86c7f-6ba4-41f4-8d7c-1db262cf3e79'::uuid then 'ORGANIZATION'::public.portal_scope_mode else scope_mode end,
    updated_at=now()
where is_active or is_super_admin;

create or replace function private.portal_is_authorized(p_user_id uuid,p_action_code text)
returns boolean language sql stable security definer set search_path=public,private,pg_temp as $$
 select p_user_id is not null
 and exists(select 1 from public.portal_user_profiles p where p.user_id=p_user_id and p.is_active)
 and exists(
   select 1 from public.portal_role_assignments ra
   join public.portal_roles r on r.role_code=ra.role_code and r.is_active
   join public.portal_role_actions rc on rc.role_code=ra.role_code
   join public.portal_actions a on a.action_code=rc.action_code and a.is_active
   where ra.user_id=p_user_id and ra.revoked_at is null and ra.valid_from<=now()
     and (ra.valid_until is null or ra.valid_until>now()) and a.action_code=p_action_code
 );
$$;
revoke all on function private.portal_is_authorized(uuid,text) from public,anon,authenticated;

create or replace function public.portal_authorize(p_action_code text,p_resource_type text default null,p_resource_id uuid default null)
returns jsonb language plpgsql volatile security definer set search_path=public,private,pg_temp as $$
declare allowed boolean; cid uuid:=gen_random_uuid();
begin
 allowed:=private.portal_is_authorized(auth.uid(),p_action_code);
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,correlation_id)
 values(auth.uid(),'API',p_action_code,p_resource_type,p_resource_id,case when allowed then 'ALLOW' else 'DENY' end,cid);
 return jsonb_build_object('allowed',allowed,'action_code',p_action_code,'resource_type',p_resource_type,'resource_id',p_resource_id,'correlation_id',cid);
end $$;

create or replace function public.portal_my_authorization()
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
 select jsonb_build_object(
  'user_id',auth.uid(),
  'active',exists(select 1 from public.portal_user_profiles p where p.user_id=auth.uid() and p.is_active),
  'roles',coalesce((select jsonb_agg(distinct ra.role_code) from public.portal_role_assignments ra where ra.user_id=auth.uid() and ra.revoked_at is null and ra.valid_from<=now() and (ra.valid_until is null or ra.valid_until>now())),'[]'::jsonb),
  'actions',coalesce((select jsonb_agg(distinct rc.action_code order by rc.action_code) from public.portal_role_assignments ra join public.portal_role_actions rc on rc.role_code=ra.role_code join public.portal_actions a on a.action_code=rc.action_code and a.is_active where ra.user_id=auth.uid() and ra.revoked_at is null and ra.valid_from<=now() and (ra.valid_until is null or ra.valid_until>now())),'[]'::jsonb)
 );
$$;

create or replace function public.portal_request_approval(p_action_code text,p_resource_type text,p_resource_id uuid,p_payload jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare aid uuid; expiry timestamptz:=now()+interval '10 minutes'; digest_value text;
begin
 if not private.portal_is_authorized(auth.uid(),p_action_code) then raise exception 'Not authorized' using errcode='42501'; end if;
 if not exists(select 1 from public.portal_actions where action_code=p_action_code and requires_approval) then raise exception 'Approval not applicable' using errcode='22023'; end if;
 if length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'Approval reason required' using errcode='22023'; end if;
 digest_value:=encode(digest(coalesce(p_payload,'{}'::jsonb)::text,'sha256'),'hex');
 insert into public.portal_action_approvals(actor_user_id,action_code,resource_type,resource_id,payload_digest,reason,expires_at)
 values(auth.uid(),p_action_code,p_resource_type,p_resource_id,digest_value,trim(p_reason),expiry) returning approval_id into aid;
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id)
 values(auth.uid(),'MCP',p_action_code,p_resource_type,p_resource_id,'APPROVAL_CREATED',aid);
 return jsonb_build_object('approval_id',aid,'expires_at',expiry,'payload_digest',digest_value);
end $$;

create or replace function private.portal_consume_approval(p_approval_id uuid,p_action_code text,p_resource_type text,p_resource_id uuid,p_payload jsonb)
returns void language plpgsql security definer set search_path=public,private,pg_temp as $$
declare matched uuid;
begin
 update public.portal_action_approvals set consumed_at=now()
 where approval_id=p_approval_id and actor_user_id=auth.uid() and action_code=p_action_code
   and resource_type=p_resource_type and resource_id is not distinct from p_resource_id
   and consumed_at is null and expires_at>now()
   and payload_digest=encode(digest(coalesce(p_payload,'{}'::jsonb)::text,'sha256'),'hex')
 returning approval_id into matched;
 if matched is null then raise exception 'Approval missing, expired, consumed or payload changed' using errcode='42501'; end if;
end $$;
revoke all on function private.portal_consume_approval(uuid,text,text,uuid,jsonb) from public,anon,authenticated;

create or replace function public.portal_mcp_list_policies(p_search text default null)
returns table(document_id uuid,title text,category text,published_version integer,published_at timestamptz)
language sql stable security definer set search_path=public,private,pg_temp as $$
 select d.id,d.title,d.category,d.published_version,d.published_at
 from public.portal_policy_documents d where private.portal_is_authorized(auth.uid(),'POLICY.READ')
 and d.status='PUBLISHED' and (p_search is null or d.title ilike '%'||left(p_search,120)||'%' or d.category ilike '%'||left(p_search,120)||'%')
 order by d.updated_at desc;
$$;
create or replace function public.portal_mcp_read_policy(p_document_id uuid)
returns table(document_id uuid,title text,category text,published_version integer,published_at timestamptz,content text)
language sql stable security definer set search_path=public,private,pg_temp as $$
 select d.id,d.title,d.category,d.published_version,d.published_at,d.published_body
 from public.portal_policy_documents d where private.portal_is_authorized(auth.uid(),'POLICY.READ') and d.id=p_document_id and d.status='PUBLISHED';
$$;
create or replace function public.portal_mcp_create_policy(p_title text,p_category text default 'כללי',p_body text default '')
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare d public.portal_policy_documents;
begin
 if not private.portal_is_authorized(auth.uid(),'POLICY.CREATE') then raise exception 'Not authorized' using errcode='42501'; end if;
 if length(trim(coalesce(p_title,''))) not between 1 and 200 or length(coalesce(p_category,''))>120 or length(coalesce(p_body,''))>100000 then raise exception 'Invalid policy' using errcode='22023'; end if;
 insert into public.portal_policy_documents(title,category,draft_body,created_by,updated_by) values(trim(p_title),coalesce(nullif(trim(p_category),''),'כללי'),coalesce(p_body,''),auth.uid(),auth.uid()) returning * into d;
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,detail) values(auth.uid(),'MCP','POLICY.CREATE','POLICY',d.id,'SUCCESS',jsonb_build_object('title',d.title));
 return jsonb_build_object('id',d.id,'title',d.title,'category',d.category,'status',d.status,'updated_at',d.updated_at,'verified',true);
end $$;
create or replace function public.portal_mcp_update_policy(p_document_id uuid,p_title text,p_category text,p_body text,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare d public.portal_policy_documents;
begin
 if not private.portal_is_authorized(auth.uid(),'POLICY.UPDATE') then raise exception 'Not authorized' using errcode='42501'; end if;
 if length(trim(coalesce(p_title,''))) not between 1 and 200 or length(coalesce(p_category,''))>120 or length(coalesce(p_body,''))>100000 then raise exception 'Invalid policy' using errcode='22023'; end if;
 update public.portal_policy_documents set title=trim(p_title),category=coalesce(nullif(trim(p_category),''),'כללי'),draft_body=coalesce(p_body,''),updated_by=auth.uid(),updated_at=clock_timestamp()
 where id=p_document_id and status<>'RETIRED' and updated_at=p_expected_updated_at returning * into d;
 if d.id is null then raise exception 'Policy changed, missing or retired' using errcode='40001'; end if;
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision) values(auth.uid(),'MCP','POLICY.UPDATE','POLICY',d.id,'SUCCESS');
 return jsonb_build_object('id',d.id,'updated_at',d.updated_at,'verified',true);
end $$;
create or replace function public.portal_mcp_archive_policy(p_document_id uuid,p_approval_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare payload jsonb:=jsonb_build_object('document_id',p_document_id,'reason',trim(coalesce(p_reason,''))); d public.portal_policy_documents;
begin
 if not private.portal_is_authorized(auth.uid(),'POLICY.DELETE') then raise exception 'Not authorized' using errcode='42501'; end if;
 perform private.portal_consume_approval(p_approval_id,'POLICY.DELETE','POLICY',p_document_id,payload);
 update public.portal_policy_documents set status='RETIRED',updated_by=auth.uid(),updated_at=clock_timestamp() where id=p_document_id and status<>'RETIRED' returning * into d;
 if d.id is null then raise exception 'Policy missing or already retired'; end if;
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id,detail) values(auth.uid(),'MCP','POLICY.DELETE','POLICY',d.id,'SUCCESS',p_approval_id,jsonb_build_object('mode','SOFT_DELETE','reason',trim(p_reason)));
 return jsonb_build_object('id',d.id,'status',d.status,'verified',true,'deleted',false,'archived',true);
end $$;
create or replace function public.portal_mcp_bulk_archive_policies(p_document_ids uuid[],p_approval_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare payload jsonb; changed integer;
begin
 if not private.portal_is_authorized(auth.uid(),'POLICY.BULK') then raise exception 'Not authorized' using errcode='42501'; end if;
 if coalesce(array_length(p_document_ids,1),0) not between 1 and 50 then raise exception 'Bulk size must be 1..50' using errcode='22023'; end if;
 if cardinality(p_document_ids)<>(select count(distinct x) from unnest(p_document_ids) x) then raise exception 'Duplicate targets' using errcode='22023'; end if;
 payload:=jsonb_build_object('document_ids',to_jsonb(p_document_ids),'reason',trim(coalesce(p_reason,'')));
 perform private.portal_consume_approval(p_approval_id,'POLICY.BULK','POLICY',null,payload);
 update public.portal_policy_documents set status='RETIRED',updated_by=auth.uid(),updated_at=clock_timestamp() where id=any(p_document_ids) and status<>'RETIRED'; get diagnostics changed=row_count;
 if changed<>cardinality(p_document_ids) then raise exception 'Bulk target mismatch; transaction rolled back'; end if;
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,decision,approval_id,detail) values(auth.uid(),'MCP','POLICY.BULK','POLICY','SUCCESS',p_approval_id,jsonb_build_object('count',changed,'mode','SOFT_DELETE'));
 return jsonb_build_object('affected',changed,'verified',true,'atomic',true);
end $$;
create or replace function public.portal_mcp_record_file(p_document_id uuid,p_object_path text,p_size bigint,p_content_type text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
begin
 if not private.portal_is_authorized(auth.uid(),'POLICY.FILE_UPLOAD') then raise exception 'Not authorized' using errcode='42501'; end if;
 if not exists(select 1 from public.portal_policy_documents where id=p_document_id and status<>'RETIRED') then raise exception 'Policy not found'; end if;
 insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,detail) values(auth.uid(),'MCP','POLICY.FILE_UPLOAD','POLICY_FILE',p_document_id,'SUCCESS',jsonb_build_object('object_path',p_object_path,'size',p_size,'content_type',p_content_type));
 return jsonb_build_object('document_id',p_document_id,'object_path',p_object_path,'verified',true);
end $$;

revoke all on function public.portal_authorize(text,text,uuid),public.portal_my_authorization(),public.portal_request_approval(text,text,uuid,jsonb,text),
 public.portal_mcp_list_policies(text),public.portal_mcp_read_policy(uuid),public.portal_mcp_create_policy(text,text,text),
 public.portal_mcp_update_policy(uuid,text,text,text,timestamptz),public.portal_mcp_archive_policy(uuid,uuid,text),
 public.portal_mcp_bulk_archive_policies(uuid[],uuid,text),public.portal_mcp_record_file(uuid,text,bigint,text)
 from public,anon;
grant execute on function public.portal_authorize(text,text,uuid),public.portal_my_authorization(),public.portal_request_approval(text,text,uuid,jsonb,text),
 public.portal_mcp_list_policies(text),public.portal_mcp_read_policy(uuid),public.portal_mcp_create_policy(text,text,text),
 public.portal_mcp_update_policy(uuid,text,text,text,timestamptz),public.portal_mcp_archive_policy(uuid,uuid,text),
 public.portal_mcp_bulk_archive_policies(uuid[],uuid,text),public.portal_mcp_record_file(uuid,text,bigint,text)
 to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('policy-attachments','policy-attachments',false,10485760,array['application/pdf','image/png','image/jpeg','text/plain'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy policy_attachments_director_insert on storage.objects for insert to authenticated
with check(bucket_id='policy-attachments' and private.portal_is_authorized(auth.uid(),'POLICY.FILE_UPLOAD') and (storage.foldername(name))[1]=auth.uid()::text);
create policy policy_attachments_director_read on storage.objects for select to authenticated
using(bucket_id='policy-attachments' and private.portal_is_authorized(auth.uid(),'POLICY.READ'));

-- Legacy flags and screen permissions remain as history/navigation only.
create or replace function public.portal_can_manage_users(actor_id uuid)
returns boolean language sql stable security definer set search_path=public,private,pg_temp as $$
 select private.portal_is_authorized(actor_id,'AUTH.MANAGE');
$$;
