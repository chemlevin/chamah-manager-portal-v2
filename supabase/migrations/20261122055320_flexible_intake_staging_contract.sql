-- Additive flexible-intake metadata only. No canonical business table is written here.
alter table public.import_batches
  add column if not exists source_digest text,
  add column if not exists source_media_type text,
  add column if not exists parser_id text,
  add column if not exists parser_version text,
  add column if not exists reporting_period date,
  add column if not exists correlation_id uuid,
  add column if not exists contract_version text not null default '1.0';

alter table public.import_rows
  add column if not exists original_headers jsonb not null default '[]'::jsonb,
  add column if not exists original_values jsonb not null default '{}'::jsonb,
  add column if not exists normalized_values jsonb not null default '{}'::jsonb,
  add column if not exists detected_identifiers jsonb not null default '{}'::jsonb,
  add column if not exists mapping_confidence numeric(5,4),
  add column if not exists unmapped_fields jsonb not null default '[]'::jsonb,
  add column if not exists parser_warnings jsonb not null default '[]'::jsonb,
  add column if not exists conflict_reason text,
  add column if not exists proposed_entity text,
  add column if not exists proposed_field text,
  add column if not exists output_classification text not null default 'RAW',
  add column if not exists correlation_id uuid;

alter table public.import_rows
  drop constraint if exists import_rows_mapping_confidence_check,
  add constraint import_rows_mapping_confidence_check
    check (mapping_confidence is null or (mapping_confidence >= 0 and mapping_confidence <= 1)),
  drop constraint if exists import_rows_output_classification_check,
  add constraint import_rows_output_classification_check
    check (output_classification in ('RAW','UNMAPPED','NEEDS_REVIEW','CREATE_PROPOSAL','PROPOSED','CANONICAL'));

create index if not exists import_batches_source_digest_idx
  on public.import_batches (source_digest);
create index if not exists import_rows_output_classification_idx
  on public.import_rows (import_batch_id, output_classification);
create index if not exists import_rows_correlation_id_idx
  on public.import_rows (correlation_id);

comment on column public.import_batches.source_digest is 'Content digest for source identity; never a business identity key.';
comment on column public.import_batches.correlation_id is 'Request correlation identifier for intake/recovery tracing.';
comment on column public.import_rows.original_values is 'Immutable source values before normalization; no canonical write.';
comment on column public.import_rows.normalized_values is 'Parser output proposed for reconciliation; not canonical data.';
comment on column public.import_rows.output_classification is 'Flexible-intake boundary classification; CANONICAL requires later approved promotion.';
