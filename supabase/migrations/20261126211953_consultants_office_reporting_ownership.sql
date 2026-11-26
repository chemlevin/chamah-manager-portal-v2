insert into public.budget_category_reporting_ownership (
  budget_category_id,economic_owner_allocation_unit_id,daycare_report_group,daycare_report_line,allocation_basis,source_evidence
) values (
  '0cee30e3-fcba-47a6-8b98-c2141f0779dd',
  'fe05de40-2551-4e90-befe-db4253d66e1c',
  'OFFICE_EXPENSES','הוצאות משרד','SOURCE_RULE_RESULT',
  jsonb_build_object(
    'source','DIRECTOR_CONFIRMED_CHAT',
    'decision','Consultants and approvals is an annual office-owned expense, shown in daycare reports under Office Expenses; payment may be one instalment.',
    'recorded_at','2026-11-26','verification','DIRECTOR_CONFIRMED'
  )
)
on conflict (budget_category_id) do update
set economic_owner_allocation_unit_id=excluded.economic_owner_allocation_unit_id,
    daycare_report_group=excluded.daycare_report_group,
    daycare_report_line=excluded.daycare_report_line,
    allocation_basis=excluded.allocation_basis,
    lifecycle_status='ACTIVE',
    source_evidence=excluded.source_evidence,
    row_version=public.budget_category_reporting_ownership.row_version+1;