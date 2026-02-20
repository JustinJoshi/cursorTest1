# Principal Engineer Audit — `.cursor/commands/generate-tests.md`

Date: 2026-02-20  
Auditor: Principal Engineer  
Scope: `.cursor/commands/generate-tests.md`

## Findings

### 🔴 High

1) **Security regression workflow is encoded as a normal verification path**
- **Where:** Phase 5 "break it" guidance, especially removing auth checks in `middleware.ts` and `convex/documentVersions.ts`.
- **Risk:** The instructions normalize temporarily disabling security controls in app code as part of routine validation. In real teams this pattern is error-prone and can lead to accidental commit/merge of weakened authorization logic.
- **Why this is high:** It creates a direct path to production-impacting auth regressions through human process error.
- **Recommended fix:** Replace "edit production code to break it" steps with safe alternatives: request mocking, feature flags in test-only branches, or explicit negative tests that assert `401/403` without mutating security-critical source code.

### 🟡 Medium

1) **Generator is over-specialized while presented as generic**
- **Where:** Phase 3 hard-codes Clerk auth flow (`/sign-in`, "Email address", "Password", env var names) and fixed setup assumptions.
- **Risk:** For non-Clerk or customized Clerk UIs, generated tests will fail immediately or require large manual rewrites, reducing trust in generated output.
- **Recommended fix:** Add a provider-detection/config step before generation and produce auth helpers from detected selectors/routes (or prompt for these values explicitly).

2) **Conflicting behavioral requirements can force duplicate or contradictory outputs**
- **Where:** Phase 1 says "Don't duplicate tests that already exist and are comprehensive", while Phase 4 says "Generate all of the following spec files" unconditionally.
- **Risk:** The model is given mutually competing directives; outcomes become nondeterministic (duplicate suites vs skipped required suites), increasing maintenance burden.
- **Recommended fix:** Define precedence explicitly, e.g. "augment existing spec files when present; only create missing files."

3) **Discovery strategy is not scalable and likely to exceed practical context limits**
- **Where:** Phase 1 requires reading every route/component/backend file before planning.
- **Risk:** On medium/large repos, this is expensive and can cause incomplete reasoning, truncated context, and lower-quality test selection.
- **Recommended fix:** Switch to staged discovery: route manifest -> candidate critical flows -> targeted file reads for those flows; add explicit stop conditions.

4) **Tooling commands in prompt are inconsistent with modern constrained-agent environments**
- **Where:** Phase 1/4 examples rely on `find | grep | head | tail`.
- **Risk:** In many automated coding environments, these commands are restricted or discouraged, so the instructions can fail operationally even before test generation starts.
- **Recommended fix:** Provide equivalent resilient alternatives (e.g., `rg --files`, scoped globs) and include fallback command patterns.

## Overall Assessment

The command has strong intent and good structure, but it currently mixes rigid implementation assumptions with risky validation guidance. It should be hardened by removing unsafe "break security code" workflows, reconciling directive conflicts, and introducing scalable discovery/configuration steps.

## Severity Totals

- High: 1
- Medium: 4
- Low: 0
