# Future Session Instructions

Every future development session must:

1. Read this file completely.
2. Read `PROJECT_LOG.md`.
3. Check existing documentation under `docs/`.
4. Inspect the relevant implementation before modifying code.
5. Preserve existing business rules unless the user explicitly requests a rule change.
6. Preserve existing API contracts unless the user explicitly requests an API change.
7. Preserve Budget Engine behavior unless the user explicitly requests Budget changes.
8. Prefer small, root-cause changes over rewrites.
9. Update `PROJECT_LOG.md` after completing implementation work.
10. Never overwrite historical log entries. Append new entries chronologically.

Routine implementation should update `PROJECT_LOG.md` only. Change `AGENTS.md` only when permanent project knowledge changes.

# Engineering Workflow

Before implementing any feature or fix, every development session must:

1. Understand the existing implementation.
2. Inspect the affected modules and their tests.
3. Minimize the scope of changes.
4. Preserve existing calculations unless explicitly instructed otherwise.
5. Preserve existing APIs unless explicitly instructed otherwise.
6. Preserve existing business rules unless explicitly instructed otherwise.
7. Preserve architectural decisions unless explicitly instructed otherwise.
8. Prefer extending existing modules instead of replacing them.
9. Avoid duplicate logic.
10. Fix root causes instead of symptoms.
11. Explain unavoidable tradeoffs.
12. Run appropriate validation.
13. Update `PROJECT_LOG.md` after implementation work.
14. Produce a complete final summary that names changed files, verification, and any residual risk.

This workflow is a permanent engineering standard. For documentation-only work, apply the same discipline but restrict edits to Markdown and record that application validation was not required.

# AI Session Workflow

Every future AI session should:

1. Read `AGENTS.md` completely.
2. Read `PROJECT_LOG.md`.
3. Understand the current implementation before proposing changes.
4. Explain the implementation plan before making significant modifications.
5. Implement only the requested scope.
6. Validate the work with the smallest reliable checks plus broader regression checks when risk warrants them.
7. Update `PROJECT_LOG.md` after implementation work.
8. Produce the required final response.

If user instructions conflict with stale documentation, follow the user request and current implementation, then document the conflict when it has lasting value.

# Project Overview

This repository is the Chamah manager portal, a Hebrew RTL management portal for daycare and operational administration.

The current implementation includes:

- A home portal with navigation between modules.
- Dashboard / management intelligence views.
- Dedicated Accounting / הנה"ח page.
- Employees management page.
- Budget, payroll, and allocations engines backed by Google Sheets.
- Salary calculator.
- Occupancy and staffing calculator.

Fact: `README.md` is older than the current implementation and says only the salary calculator is active. The code now contains active dashboard, accounting, employees, occupancy, budget, payroll, and allocation modules.

Inference, confidence High: The project is in active feature development, not maintenance-only mode. Evidence: multiple active modules, Playwright QA, Vercel API routes, and recent Accounting implementation work.

Main users appear to be daycare managers and administrators who need operational visibility, accounting workflow tracking, staffing/occupancy planning, and finance/budget views.

# Architecture

## Folder Structure

- `api/`: Vercel serverless API handlers and calculation engines.
- `config/`: shared business-rule constants and organizational-unit metadata.
- `dashboard/`: dashboard HTML and browser logic.
- `accounting/`: dedicated Accounting page.
- `employees/`: Employees management page.
- `occupancy/`: occupancy and staffing calculator.
- `salary/`: salary calculator.
- `assets/`: shared CSS and client utilities.
- `tests/`: Playwright and engine tests.
- `scripts/`: build, local static server, and QA helpers.
- `docs/`: existing business-rule and architecture notes.
- `chamah-manager-portal/`: source copied into `dist` by the build script.
- `dist/`: generated build output. Do not edit directly.

## Build and Deployment

Fact: `scripts/build.mjs` builds the deployable static app from `chamah-manager-portal` into `dist`. When changing static app files that exist both at root-level module paths and under `chamah-manager-portal/`, keep the mirrored source in sync unless the build pipeline is changed intentionally.

Fact: `vercel.json` defines Vercel Node functions for `/api/employees`, `/api/budget`, `/api/budget-test`, `/api/payroll`, and `/api/allocations`.

Fact: Static deployment serves `dist`.

Fact: `dist/` and test report folders are generated outputs. Do not edit or document changes there as source changes.

## Data Flow

1. Google Sheets is the operational data source.
2. API handlers authenticate with a Google service account and read configured sheet tabs.
3. Engine modules normalize spreadsheet rows and calculate deterministic models.
4. Browser pages fetch API JSON and render management UI.
5. Tests validate engine behavior, UI behavior, responsive layout, and date parsing.

## Google Sheets Integration

Fact: API handlers use `googleapis` with JWT service-account credentials.

Fact: `/api/budget`, `/api/payroll`, `/api/employees`, and `/api/allocations` set `Cache-Control: no-store` in their handlers.

Fact: `/api/allocations` reads the `BANKS` tab by default. Environment variables can override the sheet ID and tab.

Fact: `.env.example` documents service-account credentials and BUDGET sheet configuration.

## APIs and Engines

- `api/budget.js` reads BUDGET sheet data and calls `api/budget-engine.js`.
- `api/payroll.js` reads payroll sheet data and calls `api/payroll-engine.js`.
- `api/allocations.js` reads BANKS/allocation data and calls `api/allocations-engine.js`.
- `api/management-engine.js` combines budget, payroll, allocations, and employees payloads into management intelligence.
- `api/employees.js` reads employee data from Google Sheets.

APIs and engines are separate. Preserve this separation: API handlers handle transport, authentication, and error responses; engine modules handle parsing and calculation.

# Technology Stack

- Plain HTML, CSS, and browser JavaScript.
- Node.js serverless functions on Vercel.
- `googleapis` for Google Sheets access.
- Playwright for tests and responsive visual QA.
- CommonJS for API/engine modules.
- ES modules for tests and scripts.
- Static build into `dist`.

# Engineering Principles

- The implementation is the source of truth.
- Make minimal, targeted changes.
- Preserve existing behavior unless the user explicitly asks for a behavior change.
- Keep calculation engines deterministic.
- Keep API contracts stable.
- Prefer existing helper functions and local patterns.
- Avoid hardcoding spreadsheet data as business logic.
- Treat Google Sheets values as data.
- Keep parsing dynamic and alias-based where engines already use aliases.
- Separate facts from inferences in documentation and reports.
- Do not fabricate missing project knowledge.
- Do not edit generated output directly.
- Run appropriate validation after changes.

## Prompt Guidelines

- Keep Codex prompts short and operational.
- Do not repeat permanent project rules already defined in AGENTS.md.
- Write implementation instructions only.
- Do not include explanatory, motivational or descriptive text unless it changes implementation.
- Every line in a prompt must have direct implementation value.
- Prefer objectives, requirements, acceptance criteria and deliverables.
- Extend existing architecture instead of redesigning it.
- The database is the single source of truth.
- Never hardcode business entities or business data that already exists in the database.
- Reuse existing UI components whenever possible.
- Keep prompts focused on the current sprint only.

# Permanent Project Rules

- Do not change Budget Engine behavior unless explicitly requested.
- Do not change calculations unless explicitly requested.
- Do not change APIs unless explicitly requested.
- Do not change Google Sheets structure unless explicitly requested.
- Do not modify package or lock files unless dependency changes are explicitly required.
- Preserve RTL behavior.
- Preserve responsive behavior.
- Preserve existing Hebrew UI text unless the task explicitly changes it.
- Preserve history in `PROJECT_LOG.md`; append, do not rewrite.
- Never fake tests or claim tests were run when they were not.
- If tests cannot be run, report that clearly.
- Prefer implementation evidence over stale documentation.
- Every completed task must be pushed to its remote branch before reporting completion. Never report completion or provide a Preview URL for code that exists only locally.

## Shared Supabase Policy

The linked Supabase project is the canonical backend for this project.

Unless the task explicitly requests an isolated Supabase branch or project, all approved TRACK implementations may:

- Apply forward-only migrations.
- Deploy matching Edge Functions.
- Validate against the linked Supabase project.

The linked Supabase project is considered the Preview backend.

Production Vercel deployment remains a separate approval step.

Never leave the project in a partial deployment state.

If a TRACK requires both a database migration and an Edge Function, they must always be deployed together before the TRACK is considered complete.

Frontend Production deployment must not occur without explicit approval.

If an isolated Supabase environment is required, state the reason before blocking the task.

## Canonical Production Rule

The only canonical Production URL is:

`https://chamah-portal.vercel.app`

Every Production deployment must verify:

- The serving deployment ID.
- The serving Git SHA.
- The canonical alias.
- That the expected approved commit is included.

Do not report success until the canonical Production URL serves the expected deployment.

# Business Rules

## Shared Rules

Fact: `config/business-rules.js` centralizes these runtime contracts:

- `DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS = 160`
- `averageEmployeeMonthlyHours = 160`
- `DAYCARE_MONTH_KEY_SEPARATOR = "|"`
- `daycareMonthKey(daycare, month)` returns `daycare|month` after trimming values.
- `unitMonthKey(unit, month)` returns `unit|month` after trimming values.

Fact: Budget grain is daycare + month. Payroll grain is daycare + month. Allocations grain is organizational unit + business month in `api/allocations-engine.js`.

## Budget

Fact: `api/budget-engine.js` requires BUDGET tables: `OCCUPANCY`, `STAFFING`, `MONTH_HOURS`, `FIXED_STAFF`, and `COST_RULES`.

Fact: Budget parses dynamic table sections marked with `TABLE: NAME`.

Fact: Budget calculates classroom staffing before daycare/month aggregation.

Fact: Mixed classrooms are supported only when explicitly marked as mixed.

Fact: Expected revenue is calculated from occupancy children and staffing tuition.

Fact: Cost rules can use Hebrew classroom/staff quantity bases.

Fact: Daycare-specific exception rules do not double count with general rules.

Fact: Fixed staff is separate from classroom staffing but contributes hours and costs.

Fact: Required employee headcount is separate from regulatory required staff and uses average employee monthly hours.

Fact: Partial `COST_RULES` does not fail; only existing categories are calculated.

Fact: Budget coverage tracks unmapped actual expense categories.

## Payroll

Fact: Payroll groups rows by daycare + month using the shared `daycareMonthKey`.

Fact: Payroll preserves dynamic cost fields and aggregates payroll hours/costs.

Fact: Payroll exposes class-level aggregates inside daycare/month groups.

Fact: Payroll separates all payroll cost from staffing-compliance caregiver rows.

Fact: Payroll skips empty rows and rows missing daycare or month.

## Allocations / BANKS

Fact: `api/allocations-engine.js` treats BANKS as an allocation ledger. Rows are allocation rows and are not deduplicated by reference.

Fact: `api/allocations-engine.js` groups by `unitMonthKey(unit, businessMonth)`.

Fact: `api/allocations-engine.js` keeps `תאריך` as `cashDate` and `עבור חודש` as `businessMonth`.

Fact: `api/allocations-engine.js` exposes `פירוט` as `accountingCategory` and keeps `הערות` as free text notes.

Fact: `api/allocations-engine.js` reports rows missing unit or business month as `unmappedRows`.

Fact: `api/allocations-engine.js` normalizes debit and credit values with shekel signs, commas, blanks, decimals, and parentheses.

## Accounting Page

Fact: The dedicated Accounting page is client-side code in `accounting/script.js`.

Fact: Accounting fetches `/api/allocations`.

Fact: Accounting uses calendar months `01/2026` through `12/2027`.

Fact: Accounting uses Israeli bank date parsing for `תאריך` formats such as `DD/MM/YYYY`, `D/M/YYYY`, `DD.MM.YYYY`, and `D.M.YYYY`.

Fact: Accounting sorts source rows by parsed Israeli `תאריך`, newest first, with invalid/empty dates at the bottom.

Fact: Accounting uses the raw BANKS `חשבון` field directly for page grouping, selector values, filtering, KPI counts, overview, statistics, source table display, and CSV export.

Fact: If Accounting `חשבון` is empty, the page displays `לא שויך`.

Fact: Accounting does not infer account names from numeric bank account mappings.

Fact: Accounting no longer uses `מעון` for its page grouping/filtering logic.

Fact: Accounting has manual refresh, automatic refresh every 5 minutes, and back/forward-cache refresh via `pageshow` when `event.persisted === true`.

Fact: Refresh updates data without reloading the page and preserves the selected account, month, status, and active explanation modal state.

Conflict: Existing `docs/organizational-units.md` describes BANKS `עבור מחלקה` as the organizational allocation target. Current Accounting page code uses `חשבון` as its local Accounting grouping source. These are different workflows or documentation generations. Prefer implementation for Accounting behavior.

## Management Dashboard

Fact: `api/management-engine.js` combines budget, payroll, allocations, and employees data.

Fact: Management financial totals keep payroll operational cost separate from actual allocation expenses.

Fact: Special excluded accounting categories are excluded from management financial totals.

Fact: Free-text notes are not used as accounting category logic.

Fact: The engine does not invent capacity when budget data does not expose capacity.

Fact: The dashboard reports allocation data quality and unmapped allocation issues.

Inference, confidence High: The dashboard is management-first and problem-first. Evidence: management intelligence output includes issues, data-quality reporting, possible reports, KPI filters, and action-center style UI.

## Employees

Fact: Employees page fetches `/api/employees`.

Fact: Employee status categories include active, left, maternity leave, sick/accident, unpaid leave, and temporary/other.

Fact: Employee KPIs act as filters.

Fact: Employee date parsing uses Israeli sheet dates and does not rely on browser date parsing.

Fact: Training/compliance statuses include caregiver certificate, graduation, first aid, and safe conduct.

## Occupancy

Fact: Occupancy calculator uses one unified flow without existing/planning or quick/full modes.

Fact: Occupancy supports area-to-children, children-to-required-area, and validation when both values are supplied.

Fact: Default rules include age groups for infants, toddlers, and older children.

Fact: Mixed classrooms allow adjacent age combinations only; invalid non-adjacent combinations are not recommended.

Fact: Occupancy legal alternatives are generated only from active database licensing, staffing, tuition, and operating-hours rules.

Fact: Scenario recommendations rank valid compositions and account for monthly balance.

## Salary

Fact: Salary calculator estimates gross salary from base hourly wage, seniority, monthly hours, class-management eligibility, certificate, and degree fields.

Fact: Net range is estimated as 84%-89% of gross in `salary/script.js`.

# Data Ownership

- Google Sheets owns operational source data.
- API handlers own secure read access and response shaping.
- Engine modules own deterministic parsing and calculations.
- Browser modules own presentation, filtering, refresh behavior, and exports for their page.
- Documentation records decisions but does not override implementation.

# Known Architectural Decisions

## Central Business Rules Module

Decision: Use `config/business-rules.js` for shared runtime rules.

Reason: Engines need importable constants and key helpers instead of relying on UI docs.

Tradeoffs: This adds another documentation surface next to static docs.

Impact: Budget and Payroll share daycare-month key behavior and the 160-hour default.

Future implications: More shared rules may move here only when they are truly shared by multiple modules.

Evidence: `docs/decision-log.md`, `docs/business-rules.md`, `config/business-rules.js`, budget/payroll tests.

Confidence: High.

## BANKS as Allocation Ledger

Decision: Treat BANKS as an allocation ledger, not a deduplicated transaction list.

Reason: A single reference can appear multiple times for business allocation.

Tradeoffs: Row counts and references cannot be treated as unique transaction counts.

Impact: Allocation rows are grouped by organizational unit and business month.

Future implications: Any reporting that needs unique bank transactions must implement separate transaction identity rules.

Evidence: `docs/decision-log.md`, `docs/organizational-units.md`, `api/allocations-engine.js`, `tests/allocations-engine.spec.mjs`.

Confidence: High.

## Static App Plus Serverless APIs

Decision: Build static assets to `dist` and use Vercel Node functions for Sheets-backed APIs.

Reason: Keeps frontend simple while protecting service-account access server-side.

Tradeoffs: Local static server does not implement live API behavior by itself; tests mock or use routes as configured.

Impact: Frontend modules fetch `/api/...`; API modules handle Google Sheets access.

Evidence: `vercel.json`, `scripts/build.mjs`, `scripts/serve.mjs`, API handlers.

Confidence: High.

## Accounting Separated from Budget Engine

Decision: Dedicated Accounting page behavior is implemented in the Accounting page and must not change Budget Engine behavior.

Reason: Accounting workflow and budget calculations answer different business questions.

Tradeoffs: Some BANKS concepts may appear in both workflows but with different meaning.

Impact: Accounting changes must be scoped carefully and verified against Budget tests.

Evidence: Current Accounting implementation, repeated user corrections, stable Budget tests.

Confidence: High.

# UI / UX Standards

Fact: The application is Hebrew and RTL.

Fact: CSS emphasizes responsive behavior across desktop, laptop, and mobile Playwright projects.

Fact: Visual QA tests check core layout and horizontal overflow for major pages.

Fact: Management pages use KPI cards, compact dashboards, filters, source tables, and action-oriented sections.

Inference, confidence Medium: UI should remain dense and operational rather than marketing-like. Evidence: dashboard and management CSS, compact KPI grids, source tables, and action center patterns.

# Dashboard Principles

- Prioritize management visibility over raw data dumps.
- Surface problems and data-quality gaps.
- Keep payroll operational cost separate from actual allocation expenses.
- Do not invent missing capacity.
- Show possible reports based on available data.
- Keep filters and KPIs interactive.
- Preserve responsive layout across desktop and mobile.

# Accounting Principles

- Accounting is a workflow view over BANKS data fetched through `/api/allocations`.
- Accounting page grouping/filtering uses `חשבון` exactly as stored in BANKS.
- Empty `חשבון` displays as `לא שויך`.
- Month filtering is calendar-month based for 2026 and 2027.
- YTD is calendar-year-to-date.
- Source table displays original row context, including `תאריך`, `תיאור תנועה`, `אסמכתא`, `סכום`, `הגדרה`, `עבור מחלקה`, `עבור חודש`, `הנה"ח`, and `הערות`.
- Refresh updates data in place and preserves user state.
- CSV export follows the visible source-row logic.

# Coding Standards

- Use existing module patterns.
- Keep engine code pure and testable.
- Keep browser page scripts self-contained unless a shared utility already exists.
- Use alias-based spreadsheet parsing for engines.
- Keep calculations deterministic.
- Avoid hardcoded live spreadsheet values in engines.
- Preserve root and `chamah-manager-portal/` mirrored static files when both exist.
- Do not edit `dist` directly.
- Use Hebrew labels consistently in UI.
- Use `Intl.NumberFormat('he-IL')` where existing code does.

# Testing Workflow

Run validation appropriate to the files changed.

Common checks:

- `node --check <file>` for changed JavaScript files where applicable.
- `npm run build` after frontend or build-source changes.
- `npx playwright test` for broad UI/engine regression.
- Focused engine tests when calculation logic changes.

Always report tests run, tests not run, and reasons any expected tests were skipped.

Documentation-only changes usually do not require application build or Playwright tests, but they should still be checked for scope: only Markdown files should change.

# Documentation Rules

- Implementation beats stale documentation.
- Mark inferences explicitly.
- Include confidence for inferences.
- Preserve historical documentation.
- Do not silently resolve conflicts; document them.
- Keep permanent rules in `AGENTS.md`.
- Keep chronological implementation history in `PROJECT_LOG.md`.

# Open Questions

- Authentication and permissions are not implemented in the inspected code. Future requirements are unknown.
- The long-term relationship between Accounting `חשבון` and allocations-engine `עבור מחלקה` is unresolved in documentation.
- The rules center is referenced in docs and CSS, but the current route/source status needs verification before future work treats it as implemented.
- The exact production Google Sheet schemas may evolve; code supports aliases, but documentation should be updated when schemas become contractual.

# Future Architecture

## Implemented

- Static Hebrew RTL portal.
- Vercel serverless APIs.
- Google Sheets-backed employees, budget, payroll, and allocations flows.
- Dashboard management intelligence.
- Dedicated Accounting page.
- Salary calculator.
- Occupancy calculator.
- Playwright test suite.

## Planned or Potential

These are not confirmed as implemented unless future code proves otherwise:

- Authentication.
- User permissions.
- Supplier Portal.
- Google Forms integration.
- Email reminders.
- Notifications.
- Broader reporting improvements.
- More formal rules administration.

Inference, confidence Low: Mobile optimization may continue as future work. Evidence: responsive tests exist, but no roadmap file was found.

## Standard TRACK Rules

Every TRACK must:

- Read AGENTS.md and PROJECT_LOG.md before starting.
- Update PROJECT_LOG.md before finishing when the change affects the application, database, infrastructure or business behavior.
- Deploy to Preview first unless Production deployment is explicitly approved.
- Never change business logic, calculations, APIs, schema or RLS unless the TRACK explicitly requires it.
- Preserve backward compatibility unless explicitly approved.
- End with the Standard Completion Report.

### Deployment Consistency Rule

- Never leave the shared environment in a partial deployment state.
- If a migration depends on an Edge Function, or an Edge Function depends on a migration, both must be deployed together before the TRACK is considered complete.

## Standard Completion Report (Mandatory)

Every completed TRACK must end with this exact report.

TRACK:
Status:
Summary:
Root cause:
Files changed:
Database changes:
Migrations:
Edge Functions:
Tests:
Production impact:
Commit SHA:
Branch:
Preview URL:
Production URL (if deployed):
Blockers:
Next recommended TRACK:

Rules:

- Always include every section.
- If a section is not applicable, write "None".
- TRACK must never be empty.
- Always include the TRACK number when the task is part of a numbered TRACK.
- If the task is not part of a numbered TRACK, use `TRACK: INTERNAL` or another appropriate internal identifier.
- Always report the exact Commit SHA.
- Always report whether Production was modified.
- Always state whether Preview or Production was deployed.
- PROJECT_LOG.md is mandatory only for changes that affect the application, database, infrastructure or business behavior.
- Documentation-only tasks, such as changes limited to AGENTS.md, do not require a PROJECT_LOG.md update.
- The Completion Report for a documentation-only task must explicitly state that the task was documentation-only.
- When PROJECT_LOG.md is required, always update it before returning the report.
