-- Cover governed calculation-rule foreign keys used by read-back, history and audit queries.
create index if not exists calculation_rules_approval_id_idx on public.calculation_rules(approval_id);
create index if not exists calculation_rules_previous_version_id_idx on public.calculation_rules(previous_version_id);
create index if not exists calculation_rules_supersedes_rule_id_idx on public.calculation_rules(supersedes_rule_id);

create index if not exists calculation_rule_contexts_school_year_id_idx on public.calculation_rule_contexts(school_year_id);
create index if not exists calculation_rule_contexts_calendar_year_id_idx on public.calculation_rule_contexts(calendar_year_id);
create index if not exists calculation_rule_contexts_age_group_id_idx on public.calculation_rule_contexts(age_group_id);
create index if not exists calculation_rule_contexts_allocation_unit_id_idx on public.calculation_rule_contexts(allocation_unit_id);

create index if not exists calculation_rule_batches_approval_id_idx on public.calculation_rule_change_batches(approval_id);
create index if not exists calculation_rule_batches_committed_rule_id_idx on public.calculation_rule_change_batches(committed_rule_id);

create index if not exists calculation_rule_results_rule_id_idx on public.calculation_rule_results(calculation_rule_id);
create index if not exists calculation_rule_results_handler_code_idx on public.calculation_rule_results(handler_code);
create index if not exists calculation_rule_results_created_by_idx on public.calculation_rule_results(created_by_user_id);
