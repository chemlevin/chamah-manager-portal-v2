create table public.import_rows (
  import_row_id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(import_batch_id) on delete cascade,
  source_row_key varchar(200) not null,
  source_row_number integer,
  raw_payload jsonb not null default '{}'::jsonb,
  parsed_payload jsonb not null default '{}'::jsonb,
  validation_status varchar(20) not null default 'PENDING' check (validation_status in ('PENDING','VALID','WARNING','ERROR','ACCEPTED','REJECTED')),
  error_details jsonb not null default '[]'::jsonb,
  accepted_entity_type varchar(100),
  accepted_entity_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  unique (import_batch_id, source_row_key)
);

create table public.audit_events (
  audit_event_id uuid primary key default gen_random_uuid(),
  entity_type varchar(100) not null,
  entity_id uuid not null,
  operation varchar(20) not null check (operation in ('INSERT','UPDATE','STATUS_CHANGE','LOCK','UNLOCK','IMPORT','MANUAL_CORRECTION')),
  previous_values jsonb,
  new_values jsonb,
  source_type varchar(30) not null check (source_type in ('GOOGLE_SHEETS','IMPORT_FILE','PORTAL_ADMIN','SYSTEM','MIGRATION')),
  actor_user_id uuid,
  import_batch_id uuid references public.import_batches(import_batch_id),
  occurred_at timestamptz not null default timezone('utc', now())
);

create table public.data_quality_issues (
  data_quality_issue_id uuid primary key default gen_random_uuid(),
  issue_code varchar(100) not null,
  entity_type varchar(100),
  entity_id uuid,
  import_row_id uuid references public.import_rows(import_row_id),
  severity varchar(20) not null check (severity in ('WARNING','ERROR')),
  status varchar(20) not null default 'OPEN' check (status in ('OPEN','RESOLVED','IGNORED')),
  explanation text not null,
  resolution_notes text,
  ignored_by_user_id uuid,
  ignored_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  resolved_by_user_id uuid
);

create index idx_import_rows_batch_status on public.import_rows(import_batch_id, validation_status);
create index idx_audit_events_entity on public.audit_events(entity_type, entity_id, occurred_at desc);
create index idx_audit_events_import_batch on public.audit_events(import_batch_id);
create index idx_data_quality_status on public.data_quality_issues(status, severity);
create index idx_data_quality_entity on public.data_quality_issues(entity_type, entity_id);

alter table public.import_rows enable row level security;
alter table public.audit_events enable row level security;
alter table public.data_quality_issues enable row level security;

comment on table public.import_rows is 'Row-level source traceability and validation outcomes for every import or synchronization batch.';
comment on table public.audit_events is 'Shared audit trail for business entities; table-specific audit tables are intentionally avoided.';
comment on table public.data_quality_issues is 'Actionable warnings and blocking errors without burdening daily user-facing sheets.';