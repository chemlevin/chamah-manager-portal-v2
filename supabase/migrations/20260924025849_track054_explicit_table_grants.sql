-- TRACK054: Supabase is ending automatic Data API grants for new public tables.
-- Reproduce the existing access model explicitly without changing RLS policies:
--   * anon has no direct table or sequence privileges;
--   * authenticated can SELECT only from the existing browser-readable tables;
--   * service_role retains full server-side access.

begin;

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;

grant select on table
  public.school_years,
  public.calendar_years,
  public.legal_entity_types,
  public.legal_entities,
  public.allocation_units,
  public.daycares,
  public.daycare_school_years,
  public.age_groups,
  public.classrooms,
  public.classroom_age_groups,
  public.monthly_enrollment,
  public.roles,
  public.certificate_types,
  public.employees,
  public.employments,
  public.employee_assignments,
  public.employee_certificates,
  public.import_batches,
  public.payroll_records,
  public.payroll_allocations,
  public.bank_accounts,
  public.bank_transactions,
  public.bank_allocations,
  public.budget_categories,
  public.budget_rules,
  public.calculation_runs,
  public.budget_snapshots,
  public.compensation_factors,
  public.compensation_rules,
  public.employee_compensation_eligibility,
  public.import_rows,
  public.audit_events,
  public.data_quality_issues,
  public.school_year_months,
  public.monthly_work_calendars,
  public.classroom_capacity_breakdowns,
  public.staffing_budget_parameters,
  public.employee_pay_terms,
  public.accounting_statuses,
  public.classroom_licensing_rules,
  public.staffing_rules,
  public.travel_rates,
  public.portal_sections,
  public.portal_user_profiles,
  public.portal_user_permissions,
  public.portal_user_allocation_units,
  public.portal_user_daycares,
  public.portal_user_import_mappings
to authenticated;

grant all privileges on table
  public.school_years,
  public.calendar_years,
  public.legal_entity_types,
  public.legal_entities,
  public.allocation_units,
  public.daycares,
  public.daycare_school_years,
  public.age_groups,
  public.classrooms,
  public.classroom_age_groups,
  public.monthly_enrollment,
  public.roles,
  public.certificate_types,
  public.employees,
  public.employments,
  public.employee_assignments,
  public.employee_certificates,
  public.import_batches,
  public.payroll_records,
  public.payroll_allocations,
  public.bank_accounts,
  public.bank_transactions,
  public.bank_allocations,
  public.budget_categories,
  public.budget_rules,
  public.calculation_runs,
  public.budget_snapshots,
  public.compensation_factors,
  public.compensation_rules,
  public.employee_compensation_eligibility,
  public.import_rows,
  public.audit_events,
  public.data_quality_issues,
  public.school_year_months,
  public.monthly_work_calendars,
  public.classroom_capacity_breakdowns,
  public.staffing_budget_parameters,
  public.employee_pay_terms,
  public.accounting_statuses,
  public.classroom_licensing_rules,
  public.staffing_rules,
  public.travel_rates,
  public.portal_sections,
  public.portal_user_profiles,
  public.portal_user_permissions,
  public.portal_user_allocation_units,
  public.portal_user_daycares,
  public.employee_leave_periods,
  public.payroll_months,
  public.bank_transfers,
  public.portal_user_import_mappings,
  public.payroll_calculation_input_rules
to service_role;

grant all privileges on sequence
  public.bank_transfers_row_number_seq,
  public.bank_transfers_transfer_number_seq
to service_role;

-- Keep future objects fail-closed. Each future CREATE TABLE migration must enable
-- RLS and declare its own anon/authenticated/service_role grants explicitly.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated, service_role;

commit;
