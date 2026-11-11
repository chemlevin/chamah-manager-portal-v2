alter table public.portal_policy_documents add column if not exists published_title text;
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
 update public.portal_policy_documents set published_title=d.title,published_body=d.draft_body,published_version=v,status='PUBLISHED',published_by=auth.uid(),published_at=now(),updated_by=auth.uid(),updated_at=now() where id=p_id;
 return v;
end $$;
