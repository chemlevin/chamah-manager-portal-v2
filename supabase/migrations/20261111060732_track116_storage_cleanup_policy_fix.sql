-- TRACK116 follow-up: let the Storage RLS policy inspect the private operation
-- state without granting clients direct access to the operations table.

create or replace function private.portal_payment_attachment_cleanup_allowed(p_actor uuid,p_object_path text)
returns boolean language sql stable security definer set search_path=public,private,pg_temp as $$
 select p_actor=auth.uid()
   and private.portal_is_authorized(p_actor,'PAYMENT_REQUEST.FILE_UPLOAD')
   and exists(
     select 1 from public.payment_attachment_operations op
     where op.actor_user_id=p_actor and op.object_path=p_object_path
       and op.status='CLEANUP_PENDING' and op.payment_request_document_id is null
   );
$$;
revoke all on function private.portal_payment_attachment_cleanup_allowed(uuid,text) from public,anon;
grant execute on function private.portal_payment_attachment_cleanup_allowed(uuid,text) to authenticated;

drop policy payment_request_attachments_compensating_delete on storage.objects;
create policy payment_request_attachments_compensating_delete on storage.objects for delete to authenticated using (
  bucket_id='payment-request-attachments'
  and private.portal_payment_attachment_cleanup_allowed(auth.uid(),name)
);
