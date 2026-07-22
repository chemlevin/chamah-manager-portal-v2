# Administration Framework

Status: Implemented foundation with TRACK 009 in-memory prototype screens.

Last updated: 2026-07-22

## Purpose

`chamah-manager-portal/new/admin-framework.js` creates Hebrew RTL administration pages from metadata. Settings pages supply an entity description and a repository; they do not implement their own table, form, search, filter, sorting, pagination, validation, save/cancel, duplication, or enable/disable workflow.

TRACK 009 uses this boundary for three demo-only screens: Variables, Calculation Tables, and Calculation Rules. Their repositories are memory-only, reset on refresh, and do not call Dashboard, Payroll, Budget, Supabase business tables, or calculation engines.

## Architecture

The framework has three boundaries:

1. Page metadata owns presentation and validation: English database field names, Hebrew labels, field types, options, search/filter/sort behavior, and validation rules.
2. The administration controller owns UI state and workflow: loading, empty, error, table state, form state, dirty tracking, CRUD coordination, responsive rendering, and user feedback.
3. A repository owns persistence. Repositories implement `list`, `create`, `update`, and `delete`; the UI does not know which table or transport is used.

This separation keeps future business settings metadata-only while allowing persistence and security to evolve independently.

## Reusable Exports

- `createAdministration({ root, metadata, repository })`: mounts and controls a complete administration view.
- `createPostgrestRepository(options)`: uses the existing Supabase Data API and the signed-in user's access token.
- `createMemoryRepository(rows)`: deterministic repository for tests and local UI development.
- `validateRecord(metadata, record)`: reusable metadata validation.
- `admin-framework.css`: isolated RTL desktop/mobile presentation.

## Minimal Metadata Contract

```js
const metadata = {
  entity: 'example_settings',
  label: 'הגדרה',
  pluralLabel: 'הגדרות',
  primaryKey: 'example_setting_id',
  searchFields: ['setting_code', 'display_name'],
  fields: [
    { name: 'example_setting_id', label: 'מזהה', form: false },
    { name: 'setting_code', label: 'קוד', required: true, sortable: true },
    { name: 'display_name', label: 'שם תצוגה', required: true, searchable: true },
    { name: 'lifecycle_status', label: 'סטטוס', type: 'select', filterable: true, options: [] }
  ]
};
```

`name` always matches the English database field. `label` is the Hebrew UI text. A future page can add formatters, validators, select options, defaults, help text, and visibility rules without changing the framework.

## Audit Integration

The PostgREST repository writes a centralized `audit_events` row after successful create, update, or delete operations:

- `entity_type` defaults to the configured table.
- `entity_id` uses the metadata primary key.
- `previous_values` and `new_values` preserve the available before/after payloads.
- `source_type` is `PORTAL_ADMIN`.
- operations default to existing allowed values: `INSERT`, `UPDATE`, and `MANUAL_CORRECTION` for physical delete.

Operation values can be configured per entity when a future table uses status changes or logical deletion.

## Security Boundary

The framework does not grant permissions, infer permissions, use a service-role key, or bypass RLS. `createPostgrestRepository` sends the current user's access token. Existing table privileges and RLS policies remain authoritative.

Because the current public Data API does not expose a generic transaction endpoint, the data mutation and client-written audit event are two requests. Future sensitive settings should use a table-specific database function or trigger if audit atomicity is required; that would be a separate API/schema/security task.

## Lifecycle

Call the controller's `destroy()` method when removing a mounted page. This removes the unsaved-changes listener and clears the root. `reload()`, `isDirty()`, and `getState()` are available for shell integration and tests.
