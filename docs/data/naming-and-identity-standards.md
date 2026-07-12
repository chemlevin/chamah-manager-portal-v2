# Naming And Identity Standards

Status: Draft architecture.

Last updated: 2026-07-12

## Purpose

This document defines naming and identity standards for future database entities.

## Identity Fields

Every Master Data entity has:
- stable internal ID
- stable business code
- display name

## Internal ID

- Stable system identity.
- Protected.
- Not edited directly by users.
- Does not change when display name changes.

## Business Code

- Stable business-readable identity.
- Protected after use.
- Does not change when display name changes.
- A material business-meaning change requires a new business code.

## Display Name

- User-facing label.
- May change without changing entity identity.
- Historical reporting must preserve the meaning that applied at the time.

## Status Values

General Master Data lifecycle values:
- Active
- Inactive
- Archived

Calendar Year lifecycle values:
- FUTURE
- OPEN
- CLOSED

School Year lifecycle values from the Handbook:
- Draft
- Active
- Locked

## Naming Convention

Draft convention:
- table names: lower snake case plural, for example `school_years`
- primary keys: singular table name with `_id`, for example `school_year_id`
- codes: uppercase snake case where useful, for example `NONPROFIT`

## Open Questions

- Whether business codes should always be uppercase English codes.
- Whether Hebrew display names should be required for all user-facing entities.

