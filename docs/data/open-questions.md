# Database Open Questions

Status: Schema Freeze v1 question log.

Last updated: 2026-07-13

## Purpose

This document records unresolved database architecture questions. Question IDs are permanent.

## Questions

### DBQ-0001 | Legal Entity Type Final Values

Status: Closed for Schema Freeze v1.

Question: Are `NONPROFIT`, `COMPANY`, and future `PUBLIC_BENEFIT_COMPANY` the intended legal entity type set, or are additional legal entity types required?

Resolution: Existing `legal_entity_types` is kept in the frozen schema. Future value additions are data/configuration work, not a structure-freeze blocker.

### DBQ-0002 | Next Table After Year Tables

Status: Closed for Schema Freeze v1.

Question: Should the next detailed table design be legal entities, organization units, daycares, or classrooms?

Resolution: The current 33-table schema is kept and corrected by Migration 011.

### DBQ-0003 | Google Sheets Tab Layout

Status: Deferred.

Question: What are the exact Google Sheets tab names and column layouts for each future database table?

Blocking: Blocks import/sync implementation, not Schema Freeze v1.

### DBQ-0004 | Business Code Language

Status: Deferred.

Question: Should business codes always be English uppercase codes, or may Hebrew business codes be used?

Blocking: Blocks future naming-standard refinements, not Schema Freeze v1.

### DBQ-0005 | Calendar Year Visibility

Status: Deferred.

Question: Does Calendar Year need a separate Website Visibility attribute like School Year?

Blocking: Not blocking Schema Freeze v1.

### DBQ-0006 | Historical Display Names

Status: Deferred.

Question: Should historical reports store display-name snapshots, resolve names by effective dates, or both?

Blocking: Blocks future reporting history behavior, not Schema Freeze v1.

### DBQ-0007 | API/Auth RLS Policies

Status: Deferred.

Question: What role model and policies should expose database rows to APIs and authenticated users?

Resolution for v1: RLS stays enabled and no permissive public policies are added. Policies are deferred to the API/auth phase.

### DBQ-0008 | Google Sheets Budget Tab

Status: Closed for Schema Freeze v1.

Question: Should a visible Budget tab exist in Google Sheets v1?

Resolution: No visible Budget tab in Google Sheets v1.
