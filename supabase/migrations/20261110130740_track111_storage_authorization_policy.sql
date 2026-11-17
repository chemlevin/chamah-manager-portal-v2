-- TRACK111: Storage RLS evaluates the canonical Director authorization helper
-- as the authenticated caller. The private schema is not exposed by PostgREST.
grant usage on schema private to authenticated;
grant execute on function private.portal_is_authorized(uuid, text) to authenticated;

-- Allow the owning Director to remove disposable/private attachments through
-- the Storage API. This keeps cleanup atomic with the underlying object store.
create policy policy_attachments_director_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'policy-attachments'
  and owner_id = auth.uid()::text
  and private.portal_is_authorized(auth.uid(), 'POLICY.FILE_UPLOAD')
);
