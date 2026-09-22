# Settings Center

Status: Implemented in TRACK 013.

## Purpose

`#training/settings` is the portal's single business-facing configuration center. It replaces the former Tables hub and its separate Variables and Calculation Tables prototypes.

The center does not mirror the database navigation. Existing Supabase tables are grouped into five daily-work sections:

1. Periods and years: `school_years`, `calendar_years`, `school_year_months`.
2. Organization and daycares: `legal_entity_types`, `legal_entities`, `allocation_units`, `daycares`.
3. Daycare and classroom operation: `daycare_school_years`, `classrooms`, `age_groups`.
4. Finance and accounting: `budget_categories`, `bank_accounts`, `accounting_statuses`.
5. Workforce and rules: `roles`, `certificate_types`, `classroom_licensing_rules`, `staffing_rules`, `staffing_budget_parameters`, `compensation_factors`, `compensation_rules`, `budget_rules`, `travel_rates`.

## Data and security

- Existing tables and foreign keys remain authoritative. TRACK 013 adds no duplicate lookup/configuration tables.
- Browser clients do not receive `service_role` credentials and do not write directly through read-only table RLS.
- `portal-settings` validates the signed-in user and requires `management.settings` VIEW or EDIT through the existing fail-closed permission resolver.
- Mutations use a strict table allow-list and existing database constraints.
- Configuration mutations are recorded in `audit_events` with `PORTAL_SETTINGS` as their source.
- Imported operational facts, immutable bank transactions, payroll source rows, snapshots, and audit/data-quality records are intentionally not editable in Settings.

## Relationship UX

UUID foreign keys are represented as linked selectors with business labels. Dependent selectors are filtered where the parent relationship is known:

- legal entity filters available allocation units for a daycare;
- school year filters effective school-year months for staffing budget parameters;
- daycare and school year are represented by the existing `daycare_school_years` relationship before selecting a classroom.

Database constraints remain the final validation boundary and prevent deletion of referenced records or invalid business combinations.
