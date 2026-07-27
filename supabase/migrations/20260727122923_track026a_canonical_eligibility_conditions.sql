-- Preserve the existing certificate/commitment eligibility semantics in the
-- canonical rule DSL. The Payroll Workbench consumes this condition verbatim.
update public.compensation_rules
set eligibility_condition = 'CAREGIVER_CERTIFICATE_STATUS IN (תעודה,התחייבות ללימודים)',
    updated_at = now()
where lifecycle_status = 'ACTIVE'
  and eligibility_condition = 'CERTIFICATE_STATUS IN (CERTIFIED,COMMITTED)';
