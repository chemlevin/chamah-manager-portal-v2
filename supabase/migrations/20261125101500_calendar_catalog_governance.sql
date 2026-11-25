-- Preserve deterministic IDs for a governed cross-entity calendar Preview.
-- The generic commit path already validates the metadata allowlist and writes atomically.
do $$
begin
  if to_regprocedure('private.portal_mcp_entity_meta_calendar_v1(text)') is null then
    alter function private.portal_mcp_entity_meta(text) rename to portal_mcp_entity_meta_calendar_v1;
  end if;
end $$;

create or replace function private.portal_mcp_entity_meta(p_entity text)
returns jsonb language sql immutable set search_path=public,private,pg_temp as $$
  select case when p_entity in ('holiday_calendars','holiday_calendar_days','daycare_calendar_assignments','daycare_operating_hours','daycare_calendar_exceptions','daycare_monthly_operating_results')
    then private.portal_mcp_entity_meta_calendar_v1(p_entity) || jsonb_build_object(
      'writable', private.portal_mcp_entity_meta_calendar_v1(p_entity)->'writable' || jsonb_build_array(private.portal_mcp_entity_meta_calendar_v1(p_entity)->>'id'))
    else private.portal_mcp_entity_meta_calendar_v1(p_entity)
  end
$$;

do $$
begin
if to_regclass('public.operational_model_registry') is not null then
insert into public.operational_model_registry
  (model_key,model_version,effective_from,effective_to,definition,source_provenance,lifecycle_status)
values
  ('CALENDAR_OPERATING_MODEL','1.0.0','2026-08-14',null,
   '{"entities":["holiday_calendars","holiday_calendar_days","daycare_calendar_assignments","daycare_operating_hours","daycare_calendar_exceptions","daycare_monthly_operating_results"],"versioning":"effective-dated","workflow":"source-lineage-preview-approval-commit-readback"}'::jsonb,
   '{"task_id":"CHAMAH-CALENDAR-COMPLETE-2026-11-25-001","authority":"Director","source":"canonical calendar model"}'::jsonb,'ACTIVE')
on conflict (model_key,model_version) do nothing;
end if;
end $$;

do $$
begin
if to_regclass('public.operational_relationship_rules') is not null then
insert into public.operational_relationship_rules
  (rule_key,version,lifecycle_status,effective_from,effective_to,source_entity,target_entity,stable_key_fields,period_fields,accepted_evidence_types,required_source_fields,null_policy,unresolved_policy,conflict_policy,missing_data_blocks_fact,history_policy,idempotency_policy,calculation_policy,documentation_reference)
values
  ('CALENDAR_DAYCARE_ASSIGNMENT','1.0.0','ACTIVE','2026-08-14',null,'daycare_calendar_assignments','holiday_calendars',
   '["daycare_id","school_year_id","effective_from","version"]'::jsonb,'["effective_from","effective_to"]'::jsonb,
   '["SOURCE_EVIDENCE","DIRECTOR_DECISION"]'::jsonb,'["daycare_id","holiday_calendar_id","school_year_id","effective_from","effective_to","version","source_lineage"]'::jsonb,
   '{"behavior":"reject"}'::jsonb,'{"behavior":"UNRESOLVED"}'::jsonb,'{"behavior":"CONFLICT"}'::jsonb,true,
   '{"behavior":"append_only_version"}'::jsonb,'{"behavior":"stable_key_and_source_fingerprint"}'::jsonb,
   '{"method":"calendar-days-plus-effective-exceptions"}'::jsonb,'{"model_key":"CALENDAR_OPERATING_MODEL","model_version":"1.0.0"}'::jsonb)
on conflict (rule_key,version) do nothing;
end if;
end $$;

revoke all on function private.portal_mcp_entity_meta(text) from public,anon,authenticated;
