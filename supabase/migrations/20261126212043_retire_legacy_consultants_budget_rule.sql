update public.budget_rules
set lifecycle_status='INACTIVE',
    updated_at=now()
where budget_rule_id='78f2f0fc-1787-4c50-bca5-56051a6fa439'
  and sheet_rule_id='BCS-010'
  and lifecycle_status='ACTIVE';