-- Authenticated Preview integration regression. Run in the isolated Preview DB.
-- The transaction is rolled back so no fixture becomes business data.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','9660a6ba-9bd2-4edc-bd6f-7629de86ce57',true);

do $$
declare preview jsonb; approval jsonb; committed jsonb;
begin
  preview := public.portal_mcp_preview_operational_changes(
    jsonb_build_array(jsonb_build_object('entity','allocation_units','values',jsonb_build_object(
      'allocation_unit_code','INTEGRATION-ROLLBACK-001',
      'display_name','Integration Rollback Fixture',
      'allocation_unit_type','OFFICE',
      'lifecycle_status','ACTIVE'))),
    'integration-regression',
    jsonb_build_object('source_system','fixture','source_record_id','integration-regression-sql'),
    'integration-regression-sql-001');
  if preview->>'status' <> 'READY' then raise exception 'Preview not ready: %',preview; end if;
  approval := public.portal_mcp_request_operational_approval((preview->>'batch_id')::uuid,'Digest binding regression');
  if approval->>'payload_digest' is distinct from preview->>'preview_digest' then
    raise exception 'Approval digest differs from preview digest: % vs %',approval->>'payload_digest',preview->>'preview_digest';
  end if;
  committed := public.portal_mcp_commit_operational_changes((preview->>'batch_id')::uuid,(approval->>'approval_id')::uuid);
  if committed->>'status' <> 'COMMITTED' then raise exception 'Commit not verified: %',committed; end if;
end $$;

rollback;
