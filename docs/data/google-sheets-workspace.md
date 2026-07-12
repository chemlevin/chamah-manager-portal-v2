# Google Sheets Operational Workspace

Status: Approved target structure; detailed mapping in progress.

Last updated: 2026-07-12

Related decisions: DBD-0002, DBD-0004, DBD-0005, DBD-0022, DBD-0023, DBD-0025, DBD-0026, DBD-0027.

## Purpose

Define a compact Google Sheets workspace for the owner and office staff. The workspace must remain simple even when the database uses normalized internal tables.

Google Sheets is the operational editing interface. The database is the accepted system Source of Truth after validation and synchronization.

## Core Usability Rule

The visible workspace must not mirror the database table count.

One visible Sheet tab may collect data that is written to multiple related database tables by the sync service. Internal normalization must remain invisible to users.

## Target Size

Preferred initial target:

- one main Google Spreadsheet;
- approximately five to seven visible working tabs;
- up to two or three hidden/protected system tabs for dropdown lists and sync metadata;
- a second Spreadsheet only when file size, access permissions, or import volume clearly justify separation.

The exact tab count is finalized only after all fields are mapped. Convenience takes priority over one-tab-per-table purity.

## Proposed Visible Tabs

### 1. `הגדרות`

Purpose:

- School Years and Calendar Years;
- Legal Entity;
- Daycares;
- Roles;
- certificate types;
- Budget Categories;
- other small controlled lists.

Small reference lists may appear as separate table sections on the same tab instead of separate visible tabs.

### 2. `מעונות וכיתות`

Purpose:

- daycare identity;
- School-Year classroom configuration;
- classroom opening and closing dates;
- allowed Age Group composition;
- mixed-classroom setup.

### 3. `ילדים חודשיים`

Purpose:

- School Year;
- month;
- daycare;
- classroom;
- Age Group;
- monthly child quantity used for Budget Income;
- notes and sync feedback.

### 4. `עובדים`

Purpose:

- employee identity;
- employment state;
- current assignment;
- recognized seniority;
- role and hours;
- certificates and relevant statuses.

The sync service may split one visible row into employee, employment, assignment, and certificate records internally. The user does not manage those internal tables directly.

### 5. `שכר`

Purpose:

- monthly Payroll source records;
- operational Payroll allocation fields where required;
- validation totals and sync status.

### 6. `בנקים והנה״ח`

Purpose:

- imported bank-source fields;
- classification and allocations;
- Budget Month;
- Accounting Status;
- notes and errors.

### 7. `תקציב`

Purpose:

- Budget Categories and configurable calculation values not already maintained in `הגדרות`;
- annual planning;
- monthly distribution or override values;
- lock and review information where appropriate.

This tab may be reduced or combined with `הגדרות` if the final mapping remains easy to use.

## Hidden And Protected Tabs

### `_LISTS`

Database-synchronized dropdown values:

- years;
- months;
- legal entities;
- daycares;
- classrooms by period;
- Age Groups;
- roles;
- Budget Categories;
- statuses;
- certificate types.

Users do not edit this tab directly.

### `_SYNC`

Optional central sync state:

- last publish time;
- last successful sync;
- pending rows;
- errors;
- warnings;
- batch identifier;
- connector status.

### `_ARCHIVE` or separate archive file

Not required by default. Historical records remain in the database. A Sheet archive is created only if operational performance or readability requires it.

## Standard Row Columns

Every editable data section should include protected system columns, normally positioned at the far right and optionally hidden:

- `database_id`;
- `business_code`, where relevant;
- `row_version`;
- `sync_status`;
- `validation_status`;
- `error_details`;
- `action_required`;
- `last_synced_at`.

## Editing Rules

- Only visually marked cells are editable.
- Dropdowns are used wherever a controlled value exists.
- Free text is limited to explicit fields such as notes or descriptions.
- System columns are protected.
- Calculated values are protected.
- Business codes are editable only during creation and become protected after accepted use.
- Copy/paste is supported, but every row is revalidated during sync.

## Visual Rules

Suggested meaning:

- light editable fill: user-input cell;
- gray: protected/system field;
- green: accepted and synchronized;
- yellow: warning, accepted or review required;
- red: blocking error;
- orange: conflict or owner review required.

Color is presentation only. Validation status values control behavior.

## Publish And Sync

Preferred initial workflow:

1. users edit marked cells;
2. Sheet validation shows obvious problems immediately;
3. user runs `פרסם שינויים` or an equivalent controlled sync;
4. server-side validation evaluates every changed row;
5. valid rows are committed to the database;
6. invalid rows remain unchanged in the database and receive visible correction messages;
7. website data refreshes from accepted database state.

The exact trigger may be a menu action, button, or scheduled process with a manual publish option. This is an implementation choice, not a schema rule.

## Row Creation

- A new valid row without a Database ID creates a new business or operational record.
- For Master Data, a Business Code is required.
- For recurring operational data, the natural uniqueness fields are validated, for example classroom + month + Age Group.
- Blank template rows are ignored rather than imported as errors.

## Error Handling

Blocking errors include:

- missing required field;
- unknown dropdown reference;
- duplicate stable code;
- invalid date or number;
- invalid effective-period relationship;
- version conflict;
- attempt to modify a protected identity field.

Warnings include:

- recommended value missing;
- possible duplicate;
- inactive reference retained for history;
- approved allocation mismatch that does not block according to Handbook rules.

## Design Boundary

The workspace must remain understandable to office users without database knowledge.

Do not expose:

- foreign-key UUIDs as user choices;
- join tables;
- technical event tables;
- audit tables;
- calculation-run tables;
- raw API contracts.

Those are internal implementation details.

## Final Deliverable Requirement

Before Codex implementation begins, `google-sheets-mapping.md` must specify for every visible column:

- visible Hebrew label;
- editable or protected;
- free text or dropdown;
- dropdown source;
- target database table and field;
- insert/update behavior;
- validation rules;
- error wording;
- historical behavior.
