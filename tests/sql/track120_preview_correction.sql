begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','47d22140-ee2f-437c-8a3d-2c446218cdf6',true);

do $$
declare preview jsonb; approval jsonb; committed jsonb;
begin
  preview := public.portal_mcp_preview_operational_changes(
    jsonb_build_array(jsonb_build_object(
      'entity','employees',
      'record_id','6139ea8f-7b99-48b5-81eb-92e9183591a2',
      'expected_row_version',1,
      'values',jsonb_build_object('notes','TRACK120 correction and version verified'))),
    'TRACK120 synthetic correction acceptance',
    'track120-employee-correction-v2'
  );
  if preview->>'status' <> 'READY' then raise exception 'Correction preview not ready: %',preview; end if;
  approval := public.portal_mcp_request_operational_approval((preview->>'batch_id')::uuid,'TRACK120 synthetic correction approval');
  committed := public.portal_mcp_commit_operational_changes((preview->>'batch_id')::uuid,(approval->>'approval_id')::uuid);
  if committed->>'status' <> 'COMMITTED' then raise exception 'Correction commit failed: %',committed; end if;
end $$;
commit;

