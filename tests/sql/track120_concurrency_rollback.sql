begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','47d22140-ee2f-437c-8a3d-2c446218cdf6',true);

do $$
declare preview jsonb; approval jsonb; before_notes text; after_notes text; rejected boolean:=false;
begin
  select notes into before_notes from public.employees where employee_code='TRACK120_EMP';
  preview := public.portal_mcp_preview_operational_changes(
    jsonb_build_array(jsonb_build_object(
      'entity','employees','record_id','6139ea8f-7b99-48b5-81eb-92e9183591a2',
      'expected_row_version',1,
      'values',jsonb_build_object('notes','STALE WRITE MUST ROLLBACK'))),
    'TRACK120 stale concurrency probe','track120-stale-write-v1');
  approval := public.portal_mcp_request_operational_approval((preview->>'batch_id')::uuid,'TRACK120 stale concurrency probe');
  begin
    perform public.portal_mcp_commit_operational_changes((preview->>'batch_id')::uuid,(approval->>'approval_id')::uuid);
  exception when serialization_failure then rejected:=true;
  end;
  if not rejected then raise exception 'Stale row-version write was accepted'; end if;
  select notes into after_notes from public.employees where employee_code='TRACK120_EMP';
  if after_notes is distinct from before_notes then raise exception 'Failed commit changed canonical data'; end if;
end $$;
rollback;

