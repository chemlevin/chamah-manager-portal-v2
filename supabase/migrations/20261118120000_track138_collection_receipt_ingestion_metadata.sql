-- TRACK138: preserve source-backed collection receipt metadata without
-- inventing a payment date. Additive and forward-only; existing rows remain
-- valid and existing contract version 1.0.0 is unchanged.
alter table public.collection_receipts
  add column if not exists reporting_month date,
  add column if not exists exact_payment_date_available boolean not null default true,
  add column if not exists collection_status text,
  add column if not exists source_file text,
  add column if not exists source_row_number integer,
  add column if not exists child_id uuid references public.children(child_id) on delete restrict,
  add column if not exists daycare_id uuid references public.daycares(daycare_id) on delete restrict;

alter table public.collection_receipts
  alter column receipt_date drop not null;

create index if not exists idx_collection_receipts_child_month
  on public.collection_receipts(child_id, reporting_month);
create index if not exists idx_collection_receipts_source_file_row
  on public.collection_receipts(source_file, source_row_number);

create or replace function private.portal_mcp_entity_meta(p_entity text)
returns jsonb language sql immutable set search_path=public,private,pg_temp as $$
  select case when p_entity='collection_receipts' then jsonb_build_object(
    'table','collection_receipts','id','collection_receipt_id',
    'stable',jsonb_build_array('source_system','source_record_id'),'stable_mode','ANY','generic',true,
    'required',jsonb_build_array('daycare_billing_record_id','amount'),
    'writable',jsonb_build_array('daycare_billing_record_id','receipt_date','reporting_month','exact_payment_date_available','amount','reference','collection_status','source_file','source_row_number','child_id','daycare_id','source_system','source_record_id','source_version','source_mapping_version','source_payload','unmapped_fields'))
    else private.portal_mcp_entity_meta_base(p_entity) end;
$$;
