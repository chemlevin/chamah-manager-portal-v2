# Foundation Worktree Cleanup — Verification Only

Date: 2026-11-20
Track: FOUNDATION-RECOVERY
Sub-gate: WORKTREE CLEANUP — VERIFICATION ONLY
Audit HEAD: `aa627978844596b5cc0dfa4c10e407a3c5f17b39`
Branch: `codex/oauth-canonical-host`

## Verification result

No existing item was deleted, moved, quarantined, reset, overwritten, or modified. The current worktree remains dirty because audit materials and pre-existing items remain uncommitted. Six registered auxiliary worktrees contain uncommitted changes; all were preserved.

## Worktree findings

- 20 registered worktrees were re-inspected.
- Current worktree: 27 porcelain paths; HEAD `aa62797`.
- Dirty auxiliary worktrees: `.preview-track025d-clean/` (`.gitignore`), `.tama-parser-integration/` (generated catalog), `.track021c-bank-fix/` (generated catalog and package lock), `.track030b-release/` (`.gitignore`), `.track030c-clean/` (generated catalog), and `.track136-main-verify/` (generated catalog and package lock).
- Clean auxiliary worktrees include `.preview-track010-clean/`, `.track-permission-catalog/`, `.track009b/`, `.track010a/`, `.track020-production/`, `.track020b/`, `.track030b-prod/`, `.track034/`, `.track053-node24/`, `.track136-merge/`, `.track136-release/`, and the three external worktrees.
- Branch reachability checks found worktree HEADs reachable from local/remote refs or detached. Several commits are shared by multiple branches, but no worktree was proven disposable.
- Worktrees contain differing source, migration, and documentation counts; dirty files and business/release names require preservation.

## Candidate list

### SAFE TO REMOVE

None. No exact path met the proof standard without owner approval.

### SAFE TO QUARANTINE

None. `tmp/` contains campaign, package, fixture, SQL, spreadsheet, ZIP, and MCP-related material. Historical worktrees are registered Git worktrees with feature, migration, and document history.

### MUST PRESERVE

- `supabase/migrations/20261116180000_track131_payroll_mcp_contract_fix.sql` — database migration.
- `documents/tama-2026/` — business-domain documents.
- `.tama-parser-integration/`, `.track-permission-catalog/`, `.track009b/`, `.track010a/`, `.track020-production/`, `.track020b/`, `.track021c-bank-fix/`, `.track030b-prod/`, `.track030b-release/`, `.track030c-clean/`, `.track034/`, `.track053-node24/` — registered feature/release worktrees.
- `.track136-main-verify/`, `.track136-merge/`, `.track136-release/` — Foundation verification/release worktrees.
- `baseline-foundation-recovery-gate0-2026-11-20.json` — Gate 0 evidence.
- `docs/manual/`, `docs/portal-ux.md` — documentation.
- `.preview-track010-clean/`, `.preview-track025d-clean/` — historical preview worktrees pending owner confirmation.

### UNKNOWN — no action permitted

- `.gitignore` — tracked `.vercel` ignore change not in the Gate 2 commit.
- `deno.lock` — dependency lockfile with no verified owner/track.
- `tmp/` — mixed operational, package, fixture, spreadsheet, ZIP, and SQL contents.
- Ignored `.vercel/`, `dist/`, `node_modules/`, `playwright-report/`, `test-results/`, `.tmp/`, screenshots, and Supabase temp state.
- Any nested item not separately attributed in the inventory.

## Validation

- `git status --short`, `git worktree list --porcelain`, branch/reachability checks, and `git diff --check` completed.
- Inventory JSON parse passed.
- No application source was changed; no additional application test run was necessary for this documentation-only audit.
- Database changes: None. Business data changed: No. Deployments: None.

## Audit commit

Only this report and `foundation-worktree-inventory-2026-11-20.json` are to be committed. All other dirty/untracked items remain outside the commit.

## Next decision

A separate removal approval is justified only after explicit owner review. Candidate paths for later consideration are `.preview-track010-clean/`, `.preview-track025d-clean/`, and individually approved disposable contents inside `tmp/`. No removal is approved now.
