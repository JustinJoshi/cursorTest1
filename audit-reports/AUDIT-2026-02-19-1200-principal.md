# Principal Engineer Audit — `src/`

**Date:** 2026-02-19 12:00
**Scope:** `src/` (35 files)
**Auditor Role:** Principal Engineer

---

## Summary

| Severity | Count |
|----------|-------|
| High     | 4     |
| Medium   | 8     |
| Low      | 2     |

---

## High Severity Findings

### H1 — God Component: `src/app/teams/[teamId]/page.tsx` (310 lines, 6+ responsibilities)

**Category:** Architecture & Design

This page component owns too many concerns:
1. Route param unwrapping and Convex query orchestration (team + documents)
2. "New Document" dialog state management (5 `useState` hooks for it)
3. File selection handling with ref-based `<input type="file">`
4. Multi-step file upload orchestration (generateUploadUrl → fetch POST → createVersion)
5. Document creation mutation
6. Dialog open/close lifecycle with form reset
7. Full-page rendering including skeleton, header, and document table

The inline file-upload-to-create-document flow (lines 66–118) is a 52-line async function with 3 sequential API calls and nested conditional logic.

**Recommendation:** Extract the "Create Document" dialog (including file upload) into a standalone component (e.g., `<CreateDocumentDialog>`). The upload orchestration logic should be shared with `UploadDialog` via a custom hook like `useFileUpload()`.

---

### H2 — No null/not-found handling for Convex queries

**Category:** Code Quality / Error Handling
**Files affected:**
- `src/app/documents/[documentId]/page.tsx` (line 33)
- `src/app/teams/[teamId]/page.tsx` (line 131)
- `src/app/teams/[teamId]/settings/page.tsx` (line 37)

All data-fetching pages check `=== undefined` to show a loading skeleton, but none handle the case where the query resolves to `null` (entity not found). If a user navigates to a deleted or non-existent document/team, the component attempts to render against null data, causing a runtime crash (TypeError reading properties of null).

**Example pattern (documents page):**
```typescript
if (document === undefined) {
  return <LoadingSkeleton />;
}
// If document is null (not found), code below crashes on document.role, document.name, etc.
```

**Recommendation:** Add explicit null guards that render a "Not Found" state with a back-navigation link. Consider a shared `<NotFound>` component.

---

### H3 — Sonner Toaster depends on `next-themes` ThemeProvider which is not configured

**Category:** React/Next.js Specific
**Files affected:**
- `src/components/ui/sonner.tsx` (line 14: `useTheme()`)
- `src/components/providers.tsx` (no ThemeProvider from `next-themes`)
- `src/app/layout.tsx` (line 30: hardcoded `className="dark"`)

The `Toaster` component calls `useTheme()` from `next-themes`, but the `Providers` component only wraps children in `ClerkProvider` and `ConvexProviderWithClerk` — there is no `ThemeProvider` from `next-themes` in the tree. Without the provider, `useTheme()` returns `undefined` for theme, which defaults to `"system"`. On machines with a light system preference, Sonner renders light-themed toasts against the hardcoded dark background.

**Recommendation:** Either (a) wrap with `next-themes` `ThemeProvider` and use it consistently, or (b) replace the `useTheme()` call in `sonner.tsx` with a hardcoded `"dark"` value to match the app's forced dark mode.

---

### H4 — No error boundaries — unhandled query failures crash the app

**Category:** Architecture & Design / Error Handling
**Files affected:** All `"use client"` page components using `useQuery`

No React error boundary exists anywhere in the component tree. If a Convex query throws (network failure, permission error, backend exception), the error propagates uncaught and takes down the entire application with a white screen. Next.js App Router supports `error.tsx` boundary files, but none are defined.

**Recommendation:** Add `error.tsx` files at the route segment level (at minimum `src/app/error.tsx` as a global fallback). For Convex-specific errors, consider an error boundary wrapper that shows a retry button.

---

## Medium Severity Findings

### M1 — Duplicated file upload orchestration logic

**Category:** Tech Debt / Architecture
**Files affected:**
- `src/app/teams/[teamId]/page.tsx` (lines 66–118, `handleCreateDocument`)
- `src/components/upload-dialog.tsx` (lines 63–123, `handleUpload`)

Both implement the identical multi-step flow: `generateUploadUrl()` → `fetch(uploadUrl, { method: "POST", body: file })` → `result.json()` → `createVersion()`. Any change to the upload protocol requires updating two locations.

**Recommendation:** Extract into a shared `useFileUpload` hook or utility function.

---

### M2 — Duplicated `formatFileSize` utility

**Category:** Tech Debt
**Files affected:**
- `src/components/document-table.tsx` (lines 64–70)
- `src/components/version-history.tsx` (lines 38–44)

Identical function defined in two files.

**Recommendation:** Move to `src/lib/utils.ts`.

---

### M3 — Repeated unsafe `as Id<>` type casts across route pages

**Category:** Code Quality
**Files affected:**
- `src/app/teams/[teamId]/page.tsx` (~7 occurrences)
- `src/app/teams/[teamId]/settings/page.tsx` (~4 occurrences)
- `src/app/documents/[documentId]/page.tsx` (~3 occurrences)
- `src/components/upload-dialog.tsx` (1 occurrence)

Raw string params are cast with `as Id<"teams">`, `as Id<"documents">`, `as Id<"_storage">` without any runtime validation. A malformed URL parameter silently becomes a wrongly-typed Id, which Convex will reject at query time with an opaque error.

**Recommendation:** Create validated conversion utilities (e.g., `parseTeamId(raw: string): Id<"teams">`) or use Convex's `v.id()` validator pattern to fail fast with clear error messages.

---

### M4 — Native `window.confirm()` used for destructive actions

**Category:** Code Quality / UX
**Files affected:**
- `src/app/teams/[teamId]/settings/page.tsx` (line 69, `handleDeleteTeam`)
- `src/components/document-table.tsx` (line 103, `handleDelete`)

`window.confirm()` renders a browser-native dialog that breaks the dark theme aesthetic, cannot be styled, and provides a jarring UX inconsistency when the rest of the app uses Radix dialogs.

**Recommendation:** Use a styled `<AlertDialog>` from Radix (shadcn/ui already provides one) for destructive confirmations.

---

### M5 — Deprecated Clerk `afterSignOutUrl` prop

**Category:** React/Next.js Specific
**File:** `src/components/navbar.tsx` (line 40)

```tsx
<UserButton afterSignOutUrl="/" />
```

The `afterSignOutUrl` prop was renamed to `afterSignOutRedirectUrl` in Clerk v5+. Using the deprecated prop may cause the redirect to silently fail in future Clerk updates.

**Recommendation:** Replace with `afterSignOutRedirectUrl="/"` or configure globally in `ClerkProvider`.

---

### M6 — All page components are fully client-rendered with no Server Component composition

**Category:** React/Next.js Specific
**Files affected:**
- `src/app/dashboard/page.tsx`
- `src/app/teams/[teamId]/page.tsx`
- `src/app/teams/[teamId]/settings/page.tsx`
- `src/app/documents/[documentId]/page.tsx`

Every page-level route is marked `"use client"` at line 1, forcing the entire page (including static headings, navigation chrome, and layout wrappers) into the client bundle. This increases JS bundle size and eliminates any server-side rendering for the page shell.

**Recommendation:** Use a Server Component page wrapper that renders static elements and passes data-fetching/interactive sections to client child components. This is the standard Next.js App Router composition pattern.

---

### M7 — `NEXT_PUBLIC_CONVEX_URL` used with non-null assertion without runtime validation

**Category:** Node.js / Environment
**File:** `src/components/providers.tsx` (line 11)

```typescript
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
```

The `!` assertion suppresses TypeScript's null check, but if the env var is missing (common in fresh clones or CI), the `ConvexReactClient` receives `undefined`, causing cryptic runtime errors.

**Recommendation:** Add a startup guard:
```typescript
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
const convex = new ConvexReactClient(convexUrl);
```

---

### M8 — `VersionDownloadButton` fires an individual query per version row

**Category:** Architecture / Performance
**File:** `src/components/version-history.tsx` (lines 46–75)

Each `VersionDownloadButton` independently calls `useQuery(api.documentVersions.getDownloadUrl, { storageId })`. For a document with N versions, this fires N parallel reactive queries that each return a short-lived signed URL. These URLs may expire before the user clicks download, and the queries re-fire on every React re-render cycle.

**Recommendation:** Fetch the download URL on-demand when the user clicks the Download button (via a mutation/action), rather than eagerly for every row. This reduces query load and avoids expired-URL issues.

---

## Low Severity Findings

### L1 — Duplicated `Role` type definition

**Files affected:**
- `src/components/document-table.tsx` (line 40)
- `src/components/member-manager.tsx` (line 34)

Both define `type Role = "admin" | "editor" | "viewer"` independently. Should be a shared type in a types file.

---

### L2 — CSS `:root` and `.dark` variable blocks are identical

**File:** `src/app/globals.css`

The `:root` block (lines 49–83) and `.dark` block (lines 85–117) contain identical CSS custom property values. Since the app hardcodes `className="dark"` on `<html>`, the `.dark` block is the only one that applies, and the `:root` duplication is confusing dead weight.

---

## Clean Files

The following files had no issues found:

- `src/app/page.tsx` — clean landing page, proper Server Component
- `src/app/sign-in/[[...sign-in]]/page.tsx` — minimal Clerk wrapper
- `src/app/sign-up/[[...sign-up]]/page.tsx` — minimal Clerk wrapper
- `src/app/teams/new/page.tsx` — clean form with proper error handling
- `src/app/layout.tsx` — proper root layout structure
- `src/components/role-badge.tsx` — clean, single-responsibility
- `src/components/team-card.tsx` — clean presentational component
- `src/lib/utils.ts` — standard shadcn/ui utility
- `src/middleware.ts` — correct Clerk middleware configuration
- All `src/components/ui/*` — standard shadcn/ui primitives (not audited for custom changes)
