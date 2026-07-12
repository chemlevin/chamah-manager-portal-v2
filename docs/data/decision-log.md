# Database Decision Log

Status: Active architecture log.

Last updated: 2026-07-12

## Purpose

This document records stable database blueprint decisions. Decision IDs are permanent.

## Decisions

### DBD-0001 | Parallel Database Blueprint

Status: Approved.

Decision: The new database is designed in parallel to the existing system.

Impact: Current website, APIs, Google Sheets integration, calculations, UI, and tests are not changed during blueprint work.

### DBD-0002 | Google Sheets Operational Editing

Status: Approved.

Decision: Google Sheets is the operational editing interface.

Impact: Users do not edit the database directly.

### DBD-0003 | Database Final Source Of Truth

Status: Approved.

Decision: The database is the final system Source of Truth after validation and import/sync.

Impact: The website will eventually read accepted data from the database.

### DBD-0004 | Target Data Flow

Status: Approved.

Decision: Target data flow is Google Sheets -> Validation -> Import/Sync -> Database -> APIs -> Website.

Impact: Sheet validation and import/database validation are separate layers.

### DBD-0005 | Protected Fields

Status: Approved.

Decision: IDs, business codes after use, calculated fields, audit fields, and sync fields are protected.

Impact: Users edit only marked Sheet cells.

### DBD-0006 | Master Data Identity

Status: Approved.

Decision: Every Master Data entity has stable internal ID, stable business code, and display name.

Impact: Display-name changes do not create new identities.

### DBD-0007 | No Physical Delete After Use

Status: Approved.

Decision: Used records are never physically deleted.

Impact: Records move through lifecycle statuses and remain available for history.

### DBD-0008 | Configuration And Operational Data Separation

Status: Approved.

Decision: Configuration and operational data are separated.

Impact: School Year configuration can be copied without copying operational results.

### DBD-0009 | Imported And Manual Data Separation

Status: Approved.

Decision: Imported source data and manual user data are separated.

Impact: Source updates must not erase completed user allocation or workflow fields.

### DBD-0010 | Multiple Selectable Years

Status: Approved.

Decision: Multiple School Years and Calendar Years may remain selectable, while one year is displayed at a time in a dashboard.

Impact: Prior and future years remain accessible according to lifecycle and visibility.

### DBD-0011 | Multiple Open Calendar Years

Status: Approved.

Decision: Multiple Calendar Years may remain open simultaneously because prior-year accounting work may continue after year-end.

Impact: Calendar Year lifecycle must allow more than one OPEN year.

