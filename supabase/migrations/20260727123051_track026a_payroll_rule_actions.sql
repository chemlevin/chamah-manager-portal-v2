-- Persist the pre-existing Payroll workflow semantics as rule data:
-- persistence requires the monthly no-absence input, while recovery pay is
-- eligibility-only until a calculation method is configured.
update public.compensation_rules
set eligibility_condition = 'AUTOMATIC_BY_SENIORITY AND NO_ABSENCE_OVERRIDE=TRUE',
    updated_at = now()
where lifecycle_status = 'ACTIVE'
  and compensation_factor_id in (
    select compensation_factor_id
    from public.compensation_factors
    where compensation_factor_code like 'PERSISTENCE-%'
  );

update public.compensation_rules
set proration_method = 'ELIGIBILITY_ONLY',
    updated_at = now()
where lifecycle_status = 'ACTIVE'
  and compensation_factor_id in (
    select compensation_factor_id
    from public.compensation_factors
    where compensation_factor_code like 'HAVRAA-%'
  );
