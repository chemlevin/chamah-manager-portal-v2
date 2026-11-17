-- TRACK114: Director-only financial approval, execution evidence, and bank reconciliation.
-- Additive only: TRACK113 payment history and legacy banking remain intact.

insert into public.portal_actions(action_code,display_name,resource_type,action_kind,requires_approval) values
 ('SUPPLIER_BANK.PROPOSE','הצעת שינוי חשבון ספק','SUPPLIER_BANK_DETAIL','CREATE',false),
 ('SUPPLIER_BANK.VERIFY','אימות שינוי חשבון ספק','SUPPLIER_BANK_DETAIL','UPDATE',true),
 ('PAYMENT_EXECUTION.RECORD','תיעוד ביצוע תשלום','PAYMENT_EXECUTION','CREATE',false),
 ('PAYMENT_EXECUTION.READ','קריאת ביצועי תשלום','PAYMENT_EXECUTION','READ',false),
 ('RECONCILIATION.READ','קריאת התאמות בנק','BANK_RECONCILIATION','READ',false),
 ('RECONCILIATION.CONFIRM','אישור התאמת בנק','BANK_RECONCILIATION','UPDATE',false),
 ('RECONCILIATION.IMPORT','ייבוא דף בנק להתאמה','BANK_STATEMENT_IMPORT','BULK',false),
 ('RECONCILIATION.SUGGEST','יצירת הצעות התאמה','BANK_RECONCILIATION_JOB','CREATE',false)
on conflict(action_code) do update set display_name=excluded.display_name,resource_type=excluded.resource_type,action_kind=excluded.action_kind,requires_approval=excluded.requires_approval,is_active=true;

insert into public.portal_role_actions(role_code,action_code)
select 'DIRECTOR',action_code from public.portal_actions
where action_code like 'SUPPLIER_BANK.%' or action_code like 'PAYMENT_EXECUTION.%' or action_code like 'RECONCILIATION.%'
on conflict do nothing;

alter table public.supplier_bank_details add column is_active boolean not null default true;
alter table public.supplier_bank_details add column proposal_idempotency_key text unique;
alter table public.supplier_bank_details add column superseded_at timestamptz;
alter table public.supplier_bank_details add column superseded_by_bank_detail_id uuid references public.supplier_bank_details(supplier_bank_detail_id) on delete restrict;

create table public.supplier_bank_detail_events(
 event_id uuid primary key default gen_random_uuid(), supplier_bank_detail_id uuid not null references public.supplier_bank_details on delete restrict,
 event_type text not null check(event_type in('PROPOSED','VERIFIED','REJECTED','SUPERSEDED')),
 actor_user_id uuid references auth.users(id), approval_id uuid references public.portal_action_approvals on delete restrict,
 detail jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now()
);

create table public.payment_executions(
 payment_execution_id uuid primary key default gen_random_uuid(), execution_number bigint generated always as identity unique,
 execution_date date not null, amount numeric(14,2) not null check(amount>0), currency text not null default 'ILS' check(currency='ILS'),
 bank_reference text not null, evidence_document_id uuid references public.payment_request_documents on delete restrict,
 idempotency_key text not null unique, note text, recorded_at timestamptz not null default now(), recorded_by_user_id uuid references auth.users(id)
);

create table public.payment_execution_allocations(
 payment_execution_allocation_id uuid primary key default gen_random_uuid(), payment_execution_id uuid not null references public.payment_executions on delete restrict,
 payment_request_id uuid not null references public.payment_requests on delete restrict, amount numeric(14,2) not null check(amount>0),
 created_at timestamptz not null default now(), created_by_user_id uuid references auth.users(id),
 unique(payment_execution_id,payment_request_id)
);

create table public.reconciliation_confirmations(
 reconciliation_confirmation_id uuid primary key default gen_random_uuid(), idempotency_key text not null unique,
 confirmation_type text not null check(confirmation_type in('INDIVIDUAL','BULK')),
 note text, confirmed_at timestamptz not null default now(), confirmed_by_user_id uuid references auth.users(id)
);

create table public.payment_bank_reconciliations(
 payment_bank_reconciliation_id uuid primary key default gen_random_uuid(), reconciliation_confirmation_id uuid not null references public.reconciliation_confirmations on delete restrict,
 payment_request_id uuid not null references public.payment_requests on delete restrict,
 payment_execution_id uuid references public.payment_executions on delete restrict,
 bank_transaction_id uuid not null references public.bank_transactions on delete restrict,
 amount numeric(14,2) not null check(amount>0), created_at timestamptz not null default now(), created_by_user_id uuid references auth.users(id),
 unique(reconciliation_confirmation_id,payment_request_id,payment_execution_id,bank_transaction_id)
);

create table public.reconciliation_match_suggestions(
 reconciliation_match_suggestion_id uuid primary key default gen_random_uuid(), payment_request_id uuid not null references public.payment_requests on delete restrict,
 payment_execution_id uuid references public.payment_executions on delete restrict, bank_transaction_id uuid not null references public.bank_transactions on delete restrict,
 suggested_amount numeric(14,2) not null check(suggested_amount>0), match_rule text not null check(match_rule in('EXACT_REFERENCE_AMOUNT','EXACT_EXECUTION_REFERENCE_AMOUNT')),
 status text not null default 'SUGGESTED' check(status in('SUGGESTED','ACCEPTED','DISMISSED','STALE')),
 explanation jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(payment_request_id,payment_execution_id,bank_transaction_id,match_rule)
);

create table public.financial_reconciliation_jobs(
 financial_reconciliation_job_id uuid primary key default gen_random_uuid(), job_type text not null check(job_type in('STATEMENT_IMPORT','MATCH_SUGGESTIONS')),
 idempotency_key text not null, status text not null default 'QUEUED' check(status in('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED')),
 payload jsonb not null, result jsonb, attempt_count integer not null default 0 check(attempt_count between 0 and 5),
 last_error text, requested_at timestamptz not null default now(), requested_by_user_id uuid references auth.users(id),
 started_at timestamptz, completed_at timestamptz, unique(job_type,idempotency_key)
);
create index financial_reconciliation_jobs_queue_idx on public.financial_reconciliation_jobs(status,requested_at) where status='QUEUED';
create index payment_execution_allocations_request_idx on public.payment_execution_allocations(payment_request_id);
create index payment_bank_reconciliations_request_idx on public.payment_bank_reconciliations(payment_request_id);
create index payment_bank_reconciliations_bank_idx on public.payment_bank_reconciliations(bank_transaction_id);

alter table public.supplier_bank_detail_events enable row level security;
alter table public.payment_executions enable row level security;
alter table public.payment_execution_allocations enable row level security;
alter table public.reconciliation_confirmations enable row level security;
alter table public.payment_bank_reconciliations enable row level security;
alter table public.reconciliation_match_suggestions enable row level security;
alter table public.financial_reconciliation_jobs enable row level security;
revoke all on public.supplier_bank_detail_events,public.payment_executions,public.payment_execution_allocations,public.reconciliation_confirmations,public.payment_bank_reconciliations,public.reconciliation_match_suggestions,public.financial_reconciliation_jobs from public,anon,authenticated;

create or replace function public.portal_mcp_propose_supplier_bank_detail(p_supplier_id uuid,p_bank_detail jsonb,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare b supplier_bank_details%rowtype; existing supplier_bank_details%rowtype;
begin
 perform private.portal_require_action('SUPPLIER_BANK.PROPOSE');
 if nullif(btrim(p_idempotency_key),'') is null then raise exception 'idempotency_key required'; end if;
 select * into existing from supplier_bank_details where proposal_idempotency_key=btrim(p_idempotency_key) limit 1;
 if found then return jsonb_build_object('status','IDEMPOTENT_REPLAY','supplier_bank_detail_id',existing.supplier_bank_detail_id,'row_version',existing.row_version,'verified',true); end if;
 if not exists(select 1 from suppliers where supplier_id=p_supplier_id and lifecycle_status='ACTIVE') then raise exception 'active supplier required'; end if;
 if nullif(btrim(p_bank_detail->>'bank_code'),'') is null or nullif(btrim(p_bank_detail->>'branch_code'),'') is null or nullif(btrim(p_bank_detail->>'account_number'),'') is null or nullif(btrim(p_bank_detail->>'account_holder'),'') is null then raise exception 'complete bank details required'; end if;
 if exists(select 1 from supplier_bank_details where bank_code=btrim(p_bank_detail->>'bank_code') and branch_code=btrim(p_bank_detail->>'branch_code') and account_number=btrim(p_bank_detail->>'account_number')) then raise exception 'duplicate supplier bank destination'; end if;
 insert into supplier_bank_details(supplier_id,bank_code,branch_code,account_number,account_holder,proposal_idempotency_key,is_primary,is_active,created_by_user_id,updated_by_user_id)
 values(p_supplier_id,btrim(p_bank_detail->>'bank_code'),btrim(p_bank_detail->>'branch_code'),btrim(p_bank_detail->>'account_number'),btrim(p_bank_detail->>'account_holder'),btrim(p_idempotency_key),false,true,auth.uid(),auth.uid()) returning * into b;
 insert into supplier_bank_detail_events(supplier_bank_detail_id,event_type,actor_user_id,detail) values(b.supplier_bank_detail_id,'PROPOSED',auth.uid(),jsonb_build_object('idempotency_key',p_idempotency_key));
 insert into audit_events(entity_type,entity_id,operation,new_values,source_type,actor_user_id) values('supplier_bank_details',b.supplier_bank_detail_id,'MCP_CREATE',to_jsonb(b)-'account_number'||jsonb_build_object('account_last4',right(b.account_number,4)),'MCP',auth.uid());
 return jsonb_build_object('status','PROPOSED','supplier_bank_detail_id',b.supplier_bank_detail_id,'row_version',b.row_version,'verified',true);
end$$;

create or replace function public.portal_mcp_verify_supplier_bank_detail(p_supplier_bank_detail_id uuid,p_decision text,p_expected_row_version int,p_approval_id uuid,p_note text)
returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare b supplier_bank_details%rowtype; old_primary supplier_bank_details%rowtype; payload jsonb;
begin
 perform private.portal_require_action('SUPPLIER_BANK.VERIFY');
 if p_decision not in('VERIFIED','REJECTED') or nullif(btrim(p_note),'') is null then raise exception 'decision and note required'; end if;
 select * into b from supplier_bank_details where supplier_bank_detail_id=p_supplier_bank_detail_id for update;
 if not found then raise exception 'supplier bank detail not found'; end if;
 if b.row_version<>p_expected_row_version or b.verification_status<>'UNVERIFIED' or not b.is_active then raise exception 'supplier bank detail changed; refresh required'; end if;
 payload:=jsonb_build_object('supplier_bank_detail_id',p_supplier_bank_detail_id,'decision',p_decision,'expected_row_version',p_expected_row_version,'note',btrim(p_note));
 perform private.portal_consume_approval(p_approval_id,'SUPPLIER_BANK.VERIFY','SUPPLIER_BANK_DETAIL',p_supplier_bank_detail_id,payload);
 if p_decision='VERIFIED' then
  select * into old_primary from supplier_bank_details where supplier_id=b.supplier_id and is_primary and supplier_bank_detail_id<>b.supplier_bank_detail_id for update;
  if found then
   update supplier_bank_details set is_primary=false,is_active=false,superseded_at=now(),superseded_by_bank_detail_id=b.supplier_bank_detail_id,row_version=row_version+1,updated_at=clock_timestamp(),updated_by_user_id=auth.uid() where supplier_bank_detail_id=old_primary.supplier_bank_detail_id;
   insert into supplier_bank_detail_events(supplier_bank_detail_id,event_type,actor_user_id,approval_id,detail) values(old_primary.supplier_bank_detail_id,'SUPERSEDED',auth.uid(),p_approval_id,jsonb_build_object('replacement_id',b.supplier_bank_detail_id));
  end if;
 end if;
 update supplier_bank_details set verification_status=p_decision,verified_at=case when p_decision='VERIFIED' then now() else null end,verified_by_user_id=auth.uid(),verification_note=btrim(p_note),is_primary=(p_decision='VERIFIED'),is_active=(p_decision='VERIFIED'),row_version=row_version+1,updated_at=clock_timestamp(),updated_by_user_id=auth.uid() where supplier_bank_detail_id=p_supplier_bank_detail_id returning * into b;
 insert into supplier_bank_detail_events(supplier_bank_detail_id,event_type,actor_user_id,approval_id,detail) values(b.supplier_bank_detail_id,p_decision,auth.uid(),p_approval_id,jsonb_build_object('note',p_note));
 insert into portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id,detail) values(auth.uid(),'MCP','SUPPLIER_BANK.VERIFY','SUPPLIER_BANK_DETAIL',b.supplier_bank_detail_id,'SUCCESS',p_approval_id,jsonb_build_object('decision',p_decision));
 return jsonb_build_object('status',p_decision,'supplier_bank_detail_id',b.supplier_bank_detail_id,'row_version',b.row_version,'verified',true);
end$$;

create or replace function public.portal_mcp_record_payment_execution(p_execution jsonb)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare e payment_executions%rowtype; item jsonb; total numeric:=0; r payment_requests%rowtype;
begin
 perform private.portal_require_action('PAYMENT_EXECUTION.RECORD');
 if nullif(btrim(p_execution->>'idempotency_key'),'') is null then raise exception 'idempotency_key required'; end if;
 select * into e from payment_executions where idempotency_key=btrim(p_execution->>'idempotency_key');
 if found then return jsonb_build_object('status','IDEMPOTENT_REPLAY','payment_execution_id',e.payment_execution_id,'verified',true); end if;
 if coalesce((p_execution->>'amount')::numeric,0)<=0 or nullif(btrim(p_execution->>'bank_reference'),'') is null or nullif(p_execution->>'execution_date','') is null then raise exception 'execution date, reference and positive amount required'; end if;
 insert into payment_executions(execution_date,amount,bank_reference,evidence_document_id,idempotency_key,note,recorded_by_user_id)
 values((p_execution->>'execution_date')::date,(p_execution->>'amount')::numeric,btrim(p_execution->>'bank_reference'),nullif(p_execution->>'evidence_document_id','')::uuid,btrim(p_execution->>'idempotency_key'),nullif(btrim(p_execution->>'note'),''),auth.uid()) returning * into e;
 for item in select value from jsonb_array_elements(coalesce(p_execution->'allocations','[]')) loop
  select * into r from payment_requests where payment_request_id=(item->>'payment_request_id')::uuid for update;
  if not found or r.status not in('APPROVED','PAID','VERIFIED') then raise exception 'execution allocation requires approved payment request'; end if;
  if coalesce((item->>'amount')::numeric,0)<=0 then raise exception 'positive execution allocation required'; end if;
  if (select coalesce(sum(amount),0) from payment_execution_allocations where payment_request_id=r.payment_request_id)+(item->>'amount')::numeric>r.amount then raise exception 'payment request execution over-allocation'; end if;
  insert into payment_execution_allocations(payment_execution_id,payment_request_id,amount,created_by_user_id) values(e.payment_execution_id,r.payment_request_id,(item->>'amount')::numeric,auth.uid()); total:=total+(item->>'amount')::numeric;
 end loop;
 if total<>e.amount then raise exception 'execution allocation sum must equal execution amount'; end if;
 insert into audit_events(entity_type,entity_id,operation,new_values,source_type,actor_user_id) values('payment_executions',e.payment_execution_id,'MCP_CREATE',to_jsonb(e),'MCP',auth.uid());
 return jsonb_build_object('status','RECORDED','payment_execution_id',e.payment_execution_id,'execution_number',e.execution_number,'allocated_amount',total,'verified',true);
end$$;

create or replace function public.portal_mcp_confirm_bank_reconciliation(p_matches jsonb,p_idempotency_key text,p_note text default null)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare c reconciliation_confirmations%rowtype; item jsonb; r payment_requests%rowtype; e payment_executions%rowtype; b bank_transactions%rowtype; amount_value numeric; created_count int:=0; existing reconciliation_confirmations%rowtype;
begin
 perform private.portal_require_action('RECONCILIATION.CONFIRM');
 if jsonb_typeof(p_matches)<>'array' or jsonb_array_length(p_matches) not between 1 and 100 or nullif(btrim(p_idempotency_key),'') is null then raise exception '1-100 matches and idempotency_key required'; end if;
 select * into existing from reconciliation_confirmations where idempotency_key=btrim(p_idempotency_key);
 if found then return jsonb_build_object('status','IDEMPOTENT_REPLAY','reconciliation_confirmation_id',existing.reconciliation_confirmation_id,'verified',true); end if;
 insert into reconciliation_confirmations(idempotency_key,confirmation_type,note,confirmed_by_user_id) values(btrim(p_idempotency_key),case when jsonb_array_length(p_matches)=1 then 'INDIVIDUAL' else 'BULK' end,nullif(btrim(p_note),''),auth.uid()) returning * into c;
 for item in select value from jsonb_array_elements(p_matches) loop
  amount_value:=(item->>'amount')::numeric; if coalesce(amount_value,0)<=0 then raise exception 'positive reconciliation amount required'; end if;
  select * into r from payment_requests where payment_request_id=(item->>'payment_request_id')::uuid for update;
  if not found or r.status not in('PAID','VERIFIED') then raise exception 'paid payment request required'; end if;
  select * into b from bank_transactions where bank_transaction_id=(item->>'bank_transaction_id')::uuid for update;
  if not found then raise exception 'bank transaction not found'; end if;
  if abs(b.amount)=0 then raise exception 'non-zero bank transaction required'; end if;
  if nullif(item->>'payment_execution_id','') is not null then
   select * into e from payment_executions where payment_execution_id=(item->>'payment_execution_id')::uuid for update;
   if not found or not exists(select 1 from payment_execution_allocations where payment_execution_id=e.payment_execution_id and payment_request_id=r.payment_request_id) then raise exception 'execution is not allocated to payment request'; end if;
   if (select coalesce(sum(x.amount),0) from payment_bank_reconciliations x where x.payment_execution_id=e.payment_execution_id)+amount_value>e.amount then raise exception 'payment execution reconciliation over-allocation'; end if;
  end if;
  if (select coalesce(sum(x.amount),0) from payment_bank_reconciliations x where x.payment_request_id=r.payment_request_id)+amount_value>r.amount then raise exception 'payment request reconciliation over-allocation'; end if;
  if (select coalesce(sum(x.amount),0) from payment_bank_reconciliations x where x.bank_transaction_id=b.bank_transaction_id)+amount_value>abs(b.amount) then raise exception 'bank transaction double allocation'; end if;
  insert into payment_bank_reconciliations(reconciliation_confirmation_id,payment_request_id,payment_execution_id,bank_transaction_id,amount,created_by_user_id)
  values(c.reconciliation_confirmation_id,r.payment_request_id,nullif(item->>'payment_execution_id','')::uuid,b.bank_transaction_id,amount_value,auth.uid()); created_count:=created_count+1;
  update reconciliation_match_suggestions set status='ACCEPTED',updated_at=now() where payment_request_id=r.payment_request_id and bank_transaction_id=b.bank_transaction_id and status='SUGGESTED';
 end loop;
 insert into audit_events(entity_type,entity_id,operation,new_values,source_type,actor_user_id) values('reconciliation_confirmations',c.reconciliation_confirmation_id,'MCP_CREATE',jsonb_build_object('match_count',created_count,'idempotency_key',c.idempotency_key),'MCP',auth.uid());
 return jsonb_build_object('status','CONFIRMED','reconciliation_confirmation_id',c.reconciliation_confirmation_id,'match_count',created_count,'verified',created_count=jsonb_array_length(p_matches));
end$$;

create or replace function public.portal_mcp_search_reconciliation(p_status text default null,p_limit int default 25,p_offset int default 0)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare rows jsonb; total bigint;
begin
 perform private.portal_require_action('RECONCILIATION.READ'); if p_limit not between 1 and 100 or p_offset<0 then raise exception 'invalid pagination'; end if;
 select count(*) into total from payment_requests r where p_status is null or r.status=p_status;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows from (
  select r.payment_request_id,r.request_number,r.status,r.amount,
   coalesce((select sum(a.amount) from payment_execution_allocations a where a.payment_request_id=r.payment_request_id),0) executed_amount,
   coalesce((select sum(z.amount) from payment_bank_reconciliations z where z.payment_request_id=r.payment_request_id),0) reconciled_amount,
   r.amount-coalesce((select sum(z.amount) from payment_bank_reconciliations z where z.payment_request_id=r.payment_request_id),0) remaining_amount
  from payment_requests r where p_status is null or r.status=p_status order by r.created_at desc limit p_limit offset p_offset
 )x;
 return jsonb_build_object('total',total,'rows',rows,'limit',p_limit,'offset',p_offset,'verified_at',now());
end$$;

create or replace function public.portal_mcp_enqueue_financial_job(p_job_type text,p_payload jsonb,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare j financial_reconciliation_jobs%rowtype; action_code text;
begin
 if p_job_type not in('STATEMENT_IMPORT','MATCH_SUGGESTIONS') or nullif(btrim(p_idempotency_key),'') is null then raise exception 'valid job type and idempotency_key required'; end if;
 action_code:=case p_job_type when 'STATEMENT_IMPORT' then 'RECONCILIATION.IMPORT' else 'RECONCILIATION.SUGGEST' end; perform private.portal_require_action(action_code);
 if p_job_type='STATEMENT_IMPORT' and (jsonb_typeof(p_payload->'rows')<>'array' or jsonb_array_length(p_payload->'rows') not between 1 and 5000 or nullif(p_payload->>'bank_account_id','') is null) then raise exception 'statement import requires bank account and 1-5000 rows'; end if;
 insert into financial_reconciliation_jobs(job_type,idempotency_key,payload,requested_by_user_id) values(p_job_type,btrim(p_idempotency_key),p_payload,auth.uid())
 on conflict(job_type,idempotency_key) do nothing returning * into j;
 if not found then select * into j from financial_reconciliation_jobs where job_type=p_job_type and idempotency_key=btrim(p_idempotency_key); return jsonb_build_object('status','IDEMPOTENT_REPLAY','job_id',j.financial_reconciliation_job_id,'job_status',j.status,'verified',true); end if;
 return jsonb_build_object('status','QUEUED','job_id',j.financial_reconciliation_job_id,'job_status',j.status,'verified',true);
end$$;

create or replace function public.portal_mcp_get_financial_job(p_job_id uuid)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare j financial_reconciliation_jobs%rowtype;
begin perform private.portal_require_action('RECONCILIATION.READ'); select * into j from financial_reconciliation_jobs where financial_reconciliation_job_id=p_job_id; if not found then raise exception 'financial job not found'; end if;
 return jsonb_build_object('job_id',j.financial_reconciliation_job_id,'job_type',j.job_type,'status',j.status,'attempt_count',j.attempt_count,'result',j.result,'last_error',j.last_error,'requested_at',j.requested_at,'started_at',j.started_at,'completed_at',j.completed_at); end$$;

create or replace function private.portal_process_financial_job(p_job_id uuid) returns void language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare j financial_reconciliation_jobs%rowtype; row_data jsonb; batch_id uuid; accepted int:=0; duplicates int:=0; rejected int:=0; fingerprint text; tx_date date; tx_amount numeric; request_row payment_requests%rowtype; execution_row payment_executions%rowtype; candidate record;
begin
 select * into j from financial_reconciliation_jobs where financial_reconciliation_job_id=p_job_id and status='QUEUED' for update skip locked; if not found then return; end if;
 update financial_reconciliation_jobs set status='RUNNING',started_at=now(),attempt_count=attempt_count+1,last_error=null where financial_reconciliation_job_id=p_job_id;
 if j.job_type='STATEMENT_IMPORT' then
  if not exists(select 1 from bank_accounts where bank_account_id=(j.payload->>'bank_account_id')::uuid and lifecycle_status='ACTIVE') then raise exception 'active bank account required'; end if;
  insert into import_batches(source_type,source_name,source_file_name,triggered_by_user_id,status,total_rows,metadata)
  values('BANK_FILE',coalesce(nullif(j.payload->>'source_name',''),'TRACK114_ASYNC'),nullif(j.payload->>'source_file_name',''),j.requested_by_user_id,'RUNNING',jsonb_array_length(j.payload->'rows'),jsonb_build_object('financial_job_id',j.financial_reconciliation_job_id)) returning import_batch_id into batch_id;
  for row_data in select value from jsonb_array_elements(j.payload->'rows') loop
   begin
    tx_date:=(row_data->>'transaction_date')::date; tx_amount:=(row_data->>'amount')::numeric;
    if tx_amount=0 or nullif(btrim(row_data->>'description'),'') is null then raise exception 'date, description and non-zero amount required'; end if;
    fingerprint:=coalesce(nullif(btrim(row_data->>'source_fingerprint'),''),encode(digest(concat_ws('|',j.payload->>'bank_account_id',tx_date::text,btrim(row_data->>'description'),coalesce(btrim(row_data->>'reference_number'),''),tx_amount::text),'sha256'),'hex'));
    insert into bank_transactions(bank_account_id,transaction_date,description,reference_number,amount,debit_amount,credit_amount,source_fingerprint,source_payload,import_batch_id,created_by_user_id,updated_by_user_id)
    values((j.payload->>'bank_account_id')::uuid,tx_date,btrim(row_data->>'description'),nullif(btrim(row_data->>'reference_number'),''),tx_amount,case when tx_amount<0 then abs(tx_amount) else 0 end,case when tx_amount>0 then tx_amount else 0 end,fingerprint,row_data,batch_id,j.requested_by_user_id,j.requested_by_user_id)
    on conflict(bank_account_id,source_fingerprint) do nothing;
    if found then accepted:=accepted+1; else duplicates:=duplicates+1; end if;
   exception when others then rejected:=rejected+1; end;
  end loop;
  update import_batches set status=case when rejected=0 then 'COMPLETED' else 'COMPLETED_WITH_ERRORS' end,completed_at=now(),accepted_rows=accepted,warning_rows=duplicates,rejected_rows=rejected,error_summary=case when rejected>0 then rejected||' rows rejected' end,updated_at=now() where import_batch_id=batch_id;
  update financial_reconciliation_jobs set status='COMPLETED',completed_at=now(),result=jsonb_build_object('import_batch_id',batch_id,'accepted_rows',accepted,'duplicate_rows',duplicates,'rejected_rows',rejected) where financial_reconciliation_job_id=p_job_id;
 else
  for request_row in select * from payment_requests where status in('PAID','VERIFIED') loop
   for execution_row in select e.* from payment_executions e join payment_execution_allocations a using(payment_execution_id) where a.payment_request_id=request_row.payment_request_id loop
    for candidate in select t.* from bank_transactions t where abs(t.amount)=execution_row.amount and nullif(btrim(t.reference_number),'')=execution_row.bank_reference and not exists(select 1 from payment_bank_reconciliations z where z.bank_transaction_id=t.bank_transaction_id) loop
     insert into reconciliation_match_suggestions(payment_request_id,payment_execution_id,bank_transaction_id,suggested_amount,match_rule,explanation)
     values(request_row.payment_request_id,execution_row.payment_execution_id,candidate.bank_transaction_id,least(request_row.amount,execution_row.amount,abs(candidate.amount)),'EXACT_EXECUTION_REFERENCE_AMOUNT',jsonb_build_object('reference',execution_row.bank_reference,'amount',execution_row.amount)) on conflict do nothing;
     if found then accepted:=accepted+1; end if;
    end loop;
   end loop;
  end loop;
  update financial_reconciliation_jobs set status='COMPLETED',completed_at=now(),result=jsonb_build_object('suggestions_created',accepted,'auto_confirmed',0) where financial_reconciliation_job_id=p_job_id;
 end if;
exception when others then update financial_reconciliation_jobs set attempt_count=attempt_count+1,status=case when attempt_count+1>=5 then 'FAILED' else 'QUEUED' end,last_error=left(sqlerrm,1000),completed_at=case when attempt_count+1>=5 then now() else null end where financial_reconciliation_job_id=p_job_id;
end$$;

create or replace function private.portal_process_financial_jobs(p_limit int default 5) returns integer language plpgsql security definer set search_path=public,private,pg_temp as $$
declare job_id uuid; processed int:=0;
begin for job_id in select financial_reconciliation_job_id from financial_reconciliation_jobs where status='QUEUED' order by requested_at limit greatest(1,least(p_limit,20)) loop perform private.portal_process_financial_job(job_id); processed:=processed+1; end loop; return processed; end$$;

-- Existing PAY transition remains compatible but now requires separately recorded execution evidence.
create or replace function public.portal_mcp_transition_payment_request(p_payment_request_id uuid,p_target_status text,p_expected_row_version int,p_approval_id uuid default null,p_detail jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare r payment_requests%rowtype; action_code text; payload jsonb; old_status text; execution_id uuid;
begin select * into r from payment_requests where payment_request_id=p_payment_request_id for update; if not found then raise exception 'payment request not found'; end if;
 if r.row_version<>p_expected_row_version then raise exception 'payment request changed; refresh required'; end if; old_status:=r.status;
 if (r.status,p_target_status) not in (('DRAFT','PENDING'),('PENDING','APPROVED'),('APPROVED','PAID'),('PAID','VERIFIED'),('DRAFT','CANCELLED'),('PENDING','CANCELLED'),('APPROVED','CANCELLED')) then raise exception 'invalid payment lifecycle transition'; end if;
 action_code:=case p_target_status when 'PENDING' then 'PAYMENT_REQUEST.SUBMIT' when 'APPROVED' then 'PAYMENT_REQUEST.APPROVE' when 'PAID' then 'PAYMENT_REQUEST.PAY' when 'VERIFIED' then 'PAYMENT_REQUEST.VERIFY' else 'PAYMENT_REQUEST.CANCEL' end;
 perform private.portal_require_action(action_code); payload:=jsonb_build_object('payment_request_id',p_payment_request_id,'target_status',p_target_status,'expected_row_version',p_expected_row_version,'detail',coalesce(p_detail,'{}'));
 if p_target_status in('APPROVED','PAID','VERIFIED','CANCELLED') then perform private.portal_consume_approval(p_approval_id,action_code,'PAYMENT_REQUEST',p_payment_request_id,payload); end if;
 if p_target_status='PENDING' and (not exists(select 1 from payment_request_documents where payment_request_id=r.payment_request_id and document_type='INVOICE') or not exists(select 1 from supplier_bank_details where supplier_bank_detail_id=r.supplier_bank_detail_id and verification_status='VERIFIED' and is_active)) then raise exception 'active verified bank details and invoice required before submit'; end if;
 if p_target_status='PAID' then execution_id:=nullif(p_detail->>'payment_execution_id','')::uuid; if execution_id is null or not exists(select 1 from payment_execution_allocations where payment_execution_id=execution_id and payment_request_id=r.payment_request_id) then raise exception 'separate payment execution evidence required'; end if; end if;
 if p_target_status='VERIFIED' and (select coalesce(sum(amount),0) from payment_bank_reconciliations where payment_request_id=r.payment_request_id)<>r.amount then raise exception 'full bank reconciliation required before verification'; end if;
 update payment_requests set status=p_target_status,row_version=row_version+1,updated_at=clock_timestamp(),updated_by_user_id=auth.uid(),paid_at=case when p_target_status='PAID' then now() else paid_at end,payment_reference=case when p_target_status='PAID' then nullif(btrim(p_detail->>'payment_reference'),'') else payment_reference end,verified_at=case when p_target_status='VERIFIED' then now() else verified_at end,cancelled_at=case when p_target_status='CANCELLED' then now() else cancelled_at end where payment_request_id=p_payment_request_id returning * into r;
 insert into payment_request_events(payment_request_id,from_status,to_status,event_type,actor_user_id,approval_id,detail) values(r.payment_request_id,old_status,p_target_status,action_code,auth.uid(),p_approval_id,coalesce(p_detail,'{}'));
 insert into portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id,detail) values(auth.uid(),'MCP',action_code,'PAYMENT_REQUEST',r.payment_request_id,'SUCCESS',p_approval_id,p_detail);
 return jsonb_build_object('status',r.status,'payment_request_id',r.payment_request_id,'row_version',r.row_version,'verified',true); end$$;

revoke all on function public.portal_mcp_propose_supplier_bank_detail(uuid,jsonb,text),public.portal_mcp_verify_supplier_bank_detail(uuid,text,int,uuid,text),public.portal_mcp_record_payment_execution(jsonb),public.portal_mcp_confirm_bank_reconciliation(jsonb,text,text),public.portal_mcp_search_reconciliation(text,int,int),public.portal_mcp_enqueue_financial_job(text,jsonb,text),public.portal_mcp_get_financial_job(uuid) from public,anon;
grant execute on function public.portal_mcp_propose_supplier_bank_detail(uuid,jsonb,text),public.portal_mcp_verify_supplier_bank_detail(uuid,text,int,uuid,text),public.portal_mcp_record_payment_execution(jsonb),public.portal_mcp_confirm_bank_reconciliation(jsonb,text,text),public.portal_mcp_search_reconciliation(text,int,int),public.portal_mcp_enqueue_financial_job(text,jsonb,text),public.portal_mcp_get_financial_job(uuid) to authenticated;
revoke all on function private.portal_process_financial_job(uuid),private.portal_process_financial_jobs(int) from public,anon,authenticated;

select cron.schedule('portal-financial-reconciliation-jobs','* * * * *','select private.portal_process_financial_jobs(5)');
