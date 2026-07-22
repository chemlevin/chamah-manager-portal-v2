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
