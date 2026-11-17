-- TRACK111: pgcrypto is installed in the extensions schema. Preserve the
-- hardened function search paths while making digest() resolvable.
alter function public.portal_request_approval(text, text, uuid, jsonb, text)
  set search_path to public, private, extensions, pg_temp;

alter function private.portal_consume_approval(uuid, text, text, uuid, jsonb)
  set search_path to public, private, extensions, pg_temp;
