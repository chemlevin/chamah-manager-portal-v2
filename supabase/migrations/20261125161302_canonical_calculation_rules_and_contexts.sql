create table public.calculation_rules (
  calculation_rule_id uuid primary key default gen_random_uuid(),
  rule_number bigint generated always as identity unique,
  rule_type text not null check (rule_type in (
    'STAFFING_RATIO','STAFFING_ROUNDING','FIXED_ROLE',
    'BUDGET_FORMULA','BUDGET_PARAMETER'
  )),
  display_name text not null check (length(trim(display_name)) > 0),
  definition jsonb not null default '{}'::jsonb check (jsonb_typeof(definition) = 'object'),
  effective_from date not null,
  effective_to date,
  rule_priority smallint not null default 100 check (rule_priority between 0 and 1000),
  lifecycle_status text not null default 'DRAFT' check (lifecycle_status in ('DRAFT','ACTIVE','REPLACED','RETIRED')),
  source_evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(source_evidence) = 'object'),
  approval_evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(approval_evidence) = 'object'),
  supersedes_rule_id uuid references public.calculation_rules(calculation_rule_id),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  created_by_user_id uuid,
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid,
  row_version integer not null default 1 check (row_version > 0),
  constraint calculation_rules_dates_valid check (effective_to is null or effective_to >= effective_from),
  constraint calculation_rules_active_has_evidence check (
    lifecycle_status <> 'ACTIVE'
    or (source_evidence <> '{}'::jsonb and approval_evidence <> '{}'::jsonb)
  )
);

create table public.calculation_rule_contexts (
  calculation_rule_context_id uuid primary key default gen_random_uuid(),
  calculation_rule_id uuid not null references public.calculation_rules(calculation_rule_id) on delete restrict,
  context_kind text not null check (context_kind in (
    'SCHOOL_YEAR','CALENDAR_YEAR','DAYCARE','CLASSROOM','AGE_GROUP',
    'BUDGET_CATEGORY','ALLOCATION_UNIT','FRAMEWORK_TYPE'
  )),
  school_year_id uuid references public.school_years(school_year_id),
  calendar_year_id uuid references public.calendar_years(calendar_year_id),
  daycare_id uuid references public.daycares(daycare_id),
  classroom_id uuid references public.classrooms(classroom_id),
  age_group_id uuid references public.age_groups(age_group_id),
  budget_category_id uuid references public.budget_categories(budget_category_id),
  allocation_unit_id uuid references public.allocation_units(allocation_unit_id),
  context_code text,
  created_at timestamptz not null default now(),
  created_by_user_id uuid,
  constraint calculation_rule_context_value_matches_kind check (
    (context_kind='SCHOOL_YEAR' and school_year_id is not null and calendar_year_id is null and daycare_id is null and classroom_id is null and age_group_id is null and budget_category_id is null and allocation_unit_id is null and context_code is null)
    or (context_kind='CALENDAR_YEAR' and school_year_id is null and calendar_year_id is not null and daycare_id is null and classroom_id is null and age_group_id is null and budget_category_id is null and allocation_unit_id is null and context_code is null)
    or (context_kind='DAYCARE' and school_year_id is null and calendar_year_id is null and daycare_id is not null and classroom_id is null and age_group_id is null and budget_category_id is null and allocation_unit_id is null and context_code is null)
    or (context_kind='CLASSROOM' and school_year_id is null and calendar_year_id is null and daycare_id is null and classroom_id is not null and age_group_id is null and budget_category_id is null and allocation_unit_id is null and context_code is null)
    or (context_kind='AGE_GROUP' and school_year_id is null and calendar_year_id is null and daycare_id is null and classroom_id is null and age_group_id is not null and budget_category_id is null and allocation_unit_id is null and context_code is null)
    or (context_kind='BUDGET_CATEGORY' and school_year_id is null and calendar_year_id is null and daycare_id is null and classroom_id is null and age_group_id is null and budget_category_id is not null and allocation_unit_id is null and context_code is null)
    or (context_kind='ALLOCATION_UNIT' and school_year_id is null and calendar_year_id is null and daycare_id is null and classroom_id is null and age_group_id is null and budget_category_id is null and allocation_unit_id is not null and context_code is null)
    or (context_kind='FRAMEWORK_TYPE' and school_year_id is null and calendar_year_id is null and daycare_id is null and classroom_id is null and age_group_id is null and budget_category_id is null and allocation_unit_id is null and context_code in ('BASIC','EXTENDED'))
  ),
  unique (calculation_rule_id, context_kind)
);

create index calculation_rules_active_lookup_idx
  on public.calculation_rules (rule_type, lifecycle_status, effective_from, effective_to, rule_priority);
create index calculation_rule_contexts_rule_idx
  on public.calculation_rule_contexts (calculation_rule_id);
create index calculation_rule_contexts_daycare_idx
  on public.calculation_rule_contexts (daycare_id) where daycare_id is not null;
create index calculation_rule_contexts_classroom_idx
  on public.calculation_rule_contexts (classroom_id) where classroom_id is not null;
create index calculation_rule_contexts_budget_category_idx
  on public.calculation_rule_contexts (budget_category_id) where budget_category_id is not null;

alter table public.calculation_rules enable row level security;
alter table public.calculation_rule_contexts enable row level security;

create policy calculation_rules_authorized_read on public.calculation_rules
  for select to authenticated
  using ((select private.can_read_portal()));

create policy calculation_rule_contexts_authorized_read on public.calculation_rule_contexts
  for select to authenticated
  using ((select private.can_read_portal()));

create view public.calculation_rule_context_readable
with (security_invoker = true)
as
select
  r.rule_number,
  r.calculation_rule_id,
  r.rule_type,
  r.display_name,
  r.definition,
  r.effective_from,
  r.effective_to,
  r.rule_priority,
  r.lifecycle_status,
  r.version,
  c.context_kind,
  coalesce(
    d.display_name,
    cl.display_name,
    ag.display_name,
    bc.display_name,
    au.display_name,
    sy.display_name,
    cy.display_name,
    c.context_code
  ) as context_name,
  coalesce(
    d.daycare_id,
    cl.classroom_id,
    ag.age_group_id,
    bc.budget_category_id,
    au.allocation_unit_id,
    sy.school_year_id,
    cy.calendar_year_id
  ) as context_entity_id
from public.calculation_rules r
join public.calculation_rule_contexts c
  on c.calculation_rule_id = r.calculation_rule_id
left join public.daycares d on d.daycare_id = c.daycare_id
left join public.classrooms cl on cl.classroom_id = c.classroom_id
left join public.age_groups ag on ag.age_group_id = c.age_group_id
left join public.budget_categories bc on bc.budget_category_id = c.budget_category_id
left join public.allocation_units au on au.allocation_unit_id = c.allocation_unit_id
left join public.school_years sy on sy.school_year_id = c.school_year_id
left join public.calendar_years cy on cy.calendar_year_id = c.calendar_year_id;

comment on table public.calculation_rules is
  'Canonical, versioned and effective-dated calculation rules. A rule is activated only with source and approval evidence.';
comment on table public.calculation_rule_contexts is
  'Canonical foreign-key contexts defining exactly where a calculation rule applies; one typed context per row.';
comment on view public.calculation_rule_context_readable is
  'Human-readable rule and context projection; calculations use canonical IDs, this view is for review.';
