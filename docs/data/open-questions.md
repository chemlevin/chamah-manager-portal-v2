# Database Open Questions

Status: Final implementation-question log for Database Blueprint v1.0.

Last updated: 2026-07-13

## Purpose

This document records unresolved questions that remain after the architecture design. Question IDs are permanent. None of the open items below changes the approved core architecture unless explicitly marked as structural.

## Resolved Or Superseded Questions

### DBQ-0001 | Legal Entity Type Final Values

Status: Resolved for v1.

Resolution: Use a lightweight configurable list. Seed the current actual type only. Future types are added as new rows, not schema changes.

### DBQ-0002 | Next Table After Year Tables

Status: Superseded by completed domain-based design.

Resolution: Blueprint design proceeded by domain rather than strict table order.

### DBQ-0003 | Google Sheets Tab Layout

Status: Resolved.

Resolution: One primary operational spreadsheet with exactly five initial visible tabs: `הגדרות`, `ילדים`, `עובדים`, `שכר`, `בנקים`. No visible `תקציב` tab in v1. Budget configuration is maintained in `הגדרות`; calculated outputs are shown in the portal/reports.

### DBQ-0004 | Business Code Language

Status: Resolved.

Resolution: Business Codes use stable uppercase English/ASCII codes. Hebrew remains for display names.

### DBQ-0005 | Calendar Year Visibility

Status: Resolved.

Resolution: Calendar Year may include selectable/visible controls when required by the dashboard, while visibility and lifecycle remain separate. Multiple Calendar Years may remain open or selectable.

### DBQ-0007 | Daycare Legal Entity Transfer History

Status: Resolved for v1.

Resolution: Keep `daycares.legal_entity_id` for the initial implementation. Add an effective-dated ownership-history table before the first actual transfer or when migration evidence requires historical ownership.

### DBQ-0008 | Budget Tab Requiredness

Status: Resolved.

Resolution: Do not create a visible `תקציב` tab in v1. Add it later only after a demonstrated recurring manual-entry requirement.

### DBQ-0011 | Historical Migration Depth

Status: Resolved for the first migration wave.

Resolution: Migrate the current and previous School Years and the current and previous Calendar Years. The schema supports all history; older reliable data may be migrated later.

## Open Non-Structural Questions

### DBQ-0006 | Historical Display Names

Status: Open — implementation choice.

Question: Should historical reporting resolve names through effective-dated identity history, store display-name snapshots on calculated/reporting records, or use both?

Recommendation: Use stable foreign keys as authority. Store snapshots only on finalized calculation/reporting outputs when reproducibility requires the exact historical label.

Blocking: Does not block core schema creation. Must be resolved before final reporting views are frozen.

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

### DBQ-0012 | Parallel Run Duration

Status: Open — cutover decision.

Question: Will the old and new systems run in parallel for one complete monthly cycle or two?

Recommendation: Minimum one complete cycle; prefer two cycles for Payroll, Banking, and Budget reconciliation.

Blocking: Blocks cutover approval only.

## Structural Blocker Status

There are currently no unresolved questions that require redesign of the core Database Blueprint.

The owner-dependent architecture decisions are closed in `final-architecture-closure.md`. Remaining items are implementation/environment choices and must be surfaced at the phase where they become relevant. Codex must not invent answers silently.