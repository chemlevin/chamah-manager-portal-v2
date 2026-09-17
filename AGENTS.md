# Chamah Portal Agent Rules

## Context workflow

Every TRACK starts with the smallest relevant context:

1. Read this file completely.
2. Read `PROJECT_STATE.md` for current branch, deployment, migration, version, and blocker state.
3. Read only the task-specific source, tests, and directly relevant documentation.
4. Expand scope only when a concrete dependency requires it.

Do not perform repository-wide audits or searches by default. Do not reread or
re-audit completed TRACKs unless the current task specifically depends on them.
Use `PROJECT_LOG.md` only when historical information is specifically needed.
Do not repeatedly load large documentation when the required rule or state is
already known from its authoritative source.

Document ownership:

- `AGENTS.md`: permanent operating, safety, deployment, and reporting rules.
- `docs/business-rules.md`: canonical business rules. Existing documented
  business rules are authoritative unless the user explicitly changes them.
- `PROJECT_STATE.md`: concise current operational state.
- `PROJECT_LOG.md`: append-only detailed historical record.
- Implementation: source of truth when stale descriptive documentation conflicts
  with current behavior; preserve the conflict or update its authoritative owner.

After a completed TRACK, update `PROJECT_STATE.md` only when current state
materially changed. Put detailed implementation history in `PROJECT_LOG.md` when
the change affects the application, database, infrastructure, or business
behavior. Never rewrite historical log entries.

## Engineering workflow

Before changing anything:

- Inspect the affected implementation and tests.
- Preserve existing business rules, calculations, APIs, Google Sheets structure,
  schema, RLS, and architecture unless the TRACK explicitly requires a change.
- Preserve backward compatibility unless the TRACK explicitly approves a break.
- Prefer small root-cause changes, existing helpers, and existing modules over
  rewrites or duplicate logic.
- Keep engine code deterministic and API transport/authentication separate from
  calculation logic.
- Treat Google Sheets and the canonical database as data sources; never hardcode
  live business entities or sheet values as logic.
- Preserve Hebrew RTL, responsive behavior, and existing Hebrew UI text unless
  the task explicitly changes them.
- Keep mirrored static source under root module paths and
  `chamah-manager-portal/` synchronized when both exist. Never edit generated
  `dist/` directly.
- Do not modify package or lock files unless dependency changes are explicitly
  required.
- Explain unavoidable tradeoffs and implement only the requested scope.

The project is a Hebrew RTL management portal. Static browser code is built from
`chamah-manager-portal/` into `dist/`; Vercel Node handlers live in `api/`;
Supabase migrations and Edge Functions live in `supabase/`; tests use Playwright.
Consult task-specific architecture documentation under `docs/` only as needed.

## Validation

Use the smallest reliable checks plus broader regression coverage when risk
warrants it. Common checks are:

- `node --check <file>` for changed JavaScript.
- `npm run build` after frontend or build-source changes.
- Focused Playwright or engine tests for affected behavior.
- `npx playwright test` for broad UI/engine regression when warranted.
- `git diff --check` before completion.

Never fake validation or claim a test ran when it did not. Report tests not run
and why. Documentation-only work normally requires document scope/diff checks,
not application build or Playwright.

## Safety and deployment

- The linked Supabase project is the canonical backend and is treated as the
  Preview backend unless an isolated environment is explicitly requested.
- Approved TRACKs may apply forward-only migrations and deploy matching Edge
  Functions to the linked project.
- Never leave a shared environment partially deployed. Dependent migrations and
  Edge Functions must be deployed together before completion.
- Deploy to Preview first unless Production deployment is explicitly approved.
- Frontend Production deployment requires explicit approval.
- The only canonical Production URL is `https://chamah-portal.vercel.app`.
- Every Production deployment must verify the serving deployment ID, serving Git
  SHA, canonical alias, and inclusion of the approved commit.
- Do not report completion or a Preview URL for code that exists only locally.
- Every completed implementation TRACK must be committed and pushed to its
  remote branch before completion is reported.
- Preserve Production data. Do not create, edit, import, or delete real records
  unless the TRACK explicitly authorizes it; clean up disposable validation data.

## Business-rule boundary

`docs/business-rules.md` is the canonical rule catalog. In particular, do not
change Budget Engine behavior, calculations, API contracts, Google Sheets
structure, accounting classification, payroll semantics, or occupancy/staffing
rules unless the TRACK explicitly requests that rule change. When a rule must
change, update the canonical rule document and its tests in the same TRACK.

## Prompt and documentation standards

- Keep implementation prompts short and operational: objectives, requirements,
  acceptance criteria, and deliverables only.
- Separate facts from inferences and state confidence for material inferences.
- Do not fabricate missing project knowledge.
- Preserve durable decisions and document unresolved conflicts instead of
  silently choosing one.
- `README.md` may be stale; prefer current implementation and authoritative docs.

## Standard TRACK rules

Every TRACK must:

1. Follow the context workflow above.
2. Implement only the requested scope.
3. Run proportionate validation.
4. Update `PROJECT_LOG.md` when the application, database, infrastructure, or
   business behavior changes. Documentation-only work is exempt.
5. Update `PROJECT_STATE.md` only when current state materially changes.
6. Push completed implementation work to its remote branch.
7. End with the Standard Completion Report below.

## Standard Completion Report (Mandatory)

Every completed TRACK must end with this exact report structure:

```text
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
```

Rules:

- Include every section; use `None` when not applicable.
- Include the TRACK number, or `TRACK: INTERNAL` when unnumbered.
- Always report the exact commit SHA and whether Preview or Production changed.
- Documentation-only reports must explicitly say the task was documentation-only.
- Do not report completion until all required work and deployment consistency
  checks are complete.
