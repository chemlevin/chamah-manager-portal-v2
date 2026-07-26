alter table public.daycare_school_years
  add column lifecycle_status varchar(20) not null default 'ACTIVE',
  add constraint daycare_school_years_status_chk
    check (lifecycle_status in ('ACTIVE', 'INACTIVE', 'ARCHIVED'));

create index daycare_school_years_status_idx
  on public.daycare_school_years(lifecycle_status);

comment on column public.daycare_school_years.lifecycle_status is
  'Lifecycle state used by active configuration lookups; existing operating rows remain ACTIVE.';
