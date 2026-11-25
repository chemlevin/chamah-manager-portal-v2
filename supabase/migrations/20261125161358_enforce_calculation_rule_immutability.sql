create or replace function private.guard_calculation_rule_activation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.lifecycle_status = 'ACTIVE' and not exists (
    select 1 from public.calculation_rule_contexts c
    where c.calculation_rule_id = new.calculation_rule_id
  ) then
    raise exception 'An ACTIVE calculation rule must have at least one context';
  end if;

  if old.lifecycle_status = 'ACTIVE' and (
    new.rule_type is distinct from old.rule_type
    or new.display_name is distinct from old.display_name
    or new.definition is distinct from old.definition
    or new.effective_from is distinct from old.effective_from
    or new.effective_to is distinct from old.effective_to
    or new.rule_priority is distinct from old.rule_priority
    or new.source_evidence is distinct from old.source_evidence
    or new.approval_evidence is distinct from old.approval_evidence
    or new.supersedes_rule_id is distinct from old.supersedes_rule_id
  ) then
    raise exception 'An ACTIVE calculation rule is immutable; create a replacement rule';
  end if;

  return new;
end;
$$;

create or replace function private.guard_calculation_rule_context_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_rule_id uuid := coalesce(new.calculation_rule_id, old.calculation_rule_id);
begin
  if exists (
    select 1 from public.calculation_rules r
    where r.calculation_rule_id = target_rule_id
      and r.lifecycle_status = 'ACTIVE'
  ) then
    raise exception 'Contexts of an ACTIVE calculation rule are immutable; create a replacement rule';
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function private.guard_calculation_rule_activation() from public;
revoke all on function private.guard_calculation_rule_context_mutation() from public;

create trigger trg_calculation_rule_activation_guard
before insert or update on public.calculation_rules
for each row execute function private.guard_calculation_rule_activation();

create trigger trg_calculation_rule_context_guard
before insert or update or delete on public.calculation_rule_contexts
for each row execute function private.guard_calculation_rule_context_mutation();
