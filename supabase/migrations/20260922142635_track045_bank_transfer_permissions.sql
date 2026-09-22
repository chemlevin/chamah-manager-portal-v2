-- TRACK045: Bank Transfers controls are independent of the global screen level.
-- Existing users retain ALL and their previously available editing actions;
-- this migration does not assign or modify any user's permissions.
alter table public.portal_user_profiles
  add column bank_transfer_scope text not null default 'ALL'
    check (bank_transfer_scope in ('ALL', 'ASSIGNED_DAYCARES')),
  add column bank_transfer_approve_for_execution boolean not null default true,
  add column bank_transfer_set_execution_date boolean not null default true;

alter table public.bank_transfers
  add column approved_for_execution boolean not null default false,
  add column approved_by_user_id uuid,
  add column approved_at timestamptz;

create or replace function public.portal_admin_save_bank_transfer_user(
  actor_id uuid, target_user_id uuid, profile_values jsonb,
  permission_values jsonb default '[]'::jsonb,
  allocation_unit_ids uuid[] default '{}'::uuid[], daycare_ids uuid[] default '{}'::uuid[],
  bank_transfer_values jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare old_values jsonb; new_values jsonb;
begin
  if not public.portal_can_manage_users(actor_id) then
    raise exception 'PERMISSION_DENIED' using errcode='42501';
  end if;
  select jsonb_build_object('scope',bank_transfer_scope,'approve_for_execution',bank_transfer_approve_for_execution,
    'set_execution_date',bank_transfer_set_execution_date) into old_values
    from public.portal_user_profiles where user_id=target_user_id;
  perform public.portal_admin_save_user(actor_id,target_user_id,profile_values,
    permission_values,allocation_unit_ids,daycare_ids);
  update public.portal_user_profiles set
    bank_transfer_scope = coalesce(bank_transfer_values->>'scope', bank_transfer_scope),
    bank_transfer_approve_for_execution = coalesce((bank_transfer_values->>'approve_for_execution')::boolean, bank_transfer_approve_for_execution),
    bank_transfer_set_execution_date = coalesce((bank_transfer_values->>'set_execution_date')::boolean, bank_transfer_set_execution_date)
    where user_id=target_user_id;
  select jsonb_build_object('scope',bank_transfer_scope,'approve_for_execution',bank_transfer_approve_for_execution,
    'set_execution_date',bank_transfer_set_execution_date) into new_values
    from public.portal_user_profiles where user_id=target_user_id;
  if old_values is distinct from new_values then
    insert into public.audit_events(entity_type,entity_id,operation,previous_values,new_values,source_type,actor_user_id)
    values('PORTAL_USER',target_user_id,'UPDATE',old_values,new_values,'PORTAL_ADMIN',actor_id);
  end if;
end $$;
revoke all on function public.portal_admin_save_bank_transfer_user(uuid,uuid,jsonb,jsonb,uuid[],uuid[],jsonb) from public, anon, authenticated;
grant execute on function public.portal_admin_save_bank_transfer_user(uuid,uuid,jsonb,jsonb,uuid[],uuid[],jsonb) to service_role;
