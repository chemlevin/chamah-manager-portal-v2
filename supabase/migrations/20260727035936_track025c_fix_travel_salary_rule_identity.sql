do $$
declare
  travel_factor_id uuid;
  conflicting_factor_id uuid;
begin
  select compensation_factor_id
    into travel_factor_id
  from public.compensation_factors
  where compensation_factor_code = 'TRAVEL-DAILY-CAPPED-MONTHLY';

  if travel_factor_id is null then
    return;
  end if;

  select compensation_factor_id
    into conflicting_factor_id
  from public.compensation_factors
  where compensation_factor_code = 'TRAVEL-GLOBAL-MONTHLY'
     or compensation_factor_code = 'TRAVEL-GLOBAL_MONTHLY';

  if conflicting_factor_id is not null
     and conflicting_factor_id <> travel_factor_id then
    raise exception
      'Cannot restore the TRAVEL salary-rule identity because another factor already owns the compatible code';
  end if;

  update public.compensation_factors
  set compensation_factor_code = 'TRAVEL-GLOBAL_MONTHLY',
      updated_at = timezone('utc', now()),
      row_version = row_version + 1
  where compensation_factor_id = travel_factor_id;
end;
$$;
