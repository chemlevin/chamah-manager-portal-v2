insert into public.budget_category_reporting_ownership (
  budget_category_id,economic_owner_allocation_unit_id,daycare_report_group,daycare_report_line,allocation_basis,source_evidence
) values (
  'c6411746-2c24-431e-8750-62c5cd54b797',
  'fe05de40-2551-4e90-befe-db4253d66e1c',
  'OFFICE_EXPENSES','הוצאות משרד','SOURCE_RULE_RESULT',
  jsonb_build_object('source','DIRECTOR_CONFIRMED_CHAT','decision','Development is an annual cumulative office expense, shown in daycare reports under Office Expenses.','recorded_at','2026-11-27','verification','DIRECTOR_CONFIRMED')
)
on conflict (budget_category_id) do update
set economic_owner_allocation_unit_id=excluded.economic_owner_allocation_unit_id,
    daycare_report_group=excluded.daycare_report_group,
    daycare_report_line=excluded.daycare_report_line,
    allocation_basis=excluded.allocation_basis,
    lifecycle_status='ACTIVE',
    source_evidence=excluded.source_evidence,
    row_version=public.budget_category_reporting_ownership.row_version+1;

update public.budget_rules
set lifecycle_status='INACTIVE',updated_at=now()
where budget_rule_id='03cd29c9-76e9-4da4-829c-26508cc68342'
  and sheet_rule_id='BCS-019'
  and lifecycle_status='ACTIVE';