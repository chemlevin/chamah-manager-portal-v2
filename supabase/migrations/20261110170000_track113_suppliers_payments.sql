-- TRACK113: canonical Director-only suppliers and payment requests.
-- Additive only: legacy bank_transfers and banking data remain unchanged.

insert into public.portal_actions(action_code,display_name,resource_type,action_kind,requires_approval) values
 ('SUPPLIER.READ','קריאת ספקים','SUPPLIER','READ',false),
 ('SUPPLIER.CREATE','יצירת ספק','SUPPLIER','CREATE',false),
 ('SUPPLIER.UPDATE','עדכון ספק','SUPPLIER','UPDATE',false),
 ('SUPPLIER.IMPORT','ייבוא ספקים','SUPPLIER_IMPORT','BULK',false),
 ('PAYMENT_REQUEST.READ','קריאת בקשות תשלום','PAYMENT_REQUEST','READ',false),
 ('PAYMENT_REQUEST.CREATE','יצירת בקשת תשלום','PAYMENT_REQUEST','CREATE',false),
 ('PAYMENT_REQUEST.UPDATE','עדכון בקשת תשלום','PAYMENT_REQUEST','UPDATE',false),
 ('PAYMENT_REQUEST.IMPORT','ייבוא בקשות תשלום','PAYMENT_REQUEST_IMPORT','BULK',false),
 ('PAYMENT_REQUEST.SUBMIT','הגשת בקשת תשלום','PAYMENT_REQUEST','UPDATE',false),
 ('PAYMENT_REQUEST.APPROVE','אישור בקשת תשלום','PAYMENT_REQUEST','UPDATE',true),
 ('PAYMENT_REQUEST.PAY','סימון בקשה כשולמה','PAYMENT_REQUEST','UPDATE',true),
 ('PAYMENT_REQUEST.VERIFY','אימות תשלום','PAYMENT_REQUEST','UPDATE',true),
 ('PAYMENT_REQUEST.CANCEL','ביטול בקשת תשלום','PAYMENT_REQUEST','DELETE',true),
 ('PAYMENT_REQUEST.FILE_UPLOAD','העלאת מסמך תשלום','PAYMENT_DOCUMENT','FILE_UPLOAD',false)
on conflict(action_code) do update set display_name=excluded.display_name,resource_type=excluded.resource_type,action_kind=excluded.action_kind,requires_approval=excluded.requires_approval,is_active=true;
insert into public.portal_role_actions(role_code,action_code)
select 'DIRECTOR',action_code from public.portal_actions where action_code like 'SUPPLIER.%' or action_code like 'PAYMENT_REQUEST.%' on conflict do nothing;

create table public.suppliers(
 supplier_id uuid primary key default gen_random_uuid(), supplier_code text not null unique,
 legal_name text not null, display_name text not null, registration_number text,
 email text, phone text, notes text, lifecycle_status text not null default 'ACTIVE' check(lifecycle_status in('ACTIVE','INACTIVE','ARCHIVED')),
 legacy_reference text, created_at timestamptz not null default now(), created_by_user_id uuid references auth.users(id),
 updated_at timestamptz not null default now(), updated_by_user_id uuid references auth.users(id), row_version integer not null default 1 check(row_version>0)
);
create unique index suppliers_registration_unique on public.suppliers(registration_number) where registration_number is not null;
create table public.supplier_bank_details(
 supplier_bank_detail_id uuid primary key default gen_random_uuid(), supplier_id uuid not null references public.suppliers on delete restrict,
 bank_code text not null, branch_code text not null, account_number text not null, account_holder text not null,
 verification_status text not null default 'UNVERIFIED' check(verification_status in('UNVERIFIED','VERIFIED','REJECTED')),
 verified_at timestamptz, verified_by_user_id uuid references auth.users(id), verification_note text,
 is_primary boolean not null default true, created_at timestamptz not null default now(), created_by_user_id uuid references auth.users(id),
 updated_at timestamptz not null default now(), updated_by_user_id uuid references auth.users(id), row_version integer not null default 1
);
create unique index supplier_bank_unique on public.supplier_bank_details(bank_code,branch_code,account_number);
create unique index supplier_one_primary_bank on public.supplier_bank_details(supplier_id) where is_primary;

create table public.payment_requests(
 payment_request_id uuid primary key default gen_random_uuid(), request_number bigint generated always as identity unique,
 supplier_id uuid not null references public.suppliers on delete restrict, supplier_bank_detail_id uuid references public.supplier_bank_details on delete restrict,
 invoice_number text, invoice_date date, requested_payment_date date, amount numeric(14,2) not null check(amount>0), currency text not null default 'ILS' check(currency='ILS'),
 status text not null default 'DRAFT' check(status in('DRAFT','PENDING','APPROVED','PAID','VERIFIED','CANCELLED')),
 description text not null, idempotency_key text not null unique, legacy_bank_transfer_id uuid references public.bank_transfers(bank_transfer_id) on delete restrict,
 paid_at timestamptz, payment_reference text, verified_at timestamptz, cancelled_at timestamptz,
 created_at timestamptz not null default now(), created_by_user_id uuid references auth.users(id), updated_at timestamptz not null default now(), updated_by_user_id uuid references auth.users(id), row_version integer not null default 1
);
create table public.payment_request_allocations(
 payment_request_allocation_id uuid primary key default gen_random_uuid(), payment_request_id uuid not null references public.payment_requests on delete restrict,
 daycare_id uuid not null references public.daycares on delete restrict, amount numeric(14,2) not null check(amount>0), business_month date,
 budget_category_id uuid references public.budget_categories on delete restrict, notes text, created_at timestamptz not null default now(), created_by_user_id uuid references auth.users(id)
);
create table public.payment_request_documents(
 payment_request_document_id uuid primary key default gen_random_uuid(), payment_request_id uuid not null references public.payment_requests on delete restrict,
 document_type text not null check(document_type in('INVOICE','RECEIPT','BANK_CONFIRMATION','OTHER')), object_path text not null unique,
 original_filename text not null, content_type text not null, size_bytes bigint not null check(size_bytes>0 and size_bytes<=10485760), sha256 text,
 created_at timestamptz not null default now(), created_by_user_id uuid references auth.users(id)
);
create table public.payment_request_events(
 event_id uuid primary key default gen_random_uuid(), payment_request_id uuid not null references public.payment_requests on delete restrict,
 from_status text, to_status text not null, event_type text not null, actor_user_id uuid references auth.users(id), approval_id uuid references public.portal_action_approvals on delete restrict,
 detail jsonb not null default '{}'::jsonb, occurred_at timestamptz not null default now()
);
alter table public.suppliers enable row level security; alter table public.supplier_bank_details enable row level security;
alter table public.payment_requests enable row level security; alter table public.payment_request_allocations enable row level security;
alter table public.payment_request_documents enable row level security; alter table public.payment_request_events enable row level security;
revoke all on public.suppliers,public.supplier_bank_details,public.payment_requests,public.payment_request_allocations,public.payment_request_documents,public.payment_request_events from public,anon,authenticated;

create or replace function public.portal_mcp_find_supplier_duplicates(p_supplier jsonb) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare matches jsonb;
begin perform private.portal_require_action('SUPPLIER.READ');
 select coalesce(jsonb_agg(jsonb_build_object('supplier_id',supplier_id,'supplier_code',supplier_code,'display_name',display_name,'registration_number',registration_number)),'[]') into matches
 from suppliers where supplier_code=nullif(btrim(p_supplier->>'supplier_code'),'') or (nullif(btrim(p_supplier->>'registration_number'),'') is not null and registration_number=nullif(btrim(p_supplier->>'registration_number'),''))
 or (nullif(btrim(p_supplier->>'display_name'),'') is not null and lower(display_name)=lower(btrim(p_supplier->>'display_name')));
 return jsonb_build_object('duplicate_count',jsonb_array_length(matches),'matches',matches,'verified_at',now()); end$$;

create or replace function public.portal_mcp_create_supplier(p_supplier jsonb) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare s suppliers%rowtype; b supplier_bank_details%rowtype; bank jsonb:=p_supplier->'bank_details';
begin perform private.portal_require_action('SUPPLIER.CREATE');
 if nullif(btrim(p_supplier->>'supplier_code'),'') is null or nullif(btrim(p_supplier->>'legal_name'),'') is null then raise exception 'supplier_code and legal_name required'; end if;
 if exists(select 1 from suppliers where supplier_code=btrim(p_supplier->>'supplier_code') or (p_supplier->>'registration_number' is not null and registration_number=btrim(p_supplier->>'registration_number'))) then raise exception 'duplicate supplier identity'; end if;
 insert into suppliers(supplier_code,legal_name,display_name,registration_number,email,phone,notes,legacy_reference,created_by_user_id,updated_by_user_id)
 values(btrim(p_supplier->>'supplier_code'),btrim(p_supplier->>'legal_name'),coalesce(nullif(btrim(p_supplier->>'display_name'),''),btrim(p_supplier->>'legal_name')),nullif(btrim(p_supplier->>'registration_number'),''),nullif(btrim(p_supplier->>'email'),''),nullif(btrim(p_supplier->>'phone'),''),nullif(btrim(p_supplier->>'notes'),''),nullif(btrim(p_supplier->>'legacy_reference'),''),auth.uid(),auth.uid()) returning * into s;
 if bank is not null then
  if nullif(btrim(bank->>'bank_code'),'') is null or nullif(btrim(bank->>'branch_code'),'') is null or nullif(btrim(bank->>'account_number'),'') is null then raise exception 'complete bank details required'; end if;
  insert into supplier_bank_details(supplier_id,bank_code,branch_code,account_number,account_holder,created_by_user_id,updated_by_user_id)
  values(s.supplier_id,btrim(bank->>'bank_code'),btrim(bank->>'branch_code'),btrim(bank->>'account_number'),coalesce(nullif(btrim(bank->>'account_holder'),''),s.legal_name),auth.uid(),auth.uid()) returning * into b;
 end if;
 insert into audit_events(entity_type,entity_id,operation,new_values,source_type,actor_user_id) values('suppliers',s.supplier_id,'MCP_CREATE',to_jsonb(s),'MCP',auth.uid());
 return jsonb_build_object('status','CREATED','supplier_id',s.supplier_id,'bank_detail_id',b.supplier_bank_detail_id,'row_version',s.row_version,'verified',exists(select 1 from suppliers where supplier_id=s.supplier_id)); end$$;

create or replace function public.portal_mcp_search_suppliers(p_search text default null,p_limit int default 25,p_offset int default 0) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare rows jsonb; total bigint; q text:=nullif(btrim(p_search),'');
begin perform private.portal_require_action('SUPPLIER.READ'); if p_limit not between 1 and 100 then raise exception 'invalid limit'; end if;
 select count(*) into total from suppliers s where q is null or concat_ws(' ',s.supplier_code,s.legal_name,s.display_name,s.registration_number) ilike '%'||q||'%';
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows from (select s.supplier_id,s.supplier_code,s.legal_name,s.display_name,s.registration_number,s.lifecycle_status,s.row_version,s.updated_at,
  b.supplier_bank_detail_id,b.verification_status,right(b.account_number,4) account_last4 from suppliers s left join supplier_bank_details b on b.supplier_id=s.supplier_id and b.is_primary
  where q is null or concat_ws(' ',s.supplier_code,s.legal_name,s.display_name,s.registration_number) ilike '%'||q||'%' order by s.display_name limit p_limit offset p_offset)x;
 return jsonb_build_object('total',total,'rows',rows,'limit',p_limit,'offset',p_offset,'verified_at',now()); end$$;

create or replace function public.portal_mcp_create_payment_request(p_request jsonb) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare r payment_requests%rowtype; a jsonb; allocation_sum numeric:=0;
begin perform private.portal_require_action('PAYMENT_REQUEST.CREATE');
 if coalesce((p_request->>'amount')::numeric,0)<=0 or nullif(btrim(p_request->>'idempotency_key'),'') is null then raise exception 'positive amount and idempotency_key required'; end if;
 if exists(select 1 from payment_requests where idempotency_key=p_request->>'idempotency_key') then select * into r from payment_requests where idempotency_key=p_request->>'idempotency_key'; return jsonb_build_object('status','IDEMPOTENT_REPLAY','payment_request_id',r.payment_request_id,'row_version',r.row_version,'verified',true); end if;
 if not exists(select 1 from suppliers where supplier_id=(p_request->>'supplier_id')::uuid and lifecycle_status='ACTIVE') then raise exception 'active supplier required'; end if;
 insert into payment_requests(supplier_id,supplier_bank_detail_id,invoice_number,invoice_date,requested_payment_date,amount,description,idempotency_key,created_by_user_id,updated_by_user_id)
 values((p_request->>'supplier_id')::uuid,nullif(p_request->>'supplier_bank_detail_id','')::uuid,nullif(btrim(p_request->>'invoice_number'),''),nullif(p_request->>'invoice_date','')::date,nullif(p_request->>'requested_payment_date','')::date,(p_request->>'amount')::numeric,btrim(p_request->>'description'),btrim(p_request->>'idempotency_key'),auth.uid(),auth.uid()) returning * into r;
 for a in select value from jsonb_array_elements(coalesce(p_request->'allocations','[]')) loop
  insert into payment_request_allocations(payment_request_id,daycare_id,amount,business_month,budget_category_id,notes,created_by_user_id) values(r.payment_request_id,(a->>'daycare_id')::uuid,(a->>'amount')::numeric,nullif(a->>'business_month','')::date,nullif(a->>'budget_category_id','')::uuid,nullif(btrim(a->>'notes'),''),auth.uid()); allocation_sum:=allocation_sum+(a->>'amount')::numeric;
 end loop;
 if allocation_sum<>r.amount then raise exception 'allocation sum must equal request amount'; end if;
 insert into payment_request_events(payment_request_id,to_status,event_type,actor_user_id) values(r.payment_request_id,'DRAFT','CREATED',auth.uid());
 insert into audit_events(entity_type,entity_id,operation,new_values,source_type,actor_user_id) values('payment_requests',r.payment_request_id,'MCP_CREATE',to_jsonb(r),'MCP',auth.uid());
 return jsonb_build_object('status','CREATED','payment_request_id',r.payment_request_id,'request_number',r.request_number,'row_version',r.row_version,'verified',exists(select 1 from payment_requests where payment_request_id=r.payment_request_id)); end$$;

create or replace function public.portal_mcp_search_payment_requests(p_search text default null,p_status text default null,p_limit int default 25,p_offset int default 0) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare rows jsonb; total bigint; q text:=nullif(btrim(p_search),'');
begin perform private.portal_require_action('PAYMENT_REQUEST.READ');
 select count(*) into total from payment_requests r join suppliers s using(supplier_id) where (p_status is null or r.status=p_status) and (q is null or concat_ws(' ',r.request_number,r.invoice_number,r.description,s.display_name) ilike '%'||q||'%');
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows from (select r.payment_request_id,r.request_number,r.amount,r.currency,r.status,r.invoice_number,r.requested_payment_date,r.row_version,r.updated_at,s.supplier_id,s.display_name supplier_name
 from payment_requests r join suppliers s using(supplier_id) where (p_status is null or r.status=p_status) and (q is null or concat_ws(' ',r.request_number,r.invoice_number,r.description,s.display_name) ilike '%'||q||'%') order by r.created_at desc limit p_limit offset p_offset)x;
 return jsonb_build_object('total',total,'rows',rows,'verified_at',now()); end$$;

create or replace function public.portal_mcp_transition_payment_request(p_payment_request_id uuid,p_target_status text,p_expected_row_version int,p_approval_id uuid default null,p_detail jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare r payment_requests%rowtype; action_code text; payload jsonb; old_status text;
begin select * into r from payment_requests where payment_request_id=p_payment_request_id for update; if not found then raise exception 'payment request not found'; end if;
 if r.row_version<>p_expected_row_version then raise exception 'payment request changed; refresh required'; end if; old_status:=r.status;
 if (r.status,p_target_status) not in (('DRAFT','PENDING'),('PENDING','APPROVED'),('APPROVED','PAID'),('PAID','VERIFIED'),('DRAFT','CANCELLED'),('PENDING','CANCELLED'),('APPROVED','CANCELLED')) then raise exception 'invalid payment lifecycle transition'; end if;
 action_code:=case p_target_status when 'PENDING' then 'PAYMENT_REQUEST.SUBMIT' when 'APPROVED' then 'PAYMENT_REQUEST.APPROVE' when 'PAID' then 'PAYMENT_REQUEST.PAY' when 'VERIFIED' then 'PAYMENT_REQUEST.VERIFY' else 'PAYMENT_REQUEST.CANCEL' end;
 perform private.portal_require_action(action_code); payload:=jsonb_build_object('payment_request_id',p_payment_request_id,'target_status',p_target_status,'expected_row_version',p_expected_row_version,'detail',coalesce(p_detail,'{}'));
 if p_target_status in('APPROVED','PAID','VERIFIED','CANCELLED') then perform private.portal_consume_approval(p_approval_id,action_code,'PAYMENT_REQUEST',p_payment_request_id,payload); end if;
 if p_target_status='PENDING' and (not exists(select 1 from payment_request_documents where payment_request_id=r.payment_request_id and document_type='INVOICE') or not exists(select 1 from supplier_bank_details where supplier_bank_detail_id=r.supplier_bank_detail_id and verification_status='VERIFIED')) then raise exception 'verified bank details and invoice required before submit'; end if;
 update payment_requests set status=p_target_status,row_version=row_version+1,updated_at=clock_timestamp(),updated_by_user_id=auth.uid(),paid_at=case when p_target_status='PAID' then now() else paid_at end,payment_reference=case when p_target_status='PAID' then nullif(btrim(p_detail->>'payment_reference'),'') else payment_reference end,verified_at=case when p_target_status='VERIFIED' then now() else verified_at end,cancelled_at=case when p_target_status='CANCELLED' then now() else cancelled_at end where payment_request_id=p_payment_request_id returning * into r;
 insert into payment_request_events(payment_request_id,from_status,to_status,event_type,actor_user_id,approval_id,detail) values(r.payment_request_id,old_status,p_target_status,action_code,auth.uid(),p_approval_id,coalesce(p_detail,'{}'));
 insert into portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,approval_id,detail) values(auth.uid(),'MCP',action_code,'PAYMENT_REQUEST',r.payment_request_id,'SUCCESS',p_approval_id,p_detail);
 return jsonb_build_object('status',r.status,'payment_request_id',r.payment_request_id,'row_version',r.row_version,'verified',exists(select 1 from payment_requests where payment_request_id=r.payment_request_id and row_version=r.row_version)); end$$;

create or replace function public.portal_mcp_analyze_suppliers_payments() returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare result jsonb; begin perform private.portal_require_action('DATA.ANALYZE'); select jsonb_build_object('suppliers',count(*),'active_suppliers',count(*) filter(where lifecycle_status='ACTIVE'),'unverified_bank_details',(select count(*) from supplier_bank_details where verification_status<>'VERIFIED'),'possible_duplicate_names',(select count(*) from (select lower(display_name) from suppliers group by lower(display_name) having count(*)>1)x)) into result from suppliers;
 return result||jsonb_build_object('payment_requests',(select count(*) from payment_requests),'amount_total',(select coalesce(sum(amount),0) from payment_requests where status<>'CANCELLED'),'by_status',(select coalesce(jsonb_object_agg(status,cnt),'{}') from (select status,count(*) cnt from payment_requests group by status)x),'verified_at',now()); end$$;

create or replace function public.portal_mcp_import_suppliers(p_rows jsonb,p_source_name text default 'MCP') returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare item jsonb; result jsonb; results jsonb:='[]'; created int:=0; failed int:=0; begin perform private.portal_require_action('SUPPLIER.IMPORT'); if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 100 then raise exception 'supplier import requires 1-100 rows'; end if;
 for item in select value from jsonb_array_elements(p_rows) loop begin result:=portal_mcp_create_supplier(item);results:=results||jsonb_build_array(result);created:=created+1; exception when others then failed:=failed+1;results:=results||jsonb_build_array(jsonb_build_object('status','FAILED','supplier_code',item->>'supplier_code','error',sqlerrm));end;end loop;
 return jsonb_build_object('status',case when failed=0 then 'COMPLETED' else 'COMPLETED_WITH_ERRORS' end,'created',created,'failed',failed,'rows',results,'verified_count',created); end$$;

revoke all on function public.portal_mcp_find_supplier_duplicates(jsonb),public.portal_mcp_create_supplier(jsonb),public.portal_mcp_search_suppliers(text,int,int),public.portal_mcp_create_payment_request(jsonb),public.portal_mcp_search_payment_requests(text,text,int,int),public.portal_mcp_transition_payment_request(uuid,text,int,uuid,jsonb),public.portal_mcp_analyze_suppliers_payments(),public.portal_mcp_import_suppliers(jsonb,text) from public,anon;
grant execute on function public.portal_mcp_find_supplier_duplicates(jsonb),public.portal_mcp_create_supplier(jsonb),public.portal_mcp_search_suppliers(text,int,int),public.portal_mcp_create_payment_request(jsonb),public.portal_mcp_search_payment_requests(text,text,int,int),public.portal_mcp_transition_payment_request(uuid,text,int,uuid,jsonb),public.portal_mcp_analyze_suppliers_payments(),public.portal_mcp_import_suppliers(jsonb,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('payment-request-attachments','payment-request-attachments',false,10485760,array['application/pdf','image/png','image/jpeg']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy payment_request_attachments_director_insert on storage.objects for insert to authenticated with check(bucket_id='payment-request-attachments' and private.portal_is_authorized(auth.uid(),'PAYMENT_REQUEST.FILE_UPLOAD') and (storage.foldername(name))[1]=auth.uid()::text);
create policy payment_request_attachments_director_read on storage.objects for select to authenticated using(bucket_id='payment-request-attachments' and private.portal_is_authorized(auth.uid(),'PAYMENT_REQUEST.READ'));

create or replace function public.portal_mcp_update_supplier(p_supplier_id uuid,p_patch jsonb,p_expected_row_version int) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare s suppliers%rowtype; begin perform private.portal_require_action('SUPPLIER.UPDATE');
 update suppliers set legal_name=coalesce(nullif(btrim(p_patch->>'legal_name'),''),legal_name),display_name=coalesce(nullif(btrim(p_patch->>'display_name'),''),display_name),email=case when p_patch?'email' then nullif(btrim(p_patch->>'email'),'') else email end,phone=case when p_patch?'phone' then nullif(btrim(p_patch->>'phone'),'') else phone end,notes=case when p_patch?'notes' then nullif(btrim(p_patch->>'notes'),'') else notes end,lifecycle_status=coalesce(p_patch->>'lifecycle_status',lifecycle_status),row_version=row_version+1,updated_at=clock_timestamp(),updated_by_user_id=auth.uid() where supplier_id=p_supplier_id and row_version=p_expected_row_version returning * into s;
 if not found then raise exception 'supplier changed; refresh required'; end if; insert into audit_events(entity_type,entity_id,operation,new_values,source_type,actor_user_id) values('suppliers',s.supplier_id,'MCP_UPDATE',to_jsonb(s),'MCP',auth.uid()); return jsonb_build_object('status','UPDATED','supplier_id',s.supplier_id,'row_version',s.row_version,'verified',true); end$$;

create or replace function public.portal_mcp_update_payment_request(p_payment_request_id uuid,p_patch jsonb,p_expected_row_version int) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare r payment_requests%rowtype; begin perform private.portal_require_action('PAYMENT_REQUEST.UPDATE');
 update payment_requests set invoice_number=case when p_patch?'invoice_number' then nullif(btrim(p_patch->>'invoice_number'),'') else invoice_number end,invoice_date=case when p_patch?'invoice_date' then nullif(p_patch->>'invoice_date','')::date else invoice_date end,requested_payment_date=case when p_patch?'requested_payment_date' then nullif(p_patch->>'requested_payment_date','')::date else requested_payment_date end,description=coalesce(nullif(btrim(p_patch->>'description'),''),description),row_version=row_version+1,updated_at=clock_timestamp(),updated_by_user_id=auth.uid() where payment_request_id=p_payment_request_id and status='DRAFT' and row_version=p_expected_row_version returning * into r;
 if not found then raise exception 'draft changed or is not editable'; end if; return jsonb_build_object('status','UPDATED','payment_request_id',r.payment_request_id,'row_version',r.row_version,'verified',true); end$$;

create or replace function public.portal_mcp_import_payment_requests(p_rows jsonb,p_source_name text default 'MCP') returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare item jsonb; result jsonb; results jsonb:='[]'; created int:=0; failed int:=0; begin perform private.portal_require_action('PAYMENT_REQUEST.IMPORT'); if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows) not between 1 and 100 then raise exception 'payment import requires 1-100 rows'; end if;
 for item in select value from jsonb_array_elements(p_rows) loop begin result:=portal_mcp_create_payment_request(item);results:=results||jsonb_build_array(result);created:=created+1; exception when others then failed:=failed+1;results:=results||jsonb_build_array(jsonb_build_object('status','FAILED','idempotency_key',item->>'idempotency_key','error',sqlerrm));end;end loop; return jsonb_build_object('status',case when failed=0 then 'COMPLETED' else 'COMPLETED_WITH_ERRORS' end,'created',created,'failed',failed,'rows',results,'verified_count',created); end$$;

create or replace function public.portal_mcp_record_payment_document(p_payment_request_id uuid,p_document_type text,p_object_path text,p_filename text,p_content_type text,p_size bigint,p_sha256 text) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare d uuid; begin perform private.portal_require_action('PAYMENT_REQUEST.FILE_UPLOAD'); if p_document_type not in('INVOICE','RECEIPT','BANK_CONFIRMATION','OTHER') or p_size not between 1 and 10485760 then raise exception 'invalid document'; end if; if not exists(select 1 from payment_requests where payment_request_id=p_payment_request_id and status<>'CANCELLED') then raise exception 'payment request unavailable'; end if;
 insert into payment_request_documents(payment_request_id,document_type,object_path,original_filename,content_type,size_bytes,sha256,created_by_user_id) values(p_payment_request_id,p_document_type,p_object_path,p_filename,p_content_type,p_size,p_sha256,auth.uid()) returning payment_request_document_id into d; return jsonb_build_object('payment_request_document_id',d,'object_path',p_object_path,'verified',true); end$$;

revoke all on function public.portal_mcp_update_supplier(uuid,jsonb,int),public.portal_mcp_update_payment_request(uuid,jsonb,int),public.portal_mcp_import_payment_requests(jsonb,text),public.portal_mcp_record_payment_document(uuid,text,text,text,text,bigint,text) from public,anon;
grant execute on function public.portal_mcp_update_supplier(uuid,jsonb,int),public.portal_mcp_update_payment_request(uuid,jsonb,int),public.portal_mcp_import_payment_requests(jsonb,text),public.portal_mcp_record_payment_document(uuid,text,text,text,text,bigint,text) to authenticated;
