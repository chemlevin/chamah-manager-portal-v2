-- Documents and policies: default deny, revocable permissions.
insert into public.portal_sections(screen_code,parent_screen_code,route,display_name,icon,description,display_order,is_active,is_navigation_item,is_scope_required)
values
('documents',null,'documents','מסמכים ונהלים','folder','ספריית נהלים ארגונית',75,true,true,false),
('documents.manage','documents','documents/manage','עריכת נהלים','file-pen','יצירה ושמירת טיוטות',76,true,false,false),
('documents.publish','documents','documents/publish','פרסום נהלים','shield-check','פרסום וביטול נהלים מחייבים',77,true,false,false)
on conflict(screen_code) do nothing;

create table if not exists public.portal_policy_documents (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(trim(title)) between 1 and 200),
 category text not null default 'כללי',
 draft_body text not null default '',
 published_body text,
 published_version integer not null default 0 check(published_version>=0),
 status text not null default 'DRAFT' check(status in ('DRAFT','PUBLISHED','RETIRED')),
 created_by uuid not null references auth.users(id),
 updated_by uuid references auth.users(id),
 published_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 published_at timestamptz,
 constraint portal_policy_body_length check(length(draft_body)<=100000 and length(coalesce(published_body,''))<=100000)
);
create table if not exists public.portal_policy_versions (
 document_id uuid not null references public.portal_policy_documents(id) on delete restrict,
 version integer not null,
 title text not null,
 body text not null,
 published_by uuid references auth.users(id),
 published_at timestamptz not null default now(),
 primary key(document_id,version)
);
alter table public.portal_policy_documents enable row level security;
alter table public.portal_policy_versions enable row level security;
revoke all on public.portal_policy_documents,public.portal_policy_versions from anon,public;
grant select,insert,update on public.portal_policy_documents to authenticated;
grant select,insert on public.portal_policy_versions to authenticated;

create policy portal_policy_read on public.portal_policy_documents for select to authenticated
using (public.portal_effective_permission(auth.uid(),'documents') in ('VIEW','EDIT')
 and (status='PUBLISHED' or public.portal_effective_permission(auth.uid(),'documents.manage')='EDIT' or public.portal_effective_permission(auth.uid(),'documents.publish')='EDIT'));
create policy portal_policy_create on public.portal_policy_documents for insert to authenticated
with check (created_by=auth.uid() and status='DRAFT' and published_version=0 and published_body is null and public.portal_effective_permission(auth.uid(),'documents.manage')='EDIT');
create policy portal_policy_update on public.portal_policy_documents for update to authenticated
using (public.portal_effective_permission(auth.uid(),'documents.manage')='EDIT' or public.portal_effective_permission(auth.uid(),'documents.publish')='EDIT')
with check (public.portal_effective_permission(auth.uid(),'documents.manage')='EDIT' or public.portal_effective_permission(auth.uid(),'documents.publish')='EDIT');
create policy portal_policy_versions_read on public.portal_policy_versions for select to authenticated
using (public.portal_effective_permission(auth.uid(),'documents.manage')='EDIT' or public.portal_effective_permission(auth.uid(),'documents.publish')='EDIT');
-- No direct client writes to published fields or version history; all publication via checked RPC.
revoke update on public.portal_policy_documents from authenticated;
grant update(title,category,draft_body,updated_by,updated_at) on public.portal_policy_documents to authenticated;
revoke insert on public.portal_policy_versions from authenticated;

create or replace function public.portal_policy_publish(p_id uuid,p_retire boolean default false)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.portal_policy_documents%rowtype; v integer;
begin
 if auth.uid() is null or public.portal_effective_permission(auth.uid(),'documents.publish') <> 'EDIT' then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into d from public.portal_policy_documents where id=p_id for update;
 if not found then raise exception 'Document not found'; end if;
 if p_retire then
  update public.portal_policy_documents set status='RETIRED',updated_by=auth.uid(),updated_at=now() where id=p_id;
  return d.published_version;
 end if;
 if length(trim(d.draft_body))=0 then raise exception 'Cannot publish empty document'; end if;
 v:=d.published_version+1;
 insert into public.portal_policy_versions(document_id,version,title,body,published_by) values(p_id,v,d.title,d.draft_body,auth.uid());
 update public.portal_policy_documents set published_body=d.draft_body,published_version=v,status='PUBLISHED',published_by=auth.uid(),published_at=now(),updated_by=auth.uid(),updated_at=now() where id=p_id;
 return v;
end $$;
revoke all on function public.portal_policy_publish(uuid,boolean) from public,anon;
grant execute on function public.portal_policy_publish(uuid,boolean) to authenticated;
