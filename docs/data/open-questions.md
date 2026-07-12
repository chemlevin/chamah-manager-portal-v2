# Database Open Questions

Status: Active question log.

Last updated: 2026-07-12

## Purpose

This document records unresolved database architecture questions. Question IDs are permanent.

## Questions

### DBQ-0001 | Legal Entity Type Final Values

Status: Open.

Question: Are `NONPROFIT`, `COMPANY`, and future `PUBLIC_BENEFIT_COMPANY` the intended legal entity type set, or are additional legal entity types required?

Blocking: Blocks final approval of `legal_entity_types`.

### DBQ-0002 | Next Table After Year Tables

Status: Open.

Question: Should the next detailed table design be legal entities, organization units, daycares, or classrooms?

Blocking: Not blocking current year table documentation.

### DBQ-0003 | Google Sheets Tab Layout

Status: Open.

Question: What are the exact Google Sheets tab names and column layouts for each future database table?

Blocking: Blocks implementation of import/sync, not blueprint documentation.

### DBQ-0004 | Business Code Language

Status: Open.

Question: Should business codes always be English uppercase codes, or may Hebrew business codes be used?

Blocking: Blocks final naming standard.

### DBQ-0005 | Calendar Year Visibility

Status: Open.

Question: Does Calendar Year need a separate Website Visibility attribute like School Year?

Blocking: Not blocking current approved concept.

### DBQ-0006 | Historical Display Names

Status: Open.

Question: Should historical reports store display-name snapshots, resolve names by effective dates, or both?

Blocking: Blocks detailed audit/history design.

