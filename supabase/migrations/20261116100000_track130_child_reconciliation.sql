-- TRACK130: child identity, source-separated funding/revenue, discrepancies,
-- and bounded read-only reconciliation. Extends TRACK122; no source rows are
-- imported by this migration.

alter table public.children add column if not exists national_id text;
alter table public.children add column if not exists age_group_id uuid references public.age_groups(age_group_id);
create or replace function public.portal_normalize_national_id(value text)
returns text language sql immutable as $$ select nullif(regexp_replace(coalesce(value,''),'\D','','g'),'') $$;
create or replace function public.portal_valid_national_id(value text)
returns boolean language plpgsql immutable as $$
declare d text:=public.portal_normalize_national_id(value); i int; s int:=0; n int; begin
  if d is null or length(d)<>9 or d ~ '^(\\d)\\1{8}$' then return false; end if;
  for i in 1..9 loop n:=substring(d from i for 1)::int * case when i%2=0 then 2 else 1 end; s:=s+case when n>9 then n-9 else n end; end loop;
  return s%10=0;
end $$;
create unique index if not exists children_valid_national_id_uidx
  on public.children(public.portal_normalize_national_id(national_id))
  where national_id is not null and public.portal_valid_national_id(national_id);

create table if not exists public.government_funding_reports (
  government_funding_report_id uuid primary key default gen_random_uuid(),
  report_identity text not null, report_month date not null,
  institution_symbol text, source_file text, source_system text,
  source_record_id text, reported_child_count integer,
  reported_amount numeric(12,2), daycare_mapping_status text not null default 'UNMAPPED'
    check (daycare_mapping_status in ('MAPPED','PARTIAL','UNMAPPED','CONFLICT')),
  source_version text, source_mapping_version text, source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(source_system, source_record_id), unique(report_identity, report_month, source_file)
);
create table if not exists public.government_funding_records (
  government_funding_record_id uuid primary key default gen_random_uuid(),
  government_funding_report_id uuid not null references public.government_funding_reports on delete restrict,
  daycare_id uuid references public.daycares(daycare_id) on delete restrict,
  funding_month date not null, child_id uuid references public.children(child_id) on delete restrict,
  amount numeric(12,2), child_count integer, source_payload jsonb not null default '{}'::jsonb,
  source_system text, source_record_id text, source_version text, source_mapping_version text,
  unique(source_system, source_record_id)
);

create table if not exists public.child_theoretical_revenue (
  child_theoretical_revenue_id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(child_id) on delete restrict,
  daycare_id uuid not null references public.daycares(daycare_id) on delete restrict,
  revenue_month date not null, age_group_id uuid references public.age_groups(age_group_id),
  standard_type text, rate numeric(12,2), extended_amount numeric(12,2), budget_rule_id uuid references public.budget_rules(budget_rule_id),
  source_system text, source_record_id text, source_version text, source_mapping_version text, source_payload jsonb not null default '{}'::jsonb,
  unique(child_id, revenue_month)
);

create table if not exists public.child_discrepancies (
  child_discrepancy_id uuid primary key default gen_random_uuid(), child_id uuid references public.children(child_id) on delete restrict,
  daycare_id uuid references public.daycares(daycare_id) on delete restrict, discrepancy_month date,
  source_record_id text, discrepancy_type text not null, severity text not null default 'WARNING' check (severity in ('INFO','WARNING','ERROR','CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN','IN_REVIEW','RESOLVED','INVALID')),
  evidence jsonb not null default '{}'::jsonb, resolution jsonb, source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), resolved_at timestamptz,
  unique(discrepancy_type, child_id, daycare_id, discrepancy_month, source_record_id)
);
create unique index if not exists child_enrollments_source_uidx
  on public.child_enrollments(source_system, source_record_id)
  where source_system is not null and source_record_id is not null;
create unique index if not exists collection_receipts_source_uidx
  on public.collection_receipts(source_system, source_record_id)
  where source_system is not null and source_record_id is not null;

alter table public.children enable row level security; alter table public.government_funding_reports enable row level security;
alter table public.government_funding_records enable row level security; alter table public.child_theoretical_revenue enable row level security; alter table public.child_discrepancies enable row level security;
revoke all on public.government_funding_reports,public.government_funding_records,public.child_theoretical_revenue,public.child_discrepancies from public,anon,authenticated;

create or replace function public.portal_mcp_child_reconciliation(p_month date, p_daycare_id uuid default null, p_child_id uuid default null)
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
select jsonb_build_object('month',p_month,'daycare_id',p_daycare_id,'child_id',p_child_id,'rows',coalesce(jsonb_agg(to_jsonb(x) order by x.daycare_id,x.child_id),'[]'::jsonb))
from (
 select e.daycare_id,e.child_id,count(*)::int child_count, null::int occupancy_count,
  min(c.age_group_id::text)::uuid age_group_id,
  (select sum(b.amount_due) from daycare_billing_records b where b.child_id=e.child_id and b.daycare_id=e.daycare_id and b.billing_month=p_month) parent_charges,
  (select sum(r.amount) from collection_receipts r join daycare_billing_records b on b.daycare_billing_record_id=r.daycare_billing_record_id where b.child_id=e.child_id and b.daycare_id=e.daycare_id and b.billing_month=p_month) parent_collections,
  (select sum(g.amount) from government_funding_records g where g.child_id=e.child_id and g.daycare_id=e.daycare_id and g.funding_month=p_month) government_funding,
  (select sum(t.extended_amount) from child_theoretical_revenue t where t.child_id=e.child_id and t.daycare_id=e.daycare_id and t.revenue_month=p_month) theoretical_extended_amount,
  (select count(*) from child_discrepancies d where d.child_id=e.child_id and d.daycare_id=e.daycare_id and (d.discrepancy_month=p_month or d.discrepancy_month is null) and d.status in ('OPEN','IN_REVIEW')) unresolved_discrepancies
 from child_enrollments e join children c on c.child_id=e.child_id
 where e.effective_from<=p_month and (e.effective_to is null or e.effective_to>=p_month) and (p_daycare_id is null or e.daycare_id=p_daycare_id) and (p_child_id is null or e.child_id=p_child_id)
 group by e.daycare_id,e.child_id
) x;
$$;
revoke all on function public.portal_mcp_child_reconciliation(date,uuid,uuid) from public,anon; grant execute on function public.portal_mcp_child_reconciliation(date,uuid,uuid) to authenticated;

-- Approval is a review artifact and may be requested for Preview-only synthetic
-- batches. Synthetic/test promotion remains blocked at commit by the shared
-- portal_mcp_reject_synthetic guard in portal_mcp_commit_operational_changes.
create or replace function public.portal_mcp_request_operational_approval(p_batch_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b public.mcp_ingestion_batches; a jsonb;
begin
 if not private.portal_is_authorized(auth.uid(),'OPERATIONS.WRITE') then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into b from public.mcp_ingestion_batches where batch_id=p_batch_id and actor_user_id=auth.uid() for update;
 if b.batch_id is null or b.domain<>'OPERATIONS' or b.status<>'READY' then raise exception 'batch is not ready for approval'; end if;
 if jsonb_typeof(b.source_provenance)<>'object' or b.source_provenance='{}'::jsonb then raise exception 'Source provenance is required'; end if;
 a:=public.portal_request_approval('OPERATIONS.WRITE','OPERATIONAL_CHANGESET',b.batch_id,jsonb_build_object('batch_id',b.batch_id,'row_version',b.row_version,'preview_digest',b.preview_digest,'source_provenance',b.source_provenance),p_reason);
 update public.mcp_ingestion_batches set approval_id=(a->>'approval_id')::uuid,verification_status='REAL_VERIFIED',verified_by_user_id=auth.uid(),verified_at=now() where batch_id=b.batch_id;
 return a||jsonb_build_object('verification_status','REAL_VERIFIED','verified_by_user_id',auth.uid(),'verified_at',now());
end$$;
revoke all on function public.portal_mcp_request_operational_approval(uuid,text) from public,anon;
grant execute on function public.portal_mcp_request_operational_approval(uuid,text) to authenticated;
