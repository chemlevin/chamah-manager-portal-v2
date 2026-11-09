revoke select,insert on public.portal_policy_documents from authenticated;
revoke select on public.portal_policy_versions from authenticated;
create or replace function public.portal_policy_list()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
select coalesce(jsonb_agg(
 jsonb_build_object('id',d.id,'title',case when editor then d.title else d.published_title end,
 'category',d.category,'body',case when editor then d.draft_body else d.published_body end,
 'published_body',case when editor then d.published_body else null end,
 'status',d.status,'published_version',d.published_version,'updated_at',d.updated_at,'published_at',d.published_at)
 order by d.updated_at desc),'[]'::jsonb)
from public.portal_policy_documents d
cross join lateral (select public.portal_effective_permission(auth.uid(),'documents.manage')='EDIT' or public.portal_effective_permission(auth.uid(),'documents.publish')='EDIT' as editor) access
where public.portal_effective_permission(auth.uid(),'documents') in ('VIEW','EDIT')
and (editor or d.status='PUBLISHED');
$$;
create or replace function public.portal_policy_create(p_title text,p_category text default 'כללי')
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_id uuid;
begin
 if auth.uid() is null or public.portal_effective_permission(auth.uid(),'documents.manage')<>'EDIT' then raise exception 'Not authorized' using errcode='42501'; end if;
 if length(trim(coalesce(p_title,''))) not between 1 and 200 or length(coalesce(p_category,''))>120 then raise exception 'Invalid title' using errcode='22023'; end if;
 insert into public.portal_policy_documents(title,category,created_by,updated_by)
 values(trim(p_title),coalesce(nullif(trim(p_category),''),'כללי'),auth.uid(),auth.uid()) returning id into new_id;
 return new_id;
end $$;
create or replace function public.portal_policy_history(p_id uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
select case when auth.uid() is not null and
 (public.portal_effective_permission(auth.uid(),'documents.manage')='EDIT' or public.portal_effective_permission(auth.uid(),'documents.publish')='EDIT')
 then coalesce((select jsonb_agg(jsonb_build_object('version',v.version,'title',v.title,'body',v.body,'published_at',v.published_at) order by v.version desc) from public.portal_policy_versions v where v.document_id=p_id),'[]'::jsonb)
 else '[]'::jsonb end;
$$;
revoke all on function public.portal_policy_list(),public.portal_policy_create(text,text),public.portal_policy_history(uuid) from public,anon;
grant execute on function public.portal_policy_list(),public.portal_policy_create(text,text),public.portal_policy_history(uuid) to authenticated;
