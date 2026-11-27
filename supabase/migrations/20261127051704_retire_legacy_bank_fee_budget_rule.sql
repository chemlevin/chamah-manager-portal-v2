-- The governed Calculation Rule 52 is now the source of truth for CAT-FEES.
-- Preserve the legacy rule for history but prevent legacy execution.
update public.budget_rules
set lifecycle_status = 'INACTIVE',
    updated_at = timezone('utc', now())
where budget_rule_id = '5de235ac-40e8-4ab6-95e5-929f4221171f'
  and lifecycle_status = 'ACTIVE';
