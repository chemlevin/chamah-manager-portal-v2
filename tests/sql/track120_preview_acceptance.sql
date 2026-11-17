begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','47d22140-ee2f-437c-8a3d-2c446218cdf6',true);

do $$
declare preview jsonb; approval jsonb; committed jsonb;
begin
  preview := public.portal_mcp_preview_operational_changes(
    jsonb_build_array(
      jsonb_build_object('entity','employees','values',jsonb_build_object(
        'employee_code','TRACK120_EMP','national_id','990000120',
        'first_name','בדיקת','last_name','מסלול','email','track120@example.invalid')),
      jsonb_build_object('entity','suppliers','values',jsonb_build_object(
        'supplier_code','TRACK120_SUP','legal_name','ספק בדיקה TRACK120',
        'display_name','ספק בדיקה','registration_number','99000120'))
    ),
    'TRACK120 synthetic mixed-domain acceptance',
    'track120-mixed-create-v1'
  );
  if preview->>'status' <> 'READY' then raise exception 'Preview not ready: %',preview; end if;
  approval := public.portal_mcp_request_operational_approval((preview->>'batch_id')::uuid,'TRACK120 synthetic Preview acceptance');
  committed := public.portal_mcp_commit_operational_changes((preview->>'batch_id')::uuid,(approval->>'approval_id')::uuid);
  if committed->>'status' <> 'COMMITTED' or committed->>'verified' <> 'true' then raise exception 'Commit not verified: %',committed; end if;
end $$;
commit;

