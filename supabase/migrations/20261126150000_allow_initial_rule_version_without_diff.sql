-- Allow the first immutable version of a governed rule to have no prior-version diff.
-- Amendments (version > 1) must still retain a non-empty server-computed structured diff.
alter table public.calculation_rules
  drop constraint if exists calculation_rules_amendment_metadata_check;

alter table public.calculation_rules
  add constraint calculation_rules_amendment_metadata_check check(
    versioning_contract_version < 2 or (
      length(trim(coalesce(change_reason,''))) > 0 and
      length(trim(coalesce(change_summary,''))) > 0 and
      (version = 1 or structured_diff <> '{}'::jsonb) and
      preview_reference is not null and
      approval_reference is not null and
      commit_reference is not null and
      approved_by_user_id is not null
    )
  );
