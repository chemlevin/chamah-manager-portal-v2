alter table public.daycare_school_years
  add column tuition_payment_count integer null,
  add constraint daycare_school_years_tuition_payment_count_chk
    check (tuition_payment_count in (11, 12));

comment on column public.daycare_school_years.tuition_payment_count is
  'Tuition collection schedule metadata: 11 means Sep-Jul with zero August collection; 12 means Sep-Aug. It does not alter monthly economic tuition or budget calculations.';

update public.daycare_school_years dsy
set tuition_payment_count = case when d.daycare_code = 'DC-GANON' then 12 else 11 end
from public.daycares d, public.school_years sy
where d.daycare_id = dsy.daycare_id
  and sy.school_year_id = dsy.school_year_id
  and sy.school_year_code = 'SY-2026-2027'
  and d.daycare_code in ('DC-ASHKELON', 'DC-GANON', 'DC-MAHANE', 'DC-MERKAZI', 'DC-NEOT', 'DC-SNIF');

update public.budget_rules br
set numeric_value = case ag.age_group_code
  when 'INFANT' then 4185
  when 'TODDLER' then 3102
  when 'GRADUATE' then 2751
end
from public.budget_categories bc, public.school_years sy, public.age_groups ag
where bc.budget_category_id = br.budget_category_id
  and sy.school_year_id = br.school_year_id
  and ag.age_group_id = br.age_group_id
  and bc.budget_category_code = 'CAT-TUITION'
  and sy.school_year_code = 'SY-2026-2027'
  and br.daycare_id is null
  and br.calculation_method = 'TUITION_MONTHLY'
  and ag.age_group_code in ('INFANT', 'TODDLER', 'GRADUATE');

update public.budget_rules br
set numeric_value = 3102
from public.budget_categories bc, public.school_years sy, public.daycares d
where bc.budget_category_id = br.budget_category_id
  and sy.school_year_id = br.school_year_id
  and d.daycare_id = br.daycare_id
  and bc.budget_category_code = 'CAT-TUITION'
  and sy.school_year_code = 'SY-2026-2027'
  and d.daycare_code = 'DC-GANON'
  and br.calculation_method = 'TUITION_MONTHLY';
