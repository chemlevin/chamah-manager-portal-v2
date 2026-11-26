update public.budget_rules
set lifecycle_status='INACTIVE',updated_at=now()
where sheet_rule_id in ('BCS-002','BCS-003')
  and lifecycle_status='ACTIVE';