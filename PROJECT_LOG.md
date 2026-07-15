# Project Log

This file is the permanent engineering journal for the repository.

Rules for future entries:

- Append chronologically.
- Never overwrite or delete previous entries.
- Keep implementation history separate from permanent rules.
- Record tests run and tests not run.
- Mark uncertain historical details as inference.

## 2026-07-02 - Centralized Business Rules Foundation

Objective: Create a shared runtime source for engine business rules.

Files changed:

- `config/business-rules.js`
- Budget engine imports
- Payroll engine imports
- Related tests
- Existing documentation under `docs/`

Technical decisions:

- Centralized `DEFAULT_AVERAGE_EMPLOYEE_MONTHLY_HOURS = 160`.
- Centralized `daycareMonthKey(daycare, month)`.
- Kept rules documentation separate from runtime engine rules.

Business decisions:

- Budget calculations are grouped by daycare + month.
- Payroll calculations are grouped by daycare + month.
- Required employee headcount uses the average monthly hours default.

Tests:

- Existing docs say tests were added to prove stable outputs.

Remaining issues:

- Future work may generate rules UI data from `config/business-rules.js`.

Recommended next step:

- Move additional shared rules into `config/business-rules.js` only when multiple modules need them.

Evidence:

- `docs/decision-log.md`
- `docs/business-rules.md`
- `config/business-rules.js`

## 2026-07-02 - Organizational Units and Allocations Foundation

Objective: Add an allocation model for BANKS rows.

Files changed:

- `config/organizational-units.js`
- `config/business-rules.js`
- `api/allocations-engine.js`
- `api/allocations.js`
- Allocation tests
- Existing documentation under `docs/`

Technical decisions:

- Added organizational unit metadata.
- Added `unitMonthKey(unit, month)`.
- Added `/api/allocations`.
- Treated BANKS rows as allocation ledger rows.

Business decisions:

- BANKS allocation rows are not deduplicated by reference.
- Allocation reporting grain is organizational unit + business month.
- Final profit/loss is not calculated in the allocation layer.

Tests:

- Allocation tests cover grouping, duplicate references, month/date separation, category/notes handling, unmapped rows, and number parsing.

Remaining issues:

- Existing docs describe `עבור מחלקה` as the allocation unit. Current Accounting page uses `חשבון` for its own Accounting workflow.

Recommended next step:

- Clarify long-term relationship between allocation units and Accounting account grouping.

Evidence:

- `docs/decision-log.md`
- `docs/organizational-units.md`
- `api/allocations-engine.js`
- `tests/allocations-engine.spec.mjs`

## Inference, Confidence High - Dashboard and Management Intelligence Expansion

Date: Unknown.

Objective: Build a management dashboard combining budget, payroll, allocations, and employees data.

Files changed:

- `api/management-engine.js`
- `dashboard/index.html`
- `dashboard/script.js`
- Dashboard CSS
- Management tests

Technical decisions:

- Management intelligence is built from existing API payload shapes.
- Payroll operational cost is kept separate from allocation actuals.
- Data quality and possible reports are explicit outputs.

Business decisions:

- Do not invent capacity when budget data does not expose it.
- Exclude special accounting category rows from management financial totals.
- Do not use free-text notes as accounting category logic.

Tests:

- `tests/management-engine.spec.mjs`.
- Responsive visual layout tests include dashboard.

Remaining issues:

- Exact original implementation date is not documented in existing markdown.

Recommended next step:

- Add dated entries for future dashboard changes as they occur.

Evidence:

- `api/management-engine.js`
- `dashboard/script.js`
- `tests/management-engine.spec.mjs`

## Inference, Confidence High - Employees Management Module

Date: Unknown.

Objective: Provide employee filtering, compliance KPIs, detail views, and exports.

Files changed:

- `api/employees.js`
- `employees/index.html`
- `employees/script.js`
- Employee CSS
- Employee tests

Technical decisions:

- Employees data is fetched from `/api/employees`.
- KPI cards act as filters.
- Israeli sheet dates are parsed without relying on browser date parsing.

Business decisions:

- Employee statuses include active, left, maternity leave, sick/accident, unpaid leave, and temporary/other.
- Compliance attention includes caregiver certificate, first aid, safe conduct, and graduation/training dates.

Tests:

- `tests/employees-kpis.spec.mjs`.
- `tests/israeli-dates.spec.mjs`.
- Responsive visual layout tests include employees.

Remaining issues:

- Exact original implementation date is not documented in existing markdown.

Recommended next step:

- Keep employee KPI behavior covered whenever filters or status rules change.

Evidence:

- `employees/script.js`
- `tests/employees-kpis.spec.mjs`
- `tests/israeli-dates.spec.mjs`

## Inference, Confidence High - Occupancy Calculator

Date: Unknown.

Objective: Support daycare classroom occupancy, staffing, area, and scenario planning.

Files changed:

- `occupancy/index.html`
- `occupancy/script.js`
- Occupancy CSS
- Occupancy tests

Technical decisions:

- Calculator supports quick and full modes.
- Scenario alternatives are generated client-side.
- Missing area disables area-based alternatives.

Business decisions:

- Mixed classrooms must use adjacent age groups.
- Recommendations prioritize valid compositions and monthly balance.

Tests:

- `tests/occupancy.spec.mjs`.

Remaining issues:

- Exact original implementation date is not documented in existing markdown.

Recommended next step:

- Preserve tests around invalid non-adjacent mixed classrooms when changing recommendation logic.

Evidence:

- `occupancy/script.js`
- `tests/occupancy.spec.mjs`

## Inference, Confidence Medium - Salary Calculator

Date: Unknown.

Objective: Estimate salary components and net range.

Files changed:

- `salary/index.html`
- `salary/script.js`
- Salary CSS
- Salary tests

Technical decisions:

- Calculator is client-side.
- Net range is estimated as 84%-89% of gross.

Business decisions:

- Salary estimate includes base hourly wage, seniority, monthly hours, management eligibility, certificate, and degree inputs.

Tests:

- `tests/salary.spec.mjs`.

Remaining issues:

- Exact original implementation date is not documented in existing markdown.

Recommended next step:

- Document payroll/legal assumptions if salary calculator becomes contractual.

Evidence:

- `salary/script.js`
- `tests/salary.spec.mjs`

## 2026-07-06 - Accounting Page Source-of-Truth Correction

Objective: Make the dedicated Accounting page use BANKS `חשבון` directly as the account/daycare grouping field.

Files changed:

- `accounting/index.html`
- `accounting/script.js`
- `chamah-manager-portal/accounting/index.html`
- `chamah-manager-portal/accounting/script.js`

Technical decisions:

- Accounting reads raw `חשבון` directly.
- Accounting does not use numeric bank account mappings.
- Accounting does not use `מעון` for page grouping/filtering.
- Empty `חשבון` displays as `לא שויך`.
- Source table and CSV export include `חשבון`, `תאריך`, `תיאור תנועה`, `אסמכתא`, `סכום`, `הגדרה`, `עבור מחלקה`, `עבור חודש`, `הנה"ח`, and `הערות`.

Business decisions:

- For the Accounting page, `חשבון` is the business source of truth.
- Accounting changes are scoped away from Budget Engine and API behavior.

Tests:

- Accounting script syntax parse.
- `npm run build`.
- `node --check api\budget-engine.js`.
- `npx playwright test` passed with 216 tests.

Remaining issues:

- Existing older docs describe allocation grouping through `עבור מחלקה`; this differs from Accounting page grouping through `חשבון`.

Recommended next step:

- If the business wants Budget or allocation APIs to use the updated `חשבון` schema too, request that as a separate explicit API/Budget task.

## 2026-07-06 - Project Engineering Handbook and Log

Objective: Create permanent AI/developer project memory and implementation history.

Files changed:

- `AGENTS.md`
- `tests/salary.spec.mjs`
- `PROJECT_LOG.md`

Technical decisions:

- Keep permanent rules in `AGENTS.md`.
- Keep chronological milestones in `PROJECT_LOG.md`.
- Preserve existing `docs/` files and document conflicts rather than replacing them.

Business decisions:

- Implementation remains the source of truth when documentation differs from code.

Tests:

- Documentation-only change. No application tests required.

Remaining issues:

- Existing docs should be reconciled later if the business finalizes one unified BANKS schema across Accounting and allocations.

Recommended next step:

- Future implementation sessions should append to this log after completing work.

## 2026-07-06 - Documentation Quality Audit for Permanent Handbook

Objective: Review and improve `AGENTS.md` and `PROJECT_LOG.md` before treating them as permanent project memory.

Documentation improvements:

- Added a dedicated Engineering Workflow section with the required pre-implementation process.
- Added a dedicated AI Session Workflow section for future AI agents.
- Clarified generated-output boundaries for `dist/` and test report folders.
- Clarified API no-store caching behavior across inspected API handlers.
- Added a Data Ownership section separating Sheets, API handlers, engines, browser modules, and documentation responsibilities.
- Tightened the open question around the rules center to reflect docs/CSS evidence without claiming an implemented route.
- Added guidance that documentation-only changes usually do not require app builds or Playwright tests, but must be scoped to Markdown.

Reason for the changes:

- The original handbook captured project knowledge but did not make the requested engineering and AI workflows explicit enough for permanent use.
- The audit found a few durable implementation conventions worth documenting for future maintainability.

Files updated:

- `AGENTS.md`
- `PROJECT_LOG.md`

Tests:

- Documentation-only change. No application tests required.

Remaining issues:

- The relationship between Accounting `חשבון` grouping and allocation-engine `עבור מחלקה` grouping remains an intentional documented conflict/open question.
- Existing `README.md` remains stale relative to current modules.

## 2026-07-07 - Salary Certificate Help Tooltip

Objective: Add inline guidance for the Salary Calculator certificate/commitment hourly supplement without changing salary calculations.

Files changed:

- `salary/index.html`
- `chamah-manager-portal/salary/index.html`
- `assets/styles.css`
- `chamah-manager-portal/assets/styles.css`

Technical decisions:

- Added a small reusable CSS-only info tooltip using hover and focus states.
- Kept Salary Calculator JavaScript and payroll calculations unchanged.

Business decisions:

- The UI now clarifies that the certificate/commitment supplement is calculated automatically and base hourly wage should be entered before that supplement.

Tests:

- `npm run build` passed.
- `npx playwright test salary.spec.mjs` passed with 8 tests.
- `node --check dashboard\script.js` passed.

Remaining issues:

- None known.

## 2026-07-07 - Salary Tooltip and Print Layout Refinement

Objective: Improve the Salary Calculator certificate tooltip display and make printed salary estimates include input details before calculation results.

Files changed:

- `assets/styles.css`
- `chamah-manager-portal/assets/styles.css`
- `tests/salary.spec.mjs`
- `PROJECT_LOG.md`

Technical decisions:

- Kept the existing tooltip markup and refined the shared CSS so the tooltip opens compactly inside the certificate field instead of overlaying nearby controls.
- Added salary-specific print CSS after the salary styles so input details print before results while interactive controls remain hidden.
- Added focused Salary Calculator QA coverage for tooltip geometry and print ordering.
- Left Salary Calculator JavaScript, calculations, APIs, and business logic unchanged.

Business decisions:

- None. This is a presentation-only refinement.

Tests:

- `npm run build` passed.
- `npx playwright test salary.spec.mjs` passed with 16 tests.

Remaining issues:

- None known.

## 2026-07-08 - Documentation Repository Structure

Objective: Create an isolated documentation-only folder structure for future architecture planning and business handbook work.

Files changed:

- `docs/README.md`
- `docs/handbook/README.md`
- `docs/handbook/calendar-rules.md`
- `docs/handbook/children-rules.md`
- `docs/handbook/classroom-rules.md`
- `docs/handbook/staffing-rules.md`
- `docs/handbook/roles-rules.md`
- `docs/handbook/payroll-rules.md`
- `docs/handbook/tuition-rules.md`
- `docs/handbook/budgeting-rules.md`
- `docs/handbook/accounting-rules.md`
- `docs/handbook/banking-rules.md`
- `docs/handbook/organization-rules.md`
- `docs/handbook/reporting-rules.md`
- `docs/architecture/README.md`
- `docs/architecture/architecture.md`
- `docs/architecture/database.md`
- `docs/architecture/sync.md`
- `docs/architecture/api.md`
- `docs/architecture/security.md`
- `docs/architecture/roadmap.md`
- `docs/specifications/README.md`
- `docs/decisions/README.md`
- `PROJECT_LOG.md`

Technical decisions:

- Added empty documentation templates only.
- Kept the documentation scaffold isolated under `docs/`.
- Left existing application code, APIs, runtime configuration, tests, and generated output unchanged.

Business decisions:

- None. This was documentation structure only.

Tests:

- Application validation was not required because this was documentation-only work.

Remaining issues:

- The templates intentionally contain no project-specific business content yet.

## 2026-07-13 - Supabase Foundation Migration Preparation

Objective: Prepare Phase 1 managed Supabase migration foundations for project `vyyfuaqmbxvfqgbfqooc` without changing the current application, APIs, calculations, UI, Google Sheets, or business tables.

Files changed:

- `.gitignore`
- `supabase/config.toml`
- `supabase/migrations/20260713000100_database_foundations.sql`
- `PROJECT_LOG.md`

Technical decisions:

- Added local Supabase configuration pointing at project ref `vyyfuaqmbxvfqgbfqooc`.
- Ignored local Supabase state and secret-bearing files under `supabase/.branches`, `supabase/.temp`, and `supabase/.env`.
- Created a foundation-only migration with `pgcrypto` and a shared `public.set_updated_at()` trigger function.
- Did not create business tables, seed data, API code, Edge Functions, Google Sheets sync, or portal changes.

Business decisions:

- None. This was infrastructure preparation only.

Validation:

- Read `AGENTS.md`, `PROJECT_LOG.md`, every file under `docs/handbook/`, and every file under `docs/data/`.
- Verified the connected Supabase MCP account did not expose target project access: project details, SQL execution, migration listing/application, and security/performance advisors for `vyyfuaqmbxvfqgbfqooc` returned permission errors.
- Verified the Supabase CLI is not installed in the shell environment.

Tests not run:

- Migration application and live database verification could not be completed because the connected Supabase account lacks permission to project `vyyfuaqmbxvfqgbfqooc`.
- Git branch creation and commit could not be completed because `.git` is denied for write operations in the current sandbox.
- Application build and Playwright tests were not run because no application source, API, calculation, UI, or generated deployment output was changed.

Remaining issues:

- Supabase project access must be corrected before applying Migration 001, inspecting project state, or running advisors.
- Git write access to `.git` must be corrected before creating the required branch and commit.

## 2026-07-13 - Supabase Phase 1 Recovery Verification

Objective: Complete the Phase 1 recovery pass for Supabase project `vyyfuaqmbxvfqgbfqooc` and verify the foundation migration state without starting Migration 002.

Files changed:

- `.gitignore`
- `supabase/config.toml`
- `supabase/migrations/20260713133220_database_foundations.sql`
- `PROJECT_LOG.md`

Technical decisions:

- Verified the linked Supabase project is `vyyfuaqmbxvfqgbfqooc`, project name `chamah-manager`, region `eu-west-1`, status `ACTIVE_HEALTHY`.
- Verified PostgreSQL version is PostgreSQL 17.6.
- Confirmed the target database is not empty: public business tables and later database migrations already exist in the linked project.
- Confirmed the remote migration history already records `database_foundations` as version `20260713133220`.
- Aligned the local foundation migration filename and SQL with the recorded remote migration.
- Did not create Migration 002, business tables, seed data, API code, Edge Functions, Google Sheets sync, portal changes, or generated output.

Validation:

- Confirmed `pgcrypto` exists in the `extensions` schema.
- Confirmed `public.set_updated_at()` exists and sets `updated_at` using `timezone('utc', now())`.
- Confirmed critical security advisors reported no issues.
- Confirmed critical performance advisors reported no issues.
- Confirmed `supabase db push --linked --dry-run` refuses to run because remote migration history contains later versions that are not present locally.

Tests not run:

- Application build and Playwright tests were not run because no application source, API, calculation, UI, or generated deployment output was changed.

Remaining issues:

- The linked Supabase project has remote migration history beyond Phase 1 that is not represented in the local repository.
- Future migration work should reconcile remote migration history before attempting another `supabase db push`.

## 2026-07-13 - Database Schema Freeze v1 Corrections

Objective: Finalize Database Structure Freeze v1 for Supabase project `vyyfuaqmbxvfqgbfqooc` while keeping the existing schema and preserving migrations 001-010.

Files changed:

- `supabase/migrations/20260713201414_schema_freeze_v1_corrections.sql`
- `docs/data/data-dictionary.md`
- `docs/data/final-design-review.md`
- `docs/data/final-architecture-closure.md`
- `docs/data/decision-log.md`
- `docs/data/relationship-matrix.md`
- `docs/data/diagrams/erd.md`
- `docs/data/open-questions.md`
- `docs/data/README.md`
- `docs/data/architecture-overview.md`
- `docs/data/entity-inventory.md`
- `docs/data/google-sheets-sync-model.md`
- `docs/data/migration-strategy.md`
- `docs/data/source-map.md`
- `docs/data/source-of-truth-model.md`
- Relevant table docs under `docs/data/tables/`
- `PROJECT_LOG.md`

Technical decisions:

- Kept all 33 existing public tables.
- Left migrations 001-010 unchanged.
- Added one corrective Migration 011.
- Aligned bank accounting status codes, budget category types, budget rule contracts, data quality statuses, bank source amount fields, allocation target integrity, and finalized payroll allocation reconciliation with the Handbook.
- Kept `allocation_units` flat and authoritative for bank/payroll allocation targets.
- Kept RLS enabled and deferred API/auth policies.

Business decisions:

- The current schema is kept and corrected, not rebuilt.
- Dynamic budget results remain runtime calculations until explicit lock.
- `budget_snapshots` stores immutable locked snapshots.
- No visible Budget tab is added to Google Sheets v1.

Validation:

- Confirmed migrations 001-010 have no local diff.
- Confirmed no table drops or data deletion statements were introduced.
- Confirmed stale docs no longer claim only year tables are approved, that `organization_units` hierarchy is required, that `allocation_units` is a deviation, or that schema rebuild is required.
- Applied Migration 011 to Supabase project `vyyfuaqmbxvfqgbfqooc`.
- Confirmed Migration 011 is recorded remotely.
- Confirmed all 33 public tables remain and no unexpected table was added.
- Confirmed the new columns, constraints, functions, and triggers exist.
- Confirmed rollback-safe validation inserts blocked invalid bank amounts, ambiguous allocation targets, Approved Ignore without metadata, and unreconciled finalized payroll allocations.
- Confirmed rollback validation left `0` rows in public tables.
- Confirmed RLS remains enabled on all 33 public tables and no public policies were added.
- Confirmed Supabase security advisors reported no error-level findings.
- Confirmed Supabase performance advisors reported no error-level findings.

Tests not run:

- Application build and Playwright tests were not run because no portal, API, calculation, Google Sheets, or UI files changed.

## 2026-07-15 - Recover Deployed New Portal Source

Objective: Recover the exact `/new/` Preview deployment artifacts into Git without changing application behavior, Supabase configuration, APIs, calculations, database files, or deployment state.

Files changed:

- `.gitattributes`
- `chamah-manager-portal/new/index.html`
- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/styles.css`
- `PROJECT_LOG.md`

Technical decisions:

- Recovered the HTML, JavaScript, CSS, and SVG bytes directly from `https://chamah-manager-portal-v2-preview.vercel.app`.
- Kept the recovered source under `chamah-manager-portal/`, which the existing build script already copies recursively into `dist`.
- Changed no build or routing code because the existing recursive copy publishes `/new/` without additional support.
- Preserved `email_redirect_to:location.href.split(/[?#]/)[0]` exactly as deployed.
- Confirmed the existing Git blob for both mirrored logo sources is byte-identical to the deployed SVG.
- Added file-specific LF attributes so Windows checkouts preserve the deployed artifact bytes.

Validation:

- Confirmed all four deployable source files match the live Preview artifacts by exact byte size and SHA-256 hash.
- `npm run build` passed.
- Confirmed `dist/new/index.html`, `dist/new/app.js`, and `dist/new/styles.css` exist and match their source hashes.
- Confirmed `dist/assets/chamah-logo.svg` matches the live Preview hash.
- Confirmed the database branch remained clean and unchanged.

Tests not run:

- The broader Playwright suite was not run because this was byte-for-byte source recovery with no logic changes; exact artifact hash comparison plus build/static-output validation was the smallest reliable check.

Remaining issues:

- The original local creation history remains unavailable; Git now preserves the exact currently deployed artifacts as the recovery source.

## 2026-07-15 - Temporary Canonical Preview Authentication Bypass

Objective: Allow testing without a Magic Link only on the canonical Preview-project hostname.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/index.html`
- `PROJECT_LOG.md`

Technical decisions:

- Added one clearly named temporary Preview hostname constant and an exact-host helper.
- The bypass activates only when `location.hostname === 'chamah-manager-portal-v2-preview.vercel.app'`.
- Preview bypass requests without a session omit the Authorization header but continue using the publishable key and remain subject to Supabase RLS; existing authenticated sessions keep their Authorization header.
- Preserved the existing Magic Link flow, callback handling, redirect behavior, and authenticated REST headers on every other hostname.
- Added a small visible Preview-only banner: `מצב בדיקה — כניסה ללא אימות`.

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `npm run build` passed.
- Confirmed the built output contains the exact hostname gate and unchanged Magic Link redirect expression.

Tests not run:

- The broader Playwright suite was not run because the change is isolated to the recovered `/new/` authentication entry gate and static banner.

Remaining issues:

- This bypass is intentionally temporary and must be removed before launch by deleting the constant/helper, the bypass branches in `rest()` and startup, and the Preview banner markup.

## 2026-07-15 - Preview Authentication Bypass Display Fix

Objective: Ensure the canonical Preview authentication bypass visually skips the login form.

Files changed:

- `chamah-manager-portal/new/app.js`
- `PROJECT_LOG.md`

Root cause:

- The hostname condition evaluated to true and the startup bypass ran.
- Startup set the login section's `hidden` property, but `.login-shell { display: grid }` overrode the browser's default `[hidden] { display: none }`, leaving the login form rendered over the active dashboard.

Technical decision:

- Changed only the successful startup path to set `#login-view` to inline `display: none`, which takes precedence over the existing `.login-shell` rule.
- Preserved the exact hostname condition, Magic Link flow, Supabase behavior, APIs, database, RLS, and UI structure.

Validation:

- Confirmed the deployed pre-fix hostname comparison returned `true` while computed login display remained `grid`.
- `node --check chamah-manager-portal/new/app.js` passed.
- `npm run build` passed.
- Browser verification on the canonical Preview URL confirmed the login form is not rendered and the dashboard opens directly.

Remaining issues:

- The bypass remains temporary and must still be removed before launch.

## 2026-07-15 - New Portal Sprint 1 Foundation

Objective: Build the permanent Hebrew RTL application shell, navigation, home page, and design-system foundation for the new portal only, without implementing business modules.

Files changed:

- `chamah-manager-portal/new/index.html`
- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/styles.css`
- `tests/new-portal-foundation.spec.mjs`
- `tests/new-portal-screenshots.spec.mjs`
- `screenshots/new-portal-foundation/desktop-home.png`
- `screenshots/new-portal-foundation/tablet-home.png`
- `screenshots/new-portal-foundation/mobile-home.png`
- `PROJECT_LOG.md`

Technical decisions:

- Kept Sprint 1 isolated under `/new/` and preserved the existing Magic Link flow and temporary canonical Preview hostname bypass.
- Replaced the recovered business-dashboard landing screen with a reusable hash-routed portal shell containing a header, desktop sidebar, main content area, breadcrumbs, mobile drawer, and bottom mobile navigation.
- Added a Portal Home with five navigation cards: Dashboards, Calculators, Tasks, Maintenance, and Knowledge Center.
- Routed every Sprint 1 module destination to a consistent professional `בקרוב` screen; no business module logic or data fetching was added.
- Added reusable design-system primitives for buttons, cards, panels, fields, tables, status badges, empty/loading/error states, typography, spacing, colors, shadows, radii, focus states, transitions, and reduced-motion support.
- Used `Intl.DateTimeFormat('he-IL')` for the shell date and retained Hebrew-only user-facing copy.
- Embedded the portal mark as accessible SVG inside the new shell so it renders consistently without changing the shared production site or local server configuration.
- Added focused Playwright coverage for RTL, five-card navigation, placeholder routing, mobile navigation, and horizontal overflow.
- Added deterministic screenshot coverage for desktop 1440x900, tablet 820x1180, and mobile 390x844.

Scope preserved:

- Did not change the existing production portal source, APIs, calculation engines, database, Supabase schema, business rules, package files, Vercel settings, or deployment state.
- Verified the connected Vercel project before implementation as `chamah-manager-portal-v2-preview` (`prj_6IND7ee2E9s3KispBh6iBDWwQo6X`).

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `npm run build` passed.
- Focused new-portal Playwright suite passed in desktop, laptop, and two mobile projects: 12 passed.
- Screenshot generation suite passed: 1 passed.
- Full `npx playwright test` regression passed: 237 passed, 3 intentionally skipped screenshot duplicates.
- Visual inspection confirmed correct RTL presentation, responsive navigation, stable tablet/mobile layouts, visible embedded logo, large touch targets, and no horizontal overflow.

Remaining issues:

- The canonical Preview authentication bypass is still temporary and must be removed before launch as documented in the preceding entries.
- Business modules remain intentionally unimplemented and display `בקרוב` until future sprints.

## 2026-07-15 - Codex Prompt Guidelines

Objective: Add permanent project guidance for concise, implementation-focused Codex prompts.

Files changed:

- `AGENTS.md`
- `PROJECT_LOG.md`

Documentation decisions:

- Added a dedicated `Prompt Guidelines` section covering prompt scope, implementation value, architecture reuse, database ownership, avoidance of hardcoded business data, UI component reuse, and current-sprint focus.
- Kept the requested rules concise and separate from application behavior.

Validation:

- Confirmed only Markdown documentation files changed.
- Application build and Playwright tests were not required because no application code, APIs, calculations, database files, or generated output changed.

Remaining issues:

- None known.

## 2026-07-15 - Secure Supabase Magic Link Authentication

Objective: Remove the temporary Preview authentication bypass and complete the real Supabase Magic Link session lifecycle for the canonical new portal.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/index.html`
- `chamah-manager-portal/new/styles.css`
- `tests/new-portal-auth.spec.mjs`
- `tests/new-portal-foundation.spec.mjs`
- `tests/new-portal-test-data.mjs`
- `PROJECT_LOG.md`

Implementation:

- Removed the Preview hostname bypass, bypass banner, banner styling, and all associated temporary conditions.
- Fixed Magic Link requests to use the fixed canonical redirect `https://chamah-manager-portal-v2-preview.vercel.app/new/` and disabled automatic user creation.
- Added callback token persistence, callback parameter cleanup, session validation, automatic access-token refresh, authenticated-only protected reads, and full remote/local logout behavior.
- Added focused authentication coverage for anonymous access, Magic Link request options, callback handling, persistence, refresh, protected reads, and logout.
- Updated existing new-portal helpers to model a complete authenticated Supabase session and validate it through the Auth user endpoint.

Root cause:

- The previous client derived its redirect from the current browser location, so a request made from local development explicitly selected `localhost`.
- The direct Auth request also placed the redirect inside a client-library-style nested body instead of the Auth endpoint's `redirect_to` query parameter, allowing the configured Site URL fallback to determine the destination.

Scope preserved:

- Did not modify RLS, database schema, database permissions, Supabase data, APIs, calculations, business rules, package files, or the existing `cmh-ops` website.

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `npm run build` passed.
- Focused new-portal authentication, foundation, and dashboards suite passed across desktop, laptop, and two mobile profiles: 57 passed, 3 conditionally skipped.
- Full `npx playwright test` regression passed: 282 passed, 6 intentionally skipped viewport-specific duplicates.
- Supabase Auth logs confirmed historical Magic Link requests used a `http://localhost:3000` referer.

Remaining issues:

- Supabase Auth URL Configuration could not be read or changed through the connected database integration, and the available Dashboard browser session was not signed in. It must be verified before the real-email callback acceptance check.

## 2026-07-15 - Email OTP Authentication

Objective: Replace Magic Link authentication with a same-page six-digit Supabase email OTP flow.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/index.html`
- `chamah-manager-portal/new/styles.css`
- `tests/new-portal-auth.spec.mjs`
- `PROJECT_LOG.md`

Implementation:

- Replaced redirect-based Magic Link requests with `/auth/v1/otp` requests for existing users only.
- Added a same-page six-digit code step that verifies through `/auth/v1/verify` using `email`, `token`, and `type: email`.
- Persisted the returned access token, refresh token, and expiry through the existing session mechanism.
- Preserved session validation, automatic access-token refresh, authenticated protected reads, and full Supabase logout.
- Added Hebrew states for sent, invalid, expired, rate-limited, and pending requests, plus a visible 60-second resend countdown.
- Removed Magic Link callback parsing, redirect targets, and URL token cleanup because the OTP flow has no browser redirect.

Scope preserved:

- Did not modify database schema, RLS, database permissions, APIs, calculations, business rules, package files, or `cmh-ops`.

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `npm run build` passed.
- Focused authentication, foundation, and dashboards Playwright coverage passed across desktop, laptop, and two mobile profiles: 65 passed, 3 conditionally skipped.
- Full `npx playwright test` regression passed: 290 passed, 6 intentionally skipped viewport-specific duplicates.

Remaining issues:

- The hosted Supabase Magic Link email template could not be verified because the available Dashboard browser session was not authenticated. Before live OTP validation, the template must be changed to display `{{ .Token }}` and must not offer `{{ .ConfirmationURL }}` as the sign-in action.

## 2026-07-15 - Email and Password Authentication

Objective: Replace passwordless authentication with Supabase email and password login for existing authorized users.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/index.html`
- `chamah-manager-portal/new/styles.css`
- `tests/new-portal-auth.spec.mjs`
- `PROJECT_LOG.md`

Implementation:

- Removed the OTP request, verification, resend, countdown, and code-entry flow.
- Added a Hebrew RTL email/password form with password visibility control, pending-state submission protection, and non-enumerating invalid-credentials feedback.
- Implemented the Supabase password grant used by `signInWithPassword` and persisted the returned access token, refresh token, and expiry.
- Preserved existing session validation, automatic refresh, authenticated protected reads, and remote/local logout.
- Kept public signup and password recovery absent from the portal.

Security:

- No password was hardcoded, committed, stored in environment configuration, logged, or written to tests or documentation.
- Tests generate disposable input values at runtime and use mocked Supabase Auth responses.

Scope preserved:

- Did not modify database schema, RLS, database permissions, APIs, calculations, business rules, package files, or `cmh-ops`.

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `npm run build` passed.
- Focused password authentication coverage passed across desktop, laptop, and two mobile profiles: 24 passed.
- Full `npx playwright test` regression passed: 286 passed, 6 intentionally skipped viewport-specific duplicates.

Remaining issues:

- A real password is not available to this session and was not requested or handled. Live password login and authenticated RLS reads remain pending until the existing user securely establishes a password.
- Supabase Dashboard exposes password recovery for an existing user rather than a direct plaintext password field. Completing that recovery requires an authenticated password-update screen, which is intentionally outside this task's scope.

## 2026-07-15 - Password Recovery Completion

Objective: Add the minimal secure recovery-session screen required for the existing user to establish a password.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/index.html`
- `chamah-manager-portal/new/styles.css`
- `tests/new-portal-auth.spec.mjs`
- `PROJECT_LOG.md`

Implementation:

- Added a Hebrew RTL password-recovery completion form under `/new/` while preserving the existing email/password login.
- Processes only Supabase recovery callbacks, persists the recovery access and refresh tokens, and immediately removes secret callback parameters from the browser URL.
- Validates a minimum of 10 characters with at least one letter and one number, plus matching confirmation.
- Updates the authenticated recovery user through the normal Supabase user endpoint, equivalent to `updateUser({ password })`.
- Preserves the authenticated session after success, returns to portal home, and keeps automatic refresh, RLS reads, dashboard navigation, and logout unchanged.
- Added Hebrew states for expired, invalid, and already-used recovery links.

Security:

- No service-role key, SQL, Admin API, password value, or public signup was introduced.
- Password values are submitted directly from the browser to Supabase Auth and are not stored by portal code.

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `npm run build` passed.
- Focused authentication and recovery coverage passed across desktop, laptop, and two mobile profiles: 36 passed.
- Full `npx playwright test` regression passed: 298 passed, 6 intentionally skipped viewport-specific duplicates.

Remaining issues:

- Live recovery email, password update, subsequent password login, and production RLS reads require the existing user to trigger and complete the Dashboard Reset Password action after deployment.
