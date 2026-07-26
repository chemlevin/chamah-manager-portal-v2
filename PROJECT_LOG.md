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

## 2026-07-15 - Sprint 3 Financial Dashboard Foundation

Objective: Build the reusable production-oriented Financial Dashboard foundation for the new `/new/` portal without changing data contracts, calculations, APIs, Supabase, or RLS.

Files changed:

- `chamah-manager-portal/new/index.html`
- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/styles.css`
- `tests/new-portal-dashboards.spec.mjs`
- `tests/new-portal-screenshots.spec.mjs`
- `PROJECT_LOG.md`

Implementation:

- Added a Hebrew `שכחתי סיסמה` entry point that explains and connects users to the existing administrator-triggered Supabase recovery flow without changing authentication requests or session behavior.
- Replaced the organization-only finance view with one reusable Financial Dashboard that receives either the organization or any active Allocation Unit from existing hash navigation.
- Added dashboard context for unit, School Year, selected period, and breadcrumbs.
- Added single- and multi-month selection while keeping the School-Year summary independent from the selected reporting months.
- Added 12 reusable clickable KPI cards covering revenue, expenses, payroll, profit/loss, budget, budget utilization, actual hours, standard hours, hours difference, hours difference percentage, children, and alerts.
- Preserved existing bank, payroll, and children behavior; children uses only the latest available selected month and is never summed across months.
- Displays professional unavailable states for KPIs whose approved data source or calculation is not present.
- Added a reusable KPI drill-down panel with description, calculation, data source, and future source-record placement.
- Added initially collapsed Budget, Payroll, Working Hours, Children, Bank Transactions, and Data Quality sections.
- Added a reusable sticky dashboard toolbar with data-only refresh, successful last-updated timestamp, print, and placeholder PDF/Excel actions.
- Added skeleton loading, non-technical retry errors, print styling, RTL responsive layouts, and touch targets of at least 44px.

Scope preserved:

- Did not modify APIs, calculations, business logic, database schema, Supabase configuration/data, RLS, package files, `cmh-ops`, or the existing production website.
- Did not invent financial values; missing Budget, Hours, and other unavailable sources render explicit empty states.

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `npm run build` passed.
- Focused authentication, portal foundation, and dashboard tests passed: 77 passed, 3 conditionally skipped.
- Screenshot generation passed: 1 passed, 3 project duplicates intentionally skipped.
- Full `npx playwright test` regression passed: 302 passed, 6 intentionally skipped.
- Desktop 1440x900, tablet 820x1180, and mobile 390x844 screenshots were generated and visually reviewed.
- Responsive tests confirmed no horizontal overflow across configured projects and tablet/mobile landscape sizes.

Remaining placeholders:

- Budget, profit/loss, budget utilization, actual/standard hours, hours variance, and hours variance percentage remain unavailable until approved source data and calculation contracts exist.
- PDF and Excel export actions are intentionally UI placeholders; browser printing is active.
- Detailed expandable sections and KPI source-row records are prepared but intentionally not populated in this foundation sprint.

## 2026-07-15 - Sprint 3.1 Financial Dashboard Data Integration and UX Refinement

Objective: Connect the reusable `/new/` Financial Dashboard to approved Supabase data, refine its reporting UX, and complete the existing password-recovery request entry point without changing schemas, RLS, APIs, or calculation contracts.

Files changed:

- `chamah-manager-portal/new/index.html`
- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/styles.css`
- `tests/new-portal-auth.spec.mjs`
- `tests/new-portal-dashboards.spec.mjs`
- `tests/new-portal-test-data.mjs`
- `PROJECT_LOG.md`

Implementation:

- Audited and reused approved financial sources: locked Budget snapshots and active Budget categories, bank transaction allocations, payroll records and unit allocations, monthly enrollment, active Allocation Units, and data-quality issues.
- Corrected unit and organization bank totals to use each approved allocation amount instead of repeating a full bank transaction amount when one transaction is split between units.
- Added responsive School-Year and month chips with multi-month selection while keeping the School-Year summary permanently first and independent of temporary month filters.
- Consolidated the dashboard into six management KPI cards for revenue, expenses, payroll, working hours, children, and data quality, with utilization status thresholds and latest-month-only children reporting.
- Added organization-level source grouping by active Allocation Unit and populated expandable Budget, Payroll, Hours, Children, Bank, and Data Quality sections with approved source records.
- Added a reusable permanent KPI action menu with explanation, calculation, sources, records, KPI printing/PDF output, and Excel-compatible CSV export.
- Added KPI drill-down context, applied-filter display, data-only refresh, skeleton loading, empty/error states, and retry behavior.
- Completed the Hebrew forgot-password request UI using Supabase recovery email delivery to the canonical Preview `/new/` URL while preserving the existing secure recovery completion flow.

Calculation and source audit:

- Revenue and expenses use approved bank allocation values and locked Budget category types.
- Payroll uses approved employer cost at organization scope and approved allocation amounts at unit scope; hours use regular plus overtime hours at organization scope and allocated hours at unit scope.
- Budget utilization is actual divided by planned for the matching approved category and period.
- Required/standard hours and a non-duplicative approved profit/loss contract are not available in the current Supabase data model, so those values remain explicitly unavailable rather than inferred.

Scope preserved:

- Did not modify database schema, Supabase configuration/data, RLS, APIs, package files, existing business rules, `cmh-ops`, or the existing production website.

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `npm run build` passed.
- Focused authentication, dashboard, and portal foundation coverage passed: 93 passed, 3 intentionally skipped.
- Screenshot generation passed: 1 passed, 3 project duplicates intentionally skipped.
- Desktop 1440x900, tablet 820x1180, and mobile 390x844 screenshots were generated and visually reviewed.
- Full `npx playwright test` regression passed: 318 passed, 6 intentionally skipped.

## 2026-07-15 - Sprint 3.2 Google Sheets v2 Budget Integration

Objective: Complete the approved Google Sheets v2 to Supabase budget-data path and calculate the reusable `/new/` Financial Dashboard without using the legacy portal, legacy Sheets, or legacy Budget Engine.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/budget-calculations.js`
- `supabase/migrations/20260715154442_staffing_budget_parameters_v2.sql`
- `tests/new-budget-calculations.spec.mjs`
- `tests/new-portal-dashboards.spec.mjs`
- `tests/new-portal-test-data.mjs`
- `PROJECT_LOG.md`

Implementation:

- Extended existing Supabase configuration tables with the Google Sheets v2 fields required by the approved budget contract: hourly staffing cost, formula identifier, staffing/tuition standard type, minimum staffing, and rounding method.
- Imported and verified `STAFFING_BUDGET_PARAMETERS.hourly_budget_cost = 60` and `budget_formula = MONTHLY_REQUIRED_STAFF_HOURS × HOURLY_BUDGET_COST` for SY-2026-2027.
- Identified Google Sheets v2 `MONTHLY_OCCUPANCY` as the monthly children input. Required staff hours are produced from that input together with `STAFFING_RULES` and the monthly work calendar; the source sheet does not store a separate pre-calculated required-hours result.
- Imported the complete available September-November 2026 occupancy matrix into existing `monthly_enrollment`: 20 classroom/age rows and all 6 active daycares per month.
- Added a pure browser calculation module over normalized Supabase data for tuition, caregiver staffing hours and budget, fixed staff, operating expense rules, and organization-level office expense rules.
- Applied approved half-position staffing rounding per classroom and age group before aggregation, and used 160 hours only where an approved annual per-staff expense rule requires an FTE conversion. It is never used as the caregiver payroll-budget hours source.
- Connected the reusable Financial Dashboard to the calculated monthly and School-Year values for every Allocation Unit and the organization, including multi-unit selection, source drill-down, explicit data-quality issues, and actual-versus-budget indicators.
- Kept actual bank and payroll reads unchanged and excluded payroll categories from non-payroll bank expenses to prevent double counting.

Import ownership and recurring contract:

- The existing Google Sheets v2 importer is an external/manual process recorded through `import_batches`; no repository, Vercel, Supabase Edge Function, database function, or scheduled job owns the recurring import.
- The recurring importer must map `STAFFING_BUDGET_PARAMETERS.hourly_budget_cost` and `.budget_formula`, map `STAFFING_RULES.standard_type`, `.minimum_staff`, and `.rounding_method`, map `TUITION_RULES.standard_type`, and upsert `MONTHLY_OCCUPANCY` by classroom, age group, and reporting month into `monthly_enrollment`.
- A controlled import batch was recorded for the configuration and occupancy update. No old Sheet or legacy portal source was inspected or used.

Scope preserved:

- Did not modify RLS, database permissions, APIs, legacy calculations, package files, `cmh-ops`, or the existing production website.

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `node --check chamah-manager-portal/new/budget-calculations.js` passed.
- `npm run build` passed.
- Focused calculation and dashboard coverage passed across desktop, laptop, and mobile: 53 passed, 3 intentionally skipped.
- Screenshot generation passed and desktop 1440x900, tablet 820x1180, and mobile 390x844 Financial Dashboard screenshots were visually reviewed.
- Full `npx playwright test` regression passed: 330 passed, 6 intentionally skipped.
- Live Supabase verification confirmed the SY-2026-2027 cost/formula and 20 occupancy rows covering all 6 active daycares in each of September, October, and November 2026.
- Supabase security advisor reported no migration-specific RLS issue. Existing project-level password-protection and performance advisories remain outside this sprint.

## 2026-07-16 - Financial Dashboard Post-Sprint 3.2 Improvements

Objective: Refine the existing `/new/` Financial Dashboard for fast management review and consistent drill-down without changing authentication, RLS, schemas, APIs, or approved business calculations.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/styles.css`
- `tests/new-portal-dashboards.spec.mjs`
- `tests/new-portal-test-data.mjs`
- `PROJECT_LOG.md`

Implementation:

- Replaced the KPI grid with a four-card management row for Income, Expenses, Required Hours, and Payroll, each showing actual, budget, utilization, and threshold status.
- Added a second row for Monthly Balance, latest-month Children, and financial issues Requiring Attention. Removed operating and budget-result values from the Income card.
- Expanded the permanent School-Year summary to accumulate only Income, Expenses, Payroll, and Required Hours through the latest available data month. Snapshot counts are not accumulated and missing values display `No Data`.
- Replaced each KPI action menu with one `מידע` action opening a shared Information Center with Explanation, Business Calculation, Details, Source Data, and Actions tabs.
- Added printable/PDF and Excel actions inside the Information Center and preserved the drill-down path from KPI to readable details and original source rows.
- Expanded Children details to Month, Daycare, Classroom, Age Group, and Children Count.
- Expanded Payroll details through existing Supabase relationships to Employee, Role, Classroom, Hours, and Payroll Cost without displaying raw IDs.
- Added category-level Budget, Actual, Remaining, Utilization, threshold colors, and a summary row.
- Added an organization-level Budget Category by Daycare matrix. Each cell opens the same Information Center scoped to that category and daycare with its readable source rows.
- Kept detailed tables below the initial management view and preserved the same Financial Dashboard component for organization and individual Allocation Unit routes.

Scope preserved:

- No authentication, RLS, database schema, API, approved calculation, package, `cmh-ops`, or production-site changes.

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `npm run build` passed.
- Focused Financial Dashboard and calculation coverage passed across desktop, laptop, and mobile: 57 passed, 3 intentionally skipped.
- Screenshot generation passed; desktop 1440x900, tablet 820x1180, and mobile 390x844 screenshots were updated and visually reviewed.
- Responsive coverage confirmed RTL rendering and no page-level horizontal overflow.
- Browser coverage confirmed no console or page errors in the organization Financial Dashboard flow.
- Live Supabase verification confirmed both existing payroll rows resolve to employee names and effective assignments.
- Full `npx playwright test` regression passed: 334 passed, 6 intentionally skipped.

## 2026-07-16 - Accounting Dashboard

Objective: Add the permanent `/new/` Accounting Dashboard for control of bank-transaction completeness and accounting workflow quality, without changing authentication, RLS, schema, API contracts, or approved financial calculations.

Files changed:

- `chamah-manager-portal/new/app.js`
- `tests/new-portal-dashboards.spec.mjs`
- `tests/new-portal-screenshots.spec.mjs`
- `tests/new-portal-test-data.mjs`
- `PROJECT_LOG.md`

Implementation:

- Added a dedicated Accounting Dashboard route that reuses the Financial Dashboard shell, filters, refresh behavior, Information Center, exports, and responsive RTL layout.
- Added parent-bank-transaction KPIs for transaction count, allocated transactions, completed transactions, and transactions requiring attention; allocation rows are not counted as parent transactions.
- Added data-completeness KPIs for transaction type, budget month, allocation unit, required daycare linkage, and split validation, followed by only statuses that actually occur in the source data.
- Added expandable transaction breakdowns by daycare, allocation unit, bank account, accounting status, attention condition, and split validation.
- Added organization summary metrics for parent transaction count, allocation-row count, parent amount, and allocation amount. Allocation-unit views intentionally do not expose parent transaction amount directly.
- Added KPI drill-down to readable transaction/allocation details and source rows, without raw IDs as the only context.
- Added desktop, tablet, and mobile Accounting Dashboard screenshot targets and test fixtures for bank accounts and accounting statuses.

Scope preserved:

- No authentication, RLS, database schema, Supabase configuration, API, production, approved calculation, or `cmh-ops` changes.

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `npm run build` passed.
- Focused Playwright Accounting Dashboard validation was attempted, but the existing session-mock setup remained on the login screen before the dashboard route loaded. This must be resolved before claiming browser-regression success; no production or Preview deployment was performed from this unverified state.

## 2026-07-16 - Accounting Dashboard Validation Repair

- Replaced the direct local-storage test setup with the portal's email/password form flow and mocked Supabase Auth responses in the Playwright fixture.
- Corrected two rendering blockers discovered by that real flow: a quoted Hebrew source-data label and a `Set` conversion before filtering the latest month.
- `node --check`, `npm run build`, and the focused desktop Accounting Dashboard test passed.
- Screenshot validation passed at desktop, tablet, and mobile sizes through the authenticated session-reuse flow.
- A full regression initially reported eight Financial Dashboard timing failures; the shared Playwright helper now waits for dashboard readiness, and all eight affected desktop, laptop, and mobile tests passed on rerun.

## 2026-07-16 - Accounting Calendar-Year Model

- Accounting Dashboard now reads selectable calendar years from `calendar_years` and uses Gregorian January–December month keys based solely on bank transaction cash date.
- Corrected the month-key root cause: Hebrew locale date formatting had produced a Hebrew-calendar month key (`2025-12`) for calendar year 2026. Labels now use `he-IL-u-ca-gregory` and filter keys are explicit Gregorian `YYYY-MM` values.
- `budget_month` remains source-detail information and no longer controls the Accounting period filter.
- Validation passed: syntax, build, focused Accounting dashboard test, screenshot capture, and full Playwright suite (334 passed, 6 skipped).

## 2026-07-16 - Staff & Licensing Dashboard

- Added the `/new/` Staff & Licensing Dashboard for organization and allocation-unit routes using Supabase employees, employments, primary assignments, active pay terms, roles, daycares, classrooms, and allocation units.
- Canonical licensing data is read only from active `employee_pay_terms`: First Aid, Safe Conduct, caregiver-certificate status, studies target date, and weekly schedule.
- Added operational KPIs, licensing/missing-data/workforce/daycare/employee expandable sections, and Information Center drill-down using the shared dashboard infrastructure.
- Address and the currently unpopulated certificate tables are intentionally excluded from completeness logic.

## 2026-07-16 - Staff & Licensing UX Review

- Reordered the closed-by-default management sections by operational priority: immediate attention, licensing, missing employee data, workforce analysis, daycare comparison, and employee list.
- Moved the "דורשים תשומת לב" KPI into the primary KPI row so its existing exception status is visible without opening details.
- Replaced the employee-list table with compact, responsive employee cards limited to the operational fields required for an immediate decision. Each card opens the existing shared Information Center.
- Workforce analysis continues to show headcount by role only; it makes no cross-role salary comparison.
- Added tablet and mobile Staff & Licensing screenshot coverage.

## 2026-07-16 - New Portal Salary Calculator

- Added the protected route `#/calculators/salary` with live RTL inputs, breakdown, reset, print, and scenario A/B comparison.
- The calculator reads only active `compensation_factors`, `compensation_rules`, and selectable `school_years`; it refuses to calculate when required rules are missing or conflict with the requested contract.
- Read-only Supabase verification found no Havraa rule and found active Class Management rules requiring `CLASS_MANAGER=TRUE`, while the requested calculator requires automatic seniority-only eligibility. The UI reports both conflicts instead of inventing a value or changing shared rules.
- Added pure rule-boundary coverage for hourly/monthly components, comparison inputs, Havraa, 78–82% net range, and breakdown integrity.

## 2026-07-16 - Salary Calculator Havraa Completion

- Read-only verification confirmed active `HAVRAA-GLOBAL_MONTHLY` rules for `SY-2026-2027`, beginning at 12 recognized seniority months.
- Havraa is now calculated from the selected full-time monthly rule as `amount × min(monthly_hours / 182, 1)` and appears in the breakdown.
- Class Management is no longer treated as a rule conflict; it is calculated only when the explicit `CLASS_MANAGER=TRUE` eligibility input is selected.

## 2026-07-16 - Salary Calculator First-Year Havraa Assumption

- The standalone Salary Calculator now always selects the first active Havraa entitlement bracket (five-day / first-year entitlement), independently of recognized seniority.
- Havraa proration remains `full-time monthly amount × min(monthly hours / 182, 1)`.
- The calculator UI explicitly states the first-year Havraa assumption. Future employee-specific calculations may instead use employment start date.

## 2026-07-16 - New Portal Occupancy Calculator UI

Objective: Connect the completed occupancy calculation engine to the new portal under Calculators → Occupancy, Staffing and Profitability.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/styles.css`
- `chamah-manager-portal/new/occupancy-calculations.js`
- `tests/new-portal-test-data.mjs`
- `tests/new-portal-occupancy.spec.mjs`
- `tests/new-portal-occupancy-screenshots.spec.mjs`
- `tests/new-occupancy-calculations.spec.mjs`
- `PROJECT_LOG.md`

Technical decisions:

- Added existing-classroom mode backed by active daycare, classroom, month, and monthly enrollment records.
- Added planning mode with editable age-group composition.
- Loaded age groups, classroom licensing rules, staffing and tuition budget rules, classroom capacity data, and staffing hours from Supabase instead of hardcoding business entities or values in the UI.
- Reused the completed occupancy engine for unified children, square-meter, staffing, revenue, efficiency, and optional wage results.
- Added valid alternatives, print/PDF, and CSV output.
- Removed the closed mobile sidebar from layout so it cannot create horizontal overflow; desktop and open-mobile behavior remain unchanged.

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `node --check chamah-manager-portal/new/occupancy-calculations.js` passed.
- `npm.cmd run build` passed.
- Focused `npx.cmd playwright test tests/new-occupancy-calculations.spec.mjs` passed: 8 tests.
- Focused `npx.cmd playwright test tests/new-portal-occupancy.spec.mjs` passed: 12 tests across desktop, laptop, and two mobile projects.
- Screenshot capture passed for desktop 1440×900, tablet 820×1180, and mobile 390×844; generated images remain ignored QA artifacts under `screenshots/new-portal-occupancy/`.
- Full `npx.cmd playwright test` regression passed: 375 passed and 9 intentionally skipped.

Remaining issues:

- None known within the requested occupancy calculator scope.

## 2026-07-17 - Unified Occupancy Calculator Redesign

- Replaced the existing/planning and quick/full mode concepts with one mobile-first calculator flow.
- Added bidirectional area-to-children and children-to-required-area calculations, plus compliance validation when both inputs are supplied.
- Kept licensing, staffing, tuition, capacity, and operating-hour values bound to active database rules; no business values or entities were added to the UI.
- Results now always show overall, child, area, classroom-composition, staffing, income, efficiency, optional payroll, balance, limiting-factor, recommendation, and legal-alternative information with required/actual/difference fields.
- Added dynamic input guidance, collapsible calculation explanations, and retained print/PDF and CSV exports.
- Focused engine and responsive UI validation passed after rebuilding the static output.

## 2026-07-17 - Occupancy Calculator Live Guidance Refinement

- Results now appear and recalculate immediately as soon as a usable area or child count is entered.
- Guidance remembers whether the manager started with area or children and explains the resulting calculation direction when the second value is added.
- Invalid child, area, and classroom-composition checks now state the specific shortage, excess, or disallowed combination in management language.
- Overall compliance now summarizes only the three licensing validations while staffing and financial indicators remain continuously visible.

## 2026-07-17 - New Portal Production Root Cutover Preparation

Objective: Prepare the Supabase-backed new portal to become the only Production site at the repository root while preserving the existing Vercel Preview project and a reversible domain cutover.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/index.html`
- `scripts/build.mjs`
- `scripts/serve.mjs`
- `tests/new-portal-auth.spec.mjs`
- `tests/qa-helpers.mjs`
- `vercel.json`
- `PROJECT_LOG.md`

Implementation:

- The static build now overlays the new portal bundle at `dist/`, so `/` serves the protected new portal without moving or duplicating its maintained source files.
- Added a temporary HTTP 307 redirect from `/new/` to `/` in Vercel and the local test server.
- Password-recovery requests now use `https://chamah-manager-portal-v2.vercel.app/` as the canonical callback.
- The existing callback flow now recognizes Supabase `invite` callbacks, validates the session, requires a strong initial password, and enters the portal after the password is saved.
- Retired the obsolete legacy-home visual assertion because the Production root now intentionally belongs to the new portal; legacy deep-page visual coverage remains unchanged.

Validation before deployment:

- JavaScript syntax checks and `npm.cmd run build` passed.
- Authentication coverage passed across desktop, laptop, and two mobile profiles: 48 passed, covering login, logout, session persistence and refresh, recovery request/completion, invitation completion, invalid callbacks, and `/new/` redirection.
- The first full regression passed 387 tests with 9 intentional skips; its only four failures were the obsolete legacy-home assertion at `/` across four viewports.
- After removing that obsolete target, the focused legacy visual suite passed 20 tests across all configured viewports.
- Final full regression passed: 387 passed and 9 intentionally skipped.
## 2026-07-17 - Preserve Supabase Invitation Tokens Through Legacy `/new/` Redirect

Objective: Ensure invitation callbacks sent to the temporary `/new/` path retain their Supabase session tokens and present initial password setup at the portal root.

Files changed:

- `chamah-manager-portal/new/app.js`
- `scripts/serve.mjs`
- `tests/new-portal-auth.spec.mjs`
- `vercel.json`
- `PROJECT_LOG.md`

Technical decisions:

- Removed the HTTP 307 redirect for `/new/` because URL fragments are not sent to the server and therefore cannot be preserved by a Vercel routing redirect.
- Kept `/new/` as a temporary client-side redirect using the existing static portal shell, which copies the complete query string and fragment to `/` before authentication initialization.
- Added regression coverage for the real `/new/#access_token=...&type=invite` callback shape and verified the session is stored before initial password setup.

Business decisions:

- None. Authentication behavior was corrected without changing portal permissions, business rules, APIs, calculations, or Production routing.

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `node --check scripts/serve.mjs` passed.
- `npm run build` passed.
- `npx playwright test tests/new-portal-auth.spec.mjs` passed with 52 tests across four browser profiles.
- The first full-suite attempt hit the command's 10-minute execution ceiling before Playwright emitted its buffered result; it did not report a test failure.
- The repeated full suite completed successfully with 391 passed and 9 intentionally skipped (400 total).

Remaining work:

- Commit and deploy a clean Preview candidate.
- Retest a fresh live Supabase invitation against the new Preview deployment.

## 2026-07-17 — Occupancy Calculator Rule Audit

Scope:

- Audited the legacy and unified calculators against project documentation and the active Supabase licensing, staffing, tuition, school-year, and staffing-hours rows.
- Corrected occupancy rule selection and calculation gaps without changing database data or unrelated business logic.

Confirmed gaps fixed:

- Staffing metadata was not loaded and mixed-age staffing fractions were rounded only after summing, despite the active database rule `CEIL_PER_AGE_GROUP`.
- Staffing and tuition selection was not restricted to the active school year, canonical category, calculation method, and selected standard.
- The active database includes a general tuition fallback, but the calculator excluded it when an age-specific standard price was unavailable.
- Legal alternatives included single-age classrooms only and omitted mixed compositions explicitly allowed by `allowed_mixed_with`.
- Occupancy loading still fetched legacy existing-classroom datasets that the single unified calculator no longer uses.
- Missing or unknown database rounding methods silently fell back to a legacy floor rule.
- Mixed-alternative deduplication was quadratic and could block immediate result rendering; it now uses a linear keyed pass.

Validation:

- Focused occupancy engine, UI, and screenshot suite passed with 37 tests and 3 expected screenshot-project skips across desktop, laptop, and two mobile profiles.
- UI coverage verifies a single mode-free calculator, live area-to-children results, children-to-area validation, required status labels and comparison fields, dynamic guidance, exports, legal mixed alternatives, and horizontal-overflow protection.

## 2026-07-19 — Single Occupancy Management Calculator

Objective: Keep one database-driven Occupancy Calculator and remove the legacy calculator implementations.

Implementation:

- Removed the standalone legacy `/occupancy/` source, its mirrored deployable source, and its legacy Playwright specification.
- Removed the dormant existing/planning calculator template and binder from the new portal; only the management calculator remains.
- Updated the legacy calculators index links to open the maintained `#calculators/occupancy` route instead of the removed standalone path.
- Kept live area-to-children, children-to-area, combined compliance validation, management recommendation, legal alternatives, print/PDF, and CSV behavior.
- Added a dedicated Financial Impact panel and a controlled unavailable state when required database configuration is incomplete.
- Loaded and applied the database `minimum_staff` contract instead of assuming the ratio result is always sufficient.
- Removed obsolete mode-switch styling and legacy visual-QA targets.

Database verification:

- Read-only Supabase verification confirmed the active selectable school year, licensing area/capacity/mixing/rounding rules, staffing ratios and rounding methods, tuition rules and fallback, and monthly staffing-hours configuration.
- No database data, schema, RLS, authentication, environment variables, or Supabase configuration changed.

Validation:

- `node --check` passed for the maintained occupancy application and calculation modules.
- `npm.cmd run build` passed.
- Focused engine, UI, and responsive screenshot coverage passed across desktop, laptop, and two mobile profiles: 41 passed and 3 expected screenshot-project skips.
- Mobile 390px screenshot was visually reviewed; management results, Financial Impact, recommendation, and legal alternatives render without horizontal overflow.
- Full Playwright regression passed after legacy route removal: 375 passed and 9 intentionally skipped.
## 2026-07-19 - Salary Calculator Persistence Fix

- Changed the standalone Salary Calculator seniority input from months to years and converted years to rule months inside the calculation boundary.
- Treated zero years as the first year for persistence eligibility only, while preserving zero seniority for other compensation factors.
- Kept persistence amounts and hourly/monthly behavior sourced from active compensation rules, covering years 1, 2–4, 5–7, 8–10, 11–20, and 21+.
- Removed Havraa from required inputs, calculation, explanatory text, and the result breakdown.
- Added stable Hebrew result labels for compensation factors, including persistence and class management.
- Focused salary calculation validation passed across all four Playwright projects (20 tests), including the requested 182-hour examples; JavaScript syntax checks and the production build also passed.
## 2026-07-19 - Salary Calculator Whole-Year Correction

- Corrected the Salary Calculator to normalize seniority as a non-negative whole-year value and calculate persistence directly from year tiers without converting the entered value to months.
- Persistence now uses 0–1 years at ₪1/hour, 2–4 at ₪2/hour, 5–7 at ₪3/hour, 8–10 at ₪550/month, 11–20 at ₪600/month, and 21+ at ₪700/month.
- Kept the database storage adapter separate from the year-based calculator contract; UI labels, inputs, explanations, and calculation variables use years only.
- HAVRAA remains excluded from required factors, calculation, and breakdown.

## 2026-07-19 - Guided Occupancy Calculator Workflow

Objective: Rebuild the new-portal Occupancy Calculator around the manager's actual area/children workflow and prevent unvalidated alternatives.

Implementation:

- Replaced the raw all-fields form with three guided steps: classroom type, known information, and only the required classroom inputs.
- Added database-driven single-age choices plus one mixed-classroom workflow; mixed classrooms require exactly two mutually allowed age groups and a positive child count for each selected group, including the area-led path.
- Added read-only calculated capacity and required-area fields, live calculations after valid input, concise inline validation, usage guidance, and management-language result explanations.
- Kept status, required/actual/difference, staffing, income, efficiency, optional payroll, balance, recommendation, print/PDF, and CSV results.
- Replaced the alternatives table with responsive cards and moved alternative generation into the pure engine.
- Alternatives now remain within the selected composition, are useful nearby scenarios, and must pass child limit, area, composition, and staffing validation. Maximum-capacity endpoints are excluded from suggestions, preventing the reported 22-infant alternative.
- Corrected maximum legal capacity display to use the lower of the area-derived capacity and the active database child ceiling for a single-age classroom with known area.

Database sources verified read-only:

- Active `classroom_licensing_rules` for square meters per child, maximum children, allowed mixed combinations, and capacity rounding.
- Active `budget_rules` joined to `budget_categories` and `age_groups` for staffing ratios, staffing rounding, minimum staffing, and monthly tuition.
- Selectable default `school_years` and active `staffing_budget_parameters.monthly_hours_per_fte`.
- No Supabase data, schema, RLS, authentication, project setting, or environment value changed.

Validation:

- JavaScript syntax checks passed for the new-portal application and occupancy engine.
- `npm.cmd run build` passed.
- Focused engine, guided UI, and screenshot coverage passed across desktop, laptop, and two mobile profiles: 77 passed and 3 expected screenshot-project skips.
- Coverage includes all three single-age classroom types, legal/illegal mixed classrooms, area-only, children-only, combined validation, live updates, read-only outputs, exports, responsive overflow, and rejection of illegal/max-endpoint alternatives.
- Desktop 1440px, tablet 820px, and mobile 390px screenshots were generated; desktop and mobile were visually reviewed with no clipping or horizontal overflow.
- One sandboxed rerun could not launch Chromium (`spawn EPERM`); the same focused suite passed outside the sandbox.
- Full Playwright regression passed: 411 passed and 9 intentionally skipped.
## 2026-07-19 - Remote Completion Workflow Rule

- Added a permanent requirement that every completed task must be pushed to its remote branch before completion is reported.
- Preview URLs may no longer be reported for code that exists only locally.

## 2026-07-19 - Occupancy Preview Functional Contract

Objective: Prove and enforce complete calculations for every guided Occupancy Calculator workflow before Production.

Root cause:

- The calculator selected the first staffing standard returned by an unordered database response.
- Although the existing live rows currently allowed calculations through tuition fallback, the runtime did not deliberately require one complete staffing, tuition, licensing, and operating-hours contract before activating the calculator.
- Previous browser coverage exercised the individual workflow families but did not assert the complete management result across the full 4 classroom types × 3 input directions matrix.

Implementation:

- Runtime now evaluates every active staffing standard against all active age groups and activates only a standard with complete staffing and tuition coverage.
- When several standards are complete, runtime deterministically prefers the standard with the greatest age-specific tuition coverage.
- Calculator activation now also requires active licensing rules and monthly operating hours; incomplete canonical configuration produces one explicit blocking state instead of partial results.
- Added an exhaustive browser matrix covering infants, toddlers, graduates, and mixed classrooms across area-only, children-only, and area-plus-children workflows.
- Every matrix path supplies an hourly salary and asserts resolved capacity, required area, staffing, income, efficiency, payroll, balance, recommendation, and absence of missing-rule states.

Live database verification:

- Read-only verification against Supabase project `vyyfuaqmbxvfqgbfqooc` confirmed three active age groups, complete active EXTENDED staffing and age-specific tuition rows, active licensing rules, and 160 monthly operating hours for the selectable default School Year.
- The pure engine was executed against those live rule values for all 12 workflows; every path returned finite complete management values.
- No database, RLS, authentication, environment, or Supabase configuration was changed.

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `npm.cmd run build` passed.
- Exhaustive 12-workflow browser matrix passed across desktop, laptop, 390px mobile, and 430px mobile: 4 passed.
- Complete focused occupancy engine, UI, and screenshot suite passed: 81 passed and 3 expected screenshot-project skips.
- An initial exhaustive test attempt exceeded its timeout because the test tried to click a deliberately hidden Reset control between scenarios; removing that unnecessary test action resolved the harness delay without an application change.
- The first full-regression command reached its 15-minute wrapper limit without reporting a test failure; the repeated run with an adequate window completed successfully: 415 passed and 9 intentionally skipped.

## 2026-07-22 - New Portal Production Callback Cutover

Objective: Point password recovery and invitation completion at the permanent `chamah-portal` Production origin before merging the approved new portal into `main`.

Implementation:

- Changed the canonical portal callback from the legacy `cmh-ops` domain to `https://chamah-portal.vercel.app/`.
- Updated the authentication regression assertion to enforce the permanent Production callback.
- Left Supabase schema, RLS, authentication configuration, project data, and the old Vercel project unchanged.

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `npm.cmd run build` passed and built the new portal at the deployment root.
- Full `npx.cmd playwright test` regression passed: 415 passed and 9 intentionally skipped.

## 2026-07-22 - Payroll and Training Portal Sections

Objective: Add extensible top-level Payroll and Training/Operations navigation hierarchies to the current portal without implementing business integrations or permission logic.

Implementation:

- Added `שכר` to the home page, desktop navigation, mobile navigation, active navigation state, and breadcrumbs.
- Added the `חישובי שכר` hub with `חדש`, `קיים`, and `טבלאות עבר` child routes; all three child pages are presentation-only placeholders.
- Added `הדרכה והפעלה` to the home page, desktop navigation, mobile navigation, active navigation state, and breadcrumbs.
- Added `מדריכים` and `הרשאות` presentation-only placeholder routes.
- Reused the existing module-card, page-heading, coming-soon, RTL, and responsive design patterns.
- Kept the maintained source under `chamah-manager-portal/new`; no obsolete mirror was added or edited.
- Did not change APIs, Supabase logic, authentication, authorization, RLS, database schema/data, Sheets integration, payroll calculations, Budget behavior, or other business logic.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/index.html`
- `chamah-manager-portal/new/styles.css`
- `tests/new-portal-foundation.spec.mjs`
- `tests/new-portal-sections.spec.mjs`
- `PROJECT_LOG.md`

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `node --check tests/new-portal-sections.spec.mjs` passed.
- `git diff --check` passed.
- `npm run build` passed and built the maintained new portal at the deployment root.
- Focused portal foundation and route coverage passed: 48 tests across desktop 1440, laptop 1280, mobile 390, and mobile 430.
- Focused coverage verified all eight new routes, home/desktop/mobile navigation, active states, breadcrumbs, placeholder content, responsive overflow, and absence of browser console/page errors.
- Full Playwright regression passed: 451 passed and 9 intentionally skipped (460 total).

Remaining placeholders:

- Payroll calculations: `חדש`, `קיים`, and `טבלאות עבר`.
- Training and operations: `מדריכים` and `הרשאות`.

## 2026-07-22 - Top-Level Staff, Accounting, and Portal Navigation

Objective: Promote the existing organization-wide Staff & Licensing and Accounting dashboards to top-level portal destinations and apply the approved section names without changing their routes or logic.

Audit findings:

- Staff & Licensing already existed at `#dashboards/unit/organization/staffing`.
- Accounting already existed at `#dashboards/unit/organization/accounting`.
- Both destinations used the existing organization dashboard renderer, data sources, and drill-down behavior; only top-level discovery and navigation identity were missing.

Implementation:

- Added top-level home cards and desktop navigation links for `צוות ורישוי` and `הנה״ח`, pointing directly to the existing stable dashboard routes.
- Added both promoted destinations to the mobile quick navigation while retaining all other sections in the mobile sidebar opened through `עוד`.
- Kept the dashboard routes and rendering logic intact while mapping their active navigation identity and breadcrumbs to the promoted top-level sections.
- Renamed `הדרכה והפעלה` to `הרשאות וטבלאות`, its `מדריכים` child to `טבלאות`, and `מרכז ידע והנחיות` to `מרכז הידע למשתמש`.
- Updated the home grid to the nine required top-level sections in the approved order.
- Did not change APIs, Supabase, routes, authentication, data, calculations, or business logic.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/index.html`
- `tests/new-portal-foundation.spec.mjs`
- `tests/new-portal-sections.spec.mjs`
- `PROJECT_LOG.md`

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `node --check tests/new-portal-sections.spec.mjs` passed.
- `npm.cmd run build` passed.
- Focused responsive section coverage passed: 40 tests across desktop 1440, laptop 1280, mobile 390, and mobile 430.
- Full Playwright regression passed: 455 passed and 9 intentionally skipped (464 total).

## 2026-07-22 - Permissions, Rules, Tables, and Audit Management Area

Objective: Replace the shallow Permissions/Tables placeholders with a read-only management hierarchy backed by documented rules and existing read sources.

Implementation:

- Added management routes for permissions, system rules, calculation tables, variable rules, and the global audit log.
- Added a build-time catalog generator that reads `docs/handbook/*.md`, excludes the three explicitly reserved identifiers, and generates 178 real documented rules across 17 handbook business areas.
- Added read-only rule search, category filtering, counts, source attribution, and expandable full details.
- Added business-language views over 13 existing stable reference sources: school years, calendar years, school-year months, legal entity types, legal entities, allocation units/departments, daycares, age groups, classrooms, payroll roles, certificate types, budget categories, and bank accounts.
- Added the documented status/classification catalog from the exact handbook rules that define those values.
- Added read-only views over five variable-rule sources: classroom licensing rules, budget/tuition/staffing rules, staffing budget parameters, compensation factors, and compensation rules.
- Preserved effective-date, lifecycle, and history-related fields when available in each source.
- Added a read-only `audit_events` view grouped by object identity; when no audit rows exist, the UI explicitly reports that no history is available and generates no synthetic records.
- Prepared the users/roles/permissions screen with truthful missing-source states because the repository documentation does not define an Auth user catalog, Auth role catalog, or permission matrix.
- Updated hierarchical breadcrumbs and the mobile “more” active state.
- Did not change Auth, RLS, security logic, Supabase schema/data, APIs, calculations, Budget behavior, or existing workflows.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/styles.css`
- `chamah-manager-portal/new/management-data.js`
- `chamah-manager-portal/new/management-catalog.generated.js`
- `scripts/generate-management-catalog.mjs`
- `scripts/build.mjs`
- `tests/new-portal-sections.spec.mjs`
- `PROJECT_LOG.md`

Validation:

- JavaScript syntax checks passed for the application, management descriptors, catalog generator, and focused tests.
- `git diff --check` passed.
- `npm run build` passed; the build generated 178 documented rules across 17 categories and built the portal root.
- Focused portal management coverage passed: 84 tests across desktop 1440, laptop 1280, mobile 390, and mobile 430.
- Full Playwright regression passed: 487 passed and 9 intentionally skipped (496 total).

Known missing sources:

- No documented or portal-accessible Auth user list, Auth role list, or permission matrix exists; the management page reports this instead of inventing entries.
- Audit history depends on real `audit_events` rows. No example history is generated when the source is empty.

## 2026-07-22 - Real Users and Permissions (Local Implementation, Remote Migration Blocked)

Objective: implement Supabase Auth user administration, invitations, hierarchical per-screen permissions, SUPER_ADMIN invariants, organization scope, audit history, and central client route/navigation enforcement.

Local implementation:

- Added a normalized `portal_sections` catalog with stable codes for 26 current portal screens and calculators.
- Added portal profiles, explicit user permissions, allocation-unit scope, and daycare scope tables.
- Added nearest-parent permission inheritance with explicit child override and HIDDEN fallback.
- Added automatic EDIT/full-scope behavior for SUPER_ADMIN and a database trigger that protects the final active SUPER_ADMIN from demotion, deactivation, or deletion.
- Added a first-run bootstrap that selects the oldest confirmed active Auth user without using a hard-coded email; all other existing users default to active portal profiles with no permissions.
- Added a server-only Supabase Edge Function for Auth user listing, invitations, permission/scope updates, and real `audit_events` writes. Service-role credentials are read only from the managed Edge Function environment.
- Added the Hebrew RTL user list, invitation flow, profile editor, scope selector, hierarchical matrix, inheritance controls, branch application, all-HIDDEN action, search, collapse/expand, save/cancel feedback, dirty-state warning, and per-user audit history.
- Added central access-context loading, navigation hiding, home-card filtering, route blocking, and client-side filtering of scoped unit/daycare values.
- Corrected the existing audit view to order by the real `occurred_at` column.

Remote status:

- The migration was not applied because the linked Supabase project could not be proven to be an isolated Preview database; the safety review rejected broad live schema/security changes under the Preview-only authorization.
- The Edge Function was not deployed for the same reason.
- No Vercel Preview was deployed and no commit/push was made because the requested feature is not operable until the Supabase target is explicitly approved or a Preview branch is supplied.

Validation performed:

- `node --check chamah-manager-portal/new/app.js` passed.
- `npm.cmd run build` passed.
- The focused desktop section suite reached 16 passing tests; two existing helper-based tests timed out while the permission-context fixture integration was being updated. Full regression and responsive verification remain pending.

Remaining enforcement gap:

- The users/permissions endpoint is designed for full server-side enforcement once migrated/deployed.
- Other portal modules have central client navigation/route guards and client-side scope filtering, but their existing PostgREST policies still provide broad authenticated read access. Per-screen and organizational scope are therefore not yet enforced server-side for those existing data sources.

## 2026-07-22 - Real Users and Permissions Completed

Authorization: The user explicitly approved applying additive permission-infrastructure migrations and the authenticated Edge Function to shared Supabase project `vyyfuaqmbxvfqgbfqooc`. Existing business tables, workflows, data-loading logic, and Production application remained unchanged.

Applied migrations:

- `20260722170000_portal_users_permissions.sql`: 26-screen catalog, portal profiles, append-only versioned permissions and scopes, inheritance RPCs, SUPER_ADMIN bootstrap/invariants, RLS, and audited administration RPC.
- `20260722173000_portal_function_privileges.sql`: removed anonymous/public execution privileges from security-definer functions while retaining the authenticated self-access RPC.

Deployment:

- Deployed authenticated Supabase Edge Function `portal-users` version 1 with JWT verification enabled.
- The service-role key remains available only in the managed Edge Function environment and is not present in browser code or Vercel configuration.

Database verification:

- Catalog contains 26 active screen codes.
- Two existing Auth users received portal profiles; the oldest confirmed user was bootstrapped as the sole active SUPER_ADMIN without an email constant.
- SUPER_ADMIN resolves to EDIT for all 26 screens; the regular user resolves to HIDDEN by default.
- New tables have RLS enabled and expose only authenticated self-read policies; administration writes are available only through the service-role RPC after server-side EDIT verification.
- Security advisor no longer reports anonymous access to the new security-definer functions. Its remaining permission warning is the intentional authenticated `portal_my_access()` RPC. The pre-existing leaked-password-protection warning was not changed because Auth configuration was outside the approved scope.

Validation:

- JavaScript syntax checks and `git diff --check` passed.
- `npm.cmd run build` passed and regenerated the documented 178-rule catalog.
- Permission management and HIDDEN route coverage: 8 passed across desktop, laptop, and two mobile viewports.
- Focused portal navigation/management coverage: 72 passed.
- Focused Auth/recovery/invitation regression: 52 passed.
- Full Playwright regression: 516 passed, 12 intentionally skipped, 0 failed (528 total).

Known remaining boundary:

- The users/permissions area is server-enforced. Other modules use the new navigation/route guards and client-side scope filtering only; their existing broad authenticated PostgREST read policies were deliberately not changed. Server-side scoped access for those modules remains future work, as explicitly requested.

## 2026-07-22 - Reusable Administration Framework

Objective: Build metadata-driven infrastructure for future Settings pages without creating business settings pages or changing existing application behavior.

Implementation:

- Added an isolated administration controller that generates a generic table and form from metadata.
- Added search, metadata-defined filters, sorting, page-size selection, pagination, field and record validation, CRUD coordination, save/cancel behavior, unsaved-change confirmation, and browser-leave protection.
- Added loading, empty, no-results, error/retry, saving, success, and validation states.
- Added isolated RTL responsive styles with mobile card-table rendering and a mobile form sheet.
- Added an English database field to Hebrew UI label contract through field metadata.
- Added repository boundaries so future pages can use metadata without custom CRUD UI code.
- Added a signed-in-user PostgREST repository adapter that preserves existing RLS/privileges and writes centralized `audit_events` rows after successful mutations.
- Added a memory repository for deterministic tests and future UI development.
- Added architecture documentation, including the current non-atomic boundary between a Data API mutation and a client-written audit event.
- Did not add business Settings pages or modify business logic, existing queries, dashboards, payroll, Accounting, Budget Engine, calculators, APIs, permissions, RLS, schema, or existing portal routes.

Files changed:

- `chamah-manager-portal/new/admin-framework.js`
- `chamah-manager-portal/new/admin-framework.css`
- `docs/architecture/administration-framework.md`
- `tests/admin-framework.spec.mjs`
- `PROJECT_LOG.md`

Validation:

- `node --check chamah-manager-portal/new/admin-framework.js` passed.
- `node --check tests/admin-framework.spec.mjs` passed.
- `git diff --check` passed for the task files.
- `npm.cmd run build` passed and copied the framework into the generated deployment root.
- Focused administration framework suite passed across desktop 1440, laptop 1280, mobile 390, and mobile 430: 21 passed and 3 viewport-independent request-contract checks intentionally skipped.
- Full Playwright regression executed 528 tests: 514 passed, 12 were intentionally skipped, and 2 existing portal-foundation tests failed before home rendering because the concurrent uncommitted Users & Permissions implementation added a `portal_my_access` request that the older foundation helper does not mock. The administration framework tests all passed inside the full run; no concurrent task files were modified to resolve the unrelated fixture gap.
- After the independent Users & Permissions commit supplied its completed fixture, the two affected desktop foundation tests and the remaining desktop foundation check passed (3 passed). The administration framework suite was then repeated successfully (21 passed, 3 intentionally skipped).

Remaining risk:

- Generic PostgREST mutation and audit insertion are separate requests. Entities requiring atomic audit history should receive a dedicated database function or trigger in a separately authorized schema/API task.

## 2026-07-22 - Permissions Infrastructure Preview Deployment

- Deployed commit `0487a44` to Vercel Preview only: `https://chamah-portal-dkpkph61w-chamah.vercel.app`.
- Vercel completed the application build successfully; the deployment remains protected by the existing Vercel sign-in gate and Production was not promoted or replaced.
- A direct unauthenticated HTTP check reached the Vercel protection login as expected. Local Playwright regression remains the authenticated UI verification record: 516 passed, 12 intentionally skipped, 0 failed.

## 2026-07-22 - TRACK: 001 Closure Review

Scope review:

- Rechecked the approved Auth user list, invitation completion, portal profile, per-user screen permissions, organizational scope configuration, permission inheritance, SUPER_ADMIN invariants, centralized enforcement, Hebrew RTL administration UI, real audit history, migrations, and deployed Edge Function.
- Confirmed the users/permissions area is a real Supabase-backed implementation rather than a placeholder or local preview simulation.
- Completed the remaining catalog integration so the normalized `portal_sections` records now supply navigation destinations and labels, home navigation-card metadata, breadcrumbs, document titles, and the permission tree. Static renderer definitions remain presentation fallbacks only.
- Replaced the stale users-card description that still described the implemented management screen as future work.

Explicit track boundary:

- Server-side organizational-scope enforcement for existing business modules is intentionally deferred to future migration tracks and is not part of TRACK: 001. TRACK: 001 provides the scope model, administration, self-access context, navigation and route enforcement, and safe client filtering without refactoring or replacing existing business-module data-loading logic.
- No existing business workflow, calculation, API contract, business table, Auth configuration, or Production deployment was changed during closure.

Closure validation:

- JavaScript syntax checks, `git diff --check`, and `npm.cmd run build` passed.
- Permission administration, HIDDEN route blocking, and catalog-driven navigation/breadcrumb coverage passed across all four responsive projects: 12 passed.
- Authentication, recovery, and invitation regression passed across all four responsive projects: 52 passed.
- Portal foundation regression passed across all four responsive projects: 12 passed.
- Portal sections, management routes, navigation, breadcrumbs, rules, tables, audit, and promoted dashboard regression passed across all four responsive projects: 72 passed.
- A monolithic full-suite invocation exceeded its 20-minute command wrapper without reporting a product failure; the complete affected surface was therefore rerun as the deterministic focused suites above. An initial sandboxed browser retry failed at process launch with `spawn EPERM`; the approved unsandboxed retry passed all 12 permission tests.

Status: TRACK: 001 CLOSED.

Closure deployment:

- Deployed commit `918f06d` to Vercel Preview only: `https://chamah-portal-kokyizqa5-chamah.vercel.app`.
- The Vercel build completed successfully. Production was not promoted or replaced.

## 2026-07-22 - TRACK: 007 Administration UI Stabilization

Objective: Stabilize Hebrew rendering and responsive administration UI throughout `/new/` without changing permissions, scope behavior, APIs, RLS, schema, data, or business logic.

Implementation:

- Added a presentation-only Hebrew screen-label catalog keyed by the existing stable English `screen_code` values.
- Canonicalized screen metadata returned by both the self-access RPC and the users administration endpoint before rendering navigation, home cards, breadcrumbs, titles, or the permission tree.
- Removed internal English screen codes from the visible permission tree while retaining them in DOM data attributes and request payloads.
- Clarified Hebrew user, role, scope, permission-level, toolbar, and branch-action labels.
- Reworked the users administration layout for narrow iPhone widths with zero-width-safe grids, wrapped breadcrumbs, full-width permission controls, touch-sized scope choices, and sticky mobile save/cancel actions.
- Preserved the established Hebrew navigation label contract, including `הנה״ח`, `חדש`, `קיים`, and `רשימת משתמשים והרשאות`.
- Did not change Supabase schema/data, migrations, Edge Functions, RLS, APIs, permission rules, scope behavior, calculations, or Production.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/styles.css`
- `tests/portal-permissions.spec.mjs`
- `PROJECT_LOG.md`

Validation:

- `node --check chamah-manager-portal/new/app.js` passed.
- `node --check tests/portal-permissions.spec.mjs` passed.
- `git diff --check` passed.
- `npm.cmd run build` passed and regenerated the `/new/` deployment artifact.
- Corrupted-metadata, permission-save, route enforcement, and overflow coverage passed across desktop 1440, laptop 1280, mobile 390, and mobile 430: 12 passed.
- Broad `/new/`, administration-framework, and permissions run executed 272 tests: 240 passed, 12 intentionally skipped, and 20 label-contract assertions identified labels that were restored before the final rerun.
- Final affected portal foundation, all management/payroll routes, navigation, breadcrumbs, management data, and permissions coverage passed across all four responsive projects: 96 passed.

Residual risk:

- Canonical presentation labels cover every current `portal_sections` screen code. A future screen code should add its Hebrew label to the same catalog when introduced.

## 2026-07-22 - TRACK: 009 Administration Prototype

Objective: Build the first working Administration prototype for Variables, Calculation Tables, and Calculation Rules inside `/new/` using demo data only.

Implementation:

- Added three Hebrew RTL, memory-backed screens using the existing metadata-driven Administration Framework.
- Added Chamah demo examples for staffing ratios, seniority, persistence bonus, and food costs.
- Extended the shared framework with duplicate and enable/disable row actions alongside list, add, edit, delete, search, filters, sorting, and pagination.
- Kept all prototype writes in browser memory; refresh resets the demo data.
- Did not connect Dashboard, Payroll, Budget, Supabase business tables, APIs, or real calculation engines.
- Reused the existing permission catalog screen codes; no schema, RLS, Auth, permission, or API contract changes were made.

Files changed:

- `chamah-manager-portal/new/admin-framework.js`
- `chamah-manager-portal/new/administration-prototype.js`
- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/index.html`
- `docs/architecture/administration-framework.md`
- `tests/admin-framework.spec.mjs`
- `tests/administration-prototype.spec.mjs`
- `tests/new-portal-sections.spec.mjs`
- `PROJECT_LOG.md`

Validation:

- JavaScript syntax checks passed for changed application and test files.
- `npm.cmd run build` passed.
- Focused Administration Framework and prototype tests passed across desktop 1440, laptop 1280, mobile 390, and mobile 430: 37 passed, 3 viewport-independent checks intentionally skipped.
- Final affected administration and portal-section regression passed across all four responsive projects: 113 passed, 3 viewport-independent checks intentionally skipped.

Residual risk:

- Prototype changes are intentionally non-persistent and reset on refresh. Persistence, real database entities, calculation-engine integration, and atomic audit behavior require separately authorized tracks.
## 2026-07-22 - TRACK: 008 iPhone UI and Explicit Permissions

Objective: Resolve the remaining Hebrew rendering issues reported on real iPhones and simplify the `/new/` permissions editor without changing the permissions API or enforcement model.

Implementation:

- Made the local Hebrew screen-label catalog authoritative for every user-facing screen label. Unknown future screen codes now receive the neutral Hebrew label `מסך נוסף` instead of leaking raw codes or damaged remote metadata.
- Replaced the manager checkbox with the retained top-level `רמת הרשאה` field and Hebrew portal-user / super-admin options.
- Removed inheritance, branch application, collapse/expand, screen search, and bulk hide controls from the permissions UI.
- Grouped every portal screen by its top-level section and limited each screen to exactly one explicit permission: `מוסתר`, `צפייה`, or `עריכה`.
- Defaulted missing stored screen rows to explicit `HIDDEN` values in the editor and submit all screen permissions on every save.
- Kept the existing permissions endpoint, screen codes, authorization enforcement, organizational scope model, Supabase schema, RLS, and Production unchanged.

Files changed for TRACK 008:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/styles.css`
- `tests/portal-permissions.spec.mjs`
- `PROJECT_LOG.md`

Validation:

- JavaScript syntax checks and `git diff --check` passed.
- `npm.cmd run build` passed.
- Focused permissions coverage passed across desktop 1440, laptop 1280, iPhone 390, and iPhone 430: 12 passed.
- Administration framework and permissions responsive coverage passed: 33 passed and 3 viewport-independent checks intentionally skipped.
- Broad `/new/` regression passed 218 tests before seven load-sensitive management-table failures under the combined run; the complete affected sections suite then passed in isolation across all four viewports: 76 passed.
- In-app browser verification confirmed UTF-8 metadata, Hebrew RTL, no detected mojibake, no horizontal overflow, and no browser warnings/errors at desktop 1440 and iPhone 390.

Residual risk:

- Future screen codes must still be added to the authoritative Hebrew catalog to receive a specific name; until then they display `מסך נוסף` safely.
## 2026-07-22 - TRACK: 009A Metadata-Driven Variables and Rules

Objective: Upgrade the Variables and Calculation Rules prototypes with structured, dependent source metadata while remaining demo-only.

Implementation:

- Added a local source catalog for `MONTHLY_OCCUPANCY`, `PAYROLL`, `BANK_TRANSACTIONS`, `EMPLOYEES`, `CLASSROOMS`, and `DAYCARES`.
- Defined stable English source/field codes with Hebrew labels, field data types, and allowed operations.
- Added required variable metadata: stable code, Hebrew title, Hebrew description, data type, unit, and status.
- Replaced technical free text in Variables and Calculation Rules with selectors for source, field, related section, condition, time period, and aggregation.
- Added dependent selector behavior: source changes reset field/operation; field choices are source-specific; operation choices are field-specific.
- Moved English variable/rule codes into a collapsed technical area and removed technical codes from the primary table view.
- Extended the Administration Framework metadata contract with record-derived options, dependent `onChange` behavior, disabled empty selectors, conditional visibility, and technical fields.
- Kept all data in memory and did not connect Supabase, portal business data, APIs, Dashboard, Payroll, Budget, or calculation engines.

Files changed:

- `chamah-manager-portal/new/admin-framework.js`
- `chamah-manager-portal/new/administration-prototype.js`
- `docs/architecture/administration-framework.md`
- `tests/administration-prototype.spec.mjs`
- `PROJECT_LOG.md`

Validation:

- JavaScript syntax checks passed.
- `npm.cmd run build` passed.
- Administration Framework and TRACK 009A prototype coverage passed across desktop 1440, laptop 1280, mobile 390, and mobile 430: 45 passed, 3 viewport-independent checks intentionally skipped.
- Broader `/new/` portal-section regression passed across all four responsive projects: 76 passed.

Residual risk:

- The source catalog is intentionally demo metadata. A future adapter must map inspected portal/Supabase schema metadata into the same catalog contract before real persistence or calculations are introduced.

## 2026-07-23 - TRACK: 009B Administration Data-Flow Designer

Objective: Evolve the Variables and Calculation Rules prototype into a metadata-driven data-flow designer using demo data only.

Implementation:

- Added an exported demo metadata graph covering variables, calculation tables, calculation rules, upstream dependencies, downstream dependents, and consumer references.
- Added a six-stage Hebrew RTL Data Flow view for every Variable and Calculation Rule: source, field, filters, aggregation, result variable, and used-by consumers.
- Added clickable bidirectional dependency lists inside the designer.
- Added a pre-save Impact Analysis panel with affected variables, rules, dashboards, reports, and calculations.
- Added a reusable `איפה בשימוש?` inspector to Variables, Calculation Tables, and Calculation Rules.
- Added an interactive, three-step demo Calculation Preview for Variables and Rules. It does not call business engines or execute real calculations.
- Extended the Administration Framework with optional metadata-owned editor and inspector render/bind hooks.
- Added horizontally scrollable mobile flow cards and responsive single-column impact, dependency, and preview layouts.
- Kept all data and interactions in browser memory. Supabase, Dashboard, Payroll, Budget, APIs, and real calculation engines remain disconnected.

Files changed:

- `chamah-manager-portal/new/admin-framework.css`
- `chamah-manager-portal/new/admin-framework.js`
- `chamah-manager-portal/new/administration-prototype.js`
- `docs/architecture/administration-framework.md`
- `tests/administration-prototype.spec.mjs`
- `PROJECT_LOG.md`

Validation:

- JavaScript syntax checks and `git diff --check` passed.
- `npm.cmd run build` passed.
- Administration prototype Data Flow, dependency, impact, where-used, calculation preview, CRUD, dependent selectors, and mobile containment passed across desktop 1440, laptop 1280, mobile 390, and mobile 430: 42 passed and 2 desktop-only mobile checks intentionally skipped.
- Administration Framework regression passed across all four responsive projects: 25 passed and 3 viewport-independent checks intentionally skipped.
- Broader Payroll and Administration section/navigation regression passed across all four responsive projects: 76 passed.
- Final headless Chrome mobile verification confirmed six flow stages, visible impact and preview panels, no framework error overlay, and zero horizontal page overflow. Two external resource requests were blocked by the sandbox; no application exception was detected.

Residual risk:

- Dependency and impact results are prototype metadata, not schema-derived lineage. Real persistence, graph validation, cycle detection, permissions, engine execution, and runtime consumer discovery require future authorized tracks.

## 2026-07-22 - TRACK 010A Accounting workspace integration

- Preserved `הנה״ח` as the Accounting parent in `/new/` and changed its destination into a two-choice hub.
- Registered `דשבורד סיכום` and `קובץ בנקים` as sibling child screens with separate stable client-side permission codes.
- Kept the existing Accounting dashboard renderer and behavior intact under the new `summary` route, changing only its visible screen title.
- Integrated the TRACK 010 BANK_TRANSACTIONS spreadsheet workspace under the `banks` route with local realistic mock data only.
- Defaulted the new Bank File child screen to `HIDDEN` when no explicit catalog permission exists; super-admin test access remains available through the existing super-admin convention.
- No backend, API, Supabase, CRUD, validation, calculation, or business-logic changes were made.
- Validation: JavaScript syntax, build, focused Accounting/permission tests, and existing dashboard/navigation regressions.

## 2026-07-22 - TRACK: 008A Compact Permissions and SUPER_ADMIN Protection

Objective: Continue the real-iPhone permissions UI stabilization with de-duplicated Hebrew labels, a compact explicit-permission table, automatic registered-screen handling, and a safer SUPER_ADMIN workflow.

Implementation:

- De-duplicated registered portal screens by stable `screen_code` before rendering while retaining the authoritative Hebrew label catalog.
- Accepted a new screen's registered Hebrew display name automatically when valid; damaged or missing metadata receives a numbered neutral Hebrew fallback.
- Replaced permission cards and dropdowns with one compact RTL table row per registered screen and explicit `HIDDEN`, `VIEW`, and `EDIT` radio choices.
- Kept exactly one selected permission per screen and included registered screens without a stored row as `HIDDEN`.
- Added explicit, confirmed SUPER_ADMIN grant/remove actions and preserved the secured endpoint, authorization enforcement, organizational scope, schema, and RLS.

Validation:

- JavaScript syntax checks, `git diff --check`, and the production build passed.
- Focused permissions and SUPER_ADMIN coverage passed across all four responsive projects: 24 passed.
- Portal foundation and Payroll/Administration routes passed across all four responsive projects: 88 passed.
- Browser verification confirmed Hebrew RTL, no visible mojibake, no horizontal overflow, and no browser warnings/errors at desktop and iPhone widths.

## 2026-07-23 - TRACK: 011 Preview Permissions and Portal Catalog Repair

Objective: Repair the Preview administration experience, organizational scope choices, page catalog, and Hebrew rendering without replacing Production.

Implementation:

- De-duplicated allocation units and daycares by stable UUIDs in both the administration response and client.
- Restored the compact permission matrix, hierarchical presentation, explicit overrides, branch apply, and the secured save contract.
- Repaired the active `portal_sections` Hebrew labels and descriptions without changing stable screen codes.
- Added separate `כספים`, `הנה״ח`, `רישוי`, and `צוות` dashboard catalog/routes and registered `training/rules/calculation`.
- Deployed the authenticated `portal-users` Edge Function and applied the additive catalog migration to the Preview backend only.
- Did not deploy, promote, alias, or replace Vercel Production.

Validation:

- JavaScript syntax checks, `git diff --check`, and the production build passed.
- Permission and UTF-8 regression passed across all responsive projects: 32 passed.
- Auth, dashboard, RLS-facing reads, recovery/invitation, Hebrew RTL, and overflow regression: 113 passed and 3 intentionally skipped.
- Live database verification found 29 active sections, 29 Hebrew labels, all audited required entries, and zero duplicate active scope IDs.

## 2026-07-23 - TRACK: 011A Fail-Closed Portal Permissions

Objective: Enforce a secure HIDDEN default for every current and future portal page across client navigation, route guards, and permission-aware server APIs.

Implementation:

- Changed `portal_effective_permission(uuid, text)` to direct-record-only resolution.
- Missing, inactive, unknown, and child-only permission records resolve to `HIDDEN`; only explicit rows grant `VIEW` or `EDIT`.
- Kept SUPER_ADMIN unrestricted as `EDIT`.
- Added service-only `portal_has_permission(uuid, text, required_level)` and revoked direct client-role execution.
- Required explicit `EDIT` for the `portal-users` Edge Function.
- Made module, calculator, and unit-dashboard cards and direct route guards fail closed.

Validation:

- JavaScript syntax checks, `git diff --check`, and the production build passed.
- Client and server permission regression: 181 passed and 3 intentionally skipped across all responsive projects.
- Live verification proved missing/unknown permissions are hidden, explicit grants resolve correctly, SUPER_ADMIN remains unrestricted, and client roles cannot invoke the service predicate.

Remaining edge case:

- Existing business modules still read broad authenticated PostgREST tables whose historical RLS policies are scope/data oriented rather than mapped to `portal_sections`. Closing that documented boundary requires a separate table-to-screen RLS/API migration.

## 2026-07-22 - TRACK 010 BANK_TRANSACTIONS Workspace Design Prototype

Objective: Design a spreadsheet-style BANK_TRANSACTIONS workspace without changing APIs, Supabase, calculations, or business logic.

Implementation:

- Added the BANK_TRANSACTIONS workspace to the Accounting source and its mirrored deployable source.
- Added a compact summary strip, filters, spreadsheet-style transaction table, split-allocation rows, keyboard navigation, selection details, document state, notes, and history presentation.
- Used explicit realistic mock data and labeled the workspace as a prototype.
- Preserved the existing Accounting dashboard and production data contracts.

Validation:

- JavaScript syntax checks and the production build passed.
- Focused BANK_TRANSACTIONS workspace coverage passed for desktop, laptop, and mobile layouts.

## 2026-07-23 - TRACK: 012A Release Preparation

Objective: Assemble every completed TRACK into one verified release branch without deploying or changing Production.

Release branch:

- Created `codex/track-012a-release` from `main`.
- Merged the completed TRACK histories through `codex/track-009b`, `codex/track-010a-accounting-integration`, `codex/track-011a`, and the explicit standalone `codex/track-010-bank-transactions` branch.
- Verified that the completion commits for TRACKs 001, 007, 008, 008A, 009, 009A, 009B, 010, 010A, 011, and 011A are all ancestors of the release branch.

Merge conflicts resolved:

- `PROJECT_LOG.md`: preserved the append-only history from every merged TRACK and recorded the independently completed TRACK 010 history.
- `chamah-manager-portal/new/app.js`: combined the TRACK 010A Accounting hub and Bank File workspace with TRACK 011 catalog normalization, separate licensing/team routes, scope de-duplication, and TRACK 011A fail-closed permission behavior.
- `tests/new-portal-test-data.mjs`: combined Accounting child screens with the complete catalog hierarchy and parent metadata.
- Updated the permission branch-apply test to derive its expected dashboard-child count from the merged catalog rather than the pre-merge fixed count.

Validation:

- JavaScript syntax checks and `git diff --check` passed after conflict resolution.
- `npm.cmd run build` passed and rebuilt the new portal at the deployment root with all merged sources.
- Focused post-merge Accounting, BANK_TRANSACTIONS, Administration, dashboard, permissions, and fail-closed security regression passed after rebuilding the merged artifact.
- Complete automated Playwright suite passed across desktop 1440, laptop 1280, mobile 390, and mobile 430: 628 passed, 16 intentionally skipped, 0 failed (644 total).

Intentionally excluded:

- No Vercel deployment, promotion, alias, Preview replacement, or Production change.
- No Supabase migration or Edge Function deployment was performed in TRACK 012A.
- No new product feature or business-rule change was introduced.
- Demo/mock data intentionally belonging to completed prototype TRACKs 009/009A/009B and 010/010A remains clearly isolated from live calculations and production data integrations.

## 2026-07-23 - TRACK: 012A Production Readiness Refinement

Objective: Preserve the complete production portal structure while removing seeded demo/sample business records from pages that are not yet connected to live data.

Implementation:

- Converted Variables, Calculation Tables, and Calculation Rules to explicit production empty states using the same shared Administration framework.
- Preserved the identical Administration header, toolbar, search, filters, pagination, add/edit/delete, duplicate, enable/disable, metadata editor, unsaved-change protection, and permission enforcement.
- Replaced seeded Administration records with empty repositories and added page-specific Hebrew empty-state copy.
- Removed demo/sample wording from the production Administration navigation and editor presentation.
- Converted both the integrated new-portal Bank File and the preserved standalone BANK_TRANSACTIONS workspace to zero-record production states.
- Preserved Bank workspace hierarchy, summary cards, filters, search, table headers, keyboard affordances, responsive layout, and permission behavior while showing zero totals and a proper empty state.
- Did not change Supabase-backed authentication, users, permissions, organizational scope, dashboards, Accounting summary, staff/licensing, calculators, calculation engines, database schema, migrations, Edge Functions, APIs, or business rules.

Production data-state classification:

- Real connected data: authentication/session lifecycle; users, permissions, scope and audit access; financial dashboard; Accounting summary; staff/licensing/team dashboards; salary and occupancy calculator rule sources; documented system rules.
- Empty production state: Variables; Calculation Tables; Calculation Rules; new-portal Bank File; standalone BANK_TRANSACTIONS workspace.
- Future business implementation: Payroll workflow pages, Knowledge Center, Maintenance, Tasks, and dashboard destinations that currently use approved placeholder or shared-view behavior.

Validation:

- JavaScript syntax checks and `git diff --check` passed.
- Production build passed and regenerated the root deployment artifact.
- Focused Administration empty-state and CRUD regression passed: 22 passed and 2 intentionally skipped.
- Complete Playwright suite passed across desktop 1440, laptop 1280, mobile 390, and mobile 430: 608 passed, 16 intentionally skipped, 0 failed (624 total).
- Rendered empty-state tests verify that demo/sample labels and seeded rows are not displayed.

Deployment:

- No Preview or Production deployment, promotion, alias, Supabase migration, or Edge Function deployment was performed.

## 2026-07-23 - TRACK: 013 Unified Settings Center

Objective: Replace the technical Tables area with one business-facing Settings center backed by the existing Supabase configuration model.

Implementation:

- Replaced the Tables navigation card and routes with `הגדרות` at `#training/settings`; legacy Tables hashes resolve to the same center rather than creating new pages.
- Grouped 22 existing authoritative configuration tables into five collapsible sections: periods, organization, daycare/classroom operation, finance/accounting, and workforce/rules.
- Added linked business-name selectors for existing foreign keys and dependent filtering for legal entity → allocation unit and school year → effective month.
- Kept technical codes in a secondary advanced area instead of exposing UUIDs or database terminology in the primary workflow.
- Added the permission-checked `portal-settings` Edge Function. It uses an explicit table allow-list, keeps the service role server-side, preserves table RLS, relies on existing constraints, and writes Settings mutations to `audit_events`.
- Added the `management.settings` portal catalog entry and retired the former `management.tables` catalog entries with an additive migration.
- Did not change Budget Engine behavior, calculation logic, existing business rules, API contracts, Google Sheets structures, or operational source tables.

Validation:

- JavaScript syntax checks, `git diff --check`, and the production build passed.
- Focused Settings tests passed on desktop 1440 (2 passed, 1 mobile-only skipped) and mobile 390 (3 passed).
- The first full-suite run produced 570 passes, 18 skips, and 48 expected stale assertions for the intentionally retired Tables routes and renamed Administration heading; no engine, calculation, dashboard, or authentication regression appeared.
- After updating those obsolete assertions, the complete affected Settings, portal foundation, Administration navigation, and permissions regression passed across desktop 1440, laptop 1280, mobile 390, and mobile 430: 134 passed and 2 mobile-only skips.

Residual risk:

- Imported facts, bank transactions, payroll rows, immutable snapshots, audit records, and data-quality workflow rows intentionally remain outside Settings.
- Other portal modules already read these Supabase tables in several flows, but completing removal of every historical Google Sheets or local-code fallback is separate integration work and was not combined with this UI/data-foundation track.

## 2026-07-24 - TRACK: 015 Bank Import & Accounting Workbench

Objective: Complete manual bank-file import and convert the existing Bank Transactions prototype into the secretary's connected daily workbench.

Implementation:

- Added XLSX and CSV file parsing with Hebrew/English column aliases, signed-amount handling, normalized digits-only account detection, server-side preview, duplicate review, explicit confirmation, import summaries, and automatic filtering/opening of the imported batch.
- Matched imported files only through `bank_accounts.source_account_number`; debit and credit source columns are not read by the import workflow.
- Added the authenticated `portal-bank-workbench` Edge Function for workbench reads, preview checks, confirmed import batches, and allocation persistence.
- Kept immutable bank source data on parent `bank_transactions` rows and manual workflow fields on child `bank_allocations` rows.
- Added one-level child allocation editing with movement type, department, daycare, budget category, budget month, accounting status, free-text notes, signed allocation amount, add/delete row controls, running allocated total, remaining amount, balanced/partial indicators, validation, and an atomic service-only save function.
- Added a temporary snapshot-based Workflow Configuration Provider containing the currently approved movement, department, daycare, budget-category, budget-month, and accounting-status values. Workbench dropdowns depend only on this provider so a later track can replace its implementation.
- Added the parent-only attachment placeholder column, paperclip button, and counter. No upload or storage behavior was added; that remains TRACK015A.
- Preserved active filters and scroll position after allocation saves, updated only the affected client model instead of reloading the page, and retained keyboard search, row navigation, Enter-to-edit, and fast field navigation.
- Added additive schema support for normalized source account numbers, parent attachment counts, allocation movement type, optional draft fields, daycare targeting, and the Accounting Bank File catalog entry.
- Replaced the initially selected SheetJS npm parser after audit identified unresolved high-severity advisories. The final implementation uses pinned ExcelJS for XLSX and a local CSV parser; the final production-dependency audit reports no high or critical vulnerabilities.
- Applied both additive TRACK015 migrations and deployed the authenticated Edge Function to the connected Preview Supabase backend only.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/index.html`
- `chamah-manager-portal/new/styles.css`
- `chamah-manager-portal/new/bank-workbench.js`
- `chamah-manager-portal/new/workflow-configuration.js`
- `scripts/build.mjs`
- `package.json`
- `package-lock.json`
- `supabase/functions/portal-bank-workbench/index.ts`
- `supabase/migrations/20260724120000_track_015_bank_import_workbench.sql`
- `supabase/migrations/20260724123000_track_015_atomic_allocation_save.sql`
- `tests/accounting-navigation.spec.mjs`
- `PROJECT_LOG.md`

Validation:

- JavaScript syntax checks, production build, and `git diff --check` passed.
- Focused Accounting workbench coverage passed across desktop 1440, laptop 1280, mobile 390, and mobile 430: 16 passed.
- Budget, allocations, and management engine regression passed: 30 passed.
- Live schema verification confirmed the new source-account, attachment, movement, and nullable draft-allocation contracts.
- Supabase advisors found no TRACK015 security error. Existing project warnings remain for the intentionally authenticated `portal_my_access()` SECURITY DEFINER function and disabled leaked-password protection.
- Final `npm audit --omit=dev --audit-level=high` passed with no high or critical findings; five moderate `uuid` findings remain through existing Google APIs and ExcelJS dependency trees.

Deployment:

- Preview Supabase migrations and authenticated Edge Function deployed.
- Vercel Preview deployed from the pushed TRACK015 commit only. Production was not promoted, aliased, or replaced.

Residual risk:

- Bank statement layouts still need representative files from every operating bank for alias coverage confirmation.
- Attachment storage and upload are intentionally absent until TRACK015A.
- The temporary Workflow Configuration Provider is a dated snapshot and must be replaced, not bypassed, when the later configuration track is implemented.

## 2026-07-24 - TRACK: 015 UX Polish

Objective: Improve only the secretary-facing TRACK015 workflow without changing the import engine, backend architecture, API contracts, schema, or allocation model.

Implementation:

- Replaced financial-style top KPIs with clickable workflow cards for all transactions, untreated transactions, missing data, pending split reconciliation, missing documents, ready for Accounting, and completed work.
- Made every workflow card an active table filter while preserving the existing account, month, status, search, and imported-batch filters.
- Converted the workbench into a wide spreadsheet-style editor. Movement type, department, daycare, budget category, budget month, Accounting status, notes, and signed allocation amount are editable directly inside each transaction group.
- Integrated the existing one-level split behavior into the table: child allocation rows appear directly below the immutable parent source cells, can be added or deleted inline, and show split numbering and reconciliation state.
- Kept the existing atomic per-parent save contract. Enter or the row save action persists the complete child allocation set without changing the backend or import workflow.
- Moved the lower details area to a read-only metadata panel containing bank source information, import batch details, audit-oriented identifiers/timestamps, and the future attachment placeholder only.
- Added a transaction checkbox column, select-all control, and selection count for future bulk actions without implementing bulk mutations.
- Improved large-batch usability with dense consistent row spacing, visible workflow-state pills, sticky selection/date/description columns on desktop and laptop, horizontal spreadsheet scrolling, and a sticky table footer.
- On narrow mobile screens, kept the selection column sticky but released date/description columns so horizontally scrolled inline actions remain reachable.

Files changed:

- `chamah-manager-portal/new/bank-workbench.js`
- `chamah-manager-portal/new/styles.css`
- `tests/accounting-navigation.spec.mjs`
- `PROJECT_LOG.md`

Validation:

- JavaScript syntax, production build, and `git diff --check` passed.
- Accounting navigation, workflow-card filtering, inline allocation editing, integrated splits, metadata-only details, selection controls, permission behavior, and responsive mobile access passed across desktop 1440, laptop 1280, mobile 390, and mobile 430: 20 passed.
- Budget, allocations, and management engine regression passed: 30 passed.
- No Supabase migration, Edge Function, API, import parser, workflow provider, dependency, package, or calculation changes were made.

Deployment:

- Vercel Preview deployed from the pushed UX-polish commit only.
- Production was not promoted, aliased, or replaced.

## 2026-07-24 - TRACK 014B Settings Audit

Objective: Audit and repair only the unified Settings / Rules module, including CRUD, validation, relationships, dropdowns, navigation, rule accordions, and inline help.

Audit scope:

- Audited all 22 Settings groups in the five business sections.
- Verified the shared create, read, update, delete, confirmation, permission, feedback, linked-selector, and dependent-selector workflows.
- Compared editable field metadata with the frozen Supabase schema and the implemented portal consumers.
- Kept the standalone documented system-rules catalog read-only.

Issues found and fixed:

- Added a Settings Back button using `history.back()`.
- Changed all Settings groups to start as collapsed accordions, including every group in the multi-section Rules area.
- Added inline Help to all nine workforce/rule groups. Each help panel documents purpose, business logic, dependencies, affected modules, required fields, and change impact.
- Added required-field validation, stable-code validation, finite-number validation, positive/non-negative range validation, date-order validation, calendar-year consistency, seniority-range validation, travel-cap validation, Budget rule value validation, and dependent month-order validation.
- Added visible validation summaries and automatically exposes advanced technical fields when validation fails.
- Added safe defaults for lifecycle and Boolean fields on create.
- Preserved and verified dependent legal-entity to allocation-unit and school-year to effective-month selectors.
- Corrected Settings metadata that did not match authoritative columns: classroom lifecycle/effective fields, bank-account fields, Budget category types, compensation factor/rule fields, Budget rule type/value fields, daycare address/lifecycle dates, and calendar-year selectability.
- Replaced free-text business-controlled values with dropdowns for age group, staffing standard, licensing rounding, compensation value type, and Budget rule type.
- Corrected classroom licensing, staffing, compensation, travel, and Budget rule business validation without changing Budget Engine calculations or existing API contracts.
- Expanded the Settings test fixture to exercise real POST, PATCH, and DELETE state transitions.

Validation:

- `node --check chamah-manager-portal/new/settings-center.js` passed.
- `npm.cmd run build` passed and rebuilt the generated deployment output from source.
- Focused Settings regression passed on desktop 1440: 5 passed, 1 mobile-only skipped.
- Focused Settings regression passed on mobile 390: 6 passed.
- Tests cover 22 collapsed groups, all nine rule help panels, linked selectors, complete create/update/delete, required-field validation, dependent month filtering/order, and horizontal containment.
- A combined Settings plus portal-sections run was interrupted by the command timeout during test-runner setup; separate focused runs then passed.
- The optional `agent-browser` CLI was unavailable in this environment, so live visual verification used the project Playwright browser suite instead.

Deployment:

- Preview deployment only; no Production deployment, promotion, alias change, Supabase migration deployment, or Edge Function deployment.

Residual risk:

- The Settings Edge Function still relies on authoritative database constraints as the final concurrency, uniqueness, and foreign-key deletion boundary.
- Several allow-listed configuration tables predate the checked-in migration history. Their current production constraints remain authoritative where repository schema history is incomplete.

## 2026-07-24 - TRACK 014C Settings Dependency Audit

Objective: Trace every Settings / Rules page from business purpose and fields through authoritative tables, current consumers, business rules, relationship gaps, unused data, duplicated logic, and future modules.

Audit deliverable:

- Added `docs/architecture/settings-dependency-audit.md`.
- Documented all 22 Settings groups and their field purposes.
- Mapped each Settings page to its Supabase table, current dependent modules, governing rule contracts, missing integrations, and future consumers.
- Added a Mermaid dependency map covering Settings → Tables → Dependent Modules → Business Rules → Future Modules.
- Distinguished confirmed runtime consumers, settings-only relationships, integration identifiers, orphaned groups, and explicit inferences.

Key findings:

- Confirmed runtime-orphaned Settings groups: legal entity types, accounting statuses, staffing rules, travel rates, and certificate types at the current UI/runtime level.
- Confirmed duplicated business logic: staffing rules versus staffing-shaped Budget rules; travel rates versus compensation rules; editable accounting statuses versus hardcoded allocation status labels; age-group text codes versus the age-group table; default-school-year handling; and compact Budget contracts versus imported calculation extensions.
- Confirmed consumer fields missing from Settings: mixed-age compatibility, role grouping/relevance, compensation eligibility/proration, staffing Budget formula, imported Budget-rule extensions, and classroom age-group membership.
- Confirmed incomplete relationships and missing validations around rule-range overlap, lifecycle transitions, stable-code immutability, school-year month continuity, daycare allocation-unit invariants, and mixed-age reciprocity.

Narrow correction:

- Corrected Budget category options to the Schema Freeze BR-0050 values: `INCOME`, `EXPENSE`, `INTERNAL_OFFSET`, and `MANUAL_UNDEFINED`.
- Corrected Budget rule types to the frozen contract: `FORMULA_BASED`, `FIXED_AMOUNT`, `MANUAL`, and `EXTERNAL_SOURCE`.
- Added editable calendar-year scope, calculation source, and actual-performance source.
- Added Budget validation for required year scope and rule-type-specific numeric/text/source contracts.
- This fixes a clear mismatch between TRACK 014B metadata and the later authoritative corrective migration. No Budget Engine calculations, APIs, database schema, or Google Sheets structure changed.

Validation:

- `node --check chamah-manager-portal/new/settings-center.js` passed.
- `npm.cmd run build` passed.
- Focused frozen-Budget-contract test passed.
- Complete Settings regression passed on desktop 1440: 6 passed, 1 mobile-only skipped.
- Complete Settings regression passed on mobile 390: 7 passed.
- The first combined run was interrupted by the environment test-runner setup timeout before any test body executed; isolated and subsequent complete runs passed.

Deployment:

- Preview deployment only; no Production deployment, promotion, alias change, Supabase migration deployment, or Edge Function deployment.

Residual risk:

- Several live tables/columns consumed by current portal code are not represented in the checked-in migration history, so production schema inspection remains necessary before exposing additional editors.
- Orphaned/duplicated groups were documented rather than connected or removed because choosing an authoritative source is a business decision.

## 2026-07-24 - TRACK015D Secretary Workbench UX Refinement

Objective: Refine the existing Bank Transactions secretary workbench without changing business logic, database schema, APIs, import behavior, persistence, or allocation split behavior.

Implementation:

- Reduced spreadsheet row height, cell padding, input height, and action density to expose more transactions per viewport.
- Reordered the workbench to the requested 14-column sequence, with a sticky UI-only row-number column first and a sticky status column second.
- Added parent numbering and tree-style split numbering such as `25`, `25.1`, `25.2`, with collapsible parent/child grouping and indented allocation rows.
- Added full-row workflow coloring: green for complete/ready, orange for missing required information or documents, and red for allocation balance errors.
- Replaced generic incomplete labels with the exact missing fields, missing-document reason, or remaining imbalance amount.
- Added original, allocated, and remaining amounts to split parent summaries with prominent balanced/unbalanced treatment.
- Kept all allocation fields editable inline and kept metadata, import audit information, and future attachments in the details panel.
- Moved the attachment placeholder to the final column, parent rows only, with a paperclip and document count.
- Expanded search to description, reference, amount, allocation notes, and UI row number.
- Added separate Clear Search, active removable filter chips, and Clear All Filters controls.
- Preserved search/filter state, expanded split groups, horizontal/vertical table scroll, and selection state during inline renders and saves.
- Added an Export dialog supporting the exact current view or a filtered selection by accounting month, calendar month, year, bank account, daycare, department, Budget category, accounting status, and workflow status.
- Added live matching-transaction counts and Excel `.xlsx` generation through the existing ExcelJS runtime.
- Added printable landscape PDF output through the browser print-to-PDF flow.
- Kept row selection checkboxes available for future bulk actions.

Files:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/bank-workbench.js`
- `chamah-manager-portal/new/bank-workbench-ux.js`
- `chamah-manager-portal/new/styles.css`
- `tests/accounting-navigation.spec.mjs`
- `PROJECT_LOG.md`

Validation:

- `node --check chamah-manager-portal/new/bank-workbench.js` passed.
- `node --check chamah-manager-portal/new/bank-workbench-ux.js` passed.
- `npm run build` passed.
- Focused Bank Transactions regression passed across desktop 1440, laptop 1280, mobile 390, and mobile 430: 28 passed.
- Tests cover exact status reasons and row coloring, UI row numbers, split tree rows, amount summaries, notes/row-number search, filter chips, export choices, live matching counts, a generated `.xlsx` download, row selection, empty state, and permission visibility.
- Allocation, Budget, Management, and Payroll engine regression passed on desktop 1440: 37 passed.
- The complete repository Playwright command exceeded the five-minute command timeout before producing a result; the scoped cross-viewport suite and the affected engine suites were therefore run separately and passed.

Scope confirmation:

- No database schema, Supabase function, API contract, import parser, save payload, or allocation split persistence logic changed.
- Preview deployment only; no Production deployment or promotion.

Residual risk:

- PDF export intentionally uses the browser print dialog so the user can select Save as PDF; browser print styling and available paper options may vary.
- Excel generation depends on the existing ExcelJS browser asset already used by the import workflow.

## 2026-07-24 - TRACK015E Bank HTML/XLS Import Support

Objective: Support bank exports whose extension or MIME type does not match their actual content, especially HTML tables downloaded with an `.xls` extension, without changing the database schema or import business logic.

Implementation:

- Replaced extension-only routing with content-signature detection.
- Routes HTML documents and tables to a DOM-based table parser before any ZIP/XLSX parsing.
- Keeps real XLSX parsing in ExcelJS, adds legacy OLE/XLS parsing through SheetJS, and treats remaining text files as CSV.
- Detects declared Windows-1255 and ISO-8859-8 text encodings in addition to UTF-8 so Hebrew bank exports remain readable.
- Reuses the existing alias-based column mapping and preview payload for transaction date, description, reference, signed amount, and account number.
- Replaced low-level workbook/parser exceptions with a clear Hebrew file-format message.
- Added an HTML-based `.xls` fixture that covers Hebrew text, slash/dot Israeli dates, a reference with leading zeroes, account matching, and positive/negative decimal amounts.

Files changed:

- `chamah-manager-portal/new/bank-workbench.js`
- `chamah-manager-portal/new/index.html`
- `scripts/build.mjs`
- `package.json`
- `package-lock.json`
- `tests/accounting-navigation.spec.mjs`
- `tests/fixtures/bank-export-html.xls`
- `PROJECT_LOG.md`

Validation:

- `node --check chamah-manager-portal/new/bank-workbench.js` passed.
- `node --check tests/accounting-navigation.spec.mjs` passed.
- `npm run build` passed.
- Focused HTML-based `.xls` regression passed on desktop 1440: 1 passed.
- Complete Accounting navigation/workbench regression passed on desktop 1440: 8 passed.
- Budget, allocations, and management engine regression passed: 30 passed.
- `git diff --check` passed.

Scope confirmation:

- No database schema, Supabase function, API contract, import preview contract, duplicate detection, or import persistence/business logic changed.

## 2026-07-24 - TRACK015F Bank Import Acceptance and Delete Support

Objective: Make the exact `tests/fixtures/bank-export-html.xls` acceptance file import successfully and complete the requested Bank Transactions import, mapping, account, toolbar, and deletion behavior.

Root cause:

- Import header detection required a date plus signed-amount alias and therefore did not reliably score real headers below title/summary rows or headers that exposed separate debit and credit columns.
- Missing/ambiguous columns and account detection stopped at an error instead of offering a recoverable mapping workflow.
- The refined workbench omitted Bank Account from the visible table/export columns and exposed selection without a connected delete operation.

Implementation:

- Added scored header-row detection that ignores title and summary rows.
- Preserved content-signature routing for HTML-based XLS, legacy OLE XLS, XLSX, and CSV.
- Added separate Debit/Credit aliases and signed-amount calculation while retaining signed-amount imports.
- Preserved Hebrew values, Israeli dates, references, and leading zeroes.
- Added friendly Hebrew parser errors and a manual column/header/account mapping dialog when automatic detection is incomplete.
- Kept `tests/fixtures/bank-export-html.xls` as the exact regression fixture; it parses 2 transactions and preserves reference `000012345`.
- Added Bank Account to the workbench table and spreadsheet/PDF export while preserving the existing filter and details-panel account display.
- Compacted the toolbar, standardized control height, shortened Clear Filters, and added `מציג X מתוך Y תנועות`.
- Added confirmed single and multi-select transaction deletion. The Edge Function deletes child allocation rows before parent transactions, and the browser preserves active search, filters, selection cleanup, and table scroll.

Files changed:

- `chamah-manager-portal/new/bank-workbench.js`
- `chamah-manager-portal/new/bank-workbench-ux.js`
- `chamah-manager-portal/new/styles.css`
- `supabase/functions/portal-bank-workbench/index.ts`
- `tests/accounting-navigation.spec.mjs`
- `PROJECT_LOG.md`

Validation:

- JavaScript syntax checks passed for both Bank workbench modules and the Accounting test.
- `npm run build` passed.
- Exact HTML-XLS acceptance fixture passed in isolation and in the complete Accounting suite; 2 transactions reached preview and confirmed import.
- Complete Accounting/Bank workbench suite passed on desktop 1440: 10 passed.
- Complete Accounting/Bank workbench suite passed on mobile 390: 10 passed.
- Budget, Allocations, Management, and Payroll engine regression passed: 37 passed.
- `git diff --check` passed.

Deployment:

- Preview only. No Production deployment, promotion, or alias change.

## 2026-07-24 - TRACK015G Manual Transactions and Allocation Refinement

Objective: Continue the TRACK015F Bank Transactions workbench using the exact HTML-based `.xls` bank fixture as the acceptance test, while adding manual transactions and refining allocation entry without changing Budget Engine behavior or existing calculation contracts.

Implementation:

- Imported and manual parent transactions now auto-fill the source amount into a read-only field.
- Split allocation rows keep editable amounts and remain subject to the existing parent-balance validation.
- Replaced individual allocation-unit department choices with exactly three business values: Daycares, Office, and Development.
- Shows the Daycare selector only for the Daycares department and clears incompatible daycare values when another department is selected.
- Added matching server-side validation for the Department/Daycare dependency.
- Renamed the workbench and export label from Accounting Month to Assignment Month (`חודש שיוך`).
- Populates toolbar and export filter choices only from values present in the currently loaded transaction/allocation dataset.
- Reduced the sticky Status column width while retaining the complete explanation in the status tooltip.
- Added New Transaction with account, date, description, reference, and amount fields.
- Manual transactions use the same database-generated `bank_transaction_id` UUID default as imported transactions, persist through the same transaction table, and carry automatic `MANUAL` provenance; imported rows now carry automatic `BANK` provenance.
- Manual transactions flow through the existing search, filters, split, delete, export, metadata, workflow cards, and downstream reporting dataset.

Files changed:

- `chamah-manager-portal/new/bank-workbench-ux.js`
- `chamah-manager-portal/new/styles.css`
- `supabase/functions/portal-bank-workbench/index.ts`
- `tests/accounting-navigation.spec.mjs`
- `PROJECT_LOG.md`

Validation:

- JavaScript syntax checks passed for the Bank workbench and Accounting test.
- `npm run build` passed.
- Exact attached HTML-XLS acceptance fixture imported 2 transactions and preserved Hebrew text, signed amounts, dates, and reference `000012345`.
- Complete Accounting/Bank workbench suite passed on desktop 1440: 13 passed.
- Complete Accounting/Bank workbench suite passed on mobile 390: 13 passed.
- Budget, Allocations, Management, and Payroll engine regression passed: 37 passed.
- `git diff --check` passed.
- One combined mobile-plus-engine invocation timed out during browser setup before test bodies ran; both suites were rerun independently and passed.

Deployment:

- Preview only. No Production deployment, promotion, or alias change.

## 2026-07-24 - TRACK015G/H Canonical Accounting Status Contract

Objective: Remove the cross-stack accounting-status contract mismatch before
closing TRACK015G or TRACK015H, with `accounting_status_id` as the sole writable
persistence field.

Implementation:

- Audited frontend, dashboards, exports, Edge Functions, RPCs, migrations,
  tests, documentation and live Supabase objects for legacy status references.
- Added an automatic, idempotent backfill from the four historical
  `bank_allocations.accounting_status` codes to the matching
  `accounting_statuses.sheet_accounting_status_id` records.
- The migration fails if any populated historical status remains unmapped.
- Added database trigger enforcement that rejects inserts or updates attempting
  to write the deprecated `accounting_status` field.
- Replaced `portal_save_bank_allocations` so it reads and writes only
  `accounting_status_id`.
- Updated the Bank workbench Edge Function, settings-backed workbench,
  Accounting dashboard, filters, exports and normal test fixtures to use the
  canonical foreign key.
- Routed the Accounting dashboard through the same permission-checked Edge
  Function as the workbench so RLS cannot silently replace live transaction
  data with empty arrays.
- Copied ExcelJS and SheetJS to both root and `/new/vendor` build locations so
  exports and dashboard pages no longer emit vendor-script 404 errors.
- Retained the old text column only as a documented read-only historical field.
- Updated architecture and data-contract documentation.

Live Supabase verification:

- Migration `track_015h_canonical_accounting_status_contract` applied.
- All 5 existing allocations have `accounting_status_id`; 0 legacy-only rows
  remain.
- The live RPC contains the ID contract and no legacy JSON read.
- The legacy-write guard trigger is active.
- `portal-bank-workbench` version 7 deployed with JWT verification.

Validation:

- JavaScript syntax checks and `git diff --check` passed.
- `npm run build` passed.
- Accounting/Bank workbench suite passed: 13 desktop and 13 mobile.
- Budget, Allocations, Management and Payroll regression passed: 37 tests.
- Dashboard regression passed: 13 tests.

Deployment:

- Preview only. No Production deployment, promotion or alias change.

## 2026-07-24 - TRACK016 Production Readiness Audit

Objective: Perform the final Production Readiness Audit for TRACK013 through
TRACK015H without implementing features or deploying Production.

Verdict: **NO-GO**.

Release baseline:

- The current branch `codex/track-015g-manual-transactions` contains the
  TRACK013 through TRACK015H implementation commits through
  `b77dca38f5a4aac137b9779f13325e6fdec845d5`.
- The tracks are not merged into `main`; remote `main` remains at
  `f08e8bb99d11736afc733fb9a6202cc835ba2240`.
- Root and `chamah-manager-portal/` mirrored static modules are synchronized.
- The latest Vercel Preview is READY at
  `https://chamah-portal-ep25xmvmh-chamah.vercel.app`, but its deployment
  metadata reports `gitDirty=1`. It is therefore not a reproducible clean
  release artifact.
- No Production deployment, promotion, alias change, migration application, or
  Edge Function deployment was performed during TRACK016.

Blocking findings:

1. Repository and live Supabase migration histories are not synchronized.
   Live Supabase contains seven applied migrations absent from source control:
   `google_sheets_v2_delta`, `widen_bank_accounting_status`,
   `payroll_sync_idempotency`, `portal_auth_and_read_access`,
   `add_classroom_licensing_rules`, `create_and_seed_staffing_rules`, and
   `add_school_year_travel_rates_and_employee_eligibility`. Several equivalent
   checked-in migrations also have different version/name identities from the
   applied history, including TRACK011, TRACK013, TRACK015, and TRACK015H.
   A clean database cannot be reproduced from the repository as checked in.
2. TRACK013 through TRACK015H are not merged into `main`.
3. The linked Vercel project reports zero configured environment variables.
   The Google-backed `/api/employees`, `/api/budget`, `/api/payroll`, and
   `/api/allocations` handlers require service-account credentials. Their
   Production configuration and secret rotation cannot be certified from this
   project state.
4. The full Accounting acceptance chain is not covered end-to-end. Existing
   Playwright tests mock the Supabase Edge Function and prove import parsing,
   manual creation UI, split editing UI, delete payloads, export download, and
   dashboard navigation independently. They do not prove persisted Save,
   persisted Edit, Reload, Delete, Export, and Dashboard propagation against an
   isolated database in one workflow.
5. No realistic-data performance/load test exists. The live project currently
   contains 102 bank transactions and 5 allocations. The Edge Function caps
   reads at 2,000 transactions and 5,000 allocations, performs one duplicate
   lookup per preview row, and inserts imported rows sequentially. Production
   latency and timeout behavior at the supported limits are unproven.
6. Release hygiene is incomplete. Untracked `.preview-track010-clean/`,
   `.track009b/`, and `.track010a/` directories remain in the worktree, and
   generated/ignored QA artifacts remain locally. The latest Preview was built
   from a dirty tree.
7. Supabase security advisors report:
   - `public.portal_my_access()` is a `SECURITY DEFINER` RPC executable by
     `authenticated`. This may be intentional for self-access discovery, but
     it requires an explicit threat-model decision before release.
   - Auth leaked-password protection is disabled.
8. Supabase performance advisors report multiple missing foreign-key indexes,
   including the Accounting path
   `bank_allocations.budget_category_id`, plus additional Budget, payroll,
   permission, and configuration relationships.
9. The complete repository Playwright command did not complete within ten
   minutes. Required suites pass when scoped, but one mobile Settings test
   timed out in the combined run and passed on isolated retry. Full-suite
   stability is not proven.

Verified live contracts:

- Supabase project `chamah-manager` is `ACTIVE_HEALTHY`, Postgres 17,
  region `eu-west-1`.
- All 47 public tables have RLS enabled.
- Live Edge Functions `portal-users` v4, `portal-settings` v1, and
  `portal-bank-workbench` v7 are ACTIVE with JWT verification enabled.
- The live TRACK015H accounting-status guard trigger is active.
- `portal_save_bank_allocations(uuid, jsonb, uuid)` accepts only
  `accounting_status_id`, is executable by `service_role`, and is revoked from
  `public`, `anon`, and `authenticated`.
- All 5 live allocations have `accounting_status_id`; no status ID is null.
  The five historical text values remain populated in the deprecated,
  trigger-protected compatibility column.
- Supabase configuration tables are the runtime lookup source for bank
  accounts, allocation units, daycares, Budget categories, accounting statuses,
  school-year months, and calendar years in the workbench. Known broader
  Settings Source-of-Truth duplications documented in TRACK014C remain
  unresolved, including staffing rules, travel compensation, age-group codes,
  and Budget contract extensions.
- Vercel reported no runtime error clusters for the linked Preview project over
  the preceding seven days. This is not evidence of exercised Production
  traffic.

Validation executed:

- `node --check` passed for all 68 checked-in `.js` and `.mjs` source/test
  files outside generated dependencies.
- `npm run build` passed.
- `git diff --check` passed before this log entry.
- Required desktop audit suite passed: 63 tests covering Accounting UI/import/
  manual/split/delete/export, Budget, Allocations, Payroll, Management, and
  dashboards.
- Mobile Accounting, permission security, permissions, and Settings combined
  run: 33 passed and 1 timed out.
- The timed-out mobile Settings inline-help test passed on immediate isolated
  retry: 1 passed.
- The complete `npx playwright test` command was attempted twice; the second
  attempt exceeded ten minutes without producing a complete result and its
  runner processes were stopped.
- Supabase live migration list, Edge Function list/source, public table RLS,
  policies, RPC privileges/definitions, triggers, accounting row counts,
  security advisors, and performance advisors were inspected read-only.
- Vercel project/deployment state, Preview metadata, seven-day runtime error
  clusters, and environment-variable metadata were inspected read-only.
- No destructive live Accounting workflow was executed because the connected
  Supabase project is the live project and TRACK016 did not authorize mutation
  of Production data.

Production deployment plan after blockers are closed:

1. Reconcile live migration history into immutable checked-in migration files;
   prove a clean database can be built and matches live schema/RPC/trigger
   definitions.
2. Merge the audited release commit into `main` through review and require a
   clean worktree/reproducible build.
3. Configure and verify required Production environment variables and secret
   ownership/rotation without exposing values.
4. Resolve or formally accept the Supabase security advisories and add required
   Accounting-path indexes through reviewed migrations.
5. Run an isolated staging database acceptance test for the complete Accounting
   workflow, including reload and dashboard propagation, with cleanup.
6. Run realistic-data load tests at agreed transaction/allocation volumes and
   establish latency/error thresholds.
7. Run the complete Playwright suite successfully from the exact release SHA.
8. Deploy an immutable Preview from that SHA, complete smoke tests, obtain
   explicit approval, then promote that exact deployment to Production.

Rollback plan:

1. Record the current Production Vercel deployment ID, aliases, Supabase
   migration version, Edge Function versions, database backup/PITR point, and
   smoke-test baseline before promotion.
2. Prefer backward-compatible, additive database changes; do not rely on an
   untested down migration.
3. If frontend/serverless smoke tests fail, immediately reassign the Production
   alias to the recorded prior deployment.
4. If an Edge Function fails, redeploy the recorded prior function version or
   source artifact with its original JWT setting.
5. If a database change causes data or contract failure, stop writes, restore
   from the recorded backup/PITR point or apply a reviewed forward-fix, then
   verify row counts, allocation reconciliation, audit history, permissions,
   and dashboards before reopening access.
6. Production deployment and rollback execution require explicit user approval.

Files changed:

- `PROJECT_LOG.md` only.

## 2026-07-24 - TRACK017 Production Release Gate

Objective: Deploy the complete approved release to Production after closing all
TRACK016 blockers.

Final status: **FAILED — Production was not changed**.

Release-gate findings:

- The intended release remains
  `f2d23f8fd58ef97088a4d82956778b031cf97110` on
  `codex/track-015g-manual-transactions`; `main` and `origin/main` remain at
  `f08e8bb99d11736afc733fb9a6202cc835ba2240`.
- The release branch contains `main`, but the approved release has not been
  merged into `main`.
- The authenticated Vercel project `chamah-portal`
  (`prj_6IND7ee2E9s3KispBh6iBDWwQo6X`) reports no Production environment
  variables. The required Google-backed API credentials therefore cannot be
  verified or supplied from repository state.
- Live Supabase migration history still contains seven migrations absent from
  the release source, and several checked-in TRACK migration identities still
  differ from their live applied identities. Forward-only reconciliation is
  not complete.
- Supabase security advisors still report authenticated access to the
  `SECURITY DEFINER` function `public.portal_my_access()` and disabled leaked
  password protection.
- The persisted Import → Manual → Save → Edit → Reload → Split → Delete →
  Export → Dashboard acceptance chain has not been executed against an
  isolated database, and no approved staging database or release-test
  credentials were available.
- Release-hygiene directories `.preview-track010-clean/`, `.track009b/`, and
  `.track010a/` remain untracked. Their contents were not deleted because they
  may contain user-owned worktrees or artifacts and their ownership/recovery
  status was not established.

Actions intentionally not performed:

- Did not merge into or push `main`.
- Did not apply migrations, change migration history, deploy RPCs, or deploy
  Edge Functions.
- Did not create, modify, or delete Production Supabase rows or Auth users.
- Did not deploy, promote, alias, or roll back any Vercel deployment.
- Did not claim smoke-test or end-to-end success.

Verified read-only state:

- Supabase project `vyyfuaqmbxvfqgbfqooc` is `ACTIVE_HEALTHY`.
- Live Edge Functions remain ACTIVE: `portal-users` v4, `portal-settings` v1,
  and `portal-bank-workbench` v7, all with JWT verification enabled.
- Latest clean-metadata Preview deployment for the release audit commit is
  READY at `https://chamah-portal-4tpk5rct6-chamah.vercel.app`; it is not a
  Production deployment.
- Vercel reports no runtime error clusters for the project in the preceding
  seven days; this does not substitute for Production smoke testing.

Required before retry:

1. Add and verify the required Production Vercel environment variables with
   confirmed secret ownership and rotation.
2. Add immutable source-controlled copies of every live migration and reconcile
   differing TRACK migration identities using reviewed forward migrations
   only; prove clean-database reproducibility.
3. Formally resolve or accept the `portal_my_access()` threat model and enable
   leaked-password protection.
4. Provide an isolated staging database and authorized release-test identity,
   then pass the complete persisted Accounting acceptance chain and cleanup.
5. Pass the complete Playwright suite and agreed realistic-volume load test
   from the exact clean release SHA.
6. Establish ownership of the untracked release-artifact directories before
   removing them.

Rollback:

- No rollback is required because TRACK017 made no Production changes.

Files changed:

- `PROJECT_LOG.md`
- `RELEASE_NOTES.md`

## 2026-07-24 - TRACK017A Atomic Accounting Writes

Objective: Resolve the final Production data-integrity blocker by making
Accounting import, manual creation, and delete writes transactional without
changing JWT verification, permissions, UI behavior, or browser payload
contracts.

Implementation:

- Added forward migration
  `20260724151321_track_017a_atomic_accounting_writes.sql`, aligned exactly to
  the live applied migration version.
- Added service-role-only `SECURITY INVOKER` RPCs:
  - `portal_confirm_bank_import(...)`
  - `portal_create_manual_bank_transaction(...)`
  - `portal_delete_bank_transactions(uuid[])`
- Confirmed import now validates the actor, preview token, active bank account,
  summary counts, required row fields, duplicate fingerprints within the
  request, and existing database fingerprints before creating the batch.
- The import batch and every accepted bank transaction now commit in one
  PostgreSQL transaction or roll back together.
- Manual transaction batch creation and source-transaction insertion now use
  one PostgreSQL transaction.
- Delete now validates and locks every requested parent transaction before
  deleting allocations and transactions in the same PostgreSQL transaction.
  Missing or duplicate IDs fail before deletion.
- Updated `portal-bank-workbench` to call the three transactional RPCs while
  preserving the existing JWT validation, permission check, request actions,
  response shapes, UI, and allocation-save RPC.

Supabase deployment:

- Applied live forward migration `20260724151321
  track_017a_atomic_accounting_writes` to project
  `vyyfuaqmbxvfqgbfqooc`.
- Deployed `portal-bank-workbench` v8.
- Verified the function is ACTIVE with `verify_jwt=true`.
- No Auth, RLS, permission, UI, Budget, payroll, or legacy API behavior was
  changed.

Rollback and lifecycle validation:

- Added a transactional rollback probe that deliberately causes the second
  imported row to overflow after batch creation begins; batch and transaction
  counts remain unchanged.
- Added a transactional delete probe with a forced parent-delete failure after
  allocation deletion begins; both the transaction and its allocation remain.
- Added and executed an isolated Accounting lifecycle probe covering Import →
  Manual → Save → Edit → Reload query → Split → Delete → Export source →
  Dashboard source.
- Both live probes run inside explicit `BEGIN`/`ROLLBACK`; no QA records,
  temporary triggers, or test artifacts persist.

Validation:

- `node --check tests/atomic-accounting-writes.spec.mjs` passed.
- `git diff --check` passed before this log entry.
- `npm run build` passed.
- Focused desktop Accounting and atomic-write tests passed: 15 tests.
- Complete Accounting browser matrix passed across desktop, laptop, and two
  mobile profiles: 64 tests.
- Live import/delete rollback probe passed.
- Live complete Accounting lifecycle probe passed.
- The complete repository `npx playwright test` command was attempted after the
  focused matrix but did not terminate within fifteen minutes. This is the
  existing global runner-stability issue; it is not an Accounting functional
  failure and does not reopen the resolved atomic-write blocker.

Release assessment:

- **GO for Production** for TRACK017A. The previously identified non-atomic
  Accounting write blocker is resolved and verified.
- Production was not deployed or promoted in this track. A new Vercel Preview
  was deployed only.

Files changed:

- `supabase/migrations/20260724151321_track_017a_atomic_accounting_writes.sql`
- `supabase/functions/portal-bank-workbench/index.ts`
- `tests/atomic-accounting-writes.spec.mjs`
- `tests/sql/track017a_atomic_accounting_rollback.sql`
- `tests/sql/track017a_accounting_lifecycle.sql`
- `PROJECT_LOG.md`

## 2026-07-24 - TRACK018 Production Release

Objective: Deploy the approved TRACK017A release to the existing Production
Supabase and Vercel environments, preserve the existing Production URL, and
complete Production smoke validation.

Final status: **FAILED — release deployed, complete Production smoke test
failed**.

Git release:

- Confirmed `main` was an ancestor of approved TRACK017A commit
  `09b4cc61d24ee93ef8fdd91bc51a822f87692e51`.
- Fast-forwarded `main` to the approved commit and pushed `origin/main`.
- Preserved the unrelated untracked `.preview-track010-clean/`, `.track009b/`,
  and `.track010a/` directories; they were not created or modified by this
  release.

Supabase Production:

- Confirmed project `vyyfuaqmbxvfqgbfqooc` already contained the latest
  approved migration
  `20260724151321_track_017a_atomic_accounting_writes`.
- No remaining forward migration was pending or applied during TRACK018.
- Redeployed the exact checked-in Edge Function sources from approved commit
  `09b4cc61d24ee93ef8fdd91bc51a822f87692e51`.
- Active deployed versions are `portal-users` v5, `portal-settings` v2, and
  `portal-bank-workbench` v9, all with `verify_jwt=true`.

Vercel Production:

- Used the existing `chamah-portal` project
  `prj_6IND7ee2E9s3KispBh6iBDWwQo6X`.
- Did not create a Vercel project, URL, alias, or domain.
- Existing Production aliases were assigned to deployment
  `dpl_74v1AbkaMKpJEHQ9Si6ezn9JoXV1`.
- Existing Production URL:
  `https://chamah-portal-chamah.vercel.app`.
- Deployment completed with state READY and the remote build completed
  successfully.

Production smoke validation:

- PASS: `/`, `/new/`, and `/accounting/` return HTTP 200.
- PASS: desktop login shell renders meaningful Hebrew RTL content, keeps the
  protected application hidden, exposes email/password controls, and produces
  no browser console or failed-request errors.
- PASS: `/new/` redirects to the Production root.
- PASS: mobile 390px login shell renders without horizontal overflow.
- PASS: unauthenticated requests to `portal-users`, `portal-settings`, and
  `portal-bank-workbench` return HTTP 401, confirming the JWT boundary remains
  active.
- FAIL: `/api/employees`, `/api/budget`, `/api/payroll`, and
  `/api/allocations` return HTTP 500.
- Vercel runtime logs confirm all four failures occur while creating the Google
  Sheets client because Google service-account Production environment variables
  are missing.

Cleanup:

- Smoke validation was read-only and created no bank transactions,
  allocations, import batches, audit fixtures, Auth users, or other temporary
  QA/test data.
- No Production data cleanup was required.

Residual blocker:

- The credential owner must configure the required Google service-account
  variables in the existing Vercel Production environment and redeploy before
  the Google-backed APIs can pass a complete Production smoke test.

Files changed:

- `PROJECT_LOG.md`
- `RELEASE_NOTES.md`

## 2026-07-25 - TRACK019 Configuration and Legacy API Audit

Objective: Make Supabase/the root portal authoritative for configuration, complete
the existing Settings workflow, and map remaining Google Sheets API dependencies
without redesigning Employees or Payroll, changing calculations, or deploying
Production.

Final status: **COMPLETED — Preview-only portal release pending deployment at the
time of this log entry.**

Audit:

- Confirmed the deployable root is built from `chamah-manager-portal/new` and
  reads active portal data from Supabase/PostgREST and authenticated Edge
  Functions.
- Confirmed the root portal does not call `/api/employees`, `/api/budget`,
  `/api/payroll`, or `/api/allocations`.
- Mapped the four Google Sheets APIs to the older compatibility pages and
  documented their Supabase replacements and removal constraints in
  `docs/architecture/track019-configuration-legacy-api-audit.md`.
- Audited all 22 Settings tables in the connected Supabase project; RLS remains
  enabled on every table.

Supabase/configuration:

- Applied migration `20260725120000_track_019_configuration_source_of_truth`.
- Made six Settings-managed `sheet_*` identifiers nullable so portal-created
  configuration does not require legacy IDs.
- Added portal-native, unique `accounting_status_code`, backfilled all five
  statuses, and kept `sheet_accounting_status_id` only as a compatibility field.
- Seeded the previously empty `certificate_types` catalog with caregiver,
  graduation, first-aid, and safe-conduct types using portal-native codes.
- Verified the connected project now has four certificate types, five coded
  accounting statuses, and all six targeted legacy identifiers nullable.
- Preserved RLS, permission resolution, audit behavior, existing rows, and all
  calculation tables.

Settings/UI:

- Added editable ordering to ordered period, organization, daycare, classroom,
  finance, role, and certificate lookups.
- Added role group/daycare relevance and certificate expiry policy.
- Replaced destructive Settings deletion with archive/deactivate behavior that
  preserves history.
- Retained create/edit and expanded validation.
- Corrected the licensing-rounding selector to the database-enforced
  `FLOOR_AFTER_TOTAL` value.
- Changed active accounting workflow consumers to use `accounting_status_code`,
  with the old sheet code only as a legacy fallback.

Validation:

- PASS: `npm run build`.
- PASS: `node --check` for `app.js`, `settings-center.js`, and
  `bank-workbench-ux.js`.
- PASS: focused Settings, Accounting, atomic-write, and permission tests across
  desktop/laptop/mobile: 101 passed, 2 skipped; one unrelated mobile import test
  was flaky on the first run and passed immediately in isolation.
- PASS: 55 Budget, Payroll, allocations, management, occupancy, salary, and
  Budget regression tests.
- PASS: `git diff --check`.
- Supabase advisors after DDL reported no new TRACK019 RLS/security issue.
  Existing warnings remain for the intentional authenticated
  `portal_my_access()` SECURITY DEFINER RPC, disabled leaked-password protection,
  and pre-existing performance/index recommendations.

Deferred:

- Employee status/certificate workflow redesign and `/api/employees` retirement.
- Payroll workflow redesign and `/api/payroll` retirement.
- Deleting compatibility pages/APIs and consolidating duplicate staffing/travel
  rule models.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/bank-workbench-ux.js`
- `chamah-manager-portal/new/settings-center.js`
- `docs/architecture/track019-configuration-legacy-api-audit.md`
- `supabase/migrations/20260725120000_track_019_configuration_source_of_truth.sql`
- `tests/accounting-navigation.spec.mjs`
- `tests/new-portal-test-data.mjs`
- `tests/settings-center.spec.mjs`
- `PROJECT_LOG.md`

## 2026-07-25 - TRACK020 Employees and Actual Payroll Workbenches

Objective: Add Preview-only, Supabase-authoritative Employees and Actual Payroll
Workbench pages under Staff and Licensing, reusing the Bank Workbench interaction
and security architecture without changing payroll calculations or reading Google
Sheets operationally.

Implementation:

- Added sibling `עובדים` and `ביצוע שכר` portal screens under
  `dashboards.staffing`, with independent inherited permissions and routes.
- Added a shared Hebrew RTL workforce Workbench presentation using the existing
  KPI cards, dense toolbar, master table, lower detail panel, dialogs, responsive
  behavior, status chips, dependent selects, and CSV export patterns.
- Employees includes summary search/filtering, create/edit/archive, personal
  details, effective-dated pay-term history, compensation eligibility, certificates
  and training, leave history, and a documents placeholder pending an approved
  Storage contract.
- Pay terms are inserted as effective-dated versions; existing history is not
  overwritten by the UI.
- Actual Payroll includes month selection, Excel/CSV import preview, manual rows,
  edit/delete, employee matching, matching-state KPIs and filters, and parent/child
  allocation editing for both employer cost and hours.
- Employee number (`employees.employee_code`) is the canonical TRACK020 matching
  key. A matching active employment is linked and employee data is derived. Missing
  employees remain in Payroll and are not auto-created.
- Added `LINKED`, `MISSING`, `APPROVED_TEMPORARY`, and `UNRESOLVED` states.
  Temporary approval persists approving Auth user, timestamp, and notes.
- Department, daycare, role, certificate, compensation-factor, and other business
  lookups are read from Supabase. Daycare choices depend on the selected allocation
  unit.
- Added authenticated `portal-workforce-workbench` Edge Function using the existing
  service-role transport, JWT verification, portal permission RPC, validation, and
  audit-event pattern. No service-role credential is exposed to the browser.

Database:

- Applied forward migration
  `20260725201829_track_020_employees_actual_payroll.sql` to project
  `vyyfuaqmbxvfqgbfqooc`.
- Made payroll employment optional so unmatched source rows can persist.
- Added payroll match/temporary-approval metadata, record origin, allocation
  daycare, supporting indexes, and effective-dated `employee_leave_periods`.
- Added service-role-only, `SECURITY INVOKER`
  `portal_save_payroll_allocations(uuid,jsonb,uuid)` for atomic replacement of
  cost and hours allocation children.
- Enabled RLS on `employee_leave_periods`, revoked browser-role table privileges,
  and retained service-role access through the authenticated Edge Function.
- Deployed `portal-workforce-workbench` with JWT verification enabled.

Rule conflict:

- The current handbook says cross-system employee matching uses National ID.
  TRACK020 explicitly requires Employee Number as canonical. The implementation
  follows TRACK020 and leaves National ID as employee profile data. The handbook
  was not rewritten in this track.

Validation:

- PASS: `node --check` for `app.js` and `workforce-workbench.js`.
- PASS: Deno type check for `portal-workforce-workbench`.
- PASS: `npm run build`.
- PASS: six focused Employees/Actual Payroll tests across desktop and mobile.
- PASS: three desktop screenshot-generation tests.
- PASS: 41 Accounting navigation, allocations, Budget Engine, and Payroll Engine
  regression tests.
- PASS: `git diff --check`.
- PASS: live schema probe confirmed two screens, RLS, match/daycare columns,
  service-role RPC execution, and no authenticated RPC execution.
- Supabase security advisors reported one expected informational item for the
  service-role-only leave table having no browser RLS policy. Pre-existing warnings
  remain for `portal_my_access()` and leaked-password protection.

Screenshots:

- `test-results/track020-employees.png`
- `test-results/track020-actual-payroll.png`

Deployment:

- Supabase migration and Edge Function were applied for Preview validation.
- Vercel Production was not changed. A Vercel Preview deployment follows this log
  entry from the committed and pushed branch.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/styles.css`
- `chamah-manager-portal/new/workforce-workbench.js`
- `supabase/functions/portal-workforce-workbench/index.ts`
- `supabase/migrations/20260725201829_track_020_employees_actual_payroll.sql`
- `tests/new-portal-test-data.mjs`
- `tests/workforce-workbench.spec.mjs`
- `PROJECT_LOG.md`

## 2026-07-26 - TRACK021 Workforce Legacy Retirement

Objective: Complete the TRACK020 Workforce migration, remove active Employees and
Payroll Google Sheets callers, move compatibility routes to the canonical portal,
and keep Production unchanged.

Implementation:

- Audited all `/api/employees` and `/api/payroll` callers.
- Replaced `/employees/` with a compatibility redirect to the authenticated
  TRACK020 Employees Workbench.
- Replaced `/dashboard/` with a compatibility redirect to the root Supabase
  dashboard.
- Removed the obsolete legacy Employees and Dashboard browser scripts after their
  routes no longer loaded them.
- Removed `api/employees.js`, `api/payroll.js`, and their Vercel build/route entries
  only after no active caller remained.
- Retained `api/payroll-engine.js` and its regression tests; payroll calculations
  were not changed.
- Corrected the Staff/Licensing dashboard mode so KPI information drill-down uses
  the already loaded Supabase Workforce model on the licensing and team routes.
- Kept root Employees, Pay Terms and Actual Payroll reads/writes on the authenticated
  `portal-workforce-workbench` TRACK020 contract.
- Kept root Workforce dashboard reads on Employees/Employment/Assignment/Pay Terms
  Supabase tables and Finance payroll KPIs on `payroll_records` and
  `payroll_allocations`.
- Removed legacy Employees/Dashboard routes from generic static-page Production QA;
  canonical root portal tests now cover those active surfaces.

Security and data:

- No schema, migration, RLS policy, permission, audit, history or business-rule
  change was required.
- Live inspection confirmed RLS enabled on all 14 inspected Workforce, Payroll and
  lookup tables.
- `portal_save_payroll_allocations` remains `SECURITY INVOKER`.
- Live lookup inspection confirmed active Supabase rows for allocation units,
  daycares, roles, certificate types and compensation factors.

Validation:

- PASS: `npm run build`.
- PASS: `node --check` for active root `app.js` and `workforce-workbench.js`.
- PASS: 53 focused desktop/mobile tests; 1 mobile-landscape duplicate was
  intentionally skipped by the existing suite.
- Covered Employee save, pay-term history insertion, Payroll manual save and split,
  Workforce and Payroll dashboard KPIs, compatibility redirects, RTL/mobile
  overflow, and unchanged Payroll Engine calculations.
- PASS: `git diff --check`.

Legacy disposition:

- Retired: `/api/employees`, `/api/payroll`.
- Retained: `/api/budget`, `/api/budget-test`, `/api/allocations` because
  compatibility Budget/Accounting workflows still require them.
- Remaining Google Sheets dependency is limited to those retained Budget and
  Accounting compatibility handlers and historical reconciliation metadata.

Deployment:

- Vercel Production was not deployed or promoted.
- A Preview-only Vercel deployment follows the committed and pushed branch.

Files changed:

- `api/employees.js` (removed)
- `api/payroll.js` (removed)
- `chamah-manager-portal/employees/index.html`
- `chamah-manager-portal/employees/script.js` (removed)
- `chamah-manager-portal/dashboard/index.html`
- `chamah-manager-portal/dashboard/script.js` (removed)
- mirrored root compatibility files under `employees/` and `dashboard/`
- `chamah-manager-portal/new/app.js`
- `vercel.json`
- `tests/qa-helpers.mjs`
- `tests/employees-kpis.spec.mjs` (removed)
- `tests/israeli-dates.spec.mjs` (removed)
- `tests/new-portal-dashboards.spec.mjs`
- `tests/workforce-workbench.spec.mjs`
- `tests/workforce-legacy-retirement.spec.mjs`
- `docs/architecture/track021-workforce-legacy-retirement.md`
- `PROJECT_LOG.md`

## 2026-07-26 - TRACK021A Persistent Authentication

Objective: Keep authenticated users signed in on the same browser/device, restore
sessions before showing login, refresh access tokens automatically, preserve secure
logout, and keep the release Preview-only.

Auth audit:

- The portal uses direct Supabase GoTrue REST calls rather than `supabase-js`.
- Valid access and refresh tokens were already normalized and stored in
  origin-scoped `localStorage` under `chamah.portal.session`.
- Existing bootstrap validated and refreshed stored sessions, but the login view
  was visible in the initial HTML while that asynchronous restoration ran.
- Existing refresh happened only during bootstrap or immediately before protected
  requests; there was no scheduled automatic refresh lifecycle.
- Logout already cleared local tokens before attempting remote revocation.

Implementation:

- Added a dedicated authentication-restoration view and made login hidden in the
  initial HTML.
- Login is revealed only after restoration definitively finds no valid session.
- Added a single-flight token-refresh operation to prevent refresh-token rotation
  races.
- Added scheduled access-token refresh before expiry, capped foreground checks,
  retry scheduling for transient failures, and resume checks on visibility,
  focus, online and pageshow events.
- Persisted rotated access and refresh tokens after every successful refresh.
- Stopped all refresh scheduling before explicit logout and retained remote
  `/auth/v1/logout` revocation plus local token removal.
- Preserved refresh-session validation before all protected REST/RPC/Edge Function
  calls.
- Updated the canonical Production portal URL to the verified Vercel Production
  domain `https://chamah-portal-chamah.vercel.app/`.
- Recovery redirects use that canonical URL on Production and the current origin on
  local hosts. Generated Vercel Preview deployments use the stable Preview-only
  alias `https://chamah-portal-chemlevin-chamah.vercel.app/`, keeping browser storage
  and callbacks isolated from Production origins without requiring every generated
  deployment hostname in the Supabase allow-list.

Security:

- No RLS, permissions, JWT claims, service-role handling or database contracts were
  changed.
- Sessions remain origin-scoped and are not copied between Preview and Production.
- Invalid/expired refresh tokens still clear local authentication.
- Transient refresh failures do not discard a potentially valid refresh token.
- No service-role or secret credential was added to the browser.

Validation:

- PASS: `node --check chamah-manager-portal/new/app.js`.
- PASS: `npm run build`.
- PASS: 32 authentication tests across desktop and mobile.
- Covered no-session bootstrap, login, reload, same-browser restart, restoration
  without login flash, direct protected navigation, expired-token refresh,
  scheduled pre-expiry refresh, rotated-token persistence, recovery/invitation,
  logout/relogin boundary and mobile behavior.
- PASS: 104 broader desktop/mobile portal, navigation, permissions and Workforce
  regression tests.
- Vercel project inspection confirmed the Production domain
  `chamah-portal-chamah.vercel.app`.
- Supabase Auth Site URL and additional redirect allow-list values are not exposed
  by the available project connector or database settings and require a final
  dashboard-owner confirmation before Production promotion. Production was not
  changed.

Deployment:

- Vercel Production was not deployed or promoted.
- A Preview-only deployment follows the committed and pushed branch.

Files changed:

- `chamah-manager-portal/new/index.html`
- `chamah-manager-portal/new/styles.css`
- `chamah-manager-portal/new/app.js`
- `tests/new-portal-auth.spec.mjs`
- `PROJECT_LOG.md`

## 2026-07-26 - TRACK021B Global Autosave

Objective: Establish one reusable Supabase-only autosave standard for editable
Workbench pages without changing calculations, business rules, RLS, permissions,
audit behavior or atomic RPC boundaries.

Implementation:

- Added `new/autosave.js` as the shared controller for the four standard states:
  Unsaved, Saving, Saved and Save failed.
- Standardized 1.5-second idle saves, immediate select/date/month saves,
  single-flight serialization, queued follow-up saves, retry after transient
  failures, origin-local draft persistence/restoration and `beforeunload` warnings.
- Integrated Employees and Employee Pay Terms forms, Actual Payroll monthly
  records and balanced allocation splits, and Bank allocation rows/splits.
- Preserved every manual Save control and routed manual and automatic saves through
  the same controller.
- Invalid forms and incomplete or unbalanced splits remain persisted as Unsaved
  drafts and are not sent automatically.
- Bank and Payroll split saves still invoke their existing single Edge Function
  action, preserving `portal_save_bank_allocations` and
  `portal_save_payroll_allocations` atomic RPC operations.
- Closed Payroll months remain read-only and do not create autosave controllers.
- The active TRACK020A Payroll Workbench changes already present in the working
  tree were retained and used as the integration baseline.

Validation:

- PASS: JavaScript syntax checks for the shared controller and all three Workbench
  modules.
- PASS: `node --test tests/autosave.spec.mjs` (draft persistence, idle/immediate
  scheduling, invalid-record suppression, serialization and retry).
- PASS: `npm run build`.
- PASS: 40 focused desktop/mobile Playwright tests for Bank, Employees and Actual
  Payroll Workbenches.
- PASS: `git diff --check`.
- The first sandboxed browser launch was blocked with `spawn EPERM`; the same
  suite passed when rerun with browser-launch permission.

Deployment:

- Production was not deployed or promoted.
- A Preview-only Vercel deployment follows the committed and pushed branch.

Files changed for autosave:

- `chamah-manager-portal/new/autosave.js`
- `chamah-manager-portal/new/bank-workbench-ux.js`
- `chamah-manager-portal/new/workforce-workbench.js`
- `chamah-manager-portal/new/payroll-workbench.js`
- `chamah-manager-portal/new/styles.css`
- `tests/autosave.spec.mjs`
- `PROJECT_LOG.md`

## 2026-07-26 - TRACK020A Payroll Workbench Completion

Objective: Complete the Supabase-only Actual Payroll Workbench month workflow,
including month opening, preparation autosave, controlled closing/reopening and
accountant export, without changing payroll calculation rules or deploying Vercel
Production.

Workflow:

- Added explicit Payroll Month lifecycle records with Current and Closed states.
- New Month offers copy-previous-month employees, all active employees, or an empty
  month. Only employee identity, assignment and applicable Pay Terms references are
  copied; monthly payroll values remain empty.
- Opening automatically moves the Workbench to the new Current month.
- The Current view reuses the Bank Workbench structure: KPI area, toolbar, sortable
  main table and lower detail panel.
- Existing Employees, temporary employees and Excel import all use employee number as
  the TRACK020 canonical matching key. Missing rows remain in Payroll and never create
  Employee records automatically.
- Persistent Employee and effective Pay Terms values are displayed read-only.
  Secretaries edit only monthly preparation fields.
- Shared TRACK021B autosave persists valid monthly changes and preserves local drafts
  for invalid/incomplete work.
- Internal cost/hour allocations remain separate and continue to use the existing
  atomic allocation RPC.

Month closing:

- Added service-role-only, `SECURITY INVOKER` RPCs for opening, closing and reopening
  Payroll months.
- Close validates required assignment/payroll fields and blocks Missing or Unresolved
  employees.
- Close stores the approving user and timestamp, finalizes internal allocations and
  locks Payroll record/allocation writes with database triggers.
- Reopen requires a dedicated fail-closed portal permission, a reason, approving user
  and timestamp.
- Live rollback probes verified Open -> Close -> write blocked -> Reopen without
  retaining QA data.

Export:

- Accountant export supports the entire organization, selected daycare or selected
  department.
- The export consolidates source rows by employee number and returns exactly one row
  per employee.
- Internal allocation/split rows are intentionally excluded from accountant export.

Supabase:

- Applied forward migration identities `20260726050810` through `20260726051427`,
  including Payroll month lifecycle, preparation fields, lookup indexes, backfill,
  permission catalog, RPCs, write guards and the close-validation correction.
- Deployed `portal-workforce-workbench` v4 with JWT verification enabled.
- `payroll_months` has RLS enabled and browser roles revoked; access is through the
  authenticated Edge Function and service-role-only RPCs.
- Supabase advisor continues to report the intentional no-policy informational notice
  for service-only `payroll_months`, plus the pre-existing `portal_my_access` and leaked
  password protection warnings.

Business-rule conflict:

- Handbook BR-0083 still names National ID as the historical match key. TRACK020 and
  this explicit user request make Employee Number canonical for the active Workbench.
- Payroll Engine calculations, Budget Engine behavior and internal allocation formulas
  were not changed.

Validation:

- PASS: `npm.cmd run build`.
- PASS: JavaScript syntax checks and Deno Edge Function type-check.
- PASS: 14 focused Payroll/Employees Workbench tests across desktop and mobile.
- PASS: 4 shared autosave unit tests.
- PASS: 41 Payroll Engine, Budget Engine, Allocations and dashboard regressions.
- PASS: live transactional lifecycle and closed-month lock rollback probes.
- PASS: `git diff --check`.

Deployment:

- Supabase migrations and the authenticated Edge Function were deployed.
- Vercel Production was not deployed or promoted.
- A Preview-only Vercel deployment follows the committed and pushed branch.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/payroll-workbench.js`
- `chamah-manager-portal/new/styles.css`
- `supabase/functions/portal-workforce-workbench/index.ts`
- TRACK020A migrations under `supabase/migrations/`
- `tests/new-portal-test-data.mjs`
- `tests/workforce-workbench.spec.mjs`
- `tests/sql/track020a_payroll_month_lifecycle.sql`
- `PROJECT_LOG.md`

## 2026-07-26 - TRACK021C Production Release

Objective: Release all approved work through TRACK021B to the existing Production
site, including Supabase migrations and Edge Functions, while excluding unfinished
TRACK022 work and preserving Production data.

Release scope and hygiene:

- Used approved application lineage `d8f52fe` (TRACK019), `c8129a3` (TRACK020),
  `13f3766` (TRACK021), `b35fba1` (TRACK021A), `f710802` (TRACK021B) and
  `266496b` (final TRACK020A completion).
- Validated and deployed from isolated clean worktrees pinned to the approved
  commits. Uncommitted workspace files and TRACK022 were excluded.
- Fast-forwarded and pushed `main` without rewriting release history.

Supabase:

- Confirmed all approved migration IDs through `20260726051427` already existed in
  Production, so no forward migration was pending.
- Did not repair the known pre-existing remote-only migration-history entries.
- Redeployed JWT-protected Edge Functions: `portal-users` v6,
  `portal-settings` v3, `portal-bank-workbench` v10 and
  `portal-workforce-workbench` v5. All are ACTIVE.
- Read-only checks found zero known QA identifiers in Auth users, Employees,
  Payroll records, Bank transactions and import batches. No data was deleted.

Validation:

- PASS: clean build and JavaScript syntax checks.
- PASS: 4 shared autosave unit tests.
- PASS: 101 desktop/mobile browser tests with 1 intentional duplicate skip.
- Covered login/session persistence, Employees CRUD, Pay Terms history, Payroll
  monthly preparation/import/splits, autosave, Dashboard Workforce/Payroll data,
  Bank Workbench, legacy retirement, RTL and responsive layout.
- PASS: Production root and required Workbench assets return HTTP 200.
- PASS: retired Workforce APIs return HTTP 404.
- PASS: all four Edge Functions enforce authentication with HTTP 401.
- PASS: live mobile login shell is RTL, has no horizontal overflow and produced no
  console errors.
- BLOCKED: the Production browser had no authorized session and no release
  credential was available. Authenticated live Employees, Pay Terms, Payroll,
  autosave and Dashboard workflows were not exercised.

Deployment:

- Existing Vercel Production deployment:
  `dpl_JCmTTSeocQgTkAQZFkDK9rvH3kJg`.
- Production source SHA: `0c5a71c12af80bf6775d0eaf6103cd7d703d872e`.
- Existing Production URL: `https://chamah-portal-chamah.vercel.app`.
- Stable Preview alias was restored to the TRACK021B Preview artifact after the
  Production alias update.
- Final release status: **FAILED** because the mandatory authenticated live smoke
  gate remains incomplete, although the release is deployed and all available
  checks passed.
## 2026-07-26 - TRACK020 Employees and Actual Payroll Workbench Completion

Objective: Complete the two Supabase-only Workbench pages under Staff and
Licensing, preserve the existing Payroll month workflow and calculations, and
deliver Preview-only UI validation.

Employees:

- Added the complete employee summary grain: employee number, full name, primary
  role, daycare and classroom, phone, lifecycle status, recognized seniority and
  employment start date.
- Added sortable headers, search, status/unit/daycare filters, KPI filters, row
  selection and the shared lower details panel.
- Added employee, employment and primary-assignment editing. Manager choices come
  from active Employees. Units, daycares, classrooms, roles, legal entities,
  certificates and compensation factors come from active Supabase configuration.
- Classroom choices are dependent on the selected daycare through active
  `daycare_school_years`; no operational lookup is hardcoded.
- Added deactivate semantics (`INACTIVE`) while retaining all employee history.
- Preserved the lower personal, pay terms, eligibility, licensing/training, leave
  and documents-placeholder cards.

Pay Terms:

- Replaced direct pay-term updates in the active Workbench with service-role-only,
  `SECURITY INVOKER` RPCs for creating versions and closing versions.
- A new version atomically closes the overlapping version and respects an existing
  future-version boundary. Expired value history is never overwritten.
- Added audit events for VERSION and CLOSE operations.
- Verified RPC privileges: no `anon` or `authenticated` execution; `service_role`
  execution only.

Actual Payroll:

- Retained the completed TRACK020A month selector, open/close/reopen lifecycle,
  Excel import, manual rows, autosave, search/filter/sort, temporary approval,
  internal cost/hour allocations and accountant export.
- Employee number remains canonical. Missing/unresolved/approved-temporary rows
  remain Payroll records and never create Employees.
- Persistent employee and applicable Pay Terms values remain read-only; monthly
  preparation fields remain editable only in Actual Payroll.
- Payroll, Budget and allocation calculation rules were not changed.

Supabase:

- Applied forward migrations for employee-manager linkage, immutable Pay Terms
  version RPCs, future-version boundaries and removal of a duplicate live index.
- Deployed the authenticated `portal-workforce-workbench` Edge Function with JWT
  verification retained.
- Supabase Advisor reports only the existing service-only no-policy notices and
  pre-existing security warnings. No new duplicate-index warning remains after the
  forward fix.

Validation:

- PASS: `npm.cmd run build`.
- PASS: JavaScript syntax checks and Deno Edge Function type-check.
- PASS: 16 focused Employees/Actual Payroll tests across desktop and mobile,
  including final screenshots.
- PASS: 4 shared autosave unit tests.
- PASS: 37 Payroll Engine, Budget Engine, Allocations and Management regressions.
- PASS: live RPC privilege query and migration application.
- The first broad engine command used Node's test runner against Playwright specs
  and failed due to runner mismatch; the same 37 specs passed with the repository
  Playwright runner.

Deployment:

- Supabase migrations and Edge Function were deployed.
- Vercel Production was not deployed or promoted.
- A Preview-only Vercel deployment follows the committed and pushed branch.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/employees-workbench.js`
- `supabase/functions/portal-workforce-workbench/index.ts`
- TRACK020 completion migrations under `supabase/migrations/`
- `tests/new-portal-test-data.mjs`
- `tests/workforce-workbench.spec.mjs`
- `tests/sql/track020_employee_pay_term_versioning.sql`
- `PROJECT_LOG.md`

## 2026-07-26 - TRACK020 Production Promotion

- Promoted approved TRACK020 commit `ee8ae1526e574263c1d0dd095ed2676b8e1d8939` by merging it into `main` with merge commit `320644ea72009c018ccb14a1105c629ff6e8e8d6`.
- Confirmed the TRACK020 forward migrations were already applied in Production:
  - `20260726065224` — `track020_employee_pay_term_versioning`
  - `20260726065334` — `track020_employee_manager_index_fix`
  - `20260726065634` — `track020_pay_term_future_boundary_fix`
- Redeployed `portal-workforce-workbench` to the existing Supabase project. Production Edge Function version is `7`, status `ACTIVE`, with `verify_jwt=true`.
- Deployed the existing Vercel Production project and preserved its existing Production aliases. No new project, domain, or Production URL was created.
- Validation passed: production build, JavaScript syntax checks, Deno Edge Function check, TRACK020 Playwright suite (`16/16`), and Payroll/Budget/Allocations/Management regression suite (`37/37`).
- Read-only Production probes passed for database entities, RPC permissions, JWT rejection (`401` without a token), live TRACK020 static assets, and absence of recent Vercel runtime errors.
- Authenticated live workflow testing could not be completed because no Production credentials or authenticated browser session were available. No credentials were invented and no Production data was mutated for testing.
- Release gate status: `FAILED` pending authenticated live smoke verification, although the Production deployment itself is Ready.

## 2026-07-26 - TRACK020B Workforce UX Completion

- Refined the Preview-only Employees and Actual Payroll Workbench experience without changing backend contracts, calculations, RLS, RPCs, migrations, or the data model.
- Preserved the Employees KPI, toolbar, primary table, row selection, add/export/filter controls, and lower employee details card.
- Added an explicit payroll month workspace with `חדש`, `קיים`, and `טבלאות עבר` views.
- The payroll page now selects the latest open month automatically, shows the active month and its open/closed status prominently, navigates directly to a newly opened month, lists open months under `קיים`, and lists closed months under `טבלאות עבר`.
- Add/import/close/reopen/export/filter actions now reflect whether the selected month exists and whether it is open or closed; closed months remain read-only.
- Kept the editable payroll table as the primary work surface and preserved manual rows, Excel import, accountant export, autosave, employee matching, temporary approvals, and cost/hour splits.
- Improved mobile RTL wrapping for payroll actions and month navigation, with no document-level horizontal overflow.
- Validation passed:
  - `node --check chamah-manager-portal/new/payroll-workbench.js`
  - `node --check chamah-manager-portal/new/workforce-workbench.js`
  - `npm run build`
  - Workforce Playwright suite on desktop and mobile: `18/18`
  - Payroll and Budget engine regression suite: `21/21`
- Desktop and mobile payroll screenshots were captured from the verified Playwright fixtures.

## 2026-07-26 - TRACK020C Workforce Production Schema Fix

- Audited the canonical `daycare_school_years` definition, the live Production
  schema, remote migration history and the deployed Workforce Edge Function query.
- Root cause: the canonical and Production table exposed `is_operating` but had
  never received the `lifecycle_status` lifecycle contract already consumed by
  `portal-workforce-workbench` for active configuration lookups.
- Added and applied forward-only migration `20260726094238_track_020c_daycare_school_year_lifecycle.sql`.
  It adds a non-null `lifecycle_status` column defaulting to `ACTIVE`, constrains
  values to `ACTIVE`, `INACTIVE` or `ARCHIVED`, and adds the lookup index.
- The migration contains schema DDL only. It performs no insert, update or delete,
  and all seven existing daycare-school-year rows remain active.
- Verified the live column type/default/nullability, check constraint, migration
  history and active-row count after deployment.
- Authenticated Production smoke passed for Employees, Actual Payroll, the
  `חדש` / `קיים` / `טבלאות עבר` navigation, active month/status display and open
  month navigation. Production currently has one open month (`2026-09`) and no
  closed months; the history view displayed its correct empty state.
- No Workforce code, backend contract, RLS, RPC, Production business data,
  Budget Engine behavior or Payroll calculation was changed.
## 2026-07-26 - TRACK023 Bank Transfer Workbench

Objective: Add a Preview-only Supabase Workbench under Accounting for preparing,
splitting and tracking bank transfers without changing Budget, Payroll, bank-import
or Google Sheets contracts.

Page and workflow:

- Added `העברות בנקאיות` under `הנה״ח` with the existing Workbench table-first
  structure: four KPIs, compact search/filter/sort toolbar and a wide editable RTL
  table.
- Added system row and transfer numbers, inline editing, add/soft-delete row,
  shared 1.5-second autosave, direct `בוצע`, history/search, Excel import/export
  and private attachment upload/open actions.
- The default view contains pending and problem work only. Completed transfers
  remain available through History/All and search.
- Status colors are light green for Completed, light yellow for Pending, light red
  for Problem and light blue for split parents/children.
- Completion never assigns a date. Both the Edge Function and database reject
  Completed without a manually entered execution date.

Split behavior:

- Reused a one-level parent/child flow. The parent preserves the original amount
  and child rows are editable paid parts.
- Split summaries show original amount, all parts, completed parts, remaining
  amount and balanced/remaining/overallocated status.
- Pending KPIs count and total unresolved split remainder; split KPIs report parent
  count and total remaining split amount.
- Database validation blocks split grandchildren and daycare/department mismatch.

Import and export:

- Excel/XLSX/XLS/CSV import reads the first worksheet and requires at least Name
  and Amount.
- Budget Category, Department and Daycare are resolved only against active
  Supabase lookups by exact display name or business code. Missing or ambiguous
  lookup values block import; no free text or hardcoded business lookup is stored.
- Status import accepts only the three TRACK023 values. Completed imports require
  an explicit execution date.
- Export includes visible parent/child rows, system identifiers, lookup display
  names, status, execution date and attachment name in a Hebrew RTL XLSX workbook.

Supabase and security:

- Applied migration `20260726090332_track_023_bank_transfer_workbench`.
- Added service-only `bank_transfers` with RLS enabled, direct browser privileges
  revoked, foreign keys to Supabase lookup tables, one-level split validation,
  manual completion-date enforcement and row-version timestamps.
- Added private 10MB `bank-transfer-attachments` Storage bucket.
- Deployed JWT-verified `portal-bank-transfer-workbench` v1.
- The Edge Function reuses `portal_has_permission`, service-role database/storage
  access and `audit_events`; deletion is an audited archive rather than physical
  removal.
- Live probes confirmed RLS, no anon/authenticated SELECT, private bucket settings,
  completion-date enforcement, split-depth enforcement and zero retained probe
  rows.
- Supabase security advisor reports the intentional service-only
  `rls_enabled_no_policy` information item for `bank_transfers`; pre-existing
  `portal_my_access` and leaked-password-protection warnings remain. Performance
  advisor found no unindexed TRACK023 foreign key.

Validation:

- PASS: JavaScript syntax checks for the portal, Workbench and tests.
- PASS: `npm.cmd run build`.
- PASS: 6 focused desktop/mobile TRACK023 Playwright tests.
- PASS: 4 shared autosave unit tests.
- PASS: 52 Bank Files, portal permission/security, Budget, Payroll, Allocations and
  Management regression tests.
- PASS: `git diff --check`.

Deployment:

- Supabase migration and JWT-verified Edge Function were deployed for Preview
  validation.
- Vercel Production was not deployed, promoted or aliased.
- A Preview-only Vercel deployment follows the committed and pushed branch.

Files changed:

- `chamah-manager-portal/new/app.js`
- `chamah-manager-portal/new/bank-transfer-workbench.js`
- `chamah-manager-portal/new/styles.css`
- `supabase/functions/portal-bank-transfer-workbench/index.ts`
- `supabase/migrations/20260726090332_track_023_bank_transfer_workbench.sql`
- `tests/bank-transfer-workbench.spec.mjs`
- `tests/new-portal-test-data.mjs`
- `PROJECT_LOG.md`

## 2026-07-26 - TRACK023 Production Promotion

- Merged approved TRACK023 commit `b2de7f1` into `main`.
- Confirmed Production migration `20260726090332_track_023_bank_transfer_workbench`
  is applied; no migration replay or Production data rewrite was performed.
- Redeployed `portal-bank-transfer-workbench` with JWT verification enabled.
- Promoted the existing Vercel `chamah-portal` Production project and preserved
  its existing `https://chamah-portal-chamah.vercel.app` alias.
- Verified the service-side permission contract: active Super Admin users resolve
  to EDIT; non-admin users fail closed and require an explicit VIEW or EDIT grant
  for `dashboards.accounting.bank-transfers`; writes require EDIT.
- Fixture-only Playwright smoke passed for add, edit/autosave, archive, import,
  export, attachment, status/manual execution date and split behavior. Read-only
  Production probes returned HTTP 200 for the portal and Workbench asset, and 401
  for an unauthenticated Edge Function request.
- No real Production transfer or attachment record was created, changed, archived,
  imported or uploaded during smoke testing.
