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

## 2026-07-26 - TRACK023A Accounting Navigation Integration

- Audited the TRACK023 route, page mount, Supabase `portal_sections` registration,
  Accounting hub entry, permission mapping, icon and display order.
- Root cause: the frontend fallback for the Bank Transfer child screen inherited
  the parent Accounting permission. That did not preserve the explicit child
  permission contract and did not normalize stale Super Admin access payloads.
- Kept the existing route, backend, schema and Workbench business logic unchanged.
- Updated navigation normalization so Super Admin always receives the existing
  EDIT contract for this screen, while a non-admin fallback remains HIDDEN unless
  Supabase returns an explicit VIEW or EDIT permission.
- Added Accounting navigation coverage for the three ordered cards, the transfer
  icon, explicit non-admin VIEW access, direct navigation and page loading.

## 2026-07-26 - TASK024B Migration Reproducibility Source Recovery

Objective: Restore the seven Production-applied Supabase migration sources that
were absent from `main`, without modifying Production schema/data, rewriting live
migration history, rerunning applied migrations, or deploying application code.

Recovered migrations:

- Recovered the exact Git source for
  `20260714203517_google_sheets_v2_delta.sql` from
  `agent/google-sheets-v2-delta`.
- Reconstructed the exact stored Production statements for:
  - `20260715040145_widen_bank_accounting_status.sql`
  - `20260715041513_payroll_sync_idempotency.sql`
  - `20260715042905_portal_auth_and_read_access.sql`
  - `20260716175719_add_classroom_licensing_rules.sql`
  - `20260716185555_create_and_seed_staffing_rules.sql`
  - `20260722103856_add_school_year_travel_rates_and_employee_eligibility.sql`
- Production `supabase_migrations.schema_migrations.statements` was the
  authoritative recovery source. Git history, the TRACK016/017 audit entries,
  related migrations, schema objects and runtime code were used as corroborating
  evidence.
- Preserved every Production version and migration name exactly. Existing
  migration files were not modified.

Static validation:

- All seven normalized SHA-256 hashes match the corresponding Production
  migration statements exactly.
- The repository contains 44 uniquely versioned migration filenames in
  chronological lexical order with no invalid or duplicate version.
- PostgreSQL 17 static parsing passed for all 44 files and 560 SQL statements
  using temporary `@pgsql/parser` tooling outside the repository.
- `git diff --check` passed.
- Supabase CLI 2.109.1 was run from temporary tooling. Local status and migration
  listing could not connect because no Docker daemon or local PostgreSQL server is
  installed.
- Docker, Podman, PostgreSQL server/client and WSL distributions are not
  available on this machine. A free local clean-environment build therefore
  requires installing a container runtime or PostgreSQL-compatible local
  environment first.

Temporary environment pricing:

- Existing Production organization `hleokfgtwzyykbswufsp` reports a Supabase
  branch price of `$0.01344/hour`.
- The same organization currently reports a new project price of `$0/month`.
- No branch or project was created and no cost was incurred.

Remaining validation:

- A clean Supabase environment has not yet been built, so full schema, function,
  constraint, RLS, policy, index and seed parity with Production remains
  unverified.
- Production was queried read-only for migration metadata only. No Production
  migration, schema, data, Edge Function or deployment was changed.

## 2026-07-26 - TASK024B Isolated Supabase Parity Validation

Environment:

- Supabase reported `$0/month` for a new project in Production organization
  `hleokfgtwzyykbswufsp`; paid branches remained `$0.01344/hour`.
- Created free isolated project `task024b-validation`
  (`isakngcltryhdvcqxujd`) in `eu-west-1` without Production data.
- Applied all 44 repository migrations from zero successfully.
- Deleted the isolated project after validation and verified that only the
  pre-existing projects remain. Removed the temporary database-password file.
- Production remained read-only and unchanged.

Schema parity:

- Exact matches: columns (722), constraints (402), extensions (5), policies
  (47), RLS table flags (51), triggers (45), classroom-licensing seed rows (3),
  portal-section rows (35), private portal-access seed (1), and the private
  bank-transfer Storage bucket (1).
- Nine normalized function bodies differ from Production:
  `enforce_legacy_accounting_status_read_only`,
  `portal_close_payroll_month`, `portal_effective_permission`,
  `portal_guard_closed_payroll_month`, `portal_has_permission`,
  `portal_open_payroll_month`, `portal_reopen_payroll_month`,
  `portal_save_bank_allocations`, and `portal_version_employee_pay_term`.
- Index `payroll_records_employee_month_lookup_idx` differs: the clean build
  includes a `source_employee_identifier is not null` predicate while Production
  has an unfiltered index.
- Production has migration-relevant configuration absent from the clean build:
  five `accounting_statuses`, six `SR-2026-*` staffing rules, and one
  `TRAVEL-2026-2027` travel rate. The staffing/travel inserts depend on a
  school-year row not seeded by the repository migration chain.

Verdict:

- Clean migration execution passes, but exact Production parity fails.
- Do not merge the recovery branch into `main` and do not close PR #5 until the
  remaining function, index, and seed-source drift is reconciled and a new clean
  parity run passes.

## 2026-07-26 - TASK024C Final Schema Parity Reconciliation

Objective: Make a clean Supabase migration replay reproduce the read-only
Production database exactly for the TASK024B function, index, configuration-seed
and migration-history differences, without changing Production or merging PR #5.

Root causes and recovery:

- Nine functions retained different stored source bodies because repository
  migration timestamps/order did not match the corresponding Production-applied
  history. Added one forward migration that reinstates the exact normalized
  Production definitions without changing signatures, privileges or behavior.
- `payroll_records_employee_month_lookup_idx` was partial only in the repository
  replay. The forward migration rebuilds the exact unfiltered Production index.
- Five accounting statuses were live configuration not represented by a
  zero-data replay.
- Six staffing rules and the one travel rate used conditional inserts whose
  required `SY-2026-2027` parent was absent in a zero-data replay. The forward
  migration adds the required parent and exact requested Production rows.
- Thirteen migration files had non-Production timestamps, and one also had a
  non-Production name. Production
  `supabase_migrations.schema_migrations` was the read-only authoritative source;
  the files were renamed without changing their SQL contents. The 44 recovered
  pre-TASK024C filenames now match Production history count and digest exactly.

Files:

- Added
  `supabase/migrations/20260726134129_task024c_production_schema_parity.sql`.
- Renamed 13 existing migration files to their exact Production-recorded
  versions/names. No existing SQL body was rewritten.

Isolated validation:

- Supabase reported `$0/month` for an isolated project in organization
  `hleokfgtwzyykbswufsp`.
- Created `task024c-validation` (`nmmcykmxjjcoqsvvsjiu`) in `eu-west-1`.
- Replayed all 45 migration files from zero using explicit UTF-8 decoding.
- Production remained read-only throughout.
- Exact Production/isolated count and digest matches:
  - columns: 722
  - functions: 25
  - indexes: 206
  - constraints: 402
  - policies: 47
  - RLS table flags: 51
  - triggers: 45
  - extensions: 5
  - accounting statuses: 5
  - staffing rules: 6
  - travel rates: 1
- The 44 pre-TASK024C repository migration rows match Production history digest
  `6fdf4f0a4a46440f8f835b824dc244c6`; the clean validation project correctly has
  one additional history entry for the TASK024C forward migration.
- `git diff --check` passed.

Final result:

- Remaining schema/configuration differences: none.
- Verdict: **REPRODUCIBLE**.
- Production was not modified. PR #5 was not merged or closed.

## 2026-07-26 - TASK024D Merge Reproducibility Fix

Objective: Merge verified TASK024C commit
`56e1bbf99c7c9f217f8751a4b47cf0217292f34a` into `main`, preserve the recovered
migration identities, verify a clean Supabase replay and supersede PR #5 without
deploying application code or rerunning migrations on Production.

Merge and history:

- Preserved both chronological `PROJECT_LOG.md` branches while resolving the
  merge-only documentation conflict.
- Preserved all recovered Production migration filenames and
  `20260726134129_task024c_production_schema_parity.sql`.
- `main` contains 45 migration files with unique chronological versions.
- Confirmed `20260714203517_google_sheets_v2_delta.sql`, the migration required
  by PR #5, is present in `main`.

Clean validation:

- Supabase reported `$0/month` for the isolated validation project.
- Created `task024d-main-validation` (`htbjvsaeakvezralqrso`) in `eu-west-1`.
- Replayed all 45 staged `main` migrations from zero with explicit UTF-8
  decoding.
- Exact Production/isolated count and digest matches:
  - columns: 722
  - functions: 25
  - indexes: 206
  - constraints: 402
  - policies: 47
  - RLS table flags: 51
  - triggers: 45
  - accounting statuses: 5
  - staffing rules: 6
  - travel rates: 1
- Production retained 44 applied migrations with latest version
  `20260726094238`; TASK024C was not applied to Production.
- `git diff --check` passed. Application build/Playwright were not required
  because this merge changes migration sources and documentation only and does
  not deploy application code.

Final result:

- Production schema/data and application deployment were unchanged.
- PR #5 was superseded after its required migration was confirmed in `main`.
- Verdict: **FULLY REPRODUCIBLE**.

## 2026-07-26 - TRACK025 Portal UX & Product Polish (Partial)

Scope:

- UX-only changes. No business rules, calculations, APIs, Supabase schema, RLS,
  migrations, Edge Functions, package files, or generated `dist` source were
  changed.
- Audited the current Employees, Payroll, Bank Files, and Bank Transfers
  workbenches. Existing TRACK020-023 functionality already supplies much of the
  requested table-first, autosave, import/export, lifecycle, and split behavior.

Implemented:

- Added a reusable Hebrew RTL Workbench product/status band with module, page,
  organization, department, daycare, school year, month, Supabase source, last
  refresh, last save, save state, and Refresh presentation.
- Applied the shared band to Employees after compatibility testing.
- Converted primary Employee entry from popup-first to table-first:
  - Add Row inserts an editable row in the table.
  - Employee code, first name, last name, phone, and lifecycle status are editable
    inline.
  - Existing row edits save through the existing canonical employee action.
  - Added per-row archive, checkbox selection, and bulk archive.
  - Added visible-row CSV export.
  - Kept employment, assignment, pay-term, eligibility, certificate, leave, and
    document information in the lower advanced panel.
- Normalized Employee row health to `תקין`, `חסר מידע`, or `בעייתי`, with green,
  light-yellow, and light-red presentation.
- Refined shared Workbench, input, dialog, bulk-action, spacing, and mobile RTL
  styles.

Validation:

- PASS: JavaScript syntax checks for `app.js`, `employees-workbench.js`, and
  `workbench-polish.js`.
- PASS: `npm.cmd run build`.
- PASS: `git diff --check`.
- PASS: focused desktop Employees Workbench Playwright test, including shared
  status/context chrome, inline fields, advanced details, and screenshot.
- PASS: existing Bank Transactions empty-state Playwright test.
- BLOCKED: the existing Payroll detail test hangs while clicking `פרטים`; the
  same failure remains when the TRACK025 enhancer is not mounted on Payroll.
- BLOCKED: the existing Bank Transfers default-view test hangs on its first
  `selectOption`; the same failure remains after removing the TRACK025 enhancer.
  Both failures were left visible and were not bypassed.

Screenshot:

- `screenshots/track025/employees-workbench-desktop.png`

Deferred / blockers:

- The full shared status band was not activated on Payroll, Bank Files, or Bank
  Transfers because their existing interaction tests hang in the current branch
  and safe compatibility could not be established.
- Employee Excel import is not available through the existing API contract; adding
  it safely requires an approved persistence/import contract rather than a UX-only
  patch.
- The requested missing active `TRAVEL` salary rule is a business-rule/data issue
  and conflicts with the explicit UX-only/no-business-rule constraint. It was not
  changed.

## 2026-07-26 - TRACK025A Complete Portal UX

Scope:

- Completed the approved UX-only Workbench standard for Actual Payroll, Bank
  Files, and Bank Transfers.
- No business rules, calculations, API contracts, Supabase schema, RLS, migration,
  Edge Function, or package files changed.

Test-hang root cause:

- The first TRACK025 shared status component observed the complete Workbench DOM
  and then changed save-status text inside the same observed subtree. This caused
  a self-triggering `MutationObserver` loop that blocked browser interactions.
- Later attempts to remove the component still appeared to hang because Playwright
  was serving stale generated `dist` output; the static build had not been
  regenerated after the source change.
- TRACK025A observes only the existing message node, guards no-op status updates,
  and rebuilds before browser verification. The previously hanging Payroll detail
  click and Bank Transfer view selection now pass.

Shared Workbench UX:

- Activated the shared context/data-status band on Payroll, Bank Files, and Bank
  Transfers.
- Each band displays module, page, organization, department, daycare, school year,
  month, Supabase source, last refresh, last save, save state, and Refresh.
- Preserved existing breadcrumbs and browser hash navigation.
- Standardized green `תקין`, light-yellow `חסר מידע`, and light-red `בעייתי`
  row health presentation.
- Refined table inputs, bulk-action bars, dialogs, spacing, and mobile RTL.

Actual Payroll:

- Preserved separate `חדש`, `קיים`, and `טבלאות עבר` navigation.
- Retained the guided month-opening options and clearer active-month lifecycle
  presentation.
- Add inserts an editable table row with existing-employee picker or temporary
  employee entry.
- Employer cost and regular hours are editable inline and save through the existing
  canonical `save_record` action.
- Added single-row and multi-row deletion while retaining closed-month locks.
- Advanced monthly fields and allocation splits remain in the lower detail panel
  with existing autosave.

Bank Files:

- Added explicit calendar-year/month context through the shared band and existing
  month filter.
- Retained compact search, account/month/status filters, removable filter chips,
  sorting workflow cards, selection, bulk delete, import, and export.
- Replaced the manual transaction popup with an inline editable row.
- The system assigns the persisted transaction ID and row ordering through the
  existing `create_manual_transaction` action after save.
- Normalized visible health labels while retaining detailed validation reasons in
  tooltips and existing allocation checks.

Bank Transfers:

- Applied shared context/status chrome and automatic health labels.
- Retained inline Add Row, autosave, Excel import/export, temporary rows, split
  workflow, attachments, status handling, and manual execution-date rule.
- Added row selection, Select All, and audited multi-delete through the existing
  per-row delete action.

Validation:

- PASS: JavaScript syntax checks for all changed portal modules.
- PASS: `npm.cmd run build`.
- PASS: `git diff --check`.
- PASS: 26 focused desktop Playwright tests covering Workforce, Bank Files,
  Accounting navigation, and Bank Transfers.
- PASS: 4 targeted 390px mobile RTL Playwright tests for Payroll, Bank Files,
  Bank Transfers, and Workforce overflow.
- The initial non-escalated broad browser run could not launch Chromium with
  `spawn EPERM`; the same pinned suite was rerun with the required browser-launch
  permission and passed.

Screenshots:

- `screenshots/track025a/payroll-workbench-desktop.png`
- `screenshots/track025a/bank-files-desktop.png`
- `screenshots/track025a/bank-transfers-desktop.png`

Residual risk:

- Bulk Payroll deletion uses the existing delete action once per selected row
  because no bulk API contract was introduced.
- The ignored screenshot folder remains a local QA artifact and is not included
  in the deployable source commit.

## 2026-07-26 - TRACK025B Production Promotion

Scope:

- Merged the approved TRACK025 and TRACK025A UX releases into `main`.
- Promoted the existing linked Vercel project to Production without creating or
  changing a project, domain, URL, schema, API, business rule, or calculation.
- Preserved Production data; browser smoke checks did not submit edits or delete
  records.

Validation:

- PASS: JavaScript syntax checks for all changed portal modules.
- PASS: `npm.cmd run build`.
- PASS: `git diff --check`.
- PASS: 27 focused desktop Playwright tests on merged `main`.
- PASS: 4 targeted 390px mobile RTL Playwright tests.
- PASS: Production deployment reached `Ready`.
- PASS: Existing Production aliases resolve to the new deployment.
- PASS: Secure Production sign-in shell loads at desktop and mobile widths.
- BLOCKED: Authenticated Production feature smoke checks could not run because
  the available browser session was not signed in. No credentials were requested
  or entered, and no Production data was mutated.

Deployment:

- Initial promoted source SHA: `2edd05d5ea6b4ed713f953c1ce1178d989c936ea`.
- Deployment ID: `dpl_s5jWhrLbG58scWKx2fAsG26vhgao`.
- Existing Production URL: `https://chamah-portal-chamah.vercel.app`.

## 2026-07-27 - TRACK025C Fix TRAVEL Salary Rule

Scope:

- Fixed only the missing active TRAVEL salary-rule resolution.
- Did not change calculator logic, other salary rules, API contracts, RLS,
  schema, Edge Functions, or business-rule values.

Root cause:

- The TRAVEL factor and its `PAR-TRAVEL` rule were both active in Supabase.
- Migration `20260722103856` renamed the factor identity from
  `TRAVEL-GLOBAL_MONTHLY` to `TRAVEL-DAILY-CAPPED-MONTHLY`.
- The salary calculator resolves the stable TRAVEL identity from the established
  `*-HOURLY` and `*-GLOBAL_MONTHLY` code convention. The new value-type suffix
  therefore prevented the existing active rule from being recognized as
  TRAVEL.
- `value_type` already stores `DAILY_CAPPED_MONTHLY`; encoding the new
  calculation mode into the stable factor identity was unnecessary.

Implementation:

- Added forward-only migration
  `20260727035936_track025c_fix_travel_salary_rule_identity.sql`.
- Restored only the factor code to its calculator-compatible historical identity
  `TRAVEL-GLOBAL_MONTHLY`.
- Preserved factor/rule IDs, `DAILY_CAPPED_MONTHLY` value type, amount,
  eligibility, proration, lifecycle, school-year relationship and effective
  dates.
- Applied only TRACK025C to linked Supabase and recorded migration version
  `20260727035936` as applied. A normal `db push` was intentionally not used
  because dry-run exposed the pre-existing unrecorded TASK024C migration
  `20260726134129`, which was outside this TRACK.

Validation:

- PASS: rolled-back database transaction proved the identity repair resolves the
  active rule without changing its value type.
- PASS: linked Supabase returns active factor and active `PAR-TRAVEL` rule.
- PASS: effective endpoints `2026-09-01` and `2027-08-31` resolve active.
- PASS: adjacent dates `2026-08-31` and `2027-09-01` resolve inactive.
- PASS: 5 focused salary-calculation Playwright tests.
- PASS: `npm.cmd run build`.
- PASS: `git diff --check`.
- PASS: Supabase migration history records `20260727035936`.
- Supabase advisors reported only six pre-existing warnings unrelated to this
  data-only migration; no new advisor finding was introduced.
- Preview deployed. Authenticated visual verification is pending because Preview
  has a separate sign-in domain from the authorized Production session.

## 2026-07-27 — TRACK025D Employee Excel Import

Implemented a Supabase-only Employee Excel Import Workbench on the existing
Employees page.

Implementation:

- Added XLS/XLSX upload, drag-and-drop, downloadable XLSX template, saved
  Hebrew/English column mapping, preview, row-level validation, cancel controls,
  valid-row-only import, XLSX error export and new/updated/skipped/failed summary.
- Added client-side duplicate and identity-conflict detection. Matching uses
  employee number first and identity number only when employee number is empty.
- Added a forward-only import-mapping table and a service-only employee import
  RPC. The RPC updates only safe employee-master fields and never changes
  employee IDs, lifecycle/archive state, employment/pay-term history or payroll.
- Extended the existing permission-gated Workforce Edge Function with mapping
  retrieval and a bounded (maximum 5,000 valid rows) import action.

Validation:

- PASS: JavaScript syntax checks for all changed browser modules.
- PASS: `npm.cmd run build`.
- PASS: 12 focused desktop Playwright tests covering employee import validation,
  duplicate prevention, archived-state preservation, Employees and Actual
  Payroll regressions.
- PASS: `git diff --check`.
- Preview and linked Supabase deployment details are recorded in the completion
  report after deployment verification.

### TRACK025D deployment completion

- Applied and recorded migration `20260727041915` in linked Supabase migration
  history.
- Deployed `portal-workforce-workbench` version 8 and verified the deployed
  source contains saved mapping retrieval, `import_employees`, and
  `portal_import_employees` RPC integration.
- Verified database objects and permissions: mapping table and RPC exist;
  authenticated users cannot execute the RPC directly; service role execution
  is enabled.
- Authenticated Preview smoke passed for Employees data loading, archived
  employee preservation, import dialog/cancel, template action, workbench
  context/save state, 390px mobile RTL and 1440px desktop layout.
- The bundled spreadsheet smoke-fixture runtime did not expose its declared
  `@oai/artifact-tool` package, so live invalid-file upload was not repeated.
  Row validation, duplicate prevention and archived-state preservation remain
  covered by the 12 passing focused Playwright tests. No employee data changed
  during live verification.
- Deployed the validated UI to the existing `chamah-portal` Production project
  as deployment `dpl_DRdbSTBhYsLoqbtTXC5nszFzzbTG`; existing Production aliases
  were preserved.
- Authenticated Production smoke passed for Employees import controls and data,
  Actual Payroll data/context, Supabase save-state indicators and RTL layout.
  No new console errors appeared in the stable post-deployment checks.
## 2026-07-27 - TRACK025D Canonical Production Promotion

Scope:

- Fast-forwarded `main` to the approved TRACK025D history ending at
  `ca99883845c02d2666ec66eab2fad96f282fb9b5`.
- Deployed the existing `chamah-portal` Vercel project without creating a new
  project or domain.
- Corrected the existing canonical alias `https://chamah-portal.vercel.app`,
  which had remained on an outdated TRACK021C deployment after the normal
  Production aliases moved.
- Preserved Production data; no browser form was submitted and no application
  record was created, updated, imported, or deleted.

Validation:

- PASS: `npm.cmd run build`.
- PASS: 28 focused desktop Playwright tests covering Employees, Actual Payroll,
  Bank Files, Bank Transfers, and Accounting navigation.
- PASS: Employee Excel Import and Payroll engine tests in the pinned Playwright
  run before browser-launch-restricted UI projects timed out.
- PASS: Vercel deployment reached READY and the canonical alias resolved to the
  new Production deployment.
- BLOCKED: authenticated canonical feature smoke could not run because the
  available browser session was signed out. The secure Production sign-in shell
  loaded successfully; no credentials were requested or entered.

## 2026-07-27 - INTERNAL portal permission screen catalog repair

Root cause:

- The permissions client canonicalized missing Accounting children and added
  `dashboards.accounting.summary` to the visible permission matrix.
- The linked Supabase `portal_sections` catalog did not contain that code, so
  saving it through `portal_admin_save_user` violated
  `portal_user_permissions_screen_code_fkey`.

Implementation:

- Added forward-only migration `20260727100822` to upsert the missing Accounting
  Summary screen and reassert canonical rows for Bank Transfers, Actual Payroll,
  and the new Employees Import child permission.
- Added `dashboards.staffing.employees.import` as the dedicated permission for
  the visible Employees Excel-import workflow.
- Hid Employees Import controls without explicit EDIT access and added a
  matching server-side EDIT check before the import RPC.
- Preserved the foreign key and all existing permission rows; no permission
  deletion or constraint bypass was introduced.

Validation and deployment:

- PASS: changed JavaScript syntax checks and `npm.cmd run build`.
- PASS: 20 focused desktop Playwright permission/workforce tests.
- PASS: 5 focused permission migration/security tests and 3 employee-import
  validation tests.
- PASS: transactional live database create-then-update verification for all
  four repaired screen codes; the transaction was rolled back and left zero
  test permission rows.
- PASS: live catalog contains all four codes with zero orphan permission rows.
- Applied migration `20260727100822` to the linked Supabase project and deployed
  `portal-workforce-workbench` version 9 with JWT verification enabled.
- Preview deployed to
  `https://chamah-portal-q6k39ll59-chamah.vercel.app`.
- Production portal aliases were not modified.

## 2026-07-27 - INTERNAL permission catalog canonical Production promotion

Promotion:

- Merged the approved permission-catalog commit
  `c1aba7aeef9176b74ffcd7275beb63fb809f7bd6` into `main` as
  `f3569e92c993b667044240613d2270d12846b9b7` and pushed `main`.
- Deployed the existing Vercel project `chamah-portal` as deployment
  `dpl_CYLtnR64qC1s9xrzhDNY8ZERFfyd`.
- Explicitly assigned the existing canonical alias
  `https://chamah-portal.vercel.app` to that deployment. No project or domain
  was created.
- Vercel deployment metadata reports serving Git SHA
  `f3569e92c993b667044240613d2270d12846b9b7`, whose merge history contains the
  approved commit.

Canonical Production validation:

- PASS: authenticated permissions UI contains canonical rows for Employees
  Import (`dashboards.staffing.employees.import`), Actual Payroll
  (`dashboards.staffing.actual-payroll`), Bank Transfers
  (`dashboards.accounting.bank-transfers`), and Accounting Summary
  (`dashboards.accounting.summary`).
- PASS: changed Accounting Summary for a portal user from its inherited
  `HIDDEN` default to explicit `VIEW`, saved successfully through the canonical
  URL, then restored the original inherited `HIDDEN` state and saved
  successfully again.
- Production permission state was restored exactly after the reversible smoke
  test. No application data, permissions, constraints, migrations, or Edge
  Functions were otherwise changed during promotion.
- No browser console errors were recorded during the authenticated canonical
  verification.

## 2026-07-27 — TRACK026 Payroll Monthly Workflow

Implemented the Payroll module as a Supabase-backed monthly Workbench while
keeping the Salary Calculator separate and leaving Payroll Engine, Budget
Engine, formulas and unrelated business rules unchanged.

Implementation:

- Added scoped Payroll month identity for organization, department and daycare,
  with duplicate prevention per month/scope and combined options to copy the
  previous employee list and load active employees. Monthly hours, absences,
  gross and costs are never copied.
- Extended canonical Payroll monthly records with preparation inputs,
  monthly eligibility overrides, accounting-return actuals, row health,
  calculated-component storage, and one-level parent/split identity.
- Added atomic service-only RPCs for month opening, multi-row save/import,
  validated close with database locking, and permission-controlled reopen with
  a mandatory reason and preserved user/timestamp history.
- Extended the existing Workforce Edge Function to load canonical Employees,
  effective assignments, Pay Terms, eligibility, compensation rules and travel
  rates, and to call the TRACK026 atomic RPCs.
- Routed the top-level Payroll module directly to the Workbench. The separate
  Salary Calculator route and both calculation engines remain unchanged.
- Expanded the monthly detail editor with preparation, eligibility override and
  accountant-return fields while retaining inline editing, autosave, filters,
  import/export, allocation balance, temporary approval and read-only closed
  months from the existing Workbench.

Validation:

- PASS: JavaScript syntax checks for changed browser modules and TRACK026 tests.
- PASS: `npm.cmd run build`.
- PASS: 34 focused desktop Playwright tests covering TRACK026 contracts,
  Payroll Engine, Budget Engine and portal permissions.
- PASS: `git diff --check`.
- Supabase migration application, Edge Function deployment, Preview deployment
  and live authenticated smoke verification are recorded in the deployment
  completion entry after remote validation.

### Preview acceptance correction

- Replaced the legacy Payroll month tabs with the required Reports, Open Month,
  Working Months and Closed Months workflow.
- Added preparation, hours, actual gross, employer cost, error, organizational
  totals and calculated-versus-actual variance reports derived from the same
  loaded Payroll dataset.
- Expanded export to all, filtered, department and daycare scopes; accountant
  and actual-cost report shapes; and CSV, XLS and XLSX formats.
- Removed Payroll from the Employees & Licensing hub while preserving the
  separate top-level Payroll module and Salary Calculator.
- PASS: changed JavaScript syntax checks, `git diff --check`, build, and 92
  focused desktop/laptop/mobile TRACK026, Payroll Engine and Budget Engine
  tests. Live authenticated Preview validation follows the replacement deploy.

## 2026-07-27 — TRACK026A Complete Payroll Workbench

- Moved employee identity, assignment, monthly preparation inputs, eligibility
  overrides, calculated gross, accounting-return values, actual assignment,
  status, notes and row-health reasons into the main horizontally scrollable
  Payroll table.
- Kept employee identity, seniority and active pay terms read-only and sourced
  from canonical Supabase data. Calculated gross and component breakdown remain
  read-only outputs from the canonical Payroll record; no salary values or
  dropdown business entities were added to the frontend.
- Reduced the lower details card to advanced read-only calculation context,
  temporary approval/delete actions and one-level split allocation.
- Restricted split editing to actual hours, employer cost and department/daycare
  allocation. Added original/allocated/remaining balance visibility and
  client-side close blocking for unbalanced splits.
- Added green/yellow/red/blue row health with an inline reason, sticky employee
  columns, complete inline autosave fields, immediate Add Row, and retained
  single/bulk delete and import/export.
- Corrected the Workforce Edge Function to persist accounting-return
  `actual_allocation_unit_id` and `actual_daycare_id` into their existing
  canonical columns.
- PASS: JavaScript syntax, Edge Function Deno type-check, `git diff --check`,
  build, and 96 focused desktop/laptop/mobile TRACK026A, Payroll Engine and
  Budget Engine tests. The broader browser-runner suite was attempted twice but
  stalled without test output and was terminated; authenticated deployed
  desktop/mobile verification is the remaining Preview gate.

Architecture correction:

- Enforced the Workbench as a presentation layer only. Removed frontend
  derivation of seniority, calculated gross/components, eligibility, row
  health, split balance and close validation.
- Added a Supabase Edge projection that evaluates effective canonical pay
  terms, compensation factors/rules, employee eligibility, travel rates and
  monthly caps, assignments and saved allocations on every Payroll load.
- Inline saves now reload the backend projection immediately, so configuration
  changes are reflected without duplicating rates, limits or formulas in the
  browser.
- Split-save and month-close validation now execute in the Supabase Edge
  backend before canonical RPC persistence/locking. The UI only renders returned
  statuses, reasons, components and balance values.
- PASS after the correction: build, JavaScript checks, Edge Deno type-check,
  `git diff --check`, and 96 focused desktop/laptop/mobile regression tests.
- Moved Payroll KPI counts, report totals, organizational totals and variance
  into the same Supabase backend projection, and removed browser-side export
  aggregation. The frontend now only filters, formats and serializes returned
  values.

## 2026-07-27 — TRACK027 Runtime Configuration Layer

Replaced direct browser reads of Supabase configuration tables with one
permission-aware runtime configuration Edge Function for Home, Finance,
Staffing, Salary, Occupancy and the read-only management table views.

Implementation:

- Added `portal-runtime-config`, a JWT-protected, GET-only Edge Function with an
  immutable per-screen dataset and column whitelist.
- VIEW, EDIT and Super Admin receive the bounded configuration required by the
  authorized screen. HIDDEN receives `403 PERMISSION_DENIED`.
- Organizational-unit and daycare configuration is scope-filtered before it
  reaches the browser.
- Required empty datasets return `CONFIGURATION_MISSING` with exact dataset
  keys, distinct from authorization failure.
- The browser cannot submit table names, columns or filters and no longer reads
  runtime configuration directly from PostgREST tables.
- No schema, RLS policy, calculation, Budget Engine behavior or business-rule
  value changed.

Validation and deployment:

- PASS: JavaScript syntax check, build and `git diff --check`.
- PASS: 4 focused TRACK027 contract tests.
- PASS: live Super Admin, EDIT, VIEW and HIDDEN permission evaluation.
- PASS: `portal-runtime-config` version 1 deployed ACTIVE with JWT verification.
- PASS: Supabase security advisors; only pre-existing unrelated findings remain.
- PASS: Vercel Preview deployment `dpl_866GmCr2JR3qAzAN4WYo2MfY3feG` reached
  READY at `https://chamah-portal-g353iknfv-chamah.vercel.app`.
- Production was not modified.

Follow-up validation correction:

- Authenticated Preview validation exposed that the first generic evaluator did
  not understand canonical `AUTOMATIC_BY_SENIORITY`, `IN (...)` or
  `ELIGIBILITY_ONLY` rule expressions. Added generic DSL support and recorded
  the existing certificate, persistence and recovery-pay semantics in two
  forward-only canonical rule migrations (`20260727122923` and
  `20260727123051`).
- Revalidated the existing sample employee: base rate ₪38, effective rate ₪44,
  calculated gross ₪4,360, with canonical seniority ₪110, certificate ₪200,
  excellence ₪250, no persistence where the monthly no-absence condition is
  unset, and recovery pay eligibility-only (₪0 impact).

## 2026-07-27 — TRACK026A Dynamic Supabase Payroll Components

- Removed the Workbench's fixed compensation-component columns and replaced
  them with columns returned by the Payroll Edge projection from active
  `compensation_factors`. Each active component now displays its Supabase
  eligibility result, configured rate and calculated monthly impact.
- Added the forward-only `payroll_calculation_input_rules` configuration table
  for existing monthly input coefficients and operations. Base gross and
  effective hourly rate now come from this Supabase-owned configuration instead
  of frontend or Edge constants.
- Reworked the Edge projection to evaluate active compensation rules,
  effective dates, seniority bands, eligibility conditions, employee
  eligibility, monthly factor-ID overrides, proration methods and travel caps
  generically. It returns base hourly rate, effective hourly rate, base gross,
  calculated gross and a factor-ID-based breakdown.
- The browser now only renders backend component metadata/results and persists
  factor-ID eligibility overrides in `monthly_overrides`; the advanced panel is
  read-only calculation context and split allocation.
- Applied migration `20260727120559` to the linked shared Preview project and
  deployed `portal-workforce-workbench` version 14 ACTIVE with JWT verification.
  Migration history and function status were verified after deployment.
- PASS: build, JavaScript syntax, `git diff --check`, 12 TRACK026/A contract
  tests and 96 focused desktop/laptop/mobile TRACK026A, Payroll Engine and
  Budget Engine regression tests.
- Production was not modified.

## 2026-07-27 — TRACK026A Generic Monthly Input Framework

- Replaced fixed Workbench monthly-input columns with `monthlyInputColumns`
  returned from Supabase configuration. The browser renders controls solely by
  configured source field, label, order and value kind.
- Added `payroll_records.monthly_inputs` JSON storage. New configured inputs
  persist and recalculate without frontend changes; existing canonical fields
  remain supported as backward-compatible fallbacks.

## 2026-07-27 — Payroll Clerk Spreadsheet View

- Simplified the Payroll Workbench table for fast monthly entry: concise
  headers, small checkbox inputs, zero-value unchecked components, calculated
  amounts only when checked, and a compact in-row split `+` action.
- Kept calculation, eligibility and persistence entirely backend-driven; no
  payroll formula, rate or rule was added to the browser.

## 2026-07-27 — TRACK026B Payroll Workbench UX

- Reorganized the clerk worksheet into Employee, Monthly Inputs, Payroll
  Components and Accounting column groups, with short visible labels.
- Simplified component cells to a small checkbox and a calculated amount only;
  split allocation expands as compact inline child rows limited to Accounting
  values.

## 2026-07-27 — TRACK026C Payroll Workbench UX Alignment

- Aligned Payroll with the portal Workbench pattern: the active worksheet is
  the only operational surface, manual-add remains inline, and `+` expands
  editable inline accounting split children directly below the employee row.
- Removed visible calculation terminology from component headers and kept
  component checkboxes/amounts as presentation of the backend result only.

## 2026-07-27 — TRACK027 Preview permission-validation correction

Root cause:

- Authenticated Preview validation showed that some Workbench pages rendered
  mutation controls for a user whose resolved screen entitlement was VIEW.
  The server-side Workbench permission checks continued to reject writes, but
  the browser presentation was not consistently aligned with that entitlement.

Implementation:

- Added a shared, mutation-observing read-only presentation gate for VIEW
  Workbenches. It hides and disables Add, Edit, Delete, Bulk Delete, Import,
  Save, Archive, Split, month-open/close and transaction/transfer actions;
  disables editable row fields and selection checkboxes; and applies to the
  Employees, Payroll, Actual Payroll, Bank Files and Bank Transfers routes.
- Kept backend permission enforcement unchanged.
- Surface the runtime configuration error returned by the backend on Salary
  and Occupancy screens, preserving a distinct missing-configuration message
  from the existing access-denied state.

Validation:

- PASS: `node --check chamah-manager-portal/new/app.js`.
- PASS: `node node_modules/@playwright/test/cli.js test
  tests/runtime-configuration.spec.mjs --project=desktop-1440` (5 tests).
- PASS: `npm.cmd run build` and `git diff --check`.
- PASS: authenticated mixed-permission Preview session confirmed the Employees
  screen loads with filtering/export only and without active mutation controls.
- PASS: final Preview protected routes redirect to the distinct access-denied
  screen (including Settings), with no configuration payload rendered.
- NOTE: the supplied mixed-permission session did not expose an EDIT-assigned
  Workbench among the requested operational routes; its available Workbenches
  resolved to VIEW and were validated read-only. No alternate account was
  requested or used.
- Preview deployed to `https://chamah-portal-ccak3zwpy-chamah.vercel.app`.
  Production was not modified.

## 2026-07-27 — TRACK027 EDIT permission validation completion

- Corrected the VIEW presentation gate lifecycle: each route render now
  disconnects the prior Workbench `MutationObserver`. This prevents a VIEW
  observer from carrying over to and hiding controls on a subsequently opened
  EDIT-assigned Workbench.
- Authenticated Preview validation on Actual Payroll (`ביצוע שכר`) confirmed
  the mixed-permission account resolves this screen as EDIT: Import, Add and
  row Delete controls are visible and enabled, as are editable row fields.
- Performed an inline `actual_status` save with a temporary validation value,
  restored it to blank, and reopened the screen. The restored blank value was
  loaded from Supabase, confirming the authorized backend update and cleanup.
- Opened the manual-add row and verified its enabled inputs and Save action.
  The existing backend row-health validation retained the incomplete temporary
  draft rather than creating a record; the draft was cancelled, so no test
  record or business data remains.
- Added source-contract coverage for observer replacement. Preview deployed
  to `https://chamah-portal-qydidyhi0-chamah.vercel.app`. Production was not
  modified.

## 2026-07-27 — TRACK027 canonical Production promotion

- Merged the approved TRACK027 branch into `main` as
  `34a58c0b150e2ea2a0e3617af593069c7e86510d` and pushed `main`.
- Deployed the existing Vercel `chamah-portal` Production project as
  `dpl_6ka2S6r5Ly4VhzABjmk67EEYkxLi`. Vercel deployment metadata confirms
  target `production`, READY state, and serving Git SHA
  `34a58c0b150e2ea2a0e3617af593069c7e86510d`.
- Updated only the canonical alias `https://chamah-portal.vercel.app` to that
  deployment and verified alias resolution through Vercel inspect.
- Authenticated Production smoke test: Actual Payroll resolved EDIT with
  enabled controls; an `actual_status` temporary value saved, was restored to
  blank, and remained blank after reopening the screen from Supabase.
- Authenticated Production smoke test: Employees, Bank Files and Bank
  Transfers loaded without enabled mutation controls for the supplied account.
- The supplied mixed-permission session did not expose a route which rendered
  the distinct access-denied screen during this Production pass; HIDDEN denial
  therefore remains a follow-up verification item rather than a claimed pass.

## 2026-07-27 — TRACK027 Production HIDDEN verification completion

- Reopened the authenticated mixed-permission Production session and verified
  the known HIDDEN route `#training/settings`. It redirected to
  `#access-denied` and displayed the dedicated Hebrew no-permission screen,
  confirming HIDDEN users receive neither the protected screen nor its
  configuration.
## 2026-07-27 — TRACK026D Final Payroll Workbench Flow

- Consolidated Payroll into one continuous RTL worksheet with the prescribed
  employee identity, monthly-input, component, accounting, split, delete and
  save-status columns. Payroll no longer renders a lower details or technical
  calculation surface.
- Kept payroll inputs and components backend-projected. The visible component
  cells are compact; seniority is automatic, recovery pay is eligibility-only,
  and the single persistence checkbox is the configured no-absence monthly
  input rather than a duplicate field.
- Added an inline split child-row workflow. It keeps accounting fields only,
  previews parent/allocated/remaining totals through the Edge Function while
  typing, and autosaves only when the backend confirms every allocation total
  is balanced.
- Applied forward-only migration `20260727141324_track026d_accounting_split_fields.sql`
  to the linked Preview project. It adds the canonical actual net and split
  standard-hours/net/gross persistence fields, and atomically validates all
  accounting allocation totals in the existing payroll allocation RPC.
- Deployed the matching `portal-workforce-workbench` Edge Function after the
  migration. The function now projects and validates four split totals and
  supplies a non-mutating allocation preview for immediate worksheet feedback.
- PASS: JavaScript checks, Edge Deno type check, build, diff check, migration
  history verification and focused TRACK026D contract test. Production was not
  modified.

## 2026-07-27 — TRACK026D Calculation Input Correction

- Corrected the Payroll Edge projection to read the saved configured monthly
  `regular_hours` input for all hourly components. The previous projection read
  the legacy `payroll_records.regular_hours` value instead, so a worksheet row
  could retain an old 100-hour component basis after its monthly Hours 100%
  input was changed to 150.
- Transportation now likewise reads the configured saved `work_days` input,
  retaining the canonical backend daily-rate and monthly-cap calculation.
- No frontend rates, formulas, amounts, Payroll Engine behavior or database
  rules changed. Preview-only validation remains pending authenticated live
  matrix verification and reload confirmation.

Follow-up:

- Changed configured monthly-input saves from blur-only to a 250ms debounced
  input event. This makes a typed Hours 100% value autosave and recalculate
  without requiring a secondary click, while keeping the calculation entirely
  in the Edge projection.

Final authenticated Preview validation:

- PASS: using the EDIT-authorized account, set the same Payroll row's saved
  Hours 100% to 0, 100 and 150. Each value autosaved, survived a full reload,
  and projected Certificate / Degree respectively as ₪0 / ₪0, ₪200 / ₪100,
  and ₪300 / ₪150. The row was restored to 150 hours.
- PASS: seniority projected ₪0, ₪110 and ₪165 at the same matrix points,
  proving it follows the active hourly seniority rate and saved Hours 100%.
  Transportation remained ₪70 for 18 saved working days, so the configured
  daily-rate/monthly-cap result remained independent of the hours change.
  Fixed components (Excellence ₪250, Classroom Manager ₪250 and Persistence
  ₪600) remained unchanged across the matrix.
- PASS: desktop RTL worksheet and mobile 390px RTL check completed with no
  page-level horizontal overflow and no browser console errors. Production was
  not modified.

## 2026-07-27 — TRACK026E Payroll Workbench UX alignment

- Audited the Employees, Bank Files, Bank Transfers and Accounting table
  implementations before changing Payroll. Payroll now follows the existing
  Workbench conventions: an inline draft row for Add Row, the shared bulk
  action bar, and directly nested child allocation rows.
- Kept Payroll as a single worksheet by hiding the legacy month-flow and KPI
  card surfaces. All employee, monthly input, payroll component and accounting
  work remains in the table.
- Reused the Bank/Transfer child-row visual contracts for split rows, summary
  totals and the inline “add split” action. Split rows retain only the
  accounting allocation fields and show parent, allocated and remaining hours,
  net, gross and employer cost.
- Component columns remain backend-projected. The worksheet renders one compact
  checkbox and amount per configured component, including one recovery column
  whether the backend calls it recovery or convalescence pay. No rates,
  formulas, eligibility rules or validation logic were moved to the browser.
- Added focused TRACK026E source-contract coverage. Preview validation and
  screenshots are pending the deployment and authenticated review. Production
  was not modified.

Final authenticated Preview validation:

- PASS: verified the deployed worksheet has one continuous table with compact
  component checkbox-and-amount cells, accounting columns at the end, and no
  lower payroll details surface.
- PASS: Add Row opens the editable inline draft row and cancelling it leaves no
  saved record. Split opens one inline child row immediately below the parent;
  its parent / allocated / remaining summary covers hours, net, gross and
  employer cost, with an inline add-split control.
- PASS: desktop worksheet, inline Add Row and expanded Split screenshots were
  captured on Preview. Mobile 390px RTL reports a 390px page width for a 390px
  viewport, and the browser console has no errors.
- Preview deployed to `https://chamah-portal-kb0wf8ai4-chamah.vercel.app`.
  Production was not modified.

## 2026-07-27 — TRACK026F Payroll clerk worksheet flow

- Reordered the worksheet for payroll entry: row number, employee number/name,
  employee details, working days and hours, component columns, then
  vacation/sick/notes and accounting. The component order remains a backend
  projection and its cells stay checkbox-plus-calculated-amount only.
- Replaced the transient Add Row draft with an immediately persisted manual
  payroll draft. A draft remains visible after reload as Missing; it accepts a
  native smart employee search by number or name, or temporary/manual identity
  details and an explicit base rate and seniority.
- Extended the existing Edge Function projection so manual records use their
  saved manual seniority/base-rate context while all gross and component values
  continue to be calculated by Supabase. No frontend payroll formula or rate was
  introduced.
- Updated inline split initialization to follow the Bank parent/child workflow:
  the first child copies the parent accounting allocation and a second child is
  blank. Existing atomic save/preview validation remains the source of balanced,
  remaining and over statuses.
- Implementation validation passed locally. Edge Function deployment and
  authenticated Preview validation are pending.

Authenticated Preview validation status:

- PASS: the table shows the requested row number first, compact ordered
  component columns, vacation/sick after components, a table-header `+`, and a
  persisted Missing draft row. The mobile RTL document width stays within the
  viewport and no browser console errors were recorded.
- BLOCKED: the temporary employee-number field displays immediately but clears
  after a full reload, so temporary identity persistence is not yet proven.
  The linked Preview dataset currently has no active Employees, so smart lookup
  and existing-employee autofill cannot be authenticatedly exercised without
  adding business data. TRACK026F remains incomplete; Production was not
  modified.

## 2026-07-27 — TRACK026G Payroll clerk workbench validation handoff

- Fixed temporary payroll identity persistence by saving the manual employee
  identifier inside the canonical `source_payload.manual_employee` payload as
  well as the record identifier. This preserves the exact temporary number and
  name used by the worksheet after a save and reload.
- Kept the frontend presentation-only: it sends the manual identity context to
  the existing Supabase workbench endpoint; component calculation and payroll
  validation remain backend-projected.
- Styled worksheet numeric inputs as plain spreadsheet fields by removing the
  browser number-spinner affordances. No payroll values, formulas or rules were
  changed.
- PASS: `node --check chamah-manager-portal/new/payroll-workbench.js` and
  `npm.cmd run build` completed successfully. Preview was deployed to
  `https://chamah-portal-f6bryhqy5-chamah.vercel.app`.
- BLOCKED BY BROWSER CONTROLLER: the in-app controller returns a stale internal
  tab ID (`24`) while the only visible signed-in Preview tab is a newer ID
  (`28`), so it cannot read or interact with the authenticated page. The
  remaining manual checks are: temporary number/name save and reload; create a
  disposable active Preview employee, lookup by number and by name, verify
  autofill, then delete it; and visually confirm the numeric fields have no
  spinner arrows. Production was not modified.

TRACK026G completion follow-up:

- Extended the existing payroll number-input spinner reset to split-child
  numeric inputs. This is a CSS-only scope correction; payroll calculations,
  APIs, database rules and worksheet behavior are unchanged.
- Added focused source-contract coverage for the split-child number-input
  selectors. The focused four-project Playwright contract check, build and diff
  check passed. Authenticated Preview validation and test-data cleanup follow
  after the Preview deployment. Production was not modified.

Final authenticated Preview validation:

- PASS: created one disposable active employee (`026G-EMP-TEST`) and confirmed
  Payroll smart lookup by the exact employee number and by the employee name.
  Both paths loaded the canonical employee name into the payroll row.
- PASS: every numeric input in both generated split-child rows computed to
  `appearance: textfield`, matching the parent worksheet inputs and removing
  the native number-spinner affordance.
- PASS: removed the test payroll record formerly identified as
  `TEST-TEMP-026G` and hard-deleted the disposable employee. Final linked
  Preview queries returned zero matching employee rows and zero matching
  payroll rows; an authenticated reload showed neither test identifier.
- The payroll deletion itself succeeded, but its subsequent audit write logged
  an existing `audit_events_operation_check` rejection for operation `DELETE`.
  No test data or partial feature deployment remains. Production was not
  modified.

## 2026-08-03 — TRACK026H Payroll Module Navigation

- Replaced the direct Payroll Workbench landing with a dedicated Payroll module
  home and four canonical pages: Open New Month, Working Months, Closed Months,
  and Payroll Reports.
- Kept the TRACK026G Workbench calculations and row workflow intact. The
  Workbench now requires an explicit month selection from Working or Closed
  Months, locks its month selector, and returns to the appropriate month list
  after close or authorized reopen.
- Added a scoped month-opening form with duplicate prevention, organization,
  department or daycare scope, previous-month employee copy, and active
  Employees loading. Successful creation redirects to Working Months.
- Added independent canonical permission routes for `payroll`, `payroll.open`,
  `payroll.working`, `payroll.closed`, and `payroll.reports`. The Payroll Edge
  Function now enforces the matching route permission per view or lifecycle
  action.
- Replaced close/reopen RPCs with atomic status-and-audit implementations.
  Reopen requires a reason, clears prior close locks, records the audit event,
  and returns the month to Working Months.
- Applied migration `20260803100912_track026h_payroll_module_navigation.sql`
  and deployed `portal-workforce-workbench` version 24 to the linked Preview
  Supabase project. Production was not modified.
- Local validation passed: JavaScript syntax checks, build, desktop Payroll
  navigation checks (18 passed), mobile RTL/responsive plus Payroll engine
  checks (25 passed). A broader legacy TRACK026 run reported 26 passes and 10
  failures because those tests still target the intentionally retired direct
  `actual-payroll` route and embedded month-navigation UI; no calculation-engine
  regression was reported.
- Authenticated Vercel Preview lifecycle validation and final disposable test
  data cleanup are pending the frontend Preview deployment.
- During authenticated validation, closing an empty disposable month passed and
  the Closed Months view correctly enforced read-only controls. Reopen still
  used a native prompt that the Preview controller could not submit, so it was
  replaced with the Workbench's existing accessible dialog form. The reason is
  still required and sent to the same audited reopen action.
- Final authenticated Preview validation passed on
  `https://chamah-portal-pc7h1eo8n-chamah.vercel.app`: all four canonical pages
  rendered under their own permissions, the module stayed RTL with no viewport
  overflow, duplicate month creation was blocked, Working Months did not open a
  Workbench until explicit selection, and the selected month was fixed in the
  Workbench.
- Created one empty disposable organization month (`12/2035`), confirmed close
  and read-only behavior, reopened it with the required reason, and verified two
  `STATUS_CHANGE` audit events with CURRENT→CLOSED and CLOSED→CURRENT plus the
  saved reopen reason. The exact disposable month and its two validation audit
  events were then deleted. Final database counts were zero for the test month,
  payroll rows and audit rows; authenticated Working/Closed pages showed no test
  month and no browser warnings or errors.

## 2026-08-03 — TRACK026A–H canonical Production promotion

- Merged `codex/track026-payroll-monthly-workflow` into `main` with merge commit
  `0e5bf1c6b5d615e4d87487c0ff68ec2853f94041` and pushed `main`.
- Deployed the existing Vercel project `chamah-portal` to Production as
  deployment `dpl_Dwmud2W6z5Dg4modmas2duLN4iGb`. Assigned only the canonical
  alias `https://chamah-portal.vercel.app` to that deployment and restored the
  unrelated project aliases to their prior deployment.
- Verified the canonical deployment metadata reports Git SHA
  `0e5bf1c6b5d615e4d87487c0ff68ec2853f94041`, whose second parent is the final
  TRACK026 commit `e7d2403240bef5caf54692fed2b9054a884e0907`.
- Authenticated Production validation passed for Payroll home and canonical
  navigation, open/working/closed month lists, duplicate prevention, explicit
  Workbench selection, employee number/name lookup and autofill, manual draft
  persistence, calculations, split rows/totals, read-only close, authorized
  reopen with required reason, audit events, reports, and route permissions.
- Computed Production browser styles confirmed `appearance: textfield` on every
  sampled parent and split-child number input. Authenticated desktop Production
  pages were RTL; the focused desktop and mobile RTL/overflow Playwright
  regression sets passed locally before deployment.
- Production regression smoke passed for Employees, Bank Files, and Bank
  Transfers. A rapid route-away produced one transient Employees mount error;
  an isolated Employees Production load passed with no console errors.
- Created one disposable active employee and two disposable payroll months for
  the authenticated workflow. After validation, deleted their payroll rows,
  allocations, audit events, months, and employee dependencies. Final database
  counts and authenticated UI checks confirmed zero remaining test records.
- No Production migration, Edge Function, schema, RLS, calculation, or unrelated
  module change was made during the promotion.

## 2026-08-20 — TRACK027B Bank Daily Search, Filters & Performance

- Replaced the Bank Workbench's silent 2,000-transaction / 5,000-allocation
  caps and browser-only filtering with complete-year server processing in the
  existing `portal-bank-workbench` Edge Function. Reads are batched without a
  silent ceiling; only the matching page and its allocation rows are returned,
  together with exact total/page metadata and an explicit `complete` flag.
- Added an always-visible active calendar year, AND-combined multi-select
  transaction month, assignment month, daycare, department, account, budget
  category and accounting-status filters; global cross-field search; blank and
  non-blank description/reference filters; sortable daily-work columns; split
  state filtering; removable chips; Clear All; and exact pagination controls.
- Added live Unassigned and Requires Attention queues. Unassigned retains the
  existing zero-allocation Untreated predicate; Requires Attention counts each
  parent once when it is untreated, missing required information, missing
  documents, or has an unbalanced split. The existing classification and save
  validation predicates remain unchanged.
- Inline saves now refresh the current server query while preserving the active
  filters, sort and scroll state, so queue membership and exact counts update
  immediately without resetting the operator's workspace.
- Deployed `portal-bank-workbench` Edge Function version 11 to the linked
  Preview Supabase project. No schema, RLS, workflow, accounting, calculation,
  or Production change was made.
- PASS: JavaScript syntax checks, application build, focused classification and
  complete-pagination contracts, and Bank Workbench UI regression suites on
  desktop 1440px and mobile 390px (17/17 in each project). A live read-only
  Preview query confirmed the 2026 dataset contains 348 transactions and one
  allocation, including 347 exact zero-allocation Unassigned transactions.

## 2026-08-20 — TRACK027C Bank Operator Validation

- Repointed the fixed authenticated Preview alias to the existing READY
  TRACK027B deployment after operator validation initially exposed the prior
  Bank Workbench build at that alias. Production was not modified.
- Authenticated real-data validation confirmed the active 2026 year, exact 348
  transaction total, 347 Unassigned and 347 Requires Attention queues, live
  global search, multi-select facets, date and amount sorting, Clear All, and
  complete seven-page traversal (six pages of 50 plus a final page of 48).
- Found and fixed a desktop-only horizontal-overflow defect caused by the
  expanded TRACK027B filter toolbar remaining a single unwrapped flex row. The
  toolbar now wraps within its container; no business classification,
  calculation, API, schema, RLS, or Edge Function behavior changed.
- Added a responsive regression assertion that the Bank Workbench does not
  expand the document beyond the viewport. PASS: application build and 34/34
  focused Bank Workbench tests across desktop 1440px and mobile 390px. The
  authenticated browser console contained no warnings or errors.
- Deployed commit `d640027` to Vercel Preview deployment
  `dpl_8SYAGfA31wyZKXoNBPADLbL6innR` and repointed only the fixed Preview alias
  `https://chamah-portal-chemlevin-chamah.vercel.app`; Production remained
  unchanged. Live desktop and mobile revalidation confirmed zero page-level
  horizontal overflow.
- With explicit operator approval, re-saved only real Preview reference
  `140813` without changing any value. Its amount, movement type, department,
  daycare, category, assignment month, accounting status, and notes remained
  identical after the save refresh. The active July filter and exact-amount
  search remained intact, and Clear All again restored all 348 transactions.

## 2026-08-20 — TRACK027D Active Filter Visual Check

- Authenticated desktop review found that active daycare and department chips
  exposed raw UUIDs, multi-select controls lacked an explicit selected count,
  and active queue and column-sort states were too visually subtle for daily
  operator use.
- Added presentation-only active-state treatment: selected multi-select options
  use a high-contrast highlight, every multi-select shows `הכול` or an explicit
  selected count, chips use human-readable lookup labels and include the active
  year, the active Quick Queue uses a filled selected state, and the active
  table sort shows its direction with `aria-sort`.
- Clear All now visibly restores empty multi-selects, `הכול` summaries, the All
  Transactions queue, and default newest-first date sort. No filter predicate,
  request parameter, business classification, API, database, RLS, calculation,
  or Production behavior changed.
- PASS: JavaScript syntax check, application build, isolated active-state UI
  check, and 36/36 focused Bank Workbench tests across desktop 1440px and
  mobile 390px.
- Deployed commit `7cdfdf9` to Vercel Preview deployment
  `dpl_5Trz3sLxRvobzr7wCkerQnh9FPEe` and repointed only the authenticated
  Preview alias. Live 1440px and 390px checks confirmed readable labels, white
  selected-option text on the active fill, explicit selection counts, filled
  queue and sort states, correct sort direction, no viewport overflow, and no
  console warnings or errors. Clear All restored all seven multi-selects to
  zero selections and `הכול`, the All Transactions queue, newest-first date
  sort, the year-only context chip, and the exact 348-transaction total.

## 2026-08-20 — TRACK027E Bank Workbench canonical Production promotion

- Merged only the validated TRACK027B–D commit range into `main` with merge
  commit `a3367eea776579cb47c6043b189e48841287c97f` and pushed `main`.
  The PROJECT_LOG conflict was resolved by preserving the existing TRACK026
  Production record and appending the TRACK027B–D history chronologically.
- Vercel built READY Production deployment
  `dpl_BiWnzvwW6Dj6b39UPazQUuE2fRKB` for that exact merge SHA. Assigned the
  canonical alias `https://chamah-portal.vercel.app` to the READY deployment;
  the prior canonical deployment was not modified or deleted.
- Authenticated, read-only canonical Production smoke passed: active year 2026;
  global search; June+July and account multi-select filters; 347 Unassigned and
  347 Requires Attention queues; newest/oldest date and high/low amount sorts;
  seven complete pages totaling 348 transactions; and Clear All restoring all
  348 rows with zero selected multi-select values.
- Representative real transaction reference `140813` retained its exact amount,
  movement type, department, daycare, category, assignment month, accounting
  status, and notes before and after the smoke. No Save or other mutation action
  was used. Desktop 1440px and mobile 390px remained RTL without page overflow,
  and the authenticated browser console contained no warnings or errors.
- PASS before promotion: JavaScript syntax, application build, and 36/36 focused
  Bank Workbench tests across desktop 1440px and mobile 390px. No database,
  migration, RLS, Edge Function, calculation, business-rule, or Production data
  change was made during promotion.

## 2026-09-17 — TRACK030B Bank Upload History

- Added a read-only Hebrew RTL `היסטוריית העלאות` modal beside Bank File import.
  It shows every configured account's latest retained transaction date and the
  latest 50 bank-file batches with account, filename, transaction range,
  upload timestamp, total/imported/duplicate/rejected counts, and status.
- Added explicit empty and legacy states for accounts without transactions,
  historical batches without recoverable ranges, and incomplete old imports.
- Reused `import_batches`, `bank_accounts`, `bank_transactions`, and the
  authenticated `portal-bank-workbench` Edge Function; no new table or browser
  write action was added.
- Applied forward migration
  `20260917082920_track030b_bank_upload_history.sql`. New confirmed bank imports
  now persist `source_transaction_min_date` and
  `source_transaction_max_date` in `import_batches.metadata`, calculated only
  from accepted import rows. Existing batches were intentionally not backfilled.
- Deployed `portal-bank-workbench` version 13 with JWT verification. Its GET
  response now includes `uploadHistory`; persisted metadata is preferred and
  retained legacy transactions are used only as an honest read-time fallback.
- A rollback-only live Preview import probe proved that a two-date import saves
  the exact minimum and maximum metadata dates. The probe left zero batches or
  transactions behind. Existing historical metadata remained unchanged.
- PASS: JavaScript syntax checks, `git diff --check`, application build, 20/20
  focused migration/API atomicity checks across four projects, and focused
  Bank Upload History browser checks at desktop 1440px and mobile 390px.
- Supabase advisors reported only pre-existing security/performance findings;
  TRACK030B introduced no new table, RLS policy, or index finding. Production
  was not modified.

## 2026-09-17 — TRACK030B canonical Production promotion

- Promoted only TRACK030B onto canonical `main`; TRACK028B, TRACK029, TRACK030C,
  and unrelated working-tree changes were excluded from the promotion commit.
- Confirmed the single canonical Supabase backend already contained migration
  `20260917084017 track030b_bank_upload_history`; no migration was reapplied and
  no legacy batch metadata was backfilled or altered.
- Deployed the exact TRACK030B `portal-bank-workbench` source as active Edge
  Function version 15 with JWT verification enabled.
- Captured pre/post content digests for `bank_accounts`, `bank_transactions`,
  `import_batches`, and `bank_allocations`; all counts and digests were identical
  after backend deployment and live smoke validation.
- Built READY Vercel Production deployment
  `dpl_BfoRdTF68uKwj1oAB7KjA7ERS1yG` and assigned the canonical
  `https://chamah-portal.vercel.app` alias to it.
- Authenticated read-only Production smoke confirmed all five account coverage
  cards at 31/08/2026, all eight retained/legacy upload-history rows, correct
  persisted and derived date ranges/counts, and truthful unavailable-range and
  incomplete-import states.
- Desktop and 390px mobile checks remained RTL without page-level horizontal
  overflow; the upload-history dialog opened correctly and browser console
  warnings/errors were empty. No import, save, edit, or delete action was used.
- Final canonical reload exposed and fixed an early-click race: if the history
  button is pressed before the initial payload finishes loading, the page now
  shows a loading status instead of dereferencing empty state. The guarded flow
  passed the full focused desktop/mobile suite without changing history data.
- PASS before promotion: JavaScript syntax, `git diff --check`, application
  build, and 36/36 focused Bank Workbench tests across desktop and mobile.
## 2026-09-17 — TRACK030C Bank Description Filter + Accounting Month Fix

- Added a dedicated Bank Transactions description filter with partial,
  case-insensitive matching. It is AND-combined server-side with existing
  search, facets, queues and split filters; its removable chip and input state
  persist through sort, pagination and inline-save reloads.
- Corrected the existing `assignmentMonths` lookup to use canonical calendar
  years instead of school-year months, while retaining any already-saved
  assignment month present on the selected year's transactions. This makes
  January-August 2026 selectable without changing September-August school-year
  behavior elsewhere or weakening allocation validation.
- No schema, migration, RLS, calculation or stored-assignment change was made.
  The Bank Workbench Edge Function and frontend were deployed to Preview only;
  Production was not modified.
- PASS: JavaScript syntax, application build, focused source contracts, and
  desktop 1440px/mobile 390px interaction checks for filtering, combined
  filter/sort state, removable chips, and January/August/September 2026 month
  options.
- Authenticated Preview validation passed on the fixed Preview alias. Partial
  `עמל` matching returned only matching descriptions and remained active with
  an account filter, Unassigned queue, amount sort and pagination. Reference
  `140813` successfully saved January, August and September 2026 while staying
  valid; its original July 2027 month was restored and all other allocation
  fields remained unchanged. The document remained RTL with no horizontal
  viewport overflow in the verified desktop build; mobile RTL passed the
  corresponding 390px Playwright coverage. Production was not modified.

## 2026-09-17 — TRACK030C canonical Production promotion rerun

- Verified the canonical Production gate before mutation: Vercel project
  `chamah-portal` (`prj_6IND7ee2E9s3KispBh6iBDWwQo6X`), canonical URL
  `https://chamah-portal.vercel.app`, Supabase project
  `vyyfuaqmbxvfqgbfqooc`, applied remote TRACK030B migration
  `20260917084017`, and active `portal-bank-workbench` version 15 with JWT
  verification. TRACK030B Upload History was live, so no migration or 030B
  deployment was reapplied.
- Promoted only the validated TRACK030C Description filter and calendar-based
  accounting assignment months to canonical `main`. Deployed
  `portal-bank-workbench` version 16 with JWT verification and no database,
  schema, migration, RLS, import, edit, or record mutation.
- Built READY Vercel Production deployment
  `dpl_5pfiiDgd8Z7de7ZVb6jWBjELq4GM` from application commit
  `ce07f9d61186db9a2e04642ffc2629a838a1aef6` and assigned the canonical alias.
  The preview-named project domain continues to route to the same Production
  artifact rather than a separate Preview environment.
- Authenticated read-only Production smoke confirmed all five TRACK030B account
  coverage cards through 31/08/2026, all eight retained/legacy upload-history
  rows and truthful legacy states, live partial Description filtering, and
  January-August 2026 assignment options. Clearing the filter restored the
  unfiltered view; browser console warnings/errors were empty.
- PASS: JavaScript syntax, application build, 20/20 TRACK030B/TRACK030C source
  contracts across four Playwright projects, 6/6 focused browser checks at
  desktop 1440px and mobile 390px, and `git diff --check`.

## 2026-09-18 — TRACK038A Complete TRACK034/035 Production Promotion

- Reverified READY Production deployment
  `dpl_CPpTqXrsr2UZGpYjU97LSt3TTW8H` belongs to project
  `prj_6IND7ee2E9s3KispBh6iBDWwQo6X` and contains the exact validated
  application SHA `51f76a79473b186a9a8882a6fea2ccec24fc4724` before changing any alias.
- Explicitly moved only `https://chamah-portal.vercel.app` from deployment
  `dpl_DdocEox1zT6E2tJu41YNqb1ZydAR` to `dpl_CPpTqXrsr2UZGpYjU97LSt3TTW8H`.
  The preview-named project domain retained its existing mapping to the same
  validated deployment.
- Authenticated canonical Production smoke passed on desktop and at an explicit
  390px viewport: 2,453 total, 0 split, 1 assigned, 2,452 unassigned; desktop
  continuous loading reached 50, 100, and 150 unique ordered rows, and mobile
  reached 50 then 100 unique rows without Previous/Next controls.
- Description search `פעול דנ` returned 40 records; global Reference `144247`
  returned its single row; combining Reference with Description `פעול`
  returned one row and updated all four summary cards. Clear All restored the
  2,453-record summary and first 50 rows.
- Upload History remained available with eight retained history records;
  transaction months remained January-December 2026 and assignment months
  January 2026-December 2027. Loading states were observable, RTL was retained,
  the 390px document had no horizontal overflow, and console errors were empty.
- No import, edit, save, delete, schema, migration, Supabase, Edge deployment,
  or bank/accounting data mutation occurred. Live totals remained unchanged
  before and after smoke validation.
- Reconciled only the approved TRACK034/035 application and Edge source plus
  TRACK037-stabilized focused tests into canonical `main`; unrelated branch
  commits and build-generated output were excluded.

## 2026-09-18 - TRACK040 Budget Actuals Reliability

Objective: Apply the minimal TRACK039 reliability fixes to Bank and Payroll
Actuals, investigate the suspicious July 2027 Budget assignment without changing
Production data, and deploy Preview only.

Implementation:

- Added one deterministic Finance Dashboard Actuals contract shared by KPIs,
  monthly balances, school-year summaries, and category matrices.
- Bank Actuals now preserve signed accounting semantics: matching income uses the
  signed allocation amount, matching expense uses its negation, reversals/refunds
  reduce Actual, and INTERNAL, EXCLUDE, incomplete, contradictory, and bank
  payroll-category rows have zero Budget effect.
- Payroll Actual now comes only from payroll record `employer_cost`. Canonical
  split children replace the parent; an unsplit parent is used once only with
  sufficient canonical unit/daycare attribution. Mismatches and insufficient
  attribution are reported without guessing. Month status does not gate Actual.
- Bank Workbench Edge Function validation rejects new INCOME-to-non-INCOME and
  EXPENSE-to-non-EXPENSE assignments. Deployed `portal-bank-workbench` v18 with
  JWT verification enabled to the linked Preview backend.
- Confirmed the seven daycare allocation units each map to exactly one daycare,
  so no daycare schema change was required.
- Updated canonical business rules and deterministic regression fixtures/tests.

Read-only Production investigation:

- Transaction `ccd205e6-93ff-49a2-9c88-937232efcd97`, description `דנ"ח פעולות`,
  transaction date 2026-07-31 and signed amount -37.96, currently has one
  EXPENSE / CAT-FEES allocation for -37.96 assigned to Budget month 2027-07.
- The allocation was created at 2026-09-17 09:02:07 UTC (12:02 Israel) by the
  active organization super-admin identity, with no later update. This coincides
  exactly with TRACK030C authenticated Preview validation and is the only
  2026-to-2027 assignment in the linked data. The allocation save function does
  not emit an audit event, so TRACK030C/test activity is the high-confidence
  cause from timing and actor evidence, not a complete audit-chain proof.
- No automatic/default code assigns a future Budget month; the Bank Workbench
  persists the explicit selected month. No historical data was changed.
- The canonical school-year rows confirm 2026-09, 2027-01, and 2027-08 all map
  to SY-2026-2027 / תשפ״ז.

Validation:

- PASS: `node --check` for `app.js` and `actuals-calculations.js`.
- PASS: TRACK040 deterministic contract suite, 9/9 desktop.
- PASS: combined TRACK040 and Finance Dashboard desktop suite, 22/22.
- PASS: TRACK040-relevant Finance Dashboard mobile 390px suite, 5/5.
- PASS: `npm run build` and `git diff --check`.
- PASS: Vercel Preview deployment `dpl_38SnDzWLySWii5hc77TjZkUj257g` reached
  READY and protected CLI retrieval confirmed the deployed Actuals module.
- BLOCKED: real-browser authenticated Preview validation reached the protected
  Vercel/OpenAI login boundary, but the isolated browser had no saved Vercel or
  portal account session and no validation credentials were available. No login
  or data mutation was attempted.

## 2026-09-19 - TRACK041 Promote TRACK040 to Production

Scope:

- Integrated only the two validated TRACK040 commits onto canonical `main`.
- Redeployed only `portal-bank-workbench` to Supabase project
  `vyyfuaqmbxvfqgbfqooc`; version 19 is ACTIVE with JWT verification enabled.
- Promoted validated Preview deployment `dpl_38SnDzWLySWii5hc77TjZkUj257g`
  into READY Production deployment `dpl_TVznemwbLEyHrC6ffjLdxxkyYzC4`.
- Assigned only `https://chamah-portal.vercel.app` to the new Production
  deployment. No project, domain, database, migration, or historical data was
  created, deleted, or modified.

Validation:

- PASS: Vercel project ID `prj_6IND7ee2E9s3KispBh6iBDWwQo6X`, project name
  `chamah-portal`, validated source artifact, and canonical alias identity.
- PASS: JavaScript syntax checks and `npm run build`.
- PASS: TRACK040 plus Finance Dashboard desktop suite, 22/22.
- PASS: Finance Dashboard 390px suite, 12/12 applicable with one intentionally
  desktop-only test skipped.
- PASS: protected Production retrieval returned HTTP 200 for `/new/` and
  `/new/actuals-calculations.js`.
- PASS: authenticated canonical Production Finance Dashboard loaded with
  09/2026 mapped to תשפ״ז; Bank loaded 2,453 transactions; Payroll loaded its
  module destinations; browser console errors were empty.
- PASS: deterministic contracts cover INTERNAL/EXCLUDE zero Budget effect,
  signed refund/reversal semantics, Payroll `employer_cost`, prevention of Bank
  payroll duplication, and the תשפ״ז month mapping.

## TRACK043 — Promote TRACK042 Bank Transfers to Production (2026-09-22)

- Verified Vercel project `prj_6IND7ee2E9s3KispBh6iBDWwQo6X` is `chamah-portal`; approved TRACK042 Preview artifact `04c18fe5b43c202d332068b6b11e16c6f268f440` was READY. The four implementation/test files in the Production candidate matched that artifact byte for byte.
- Current `main` had diverged from the TRACK042 branch. Applied only the four approved Bank Transfers files to `main`, recorded the approved commit in merge ancestry without importing unrelated branch changes, and validated the resulting Preview build and 14/14 desktop/390px Bank Transfers tests.
- Pushed the candidate to `main`. Production deployment `dpl_9eLZhS8jxCZKyym6m7fbEt9bTBqA` reached READY at SHA `fa89a8f5381e1ff78f155208fb4e25f087d0a154`. The canonical alias was still pinned to an older deployment, so reassigned the existing alias to this deployment and verified the alias resolves to its ID/SHA and serves the new Bank Transfers script.
- Confirmed linked Supabase `portal-bank-transfer-workbench` v3 is ACTIVE with JWT verification, and its deployed source matches the approved TRACK042 Edge Function. No migration or existing business record was changed for the release.
- Authenticated canonical Production loaded Bank Transfers. Read-only checks confirmed the entry date, pending execution-date indication, full-dataset attachment count/filter, and split collapse/reopen. A disposable zero-amount transfer autosaved without an execution date, survived refresh, retained its entry date after editing, and two split children copied and saved without execution dates. Both children survived refresh. The QA family was archived; active transfer count returned to its original three rows. Browser console and Vercel runtime error checks were clear.
- IMPORTANT: `portal-bank-transfer-workbench` uses audit operation `ARCHIVE` for the delete action, but `audit_events_operation_check` allows no `ARCHIVE`. This pre-existing delete-path mismatch is outside the promotion-only scope. The QA cleanup was performed by guarded archive updates on the exact disposable IDs, followed by an `UPDATE` audit entry. No existing transfer was changed.

## TRACK042 — Bank Transfers workflow improvements (2026-09-22)

- Kept partial Bank Transfer rows eligible for autosave without an execution date. Pending rows without that date display an orange state; completion still requires a manually entered execution date.
- Preserved autosave controllers across table rerenders so filtering, sorting, and split collapse do not cancel a pending save. Kept newer edits made during an in-flight insert and saved them against the assigned transfer ID.
- Displayed the canonical `created_at` as the entry date. No entry-date column or migration was added.
- Added copying of applicable details from the previous split row, plus a full-dataset missing-attachment count and filter.
- Changed the Bank Transfer Edge Function list read to page through active rows by `row_number`, removing its fixed 5,000-row response cap. The linked Preview backend was read-only checked before deployment; its active set is currently smaller than one page, so multi-page behavior was validated by code review rather than live volume.
- Verified the current model: each parent and split child independently stores `allocation_unit_id` and `daycare_id`, and the existing API/database validate daycare-to-unit consistency. Both fields are nullable, so future daycare-scoped permissions must define handling for unassigned rows and split children with different assignments.
- Validation: Bank Transfers Playwright suite passed 14/14 across desktop 1440px and mobile 390px; build, syntax, and diff checks passed. Preview deployment details are recorded in `PROJECT_STATE.md`.

## TRACK044 — Bank Transfer delete/archive audit regression (2026-09-22)

- Root cause: the delete handler archived the parent and active split children, then wrote audit operation `ARCHIVE`, which the canonical `audit_events_operation_check` rejects. The operation constraint permits `UPDATE` for the lifecycle update and was verified unchanged on the linked backend.
- Changed only the audit operation to `UPDATE`. The prior parent/children snapshot, archived lifecycle payload, archive response, active-list filtering, and browser behavior are unchanged. No migration or existing business-data edit.
- Added a handler regression test that executes the actual Edge Function with an in-memory REST contract enforcing the migration's allowed audit operations. It verifies the parent and child archive, accepted audit event, and empty active list after a fresh GET.
- Validation: 16/16 focused Playwright tests passed across desktop 1440px and mobile 390px (two new handler cases plus the existing 14 TRACK042 cases). Read-back confirms `portal-bank-transfer-workbench` v4 ACTIVE, JWT verification enabled, with the corrected source and unchanged live audit constraint.
- Deployed only the Edge Function to the linked shared backend. Preview and Production use that same backend, so this deployment becomes live for both at once; there is no independently promotable backend artifact. No Vercel frontend deployment was made. Canonical URL inspection resolved READY Production deployment `dpl_9eLZhS8jxCZKyym6m7fbEt9bTBqA`, serving Git SHA `fa89a8f5381e1ff78f155208fb4e25f087d0a154` independently of TRACK044. An authenticated real-data archive was not attempted because it would modify existing business data.

## TRACK045 — Bank Transfers daycare permission foundation (2026-09-22)

- Added per-user Bank Transfers scope (ALL / ASSIGNED_DAYCARES) and independent approval/execution-date action flags without changing existing users' assignments or screen-level HIDDEN / VIEW / EDIT model.
- Edge Function filters scoped transfers and reference-daycare options, denies out-of-scope direct IDs and mutations, and projects cross-daycare split children without parent or sibling details. Parent mutations with foreign split allocations are denied. A single assigned daycare is automatically selected on creation.
- Added explicit approval-for-execution state/action, permission-editor controls and Daycare Manager preset. Existing super-admin access remains unrestricted.
- Migration `20260922142635_track045_bank_transfer_permissions` applied to the linked shared backend. `portal-bank-transfer-workbench` v5 and `portal-users` v7 are ACTIVE with JWT verification enabled. The service-only administration RPC was verified inaccessible to anon/authenticated.
- Browser regression: 36/36 existing desktop and 390px tests passed; new preset test 2/2 passed; focused backend security tests 5/5 passed. No real user permissions or business records were changed.
- Vercel Preview `dpl_2XK6BCjWNkyo5aNCw28CA61RiKjW` is READY at `https://chamah-portal-akly2b111-chamah.vercel.app`, serving implementation SHA `3635da5f514334597318489ed77dfc515c03f9ca`. No Production frontend deployment or promotion.

## TRACK046 — Promote TRACK045 permission foundation (2026-09-22)

- Verified Vercel project `prj_6IND7ee2E9s3KispBh6iBDWwQo6X`, linked Supabase `vyyfuaqmbxvfqgbfqooc`, migration `20260922142635_track045_bank_transfer_permissions`, and ACTIVE JWT-verified `portal-bank-transfer-workbench` v5 / `portal-users` v7.
- Promoted the READY Git-linked TRACK045 Preview artifact at approved SHA `958b8f0770a194894fe6c11a889cb87050acaacd`. Its only change after implementation SHA `3635da5f514334597318489ed77dfc515c03f9ca` is TRACK045 documentation. Explicitly assigned canonical alias `https://chamah-portal.vercel.app` to READY Production deployment `dpl_3sGp9CahiMzQkab3VDCjfVxiVxpY`; Vercel CLI and deployment API resolve that alias to this ID and SHA.
- Authenticated Production read-only validation: permissions editor loaded all three existing active users with existing portal-user / super-admin levels; HIDDEN / VIEW / EDIT matrix, ALL / ASSIGNED_DAYCARES scope, independent approval and execution-date controls, and Daycare Manager preset were present. Bank Transfers loaded its live row, filters, split summary, approval/completion controls, and execution-date field. Browser console had no warnings/errors; Vercel reported no runtime error clusters in the past hour. No user permission, assignment, or business record was changed; no Daycare Manager was activated.
- Focused desktop-1440 and mobile-390 regression: 48/50 passed. The two archive handler fixture cases returned 403 because the pre-TRACK045 mock lacks a `portal_user_profiles` response and is stopped by the new permission guard before archive logic. This is a validation blocker, not an observed Production archive failure. No real archive mutation was attempted.


## 2026-11-09 - Read-only scoped MCP backend gateway (initial rollout)

- Added SQL migration source: `supabase/migrations/20261109_mcp_readonly_scoped_rpcs.sql`.
- Applied two additive production Supabase RPCs: `portal_mcp_list_daycares()` and `portal_mcp_staff_by_daycare(uuid)`. Both require an authenticated active portal user, `dashboards.staffing.employees` VIEW/EDIT, and appropriate organization/daycare scope. No existing RLS policies were modified.
- Added and deployed `supabase/functions/portal-mcp-readonly/index.ts` (Supabase Edge Function v1, JWT verification enabled). Only two read actions are allowlisted. The function validates the bearer token and forwards that user JWT to PostgREST RPCs; it does not use a service-role key.
- Verified RPC EXECUTE privilege: authenticated allowed, anon denied. Deployment returned ACTIVE. No end-to-end restricted-manager test or external HTTP smoke test was run. All existing profiles observed were organization-scoped; employee assignments table contained one row.
- Existing Vercel frontend and budget/payroll calculation engines unchanged. No frontend deployment.
- Follow-up: create restricted test user and verify cross-daycare denial, run gateway HTTP integration tests, audit production RLS independently, connect OAuth/MCP transport only after authentication tests.


## 2026-11-09 - Isolated MCP Streamable HTTP endpoint

- Committed `supabase/functions/portal-mcp-server/index.ts` to `security/mcp-rls-hardening` and deployed as a **new**, isolated Supabase Edge Function `portal-mcp-server` v1, ACTIVE, `verify_jwt=true`. No existing Edge Function was overwritten.
- Implemented JSON-RPC `initialize`, `ping`, `tools/list`, `tools/call` and notification handling; exposed only `list_my_daycares` and `list_staff_by_daycare`, both read-only and backed by the scoped RPCs. User JWT is validated and forwarded; no service-role key or generic SQL tool.
- Verified deployed source matches committed GitHub source and the deployment API reports ACTIVE. Attempted HTTP smoke test but runtime DNS could not resolve Supabase hostname; no successful external HTTP or authenticated end-to-end test is claimed.
- Security audit found existing broad `portal_authorized_read` RLS policy on employees; **not changed** because it could break existing portal operations. No SELECTED-scope users exist for live cross-daycare validation. Before connecting real staff, test a restricted fixture and review RLS separately.
- OAuth authorization server settings, consent endpoint, MCP resource discovery, and ChatGPT client registration remain unverified/unconfigured. This endpoint is **not** ready for real user connection.


## 2026-11-09 - MCP security contract tests and readiness check

- Added dependency-free Node test source `tests/mcp-readonly-security.test.mjs` on the MCP hardening branch. Tests statically assert read-only tools, caller JWT forwarding, UUID validation, RPC authorization guards, and absence of destructive policy/data changes. These tests have NOT yet been run in CI; do not claim passing tests.
- Rechecked live database: `employees` retains one broad `portal_authorized_read` policy; no active `SELECTED`-scope profiles exist. Thus cross-daycare authorization has not been proven and direct table access remains a separate risk.
- Reviewed current Supabase MCP OAuth documentation and OpenAI custom MCP connector availability. OAuth server enablement, authorization consent flow, discovery, refresh scopes, and ChatGPT workspace eligibility remain outstanding. No existing production code was overwritten.


## 2026-11-09 — Documents navigation scaffold
- Added 'מסמכים ונהלים' entry to desktop/mobile home navigation and home module card in both mirrored index.html sources.
- Created documents/index.html in both source trees as a clearly marked non-functional placeholder.
- No uploads, publication, permissions or Supabase document storage implemented. No production deployment. Next: inspect actual portal permissions UI and implement default-deny upload authorization before enabling feature.
- Validation: GitHub commits confirmed; runtime/build tests not executed.


## 2026-11-09 — Policy data model and revocable access (preview backend)
- Added portal_sections entries documents, documents.manage, documents.publish, with no non-admin permission grants (default deny).
- Added versioned policy document tables and RLS, limited draft update columns, checked publish/retire RPC, immutable published title/body snapshots.
- Applied both forward-only migrations to linked Supabase preview backend; SQL schema/policy smoke check executed.
- NOT complete: main SPA permissions/navigation integration, authenticated end-to-end testing, actual browser editor, MCP document read tools, deployment to Vercel production. Do not enable for staff yet.


## 2026-11-09 — Documents module integrated in actual SPA (development branch)
- Found active SPA in chamah-manager-portal/new/app.js and new/index.html, not legacy root index.
- Added policy-documents.js lightweight list/search, create, inline draft editor, publish/retire, published snapshot, version history.
- Integrated #documents routing, main navigation, homepage module, and permission labels; permissions remain revocable through existing portal users management.
- Hardened DB: direct authenticated table reads/writes revoked; only permission-checked RPC list/create/save/publish/history; editor concurrency check on updated_at; immutable published snapshot. Unauthorized RPC list/history return empty.
- Database migrations applied to linked Supabase; anonymous SQL smoke check returns empty; table privilege checks show no direct authenticated SELECT/UPDATE. Security advisor flags intentional SECURITY DEFINER callable RPCs (each checks auth.uid and effective permissions), plus unrelated existing notices.
- Not deployed to Vercel. Browser end-to-end with actual staff login and production branch linkage remain unverified. Document attachment upload and MCP policy lookup not included in text-first MVP.


## 2026-11-09 — OAuth/MCP domain and session reconciliation (security branch)

- Reconciled OAuth protected-resource metadata, MCP bearer challenges, and password-recovery production routing to the canonical `https://chamah-portal.vercel.app` domain. The legacy preview recovery URL remains unchanged because it is intentionally allowlisted.
- MCP requests now require both a valid Supabase user token and an active `portal_my_access()` profile before protocol initialization, tool discovery, or tool calls. Tool data remains protected by the existing permission- and daycare-scoped RPCs; no service-role credential or direct table access was added.
- The OAuth consent page continues to reuse the portal's `chamah.portal.session`, but now allows Supabase JS to refresh an expired access token before validating the user, active portal profile, authorization request, and approve/deny action.
- Tightened stateless MCP JSON-RPC handling so requests without an `id` are treated as notifications and receive no JSON body. Existing allowlisted read-only tools and protocol version remain unchanged.
- Added `tests/oauth-mcp-reconciliation.test.mjs` for canonical discovery/challenge URLs, Vercel routes, shared refreshable consent sessions, OAuth approve/deny compatibility, active-profile enforcement, scoped RPC delegation, and notification semantics.
- Validation: JavaScript syntax checks passed; focused Node security contracts passed 8/8; `npm run build` passed; `git diff --check` passed. Existing authentication Playwright regression passed 28/32 across desktop 1440px and mobile 390px. The four failures are the previously documented stale assertions waiting for direct `allocation_units` requests although the current portal uses runtime configuration; all other login, invitation, recovery, persistence, refresh, and logout cases passed.
- No Supabase Auth setting, OAuth client, domain, database schema/data, migration, Edge Function, Vercel Preview, or Production deployment was modified. Before Production approval, manually register/verify the intended OAuth client because Dynamic OAuth Apps remains disabled, then validate the complete authorization-code/PKCE flow and scoped MCP calls with active, inactive, restricted-daycare, full-read, and revoked users against a development Preview.

## Reconciled Production history (2026-09-22 through 2026-09-23)

The following entries originated on the Production-only branch and are preserved here during TRACK101 reconciliation.

## TRACK048 — Fix Pending Transfer Amount (2026-09-22)

- Traced the amount path end to end: the regular or child row's `amount` input is read by `readRow`, autosaved in a `save` request, validated and stored in `bank_transfers.amount` by `portal-bank-transfer-workbench`, returned by GET, and consumed by the Bank Transfers KPI. The parent retains the original transfer amount; children retain their own split amounts. No API or schema change was needed.
- Root cause: the pending KPI added only the unallocated parent remainder for split families. It omitted pending child amounts. A read-only query of the linked backend found one active pending parent of ₪9,750.53 and two pending children of ₪3,750.53 and ₪6,000.00, which exactly allocate the parent. The prior calculation therefore displayed ₪0.00 despite pending work.
- The KPI now adds pending regular amounts once, pending child amounts once, and only the positive unallocated remainder of a split parent. Split families count once in the pending count if a child is pending or an unallocated balance remains. Parent and child amounts are never added together as full amounts.
- Added browser regressions for regular amount autosave/reload, the exact representative active split amounts, split amount edits and reload, and removal of split children to return to regular behavior. The existing Bank Transfers suite and the new cases passed 18/18 on desktop and 390px; the representative-record case passed 2/2 on both widths. Syntax, build, and diff checks passed. The linked backend was queried read-only; no real transfer was edited. Preview deployment details follow in `PROJECT_STATE.md`.

## TRACK049 — Promote TRACK048 to Production (2026-09-22)

- Verified approved TRACK048 commit `08221283052b74591604dbf88500e31cb75e28c1` and READY Git-linked Preview `dpl_97YJgstXUeubKcRb1yBdyVDFF18B` in canonical Vercel project `prj_6IND7ee2E9s3KispBh6iBDWwQo6X`. Prior canonical Production alias resolved to `dpl_3sGp9CahiMzQkab3VDCjfVxiVxpY`.
- Promoted only that Preview artifact. Vercel created READY Production deployment `dpl_2Y416AaJAiRKiUQ2jdALgX54LofW` with source Git SHA `08221283052b74591604dbf88500e31cb75e28c1`. The canonical alias was separately pinned, so explicitly assigned `chamah-portal.vercel.app` to the new deployment. Independent CLI inspection resolved the canonical hostname to that exact deployment ID and approved SHA; fetching the canonical Bank Transfers script returned HTTP 200 with the corrected pending-child calculation.
- Authenticated canonical Production, read-only: one pending split family showed ₪9,750.53 pending, with pending children ₪6,000.00 and ₪3,750.53, zero unallocated remainder, and no parent/child double count. Browser warning/error console was empty; Vercel reported no runtime errors in the selected range. No business record was changed.
- Re-ran regular pending amount autosave/reload, exact representative split, and split edit/removal regressions across desktop 1440px and mobile 390px: 6/6 passed. Regular behavior was tested with representative mocked API records because the current live active set contains only the split family. No database, migration, Edge Function, or unrelated application module was modified. Production PASS.

## TRACK050 — Fix iPhone Saved-App Cache (2026-09-23)

- Root cause: the deployed portal had no manifest or service worker, and its root HTML referenced stable unversioned JavaScript and CSS paths. Existing iPhone Home Screen installations therefore depended entirely on WebKit's HTTP cache and could continue launching an old asset graph after a Production deployment.
- Added a build-derived content version to deployed HTML script, stylesheet, manifest, and ES-module import URLs. Each deployment now produces a distinct asset graph without editing generated `dist` source directly.
- Added a standalone web manifest and an update-aware service worker. Navigations are network-first with a cached root fallback; the versioned current app shell is cached for offline use; old portal caches are deleted on activation; the new worker skips waiting and claims clients immediately.
- Added client lifecycle handling that checks for an updated worker on registration and every `pageshow`. Existing controlled installations reload once after a new worker takes control. First-time registration does not interrupt the active login or session flow.
- Deployed HTML, JavaScript, and CSS use Vercel's `max-age=0, must-revalidate` static policy. The service-worker route explicitly adds `no-store` and root scope permission; the same behavior is represented by the local static server for regression testing.
- Added a dedicated installed-app regression that builds `track050-old`, loads and controls the app, builds `track050-new`, requests a worker update, verifies automatic controller handoff and a reload onto the new versioned `app.js`, and checks old-cache removal. It passes in Chromium and iPhone-sized WebKit; Chromium also verifies a disconnected offline reload. A physical iPhone Home Screen installation was not available in the local test environment.
- Validation: JavaScript syntax checks and `npm run build` passed; old-build to new-build PWA regression passed 2/2 (Chromium saved-app and WebKit iPhone profile); `git diff --check` passed. Existing authentication regression passed 28/32 across desktop 1440 and mobile 390. The four failures are pre-existing stale assertions for direct `allocation_units` requests even though the current portal uses the runtime-config contract; all remaining login, recovery, session, refresh, and logout cases passed.
- Scope: frontend build/cache lifecycle and its tests only. No business rule, calculation, API, database, migration, Edge Function, or Production deployment changed.

## TRACK101 — Reconcile Development and Production Before Deployment (2026-11-10)

- Audited and merged the five Production-only commits into `security/mcp-rls-hardening`: `f718f8f` preserves correct pending totals for split Bank Transfers; `0822128` and `15e4452` preserve the TRACK048 Preview/Production record; `89ca14d` adds versioned assets, manifest, service-worker update lifecycle, and PWA tests; `2f883e4` enforces service-worker update headers through the Vercel route.
- Resolved the only merge conflict in `PROJECT_LOG.md` by preserving both histories. OAuth consent, protected-resource discovery, MCP bearer enforcement, caller-JWT delegation, scoped RPCs, policy documents, portal navigation, and the existing bank-transfer/PWA fixes remain present. No Supabase migration, Edge Function, database data, RLS policy, Auth setting, OAuth client, business calculation, or API contract was changed during reconciliation.
- Corrected two stale authentication test fixtures to observe the current authenticated `portal-runtime-config` request instead of the retired direct `allocation_units` request. Application authentication behavior was not changed.
- Validation before release commit: JavaScript syntax checks passed; `npm run build` passed; OAuth/MCP security contracts passed 8/8; authentication regression passed 32/32 across desktop 1440px and mobile 390px; service-worker/PWA regression passed 2/2 in Chromium and iPhone-sized WebKit; affected Bank Transfers regression passed 20/20 across desktop and mobile; diff checks passed.
- Recorded the pre-release rollback target as READY canonical deployment `dpl_7MgVWUCLdLjrY9ih4LLFR3GTk17Q`, verified by the user at Git SHA `2f883e462b5f329f60b7ed1c2f4bfa0b2f64e012`. Production staging, promotion, live endpoint validation, and the manual OAuth consent stop remain pending at this entry.
- Created and pushed release merge commit `d21cfb5ae958c7695d05b9a07257d1f0532b2203` with parents `4d5b3fdf6f594c800356495c64e7ad705e48d80f` and `2f883e462b5f329f60b7ed1c2f4bfa0b2f64e012`. Deployed from a clean detached worktree so unrelated untracked files were excluded.
- Staged the exact release as a Production-environment deployment without domains, stamped it with release metadata and service-worker build ID `d21cfb5ae958`, and validated root 200, OAuth consent route 200, protected-resource metadata 200 with canonical MCP resource, service worker 200 with `no-store` and root scope, and unauthenticated MCP initialization 401 with the canonical bearer metadata challenge.
- Promoted READY deployment `dpl_CtzdQFhv7rojeqZGmh5mXxg9JEPg`. Vercel's promotion mapped only the preview-named project domain, so the canonical alias was explicitly reassigned from rollback deployment `dpl_7MgVWUCLdLjrY9ih4LLFR3GTk17Q` to the promoted deployment. Independent alias lookup and canonical HTTP checks confirmed the exact deployment and SHA-derived service-worker build ID. No runtime errors were reported in the post-deploy window.
- Stopped before manual OAuth consent as required. No database, migration, Edge Function, Supabase Auth setting, OAuth client, RLS policy, user permission, or business record was changed.

## TRACK102b — Secure HTTPS OAuth callback relay (2026-11-10)

- Root cause: the registered loopback redirect reached a browser environment isolated from the machine hosting the callback listener, so consent was approved but no authorization code could be delivered to the initiating client.
- Added an isolated, not-yet-deployed Supabase Edge Function design with create-session, HTTPS callback, and one-time consume actions. State and delivery secrets are stored only as SHA-256 hashes; the PKCE verifier remains client-side; callback results are hybrid-encrypted to a per-attempt RSA public key before storage; records expire within three minutes and successful consumption atomically deletes them.
- Added a forward-only, not-yet-applied migration for the relay coordination table. RLS is enabled and all access is revoked from `public`, `anon`, and `authenticated`; only the isolated function service role is intended to access it. Existing portal authentication, consent, MCP endpoint, scoped RPCs, permissions, business data, and calculations are unchanged.
- Added security-contract and simulated encryption/one-time-consumption tests. TRACK102b plus existing OAuth/MCP contracts passed 12/12; `git diff --check` passed.
- No migration, Edge Function, Supabase Auth setting, OAuth client redirect, Vercel deployment, Production domain, permission, or business record was changed. Deployment and registration of the new HTTPS redirect require explicit approval, followed by a disposable-user end-to-end acceptance test.

## TRACK102c — Deploy and validate HTTPS OAuth callback relay (2026-11-10)

- Security review found and corrected two pre-deployment defects: the expiry index referenced the wrong schema, and expired abandoned relay rows had no opportunistic cleanup. The live synthetic test then failed closed because the Edge Function service role lacked an explicit table grant; added the minimal forward-only `service_role` CRUD grant and repeated the full test successfully.
- Applied only relay migrations `track102b_oauth_callback_relay` and `track102c_relay_service_role_grant` to linked Supabase project `vyyfuaqmbxvfqgbfqooc`. The relay table has RLS enabled, no policies, no access for `anon` or `authenticated`, and only the required access for `service_role`.
- Deployed isolated Edge Function `portal-oauth-callback-relay` version 1, ACTIVE, with JWT verification disabled solely for OAuth callback compatibility. All unrelated Edge Functions remain JWT-protected; unauthenticated canonical Vercel MCP and Supabase MCP initialization both returned 401.
- Live non-sensitive synthetic acceptance passed: session 201, callback 200, wrong delivery secret 404, encrypted payload successfully decrypted only with the initiating private key, consume 200, consume replay 404, and callback replay 410. Forced-expiry cleanup removed the disposable row; final relay row count was zero.
- Local OAuth/MCP and relay contracts passed 12/12; diff check passed. Post-deployment advisors reported the relay's intentional fail-closed RLS-with-no-policy configuration as informational; other advisor findings were pre-existing and unrelated.
- No OAuth client redirect, Supabase Auth setting, portal permission, business record, Vercel deployment, Production portal asset, or domain was changed. Work stopped before OAuth consent pending manual registration of the new HTTPS redirect URI.

## TRACK102d — Diagnose approved consent without callback (2026-11-10)

- Verified directly that the active OAuth test client uses the registered HTTPS relay callback. Fresh relay sessions were created successfully, but the live relay row remained unsealed and the disposable client received no callback.
- Supabase Auth recorded the authorization requests as approved and generated authorization codes for the correct HTTPS redirect. Aggregated relay logs contained no matching invocation, confirming that callback delivery never started; no code or token was exposed or exchanged.
- Root cause: the consent page mishandled the documented `OAuthRedirect` response from `getAuthorizationDetails()`. When consent already existed, it displayed a static “already approved” message instead of navigating to the returned `redirect_url`, so the browser never invoked the relay callback.
- Corrected only that branch to validate an HTTPS redirect and use `location.replace(data.redirect_url)`, matching current Supabase OAuth guidance. Added regression assertions that the already-consented branch redirects and no longer displays the blocking message.
- Extended the isolated relay session TTL from three minutes to the migration's existing five-minute maximum for manual cross-turn acceptance and deployed `portal-oauth-callback-relay` version 2. No schema, permission, Auth setting, OAuth client, business record, or unrelated endpoint changed.
- Validation: consent JavaScript syntax passed; OAuth/MCP and relay contracts passed 12/12; `npm run build` passed; `git diff --check` passed. The expired disposable client was stopped and relay cleanup was triggered. The consent-page fix has not been deployed to Production because Production frontend deployment requires explicit approval.

## TRACK102d — Production OAuth redirect release and restricted-user acceptance (2026-11-10)

- Verified approved release commit `75bdd971de6a3280f3d3958c47fed066e602d402` against its parent and remote branch. Pre-release validation passed: consent JavaScript syntax, `npm run build`, OAuth/MCP and relay contracts 12/12, and portal authentication 32/32 across desktop 1440px and mobile 390px.
- Recorded canonical rollback deployment `dpl_CtzdQFhv7rojeqZGmh5mXxg9JEPg`. Deployed from a clean detached worktree, staged and verified the consent asset, then promoted SHA-stamped READY deployment `dpl_BcwrvQk7M9V15YH4yz9nCXy8EcXy`. Canonical `https://chamah-portal.vercel.app` resolves to that deployment; service-worker build ID `75bdd971de6a` proves the approved SHA-derived artifact, and the live consent asset contains the documented `OAuthRedirect` navigation fix.
- Post-deploy checks passed: root 200, consent route 200, protected-resource metadata 200 with canonical MCP resource, relay reachable, unauthenticated MCP initialization 401 with bearer challenge, and no Vercel runtime errors in the post-release window.
- Fresh disposable-user OAuth/PKCE acceptance passed without exposing secrets: HTTPS callback delivered, state validated, authorization-code exchange 200, refresh 200, access token audience `authenticated`, issuer/client claims matched, and lifetime was 3600 seconds. The harness's direct `/auth/v1/user` request returned 401 because it omitted the required publishable-key header; token validity was independently confirmed by successful refresh and the canonical MCP server's Supabase Auth validation.
- MCP initialization returned protocol `2025-03-26`; discovery returned only `list_policies`, `read_policy`, `list_daycares`, and `staff_by_daycare`; a fabricated write tool was rejected. The disposable user was active, non-superadmin, selected-scope, without full-read access, assigned to one daycare, and had `HIDDEN` staffing permission; fail-closed MCP visibility returned zero daycares and no business records.
- Remaining acceptance matrix rows—authorized daycare visibility with VIEW permission, cross-daycare denial, full-read, superadmin, inactive, grant revocation, and access-token termination—require separate disposable identities or explicit controlled test-user switching. No permission, user status, business record, Supabase Auth setting, OAuth client, database schema, or domain changed during this acceptance run.

## TRACK105 — Phase 0 Policy Decisions, Access Audit, and Contract Tests (2026-11-10)

- Reviewed TRACK103 and TRACK104, relevant repository migrations/functions/tests, current Supabase security guidance, and linked-project catalog metadata without changing schema, data, access controls, functions, or deployments.
- Added a decision register for Bank-account scope, separation of duties, retention, and exact-duplicate exceptions. Each item records evidence, a nonbinding recommendation, operational impact, and the business/security/legal owners required to approve it. No policy was silently adopted.
- Verified that reviewed tables have RLS, authenticated users have SELECT-only table grants, and Bank/Employee/Payroll domain commit RPCs are service-role-only. Identified the principal blocker: ingestion, quality, audit, and Bank tables share a portal-wide read predicate and do not enforce ownership, bank-account scope, reviewer redaction, or cross-scope isolation.
- Documented additional gaps around durable approval sequencing, dormant row lineage/quality review, caller-supplied actor IDs at internal RPC boundaries, broad default function EXECUTE privileges, and the privileged service-role trust boundary.
- Added six executable repository contract/security tests covering authorization rechecks, preview/approval/commit sequencing, duplicate handling, lineage, quality review, service-only domain commits, generic-writer prohibition, and compatibility preservation. The focused Node suite passed 6/6 and the scoped diff check passed.
- No application source, production data, migration, Edge Function, RLS policy, grant, role, Supabase Auth setting, Vercel deployment, or business calculation changed. Phase 1 remains blocked on the explicit owner decisions and security/test gates recorded in `docs/audits/TRACK105.md`.

## TRACK107 — Phase 1A Implementation Gates and Migration Design (2026-11-10)

- Completed a strictly read-only Phase 1A audit of TRACK103–TRACK106, repository authorization/mutation surfaces, and linked isolated Preview catalog/configuration. No migration, data, identity, grant, RLS policy, function, bucket, deployment, Preview access, or Production access was changed.
- Verified four active portal profiles linked to confirmed Supabase Auth identities: one current super-admin, two organization-wide non-super-admins, and one selected-scope non-super-admin. Proposed canonical Director/Super Manager/Manager role assignments keyed only by immutable Auth UUID, with the exact sole-Director mapping requiring explicit secure approval and no credentials or personal identity values stored in documentation.
- Found 58 live non-Director `EDIT` rows across operational screens. Current Bank, transfer, workforce, employee-import, and payroll Edge Functions use service-role access after screen-level EDIT checks, so existing grants can reach mutations and conflict with the approved Director-only rule.
- Verified all five Bank accounts map only to one legal entity; no Bank-account-to-allocation-unit/daycare relation exists. All seven daycares map to allocation units, but unallocated transactions and import/quality records have no reliable restricted-user scope. Account mapping and default-deny behavior are blocking business/security decisions.
- Documented the proposed forward-only Phase 1A design for canonical roles/capabilities, scoped read predicates/RPCs, non-Director EDIT normalization, Director-only semantic mutations, temporary chat validation, durable import archives, Storage controls, catalog assertions, rollout order, risks, and exact approval gates.
- The task was documentation-only. Existing application validation was not required; read-only repository contract tests and Markdown/diff verification are recorded in the TRACK completion report.

## TRACK108 — Read-only Architecture Assessment (2026-11-10)

- Reviewed TRACK106–107, relevant earlier audits and architecture/handbook documentation, current repository authorization and service-role surfaces, and the linked Supabase project through SELECT-only catalog and aggregate queries. No schema, data, identity, permission, RLS, grant, Storage object, Edge Function, Preview, or Production change was made.
- Verified four active Auth-linked portal identities, one current technical super-admin/Director candidate, five active bank accounts, 2,451 bank transactions, 14 allocations, and 2,437 unallocated transactions. All seven daycare rows have allocation-unit mappings, but no trusted bank-account-to-daycare/unit authorization relation exists.
- Corrected the TRACK107 permission interpretation: 58 non-Director `EDIT` rows exist across retained configurations, while 35 belong to the three users' current effective configurations; 23 are superseded permission-history rows.
- Confirmed the principal security issue remains screen-level `EDIT` authorizing service-role workbenches, combined with broad portal-wide read policies and overlapping super-admin/scope/transfer/MCP flags. Supabase advisors also report 11 authenticated `SECURITY DEFINER` functions, five RLS-with-no-policy tables, and disabled leaked-password protection.
- Recommended a partial rebuild: preserve canonical domain data, business constraints, audit history, Bank source immutability, allocations, and useful atomic RPC logic; replace the authorization kernel and privileged service boundary; introduce a dedicated supplier-payment request/approval/execution/confirmation aggregate instead of overloading `bank_transfers`.
- Documented identity, permission, bank mapping, keep/replace, action-matrix, workflow, repair-versus-rebuild, phased implementation, missing-evidence, acceptance, and exact Director-approval tables in `docs/audits/TRACK108.md`.
- This task was documentation-only. Application build and Playwright tests were not required; Markdown scope, diff, commit, and remote push verification are recorded in the TRACK completion report.

## TRACK109 — Director Decisions & AI Architecture (2026-11-10)

- Reviewed TRACK108, relevant TRACK103–107 decisions, repository OAuth/MCP source and contracts, and existing authorization documentation without changing application code, schema, data, identities, permissions, RLS, grants, functions, Storage, Preview, or Production.
- Added a Hebrew Director decision table covering identity and role mapping, legacy EDIT treatment, Bank-account scope, payment workflow and separation of duties, retention, deletion, duplicate exceptions, AI actions, sensitive approvals, automation, service-role transition, multi-provider support, and deployment gates.
- Defined one mandatory authorization path for Portal, API, MCP, external AI providers, and automation: authenticated user identity, protected role/resource/action evaluation, validation, explicit sensitive-action approval, semantic domain command, transaction safety, and append-only audit. AI agents inherit the user's permissions and never receive unrestricted service-role access.
- Identified reusable infrastructure: Supabase Auth OAuth/PKCE, protected-resource discovery, the stateless MCP Streamable HTTP shell, caller-JWT forwarding, scoped read RPCs, closed tool allowlists, callback relay, and existing OAuth/MCP contract tests. Legacy MCP full-read, screen EDIT, super-admin flags, and service-role workbenches are explicitly transitional rather than the future authorization kernel.
- Proposed phased delivery prioritizing unified scoped AI reads, then draft-only writes, approved sensitive commands, DELETE/bulk/automation controls, multi-provider verification, and legacy retirement.
- Recorded 15 exact blockers before implementation. TRACK109 is documentation-only; application build and Playwright tests are not required. Markdown scope and diff checks are required before commit and push.

## TRACK110 — Director-only Authorization & MCP Read/Write (2026-11-10)

- Replaced the effective authorization boundary with a protected role/action model shared by Portal, API, and MCP. The sole TRACK108 technical Director identity is the only active `DIRECTOR`; the three other portal profiles were deactivated without deleting Auth identities, profiles, scopes, permissions, or historical data.
- Added a closed action catalog for policy read/create/update, controlled soft-delete, atomic bulk archive, validated private file upload, and authorization administration. Legacy screen permissions remain navigation/history data and no longer authorize user-management mutations.
- Added caller-JWT semantic RPCs, default-deny authorization, optimistic concurrency, short-lived one-time payload-bound approval artifacts, append-only authorization audit, and verified structured write responses. MCP contains no service-role key, generic table writer, raw SQL, or caller-supplied actor authority.
- Added a private `policy-attachments` Storage bucket with MIME/size restrictions and Director-only object policies. MCP uploads are further limited to 3 MiB and generated actor/document paths.
- Rebuilt the permissions page as a responsive read-only authorization dashboard showing identities, active role assignments, action capabilities, approval requirements, and security controls. The legacy invite/editor path remains available only to old mocked compatibility tests; the deployed `DIRECTOR_ONLY` response never exposes it.
- Applied migration `track110_authorization_mcp` to the linked Preview Supabase project and deployed `portal-users` Edge Function v8 atomically with the authorization rollout. Live validation confirmed one active Director/profile, three inactive preserved profiles, seven active actions, three approval-gated actions, one private attachment bucket, and anonymous default deny.
- Validation: JavaScript syntax checks passed; focused Node authorization/OAuth/MCP tests passed 13/13; build passed; focused desktop browser authorization suite passed 33/33; `git diff --check` passed. A broad `npx playwright test` invocation used the wrong Playwright CLI and was invalid; no result from that invocation is claimed.

## TRACK111 — Live Director MCP acceptance (2026-11-10)

- Ran end-to-end acceptance against the protected Vercel Preview and linked Preview Supabase backend with disposable Director/non-Director identities and `TRACK111-*` policy records. Verified Director discovery, create/update with optimistic-concurrency rejection, approved soft-delete, exact payload binding, replay/tamper rejection, successful bulk archive, failed-bulk atomic rollback, private file upload/download, non-Director HTTP 403, persisted rows, structured responses, approvals, and authorization audit events.
- Fixed three live-only gaps: added allowlisted private `download_policy_file`; allowed authenticated Storage RLS to evaluate the non-exposed canonical authorization helper; and added the pgcrypto `extensions` schema to the approval functions' hardened `search_path`. Added owner-Director Storage delete policy so disposable attachments can be removed through the Storage API rather than by deleting metadata.
- Applied forward-only Preview migrations `track111_storage_authorization_policy` and `track111_approval_digest_schema`. No Edge Function, Auth setting, Production deployment, business calculation, or existing business record was changed.
- Live rollback checkpoint proved both requested rollback targets remained `DRAFT` and the exact approval remained unconsumed after a target mismatch. The successful acceptance run produced the expected CREATE/UPDATE/FILE_UPLOAD/DELETE/BULK audit records; all 12 disposable documents were soft-retired.
- Cleanup completed: all three disposable Storage objects were deleted through the authenticated Storage API; the non-Director identity was removed; the Director QA identity was deprovisioned and retained only as an inactive tombstone required by immutable audit/document foreign keys; its remaining unconsumed approvals were expired; and the sole original active Director assignment was restored. Final verification found one active original Director, zero QA Storage objects, zero QA identities, no disposable non-Director user, and 12/12 QA documents `RETIRED`.
- Local validation: `node --check api/mcp.js`; focused OAuth/MCP/relay/authorization contracts 14/14; `npm run build`; `git diff --check`. Supabase security advisors were rerun; findings are pre-existing RLS-with-no-policy tables, intentional authenticated `SECURITY DEFINER` RPCs, and disabled leaked-password protection. Production remains unchanged.
- Production Vercel and Supabase Auth settings were not changed. Existing advisor findings remain for intentional authenticated semantic `SECURITY DEFINER` RPCs, internal RLS tables with no direct client policies, and disabled leaked-password protection; the last item requires a separate approved Auth-setting change.

## TRACK112 — Data Management Readiness (2026-11-10)

- Audited the linked Preview database, domain relationships, record completeness, existing imports/RPCs, TRACK110–111 authorization, and current Supabase MCP capabilities. Confirmed employees, banking, bank-transfer payments, and payroll are modeled; children are aggregate-only through `monthly_enrollment`; parents, suppliers, collections, and a canonical payments aggregate are not modeled.
- Added Director-only operational actions and semantic MCP RPCs for capability discovery, bounded structured search, verified aggregates, employee duplicate detection, validated employee create/update, and synchronous employee import up to 100 rows. All writes derive the actor from `auth.uid()`, use the canonical action gate, preserve RLS/direct table denial, audit mutations, verify persisted results, and expose no generic table writer, raw SQL, or service-role credential.
- Extended the shared audit vocabulary additively for authenticated MCP create/update events. Banking, payments, and payroll remain read/analysis only; existing financial write workflows and approval rules were not bypassed.
- Assessed large imports and long analytical work as requiring a durable queued worker with retry, idempotency, status, cancellation, and result retrieval. TRACK112 intentionally caps synchronous imports instead of introducing an unproven queue.
- Applied Preview migrations `track112_data_management_readiness` and `track112_mcp_audit_contract`. Live disposable acceptance verified capabilities, employee search, banking analysis, zero-match and positive duplicate detection, create, optimistic update, stale-version rejection, bulk partial failure, and persisted-result counts. Both disposable employees were retired through the lifecycle API and their audit history was retained.
- Validation: `node --check api/mcp.js`; focused OAuth/MCP/authorization/data-readiness tests 27/27; `npm run build`; `git diff --check`. Supabase advisors were rerun; the new authenticated `SECURITY DEFINER` RPC notices are intentional and action-gated. Pre-existing RLS-with-no-policy and leaked-password-protection findings remain. Production was not changed.

## TRACK113 — Suppliers & Payments (2026-11-10)

- Added an additive canonical supplier and payment-request aggregate beside preserved legacy `bank_transfers`: suppliers, verified bank destinations, daycare allocations, private documents, append-only lifecycle events, optimistic row versions, and idempotency keys.
- Implemented the lifecycle `DRAFT -> PENDING -> APPROVED -> PAID -> VERIFIED`, with approved cancellation from pre-payment states. Submit requires a verified supplier bank destination and invoice; approve, pay, verify, and cancel require short-lived one-time payload-bound approval artifacts.
- Added Director-only semantic MCP/API tools for supplier/payment search, duplicate detection, create, update, bounded bulk import, analysis, attachments, and lifecycle transitions. The action catalog is extensible for future staff roles, but only `DIRECTOR` received the new actions.
- Applied forward-only Preview migration `track113_suppliers_payments`. No legacy row, Budget behavior, Google Sheet contract, Production database, Production alias, or Production deployment was changed.
- Preview verification confirmed zero pre-existing canonical supplier/payment rows, 14 new active actions, one private attachment bucket, and 12 supplier/payment RPCs before disposable acceptance. New tables use RLS with direct grants revoked; authenticated semantic `SECURITY DEFINER` RPC advisor notices are intentional and action-gated.
- Live disposable acceptance through the Director-gated semantic RPCs created one supplier and one allocated payment draft, proved idempotent replay returned the original request without mutation, consumed an exact cancellation approval, and verified allocation total `123.45 = 123.45`, two lifecycle events, and one consumed approval. Cleanup retained audit/history while leaving the supplier `ARCHIVED` and request `CANCELLED`.
- Deployed Vercel Preview `dpl_7rxX3QNgggka1SRTUutWiR8QStzr` at `https://chamah-portal-iry2nxr2y-chamah.vercel.app`; inspection reported target `preview` and status `Ready`. Production remained unchanged.
- Validation: `node --check api/mcp.js`; focused TRACK110/112/113 contract tests 12/12; `npm run build`; `git diff --check`; Supabase security/performance advisors rerun.
- Unresolved business rules: independent bank-detail verifier/separation of duties, monetary approval thresholds, invoice uniqueness/tax rules, retention/legal hold, and mapping of legacy transfers into canonical requests require Director/finance decisions. TRACK113 does not infer or backfill these rules.

## TRACK114 — Financial Approval & Bank Reconciliation (2026-11-10)

- Extended the TRACK113 aggregate with Director-only supplier-bank-change verification, immutable payment execution evidence, execution-to-request allocations, individual/bulk bank reconciliation confirmations, suggestion-only automatic matching, and durable asynchronous financial jobs. Payment approval, execution evidence, and reconciliation remain separate persisted actions.
- Reconciliation confirmations are atomic and idempotent, lock source rows, support partial 1:1, N:1, and 1:N allocation, and reject payment-request, execution, and bank-transaction over-allocation. Automatic matching only creates constrained exact reference/amount suggestions and never confirms or allocates funds.
- Added asynchronous statement imports and suggestion jobs with bounded payloads, retry state, duplicate bank fingerprint protection, status/result retrieval, and a one-minute private `pg_cron` worker. Added follow-up foreign-key/query indexes after the Preview performance-advisor review.
- Applied forward-only Preview migrations `track114_financial_approval_reconciliation` and `track114_financial_fk_indexes`. Eight new actions are granted only to `DIRECTOR`; new tables have RLS enabled, direct client grants revoked, and private workers are not executable by public/anon/authenticated roles. No existing user, supplier, payment, bank transaction, Budget behavior, Production database, or Production deployment was changed.
- Live rollback-checkpoint acceptance verified approved bank replacement and historical supersession, one execution allocated across two payments, three reconciliation rows covering partial 1:N and consolidated N:1 cases, idempotent replay, over-allocation rejection, completed statement/suggestion jobs, zero automatic confirmations, zero direct client grants, and zero retained QA rows. Final checks found eight Director grants, zero non-Director grants, zero anonymous RPC grants, zero queued jobs, and an active cron worker.
- Validation: `node --check api/mcp.js`; focused authorization/OAuth/TRACK112–114 Node contracts passed 23/23; `npm run build`; `git diff --check`; Supabase security and performance advisors rerun. New advisor notices are the intentional default-deny RLS-with-no-policy tables and authenticated semantic `SECURITY DEFINER` RPCs; pre-existing leaked-password/RLS performance notices remain.
- Deployed implementation commit `ae8926a502c9e298688739070d061f3eb8ed276d` to Vercel Preview deployment `dpl_cbfuLW5xhzJXk6dW4P8Ka5Y1MgxN`, READY at `https://chamah-portal-f07sboan2-chamah.vercel.app`. Deployment metadata confirms target Preview, the TRACK114 branch, and the exact implementation SHA. An authenticated Vercel fetch reached the MCP function and returned the expected GET 405 with `POST, OPTIONS` and the canonical OAuth bearer challenge; no staff token, real transfer, Production alias, or Production deployment was used.

## TRACK115 — Authenticated MCP E2E Acceptance (2026-11-11)

- Ran the deployed Preview MCP end to end with a disposable sole-Director Supabase Auth identity and Vercel's authenticated Preview transport. The workflow created a supplier, proposed and approval-verified its bank destination, created an idempotent allocated payment request, uploaded an invoice, submitted and approval-approved the request, recorded immutable execution evidence, approval-marked it paid, queued and polled an asynchronous statement import, found the imported transaction through MCP operational search, confirmed reconciliation, and approval-verified the fully reconciled payment. No staff credential, real transfer, Production alias, or Production deployment was used.
- Verified anonymous MCP denial, direct-table denial, exact approval payload binding, approval replay rejection, stale-version rejection, supplier-bank/payment/execution/job/reconciliation idempotency, over-allocation rejection, caller-derived actor attribution, append-only authorization/domain audit, and exact financial equality: request, daycare allocation, execution, and reconciliation were each `115.15`, remaining balance was `0`, with one invoice and five lifecycle events.
- Found and fixed a live-only payment-document defect: Storage accepted the private object, but `api/mcp.js` called `crypto.createHash` without importing Node crypto, so the handler returned a misleading upload failure after the object was stored. Added the missing `node:crypto` import and a regression assertion, plus the reusable `tests/track115-authenticated-mcp-e2e.mjs` live runner.
- Focused TRACK110/112/113/114 contracts passed 18/18; JavaScript syntax, build, and `git diff --check` passed. The full authenticated live runner passed against Vercel Preview deployment `dpl_9YWNcBU2MsqKtDbGPEQ8RL37L5Cd`, READY at `https://chamah-portal-gwqt06807-chamah.vercel.app`, serving implementation commit `dc0301444b79c0f6c6f8284b7d2ac89ae4e15759` from `codex/track114-financial-reconciliation`.
- Supabase security advisors were rerun. Findings remain the intentional default-deny RLS tables and action-gated authenticated semantic `SECURITY DEFINER` RPCs, plus the pre-existing disabled leaked-password-protection setting; TRACK115 made no persistent schema, policy, Auth-setting, Edge Function, or Production change.
- Cleanup completed: two disposable Storage objects and all TRACK115 supplier, bank-detail, payment, execution, reconciliation, imported-transaction, import-batch, and job rows were removed; the temporary cleanup policy was dropped; the disposable identity was deactivated, sessions and Auth identity removed, and the original sole Director restored. Final checks found one active Director and zero QA active roles, profiles, Auth identities, sessions, suppliers, jobs, Storage objects, or cleanup policies. Immutable audit evidence remains: 11 authorization-audit and 9 domain-audit rows.
## TRACK116 — Atomic Payment Attachment Handling (2026-11-11)

- Replaced the payment-document upload/record gap with a Director-gated attachment operation state machine (`PENDING -> FINALIZED` or `CLEANUP_PENDING -> CLEANED`). Each operation is bound to the authenticated actor, a caller idempotency key, payment request, filename, MIME type, byte size, and SHA-256 digest; payload-changing key reuse is rejected and concurrent retries lock/converge on one deterministic object path and metadata row.
- Added guarded compensation through the official Storage API. Database cleanup authorization is established before object deletion, and the Storage delete policy permits only the owning authorized Director, only for an unfinalized `CLEANUP_PENDING` operation with no document link. Finalized documents are returned as idempotent success and cannot be deleted by compensation after a lost response.
- Applied Preview migrations `track116_atomic_payment_attachments` and `track116_storage_cleanup_policy_fix`. The follow-up was required after live cleanup proved that a Storage policy cannot directly inspect the intentionally grant-revoked operations table; a narrowly scoped `private.portal_payment_attachment_cleanup_allowed` predicate now preserves default-deny table access while authorizing exact cleanup paths.
- Failure-injection tests verified uploaded-object compensation after metadata recording failure, one-object/one-row convergence for concurrent same-key retries, and protection of a valid finalized object after simulated response loss. Focused authorization/supplier/financial/attachment contracts passed 22/22; `node --check api/mcp.js`, `npm run build`, and `git diff --check` passed.
- Live disposable acceptance through protected Vercel Preview MCP verified authenticated sequential replay and simultaneous same-key attachment calls. Before cleanup, four operations were `FINALIZED` with four distinct document IDs, four Storage objects, zero inconsistent operations, and matching finalization audit entries. The temporary sole-Director identity had no staff scope or staff credential.
- Cleanup used the authorized Storage API to remove all four disposable objects, then removed all disposable supplier/payment/execution/reconciliation/import/operation rows and the disposable Auth identity while retaining append-only audit evidence with the disposable actor anonymized. Final Preview checks found zero payment attachment objects, operations, or document rows, zero QA Auth users, one active original Director, and exactly one guarded cleanup policy. Supabase security/performance advisors were rerun; new notices are the intentional default-deny operations table and action-gated semantic functions, alongside pre-existing findings. Production was not changed.
- Vercel Preview deployment `dpl_HviqmnMj3bmqWQwGbrwLcUx2khRD` was READY at `https://chamah-portal-4434ditnr-chamah.vercel.app` for live acceptance. A final Preview deployment is recorded in the TRACK116 completion report after the documentation/follow-up commit.

## TRACK117 — Production Rollout Gate (2026-11-11)

- Final status: **BLOCKED — Production was not changed**. Reviewed TRACK113–116, the current repository and migration state, linked Supabase project, final TRACK116 Preview deployment, canonical Vercel Production deployment, security advisors, Director-only grants, direct table access, and financial/attachment integrity.
- Verified the final pushed TRACK116 commit `e6366a65edeb468163ea091f191232a9adabedcf` is served by READY Preview deployment `dpl_GdFk5ZRbVqof3Y8Vrk9aZmj4RQ94`. The canonical Production hostname still resolves to READY rollback deployment `dpl_BcwrvQk7M9V15YH4yz9nCXy8EcXy`; no deployment, promotion, alias reassignment, migration, Edge Function, Auth setting, Storage object, role, or business row was changed.
- Supabase migration inventory contains the TRACK113, TRACK114, and both TRACK116 migrations. Catalog checks found all 22 new supplier/payment/reconciliation actions granted only to `DIRECTOR`, one active Director, no direct anon/authenticated CRUD privileges on the 14 affected domain tables, RLS enabled on every affected table, one active guarded attachment cleanup policy, and the financial cron worker active.
- Read-only integrity checks found zero allocation mismatches, zero attachment state/document inconsistencies, zero queued/running financial jobs, zero retained payment-attachment objects, and no execution over-allocation result. The only retained TRACK113 acceptance records are one archived supplier and one cancelled request for `123.45`, with allocations equal to the request amount; no QA migration or cleanup was performed.
- Supabase health advisors returned no findings. Security advisors still report the documented intentional default-deny RLS-with-no-policy tables and action-gated authenticated `SECURITY DEFINER` RPCs, plus the pre-existing disabled leaked-password-protection setting. Performance findings remain advisory and were not changed in this rollout gate.
- Blocking recovery evidence: `supabase backups list --remote=vyyfuaqmbxvfqgbfqooc` identified the linked project main branch as Production but returned `backups: null` and `pitr_enabled: false` (`walg_enabled: true`). Therefore no independently verified physical backup or PITR restore point exists for the database portion of the rollout, and database rollback readiness cannot be certified.
- Additional migration-history risk: `supabase migration list --linked` shows schema changes applied under remote migration versions that differ from several checked-in local filenames, including TRACK110–116, alongside older local-only/remote-only entries. The required TRACK113–116 objects are present and verified, but migration-history parity is not clean enough to certify replay/rollback without reconciliation.
- Per the TRACK stop condition, Production deployment and authenticated Production MCP smoke tests were not run after the failed backup/rollback gate. No staff access, real transfer, or QA data migration occurred.

## TRACK117a — Production Recovery Readiness (2026-11-11)

- Final status: **BLOCKED — recovery readiness is not yet sufficient to resume TRACK117**. No Production deployment, schema/data mutation, migration-history repair, Auth setting change, Storage mutation, staff access, real transfer, or QA data migration occurred.
- Official Supabase guidance confirms that managed daily backups are available on Pro/Team/Enterprise, PITR is a paid add-on, free-tier recovery requires off-site logical `db dump` exports, and database backups preserve Storage metadata but not Storage object contents.
- `supabase backups list --remote=vyyfuaqmbxvfqgbfqooc` still reports `backups: null`, `pitr_enabled: false`, and `walg_enabled: true`. The linked main branch therefore has no independently restorable managed backup/PITR point.
- Dependency inventory found six Auth users, ten Auth sessions, three private Storage buckets, six custom Storage policies, and zero Storage objects/bytes. There are currently no binary Storage objects to export, but a valid logical backup must preserve database/Auth/Storage metadata and custom policies.
- Prepared a user-only recovery directory at `C:\Users\User\Documents\Chamah-Recovery\TRACK117a-2026-11-11` with inherited ACLs removed and full control limited to the Windows user. The real logical dump failed before writing because Supabase CLI v3 requires Docker or Podman for `pg_dump`; neither container runtime nor native `psql`/`pg_restore` is installed. The resulting zero-byte file was removed, so no invalid backup artifact remains.
- An isolated cost-free restore test could not be run because Docker/Podman and native PostgreSQL restore tooling are unavailable. Supabase branching/new-project restore is an alternative isolated environment but may be billable and was not created or priced without explicit organization/cost confirmation.
- Read-only migration reconciliation found 80 local files and 84 remote history entries: 22 same-name migrations have different local/remote timestamps, one local migration (`mcp_readonly_scoped_rpcs`) has no remote-name match, and five remote migrations have no local-name match (`track028b_tuition_rates_collection_model`, `track029_supabase_keepalive`, `track054_explicit_table_grants`, `add_readonly_permission_scoped_mcp_daycare_rpc`, and `add_readonly_permission_scoped_mcp_staff_rpc`). Supabase compares timestamps, so the history is not clean even though TRACK113–116 schema objects are present.
- Remote migration history was intentionally not repaired before a valid backup and isolated restore test. Official guidance confirms `migration repair` changes only the tracking table, not schema SQL; the safe next step is to capture and restore-test a complete logical backup, then reconcile exact local filenames/content to the authoritative remote history before any tracking-table repair.
- Recovery/security validation remained stable: zero allocation mismatches, zero attachment inconsistencies, zero active financial jobs, zero Storage objects, one active Director, zero non-Director grants for TRACK113–116 actions, and no Supabase health findings. Security advisors still report intentional default-deny RLS tables/action-gated authenticated `SECURITY DEFINER` RPCs and the unresolved leaked-password-protection warning.

## TRACK117b — Recovery & Migration Repair (2026-11-11)

- Final status: **BLOCKED — recovery readiness is still insufficient to resume TRACK117**. No Production deployment, database/schema/business-data mutation, migration-history repair, Auth/Storage mutation, staff access, real transfer, or QA data migration occurred.
- The approved PostgreSQL installation attempt downloaded the official PostgreSQL 17 installer through `winget` but stalled without presenting an installer window or installing files; it was stopped without a system change. A cost-free fallback used the official EDB PostgreSQL 17.11 Windows portable binaries. The archive SHA-256 was verified as `80379B2C04D51C30225532E0AE04509899141E9957ED096FE749D7FD9DF8F82F`, and `pg_dump`, `pg_restore`, and `initdb` are available in the user-only TRACK117a recovery directory.
- A scoped custom-format logical dump was attempted with the short-lived linked-project PostgreSQL credentials and included `public`, `private`, `auth`, `storage`, and `supabase_migrations`. PostgreSQL rejected the dump while locking `auth` tables with `permission denied for schema auth`. The temporary CLI database role therefore cannot create a recovery-complete Auth backup. The zero-byte output was removed; no invalid or unencrypted backup artifact remains.
- Because no complete logical backup could be created, AES-256 packaging and the required isolated restore test were not performed. A valid next attempt requires the existing PostgreSQL owner password or a restorable managed Supabase backup/PITR facility. Replacing the owner password or substituting API exports was rejected because that would change Production credentials or omit Auth password hashes and other database-only recovery state.
- Current recovery scope remains six Auth users, ten Auth sessions, three private Storage buckets, six custom Storage policies, and zero Storage objects. Database backup can preserve Storage metadata but not binary Storage contents; there are presently no binary objects to export, but future recovery procedures must back them up separately.
- Read-only statement hashing reconciled 79 same-name local/remote migrations. Only 33 are byte-equivalent after line-ending normalization; 46 differ and cannot be treated as equivalent without SQL-by-SQL proof. Eleven timestamp-drift pairs are exact-content matches: `mcp_full_access_daycares`, `mcp_private_permission_helper`, `portal_mcp_full_read_access`, `portal_mcp_full_read_policies`, `portal_mcp_policy_read`, `portal_policy_documents`, `portal_policy_published_title`, `portal_policy_safe_reads`, `portal_policy_secure_save`, `track111_storage_authorization_policy`, and `track111_approval_digest_schema`.
- Eleven additional timestamp-drift pairs are not exact-content matches: `track030b_bank_upload_history`, `track102b_oauth_callback_relay`, `track102c_relay_service_role_grant`, `track110_authorization_mcp`, `track112_data_management_readiness`, `track112_mcp_audit_contract`, `track113_suppliers_payments`, `track114_financial_approval_reconciliation`, `track114_financial_fk_indexes`, `track116_atomic_payment_attachments`, and `track116_storage_cleanup_policy_fix`. The inventory also retains one local-only name (`mcp_readonly_scoped_rpcs`) and five remote-only names (`track028b_tuition_rates_collection_model`, `track029_supabase_keepalive`, `track054_explicit_table_grants`, `add_readonly_permission_scoped_mcp_daycare_rpc`, and `add_readonly_permission_scoped_mcp_staff_rpc`).
- No local migration file was renamed and no remote migration-history row was repaired. Even the 11 exact timestamp-drift candidates were left unchanged because the mandatory complete backup/restore gate failed; blind replay and tracking-table-only repair remain unsafe while 46 same-name statement sets differ.
- Read-only security and integrity evidence remains stable from the TRACK117/117a gate: one active Director, zero non-Director TRACK113–116 action grants, zero allocation mismatches, zero attachment inconsistencies, zero active financial jobs, zero Storage objects, and no Supabase health findings. The known disabled leaked-password-protection warning and intentional default-deny/action-gated `SECURITY DEFINER` advisor notices remain unresolved and unchanged.
- TRACK117 must remain paused until authorized recovery credentials or a managed restorable backup permit a complete encrypted dump and isolated restore test. After that succeeds, each non-exact migration discrepancy must be proven against catalog/source effects before any narrowly scoped history repair; Production rollout and authenticated Production smoke tests remain prohibited until those gates pass.

## TRACK117c — Existing Database Credentials Audit (2026-11-11)

- Final status: **BLOCKED — no accessible existing PostgreSQL owner credential was found**. This was a read-only configuration and credential-location audit. No credential was printed or copied into the repository, and no Production deployment, database/Auth/Storage mutation, password reset, Vercel change, Supabase secret change, business-data access, or migration-history repair occurred.
- Local configuration contains no `DATABASE_URL`, `DIRECT_URL`, `POSTGRES_PASSWORD`, `PGPASSWORD`, database-password equivalent, or populated PostgreSQL connection secret. The repository Supabase link stores project/organization metadata and a passwordless pooler endpoint only. Process and persistent Windows environment variables, Windows Credential Manager candidate targets, and PowerShell history candidate markers contained no PostgreSQL/Supabase database credential. Existing `.env.example` files contain only unrelated Google Sheets variable names.
- The linked Vercel project was explicitly verified as `chamah/chamah-portal` (`prj_6IND7ee2E9s3KispBh6iBDWwQo6X`). Its Production environment has no environment variables, so Vercel does not hold an owner connection string or database password for this project.
- Supabase's hosted Edge Function inventory contains the platform-injected `SUPABASE_DB_URL` plus API/JWKS variables. The authorized CLI exposes only names, timestamps, and one-way digests; it does not return the connection value. No checked-in Edge Function reads `SUPABASE_DB_URL`, and retrieving or testing it would require introducing/deploying new hosted code, which is a prohibited Production modification for this TRACK.
- The platform-injected `SUPABASE_DB_URL` is therefore not an accessible backup credential. The only database connection material obtainable through the existing CLI session is the short-lived restricted connection already tested in TRACK117b; native `pg_dump` reached PostgreSQL but failed on `auth` with `permission denied for schema auth`. API secret/service-role keys bypass Data API RLS but are not PostgreSQL owner credentials and cannot produce a logical dump containing Auth password hashes and database-only state.
- Auth-complete backup permission remains unverified for the inaccessible injected URL and disproven for every credential that is presently accessible. No valid encrypted logical backup or isolated restore exists, so TRACK117 remains blocked.
- Safe recovery options, in order: (1) the user retrieves the existing database password from their own password manager/secure records and places it directly into a local `PGPASSWORD` session variable or secure prompt without sending it in chat; then run a read-only privilege probe followed by the encrypted dump/isolated restore workflow; (2) if the password is genuinely lost, explicitly authorize a Supabase database-password reset in a separate TRACK, first inventorying and updating every dependent connection because reset changes Production credentials; or (3) explicitly approve any plan/cost change needed for Supabase managed daily backups or PITR and restore into a separate project before relying on it. Supabase Support/organization administrators may help confirm plan/access, but an unrecoverable password still requires reset rather than extraction.
- Required user action: choose option 1, 2, or 3. The safest cost-free path is option 1 if the existing password can be recovered. Until one option is authorized and a complete backup passes isolated restore, do not repair migration history or resume TRACK117 Production rollout.

## TRACK117d — Database Password Rotation Readiness (2026-11-11)

- Final status: **CONDITIONALLY READY FOR A SEPARATELY AUTHORIZED ROTATION; TRACK117 REMAINS BLOCKED**. This TRACK performed read-only dependency discovery and prepared the runbook only. No password was reset, exposed, generated, stored, or tested; no Production/Preview deployment, database/Auth/Storage mutation, Supabase/Vercel/GitHub configuration change, business-data access, or cost was incurred.
- Repository and package inspection found no PostgreSQL driver/ORM, direct connection string, `SUPABASE_DB_URL`, `DATABASE_URL`, `DIRECT_URL`, `PGPASSWORD`, or database-password consumer. Portal Vercel APIs and the protected MCP use Supabase HTTP APIs with caller JWT/publishable credentials; deployed Supabase functions use `SUPABASE_URL` with platform-managed anon/service-role credentials. Those API credentials are distinct from the `postgres` role password.
- All nine active deployed Edge Functions were inspected from their deployed source: `portal-users`, `portal-settings`, `portal-bank-workbench`, `portal-workforce-workbench`, `portal-bank-transfer-workbench`, `portal-runtime-config`, `portal-mcp-readonly`, `portal-mcp-server`, and `portal-oauth-callback-relay`. None references `SUPABASE_DB_URL`, another direct database URL, or a PostgreSQL password. Supabase still injects `SUPABASE_DB_URL` as platform metadata, but it has no application consumer in this project.
- Vercel project `chamah/chamah-portal` was revalidated. Its complete environment inventory is empty across Production, Preview, and Development, so no Vercel deployment depends on the owner password. Supabase has no preview database branch; both current Preview application validation and the eventual Production frontend point at the same linked Supabase main project. Password rotation is therefore one shared-backend credential event, not separate Preview/Production rotations.
- Database-side metadata was checked twice with identical results: zero active sessions using the `postgres` role, no Vault secrets, no foreign servers, no user mappings, and zero cron jobs whose commands contain PostgreSQL connection-string/password markers. Login roles are Supabase platform roles plus `postgres` and an expired temporary `cli_login_postgres`; no custom application login role was found. Supabase Auth, PostgREST, Realtime, and Storage use their own managed roles/pools and are not repository-configured with the owner password.
- No `.github` workflow exists and the installed environment has no GitHub CLI. The connected GitHub integration intentionally cannot read repository-secret endpoints, so GitHub secret names could not be externally enumerated. With no workflow, no checked-in GitHub Actions path consumes a database password; a dormant secret could still exist and must be checked manually before rotation. The same discovery limit applies to user-managed clients outside the project, including password managers, `psql`, DBeaver/TablePlus, BI/reporting tools, n8n/Zapier/Retool, personal scripts, external hosts, and vendor integrations.
- Rotation impact is low for the deployed application but potentially high for any undisclosed direct client. After reset, every direct/session/transaction-pooler connection using `postgres` and the old password fails. Supavisor may briefly return `28P01` while credentials refresh; repeated stale-password attempts can trigger a roughly two-minute circuit breaker that keeps extending if the client continues retrying. Official guidance recommends stopping stale clients, validating the new password by direct connection first, then retrying the pooler, and avoiding multiple rapid resets.
- Prepared pre-rotation gates: the user must manually certify the external-client checklist and GitHub Actions secret names; choose a maintenance window; approve the credential-only risk while no complete restorable backup exists; ensure Dashboard Owner/Administrator access and Supabase account MFA; prepare the verified PostgreSQL 17.11 tools and locked recovery directory; choose a generated high-entropy password stored directly in a password manager; and explicitly authorize a separate rotation TRACK. Never send the password in chat, CLI arguments, SQL, source control, logs, or documentation.
- Prepared execution order for the authorized TRACK: stop all identified direct clients/retry loops; reset only through Supabase Dashboard Database Settings or the Management API, never `ALTER ROLE`; store the new value immediately in the password manager; wait for propagation; validate one direct TLS connection as `postgres`; run read-only privilege probes for `auth`, `storage`, and `supabase_migrations`; retry the session pooler cautiously; then create the encrypted Auth/Storage-complete logical backup and perform the isolated local restore before any migration repair or Production rollout.
- Prepared post-rotation validation: compare schema/table and Auth/Storage metadata counts between source and isolated restore; confirm Auth login/session refresh, Storage bucket metadata, Supabase REST/RPC, all nine Edge Functions, Preview MCP, canonical Production read-only availability, one active Director, and financial/attachment integrity without staff access, real transfers, or QA data migration. Confirm Vercel has no new database secret and monitor Postgres/pooler/Auth/Storage/Function logs for authentication failures without printing connection strings.
- Prepared recovery behavior: if direct login fails, stop retries and verify the password/connection endpoint rather than rotating again; if direct works but Supavisor fails, wait for its credential cache/circuit breaker to clear and retry once; if any undisclosed client fails, keep it stopped until its secure store is updated and validated. A password reset cannot be rolled back to an unknown old value. If the new password is lost or the platform does not converge after direct validation, stop and contact Supabase Support before any further reset.
- Exact user actions required before rotation: (1) inspect GitHub repository/environment/organization Actions secrets for database URL/password names; (2) identify or certify absent every external direct PostgreSQL client and its owner; (3) confirm a maintenance window and authorized operator with Dashboard Owner/Administrator access and MFA; (4) confirm secure password-manager storage and a private local method for supplying `PGPASSWORD`; (5) explicitly approve the reset despite the current lack of a restorable backup; and (6) authorize the separate execution TRACK. Until all six are confirmed, do not rotate and do not resume TRACK117.

## TRACK117e — Database Password Rotation & Recovery Checkpoint (2026-11-11)

- Current status: **PAUSED AT THE REQUIRED USER-CONFIRMATION AND DASHBOARD-AUTHENTICATION GATE**. No database password was reset, entered, generated, exposed, or stored; no Production deployment, schema/data/Auth/Storage mutation, credential/configuration change, staff access, or cost occurred.
- Revalidated the TRACK117d technical prerequisites. The verified portable PostgreSQL 17.11 `pg_dump`, `pg_restore`, and `initdb` tools remain available in the user-only recovery directory. The linked Supabase project still reports no managed backup, no PITR, and no Preview branch. Repository state remains unchanged apart from this audit record.
- Read-only database readiness found zero active `postgres` sessions, six Auth users, ten Auth sessions, three Storage buckets, zero Storage objects, and one active Director assignment. The initial readiness query used an incorrect role-assignment table name and failed without side effects; the corrected query succeeded and returned the stated baseline.
- Opened the exact Supabase Database Settings URL for project `vyyfuaqmbxvfqgbfqooc`. The browser reached Supabase's sign-in page rather than authenticated project settings. Authentication was not automated, and no rotation control was opened or activated.
- Rotation cannot proceed until the user personally signs in to the Supabase Dashboard and explicitly confirms all TRACK117d prerequisites: GitHub secret review, absence or shutdown of external PostgreSQL clients, authorized maintenance window/operator with MFA, secure password-manager storage, private local password transfer, and acceptance that no pre-rotation restorable backup exists.
- After confirmation, the safe execution remains: user performs the final password-change submission in the Dashboard; validate direct TLS owner connectivity without logging the password; run Auth/Storage/migration privilege probes; cautiously validate the session pooler; create an encrypted Auth-complete logical backup; restore it into an isolated local PostgreSQL environment; compare schema and metadata counts; and stop immediately on any connectivity, dump, encryption, or restore failure. TRACK117 remains blocked until this evidence exists.

## TRACK117e — Database Password Rotation & Recovery Attempt (2026-11-11)

- Final status: **BLOCKED — isolated restore failed and execution stopped**. The user reported that the database password had been manually rotated and securely stored. No Production deployment, schema/data/Auth/Storage mutation, migration-history repair, staff access, real transfer, QA data migration, or cost occurred during validation.
- Used a user-created Windows DPAPI credential artifact for local handoff. The password was never printed, passed as a command-line argument, written to source control, or sent through chat. The first local conversion attempt rejected the serialized ciphertext because its trailing line ending was included; no network connection occurred. After trimming only the ciphertext line ending, DPAPI decryption succeeded in memory and all plaintext variables, `PGPASSWORD`, and unmanaged BSTR memory were cleared after each use.
- PostgreSQL owner connectivity succeeded over TLS through the linked session pooler as both `current_user=postgres` and `session_user=postgres`. Read-only privilege probes confirmed `USAGE` on `auth`, `storage`, and `supabase_migrations`, plus `SELECT` on `auth.users` and `storage.objects`. This proves the rotated owner credential is valid and sufficient for an Auth/Storage-complete logical dump.
- Created a PostgreSQL 17.11 custom-format logical dump with compression, no owner/ACL replay, and schemas `public`, `private`, `auth`, `storage`, `supabase_migrations`, and `extensions`. The plaintext dump was 1,180,300 bytes with SHA-256 `41929EC515A34B75836A360AB3D9586C6BA798C87611FE77A6F264486C3CE996`. TOC verification found the required `auth.users`, `auth.sessions`, `storage.buckets`, `storage.objects`, and migration schema/data entries.
- Encrypted the dump with Windows DPAPI CurrentUser protection inside the user-only recovery directory. A decrypt/re-encrypt round-trip reproduced the exact plaintext SHA-256. The retained encrypted artifact is `C:\Users\User\Documents\Chamah-Recovery\TRACK117a-2026-11-11\chamah-production-auth-storage-20261111-115227.backup.dpapi`, 1,180,518 bytes, encrypted-file SHA-256 `CF6136E4450B74BEF6EDF86E388B76652A42E2EEB141CDA3E0D2E487B03ED17F`. Recovery limitation: DPAPI decryption is bound to this Windows user profile and its DPAPI master keys; an independent off-device recovery key does not yet exist.
- Initialized a PostgreSQL 17.11 localhost-only isolated cluster under the Windows temporary directory, created a dedicated restore database, prepared Supabase role names and common extension dependencies, and started restore with `--exit-on-error`, no ownership, and no privileges. Restore stopped at its first schema collision: `ERROR: schema "public" already exists`, because a fresh PostgreSQL database creates `public` while the dump correctly contains `CREATE SCHEMA public`.
- Per the explicit stop-on-failure requirement, no adjusted restore, retry, data comparison, or broader Production service smoke test was attempted. The local PostgreSQL server was stopped. The plaintext dump, decrypted restore database/directory, schema-inspection file, and DPAPI password artifact were removed. Post-cleanup verification found only the encrypted backup remaining.
- Production data and services were not modified. Owner connectivity is verified and an encrypted Auth-complete backup artifact exists, but restorable recovery is not certified until a new approved attempt restores into an isolated database prepared without the default `public` schema (or uses an equivalently reviewed TOC adjustment), validates row/schema counts, and completes non-destructive service checks. TRACK117 remains blocked.

## TRACK117f — Isolated Restore Correction Attempt (2026-11-11)

- Final status: **BLOCKED — stopped on an unexplained isolated PostgreSQL runtime discrepancy before restore**. No Production deployment, schema/data/Auth/Storage mutation, credential rotation, new Production backup, migration-history repair, staff access, real transfer, QA data migration, or cost occurred.
- Verified the preserved encrypted artifact before decryption. Its size remained 1,180,518 bytes and SHA-256 exactly matched TRACK117e: `CF6136E4450B74BEF6EDF86E388B76652A42E2EEB141CDA3E0D2E487B03ED17F`. Windows DPAPI decryption in memory reproduced the expected plaintext dump SHA-256 `41929EC515A34B75836A360AB3D9586C6BA798C87611FE77A6F264486C3CE996`. The original encrypted file was never modified.
- Initialized a fresh PostgreSQL 17.11 cluster in a new Windows temporary directory and planned the corrected restore exactly as approved: create a dedicated database, drop only its default `public` schema, prepare required Supabase role names/common extensions, leave the dump unchanged, and use `pg_restore --exit-on-error --no-owner --no-privileges` with a restore TOC that only avoids recreating the separately prepared `extensions` schema.
- The first orchestration session verified/decrypted the artifact and initialized the cluster, but its shell-owned PostgreSQL process ended before database creation; the cluster still contained only PostgreSQL's default databases and no restore had run. A controlled restart then encountered a stale server marker. After a read-only readiness probe briefly reported the localhost port accepting connections, the immediately following `psql` connection failed with Windows socket `Permission denied (10013)`. No `pg_restore` invocation reached the target database.
- This inconsistent localhost process/socket state was not safely explainable within the stop-on-discrepancy requirement. Work stopped without attempting another server start, restore, TOC change, count comparison, Production integrity query, or Auth/MCP/portal smoke test.
- Cleanup stopped any isolated PostgreSQL process and removed the temporary decrypted dump, cluster, logs, and restore files. Post-cleanup verification found the temporary directory absent and the encrypted artifact present with its original SHA-256.
- Recovery certification remains incomplete: no restored schema/table/row evidence exists and Production-versus-snapshot comparison was not performed. The backup is also not independently recoverable if this Windows profile and its DPAPI master keys are lost; a separate portable encryption key/off-device copy or managed restore facility is still required.
- TRACK117 remains blocked. Migration-history blockers remain those recorded in TRACK117b: 46 non-byte-equivalent same-name migrations, including 11 non-equivalent timestamp-drift pairs, plus one local-only and five remote-only migration names. No migration history should be repaired and no Production deployment should be recommended until isolated restore and integrity/service validation succeed.

## TRACK117g — Stable Isolated Restore Runtime Gate (2026-11-11)

- Final status: **BLOCKED — no stable isolated PostgreSQL runtime is installed; stopped before decryption or restore**. No Production deployment, database/Auth/Storage mutation, credential rotation, new Production backup, migration change, staff access, real transfer, QA data migration, or cost occurred.
- Revalidated the unchanged TRACK117e Windows-DPAPI artifact at `C:\Users\User\Documents\Chamah-Recovery\TRACK117a-2026-11-11\chamah-production-auth-storage-20261111-115227.backup.dpapi`. It remains 1,180,518 bytes with SHA-256 `CF6136E4450B74BEF6EDF86E388B76652A42E2EEB141CDA3E0D2E487B03ED17F`, exactly matching the TRACK117e/117f evidence. The encrypted artifact was not modified and no plaintext copy was created.
- Runtime inventory found no Docker CLI/daemon and no Podman installation. `wsl.exe` exists only as the Windows launcher; both `wsl --status` and `wsl --list --verbose` report that Windows Subsystem for Linux is not installed, so there is no usable Linux distribution or container backend.
- Per the instruction to stop troubleshooting the unstable native Windows PostgreSQL runtime, that runtime was not restarted or reused. Restore preparation, `pg_restore`, restored-data validation, Production comparison, integrity queries, and service smoke tests were not attempted because the required stable isolation gate did not pass.
- The reliable cost-free path is an explicitly approved system-level installation of WSL 2 and Docker Desktop (or an approved equivalent Linux container engine), followed by a PostgreSQL 17 container readiness/health gate before decrypting the preserved artifact. Installation may require Administrator elevation, virtualization support, download/network access, acceptance of Docker Desktop's applicable license terms, and a Windows restart.
- The backup remains DPAPI CurrentUser-bound and is not independently recoverable if this Windows profile and its DPAPI master keys are lost. A portable AES-256 copy must not be represented as prepared until the existing dump restores successfully and the user supplies a new recovery passphrase through a secure local handoff. No cloud upload is authorized or planned without separate explicit approval.
- TRACK117 remains blocked. After runtime approval and successful restore certification, the remaining migration-history blockers are still those recorded in TRACK117b: 46 non-byte-equivalent same-name migrations, including 11 non-equivalent timestamp-drift pairs, plus one local-only and five remote-only migration names. No migration history repair or Production deployment is ready.

## TRACK117g — Runtime Installation Readiness (2026-11-11)

- Current status: **READY FOR USER APPROVAL OF SYSTEM CHANGES; NO INSTALLATION STARTED**. This checkpoint performed read-only compatibility, capacity, service, restart-state, and licensing research only. No Windows feature, security setting, service configuration, application, license, backup, database, Supabase project, Preview, or Production state was changed.
- The host satisfies Docker Desktop's documented WSL 2 hardware and operating-system baseline: Windows 11 Pro x64 build 26200, 13th-generation Intel Core i7-1355U, 64-bit addressing, SLAT and VM-monitor extensions present, firmware virtualization enabled, 31.64 GB RAM, and 341.96 GB free on the 475.76 GB NTFS system volume. The required Windows Server (`LanmanServer`) service is running with automatic start. No active hypervisor is presently detected because WSL/Virtual Machine Platform is not installed.
- The Windows launcher `wsl.exe` exists, but WSL reports that the subsystem is not installed. Docker and Podman remain absent. The supported preferred path is therefore WSL 2 followed by the current x86-64 Docker Desktop per-user installation using the WSL 2 backend.
- A pending-file-rename queue exists for Chrome/Windows Installer temporary paths, although the Component Based Servicing and Windows Update reboot-required markers are absent. Because WSL feature enablement itself normally requires a restart, the installation plan must include one controlled reboot rather than attempting to reuse the current session.
- Docker's current terms require license acceptance during download/installation. Docker Desktop is documented as free for personal use, education, non-commercial open source, and small businesses with both fewer than 250 employees and less than USD 10 million annual revenue. Professional use in a larger organization, government use, or commercial use outside those limits requires a paid Docker subscription. The user must identify the applicable category before installation; the project must not infer eligibility or accept terms on the user's behalf.
- Exact proposed actions awaiting approval: (1) user confirms Docker Desktop license eligibility or an existing paid entitlement; (2) run elevated `wsl.exe --install --no-distribution` to enable WSL and Virtual Machine Platform without adding a general-purpose Linux distribution; (3) reboot Windows once; (4) verify WSL 2.1.5 or later, virtualization, and feature state; (5) download the signed current Docker Desktop x86-64 installer from Docker; (6) user reviews/accepts Docker's terms; (7) install Docker Desktop in recommended per-user mode with WSL 2 Linux containers; (8) start Docker Desktop and verify engine health; (9) pull the official PostgreSQL 17 image; and only then resume unchanged-backup checksum, container stability, restore, validation, cleanup, and portable AES-256 preparation. No backup data will be uploaded.
- The original DPAPI artifact remains untouched. Restore certification and Production read-only checks remain deferred until the approved runtime installation is complete. No migration history repair or Production deployment is authorized.

## TRACK117g — WSL 2 Feature Installation Checkpoint (2026-11-11)

- Current status: **PAUSED BEFORE REQUIRED REBOOT**. The user approved the previously documented WSL 2 and Docker Desktop installation plan. No Docker download, Docker license acceptance, backup decryption, restore, Production access, cloud upload, migration change, or deployment occurred at this checkpoint.
- The host's legacy `wsl.exe` supports only bare `--install` and rejected the documented `--no-distribution` option without changing state. To avoid an unnecessary Ubuntu installation, used Microsoft's minimal manual feature path instead.
- Windows Administrator/UAC-approved DISM operations enabled `Microsoft-Windows-Subsystem-Linux` and `VirtualMachinePlatform`, each with `/all /norestart`. Both returned exit code `3010`, confirming successful feature enablement with one reboot required. No reboot was initiated automatically.
- Work is intentionally paused for the user to save open work and explicitly approve or manually perform the reboot. After restart, verify feature state and WSL version before downloading Docker Desktop. Notify the user again before Docker's license-acceptance step.
- The unchanged TRACK117e encrypted artifact remains untouched and no plaintext was created. Docker remains scoped to isolated restore verification rather than becoming a permanent backup dependency.

## TRACK118 — Full Director MCP Capability Audit (2026-11-11)

- Completed a documentation-only audit of the current portal, Vercel APIs, Supabase schema/RPCs/Edge Functions, Director MCP implementation, deployment evidence, and tests. Added `docs/audits/TRACK118.md` with a capability matrix covering Director authorization, organization, documents, workforce, assignments, pay terms, certificates, leave, imports, payroll, budgeting, occupancy, banking, suppliers, payments, attachments, reconciliation, reporting, data quality, master data, audit, and asynchronous work.
- Confirmed `api/mcp.js` exposes 41 closed semantic Director tools and no unrestricted SQL, generic table selector, or service-role credential. Existing strengths include server-side Director/action gating, caller-derived identity, approvals, optimistic concurrency, idempotency, private Storage, atomic financial validation, append-only audit/lifecycle evidence, and durable statement-import/matching jobs.
- Identified the principal capability gaps: no MCP coverage for employment/assignment/pay-term/eligibility/certificate/leave workflows, payroll lifecycle/rows/allocations, Budget/configuration/master-data mutation, banking assignments, legacy transfers, user/role administration, broad reporting/export, audit search, or generalized asynchronous imports/jobs.
- Recorded that TRACK115 used a custom Node/Vercel JSON-RPC runner, not ChatGPT itself. Actual ChatGPT MCP OAuth discovery, consent, tool discovery, execution, refresh/revocation, file handling, asynchronous polling, and structured-result behavior remain unverified and are the highest-priority acceptance gap.
- Recommended a phased plan: first prove the real ChatGPT Preview boundary and clear TRACK117 recovery gates; then add workforce parity, payroll parity, Budget/configuration/master data, complete finance/documents/reporting, and finally Director administration/operational hardening through shared semantic query/command services.
- No application code, calculation, API contract, migration, database, Edge Function, Vercel deployment, Supabase setting, Production alias, or business record was changed. Application build and Playwright validation were not required for this Markdown-only task; documentation scope and diff integrity were checked separately before completion.

## TRACK119 — Enable Direct ChatGPT Data Management (2026-11-11)

- Status: **BLOCKED at isolated Preview database provisioning; Production unchanged**. Corrected the remote MCP transport so each Vercel Preview advertises its own protected-resource URL instead of the canonical Production MCP URL. Added per-tool OAuth security declarations, read/write/destructive annotations, and the standard authenticated-profile tool required for current ChatGPT plugin discovery and account identity.
- Pushed implementation commit `777487951335a7468ae90424f0f23b76de900862` on `codex/track119-chatgpt-mcp` and deployed READY Vercel Preview `dpl_GYuorEniP4jqqQEm3KuzYZNEhQBC` at `https://chamah-portal-pces0e9rn-chamah.vercel.app`. Added a protection exception for that exact Preview hostname only. Public verification returned dynamic Preview resource metadata, while the MCP endpoint continued to return an OAuth `WWW-Authenticate` challenge and enforce authenticated active-Director authorization in application code.
- The required database-isolation gate failed before any migration: Supabase account inspection found one visible project, `vyyfuaqmbxvfqgbfqooc` (`chamah-manager`), zero development branches, and the current Preview/Production code both referencing that project. No TRACK119 migration was applied to it. Supabase development-branch creation was unavailable because the organization is not on Pro.
- The user approved a separate isolated project only if its confirmed cost remained `$0/month`. Supabase reconfirmed `$0/month` immediately before provisioning, but rejected project creation because an organization administrator/owner had reached the two-active-free-project limit. No paid upgrade, pause, deletion, project, schema, synthetic fixture, Auth identity, environment variable, Edge Function, or database row was created or changed.
- Consequently, actual ChatGPT OAuth consent, tool discovery, authenticated read, document ingestion, and controlled write acceptance were not run: doing so would have connected ChatGPT to the shared non-isolated Supabase project and violated the explicit isolation/no-sensitive-data requirement. The existing 41 business tools plus `get_profile` remain transport-ready, but workforce/payroll/daycare approval-gated ingestion was not implemented or applied because no authorized isolated database exists.
- Validation completed: `node --check` for both MCP handlers; focused OAuth/MCP/authorization/data-management/supplier/payment/reconciliation/attachment contracts passed 31/31; `npm run build`; `git diff --check`; public Preview metadata HTTP 200; unauthenticated MCP HTTP 405 with the correct Preview-specific OAuth challenge. No Production deployment, alias, database, Auth, Storage, or data was modified.

## TRACK119 — Isolated Preview, Daycare Ingestion, and ChatGPT MCP Acceptance (2026-11-11)

- Final status: **READ-ONLY CHATGPT ACCEPTANCE PASSED; CONTROLLED WRITE ACCEPTANCE AWAITS SEPARATE EXPLICIT APPROVAL**. Production remained unchanged. The previously approved unused Supabase project `jnwteuroiinhrycslfpg` was deleted only after a final read-only audit found no application tables, Auth users/sessions, Storage buckets/objects, Vault secrets, custom Edge Functions, or active external dependencies.
- Created the isolated Supabase Free-plan project `chamah-manager-preview` (`iwsbjudahtjyigecymzd`) with Nano compute and no paid upgrade. Replayed the complete schema into this project only, corrected duplicate migration-version ordering for fresh replay, enabled `pg_cron` before dependent migrations, deployed all nine matching Edge Functions, and linked local Preview configuration exclusively to the new project. No Production schema, Auth, Storage, function, secret, or data was copied or changed.
- Added approval-gated daycare ingestion infrastructure: `DAYCARE.READ` and `DAYCARE.IMPORT`; RLS-protected ingestion batches; read/search, preview, approval-request, and atomic commit RPCs; 1–100-row bulk validation; idempotency; duplicate, license-conflict, stale-version, and invalid-row reporting; short-lived Director approval bound to the exact staged batch; audit evidence; and associated allocation-unit creation for new daycares. Added matching MCP tools and automated contract coverage. Only synthetic organization and Director fixtures were created.
- Added Preview-specific Supabase URL and publishable-key injection for static builds and MCP OAuth metadata, while retaining the existing Production fallback in source. Scoped both Vercel Preview environment variables only to Git branch `codex/track119-chatgpt-mcp`. Deployed READY Preview `dpl_B4hWVCXXeNd46gVSKXVFJNdLzV7N` at `https://chamah-portal-4dcdo3f5g-chamah.vercel.app` from commit `6e2f739f28db40b2bf63aa1474fb77c83fda28fa`.
- Configured Vercel Deployment Protection so the sole unprotected domain is `chamah-portal-4dcdo3f5g-chamah.vercel.app`. Restored protection for the superseded `chamah-portal-pces0e9rn-chamah.vercel.app`; verification returned a Vercel SSO `302` for the old URL. All other Preview deployments remain protected.
- Enabled the OAuth server only in Supabase Preview and created one manually registered public OAuth client named `Chamah Director Preview - ChatGPT`, restricted to the exact callback `https://chatgpt.com/connector/oauth/R_13e1TGaZyM`. The client uses Authorization Code with PKCE, token-endpoint authentication `none`, no client secret, dynamic registration disabled, and ChatGPT defaults limited to `openid` plus `email`. The consent application and discovered authorization/token/OIDC/userinfo endpoints all point exclusively to `iwsbjudahtjyigecymzd`; the portal independently enforced the active Director profile.
- Completed actual ChatGPT acceptance through the ChatGPT plugin UI rather than a custom JSON-RPC runner. ChatGPT installed and connected `Chamah Director Preview`, completed Director OAuth consent, discovered the MCP tools, executed `get_profile`, identified `TRACK119 Synthetic Director`, then executed `search_daycares` with an empty query and limit 10 and returned zero rows from the isolated synthetic database. The ChatGPT result explicitly reported both exact discovered tool names and a passed read-only acceptance test. No preview/import/approval/commit/update tool was called.
- Post-acceptance security verification returned HTTP 200 for public protected-resource discovery with resource `https://chamah-portal-4dcdo3f5g-chamah.vercel.app/api/mcp` and authorization server `https://iwsbjudahtjyigecymzd.supabase.co/auth/v1`; an unauthenticated MCP POST returned HTTP 401 with `Director sign-in is required`; the old Preview returned Vercel SSO; and canonical Production `https://chamah-portal.vercel.app` continued to return HTTP 200 from its existing cached deployment. No secret or token was printed or committed.
- Validation completed: `node --check api/mcp.js`; `node --check api/mcp-oauth-metadata.js`; `node --check scripts/build.mjs`; focused TRACK110/TRACK112/TRACK119 and OAuth reconciliation tests passed 16/16; `npm run build`; `git diff --check`; complete migration replay; nine-function deployment inventory; actual ChatGPT OAuth/tool execution; Vercel exception inventory; old-Preview protection probe; public discovery; unauthorized-access rejection; and canonical Production read-only probe.
- Remaining acceptance scope: write-capable ChatGPT tests were intentionally not run because the user explicitly withheld write approval. The implemented flow is ready for a separate synthetic-only acceptance that stages a daycare file, reports duplicates/conflicts, requests Director approval, commits only after that approval, and verifies the resulting row and audit evidence.

## TRACK119b — ChatGPT MCP Controlled Daycare Write Acceptance (2026-11-11)

- Root cause of the failed `commit_daycare_import`: the TRACK119 commit RPC inserted `audit_events.operation = 'MCP_IMPORT'`, while the canonical `audit_events_operation_check` permits `MCP_CREATE` and `MCP_UPDATE` but not `MCP_IMPORT`. PostgreSQL therefore rejected the audit insert and rolled back the daycare write, approval consumption, and batch commit atomically. Live Preview evidence confirmed the failed approval remained unconsumed and its batch remained uncommitted.
- Applied forward-only Preview-only migration `20261111195638_track119b_daycare_matching_and_audit_fix.sql` to isolated project `iwsbjudahtjyigecymzd`. The commit RPC now records the supported operation for each actual create/update. The preview RPC now exposes `CREATE`, `UPDATE`, `SKIP`, and `CONFLICT`, matches by stable `daycare_code` and `license_number` instead of names, reports `STABLE_IDENTIFIER_CONFLICT` and `AMBIGUOUS_STABLE_IDENTIFIERS`, requires an expected row version for changes, and rechecks identifiers/version at commit time.
- Completed actual ChatGPT plugin execution against `Chamah Director Preview`. ChatGPT staged and committed an explicitly approved two-row synthetic create batch, then read back both rows. A separate explicitly approved update advanced `TRACK119B_ALPHA` from row version 1 to 2. The exact duplicate preview returned `SKIP`; a changed record without expected version returned `CONFLICT`; a valid expected-version change returned `UPDATE`; a new record returned `CREATE`; and a daycare-code/license pair pointing to different existing rows returned `AMBIGUOUS_STABLE_IDENTIFIERS`. No conflict, skip, ambiguous, or new-record preview was committed without Director approval.
- Direct Preview database verification found only the approved synthetic rows (`TRACK119B_ALPHA` version 2 and `TRACK119B_BETA` version 1), three matching MCP audit events (two `MCP_CREATE`, one `MCP_UPDATE`), two consumed approvals for the successful batches, and no committed `TRACK119B_GAMMA`. Unapproved batches remained `READY` or `CONFLICTS` with null approval/commit values.
- Added synthetic CSV fixtures for valid and within-file duplicate cases. Native ChatGPT file-attachment automation remains unverified because the Chrome extension file chooser could not access the local fixture without the additional local-file URL permission, which the user explicitly declined to enable. No permission was broadened; structured MCP ingestion and controlled writes were tested successfully, but native attachment-to-MCP handoff remains the sole TRACK119b acceptance blocker.
- Validation completed: 17/17 focused OAuth/MCP/authorization/ingestion tests; `node --check` for both MCP handlers; `npm run build`; `git diff --check`; linked migration parity; actual ChatGPT create/update/read/duplicate/conflict/ambiguous execution; direct database/audit/approval/batch verification; public Preview discovery HTTP 200; unauthenticated MCP HTTP 401; superseded Preview HTTP 302; canonical Production HTTP 200. Production was not modified or deployed.

## TRACK119b Closure and Production Operational Readiness Audit (2026-11-11)

- Closed TRACK119b based on the user's completed manual native ChatGPT attachment test: ChatGPT successfully read the uploaded CSV files and submitted parsed records through the isolated Preview MCP ingestion tools. Documented that the accepted workflow is parsed-record ingestion; direct transfer or retention of the original binary is a separate optional capability and Chrome automation file access is not an operational blocker.
- Added `docs/audits/TRACK119-production-operational-readiness.md`, a read-only audit of canonical tables, current portal and MCP coverage, authorization boundaries, actual blockers, and the shortest Preview-first path to operational use.
- Confirmed the canonical schema already supports employees, employments, assignments, pay terms, compensation eligibility, certificates, leave, payroll, banking, suppliers, payments, and daycare data. Person-level children remain unmodeled; `monthly_enrollment` contains aggregate counts only.
- Confirmed the minimum workforce gap is semantic MCP parity and approval-bound ingestion, not a schema rewrite. Current employee MCP import writes immediately and is create-only; relationship read-back and employment/assignment/pay-term/certificate/leave commands are absent. The recommended implementation reuses the TRACK119b batch/preview/approval/commit pattern and existing workforce validation.
- Confirmed institution-level read-only RPC scoping exists for daycare/staff reads, but the MCP transport currently rejects all non-Director users before tool discovery. Recommended a role-based read-only tool allowlist with database scope checks retained and all write tools hidden/denied.
- No application code, schema, RLS, OAuth setting, database record, Vercel deployment, Preview infrastructure, or Production resource was changed. Documentation-only validation checked implementation evidence, scope, and diff integrity; application build and UI tests were not required.

## TRACK120 — Final ChatGPT Portal Administration & Operational Readiness (2026-11-12)

- Implemented a closed, approval-bound mixed-domain MCP workflow over canonical Preview tables. Director tool discovery now exposes operational catalog/read-back plus preview, exact approval, atomic commit, and batch verification; active non-Director users discover only the existing institution-scoped read tools. Legacy direct write tools are hidden from MCP discovery so sensitive changes cannot bypass preview and approval.
- Added canonical operational coverage for employees, employments, assignments, certificates, pay terms, compensation eligibility, leave, payroll records, payroll allocations, bank allocations, suppliers, and payment requests. Stable identifiers, duplicate/conflict reporting, expected row versions, idempotency, one-time expiring approval, commit-time concurrency checks, transaction rollback, authorization audit, and record audit lineage are enforced in database functions.
- Applied forward-only Preview migrations through `20261112033512` to isolated Supabase project `iwsbjudahtjyigecymzd`. Fixed four defects found during actual acceptance: pgcrypto digest resolution, ingestion-domain constraint coverage, invalid audit foreign-key lineage, and missing row-version increments. Local applied migration history was preserved; corrections remain in separate forward migrations.
- Actual synthetic Preview acceptance created employee `TRACK120_EMP` and supplier `TRACK120_SUP` in one mixed-domain batch, corrected the employee through a second approved batch, and verified the persisted correction (`TRACK120 correction and version verified`, row version 2), committed batches, approvals, and four MCP audit records. Stale-version commit testing proved rejection with canonical data unchanged. Institution-scoped read testing proved assigned-daycare visibility and cross-daycare denial inside a rollback-only fixture; no additional user was activated.
- Validation passed: 20/20 focused authorization/MCP/ingestion/finance tests, migration parity, `node --check api/mcp.js`, build, and diff checks. Supabase advisors completed; TRACK120 functions are not anonymously executable, while the advisor still reports broad pre-existing authenticated SECURITY DEFINER warnings and leaked-password protection disabled. Performance findings are pre-existing RLS init-plan warnings.
- Repository-wide `npx playwright test` remains blocked by the existing mixed Node/Playwright test-runner configuration, which loads incompatible suites and exits with `test() did not expect test() to be called here` / `No tests found`. Targeted suites remain reliable.
- Deployed Preview `dpl_HEAzs9oSsJogUMrjW8vVz9ZDwnqZ` at `https://chamah-portal-8465o7emj-chamah.vercel.app` and assigned `https://chamah-track120-preview.vercel.app`. Both remain behind Vercel deployment protection. The existing ChatGPT connector is still pinned to the older TRACK119 Preview, so actual ChatGPT TRACK120 tool discovery, portal UI display verification, and ChatGPT read-back/correction cannot complete until an exact-host Preview protection exception is explicitly approved. Production was not modified or deployed.
- Operational readiness is therefore **NOT READY**. Additional actual blockers are incomplete semantic coverage for canonical bank transactions/accounts, payroll-month lifecycle, billing/collections where modeled, broad cross-module query/export, authorized schema/configuration administration, and the absence of a canonical person-level children model. These gaps must pass actual Preview acceptance before Production can be recommended.
- After explicit user approval, created a Vercel `alias-protection-override` only for `chamah-track120-preview.vercel.app`. Vercel inspection confirms that alias maps to deployment `dpl_HEAzs9oSsJogUMrjW8vVz9ZDwnqZ` and carries the hostname-scoped override; the underlying deployment URL remains protected by Vercel SSO. Public HTTPS checks returned 200 for the approved alias and its OAuth protected-resource metadata, 401 plus `WWW-Authenticate` for an unauthenticated MCP initialize request, 302 to Vercel SSO for the underlying deployment hostname, and 200 for unchanged canonical Production.
- Actual ChatGPT MCP acceptance proceeded through the native plugin UI. A second TRACK120 plugin discovered OAuth correctly but required a manually registered public client because dynamic registration remains disabled. Its generated callback was `https://chatgpt.com/connector/oauth/xsWac-Oqpnem`; the existing Preview OAuth client is registered only for the prior connector callback. Reusing that client would fail redirect validation, while adding the callback or creating another client would violate the explicit prohibition on OAuth configuration changes. Stopped without changing OAuth, RLS, database permissions, Production, another Preview, or business data. Actual ChatGPT TRACK120 tool execution remains blocked on authorization to add the generated callback (or otherwise approve a matching public OAuth client).

## TRACK120 — Actual ChatGPT Approval, Commit, and Audit Read-back (2026-11-12)

- Added only the explicitly approved callback `https://chatgpt.com/connector/oauth/xsWac-Oqpnem` to the existing isolated Preview OAuth client. Preserved its prior callback, public-client credentials, scopes, PKCE, and security settings. Connected the native ChatGPT plugin `Chamah Director TRACK120 Preview` and verified Director identity `TRACK119 Synthetic Director` (`47d22140-ee2f-437c-8a3d-2c446218cdf6`). Production and every other OAuth client remained unchanged.
- Actual ChatGPT read acceptance discovered 12 operational entities and read employee `TRACK120_EMP`. ChatGPT staged only batch `afb03b69-b4c7-4e08-a24f-f9f443d7ed24`, with a single notes-only `UPDATE`, expected row version 2, no conflicts, and digest `e364859f78240f932c5057526a4e169d005c136cf126322b387b9c22fc3607a8`.
- After the Director's explicit approval, actual ChatGPT requested approval `869c345b-7cc2-4e13-96cb-07f1b518aace` and committed only that batch. The atomic commit persisted notes `TRACK120 actual ChatGPT acceptance verified` and advanced the canonical employee row version from 2 to 3. No additional business write was made.
- Applied forward-only Preview migration `20261112065000_track120_batch_audit_readback.sql`. It extends the existing authorized batch read function to return the canonical record and authorization audit entries; it changes no tables, RLS policies, database permissions, OAuth settings, or write behavior. Function execution remains revoked from `public` and `anon` and granted only to `authenticated`, with the existing internal `auth.uid()` and `OPERATIONS.READ` checks retained.
- Actual ChatGPT MCP read-back returned record audit event `7a1e98e8-3e50-404e-bffe-31972943779b` (`MCP_UPDATE`, row version 3), authorization events `df6c1b29-8e27-48b7-a3c3-b14a7423f225` (`APPROVAL_CREATED`) and `6c4d6332-2e4f-4676-8236-a18715355d9a` (`SUCCESS`), approval ID, Director actor, and timestamps. Direct read-only Preview SQL independently matched those values.
- Focused TRACK120 contract validation passed 5/5. The exact public Preview hostname continued to enforce portal authentication. Portal UI display of this committed employee remains unverified because ChatGPT OAuth does not create a browser portal session and no portal password was authorized or available; authentication was not weakened or bypassed. This is a genuine remaining acceptance blocker for the original UI-verification criterion. Production was not deployed or modified.

## TRACK120 — Final operational delivery resumption (2026-11-12)

- Resumed from the existing TRACK120 acceptance state without repeating completed implementation analysis. Read-only inspection confirmed migration `20261112070000_track120_full_operational_delivery` is already recorded as applied in isolated Preview `iwsbjudahtjyigecymzd`; the matching search, record-read, and report RPCs exist and are not executable by `anon`.
- The supplied Vercel Preview target `prj_TLJVhQfA8oTkM5MCqfehqmBfVGwy` was confirmed by exact ID. It had no environment variables, while the MCP handler defaults to Production. Added `CHAMAH_SUPABASE_URL` and `CHAMAH_SUPABASE_PUBLISHABLE_KEY` as encrypted Preview-only variables using values retrieved exclusively through the authorized Preview Supabase connection.
- Added MCP API tool definitions and handlers for canonical operational record search, single-record read-back, and summary reporting, with focused contract tests. Validation passed the targeted TRACK119/120 suites (10/10), `node --check` for both MCP API files, and `git diff --check`.
- Deployment and synthetic acceptance are in progress; final deployment ID/SHA, exposed ChatGPT capabilities, and end-to-end results will be appended after verification. Production was not accessed or modified.

## TRACK120 — Synthetic Preview commit repair and acceptance (2026-11-12)

- Actual mixed-domain acceptance found and repaired three defects in the final commit RPC, each through a separate forward-only Preview migration: it called nonexistent `public.portal_consume_approval` instead of the existing private void helper; it inserted nonexistent `audit_events.old_values` instead of canonical `previous_values`; and it omitted required `portal_authorization_audit.channel`. The corrected commit calls `private.portal_consume_approval`, writes canonical record-audit fields, and records the MCP channel.
- Applied migrations `track120_commit_approval_scope_fix`, `track120_audit_column_fix`, and `track120_authorization_audit_channel_fix` exclusively to Preview `iwsbjudahtjyigecymzd`. Failed attempts rolled back atomically: no role row was created, the approval remained unconsumed, and the batch remained READY until the corrected retry.
- Actual TRACK120 connector acceptance then previewed, explicitly approved, and committed one synthetic `roles` row (`TRACK120_E2E_ROLE_20261112_A`). Connector batch read-back and independent Preview SQL confirmed batch COMMITTED, one canonical role at row version 1, consumed approval, `MCP_CREATE` record audit, `APPROVAL_CREATED` and `SUCCESS` authorization audit, and atomic verification.
- The corrected runtime API is deployed on the supplied Preview Vercel project. Public-resource metadata resolves to the Preview Supabase authorization server; unauthenticated MCP requests are rejected. A public exact-host Vercel alias-protection override was rejected by automatic approval review because it bypasses Vercel Authentication. No bypass was attempted by another route. Actual external ChatGPT discovery of the three new generic API tools remains gated on approval of this scoped access change and connector refresh.
- Validation passed 11/11 focused TRACK119/120 contract tests, JavaScript syntax checks, `git diff --check`, actual connector synthetic create/approval/commit/read-back, and direct database/audit verification. Production was not accessed or modified.

## TRACK120 — Final Preview deployment and connector boundary check (2026-11-12)

- Final READY Preview deployment: `dpl_GWpDEywTrNUC27Am8hHJgx4ms6bb`, project `chamah-manager-portal-v2-preview` (`prj_TLJVhQfA8oTkM5MCqfehqmBfVGwy`), commit `bcf96aee9f2d27c90c5699a36b0dec1e707d2f1e`, deployment URL `https://chamah-manager-portal-v2-preview-knk5evt4t-chamah.vercel.app`. Preview-only Supabase URL and publishable-key variables point to `iwsbjudahtjyigecymzd`. Public resource discovery returned HTTP 200 with that Preview URL and Preview Supabase as authorization server; unauthenticated MCP POST returned HTTP 405 and the expected active-sign-in challenge.
- Preview migration history includes `20261112070000` and the three forward-only commit repairs (`20261112080953`, `20261112081121`, `20261112081332`). All six final MCP RPCs exist; execution is granted to `authenticated` and revoked from `anon`.
- Actual connected TRACK120 tool surface exposes 40 tools, including profile, operational catalog, bounded operational-domain search, changeset preview, exact approval, atomic commit, and batch/audit read-back. The catalog exposes 22 canonical entities, including nine newly covered master-data, classroom/enrollment, and banking domains. The three new API tools `search_operational_records`, `get_operational_record`, and `operational_report` are not in the active connector tool surface, so their ChatGPT invocation could not be accepted.
- Attempted only an exact-host Preview alias protection override for the new deployment URL. Vercel automatic approval review rejected it because it bypasses Vercel Authentication and requested clear approval. No alternative bypass or Production access was attempted. TRACK120 remains blocked only on this external authorization and the subsequent actual ChatGPT connector refresh/execution of those three tools; synthetic approved create, commit, batch read-back, record audit, and authorization audit all passed.
- Final focused validation passed 11/11 tests, MCP API syntax checks, `git diff --check`, Vercel build, and synthetic Preview acceptance. Production was not accessed, modified, or deployed.

## TRACK120 — Scoped Preview override cleanup and connector schema check (2026-11-12)

- Director authorized a Vercel Authentication override only for `chamah-manager-portal-v2-preview-knk5evt4t-chamah.vercel.app` to complete TRACK120 connector discovery and acceptance. Applied that exact-host override; no project-wide or Production protection setting was changed.
- Verified the READY Preview deployment serves OAuth protected-resource metadata pointing to the Preview `api/mcp` endpoint and Supabase authorization server `iwsbjudahtjyigecymzd`. Deployment `dpl_GWpDEywTrNUC27Am8hHJgx4ms6bb` is built from code SHA `bcf96aee9f2d27c90c5699a36b0dec1e707d2f1e`.
- The active ChatGPT connector registry remains at 40 tools and does not expose `search_operational_records`, `get_operational_record`, or `operational_report`. Through the actual connector, profile, canonical catalog, employee search, and committed batch/audit read-back succeeded. The prior approved synthetic `roles` create acceptance remains verified. The three missing API calls could not be invoked because they are absent from the connected tool schema.
- Restored protection after this connector-schema blocker: revoked the exact-host alias override and the temporary shareable-link bypass on that hostname. Vercel returned an empty `protectionBypass` set. Production and all other hostnames remained untouched.
- TRACK120 discovery/acceptance is still incomplete pending refresh of the active ChatGPT connector schema to the deployed API. No new database change, application code change, or deployment was made in this continuation.

## TRACK121 — Preview OAuth login resume (2026-11-12)

- Director decision confirmed that TRACK121 uses the existing isolated Preview Supabase project `iwsbjudahtjyigecymzd` only. Production Supabase `vyyfuaqmbxvfqgbfqooc` and Production Vercel were not modified.
- Verified the existing Preview OAuth client `Chamah Director Preview - ChatGPT` in `auth.oauth_clients`. Existing ChatGPT callbacks were read directly from Preview configuration: `https://chatgpt.com/connector/oauth/R_13e1TGaZyM` and `https://chatgpt.com/connector/oauth/xsWac-Oqpnem`. No callback was guessed or added.
- Implemented unauthenticated consent handoff: the consent page redirects to the same Preview origin with only the short-lived `authorization_id` embedded in a validated `oauth_resume` URL. After portal login and active-session validation, the browser automatically returns to the same consent transaction. No tokens, codes, verifiers, or secrets are stored in the resume parameter.
- Preserved existing OAuth consent, PKCE, state, redirect validation, expiry, Director authorization, and audit behavior. The Preview build rewrites consent and portal Supabase configuration to `iwsbjudahtjyigecymzd` through the existing Preview-only environment variables.
- Focused validation passed 10/10 OAuth/MCP and callback-relay contract tests, JavaScript syntax checks, and `git diff --check`. Full Playwright remains blocked by the repository's existing mixed-runner configuration.
- Final Preview deployment is READY at `https://chamah-manager-portal-v2-preview-bcjjo5osi-chamah.vercel.app` (`dpl_CG3W3QT3t7yei5L8wV6wGmorXTF7`), built from commit `932203f2974e404f56ad2be018507dfd21086f2`. Preview protected-resource metadata resolves to the Preview Supabase authorization server. The Preview Auth Site URL was corrected from a stale prior deployment host to this exact deployment host; a read-only PKCE authorize check now returns the exact Preview consent URL. Existing authenticated Preview MCP profile access also succeeded. Production was not accessed, modified, or deployed.

## TRACK120 — Combined Preview deployment verification (2026-11-12)

- Reconciled the deployment contradiction without changing the canonical alias. TRACK120 MCP implementation is present in the ancestry (`c6d2cd5`/`bcf96ae`), and TRACK121 OAuth/login-resume changes are in `932203f`; the current combined branch contains both. Source inspection confirms `search_operational_records`, `get_operational_record`, and `operational_report` in `api/mcp.js`, plus Preview OAuth resume handling in the portal consent/login sources.
- Deployed the combined branch head `6fe0e379d135e13d857b31fd2cf5d5a80a750047` to isolated Preview as `dpl_frLSbx65pGTGcPiUmLyiginzva2U`, URL `https://chamah-manager-portal-v2-preview-lwbtj7q4g-chamah.vercel.app`. Deployment reached READY. Protected-resource metadata returns the Preview MCP resource and authorization server `https://iwsbjudahtjyigecymzd.supabase.co/auth/v1`; deployed consent JavaScript contains the validated OAuth login-resume flow and the Preview Supabase project.
- Focused TRACK120/OAuth validation passed 14/14 tests and all changed JavaScript syntax checks. The canonical alias `chamah-track120-preview.vercel.app` was not reassigned and remains on the prior TRACK120 deployment pending explicit approval after this combined deployment is independently accepted. Production was not modified or deployed.

## TRACK120 — Preview MCP schema refresh (2026-11-12)

- Actual Director discovery continued to expose a cached 40-tool schema even though the combined server source registered the three canonical operational tools and Director filtering retained them. The MCP initialize response advertised `tools.listChanged:false` and static server version `1.1.0`, providing no schema-change signal.
- Updated only the MCP protocol metadata to advertise `tools.listChanged:true` and server version `1.2.0`; no authorization, role, legacy-tool, or data behavior changed. TRACK121 OAuth code remains unchanged.
- Preview deployment READY: `dpl_AK7dry8fJiyx6DXFnTxaHTRJ9QTc`, URL `https://chamah-manager-portal-v2-preview-jnmsivh2d-chamah.vercel.app`, commit `ca37d78faa14c26b7bfc17f4a89c97273b7fb33a`. Focused validation passed 15/15. Production was not modified.

## TRACK121 — Temporary safe OAuth diagnostics (2026-11-12)

- Added a Preview-only `/api/oauth-diagnostics` endpoint and minimal consent/login instrumentation. It records timestamps, step names, presence/length metadata, redirect host/path, query parameter names, status codes, and pending-state facts only. It rejects the canonical Production host and never logs authorization codes, state values, access tokens, refresh tokens, or secrets.
- Instrumented authorize receipt, authorization-id presence, redirect URI metadata, state presence/length, login resume, consent result, and final redirect destination/query names. TRACK120 MCP definitions and canonical alias were not changed.
- Preview deployment READY: `dpl_BYbx85mrHvC99sTbMXjV8FGvwq7K`, URL `https://chamah-manager-portal-v2-preview-mzzy7py1d-chamah.vercel.app`, commit `f77b8d3daefd9185a133ff150d3d458d539395b9`. Validation passed 7/7 focused diagnostic/OAuth tests, build, syntax checks, and diff checks. Production was not modified.

## TRACK121 — Final OAuth callback navigation hardening (2026-11-12)

- Hardened only the post-consent browser navigation. `navigateToOAuthCallback()` now parses the Supabase `redirect_url`, requires HTTPS `chatgpt.com/connector/oauth/*`, requires both `code` and `state` query parameters, records only safe callback metadata, and navigates with `location.replace(finalUrl.href)` so the complete encoded query string is preserved. Invalid/missing callback data is not redirected.
- Added regression assertions for callback host/path, required query parameters, and full-URL navigation. TRACK120 MCP tools, canonical alias, Supabase configuration, and Production were untouched.
- Preview deployment READY: `dpl_Gyhs1yJzgwDVA3LzHAZxdw8c3ZyE`, URL `https://chamah-manager-portal-v2-preview-e5j1ie8hz-chamah.vercel.app`, commit `ef2f5b55a0119fa2db6e5c59dab987faeac779e0`. Focused OAuth/diagnostic tests passed 7/7. Production was not modified.

## TRACK121–122 — Diagnostic cleanup and real-data readiness gate (2026-11-12)

- Removed only the temporary OAuth diagnostics endpoint and browser instrumentation from `api/oauth-diagnostics.js`, `chamah-manager-portal/new/oauth-consent.js`, and `chamah-manager-portal/new/app.js`; removed its temporary regression test. Preserved the validated OAuth login-resume, PKCE/consent, callback host/path, and required `code`/`state` checks.
- Reconciled isolated Preview Supabase `iwsbjudahtjyigecymzd`: migrations are applied through TRACK120 delivery and repair migrations; canonical workforce, payroll, certificates, enrollment, banking, budget, supplier/payment, reconciliation, policy, audit, and ingestion tables are present. Preview contains synthetic acceptance data only.
- Latest verified Preview deployment remains READY as `dpl_Gyhs1yJzgwDVA3LzHAZxdw8c3ZyE`, commit `ef2f5b55a0119fa2db6e5c59dab987faeac779e0`. No deployment or Production resource was modified in this session.
- Added `docs/audits/TRACK122-real-data-readiness.md`. Suppliers/payments and banking/reconciliation are READY for mapped synthetic-to-real dry-run preparation; workforce, payroll history, certificates, budgets/configuration, and policies/documents are PARTIAL; children/enrollment is BLOCKED for person-level semantics; billing/collections is BLOCKED because no canonical domain contract was verified.
- Focused validation passed 19/19 TRACK120/OAuth tests, JavaScript syntax checks, `npm run build`, and `git diff --check`. Full repository Playwright remains blocked by the pre-existing mixed test-runner configuration. Stopped at the Production Readiness Gate; no real data was ingested and no Production change was made.

## TRACK121–122 — Approved child, billing, provenance implementation (2026-11-12)

- Repaired the local Git permission issue by using elevated Git filesystem access; committed the prior cleanup/readiness work as `ceedff0335e73062ca4be32e1b94ff4e8e4f2a2d`.
- Applied Preview-only migration `20261112100000_track122_children_billing_provenance` to isolated Supabase `iwsbjudahtjyigecymzd`. Added minimum person-level `children` and effective-dated `child_enrollments`, monthly `daycare_billing_records`, `collection_receipts`, and versioned `mcp_source_mapping_versions`. All new tables have RLS enabled and no public/authenticated table grants.
- Extended the existing TRACK120 generic entity metadata and operational catalog/report to include the new entities. Existing preview → approval → commit → readback/audit, idempotency, concurrency, and authorization paths remain the only write path.
- Added synthetic contract coverage in `tests/track122-children-billing.test.mjs`. No real organizational data was ingested.
- Validation passed 11/11 focused TRACK120/OAuth/child-billing tests, `node --check api/mcp.js`, build, and diff checks. Preview read-only SQL confirmed all five new tables and both catalog/report RPCs exist.
- The first CLI deploy resolved to the wrong `chamah-portal` project and was canceled while QUEUED with no alias. The local Vercel project link was corrected to `prj_TLJVhQfA8oTkM5MCqfehqmBfVGwy`; isolated Preview deployment `dpl_Em75pXntejRwgpsfYHaMJbdCzMQP` is READY at `https://chamah-manager-portal-v2-preview-egcsxi27c-chamah.vercel.app`, built from commit `c24a6db7586f507069801d04656eac55c50d3f28`. The canonical Preview alias was not moved and Production was not modified.

## Production MCP compatibility repair — 2026-11-12

- Confirmed the MCP transport forwarded Supabase RPC results directly as `structuredContent`; list RPCs could therefore return a top-level array, which ChatGPT rejects. Most exposed tools also had no declared output schema.
- Added a single transport-level compatibility boundary in `api/mcp.js`: every exposed tool advertises an object output schema; object results remain unchanged; arrays become `{items,total}`; null/scalar results become `{value}`. Authorization, RLS, RPC names, write semantics, and business data are unchanged.
- Added `tests/mcp-contract.test.mjs` covering the full discovered tool list's object output contract and array/empty/null/scalar response normalization. Focused MCP/operational/children tests passed 14/14; build, syntax, and diff checks passed. Production deployment and live post-deployment acceptance remain pending.
