# Patterns & Abstraction Audit Report

**Scope:** `src/` (35 files)
**Auditor Role:** Patterns & Abstraction Auditor (DRY)
**Timestamp:** 2026-02-19T12:00:00Z

---

## High Severity Findings

### H1 — `formatFileSize` function duplicated identically in two files

**Files:**
- `src/components/document-table.tsx` (lines 64–70)
- `src/components/version-history.tsx` (lines 38–44)

Both files define the exact same function:

```
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
```

**Suggested extraction:** `src/lib/format.ts` → `export function formatFileSize(bytes: number): string`

---

### H2 — File upload flow duplicated between TeamPage and UploadDialog

**Files:**
- `src/app/teams/[teamId]/page.tsx` (lines 66–118)
- `src/components/upload-dialog.tsx` (lines 63–123)

Both implement the identical multi-step upload sequence:
1. `generateUploadUrl()` → 2. `fetch(uploadUrl, { method: "POST", ... })` → 3. Extract `storageId` from response → 4. `createVersion({ documentId, storageId, fileName, fileType, fileSize, comment })`

The TeamPage already imports `UploadDialog` for the document detail view, but re-implements the logic inline for its "Create New Document" dialog instead of reusing or extending `UploadDialog`.

**Suggested extraction:** Refactor `TeamPage` to use `UploadDialog` (or extract a shared `useFileUpload` hook) to eliminate the duplicated upload logic. A hook signature:

```
hooks/useFileUpload.ts → export function useFileUpload()
  returns { upload(file, opts), isUploading, error }
```

---

### H3 — File picker UI duplicated between TeamPage and UploadDialog

**Files:**
- `src/app/teams/[teamId]/page.tsx` (lines 197–245)
- `src/components/upload-dialog.tsx` (lines 146–189)

Both render nearly identical JSX: a hidden `<input type="file">`, a dashed dropzone button, and a selected-file card with filename, size in KB, and a remove button. Minor differences: padding (`p-6` vs `p-8`) and copy text.

**Suggested extraction:** `src/components/file-picker.tsx` → `<FilePicker file={file} onFileSelect={fn} onClear={fn} disabled={bool} />`

---

### H4 — CSS `:root` and `.dark` theme variables are 100% identical

**File:** `src/app/globals.css` (lines 49–83 vs 85–117)

Every CSS custom property under `:root` is byte-for-byte identical to the `.dark` block. Since the app hardcodes `<html className="dark">` in `layout.tsx`, one of these blocks is entirely redundant.

**Suggested fix:** Remove the `.dark` block (or the `:root` block) and keep only one source of truth for the theme variables.

---

## Medium Severity Findings

### M1 — `Role` type defined independently in 4+ locations

**Files:**
- `src/components/document-table.tsx` line 40: `type Role = "admin" | "editor" | "viewer"`
- `src/components/member-manager.tsx` line 34: `type Role = "admin" | "editor" | "viewer"`
- `src/components/role-badge.tsx` line 18: inline `{ role: "admin" | "editor" | "viewer" }`
- `src/components/team-card.tsx` line 18: inline `role: "admin" | "editor" | "viewer"`

**Suggested extraction:** `src/lib/types.ts` → `export type Role = "admin" | "editor" | "viewer"` and import everywhere.

---

### M2 — `canEdit` role-check pattern repeated in 3 files

**Files:**
- `src/app/documents/[documentId]/page.tsx` lines 50–51: `document.role === "admin" || document.role === "editor"`
- `src/app/teams/[teamId]/page.tsx` lines 53–54: `team?.role === "admin" || team?.role === "editor"`
- `src/components/document-table.tsx` line 83: `userRole === "admin" || userRole === "editor"`

**Suggested extraction:** `src/lib/permissions.ts` → `export function canEdit(role: Role): boolean` (and `canDelete`, `isAdmin` etc.)

---

### M3 — Error toast pattern repeated 9+ times across codebase

**Files:** `teams/new/page.tsx`, `teams/[teamId]/page.tsx`, `teams/[teamId]/settings/page.tsx`, `document-table.tsx`, `member-manager.tsx` (4 occurrences), `upload-dialog.tsx`

Pattern:
```
toast.error(
  error instanceof Error ? error.message : "Failed to ..."
);
```

**Suggested extraction:** `src/lib/utils.ts` → `export function toastError(error: unknown, fallback: string): void`

---

### M4 — Skeleton loading placeholder pattern repeated in 5 files

**Files:**
- `src/app/dashboard/page.tsx` lines 31–38
- `src/app/documents/[documentId]/page.tsx` lines 39–45
- `src/app/teams/[teamId]/page.tsx` lines 137–143
- `src/app/teams/[teamId]/settings/page.tsx` lines 42–48
- `src/components/version-history.tsx` lines 85–91

All use the same `[...Array(3)].map` with `bg-muted ... animate-pulse` divs, varying only in height class.

**Suggested extraction:** `src/components/skeleton-rows.tsx` → `<SkeletonRows count={3} height="h-20" />`

---

### M5 — Avatar initials computation duplicated in 2 files

**Files:**
- `src/components/member-manager.tsx` lines 200–204
- `src/components/version-history.tsx` lines 121–125

Both compute:
```
name?.split(" ").map((n) => n[0]).join("").toUpperCase() ?? "?"
```

**Suggested extraction:** `src/lib/format.ts` → `export function getInitials(name?: string): string`

---

### M6 — Inline `toLocaleDateString()` date formatting scattered across 5+ files

**Files:** `documents/[documentId]/page.tsx`, `document-table.tsx`, `member-manager.tsx`, `version-history.tsx`, `team-card.tsx`

Raw `new Date(timestamp).toLocaleDateString()` is called inline in 7+ locations with no consistent formatting configuration. If locale or format needs to change, every call site must be updated.

**Suggested extraction:** `src/lib/format.ts` → `export function formatDate(timestamp: number): string`

---

### M7 — Form submission loading state pattern repeated in 4 files

**Files:** `teams/new/page.tsx`, `teams/[teamId]/page.tsx`, `upload-dialog.tsx`, `member-manager.tsx`

Pattern: `useState(false)` for isLoading + `setTrue` before try + `toast.error` in catch + `setFalse` in finally. This is a textbook custom hook candidate.

**Suggested extraction:** `src/hooks/useAsyncAction.ts` →
```
export function useAsyncAction<T>(action: (...args) => Promise<T>)
  returns { execute, isLoading, error }
```

---

## Low Severity Findings

### L1 — Empty state component pattern repeated 3 times

**Files:**
- `src/app/dashboard/page.tsx` lines 40–55 ("No teams yet")
- `src/components/document-table.tsx` lines 121–133 ("No documents yet")
- `src/components/version-history.tsx` lines 96–104 ("No versions yet")

All share: centered container + icon in muted circle + heading + description text.

**Suggested extraction:** `src/components/empty-state.tsx` → `<EmptyState icon={FolderOpen} title="No teams yet" description="..." />`

---

### L2 — Back navigation button repeated in 3 page headers

**Files:**
- `src/app/documents/[documentId]/page.tsx` lines 56–59
- `src/app/teams/[teamId]/page.tsx` lines 151–155
- `src/app/teams/[teamId]/settings/page.tsx` lines 92–95

All render `<Button variant="ghost" size="icon" asChild><Link href="..."><ArrowLeft /></Link></Button>`.

**Suggested extraction:** `src/components/back-button.tsx` → `<BackButton href="/dashboard" />`

---

### L3 — Route strings hardcoded across many files

**Files:** `navbar.tsx`, `page.tsx`, `dashboard/page.tsx`, `teams/new/page.tsx`, `teams/[teamId]/page.tsx`, `teams/[teamId]/settings/page.tsx`, `document-table.tsx`

Routes like `/dashboard`, `/teams/new`, `/sign-in`, `/sign-up`, and dynamic routes like `/teams/${teamId}` are scattered as raw strings.

**Suggested extraction:** `src/lib/routes.ts` →
```
export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  signIn: "/sign-in",
  signUp: "/sign-up",
  newTeam: "/teams/new",
  team: (id: string) => `/teams/${id}`,
  teamSettings: (id: string) => `/teams/${id}/settings`,
  document: (id: string) => `/documents/${id}`,
}
```

---

### L4 — Page container layout pattern repeated on every page

**Files:** All page components in `src/app/`

Pattern: `<div className="max-w-Nxl mx-auto px-4 py-8">` with varying max-width.

**Suggested extraction:** `src/components/page-container.tsx` → `<PageContainer maxWidth="6xl">...</PageContainer>`

---

### L5 — Convex ID type assertions scattered across route pages

**Files:** `teams/[teamId]/page.tsx` (4x), `teams/[teamId]/settings/page.tsx` (3x), `documents/[documentId]/page.tsx` (2x)

Pattern: `teamId as Id<"teams">` cast inline at every call site. A single parsing utility would centralize the assertion and enable runtime validation.

**Suggested extraction:** `src/lib/ids.ts` → `export function asTeamId(id: string): Id<"teams">` (and similar for documents, storage)

---

## Summary

```
/* ═══════════════════════════════════════════
   DRY / PATTERNS AUDIT — src/ 2026-02-19T12:00
   🔴 High Issues: 4  🟡 Medium Issues: 7  🔵 Low Issues: 5
   Total findings: 16

   Suggested extractions:
     - src/lib/format.ts (formatFileSize, getInitials, formatDate)
     - src/lib/types.ts (Role)
     - src/lib/permissions.ts (canEdit, canDelete, isAdmin)
     - src/lib/routes.ts (ROUTES constant)
     - src/lib/ids.ts (asTeamId, asDocumentId)
     - src/lib/utils.ts (toastError — extend existing)
     - src/hooks/useFileUpload.ts
     - src/hooks/useAsyncAction.ts
     - src/components/file-picker.tsx
     - src/components/skeleton-rows.tsx
     - src/components/empty-state.tsx
     - src/components/back-button.tsx
     - src/components/page-container.tsx
   ═══════════════════════════════════════════ */
```
