alter table public.payroll_records add column if not exists sheet_payroll_row_id varchar(180);
create unique index if not exists payroll_records_sheet_row_id_uq on public.payroll_records(sheet_payroll_row_id) where sheet_payroll_row_id is not null;
alter table public.payroll_allocations add column if not exists sheet_payroll_allocation_id varchar(200);
create unique index if not exists payroll_allocations_sheet_id_uq on public.payroll_allocations(sheet_payroll_allocation_id) where sheet_payroll_allocation_id is not null;
update public.payroll_records set sheet_payroll_row_id=source_record_identifier where sheet_payroll_row_id is null and source_record_identifier is not null;
update public.payroll_allocations pa set sheet_payroll_allocation_id=pr.source_record_identifier||'|ALLOC' from public.payroll_records pr where pa.payroll_record_id=pr.payroll_record_id and pa.sheet_payroll_allocation_id is null and pr.source_record_identifier is not null;
