revoke execute on function public.portal_mcp_commit_calculation_rule(uuid,uuid,integer) from authenticated,public,anon;
create index if not exists calculation_rule_app_sets_created_by_idx
  on public.calculation_rule_applicability_sets(created_by_user_id);

comment on function public.portal_mcp_commit_calculation_rule(uuid,uuid,integer)
  is 'Legacy combined rule/applicability commit retained for history only; execution is revoked. Use separate governed rule-instruction and applicability workflows.';
