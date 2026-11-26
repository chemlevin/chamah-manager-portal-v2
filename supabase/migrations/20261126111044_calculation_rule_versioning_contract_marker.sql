-- Existing immutable versions predate the governed-versioning metadata contract.
-- Mark them as legacy; all newly inserted versions must satisfy contract v2.
alter table public.calculation_rules
  add column if not exists versioning_contract_version smallint not null default 1;

alter table public.calculation_rules
  drop constraint if exists calculation_rules_amendment_metadata_check;
alter table public.calculation_rules
  add constraint calculation_rules_amendment_metadata_check check(
    versioning_contract_version<2 or (
      length(trim(coalesce(change_reason,'')))>0 and
      length(trim(coalesce(change_summary,'')))>0 and
      structured_diff<>'{}'::jsonb and
      preview_reference is not null and approval_reference is not null and
      commit_reference is not null and approved_by_user_id is not null
    )
  );

alter table public.calculation_rules
  alter column versioning_contract_version set default 2;
