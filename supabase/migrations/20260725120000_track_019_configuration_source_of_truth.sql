-- TRACK019: portal/Supabase configuration is authoritative.
-- Legacy sheet identifiers remain available for reconciliation, but portal-created
-- configuration rows must not require them.

alter table public.school_year_months
  alter column sheet_month_id drop not null;

alter table public.accounting_statuses
  alter column sheet_accounting_status_id drop not null;

alter table public.classroom_licensing_rules
  alter column sheet_licensing_rule_id drop not null;

alter table public.staffing_rules
  alter column sheet_staffing_rule_id drop not null;

alter table public.staffing_budget_parameters
  alter column sheet_staffing_budget_parameter_id drop not null;

alter table public.travel_rates
  alter column sheet_travel_rate_id drop not null;

alter table public.accounting_statuses
  add column if not exists accounting_status_code varchar(80);

update public.accounting_statuses
set accounting_status_code = sheet_accounting_status_id
where accounting_status_code is null
  and sheet_accounting_status_id is not null;

alter table public.accounting_statuses
  alter column accounting_status_code set not null;

alter table public.accounting_statuses
  drop constraint if exists accounting_statuses_accounting_status_code_format;

alter table public.accounting_statuses
  add constraint accounting_statuses_accounting_status_code_format
  check (accounting_status_code ~ '^[A-Z0-9_-]+$');

create unique index if not exists accounting_statuses_accounting_status_code_uidx
  on public.accounting_statuses (accounting_status_code);

comment on column public.accounting_statuses.accounting_status_code is
  'Portal-native stable workflow code. sheet_accounting_status_id is retained only for legacy compatibility.';

insert into public.certificate_types
  (certificate_type_code, display_name, requires_expiry, lifecycle_status, display_order)
values
  ('CAREGIVER_CERTIFICATE', 'תעודת מטפלת', false, 'ACTIVE', 10),
  ('GRADUATION_CERTIFICATE', 'תעודת סיום לימודים', false, 'ACTIVE', 20),
  ('FIRST_AID', 'עזרה ראשונה', true, 'ACTIVE', 30),
  ('SAFE_CONDUCT', 'התנהלות בטוחה', true, 'ACTIVE', 40)
on conflict (certificate_type_code) do nothing;
