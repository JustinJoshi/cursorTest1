---
name: audit-all
description: Run all 5 audit roles against the current file or entire project and produce a consolidated markdown report.
---

# Full Audit — All 5 Roles

You are orchestrating 5 specialized audit perspectives simultaneously. Run each of the following against the current file (or full project if no file is specified), then produce a **consolidated report**.

## The 5 Audit Roles

Work through each role in sequence:

### 1. Principal Engineer
Architecture, code quality, React/Next.js patterns, tech debt. Check for God components, floating promises, incorrect hook dependencies, Server vs Client component misuse, magic numbers, dead code.

### 2. Security Auditor
OWASP Top 10. Check for injection risks, hardcoded secrets, broken access control, insecure session handling, missing input validation, XSS vectors, exposed stack traces.

### 3. DevOps Engineer
Operational readiness. Check for missing error handling on external calls, no timeouts, unstructured logging, missing env var validation, no health check, database connection anti-patterns.

### 4. Accessibility Auditor
WCAG 2.1 AA. Check for missing alt text, non-semantic interactive elements, missing ARIA labels, broken keyboard navigation, missing focus management, color-only state indicators.

### 5. Patterns Auditor
DRY violations and abstraction opportunities. Check for duplicated logic, extractable custom hooks, repeated fetch patterns, scattered constants, reusable component opportunities.

---

## Output

### In Chat — Executive Summary
Print a summary table immediately in chat:

```
## 🔍 Audit Summary — [filename or "Full Project"] — [timestamp]

| Role | 🔴 High | 🟡 Medium | 🔵 Low | Status |
|------|---------|-----------|--------|--------|
| Principal Engineer | 0 | 2 | 1 | ⚠️ |
| Security | 1 | 0 | 1 | 🚨 |
| DevOps | 0 | 1 | 2 | ⚠️ |
| Accessibility | 2 | 1 | 0 | 🚨 |
| Patterns | 0 | 3 | 4 | ⚠️ |

**Top 3 Action Items:**
1. 🔴 [SECURITY] SQL injection risk in /api/users.ts line 34
2. 🔴 [A11Y] Modal missing focus trap in components/Modal.tsx
3. 🟡 [PRINCIPAL] God component in pages/dashboard.tsx (420 lines)
```

### In File — Inline Comments
Add inline comments to the audited file(s) using the standard format for each role.

### Markdown Report
Save full findings to `audit-reports/AUDIT-[YYYY-MM-DD-HHmm].md`:

```markdown
# 🔍 Full Audit Report
**Date:** [timestamp]
**File(s):** [audited scope]
**Model:** [model used]

---

## Executive Summary
[summary table]

---

## 🏗️ Principal Engineer Findings
### 🔴 High
...
### 🟡 Medium
...

## 🔒 Security Findings
...

## ⚙️ DevOps Findings
...

## ♿ Accessibility Findings
...

## 🔄 Patterns & DRY Findings
...

---

## Recommended Action Order
1. [item]
2. [item]
...

## Files Requiring Immediate Attention
- `path/to/file.ts` — [roles with issues]: [brief description]
```

## Behavior Rules
- Create `audit-reports/` directory if it doesn't exist
- If auditing a single file, scope all findings to that file
- If no specific file is active, audit the full `src/` directory
- Group findings by file when multiple issues exist in the same file
- A file flagged by multiple roles should appear once with all roles listed

## Recommended Model
🧠 **Claude Opus** — use this for /audit-all for maximum depth across all roles
