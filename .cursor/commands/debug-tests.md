---
name: debug-tests
description: Auto-debug failing Playwright tests using fresh sub-agents. Supports -auto (unattended) and -in (interactive pauses). Persists session state so you can stop, switch model, and resume.
---

# Debug Playwright Failures

Run a retry loop that fixes failing Playwright tests with fresh context on each attempt.

## Invocation

- `/debug-tests` -> defaults to interactive mode (`-in`)
- `/debug-tests -in` -> interactive mode (pause between attempts)
- `/debug-tests -auto` -> unattended mode (no pauses)

## Core behavior

Use an orchestrator/worker pattern:

1. **Orchestrator (main agent):**
   - Runs Playwright
   - Reads `test-results.json`
   - Tracks attempts and failure history
   - Writes/reads `.cursor/debug-session.json`
   - Spawns fresh workers for each failure

2. **Worker (fresh sub-agent per failure):**
   - Gets focused context only:
     - failing test title + file
     - error message + stack + snippet
     - relevant test/app code paths
     - previous attempts summary
   - Diagnoses and applies one concrete fix
   - Returns a short change summary

Always spawn a **new worker with clean context** for each failure. Do not reuse a previous worker's full context.

## Configuration

At the start of execution, set:

- `MAX_RETRIES = 3` (editable default)
- `MODE = auto | interactive` based on invocation flag
- `STATE_FILE = .cursor/debug-session.json`

## Phase 0 - Session bootstrap

1. Check whether `STATE_FILE` exists.
2. If it exists, ask the user:
   - `resume` -> continue from the last completed attempt
   - `fresh` -> delete `STATE_FILE` and start from attempt 1
3. If it does not exist, start from attempt 1.

## Phase 1 - Run tests + parse failures

1. Run:
   ```bash
   npx playwright test --project=chromium 2>&1
   ```
2. Read `test-results.json`.
3. Extract failed/timedOut results by walking `suites[].specs[].tests[].results[]`.
4. For each failing result, collect:
   - suite/spec title
   - spec file path and line when available
   - status + duration
   - `error.message`, `error.stack`, `error.snippet`
   - attachment paths (screenshot/video/trace/error-context)
5. If no failures:
   - Report success
   - Delete `STATE_FILE` if present
   - Stop

## Phase 2 - Fix loop with fresh workers

For each current failure:

1. Build a worker handoff that includes:
   - failure details from Phase 1
   - relevant file paths
   - prior attempt history for this test (if any)
2. Spawn a fresh worker sub-agent (Task tool) with that handoff.
3. Worker reads needed files, applies fix, returns:
   - changed files
   - root cause
   - brief explanation
4. Orchestrator stores that summary in session history.

Parallelize workers only for clearly independent failures. Keep sequential handling for coupled/serial flows.

## Phase 3 - Re-run + mode control

1. Re-run:
   ```bash
   npx playwright test --project=chromium 2>&1
   ```
2. Increment attempt counter.
3. Update `STATE_FILE` with:
   - `maxRetries`
   - `lastCompletedAttempt`
   - per-attempt failures
   - per-attempt fix summaries
   - remaining failures
4. Re-read `test-results.json` and compare with previous attempt.

### Stop conditions

Stop when any condition is true:

1. All tests pass
2. `attempt >= MAX_RETRIES`
3. Same failure set repeats with no progress across consecutive attempts

### Interactive mode prompt

In `-in` mode, after each failed attempt, pause and prompt:

- `continue` -> run next attempt in interactive mode
- `auto` -> switch to unattended mode for remaining attempts
- `stop` -> end now and print final summary

When prompting, remind user:
`To switch models: change the model in the Cursor dropdown, then reply continue.`

If user replies `auto`, switch mode for the rest of the current session and stop prompting between attempts.

## Phase 4 - Final report

Print:

- attempts used / max retries
- what was fixed (per test + per attempt)
- remaining failures with current error summary
- recommended next steps
- whether session ended by pass, max retries, no-progress guard, or user stop

Then delete `STATE_FILE` if the session is complete.

## Important constraints

- Do not call external LLM APIs.
- Do not create custom Node helper scripts for parsing failures.
- Use Playwright's existing JSON output (`test-results.json`).
- Preserve fresh worker context on every retry.
- If interrupted mid-attempt, resume from `lastCompletedAttempt` and re-run tests to detect current code state before continuing.
