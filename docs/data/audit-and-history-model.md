# Audit And History Model

Status: Draft architecture.

Last updated: 2026-07-12

## Purpose

This document records audit and history principles for the database blueprint.

## Approved Principles

- Historical data must never be overwritten.
- Used records are never physically deleted.
- Display-name changes do not create new identities.
- Material business-meaning changes require new entities and new business codes.
- Historical records must continue using the entity and definition that applied at that time.
- Source traceability must be preserved for imports.

## Source Traceability

Traceability may include:
- source system
- spreadsheet ID
- tab name
- row index
- raw row data
- import batch ID
- source reference

## Audit Requirements

Each table document must define audit requirements. Common audit fields may include:
- created at
- created by
- updated at
- updated by
- import batch ID
- source row reference

## Open Questions

- Whether every table needs row-level version history.
- Whether audit history is centralized or table-specific.
- How historical display names are resolved in reports.

