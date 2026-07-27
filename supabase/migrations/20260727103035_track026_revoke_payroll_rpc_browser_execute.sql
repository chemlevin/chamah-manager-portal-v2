-- TRACK026 security hardening: Payroll lifecycle mutations are service-only.
revoke execute on function public.portal_open_payroll_month_v2(date,text,uuid,uuid,boolean,boolean,uuid)
  from public, anon, authenticated;
revoke execute on function public.portal_save_payroll_rows_v2(uuid,jsonb,uuid)
  from public, anon, authenticated;
revoke execute on function public.portal_close_payroll_month_v2(uuid,uuid,text)
  from public, anon, authenticated;
revoke execute on function public.portal_reopen_payroll_month_v2(uuid,uuid,text)
  from public, anon, authenticated;

grant execute on function public.portal_open_payroll_month_v2(date,text,uuid,uuid,boolean,boolean,uuid)
  to service_role;
grant execute on function public.portal_save_payroll_rows_v2(uuid,jsonb,uuid)
  to service_role;
grant execute on function public.portal_close_payroll_month_v2(uuid,uuid,text)
  to service_role;
grant execute on function public.portal_reopen_payroll_month_v2(uuid,uuid,text)
  to service_role;
