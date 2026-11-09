revoke update on public.portal_policy_documents from authenticated;
create or replace function public.portal_policy_save(p_id uuid,p_title text,p_category text,p_body text,p_expected_updated_at timestamptz)
returns timestamptz language plpgsql security definer set search_path=public,pg_temp as $$
declare result timestamptz;
begin
 if auth.uid() is null or public.portal_effective_permission(auth.uid(),'documents.manage') <> 'EDIT' then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 if length(trim(coalesce(p_title,''))) not between 1 and 200 or length(coalesce(p_body,''))>100000 or length(coalesce(p_category,''))>120 then
  raise exception 'Invalid document content' using errcode='22023';
 end if;
 update public.portal_policy_documents
 set title=trim(p_title),category=coalesce(nullif(trim(p_category),''),'כללי'),draft_body=coalesce(p_body,''),
 updated_by=auth.uid(),updated_at=clock_timestamp()
 where id=p_id and updated_at=p_expected_updated_at
 returning updated_at into result;
 if result is null then raise exception 'Document changed by another user. Reload before saving.' using errcode='40001'; end if;
 return result;
end $$;
revoke all on function public.portal_policy_save(uuid,text,text,text,timestamptz) from public,anon;
grant execute on function public.portal_policy_save(uuid,text,text,text,timestamptz) to authenticated;
-- Published content is never directly writable by clients; publishing remains separately authorized.
