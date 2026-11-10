-- TRACK112: extend the shared audit vocabulary for authenticated MCP writes.
alter table public.audit_events drop constraint audit_events_operation_check;
alter table public.audit_events add constraint audit_events_operation_check check (
 operation in ('INSERT','UPDATE','STATUS_CHANGE','LOCK','UNLOCK','IMPORT','MANUAL_CORRECTION','MCP_CREATE','MCP_UPDATE')
);
alter table public.audit_events drop constraint audit_events_source_type_check;
alter table public.audit_events add constraint audit_events_source_type_check check (
 source_type in ('GOOGLE_SHEETS','IMPORT_FILE','PORTAL_ADMIN','SYSTEM','MIGRATION','MCP')
);
