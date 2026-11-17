-- TRACK102c: the isolated relay Edge Function is the sole table caller.
grant select, insert, update, delete
  on table public.portal_oauth_callback_relays
  to service_role;
