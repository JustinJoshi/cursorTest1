# Consolidated Audit Report

**Date:** 2026-02-19T12:00  
**Scope:** `src/` (35 files) + project root config + `convex/` backend  
**Roles:** Principal Engineer, Security Auditor, DevOps Engineer, Accessibility Auditor, Patterns Auditor

---

## Executive Summary

| Role | High | Medium | Low | Status |
|------|------|--------|-----|--------|
| Principal Engineer | 4 | 8 | 2 | critical |
| Security Auditor | 1 | 5 | 3 | critical |
| DevOps Engineer | 5 | 6 | 5 | critical |
| Accessibility Auditor | 5 | 4 | 4 | critical |
| Patterns Auditor | 4 | 7 | 5 | critical |
| **Totals** | **19** | **30** | **19** | **critical** |

---

## Top 5 Action Items

1. **Fix unauthenticated file download endpoint** (Security SEC-01, HIGH) — `convex/documentVersions.ts:getDownloadUrl` has zero auth checks. Any caller can retrieve download URLs for any file. Add authentication and team membership verification.

2. **Add React error boundaries** (Principal H4, HIGH) — No `error.tsx` files exist anywhere in the app. Any uncaught Convex query error crashes the entire application with a white screen. Add at minimum `src/app/error.tsx` as a global fallback.

3. **Add `aria-label` to all 9 icon-only buttons** (A11y HIGH-01) — Nine `<Button size="icon">` instances render SVGs with `aria-hidden="true"` inside buttons with no accessible name. Screen readers announce them as unlabelled buttons.

4. **Extract duplicated file upload logic into a shared hook** (Principal M1, Patterns H2) — The identical multi-step upload flow (`generateUploadUrl` → `fetch POST` → `createVersion`) is implemented in both `teams/[teamId]/page.tsx` and `upload-dialog.tsx`. Create `useFileUpload()`.

5. **Configure security headers in `next.config.ts`** (Security SEC-06, DevOps MEDIUM) — No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy headers are set. Add a `headers()` function to `next.config.ts`.

---

## Per-Role Findings

### Principal Engineer

**Report:** `audit-reports/AUDIT-2026-02-19-1200-principal.md`

| ID | Severity | Finding |
|----|----------|---------|
| H1 | HIGH | God component: `teams/[teamId]/page.tsx` (310 lines, 6+ responsibilities) |
| H2 | HIGH | No null/not-found handling for Convex queries across 3 pages |
| H3 | HIGH | Sonner Toaster depends on `next-themes` ThemeProvider which is not configured |
| H4 | HIGH | No error boundaries — unhandled query failures crash the app |
| M1 | MEDIUM | Duplicated file upload orchestration logic (2 files) |
| M2 | MEDIUM | Duplicated `formatFileSize` utility (2 files) |
| M3 | MEDIUM | Repeated unsafe `as Id<>` type casts (15+ occurrences) |
| M4 | MEDIUM | Native `window.confirm()` used for destructive actions |
| M5 | MEDIUM | Deprecated Clerk `afterSignOutUrl` prop |
| M6 | MEDIUM | All page components are fully client-rendered with no Server Component composition |
| M7 | MEDIUM | `NEXT_PUBLIC_CONVEX_URL` used with non-null assertion without runtime validation |
| M8 | MEDIUM | `VersionDownloadButton` fires N parallel queries (1 per version row) |
| L1 | LOW | Duplicated `Role` type definition (2 files) |
| L2 | LOW | CSS `:root` and `.dark` variable blocks are identical |

### Security Auditor

**Report:** `audit-reports/AUDIT-2026-02-19-1200-security.md`

| ID | Severity | Finding |
|----|----------|---------|
| SEC-01 | HIGH | File download endpoint has no authentication or authorization |
| SEC-02 | MEDIUM | Upload URL generation lacks team/document authorization |
| SEC-03 | MEDIUM | HTML injection in invite email template |
| SEC-04 | MEDIUM | No server-side file upload validation (type, size, content) |
| SEC-05 | MEDIUM | Error messages leak internal authorization details |
| SEC-06 | MEDIUM | Missing HTTP security headers |
| SEC-07 | LOW | No rate limiting on Convex mutations |
| SEC-08 | LOW | Irreversible destructive actions with no audit trail |
| SEC-09 | LOW | Unsafe type casting of URL parameters |

### DevOps Engineer

**Report:** `audit-reports/AUDIT-2026-02-19-1200-devops.md`

| ID | Severity | Finding |
|----|----------|---------|
| DO-01 | HIGH | Resend email API call has no timeout or retry |
| DO-02 | HIGH | File upload fetch has no timeout |
| DO-03 | HIGH | `deleteTeam` performs unbounded cascading work in a single mutation |
| DO-04 | HIGH | No env var validation at startup |
| DO-05 | HIGH | No health check endpoint |
| DO-06 | MEDIUM | Unstructured logging throughout codebase |
| DO-07 | MEDIUM | PII (email address) logged to console |
| DO-08 | MEDIUM | No pagination on any list query |
| DO-09 | MEDIUM | N+1 query pattern in multiple list handlers |
| DO-10 | MEDIUM | No rate limiting on public-facing mutations |
| DO-11 | MEDIUM | Empty `next.config.ts` — no security headers |
| DO-12 | LOW | No Dockerfile or docker-compose |
| DO-13 | LOW | No graceful SIGTERM handling |
| DO-14 | LOW | No image domain allowlist in next.config.ts |
| DO-15 | LOW | Landing page could benefit from static generation |
| DO-16 | LOW | No critical business event logging |

### Accessibility Auditor

**Report:** `audit-reports/AUDIT-2026-02-19-1200-a11y.md`

| ID | Severity | Finding |
|----|----------|---------|
| A11Y-01 | HIGH | 9 icon-only buttons missing `aria-label` |
| A11Y-02 | HIGH | Rename dialog input has no associated label |
| A11Y-03 | HIGH | Hidden file inputs have no accessible label |
| A11Y-04 | HIGH | No skip navigation link |
| A11Y-05 | HIGH | Sub-pages lack unique `<title>` via metadata |
| A11Y-06 | MEDIUM | Potential contrast issue (`muted-foreground` on `muted`) |
| A11Y-07 | MEDIUM | Required form fields not marked as required |
| A11Y-08 | MEDIUM | Loading/skeleton states not announced to screen readers |
| A11Y-09 | MEDIUM | 3 dialogs missing `DialogDescription` |
| A11Y-10 | LOW | Heading hierarchy skip on landing page |
| A11Y-11 | LOW | `AvatarImage` receives potentially undefined `alt` |
| A11Y-12 | LOW | Empty table header cells lack screen reader context |
| A11Y-13 | LOW | No `<footer>` landmark region |

### Patterns Auditor

**Report:** `audit-reports/AUDIT-2026-02-19-1200-patterns.md`

| ID | Severity | Finding |
|----|----------|---------|
| DRY-01 | HIGH | `formatFileSize` duplicated identically in 2 files |
| DRY-02 | HIGH | File upload flow duplicated between TeamPage and UploadDialog |
| DRY-03 | HIGH | File picker UI duplicated between TeamPage and UploadDialog |
| DRY-04 | HIGH | CSS `:root` and `.dark` blocks 100% identical |
| DRY-05 | MEDIUM | `Role` type defined independently in 4+ locations |
| DRY-06 | MEDIUM | `canEdit` role-check pattern repeated in 3 files |
| DRY-07 | MEDIUM | Error toast pattern repeated 9+ times |
| DRY-08 | MEDIUM | Skeleton loading placeholder pattern repeated in 5 files |
| DRY-09 | MEDIUM | Avatar initials computation duplicated in 2 files |
| DRY-10 | MEDIUM | Inline `toLocaleDateString()` scattered across 5+ files |
| DRY-11 | MEDIUM | Form submission loading state pattern repeated in 4 files |
| DRY-12 | LOW | Empty state component pattern repeated 3 times |
| DRY-13 | LOW | Back navigation button repeated in 3 page headers |
| DRY-14 | LOW | Route strings hardcoded across many files |
| DRY-15 | LOW | Page container layout pattern repeated on every page |
| DRY-16 | LOW | Convex ID type assertions scattered across route pages |

---

## Files Needing Immediate Attention

| File | Flagged By | Finding Count |
|------|-----------|---------------|
| `src/app/teams/[teamId]/page.tsx` | Principal, Security, A11y, Patterns | 12 |
| `src/components/upload-dialog.tsx` | Principal, Security, DevOps, Patterns | 6 |
| `src/components/document-table.tsx` | Principal, A11y, Patterns | 6 |
| `src/components/member-manager.tsx` | Security, A11y, Patterns | 6 |
| `src/app/teams/[teamId]/settings/page.tsx` | Principal, Security, A11y | 5 |
| `src/app/documents/[documentId]/page.tsx` | Principal, Security, A11y, Patterns | 5 |
| `src/components/version-history.tsx` | Principal, Patterns | 5 |
| `convex/documentVersions.ts` | Security | 2 |
| `convex/email.ts` | Security, DevOps | 2 |
| `convex/teams.ts` | DevOps | 1 |
| `src/app/layout.tsx` | A11y | 2 |
| `src/components/ui/sonner.tsx` | Principal | 1 |
| `src/components/providers.tsx` | Principal, DevOps | 2 |
| `src/app/globals.css` | Principal, Patterns | 2 |
| `next.config.ts` | Security, DevOps | 2 |

---

## Model Tiers Used

| Role | Model Tier |
|------|-----------|
| Principal Engineer | default |
| Security Auditor | default |
| DevOps Engineer | default |
| Accessibility Auditor | default |
| Patterns Auditor | default |

---

## Worker Execution Summary

- **Batch 1** (concurrent): Principal Engineer, Security Auditor, DevOps Engineer, Accessibility Auditor — 4 workers
- **Batch 2** (concurrent): Patterns Auditor — 1 worker
- **Total workers:** 5
- **Concurrency cap:** 4 (enforced — 2 batches required)
