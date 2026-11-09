create or replace function public.portal_mcp_list_policies(p_search text default null)
returns table(document_id uuid,title text,category text,published_version integer,published_at timestamptz)
language sql stable security definer set search_path=public,pg_temp as $$
 select d.id,d.published_title,d.category,d.published_version,d.published_at
 from public.portal_policy_documents d
 where auth.uid() is not null
 and (public.portal_mcp_has_full_read_access() or public.portal_effective_permission(auth.uid(),'documents') in ('VIEW','EDIT'))
 and d.status='PUBLISHED'
 and (nullif(trim(p_search),'') is null or position(lower(left(trim(p_search),120)) in lower(d.published_title))>0)
 order by d.published_at desc,d.id limit 100;
$$;
create or replace function public.portal_mcp_read_policy(p_document_id uuid)
returns table(document_id uuid,title text,category text,published_version integer,published_at timestamptz,content text)
language sql stable security definer set search_path=public,pg_temp as $$
 select d.id,d.published_title,d.category,d.published_version,d.published_at,d.published_body
 from public.portal_policy_documents d
 where d.id=p_document_id and d.status='PUBLISHED' and auth.uid() is not null
 and (public.portal_mcp_has_full_read_access() or public.portal_effective_permission(auth.uid(),'documents') in ('VIEW','EDIT'));
$$;
revoke all on function public.portal_mcp_list_policies(text),public.portal_mcp_read_policy(uuid) from public,anon;
grant execute on function public.portal_mcp_list_policies(text),public.portal_mcp_read_policy(uuid) to authenticated;
