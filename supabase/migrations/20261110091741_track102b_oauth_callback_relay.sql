-- TRACK102b: private, short-lived OAuth callback relay records.
-- Authorization codes are sealed to a per-attempt client key before storage.
create table if not exists public.portal_oauth_callback_relays (
  state_hash text primary key check (state_hash ~ '^[A-Za-z0-9_-]{43}$'),
  delivery_secret_hash text not null check (delivery_secret_hash ~ '^[A-Za-z0-9_-]{43}$'),
  client_public_key jsonb not null,
  sealed_payload jsonb,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint portal_oauth_callback_relay_short_expiry
    check (expires_at <= created_at + interval '5 minutes')
);

alter table public.portal_oauth_callback_relays enable row level security;
revoke all on public.portal_oauth_callback_relays from public, anon, authenticated;

create index if not exists portal_oauth_callback_relays_expiry_idx
  on private.portal_oauth_callback_relays (expires_at);

comment on table public.portal_oauth_callback_relays is
  'Short-lived OAuth relay coordination. Stores hashes, an ephemeral public key, and encrypted callback ciphertext only.';
