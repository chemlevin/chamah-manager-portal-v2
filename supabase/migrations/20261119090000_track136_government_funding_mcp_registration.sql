-- TRACK136: register the existing government funding record entity for the
-- operational MCP Preview path. This migration is metadata/matching only:
-- it does not insert, update, delete, or rewrite business records.

create or replace function private.portal_mcp_entity_meta(p_entity text)
returns jsonb language sql immutable set search_path=public,private,pg_temp as $$
  select case when p_entity='government_funding_records' then jsonb_build_object(
    'table','government_funding_records',
    'id','government_funding_record_id',
    'stable',jsonb_build_array('national_id','source_system','source_record_id'),
    'stable_mode','ANY',
    'generic',true,
    'required',jsonb_build_array('funding_month','amount','source_system','source_record_id'),
    'writable',jsonb_build_array(
      'government_funding_report_id','daycare_id','funding_month','child_id',
      'amount','child_count','source_payload','source_system','source_record_id',
      'source_version','source_mapping_version')
  ) else private.portal_mcp_entity_meta_base(p_entity) end;
$$;

-- Keep the existing catalog shape and append only the newly registered entity.
create or replace function public.portal_mcp_operational_catalog()
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare e text; m jsonb; entities jsonb='[]'::jsonb;
begin
 if not private.portal_is_authorized(auth.uid(),'OPERATIONS.READ') then return null; end if;
 for e in select unnest(array[
  'employees','employments','employee_assignments','employee_certificates',
  'employee_pay_terms','employee_compensation_eligibility','employee_leave_periods',
  'payroll_records','payroll_allocations','bank_allocations','suppliers',
  'payment_requests','allocation_units','roles','compensation_factors',
  'budget_categories','budget_rules','classrooms','monthly_enrollment',
  'bank_accounts','bank_transactions','accounting_statuses','children',
  'child_enrollments','daycare_billing_records','collection_receipts',
  'government_funding_records']) loop
  m:=private.portal_mcp_entity_meta(e);
  entities:=entities||jsonb_build_array(jsonb_build_object(
    'entity',e,'id',m->>'id','stable_keys',coalesce(m->'stable','[]'::jsonb),
    'writable',coalesce(m->'writable',to_jsonb('specialized'::text)),
    'required_on_create',coalesce(m->'required','[]'::jsonb),
    'approval_required',true));
 end loop;
 return jsonb_build_object(
  'entities',entities,
  'row_contract',jsonb_build_object('entity','catalog entity','record_id','UUID for corrections',
    'expected_row_version','required for corrections','values','canonical field/value object'),
  'limits',jsonb_build_object('rows_per_batch',100,'approval_minutes',10),
  'unsupported',jsonb_build_array());
end $$;

alter function private.portal_mcp_match_operational_row_v2(jsonb)
  rename to portal_mcp_match_operational_row_v2_base;

-- Resolve TAMA national IDs to canonical child IDs for Preview matching. No
-- government funding row is written by this function.
create or replace function private.portal_mcp_match_operational_row_v2(p_row jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,private,pg_temp as $$
declare
 e text:=p_row->>'entity'; v jsonb:=p_row->'values';
 normalized_id text:=public.portal_normalize_national_id(v->>'national_id');
 matches integer; found jsonb;
begin
 if e<>'government_funding_records' or nullif(p_row->>'record_id','') is not null then
  return private.portal_mcp_match_operational_row_v2_base(p_row);
 end if;
 if normalized_id is null then
  return p_row||jsonb_build_object('_match_conflict','MISSING_NATIONAL_ID');
 end if;
 select count(*),(jsonb_agg(to_jsonb(c))->0) into matches,found
 from public.children c
 where public.portal_normalize_national_id(c.national_id)=normalized_id;
 if matches>1 then return p_row||jsonb_build_object('_match_conflict','AMBIGUOUS_NATIONAL_ID'); end if;
 if matches=0 then return p_row||jsonb_build_object('_match_conflict','NATIONAL_ID_NOT_FOUND'); end if;
 return p_row||jsonb_build_object(
  'values',v||jsonb_build_object('child_id',found->>'child_id'),
  'matched_child_id',found->>'child_id');
end $$;

revoke all on function private.portal_mcp_entity_meta(text),
  private.portal_mcp_match_operational_row_v2(jsonb),
  private.portal_mcp_match_operational_row_v2_base(jsonb)
  from public,anon,authenticated;
