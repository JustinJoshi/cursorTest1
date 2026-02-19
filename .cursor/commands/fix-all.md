---
name: fix-all
description: Execute all fixes from an audit report sequentially. After each commit, runs Playwright tests automatically. Rolls back that batch if tests fail and continues. Run /fix-plan first, then /generate-tests to have a test suite ready.
---

# Fix All — Sequential Execution with Playwright Verification

You are a careful engineer executing a pre-planned audit fix sequence. After every commit, you run the Playwright test suite. If tests pass, move to the next batch. If tests fail, attempt one auto-fix, then roll back that batch if still failing — and continue with the rest.

---

## Prerequisites

Before starting, verify all of these:

```bash
# 1. Clean working tree
git status

# 2. Playwright is installed and tests exist
ls e2e/
npx playwright test --list

# 3. Test user credentials are set
cat .env.test
```

If any check fails, stop and tell the user what's needed:
- No e2e/ directory → run `/generate-tests` first
- No .env.test → create test user in Clerk and add credentials
- Dirty working tree → ask user to commit or stash first

---

## Execution Process

### Phase 0 — Baseline check

Run the full test suite once before touching any code:

```bash
npx playwright test 2>&1
```

If baseline tests are already failing, stop:
```
⚠️ Baseline tests failing before any fixes applied.
Fix these first — otherwise test results during fix-all will be unreliable.
Failing: [list them]
```

If baseline passes, note the pass count and continue.

### Phase 1 — Create fix branch

```bash
git checkout -b audit-fixes/$(date +%Y-%m-%d)
```

### Phase 2 — Create shared files first

If the fix plan identified new shared files (utilities, hooks, types), create and commit them first, then run tests to confirm nothing broke.

### Phase 3 — Execute batches with test verification

For each batch, repeat this loop:

**Step 1 — Apply the fix**
Read the current file, apply all findings in the batch simultaneously, output the complete updated file.

**Step 2 — Commit**
```bash
git add [filepath]
git commit -m "fix([scope]): [finding IDs] — [brief description]

Fixes:
- [FINDING-ID]: [one line]

Audit: audit-reports/AUDIT-[date].md"
```

**Step 3 — Run tests**
```bash
npx playwright test 2>&1
```

**Step 4 — Evaluate**

If tests pass:
```
✅ Batch [N/total] — [filename] ([finding IDs]) — [X] tests passing
```
Move immediately to next batch.

If tests fail → go to **Auto-Fix Loop**.

---

## Auto-Fix Loop

### Attempt 1 — Diagnose and fix

Read the Playwright error output. Read the failing test. Read the file you changed.

Determine the cause:

**Code regression** (fix broke something unintentionally):
Fix the regression, amend the commit, re-run tests. If passing → continue.

**Intentional behavior change** (fix correctly changed how something works, test needs updating):
Update the test to match the new correct behavior, commit the test change separately, re-run tests. If passing → continue.

### Attempt 2 — If still failing

Roll back the fix commit:
```bash
git revert HEAD --no-edit
```

Output:
```
⚠️ Auto-fix failed. Rolled back batch [N]: [filename] ([finding IDs])

What broke: [brief description]
Why auto-fix didn't work: [reason]

This finding needs manual attention:
[paste original finding from audit report]

Continuing with remaining batches...
```

Log it as skipped and move to the next batch. Never stop the entire run for one failure.

---

## Phase 4 — Final summary

```
═══════════════════════════════════════════
Fix run complete — audit-fixes/[date]

Applied:  [N] batches ([N] files)
Skipped:  [N] batches (rolled back)
Tests:    [N] passing

Skipped findings (need manual fixes):
  - [FINDING-ID] in [file]: [why]

To review all changes:   git diff main...HEAD
To open test report:     npx playwright show-report
To merge:                git checkout main && git merge audit-fixes/[date]
To roll back everything: git checkout main && git branch -D audit-fixes/[date]
═══════════════════════════════════════════
```

---

## Rules

- Run tests after every single commit — no exceptions
- Never stop the whole run for one batch failure — roll back that batch and continue
- One auto-fix attempt only per batch
- Never update test assertions just to force a pass — only update tests when behavior intentionally changed
- Run only the affected spec file when debugging a single failure (faster):
  ```bash
  npx playwright test e2e/security.spec.ts 2>&1
  ```

## Recommended Model
⚡ **Sonnet** for most batches
🧠 **Opus** for PE-H1 (race condition) and PE-M4 (cascade delete) specifically
