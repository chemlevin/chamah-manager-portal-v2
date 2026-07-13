# Database Open Questions

Status: Final implementation-question log for Database Blueprint v1.0.

Last updated: 2026-07-13

## Purpose

This document records unresolved questions that remain after the architecture design. Question IDs are permanent. None of the open items below changes the approved core architecture unless explicitly marked as structural.

## Resolved Or Superseded Questions

### DBQ-0001 | Legal Entity Type Final Values

Status: Resolved for v1.

Resolution: Use a lightweight configurable list. Seed the current actual type only. `NONPROFIT`, `COMPANY`, and `PUBLIC_BENEFIT_COMPANY` are examples; future types are added as new rows, not schema changes.

### DBQ-0002 | Next Table After Year Tables

Status: Superseded by completed domain-based design.

Resolution: Blueprint design proceeded by domain rather than strict table order.

### DBQ-0003 | Google Sheets Tab Layout

Status: Resolved at blueprint level.

Resolution: Default target is one primary operational spreadsheet with compact visible tabs: `הגדרות`, `ילדים`, `עובדים`, `שכר`, `בנקים`, and optional `תקציב` only when manual input is needed. Exact final column order is an implementation deliverable based on `google-sheets-mapping.md`.

### DBQ-0004 | Business Code Language

Status: Resolved.

Resolution: Business Codes use stable uppercase English/ASCII codes. Hebrew remains for display names. Business Codes are not user-facing labels.

### DBQ-0005 | Calendar Year Visibility

Status: Resolved.

Resolution: Calendar Year may include selectable/visible controls when required by the dashboard, but visibility and lifecycle remain separate. Multiple Calendar Years may remain open or selectable.

## Open Non-Structural Questions

### DBQ-0006 | Historical Display Names

Status: Open — implementation choice.

Question: Should historical reporting resolve names through effective-dated identity history, store display-name snapshots on calculated/reporting records, or use both?

Recommendation: Use stable foreign keys as authority. Store snapshots only on finalized calculation/reporting outputs when reproducibility requires the exact historical label.

Blocking: Does not block core schema creation. Must be resolved before final reporting views are frozen.

### DBQ-0007 | Daycare Legal Entity Transfer History

Status: Open — only needed when a real transfer occurs.

Question: Should v1 create an effective-dated `daycare_legal_entity_assignments` table immediately, or keep `daycares.legal_entity_id` until an actual daycare transfer is planned?

Recommendation: Keep the core model simple. Add the history table before the first ownership transfer or include it in v1 only if migration data already contains historical ownership changes.

Blocking: Does not block initial one-entity operation.

### DBQ-0008 | Budget Tab Requiredness

Status: Open — owner workflow decision.

Question: Is a visible `תקציב` input tab required, or are budget rules maintained inside `הגדרות` while calculated results remain website/database outputs?

Recommendation: Do not create a visible Budget tab unless the owner or office staff must enter recurring manual budget values there.

Blocking: Blocks final visible Sheet build, not database schema.

### DBQ-0009 | Publish/Sync Trigger

Status: Open — implementation choice.

Question: Should Publish/Sync be initiated through a Google Sheets menu/button, a secured portal admin action, or another controlled endpoint?

Recommendation: Start with an explicit Sheets menu/button for the smallest operational change. Add scheduled or portal-based sync only after stable use.

Blocking: Blocks Sync implementation details, not schema.

### DBQ-0010 | Database Hosting Plan

Status: Open — environment decision.

Question: Which PostgreSQL/Supabase plan, region, backup level, and access ownership will be used?

Recommendation: Select the environment immediately before implementation. Credentials and ownership must be organizationally controlled and documented.

Blocking: Blocks environment setup only.

### DBQ-0011 | Historical Migration Depth

Status: Open — migration scope decision.

Question: How many historical School Years and Calendar Years will be migrated into the new database?

Recommendation: Migrate all reliable source data needed for comparative reporting. Do not delay v1 for low-quality history that can be archived and imported later.

Blocking: Blocks migration scope and timeline, not core schema.

### DBQ-0012 | Parallel Run Duration

Status: Open — cutover decision.

Question: Will the old and new systems run in parallel for one complete monthly cycle or two?

Recommendation: Minimum one complete cycle; prefer two cycles for Payroll, Banking, and Budget reconciliation.

Blocking: Blocks cutover approval only.

## Structural Blocker Status

There are currently no unresolved questions that require redesign of the core Database Blueprint.

Open items must be resolved at the implementation phase where they become relevant. Codex must not invent answers silently; unresolved choices must be surfaced before the dependent implementation step.