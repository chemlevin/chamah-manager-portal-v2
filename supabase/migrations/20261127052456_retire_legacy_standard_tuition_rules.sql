-- Governed tuition rules 53-56 are now the source of truth for the standard tuition rates.
-- Preserve legacy rows for audit; the private daycare's manual-rate row is intentionally retained.
update public.budget_rules
set lifecycle_status = 'INACTIVE',
    updated_at = timezone('utc', now())
where budget_rule_id in (
  '7edfea86-475f-466e-9274-42ea56a23ca2',
  '2b8a3241-2d70-4573-8a76-e548f41d7bc0',
  'c7b88803-f073-4fed-958e-14055a81d96b',
  '0b245984-cc69-4ae8-a74e-b087739eace6'
)
and lifecycle_status = 'ACTIVE';
