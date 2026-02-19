# Cursor Commands Guide

This README documents everything in `.cursor/commands/` and explains how to use each command effectively.

## What these commands are

Files in `.cursor/commands/` are command prompts for Cursor Agent chat.  
When you type a command like `/audit-security`, Cursor loads that command's prompt and instructs the model to run in a specialized role with specific rules and output formats.

### How to invoke a command

- Open Agent chat.
- Type `/command-name` (for example: `/audit-all`).
- If the command expects extra input, include it in the same message (for example: `/audit-a11y-browser http://localhost:3000/dashboard`).

## `.cursor` folder details

- `.cursor/mcp.json`
  - Configures MCP servers.
  - This repo config points to Playwright MCP via:
    - `npx @playwright/mcp@latest`
- `.cursor/commands/`
  - Contains 13 custom command definitions.
- `.cursor/debug-session.json`
  - Created by `/debug-tests` to persist retry state across stops/resumes.

## Intended workflow

Typical end-to-end flow for audit-driven improvements:

```text
/audit-all -> /generate-tests -> /fix-plan -> /fix-all -> /debug-tests
```

Supporting commands:

- Use individual audits (`/audit-security`, `/audit-devops`, etc.) when you only need one perspective.
- Use `/fix` for one finding at a time.
- Use `/fix-rollback` if a fix run causes regressions.

## Command reference

## Audit commands

### `/audit-all`

- **Purpose:** Runs all five audit roles (Principal Engineer, Security, DevOps, Accessibility, Patterns) and consolidates findings.
- **Scope behavior:** Audits the current file if specified; otherwise audits full `src/`.
- **Output:**
  - Chat summary table with severity counts by role.
  - Inline comments in audited files.
  - Markdown report at `audit-reports/AUDIT-[YYYY-MM-DD-HHmm].md`.
- **Model recommendation:** Opus.

### `/audit-principal`

- **Purpose:** Principal Engineer review focused on architecture, code quality, React/Next.js patterns, and tech debt.
- **Key checks:** Responsibility boundaries, hook correctness, server/client component usage, complexity flags, async patterns.
- **Output:** Inline findings and a `PRINCIPAL ENGINEER AUDIT` summary block.
- **Model recommendation:** Opus.

### `/audit-security`

- **Purpose:** Security audit aligned with OWASP Top 10.
- **Key checks:** Access control, cryptographic handling, injection risks, insecure design/misconfig, auth/session handling.
- **Output:** Confirmed security risks only, with OWASP mapping and summary block.
- **Model recommendation:** Opus.

### `/audit-devops`

- **Purpose:** DevOps/platform readiness audit for production reliability.
- **Key checks:** Logging/observability, error handling and timeouts, env/config validation, scalability and deployment hygiene.
- **Output:** Operational risk findings plus `DEVOPS AUDIT` summary block.
- **Model recommendation:** Sonnet.

### `/audit-a11y`

- **Purpose:** WCAG 2.1 AA accessibility audit for React/Next.js code.
- **Key checks:** Semantic HTML, ARIA usage, keyboard accessibility, focus management, form/input assistance, robust state announcements.
- **Output:** Accessibility findings with fix patterns and summary block.
- **Model recommendation:** Sonnet.

### `/audit-a11y-browser`

- **Purpose:** Live accessibility test against a running URL using Playwright MCP and axe-core.
- **Usage examples:**
  - `/audit-a11y-browser http://localhost:3000`
  - `/audit-a11y-browser http://localhost:3000/dashboard`
- **Key checks:** axe-core violations, keyboard tab order, modal focus trapping, skip links, aria-live behavior, desktop/mobile viewport checks.
- **Output:** Chat quick summary + markdown report at `audit-reports/a11y-browser-[timestamp].md`.
- **Model recommendation:** Sonnet.

### `/audit-dry`

- **Purpose:** Finds duplication and abstraction opportunities.
- **Key checks:** DRY violations, extractable hooks/components/utils, repeated constants/routes/types/schemas.
- **Output:** Actionable extraction suggestions and `DRY / PATTERNS AUDIT` summary block.
- **Model recommendation:** Sonnet.

## Fix commands

### `/fix-plan`

- **Purpose:** Turns an audit report into a sequenced execution plan.
- **What it produces:**
  - Batches grouped by file.
  - New shared-file prerequisites.
  - Ordered execution list.
  - Model assignment summary (Sonnet vs Opus).
- **Input:** pasted audit report or latest file in `audit-reports/`.
- **Important behavior:** Planning only; does not execute fixes.

### `/fix`

- **Purpose:** Executes a single pre-diagnosed finding from an audit report.
- **Required input:**
  - Finding text (ID, issue, fix instruction).
  - Relevant current code.
- **Output format:** short fix summary, complete updated file content, change log, verification checklist.
- **Model guidance:** Sonnet for mechanical fixes; Opus for architectural `[PRINCIPAL]` work.

### `/fix-all`

- **Purpose:** Executes all planned fixes sequentially with test gating.
- **Core behavior:**
  - Verifies prerequisites and baseline tests first.
  - Applies and commits each batch.
  - Runs Playwright after every commit.
  - Attempts one auto-fix on failure, then reverts batch if still failing, and continues.
- **Output:** Batch-by-batch status and final run summary.
- **Model guidance:** Sonnet generally; Opus for PE-H1/PE-M4 style architectural fixes.

### `/fix-rollback`

- **Purpose:** Safely recover from regressions after fix execution.
- **Usage patterns:**
  - `/fix-rollback`
  - `/fix-rollback all`
  - `/fix-rollback last`
  - `/fix-rollback SEC-H1`
  - `/fix-rollback convex/email.ts`
- **Rollback options:** Single commit revert, revert last N, destructive reset (local-only), abandon branch, or restore one file.
- **Behavior:** Defaults to least destructive path and confirms state after rollback.

## Test commands

### `/generate-tests`

- **Purpose:** Generates a full Playwright e2e suite for a Next.js app.
- **Discovery process:** Reads route/component/backend structure, current audit report, and existing tests.
- **Workflow:** Produces a test plan first, waits for confirmation, then generates config/setup/specs/checklists/install steps.
- **Expected outputs include:**
  - `playwright.config.ts` setup pattern.
  - Auth bootstrap (`e2e/global.setup.ts`, `.env.test`, helpers).
  - Spec files for auth/teams/documents/security/accessibility.
  - Verification checklist and setup instructions.
- **Model recommendation:** Opus.

### `/debug-tests` (existing documentation)

# Debug Tests Command Guide

This guide explains how to use `/debug-tests` to auto-debug failing Playwright end-to-end tests.

## What it does

`/debug-tests` runs Playwright, reads `test-results.json`, and iteratively fixes failures. Each failure is handled by a fresh worker agent with focused context (error details + relevant code + prior attempt summaries), then tests are re-run until success or stop conditions are reached.

## Command usage

- `/debug-tests`
  - Starts in interactive mode (`-in`) by default.
- `/debug-tests -in`
  - Interactive mode.
  - Pauses after each failed attempt and asks what to do next.
- `/debug-tests -auto`
  - Unattended mode.
  - No pause between attempts.

## Interactive controls

After a failed attempt in interactive mode, you can reply:

- `continue`
  - Run the next attempt and pause again later.
- `auto`
  - Switch to unattended mode for the rest of this session.
- `stop`
  - End immediately and print the final summary.

## Model switching

You can switch models in interactive mode at each pause.

Workflow:

1. Run `/debug-tests` or `/debug-tests -in`
2. Wait for pause prompt
3. Change model in the Cursor model dropdown
4. Reply `continue`

Important:

- Switching to `auto` does **not** change the fresh-context architecture.
- Every failure is still handled by a new worker agent with focused context.
- `auto` only removes pause prompts between attempts.

## Retry and stop behavior

Default retry cap:

- `MAX_RETRIES = 3` (configured inside `.cursor/commands/debug-tests.md`)

The loop stops when any of these is true:

1. All tests pass
2. Retry limit is reached
3. No-progress guard triggers (same failure set repeats)
4. User replies `stop`

## Resume after stop/interruption

Session state is stored in:

- `.cursor/debug-session.json`

This lets you stop and resume without starting from scratch.

Resume behavior:

1. Re-run `/debug-tests`
2. If state exists, choose `resume` or `fresh`
3. On `resume`, it continues from the last completed attempt
4. It re-runs tests first to detect current code state

If interruption happened mid-attempt, only completed attempts are guaranteed in session history; the next run re-validates actual test state before continuing.

## Typical workflow

1. Generate tests:
   - `/generate-tests`
2. Run tests manually (optional first pass):
   - `npx playwright test --headed --project=chromium`
3. Start debug loop:
   - `/debug-tests`
4. Optionally switch model between attempts (interactive mode)
5. Optionally switch to unattended:
   - reply `auto`

## Troubleshooting

- `test-results.json` missing:
  - Run `npx playwright test --project=chromium` once and verify reporter config.
- Stale/bad session state:
  - Choose `fresh` when prompted, or remove `.cursor/debug-session.json`.
- Need detailed visual failure context:
  - Run `npx playwright show-report`.

## Quick reference table

| Command | Category | What it does | Recommended model |
|---|---|---|---|
| `/audit-all` | Audit | Runs all five audit roles and writes consolidated report | Opus |
| `/audit-principal` | Audit | Architecture and code quality audit | Opus |
| `/audit-security` | Audit | OWASP-focused security audit | Opus |
| `/audit-devops` | Audit | Production readiness and operability audit | Sonnet |
| `/audit-a11y` | Audit | WCAG code-level accessibility audit | Sonnet |
| `/audit-a11y-browser` | Audit | Live URL accessibility audit via Playwright + axe-core | Sonnet |
| `/audit-dry` | Audit | DRY/pattern duplication and abstraction audit | Sonnet |
| `/fix-plan` | Fix | Batches and sequences audit findings into execution plan | Sonnet/Opus split |
| `/fix` | Fix | Executes one specific audit finding fix | Sonnet (most), Opus (architectural) |
| `/fix-all` | Fix | Runs all fix batches with Playwright checks and rollback behavior | Sonnet (most), Opus (specific PE fixes) |
| `/fix-rollback` | Fix | Reverts problematic fix commits/files/branches safely | Sonnet |
| `/generate-tests` | Testing | Generates complete Playwright e2e suite and setup | Opus |
| `/debug-tests` | Testing | Iterative Playwright failure debugging with resumable sessions | Sonnet/Opus as needed |

## Practical usage guide

- Use `/audit-all` for periodic full-project quality gates.
- Use a single-role audit command when you only need one perspective quickly.
- Run `/generate-tests` after `/audit-all` so Playwright gates exist before automated bulk fixing.
- Run `/fix-plan` before any bulk remediation.
- Prefer `/fix` for high-risk or architectural findings you want to review manually.
- Use `/fix-all` when you want automated sequential execution with meaningful test safety checks.
- If anything regresses, run `/fix-rollback` first, then re-plan.
- Keep `/generate-tests` and `/debug-tests` in your regular loop so fixes remain verifiable.
