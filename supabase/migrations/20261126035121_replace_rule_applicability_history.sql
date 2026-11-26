-- Keep applicability history aligned with immutable rule-version history.
-- A replacement must retire only the old version's applicability; the rows
-- remain readable for historical result reproduction.
create or replace function private.sync_replaced_rule_applicability()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.lifecycle_status = 'REPLACED'
     and old.lifecycle_status is distinct from new.lifecycle_status then
    update public.calculation_rule_applicability_sets
       set lifecycle_status = 'REPLACED'
     where calculation_rule_id = new.calculation_rule_id
       and lifecycle_status = 'ACTIVE';
  elsif new.lifecycle_status = 'RETIRED'
     and old.lifecycle_status is distinct from new.lifecycle_status then
    update public.calculation_rule_applicability_sets
       set lifecycle_status = 'RETIRED'
     where calculation_rule_id = new.calculation_rule_id
       and lifecycle_status = 'ACTIVE';
  end if;
  return new;
end;
$$;

revoke all on function private.sync_replaced_rule_applicability() from public;

drop trigger if exists trg_sync_replaced_rule_applicability on public.calculation_rules;
create trigger trg_sync_replaced_rule_applicability
after update of lifecycle_status on public.calculation_rules
for each row execute function private.sync_replaced_rule_applicability();

-- Reconcile only previously replaced/retired rule versions. This is
-- idempotent and does not touch active rule instructions or business facts.
update public.calculation_rule_applicability_sets s
   set lifecycle_status = case r.lifecycle_status
     when 'REPLACED' then 'REPLACED'
     when 'RETIRED' then 'RETIRED'
     else s.lifecycle_status
   end
  from public.calculation_rules r
 where r.calculation_rule_id = s.calculation_rule_id
   and s.lifecycle_status = 'ACTIVE'
   and r.lifecycle_status in ('REPLACED', 'RETIRED');

-- Serialize activation by rule type, not by rule row. Two different rule IDs
-- can otherwise pass the overlap check concurrently and both become active.
create or replace function public.portal_mcp_commit_rule_applicability(
  p_batch_id uuid,
  p_approval_id uuid,
  p_expected_batch_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  b public.calculation_rule_applicability_batches;
  s public.calculation_rule_applicability_sets;
  it jsonb;
  approval_payload jsonb;
  rid uuid;
  rule_type_value text;
  ver integer;
  spec integer;
begin
  if not private.portal_is_authorized(auth.uid(), 'RULES.APPLICABILITY_WRITE') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select * into b
  from public.calculation_rule_applicability_batches
  where batch_id = p_batch_id and actor_user_id = auth.uid()
  for update;

  if b.status = 'COMMITTED' and b.approval_id = p_approval_id then
    return jsonb_build_object('batch_id', b.batch_id, 'status', b.status,
      'applicability_set_id', b.committed_applicability_set_id);
  end if;
  if b.status <> 'APPROVED' or b.approval_id <> p_approval_id
     or b.row_version <> p_expected_batch_version then
    raise exception 'Stale, unapproved or mismatched batch' using errcode = '40001';
  end if;

  approval_payload := jsonb_build_object(
    'batch_id', b.batch_id,
    'payload_digest', b.payload_digest,
    'expected_rule_version', b.expected_rule_version,
    'expected_applicability_version', b.expected_applicability_version,
    'row_version', b.row_version - 1
  );
  perform private.portal_consume_approval(
    p_approval_id, 'RULES.APPLICABILITY_WRITE',
    'CALCULATION_RULE_APPLICABILITY_BATCH', b.batch_id, approval_payload
  );

  rid := (b.payload->>'calculation_rule_id')::uuid;
  select rule_type into rule_type_value
  from public.calculation_rules
  where calculation_rule_id = rid
    and version = b.expected_rule_version
    and lifecycle_status = 'APPROVED';
  if rule_type_value is null then
    raise exception 'Rule version changed' using errcode = '40001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('applicability-type:' || rule_type_value, 0));

  -- Recheck after acquiring the shared rule-type lock.
  if not exists (
    select 1 from public.calculation_rules
    where calculation_rule_id = rid
      and version = b.expected_rule_version
      and lifecycle_status = 'APPROVED'
  ) then
    raise exception 'Rule version changed' using errcode = '40001';
  end if;

  select coalesce(max(applicability_version), 0) + 1 into ver
  from public.calculation_rule_applicability_sets
  where calculation_rule_id = rid;
  if b.expected_applicability_version is not null
     and ver - 1 <> b.expected_applicability_version then
    raise exception 'Applicability version changed' using errcode = '40001';
  end if;

  spec := jsonb_array_length(coalesce(b.payload->'conditions', '[]'::jsonb));
  if exists (
    select 1
    from public.calculation_rule_applicability_sets x
    join public.calculation_rules r on r.calculation_rule_id = x.calculation_rule_id
    join (
      select applicability_set_id, applicability_group, count(*) specificity
      from public.calculation_rule_contexts group by 1, 2
      union all
      select applicability_set_id, 1, 0
      from public.calculation_rule_applicability_sets z
      where not exists (
        select 1 from public.calculation_rule_contexts c
        where c.applicability_set_id = z.applicability_set_id
      )
    ) g on g.applicability_set_id = x.applicability_set_id
    where x.lifecycle_status = 'ACTIVE'
      and r.rule_type = rule_type_value
      and x.rule_priority = coalesce((b.payload->>'rule_priority')::smallint, 100)
      and daterange(x.effective_from, coalesce(x.effective_to, 'infinity'), '[]')
          && daterange((b.payload->>'effective_from')::date,
                       coalesce((b.payload->>'effective_to')::date, 'infinity'), '[]')
      and g.specificity = spec
      and not exists (
        select 1
        from public.calculation_rule_contexts ec
        join jsonb_array_elements(coalesce(b.payload->'conditions', '[]'::jsonb)) cc
          on (cc->>'applicability_group')::integer = 1
         and cc->>'context_kind' = ec.context_kind
        where ec.applicability_set_id = x.applicability_set_id
          and ec.applicability_group = g.applicability_group
          and coalesce(cc->>'context_id', cc->>'context_code') <>
              private.calculation_context_value(
                ec.context_kind, ec.school_year_id, ec.calendar_year_id,
                ec.daycare_id, ec.classroom_id, ec.age_group_id,
                ec.budget_category_id, ec.allocation_unit_id, ec.context_code
              )
      )
  ) then
    raise exception 'Ambiguous overlapping applicability' using errcode = '23P01';
  end if;

  insert into public.calculation_rule_applicability_sets(
    calculation_rule_id, applicability_version, effective_from, effective_to,
    rule_priority, source_evidence, approval_id, payload_digest, created_by_user_id
  ) values (
    rid, ver, (b.payload->>'effective_from')::date,
    (b.payload->>'effective_to')::date,
    coalesce((b.payload->>'rule_priority')::smallint, 100),
    b.payload->'source_evidence', p_approval_id, b.payload_digest, auth.uid()
  ) returning * into s;

  for it in select * from jsonb_array_elements(coalesce(b.payload->'conditions', '[]'::jsonb)) loop
    insert into public.calculation_rule_contexts(
      calculation_rule_id, applicability_set_id, applicability_group, context_kind,
      school_year_id, calendar_year_id, daycare_id, classroom_id, age_group_id,
      budget_category_id, allocation_unit_id, context_code, created_by_user_id
    ) values (
      rid, s.applicability_set_id, (it->>'applicability_group')::integer,
      it->>'context_kind',
      case when it->>'context_kind' = 'SCHOOL_YEAR' then (it->>'context_id')::uuid end,
      case when it->>'context_kind' = 'CALENDAR_YEAR' then (it->>'context_id')::uuid end,
      case when it->>'context_kind' = 'DAYCARE' then (it->>'context_id')::uuid end,
      case when it->>'context_kind' = 'CLASSROOM' then (it->>'context_id')::uuid end,
      case when it->>'context_kind' = 'AGE_GROUP' then (it->>'context_id')::uuid end,
      case when it->>'context_kind' = 'BUDGET_CATEGORY' then (it->>'context_id')::uuid end,
      case when it->>'context_kind' = 'ALLOCATION_UNIT' then (it->>'context_id')::uuid end,
      case when it->>'context_kind' = 'FRAMEWORK_TYPE' then it->>'context_code' end,
      auth.uid()
    );
  end loop;

  update public.calculation_rules
  set enforcement_status = case when implementation_status = 'IMPLEMENTED'
    then 'ENFORCED' else 'NOT_ENFORCED' end
  where calculation_rule_id = rid;
  update public.calculation_rule_applicability_batches
  set status = 'COMMITTED', committed_applicability_set_id = s.applicability_set_id,
      committed_at = now(), row_version = row_version + 1
  where batch_id = b.batch_id;

  return jsonb_build_object('batch_id', b.batch_id, 'status', 'COMMITTED',
    'applicability_set', to_jsonb(s),
    'conditions', coalesce(b.payload->'conditions', '[]'::jsonb));
end;
$$;

revoke all on function public.portal_mcp_commit_rule_applicability(uuid, uuid, integer)
  from public, anon;
grant execute on function public.portal_mcp_commit_rule_applicability(uuid, uuid, integer)
  to authenticated, service_role;
