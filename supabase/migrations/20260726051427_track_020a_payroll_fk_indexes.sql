create index payroll_months_opened_by_idx on public.payroll_months(opened_by_user_id);
create index payroll_months_closed_by_idx on public.payroll_months(closed_by_user_id);
create index payroll_months_reopened_by_idx on public.payroll_months(reopened_by_user_id);
create index payroll_records_daycare_idx on public.payroll_records(daycare_id);
create index payroll_records_role_idx on public.payroll_records(role_id);
