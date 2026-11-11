-- TRACK116: atomic, idempotent payment attachment orchestration.
-- Storage remains private and all physical deletion is performed by the Storage API.

create table public.payment_attachment_operations (
  payment_attachment_operation_id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id),
  idempotency_key text not null,
  payment_request_id uuid not null references public.payment_requests on delete restrict,
  document_type text not null check (document_type in ('INVOICE','RECEIPT','BANK_CONFIRMATION','OTHER')),
  object_path text not null unique,
  original_filename text not null,
  content_type text not null check (content_type in ('application/pdf','image/png','image/jpeg')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'PENDING' check (status in ('PENDING','FINALIZED','CLEANUP_PENDING','CLEANED')),
  payment_request_document_id uuid unique references public.payment_request_documents on delete restrict,
  attempt_count integer not null default 1 check (attempt_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz,
  cleaned_at timestamptz,
  unique (actor_user_id, idempotency_key)
);
alter table public.payment_attachment_operations enable row level security;
revoke all on public.payment_attachment_operations from public, anon, authenticated;

create or replace function public.portal_mcp_prepare_payment_attachment(
  p_payment_request_id uuid, p_document_type text, p_filename text,
  p_content_type text, p_size bigint, p_sha256 text, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public,private,storage,pg_temp as $$
declare op public.payment_attachment_operations%rowtype; safe_name text;
begin
  perform private.portal_require_action('PAYMENT_REQUEST.FILE_UPLOAD');
  if p_document_type not in ('INVOICE','RECEIPT','BANK_CONFIRMATION','OTHER')
     or p_content_type not in ('application/pdf','image/png','image/jpeg')
     or p_size not between 1 and 10485760 or p_sha256 !~ '^[0-9a-f]{64}$'
     or nullif(btrim(p_idempotency_key),'') is null or length(p_idempotency_key)>160
     or nullif(btrim(p_filename),'') is null or length(p_filename)>240 then raise exception 'invalid attachment request'; end if;
  if not exists(select 1 from public.payment_requests where payment_request_id=p_payment_request_id and status<>'CANCELLED') then raise exception 'payment request unavailable'; end if;
  select * into op from public.payment_attachment_operations where actor_user_id=auth.uid() and idempotency_key=p_idempotency_key for update;
  if found then
    if op.payment_request_id<>p_payment_request_id or op.document_type<>p_document_type or op.original_filename<>p_filename
       or op.content_type<>p_content_type or op.size_bytes<>p_size or op.sha256<>p_sha256 then raise exception 'idempotency key payload mismatch'; end if;
    if op.status='CLEANED' then update public.payment_attachment_operations set status='PENDING',attempt_count=attempt_count+1,updated_at=clock_timestamp(),cleaned_at=null where payment_attachment_operation_id=op.payment_attachment_operation_id returning * into op; end if;
    return jsonb_build_object('status',op.status,'operation_id',op.payment_attachment_operation_id,'object_path',op.object_path,'payment_request_document_id',op.payment_request_document_id,'idempotent_replay',true);
  end if;
  safe_name:=left(regexp_replace(p_filename,'[^A-Za-z0-9._-]+','_','g'),120); if safe_name='' then safe_name:='attachment'; end if;
  op.payment_attachment_operation_id:=gen_random_uuid();
  op.object_path:=auth.uid()::text||'/'||p_payment_request_id::text||'/'||op.payment_attachment_operation_id::text||'-'||safe_name;
  insert into public.payment_attachment_operations(payment_attachment_operation_id,actor_user_id,idempotency_key,payment_request_id,document_type,object_path,original_filename,content_type,size_bytes,sha256)
  values(op.payment_attachment_operation_id,auth.uid(),p_idempotency_key,p_payment_request_id,p_document_type,op.object_path,p_filename,p_content_type,p_size,p_sha256) returning * into op;
  insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,detail)
  values(auth.uid(),'MCP','PAYMENT_REQUEST.FILE_UPLOAD','PAYMENT_ATTACHMENT',op.payment_attachment_operation_id,'ALLOW',jsonb_build_object('phase','PREPARED','payment_request_id',p_payment_request_id,'object_path',op.object_path,'sha256',p_sha256));
  return jsonb_build_object('status','PENDING','operation_id',op.payment_attachment_operation_id,'object_path',op.object_path,'idempotent_replay',false);
end$$;

create or replace function public.portal_mcp_finalize_payment_attachment(p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path=public,private,storage,pg_temp as $$
declare op public.payment_attachment_operations%rowtype; d public.payment_request_documents%rowtype;
begin
  perform private.portal_require_action('PAYMENT_REQUEST.FILE_UPLOAD');
  select * into op from public.payment_attachment_operations where payment_attachment_operation_id=p_operation_id and actor_user_id=auth.uid() for update;
  if not found then raise exception 'attachment operation unavailable'; end if;
  if op.status='FINALIZED' then select * into d from public.payment_request_documents where payment_request_document_id=op.payment_request_document_id; return jsonb_build_object('status','IDEMPOTENT_REPLAY','payment_request_document_id',d.payment_request_document_id,'object_path',d.object_path,'verified',true); end if;
  if op.status<>'PENDING' then raise exception 'attachment operation is not finalizable'; end if;
  if not exists(select 1 from storage.objects where bucket_id='payment-request-attachments' and name=op.object_path) then raise exception 'uploaded object not found'; end if;
  insert into public.payment_request_documents(payment_request_id,document_type,object_path,original_filename,content_type,size_bytes,sha256,created_by_user_id)
  values(op.payment_request_id,op.document_type,op.object_path,op.original_filename,op.content_type,op.size_bytes,op.sha256,auth.uid()) returning * into d;
  update public.payment_attachment_operations set status='FINALIZED',payment_request_document_id=d.payment_request_document_id,finalized_at=clock_timestamp(),updated_at=clock_timestamp() where payment_attachment_operation_id=p_operation_id;
  insert into public.audit_events(entity_type,entity_id,operation,new_values,source_type,actor_user_id) values('payment_request_documents',d.payment_request_document_id,'MCP_CREATE',to_jsonb(d),'MCP',auth.uid());
  insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,detail) values(auth.uid(),'MCP','PAYMENT_REQUEST.FILE_UPLOAD','PAYMENT_DOCUMENT',d.payment_request_document_id,'SUCCESS',jsonb_build_object('phase','FINALIZED','operation_id',p_operation_id,'object_path',op.object_path,'sha256',op.sha256));
  return jsonb_build_object('status','FINALIZED','payment_request_document_id',d.payment_request_document_id,'object_path',d.object_path,'verified',true);
end$$;

create or replace function public.portal_mcp_begin_payment_attachment_cleanup(p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path=public,private,pg_temp as $$
declare op public.payment_attachment_operations%rowtype;
begin
  perform private.portal_require_action('PAYMENT_REQUEST.FILE_UPLOAD');
  select * into op from public.payment_attachment_operations where payment_attachment_operation_id=p_operation_id and actor_user_id=auth.uid() for update;
  if not found then raise exception 'attachment operation unavailable'; end if;
  if op.status='FINALIZED' then return jsonb_build_object('status','FINALIZED','payment_request_document_id',op.payment_request_document_id,'object_path',op.object_path); end if;
  if op.status='CLEANED' then return jsonb_build_object('status','CLEANED','object_path',op.object_path); end if;
  update public.payment_attachment_operations set status='CLEANUP_PENDING',updated_at=clock_timestamp() where payment_attachment_operation_id=p_operation_id returning * into op;
  insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,detail) values(auth.uid(),'MCP','PAYMENT_REQUEST.FILE_UPLOAD','PAYMENT_ATTACHMENT',p_operation_id,'FAILURE',jsonb_build_object('phase','CLEANUP_REQUESTED','object_path',op.object_path));
  return jsonb_build_object('status','CLEANUP_PENDING','object_path',op.object_path);
end$$;

create or replace function public.portal_mcp_complete_payment_attachment_cleanup(p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path=public,private,storage,pg_temp as $$
declare op public.payment_attachment_operations%rowtype;
begin
  perform private.portal_require_action('PAYMENT_REQUEST.FILE_UPLOAD');
  select * into op from public.payment_attachment_operations where payment_attachment_operation_id=p_operation_id and actor_user_id=auth.uid() for update;
  if not found or op.status<>'CLEANUP_PENDING' then raise exception 'cleanup operation unavailable'; end if;
  if exists(select 1 from storage.objects where bucket_id='payment-request-attachments' and name=op.object_path) then raise exception 'storage object still exists'; end if;
  update public.payment_attachment_operations set status='CLEANED',cleaned_at=clock_timestamp(),updated_at=clock_timestamp() where payment_attachment_operation_id=p_operation_id;
  insert into public.portal_authorization_audit(actor_user_id,channel,action_code,resource_type,resource_id,decision,detail) values(auth.uid(),'MCP','PAYMENT_REQUEST.FILE_UPLOAD','PAYMENT_ATTACHMENT',p_operation_id,'SUCCESS',jsonb_build_object('phase','CLEANED','object_path',op.object_path));
  return jsonb_build_object('status','CLEANED','object_path',op.object_path);
end$$;

create policy payment_request_attachments_compensating_delete on storage.objects for delete to authenticated using (
  bucket_id='payment-request-attachments' and private.portal_is_authorized(auth.uid(),'PAYMENT_REQUEST.FILE_UPLOAD')
  and exists(select 1 from public.payment_attachment_operations op where op.actor_user_id=auth.uid() and op.object_path=name and op.status='CLEANUP_PENDING' and op.payment_request_document_id is null)
);

revoke all on function public.portal_mcp_prepare_payment_attachment(uuid,text,text,text,bigint,text,text),public.portal_mcp_finalize_payment_attachment(uuid),public.portal_mcp_begin_payment_attachment_cleanup(uuid),public.portal_mcp_complete_payment_attachment_cleanup(uuid) from public,anon;
grant execute on function public.portal_mcp_prepare_payment_attachment(uuid,text,text,text,bigint,text,text),public.portal_mcp_finalize_payment_attachment(uuid),public.portal_mcp_begin_payment_attachment_cleanup(uuid),public.portal_mcp_complete_payment_attachment_cleanup(uuid) to authenticated;
