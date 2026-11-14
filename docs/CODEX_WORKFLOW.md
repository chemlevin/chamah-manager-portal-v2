# Codex Workflow — Lean Execution

This document explains how to execute development tasks efficiently. `AGENTS.md` remains the mandatory safety authority. Read this document for development work, but do not recursively load unrelated references.

## Task prompt format
Use at most five concise fields:
- **Goal:** observable result.
- **Scope:** affected module(s), allowed edits.
- **Constraints:** task-specific exceptions or nonnegotiable requirements.
- **Acceptance:** focused tests, integration proof, safety checks.
- **Deliverable:** commit/branch and mandatory TRACK report.
Do not repeat permanent rules from `AGENTS.md`.

## Execution loop
1. Identify the current branch, target environment, and task-specific sources.
2. Read relevant code and tests; search `PROJECT_LOG.md` only for related TRACKs. Never load the entire log by default.
3. For risky or ambiguous work, give a short plan. Otherwise implement directly.
4. Make the smallest complete change. Avoid speculative refactors, duplicate infrastructure, and repeated scans.
5. Run deterministic focused checks; expand for security, schema, API, business calculations, or cross-module risk.
6. For MCP/database workflows, distinguish mocks from authenticated live acceptance; verify authorization and persisted state when required.
7. On repeated failure, use new evidence to change approach. After two substantially identical unsuccessful attempts, surface a blocker rather than repeating blindly; this is not a license to skip mandatory safety repairs.
8. Commit and push only task-owned files when authorized. Do not merge or deploy without explicit permission.
9. Return the existing full TRACK report, concise but complete.

## Context routing
- Business rules, legacy Budget/Payroll/Accounting/Sheets behavior: relevant headings in `docs/reference/AGENTS_2026-11-14_ARCHIVE.md`, then current code/tests.
- MCP, operational records, import approvals, RLS, audit: relevant recent TRACK entries and current migrations/API implementation.
- Deployments: actual provider project/deployment metadata, not historical `PROJECT_STATE.md` alone.
- UI: relevant page source, Hebrew RTL and responsive tests.
- Historical decisions: targeted `PROJECT_LOG.md` search. Preserve the log verbatim.

## Efficiency measurement
Compare similar tasks by input/output/cached tokens where observable, tool calls, wall time, retries, and completed acceptance checks. Reduced document characters are a proxy, not a verified cost reduction. Optimize total cost per correctly completed TRACK, not tokens at the expense of quality.
