-- REVIEW PROPOSAL ONLY. This file is intentionally outside supabase/migrations.
-- It has not been applied to Production. Promote it through normal change control
-- only after isolated validation and Director approval.

grant select on table public.calculation_rules to authenticated, service_role;
grant select on table public.calculation_rule_contexts to authenticated, service_role;
grant select on table public.calculation_rule_context_readable to authenticated, service_role;
